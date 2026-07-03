## 任务：AI Creative Workspace UI 重设计

**背景**：当前 noteGen 采用三栏等宽 + Step 1/2/3 向导式布局，视觉上接近企业配置面板，与 `docs/design-philosophy.md` 及产品定位（AI 创意工作室）不符。用户提供了完整的 AI Workspace Redesign PRD，要求将界面从「填表」转变为「创作」体验。

**影响范围**：
- `public/css/styles.css` — 全面重写视觉系统（色彩、排版、动效 token）
- `public/css/workspace.css` — 新增：三栏工作区布局、可调整分隔条
- `src/components/appShell.js` — 重构为左栏导航 + 中心工作区 + 右栏预览
- `src/components/sidebar.js` — 新增：可折叠工作流导航（Idea / Writing / Images / Publish）
- `src/components/workspace.js` — 新增：中心编辑区（Notion 风格）
- `src/components/previewPanel.js` — 新增：实时预览面板
- `src/components/appState.js` — 扩展：当前活跃 section、折叠状态
- `src/components/settingsPanel.js` — 新增：设置面板（从主布局剥离，模态/抽屉）
- `docs/design-philosophy.md` — 追加 PRD 核心原则（可选，与 PRD 对齐）
- `test/` — UI 逻辑单元测试（sidebar 状态机、section 切换）

**前置条件**：Stage 1–4 服务层（topicService / copyService / cardService / aiService）已完成；IPC 路由可用。

**技术栈说明**：PRD 提及 React，但当前代码库为 **Vanilla JS + ES Modules**（无 React 依赖）。本规划保持现有技术栈，用模块化组件拆分实现 PRD 布局与交互，避免引入 React 构建链。若未来迁移 React，组件边界已按 PRD 划分，迁移成本可控。

---

### 总体布局架构

```
┌─────────────────────────────────────────────────────────────────┐
│  Header（极简：logo + 设置图标，无 Step 1/2/3 导航）              │
├──────────┬────────────────────────────────────┬─────────────────┤
│ Sidebar  │         Center Workspace           │  Live Preview   │
│  18–22%  │              55–60%                │     22–27%      │
│          │                                    │                 │
│ ✓ Idea   │  [写作风格]                         │  封面预览        │
│ ──────── │  [标题 — 无边框大字号]               │  卡片缩略图      │
│ Writing  │  [正文 — Notion 风格编辑区]          │  页面结构        │
│ Images   │  [AI 生成控制 — 底部浮动条]          │  实时渲染        │
│ Publish  │                                    │                 │
│          │                                    │                 │
│ 可拖拽 ↔ │              ↔ 可拖拽              │                 │
└──────────┴────────────────────────────────────┴─────────────────┘
```

关键设计点：

1. **单一视觉焦点**：中心工作区占 55–60%，编辑区无边框容器，内容即界面
2. **渐进式工作流**：Sidebar section 完成后折叠，显示摘要（✓ + 关键信息），可重新展开
3. **预览驱动**：右栏始终显示最终小红书笔记效果，每次生成后自动刷新
4. **可调整面板**：左/右栏与中心之间支持拖拽调整宽度（`resize-handle` + localStorage 记忆）
5. **设置外置**：设置从主布局卡片中移出，改为右上角图标触发的抽屉/模态

---

### Stage 1: 设计系统与布局骨架
- **状态**：Complete

### Stage 2: 左侧工作流导航（Sidebar）
- **状态**：Complete

### Stage 3: 中心创作工作区（Workspace）
- **状态**：Complete

### Stage 4: 右侧实时预览（Preview Panel）
- **状态**：Complete

### Stage 5: 设置面板外置 + 动效打磨
- **状态**：Complete

### Stage 6: 状态管理与联调
- **状态**：Complete

## 完成记录

- **完成时间**：2026-07-03
- **实际结果**：三栏 AI Creative Workspace 已落地。新增 `sidebar.js`、`workspace.js`、`previewPanel.js`、`settingsPanel.js`、`resizableLayout.js`、`utils.js`；`appShell.js` 瘦身为 orchestrator；样式拆分为 `tokens.css` + `workspace.css`。栏宽 localStorage 记忆、Publish section 跳过、与 draftStore 解耦均按确认执行。53 项测试全绿。
- **偏差说明**：PRD 建议 React，实际保持 Vanilla JS；动效为 CSS transition，未引入动画库。

---

### 文件拆分计划

| 新文件 | 职责 | 预估行数 |
|--------|------|---------|
| `src/components/sidebar.js` | 工作流导航渲染 + 折叠逻辑 | ~150 |
| `src/components/workspace.js` | 中心编辑区，按 section 切换内容 | ~300 |
| `src/components/previewPanel.js` | 实时预览渲染 + 自动刷新 | ~120 |
| `src/components/settingsPanel.js` | 设置抽屉（从 appShell 迁移） | ~180 |
| `src/components/resizableLayout.js` | 三栏拖拽调整 + localStorage | ~80 |
| `public/css/workspace.css` | 工作区专用样式 | ~400 |
| `public/css/tokens.css` | 设计 token（色彩/间距/动效） | ~60 |

`appShell.js` 瘦身为 orchestrator（~80 行），负责 mount + 组件组装。

---

### 视觉对照（旧 → 新）

| 维度 | 当前 | 目标 |
|------|------|------|
| 布局 | 3 等宽 column grid | 20/58/22 三栏，中心主导 |
| 导航 | Header Step 1/2/3 pills | Sidebar section 列表 |
| 容器 | `.card` + box-shadow | 无边框，靠排版分层 |
| 表单 | label + bordered input | placeholder + 无边框编辑 |
| 预览 | 配图 step 底部 grid | 右栏常驻 Live Preview |
| 设置 | inline card 展开 | 右上角抽屉 |
| 锁定态 | `.locked` opacity 0.48 | 移除；用 sidebar 完成态引导 |
| 色彩 | 红色用于 step pills | 红色仅用于 CTA + 激活态 |

---

### 分期策略

**本期（v0.1.1）**：Stage 1–6 全部完成，交付可用的新工作区 UI。

**后续（v0.2.0）**：
- draftStore 持久化 + 草稿列表
- Publish section 完整导出（复制文案、保存图片、一键打包）
- 多工作流支持（PPT / 视频脚本等）— 仅需新增 sidebar workflow 配置
- 可选：迁移至 React（若团队偏好）

---

**待确认事项**（2026-07-03 已确认）：

1. **技术栈**：保持 Vanilla JS + 模块化拆分 ✅
2. **Publish section**：暂时跳过 ✅
3. **Sidebar 展开行为**：section 控制在 center 切换 ✅
4. **面板宽度记忆**：localStorage 记住栏宽 ✅
5. **与 draftStore 优先级**：UI 重设计先于草稿持久化，解耦 ✅
6. **字体**：系统字体栈 ✅
