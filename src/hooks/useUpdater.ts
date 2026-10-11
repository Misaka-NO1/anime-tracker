import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

// ===== 应用内更新（仅 Electron 环境可用，浏览器下各 API 自动跳过） =====
// 状态由主进程推送（window.desktop.updater.onStatus），两处消费：
// - <UpdaterToasts /> 挂在 App 根部，负责全局提示
// - useUpdater() 供设置页「软件更新」卡片展示详细状态
// Windows：electron-updater 静默下载，完成后一键重启安装（或退出时自动安装）；
// macOS：应用未签名无法自更新，提示前往 Releases 下载页。

/** 合并进度事件后的完整状态，供 UI 渲染 */
export interface UpdaterState {
  phase: 'idle' | 'checking' | 'downloading' | 'downloaded' | 'up-to-date' | 'available' | 'error'
  version?: string
  notes?: string
  url?: string
  percent?: number
  message?: string
}

function desktop() {
  return window.desktop?.updater
}

/** 设置页「软件更新」卡片用：订阅并合并主进程推送的更新状态 */
export function useUpdater() {
  const [state, setState] = useState<UpdaterState>({ phase: 'idle' })
  const [version, setVersion] = useState<string | null>(null)

  useEffect(() => {
    const bridge = desktop()
    if (!bridge) return
    void bridge.getVersion().then(setVersion)
    return bridge.onStatus((status) => {
      setState((prev) => {
        switch (status.phase) {
          case 'checking':
          case 'downloaded':
          case 'up-to-date':
          case 'available':
            return { ...status }
          case 'downloading':
            return { ...status, percent: 0 }
          case 'progress':
            return { ...prev, phase: 'downloading', percent: status.percent }
          case 'error':
            // 静默检查失败不打扰：保留原状态，仅手动检查时展示错误
            return status.manual ? { phase: 'error', message: status.message } : prev
        }
      })
    })
  }, [])

  const check = useCallback((manual = true) => {
    void desktop()?.check(manual)
  }, [])
  const install = useCallback(() => desktop()?.install(), [])
  const openReleases = useCallback(() => desktop()?.openReleases(), [])

  return { state, version, check, install, openReleases }
}

/** 挂在 App 根部：把更新事件转成全局 toast */
export function UpdaterToasts() {
  const announced = useRef<string | null>(null)

  useEffect(() => {
    const bridge = desktop()
    if (!bridge) return
    return bridge.onStatus((status) => {
      switch (status.phase) {
        case 'downloading':
          if (!status.manual && announced.current !== status.version) {
            announced.current = status.version
            toast.info(`发现新版本 v${status.version}，正在后台下载…`)
          }
          break
        case 'downloaded':
          toast.success(`新版本 v${status.version} 已下载完成`, {
            description: '也可以直接关闭应用，下次启动自动安装',
            action: { label: '重启并安装', onClick: () => bridge.install() },
            duration: 20_000,
          })
          break
        case 'available':
          toast.info(`新版本 v${status.version} 已发布`, {
            description: 'macOS 暂不支持应用内自动更新，请前往下载页手动安装',
            action: { label: '前往下载', onClick: () => bridge.openReleases() },
            duration: 20_000,
          })
          break
        case 'up-to-date':
          if (status.manual) toast.success('已是最新版本')
          break
        case 'error':
          if (status.manual) toast.error(`检查更新失败：${status.message}`)
          break
      }
    })
  }, [])

  return null
}
