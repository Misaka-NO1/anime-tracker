// ===== 全局状态：配置、追番数据、GitHub 同步 =====

import { create } from 'zustand'
import { toast } from 'sonner'
import type { AppConfig, BacklogItem, TrackingItem, WatchData, WatchStatus } from '@/types'
import { emptyData, GithubError, readData, writeData } from '@/lib/github'

const CONFIG_KEY = 'anime-tracker-config'

function loadConfig(): AppConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw) return null
    const cfg = JSON.parse(raw) as AppConfig
    if (!cfg.githubToken || !cfg.owner || !cfg.repo) return null
    return cfg
  } catch {
    return null
  }
}

interface StoreState {
  config: AppConfig | null
  data: WatchData
  sha: string | null
  loading: boolean
  saving: boolean
  /** 上次保存失败的提示（断网等），成功保存后清空 */
  saveError: string | null

  setConfig: (cfg: AppConfig) => void
  clearConfig: () => void
  loadData: () => Promise<void>

  // 追番操作
  track: (item: TrackingItem) => void
  untrack: (subjectId: number) => void
  updateTracking: (subjectId: number, patch: Partial<TrackingItem>) => void
  /** 仅更新本地的元数据修正:不 bump updatedAt、不入保存队列,下次任意保存时顺带持久化 */
  patchTrackingLocal: (subjectId: number, patch: Partial<TrackingItem>) => void
  setStatus: (subjectId: number, status: WatchStatus) => void
  /** +1 进度；返回是否触达总集数 */
  incProgress: (subjectId: number) => boolean
  /** -1 进度（误点回退） */
  decProgress: (subjectId: number) => void
  /** 添加一条吐槽（自动带上当前进度与时间） */
  addNote: (subjectId: number, text: string) => void
  removeNote: (subjectId: number, noteId: string) => void

  // 补旧番操作
  addBacklog: (item: Omit<BacklogItem, 'id' | 'addedAt'>) => void
  updateBacklog: (id: string, patch: Partial<BacklogItem>) => void
  removeBacklog: (id: string) => void
}

// 保存串行化：避免并发写导致 sha 过期
let saveChain: Promise<void> = Promise.resolve()

export const useStore = create<StoreState>((set, get) => {
  /** 乐观更新本地数据并排队保存到 GitHub */
  function mutate(fn: (data: WatchData) => WatchData) {
    const next = fn(get().data)
    set({ data: next })
    enqueueSave(next)
  }

  function enqueueSave(snapshot: WatchData) {
    saveChain = saveChain.then(async () => {
      const { config, sha } = get()
      if (!config) return
      // 若本地数据已领先于快照（用户连续操作），保存最新状态
      const latest = get().data
      const toSave = latest.updatedAt >= snapshot.updatedAt ? latest : snapshot
      set({ saving: true })
      try {
        const { sha: newSha } = await writeData(config, toSave, sha)
        set({ sha: newSha, saveError: null })
      } catch (e) {
        if (e instanceof GithubError && (e.status === 409 || e.status === 422)) {
          // 冲突：以远端为准刷新
          try {
            const { data, sha: freshSha } = await readData(config)
            set({ data, sha: freshSha })
            toast.info('数据已在其他设备更新，已为你刷新为最新版本')
          } catch {
            set({ saveError: '保存冲突且刷新失败，请手动刷新页面' })
          }
        } else {
          set({ saveError: `保存失败：${e instanceof Error ? e.message : String(e)}（本地修改已保留，下次操作会重试）` })
          toast.error('保存到 GitHub 失败，本地修改已保留')
        }
      } finally {
        set({ saving: false })
      }
    })
  }

  return {
    config: loadConfig(),
    data: emptyData(),
    sha: null,
    loading: false,
    saving: false,
    saveError: null,

    setConfig: (cfg) => {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg))
      set({ config: cfg })
    },

    clearConfig: () => {
      localStorage.removeItem(CONFIG_KEY)
      set({ config: null, data: emptyData(), sha: null })
    },

    loadData: async () => {
      const { config } = get()
      if (!config) return
      set({ loading: true })
      try {
        const { data, sha } = await readData(config)
        // 旧版单条 comment 自动迁移为时间线的第一条
        let migrated = false
        for (const t of data.tracking) {
          if (t.comment?.trim() && (!t.notes || t.notes.length === 0)) {
            t.notes = [
              {
                id: `note-migrated-${t.subjectId}`,
                text: t.comment,
                createdAt: t.addedAt ?? new Date().toISOString(),
                episode: 0,
              },
            ]
            migrated = true
          }
        }
        set({ data, sha })
        if (migrated) enqueueSave(data)
      } catch (e) {
        toast.error(`读取数据失败：${e instanceof Error ? e.message : String(e)}`)
      } finally {
        set({ loading: false })
      }
    },

    track: (item) =>
      mutate((d) => ({
        ...d,
        updatedAt: new Date().toISOString(),
        tracking: [item, ...d.tracking.filter((t) => t.subjectId !== item.subjectId)],
      })),

    untrack: (subjectId) =>
      mutate((d) => ({
        ...d,
        updatedAt: new Date().toISOString(),
        tracking: d.tracking.filter((t) => t.subjectId !== subjectId),
      })),

    updateTracking: (subjectId, patch) =>
      mutate((d) => ({
        ...d,
        updatedAt: new Date().toISOString(),
        tracking: d.tracking.map((t) => (t.subjectId === subjectId ? { ...t, ...patch } : t)),
      })),

    setStatus: (subjectId, status) => get().updateTracking(subjectId, { status }),

    patchTrackingLocal: (subjectId, patch) => {
      set({
        data: {
          ...get().data,
          tracking: get().data.tracking.map((t) =>
            t.subjectId === subjectId ? { ...t, ...patch } : t,
          ),
        },
      })
    },

    incProgress: (subjectId) => {
      const item = get().data.tracking.find((t) => t.subjectId === subjectId)
      if (!item) return false
      const total = item.cachedMeta.totalEpisodes
      // 已到总集数：不再增加，只返回「已到顶」让调用方提示标记看完
      if (total > 0 && item.progress >= total) return true
      const next = item.progress + 1
      const reachedTotal = total > 0 && next >= total
      get().updateTracking(subjectId, { progress: next })
      return reachedTotal
    },

    decProgress: (subjectId) => {
      const item = get().data.tracking.find((t) => t.subjectId === subjectId)
      if (!item || item.progress <= 0) return
      get().updateTracking(subjectId, { progress: item.progress - 1 })
    },

    addNote: (subjectId, text) => {
      const trimmed = text.trim()
      if (!trimmed) return
      mutate((d) => ({
        ...d,
        updatedAt: new Date().toISOString(),
        tracking: d.tracking.map((t) =>
          t.subjectId === subjectId
            ? {
                ...t,
                notes: [
                  {
                    id: `note-${Date.now()}`,
                    text: trimmed,
                    createdAt: new Date().toISOString(),
                    episode: t.progress,
                  },
                  ...(t.notes ?? []),
                ],
              }
            : t,
        ),
      }))
    },

    removeNote: (subjectId, noteId) =>
      mutate((d) => ({
        ...d,
        updatedAt: new Date().toISOString(),
        tracking: d.tracking.map((t) =>
          t.subjectId === subjectId
            ? { ...t, notes: (t.notes ?? []).filter((n) => n.id !== noteId) }
            : t,
        ),
      })),

    addBacklog: (item) =>
      mutate((d) => ({
        ...d,
        updatedAt: new Date().toISOString(),
        backlog: [
          { ...item, id: `manual-${Date.now()}`, addedAt: new Date().toISOString() },
          ...d.backlog,
        ],
      })),

    updateBacklog: (id, patch) =>
      mutate((d) => ({
        ...d,
        updatedAt: new Date().toISOString(),
        backlog: d.backlog.map((b) => (b.id === id ? { ...b, ...patch } : b)),
      })),

    removeBacklog: (id) =>
      mutate((d) => ({
        ...d,
        updatedAt: new Date().toISOString(),
        backlog: d.backlog.filter((b) => b.id !== id),
      })),
  }
})
