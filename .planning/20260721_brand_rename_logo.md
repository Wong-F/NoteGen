## 任务：品牌更名「AI笔记坊」+ 应用 Logo

**背景**：产品对外不应再叫 noteGen；用户可见名称目前是「笔记坊」。需统一为「AI笔记坊」，并补齐登录页 / 顶栏 / 窗口 / 安装包用的品牌视觉。

**已确认（2026-07-21）**：
1. 显示名：AI笔记坊
2. Logo：笔尖 + 火花
3. 副标题「随时随地，AI 助力」保留
4. AI system prompt 自称同步改为「AI笔记坊」

**影响范围**（用户可见层，不改内部 API 名 `window.noteGen`）：
- `src/components/loginPage.js` — 登录品牌名 + logo 图
- `src/components/appShell.js` — 顶栏品牌名 + logo
- `src/components/userManual.js` — 手册文案中的产品名
- `src/components/workspace.js` / `previewPanel.js` — 通知文案里的「回到笔记坊」
- `src/main/index.js` — 窗口 `title`
- `src/main/appMenu.js` — 菜单「关于」
- `public/index.html` — `<title>`
- `package.json` — `productName`（安装包显示名）
- `public/assets/` — 新增 logo 资源（SVG/PNG/ICO）
- `src/services/cardTemplateBuilder.js` — 卡片页脚品牌字样（若仍写 noteGen）
- `src/services/chatService.js` / `copyService.js` — AI system prompt 中的产品自称（建议同步）

**前置条件**：无；与后端 `script=noteGen`、npm 包名 `notegen`、IPC `window.noteGen` **解耦**，内部技术标识保持不变。

### Stage 1: 生成 Logo 资源
- **目标**：产出可复用的品牌标识
  - `public/assets/logo.svg`（UI 用，矢量）
  - `public/assets/logo.png`（高清位图，登录/关于对话框）
  - `public/assets/icon.ico`（Windows 窗口 + electron-builder 安装包图标）
- **设计方向**：笔尖 + 火花；主色 `#ff2442`。
- **成功标准**：文件存在；16px / 32px / 128px 预览可读。
- **状态**：Complete

### Stage 2: 用户可见名称全面替换
- **目标**：所有面向用户的「笔记坊」/「noteGen」显示文案改为「AI笔记坊」
- **成功标准**：登录页、顶栏、窗口标题、关于框、使用手册、后台通知、安装包 `productName` 均显示新名称；`npm test` 全绿。
- **状态**：Complete

### Stage 3: 接入 Logo 到 UI / 窗口 / 打包
- **目标**：登录页与顶栏显示 logo + 名称；`BrowserWindow` 与 `electron-builder` 使用 `icon.ico`
- **成功标准**：`npm run dev` 启动后窗口图标与顶栏/登录品牌正确；无破图。
- **状态**：Complete

**明确不改（除非你另要求）**：
- 仓库目录名、npm `name: "notegen"`、`appId`、`window.noteGen` IPC
- 后端激活 `script` 类型字符串
- Agent 规则 / `.planning` 历史文档里的旧名（归档保留）

## 完成记录
- **完成时间**：2026-07-21
- **实际结果**：用户可见品牌统一为「AI笔记坊」；登录页与顶栏接入 `logo.svg`；窗口与打包使用 `icon.ico`；AI system prompt 自称已同步。`npm test` 164 全绿；`npm run dev` 可正常拉起、无启动期报错。
- **偏差说明**：显示名最终确认为「AI笔记坊」（非最初草稿「AI自媒体助手」）。Codex Review Gate 当前环境无 Codex MCP，按既有约定以测试代替。
