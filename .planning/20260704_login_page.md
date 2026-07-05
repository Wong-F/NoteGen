## 任务：登录页面与密钥激活鉴权

**背景**：部署阶段需对接后端「AI密钥分销平台」，用户通过账户验证后才能进入创作工作台。开发阶段需保留免密后门以便本地调试。项目已有 `public/assets/LoginBackground.png`，可作为登录页视觉素材。

**影响范围**：
- `src/services/authService.js` — **新增**：调用 `/publickey/normaltoken`、开发后门、设备码生成
- `src/services/index.js` — 注册 authService
- `src/routes/index.js` — **新增** IPC：`auth:login` / `auth:session` / `auth:logout`
- `src/components/loginPage.js` — **新增**：登录页 UI 与表单校验
- `src/components/appShell.js` — 启动时检查登录态，未登录显示登录页
- `src/renderer/index.js` — boot 流程调整（可选，逻辑主要在 appShell）
- `public/css/login.css` — **新增**：登录页样式
- `public/index.html` — 引入 login.css
- `test/authService.test.js` — **新增**：后门逻辑、错误码映射、设备码稳定性

**前置条件**：Workspace 系统已落地；Electron IPC 与 settings 持久化模式可复用。

---

### 后端文档解读（AI密钥分销平台 v1.0）

#### 接口概要

| 项 | 值 |
|---|---|
| 环境（SIT） | `http://sit.xslq.work/sit/interface/api` |
| 路径 | `POST /publickey/normaltoken` |
| 鉴权 | 公开接口，无需 Token |
| Content-Type | `application/json` |

#### 请求字段

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `phone` | string | 是 | 手机号 |
| `secret` | string | 是 | 密钥 ID（由后台下发，32 位 hex 类字符串） |
| `imei` | string | 是 | 设备码（手机硬件码；桌面端需替代方案） |
| `script` | string | 是 | 脚本类型，必须与密钥记录一致 |

#### 成功响应（`code === 200`）

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "aipoint": 1500,
    "script": "yuxi_normal",
    "imei": "867686060000123",
    "phone": "13800000000",
    "secret": "a1b2c3d4...",
    "activeDate": "2026-06-25 10:30:00",
    "expireDate": "2026-07-25 10:30:00"
  }
}
```

关键字段：`aipoint`（AI 能量点）、`expireDate`（到期时间）。

#### 失败响应（`code === 500`）

HTTP 状态码始终 200，前端**只看 `code === 200`** 判断成功。常见 `msg` 与前端提示映射：

| 后端 msg | 前端提示 |
|---|---|
| 4 个必填字段任一为空 | 请填写完整信息 |
| 密钥非法 | 密钥无效 |
| 脚本类型错误,请核对 | 脚本类型不匹配 |
| 绑定的手机号不一致 | 请使用绑定时的手机号 |
| 该激活码已在其它设备绑定 | 请到原设备使用，或联系客服解绑 |
| 已过期,请续期 | 密钥已过期，请联系管理员续期 |

#### 业务规则

1. **首次激活**：写入手机号 + 设备码，`expireDate = 当前 + 30 天`
2. **非首次激活**：校验手机号 + 设备码 + 未过期，任一失败即报错
3. **单点登录**：同一密钥在新设备激活会挤掉旧设备
4. **有效期**：默认 30 天，过期需续期

#### 与「账户密码」的映射关系

文档**没有**传统用户名/密码接口，实际是 **手机号 + 密钥** 激活模式。建议 UI 映射：

| 用户看到的字段 | 对应 API 字段 |
|---|---|
| 账户（手机号） | `phone` |
| 密码（密钥） | `secret` |

若后端后续提供独立账号密码接口，可在 authService 层替换实现，UI 可保持不变。

---

### Stage 1: Auth 服务层（主进程）
- **目标**：封装激活 API、设备码、会话持久化、开发后门
- **成功标准**：已实现
- **状态**：Complete

### Stage 2: IPC 路由
- **目标**：渲染进程可登录 / 读会话 / 登出
- **成功标准**：已实现 `auth:login` / `auth:session` / `auth:logout`
- **状态**：Complete

### Stage 3: 登录页 UI
- **目标**：符合 design-philosophy 的轻量登录体验
- **成功标准**：已实现 loginPage + login.css
- **状态**：Complete

### Stage 4: 应用壳集成
- **目标**：启动流程门禁 + 设置账户信息 + 退出
- **成功标准**：已实现 renderer 门禁、settings 账户卡片
- **状态**：Complete

### Stage 5: 测试
- **目标**：authService 单元测试
- **成功标准**：9 项测试通过
- **状态**：Complete

---

**已确认决策**：
- 账户=手机号，密码=密钥
- script = `NoteGen`
- API 固定 SIT
- 设备码 = 本地 UUID
- 开发后门仅 `!app.isPackaged` 时生效（13164150732 免密）
- 过期自动重试激活
- 退出登录在设置 → 账户区

## 完成记录

- **完成时间**：2026-07-04
- **实际结果**：登录页、authService、IPC、设置账户信息框架、9 项单元测试全部通过
- **偏差说明**：无；待后端提供测试账户后可直接联调 SIT 接口

### 更新记录（2026-07-05）

- **设备码策略**：后端确认桌面端可用 MAC 作为 `imei`。
- **实现**：`resolvePhysicalMacAddress()` — 格式 `AABBCCDDEEFF`，以太网 > Wi-Fi > 其他物理网卡，跳过虚拟网卡；持久化 `device-id.json`；无 MAC 时回退 UUID。
- **测试环境**：UUID 与 MAC 并行（已有 UUID 缓存不自动覆盖）；尚未交付终端用户。
- **文档**：`docs/README.md` § Authentication / Development phases；`README.md` § 当前阶段。


---

### 架构示意

```
renderer/index.js
    └─ boot()
         ├─ auth:session → 有会话 → mountApp()
         └─ 无会话 → mountLoginPage()
                              │
                              └─ 登录成功 → mountApp()

main/authService
    ├─ getDeviceId()          → userData/device-id.json
    ├─ login(phone, secret)   → POST /publickey/normaltoken
    │       └─ 13164150732    → DEV_BYPASS（不调 API）
    └─ session                → userData/auth-session.json
```

---

**待确认事项**：

1. **字段映射**：是否同意「账户 = 手机号、密码 = 密钥」？还是后端另有账号密码接口（文档中未出现）？
2. **`script` 值**：noteGen 在后端注册的脚本类型是什么？文档示例为 `yuxi_normal`，需后端确认正式值（如 `notegen` / `notegen_normal`）。
3. **API 环境**：开发/打包默认用 SIT `http://sit.xslq.work/sit/interface/api`，还是可配置（写入 settings）？
4. **设备码策略**：桌面无 IMEI，计划用「本地持久化 UUID」作为 `imei` 传给后端——后端是否接受？
5. **开发后门行为**：`13164150732` 免密登录时，是否 mock 固定 `aipoint`（如 99999）和远期 `expireDate`？是否需要可配置开关（如仅 `NODE_ENV=development` 生效）？
6. **会话续期**：启动时若本地有会话但已过期，是否自动尝试用缓存的 phone+secret 重新激活？还是强制回登录页？
7. **退出登录**：Header 是否需要「退出」按钮？还是仅过期时登出？
