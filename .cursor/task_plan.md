# 任务拆解与状态

## 已完成

| 任务 | 规划文档 | 状态 |
|------|----------|------|
| Stage 1 — AI Provider 抽象 | `20260703_three_step_pipeline_architecture.md` | done |
| Stage 2 — 选题 | 同上 | done |
| Stage 3 — 文案 | 同上 | done |
| Stage 4 — 配图 + 图库搜图 | 同上 | done |
| Stage 6 — AI Workspace UI 重设计 | — | done |
| Workspace 创作会话系统 | `20260703_workspace_system.md` | done |
| 登录页与密钥激活鉴权 | `20260704_login_page.md` | done |

## 进行中 / 待办

| 任务 | 说明 | 状态 |
|------|------|------|
| SIT 联调 | 向后端申请测试账户，验证真实激活流程 | pending |
| Stage 5 — 工作流复用 | 模板/风格/配图方案跨 workspace 复用；字段与保存粒度待产品确认 | planned |
| 能量点消费 | 后端 `aipoint` 已返回，前端尚未接入 AI 调用扣费逻辑 | planned |
| Codex Review Gate | 环境 MCP 不可用，非 trivial 改动暂以测试代替 | blocked |

## 版本目标

- **0.1.0**：MVP 三步流水线 + Workspace UI（已交付）
- **0.1.1**：Workspace 持久化 + 登录鉴权框架（当前）
- **0.2.0**：后端联调、能量点、部署阶段用户 Key 对接
