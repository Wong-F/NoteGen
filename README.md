# noteGen

面向 Windows 的桌面应用，帮助无 AI 知识的博主利用 AI 入门或加速小红书等平台的笔记创作。

## 快速开始

```bash
npm install
npm run dev
```

## 项目结构

```
src/
  main/           # Electron 主进程
  preload/        # 预加载脚本（contextBridge）
  renderer/       # 渲染进程入口
  routes/         # IPC 路由注册
  services/       # 服务层（AI、笔记生成等）
  components/     # 前端 UI 组件
public/           # 静态资源
test/             # 测试用例
docs/             # 项目文档
```

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发模式启动 Electron |
| `npm test` | 运行单元测试 |
| `npm run build` | 构建（当前为占位） |
| `npm run dist` | 打包 Windows 安装程序 |

## 仓库

https://github.com/Wong-F/NoteGen

## Agent 规则

编辑 `.agent-rules/*.md` 后运行：

```bash
python .agent-rules/sync_agent_rules.py
```
