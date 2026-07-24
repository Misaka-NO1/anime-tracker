// ===== 个人追番数据（data.json）=====

export type WatchStatus = 'want' | 'watching' | 'watched' | 'dropped'

export const STATUS_LABEL: Record<WatchStatus, string> = {
  want: '想看',
  watching: '在看',
  watched: '看完',
  dropped: '弃番',
}

export interface CachedMeta {
  nameCn: string
  name: string
  cover: string
  /** 1=周一 … 7=周日；null 表示未知 */
  airWeekday: number | null
  /** 0 表示连载中/未知 */
  totalEpisodes: number
}

export interface NoteEntry {
  id: string
  text: string
  createdAt: string
  /** 记录时的观看进度（集），0 表示迁移自旧吐槽或无进度信息 */
  episode: number
}

export interface TrackingItem {
  subjectId: number
  /** 季度标识，如 "2026-07" */
  season: string
  status: WatchStatus
  progress: number
  /** 1-10，0 表示未评分 */
  myRating: number
  /** 旧版单条吐槽（已被 notes 取代，保留用于兼容与迁移） */
  comment: string
  /** 吐槽时间线，最新在前 */
  notes?: NoteEntry[]
  addedAt: string
  cachedMeta: CachedMeta
}

export interface BacklogItem {
  id: string
  /** 手动添加时无此字段；从 Bangumi 搜索添加时为条目 ID */
  subjectId?: number
  title: string
  /** 0 表示总集数未知（连载中） */
  totalEpisodes: number
  progress: number
  note: string
  /** Bangumi 封面（可选） */
  cover?: string
  addedAt: string
}

export interface WatchData {
  version: number
  updatedAt: string
  tracking: TrackingItem[]
  backlog: BacklogItem[]
}

// ===== 应用配置（localStorage）=====

export interface AppConfig {
  githubToken: string
  owner: string
  repo: string
}

// ===== Bangumi API =====

export interface BgmImages {
  large: string
  common: string
  medium: string
  small: string
  grid: string
}

export interface BgmTag {
  name: string
  count: number
}

export interface BgmInfoboxItem {
  key: string
  value: unknown
}

export interface BgmSubject {
  id: number
  name: string
  name_cn: string
  summary?: string
  date?: string
  eps?: number
  total_episodes?: number
  images?: BgmImages
  rating?: { score: number; total: number }
  rank?: number
  tags?: BgmTag[]
  platform?: string
  infobox?: BgmInfoboxItem[]
}

// ===== 季度 =====

export interface SeasonInfo {
  /** 如 "2026-07" */
  id: string
  year: number
  /** 1 | 4 | 7 | 10 */
  month: number
  label: string
  /** YYYY-MM-DD */
  start: string
  end: string
}
