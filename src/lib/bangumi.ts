// ===== Bangumi API 层：UA 头、季度查询、条目详情、429 退避、24h 缓存 =====

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

function writeCache(seasonId: string, items: BgmSubject[]): void {
  try {
    localStorage.setItem(CACHE_PREFIX + seasonId, JSON.stringify({ at: Date.now(), items }))
  } catch {
    // localStorage 满时静默失败
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
}

/** 拉取某季度全部 TV 动画（POST /v0/search/subjects 按首播日期区间） */
export async function fetchSeasonAnime(season: SeasonInfo): Promise<SeasonFetchResult> {
  const cache = readCache(season.id)
  if (cache && Date.now() - cache.at < CACHE_TTL) {
    return { items: cache.items, source: 'cache' }
  }

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
