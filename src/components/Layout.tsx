// ===== 全局布局：顶栏导航 + 未配置重定向 =====

import { useEffect } from 'react'
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { Clapperboard, Settings, CloudUpload, Loader2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/season', label: '本季新番' },
  { to: '/watching', label: '我的追番' },
  { to: '/calendar', label: '放送表' },
  { to: '/backlog', label: '补旧番' },
  { to: '/notes', label: '追番日记' },
]

export function Layout() {
  const { config, saving, saveError, loadData, loading } = useStore()
  const location = useLocation()

  // 首次进入（已配置）时拉取远端数据
  useEffect(() => {
    if (config) void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.githubToken, config?.owner, config?.repo])

  if (!config && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <NavLink to="/season" className="flex items-center gap-2 font-bold">
            <Clapperboard className="size-5 text-primary" />
            <span>追番日程表</span>
          </NavLink>

          <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {loading && <Loader2 className="size-3.5 animate-spin" />}
            {saving && (
              <span className="flex items-center gap-1">
                <CloudUpload className="size-3.5 animate-pulse" /> 保存中
              </span>
            )}
            {saveError && <span className="max-w-48 truncate text-destructive">{saveError}</span>}
            <NavLink
              to="/setup"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )
              }
            >
              <Settings className="size-4" />
              设置
            </NavLink>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
