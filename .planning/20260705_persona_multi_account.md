## 任务：多账号人设（Persona）系统

**背景**：noteGen 目标用户需要**同时运营多个不同风格的账号**，并可能**横跨不同领域**。平台主流程（选题 → 文案 → 配图 → 导出）可共享，差异化集中在：**约束、交付物、人设一致性、导出闭环**。本任务引入独立的 **Persona（运营人设）** 层，与现有 Workspace（单次创作会话）解耦，使 AI 生成始终对齐「这个号是谁、写给谁、什么口吻、发哪个平台」。

**影响范围**（规划阶段，执行时再细化）：
- `src/services/personaStoreService.js` — **新增**：人设 CRUD + 默认人设 + 索引
- `src/services/topicService.js` — 注入 persona 上下文（读者、领域偏好、钩子默认值）
- `src/services/copyService.js` — 注入 persona 口吻 / 禁忌 / 默认 writer
- `src/services/cardService.js` — 注入 persona 视觉偏好（accent、模板倾向）
- `src/services/exportService.js` — 按 persona.platform 选择导出格式与质检
- `src/services/validators/` — **新增**：平台规则引擎（小红书 / 微信）
- `src/services/workspaceStoreService.js` — workspace 增加 `personaId` 字段
- `src/components/personaPanel.js` — **新增**：人设管理 UI（列表 / 创建 / 编辑 / 切换）
- `src/components/sidebar.js` — 当前人设指示 + 快速切换
- `src/components/workspace.js` — 新建创作时绑定 persona；选题区预填 persona 默认值
- `src/components/appState.js` — `activePersonaId` + hydrate
- `src/routes/index.js` — personas IPC 路由
- `prompts/` — persona 上下文模板变量（`PERSONA_*` 占位）
- `test/personaStoreService.test.js`、`test/platformValidator.test.js` — **新增**

**前置条件**：Workspace 持久化系统可用（`.planning/20260703_workspace_system.md`）；三步 pipeline 与 export 已可用。

---

### 核心概念：三层分离

```
登录账户（Auth）
  └── 产品订阅 / AI 能量点（已有 settingsPanel）
  └── Persona 人设（本任务）— 「这个运营号是谁」
        └── Workspace 创作会话 — 「这一篇在写什么」
              └── drafts/{sessionId}/ 资产
```

| 实体 | 生命周期 | 典型字段 |
|------|----------|----------|
| **Persona** | 长期，用户主动创建 | 名称、平台、领域、读者、口吻、禁忌、默认风格、视觉偏好 |
| **Workspace** | 单次创作，可归档 | 绑定 `personaId`；选题/文案/配图中间态 |
| **Platform Pack** | 产品内置资产 | prompt 约束、校验规则、导出格式 |

**原则**：切换 Persona 不换登录；切换 Workspace 不换 Persona（除非用户手动改绑）；同一 Persona 下可有多篇并行创作、跨多个具体选题领域。

---

### Persona 数据模型

```typescript
// personas/index.json
{
  "activePersonaId": "uuid",
  "personas": [
    {
      "id": "uuid",
      "name": "职场干货姐",
      "platform": "xiaohongshu",       // xiaohongshu | wechat
      "primaryDomain": "职场效率",
      "secondaryDomains": ["AI工具", "时间管理"],
      "targetReader": "25-35 岁一线城市白领，想提升效率但没时间研究",
      "voiceSummary": "干脆、有方法论、像资深同事分享，不贩卖焦虑",
      "taboos": ["震惊体", "虚构数据", "过度 emoji"],
      "defaultStyleId": "dry-goods",
      "defaultHookLevel": 2,
      "visualAccent": "ikb",           // 卡片配色，对齐 pagePlan.accent
      "createdAt": "ISO8601",
      "updatedAt": "ISO8601"
    }
  ]
}

// workspace 增量字段
{
  "personaId": "uuid",               // 创建时绑定，可编辑
  "platform": "xiaohongshu"          // 冗余快照，便于列表展示；以 persona 为准
}
```

**多账号 / 跨领域如何表达**：
- **多账号** = 多个 Persona（如「职场干货姐」「探店小鹿」「育儿日记」）
- **跨领域** = 单 Persona 的 `secondaryDomains` + 每篇 Workspace 的 `ideaInput.keywords` 具体化；口吻与读者由 Persona 保持一致，领域词由 Workspace 灵活切换

---

### Stage 1: Persona 持久化 + 管理 UI
- **目标**：`personaStoreService`（list / get / create / update / delete / setActive）；侧边栏或设置区人设列表；新建 Persona 向导（名称 + 平台 + 领域 + 读者 + 口吻简述）；首次启动引导创建第一个 Persona。
- **成功标准**：重启后 persona 列表与 activePersona 恢复；CRUD 单测覆盖；至少 2 个 persona 可并存。
- **状态**：Complete（2026-07-05）

### Stage 2: Workspace 绑定 Persona
- **目标**：新建 Workspace 自动绑定 `activePersonaId`；workspace 索引展示 persona 名称 / 平台图标；切换 persona 时 sidebar 过滤或分组显示「该号下的创作」；`ideaInput.targetReader` 默认从 persona 预填。
- **成功标准**：同一 persona 下多篇 workspace 并存；换 persona 后新建 workspace 默认值正确；workspace 单测更新。
- **状态**：Complete（2026-07-05）

### Stage 3: Pipeline 注入人设上下文
- **目标**：
  - `personaContext.js` 构建运营人设 prompt 块
  - `topicService` / `copyService` / `cardService` 在 workspace 绑定 personaId 时注入
  - 文案默认 style 取 persona.defaultStyleId；配图 accent 取 persona.visualAccent
- **成功标准**：未绑定 persona 时 prompt 与原先一致；绑定后 prompt 含人设约束；单测覆盖。
- **状态**：Complete（2026-07-05）

### Stage 4: 平台规则引擎 + 发布前质检
- **状态**：Cancelled（用户确认不需要）

### Stage 5: 平台化导出闭环
- **目标**：
  - 小红书：`note.txt` + `images/` + `export.json`
  - 微信（骨架）：`note.md` + `note.html` + `images/` + `export.json`
  - 在用户选择的目录下自动创建 `{人设名}_{日期}_{标题}` 子文件夹；重名自动追加 `-2`
- **成功标准**：绑定 persona 时文件夹含人设名；manifest 记录 platform/persona；单测覆盖。
- **状态**：Complete（2026-07-05）

### Stage 6: 一键多平台衍生（可选，C2 效率）
- **目标**：同一选题 + 同一 persona 口吻，一键生成「小红书短版 + 微信长版」两个 workspace 或分支 tab；共享 `selectedTopic`，分叉 copy/pagePlan。
- **成功标准**：从一篇小红书 workspace 衍生微信 workspace，人设口吻一致、格式各自合规。
- **状态**：Not Started（建议 Stage 1–5 完成后再做）

---

### UI 信息架构（草案）

**侧边栏顶部**（Persona _selector）：
```
[ 职场干货姐 ▾ ]  ← 点击切换 / 管理人设
  小红书 · 职场效率

Recent Workspaces（当前 persona 下）
  · AI 办公神器
  · 会议纪要模板
[+ 新创作]  ← 绑定当前 persona
```

**人设编辑页**（轻量，非表单地狱）：
- 必填：名称、平台、主领域、一句话口吻
- 选填：读者画像、禁忌、默认写作风格、钩子力度、卡片配色
- 高级：secondaryDomains（标签输入）

符合 `docs/design-philosophy.md`：像「选角色进工作室」，不是「填配置表」。

---

### 与现有资产的关系

| 现有 | Persona 系统后 |
|------|----------------|
| `writers/*.yaml` | Persona 默认 `styleId` 指向 writer；writer 仍跨 persona 复用 |
| `workflowType: xiaohongshu-note` | 逐步由 `persona.platform` + 共享 pipeline 取代；workflowType 保留兼容 |
| `ideaInput.targetReader` | 默认来自 persona，单篇可 override |
| `styleId` per workspace | 默认 persona.defaultStyleId，单篇可 override |
| settingsPanel 登录账户 | 不变；与 Persona 命名空间分离（避免「账户」一词混淆，UI 用「运营人设」） |

---

### 待确认事项（2026-07-05 已确认）

1. **命名**：UI 使用 **运营人设**。
2. **Persona 数量**：Phase 1 不限；将来按订阅分级。
3. **跨 Persona 的 Workspace**：允许改绑（`workspaces:rebindPersona` + 侧边栏按钮）。
4. **微信 Pack**：先小红书做深；微信 platform 字段预留，UI 选项 disabled。
5. **Stage 6**：v0.2.0，首版不做。

---

## 完成记录（Stage 1–2）

- **完成时间**：2026-07-05
- **实际结果**：新增 `personaStoreService`、6 条 personas IPC、`personaStore.js` / `personaPanel.js`、侧边栏运营人设选择器；workspace 增加 `personaId`、按 persona 过滤列表、改绑 API；首次启动引导创建人设；9 项 persona 单测。
- **偏差**：Stage 1 与 Stage 2 合并交付（绑定与过滤与人设 UI 强耦合）。

## 完成记录（人设与创作解绑）

- **完成时间**：2026-07-05
- **实际结果**：Workspace 默认不绑定人设；`+ New Workspace` 恢复原有自由创作；`+ 用人设新建` / 人设面板「在此人设下新建创作」为可选入口；Recent 展示全部创作；侧边栏支持绑定/改绑/解除人设；「不使用运营人设」清除当前选中（非删除）；启动不再强制创建人设。

## 完成记录（Stage 3 + Stage 5）

- **完成时间**：2026-07-05
- **Stage 3**：`personaContext.js` 注入选题/文案/配图/去 AI 味 prompt（仅 workspace 绑定 personaId 时生效）。
- **Stage 5**：`exportPackage` 自动创建命名子文件夹、`export.json` 元数据；微信骨架导出 `note.md`/`note.html`；Stage 4 质检按用户要求跳过。

