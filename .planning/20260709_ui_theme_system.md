## 任务：UI 主题系统 — 默认「云端」+ 可切换「胭脂纸」

**背景**：现有 UI 偏“工具感”（1px 硬分割线、无圆角/阴影/动效 token 体系，`--radius-sm` 被引用但从未定义），与设计哲学「现代创意工作室」不符。用户选定方向：默认采用方案 A「云端」（悬浮毛玻璃面板 + 弹簧动效），同时保留方案 B「胭脂纸」（暖粉纸感 + 胶囊控件）作为可切换主题。方案对比页见 Artifact `ui-directions`。

**影响范围**：
- `public/css/tokens.css` — 重构为完整主题 token 体系（重写）
- `public/css/workspace.css` — 面板悬浮化、消费 token（大改）
- `public/css/login.css`、`onboarding.css`、`manual.css` — 对齐 token（小改）
- `src/components/theme.js` — 新建：主题读取/应用/持久化
- `src/renderer/index.js` — boot 时优先应用主题（+2 行）
- `src/components/settingsPanel.js` — 新增「外观」分组与主题切换控件
- `test/` — theme.js 单元测试

**前置条件**：无（纯渲染层改动，不涉及主进程与 IPC）

### Stage 1: Token 体系重构
- **目标**：`tokens.css` 输出完整 token 集 —— 色彩、圆角（补齐 `--radius-sm/md/lg/pill`）、多层阴影（`--shadow-panel/card/lift`）、动效（弹簧曲线 `--ease-spring`、时长档位）、面板形态（`--panel-border/--panel-gap`）。`:root` 即「云端」主题；`html[data-theme="blush"]` 仅覆盖差异 token 即得「胭脂纸」主题（含暖粉色板、胶囊圆角、渐变主按钮、细暖边替代阴影）。
- **成功标准**：两套主题全部差异都收敛在 token 层，业务 CSS 不出现任何主题条件判断。
- **状态**：Not Started

### Stage 2: 工作台视觉重构（云端落地）
- **目标**：`workspace.css` 去掉三栏 1px 分割线，改为浮在微渐变画布上的圆角面板（间距 + 阴影分层）；卡片 hover 升起；侧栏当前项、按钮、chip、设置抽屉、登录页全部消费新 token；全局动效统一为弹簧曲线，并尊重 `prefers-reduced-motion`。
- **成功标准**：默认主题下界面即为方案 A 效果；切到 `data-theme="blush"` 后无需改任何组件即呈现方案 B 效果。
- **状态**：Not Started

### Stage 3: 主题切换与持久化
- **目标**：新建 `theme.js`（`getTheme/applyTheme/persistTheme`，localStorage 键 `notegen.theme`）；`renderer/index.js` boot 最前应用已存主题避免闪烁；设置抽屉顶部新增「外观」分组，两张主题预览卡（云端 / 胭脂纸），点击即时生效并持久化。
- **成功标准**：切换即时无闪烁；重启应用后主题保持。
- **状态**：Not Started

### Stage 4: 验证与审查
- **目标**：theme.js 附单元测试；`npm test` 全绿；`npm run dev` 启动无报错，人工核对两套主题下工作台/登录/设置/手册四个界面；非 trivial 改动走 Codex 审查。
- **成功标准**：质量门禁全部通过。
- **状态**：Not Started

### 各 Stage 状态更新
- Stage 1: Complete
- Stage 2: Complete
- Stage 3: Complete
- Stage 4: Complete

**待确认事项**：
1. 主题持久化用 localStorage（推荐，纯渲染层、零 IPC 改动）；如希望跟随账号存到 settings 服务端，请说明。
2. 「胭脂纸」主题下控件形状会随 token 变为胶囊形（不只是换色），默认按此执行。
3. 毛玻璃（backdrop-filter）在低端机可能有性能开销，默认启用；如遇卡顿再降级为纯白面板。

## 完成记录

**完成时间**：2026-07-09

**实际结果**：
- `tokens.css` 重构为双主题 token 契约（:root = 云端默认，`html[data-theme="blush"]` = 胭脂纸覆盖），补齐此前缺失的 `--radius-*`、`--color-border-subtle`、`--color-surface-muted`、`--color-danger` 等 token
- `workspace.css` 三栏去 1px 分割线改为悬浮圆角面板（阴影 + 间隙分层），卡片 hover 升起，全局弹簧动效，新增 `prefers-reduced-motion` 支持
- 新增 `src/constants/themeOptions.js`（ESM 单一纯逻辑源）+ `themeOptions.cjs`（同 API 测试镜像，沿用 formDefaults 惯例）+ `src/components/theme.js`（DOM 胶水）
- 设置抽屉新增「外观」分组，两张主题预览卡即点即切并持久化（localStorage 键 `notegen.theme`）
- 新增 `public/js/theme-boot.js` head 阻塞脚本，首帧前打上 data-theme 消除启动闪变（CSP 禁 inline，故用外部脚本）
- 验证：`npm test` 130/130 通过（含新增 themeOptions 5 项）；`npm run dev` 启动无报错

**偏差说明**：
- Codex MCP 工具本会话不可用（未连接 codex 服务器），改用 Claude Code 内置多视角代码审查（8 个审查角度 + 逐条核对）作为替代 Review Gate；共 8 条有效发现，全部已修复（双实现分歧、blush 面板边界缺失、登录卡未主题化、置顶气泡硬编码阴影、按钮过渡范围过宽、拖拽期间关闭 backdrop 模糊、冗余 token 清理、启动主题闪变）
- 主题持久化按规划采用 localStorage，未动主进程 settings 服务
