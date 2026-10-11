import { useEffect, useState } from 'react'

// 跟随系统亮/暗色方案。
// main.tsx 依据同一媒体查询维护 html.dark（配合 tailwind darkMode: ["class"]），
// 本 hook 供 React 侧（Toaster、背景遮罩等）保持同步。
export function useColorScheme(): 'light' | 'dark' {
  const [dark, setDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return dark ? 'dark' : 'light'
}
