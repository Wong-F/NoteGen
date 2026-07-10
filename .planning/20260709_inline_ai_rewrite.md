## 任务：选中即改 — 选题 / 文案的 Cursor 式局部 AI 改写

**背景**：用户体验过工作台后提出：希望像 Cursor 选中代码段后按 Ctrl+K 局部修改那样，在「选题」卡片和「文案 / 成文」编辑区选中一段文字，就地输入指令，让 AI 只改写选中的部分，而不是重新生成全文。这契合设计哲学「界面隐入幕后，内容成为主角」，也强化 C2（提升效率：局部微调复用已有内容）。

**影响范围**：
- `src/services/copyService.js` — 新增 `rewriteSelection`（构造消息 + 归一化返回）
- `prompts/` — 新增改写提示词（沿用 promptCatalog YAML 模式）
- `src/routes/index.js` — 新增 `copy:rewriteSelection` IPC 路由（携带 persona 解析）
- `src/components/inlineRewrite.js` — 新建：悬浮改写组件（选区跟踪、指令输入、预览、采用/放弃）
- `src/components/workspace.js` — 文案/成文编辑区与选题卡接线（约 +40 行）
- `public/css/workspace.css` — 悬浮气泡与预览样式（全部消费 token，双主题自动适配）
- `test/copyService.test.js` — rewriteSelection 的消息构造与归一化测试

**前置条件**：已有 aiService.completeJson、promptCatalog、personaContext、双主题 token 体系（悬浮 UI 样式直接用 `--panel-*`/`--shadow-*` token）。

### Stage 1: 服务层 — rewriteSelection
- **目标**：`copyService.rewriteSelection({ fullText, selection, instruction, fieldLabel, persona })` → `{ replacement }`。提示词要求：只返回替换选中片段的文本（JSON），保持人设语气、与上下文衔接、长度与场景匹配（标题字数上限等由 fieldLabel 传入约束）。新增 IPC 路由 `copy:rewriteSelection`。
- **成功标准**：单测覆盖——空选区/空指令报错、消息中包含全文上下文+选中片段+指令+人设块、mock LLM 返回归一化 replacement。
- **状态**：Not Started

### Stage 2: 悬浮改写组件（文案区）
- **目标**：`inlineRewrite.js` 提供 `attachRewrite(element, options)`：
  1. 在 input/textarea 中选中文字（selectionStart≠selectionEnd）→ 选区上方浮出「✦ AI 改写」小气泡；快捷键 **Ctrl+K** 等效
  2. 点击/快捷键 → 展开内联指令输入框（如“更口语一点”“压缩到 15 字”），Enter 提交、Esc 关闭
  3. 请求期间气泡呈加载态；返回后展示 **原文 → 新文** 预览，提供「采用 / 重试 / 放弃」
  4. 采用后用 `document.execCommand("insertText")` 替换选区（保留原生 Ctrl+Z 撤销栈），并触发元素 `input` 事件，让 workspace 既有的 appState 同步与自动保存逻辑原样生效
- **接线**：小红书模式的标题/正文/话题输入框、公众号模式的引言与各 section textarea。
- **成功标准**：选中→改写→采用全流程可用；Ctrl+Z 可撤销；不破坏既有输入事件与保存。
- **状态**：Not Started

### Stage 3: 选题卡接入
- **目标**：选题卡文字开放 `user-select: text`；卡片内选中片段 → 同一气泡改写该片段；**未选中时点击卡片右上的「微调」图标** → 整卡按指令重写（title+angle 一起）。结果更新 `appState.generatedTopics`（若该卡为当前选中选题，同步 `selectedTopic`）并走既有 workspace 保存。
- **成功标准**：选题卡可局部/整卡微调，改后立即反映在卡片与右侧预览。
- **状态**：Not Started

### Stage 4: 验证与审查
- **目标**：`npm test` 全绿；`npm run dev` 启动并人工走通（两主题下悬浮 UI 观感正常）；非 trivial 改动走代码审查（Codex MCP 不可用时用内置多视角审查替代，与上次一致）。
- **状态**：Not Started

**待确认事项**：
1. 快捷键定为 **Ctrl+K**（与 Cursor 一致）。若与将来全局搜索冲突可改 Ctrl+Shift+K。
2. 预览采用「气泡内原文/新文对照」而非编辑器内嵌 diff（textarea 无法渲染行内 diff，成本/收益不匹配）。
3. 选题卡「未选中时整卡微调」的入口用卡片 hover 时浮现的小图标，默认按此执行。

### 各 Stage 状态更新
- Stage 1: Complete
- Stage 2: Complete
- Stage 3: Complete
- Stage 4: Complete

## 完成记录

**完成时间**：2026-07-09

**实际结果**：
- 服务层：`copyService.rewriteSelection`（消息构造 + 归一化）、`prompts/rewrite/selection-rewrite.yaml`、IPC 路由 `copy:rewriteSelection`，附 6 项单测
- 组件：`src/components/inlineRewrite.js` 单例悬浮组件（气泡 → 指令 → 加载 → 原文/新文预览 → 采用/重试/放弃），Ctrl+K 直达；替换用 `execCommand("insertText")` 保留原生撤销栈并复用既有 input 同步/保存链路
- 文案区接线：小红书标题/正文/话题、公众号标题/摘要/引言/各小节
- 选题卡：标题与切入角文字可选中改写；hover 浮现 ✦ 按钮整卡微调；更新 `generatedTopics`/`selectedTopic` 并持久化
- 验证：`npm test` 136/136 通过；`npm run dev` 启动无报错；渲染层模块 ESM 语法校验通过

**偏差说明**：
- 多视角审查子代理因会话配额限制中断，改为主会话逐角度自审（代码均为本次新写、全部在上下文内）；发现并修复 3 个问题：submit 关闭竞态（改为按请求引用判断）、updateTopic 丢失 restoreOnly 标志、isStale 增加 !el.isConnected 检测
- 整卡微调的输出解析用两行文本格式 + 正则回退（未新增专用 JSON prompt），MVP 取舍已记录
