## 任务：三步创作流程（选题 → 文案 → 配图）前后端架构设计

**背景**：noteGen 的核心用户价值是让无 AI 知识的博主三步完成小红书笔记：选题、文案、配图。
经调研决定复用两个现有 skill 的资产与流程（详见 `.cursor/findings.md`）：
- 选题 / 文案：`md2wechat-skill` 的 prompt catalog 与 host-agent handoff 模式
- 配图：`guizang-social-card-skill` 的 HTML 种子模板 + 排版 recipe + 校验器

Phase 1 用本地 LLM（OpenAI 兼容接口，如 Ollama / LM Studio），Phase 2 切换为用户自填 API Key，
两阶段共用同一 Provider 抽象。

**影响范围**（均为新增，现有文件仅小幅改动）：
- `src/services/aiService.js` — LLM Provider 抽象（chat / 生成 JSON）
- `src/services/topicService.js` — 选题（Step 1）
- `src/services/copyService.js` — 文案（Step 2）
- `src/services/cardService.js` — 配图（Step 3，模板填充 + 隐藏窗口渲染截图）
- `src/services/draftStore.js` — 草稿与模板的本地持久化（userData 目录 JSON）
- `src/main/renderWorker.js` — 隐藏 BrowserWindow 渲染管理
- `src/routes/index.js` — 新增 IPC 路由
- `src/components/` — 向导式三步 UI（wizard、topicStep、copyStep、imageStep、draftList）
- `vendor/`（或 npm workspace）— 引入两个 skill 的资产（方式待确认，见待确认事项）
- `test/` — 各 service 对应测试

**前置条件**：v0.1.0 脚手架已就绪（main/preload/routes/services 分层、IPC 通道、测试框架）。

---

### 总体架构

```
┌─ Renderer（向导 UI）─────────────────────────────┐
│  Step1 选题页 → Step2 文案页 → Step3 配图页 → 导出 │
└──────────────┬───────────────────────────────────┘
               │ IPC (window.noteGen.invoke)
┌──────────────▼───────────────────────────────────┐
│  Main / routes                                    │
│   topics:suggest   copy:generate   cards:render   │
│   drafts:save/list/load   ai:testConnection       │
├───────────────────────────────────────────────────┤
│  services                                         │
│   topicService ─┐                                 │
│   copyService ──┼→ aiService（Provider 抽象）      │
│   cardService ─→ renderWorker（隐藏 BrowserWindow）│
│   draftStore  → userData/*.json                   │
├───────────────────────────────────────────────────┤
│  资产层（复用 skill）                              │
│   prompts/（选题、标题、写作、去AI味 — 源自 md2wechat）│
│   templates/（editorial/swiss HTML — 源自 guizang） │
└───────────────────────────────────────────────────┘
```

关键设计点：

1. **Provider 抽象**：`aiService` 只暴露 `complete(messages, options)` 与 `completeJson(...)`。
   Phase 1 指向本地 OpenAI 兼容端点（默认 `http://localhost:11434/v1`，Ollama），
   Phase 2 只换 baseUrl + apiKey，业务代码零改动。
2. **Prompt 即资产**：选题 / 文案的提示词放 `prompts/*.yaml`（沿用 md2wechat 的 YAML 结构：
   name / kind / description / template / 变量占位），不硬编码进 JS。写作风格沿用
   `writers/*.yaml` 格式（writing_prompt / title_formulas / cover_prompt）。
3. **配图不依赖 Playwright**：cardService 将文案结构化为页面计划（封面钩子 + 每页一个观点），
   填充 guizang 种子模板的 `<!-- POSTERS_HERE -->` 区域，交给隐藏 BrowserWindow 加载，
   `webContents.capturePage()` 按 `.poster` 节点逐页截图输出 3:4 PNG。
   guizang 的 `validate-social-deck.mjs` 校验规则后续可移植为渲染后自检。
4. **数据流单向**：选题输出 topic 对象 → 文案输入 topic、输出 markdown + 元数据 →
   配图输入文案、输出图片路径数组。每步结果都可存草稿、可回退重跑。

---

### Stage 1: AI Provider 抽象 + 设置页
- **目标**：`aiService`（OpenAI 兼容 chat completion、JSON 模式、错误分类）、
  `ai:testConnection` 路由、简单设置 UI（端点 / 模型名 / Key）。
- **成功标准**：连接本地 Ollama 成功返回补全；单测覆盖请求构造与错误处理（mock fetch）。
- **状态**：Complete（2026-07-03。新增 aiService/settingsService/设置 UI/3 条 IPC 路由，
  17 项测试全绿；实测本地 Ollama `/v1/models` 可达，模型 qwen2.5:7b-instruct）

### Stage 2: 选题（Step 1）
- **目标**：`topicService` + prompt 资产 + 选题 UI。用户输入领域/关键词 →
  返回 N 个候选选题（标题钩子 + 切入角度 + 目标读者），参考 md2wechat
  `title suggest` 的 hook-level 分档（克制/抓人/高张力）。
- **成功标准**：给定领域词能稳定产出结构化 JSON 候选列表并在 UI 中选择；单测用 mock LLM。
- **状态**：Complete（2026-07-03。新增 promptCatalog/topicService、`prompts/topic/xiaohongshu-topic-expert.yaml`、
  `topics:suggest` 路由、Step1 选题 UI + hook level 选择；23 项测试全绿）

### Stage 3: 文案（Step 2）
- **目标**：`copyService` + 写作风格资产 + 文案 UI。输入选中选题（可选风格模板）→
  生成小红书笔记（标题 ≤20 字、正文、话题标签）；支持「去 AI 味」二次改写
  （复用 humanize 提示词思路）。
- **成功标准**：产出可编辑的完整笔记文案；风格模板可切换；单测覆盖 prompt 组装与输出解析。
- **状态**：Complete（2026-07-03。新增 copyService/writerCatalog、copy+humanizer prompt、
  2 个 writer 风格、copy 路由与 Step2 文案 UI；32 项测试全绿）

### Stage 4: 配图（Step 3）
- **目标**：`cardService` + `renderWorker` + `imageService` + 配图 UI。
  - **本地**：文案 → 页面计划（LLM）→ 填充 guizang 模板 → Electron 隐藏窗口截图 → 3:4 PNG
**Stage 4 素材入口**（2026-07-03 更新）：用户供图 + AI 生图 + **Pexels/Unsplash 图库搜图**（`stock`）
    1. **用户供图**：文件选择器上传照片/截图 → `assets/`
    2. **AI 生图**：`imageService` 调用户配置的云端图像 API
    3. **图库搜图**：`stockImageService` 调 Pexels/Unsplash API（见 `.planning/20260703_stock_image_pexels_unsplash.md`）
- **成功标准**：一篇文案能产出封面 + 内容页 PNG；每页可指定「用户图 / AI 生图 / 纯文字」；
  模板填充与 imageService 有单测；渲染有一条端到端冒烟。
- **状态**：Complete（2026-07-03。4a imageService + 图像 API 设置 + IPC；4b cardService +
  renderWorker + xhs-deck-shell 模板；4c 页面计划 LLM + Step3 配图 UI 串联；45 项测试全绿）

**Stage 4 子阶段**：
- 4a：`imageService`（用户供图 IPC + 云端 images API）+ 设置页图像 API 字段 — Complete
- 4b：`cardService` + `renderWorker` + guizang 风格模板渲染 — Complete
- 4c：页面计划 LLM + 串联 Step1→2→3 数据流 — Complete

### Stage 5: 草稿与串联（C2 效率目标）
- **目标**：`draftStore`（保存/列表/恢复三步中间产物）、向导流程串联、
  首页草稿列表。
- **成功标准**：中断后可从任意一步恢复；npm test 全绿；ESLint 通过。
- **状态**：Not Started

---

**待确认事项**（2026-07-03 已确认）：

- [x] **本地 LLM 选型**：Ollama（OpenAI 兼容 `/v1` 端点），默认 `http://localhost:11434/v1`。
- [x] **授权问题**：开发期直接复用两个 skill 的资产，产品发布前再谈授权或替换为自研资产。
- [x] **Stage 顺序**：按规划顺序 Stage 1 → 5 执行。
- [ ] **skill 资产引入方式**：开发期以相对路径 / submodule 读取模板与提示词（两仓库已克隆到
      `D:\Desktop\Fan_Files\Codes` 下），产品化前结合授权结果定夺。
- [ ] **md2wechat 复用深度**：只复用其提示词资产与 handoff 流程约定，不捆绑 Go CLI 二进制。
- [x] **配图素材来源**（2026-07-03）：用户供图 + 云端图像 API 生图；Cursor API **不可**用于 noteGen 运行时生图。
