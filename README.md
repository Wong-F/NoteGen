# noteGen

面向 Windows 的桌面应用，帮助无 AI 知识的博主利用 AI 入门或加速 **小红书**、**微信公众号** 等平台的笔记创作。

## 快速开始

```bash
npm install
npm run dev
```

首次启动会进入登录页；开发模式可使用文档中的 dev bypass 账号（见 `authService` 测试用例）。登录后若从未看过教程，会自动弹出**新手引导**（黑色遮罩 + 箭头说明）。

> 提示：请勿同时开多个 `npm run dev` 实例；已启用单实例锁。若遇缓存报错，先结束所有 `electron.exe` 再启动。

## 核心功能

| 模块 | 说明 |
|------|------|
| **Workspace** | 创作项目，自动保存选题 / 文案 / 配图进度 |
| **运营人设** | 可选，多账号口吻与平台；绑定后自动带入选题「领域关键词 / 目标读者」 |
| **三步流程** | 选题 → 成文/文案 → 配图 → 右侧 **预览 / 对话** 与导出 |
| **Platform Pack** | 按平台切换 prompt、文案结构、导出与卡片模板 |
| **公众号长文** | 标题 / 摘要 / 引言 / 多小节 `sections[]`，支持小节「继续生成」 |
| **配图** | 工作区缩略图；图库/AI 可选返回 1–6 张候选再绑定 |
| **AI 对话** | 右栏「对话」标签，结合当前创作与人设上下文 |
| **行内 AI（Ctrl+K）** | 选中文字即改写；未选中时在光标处生成插入，支持原生撤销 |
| **界面主题** | 云端 / 胭脂纸 / 墨夜 / 抹茶 / 奶油杏 五套，设置中即点即切并持久化 |
| **导出** | 复制文案或导出到文件夹（含 manifest） |
| **新手教程** | 首次进主界面 + 首次新建 Workspace；设置中可「重新观看」 |
| **桌面体验** | 窗口状态记忆、关窗前自动落盘、快捷键（Ctrl+N/E/,/F）、长任务任务栏进度与系统通知、删除可撤销、AI 请求可取消 |

## 用户数据位置

Windows：`%APPDATA%\notegen\`

包含 workspaces、personas、settings、登录会话、教程完成状态等。**开发模式与正式版共用此目录**（仅 Chromium 缓存放在临时目录）。

## 项目结构

```
src/
  main/           # Electron 主进程
  preload/        # contextBridge
  renderer/       # 渲染入口（登录 → 主界面）
  routes/         # IPC 路由
  services/       # 业务层（AI、存储、Platform Pack、导出）
  components/     # UI 组件（含 onboardingTour）
  constants/      # 表单默认值等
public/           # 静态资源
prompts/          # Prompt 模板（YAML）
writers/          # 写作风格
templates/        # 卡片 HTML 模板
test/             # 单元测试
docs/             # 开发文档（英文详版见 docs/README.md）
.planning/        # 功能规划归档
```

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发模式启动 Electron |
| `npm test` | 运行单元测试（155+ 项） |
| `npm run build` | 构建主进程与渲染进程 |
| `npm run dist` | 打包 Windows 安装程序 |

## 当前阶段（2026-07-10）

| 维度 | 状态 |
|------|------|
| **产品阶段** | Phase 1（本地 AI 创作流水线）已完成；Phase 2（后端登录 / 密钥激活）**测试环境进行中**，尚未交给终端用户 |
| **版本** | 目标 **0.1.1**（Workspace、登录鉴权、人设、公众号、新手引导、五套主题、行内 AI、桌面体验打磨）；`package.json` 仍为 0.1.0 |
| **后端** | SIT：`http://sit.xslq.work/sit/interface/api/publickey/normaltoken`，待真实测试密钥联调 |
| **设备码** | API 字段 `imei`：优先物理网卡 MAC（`AABBCCDDEEFF`），无 MAC 时回退 UUID；已缓存的 UUID 与 MAC **并行共存**（测试期可接受） |
| **待办** | SIT 联调、能量点扣费、用户自填 API Key（0.2.0） |

详表见 [docs/README.md — Development phases](./docs/README.md#development-phases) 与 [Authentication](./docs/README.md#authentication)。

## 开发文档

- [docs/README.md](./docs/README.md) — 架构、IPC、Platform Pack、数据目录、测试（英文）
- [docs/design-philosophy.md](./docs/design-philosophy.md) — UI/UX 设计原则
- [.planning/](./.planning/) — 各功能规划与完成记录

## 仓库

https://github.com/Wong-F/NoteGen

## Agent 规则

编辑 `.agent-rules/*.md` 后运行：

```bash
python .agent-rules/sync_agent_rules.py
```

多步骤功能需先在 `.planning/` 写规划并获用户确认后再改代码。

## License

MIT
