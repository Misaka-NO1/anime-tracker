import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'
import { HttpsProxyAgent } from 'https-proxy-agent'

// Bangumi API 的出站代理：浏览器直连 api.bgm.tv 在本机不可达时，
// 前端会自动改走同源路径 /bgm-api，由这里经本地 HTTP 代理转发出去。
// 可用环境变量 BGM_PROXY 覆盖代理地址。
const bgmProxyAgent = new HttpsProxyAgent(
  process.env.BGM_PROXY || process.env.https_proxy || 'http://127.0.0.1:7890',
)

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [inspectAttr(), react()],
  server: {
    port: 3000,
    proxy: {
      '/bgm-api': {
        target: 'https://api.bgm.tv',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/bgm-api/, ''),
        agent: bgmProxyAgent,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
