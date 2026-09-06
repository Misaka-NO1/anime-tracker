// ===== 全局布局：顶栏导航 + 未配置重定向 =====
// 桌面端（Electron）：顶栏兼作无边框窗口的标题栏（可拖拽），右侧挂自绘窗口控制按钮

import { useEffect } from 'react'
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { Clapperboard, Settings, CloudUpload, Loader2 } from 'lucide-react'
import { TitleBarControls } from '@/components/TitleBar'
import { useBackground } from '@/hooks/useBackground'
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

  // 桌面端环境：glass = 系统支持材质透出（Win11 Mica / macOS vibrancy）
  const desktop = window.desktop
  const glass = !!desktop?.glass
  const isMac = desktop?.platform === 'darwin'
  // 自定义背景图（设置页可更换），overlay 为磨砂白遮罩浓度（可调）
  const { image: bg, overlay, cardAlpha, dialogAlpha } = useBackground()

  // 把外观偏好同步为 CSS 变量与 has-bg 标记（设置页拖滑杆实时生效）
  useEffect(() => {
    const el = document.documentElement
    el.classList.toggle('has-bg', !!bg)
    el.style.setProperty('--card-alpha', String(cardAlpha))
    el.style.setProperty('--dialog-alpha', String(dialogAlpha))
  }, [bg, cardAlpha, dialogAlpha])

  // 首次进入（已配置）时拉取远端数据
  useEffect(() => {
    if (config) void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.githubToken, config?.owner, config?.repo])

  if (!config && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />
  }

  return (
    <div
      className={cn('min-h-screen', !glass && !bg && 'bg-background')}
      style={
        bg
          ? {
              backgroundImage: `linear-gradient(rgba(255, 255, 255, ${overlay}), rgba(255, 255, 255, ${overlay})), url("${bg}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundAttachment: 'fixed',
            }
          : undefined
      }
    >
      <header
        className={cn(
          'sticky top-0 z-40 border-b',
          glass ? 'glass-header' : 'bg-background/95 backdrop-blur',
          desktop && 'app-region-drag',
        )}
      >
        <div
          className={cn(
            'mx-auto flex h-14 max-w-6xl items-center gap-4 px-4',
            // macOS 原生红绿灯在左上，留出空间
            isMac && 'pl-24',
          )}
        >
          <NavLink
            to="/season"
            className={cn('flex items-center gap-2 font-bold', desktop && 'app-region-no-drag')}
          >
            <Clapperboard className="size-5 text-primary" />
            <span>追番日程表</span>
          </NavLink>

          <nav
            className={cn(
              'flex flex-1 items-center gap-1 overflow-x-auto',
              desktop && 'app-region-no-drag',
            )}
          >
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

          <div
            className={cn(
              'flex items-center gap-2 text-xs text-muted-foreground',
              desktop && 'app-region-no-drag',
            )}
          >
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
            <TitleBarControls />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
