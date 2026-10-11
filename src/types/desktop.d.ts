// 桌面端（Electron preload）桥接 API 的全局类型声明
export {}

/** 主进程推送的应用更新状态 */
declare global {
  type UpdaterStatus =
    | { phase: 'checking'; manual: boolean }
    | { phase: 'downloading'; version: string; manual: boolean }
    | { phase: 'progress'; percent: number; manual: boolean }
    | { phase: 'downloaded'; version: string; manual: boolean }
    | { phase: 'up-to-date'; manual: boolean }
    | { phase: 'available'; version: string; notes: string; url: string; manual: boolean }
    | { phase: 'error'; message: string; manual: boolean }

  interface UpdaterBridge {
    check: (manual: boolean) => Promise<void>
    getVersion: () => Promise<string>
    install: () => void
    openReleases: () => void
    onStatus: (cb: (status: UpdaterStatus) => void) => () => void
  }

  interface Window {
    desktop?: {
      /** 操作系统平台（process.platform） */
      platform: string
      /** 当前系统是否支持玻璃材质透出（Win11+ / macOS） */
      glass: boolean
      minimize: () => void
      toggleMaximize: () => void
      close: () => void
      /** 订阅最大化状态变化；返回取消订阅函数 */
      onMaximizedChange: (cb: (maximized: boolean) => void) => () => void
      /** 应用内更新（仅 Electron 环境存在） */
      updater: UpdaterBridge
    }
  }
}
