## 任务：人设同步选题 + 右栏对话标签 + 标题风格文案

**背景**：用户反馈三项体验问题：（1）设好人设后，选题区的「领域关键词」「目标读者」仍显示工作流模板默认值，未从人设带入；（2）希望用户能与 LLM 自由对话，与「预览」以可关闭的多标签页形式并存；（3）「钩子等级」术语不直观，改为「标题风格」。

**影响范围**：
- `src/constants/formDefaults.js` / `.cjs` — 新增 `TITLE_STYLE_OPTIONS`、`buildKeywordsFromPersona()`、`isIdeaInputAtDefaults()`
- `src/components/personaStore.js` — 增强 `applyPersonaDefaultsToWorkspace()`；激活/保存人设时触发同步
- `src/components/workspaceStore.js` — 绑定人设时同步选题字段
- `src/components/workspace.js` — 选题 UI 文案「标题风格」；监听人设同步事件刷新表单
- `src/components/personaPanel.js` — 人设表单「默认标题风格」
- `src/components/userManual.js` — 手册用语更新
- `src/services/personaContext.js` — prompt 块用语
- `src/components/rightPanel.js` — **新增**：右栏标签容器（预览 / 对话）
- `src/components/chatPanel.js` — **新增**：自由对话 UI
- `src/services/chatService.js` — **新增**：多轮对话封装（aiService.complete）
- `src/routes/index.js` — `chat:send` IPC
- `src/components/appShell.js` — 挂载 rightPanel 替代直接 mountPreviewPanel
- `src/components/appState.js` — `chatMessages` 持久化字段
- `src/services/workspaceStoreService.js` — workspace 快照含 chatMessages
- `src/main/appMenu.js` — 视图菜单：显示预览 / 显示 AI 对话
- `public/css/workspace.css` — 标签栏与对话样式
- `test/chatService.test.js`、`test/formDefaults.test.js` — 补充测试

**前置条件**：人设系统、Workspace 持久化、aiService 已可用。

---

### Stage 1: 人设 → 选题字段同步

- **目标**：激活/保存/绑定人设时，将 `primaryDomain + secondaryDomains` 合并为关键词、`targetReader`、`defaultHookLevel` 写入当前创作的 `ideaInput`（仅在字段仍为模板默认值或为空时覆盖，避免覆盖用户已编辑内容）
- **成功标准**：设好人设并进入选题页，关键词与目标读者与人设一致；用户手动修改后切换人设不会强制覆盖
- **状态**：Complete

### Stage 2: 「钩子等级」→「标题风格」

- **目标**：统一 UI 与手册文案；选项保留三档（克制可信 / 抓人有对比 / 高张力），字段标签改为「标题风格」
- **成功标准**：选题页、人设表单、使用手册不再出现「钩子等级」；内部 `hookLevel` 字段名不变（避免破坏持久化与 prompt）
- **状态**：Complete

### Stage 3: 右栏多标签（预览 + AI 对话）

- **目标**：右栏改为标签页容器，默认打开「预览」「AI 对话」；标签可关闭；关闭后可通过视图菜单或「+」重新打开；对话历史随 workspace 持久化
- **成功标准**：用户可在右栏与 LLM 自由多轮对话；预览与对话可切换；关闭/重开标签正常；切换 workspace 恢复对应对话
- **状态**：Complete

### Stage 4: 测试与文档

- **目标**：新增/更新单元测试；`.cursor/progress.md` 记录完成
- **成功标准**：`npm test` 全绿
- **状态**：Complete

---

**待确认事项**：
1. **对话上下文**：自由对话是否注入当前 workspace 的选题/文案摘要作为 system 提示？（规划默认：注入简要创作上下文 + 活跃人设约束，用户仍可自由聊其他话题）
2. **右栏位置**：对话与预览同在**右侧预览栏**以标签呈现（非左侧导航栏），是否符合预期？
3. **同步策略**：选题字段仅在「仍为模板默认值或空」时从人设覆盖；若用户希望「每次绑定人设都强制覆盖」，请说明。

## 完成记录

- **时间**：2026-07-05
- **结果**：人设激活/保存/绑定时自动同步选题字段（含主副领域合并关键词）；「钩子等级」UI 改为「标题风格」；右栏预览+AI 对话多标签，视图菜单可重开；对话随 workspace 持久化
- **测试**：122/122 通过（新增 chatService、formDefaults 测试）
- **偏差**：对话面板位于右侧预览栏（非左侧导航栏），与规划待确认项 #2 一致
