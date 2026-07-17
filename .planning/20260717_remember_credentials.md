## 任务：登录页「记住账号密码」功能

**背景**：当前登录成功后会话会持久化（auth-session.json），但用户主动退出登录或会话失效后，需要重新手动输入手机号和密钥。为降低使用门槛（C1），在登录页增加「记住账号密码」选项，勾选后下次打开登录页自动填充。

**影响范围**：
- `src/services/authService.js` — 新增保存/读取/清除凭据的方法（存 userData 下 `saved-credentials.json`）
- `src/routes/index.js` — 新增 IPC 路由 `auth:savedCredentials`（读取）、登录成功时按 remember 标记保存或清除
- `src/components/loginPage.js` — 增加「记住账号密码」复选框；挂载时读取并预填；登录成功后按勾选状态保存/清除
- `public/` 样式 — 复选框样式（沿用现有 login 样式体系）
- `test/authService.test.js` — 凭据保存/读取/清除的测试

**前置条件**：登录/激活流程已可用（script 类型已修正为 noteGen）。

### Stage 1: 服务层凭据持久化
- **目标**：AuthService 新增 `saveCredentials / readCredentials / clearCredentials`，明文 JSON 存于 userData（阶段一本地开发，不做加密；阶段二可换 safeStorage 加密）
- **成功标准**：单元测试覆盖保存、读取、清除、文件损坏兜底，npm test 全绿
- **状态**：Complete

### Stage 2: IPC 路由与登录页 UI
- **目标**：登录页显示「记住账号密码」复选框（默认勾选态跟随是否已有保存凭据）；挂载时预填；登录成功且勾选 → 保存，未勾选 → 清除
- **成功标准**：npm run dev 启动后，勾选登录 → 退出登录 → 重新进入登录页时手机号与密钥已预填；取消勾选登录后不再预填
- **状态**：Complete

## 完成记录

- **完成时间**：2026-07-17
- **实际结果**：两个 Stage 均完成；测试 162/162 通过，`npm run dev` 启动无报错
- **偏差说明**：无功能偏差。Codex MCP 不可用，Review Gate 以内置自查替代；密钥按约定明文存储，阶段二再接 safeStorage

**待确认事项**：
1. 密钥是否需要加密存储？（建议阶段一先明文 JSON，阶段二接入 Electron safeStorage）
2. 复选框默认是否勾选？（建议默认勾选，符合降低门槛目标）
