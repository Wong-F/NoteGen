## 任务：配图素材 — Pexels + Unsplash 图库搜图

**背景**：Stage 4 已实现用户供图 + AI 生图。用户希望加回 guizang 方案 B 的简化版：仅通过
**Pexels / Unsplash 官方 API** 按关键词搜图，不接入 Flickr、Wallhaven 或通用网页搜图。
与 Agent 内「打开网页搜图」等价能力，但在 noteGen 内走稳定 HTTP API + 本地落盘。

**影响范围**：

| 文件 | 变更 |
|------|------|
| `src/services/stockImageService.js` | **新建** — Pexels/Unsplash 搜索 + 下载 + 来源记录 |
| `src/services/settingsService.js` | 新增 `stock.pexelsApiKey` / `stock.unsplashAccessKey` |
| `src/services/imageService.js` | 可选：复用 `importUserImage` 的落盘逻辑，或 stock 服务内自包含 |
| `src/services/index.js` | 注入 `StockImageService` |
| `src/routes/index.js` | 新增 `images:searchStock` IPC |
| `src/components/appShell.js` | 设置页图库 Key；Step3 每页「图库搜图」按钮 |
| `prompts/card/xiaohongshu-page-plan.yaml` | `imageSource` 增加 `stock`；补充 `searchKeyword` 字段 |
| `src/services/cardService.js` | `normalizePlan` 支持 `stock` / `searchKeyword` |
| `test/stockImageService.test.js` | **新建** |
| `test/cardService.test.js` | 补充 `stock` 用例 |
| `test/settingsService.test.js` | 补充 stock 默认值 |
| `.cursor/findings.md` | 记录图库 API 与署名策略 |
| `.planning/20260703_three_step_pipeline_architecture.md` | Stage 4 附录或引用本规划 |

**前置条件**：Stage 4 配图链路已完成（`imageService`、`cardService`、Step3 UI、45 项测试）。

---

### Stage 1: stockImageService + 设置持久化
- **目标**：`StockImageService.searchAndDownload({ keyword, sessionId, label, prefer? })`
  - 瀑布流：**Pexels 优先**（中文关键词友好）→ 无结果则 **Unsplash**
  - 调用官方 API：
    - Pexels `GET /v1/search?query=&per_page=5`
    - Unsplash `GET /search/photos?query=&per_page=5`
  - 取第一张合适结果，下载到 `drafts/{sessionId}/assets/`
  - 写入/追加 `drafts/{sessionId}/assets/SOURCES.md`（provider、作者、页面 URL、license 简述）
  - Key 未配置时抛出明确错误（区分 Pexels / Unsplash 缺失）
- **成功标准**：单测 mock fetch 覆盖 Pexels 命中、Pexels 空转 Unsplash、双 Key 缺失报错
- **状态**：Complete

### Stage 2: 页面计划 + IPC + 服务接线
- **目标**：
  - 更新 `xiaohongshu-page-plan.yaml`：`imageSource` 允许 `stock`；`stock` 页必填 `searchKeyword`
  - `cardService.normalizePlan` 透传 `searchKeyword`
  - `settingsService` 默认 `stock: { pexelsApiKey: "", unsplashAccessKey: "" }`
  - IPC `images:searchStock`：`{ keyword, sessionId, label }` → 与 import/generate 相同返回结构
- **成功标准**：规划 prompt 文档一致；路由可调用；`npm test` 通过
- **状态**：Complete

### Stage 3: UI + 文档
- **目标**：
  - 设置页：Pexels API Key、Unsplash Access Key（附申请链接说明）
  - Step3：`imageSource === "stock"` 时显示「图库搜图」按钮，用 `searchKeyword` 或 `imagePrompt` 作为关键词
  - 成功后刷新页面绑定状态（与 user/ai 一致）
- **成功标准**：三步流程中 stock 页可搜图并渲染进卡片；规划文件与本任务完成记录更新
- **状态**：Complete

---

**产品约定（已确认）**：

- 仅 **Pexels + Unsplash**，不接 Flickr / Wallhaven / 通用搜图
- 用户自行申请免费 API Key（与 Phase 2「用户自填 Key」一致）
- 默认搜索顺序：Pexels → Unsplash（与 guizang cookbook 一致）
- 版权：落盘时写 `SOURCES.md`；UI 不强制卡片内署名（与 guizang PRODUCT.md 一致，用户自行判断）

**待确认事项**（已落实）：

- [x] 「测试图库连接」按钮 — 未做（可选项，后续可加）
- [x] 关键词：优先 `searchKeyword`，无则回退 `imagePrompt`

---

**已批准并完成（2026-07-03）。**

## 完成记录

- **完成时间**：2026-07-03
- **实际结果**：
  - 新增 `stockImageService`（Pexels → Unsplash 瀑布流、下载、SOURCES.md）
  - 设置页 Pexels / Unsplash Key；IPC `images:searchStock`
  - 页面计划支持 `imageSource: stock` + `searchKeyword`；Step3「图库搜图」按钮
  - 50 项测试全绿
- **偏差**：未实现「测试图库连接」按钮（规划中为可选项）
