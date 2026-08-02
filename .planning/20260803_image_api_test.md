## 任务：新增「测试图像 API」连接

**背景**：设置页已有文案/图库测试，缺少图像 API 独立探测，用户只能在配图流程里试错。
**影响范围**：
- `src/services/imageService.js`
- `src/routes/index.js`
- `src/components/settingsPanel.js`
- `test/imageService.test.js`
- `src/components/userManual.js`
**前置条件**：图像 API 配置与 `generateImages` 路径已存在。

### Stage 1: ImageService.testConnection
- **目标**：最小 `/images/generations` 探测，不写盘，返回 ok/code/message。
- **成功标准**：单元测试覆盖配置缺失、网络失败、成功路径。
- **状态**：Complete

### Stage 2: IPC + 设置 UI
- **目标**：注册 `image:testConnection`，设置页增加「测试图像连接」按钮。
- **成功标准**：保存配置后可点测并显示状态。
- **状态**：Complete

### Stage 3: 手册 + 验证
- **目标**：手册提及测试图像连接；`npm test` 与 `npm run dev` 通过。
- **成功标准**：测试全绿，应用可启动。
- **状态**：Complete

**待确认事项**：无（方案已确认：真实最小生图探测、不落盘）

## 完成记录
- **完成时间**：2026-08-03
- **实际结果**：`ImageService.testConnection` + `image:testConnection` IPC + 设置页「测试图像连接」；手册与 FAQ 已更新；`npm test` 180 通过。
- **偏差说明**：无
