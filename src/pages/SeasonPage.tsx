// ===== 本季新番页：季度切换 + 卡片网格 + 「追这部」 =====

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, Search, Star, TriangleAlert, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CoverImage } from '@/components/CoverImage'
import { DetailDialog } from '@/components/DetailDialog'
import { toast } from 'sonner'
import { fetchSeasonAnime, type SeasonFetchResult } from '@/lib/bangumi'
import { currentSeason, seasonList, weekdayLabel, weekdayOf } from '@/lib/season'
import { useStore } from '@/store/useStore'
import { STATUS_LABEL, type BgmSubject } from '@/types'

const SOURCE_LABEL: Record<SeasonFetchResult['source'], string> = {
  api: '',
  cache: '（本地缓存）',
  'stale-cache': '（本地缓存）',
  fallback: '（兜底数据源 bangumi-data，信息较少）',
}

export default function SeasonPage() {
  const { data, track, config } = useStore()
  const navigate = useNavigate()
  const seasons = useMemo(() => seasonList(6, 1), [])
  const [seasonId, setSeasonId] = useState(currentSeason().id)
  const [result, setResult] = useState<SeasonFetchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [reloadFlag, setReloadFlag] = useState(0)
  const [query, setQuery] = useState('')

  const season = seasons.find((s) => s.id === seasonId) ?? seasons[0]

  // 当季列表实时筛选（纯前端，匹配中文名/日文名，不额外请求 API）
  const filteredItems = useMemo(() => {
    const items = result?.items ?? []
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.name_cn ?? '').toLowerCase().includes(q),
    )
  }, [result, query])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchSeasonAnime(season, {
      force: reloadFlag > 0,
      // 后台刷新完成：静默换上新数据；失败不打断当前展示的缓存
      onRefresh: (r, err) => {
        if (cancelled) return
        if (r) setResult(r)
        else if (err) toast.error(`后台更新新番列表失败：${err}（当前显示的是缓存数据）`)
      },
    })
      .then((r) => !cancelled && setResult(r))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [season, reloadFlag])

  if (!config) return null

  const handleTrack = (s: BgmSubject) => {
    track({
      subjectId: s.id,
      season: season.id,
      status: 'want',
      progress: 0,
      myRating: 0,
      comment: '',
      addedAt: new Date().toISOString(),
      cachedMeta: {
        nameCn: s.name_cn || s.name,
        name: s.name,
        cover: s.images?.common ?? s.images?.medium ?? '',
        airWeekday: weekdayOf(s.date),
        totalEpisodes: s.total_episodes || s.eps || 0,
      },
    })
  }

  const trackedMap = new Map(data.tracking.map((t) => [t.subjectId, t]))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={seasonId} onValueChange={setSeasonId}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {seasons.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}新番
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative min-w-40 flex-1 sm:max-w-64 sm:flex-none">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索番剧（中/日文名）"
            className="w-full pl-8 pr-8"
          />
          {query && (
            <button
              className="absolute top-1/2 right-1 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => setQuery('')}
              aria-label="清除搜索"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <span className="hidden text-sm text-muted-foreground sm:inline">
          {result
            ? query.trim()
              ? `匹配 ${filteredItems.length} / ${result.items.length} 部`
              : `共 ${result.items.length} 部${SOURCE_LABEL[result.source]}${result.refreshing ? ' · 后台更新中…' : ''}`
            : ''}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setReloadFlag((f) => f + 1)}
          disabled={loading || result?.refreshing}
        >
          <RefreshCw
            className={loading || result?.refreshing ? 'size-3.5 animate-spin' : 'size-3.5'}
          />
          刷新
        </Button>
      </div>

      {error && !result && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          <span className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            加载失败：{error}
          </span>
          <Button variant="outline" size="sm" onClick={() => setReloadFlag((f) => f + 1)} disabled={loading}>
            <RefreshCw className={loading ? 'size-3.5 animate-spin' : 'size-3.5'} />
            重试
          </Button>
        </div>
      )}

      {loading && !result ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-lg" />
          ))}
        </div>
      ) : result && result.items.length === 0 ? (
        <Empty className="py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Star />
            </EmptyMedia>
            <EmptyTitle>该季度暂无数据</EmptyTitle>
            <EmptyDescription>试试切换其他季度。</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : filteredItems.length === 0 ? (
        <Empty className="py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search />
            </EmptyMedia>
            <EmptyTitle>没有匹配「{query.trim()}」的番剧</EmptyTitle>
            <EmptyDescription>换个关键词试试。</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredItems.map((s) => {
            const tracked = trackedMap.get(s.id)
            const name = s.name_cn || s.name
            return (
              <Card key={s.id} className="group overflow-hidden p-0">
                <button
                  className="relative block w-full text-left"
                  onClick={() => setDetailId(s.id)}
                >
                  <CoverImage
                    src={s.images?.medium ?? s.images?.common}
                    alt={name}
                    className="aspect-[3/4] w-full"
                  />
                  {tracked && (
                    <Badge className="absolute top-2 left-2">{STATUS_LABEL[tracked.status]}</Badge>
                  )}
                  {s.rating?.score ? (
                    <Badge variant="secondary" className="absolute top-2 right-2 gap-0.5">
                      <Star className="star-icon size-3" />
                      {s.rating.score.toFixed(1)}
                    </Badge>
                  ) : null}
                </button>

                <div className="space-y-1.5 p-3">
                  <p className="line-clamp-2 min-h-10 text-sm font-medium" title={name}>
                    {name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.date ? `${s.date} · ${weekdayLabel(weekdayOf(s.date))}` : '首播日期待定'}
                  </p>
                  {tracked ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full"
                      onClick={() => navigate('/watching')}
                    >
                      已追 · {STATUS_LABEL[tracked.status]}
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" className="w-full" onClick={() => handleTrack(s)}>
                      <Plus className="size-3.5" /> 追这部
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <DetailDialog
        subjectId={detailId}
        fallback={result?.items.find((s) => s.id === detailId)}
        open={detailId !== null}
        onOpenChange={(o) => !o && setDetailId(null)}
      />
    </div>
  )
}
