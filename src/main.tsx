import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// 桌面端（Electron）标记环境：glass 类开启系统材质透出的玻璃样式
if (window.desktop) {
  document.documentElement.classList.add('desktop')
  if (window.desktop.glass) document.documentElement.classList.add('glass')
}

// 暗色模式跟随系统：为 html 维护 dark 类（tailwind darkMode: ["class"] 与玻璃暗色分支都依赖它）
const darkMq = window.matchMedia('(prefers-color-scheme: dark)')
const applyDark = (e: MediaQueryList | MediaQueryListEvent) =>
  document.documentElement.classList.toggle('dark', e.matches)
applyDark(darkMq)
darkMq.addEventListener('change', applyDark)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
