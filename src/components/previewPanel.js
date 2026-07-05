import { appState, subscribe, deriveWorkspaceTitle } from "./appState.js";
import { escapeHtml, escapeAttr } from "./utils.js";

/**
 * Mount live preview panel with export actions.
 * @param {HTMLElement} root
 */
export function mountPreviewPanel(root) {
  root.innerHTML = `
    <div class="preview-panel">
      <div id="preview-content" class="preview-content preview-fade"></div>
      <div id="preview-export" class="preview-export" hidden>
        <p class="preview-export-label">发布导出</p>
        <div class="preview-export-actions">
          <button id="export-copy-btn" type="button" class="btn-secondary">复制文案</button>
          <button id="export-all-btn" type="button" class="btn-primary">导出到文件夹</button>
        </div>
        <p id="export-status" class="preview-export-status" aria-live="polite"></p>
      </div>
    </div>
  `;

  const contentEl = root.querySelector("#preview-content");
  const exportBar = root.querySelector("#preview-export");
  const copyBtn = root.querySelector("#export-copy-btn");
  const exportBtn = root.querySelector("#export-all-btn");
  const exportStatus = root.querySelector("#export-status");

  copyBtn.addEventListener("click", () => handleCopyText(exportStatus));
  exportBtn.addEventListener("click", () => handleExportAll(exportBtn, exportStatus));

  subscribe(() => {
    void renderPreview(contentEl);
    updateExportBar(exportBar);
  });

  void renderPreview(contentEl);
  updateExportBar(exportBar);
}

/** @param {HTMLElement} exportBar */
function updateExportBar(exportBar) {
  const copy = getExportCopy();
  exportBar.hidden = !hasExportableCopy(copy);
}

/**
 * @returns {object | null}
 */
function getExportCopy() {
  const titleEl = document.querySelector("#copy-title-input");
  const bodyEl = document.querySelector("#copy-body-input");
  const hashtagsEl = document.querySelector("#copy-hashtags-input");
  const summaryEl = document.querySelector("#copy-summary-input");
  const sectionsList = document.querySelector("#copy-sections-list");

  if (titleEl || bodyEl) {
    /** @type {Array<{ heading: string; content: string }>} */
    let sections = appState.copyDraft?.sections || [];
    if (sectionsList) {
      sections = [];
      sectionsList.querySelectorAll(".copy-section").forEach((row) => {
        const heading = row.querySelector(".section-heading-input")?.value.trim() || "";
        const content = row.querySelector(".section-content-input")?.value.trim() || "";
        if (heading || content) {
          sections.push({ heading, content });
        }
      });
    }

    return {
      title: titleEl?.value.trim() || "",
      summary: summaryEl?.value.trim() || appState.copyDraft?.summary || "",
      body: bodyEl?.value.trim() || "",
      sections,
      hashtags: hashtagsEl
        ? hashtagsEl.value.trim().split(/\s+/).filter(Boolean)
        : appState.copyDraft?.hashtags || [],
    };
  }

  return appState.copyDraft;
}

/**
 * @param {{ title?: string; body?: string }} copy
 */
function hasExportableCopy(copy) {
  if (!copy?.title?.trim()) {
    return false;
  }
  if (copy.body?.trim()) {
    return true;
  }
  if (Array.isArray(copy.sections) && copy.sections.some((s) => s.content?.trim())) {
    return true;
  }
  return false;
}

/** @param {HTMLElement} statusEl */
async function handleCopyText(statusEl) {
  if (!window.noteGen?.invoke) {
    statusEl.textContent = "请通过 Electron 启动应用";
    return;
  }

  const copy = getExportCopy();
  if (!hasExportableCopy(copy)) {
    statusEl.textContent = "请先生成或填写文案";
    return;
  }

  statusEl.textContent = "正在复制…";
  try {
    const result = await window.noteGen.invoke("export:copyText", { copy });
    statusEl.textContent = `文案已复制到剪贴板（${result.charCount} 字）`;
  } catch (error) {
    statusEl.textContent = `复制失败：${error.message}`;
  }
}

/**
 * @param {HTMLButtonElement} exportBtn
 * @param {HTMLElement} statusEl
 */
async function handleExportAll(exportBtn, statusEl) {
  if (!window.noteGen?.invoke) {
    statusEl.textContent = "请通过 Electron 启动应用";
    return;
  }

  const copy = getExportCopy();
  if (!hasExportableCopy(copy)) {
    statusEl.textContent = "请先生成或填写文案";
    return;
  }

  statusEl.textContent = "请选择导出位置…";
  exportBtn.disabled = true;

  try {
    const suggest = await window.noteGen.invoke("export:suggestFolderName", {
      copy,
      personaId: appState.personaId || undefined,
      workflowType: appState.workflowType,
      workspaceTitle: deriveWorkspaceTitle(),
    });

    const pick = await window.noteGen.invoke("export:pickFolder", {});
    if (pick.canceled) {
      statusEl.textContent = "已取消导出";
      return;
    }

    statusEl.textContent = "正在导出…";
    const result = await window.noteGen.invoke("export:saveToFolder", {
      parentPath: pick.folderPath,
      copy,
      images: appState.renderedImages,
      personaId: appState.personaId || undefined,
      workflowType: appState.workflowType,
      workspaceTitle: deriveWorkspaceTitle(),
      folderName: suggest.folderName,
    });

    const primaryFile = result.platform === "wechat" ? "note.md + note.html" : "note.txt";
    const imageNote = result.imageCount ? `、${result.imageCount} 张图片` : "";
    statusEl.textContent = `已导出到「${result.folderName}」（${primaryFile}${imageNote}）`;
    await window.noteGen.invoke("export:revealFolder", { folderPath: result.folderPath });
  } catch (error) {
    statusEl.textContent = `导出失败：${error.message}`;
  } finally {
    exportBtn.disabled = false;
  }
}

/** @type {number} */
let previewRenderGeneration = 0;

/** @param {HTMLElement} contentEl */
async function renderPreview(contentEl) {
  const generation = ++previewRenderGeneration;
  contentEl.classList.add("preview-fade");

  try {
    const copy = appState.copyDraft;
    const topic = appState.selectedTopic;
    const plan = appState.pagePlan;
    const images = appState.renderedImages;
    const pageAssets = appState.pageAssets || {};

    let html = "";

    if (!topic && !copy && images.length === 0 && !plan?.pages?.length) {
      html = `<p class="preview-empty">开始创作后，这里会实时显示笔记效果</p>`;
    } else {
      if (copy?.title || topic?.title) {
        html += `
          <div class="preview-cover">
            <p class="preview-cover-label">封面</p>
            <p class="preview-cover-title">${escapeHtml(copy?.title || topic?.title || "")}</p>
          </div>
        `;
      }

      if (copy?.summary) {
        html += `<p class="preview-summary">${escapeHtml(copy.summary)}</p>`;
      }

      if (copy?.body) {
        const excerpt = copy.body.slice(0, 120) + (copy.body.length > 120 ? "…" : "");
        html += `
          <div class="preview-copy">
            <p class="preview-copy-body">${escapeHtml(excerpt)}</p>
            ${
              copy.hashtags?.length
                ? `<p class="preview-hashtags">${copy.hashtags.map((t) => escapeHtml(t)).join(" ")}</p>`
                : ""
            }
          </div>
        `;
      }

      if (copy?.sections?.length) {
        html += `
          <div class="preview-sections">
            <p class="preview-structure-label">正文结构 · ${copy.sections.length} 节</p>
            <ul class="preview-structure-list">
              ${copy.sections
                .map(
                  (section) =>
                    `<li><span class="preview-page-role">§</span> ${escapeHtml(section.heading || "未命名小节")}</li>`
                )
                .join("")}
            </ul>
          </div>
        `;
      }

      if (plan?.pages?.length) {
        const pageItems = loadPageAssetPreviewItems(plan.pages, pageAssets);
        html += `
          <div class="preview-deck">
            <p class="preview-structure-label">配图预览 · ${plan.pages.length} 页</p>
            ${pageItems
              .map(
                (item) => `
              <article class="preview-deck-page">
                <p class="preview-deck-headline">
                  <span class="preview-page-role">${escapeHtml(item.role)}</span>
                  ${escapeHtml(item.headline)}
                </p>
                ${
                  item.absolutePath
                    ? `<img class="preview-deck-image" data-absolute-path="${escapeAttr(item.absolutePath)}" alt="${escapeHtml(item.headline)}" />`
                    : `<p class="preview-deck-placeholder">暂无配图</p>`
                }
                ${item.body ? `<p class="preview-deck-body">${escapeHtml(item.body.slice(0, 80))}${item.body.length > 80 ? "…" : ""}</p>` : ""}
              </article>
            `
              )
              .join("")}
          </div>
        `;
      }

      if (images.length > 0) {
        html += `
          <div class="preview-images">
            <p class="preview-images-label">卡片 · ${images.length} 张</p>
            <div class="preview-images-grid">
              ${images
                .map(
                  (item) => `
                <figure class="preview-image-item">
                  ${
                    item.absolutePath
                      ? `<img data-absolute-path="${escapeAttr(item.absolutePath)}" alt="${escapeHtml(item.id)}" />`
                      : `<p class="preview-image-missing">加载失败</p>`
                  }
                </figure>
              `
                )
                .join("")}
            </div>
          </div>
        `;
      }
    }

    if (generation !== previewRenderGeneration) {
      return;
    }
    contentEl.innerHTML = html;
    await hydratePreviewImages(contentEl);
    if (generation !== previewRenderGeneration) {
      return;
    }
  } catch (error) {
    if (generation !== previewRenderGeneration) {
      return;
    }
    contentEl.innerHTML = `<p class="preview-empty">预览加载失败：${escapeHtml(error.message)}</p>`;
  } finally {
    if (generation === previewRenderGeneration) {
      requestAnimationFrame(() => contentEl.classList.remove("preview-fade"));
    }
  }
}

/**
 * @param {Array<{ id: string; role: string; headline: string; body?: string }>} pages
 * @param {Record<string, { absolutePath?: string }>} pageAssets
 */
function loadPageAssetPreviewItems(pages, pageAssets) {
  return pages.map((page) => ({
    role: page.role,
    headline: page.headline || "",
    body: page.body || "",
    absolutePath: pageAssets[page.id]?.absolutePath || "",
  }));
}

/**
 * @param {HTMLElement} root
 */
async function hydratePreviewImages(root) {
  if (!window.noteGen?.invoke) {
    return;
  }
  const images = root.querySelectorAll("[data-absolute-path]");
  await Promise.all(
    Array.from(images).map(async (img) => {
      const absolutePath = img.getAttribute("data-absolute-path");
      if (!absolutePath || img.dataset.loaded === "1") {
        return;
      }
      try {
        img.src = await window.noteGen.invoke("images:previewDataUrl", { absolutePath });
        img.dataset.loaded = "1";
      } catch {
        const fallback = document.createElement("p");
        fallback.className = "preview-image-missing";
        fallback.textContent = "加载失败";
        img.replaceWith(fallback);
      }
    })
  );
}
