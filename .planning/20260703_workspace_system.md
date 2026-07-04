## 任务：Workspace 创作会话系统

**背景**：v0.1.1 已完成三栏 AI Creative Workspace UI，但 `appState` 仅存于内存（注释写明 draftStore 为后续任务）。用户离开应用后所有创作进度丢失。本任务实现类似 Cursor / Claude / ChatGPT 的 **独立创作会话（Workspace）** 系统：多会话并存、自动保存、即时切换、完整状态恢复。

**影响范围**：
- `src/services/workspaceStoreService.js` — **新增**：主进程持久化层（索引 + 单 workspace JSON）
- `src/services/index.js` — 注册 workspaceStoreService
- `src/routes/index.js` — **新增** IPC：`workspaces:list` / `get` / `create` / `save` / `delete` / `search`
- `src/components/appState.js` — 扩展字段；新增 hydrate / snapshot / reset API
- `src/components/workspaceStore.js` — **新增**：渲染进程 store（自动保存、切换、搜索）
- `src/components/sidebar.js` — 重构为 Workspace + Recent + Current Workflow 三区
- `src/components/workspace.js` — 恢复 idea 区输入、选题列表、写作风格；保存触发点
- `src/components/previewPanel.js` — 恢复滚动位置
- `src/components/appShell.js` — 启动时初始化 workspace store；空状态
- `public/css/workspace.css` — 侧边栏 workspace 列表、搜索框、空状态样式
- `test/workspaceStoreService.test.js` — **新增**：持久化 CRUD 与搜索测试

**前置条件**：Stage 1–6 AI Workspace UI 已完成；`draftPaths.js` 已提供 per-session 资产目录。

---

### 数据模型

```typescript
// workspaces/index.json — 轻量索引，按 updatedAt 降序
{
  "activeWorkspaceId": "uuid",
  "workspaces": [
  {
    "id": "uuid",
    "title": "AI办公神器",
    "workflowType": "xiaohongshu-note",  // 未来：ppt / research / …
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601",
    "keywords": ["办公", "效率"],         // 用于搜索；从选题/文案自动提取
    "tags": []                            // 预留
  }
  ]
}

// workspaces/{id}.json — 完整会话状态
{
  "id": "uuid",
  "title": "AI办公神器",
  "workflowType": "xiaohongshu-note",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601",
  "sessionId": "uuid",                   // 关联 drafts/{sessionId}/ 资产

  // 工作流
  "activeSection": "idea" | "writing" | "images",
  "completedSections": ["idea"],

  // Idea
  "ideaInput": { "keywords": "", "targetReader": "", "hookLevel": 2 },
  "generatedTopics": [...],              // topics:suggest 完整结果
  "selectedTopic": { ... } | null,

  // Writing
  "styleId": "warm-story",
  "copyDraft": { "title": "", "body": "", "hashtags": [] } | null,

  // Images
  "pagePlan": { ... } | null,
  "pageAssets": { [pageId]: { absolutePath, relativePath, source } },
  "renderedImages": [{ id, absolutePath }],

  // UI 恢复
  "scroll": { "center": 0, "preview": 0, "sidebar": 0 }
}
```

**标题策略**：优先 `copyDraft.title` → `selectedTopic.title` → `ideaInput.keywords` → `"未命名创作"`；用户可在侧边栏 inline 编辑标题。

**与现有 appState 映射**：`sessionId`、`selectedTopic`、`copyDraft`、`pagePlan`、`pageAssets`、`renderedImages`、`activeSection`、`completedSections` 直接对应；新增 `ideaInput`、`generatedTopics`、`styleId`、`scroll`。

---

### 侧边栏布局

```
┌─────────────────────────┐
│ WORKSPACE               │
│ [🔍 搜索…]              │
│ + New Workspace         │
│                         │
│ RECENT                  │
│ • AI办公神器      ← 激活 │
│ • 学霸笔记技巧            │
│ • 日本旅行攻略            │
│                         │
│ ─────────────────────   │
│ CURRENT WORKFLOW        │
│ ✓ Idea · AI办公神器     │
│   Writing               │
│   Images                │
└─────────────────────────┘
```

- **Recent**：按 `updatedAt` 降序，即时搜索过滤（标题 + keywords）
- **Current Workflow**：保留现有 Idea / Writing / Images 导航，仅在选中 workspace 后显示
- **空状态**（无 workspace）：中心区域显示欢迎文案 + `[ New Workspace ]` 按钮

---

### 自动保存策略

| 触发事件 | 行为 |
|---------|------|
| 标题编辑 | debounce 300ms → `workspaces:save` |
| 文案编辑 | debounce 500ms |
| AI 生成完成（选题/文案/配图） | 立即保存 |
| 图片选择变化 | 立即保存 |
| 工作流步骤切换 | 立即保存（含 scroll snapshot） |
| 切换 workspace | 先 flush 当前 → 再 load 新 |

渲染进程 `workspaceStore.js` 订阅 `appState` 变更 + 监听 scroll（passive, debounce 200ms）。无手动保存按钮。

---

### Stage 1: 主进程持久化层
- **目标**：`WorkspaceStoreService` 实现 CRUD、索引维护、关键词搜索
- **成功标准**：单元测试覆盖 create / save / list / get / delete / search；损坏 JSON 不崩溃
- **状态**：Complete

### Stage 2: IPC 与渲染进程 Store
- **目标**：`workspaceStore.js` 封装 IPC；`appState` 增加 hydrate/snapshot；启动时 list + 恢复 active 或显示空状态
- **成功标准**：新建 workspace 写入磁盘；重启应用后状态完整恢复
- **状态**：Complete

### Stage 3: 侧边栏重构
- **目标**：Workspace + Recent + 搜索 + inline 标题编辑 + New Workspace
- **成功标准**：点击 Recent 项即时切换；搜索实时过滤；样式符合 design-philosophy
- **状态**：Complete

### Stage 4: 工作区状态补全与 UI 恢复
- **目标**：`workspace.js` 恢复 idea 输入/选题列表/写作风格；切换时恢复 scroll；preview 同步
- **成功标准**：在 Images 步骤配图后切换离开再回来，选题/文案/配图/预览完全一致
- **状态**：Complete

### Stage 5: 空状态 + 联调打磨
- **目标**：无 workspace 欢迎页；切换无 loading dialog；边界情况（删除当前 workspace、最后一条）
- **成功标准**：`npm test` 全绿；手动走通完整创作流程后切换/重启
- **状态**：Complete

## 完成记录

- **完成时间**：2026-07-03
- **实际结果**：Workspace 系统已落地。新增 `workspaceStoreService.js`（主进程 JSON 持久化）、`workspaceStore.js`（渲染进程自动保存/切换）、8 项单元测试；侧边栏重构为 Workspace + Recent + Current Workflow；空状态欢迎页；选题/文案/配图全状态恢复与滚动位置记忆。64 项测试全绿。
- **偏差说明**：首次启动无 workspace 时显示空状态（不自动迁移内存状态，因无历史数据）；Publish 步骤未加入 sidebar，导出仍在 preview 面板。

---

### 架构决策

1. **存储位置**：`{userData}/workspaces/index.json` + `{userData}/workspaces/{id}.json`；资产仍用现有 `drafts/{sessionId}/`
2. **技术栈**：保持 Vanilla JS + IPC，与 settingsService 模式一致
3. **切换性能**：JSON 文件通常 < 50KB，同步 IPC 足够快；不显示 loading
4. **workflowType**：本期固定 `xiaohongshu-note`，字段预留扩展
5. **删除**：本期支持删除 workspace（含确认）；资产目录可懒清理

---

**待确认事项**：

1. **首次启动迁移**：是否将当前内存中的创作状态自动转为第一个 workspace？（建议：是，避免升级后空白）
2. **Recent 列表上限**：是否限制显示数量（如 50 条）？搜索仍可查全部。（建议：侧边栏显示最近 20 条，搜索无限制）
3. **删除 workspace**：是否需要？（建议：右键/长按删除 + 确认对话框）
4. **Publish 步骤**：PRD 提及 Publish，当前 UI 在 preview 面板导出。是否在本期 sidebar workflow 加 Publish 占位？（建议：不加，保持现状，export 在 preview）
5. **侧边栏标题编辑**：双击 inline 编辑 vs 仅随文案标题自动更新？（建议：自动更新 + 侧边栏可手动改）
