## 任务：新手引导教程（Product Tour）

**背景**：noteGen 面向无 AI 知识的博主，首次进入时容易不知道「先点哪里」。游戏式遮罩 + 箭头 + 说明的引导（Product Tour / Coach Marks）能显著降低上手门槛，符合 C1「降低门槛」目标。

**影响范围**：
- `src/components/onboardingTour.js`（新建）
- `public/css/onboarding.css`（新建）
- `src/components/appShell.js`（登录后触发）
- `src/services/onboardingService.js` + IPC（可选，持久化「已完成/跳过」）
- `public/index.html`（引入样式）
- `test/onboardingService.test.js`（可选）

**前置条件**：主界面 shell、sidebar 三阶段导航、workspace 空状态已可用。

### Stage 1: 引导引擎（Coach Mark 组件）
- **目标**：可复用的遮罩层 + 高亮镂空 + 箭头/tooltip + 下一步/跳过
- **成功标准**：
  - 全屏半透明遮罩（`rgba(0,0,0,0.65)`），目标元素周围镂空高亮
  - Tooltip 带标题 + 1–2 句说明 +「下一步」「跳过教程」
  - 支持 `data-tour-id` 或 CSS 选择器定位；窗口 resize / 布局变化时重新计算位置
  - ESC / 跳过可关闭；完成后不再自动弹出
- **状态**：Complete

### Stage 2: 教程步骤定义 + 持久化
- **目标**：首次进入主界面时按顺序引导关键入口
- **成功标准**：
  - 默认步骤（空 workspace 时）示例：
    1. 「New Workspace」— 创建第一个创作
    2. 运营人设（可选）— 多账号口吻
    3. 左侧 RECENT — 切换历史创作
    4. 设置 — 配置 API Key
  - 有 workspace 时追加：选题 → 成文/文案 → 配图 → 右侧预览
  - `userData/onboarding.json` 记录 `{ completed: true, skippedAt?, version: "1" }`
  - 设置页提供「重新观看教程」入口
- **状态**：Complete

### Stage 3: 视觉与体验打磨
- **目标**：符合 `docs/design-philosophy.md`，不喧宾夺主
- **成功标准**：
  - 动画轻量（fade + 箭头微动），不阻塞用户紧急操作
  - 移动端/窄窗口 tooltip 不溢出视口
  - 与现有 CSS 变量一致；无障碍：`aria-live`、焦点 trap 可选
- **状态**：Complete

**待确认事项**（用户 2026-07-05 确认）：
1. ✅ 仅首次进入主界面 + 首次新建 workspace 简短提示
2. ✅ 登录页不做引导
3. ✅ 文案纯中文
4. ✅ 设置里可「重新观看」

## 完成记录
- **时间**：2026-07-05
- **结果**：`onboardingTour.js` + `onboardingService.js` + IPC + 设置页重播；欢迎 4 步 + 首次 workspace 4 步
- **偏差**：无动图；首次 workspace 教程在首次 `createWorkspace` 后触发，非每次新建
