## 任务：微信公众号内容生产（Platform Pack）

**背景**：小红书 pipeline 已闭环；用户需在同一产品内支持「公众号人设 → 长文选题 → 结构化成文 → 配图 → 导出」。遵循「流程同构、差异化在 Platform Pack」。

**影响范围**：
- `src/services/platformPacks/` — **新增**：xiaohongshu / wechat pack 定义与 `resolvePlatformPack`
- `src/services/topicService.js`、`copyService.js`、`cardService.js` — 按 pack 选 prompt 与 normalize
- `src/services/exportService.js` — sections[] 感知 MD/HTML 导出
- `src/services/workspaceStoreService.js` — `wechat-article` workflowType；copyDraft 含 sections
- `prompts/topic/wechat-topic-expert.yaml` — **新增**
- `prompts/copy/wechat-article-writer.yaml` — **新增**
- `prompts/humanizer/wechat-authentic.yaml` — **新增**
- `prompts/card/wechat-article-plan.yaml` — **新增**（完整 Step 3：封面 + 文内图）
- `src/components/personaPanel.js` — 启用微信公众号平台选项
- `src/components/workspace.js`、`previewPanel.js` — 平台化文案与预览
- `src/components/workspaceStore.js` — 新建时设 workflowType
- `test/platformPack.test.js`、`test/exportService.test.js` 等 — 扩展

**前置条件**：Persona 系统 Stage 1–5 完成；export 骨架已有 wechat 分支。

**用户确认（2026-07-05）**：
- Phase 1 **完整保留 Step 3 配图**（非仅封面）
- 文案结构 **一步到位 `sections[]` JSON**

### Stage W1: Platform Pack + 微信 Prompt + Pipeline 分流
- **状态**：Complete（2026-07-05）

### Stage W2: 微信配图 Plan + 渲染
- **目标**：`wechat-article-plan.yaml` + `wechat-deck-shell.html`（wide 封面 + inline 文内图）
- **成功标准**：cardService 按 pack 选模板与 prompt；pagePlan 含 posterClass。
- **状态**：Complete（2026-07-05）

### Stage W3: 导出 polish + UI 预览
- **目标**：sections 感知 MD/HTML 导出；成文区 summary + sections 编辑；预览展示结构。
- **成功标准**：导出 manifest 含 sectionCount；UI 可编辑小节。
- **状态**：Complete（2026-07-05）

## 完成记录

- **完成时间**：2026-07-05
- **实际结果**：Platform Pack（xiaohongshu/wechat）；4 个 wechat prompt；`sections[]` 文案结构；完整 Step 3 配图（wechat-deck-shell）；persona 微信公众号选项已启用；`workflowType: wechat-article` 随人设绑定。

**待确认事项**：无（用户已确认配图与 sections 方案）
