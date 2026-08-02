## 任务：更新帮助信息（Agnes 国内站四步图文 + OpenAI 兼容服务商说明）

**背景**：用户已验证 Agnes 国内站可用；希望帮助文档与设置页文案对齐正式入口 `https://www.agnes-ai.cn/`，并用 `docs/Guide` 四步截图引导申请 Key；同时补充其他 OpenAI 兼容服务商地址，以及「测试文案连接 → 选择模型」的用法。
**影响范围**：
- `docs/Guide/1.png`–`4.png`（源图，已存在）
- `public/assets/guide/`（新建，复制四步图供应用内加载；打包仅含 `public/**`）
- `src/components/userManual.js`（手册「设置与 AI 服务」+ FAQ）
- `src/components/settingsPanel.js`（设置页帮助链接文案）
- `src/components/onboardingTour.js`（新手教程设置步骤一句）
- `public/css/manual.css`（指南截图样式）
**前置条件**：Agnes 国内站连通与模型下拉修复已完成；`docs/Guide` 四张截图已就位。

### Stage 1: 资源入包
- **目标**：将四步截图复制到 `public/assets/guide/`，保证开发与 `electron-builder` 打包后均可访问。
- **成功标准**：路径 `assets/guide/1.png`…`4.png` 相对 `public/index.html` 可加载。
- **状态**：Complete

### Stage 2: 使用手册正文
- **目标**：重写「设置与 AI 服务」中 Agnes 段落：平台入口改为 `https://www.agnes-ai.cn/`；按「注册/进 API 平台 → 创建密钥 → 命名密钥 → 复制 Key」配图说明；写明国内服务地址 `https://api.agnes-ai.cn/v1`；强调填完后点「测试文案连接」，可从发现的模型列表/芯片中选用；补充常见 OpenAI 兼容服务商地址表（DeepSeek / Agnes 国内与国际 / 月之暗面 / 硅基流动 / OpenAI / 本地 Ollama 等）；同步 FAQ「不想付费」条目。
- **成功标准**：手册内图文步骤完整，服务地址准确，测试连选用模型说明清晰。
- **状态**：Complete

### Stage 3: 设置页与教程短文案
- **目标**：设置抽屉与新手教程中 Agnes 链接/表述与手册一致（指向 `www.agnes-ai.cn`，并点明可用测试连接选模型）。
- **成功标准**：设置页与教程不再出现旧的 `platform.agnes-ai.com` 作为主入口。
- **状态**：Complete

## 完成记录
- **完成时间**：2026-08-02
- **实际结果**：四步图已复制到 `public/assets/guide/`；手册「设置与 AI 服务」含 Agnes 四步图文、服务地址与 OpenAI 兼容服务商列表，并说明用「测试文案连接」选模型；设置页与新手教程文案已同步；`npm test` 173 通过。
- **偏差说明**：无

**待确认事项**：
1. Agnes **文案**服务地址是否固定写国内站 `https://api.agnes-ai.cn/v1`（国际备用 `https://apihub.agnes-ai.com/v1` 是否一并列出）？→ **已确认**：国内站为主，国际站一并列出
2. 四步图是否按文件名顺序对应：1 注册/进 API 平台 → 2 创建密钥 → 3 命名密钥 → 4 复制 Key？→ **已确认**
3. `1.png` 约 2MB，是否接受直接入包，还是需要你先压缩后再拷贝？→ **已确认**：直接入包
