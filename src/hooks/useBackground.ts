// ===== 订阅外观偏好（背景图 / 遮罩浓度 / 卡片与弹窗透明度）的 Hook =====

import { useEffect, useState } from 'react'
import {
  getBackground,
  getBackgroundOverlay,
  getCardAlpha,
  getDialogAlpha,
  onBackgroundChange,
} from '@/lib/background'

function read() {
  return {
    image: getBackground(),
    overlay: getBackgroundOverlay(),
    cardAlpha: getCardAlpha(),
    dialogAlpha: getDialogAlpha(),
  }
}

export function useBackground(): ReturnType<typeof read> {
  const [state, setState] = useState(read)
  useEffect(() => onBackgroundChange(() => setState(read())), [])
  return state
}
