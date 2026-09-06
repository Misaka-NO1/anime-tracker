// ===== 桌面端窗口控制按钮：仅 Electron 且非 macOS 时渲染（macOS 用原生红绿灯） =====

import { useEffect, useState } from 'react'
import { Minus, Square, X, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

export function TitleBarControls() {
  const desktop = window.desktop
  const [maximized, setMaximized] = useState(false)

  useEffect(() => desktop?.onMaximizedChange(setMaximized), [desktop])

  if (!desktop || desktop.platform === 'darwin') return null

  const btn =
    'app-region-no-drag flex h-8 w-11 items-center justify-center text-muted-foreground transition-colors'

  return (
    <div className="ml-1 flex items-center self-stretch">
      <button
        className={cn(btn, 'hover:bg-black/10 hover:text-foreground')}
        onClick={() => desktop.minimize()}
        aria-label="最小化"
        title="最小化"
      >
        <Minus className="size-4" />
      </button>
      <button
        className={cn(btn, 'hover:bg-black/10 hover:text-foreground')}
        onClick={() => desktop.toggleMaximize()}
        aria-label={maximized ? '还原' : '最大化'}
        title={maximized ? '还原' : '最大化'}
      >
        {maximized ? <Copy className="size-3.5" /> : <Square className="size-3.5" />}
      </button>
      <button
        className={cn(btn, 'hover:bg-destructive hover:text-destructive-foreground')}
        onClick={() => desktop.close()}
        aria-label="关闭"
        title="关闭"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
