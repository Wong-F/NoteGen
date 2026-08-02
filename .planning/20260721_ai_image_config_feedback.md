## 任务：AI 生图未配置 API 时给出可操作反馈

**背景**：用户点击「AI 生图」但未配置图像 API 时，当前反馈不清晰——部分 CONFIG 报错是中文「图像 API 地址未配置」，而 `describeAiError` 只匹配英文 `is not configured`，导致状态栏没有「打开设置」；缺 API Key 时甚至不前置校验，会落到难懂的 HTTP/鉴权错误。手册已写明「错误直达 + 打开设置」，需与实现一致。

**影响范围**：
- `src/services/imageService.js` — 缺 baseUrl / apiKey / model 时抛出可识别的 CONFIG 错误
- `src/constants/errorText.js` — 映射图像 CONFIG / 鉴权 / 连接错误为中文 + `action: "settings"`
- `test/imageService.test.js` / `test/errorText.test.js` — 覆盖未配置路径

**前置条件**：`renderErrorStatus` + `app:openSettingsRequest` 已存在；仅补齐生图侧的错误与文案映射。

### Stage 1: 服务层前置校验
- **目标**：`generateImages` 在发起请求前检查 `baseUrl`、`apiKey`（及必要的 model），缺项抛 `AiServiceError(..., "CONFIG")`，message 含稳定英文片段 `is not configured`（与文本 AI 一致），便于跨 IPC 映射。
- **成功标准**：空配置调用 `generateImages` 立即失败，不发起 fetch；测试覆盖。
- **状态**：Complete

### Stage 2: 用户可见文案映射
- **目标**：`describeAiError` 识别图像相关 CONFIG（含现有中文「未配置」兜底），文案明确为「尚未配置图像 API…」，并带 `action: "settings"`。
- **成功标准**：`renderErrorStatus(..., "AI 生图失败", error)` 显示友好中文 +「打开设置」按钮。
- **状态**：Complete

### Stage 3: 测试与验证
- **目标**：补测试；`npm test` 全绿。
- **成功标准**：相关用例通过。
- **状态**：Complete

**已确认（2026-07-21）**：
1. 缺 API Key 一律拦截
2. 文案：「尚未配置图像 API，请先在设置中填写服务地址与 API Key」

## 完成记录
- **完成时间**：2026-07-21
- **实际结果**：缺 baseUrl/apiKey 时立刻 CONFIG；状态栏提示「尚未配置图像 API…」并附「打开设置」。`npm test` 167 全绿。
- **偏差说明**：无。
