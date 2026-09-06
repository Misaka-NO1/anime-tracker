// 桌面端（Electron preload）桥接 API 的全局类型声明
export {}

declare global {
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
    }
  }
}
