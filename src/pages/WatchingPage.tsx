// ===== 我的追番页：状态 Tab + 进度 +1 + 状态流转 =====

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Minus, Plus, Search, Star, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CoverImage } from '@/components/CoverImage'
import { DetailDialog } from '@/components/DetailDialog'
import { weekdayLabel } from '@/lib/season'
import { useStore } from '@/store/useStore'
import { STATUS_LABEL, type TrackingItem, type WatchStatus } from '@/types'

const TAB_ORDER: WatchStatus[] = ['watching', 'want', 'watched', 'dropped']

export default function WatchingPage() {
  const { data, incProgress, decProgress, updateTracking, config } = useStore()
  const navigate = useNavigate()
  const [detailId, setDetailId] = useState<number | null>(null)
  const [query, setQuery] = useState('')

  if (!config) return null

  /** 搜索过滤：匹配中文名/日文名，不区分大小写 */
  const matchesQuery = (item: TrackingItem) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (
      item.cachedMeta.nameCn.toLowerCase().includes(q) ||
      item.cachedMeta.name.toLowerCase().includes(q)
    )
  }

  const handleInc = (item: TrackingItem) => {
    const reached = incProgress(item.subjectId)
    if (reached && window.confirm(`《${item.cachedMeta.nameCn}》已到达总集数，是否标记为「看完」？`)) {
      updateTracking(item.subjectId, { status: 'watched' })
      toast.success('已标记为看完 🎉')
    }
  }

  const renderCard = (item: TrackingItem) => {
    const total = item.cachedMeta.totalEpisodes
    const percent = total > 0 ? Math.min(100, Math.round((item.progress / total) * 100)) : 0
    return (
      <Card key={item.subjectId} className="flex gap-3 p-3">
        <button onClick={() => setDetailId(item.subjectId)} className="shrink-0">
          <CoverImage
            src={item.cachedMeta.cover}
            alt={item.cachedMeta.nameCn}
            className="aspect-[3/4] w-20 rounded-md"
          />
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <button
            className="truncate text-left text-sm font-medium hover:underline"
            onClick={() => setDetailId(item.subjectId)}
            title={item.cachedMeta.nameCn}
          >
            {item.cachedMeta.nameCn}
          </button>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {item.progress}/{total > 0 ? total : '?'}
            </span>
            {item.cachedMeta.airWeekday && (
              <span>· {weekdayLabel(item.cachedMeta.airWeekday)}更新</span>
            )}
            {item.myRating > 0 && (
              <span className="flex items-center gap-0.5">
                · <Star className="size-3 fill-yellow-400 text-yellow-400" />
                {item.myRating}
              </span>
            )}
          </div>

          {total > 0 ? (
            <Progress value={percent} className="h-1.5" />
          ) : (
            <div className="h-1.5 rounded-full bg-muted" title="连载中，总集数未知" />
          )}

          <div className="mt-auto flex items-center gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={() => handleInc(item)}>
              <Plus className="size-3.5" /> +1
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={item.progress <= 0}
              onClick={() => decProgress(item.subjectId)}
              title="点错了就 -1"
            >
              <Minus className="size-3.5" />
            </Button>
            <Select
              value={item.status}
              onValueChange={(v) => updateTracking(item.subjectId, { status: v as WatchStatus })}
            >
              <SelectTrigger className="h-8 w-24 text-xs">
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
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {data.tracking.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <p>还没有追任何番。</p>
          <Button variant="link" onClick={() => navigate('/season')}>
            去本季新番挑几部 →
          </Button>
        </div>
      ) : (
        <>
          <div className="relative max-w-xs">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索我的追番（中/日文名）"
              className="pl-8 pr-8"
            />
            {query && (
              <button
                className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setQuery('')}
                aria-label="清除搜索"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        <Tabs defaultValue="watching">
          <TabsList>
            {TAB_ORDER.map((s) => {
              const count = data.tracking.filter((t) => t.status === s).length
              return (
                <TabsTrigger key={s} value={s}>
                  {STATUS_LABEL[s]}
                  {count > 0 && <span className="ml-1 text-xs text-muted-foreground">{count}</span>}
                </TabsTrigger>
              )
            })}
          </TabsList>
          {TAB_ORDER.map((s) => {
            const items = data.tracking.filter((t) => t.status === s && matchesQuery(t))
            return (
              <TabsContent key={s} value={s}>
                {items.length === 0 ? (
                  <div className="py-16 text-center text-sm text-muted-foreground">
                    {query.trim()
                      ? `「${STATUS_LABEL[s]}」里没有匹配「${query.trim()}」的番`
                      : `「${STATUS_LABEL[s]}」里还没有番`}
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map(renderCard)}
                  </div>
                )}
              </TabsContent>
            )
          })}
        </Tabs>
        </>
      )}

      <DetailDialog
        subjectId={detailId}
        open={detailId !== null}
        onOpenChange={(o) => !o && setDetailId(null)}
      />
    </div>
  )
}
