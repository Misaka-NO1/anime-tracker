// ===== 追番日记页：所有番的吐槽按时间倒序汇总 =====

import { useMemo, useState } from 'react'
import { BookOpenText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
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
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <BookOpenText className="size-5 text-primary" />
        <h1 className="text-lg font-bold">追番日记</h1>
        <span className="text-sm text-muted-foreground">共 {entries.length} 条</span>
      </div>

      {entries.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          还没有写过感想。打开任意一部在追的番，在详情里「记下」一条吧。
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((e) => (
            <Card
              key={e.id}
              className="flex cursor-pointer gap-3 p-3 transition-shadow hover:shadow-md"
              onClick={() => setDetailId(e.anime.subjectId)}
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
