## 任务：登录时对物理地址（MAC）做哈希后再传给后端绑定

**背景**：`authService.js` 的 `getDeviceId()` 会解析本机物理网卡 MAC 地址（形如 `AABBCCDDEEFF`），当前直接作为 `imei` 字段明文传给后端 `/publickey/normaltoken` 做设备绑定。用户要求：登录时先对该物理地址做哈希（16 位十六进制即可），用哈希值代替明文 MAC 传给后端，避免明文 MAC 出网。哈希是确定性的（同一 MAC → 同一哈希），不影响原有“单设备绑定”“换设备顶号”等业务规则。

**影响范围**：
- `src/services/authService.js` — 新增哈希工具函数；`activate()` 请求体里的 `imei` 改为哈希值；开发后门 session 的 `imei` 同步改为哈希值，保持前后一致
- `test/authService.test.js` — 新增/调整测试：哈希函数的确定性与长度、`activate()` 发出的 `imei` 是哈希值而非明文 MAC

**前置条件**：现有 `getDeviceId()` / `resolvePhysicalMacAddress()` 逻辑不变（本地仍持久化原始 MAC 或 UUID 到 `device-id.json`，仅在“对外发送/存入 session”这一步做哈希）。

---

### 方案（已按用户确认更新：本地也只存哈希值）

1. 新增 `hashDeviceId(rawId)`：`crypto.createHash("sha256").update(String(rawId)).digest("hex").slice(0, 16)`，输出固定 16 位小写十六进制字符串。
2. `getDeviceId()` 改造：
   - 读取 `device-id.json`，若已存内容匹配 `/^[0-9a-f]{16}$/`（即已是哈希格式），直接复用；
   - 否则（文件不存在、损坏，或是旧版本遗留的明文 MAC/UUID）——按开发阶段约定**直接丢弃旧值**，重新解析物理 MAC（或回退 UUID），对其 `hashDeviceId()`，把哈希写入 `device-id.json` 并返回。
   - 效果：磁盘上永远只落哈希值，原始 MAC 只在内存中短暂存在，不持久化。
3. `activate()` 中 `imei = this.getDeviceId()` 已经是哈希值，无需再单独哈希一次，直接用于请求体。
4. 开发后门分支（`isDev && phone === DEV_BYPASS_PHONE`）：`session.imei = this.getDeviceId()`，同样自动是哈希值。
5. `module.exports` 增加导出 `hashDeviceId`，方便测试直接校验。
6. `resolvePhysicalMacAddress` 本身不变（仍返回明文 MAC 供 `getDeviceId()` 内部使用），但不再对外暴露到任何持久化文件或网络请求。
7. 不做旧数据迁移：本地已存在的 `device-id.json`（明文 MAC/UUID）和 `auth-session.json`（历史 `imei` 明文）在下次 `getDeviceId()`/登录时被新格式自然覆盖；开发阶段无需兼容脚本。

### 测试计划

- `hashDeviceId` 对同一输入始终返回同一 16 位十六进制字符串；不同输入哈希不同。
- `getDeviceId()`：对物理 MAC `AABBCCDDEEFF` 解析后，返回值应等于 `hashDeviceId("AABBCCDDEEFF")`，而不是明文 MAC 本身；两次调用返回同一哈希（稳定性）；`device-id.json` 落盘内容为哈希格式。
- `getDeviceId()` 兼容性覆盖：预置一个旧格式（明文 MAC/UUID）的 `device-id.json`，调用后应被丢弃并重写为哈希值（不做迁移，直接覆盖）。
- `activate()` 通过 mock `fetchFn` 断言请求体里的 `imei` 为 16 位十六进制哈希，不等于原始 MAC。
- 更新原有 "persists a stable device id from physical MAC" 用例的断言（不再期望明文 MAC）。

### 验证

- `npm test` 全绿
- 手动用测试密钥 `a191208507ec495fb4fbdd8e86e1cd27`（用户提供，仅用于人工验证登录联调，不写入代码/测试文件）走一次真实登录，确认后端接受哈希后的 `imei` 并正常绑定/续期。

---

### Stage 1: 哈希工具函数
- **目标**：`hashDeviceId(rawId)` 落地并导出
- **成功标准**：单测通过，16 位小写十六进制，确定性
- **状态**：Complete

### Stage 2: `getDeviceId()` / `activate()` 改用哈希
- **目标**：`device-id.json` 只落哈希值；请求体 `imei` 不再出现明文 MAC/UUID
- **成功标准**：mock 请求断言 `imei` 为哈希值；磁盘文件内容为哈希
- **状态**：Complete

### Stage 3: 开发后门路径同步 + 旧数据自动覆盖
- **目标**：`devBypass` session 的 `imei` 也是哈希值；旧格式 `device-id.json`（明文）被自动丢弃重写
- **成功标准**：对应测试通过
- **状态**：Complete

### Stage 4: 测试与自测
- **目标**：`npm test` 全绿
- **成功标准**：全部用例通过，含新增哈希相关用例
- **状态**：Complete

**已确认决策**（2026-07-20）：
1. 哈希算法：SHA-256 取前 16 位十六进制字符。
2. 本地 `device-id.json` 只存哈希值，不落盘原始 MAC/UUID。
3. 不做迁移：旧本地文件（明文 MAC/UUID）在下次调用时被直接丢弃并覆盖为新哈希格式，开发阶段可接受。

## 完成记录

- **完成时间**：2026-07-20
- **实际结果**：
  - `src/services/authService.js`：新增并导出 `hashDeviceId()`；`getDeviceId()` 改为校验缓存内容是否已是 16 位十六进制哈希格式，命中则复用，未命中（缺失/损坏/旧版明文 MAC 或 UUID）则重新解析物理 MAC（或回退 UUID）并哈希后落盘；`activate()` 与开发后门分支均通过 `this.getDeviceId()` 自动拿到哈希值，无需额外改动。
  - `test/authService.test.js`：更新原“稳定设备码”用例改为断言哈希值且落盘内容为哈希；新增 `hashDeviceId` 确定性/格式测试、旧格式文件自动覆盖测试；`activate()` mock 请求新增 `imei` 为 16 位十六进制的断言。
  - `npm test` 全绿：164/164（其中 `AuthService` 套件 16/16，含 7 项新增/调整用例）。
- **偏差说明**：无。未对 `auth-session.json` 做单独迁移处理——开发阶段旧会话下次续期/登录时 `imei` 字段会自然更新为哈希值。
