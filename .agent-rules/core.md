# 项目核心规则

## 项目定位

noteGen 是一款面向 Windows 的桌面应用，帮助无 AI 知识的博主利用 AI 入门或加速小红书等平台的笔记创作。

**项目名称**：noteGen

**主要贡献 / 目标**：

| # | 方向 | 关键词 |
|---|------|--------|
| C1 | 降低门槛 | 向导、候选主题与内容、一键生成 |
| C2 | 提升效率 | 批量、草稿模板保存、复用 |

目标：交付可安装的 Windows 产品

## 开发阶段分离（如适用）

**阶段一 — 开发阶段**：在本地调用大模型，实现各类 AI 功能。
此阶段**不考虑** 后端对接、用户登录 约束。

**阶段二 — 部署阶段**：与用户信息平台后端对接；用户自行提供 API Key 调用大模型。
仅在阶段一完成后启动。

## 运行时环境

**技术栈**：Electron + Node.js（Node 20 LTS）

**版本规划**：0.1.0 → 0.1.1 → 0.2.0

使用项目本地依赖，禁止全局安装项目包：

```bash
npm install          # 安装依赖
npm run dev          # 开发模式
```

同步 Agent 规则脚本需 Python 3.11+（仅用于 `.agent-rules/sync_agent_rules.py`）。

## 目录规范

```
src/
  routes/          # 路由
  services/        # 服务层（AI 调用、业务逻辑）
  components/      # 前端组件
  ...              # 其他源码子目录按需扩展
public/            # 静态资源（HTML、CSS、图片等）
test/              # 测试用例
.planning/         # 所有规划文件（按任务命名）
.cursor/           # IDE 与 Agent 会话状态（memory/、task_plan.md 等）
docs/              # 文档
```

- 禁止在根目录散落业务源码文件
- 大二进制文件（安装包、原始数据）不提交 Git
- 上游依赖通过 npm 包管理引入，不直接复制源码

## Claude Code 记忆存储规范

Claude Code 的持久化记忆文件必须保存在项目目录下，不使用全局路径：

- **记忆根目录**：`.cursor/memory/`
- **索引文件**：`.cursor/memory/MEMORY.md`（仅包含指向各记忆文件的链接，不写记忆内容）
- **记忆文件命名**：`{type}_{topic}.md`，例如 `feedback_planning_location.md`
- **禁止**使用 `~/.claude/` 或任何项目目录之外的路径存储记忆

每个记忆文件使用如下 frontmatter 格式：

```markdown
---
name: 记忆名称
description: 一句话描述（用于判断未来会话的相关性）
type: user | feedback | project | reference
---

内容
```
