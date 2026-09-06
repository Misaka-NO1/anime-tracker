// Electron 主进程：加载本地打包好的网页应用
// 无边框窗口：Win11 用 Mica 云母材质 + 页面自绘玻璃标题栏；macOS 用 hiddenInset + vibrancy
const { app, BrowserWindow, shell, ipcMain } = require('electron')
const path = require('path')
const os = require('os')

const isMac = process.platform === 'darwin'
// Mica/Acrylic 材质仅 Windows 11（build 22000+）可用；Win10 回退为纯色 + CSS 玻璃
const isWin11 =
  process.platform === 'win32' && Number(os.release().split('.')[2] || 0) >= 22000
const supportsGlass = isMac || isWin11

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    autoHideMenuBar: true,
    // 隐藏系统标题栏，由页面自绘
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    // 系统级玻璃材质；不支持的平台保持纯色背景
    ...(isMac ? { vibrancy: 'sidebar' } : isWin11 ? { backgroundMaterial: 'mica' } : {}),
    // 支持材质的平台用透明窗口背景，让材质透出来
    backgroundColor: supportsGlass ? '#00000000' : '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      // preload 需要 require('os') 判断系统版本，sandbox 白名单不含 os，关闭之
      sandbox: false,
    },
  })

  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))

  // 外部链接一律交给系统浏览器
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // 把最大化状态同步给标题栏按钮图标
  win.on('maximize', () => win.webContents.send('win:maximized', true))
  win.on('unmaximize', () => win.webContents.send('win:maximized', false))

  return win
}

// ===== 窗口控制 IPC（自绘标题栏按钮） =====
ipcMain.on('win:minimize', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize())
ipcMain.on('win:toggle-maximize', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  if (!win) return
  if (win.isMaximized()) win.unmaximize()
  else win.maximize()
})
ipcMain.on('win:close', (e) => BrowserWindow.fromWebContents(e.sender)?.close())

// 单实例锁：重复双击时不再开新窗口，而是聚焦已有窗口
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows()
    if (win) {
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    }
  })

  app.whenReady().then(() => {
    createWindow()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
