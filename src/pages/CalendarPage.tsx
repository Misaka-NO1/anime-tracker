// ===== 放送表页：周一~周日七列，今天高亮 =====

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { CoverImage } from '@/components/CoverImage'
import { DetailDialog } from '@/components/DetailDialog'
import { WEEKDAY_LABELS } from '@/lib/season'
import { useStore } from '@/store/useStore'
import { STATUS_LABEL } from '@/types'
import { cn } from '@/lib/utils'

export default function CalendarPage() {
  const { data, config } = useStore()
  const [detailId, setDetailId] = useState<number | null>(null)

  if (!config) return null

  // 今天：1=周一 … 7=周日
  const jsDay = new Date().getDay()
  const today = jsDay === 0 ? 7 : jsDay

  const active = data.tracking.filter(
    (t) => t.status === 'watching' || t.status === 'want',
  )

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        只显示「在看 / 想看」的番；补旧番区不进入放送表。
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {WEEKDAY_LABELS.map((label, i) => {
          const weekday = i + 1
          const items = active.filter((t) => t.cachedMeta.airWeekday === weekday)
          const isToday = weekday === today
          return (
            <div
              key={weekday}
              className={cn(
                'min-h-40 rounded-lg border p-2',
                isToday
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border bg-card',
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className={cn('text-sm font-semibold', isToday && 'text-primary')}>
                  {label}
                </span>
                {isToday && <Badge className="text-xs">今天</Badge>}
              </div>

              <div className="space-y-2">
                {items.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground/60">—</p>
                ) : (
                  items.map((t) => {
                    const total = t.cachedMeta.totalEpisodes
                    return (
                      <Card
                        key={t.subjectId}
                        className="cursor-pointer p-2 transition-shadow hover:shadow-md"
                        onClick={() => setDetailId(t.subjectId)}
                      >
                        <CoverImage
                          src={t.cachedMeta.cover}
                          alt={t.cachedMeta.nameCn}
                          className="mb-1.5 aspect-[3/4] w-full rounded"
                        />
                        <p className="line-clamp-2 text-xs font-medium" title={t.cachedMeta.nameCn}>
                          {t.cachedMeta.nameCn}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {t.progress}/{total > 0 ? total : '?'} · {STATUS_LABEL[t.status]}
                        </p>
                      </Card>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      {active.length === 0 && (
        <div className="py-16 text-center text-muted-foreground">
          还没有在看/想看的番，去「本季新番」添加几部吧。
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
