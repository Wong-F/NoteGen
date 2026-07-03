# 任务拆解与状态

规划文档：`.planning/20260703_three_step_pipeline_architecture.md`

| Stage | 内容 | 状态 |
|-------|------|------|
| 1 | AI Provider 抽象（aiService + 设置持久化 + 设置 UI + ai:testConnection） | done |
| 2 | 选题（topicService + prompt 资产 + 选题 UI） | done |
| 3 | 文案（copyService + 风格模板 + 文案 UI） | done |
| 4 | 配图（cardService + renderWorker + 配图 UI） | done |
| 5 | 草稿与向导串联（draftStore + 流程打通） | **重要待办** — 工作流未最终确认，暂缓 |
| 6 | AI Workspace UI 重设计 | done |

---

## 重要待办（工作流确认前不做）

- **Stage 5 / 工作流复用**：完整工作流持久化（`draftStore`、中断恢复、首页草稿列表、三步状态串联）；模板/风格/配图方案复用。
  依赖：产品侧先敲定「一步到三步」的字段、保存粒度、是否支持多草稿并行等。
- **Stage 6 / UI 重设计**：AI Creative Workspace 布局（左栏导航 + 中心编辑 + 右栏预览），规划已提交，待用户批准。
- **写作风格扩展**：已内置 6 个 `writers/*.yaml`；继续扩展只需加 YAML。
