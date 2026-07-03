import { appState, subscribe } from "./appState.js";
import { escapeHtml } from "./utils.js";

/**
 * Mount live preview panel with export actions.
 * @param {HTMLElement} root
 */
export function mountPreviewPanel(root) {
  root.innerHTML = `
    <div class="preview-panel">
      <p class="preview-heading">预览</p>
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
    renderPreview(contentEl);
    updateExportBar(exportBar);
  });

  renderPreview(contentEl);
  updateExportBar(exportBar);
}

/** @param {HTMLElement} exportBar */
function updateExportBar(exportBar) {
  const copy = getExportCopy();
  exportBar.hidden = !hasExportableCopy(copy);
}

/**
 * @returns {{ title: string; body: string; hashtags: string[] } | null}
 */
function getExportCopy() {
  const titleEl = document.querySelector("#copy-title-input");
  const bodyEl = document.querySelector("#copy-body-input");
  const hashtagsEl = document.querySelector("#copy-hashtags-input");

  if (titleEl || bodyEl) {
    return {
      title: titleEl?.value.trim() || "",
      body: bodyEl?.value.trim() || "",
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
  return Boolean(copy?.title?.trim() || copy?.body?.trim());
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

  statusEl.textContent = "请选择导出文件夹…";
  exportBtn.disabled = true;

  try {
    const pick = await window.noteGen.invoke("export:pickFolder");
    if (pick.canceled) {
      statusEl.textContent = "已取消导出";
      return;
    }

    statusEl.textContent = "正在导出…";
    const result = await window.noteGen.invoke("export:saveToFolder", {
      folderPath: pick.folderPath,
      copy,
      images: appState.renderedImages,
    });

    const imageNote = result.imageCount ? `、${result.imageCount} 张图片` : "";
    statusEl.textContent = `已导出 note.txt${imageNote}`;
    await window.noteGen.invoke("export:revealFolder", { folderPath: result.folderPath });
  } catch (error) {
    statusEl.textContent = `导出失败：${error.message}`;
  } finally {
    exportBtn.disabled = false;
  }
}

/** @param {HTMLElement} contentEl */
async function renderPreview(contentEl) {
  contentEl.classList.add("preview-fade");

  const copy = appState.copyDraft;
  const topic = appState.selectedTopic;
  const plan = appState.pagePlan;
  const images = appState.renderedImages;

  let html = "";

  if (!topic && !copy && images.length === 0) {
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

    if (plan?.pages?.length) {
      html += `
        <div class="preview-structure">
          <p class="preview-structure-label">页面结构 · ${plan.pages.length} 页</p>
          <ul class="preview-structure-list">
            ${plan.pages
              .map(
                (page) =>
                  `<li><span class="preview-page-role">${escapeHtml(page.role)}</span> ${escapeHtml(page.headline)}</li>`
              )
              .join("")}
          </ul>
        </div>
      `;
    }

    if (images.length > 0) {
      const items = await loadPreviewImages(images);
      html += `
        <div class="preview-images">
          <p class="preview-images-label">卡片 · ${images.length} 张</p>
          <div class="preview-images-grid">
            ${items
              .map(
                (item) => `
              <figure class="preview-image-item">
                ${
                  item.dataUrl
                    ? `<img src="${item.dataUrl}" alt="${escapeHtml(item.id)}" />`
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

  contentEl.innerHTML = html;
  requestAnimationFrame(() => contentEl.classList.remove("preview-fade"));
}

/**
 * @param {Array<{ id: string; absolutePath: string }>} images
 */
async function loadPreviewImages(images) {
  return Promise.all(
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
}
