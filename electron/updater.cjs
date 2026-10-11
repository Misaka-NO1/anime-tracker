// ===== 应用内更新 =====
// Windows：electron-updater + NSIS 安装包，全自动（检查 → 后台下载 → 重启安装）
// macOS：应用未签名，系统不允许静默替换已安装应用，改为访问 Releases 页面的 302 跳转解析最新版本
//        （非 API 端点、无匿名限流），提示用户一键前往下载页（若日后签名，可切回 electron-updater）
const { app, BrowserWindow, ipcMain, shell } = require('electron')
const { autoUpdater } = require('electron-updater')

const OWNER = 'Misaka-NO1'
const REPO = 'anime-tracker'
const RELEASES_URL = `https://github.com/${OWNER}/${REPO}/releases/latest`

// 手动检查才弹错误提示，启动时的静默检查失败不打扰用户
let manualCheck = false

function broadcast(status) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('updater:status', status)
  }
}

// 只比较 x.y.z 数字段，忽略 prerelease 后缀
function compareVersions(a, b) {
  const pa = a.replace(/^v/, '').split('.').map(Number)
  const pb = b.replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0)
    if (d !== 0) return d
  }
  return 0
}

function setupElectronUpdater() {
  autoUpdater.autoDownload = true
  // 用户无视提示也没关系：退出应用时自动装好，下次打开就是新版
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.logger = console

  autoUpdater.on('checking-for-update', () => {
    broadcast({ phase: 'checking', manual: manualCheck })
  })
  // autoDownload 已开启，发现新版本即开始后台下载
  autoUpdater.on('update-available', (info) => {
    broadcast({ phase: 'downloading', version: info.version, manual: manualCheck })
  })
  autoUpdater.on('update-not-available', () => {
    broadcast({ phase: 'up-to-date', manual: manualCheck })
  })
  autoUpdater.on('download-progress', (p) => {
    broadcast({ phase: 'progress', percent: Math.round(p.percent), manual: manualCheck })
  })
  autoUpdater.on('update-downloaded', (info) => {
    broadcast({ phase: 'downloaded', version: info.version, manual: manualCheck })
  })
  autoUpdater.on('error', (err) => {
    broadcast({ phase: 'error', message: String(err?.message || err), manual: manualCheck })
  })
}

// macOS:走 Releases 页面的 302 跳转拿最新版本号(非 API 端点,无限流;
// API 端点匿名仅 60 次/小时/IP,共享出口 IP 上常年被打满,403 会误报成"获取失败")
async function checkMacRelease() {
  let res
  try {
    res = await fetch(RELEASES_URL, {
      headers: { 'User-Agent': 'anime-tracker-updater' },
    })
  } catch {
    throw new Error('网络错误，无法连接 GitHub，请检查网络后重试')
  }
  if (!res.ok) throw new Error(`GitHub 页面请求失败（HTTP ${res.status}），请稍后重试`)
  // 跟随 302 后的最终地址形如 .../releases/tag/v1.2.2
  const m = res.url.match(/\/releases\/tag\/(v\d+\.\d+\.\d+)/)
  if (!m) throw new Error('未能从 Releases 页面解析出最新版本号')
  const latestTag = m[1]
  console.log(`[updater] GitHub 最新发布 ${latestTag}，当前版本 ${app.getVersion()}`)
  if (compareVersions(latestTag, app.getVersion()) <= 0) return null
  return {
    version: latestTag.replace(/^v/, ''),
    url: RELEASES_URL,
  }
}

function check(manual) {
  manualCheck = manual
  if (process.platform === 'darwin') {
    checkMacRelease()
      .then((release) => {
        if (release) broadcast({ phase: 'available', manual, ...release })
        else broadcast({ phase: 'up-to-date', manual })
      })
      .catch((err) => {
        console.error('[updater] 检查更新失败:', err)
        broadcast({ phase: 'error', message: String(err?.message || err), manual })
      })
  } else {
    autoUpdater.checkForUpdates().catch((err) =>
      broadcast({ phase: 'error', message: String(err?.message || err), manual })
    )
  }
}

function init() {
  // 开发模式（未打包）没有 app-update.yml 和签名上下文，全部跳过
  if (!app.isPackaged) return

  if (process.platform !== 'darwin') setupElectronUpdater()

  // 启动后静默检查一次（manual=false，出错不弹提示）
  setTimeout(() => check(false), 5000)

  ipcMain.handle('updater:check', (_e, manual) => {
    check(Boolean(manual))
  })
  ipcMain.handle('updater:get-version', () => app.getVersion())
  ipcMain.on('updater:install', () => {
    if (process.platform === 'darwin') return
    autoUpdater.quitAndInstall()
  })
  ipcMain.on('updater:open-releases', () => {
    void shell.openExternal(RELEASES_URL)
  })
}

module.exports = { init }
