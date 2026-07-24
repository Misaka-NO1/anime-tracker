// ===== GitHub 存储层：通过 Contents API 读写私有仓库中的 data.json =====

import type { AppConfig, WatchData } from '@/types'

const API = 'https://api.github.com'
const FILE_PATH = 'data.json'

export class GithubError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'GithubError'
    this.status = status
  }
}

/** UTF-8 安全的 base64 编码（含中文） */
export function encodeBase64(str: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(str)))
}

/** UTF-8 安全的 base64 解码 */
export function decodeBase64(b64: string): string {
  return new TextDecoder().decode(
    Uint8Array.from(atob(b64.replace(/\n/g, '')), (c) => c.charCodeAt(0)),
  )
}

export function emptyData(): WatchData {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    tracking: [],
    backlog: [],
  }
}

async function ghFetch(cfg: AppConfig, path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.githubToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.headers ?? {}),
    },
  })
  return res
}

function repoContentsUrl(cfg: AppConfig): string {
  return `/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${FILE_PATH}`
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json()
    return body?.message ?? res.statusText
  } catch {
    return res.statusText
  }
}

export interface ReadResult {
  data: WatchData
  /** null 表示文件尚不存在 */
  sha: string | null
}

/** 读取仓库中的 data.json；文件不存在时返回空数据与 null sha */
export async function readData(cfg: AppConfig): Promise<ReadResult> {
  const res = await ghFetch(cfg, repoContentsUrl(cfg))
  if (res.status === 404) {
    return { data: emptyData(), sha: null }
  }
  if (!res.ok) {
    throw new GithubError(res.status, await errorMessage(res))
  }
  const json = await res.json()
  const data = JSON.parse(decodeBase64(json.content)) as WatchData
  // 容错：补齐缺失字段
  data.version = data.version ?? 1
  data.tracking = Array.isArray(data.tracking) ? data.tracking : []
  data.backlog = Array.isArray(data.backlog) ? data.backlog : []
  return { data, sha: json.sha as string }
}

/** 写入 data.json；sha 为 null 时创建文件。返回新的 sha */
export async function writeData(
  cfg: AppConfig,
  data: WatchData,
  sha: string | null,
): Promise<{ sha: string }> {
  const body: Record<string, string> = {
    message: 'chore: update watch data',
    content: encodeBase64(JSON.stringify({ ...data, updatedAt: new Date().toISOString() }, null, 2)),
  }
  if (sha) body.sha = sha

  const res = await ghFetch(cfg, repoContentsUrl(cfg), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new GithubError(res.status, await errorMessage(res))
  }
  const json = await res.json()
  return { sha: json.content.sha as string }
}

export interface TestResult {
  ok: boolean
  /** 连接成功时：data.json 是否已存在 */
  fileExists?: boolean
  message: string
}

/** 测试连接：先查仓库，再查 data.json */
export async function testConnection(cfg: AppConfig): Promise<TestResult> {
  try {
    const repoRes = await ghFetch(
      cfg,
      `/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}`,
    )
    if (repoRes.status === 401) return { ok: false, message: 'Token 无效（401），请检查 Token 是否正确' }
    if (repoRes.status === 403) return { ok: false, message: '无权限访问（403），请检查 Token 是否授予该仓库 Contents 读写权限' }
    if (repoRes.status === 404) return { ok: false, message: '找不到仓库（404），请检查用户名和仓库名（仓库需为私有仓库且 Token 已授权）' }
    if (!repoRes.ok) return { ok: false, message: `连接失败（${repoRes.status}）：${await errorMessage(repoRes)}` }

    const fileRes = await ghFetch(cfg, repoContentsUrl(cfg))
    if (fileRes.status === 404) {
      return { ok: true, fileExists: false, message: '已连接 ✅ data.json 尚不存在，首次保存时将自动创建' }
    }
    if (!fileRes.ok) {
      return { ok: false, message: `读取 data.json 失败（${fileRes.status}）：${await errorMessage(fileRes)}` }
    }
    return { ok: true, fileExists: true, message: '已连接 ✅ 成功读取 data.json' }
  } catch (e) {
    return { ok: false, message: `网络错误：${e instanceof Error ? e.message : String(e)}` }
  }
}
