# 关键发现与技术结论

## 2026-07-17 — 密钥激活平台实测

- **script 字段严格区分大小写**：后台密钥注册类型为 `noteGen`，请求 `NoteGen` 会报「脚本类型错误」。
- **实际成功响应与文档不符**：`data.aipoint / script / secret` 均为 null，JWT 放在 `msg` 字段里；代码已有兜底（aipoint 记 0），若设置页要展示真实点数需后端确认。
- **设备绑定靠 `imei`**：测试时用假 imei `TESTDEVICE001` 激活过密钥 `45941b0b…`，导致真实设备登录报「该激活码已在其它设备绑定」，需后端解绑。
- **后端已知 bug（等待修复）**：imei 过长会出错。本机 imei 为 12 位 MAC（`AABBCCDDEEFF`）理论不受影响，但 UUID 回退路径（36 位）可能踩中；后端修复前暂不改动 `getDeviceId` 逻辑。

## 2026-07-10 — 桌面交互改进实测发现

- **Windows 关闭过程中 `BrowserWindow.isMaximized()` 返回 false**：在 `close` 事件里重新捕获窗口状态会把最大化误存为 false。结论：状态在 resize/move/maximize/unmaximize 事件时即时捕获，close 只负责落盘（`src/main/windowState.js`）。
- **技术债（backlog #11）**：`inlineRewrite.js` 依赖已废弃的 `document.execCommand` 保撤销栈，Chromium 移除后会静默失效，届时需迁移到 `beforeinput`/InputEvent 方案。
- 单实例锁与 second-instance 置前早已实现于 `main/index.js`，评审清单第 1 项实际只需补 `flashFrame` 反馈。

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

## 2026-07-04 — Workspace 持久化与登录鉴权

### Workspace 系统

- 替代原 Stage 5「draftStore」设想：以 **Workspace** 为单位持久化完整创作状态（`workspaces/{id}.json`），
  索引在 `workspaces/index.json`；与 `drafts/{sessionId}/` 资产目录通过 `sessionId` 关联。
- 自动保存 debounce 300ms；侧边栏支持搜索、切换、inline 改标题、删除。
- IPC 通道前缀 `workspaces:*`。

### 登录鉴权（AI 密钥分销平台）

- 接口：`POST http://sit.xslq.work/sit/interface/api/publickey/normaltoken`
- 字段映射：账户=手机号（`phone`），密码=密钥（`secret`）；`script=NoteGen`；`imei`=设备标识（见下）。
- **设备码（2026-07-05 更新）**：优先物理网卡 MAC，格式 `AABBCCDDEEFF`（以太网 > Wi-Fi > 其他；跳过虚拟网卡）；首次写入 `device-id.json` 后持久复用。无可用 MAC 时回退 UUID。测试环境 UUID 与 MAC **并行共存**（已有 UUID 缓存不自动迁移）。
- 会话存 `userData/auth-session.json`；过期启动时自动用缓存凭证重试激活。
- 开发后门：`13164150732` 免密，仅 `!app.isPackaged`（`npm run dev`）生效。
- 设置页「账户」区展示订阅状态 / 能量点 / 到期时间；退出登录清除会话。
- **待联调**：需后端下发测试密钥；错误码均 `code=500`，靠 `msg` 文案区分。

### 登录页视觉

- 背景图：`public/assets/LoginBackground.png`（全屏 cover + 轻量渐变遮罩 + 毛玻璃登录卡片）。

