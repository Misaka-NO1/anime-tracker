// ===== 追番日记页：所有番的吐槽按时间倒序汇总 =====

import { useMemo, useState } from 'react'
import { BookOpenText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { CoverImage } from '@/components/CoverImage'
import { DetailDialog } from '@/components/DetailDialog'
import { useStore } from '@/store/useStore'
import { STATUS_LABEL, type NoteEntry, type TrackingItem } from '@/types'

interface DiaryEntry extends NoteEntry {
  anime: TrackingItem
}

export default function NotesPage() {
  const { data, config } = useStore()
  const [detailId, setDetailId] = useState<number | null>(null)

  const entries = useMemo<DiaryEntry[]>(() => {
    const all: DiaryEntry[] = []
    for (const t of data.tracking) {
      const notes = t.notes ?? []
      if (notes.length > 0) {
        for (const n of notes) all.push({ ...n, anime: t })
      } else if (t.comment?.trim()) {
        // 兼容未迁移的旧数据
        all.push({
          id: `legacy-${t.subjectId}`,
          text: t.comment,
          createdAt: t.addedAt,
          episode: 0,
          anime: t,
        })
      }
    }
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [data.tracking])

  if (!config) return null

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-baseline gap-2">
        <h1 className="text-2xl font-bold tracking-tight">追番日记</h1>
        <span className="text-sm text-muted-foreground">共 {entries.length} 条</span>
      </div>

      {entries.length === 0 ? (
        <Empty className="py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpenText />
            </EmptyMedia>
            <EmptyTitle>还没有写过感想</EmptyTitle>
            <EmptyDescription>打开任意一部在追的番，在详情里「记下」一条吧。</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="relative space-y-3 pl-6">
          {/* 时间轴竖线 */}
          <div aria-hidden className="absolute inset-y-2 left-[8px] w-px bg-border" />
          {entries.map((e) => (
            <div key={e.id} className="relative">
              <span
                aria-hidden
                className="absolute left-[3px] top-6 z-10 size-2.5 rounded-full bg-primary ring-4 ring-background"
              />
              <Card
              key={e.id}
              role="button"
              tabIndex={0}
              aria-label={`查看《${e.anime.cachedMeta.nameCn}》详情`}
              className="flex cursor-pointer gap-3 p-3 text-left transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              onClick={() => setDetailId(e.anime.subjectId)}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault()
                  setDetailId(e.anime.subjectId)
                }
              }}
            >
              <CoverImage
                src={e.anime.cachedMeta.cover}
                alt={e.anime.cachedMeta.nameCn}
                className="h-20 w-14 shrink-0 rounded"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium">{e.anime.cachedMeta.nameCn}</span>
                  <Badge variant="outline" className="text-xs">
                    {STATUS_LABEL[e.anime.status]}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {e.episode > 0 ? `看到第 ${e.episode} 集 · ` : ''}
                  {formatTime(e.createdAt)}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm">{e.text}</p>
              </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      <DetailDialog
        subjectId={detailId}
        open={detailId !== null}
        onOpenChange={(o) => !o && setDetailId(null)}
      />
    </div>
  )
}
