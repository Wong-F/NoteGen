## 任务：配图工作区缩略图 + 多图候选挑选

**背景**：绑定图片后仅预览栏可见；图库/AI 只返回 1 张且自动绑定，用户无法对比选择。

**影响范围**：`workspace.js`、`appState.js`、`imageService.js`、`stockImageService.js`、`routes/index.js`、`workspace.css`、相关测试

### Stage 1: 工作区显示已绑定缩略图
- **目标**：每页卡片在绑定后显示本地缩略图
- **成功标准**：`pageAssets` 有路径时工作区可见预览
- **状态**：Complete

### Stage 2: 可选返回数量（1–6）
- **目标**：AI 生图 / 图库搜图前可选返回张数
- **成功标准**：`count=1` 自动绑定；`count>1` 进入候选模式
- **状态**：Complete

### Stage 3: 多图候选网格供用户点选绑定
- **目标**：候选缩略图网格，点击后绑定到当前页
- **成功标准**：图库用 previewUrl；AI 用本地 dataUrl；选中后写入 `pageAssets`
- **状态**：Complete

## 完成记录
- **时间**：2026-07-05
- **结果**：工作区缩略图、返回数量选择、多图候选挑选均已实现；`npm test` 125/125 通过
- **偏差**：无
