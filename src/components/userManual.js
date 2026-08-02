/**
 * In-app user manual — opened from Help menu or settings.
 */

import { bindOverlayA11y } from "./overlayFocus.js";

const MANUAL_SECTIONS = [
  {
    id: "intro",
    title: "欢迎使用 AI笔记坊",
    body: `
      <p>AI笔记坊是一款面向 Windows 的桌面应用，随时随地，AI 助力。帮助博主快速完成<strong>选题 → 文案 → 配图</strong>全流程，并导出可直接发布的素材包。</p>
      <p>目前支持<strong>小红书笔记</strong>与<strong>微信公众号长文</strong>两种创作模式。所有进度会自动保存，可随时切换历史创作继续编辑。</p>
    `,
  },
  {
    id: "login",
    title: "登录与激活",
    body: `
      <p>首次启动需使用手机号与密钥登录。登录成功后进入主工作区；若会话过期，系统会提示重新登录。</p>
      <ul>
        <li>账户：11 位中国大陆手机号</li>
        <li>密码：由平台分发的激活密钥</li>
      </ul>
      <p><strong>如何获得密钥</strong>：请联系管理员获取。密钥与设备绑定，如需换设备使用请联系客服解绑。</p>
      <p><strong>免费试用</strong>：没有密钥时，可点击登录页的「免费试用」按钮直接进入完整工作区体验：</p>
      <ul>
        <li>每台设备仅有 <strong>1 次</strong>试用机会</li>
        <li>试用期间功能完整可用，创作内容会正常保存在本机</li>
        <li>关闭应用或退出登录后试用即结束，再次打开需使用密钥登录</li>
        <li>AI 能力需在设置中自行配置 API Key（见「设置与 AI 服务」章节）</li>
      </ul>
    `,
  },
  {
    id: "workflow",
    title: "创作流程",
    body: `
      <h4>运营人设（可选）</h4>
      <p>若你运营多个账号、需要统一口吻，可在侧边栏顶部配置<strong>运营人设</strong>。人设包含平台、领域、目标读者、口吻与默认标题风格等。设好人设后，选题区的关键词与目标读者会自动带入（若尚未填写）。</p>
      <ul>
        <li>单账号用户可跳过，直接在创作区自由创作</li>
        <li>选中人设后，新建创作时可选择「在此人设下新建」</li>
        <li>已有创作可通过「绑定 / 改绑 / 解除人设绑定」调整关联</li>
      </ul>

      <h4>管理创作项目</h4>
      <p>左侧边栏的<strong>「创作」</strong>区域用于管理你的笔记项目：</p>
      <ul>
        <li><strong>新建创作</strong>：点击「+ 新建创作」开始空白项目</li>
        <li><strong>用人设新建</strong>：已选择运营人设时，可一键带入口吻与领域设定</li>
        <li><strong>最近</strong>：列出历史项目，单击切换、双击重命名</li>
        <li><strong>搜索</strong>：在搜索框输入关键词快速定位</li>
        <li><strong>删除</strong>：点击项目右侧 × 可删除，删除后 5 秒内可通过底部提示撤销</li>
      </ul>

      <h4>三步创作</h4>
      <p>每个创作项目按以下顺序推进，左侧<strong>「当前流程」</strong>会显示进度；完成任一步骤后，对应导航项会显示 ✓ 标记。</p>
      <ol>
        <li><strong>选题</strong>：输入领域或关键词，选择 AI 推荐的写作角度</li>
        <li><strong>文案 / 成文</strong>：生成正文并编辑；公众号模式支持分节续写与「去 AI 味」</li>
        <li><strong>配图</strong>：规划页面结构，生成卡片或配图（可上传、AI 生图或图库）</li>
      </ol>

      <p><strong>第一步：选题</strong></p>
      <ul>
        <li>填写<strong>领域 / 关键词</strong>，例如「周末咖啡店探店」</li>
        <li>可选填<strong>目标读者</strong>，帮助 AI 调整角度</li>
        <li>选择<strong>标题风格</strong>（克制可信 / 抓人有对比 / 高张力）</li>
        <li>点击「生成选题」，从列表中选定一个方向后继续</li>
      </ul>

      <p><strong>第二步：文案 / 成文</strong></p>
      <ul>
        <li>选择<strong>写作风格</strong>后点击「生成文案」或「生成长文」</li>
        <li>标题、正文、话题标签（小红书）或摘要与小节（公众号）均可手动修改</li>
        <li><strong>去 AI 味</strong>：对已有正文做口语化润色</li>
        <li>公众号模式下，每个小节可单独「继续生成」</li>
      </ul>

      <p><strong>第三步：配图</strong></p>
      <ul>
        <li>先点击「规划页面结构」或「规划配图结构」，AI 会拆分封面与内容页</li>
        <li>每页可选择<strong>上传图片</strong>、<strong>AI 生图</strong>或<strong>图库搜索</strong></li>
        <li>确认规划后点击「生成卡片图片」或「生成配图」</li>
        <li>右侧预览区会同步显示效果</li>
      </ul>
    `,
  },
  {
    id: "preview",
    title: "预览、对话与导出",
    body: `
      <p>右侧面板可在<strong>预览</strong>与<strong>对话</strong>之间切换（视图菜单可快速跳转）。预览区实时展示笔记效果；对话区可与 AI 自由交流，记录随创作保存。</p>
      <ul>
        <li><strong>复制文案</strong>：一键复制到剪贴板，便于粘贴到平台编辑器</li>
        <li><strong>导出到文件夹</strong>：生成 note.txt / note.md、HTML、图片与元数据，便于本地归档或二次编辑</li>
      </ul>
      <p><strong>AI 对话</strong>：可与模型自由交流，系统会附带当前创作与人设摘要作为上下文。</p>
    `,
  },
  {
    id: "settings",
    title: "设置与 AI 服务",
    body: `
      <p>点击侧边栏左下角的设置图标，配置 AI 能力（需自行准备 API Key）：</p>
      <ul>
        <li><strong>AI 文案服务</strong>：默认对接 <strong>DeepSeek</strong>（<code>https://api.deepseek.com/v1</code>），也可换成任意 OpenAI 兼容接口（含 Agnes、本地 Ollama 等）</li>
        <li><strong>图像 API</strong>：用于 AI 生图（兼容 OpenAI <code>/v1/images/generations</code> 接口）</li>
        <li><strong>图库 API</strong>：Pexels / Unsplash 密钥，用于免版权配图搜索</li>
      </ul>
      <p>填好服务地址与 API Key 后，请先点「<strong>测试文案连接</strong>」：连接成功会列出可用模型，可从下方芯片或模型输入框下拉中<strong>点选模型</strong>，再点「保存」。图像 API 可点「<strong>测试图像连接</strong>」（会发起一次最小生图请求以验通，可能消耗极少额度）；图库可点「测试图库连接」。设置页也可<strong>重新观看新手教程</strong>。</p>

      <h4>白嫖推荐：Agnes（免费 API Key）</h4>
      <p>官方宣称核心模型<strong>无限期免费</strong>，兼容 OpenAI 接口。API 平台入口：
        <a href="https://www.agnes-ai.cn/" target="_blank" rel="noopener">https://www.agnes-ai.cn/</a>
      </p>
      <p>在「AI 文案服务」中建议填写：</p>
      <ul>
        <li>服务地址（国内站，推荐）：<code>https://api.agnes-ai.cn/v1</code></li>
        <li>服务地址（国际站备用）：<code>https://apihub.agnes-ai.com/v1</code> 或 <code>https://apihub.agnes-ai.cn/v1</code></li>
        <li>API Key：按下方四步申请后粘贴（通常以 <code>sk-</code> 开头）</li>
        <li>模型：填完后点「测试文案连接」，从发现的列表中选用（常见如 <code>agnes-2.5-flash</code>）</li>
        <li>图像 API：可用同一密钥，填写方式见下方「接入 Agnes 生图」</li>
      </ul>
      <p>注意：服务地址只填到 <code>/v1</code>，不要带 <code>/chat/completions</code>。免费额度可能有每分钟请求数（RPM）限制；政策以 Agnes 官方最新说明为准。</p>

      <h4>申请 Agnes API Key（四步）</h4>
      <ol class="manual-guide-steps">
        <li>
          <p><strong>注册并进入 API 平台</strong>：打开
            <a href="https://www.agnes-ai.cn/" target="_blank" rel="noopener">www.agnes-ai.cn</a>
            ，完成注册/登录后，在右上角菜单选择「API 平台」进入控制台。</p>
          <figure class="manual-guide-figure">
            <img src="assets/guide/1.png" alt="在 Agnes 官网进入 API 平台" />
            <figcaption>步骤 1：进入 API 平台</figcaption>
          </figure>
        </li>
        <li>
          <p><strong>创建密钥</strong>：在「设置 → API 密钥」页点击「创建新的密钥」。</p>
          <figure class="manual-guide-figure">
            <img src="assets/guide/2.png" alt="点击创建新的密钥" />
            <figcaption>步骤 2：创建新的密钥</figcaption>
          </figure>
        </li>
        <li>
          <p><strong>命名密钥</strong>：为密钥起一个便于识别的名称（如「自媒体助手」），然后保存。</p>
          <figure class="manual-guide-figure">
            <img src="assets/guide/3.png" alt="为 API 密钥命名并保存" />
            <figcaption>步骤 3：命名并保存</figcaption>
          </figure>
        </li>
        <li>
          <p><strong>复制 Key</strong>：创建成功后立即复制密钥并妥善保存（通常只显示一次），粘贴到本应用设置的 API Key 栏。</p>
          <figure class="manual-guide-figure">
            <img src="assets/guide/4.png" alt="复制新创建的 API 密钥" />
            <figcaption>步骤 4：复制密钥</figcaption>
          </figure>
        </li>
      </ol>

      <h4>接入 DeepSeek</h4>
      <ul>
        <li>申请入口：<a href="https://platform.deepseek.com" target="_blank" rel="noopener">platform.deepseek.com</a>（注册 → API Keys → 创建密钥）</li>
        <li>服务地址：<code>https://api.deepseek.com/v1</code></li>
        <li>API Key：粘贴你刚申请的密钥</li>
        <li>模型：点「测试文案连接」后从列表选用；也可手填 <code>deepseek-v4-flash</code>（快）或 <code>deepseek-v4-pro</code>（更强）</li>
      </ul>

      <h4>其他 OpenAI 兼容服务商</h4>
      <p>凡提供 OpenAI 兼容接口的服务商，均可在「AI 文案服务」中填入对应<strong>服务地址</strong>与 API Key，再通过「测试文案连接」拉取并选择模型。常见地址如下（只填到 <code>/v1</code> 或文档给出的 base URL，勿拼接完整 chat 路径）：</p>
      <ul>
        <li><strong>DeepSeek</strong>：<code>https://api.deepseek.com/v1</code></li>
        <li><strong>Agnes 国内站</strong>：<code>https://api.agnes-ai.cn/v1</code></li>
        <li><strong>Agnes 国际站</strong>：<code>https://apihub.agnes-ai.com/v1</code>（备用 <code>https://apihub.agnes-ai.cn/v1</code>）</li>
        <li><strong>月之暗面 Moonshot</strong>：<code>https://api.moonshot.cn/v1</code></li>
        <li><strong>硅基流动 SiliconFlow</strong>：<code>https://api.siliconflow.cn/v1</code></li>
        <li><strong>OpenAI</strong>：<code>https://api.openai.com/v1</code></li>
        <li><strong>本地 Ollama</strong>：<code>http://localhost:11434/v1</code>（API Key 可留空）</li>
      </ul>
      <p>模型名称以各平台控制台或「测试文案连接」返回的列表为准。</p>

      <h4>接入 Agnes 生图（图像 API 示例）</h4>
      <p>与文案服务共用
        <a href="https://www.agnes-ai.cn/" target="_blank" rel="noopener">www.agnes-ai.cn</a>
        申请的同一 API Key 即可。在设置 →「图像 API」中填写：</p>
      <ul>
        <li>服务地址（国内站，推荐）：<code>https://api.agnes-ai.cn/v1</code>（不要多写 <code>/images/generations</code>，应用会自动拼接）</li>
        <li>服务地址（国际站备用）：<code>https://apihub.agnes-ai.com/v1</code></li>
        <li>模型：<code>agnes-image-2.1-flash</code>（也可用 <code>agnes-image-2.0-flash</code>；勿填 <code>dall-e-3</code>）</li>
        <li>API Key：粘贴与文案服务相同的 Agnes 密钥</li>
      </ul>
      <p>填完后先点「测试图像连接」验通；再回到配图步骤填写生图描述并点击「AI 生图」。若提示未配置图像 API，请回到设置检查三项是否都已填写。Agnes 通常返回图片链接，应用会自动下载到本地草稿。</p>

      <h4>图库 API（Pexels / Unsplash）</h4>
      <p>配图步骤的「图库搜图」会按页面上的搜索词，从免版权图库拉取候选图。只需配置 <strong>Pexels</strong> 与 <strong>Unsplash</strong> 中的<strong>至少一家</strong>即可；两家都填时优先用 Pexels，失败或无结果再试 Unsplash。</p>

      <p><strong>案例 A：接入 Pexels（推荐先配）</strong></p>
      <ol>
        <li>打开 <a href="https://www.pexels.com/api/" target="_blank" rel="noopener">www.pexels.com/api</a>，注册/登录账号</li>
        <li>在 API 页申请密钥（通常点 Get Started / Your API Key，可即时获得）</li>
        <li>复制 API Key，粘贴到本应用设置 →「图库 API」→ <strong>Pexels API Key</strong></li>
        <li>点「测试图库连接」，状态中出现 <code>Pexels：…</code> 成功字样即可</li>
      </ol>

      <p><strong>案例 B：接入 Unsplash</strong></p>
      <ol>
        <li>打开 <a href="https://unsplash.com/developers" target="_blank" rel="noopener">unsplash.com/developers</a>，注册开发者账号</li>
        <li>新建 Application（按页面指引填写应用名与用途，并接受 API 使用规范）</li>
        <li>在应用详情里复制 <strong>Access Key</strong>（不要用 Secret Key），粘贴到设置 →「图库 API」→ <strong>Unsplash Access Key</strong></li>
        <li>点「测试图库连接」，确认 Unsplash 一项显示成功</li>
      </ol>

      <p><strong>在创作里怎么用</strong>：进入某次创作的「配图」→ 规划页面结构 → 在对应页填写「图库搜索词」（如「咖啡馆 窗边 自然光」）→ 点「图库搜图」→ 从候选中选一张绑定。导出时应用会在素材目录记录来源信息，便于遵守各平台许可条款。</p>
      <p>注意：请遵守 Pexels / Unsplash 的免费额度与署名要求；密钥仅保存在本机设置中。</p>

      <p><strong>外观</strong>：设置顶部提供五套界面主题（云端 / 胭脂纸 / 墨夜 / 抹茶 / 奶油杏），点击即时生效并在重启后保持。夜间创作推荐「墨夜」。</p>
    `,
  },
  {
    id: "tips",
    title: "使用技巧",
    body: `
      <h4>行内 AI 助手（Ctrl+K）</h4>
      <p>在任意文本框中，可随时召唤 AI 做<strong>局部改写</strong>或<strong>光标处生成</strong>，无需离开当前编辑位置：</p>
      <ul>
        <li><strong>改写</strong>：选中一段文字，点击浮出的「✦ AI 改写」气泡或按 <kbd>Ctrl</kbd> + <kbd>K</kbd>，输入指令（如「更口语一点」「压缩到 15 字」）</li>
        <li><strong>插入</strong>：不选中任何文字直接按 <kbd>Ctrl</kbd> + <kbd>K</kbd>，输入想写的内容方向（如「补一句开头」「加一个转折」），AI 会结合上下文在光标处生成</li>
        <li>在界面空白处按 <kbd>Ctrl</kbd> + <kbd>K</kbd> 也有效：会自动回到你最近编辑的输入框光标位置</li>
      </ul>
      <p>生成结果先<strong>预览</strong>，可选择「采用 / 重试 / 放弃」；采用后随时可用 <kbd>Ctrl</kbd> + <kbd>Z</kbd> 撤销。改写与生成都会遵循当前人设的口吻。</p>

      <h4>快捷键</h4>
      <ul>
        <li><kbd>Ctrl</kbd> + <kbd>N</kbd> — 新建创作</li>
        <li><kbd>Ctrl</kbd> + <kbd>E</kbd> — 导出到文件夹</li>
        <li><kbd>Ctrl</kbd> + <kbd>F</kbd> — 搜索创作</li>
        <li><kbd>Ctrl</kbd> + <kbd>,</kbd> — 打开设置</li>
        <li><kbd>Ctrl</kbd> + <kbd>K</kbd> — 选中文字 AI 改写；未选中时在光标处 AI 生成插入</li>
        <li><kbd>F1</kbd> — 打开本使用手册</li>
        <li><kbd>Ctrl</kbd> + <kbd>S</kbd> — 创作进度自动保存，无需手动操作</li>
        <li>菜单「编辑」— 撤销、复制、粘贴等标准快捷键</li>
      </ul>

      <h4>桌面体验细节</h4>
      <ul>
        <li><strong>自动保存</strong>：所有编辑实时保存；直接关闭窗口也会先保存最后的改动</li>
        <li><strong>窗口记忆</strong>：应用会记住上次的窗口位置、大小与最大化状态</li>
        <li><strong>长任务提醒</strong>：AI 生成期间任务栏图标显示进度；窗口最小化或切走时，任务完成会弹系统通知，点击即可回到应用</li>
        <li><strong>可取消</strong>：生成过程中状态栏旁有「取消」按钮，随时中止等待</li>
        <li><strong>删除可撤销</strong>：删除创作 / 人设、清空对话后，底部提示条 5 秒内可点「撤销」无损恢复</li>
      </ul>
    `,
  },
  {
    id: "faq",
    title: "常见问题",
    body: `
      <dl class="manual-faq">
        <dt>生成失败或一直加载？</dt>
        <dd>请检查设置中的 AI 服务地址、模型名称与 API Key，并点击「测试文案连接」。等待过久可点状态栏旁的「取消」。</dd>
        <dt>误删了创作或人设？</dt>
        <dd>删除后 5 秒内点击底部提示条上的「撤销」即可完整恢复；超时后无法找回。</dd>
        <dt>配图搜索无结果？</dt>
        <dd>确认已填写 Pexels 或 Unsplash 密钥，并完成「测试图库连接」。申请步骤见手册「设置与 AI 服务 → 图库 API」。也请换更具体的中英文搜索词再试。</dd>
        <dt>AI 生图提示未配置或失败？</dt>
        <dd>打开设置 →「图像 API」，确认服务地址、模型与 API Key 都已填写，并点击「测试图像连接」。Agnes 生图示例见手册「设置与 AI 服务 → 接入 Agnes 生图」；未配置时提示旁可点「打开设置」直达。</dd>
        <dt>如何切换平台（小红书 / 公众号）？</dt>
        <dd>在运营人设中选择「发布平台」，或在新建人设时指定；不同平台会启用对应的文案与导出格式。</dd>
        <dt>数据存在哪里？</dt>
        <dd>创作与人设保存在本机用户目录，卸载前可通过导出文件夹备份成品。</dd>
        <dt>换个账号登录，还会用到别人填过的 API Key 吗？</dt>
        <dd>AI 服务的地址 / 密钥 / 模型是按<strong>本机安装</strong>保存的一份配置，不区分登录账号——同一台电脑上无论谁登录，看到的都是同一份设置。只有换到另一台电脑或另一个 Windows 用户目录，才会是全新的默认设置（DeepSeek 地址与模型已预填，API Key 需自行申请填写）。共用电脑时请注意这一点。</dd>
        <dt>不想付费买 API Key 怎么办？</dt>
        <dd>可试用 <strong>Agnes</strong>：到
          <a href="https://www.agnes-ai.cn/" target="_blank" rel="noopener">www.agnes-ai.cn</a>
          申请<strong>永久免费</strong>的 OpenAI 兼容 API Key，服务地址填 <code>https://api.agnes-ai.cn/v1</code>，再点「测试文案连接」选用模型。详细四步截图见手册「设置与 AI 服务」。默认预填仍是 DeepSeek（需自备密钥）。</dd>
      </dl>
    `,
  },
];

/**
 * Mount user manual overlay.
 * @param {HTMLElement} root
 * @returns {{ open: () => void; close: () => void }}
 */
export function mountUserManual(root) {
  const overlay = document.createElement("div");
  overlay.className = "manual-overlay settings-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="settings-drawer manual-drawer" role="dialog" aria-label="使用手册">
      <div class="settings-drawer-header">
        <h2 class="settings-drawer-title">使用手册</h2>
        <button type="button" class="btn-ghost manual-close-btn" aria-label="关闭">✕</button>
      </div>
      <div class="manual-drawer-body">
        <nav class="manual-nav" aria-label="手册目录">
          ${MANUAL_SECTIONS.map(
            (section, index) =>
              `<button type="button" class="manual-nav-btn${index === 0 ? " is-active" : ""}"
                data-section-id="${section.id}">${section.title}</button>`
          ).join("")}
        </nav>
        <article class="manual-content" id="manual-content"></article>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const drawer = overlay.querySelector(".manual-drawer");
  const closeBtn = overlay.querySelector(".manual-close-btn");
  const contentEl = overlay.querySelector("#manual-content");
  const navBtns = overlay.querySelectorAll(".manual-nav-btn");

  function showSection(sectionId) {
    const section = MANUAL_SECTIONS.find((item) => item.id === sectionId) || MANUAL_SECTIONS[0];
    contentEl.innerHTML = `
      <h3 class="manual-section-title">${section.title}</h3>
      <div class="manual-section-body">${section.body.trim()}</div>
    `;
    navBtns.forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-section-id") === section.id);
    });
    contentEl.scrollTop = 0;
  }

  navBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      showSection(btn.getAttribute("data-section-id"));
    });
  });

  const a11y = bindOverlayA11y(overlay, { close, initialFocus: () => closeBtn });

  function open(sectionId) {
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add("is-open"));
    a11y.onOpen();
    showSection(sectionId || "intro");
  }

  function close() {
    overlay.classList.remove("is-open");
    a11y.onClose();
    overlay.hidden = true;
  }

  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      close();
    }
  });
  drawer.addEventListener("click", (event) => event.stopPropagation());

  showSection("intro");

  return { open, close };
}
