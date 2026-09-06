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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
