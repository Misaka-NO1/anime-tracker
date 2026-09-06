// 预加载脚本：以受控方式把窗口控制桥接给页面（contextIsolation 下页面无 Node 权限）
const { contextBridge, ipcRenderer } = require('electron')
const os = require('os')

// 与 main.cjs 保持一致的材质支持判断：Win11+ 或 macOS 才能透出系统玻璃材质
const isWin11 =
  process.platform === 'win32' && Number(os.release().split('.')[2] || 0) >= 22000
const glass = process.platform === 'darwin' || isWin11

contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  glass,
  minimize: () => ipcRenderer.send('win:minimize'),
  toggleMaximize: () => ipcRenderer.send('win:toggle-maximize'),
  close: () => ipcRenderer.send('win:close'),
  /** 订阅最大化状态变化；返回取消订阅函数 */
  onMaximizedChange: (cb) => {
    const listener = (_event, maximized) => cb(Boolean(maximized))
    ipcRenderer.on('win:maximized', listener)
    return () => ipcRenderer.removeListener('win:maximized', listener)
  },
})
