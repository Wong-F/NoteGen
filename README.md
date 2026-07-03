# Vibe Coding Template

AI-assisted development workflow template for Claude Code + Cursor + Codex.
Clone this repo into your project and let an AI agent initialize it for you — or fill in the `{{PLACEHOLDER}}` values manually.

---

## File Structure

```
├── CLAUDE.md                        # Claude Code 主指令（auto-generated，勿手动编辑）
├── AGENTS.md                        # 所有 AI agent 通用指令（auto-generated，勿手动编辑）
├── .agent-rules/
│   ├── approval.md                  # 任务审批：先规划后执行（通用，无需修改）
│   ├── core.md                      # 项目核心规则（填写 {{}} 占位符）
│   ├── style.md                     # 代码规范、Git 工作流（填写 {{KEY_METRICS}}）
│   └── sync_agent_rules.py          # 同步脚本：将 .agent-rules/ 合并到 CLAUDE.md 等
├── .planning/
│   └── README.md                    # 规划文件目录说明（通用，无需修改）
├── .claude/
│   └── settings.local.json          # Claude Code 权限白名单
└── .cursor/
    └── memory/
        └── MEMORY.md                # Claude Code 记忆索引（初始为空）
```

---

## Option A — Let the Agent Initialize (Recommended)

Copy the prompt below and paste it into Claude Code (or any AI coding agent) in your **new project directory** after cloning this template:

---

```
我正在初始化一个新项目，使用 vibe-coding-template 作为 AI 工作流基础。
请帮我完成模板初始化：

1. 先逐一询问我以下信息（每次问 1-2 个，等我回答后再继续）：
   - 项目名称（PROJECT_NAME）
   - 项目一句话描述（PROJECT_DESCRIPTION）
   - 主要贡献/目标方向（1~3 条，每条含关键词）
   - 总体目标（TARGET_GOAL，例：投稿某会议、交付产品）
   - 是否有阶段分离需求？（研究阶段 vs 部署阶段，或其他阶段划分）
     - 如有：阶段一名称/描述/本阶段忽略哪些约束、阶段二名称/描述
     - 如无：告诉我，跳过该节
   - Python 版本（默认 3.11）
   - 项目关键评估指标（KEY_METRICS，例：accuracy / F1 / FPS / mAP）
   - 项目的核心命令（训练/评估/构建/测试 等，用于填入 CLAUDE.md Commands 区块）
   - 目录结构是否与模板默认（src/ scripts/ tests/ data/ experiments/）一致？
     如不同，告诉我实际结构

2. 收集完信息后，替换以下文件中的所有 {{...}} 占位符：
   - .agent-rules/core.md
   - .agent-rules/style.md
   - .agent-rules/sync_agent_rules.py（含 CLAUDE_HEADER 的 Commands 区块）
   - AGENTS.md 第一行标题

3. 如用户说无阶段分离需求，删除 core.md 中「开发阶段分离」整节。

4. 运行同步脚本重新生成 CLAUDE.md 和 AGENTS.md：
   python .agent-rules/sync_agent_rules.py

5. 展示修改摘要，等待用户确认后提示可以 git commit。

开始吧，先问我项目名称和描述。
```

---

## Option B — Manual Initialization

### Step 1 — Clone into your project root

```bash
# As a subtree (recommended for existing repos)
git subtree add --prefix=. https://github.com/YOUR_USERNAME/vibe-coding-template.git main --squash

# Or just copy files
cp -r vibe-coding-template/. /path/to/your-project/
```

### Step 2 — Fill in placeholders

**`.agent-rules/core.md`**

| Placeholder                      | 说明             | 示例                    |
| -------------------------------- | ---------------- | ----------------------- |
| `{{PROJECT_NAME}}`               | 项目名称         | `MyResearchProject`     |
| `{{PROJECT_DESCRIPTION}}`        | 一句话描述       | `基于 X 的 Y 系统`      |
| `{{CONTRIBUTION_1/2/3}}`         | 主要贡献方向     | `数据集构建`            |
| `{{KEYWORDS_1/2/3}}`             | 对应关键词       | `COCO, 多模态`          |
| `{{TARGET_GOAL}}`                | 目标             | `投稿 NeurIPS 2026`     |
| `{{PHASE_1_NAME}}`               | 阶段一名称       | `研究阶段`              |
| `{{PHASE_1_DESCRIPTION}}`        | 阶段一说明       | `模型设计与训练`        |
| `{{PHASE_1_IGNORE_CONSTRAINTS}}` | 阶段一忽略的约束 | `嵌入式部署`            |
| `{{PHASE_2_NAME}}`               | 阶段二名称       | `部署阶段`              |
| `{{PHASE_2_DESCRIPTION}}`        | 阶段二说明       | `量化与边缘优化`        |
| `{{PYTHON_VERSION}}`             | Python 版本      | `3.11`                  |

> 如无阶段分离需求，删除 `core.md` 中「开发阶段分离」整节。

**`.agent-rules/style.md`**

| Placeholder       | 说明             | 示例                            |
| ----------------- | ---------------- | ------------------------------- |
| `{{KEY_METRICS}}` | 关键评估指标     | `mAP / FPS / Latency / Params`  |

**`.agent-rules/sync_agent_rules.py`**

在文件的 `CUSTOMIZE` 区块中：

- 将 `{{PROJECT_NAME}}` 替换为项目名称（出现在 `AGENTS_HEADER` 和 `CURSOR_FRONTMATTER`）
- 将 `{{PROJECT_COMMANDS_DESCRIPTION}}` 替换为命令描述
- 更新 `CLAUDE_HEADER` 中的 `Commands` 区块为实际项目命令

### Step 3 — Regenerate CLAUDE.md and AGENTS.md

```bash
python .agent-rules/sync_agent_rules.py
```

### Step 4 — Commit

```bash
git add CLAUDE.md AGENTS.md .agent-rules/ .planning/ .claude/ .cursor/memory/
git commit -m "chore: initialize vibe coding workflow"
```

---

## Workflow Summary

```
.agent-rules/*.md  ──sync──►  CLAUDE.md       (Claude Code reads this)
                          ──sync──►  AGENTS.md        (other agents read this)
                          ──sync──►  .cursor/rules/   (Cursor reads this)
```

**Source of truth**: `.agent-rules/*.md`
**Never edit** `CLAUDE.md` / `AGENTS.md` directly — changes will be overwritten by sync.

---

## Key Patterns This Template Enforces

| Pattern | File | 说明 |
|---------|------|------|
| 先规划后执行 | `approval.md` | 重要任务必须先创建 `.planning/` 文件等待批准 |
| Codex Review Gate | `style.md` | 非 trivial 改动提交前须经 Codex 代码审查 |
| 会话记忆 | `core.md` | Claude Code 记忆保存在 `.cursor/memory/`，不用全局路径 |
| 阶段隔离 | `core.md` | 研究阶段与部署阶段约束严格分离 |
| 配置驱动 | `style.md` | 不硬编码超参，配置统一管理 |
| 可复现性 | `style.md` | 完整随机种子 + 环境信息记录 |

---

## Updating Rules

To modify workflow rules for your project:

1. Edit the relevant `.agent-rules/*.md` file
2. Run `python .agent-rules/sync_agent_rules.py`
3. Commit both the source `.md` and the generated `CLAUDE.md` / `AGENTS.md`
