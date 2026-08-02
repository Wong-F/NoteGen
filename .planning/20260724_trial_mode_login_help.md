# 任务：登录页试用模式 + 登录页帮助文档入口

## 任务：登录页试用模式 + 登录页帮助文档入口

**背景**：当前应用必须凭手机号+密钥登录才能进入主界面，新用户没有密钥时无法体验产品，转化门槛高。
需要在登录界面提供**一次性试用**入口：点击后直接进入完整工作区，本次运行期间可一直使用；
退出应用后试用即结束，且同一台设备不能再次试用。同时登录页应提供**帮助文档**入口，
让用户在未登录时就能了解如何获得密钥、如何使用应用。

**影响范围**：
- `src/services/authService.js` — 新增试用状态管理（内存试用会话 + 磁盘一次性标记）
- `src/routes/index.js` — 新增 `auth:trialStatus`、`auth:startTrial` IPC 路由
- `src/components/loginPage.js` — 新增「试用一次」按钮与「帮助文档」链接
- `src/components/userManual.js` — 补充「登录与激活」章节：如何获得密钥、试用说明
- `src/renderer/index.js` — 试用入口进入主界面的接线（复用现有 `showApp`）
- `public/css/login.css` — 登录卡片新增按钮/链接样式
- `test/authService.test.js` — 试用逻辑单元测试

**前置条件**：现有密钥登录流程（authService / loginPage / userManual）已可用，无其他依赖。

### Stage 1: authService 试用逻辑 + 测试
- **目标**：
  - `AuthService` 新增：
    - `trial-state.json`（userData 目录）记录 `{ trialUsedAt }`，标记该设备已用过试用；
    - `startTrial()`：若未用过则生成**仅内存**的试用会话（`trial: true`，不写 `auth-session.json`），
      同时落盘一次性标记；已用过则返回 `{ ok: false, error }`；
    - `getTrialStatus()`：返回 `{ available: boolean }` 供登录页决定是否展示试用按钮；
    - `getSession()` 优先返回内存中的试用会话（应用退出后自然消失，重启回到登录页）；
    - `logout()` 同时清除内存试用会话（试用中点退出登录 = 试用结束，不可再试用）；
    - `toUserProfile()` 对试用会话返回 `subscriptionLabel: "试用中"` 等标识。
  - `test/authService.test.js` 覆盖：首次试用成功、二次试用被拒、试用会话不落盘、
    logout 终止试用、trialStatus 正确。
- **成功标准**：`npm test` 全绿。
- **状态**：Complete

### Stage 2: IPC 路由 + 登录页 UI
- **目标**：
  - `src/routes/index.js` 注册 `auth:trialStatus`、`auth:startTrial`；
  - 登录页在登录按钮下方新增次级按钮「免密钥试用一次」（仅当 `trialStatus.available` 为 true 时显示），
    点击后调用 `auth:startTrial`，成功则走 `onSuccess()` 进入主界面，失败则在错误区提示；
  - 登录卡片底部新增「帮助文档」链接，点击打开 `mountUserManual` 浮层（登录页挂载一份，
    默认定位到「登录与激活」章节）；
  - `public/css/login.css` 补充试用按钮（次级样式）与帮助链接样式，遵循 `docs/design-philosophy.md`。
- **成功标准**：`npm run dev` 启动后：登录页可见试用按钮与帮助链接；点试用进入主界面；
  重启应用回到登录页且试用按钮不再出现；帮助链接可打开手册。
- **状态**：Complete

### Stage 3: 手册内容补充 + 收尾验证
- **目标**：
  - `userManual.js` 的「登录与激活」章节补充：如何获得密钥（获取渠道说明）、
    试用模式说明（一次机会、退出即结束、试用期间功能完整但需自备 AI API Key）；
  - 全量回归：`npm test` 全绿 + `npm run dev` 启动无报错；
  - Codex 代码审查（Review Gate）。
- **成功标准**：测试与启动验证通过，审查无阻塞问题。
- **状态**：Complete

**待确认事项**（已于 2026-07-24 确认）：
1. **试用次数语义**：每台设备只能试用一次（磁盘标记）。✅ 已确认
2. **密钥获取渠道**：先写「请联系发行方/管理员获取」占位。✅ 已确认
3. **试用按钮文案**：「免费试用」。✅ 已确认

## 完成记录

- **完成时间**：2026-07-24
- **实际结果**：
  - `authService.js`：新增 `getTrialStatus` / `startTrial` / `markTrialUsed` / `readTrialUsed`；
    试用会话仅存内存（退出即失效），`trial-state.json` 落盘一次性标记；
    `getSession` 优先返回试用会话，`logout` 终止试用，`toUserProfile` 返回「试用中」标识；
    顺带抽出 `formatDateTime` 复用。
  - `routes/index.js`：新增 `auth:trialStatus`、`auth:startTrial`。
  - `loginPage.js`：新增「免费试用」按钮（仅未用过试用时显示）与「查看帮助文档」链接
    （复用使用手册浮层，模块级单例避免重复挂载，打开时定位「登录与激活」章节）。
  - `userManual.js`：「登录与激活」章节补充密钥获取占位说明与试用规则。
  - `login.css`：试用按钮（描边次级样式）与帮助链接样式。
  - 测试：`authService.test.js` 新增 7 个试用用例，`npm test` 173/173 全绿；
    `npm run dev` 两次启动验证无报错。
- **偏差说明**：
  - 代码审查经独立审查代理（review-agent 流程）执行，发现 1 个 P2 并已修复：
    `startTrial` 改为先落盘 used-flag 再进入试用态（落盘失败返回结构化错误，不留幽灵会话）；
    `writeSession` 写入正式会话时清空内存试用会话，保证正式登录必然覆盖试用。
  - 已知限制（设计使然）：试用标记纯本地，删除 userData 下 `trial-state.json` 可重置试用；
    MVP 阶段接受，部署阶段如需严格控制须服务端按设备号校验。
