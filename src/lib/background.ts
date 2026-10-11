// ===== 自定义背景图：本地选择 → 压缩 → localStorage =====
// 仅存在本机（localStorage），不进 GitHub 数据仓库

const BG_KEY = 'anime-tracker-bg'
const BG_OPACITY_KEY = 'anime-tracker-bg-opacity'
const CARD_ALPHA_KEY = 'anime-tracker-card-alpha'
const DIALOG_ALPHA_KEY = 'anime-tracker-dialog-alpha'
const APPEARANCE_KEY = 'anime-tracker-appearance'
const BG_EVENT = 'anime-tracker-bg-changed'
/** 默认遮罩浓度（白色不透明度）：越低背景图越清晰 */
const DEFAULT_OVERLAY = 0.55
/** 遮罩浓度下限：再透的花纹图片也会吃掉灰色小字的对比度，兜底 45% 白 */
export const MIN_OVERLAY = 0.45
/** 卡片/弹窗默认不透明度：越低越透 */
const DEFAULT_CARD_ALPHA = 0.5
const DEFAULT_DIALOG_ALPHA = 0.62

/** 外观材质：glass = 玻璃模式（透出背景图），pure = 纯净模式（素净实底） */
export type MaterialMode = 'glass' | 'pure'

export function getMaterialMode(): MaterialMode {
  try {
    return localStorage.getItem(APPEARANCE_KEY) === 'pure' ? 'pure' : 'glass'
  } catch {
    return 'glass'
  }
}

export function setMaterialMode(mode: MaterialMode): void {
  try {
    localStorage.setItem(APPEARANCE_KEY, mode)
  } catch {
    // localStorage 不可用时静默降级为默认玻璃模式
  }
  notify()
}

export function getBackground(): string | null {
  try {
    return localStorage.getItem(BG_KEY)
  } catch {
    return null
  }
}

function readAlpha(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key)
    const v = raw === null ? NaN : Number(raw)
    return Number.isFinite(v) && v >= 0.2 && v <= 0.95 ? v : fallback
  } catch {
    return fallback
  }
}

function writeAlpha(key: string, v: number): void {
  localStorage.setItem(key, String(v))
  notify()
}

export function getBackgroundOverlay(): number {
  return Math.max(readAlpha(BG_OPACITY_KEY, DEFAULT_OVERLAY), MIN_OVERLAY)
}

export function setBackgroundOverlay(v: number): void {
  writeAlpha(BG_OPACITY_KEY, v)
}

export function getCardAlpha(): number {
  return readAlpha(CARD_ALPHA_KEY, DEFAULT_CARD_ALPHA)
}

export function setCardAlpha(v: number): void {
  writeAlpha(CARD_ALPHA_KEY, v)
}

export function getDialogAlpha(): number {
  return readAlpha(DIALOG_ALPHA_KEY, DEFAULT_DIALOG_ALPHA)
}

export function setDialogAlpha(v: number): void {
  writeAlpha(DIALOG_ALPHA_KEY, v)
}

function notify() {
  window.dispatchEvent(new Event(BG_EVENT))
}

export function onBackgroundChange(cb: () => void): () => void {
  window.addEventListener(BG_EVENT, cb)
  return () => window.removeEventListener(BG_EVENT, cb)
}

export function clearBackground(): void {
  localStorage.removeItem(BG_KEY)
  notify()
}

/** 把图片压缩到最长边 1920px、JPEG 0.82，存入 localStorage */
export async function setBackgroundFromFile(file: File): Promise<void> {
  if (!file.type.startsWith('image/')) {
    throw new Error('请选择图片文件')
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsDataURL(file)
  })

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('图片解析失败'))
    el.src = dataUrl
  })

  const MAX = 1920
  const scale = Math.min(1, MAX / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('图片处理失败')
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const compressed = canvas.toDataURL('image/jpeg', 0.82)

  try {
    localStorage.setItem(BG_KEY, compressed)
  } catch {
    throw new Error('图片太大，存不下——换一张小一点的图试试')
  }
  notify()
}
