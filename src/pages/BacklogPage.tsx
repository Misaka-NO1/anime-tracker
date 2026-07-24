// ===== 补旧番页：手动增删改 + 从 Bangumi 搜索添加，不进放送表 =====

import { useState } from 'react'
import { Loader2, Minus, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { CoverImage } from '@/components/CoverImage'
import { searchSubjects } from '@/lib/bangumi'
import { useStore } from '@/store/useStore'
import type { BgmSubject } from '@/types'

export default function BacklogPage() {
  const { data, addBacklog, updateBacklog, removeBacklog, config } = useStore()

  // 手动添加表单
  const [title, setTitle] = useState('')
  const [eps, setEps] = useState('')
  const [note, setNote] = useState('')

  // Bangumi 搜索
  const [keyword, setKeyword] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<BgmSubject[] | null>(null)

  if (!config) return null

  const handleAdd = () => {
    const total = parseInt(eps, 10)
    if (!title.trim() || !Number.isFinite(total) || total <= 0) return
    addBacklog({ title: title.trim(), totalEpisodes: total, progress: 0, note: note.trim() })
    setTitle('')
    setEps('')
    setNote('')
  }

  const handleSearch = async () => {
    const kw = keyword.trim()
    if (!kw || searching) return
    setSearching(true)
    try {
      const items = await searchSubjects(kw)
      setResults(items)
    } catch (e) {
      toast.error(`搜索失败：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSearching(false)
    }
  }

  const handleAddFromSearch = (s: BgmSubject) => {
    const name = s.name_cn || s.name
    const total = s.total_episodes || s.eps || 0
    addBacklog({
      title: name,
      totalEpisodes: total,
      progress: 0,
      note: '',
      subjectId: s.id > 0 ? s.id : undefined,
      cover: s.images?.common ?? s.images?.medium ?? '',
    })
    toast.success(`已添加《${name}》到补旧番`)
  }

  const addedIds = new Set(data.backlog.map((b) => b.subjectId).filter(Boolean))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">从 Bangumi 搜索添加（自动带封面和集数）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="输入番名搜索，如：钢之炼金术师"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={!keyword.trim() || searching}>
              {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              搜索
            </Button>
          </div>

          {results && (
            <div className="max-h-80 space-y-1 overflow-y-auto rounded-md border p-2">
              {results.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  没有找到相关番剧，换个关键词试试。
                </p>
              ) : (
                results.map((s) => {
                  const name = s.name_cn || s.name
                  const total = s.total_episodes || s.eps || 0
                  const added = s.id > 0 && addedIds.has(s.id)
                  return (
                    <div key={s.id} className="flex items-center gap-3 rounded-md p-2 hover:bg-accent/50">
                      <CoverImage
                        src={s.images?.grid ?? s.images?.small}
                        alt={name}
                        className="h-14 w-10 shrink-0 rounded"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium" title={name}>{name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.date ?? '首播未知'} · {total > 0 ? `全 ${total} 话` : '连载中'}
                        </p>
                      </div>
                      {added ? (
                        <Button size="sm" variant="secondary" disabled>
                          已添加
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleAddFromSearch(s)}>
                          <Plus className="size-3.5" /> 添加
                        </Button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">手动添加</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-48 flex-1 space-y-1.5">
              <Label htmlFor="bl-title">番名</Label>
              <Input
                id="bl-title"
                placeholder="钢之炼金术师FA"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="w-28 space-y-1.5">
              <Label htmlFor="bl-eps">总集数</Label>
              <Input
                id="bl-eps"
                type="number"
                min={1}
                placeholder="64"
                value={eps}
                onChange={(e) => setEps(e.target.value)}
              />
            </div>
            <div className="min-w-40 flex-1 space-y-1.5">
              <Label htmlFor="bl-note">备注（可选）</Label>
              <Input
                id="bl-note"
                placeholder="补到fa篇"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <Button onClick={handleAdd} disabled={!title.trim() || !eps}>
              <Plus className="size-4" /> 添加
            </Button>
          </div>
        </CardContent>
      </Card>

      {data.backlog.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          补旧番列表是空的。这里的数据不进入放送表。
        </div>
      ) : (
        <div className="space-y-3">
          {data.backlog.map((b) => {
            const hasTotal = b.totalEpisodes > 0
            const percent = hasTotal
              ? Math.min(100, Math.round((b.progress / b.totalEpisodes) * 100))
              : 0
            return (
              <Card key={b.id} className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  {b.cover && (
                    <CoverImage
                      src={b.cover}
                      alt={b.title}
                      className="h-16 w-12 shrink-0 rounded"
                    />
                  )}
                  <div className="min-w-40 flex-1">
                    <p className="font-medium">{b.title}</p>
                    <Input
                      className="mt-1 h-7 text-xs text-muted-foreground"
                      placeholder="备注…"
                      value={b.note}
                      onChange={(e) => updateBacklog(b.id, { note: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={b.progress <= 0}
                      onClick={() => updateBacklog(b.id, { progress: b.progress - 1 })}
                    >
                      <Minus className="size-3.5" />
                    </Button>
                    <div className="flex items-center gap-1 text-sm">
                      <Input
                        type="number"
                        min={0}
                        max={hasTotal ? b.totalEpisodes : undefined}
                        className="h-8 w-16 text-center"
                        value={b.progress}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10)
                          if (Number.isFinite(v)) {
                            updateBacklog(b.id, {
                              progress: hasTotal ? Math.max(0, Math.min(v, b.totalEpisodes)) : Math.max(0, v),
                            })
                          }
                        }}
                      />
                      <span className="text-muted-foreground">/ {hasTotal ? b.totalEpisodes : '?'}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={hasTotal && b.progress >= b.totalEpisodes}
                      onClick={() => updateBacklog(b.id, { progress: b.progress + 1 })}
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  </div>

                  <div className="w-32">
                    {hasTotal ? (
                      <>
                        <Progress value={percent} className="h-1.5" />
                        <p className="mt-1 text-right text-xs text-muted-foreground">{percent}%</p>
                      </>
                    ) : (
                      <p className="text-right text-xs text-muted-foreground">总集数未知</p>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      if (window.confirm(`确定删除《${b.title}》？`)) removeBacklog(b.id)
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
