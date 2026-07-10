## 任务：桌面交互规范改进（11 项 UX 建议落地）

**背景**：对照通用交互准则与 Windows 桌面应用惯例做的 UX 评审共产出 11 项建议，用户认可并批准先执行前 5 项（主进程/系统集成类），后 6 项列入 backlog 待后续批准。

**勘误**：评审时判断「无单实例锁」有误——`src/main/index.js:16-19` 已实现 `requestSingleInstanceLock`，且 `second-instance` 已做恢复最小化+置前。第 1 项调整为：补充置前时的任务栏闪烁反馈（用户要求的"丝滑体验和交互反馈"）。

**11 项清单**：
| # | 建议 | 状态 |
|---|------|------|
| 1 | 单实例锁 + 置前交互反馈 | 本次执行（锁已有，补反馈） |
| 2 | 记住窗口位置/尺寸/最大化状态 | 本次执行 |
| 3 | 退出前 flush 待保存的创作内容 | 本次执行 |
| 4 | 补齐菜单项与快捷键（新建/导出/设置/搜索） | 本次执行 |
| 5 | 长任务系统级反馈（任务栏进度 + 最小化时系统通知） | 本次执行 |
| 6 | 删除改软删除 + 撤销 toast（替代 confirm） | Backlog |
| 7 | AI 请求可取消（AbortController） | Backlog |
| 8 | 错误信息可行动化（映射 + 快捷入口） | Backlog |
| 9 | 弹层焦点管理三件套（焦点移入/Escape/焦点归还） | Backlog |
| 10 | 成功反馈收敛（自动淡出 + 全局 toast 带动作按钮） | Backlog |
| 11 | execCommand 废弃 API 替换（beforeinput 方案） | Backlog（记入 findings） |

**影响范围**（前 5 项）：
- `src/main/index.js` — 窗口创建接入状态记忆、close 拦截 flush、second-instance 闪烁反馈
- `src/main/windowState.js` — 新建：窗口状态读写与边界校验（纯逻辑可测）
- `src/main/appMenu.js` — 文件菜单补新建/导出/设置项，编辑菜单补搜索，全部带加速键
- `src/routes/index.js` — 新增 `app:*` 路由（flush 完成回执、长任务计数、系统通知）
- `src/components/appShell.js` — 绑定新菜单事件；关窗 flush 响应
- `src/components/workspace.js` / `previewPanel.js` — 长任务起止上报（选题/文案/配图/导出）
- `src/components/userManual.js` — 快捷键小节同步更新
- `test/windowState.test.js` — 新建

**前置条件**：`flushWorkspaceSave()` 已存在（`src/components/workspaceStore.js:152`）；菜单→渲染层 `onMenuAction` 通道已建立。

### Stage 1: 单实例置前反馈
- **目标**：`second-instance` 时若主窗口未聚焦，restore+focus 后调用 `flashFrame(true)`，窗口获得焦点后关闭闪烁——用户双开时能立刻注意到已有窗口在哪。
- **成功标准**：二次启动时任务栏图标闪烁提示，聚焦后停止。
- **状态**：Complete

### Stage 2: 窗口状态记忆
- **目标**：新建 `windowState.js`：`userData/window-state.json` 持久化 `{x, y, width, height, isMaximized}`；resize/move 防抖保存，close 时落盘；恢复前用 `screen` API 校验边界（显示器拔掉后不恢复到屏幕外）；首次启动保持现状（默认尺寸 + 最大化）。
- **成功标准**：调整窗口后重启，位置/尺寸/最大化状态复原；异常 JSON 或越界坐标回退默认值。
- **状态**：Complete

### Stage 3: 退出前落盘
- **目标**：主进程拦截 `close` → `preventDefault` → 向渲染层发 `app:flushBeforeClose` → 渲染层执行 `flushWorkspaceSave()` 后回执 `app:flushDone` → 主进程真正关闭；2 秒超时强制关闭兜底（渲染层卡死不能阻止退出）；登录页等无 workspace 场景 flush 为 no-op。
- **成功标准**：输入内容后立即关窗，重启后内容完整；渲染层无响应时 2 秒内仍能退出。
- **状态**：Complete

### Stage 4: 菜单与快捷键补齐
- **目标**：文件菜单：新建创作 `Ctrl+N`、导出到文件夹 `Ctrl+E`、设置 `Ctrl+,`、退出；编辑菜单末尾：搜索创作 `Ctrl+F`。均走既有 `webContents.send("app:xxx")` → `onMenuAction` 通道；appShell 绑定：新建=`createWorkspace()`、设置=`settings.open()`、搜索=聚焦 `#workspace-search`、导出=触发预览面板导出按钮（未挂载时忽略）。同步更新使用手册快捷键小节。
- **成功标准**：四个快捷键与菜单项均生效；无 workspace 时导出/新建不报错。
- **状态**：Complete

### Stage 5: 长任务系统级反馈
- **目标**：主进程新增 IPC：`app:taskStarted` / `app:taskFinished`（引用计数 → `setProgressBar` 不确定态进度/清除）；`taskFinished` 可携带 `{ notify: { title, body } }`，仅当主窗口未聚焦（最小化或切走）时弹系统通知，点击通知恢复并聚焦窗口。渲染层在选题生成、文案生成、配图生成、导出四处长任务起止上报，完成文案如「选题已生成」「导出完成」。
- **成功标准**：长任务期间任务栏图标显示进度态；最小化时任务完成弹系统通知，点击回到应用；窗口聚焦时不打扰（无通知）。
- **状态**：Complete

### Stage 6: 验证与审查
- **目标**：`windowState` 纯逻辑单元测试；`npm test` 全绿；涉及主进程与 IPC，须 `npm run dev` 确认启动无报错并人工核对五项行为；非 trivial 改动走代码审查（Codex MCP 不可用时用内置自查替代）。
- **成功标准**：质量门禁全部通过。
- **状态**：Complete

**待确认事项**：
1. ~~前 5 项是否执行~~ 已批准（2026-07-10）。
2. 系统通知使用 Electron `Notification`（Windows 通知中心），打包版需 `app.setAppUserModelId`——本次一并设置，值用 `com.notegen.app`（与后续 electron-builder appId 保持一致即可）。
3. Backlog 6–11 项待用户后续批准，届时另开规划或在本文件追加 Stage。

---

## 第二批：用户反馈修正 + Backlog 6–10（2026-07-10 用户批准）

**用户反馈**：
1. Ctrl+K 在空白处（焦点不在输入框时）应生效但未生效
2. 按钮加载动画的"转圈圈"太原始，希望改成类似任务栏的扫光动画
3. 完成上述两项后继续执行 backlog 6–10

### Stage F1: Ctrl+K 全局生效
- **目标**：`inlineRewrite.js` 维护已挂载字段注册表，新增 document 级 Ctrl+K 监听（利用 input/textarea 失焦后选区保留的特性）：优先当前焦点字段，其次最近产生过选区的字段，找到有效选区直接打开改写框；无任何选区时在屏幕上方弹出轻提示「先选中要改写的文字」并自动消失——快捷键在任何位置都有响应。
- **成功标准**：焦点在空白处按 Ctrl+K，若此前在输入框选过文字则打开改写框，否则出现提示。
- **状态**：Complete

### Stage F2: 加载动画扫光化
- **目标**：`button.is-loading` 由「文字隐藏+旋转圆圈」改为「文字保留+亮带横扫」（Windows 任务栏不确定态风格）；`btn-secondary` 用暗色扫光；`prefers-reduced-motion` 降级为透明度脉冲。
- **成功标准**：所有 loading 按钮呈现扫光动画，文字可读，五套主题下均协调。
- **状态**：Complete

### Stage B6: 删除可撤销（toast + 快照恢复）
- **目标**：新建 `toast.js` 全局轻提示组件（底部居中、可带动作按钮、自动消失）。删除 workspace：删除前取全量快照，删除后 toast「已删除·撤销」，撤销通过 `workspaces:save`（已确认可按原 id 复活并回索引）+ `switchWorkspace` 恢复；删除人设：撤销用 `personas:create` 重建（删除仅在无关联 workspace 时允许，id 变化无副作用）；清空对话：内存快照恢复。全部去掉 `window.confirm` / `window.alert`。
- **成功标准**：三处删除均一步完成且 5 秒内可无损撤销。
- **状态**：Complete

### Stage B7: AI 请求可取消
- **目标**：`AiService` 登记在途 AbortController，新增 `cancelInflight()` 与用户取消错误码 `CANCELLED`（区别于 TIMEOUT）；新增 `ai:cancel` IPC 路由；渲染层长任务状态行旁出现「取消」按钮（选题/文案/去AI味/续写/页面规划/对话）。ImageService 独立 fetch 不在本次范围（记入偏差）。
- **成功标准**：点取消后请求中止，状态显示「已取消」，按钮恢复可用；附单元测试。
- **状态**：Complete

### Stage B8: 错误信息可行动化
- **目标**：新建 `src/constants/errorText.js`（纯逻辑）：剥离 Electron IPC 错误前缀，按 AiServiceError 稳定文案映射为中文可行动提示（未配置→「尚未配置 AI 服务」+ 打开设置；密钥被拒→检查设置；连不上→检查地址网络；超时→建议重试）；新建 `statusLine.js` 渲染状态行（文本+可选动作按钮）；appShell 监听 `app:openSettingsRequest` 打开设置抽屉。接入 workspace/preview/chat 的主要 catch 分支。
- **成功标准**：未配 AI 时生成选题，提示为中文说明+「打开设置」按钮，点击直达设置。
- **状态**：Complete

### Stage B9: 弹层焦点管理
- **目标**：设置抽屉、人设面板、使用手册统一三件套：打开时焦点移入（关闭按钮/首控件）、Escape 关闭、关闭后焦点归还触发元素。
- **成功标准**：全键盘操作可开关三个弹层，焦点不丢失。
- **状态**：Complete

### Stage B10: 成功反馈收敛
- **目标**：`statusLine.js` 支持 transient 状态（成功类消息 5 秒自动淡出，若已被新状态覆盖则不清除）；接入选题/文案/导出等成功提示；删除/撤销类全局事件统一走 toast。
- **成功标准**：成功提示不再永久驻留；toast 与状态行分工清晰（全局事件 vs 就地反馈）。
- **状态**：Complete

### Stage V2: 第二批验证
- **目标**：新增/扩展单元测试（errorText、aiService cancel）；`npm test` 全绿；`npm run dev` 启动核对各项交互；代码审查（Codex 不可用则内置自查）。
- **成功标准**：质量门禁全部通过。
- **状态**：Complete

### Stage F1b: 空白处 Ctrl+K = 光标处 AI 生成插入（2026-07-10 用户澄清）
- **目标**：用户澄清空白处 Ctrl+K 的预期是「在光标处生成并插入内容」而非提示。实现：新 prompt `prompts/rewrite/inline-insert.yaml`（在 `<<< >>>` 光标标记处生成衔接文本）；`copyService.insertAtCursor`（复用 rewrite 的消息结构与 JSON 输出）；新路由 `copy:insertAtCursor`；`inlineRewrite.js` 请求增加 `kind: "rewrite" | "insert"`——有选区走改写（原行为），无选区（字段内或全局空白处）定位目标字段光标，打开「想写点什么？」输入框，生成后预览、采用即插入光标处；仅当界面上没有任何可写字段时才回退提示。
- **成功标准**：焦点在字段光标处或空白处按 Ctrl+K，输入指令后 AI 生成内容插入光标位置，可撤销（原生 undo 栈）。
- **状态**：Complete
- **结果**（2026-07-10）：新增 `prompts/rewrite/inline-insert.yaml`、`copyService.buildInsertAtCursorMessages/insertAtCursor`（附 5 项测试）、`copy:insertAtCursor` 路由；`inlineRewrite.js` 请求带 `kind`，字段内无选区与全局空白处均走插入模式（目标字段按 焦点 > 最近聚焦 > 最近选区 排序，光标位置失焦后保留），预览只显示新内容，采用即插入并保留原生撤销；提示仅在界面无可写字段时出现。使用手册 Ctrl+K 说明同步。`npm test` 158/158；dev 启动/关闭验证通过。

## 完成记录（第二批：反馈修正 + Backlog 6–10）

**完成时间**：2026-07-10

**实际结果**：
- F1：`inlineRewrite.js` 增加已挂载字段注册表 + document 级 Ctrl+K（优先焦点字段，其次最近选区字段；input/textarea 失焦后选区保留使此可行）；无选区时屏上轻提示 1.8 秒自动消失
- F2：`is-loading` 改为「文字保留 + 亮带横扫」，扫光颜色收敛为 token（`--sweep-on-accent` / `--sweep-on-surface`，墨夜覆盖为浅色带）
- B6：新增 `toast.js`（底部堆叠、可带动作、自动消失）；workspace 删除 = 删前快照 + `workspaces:save` 复活撤销；人设删除 = `personas:get` 快照 + `personas:create` 重建撤销；清空对话 = 内存快照撤销（校验未切换创作）；`window.confirm/alert` 全部移除
- B7：`AiService` 在途请求注册 + `cancelInflight()` + `CANCELLED` 错误码（与 TIMEOUT 区分）；新增 `ai:cancel` 路由；选题/文案/去AI味/续写/页面规划/对话的忙碌状态行带「取消」按钮；附 3 项单元测试
- B8：新增 `errorText.js`（IPC 前缀剥离 + AiServiceError 稳定文案→中文可行动提示映射，附 5 项测试）+ `statusLine.js`（renderStatus/renderErrorStatus/renderBusyStatus）；配置/密钥/连接类错误带「打开设置」按钮（经 `app:openSettingsRequest` 事件由 appShell 打开抽屉）；接入 workspace 11 处、preview、chat 的 catch 分支
- B9：新增 `overlayFocus.js`（bindOverlayA11y 三件套），设置抽屉/人设面板/使用手册统一接入
- B10：成功类状态（选题/续写/导出完成）transient 5 秒自动淡出（被新状态覆盖则不清除）；全局事件（删除/撤销）统一走 toast
- 验证：`npm test` 153/153（新增 aiCancel 3 项 + errorText 5 项）；全部改动渲染层模块 Node 动态 import 校验可加载；`npm run dev` 启动无报错、优雅关闭正常

**偏差说明**：
- ImageService 使用独立 fetch，AI 生图暂不可取消（按规划记录，后续如需可比照 AiService 加 AbortController）
- Codex MCP 仍不可用，Review Gate 以内置逐项自查替代（全局快捷键与字段级处理器的 preventDefault 协作、statusToken 全局唯一性、删除撤销的 active 切换一致性、Escape 与改写弹窗的事件冲突、toast 在五主题下的 token 消费），未发现问题

## 完成记录（第一批：前 5 项）

**完成时间**：2026-07-10

**实际结果**：
- Stage 1：`second-instance` 置前后若未获焦点则 `flashFrame(true)`，获焦自动停止
- Stage 2：新增 `src/main/windowState.js`（`sanitizeWindowState` 纯逻辑 + keeper 胶水），持久化到 `userData/window-state.json`；恢复前按显示器工作区校验（要求至少 100×40 可见），越界/损坏回退默认；首启保持"默认尺寸+最大化"
- Stage 3：新增 `src/main/appIpc.js`，close 拦截 → `app:flushBeforeClose` → 渲染层 `flushWorkspaceSave()` → `app:flushDone` 回执，2 秒超时兜底；渲染层监听注册在 `renderer/index.js`（登录页阶段亦在位）
- Stage 4：文件菜单补「新建创作 Ctrl+N / 导出到文件夹 Ctrl+E / 设置 Ctrl+,」，编辑菜单补「搜索创作 Ctrl+F」；appShell 绑定四个 `app:*` 通道；使用手册快捷键小节同步
- Stage 5：`app:taskStarted/taskFinished` 引用计数驱动任务栏进度条；完成时窗口未聚焦则弹系统通知（点击恢复+聚焦）；渲染层新增 `longTask.js` 辅助，包裹选题/文案/卡片渲染/AI 生图/导出五处；`app.setAppUserModelId("com.notegen.app")`
- 验证：`npm test` 145/145（新增 windowState 8 项）；`npm run dev` 启动无报错；实测优雅关闭（WM_CLOSE）flush 握手不阻塞退出、窗口状态正确落盘

**偏差说明**：
- 评审勘误：单实例锁与 second-instance 置前原本已实现，Stage 1 缩减为仅补闪烁反馈
- 实测发现并修复一个 bug：Windows 关闭过程中 `isMaximized()` 已返回 false，close 时重新捕获会把最大化状态误存为 false——改为 close 只落盘、不重捕获（各事件时已即时捕获）
- Codex MCP 本会话不可用，Review Gate 以内置逐项自查替代（窗口重建闭包、单 resolver 假设、ESM 模块单例、通知聚焦条件、测试不依赖 electron 模块），发现的关闭态捕获 bug 已修复并复测
