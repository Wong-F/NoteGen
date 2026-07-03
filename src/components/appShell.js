import { appState, ensureSessionId } from "./appState.js";

/**
 * Mount UI components into the given root element.
 * @param {HTMLElement} root
 */
export function mountApp(root) {
  root.innerHTML = `
    <header class="app-header">
      <div class="header-row">
        <div>
          <h1>noteGen</h1>
          <p class="subtitle">AI 辅助小红书笔记创作</p>
        </div>
        <button id="settings-toggle" type="button" class="secondary">设置</button>
      </div>
      <nav class="step-nav" aria-label="创作步骤">
        <span id="step-nav-1" class="step active">1 选题</span>
        <span id="step-nav-2" class="step disabled">2 文案</span>
        <span id="step-nav-3" class="step disabled">3 配图</span>
      </nav>
    </header>
    <main class="app-main">
      <section id="settings-card" class="card" hidden>
        <h2 class="card-title">AI 服务设置</h2>
        <label for="ai-base-url">服务地址（OpenAI 兼容端点）</label>
        <input id="ai-base-url" type="text" placeholder="http://localhost:11434/v1" />
        <label for="ai-model">模型</label>
        <input id="ai-model" type="text" list="ai-model-options"
          placeholder="点击「测试连接」后可从列表选择" />
        <datalist id="ai-model-options"></datalist>
        <label for="ai-api-key">文案 API Key（本地 Ollama 可留空）</label>
        <input id="ai-api-key" type="password" placeholder="sk-..." />
        <h3 class="settings-subtitle">图像 API（AI 生图用，留空则沿用文案 API 地址与 Key）</h3>
        <label for="image-base-url">图像服务地址</label>
        <input id="image-base-url" type="text" placeholder="https://api.openai.com/v1" />
        <label for="image-model">图像模型</label>
        <input id="image-model" type="text" placeholder="dall-e-3" />
        <label for="image-api-key">图像 API Key</label>
        <input id="image-api-key" type="password" placeholder="sk-..." />
        <h3 class="settings-subtitle">图库 API（Pexels / Unsplash 搜图，免费申请）</h3>
        <label for="pexels-api-key">Pexels API Key</label>
        <input id="pexels-api-key" type="password" placeholder="在 pexels.com/api 申请" />
        <label for="unsplash-access-key">Unsplash Access Key</label>
        <input id="unsplash-access-key" type="password" placeholder="在 unsplash.com/developers 申请" />
        <div class="button-row">
          <button id="ai-test-btn" type="button" class="secondary">测试文案连接</button>
          <button id="stock-test-btn" type="button" class="secondary">测试图库连接</button>
          <button id="settings-save-btn" type="button">保存设置</button>
        </div>
        <p id="settings-status" class="status" aria-live="polite"></p>
      </section>

      <div class="wizard-columns">
      <section id="topic-step" class="card step-column">
        <h2 class="card-title">Step 1 · 选题</h2>
        <label for="keywords-input">领域 / 关键词</label>
        <input id="keywords-input" type="text" placeholder="例如：周末咖啡店探店、职场效率、新手化妆" />
        <label for="target-reader-input">目标读者（可选）</label>
        <input id="target-reader-input" type="text" placeholder="例如：25-35 岁上班族、护肤新手" />
        <label for="hook-level-select">标题钩子力度</label>
        <select id="hook-level-select">
          <option value="1">Level 1 · 克制可信</option>
          <option value="2">Level 2 · 抓人有对比</option>
          <option value="3">Level 3 · 高张力（需证据）</option>
        </select>
        <button id="topics-suggest-btn" type="button">生成选题候选</button>
        <p id="topic-status" class="status" aria-live="polite"></p>
        <div id="topic-list" class="topic-list" hidden></div>
        <article id="selected-topic" class="selected-topic" hidden>
          <h3>已选选题</h3>
          <p id="selected-topic-title" class="selected-topic-title"></p>
          <p id="selected-topic-angle" class="selected-topic-meta"></p>
        </article>
      </section>

      <section id="copy-step" class="card step-column locked">
        <h2 class="card-title">Step 2 · 文案</h2>
        <p id="copy-topic-ref" class="copy-ref"></p>
        <label for="style-select">写作风格</label>
        <select id="style-select"></select>
        <div class="button-row">
          <button id="copy-generate-btn" type="button">生成笔记文案</button>
          <button id="copy-humanize-btn" type="button" class="secondary" disabled>去 AI 味</button>
        </div>
        <p id="copy-status" class="status" aria-live="polite"></p>
        <div id="copy-editor" class="copy-editor" hidden>
          <label for="copy-title-input">标题（≤20 字）</label>
          <input id="copy-title-input" type="text" maxlength="20" />
          <label for="copy-body-input">正文</label>
          <textarea id="copy-body-input" rows="8" placeholder="生成后可在此编辑"></textarea>
          <label for="copy-hashtags-input">话题标签（空格分隔）</label>
          <input id="copy-hashtags-input" type="text" placeholder="#探店 #咖啡 #周末好去处" />
        </div>
      </section>

      <section id="card-step" class="card step-column locked">
        <h2 class="card-title">Step 3 · 配图</h2>
        <p id="card-copy-ref" class="copy-ref"></p>
        <button id="card-plan-btn" type="button">规划页面结构</button>
        <p id="card-status" class="status" aria-live="polite"></p>
        <div id="page-plan-list" class="page-plan-list" hidden></div>
        <div class="button-row">
          <button id="card-render-btn" type="button" disabled>生成卡片图片</button>
        </div>
        <div id="card-preview" class="card-preview" hidden></div>
      </section>
      </div>
    </main>
  `;

  bindSettingsEvents(root);
  bindTopicEvents(root);
  bindCopyEvents(root);
  bindCardEvents(root);
}

/**
 * @param {HTMLElement} root
 * @param {number} fromStep 2 = lock copy+card, 3 = lock card only
 */
function lockWizardFrom(root, fromStep) {
  if (fromStep <= 2) {
    root.querySelector("#copy-step").classList.add("locked");
  }
  if (fromStep <= 3) {
    root.querySelector("#card-step").classList.add("locked");
  }
}

/** @param {HTMLElement} root */
function unlockCopyStep(root) {
  root.querySelector("#copy-step").classList.remove("locked");
}

/** @param {HTMLElement} root */
function unlockCardStep(root) {
  root.querySelector("#card-step").classList.remove("locked");
}

/** @param {HTMLElement} root */
function bindTopicEvents(root) {
  const keywordsInput = root.querySelector("#keywords-input");
  const targetReaderInput = root.querySelector("#target-reader-input");
  const hookLevelSelect = root.querySelector("#hook-level-select");
  const suggestBtn = root.querySelector("#topics-suggest-btn");
  const statusEl = root.querySelector("#topic-status");
  const topicList = root.querySelector("#topic-list");
  const selectedPanel = root.querySelector("#selected-topic");
  const selectedTitle = root.querySelector("#selected-topic-title");
  const selectedAngle = root.querySelector("#selected-topic-angle");
  const copyTopicRef = root.querySelector("#copy-topic-ref");
  const stepNav2 = root.querySelector("#step-nav-2");

  function onTopicSelected(topic) {
    appState.selectedTopic = topic;
    appState.copyDraft = null;
    selectedTitle.textContent = topic.title;
    selectedAngle.textContent = `切入角度：${topic.angle}`;
    selectedPanel.hidden = false;
    statusEl.textContent = "已选择选题，可在中间栏生成文案";
    unlockCopyStep(root);
    lockWizardFrom(root, 3);
    copyTopicRef.textContent = `基于选题：${topic.title}`;
    stepNav2.classList.remove("disabled");
    stepNav2.classList.add("active");
    root.querySelector("#copy-editor").hidden = true;
    root.querySelector("#copy-humanize-btn").disabled = true;
    root.querySelector("#copy-status").textContent = "";
  }

  function renderTopicList(result) {
    topicList.innerHTML = result.topics
      .map(
        (topic) => `
        <button type="button" class="topic-card" data-topic-id="${topic.id}">
          <span class="topic-rank">#${topic.rank}</span>
          <span class="topic-card-title">${escapeHtml(topic.title)}</span>
          <span class="topic-card-angle">${escapeHtml(topic.angle)}</span>
          <span class="topic-card-meta">读者：${escapeHtml(topic.targetReader)} · ${escapeHtml(topic.strategy)}</span>
        </button>
      `
      )
      .join("");
    topicList.hidden = false;

    topicList.querySelectorAll(".topic-card").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.getAttribute("data-topic-id");
        const topic = result.topics.find((item) => item.id === id);
        if (!topic) {
          return;
        }
        topicList.querySelectorAll(".topic-card").forEach((el) => {
          el.classList.toggle("selected", el.getAttribute("data-topic-id") === id);
        });
        onTopicSelected(topic);
      });
    });
  }

  suggestBtn.addEventListener("click", async () => {
    const keywords = keywordsInput.value.trim();
    if (!keywords) {
      statusEl.textContent = "请先输入领域或关键词";
      return;
    }

    statusEl.textContent = "正在生成选题候选…";
    topicList.hidden = true;
    selectedPanel.hidden = true;
    lockWizardFrom(root, 2);
    appState.selectedTopic = null;
    suggestBtn.disabled = true;

    try {
      const result = await window.noteGen.invoke("topics:suggest", {
        keywords,
        targetReader: targetReaderInput.value.trim(),
        hookLevel: Number(hookLevelSelect.value),
        count: 5,
      });

      renderTopicList(result);
      const summary = result.domainSummary ? ` · ${result.domainSummary}` : "";
      statusEl.textContent = `已生成 ${result.topics.length} 个选题候选${summary}`;
    } catch (error) {
      statusEl.textContent = `选题生成失败：${error.message}`;
    } finally {
      suggestBtn.disabled = false;
    }
  });
}

/** @param {HTMLElement} root */
function bindCopyEvents(root) {
  const styleSelect = root.querySelector("#style-select");
  const generateBtn = root.querySelector("#copy-generate-btn");
  const humanizeBtn = root.querySelector("#copy-humanize-btn");
  const statusEl = root.querySelector("#copy-status");
  const editor = root.querySelector("#copy-editor");
  const titleInput = root.querySelector("#copy-title-input");
  const bodyInput = root.querySelector("#copy-body-input");
  const hashtagsInput = root.querySelector("#copy-hashtags-input");

  async function loadStyles() {
    try {
      const styles = await window.noteGen.invoke("copy:listStyles");
      styleSelect.innerHTML = styles
        .map(
          (style) =>
            `<option value="${escapeHtml(style.id)}">${escapeHtml(style.name)} — ${escapeHtml(style.description)}</option>`
        )
        .join("");
    } catch (error) {
      statusEl.textContent = `加载写作风格失败：${error.message}`;
    }
  }

  function showCopy(copy) {
    appState.copyDraft = copy;
    titleInput.value = copy.title;
    bodyInput.value = copy.body;
    hashtagsInput.value = (copy.hashtags || []).join(" ");
    editor.hidden = false;
    humanizeBtn.disabled = false;

    const stepNav3 = root.querySelector("#step-nav-3");
    unlockCardStep(root);
    stepNav3.classList.remove("disabled");
    stepNav3.classList.add("active");
    root.querySelector("#card-copy-ref").textContent = `基于文案：${copy.title}`;
    appState.pagePlan = null;
    appState.pageAssets = {};
    appState.renderedImages = [];
    root.querySelector("#page-plan-list").hidden = true;
    root.querySelector("#card-preview").hidden = true;
    root.querySelector("#card-render-btn").disabled = true;
  }

  loadStyles();

  generateBtn.addEventListener("click", async () => {
    const topic = appState.selectedTopic;
    if (!topic) {
      statusEl.textContent = "请先在 Step 1 选择一个选题";
      return;
    }

    statusEl.textContent = "正在生成文案…";
    generateBtn.disabled = true;

    try {
      const result = await window.noteGen.invoke("copy:generate", {
        title: topic.title,
        angle: topic.angle,
        targetReader: topic.targetReader,
        styleId: styleSelect.value,
      });
      showCopy(result);
      statusEl.textContent = "文案已生成，可直接编辑";
    } catch (error) {
      statusEl.textContent = `文案生成失败：${error.message}`;
    } finally {
      generateBtn.disabled = false;
    }
  });

  humanizeBtn.addEventListener("click", async () => {
    const body = bodyInput.value.trim();
    if (!body) {
      statusEl.textContent = "请先生成或输入正文";
      return;
    }

    statusEl.textContent = "正在去 AI 味…";
    humanizeBtn.disabled = true;

    try {
      const result = await window.noteGen.invoke("copy:humanize", { body });
      bodyInput.value = result.body;
      if (appState.copyDraft) {
        appState.copyDraft.body = result.body;
      }
      statusEl.textContent = "正文已重写，更像真人博主";
    } catch (error) {
      statusEl.textContent = `去 AI 味失败：${error.message}`;
    } finally {
      humanizeBtn.disabled = false;
    }
  });
}

/** @param {HTMLElement} root */
function bindCardEvents(root) {
  const planBtn = root.querySelector("#card-plan-btn");
  const renderBtn = root.querySelector("#card-render-btn");
  const statusEl = root.querySelector("#card-status");
  const planList = root.querySelector("#page-plan-list");
  const preview = root.querySelector("#card-preview");

  function getCopyFromEditor() {
    const title = root.querySelector("#copy-title-input").value.trim();
    const body = root.querySelector("#copy-body-input").value.trim();
    const hashtags = root.querySelector("#copy-hashtags-input").value.trim().split(/\s+/).filter(Boolean);
    return { title, body, hashtags };
  }

  function syncPagePlanInputs() {
    if (!appState.pagePlan) {
      return;
    }
    for (const page of appState.pagePlan.pages) {
      const aiInput = planList.querySelector(`.page-ai-prompt-input[data-page-id="${page.id}"]`);
      const stockInput = planList.querySelector(`.page-stock-keyword-input[data-page-id="${page.id}"]`);
      if (aiInput) {
        page.imagePrompt = aiInput.value.trim();
      }
      if (stockInput) {
        page.searchKeyword = stockInput.value.trim();
      }
    }
  }

  function renderPagePlan(plan) {
    syncPagePlanInputs();
    appState.pagePlan = plan;
    planList.innerHTML = plan.pages
      .map((page) => {
        const asset = appState.pageAssets[page.id];
        const assetLabel = asset ? `已绑定：${asset.source}` : "未绑定（纯文字）";
        return `
          <article class="page-plan-item">
            <h4>${escapeHtml(page.headline)}</h4>
            <p class="page-plan-meta">${escapeHtml(page.role)} · ${assetLabel}</p>
            ${page.body ? `<p class="page-plan-body">${escapeHtml(page.body)}</p>` : ""}
            <div class="page-plan-fields">
              <label>AI 生图描述</label>
              <input type="text" class="page-ai-prompt-input" data-page-id="${escapeHtml(page.id)}"
                value="${escapeAttr(page.imagePrompt || "")}" placeholder="选 AI 生图时填写" />
              <label>图库搜索词</label>
              <input type="text" class="page-stock-keyword-input" data-page-id="${escapeHtml(page.id)}"
                value="${escapeAttr(page.searchKeyword || "")}" placeholder="选图库搜图时填写" />
            </div>
            <p class="page-plan-hint">请选择一种配图方式；不选则该页为纯文字</p>
            <div class="button-row image-source-row">
              <button type="button" class="secondary page-pick-btn" data-page-id="${escapeHtml(page.id)}">用户供图</button>
              <button type="button" class="secondary page-ai-btn" data-page-id="${escapeHtml(page.id)}">AI 生图</button>
              <button type="button" class="secondary page-stock-btn" data-page-id="${escapeHtml(page.id)}">图库搜图</button>
              <button type="button" class="secondary page-clear-btn" data-page-id="${escapeHtml(page.id)}"
                ${asset ? "" : "disabled"}>清除本页配图</button>
            </div>
          </article>
        `;
      })
      .join("");
    planList.hidden = false;
    renderBtn.disabled = false;

    planList.querySelectorAll(".page-pick-btn").forEach((btn) => {
      btn.addEventListener("click", () => handleUserImage(btn.getAttribute("data-page-id")));
    });
    planList.querySelectorAll(".page-ai-btn").forEach((btn) => {
      btn.addEventListener("click", () => handleAiImage(btn.getAttribute("data-page-id")));
    });
    planList.querySelectorAll(".page-stock-btn").forEach((btn) => {
      btn.addEventListener("click", () => handleStockImage(btn.getAttribute("data-page-id")));
    });
    planList.querySelectorAll(".page-clear-btn").forEach((btn) => {
      btn.addEventListener("click", () => handleClearImage(btn.getAttribute("data-page-id")));
    });
  }

  function handleClearImage(pageId) {
    if (!appState.pageAssets[pageId]) {
      return;
    }
    delete appState.pageAssets[pageId];
    statusEl.textContent = `已清除 ${pageId} 的配图`;
    if (appState.pagePlan) {
      renderPagePlan(appState.pagePlan);
    }
  }

  async function handleUserImage(pageId) {
    const pick = await window.noteGen.invoke("images:pick");
    if (pick.canceled) {
      return;
    }
    statusEl.textContent = "正在导入图片…";
    try {
      const sessionId = ensureSessionId();
      const imported = await window.noteGen.invoke("images:import", {
        sourcePath: pick.filePath,
        sessionId,
        label: pageId,
      });
      appState.sessionId = imported.sessionId;
      appState.pageAssets[pageId] = {
        absolutePath: imported.absolutePath,
        relativePath: imported.relativePath,
        source: "user",
      };
      statusEl.textContent = `已导入图片：${imported.filename}`;
      if (appState.pagePlan) {
        renderPagePlan(appState.pagePlan);
      }
    } catch (error) {
      statusEl.textContent = `导入失败：${error.message}`;
    }
  }

  async function handleAiImage(pageId) {
    syncPagePlanInputs();
    const promptInput = planList.querySelector(`.page-ai-prompt-input[data-page-id="${pageId}"]`);
    const prompt = promptInput?.value.trim();
    if (!prompt) {
      statusEl.textContent = "请先填写 AI 生图描述";
      return;
    }
    statusEl.textContent = "正在 AI 生图…";
    try {
      const sessionId = ensureSessionId();
      const generated = await window.noteGen.invoke("images:generate", {
        prompt,
        sessionId,
        label: pageId,
      });
      appState.sessionId = generated.sessionId;
      appState.pageAssets[pageId] = {
        absolutePath: generated.absolutePath,
        relativePath: generated.relativePath,
        source: "ai",
      };
      statusEl.textContent = `AI 生图完成：${generated.filename}`;
      renderPagePlan(appState.pagePlan);
    } catch (error) {
      statusEl.textContent = `AI 生图失败：${error.message}`;
    }
  }

  async function handleStockImage(pageId) {
    syncPagePlanInputs();
    const keywordInput = planList.querySelector(`.page-stock-keyword-input[data-page-id="${pageId}"]`);
    const keyword = keywordInput?.value.trim();
    if (!keyword) {
      statusEl.textContent = "请先填写图库搜索词";
      return;
    }
    statusEl.textContent = `正在图库搜图：${keyword}…`;
    try {
      const sessionId = ensureSessionId();
      const result = await window.noteGen.invoke("images:searchStock", {
        keyword,
        sessionId,
        label: pageId,
      });
      appState.sessionId = result.sessionId;
      appState.pageAssets[pageId] = {
        absolutePath: result.absolutePath,
        relativePath: result.relativePath,
        source: `stock:${result.provider}`,
      };
      statusEl.textContent = `图库搜图完成（${result.provider}）：${result.filename}`;
      renderPagePlan(appState.pagePlan);
    } catch (error) {
      statusEl.textContent = `图库搜图失败：${error.message}`;
    }
  }

  planBtn.addEventListener("click", async () => {
    const copy = getCopyFromEditor();
    if (!copy.title || !copy.body) {
      statusEl.textContent = "请先在 Step 2 生成或填写文案";
      return;
    }
    appState.copyDraft = copy;
    statusEl.textContent = "正在规划页面…";
    planBtn.disabled = true;
    try {
      const plan = await window.noteGen.invoke("cards:plan", copy);
      renderPagePlan(plan);
      statusEl.textContent = `已规划 ${plan.pages.length} 页，请为需要素材的页面供图或生图`;
    } catch (error) {
      statusEl.textContent = `规划失败：${error.message}`;
    } finally {
      planBtn.disabled = false;
    }
  });

  renderBtn.addEventListener("click", async () => {
    if (!appState.pagePlan) {
      statusEl.textContent = "请先规划页面结构";
      return;
    }
    statusEl.textContent = "正在渲染卡片…";
    renderBtn.disabled = true;
    try {
      const sessionId = ensureSessionId();
      const pageAssets = {};
      for (const [pageId, asset] of Object.entries(appState.pageAssets)) {
        pageAssets[pageId] = asset.absolutePath;
      }
      const result = await window.noteGen.invoke("cards:render", {
        sessionId,
        plan: appState.pagePlan,
        pageAssets,
      });
      appState.sessionId = result.sessionId;
      appState.renderedImages = result.images;
      await showCardPreview(result.images, preview);
      statusEl.textContent = `已生成 ${result.images.length} 张卡片，保存在草稿目录`;
    } catch (error) {
      statusEl.textContent = `渲染失败：${error.message}`;
    } finally {
      renderBtn.disabled = false;
    }
  });
}

/**
 * @param {Array<{ id: string; absolutePath: string }>} images
 * @param {HTMLElement} preview
 */
async function showCardPreview(images, preview) {
  const items = await Promise.all(
    images.map(async (img) => {
      try {
        const dataUrl = await window.noteGen.invoke("images:previewDataUrl", {
          absolutePath: img.absolutePath,
        });
        return { id: img.id, dataUrl };
      } catch {
        return { id: img.id, dataUrl: "" };
      }
    })
  );

  preview.innerHTML = items
    .map(
      (item) => `
        <figure class="card-preview-item">
          ${
            item.dataUrl
              ? `<img src="${item.dataUrl}" alt="${escapeHtml(item.id)}" />`
              : `<p class="card-preview-missing">预览加载失败</p>`
          }
          <figcaption>${escapeHtml(item.id)}</figcaption>
        </figure>
      `
    )
    .join("");
  preview.hidden = false;
}

/** @param {string} text */
function escapeAttr(text) {
  return escapeHtml(text);
}

/** @param {string} text */
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** @param {HTMLElement} root */
function bindSettingsEvents(root) {
  const toggleBtn = root.querySelector("#settings-toggle");
  const card = root.querySelector("#settings-card");
  const baseUrlInput = root.querySelector("#ai-base-url");
  const modelInput = root.querySelector("#ai-model");
  const modelOptions = root.querySelector("#ai-model-options");
  const apiKeyInput = root.querySelector("#ai-api-key");
  const testBtn = root.querySelector("#ai-test-btn");
  const stockTestBtn = root.querySelector("#stock-test-btn");
  const saveBtn = root.querySelector("#settings-save-btn");
  const statusEl = root.querySelector("#settings-status");

  async function loadSettings() {
    try {
      const settings = await window.noteGen.invoke("settings:get");
      baseUrlInput.value = settings.ai.baseUrl;
      modelInput.value = settings.ai.model;
      apiKeyInput.value = settings.ai.apiKey;
      root.querySelector("#image-base-url").value = settings.image?.baseUrl || "";
      root.querySelector("#image-model").value = settings.image?.model || "";
      root.querySelector("#image-api-key").value = settings.image?.apiKey || "";
      root.querySelector("#pexels-api-key").value = settings.stock?.pexelsApiKey || "";
      root.querySelector("#unsplash-access-key").value = settings.stock?.unsplashAccessKey || "";
    } catch (error) {
      statusEl.textContent = `读取设置失败：${error.message}`;
    }
  }

  function collectSettings() {
    return {
      ai: {
        baseUrl: baseUrlInput.value.trim(),
        model: modelInput.value.trim(),
        apiKey: apiKeyInput.value.trim(),
      },
      image: {
        baseUrl: root.querySelector("#image-base-url").value.trim(),
        model: root.querySelector("#image-model").value.trim(),
        apiKey: root.querySelector("#image-api-key").value.trim(),
      },
      stock: {
        pexelsApiKey: root.querySelector("#pexels-api-key").value.trim(),
        unsplashAccessKey: root.querySelector("#unsplash-access-key").value.trim(),
      },
    };
  }

  toggleBtn.addEventListener("click", () => {
    card.hidden = !card.hidden;
    if (!card.hidden) {
      loadSettings();
    }
  });

  testBtn.addEventListener("click", async () => {
    statusEl.textContent = "文案服务连接测试中…";
    try {
      await window.noteGen.invoke("settings:save", collectSettings());
      const result = await window.noteGen.invoke("ai:testConnection");
      if (result.ok) {
        modelOptions.innerHTML = result.models
          .map((id) => `<option value="${id}"></option>`)
          .join("");
        statusEl.textContent = result.models.length
          ? `文案连接成功，发现 ${result.models.length} 个模型`
          : "文案连接成功，但服务上没有可用模型";
      } else {
        statusEl.textContent = `文案连接失败（${result.code}）：${result.message}`;
      }
    } catch (error) {
      statusEl.textContent = `文案连接失败：${error.message}`;
    }
  });

  stockTestBtn.addEventListener("click", async () => {
    statusEl.textContent = "图库连接测试中…";
    try {
      await window.noteGen.invoke("settings:save", collectSettings());
      const result = await window.noteGen.invoke("stock:testConnection");
      if (result.code === "CONFIG") {
        statusEl.textContent = result.message;
        return;
      }

      const label = { pexels: "Pexels", unsplash: "Unsplash" };
      const parts = result.providers.map((item) => {
        const name = label[item.id] || item.id;
        if (!item.configured) {
          return `${name}：未配置`;
        }
        return item.ok ? `${name}：${item.message}` : `${name} 失败（${item.code || "ERROR"}）：${item.message}`;
      });

      statusEl.textContent = result.ok
        ? `图库连接成功 — ${parts.join("；")}`
        : `图库连接失败 — ${parts.join("；")}`;
    } catch (error) {
      statusEl.textContent = `图库连接失败：${error.message}`;
    }
  });

  saveBtn.addEventListener("click", async () => {
    try {
      await window.noteGen.invoke("settings:save", collectSettings());
      statusEl.textContent = "设置已保存";
    } catch (error) {
      statusEl.textContent = `保存失败：${error.message}`;
    }
  });
}
