# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 Electron 的番茄钟桌面应用。简约设计，单窗口、不可调整大小，使用 macOS hiddenInset 标题栏风格。

## 启动命令

```bash
npm start
```

通过 `package.json` 的 `start` 脚本执行 `electron .`，主入口为 `main.js`。

## 架构

```
main.js          → Electron 主进程：创建窗口、处理系统通知 IPC
preload.js       → 上下文桥接：通过 contextBridge 暴露 pomodoroAPI 到渲染进程
renderer/
  index.html     → 界面结构：拖拽栏、阶段标签、SVG 环形进度条、控制按钮、番茄计数、设置面板
  style.css      → 样式 / CSS 变量主题系统（专注=红色、短休息=绿色、长休息=蓝色）
  app.js         → 纯前端番茄钟逻辑（无框架依赖），操作 DOM 实现计时+阶段切换
```

### 主进程 (main.js)

- 创建 `BrowserWindow`（400×570，不可 resize，`titleBarStyle: "hiddenInset"`）
- 通过 `ipcMain.handle("show-notification")` 处理渲染进程发来的原生通知请求

### 渲染进程 (renderer/)

**app.js — 核心状态机：**

- `CONFIG` 对象从 `localStorage` 加载/保存用户设置（专注/短休息/长休息时长）
- `PHASES` 数组根据 CONFIG 构建，包含三个阶段：`focus` → `shortBreak` / `longBreak` → `focus`
- `state` 对象持有当前阶段、剩余秒数、运行状态、番茄计数
- 阶段流转：每完成一个专注番茄，番茄计数 +1；每 `longBreakInterval` 个番茄后进入长休息，否则短休息；休息结束后回到专注
- SVG 环形进度条通过 `stroke-dashoffset` 控制，周长固定为 `2π×88 ≈ 552.92`
- 设置面板通过 `classList.toggle("hidden")` 展开/收起，修改时长时会校验范围（1-120），并同步当前阶段计时器

**style.css — 主题系统：**

- CSS 变量控制颜色：`:root` 默认红色（专注），`body.short-break` 绿色，`body.longBreak` 蓝色
- `app.js` 中的 `applyPhaseTheme()` 通过设置 `document.body.className` 来切换主题

### 数据持久化

- 用户设置（时长）存储在 `localStorage` 的 `pomodoroConfig` 键中，key 为 `focus`、`shortBreak`、`longBreak`、`longBreakInterval`
- 计时状态（剩余时间、当前阶段）不持久化，关闭窗口即重置