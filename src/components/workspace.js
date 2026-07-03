import {
  appState,
  ensureSessionId,
  subscribe,
  markSectionDone,
  setActiveSection,
  notify,
} from "./appState.js";
import { escapeHtml, escapeAttr } from "./utils.js";

/**
 * Mount center workspace with section-switching content.
 * @param {HTMLElement} root
 */
export function mountWorkspace(root) {
  root.innerHTML = `
    <div class="workspace-inner" id="workspace-inner"></div>
  `;

  const inner = root.querySelector("#workspace-inner");

  let lastSection = appState.activeSection;
  subscribe(() => {
    if (appState.activeSection !== lastSection) {
      lastSection = appState.activeSection;
      renderSection(inner);
    }
  });

  renderSection(inner);
}

/** @param {HTMLElement} inner */
function renderSection(inner) {
  const section = appState.activeSection;
  inner.className = `workspace-inner workspace-section-${section}`;
  inner.classList.add("workspace-fade");

  if (section === "idea") {
    inner.innerHTML = getIdeaHtml();
    bindIdeaEvents(inner);
  } else if (section === "writing") {
    inner.innerHTML = getWritingHtml();
    bindWritingEvents(inner);
  } else {
    inner.innerHTML = getImagesHtml();
    bindImagesEvents(inner);
  }

  requestAnimationFrame(() => inner.classList.remove("workspace-fade"));
}

function getIdeaHtml() {
  const topic = appState.selectedTopic;
  return `
    <div class="workspace-header">
      <h2 class="workspace-title">选题</h2>
      <p class="workspace-desc">输入领域或关键词，AI 帮你找到值得写的角度</p>
    </div>
    <div class="workspace-fields">
      <input id="keywords-input" type="text" class="field-borderless"
        placeholder="领域 / 关键词，例如：周末咖啡店探店、职场效率" />
      <input id="target-reader-input" type="text" class="field-borderless field-secondary"
        placeholder="目标读者（可选），例如：25-35 岁上班族" />
      <div class="field-row">
        <select id="hook-level-select" class="field-select">
          <option value="1">钩子 Level 1 · 克制可信</option>
          <option value="2">钩子 Level 2 · 抓人有对比</option>
          <option value="3">钩子 Level 3 · 高张力</option>
        </select>
        <button id="topics-suggest-btn" type="button" class="btn-primary">生成选题</button>
      </div>
    </div>
    <p id="topic-status" class="workspace-status" aria-live="polite"></p>
    <div id="topic-list" class="topic-list" hidden></div>
    ${
      topic
        ? `<div class="workspace-selected">
            <p class="workspace-selected-label">已选选题</p>
            <p class="workspace-selected-title">${escapeHtml(topic.title)}</p>
            <p class="workspace-selected-meta">${escapeHtml(topic.angle)}</p>
          </div>`
        : ""
    }
  `;
}

function getWritingHtml() {
  const topic = appState.selectedTopic;
  const copy = appState.copyDraft;
  const topicHint = topic
    ? `基于选题：${escapeHtml(topic.title)}`
    : "请先在「选题」中选择一个方向";

  return `
    <div class="workspace-header">
      <h2 class="workspace-title">文案</h2>
      <p class="workspace-desc">${topicHint}</p>
    </div>
    <div class="workspace-editor">
      <div class="editor-toolbar">
        <select id="style-select" class="field-select field-select-inline"></select>
        <div class="editor-actions">
          <button id="copy-generate-btn" type="button" class="btn-primary"
            ${topic ? "" : "disabled"}>生成文案</button>
          <button id="copy-humanize-btn" type="button" class="btn-secondary"
            ${copy ? "" : "disabled"}>去 AI 味</button>
        </div>
      </div>
      <p id="copy-status" class="workspace-status" aria-live="polite"></p>
      <input id="copy-title-input" type="text" class="editor-title"
        maxlength="20" placeholder="笔记标题（≤20 字）"
        value="${copy ? escapeAttr(copy.title) : ""}" />
      <textarea id="copy-body-input" class="editor-body" rows="16"
        placeholder="正文内容…">${copy ? escapeHtml(copy.body) : ""}</textarea>
      <input id="copy-hashtags-input" type="text" class="field-borderless field-secondary"
        placeholder="话题标签，空格分隔，例如：#探店 #咖啡"
        value="${copy ? escapeAttr((copy.hashtags || []).join(" ")) : ""}" />
    </div>
  `;
}

function getImagesHtml() {
  const copy = appState.copyDraft;
  const copyHint = copy
    ? `基于文案：${escapeHtml(copy.title)}`
    : "请先在「文案」中生成内容";

  return `
    <div class="workspace-header">
      <h2 class="workspace-title">配图</h2>
      <p class="workspace-desc">${copyHint}</p>
    </div>
    <div class="workspace-fields">
      <button id="card-plan-btn" type="button" class="btn-primary"
        ${copy ? "" : "disabled"}>规划页面结构</button>
    </div>
    <p id="card-status" class="workspace-status" aria-live="polite"></p>
    <div id="page-plan-list" class="page-plan-list" hidden></div>
    <div class="workspace-fields">
      <button id="card-render-btn" type="button" class="btn-primary" disabled>生成卡片图片</button>
    </div>
  `;
}

/** @param {HTMLElement} root */
function bindIdeaEvents(root) {
  const keywordsInput = root.querySelector("#keywords-input");
  const suggestBtn = root.querySelector("#topics-suggest-btn");
  if (!keywordsInput || !suggestBtn) {
    return;
  }

  const targetReaderInput = root.querySelector("#target-reader-input");
  const hookLevelSelect = root.querySelector("#hook-level-select");
  const statusEl = root.querySelector("#topic-status");
  const topicList = root.querySelector("#topic-list");

  suggestBtn.addEventListener("click", async () => {
    if (!window.noteGen?.invoke) {
      statusEl.textContent = "请通过 Electron 启动应用（npm run dev）";
      return;
    }

    const keywords = keywordsInput.value.trim();
    if (!keywords) {
      statusEl.textContent = "请先输入领域或关键词";
      return;
    }

    statusEl.textContent = "正在生成选题候选…";
    topicList.hidden = true;
    suggestBtn.disabled = true;
    suggestBtn.classList.add("is-loading");

    try {
      const result = await window.noteGen.invoke("topics:suggest", {
        keywords,
        targetReader: targetReaderInput.value.trim(),
        hookLevel: Number(hookLevelSelect.value),
        count: 5,
      });

      renderTopicList(topicList, result, statusEl);
      const summary = result.domainSummary ? ` · ${result.domainSummary}` : "";
      statusEl.textContent = `已生成 ${result.topics.length} 个选题${summary}`;
    } catch (error) {
      statusEl.textContent = `选题生成失败：${error.message}`;
    } finally {
      suggestBtn.disabled = false;
      suggestBtn.classList.remove("is-loading");
    }
  });
}

/**
 * @param {HTMLElement} topicList
 * @param {object} result
 * @param {HTMLElement} statusEl
 */
function renderTopicList(topicList, result, statusEl) {
  topicList.innerHTML = result.topics
    .map(
      (topic) => `
      <button type="button" class="topic-item" data-topic-id="${topic.id}">
        <span class="topic-item-rank">#${topic.rank}</span>
        <span class="topic-item-title">${escapeHtml(topic.title)}</span>
        <span class="topic-item-angle">${escapeHtml(topic.angle)}</span>
      </button>
    `
    )
    .join("");
  topicList.hidden = false;

  topicList.querySelectorAll(".topic-item").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-topic-id");
      const topic = result.topics.find((item) => item.id === id);
      if (!topic) {
        return;
      }
      topicList.querySelectorAll(".topic-item").forEach((el) => {
        el.classList.toggle("is-selected", el.getAttribute("data-topic-id") === id);
      });
      onTopicSelected(topic, statusEl);
    });
  });
}

/**
 * @param {object} topic
 * @param {HTMLElement} statusEl
 */
function onTopicSelected(topic, statusEl) {
  appState.selectedTopic = topic;
  appState.copyDraft = null;
  appState.pagePlan = null;
  appState.pageAssets = {};
  appState.renderedImages = [];
  appState.completedSections.delete("writing");
  appState.completedSections.delete("images");

  markSectionDone("idea");
  statusEl.textContent = "已选择选题，切换到文案开始写作";
  setActiveSection("writing");
  notify();
}

/** @param {HTMLElement} root */
function bindWritingEvents(root) {
  const styleSelect = root.querySelector("#style-select");
  const generateBtn = root.querySelector("#copy-generate-btn");
  if (!styleSelect || !generateBtn) {
    return;
  }

  const humanizeBtn = root.querySelector("#copy-humanize-btn");
  const statusEl = root.querySelector("#copy-status");
  const titleInput = root.querySelector("#copy-title-input");
  const bodyInput = root.querySelector("#copy-body-input");
  const hashtagsInput = root.querySelector("#copy-hashtags-input");

  loadStyles(styleSelect, statusEl);

  generateBtn.addEventListener("click", async () => {
    const topic = appState.selectedTopic;
    if (!topic) {
      statusEl.textContent = "请先在「选题」中选择一个方向";
      return;
    }

    statusEl.textContent = "正在生成文案…";
    generateBtn.disabled = true;
    generateBtn.classList.add("is-loading");

    try {
      const result = await window.noteGen.invoke("copy:generate", {
        title: topic.title,
        angle: topic.angle,
        targetReader: topic.targetReader,
        styleId: styleSelect.value,
      });
      showCopy(result, titleInput, bodyInput, hashtagsInput, humanizeBtn, statusEl);
    } catch (error) {
      statusEl.textContent = `文案生成失败：${error.message}`;
    } finally {
      generateBtn.disabled = false;
      generateBtn.classList.remove("is-loading");
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
    humanizeBtn.classList.add("is-loading");

    try {
      const result = await window.noteGen.invoke("copy:humanize", { body });
      bodyInput.value = result.body;
      if (appState.copyDraft) {
        appState.copyDraft.body = result.body;
      }
      statusEl.textContent = "正文已重写，更像真人博主";
      notify();
    } catch (error) {
      statusEl.textContent = `去 AI 味失败：${error.message}`;
    } finally {
      humanizeBtn.disabled = false;
      humanizeBtn.classList.remove("is-loading");
    }
  });

  if (titleInput) {
    titleInput.addEventListener("input", syncCopyFromEditor);
  }
  if (bodyInput) {
    bodyInput.addEventListener("input", syncCopyFromEditor);
  }
  if (hashtagsInput) {
    hashtagsInput.addEventListener("input", syncCopyFromEditor);
  }
}

/**
 * @param {HTMLSelectElement} styleSelect
 * @param {HTMLElement} statusEl
 */
async function loadStyles(styleSelect, statusEl) {
  try {
    const styles = await window.noteGen.invoke("copy:listStyles");
    styleSelect.innerHTML = styles
      .map(
        (style) =>
          `<option value="${escapeHtml(style.id)}">${escapeHtml(style.name)}</option>`
      )
      .join("");
  } catch (error) {
    statusEl.textContent = `加载写作风格失败：${error.message}`;
  }
}

/**
 * @param {object} copy
 * @param {HTMLInputElement} titleInput
 * @param {HTMLTextAreaElement} bodyInput
 * @param {HTMLInputElement} hashtagsInput
 * @param {HTMLButtonElement} humanizeBtn
 * @param {HTMLElement} statusEl
 */
function showCopy(copy, titleInput, bodyInput, hashtagsInput, humanizeBtn, statusEl) {
  appState.copyDraft = copy;
  titleInput.value = copy.title;
  bodyInput.value = copy.body;
  hashtagsInput.value = (copy.hashtags || []).join(" ");
  humanizeBtn.disabled = false;

  appState.pagePlan = null;
  appState.pageAssets = {};
  appState.renderedImages = [];
  appState.completedSections.delete("images");

  markSectionDone("writing");
  statusEl.textContent = "文案已生成，可直接编辑";
  notify();
}

function syncCopyFromEditor() {
  const titleEl = document.querySelector("#copy-title-input");
  const bodyEl = document.querySelector("#copy-body-input");
  const hashtagsEl = document.querySelector("#copy-hashtags-input");
  if (!titleEl || !bodyEl) {
    return;
  }
  appState.copyDraft = {
    title: titleEl.value.trim(),
    body: bodyEl.value.trim(),
    hashtags: hashtagsEl
      ? hashtagsEl.value.trim().split(/\s+/).filter(Boolean)
      : [],
  };
  notify();
}

/** @param {HTMLElement} root */
function bindImagesEvents(root) {
  const planBtn = root.querySelector("#card-plan-btn");
  const renderBtn = root.querySelector("#card-render-btn");
  if (!planBtn) {
    return;
  }

  const statusEl = root.querySelector("#card-status");
  const planList = root.querySelector("#page-plan-list");

  planBtn.addEventListener("click", async () => {
    const copy = getCopyFromEditor();
    if (!copy.title || !copy.body) {
      statusEl.textContent = "请先在「文案」中生成或填写内容";
      return;
    }
    appState.copyDraft = copy;
    statusEl.textContent = "正在规划页面…";
    planBtn.disabled = true;
    planBtn.classList.add("is-loading");

    try {
      const plan = await window.noteGen.invoke("cards:plan", copy);
      appState.pagePlan = plan;
      renderPagePlan(planList, renderBtn, statusEl);
      statusEl.textContent = `已规划 ${plan.pages.length} 页，请为需要素材的页面配图`;
    } catch (error) {
      statusEl.textContent = `规划失败：${error.message}`;
    } finally {
      planBtn.disabled = false;
      planBtn.classList.remove("is-loading");
    }
  });

  if (renderBtn) {
    renderBtn.addEventListener("click", async () => {
      if (!appState.pagePlan) {
        statusEl.textContent = "请先规划页面结构";
        return;
      }
      syncPagePlanInputs(planList);
      statusEl.textContent = "正在渲染卡片…";
      renderBtn.disabled = true;
      renderBtn.classList.add("is-loading");

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
        markSectionDone("images");
        statusEl.textContent = `已生成 ${result.images.length} 张卡片`;
        notify();
      } catch (error) {
        statusEl.textContent = `渲染失败：${error.message}`;
      } finally {
        renderBtn.disabled = false;
        renderBtn.classList.remove("is-loading");
      }
    });
  }

  if (appState.pagePlan && planList && renderBtn) {
    renderPagePlan(planList, renderBtn, statusEl);
  }
}

function getCopyFromEditor() {
  const title = document.querySelector("#copy-title-input");
  const body = document.querySelector("#copy-body-input");
  const hashtags = document.querySelector("#copy-hashtags-input");
  return {
    title: title ? title.value.trim() : appState.copyDraft?.title || "",
    body: body ? body.value.trim() : appState.copyDraft?.body || "",
    hashtags: hashtags
      ? hashtags.value.trim().split(/\s+/).filter(Boolean)
      : appState.copyDraft?.hashtags || [],
  };
}

/**
 * @param {HTMLElement} planList
 * @param {HTMLButtonElement} renderBtn
 * @param {HTMLElement} statusEl
 */
function renderPagePlan(planList, renderBtn, statusEl) {
  syncPagePlanInputs(planList);
  const plan = appState.pagePlan;
  if (!plan) {
    return;
  }

  planList.innerHTML = plan.pages
    .map((page, index) => {
      const asset = appState.pageAssets[page.id];
      const assetLabel = asset ? `已绑定：${asset.source}` : "未绑定（纯文字）";
      const canDelete = plan.pages.length > 1;
      return `
        <article class="page-plan-item" data-page-id="${escapeAttr(page.id)}">
          <div class="page-plan-header">
            <input type="text" class="page-headline-input"
              data-page-id="${escapeAttr(page.id)}"
              value="${escapeAttr(page.headline)}"
              placeholder="页面小标题"
              aria-label="第 ${index + 1} 页标题" />
            <button type="button" class="btn-ghost page-delete-btn"
              data-page-id="${escapeAttr(page.id)}"
              title="删除此页"
              ${canDelete ? "" : "disabled"}>删除</button>
          </div>
          <p class="page-plan-meta">${escapeHtml(page.role)} · ${assetLabel}</p>
          ${page.body ? `<p class="page-plan-body">${escapeHtml(page.body)}</p>` : ""}
          <div class="page-plan-fields">
            <input type="text" class="page-ai-prompt-input field-borderless field-secondary"
              data-page-id="${escapeAttr(page.id)}"
              value="${escapeAttr(page.imagePrompt || "")}"
              placeholder="AI 生图描述" />
            <input type="text" class="page-stock-keyword-input field-borderless field-secondary"
              data-page-id="${escapeAttr(page.id)}"
              value="${escapeAttr(page.searchKeyword || "")}"
              placeholder="图库搜索词" />
          </div>
          <div class="page-plan-actions">
            <button type="button" class="btn-secondary page-pick-btn" data-page-id="${escapeAttr(page.id)}">用户供图</button>
            <button type="button" class="btn-secondary page-ai-btn" data-page-id="${escapeAttr(page.id)}">AI 生图</button>
            <button type="button" class="btn-secondary page-stock-btn" data-page-id="${escapeAttr(page.id)}">图库搜图</button>
            <button type="button" class="btn-ghost page-clear-btn" data-page-id="${escapeAttr(page.id)}"
              ${asset ? "" : "disabled"}>清除</button>
          </div>
        </article>
      `;
    })
    .join("") +
    `
    <div class="page-plan-add">
      <button type="button" class="btn-secondary page-add-btn">+ 添加页面</button>
    </div>
  `;
  planList.hidden = false;
  renderBtn.disabled = false;

  planList.querySelectorAll(".page-pick-btn").forEach((btn) => {
    btn.addEventListener("click", () => handleUserImage(btn.getAttribute("data-page-id"), planList, statusEl));
  });
  planList.querySelectorAll(".page-ai-btn").forEach((btn) => {
    btn.addEventListener("click", () => handleAiImage(btn.getAttribute("data-page-id"), planList, statusEl));
  });
  planList.querySelectorAll(".page-stock-btn").forEach((btn) => {
    btn.addEventListener("click", () => handleStockImage(btn.getAttribute("data-page-id"), planList, statusEl));
  });
  planList.querySelectorAll(".page-clear-btn").forEach((btn) => {
    btn.addEventListener("click", () => handleClearImage(btn.getAttribute("data-page-id"), planList, statusEl));
  });
  planList.querySelectorAll(".page-headline-input").forEach((input) => {
    input.addEventListener("input", () => handleHeadlineChange(input.getAttribute("data-page-id"), input.value));
  });
  planList.querySelectorAll(".page-delete-btn").forEach((btn) => {
    btn.addEventListener("click", () =>
      handleDeletePage(btn.getAttribute("data-page-id"), planList, renderBtn, statusEl)
    );
  });
  const addBtn = planList.querySelector(".page-add-btn");
  if (addBtn) {
    addBtn.addEventListener("click", () => handleAddPage(planList, renderBtn, statusEl));
  }
}

/** @param {HTMLElement} planList */
function syncPagePlanInputs(planList) {
  if (!appState.pagePlan || !planList) {
    return;
  }
  for (const page of appState.pagePlan.pages) {
    const headlineInput = planList.querySelector(`.page-headline-input[data-page-id="${page.id}"]`);
    const aiInput = planList.querySelector(`.page-ai-prompt-input[data-page-id="${page.id}"]`);
    const stockInput = planList.querySelector(`.page-stock-keyword-input[data-page-id="${page.id}"]`);
    if (headlineInput) {
      page.headline = headlineInput.value.trim();
    }
    if (aiInput) {
      page.imagePrompt = aiInput.value.trim();
    }
    if (stockInput) {
      page.searchKeyword = stockInput.value.trim();
    }
  }
}

/**
 * @param {string} pageId
 * @param {string} headline
 */
function handleHeadlineChange(pageId, headline) {
  if (!appState.pagePlan) {
    return;
  }
  const page = appState.pagePlan.pages.find((item) => item.id === pageId);
  if (!page) {
    return;
  }
  page.headline = headline;
  appState.renderedImages = [];
  notify();
}

/**
 * @param {string} pageId
 * @param {HTMLElement} planList
 * @param {HTMLButtonElement} renderBtn
 * @param {HTMLElement} statusEl
 */
function handleDeletePage(pageId, planList, renderBtn, statusEl) {
  if (!appState.pagePlan || appState.pagePlan.pages.length <= 1) {
    statusEl.textContent = "至少保留一页";
    return;
  }
  syncPagePlanInputs(planList);
  appState.pagePlan.pages = appState.pagePlan.pages.filter((page) => page.id !== pageId);
  delete appState.pageAssets[pageId];
  appState.renderedImages = [];
  renderPagePlan(planList, renderBtn, statusEl);
  statusEl.textContent = "已删除页面";
  notify();
}

/**
 * @param {HTMLElement} planList
 * @param {HTMLButtonElement} renderBtn
 * @param {HTMLElement} statusEl
 */
function handleAddPage(planList, renderBtn, statusEl) {
  if (!appState.pagePlan) {
    return;
  }
  syncPagePlanInputs(planList);

  const nextIndex = appState.pagePlan.pages.reduce((max, page) => {
    const match = page.id.match(/(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0) + 1;
  const newId = `xhs-${String(nextIndex).padStart(2, "0")}`;

  appState.pagePlan.pages.push({
    id: newId,
    role: "content",
    headline: "新页面",
    subline: "",
    body: "",
    imageSource: "",
    imagePrompt: "",
    searchKeyword: "",
    imageRelativePath: "",
    imageAbsolutePath: "",
  });
  appState.renderedImages = [];
  renderPagePlan(planList, renderBtn, statusEl);
  statusEl.textContent = "已添加页面，可编辑标题";

  const newInput = planList.querySelector(`.page-headline-input[data-page-id="${newId}"]`);
  if (newInput) {
    newInput.focus();
    newInput.select();
  }
  notify();
}

/**
 * @param {string} pageId
 * @param {HTMLElement} planList
 * @param {HTMLElement} statusEl
 */
function handleClearImage(pageId, planList, statusEl) {
  if (!appState.pageAssets[pageId]) {
    return;
  }
  delete appState.pageAssets[pageId];
  statusEl.textContent = `已清除配图`;
  const renderBtn = document.querySelector("#card-render-btn");
  if (appState.pagePlan && planList && renderBtn) {
    renderPagePlan(planList, renderBtn, statusEl);
  }
  notify();
}

/**
 * @param {string} pageId
 * @param {HTMLElement} planList
 * @param {HTMLElement} statusEl
 */
async function handleUserImage(pageId, planList, statusEl) {
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
    const renderBtn = document.querySelector("#card-render-btn");
    if (appState.pagePlan) {
      renderPagePlan(planList, renderBtn, statusEl);
    }
    notify();
  } catch (error) {
    statusEl.textContent = `导入失败：${error.message}`;
  }
}

/**
 * @param {string} pageId
 * @param {HTMLElement} planList
 * @param {HTMLElement} statusEl
 */
async function handleAiImage(pageId, planList, statusEl) {
  syncPagePlanInputs(planList);
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
    const renderBtn = document.querySelector("#card-render-btn");
    renderPagePlan(planList, renderBtn, statusEl);
    notify();
  } catch (error) {
    statusEl.textContent = `AI 生图失败：${error.message}`;
  }
}

/**
 * @param {string} pageId
 * @param {HTMLElement} planList
 * @param {HTMLElement} statusEl
 */
async function handleStockImage(pageId, planList, statusEl) {
  syncPagePlanInputs(planList);
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
    statusEl.textContent = `图库搜图完成（${result.provider}）`;
    const renderBtn = document.querySelector("#card-render-btn");
    renderPagePlan(planList, renderBtn, statusEl);
    notify();
  } catch (error) {
    statusEl.textContent = `图库搜图失败：${error.message}`;
  }
}
