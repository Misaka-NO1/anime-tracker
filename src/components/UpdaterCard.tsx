// 设置页「软件更新」卡片：当前版本、检查更新、下载进度、安装/跳转下载页
import { CheckCircle2, Download, Loader2, RefreshCw, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useUpdater } from '@/hooks/useUpdater'

export function UpdaterCard() {
  const { state, version, check, install, openReleases } = useUpdater()

  // 纯网页环境（vite dev / GitHub Pages）没有桌面桥接，不显示
  if (!window.desktop?.updater) return null

  const busy = state.phase === 'checking' || state.phase === 'downloading'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">软件更新</CardTitle>
        <CardDescription>当前版本 {version ? `v${version}` : '…'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {state.phase === 'downloading' && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span>正在下载 v{state.version}…</span>
              <span className="text-muted-foreground">{state.percent ?? 0}%</span>
            </div>
            <Progress value={state.percent ?? 0} />
          </div>
        )}
        {state.phase === 'downloaded' && (
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 shrink-0 text-green-600 dark:text-green-400" />
            新版本 v{state.version} 已就绪，重启应用即自动安装
          </div>
        )}
        {state.phase === 'available' && (
          <div className="space-y-2 text-sm">
            <div>
              新版本 v{state.version} 已发布。macOS 暂不支持应用内自动更新，请前往下载页获取安装包。
            </div>
            {state.notes && (
              <p className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                {state.notes}
              </p>
            )}
          </div>
        )}
        {state.phase === 'up-to-date' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 shrink-0" />
            已是最新版本
          </div>
        )}
        {state.phase === 'error' && (
          <div className="text-sm text-destructive">检查更新失败：{state.message}</div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => check(true)} disabled={busy}>
            {state.phase === 'checking' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            检查更新
          </Button>
          {state.phase === 'downloaded' && (
            <Button onClick={install}>
              <RotateCcw className="size-4" />
              重启并安装
            </Button>
          )}
          {state.phase === 'available' && (
            <Button onClick={openReleases}>
              <Download className="size-4" />
              前往下载
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
