# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- AUTO-GENERATED — edit .agent-rules/*.md and run `python .agent-rules/sync_agent_rules.py` to update -->

## Commands

```bash
# noteGen — Electron + Node.js Windows desktop app

# Install dependencies
npm install

# Dev mode (hot reload)
npm run dev

# Run tests
npm test

# Build renderer + main process
npm run build

# Package Windows installer
npm run dist

# Sync agent rules after editing .agent-rules/
python .agent-rules/sync_agent_rules.py
```

Allowed tools per `.claude/settings.local.json`: see that file for the full list.

## Codex 代码审查（Claude Code 专用）

当「代码审查（Codex Review Gate）」规则触发时，使用以下 MCP 工具调用 Codex：

```
mcp__codex__codex({
  prompt: "<审查要求与待审查代码的上下文>",
  sandbox: "read-only",
  cwd: "<项目根目录>"
})
```

- 始终使用 `read-only` sandbox，确保审查过程不修改文件
- 如需对审查结果追问，使用 `mcp__codex__codex-reply` 传入 `threadId`
- 审查 prompt 应包含：改动摘要、涉及文件、需关注的审查重点

---
# 任务审批规则（所有 Agent 必须遵守）

## 核心原则：先规划，后执行

**凡涉及以下任何一项，必须先创建规划文件并等待用户明确批准，才能写代码：**

- 创建新的源代码文件（任何位置）
- 修改核心架构组件
- 新增重要功能模块
- 多步骤实现任务（≥ 3 个步骤）
- 架构层面的设计决策
- 修改关键脚本（训练 / 评估 / 构建 / 部署等）

**单行 bug fix、注释修改、配置调整除外。**

## 规划文件规范

**位置**：统一放在 `.planning/` 目录，不在 `.cursor/` 或根目录创建规划文件

**命名**：`.planning/{YYYYMMDD}_{task_name}.md`（日期+具体任务名，避免重名）

**格式**：

```markdown
## 任务：[具体任务名]

**背景**：[为什么要做这件事，与项目目标的关联]
**影响范围**：[会修改或创建的文件列表]
**前置条件**：[依赖哪些已完成的工作]

### Stage 1: [阶段名]
- **目标**：[具体交付物]
- **成功标准**：[可验证的结果]
- **状态**：Not Started

### Stage 2: [阶段名]
...

**待确认事项**：[需要用户决策的问题，逐条列出]
```

## 批准信号

用户明确给出以下信号后，才可开始执行：

- 「好」「确认」「开始」「go」「ok」「yes」「proceed」「没问题」

收到模糊回应时（如「嗯」「看看」），**应追问确认**，而非直接开始。

## 规划文件的生命周期

- 规划文件只追加更新，不删除
- 执行中更新各 Stage 的状态（`Not Started` → `In Progress` → `Complete`）
- 完成后在文件末尾追加 `## 完成记录`（完成时间、实际结果、偏差说明）
- 历史规划文档永久保留，归档用

## 会话恢复

会话中断或重启后：
1. 先读取 `.cursor/task_plan.md`、`.cursor/progress.md`、`.cursor/findings.md`，了解当前执行状态
2. 再读取 `.planning/` 目录下最近的规划文件，了解整体任务规划

## 执行中进度跟踪

会话执行期间，使用以下文件记录状态（保存在 `.cursor/` 目录）：

- `task_plan.md`：任务拆解与状态（`planned` → `in_progress` → `done`）
- `progress.md`：按日期追加会话进展
- `findings.md`：关键发现、问题和技术结论

---

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

## 设计哲学

涉及 UI、交互、视觉或用户体验决策时，**必须先阅读** [`docs/design-philosophy.md`](../docs/design-philosophy.md)。

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
  main/            # Electron 主进程入口
  preload/         # contextBridge 预加载脚本
  renderer/        # 渲染进程入口
  routes/          # IPC 路由注册
  services/        # 服务层（AI 调用、业务逻辑）
  components/      # 前端组件
public/            # 静态资源（HTML、CSS、图片等）
test/              # 测试用例
scripts/           # 构建与工具脚本
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

---

# 代码规范、实验管理与 Git 工作流

## 代码规范

- **Node.js 20+ / Electron**，TypeScript 优先，行长 100
- **命名**：`camelCase`（变量/函数）、`PascalCase`（类/组件）
- 不使用 `var`，优先 `const` / `let`
- 捕获具体异常类型，有不确定性时先验证，不基于猜测改动
- 测试文件与源文件目录结构对应，新功能须附带测试

## 实验管理

- **版本号**：遵循 SemVer（当前规划 0.1.0 → 0.1.1 → 0.2.0）
- **关键指标**：暂无硬性量化指标（MVP 阶段以功能可用性与用户体验为主）
- 重要功能变更记录在 `.planning/` 或 `docs/` 中

## Git 工作流

- **分支命名**：`feat/<描述>`、`fix/<描述>`、`exp/<实验名>`、`data/<描述>`
- **Commit 格式**：`<type>: <简短描述>`
  - type ∈ `feat` / `fix` / `data` / `exp` / `deploy` / `docs` / `refactor` / `test`
- **不提交**：大型二进制文件（安装包 / 原始数据 / 构建产物 > 10MB）
- 禁止跳过 hooks（`--no-verify`）

## 语言规范

| 场景 | 语言 |
|------|------|
| Agent 与用户交互 | 中文 |
| 面向用户的 Markdown 文档 | 中文 |
| 代码注释 | 英文 |
| Commit message | 英文 |
| `docs/` 文档 | 英文（论文 / 对外文档导向） |

## 卡住处理

同一问题最多尝试 3 次，超过后停止硬改：
1. 记录已尝试方案 + 报错 + 失败原因判断
2. 对比 2-3 个相似实现，提炼替代路径
3. 优先选择更小、更可验证的拆解方案，等待用户选择

## 实施流程

1. **Understand**：先读现有实现与相邻功能，至少找 1 处相似实现
2. **Test**：优先先写测试（如适用）
3. **Implement**：最小改动通过验证
4. **Refactor**：在测试通过前提下清理结构
5. **Review**：非 trivial 改动提交前须经 Codex 代码审查（见下方「代码审查」节）
6. **Commit**：提交信息说明 why，并引用规划文档
7. **Verify**：自行运行验证（见下方「质量门禁」），通过后再向用户反馈完成

## 技术标准与决策

- 优先组合而非继承，优先显式依赖与清晰数据流
- 评估顺序：可测试性、可读性、一致性、简洁性、可逆性

## 代码审查（Codex Review Gate）

项目已集成 OpenAI Codex 作为代码审查工具。Review Gate 已启用。

**何时触发**：
- 完成一个功能分支或逻辑完整的代码块后（对应实施流程第 5 步）
- 修改核心代码（架构、训练流程、数据管线等）后

**审查重点**：
- 代码正确性与潜在 bug
- 与项目规范的一致性（PEP 8、type hints、命名规范）
- 测试覆盖是否充分
- 安全性与性能问题

**豁免**：单行 bug fix、注释修改、配置调整、文档更新无需 Codex 审查。

> **各 Agent 的具体调用方式**：参见各自的指令文件（CLAUDE.md / .cursor/rules/ 等）中的工具特定说明。

## 质量门禁

完成前需满足：
- 代码可运行
- 相关测试通过
- 格式化与 lint 通过（ESLint / Prettier）
- **Codex 代码审查通过**（适用于非 trivial 改动）
- **Agent 交付自测**（所有 Agent 必须遵守）：
  - 向用户反馈「已完成」之前，须**自行运行验证**，不得在未验证的情况下宣称完成
  - 最低要求：改动涉及的业务逻辑跑 `npm test` 且全绿
  - 若改动涉及 Electron 主进程、IPC 路由、服务注册或应用启动路径，还须运行 `npm run dev`（或等价启动命令），确认进程能正常拉起、无启动期报错后再反馈
  - 若验证失败，先修复再继续反馈；同一问题修复后须重新跑一遍验证

## 错误处理

- 快速失败并提供可定位上下文
- 在合适层级处理错误，不吞异常
- 有不确定性时先验证，不基于猜测改动

## 权限约定

- 读操作默认允许
- 高影响命令（安装依赖、批量改写、潜在破坏性操作）需先征得用户确认
