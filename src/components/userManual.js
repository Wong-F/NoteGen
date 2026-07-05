/**
 * In-app user manual — opened from Help menu or settings.
 */

const MANUAL_SECTIONS = [
  {
    id: "intro",
    title: "欢迎使用 noteGen",
    body: `
      <p>noteGen 是一款面向 Windows 的桌面应用，帮助博主利用 AI 快速完成<strong>选题 → 文案 → 配图</strong>全流程，并导出可直接发布的素材包。</p>
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
    `,
  },
  {
    id: "workspace",
    title: "创作项目管理",
    body: `
      <p>左侧边栏的<strong>「创作」</strong>区域用于管理你的笔记项目：</p>
      <ul>
        <li><strong>新建创作</strong>：点击「+ 新建创作」开始空白项目</li>
        <li><strong>用人设新建</strong>：已选择运营人设时，可一键带入口吻与领域设定</li>
        <li><strong>最近</strong>：列出历史项目，单击切换、双击重命名</li>
        <li><strong>搜索</strong>：在搜索框输入关键词快速定位</li>
        <li><strong>删除</strong>：点击项目右侧 × 可删除（不可撤销）</li>
      </ul>
    `,
  },
  {
    id: "persona",
    title: "运营人设（可选）",
    body: `
      <p>若你运营多个账号、需要统一口吻，可在侧边栏顶部配置<strong>运营人设</strong>。人设包含平台、领域、目标读者、口吻与标题钩子力度等。</p>
      <ul>
        <li>单账号用户可跳过，直接在创作区自由创作</li>
        <li>选中人设后，新建创作时可选择「在此人设下新建」</li>
        <li>已有创作可通过「绑定 / 改绑 / 解除人设绑定」调整关联</li>
      </ul>
    `,
  },
  {
    id: "workflow",
    title: "三步创作流程",
    body: `
      <p>每个创作项目按以下顺序推进，左侧<strong>「当前流程」</strong>会显示进度：</p>
      <ol>
        <li><strong>选题</strong>：输入领域或关键词，选择 AI 推荐的写作角度</li>
        <li><strong>文案 / 成文</strong>：生成正文并编辑；公众号模式支持分节续写与「去 AI 味」</li>
        <li><strong>配图</strong>：规划页面结构，生成卡片或配图（可上传、AI 生图或图库）</li>
      </ol>
      <p>完成任一步骤后，对应导航项会显示 ✓ 标记。</p>
    `,
  },
  {
    id: "idea",
    title: "第一步：选题",
    body: `
      <ul>
        <li>填写<strong>领域 / 关键词</strong>，例如「周末咖啡店探店」</li>
        <li>可选填<strong>目标读者</strong>，帮助 AI 调整角度</li>
        <li>选择<strong>标题钩子力度</strong>（克制 / 抓人 / 高张力）</li>
        <li>点击「生成选题」，从列表中选定一个方向后继续</li>
      </ul>
    `,
  },
  {
    id: "writing",
    title: "第二步：文案 / 成文",
    body: `
      <ul>
        <li>选择<strong>写作风格</strong>后点击「生成文案」或「生成长文」</li>
        <li>标题、正文、话题标签（小红书）或摘要与小节（公众号）均可手动修改</li>
        <li><strong>去 AI 味</strong>：对已有正文做口语化润色</li>
        <li>公众号模式下，每个小节可单独「继续生成」</li>
      </ul>
    `,
  },
  {
    id: "images",
    title: "第三步：配图",
    body: `
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
    title: "预览与导出",
    body: `
      <p>右侧面板实时展示笔记效果。文案与配图就绪后：</p>
      <ul>
        <li><strong>复制文案</strong>：一键复制到剪贴板，便于粘贴到平台编辑器</li>
        <li><strong>导出到文件夹</strong>：生成 note.txt / note.md、HTML、图片与元数据，便于本地归档或二次编辑</li>
      </ul>
    `,
  },
  {
    id: "settings",
    title: "设置与 AI 服务",
    body: `
      <p>点击右上角「设置」配置 AI 能力（需自行准备 API Key）：</p>
      <ul>
        <li><strong>AI 文案服务</strong>：默认兼容本地 Ollama（<code>http://localhost:11434/v1</code>），也可接入 OpenAI 兼容接口</li>
        <li><strong>图像 API</strong>：用于 AI 生图（如 DALL·E 等）</li>
        <li><strong>图库 API</strong>：Pexels / Unsplash 密钥，用于免版权配图搜索</li>
      </ul>
      <p>保存前建议点击「测试文案连接」与「测试图库连接」确认可用。设置页也可<strong>重新观看新手教程</strong>。</p>
    `,
  },
  {
    id: "shortcuts",
    title: "快捷键",
    body: `
      <ul>
        <li><kbd>F1</kbd> — 打开本使用手册</li>
        <li><kbd>Ctrl</kbd> + <kbd>S</kbd> — 创作进度自动保存，无需手动操作</li>
        <li>菜单「编辑」— 撤销、复制、粘贴等标准快捷键</li>
      </ul>
    `,
  },
  {
    id: "faq",
    title: "常见问题",
    body: `
      <dl class="manual-faq">
        <dt>生成失败或一直加载？</dt>
        <dd>请检查设置中的 AI 服务地址、模型名称与 API Key，并点击「测试文案连接」。</dd>
        <dt>配图搜索无结果？</dt>
        <dd>确认已填写 Pexels 或 Unsplash 密钥，并完成「测试图库连接」。</dd>
        <dt>如何切换平台（小红书 / 公众号）？</dt>
        <dd>在运营人设中选择「发布平台」，或在新建人设时指定；不同平台会启用对应的文案与导出格式。</dd>
        <dt>数据存在哪里？</dt>
        <dd>创作与人设保存在本机用户目录，卸载前可通过导出文件夹备份成品。</dd>
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

  function open(sectionId) {
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add("is-open"));
    showSection(sectionId || "intro");
  }

  function close() {
    overlay.classList.remove("is-open");
    overlay.hidden = true;
  }

  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      close();
    }
  });
  drawer.addEventListener("click", (event) => event.stopPropagation());

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !overlay.hidden) {
      close();
    }
  });

  showSection("intro");

  return { open, close };
}
