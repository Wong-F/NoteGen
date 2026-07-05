import {
  appState,
  ensureSessionId,
  subscribe,
  markSectionDone,
  setActiveSection,
  notify,
} from "./appState.js";
import { saveWorkspaceNow } from "./workspaceStore.js";
import { escapeHtml, escapeAttr } from "./utils.js";
import { TITLE_STYLE_OPTIONS, formatTitleStyleLabel } from "../constants/formDefaults.js";

/** @returns {{ personaId?: string; workflowType: string }} */
function workspacePipelinePayload() {
  return {
    ...(appState.personaId ? { personaId: appState.personaId } : {}),
    workflowType: appState.workflowType || "xiaohongshu-note",
  };
}

function isWechatArticle() {
  return appState.workflowType === "wechat-article";
}

/** @returns {Array<{ heading: string; content: string }>} */
function readSectionsFromDom() {
  const list = document.querySelector("#copy-sections-list");
  if (!list) {
    return appState.copyDraft?.sections || [];
  }
  /** @type {Array<{ heading: string; content: string }>} */
  const sections = [];
  list.querySelectorAll(".copy-section").forEach((row) => {
    const heading = row.querySelector(".section-heading-input")?.value.trim() || "";
    const content = row.querySelector(".section-content-input")?.value.trim() || "";
    if (heading || content) {
      sections.push({ heading, content });
    }
  });
  return sections;
}

/** @param {HTMLElement} row */
function readSectionRow(row) {
  return {
    heading: row.querySelector(".section-heading-input")?.value.trim() || "",
    content: row.querySelector(".section-content-input")?.value.trim() || "",
  };
}

/** @param {HTMLElement} row */
function readSectionsContextBeforeRow(row) {
  const list = document.querySelector("#copy-sections-list");
  /** @type {Array<{ heading: string; content: string }>} */
  const sections = [];
  list?.querySelectorAll(".copy-section").forEach((sectionRow) => {
    if (sectionRow === row) {
      return;
    }
    const section = readSectionRow(sectionRow);
    if (section.heading || section.content) {
      sections.push(section);
    }
  });
  return sections;
}

function renderSectionRowHtml(sec = { heading: "", content: "" }) {
  return `
    <input type="text" class="section-heading-input field-borderless"
      placeholder="小节标题（≤18字）" maxlength="18"
      value="${escapeAttr(sec.heading || "")}" />
    <textarea class="section-content-input editor-body" rows="5"
      placeholder="小节正文…">${escapeHtml(sec.content || "")}</textarea>
    <div class="copy-section-actions">
      <button type="button" class="btn-secondary copy-section-continue-btn">继续生成</button>
    </div>`;
}

/** @param {Array<{ heading: string; content: string }>} [sections] */
function renderSectionsEditorHtml(sections) {
  const items = (sections?.length ? sections : [{ heading: "", content: "" }])
    .map(
      (sec) => `
      <div class="copy-section">
        ${renderSectionRowHtml(sec)}
      </div>`
    )
    .join("");
  return `<div id="copy-sections-list" class="copy-sections-list">${items}</div>
    <button type="button" id="copy-add-section-btn" class="btn-secondary copy-add-section-btn">+ 添加小节</button>`;
}

/**
 * @param {HTMLElement} row
 * @param {HTMLElement} statusEl
 */
async function handleContinueSection(row, statusEl) {
  if (!window.noteGen?.invoke) {
    statusEl.textContent = "请通过 Electron 启动应用（npm run dev）";
    return;
  }

  syncCopyFromEditor();
  const draft = readSectionRow(row);
  const sections = readSectionsContextBeforeRow(row);
  const titleEl = document.querySelector("#copy-title-input");
  const summaryEl = document.querySelector("#copy-summary-input");
  const bodyEl = document.querySelector("#copy-body-input");
  const styleSelect = document.querySelector("#style-select");
  const btn = row.querySelector(".copy-section-continue-btn");

  if (btn) {
    btn.disabled = true;
    btn.classList.add("is-loading");
  }
  statusEl.textContent = "正在续写小节…";

  try {
    const result = await window.noteGen.invoke("copy:continueSection", {
      title: titleEl?.value.trim() || "",
      summary: summaryEl?.value.trim() || "",
      body: bodyEl?.value.trim() || "",
      sections,
      draft,
      styleId: styleSelect?.value || appState.styleId,
      ...workspacePipelinePayload(),
    });
    const headingInput = row.querySelector(".section-heading-input");
    const contentInput = row.querySelector(".section-content-input");
    if (headingInput) {
      headingInput.value = result.heading;
    }
    if (contentInput) {
      contentInput.value = result.content;
    }
    syncCopyFromEditor();
    saveWorkspaceNow();
    statusEl.textContent = "小节已生成，可继续编辑或再次续写";
    notify();
  } catch (error) {
    statusEl.textContent = `小节续写失败：${error.message}`;
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.classList.remove("is-loading");
    }
  }
}

/** @param {HTMLElement} row */
function bindSectionRowEvents(row, statusEl) {
  row.querySelectorAll(".section-heading-input, .section-content-input").forEach((el) => {
    el.addEventListener("input", syncCopyFromEditor);
  });
  row.querySelector(".copy-section-continue-btn")?.addEventListener("click", () => {
    handleContinueSection(row, statusEl);
  });
}

/** @param {HTMLElement} root */
function bindSectionsEditorEvents(root) {
  const addBtn = root.querySelector("#copy-add-section-btn");
  const list = root.querySelector("#copy-sections-list");
  const statusEl = root.querySelector("#copy-status");
  if (!addBtn || !list || !statusEl) {
    return;
  }
  addBtn.addEventListener("click", () => {
    const wrapper = document.createElement("div");
    wrapper.className = "copy-section";
    wrapper.innerHTML = renderSectionRowHtml();
    list.appendChild(wrapper);
    bindSectionRowEvents(wrapper, statusEl);
    wrapper.querySelector(".section-heading-input")?.focus();
    syncCopyFromEditor();
  });
  list.querySelectorAll(".copy-section").forEach((row) => {
    bindSectionRowEvents(row, statusEl);
  });
}

/**
 * Mount center workspace with section-switching content.
 * @param {HTMLElement} root
 */
export function mountWorkspace(root) {
  root.className = "workspace-root";
  root.innerHTML = `
    <div class="workspace-chrome" id="workspace-chrome" hidden>
      <h1 class="workspace-chrome-title" id="workspace-chrome-title"></h1>
    </div>
    <div class="workspace-scroll" id="workspace-scroll">
      <div class="workspace-inner" id="workspace-inner"></div>
    </div>
  `;

  const chromeEl = root.querySelector("#workspace-chrome");
  const titleEl = root.querySelector("#workspace-chrome-title");
  const inner = root.querySelector("#workspace-inner");

  function updateChrome() {
    const show = appState.workspaceReady;
    chromeEl.hidden = !show;
    if (show) {
      titleEl.textContent = appState.workspaceTitle || "未命名创作";
    }
  }

  let lastSection = appState.activeSection;
  subscribe(() => {
    updateChrome();
    if (appState.activeSection !== lastSection) {
      lastSection = appState.activeSection;
      renderSection(inner);
    }
  });

  document.addEventListener("workspace:activated", () => {
    lastSection = appState.activeSection;
    updateChrome();
    renderSection(inner);
  });

  document.addEventListener("workspace:empty", updateChrome);

  document.addEventListener("persona:idea-synced", () => {
    if (appState.activeSection === "idea" && appState.workspaceReady) {
      renderSection(inner);
    }
  });

  updateChrome();
  renderSection(inner);
}

/** @param {HTMLElement} inner */
function renderSection(inner) {
  if (!appState.workspaceReady) {
    inner.hidden = true;
    return;
  }
  inner.hidden = false;

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
  const input = appState.ideaInput;
  return `
    <div class="workspace-header">
      <h2 class="workspace-title">选题</h2>
      <p class="workspace-desc">输入领域或关键词，AI 帮你找到值得写的角度</p>
    </div>
    <div class="workspace-fields">
      <input id="keywords-input" type="text" class="field-borderless"
        placeholder="领域 / 关键词，例如：周末咖啡店探店、职场效率"
        value="${escapeAttr(input.keywords)}" />
      <input id="target-reader-input" type="text" class="field-borderless field-secondary"
        placeholder="目标读者（可选），例如：25-35 岁上班族"
        value="${escapeAttr(input.targetReader)}" />
      <div class="field-row">
        <select id="hook-level-select" class="field-select" aria-label="标题风格">
          ${TITLE_STYLE_OPTIONS.map(
            (item) =>
              `<option value="${item.level}" ${input.hookLevel === item.level ? "selected" : ""}>${escapeHtml(formatTitleStyleLabel(item.level))}</option>`
          ).join("")}
        </select>
        <button id="topics-suggest-btn" type="button" class="btn-primary">生成选题</button>
      </div>
    </div>
    <p id="topic-status" class="workspace-status" aria-live="polite"></p>
    <div id="topic-list" class="topic-list" ${appState.generatedTopics.length ? "" : "hidden"}></div>
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

  if (isWechatArticle()) {
    return `
    <div class="workspace-header">
      <h2 class="workspace-title">成文</h2>
      <p class="workspace-desc">${topicHint}</p>
    </div>
    <div class="workspace-editor">
      <div class="editor-toolbar">
        <select id="style-select" class="field-select field-select-inline"></select>
        <div class="editor-actions">
          <button id="copy-generate-btn" type="button" class="btn-primary"
            ${topic ? "" : "disabled"}>生成长文</button>
          <button id="copy-humanize-btn" type="button" class="btn-secondary"
            ${copy ? "" : "disabled"}>去 AI 味</button>
        </div>
      </div>
      <p id="copy-status" class="workspace-status" aria-live="polite"></p>
      <input id="copy-title-input" type="text" class="editor-title"
        maxlength="25" placeholder="文章标题（≤25 字）"
        value="${copy ? escapeAttr(copy.title) : ""}" />
      <input id="copy-summary-input" type="text" class="field-borderless field-secondary"
        maxlength="80" placeholder="摘要（50-80 字，用于分享与导读）"
        value="${copy ? escapeAttr(copy.summary || "") : ""}" />
      <textarea id="copy-body-input" class="editor-body" rows="6"
        placeholder="引言 / Lead 段…">${copy ? escapeHtml(copy.body) : ""}</textarea>
      ${renderSectionsEditorHtml(copy?.sections)}
    </div>
  `;
  }

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
    : `请先在「${isWechatArticle() ? "成文" : "文案"}」中生成内容`;
  const planLabel = isWechatArticle() ? "规划配图结构" : "规划页面结构";
  const renderLabel = isWechatArticle() ? "生成配图" : "生成卡片图片";

  return `
    <div class="workspace-header">
      <h2 class="workspace-title">配图</h2>
      <p class="workspace-desc">${copyHint}</p>
    </div>
    <div class="workspace-fields">
      <button id="card-plan-btn" type="button" class="btn-primary"
        ${copy ? "" : "disabled"}>${planLabel}</button>
    </div>
    <p id="card-status" class="workspace-status" aria-live="polite"></p>
    <div id="page-plan-list" class="page-plan-list" hidden></div>
    <div class="workspace-fields">
      <button id="card-render-btn" type="button" class="btn-primary" disabled>${renderLabel}</button>
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

  const syncIdeaInput = () => {
    appState.ideaInput = {
      keywords: keywordsInput.value,
      targetReader: targetReaderInput?.value || "",
      hookLevel: Number(hookLevelSelect?.value || 2),
    };
    notify();
  };

  keywordsInput.addEventListener("input", syncIdeaInput);
  targetReaderInput?.addEventListener("input", syncIdeaInput);
  hookLevelSelect?.addEventListener("change", syncIdeaInput);

  if (appState.generatedTopics.length && topicList) {
    renderTopicList(topicList, { topics: appState.generatedTopics }, statusEl, true);
  }

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
        ...workspacePipelinePayload(),
      });

      renderTopicList(topicList, result, statusEl);
      appState.generatedTopics = result.topics;
      const summary = result.domainSummary ? ` · ${result.domainSummary}` : "";
      statusEl.textContent = `已生成 ${result.topics.length} 个选题${summary}`;
      saveWorkspaceNow();
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
 * @param {boolean} [restoreOnly]
 */
function renderTopicList(topicList, result, statusEl, restoreOnly = false) {
  topicList.innerHTML = result.topics
    .map(
      (topic) => `
      <button type="button" class="topic-item${appState.selectedTopic?.id === topic.id ? " is-selected" : ""}" data-topic-id="${topic.id}">
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
      onTopicSelected(topic, statusEl, restoreOnly);
    });
  });
}

/**
 * @param {object} topic
 * @param {HTMLElement} statusEl
 * @param {boolean} [skipNavigate]
 */
function onTopicSelected(topic, statusEl, skipNavigate = false) {
  appState.selectedTopic = topic;
  if (!skipNavigate) {
    appState.copyDraft = null;
    appState.pagePlan = null;
    appState.pageAssets = {};
    appState.renderedImages = [];
    appState.completedSections.delete("writing");
    appState.completedSections.delete("images");
  }

  markSectionDone("idea");
  if (!skipNavigate) {
    statusEl.textContent = "已选择选题，切换到文案开始写作";
    setActiveSection("writing");
  }
  notify();
  saveWorkspaceNow();
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
  const summaryInput = root.querySelector("#copy-summary-input");

  loadStyles(styleSelect, statusEl);

  if (isWechatArticle()) {
    bindSectionsEditorEvents(root);
  }

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
        ...workspacePipelinePayload(),
      });
      appState.styleId = styleSelect.value;
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
      const sections = isWechatArticle() ? readSectionsFromDom() : [];
      const result = await window.noteGen.invoke("copy:humanize", {
        body,
        sections,
        ...workspacePipelinePayload(),
      });
      bodyInput.value = result.body;
      if (appState.copyDraft) {
        appState.copyDraft.body = result.body;
        if (result.sections?.length) {
          appState.copyDraft.sections = result.sections;
        }
      }
      if (isWechatArticle() && result.sections?.length) {
        const inner = root.closest("#workspace-inner") || document.querySelector("#workspace-inner");
        if (inner) {
          renderSection(inner);
          return;
        }
      }
      statusEl.textContent = "正文已重写，更像真人作者";
      notify();
      saveWorkspaceNow();
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
  if (summaryInput) {
    summaryInput.addEventListener("input", syncCopyFromEditor);
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
          `<option value="${escapeHtml(style.id)}"${appState.styleId === style.id ? " selected" : ""}>${escapeHtml(style.name)}</option>`
      )
      .join("");
    if (!appState.styleId && styles.length) {
      appState.styleId = styles[0].id;
    }
    styleSelect.addEventListener("change", () => {
      appState.styleId = styleSelect.value;
      notify();
    });
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
  appState.copyDraft = {
    ...copy,
    summary: copy.summary || "",
    sections: copy.sections || [],
    hashtags: copy.hashtags || [],
  };

  if (isWechatArticle()) {
    appState.pagePlan = null;
    appState.pageAssets = {};
    appState.renderedImages = [];
    appState.completedSections.delete("images");
    markSectionDone("writing");
    statusEl.textContent = "长文已生成，可直接编辑各小节";
    notify();
    saveWorkspaceNow();
    const inner = document.querySelector("#workspace-inner");
    if (inner) {
      renderSection(inner);
    }
    return;
  }

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
  saveWorkspaceNow();
}

function syncCopyFromEditor() {
  const titleEl = document.querySelector("#copy-title-input");
  const bodyEl = document.querySelector("#copy-body-input");
  const hashtagsEl = document.querySelector("#copy-hashtags-input");
  const summaryEl = document.querySelector("#copy-summary-input");
  if (!titleEl || !bodyEl) {
    return;
  }
  if (isWechatArticle()) {
    appState.copyDraft = {
      title: titleEl.value.trim(),
      summary: summaryEl?.value.trim() || "",
      body: bodyEl.value.trim(),
      sections: readSectionsFromDom(),
      hashtags: [],
    };
  } else {
    appState.copyDraft = {
      title: titleEl.value.trim(),
      body: bodyEl.value.trim(),
      hashtags: hashtagsEl
        ? hashtagsEl.value.trim().split(/\s+/).filter(Boolean)
        : [],
      sections: [],
      summary: "",
    };
  }
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
    if (!copy.title || (!copy.body && !(copy.sections?.length))) {
      statusEl.textContent = "请先在「成文」中生成或填写内容";
      return;
    }
    appState.copyDraft = copy;
    statusEl.textContent = "正在规划页面…";
    planBtn.disabled = true;
    planBtn.classList.add("is-loading");

    try {
      const plan = await window.noteGen.invoke("cards:plan", {
        ...copy,
        ...workspacePipelinePayload(),
      });
      appState.pagePlan = plan;
      renderPagePlan(planList, renderBtn, statusEl);
      statusEl.textContent = `已规划 ${plan.pages.length} 页，请为需要素材的页面配图`;
      saveWorkspaceNow();
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
        saveWorkspaceNow();
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
  const summary = document.querySelector("#copy-summary-input");
  const baseTitle = title ? title.value.trim() : appState.copyDraft?.title || "";
  const baseBody = body ? body.value.trim() : appState.copyDraft?.body || "";

  if (isWechatArticle()) {
    return {
      title: baseTitle,
      summary: summary ? summary.value.trim() : appState.copyDraft?.summary || "",
      body: baseBody,
      sections: readSectionsFromDom(),
      hashtags: [],
    };
  }

  return {
    title: baseTitle,
    body: baseBody,
    hashtags: hashtags
      ? hashtags.value.trim().split(/\s+/).filter(Boolean)
      : appState.copyDraft?.hashtags || [],
    sections: [],
    summary: "",
  };
}

/**
 * @param {HTMLElement} planList
 * @param {string} pageId
 * @returns {number}
 */
function getPageResultCount(planList, pageId) {
  const select = planList.querySelector(`.page-result-count[data-page-id="${CSS.escape(pageId)}"]`);
  const value = Number(select?.value);
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.min(6, Math.max(1, value));
}

/**
 * @param {{ absolutePath?: string }} asset
 * @returns {string}
 */
function renderBoundAssetPreview(asset) {
  if (!asset?.absolutePath) {
    return "";
  }
  return `
    <div class="page-plan-preview" data-path="${escapeAttr(asset.absolutePath)}">
      <img class="page-plan-thumb" alt="已绑定图片预览" />
    </div>
  `;
}

/**
 * @param {string} pageId
 * @param {Array<{ kind: string; previewUrl?: string; absolutePath?: string }>} candidates
 * @returns {string}
 */
function renderCandidatePickerHtml(pageId, candidates) {
  if (!candidates?.length) {
    return "";
  }
  return `
    <div class="page-candidate-picker" data-page-id="${escapeAttr(pageId)}">
      <p class="page-candidate-label">选择一张绑定到此页</p>
      <div class="page-candidate-grid">
        ${candidates
          .map((item, index) => {
            if (item.kind === "stock" && item.previewUrl) {
              return `
                <button type="button" class="page-candidate-btn page-candidate-btn--stock"
                  data-page-id="${escapeAttr(pageId)}"
                  data-candidate-index="${index}"
                  data-preview-url="${escapeAttr(item.previewUrl)}">
                  <img alt="" class="page-candidate-thumb" />
                </button>
              `;
            }
            return `
              <button type="button" class="page-candidate-btn page-candidate-btn--local"
                data-page-id="${escapeAttr(pageId)}"
                data-candidate-index="${index}"
                data-path="${escapeAttr(item.absolutePath || "")}">
                <img alt="" class="page-candidate-thumb" />
              </button>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

/**
 * @param {HTMLElement} planList
 */
async function loadPagePlanThumbnails(planList) {
  const previews = planList.querySelectorAll(".page-plan-preview[data-path]");
  await Promise.all(
    Array.from(previews).map(async (preview) => {
      const img = preview.querySelector(".page-plan-thumb");
      const absolutePath = preview.getAttribute("data-path");
      if (!img || !absolutePath || img.dataset.loaded === "1") {
        return;
      }
      try {
        const dataUrl = await window.noteGen.invoke("images:previewDataUrl", { absolutePath });
        img.src = dataUrl;
        img.dataset.loaded = "1";
      } catch {
        img.alt = "预览加载失败";
      }
    })
  );

  const localCandidates = planList.querySelectorAll(".page-candidate-btn--local[data-path]");
  await Promise.all(
    Array.from(localCandidates).map(async (btn) => {
      const img = btn.querySelector(".page-candidate-thumb");
      const absolutePath = btn.getAttribute("data-path");
      if (!img || !absolutePath || img.dataset.loaded === "1") {
        return;
      }
      try {
        const dataUrl = await window.noteGen.invoke("images:previewDataUrl", { absolutePath });
        img.src = dataUrl;
        img.dataset.loaded = "1";
      } catch {
        img.alt = "预览加载失败";
      }
    })
  );

  const stockCandidates = planList.querySelectorAll(".page-candidate-btn--stock[data-preview-url]");
  await Promise.all(
    Array.from(stockCandidates).map(async (btn) => {
      const img = btn.querySelector(".page-candidate-thumb");
      const previewUrl = btn.getAttribute("data-preview-url");
      if (!img || !previewUrl || img.dataset.loaded === "1") {
        return;
      }
      try {
        const dataUrl = await window.noteGen.invoke("images:fetchRemoteDataUrl", { url: previewUrl });
        img.src = dataUrl;
        img.dataset.loaded = "1";
      } catch {
        img.alt = "预览加载失败";
      }
    })
  );
}

/**
 * @param {string} pageId
 * @param {{ absolutePath: string; relativePath: string; source: string }} asset
 * @param {HTMLElement} planList
 * @param {HTMLElement} statusEl
 * @param {string} message
 */
function bindPageAsset(pageId, asset, planList, statusEl, message) {
  appState.pageAssets[pageId] = asset;
  delete appState.pageImageCandidates[pageId];
  appState.renderedImages = [];
  statusEl.textContent = message;
  const renderBtn = document.querySelector("#card-render-btn");
  if (appState.pagePlan && planList && renderBtn) {
    renderPagePlan(planList, renderBtn, statusEl);
  }
  notify();
}

/**
 * @param {string} pageId
 * @param {Array<object>} candidates
 * @param {HTMLElement} planList
 * @param {HTMLElement} statusEl
 * @param {string} message
 */
function showImageCandidates(pageId, candidates, planList, statusEl, message) {
  appState.pageImageCandidates[pageId] = candidates;
  appState.renderedImages = [];
  statusEl.textContent = message;
  const renderBtn = document.querySelector("#card-render-btn");
  if (appState.pagePlan && planList && renderBtn) {
    renderPagePlan(planList, renderBtn, statusEl);
  }
}

/**
 * @param {string} pageId
 * @param {number} index
 * @param {HTMLElement} planList
 * @param {HTMLElement} statusEl
 */
async function handleSelectCandidate(pageId, index, planList, statusEl) {
  const candidates = appState.pageImageCandidates[pageId];
  const item = candidates?.[index];
  if (!item) {
    return;
  }

  statusEl.textContent = "正在绑定所选图片…";
  try {
    if (item.kind === "stock") {
      const sessionId = ensureSessionId();
      const downloaded = await window.noteGen.invoke("images:downloadStockCandidate", {
        candidate: item.candidate,
        sessionId,
        label: pageId,
      });
      appState.sessionId = downloaded.sessionId;
      bindPageAsset(
        pageId,
        {
          absolutePath: downloaded.absolutePath,
          relativePath: downloaded.relativePath,
          source: `stock:${downloaded.provider || item.source || "stock"}`,
        },
        planList,
        statusEl,
        `已绑定图库图片（${downloaded.provider || item.source || "stock"}）`
      );
      return;
    }

    bindPageAsset(
      pageId,
      {
        absolutePath: item.absolutePath,
        relativePath: item.relativePath,
        source: item.source || "ai",
      },
      planList,
      statusEl,
      "已绑定所选图片"
    );
  } catch (error) {
    statusEl.textContent = `绑定失败：${error.message}`;
  }
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
      const candidates = appState.pageImageCandidates[page.id];
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
          ${renderBoundAssetPreview(asset)}
          ${page.body ? `<p class="page-plan-body">${escapeHtml(page.body)}</p>` : ""}
          ${renderCandidatePickerHtml(page.id, candidates)}
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
            <label class="page-result-count-wrap">
              <span>返回</span>
              <select class="page-result-count field-borderless field-secondary"
                data-page-id="${escapeAttr(page.id)}" aria-label="返回图片数量">
                ${[1, 2, 3, 4, 5, 6]
                  .map((n) => `<option value="${n}">${n}</option>`)
                  .join("")}
              </select>
              <span>张</span>
            </label>
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

  planList.querySelectorAll(".page-candidate-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pageId = btn.getAttribute("data-page-id");
      const index = Number(btn.getAttribute("data-candidate-index"));
      if (pageId && Number.isFinite(index)) {
        handleSelectCandidate(pageId, index, planList, statusEl);
      }
    });
  });

  void loadPagePlanThumbnails(planList);
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
  delete appState.pageImageCandidates[pageId];
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
  delete appState.pageImageCandidates[pageId];
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
    bindPageAsset(
      pageId,
      {
        absolutePath: imported.absolutePath,
        relativePath: imported.relativePath,
        source: "user",
      },
      planList,
      statusEl,
      `已导入图片：${imported.filename}`
    );
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
  const count = getPageResultCount(planList, pageId);
  statusEl.textContent = count > 1 ? `正在 AI 生图 ${count} 张…` : "正在 AI 生图…";
  try {
    const sessionId = ensureSessionId();
    const result = await window.noteGen.invoke("images:generate", {
      prompt,
      sessionId,
      label: pageId,
      count,
    });
    appState.sessionId = result.sessionId;
    const images = result.images || [];
    if (images.length <= 1) {
      const image = images[0];
      if (!image) {
        throw new Error("未返回图片");
      }
      bindPageAsset(
        pageId,
        {
          absolutePath: image.absolutePath,
          relativePath: image.relativePath,
          source: "ai",
        },
        planList,
        statusEl,
        `AI 生图完成：${image.filename || "已绑定"}`
      );
      return;
    }
    showImageCandidates(
      pageId,
      images.map((image) => ({
        kind: "local",
        absolutePath: image.absolutePath,
        relativePath: image.relativePath,
        source: "ai",
      })),
      planList,
      statusEl,
      `AI 已生成 ${images.length} 张，请选择一张绑定`
    );
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
  const count = getPageResultCount(planList, pageId);
  statusEl.textContent =
    count > 1 ? `正在图库搜图：${keyword}（${count} 张）…` : `正在图库搜图：${keyword}…`;
  try {
    const sessionId = ensureSessionId();
    if (count === 1) {
      const result = await window.noteGen.invoke("images:searchStock", {
        keyword,
        sessionId,
        label: pageId,
      });
      appState.sessionId = result.sessionId;
      bindPageAsset(
        pageId,
        {
          absolutePath: result.absolutePath,
          relativePath: result.relativePath,
          source: `stock:${result.provider}`,
        },
        planList,
        statusEl,
        `图库搜图完成（${result.provider}）`
      );
      return;
    }

    const { candidates } = await window.noteGen.invoke("images:searchStockCandidates", {
      keyword,
      count,
    });
    if (!candidates?.length) {
      throw new Error("未找到匹配图片");
    }
    showImageCandidates(
      pageId,
      candidates.map((candidate) => ({
        kind: "stock",
        previewUrl: candidate.previewUrl,
        source: candidate.provider,
        candidate,
      })),
      planList,
      statusEl,
      `图库返回 ${candidates.length} 张候选，请选择一张绑定`
    );
  } catch (error) {
    statusEl.textContent = `图库搜图失败：${error.message}`;
  }
}
