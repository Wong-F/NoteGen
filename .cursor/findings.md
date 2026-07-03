# 关键发现与技术结论

## 2026-07-03 — 复用 Skill 调研（选题/文案/配图三步流程）

### 决策记录

- 产品主流程为三步：**选题 → 文案 → 配图**。
- Phase 1 用本地 LLM；最终形态为用户自填 API Key 调用云端 AI。
- 选题 + 文案复用 **md2wechat-skill**；配图复用 **guizang-social-card-skill**。
- 两仓库已克隆到本地：
  - `D:\Desktop\Fan_Files\Codes\md2wechat-skill`
  - `D:\Desktop\Fan_Files\Codes\guizang-social-card-skill`

### md2wechat-skill（选题 / 文案）

- Go CLI（v2.9.0），面向微信公众号发布，但其 **prompt catalog 与 host-agent handoff 设计**可复用：
  - `title suggest <md> --json` → 返回 `TITLE_SUGGEST_REQUEST_READY`，`data.prompt` 交给宿主模型执行，
    CLI 本身不调模型。选题能力可直接借此模式（或直接复用其 `prompts/title/*.yaml` 提示词资产）。
  - `write` / `humanize` → 写作与去 AI 味，同样输出 prompt 由宿主模型执行；`writers/*.yaml` 定义
    写作风格（writing_prompt / title_formulas / cover_prompt），格式简单，可直接借鉴为 noteGen 的
    风格模板格式。
  - prompt 资产加载优先级：`MD2WECHAT_PROMPTS_DIR` → `./prompts` → `~/.config/md2wechat/prompts` → 内置。
- 微信 HTML 排版 / 草稿箱发布链路对小红书场景无用，不接入。
- **License：Source Available（BSL 类）**。个人非商用免费；商业使用 / SaaS / 客户交付 / 再分发需商业授权
  （联系 skrphper@gmail.com）。

### guizang-social-card-skill（配图）

- 非 CLI，本体是「Agent 手册 + 资产」：
  - `assets/template-editorial-card.html`、`assets/template-swiss-card.html`：种子模板，内置字体、
    主题 token、三种画幅（`.poster.xhs` 3:4 / `.poster.square` 1:1 / `.poster.wide` 21:9）。
  - `references/`：16 个 Editorial recipe（M01-M16）+ 12 个 Swiss recipe（S01-S12）、主题色板
    （6 杂志色板 + 4 Swiss 强调色）、小红书 11 类内容 cookbook、QA 清单。
  - `validate-social-deck.mjs`：9 项规则校验（溢出/密度/字号/留白等），Node 脚本，依赖 Playwright。
- 原设计用 Playwright 截图；**noteGen 可用 Electron 隐藏 BrowserWindow 渲染模板并 capturePage 截图**，
  免去 Playwright 依赖。
- 能力圈：强项为旅行/职场/推荐类图文卡；美食摆盘大片、OOTD 全身照等超出能力圈（skill 文档明示）。
- **License：AGPL-3.0 + 商业授权**（`COMMERCIAL_LICENSING.md` 明确产品接入需授权）。

### 授权风险（阻塞分发，不阻塞开发）

| 仓库 | 许可 | 对 noteGen 的影响 |
|------|------|------------------|
| md2wechat-skill | Source Available | 开发/评估免费；产品商业分发需商业授权 |
| guizang-social-card-skill | AGPL-3.0 + 商业授权 | 衍生分发需开源整个应用或购买商业授权 |

结论：Phase 1 开发期直接复用无碍；**产品发布前必须取得授权，或将复用范围收缩为
「借鉴流程/格式、自研 prompt 与模板」**。

## 2026-07-03 — Cursor API 与配图素材来源

**用户问题**：是否可用 Cursor API 在 noteGen 内生图？

**结论：Cursor 没有可供 noteGen 桌面应用调用的「图像生成 HTTP API」。**

| 能力 | 说明 | noteGen 能否用 |
|------|------|----------------|
| Agent `GenerateImage` | Cursor IDE 内 Agent 模式专用工具（内部图像管线） | **否** — 仅 Cursor 聊天 Agent 可用 |
| Cloud Agents API | `api.cursor.com`；`prompt.images` 仅用于**向 agent 传入**图片 | **否** — 无生图 endpoint |
| Dashboard API Key (`crsr_...`) | Admin / Analytics / Cloud Agents 认证 | **否** — 不用于生图 |

**Stage 4 配图素材双入口（已确认，后扩展为三入口）**：

1. **用户供图**：`dialog.showOpenDialog` → 复制到草稿 `assets/` → 填入 guizang 模板
2. **AI 生图**：`imageService` + 设置页配置的云端图像 API（OpenAI 兼容 `/v1/images/generations`
   或 Gemini 图像模型），与 Phase 2「用户自填 Key」一致
3. **图库搜图**（2026-07-03 新增）：`stockImageService` + Pexels/Unsplash 官方 API；
   搜索顺序 Pexels → Unsplash；落盘 `assets/` 并写 `SOURCES.md`（作者、来源 URL、许可简述）。
   Key 在设置页配置（[Pexels API](https://www.pexels.com/api/)、
   [Unsplash Developers](https://unsplash.com/developers)）。卡片内不强制署名。

排版渲染（HTML → Electron 截图）仍完全本地。
