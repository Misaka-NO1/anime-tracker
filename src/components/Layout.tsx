// ===== 全局布局：顶栏导航 + 未配置重定向 =====
// 桌面端（Electron）：顶栏兼作无边框窗口的标题栏（可拖拽），右侧挂自绘窗口控制按钮

import { useEffect } from 'react'
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { Settings, CloudUpload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { TitleBarControls } from '@/components/TitleBar'
import logo from '@/assets/logo.png'
import { useBackground } from '@/hooks/useBackground'
import { useColorScheme } from '@/hooks/useColorScheme'
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
  // 自定义背景图（设置页可更换），overlay 为磨砂遮罩浓度（可调）；暗色模式下遮罩改用黑色
  const { image: bg, overlay, cardAlpha, dialogAlpha, material } = useBackground()
  const scheme = useColorScheme()

  // 把外观偏好同步为 CSS 变量与 has-bg/pure 标记（设置页拖滑杆/切模式实时生效）
  useEffect(() => {
    const el = document.documentElement
    el.classList.toggle('has-bg', !!bg)
    el.classList.toggle('pure', material === 'pure')
    el.style.setProperty('--card-alpha', String(cardAlpha))
    el.style.setProperty('--dialog-alpha', String(dialogAlpha))
  }, [bg, cardAlpha, dialogAlpha, material])

  // 首次进入（已配置）时拉取远端数据
  useEffect(() => {
    if (config) void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.githubToken, config?.owner, config?.repo])

  // 保存失败：用 toast 展示完整错误（顶栏小红字会截断，且容易 unnoticed）
  useEffect(() => {
    if (saveError) toast.error(`保存失败：${saveError}`)
  }, [saveError])

  if (!config && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />
  }

  return (
    <div
      className={cn('app-shell min-h-screen', !glass && !bg && 'bg-background')}
      style={
        bg
          ? (() => {
              const rgb = scheme === 'dark' ? '0, 0, 0' : '255, 255, 255'
              // 暗色下遮罩设 65% 下限：滑杆拖得再低，文字也保持可读
              const effective = scheme === 'dark' ? Math.max(overlay, 0.65) : overlay
              return {
                backgroundImage: `linear-gradient(rgba(${rgb}, ${effective}), rgba(${rgb}, ${effective})), url("${bg}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed',
              }
            })()
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
            <img src={logo} alt="番见" className="size-7 rounded-lg" />
            <span className="text-brand-gradient">番见</span>
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
            aria-live="polite"
            className={cn(
              'flex items-center gap-2 text-xs text-muted-foreground',
              desktop && 'app-region-no-drag',
            )}
          >
            {loading && (
              <span className="flex items-center gap-1">
                <Loader2 className="size-3.5 animate-spin" /> 加载中
              </span>
            )}
            {saving && (
              <span className="flex items-center gap-1">
                <CloudUpload className="size-3.5 animate-pulse" /> 保存中
              </span>
            )}
            {saveError && (
              <span className="text-destructive" role="alert">
                保存失败
              </span>
            )}
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
