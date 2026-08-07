// ===== 详情弹层：Bangumi 公共信息 + 我的记录 =====

import { useEffect, useState } from 'react'
import { Star, Plus, Minus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CoverImage } from '@/components/CoverImage'
import { fetchSubject } from '@/lib/bangumi'
import { weekdayLabel } from '@/lib/season'
import { useStore } from '@/store/useStore'
import { STATUS_LABEL, type BgmSubject, type WatchStatus } from '@/types'

interface Props {
  subjectId: number | null
  /** 详情请求失败时的回退基础信息（来自列表/缓存） */
  fallback?: Partial<BgmSubject>
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DetailDialog({ subjectId, fallback, open, onOpenChange }: Props) {
  const { data, updateTracking, untrack, incProgress, decProgress, addNote, removeNote } =
    useStore()
  const [subject, setSubject] = useState<BgmSubject | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')

  const tracking = data.tracking.find((t) => t.subjectId === subjectId)

  useEffect(() => {
    if (!open || !subjectId || subjectId < 0) return
    setLoadingDetail(true)
    setSubject(null)
    fetchSubject(subjectId)
      .then((s) => {
        setSubject(s)
        // 搜索 API 经常不返回 total_episodes/eps，导致 cachedMeta 里为 0 显示 "?"。
        // 详情 API 会返回完整数据 —— 回写 cachedMeta 让列表页也能正确显示总集数。
        if (tracking) {
          const fetchedTotal = s.total_episodes || s.eps || 0
          if (fetchedTotal > 0 && tracking.cachedMeta.totalEpisodes === 0) {
            updateTracking(subjectId, {
              cachedMeta: { ...tracking.cachedMeta, totalEpisodes: fetchedTotal },
            })
          }
        }
      })
      .catch(() => {
        if (fallback) setSubject(fallback as BgmSubject)
      })
      .finally(() => setLoadingDetail(false))
  }, [open, subjectId]) // eslint-disable-line react-hooks/exhaustive-deps

  const info = subject ?? (fallback as BgmSubject | undefined)
  const name = info?.name_cn || info?.name || tracking?.cachedMeta.nameCn || '未知番剧'
  const subName = info?.name_cn && info?.name ? info.name : ''
  const cover =
    info?.images?.large || info?.images?.common || tracking?.cachedMeta.cover || ''
  const total = info?.total_episodes || info?.eps || tracking?.cachedMeta.totalEpisodes || 0
  const weekday = tracking?.cachedMeta.airWeekday ?? null

  const notes = tracking?.notes ?? []
  // 兼容旧数据：尚未迁移时把 comment 当作一条吐槽展示
  const displayNotes =
    notes.length > 0
      ? notes
      : tracking?.comment?.trim()
        ? [
            {
              id: 'legacy-comment',
              text: tracking.comment,
              createdAt: tracking.addedAt,
              episode: 0,
            },
          ]
        : []

  const handleInc = () => {
    if (!subjectId) return
    const reached = incProgress(subjectId)
    if (reached && window.confirm('已到达总集数，是否标记为「看完」？')) {
      updateTracking(subjectId, { status: 'watched' })
      toast.success('已标记为看完 🎉')
    }
  }

  const submitNote = () => {
    if (!subjectId || !noteDraft.trim()) return
    addNote(subjectId, noteDraft)
    setNoteDraft('')
  }

  const formatNoteTime = (iso: string) => {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="pr-6">
            {name}
            {subName && <span className="ml-2 text-sm font-normal text-muted-foreground">{subName}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 sm:flex-row">
          <CoverImage src={cover} alt={name} className="aspect-[3/4] w-full rounded-md sm:w-44" />

          <div className="flex-1 space-y-3 text-sm">
            {loadingDetail ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  {info?.rating?.score ? (
                    <Badge variant="secondary" className="gap-1">
                      <Star className="size-3 fill-yellow-400 text-yellow-400" />
                      {info.rating.score.toFixed(1)}
                      {info.rating.total > 0 && (
                        <span className="text-muted-foreground">({info.rating.total}人)</span>
                      )}
                    </Badge>
                  ) : (
                    <Badge variant="outline">暂无评分</Badge>
                  )}
                  {info?.rank ? <Badge variant="outline">Rank #{info.rank}</Badge> : null}
                </div>

                <div className="text-muted-foreground">
                  {weekday ? `${weekdayLabel(weekday)}更新` : '放送星期未知'}
                  {' · '}
                  {total > 0 ? `全 ${total} 话` : '全 ? 话（连载中）'}
                  {info?.date ? ` · ${info.date} 首播` : ''}
                </div>

                {info?.tags && info.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {info.tags.slice(0, 10).map((t) => (
                      <Badge key={t.name} variant="outline" className="text-xs">
                        {t.name}
                      </Badge>
                    ))}
                  </div>
                )}

                {info?.summary && (
                  <p className="max-h-32 overflow-y-auto rounded-md bg-muted/50 p-2 leading-relaxed text-muted-foreground">
                    {info.summary}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {tracking && (
          <div className="space-y-3 border-t pt-4">
            <h3 className="text-sm font-semibold">我的记录</h3>

            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={tracking.status}
                onValueChange={(v) => updateTracking(tracking.subjectId, { status: v as WatchStatus })}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABEL) as WatchStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  进度 {tracking.progress}/{total > 0 ? total : '?'}
                </span>
                <Button size="sm" variant="outline" onClick={handleInc}>
                  <Plus className="size-3.5" /> +1
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={tracking.progress <= 0}
                  onClick={() => decProgress(tracking.subjectId)}
                  title="点错了就 -1"
                >
                  <Minus className="size-3.5" />
                </Button>
              </div>

              <Select
                value={tracking.myRating > 0 ? String(tracking.myRating) : ''}
                onValueChange={(v) => updateTracking(tracking.subjectId, { myRating: Number(v) })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="我的评分" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} 分
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="写一条此刻的感想…（回车提交）"
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitNote()}
                />
                <Button size="sm" onClick={submitNote} disabled={!noteDraft.trim()}>
                  记下
                </Button>
              </div>

              {displayNotes.length > 0 && (
                <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                  {displayNotes.map((n) => (
                    <div
                      key={n.id}
                      className="group flex items-start gap-2 rounded-md bg-muted/50 p-2 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">
                          {n.episode > 0 ? `看到第 ${n.episode} 集 · ` : ''}
                          {formatNoteTime(n.createdAt)}
                        </p>
                        <p className="whitespace-pre-wrap break-words">{n.text}</p>
                      </div>
                      {n.id !== 'legacy-comment' && (
                        <button
                          className="text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                          title="删除这条"
                          onClick={() => {
                            if (window.confirm('删除这条感想？')) {
                              removeNote(tracking.subjectId, n.id)
                            }
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => {
                  if (window.confirm(`确定不再追《${name}》？记录将被删除。`)) {
                    untrack(tracking.subjectId)
                    onOpenChange(false)
                  }
                }}
              >
                <Trash2 className="size-3.5" /> 取消追番
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
