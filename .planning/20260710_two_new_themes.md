## 任务：新增 UI 主题（墨夜 / 抹茶 / 奶油杏）

> 2026-07-10 更新：用户批准执行，并在方向确认中选择了三套主题（墨夜、抹茶、奶油杏），规划由两套扩为三套，其余不变。

**背景**：主题系统（`.planning/20260709_ui_theme_system.md`）已落地，token 契约收敛在 `tokens.css`，业务 CSS 不含主题分支，设置面板从 `THEMES` 数组自动渲染主题卡。现补充两套风格差异明显的主题，给用户更多个性化选择：

- **墨夜（ink）**：深色主题。深蓝黑画布、暗面板、柔和高亮文字、霓虹感强调色。桌面创作类应用最常被要求的主题，夜间写作护眼。
- **抹茶（matcha）**：清新绿主题。奶白纸感画布、抹茶绿点缀、圆润控件。与现有冷调「云端」和暖粉「胭脂纸」形成第三种气质（自然/治愈系），贴合小红书生活方式博主审美。
- **奶油杏（cream）**：暖米白极简主题。奶油质感画布、低饱和杏橘强调色、柔和圆角。

**影响范围**：
- `public/css/tokens.css` — 新增 `html[data-theme="ink"]`、`html[data-theme="matcha"]`、`html[data-theme="cream"]` 三个 token 覆盖块（只加不改）
- `src/constants/themeOptions.js` / `themeOptions.cjs` — `THEMES` 数组各加 3 条目（两文件保持同步）
- `public/css/workspace.css` — 新增 `.theme-option-swatch--ink / --matcha / --cream` 预览色块样式
- `test/themeOptions.test.js` — 更新/补充用例（新 id 可被 normalize、双实现一致性）

**前置条件**：主题系统 Stage 1–4 已全部完成（2026-07-09）。

### Stage 1: Token 设计与实现
- **目标**：为三套主题补齐 blush 覆盖块同等完整度的 token（画布/面板/文字/边框/强调色/按钮/导航/卡片/阴影）。墨夜需特别核对深色下的对比度（正文 ≥ 4.5:1）、阴影可见性及 `--color-surface / --card-bg / --nav-active-bg` 等 :root 白色 token 的全量覆盖；抹茶/奶油杏沿用纸感路线换色系。
- **成功标准**：切换任一新主题，工作台/登录/设置/手册四界面无未主题化的"漏白/漏色"区域，无需改动任何业务 CSS。
- **状态**：Complete

### Stage 2: 主题注册与预览卡
- **目标**：`THEMES` 加入 `{ id: "ink", name: "墨夜", desc: "深色护眼 · 夜间创作" }`、`{ id: "matcha", name: "抹茶", desc: "清新自然 · 治愈纸感" }`、`{ id: "cream", name: "奶油杏", desc: "暖米白 · 奶油极简" }`（ESM + CJS 双份）；`workspace.css` 补三个 swatch 预览样式。
- **成功标准**：设置抽屉出现五张主题卡，点击即时生效并持久化，重启保持。
- **状态**：Complete

### Stage 3: 测试与验证
- **目标**：`themeOptions.test.js` 覆盖新 id 的 normalize/persist 行为与 ESM/CJS 一致性；`npm test` 全绿；`npm run dev` 启动后人工核对四主题 × 四界面；非 trivial 改动走代码审查。
- **成功标准**：质量门禁全部通过。
- **状态**：Complete

**待确认事项**：
1. ~~主题方向~~ 已确认：墨夜 + 抹茶 + 奶油杏（三套，2026-07-10 用户选定）。
2. 墨夜主题下毛玻璃面板保留（暗色半透明 + blur）还是改为实色暗面板？默认保留 blur，与云端形态一致。

## 完成记录

**完成时间**：2026-07-10

**实际结果**：
- `tokens.css` 新增 `html[data-theme="ink"/"matcha"/"cream"]` 三个覆盖块；ink 全量覆盖 :root 中的白色 token（`--color-surface`、`--card-bg`、`--nav-active-bg` 等）并核对正文对比度（#e8eaf0 on #232732 ≥ 4.5:1）
- 顺带 token 化两处深色主题下会露馅的硬编码：新增 `--login-overlay`（登录页遮罩）与 `--status-error/success-text/bg`（登录/账号状态提示），`login.css` / `manual.css` 改为消费 token
- `themeOptions.js` + `.cjs` 各注册 3 条主题（ink 墨夜 / matcha 抹茶 / cream 奶油杏），设置面板自动渲染五张主题卡
- `workspace.css` 补三个 swatch 预览样式；`.theme-options` 由单行 flex 改为 `auto-fill minmax(130px, 1fr)` 网格以容纳五张卡
- `themeOptions.test.js` 扩展：全部主题 id 可 normalize、新增 ESM/CJS 双实现一致性用例
- 验证：`npm test` 137/137 通过（原 130 + 新增/扩展用例）；改动仅涉及渲染层 CSS 与常量，未触及主进程/IPC/启动路径，故未跑 `npm run dev`；五主题 × 四界面的人工视觉核对留待用户确认

**偏差说明**：
- 规划由两套扩为三套（用户在方向确认中多选了奶油杏）
- Codex MCP 工具本会话仍不可用，Review Gate 改为内置逐项自查（token 覆盖完整性、ink 下 `--btn-primary-bg: var(--color-accent)` 级联解析、swatch 与 tokens 同步、theme-boot.js 对新 id 的兼容、双实现一致性），未发现问题
