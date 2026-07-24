# 追番日程表（Anime Tracker）

一个**纯前端、开源**的个人季度追番管理网页应用：新番信息从 [Bangumi](https://bgm.tv) API 自动拉取，个人追番数据存储在**你自己的 GitHub 私有仓库**（`data.json`）中，无需任何后端服务器。GitHub 仓库即数据库，自带版本历史。

## 功能

- 📺 **本季新番**：选择季度，浏览全部新番封面卡片（封面、番名、放送日、Bangumi 评分）
- ➕ **我的追番**：一键追番，状态在 想看 / 在看 / 看完 / 弃番 间流转，「+1」记录进度，自动保存
- 📋 **番剧详情**：封面大图、简介、放送信息、Bangumi 评分/标签 + 我的评分（1–10）与吐槽
- 🗓️ **每周放送表**：周一到周日七列，一眼看出今天哪几部更新，今天高亮
- 📚 **补旧番**：手动添加旧番（番名 + 总集数），独立维护进度，不进放送表
- ☁️ **多设备同步**：数据存 GitHub 私有仓库，换设备打开即最新

## 三分钟上手

> **🪟 Windows 用户免安装**：直接在 [Releases](https://github.com/Misaka-NO1/anime-tracker/releases) 下载最新 zip，解压后双击 `追番日程表.exe` 即可（如遇 SmartScreen 提示，点「更多信息 → 仍要运行」）。然后从第 2 步开始配置。

1. **获取应用**：Windows 直接用 Releases 的免安装包（见上）；其他平台 Fork 或 Clone 本仓库本地运行，或部署到 GitHub Pages（见下）
2. **建私有数据仓库**：GitHub 新建一个 **Private** 仓库（如 `anime-tracker-data`），无需任何文件
3. **创建 fine-grained Token**：
   - GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token
   - Repository access → **Only select repositories** → 勾选你的数据仓库
   - Permissions → Repository permissions → **Contents: Read and write**（其余保持无权限）
4. **打开应用**：首次进入自动跳转设置页，填入 Token / 用户名 / 仓库名，点「测试连接并保存」即可开追

> ⚠️ 安全提示：配置（含 Token）仅存储在浏览器 localStorage，不会上传到任何服务器；数据仓库请务必设为 Private；Token 泄露时可在 GitHub 同一页面随时吊销。

## 技术栈

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- zustand（状态管理）+ react-router（HashRouter，兼容 GitHub Pages）
- 数据源：Bangumi API（`api.bgm.tv`）+ 24h 本地缓存 + [bangumi-data](https://github.com/bangumi-data/bangumi-data) 兜底
- 存储：GitHub REST Contents API 读写私有仓库 `data.json`，含 sha 冲突检测

## 本地开发

```bash
npm install
npm run dev      # http://localhost:3000（/bgm 代理至 api.bgm.tv）
npm run build    # 产物输出到 dist/
```

## 部署到 GitHub Pages

1. `vite.config.ts` 中已设置 `base: './'`，可直接部署到任意子路径
2. 安装 `gh-pages` 包后 `npm run build && npx gh-pages -d dist`；或用 GitHub Actions 发布 `dist`
3. 应用使用 HashRouter，子路由不会 404

## 数据说明

`data.json` 结构见 `tracking[]`（追番记录，含 Bangumi 元数据快照）与 `backlog[]`（手动补旧番）。每次变更产生一次 commit，天然带版本历史；双设备同时修改时以远端为准并提示刷新。

## License

[MIT](./LICENSE)
