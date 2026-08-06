// ===== Bangumi API 层：UA 头、季度查询、条目详情、429 退避、24h 缓存 =====
// 缓存策略：stale-while-revalidate —— 有缓存先立即返回（秒开），
// 过期/强制刷新时在后台重新抓取，完成后通过 onRefresh 回调推送新数据。
// 同一季度的抓取全局去重（inflight），StrictMode 双调用/反复进出页面不会重复请求。

import type { BgmSubject, SeasonInfo } from '@/types'

const UA = 'anime-tracker/0.1 (https://github.com/anime-tracker/anime-tracker)'

// 浏览器直连（api.bgm.tv 返回 Access-Control-Allow-Origin: *，支持跨域；
// 系统代理由浏览器自动应用，不走 Vite proxy —— Node 代理不会用系统代理，反而会导致请求失败）
const BASE = 'https://api.bgm.tv'

const CACHE_PREFIX = 'anime-tracker-season-cache-v2-'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 小时

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** 带 UA 与 429 指数退避重试的 fetch */
async function bgmFetch(path: string, init?: RequestInit, retries = 3): Promise<Response> {
  let lastErr: unknown = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`, {
        ...init,
        headers: {
          'User-Agent': UA,
          'Content-Type': 'application/json',
          ...(init?.headers ?? {}),
        },
      })
      if (res.status === 429) {
        const wait = 1000 * 2 ** attempt
        await sleep(wait)
        continue
      }
      if (!res.ok) {
        throw new Error(`Bangumi API 错误（${res.status}）`)
      }
      return res
    } catch (e) {
      lastErr = e
      if (attempt < retries) await sleep(1000 * 2 ** attempt)
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Bangumi API 请求失败')
}

// ===== 缓存 =====

interface SeasonCache {
  at: number
  items: BgmSubject[]
}

function readCache(seasonId: string): SeasonCache | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + seasonId)
    return raw ? (JSON.parse(raw) as SeasonCache) : null
  } catch {
    return null
  }
}

/**
 * 只保留列表/详情回退真正用到的字段（去掉 summary、tags、infobox 等大字段），
 * 避免整季数据超出 localStorage 配额导致缓存永远写不进去、每次都全量重抓。
 */
function trimForCache(items: BgmSubject[]): BgmSubject[] {
  return items.map((s) => ({
    id: s.id,
    name: s.name,
    name_cn: s.name_cn,
    date: s.date,
    eps: s.eps,
    total_episodes: s.total_episodes,
    images: s.images,
    rating: s.rating,
    rank: s.rank,
  }))
}

function writeCache(seasonId: string, items: BgmSubject[]): void {
  const payload = JSON.stringify({ at: Date.now(), items: trimForCache(items) })
  try {
    localStorage.setItem(CACHE_PREFIX + seasonId, payload)
  } catch {
    // 大概率是配额不足：清掉其他季度的旧缓存后重试一次
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith(CACHE_PREFIX) && key !== CACHE_PREFIX + seasonId) {
          localStorage.removeItem(key)
        }
      }
      localStorage.setItem(CACHE_PREFIX + seasonId, payload)
    } catch (e) {
      console.warn('[bangumi] 季度缓存写入失败（localStorage 配额不足）', e)
    }
  }
}

// ===== bangumi-data 兜底 =====

interface BangumiDataItem {
  title?: string
  titleTranslate?: { 'zh-Hans'?: string[] }
  begin?: string
  sites?: { site: string; id?: string }[]
}

function mapBangumiData(items: BangumiDataItem[]): BgmSubject[] {
  return items.map((it, i) => {
    const bgmSite = it.sites?.find((s) => s.site === 'bangumi')
    return {
      id: bgmSite?.id ? Number(bgmSite.id) : -(i + 1),
      name: it.title ?? '',
      name_cn: it.titleTranslate?.['zh-Hans']?.[0] ?? '',
      date: it.begin?.slice(0, 10),
      eps: 0,
      total_episodes: 0,
    }
  })
}

async function fetchSeasonFromBangumiData(season: SeasonInfo): Promise<BgmSubject[]> {
  // bangumi-data 按季度月份组织：data/items/{year}/{MM}.json
  const mm = String(season.month).padStart(2, '0')
  const url = `https://fastly.jsdelivr.net/gh/bangumi-data/bangumi-data@master/data/items/${season.year}/${mm}.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error('兜底数据源（bangumi-data）也不可用')
  const items = (await res.json()) as BangumiDataItem[]
  return mapBangumiData(items)
}

// ===== 对外接口 =====

export interface SeasonFetchResult {
  items: BgmSubject[]
  /** 数据来源 */
  source: 'api' | 'cache' | 'stale-cache' | 'fallback'
  /** true 表示当前展示的是缓存，正在后台拉取最新数据（完成后走 onRefresh） */
  refreshing?: boolean
}

export interface SeasonFetchOptions {
  /** 强制后台重新抓取（仍会先返回缓存，不阻塞界面） */
  force?: boolean
  /** 后台刷新结束时回调：成功带新结果，失败带 error（此时界面上的缓存继续可用） */
  onRefresh?: (result: SeasonFetchResult | null, error?: string) => void
}

/** 进行中的季度抓取：同一季度全局复用，杜绝并发重复全量抓取 */
const inflight = new Map<string, Promise<SeasonFetchResult>>()

/** 实际的全量分页抓取（含缓存写入与兜底） */
async function doFetchSeason(season: SeasonInfo): Promise<SeasonFetchResult> {
  const cache = readCache(season.id)
  try {
    // 注意：该接口忽略 limit 参数，每页固定 20 条（限流时可能降为 10 条），
    // 必须按实际返回数量翻页，直到拿满 total 或返回空页
    const all: BgmSubject[] = []
    const seen = new Set<number>()
    let offset = 0
    let total = Number.POSITIVE_INFINITY
    while (offset < total && offset < 1000) {
      const res = await bgmFetch(`/v0/search/subjects?offset=${offset}`, {
        method: 'POST',
        body: JSON.stringify({
          sort: 'rank',
          filter: {
            type: [2],
            air_date: [`>=${season.start}`, `<=${season.end}`],
          },
        }),
      })
      const json = await res.json()
      if (typeof json.total === 'number') total = json.total
      const page: BgmSubject[] = json.data ?? []
      if (page.length === 0) break
      for (const item of page) {
        if (!seen.has(item.id)) {
          seen.add(item.id)
          all.push(item)
        }
      }
      offset += page.length
      // 串行 + 间隔，避免限频
      await sleep(300)
    }
    writeCache(season.id, all)
    return { items: all, source: 'api' }
  } catch (e) {
    // 兜底 1：过期缓存
    if (cache) return { items: cache.items, source: 'stale-cache' }
    // 兜底 2：bangumi-data
    try {
      const items = await fetchSeasonFromBangumiData(season)
      return { items, source: 'fallback' }
    } catch {
      throw e
    }
  }
}

/** 同一季度的抓取去重：进行中的请求直接复用 */
function crawlSeason(season: SeasonInfo): Promise<SeasonFetchResult> {
  const pending = inflight.get(season.id)
  if (pending) return pending
  const p = doFetchSeason(season).finally(() => {
    inflight.delete(season.id)
  })
  inflight.set(season.id, p)
  return p
}

/** 后台重新校验：完成后写缓存并回调，失败时回调 error（不打断当前展示） */
function revalidate(season: SeasonInfo, onRefresh?: SeasonFetchOptions['onRefresh']): void {
  crawlSeason(season)
    .then((r) => onRefresh?.(r))
    .catch((e) => onRefresh?.(null, e instanceof Error ? e.message : String(e)))
}

/**
 * 拉取某季度全部 TV 动画（POST /v0/search/subjects 按首播日期区间）。
 * stale-while-revalidate：
 * - 新鲜缓存（24h 内）且未强制刷新：直接返回缓存，不发请求；
 * - 有过期缓存或强制刷新：立即返回缓存（refreshing=true），后台抓取完成后经 onRefresh 推送；
 * - 无任何缓存：等待抓取完成（首次的必经之路）。
 */
export async function fetchSeasonAnime(
  season: SeasonInfo,
  options?: SeasonFetchOptions,
): Promise<SeasonFetchResult> {
  const cache = readCache(season.id)
  const fresh = cache !== null && Date.now() - cache.at < CACHE_TTL

  if (cache && !fresh && !options?.force) {
    revalidate(season, options?.onRefresh)
    return { items: cache.items, source: 'stale-cache', refreshing: true }
  }
  if (cache && options?.force) {
    revalidate(season, options?.onRefresh)
    return { items: cache.items, source: fresh ? 'cache' : 'stale-cache', refreshing: true }
  }
  if (cache && fresh) {
    return { items: cache.items, source: 'cache' }
  }
  // 无缓存：只能等抓取
  return crawlSeason(season)
}

/** 条目详情（简介/图片/集数/评分/标签） */
export async function fetchSubject(subjectId: number): Promise<BgmSubject> {
  const res = await bgmFetch(`/v0/subjects/${subjectId}`)
  return (await res.json()) as BgmSubject
}

/** 关键词搜索条目（用于补旧番从 Bangumi 搜索添加；该接口每页固定约 20 条） */
export async function searchSubjects(keyword: string): Promise<BgmSubject[]> {
  const res = await bgmFetch('/v0/search/subjects', {
    method: 'POST',
    body: JSON.stringify({
      keyword,
      sort: 'rank',
      filter: { type: [2] },
    }),
  })
  const json = await res.json()
  return (json.data ?? []) as BgmSubject[]
}
