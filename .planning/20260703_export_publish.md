## 任务：导出文案与配图

**背景**：用户完成创作后需要发布到小红书，需导出文字（标题/正文/标签）和图片。
**影响范围**：`exportService.js`、`routes/index.js`、`previewPanel.js`、`services/index.js`、`test/exportService.test.js`
**前置条件**：文案与配图流程已可用。

### Stage 1: exportService + IPC
- **状态**：Complete

### Stage 2: 预览区导出 UI（复制文案 / 导出到文件夹）
- **状态**：Complete

## 完成记录

- **完成时间**：2026-07-03
- **实际结果**：新增 `exportService`、4 条 IPC（copyText / pickFolder / saveToFolder / revealFolder）；预览区底部「发布导出」栏支持复制文案与导出到文件夹（note.txt + images/）；56 项测试全绿。
