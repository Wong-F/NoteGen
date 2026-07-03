# 会话进展记录

## 2026-07-03

- 调研并记录两个复用 skill（md2wechat-skill / guizang-social-card-skill），结论见
  `.cursor/findings.md`；授权风险已标记（开发期复用，发布前需授权或替换）。
- 创建规划 `.planning/20260703_three_step_pipeline_architecture.md`（选题→文案→配图三步架构，
  5 个 Stage）。用户已确认：Ollama 本地对接、开发期直接复用、按 Stage 顺序执行，并批准开工。
- **Stage 1 完成**：
  - 新增 `src/services/aiService.js`（OpenAI 兼容 client：complete/completeJson/listModels/
    testConnection，错误码 CONNECTION/TIMEOUT/AUTH/HTTP/BAD_RESPONSE/CONFIG）
  - 新增 `src/services/settingsService.js`（userData/settings.json，默认端点
    `http://localhost:11434/v1`）
  - `src/services/index.js` 工厂注入 userDataDir；`src/main/index.js` 传入
    `app.getPath("userData")`
  - 路由新增 `settings:get` / `settings:save` / `ai:testConnection`
  - `appShell.js` 新增设置卡片（端点/模型/Key、测试连接、保存），模型列表用 datalist 联想
  - 测试：`test/aiService.test.js`（11 项）、`test/settingsService.test.js`（3 项），
    npm test 17/17 通过
  - 实测本地 Ollama 运行中，`/v1/models` 返回 `qwen2.5:7b-instruct`
- 备注：项目尚未配置 ESLint/Prettier；Codex MCP 审查工具在当前环境不可用，Stage 1 审查
  暂以自查 + 测试代替，待环境具备后补审。
- **Stage 2 完成**：
  - 新增 `src/services/promptCatalog.js`（YAML prompt 加载 + `{{VAR}}` 渲染）
  - 新增 `prompts/topic/xiaohongshu-topic-expert.yaml`（借鉴 md2wechat title-expert，
    适配小红书选题：标题钩子 + 切入角度 + 策略 + hook level 1/2/3）
  - 新增 `src/services/topicService.js`（`suggest()` → aiService.completeJson → 结构化候选）
  - 路由 `topics:suggest`；UI 替换为 Step1 选题页（关键词、目标读者、钩子力度、候选卡片、选择）
  - 测试新增 6 项（promptCatalog 2 + topicService 4），npm test 23/23 通过
  - electron-builder 打包清单加入 `prompts/**/*`
- **Stage 3 完成**：
  - 新增 `src/services/copyService.js`（`generate` / `humanize` / `listStyles`）
  - 新增 `src/services/writerCatalog.js`（加载 `writers/*.yaml` 写作风格）
  - 新增 prompt：`prompts/copy/xiaohongshu-note-writer.yaml`、
    `prompts/humanizer/xiaohongshu-authentic.yaml`（借鉴 md2wechat authentic 规则，JSON 输出）
  - 新增 writer 风格：`writers/default.yaml`、`writers/casual-friend.yaml`
  - 路由 `copy:listStyles` / `copy:generate` / `copy:humanize`
  - UI Step2 文案页：风格选择、生成、可编辑标题/正文/标签、「去 AI 味」按钮
  - 测试新增 9 项，npm test 32/32 通过；打包清单加入 `writers/**/*`
- **Stage 4 完成**：
  - 新增 `src/services/imageService.js`（用户供图 import + 云端 `/v1/images/generations` 生图）
  - 新增 `src/services/draftPaths.js`、`cardService.js`、`cardTemplateBuilder.js`
  - 新增 `src/main/renderWorker.js`（隐藏 BrowserWindow + capturePage 导出 PNG）
  - 新增 `templates/xhs-deck-shell.html`、`prompts/card/xiaohongshu-page-plan.yaml`
  - 路由 `images:pick` / `images:import` / `images:generate` / `cards:plan` / `cards:render`
  - 设置页新增图像 API 字段（baseUrl / model / apiKey，空则回退文案 API）
  - UI Step3 配图页：规划页面、每页用户供图/AI 生图、渲染预览
  - 测试新增 13 项（imageService 4 + cardService 4 + cardTemplateBuilder 4 + settings 1），
    npm test 45/45 通过
- **图库搜图（Stage 4+）完成**：
  - 新增 `stockImageService`（Pexels → Unsplash 瀑布流、`images:searchStock`）
  - 页面计划 `imageSource: stock` + `searchKeyword`；Step3「图库搜图」；设置页图库 Key
  - npm test 50/50 通过
