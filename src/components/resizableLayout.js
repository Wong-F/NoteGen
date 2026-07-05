const STORAGE_KEY = "notegen-panel-widths";
const SIDEBAR_COLLAPSED_KEY = "notegen-sidebar-collapsed";
const PREVIEW_COLLAPSED_KEY = "notegen-preview-collapsed";
const MIN_SIDEBAR = 180;
const MIN_PREVIEW = 200;
const MIN_CENTER = 400;
const COLLAPSED_STRIP = 48;

/**
 * @typedef {{ sidebar: number; preview: number }} PanelWidths
 */

/**
 * @returns {PanelWidths | null}
 */
function loadWidths() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (typeof parsed.sidebar === "number" && typeof parsed.preview === "number") {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * @param {PanelWidths} widths
 */
function saveWidths(widths) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} key
 * @returns {boolean}
 */
function loadCollapsed(key) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

/**
 * @param {string} key
 * @param {boolean} collapsed
 */
function saveCollapsed(key, collapsed) {
  try {
    localStorage.setItem(key, collapsed ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/**
 * Mount a three-column resizable layout with collapsible sidebar and preview.
 * @param {HTMLElement} container
 * @param {{ sidebar: HTMLElement; center: HTMLElement; preview: HTMLElement }} panels
 */
export function mountResizableLayout(container, panels) {
  container.innerHTML = `
    <div class="layout-sidebar" id="layout-sidebar">
      <button type="button" class="panel-collapse-btn panel-collapse-btn--sidebar"
        id="sidebar-collapse-btn" aria-label="收起侧边栏" title="收起侧边栏">
        <span class="panel-collapse-icon" aria-hidden="true">‹</span>
      </button>
      <div class="layout-panel-content" id="layout-sidebar-content"></div>
    </div>
    <div class="resize-handle" id="resize-left" role="separator" aria-orientation="vertical"
      aria-label="调整侧边栏宽度"></div>
    <div class="layout-center" id="layout-center"></div>
    <div class="resize-handle" id="resize-right" role="separator" aria-orientation="vertical"
      aria-label="调整预览栏宽度"></div>
    <div class="layout-preview" id="layout-preview">
      <button type="button" class="panel-collapse-btn panel-collapse-btn--preview"
        id="preview-collapse-btn" aria-label="收起预览" title="收起预览">
        <span class="panel-collapse-icon" aria-hidden="true">›</span>
      </button>
      <div class="layout-panel-content" id="layout-preview-content"></div>
    </div>
  `;

  const sidebarEl = container.querySelector("#layout-sidebar");
  const sidebarContent = container.querySelector("#layout-sidebar-content");
  const centerEl = container.querySelector("#layout-center");
  const previewEl = container.querySelector("#layout-preview");
  const previewContent = container.querySelector("#layout-preview-content");
  const leftHandle = container.querySelector("#resize-left");
  const rightHandle = container.querySelector("#resize-right");
  const sidebarCollapseBtn = container.querySelector("#sidebar-collapse-btn");
  const previewCollapseBtn = container.querySelector("#preview-collapse-btn");

  sidebarContent.appendChild(panels.sidebar);
  centerEl.appendChild(panels.center);
  previewContent.appendChild(panels.preview);

  let sidebarCollapsed = loadCollapsed(SIDEBAR_COLLAPSED_KEY);
  let previewCollapsed = loadCollapsed(PREVIEW_COLLAPSED_KEY);
  let savedSidebarWidth = loadWidths()?.sidebar || sidebarEl.offsetWidth || 240;
  let savedPreviewWidth = loadWidths()?.preview || previewEl.offsetWidth || 280;

  const saved = loadWidths();
  if (saved && !sidebarCollapsed) {
    sidebarEl.style.width = `${saved.sidebar}px`;
    savedSidebarWidth = saved.sidebar;
  }
  if (saved && !previewCollapsed) {
    previewEl.style.width = `${saved.preview}px`;
    savedPreviewWidth = saved.preview;
  }

  /**
   * @param {boolean} collapsed
   */
  function applySidebarCollapsed(collapsed) {
    sidebarCollapsed = collapsed;
    sidebarEl.classList.toggle("is-collapsed", collapsed);
    leftHandle.hidden = collapsed;
    sidebarCollapseBtn.setAttribute("aria-label", collapsed ? "展开侧边栏" : "收起侧边栏");
    sidebarCollapseBtn.title = collapsed ? "展开侧边栏" : "收起侧边栏";
    sidebarCollapseBtn.querySelector(".panel-collapse-icon").textContent = collapsed ? "›" : "‹";

    if (collapsed) {
      if (sidebarEl.offsetWidth > COLLAPSED_STRIP) {
        savedSidebarWidth = sidebarEl.offsetWidth;
      }
      sidebarEl.style.width = `${COLLAPSED_STRIP}px`;
    } else {
      sidebarEl.style.width = `${Math.max(MIN_SIDEBAR, savedSidebarWidth)}px`;
    }

    saveCollapsed(SIDEBAR_COLLAPSED_KEY, collapsed);
    if (!collapsed) {
      saveWidths({ sidebar: sidebarEl.offsetWidth, preview: previewEl.offsetWidth });
    }
  }

  /**
   * @param {boolean} collapsed
   */
  function applyPreviewCollapsed(collapsed) {
    previewCollapsed = collapsed;
    previewEl.classList.toggle("is-collapsed", collapsed);
    rightHandle.hidden = collapsed;
    previewCollapseBtn.setAttribute("aria-label", collapsed ? "展开预览" : "收起预览");
    previewCollapseBtn.title = collapsed ? "展开预览" : "收起预览";
    previewCollapseBtn.querySelector(".panel-collapse-icon").textContent = collapsed ? "‹" : "›";

    if (collapsed) {
      if (previewEl.offsetWidth > COLLAPSED_STRIP) {
        savedPreviewWidth = previewEl.offsetWidth;
      }
      previewEl.style.width = `${COLLAPSED_STRIP}px`;
    } else {
      previewEl.style.width = `${Math.max(MIN_PREVIEW, savedPreviewWidth)}px`;
    }

    saveCollapsed(PREVIEW_COLLAPSED_KEY, collapsed);
    if (!collapsed) {
      saveWidths({ sidebar: sidebarEl.offsetWidth, preview: previewEl.offsetWidth });
    }
  }

  applySidebarCollapsed(sidebarCollapsed);
  applyPreviewCollapsed(previewCollapsed);

  sidebarCollapseBtn.addEventListener("click", () => {
    applySidebarCollapsed(!sidebarCollapsed);
  });

  previewCollapseBtn.addEventListener("click", () => {
    applyPreviewCollapsed(!previewCollapsed);
  });

  /**
   * @param {MouseEvent} startEvent
   * @param {"left" | "right"} side
   */
  function startDrag(startEvent, side) {
    if ((side === "left" && sidebarCollapsed) || (side === "right" && previewCollapsed)) {
      return;
    }

    startEvent.preventDefault();
    const containerRect = container.getBoundingClientRect();
    const startX = startEvent.clientX;
    const startSidebar = sidebarEl.offsetWidth;
    const startPreview = previewEl.offsetWidth;

    document.body.classList.add("is-resizing");

    function onMove(e) {
      const dx = e.clientX - startX;
      const totalWidth = containerRect.width - leftHandle.offsetWidth - rightHandle.offsetWidth;

      if (side === "left") {
        const newSidebar = Math.max(MIN_SIDEBAR, Math.min(startSidebar + dx, totalWidth - MIN_CENTER - MIN_PREVIEW));
        sidebarEl.style.width = `${newSidebar}px`;
        savedSidebarWidth = newSidebar;
      } else {
        const newPreview = Math.max(MIN_PREVIEW, Math.min(startPreview - dx, totalWidth - MIN_CENTER - MIN_SIDEBAR));
        previewEl.style.width = `${newPreview}px`;
        savedPreviewWidth = newPreview;
      }
    }

    function onUp() {
      document.body.classList.remove("is-resizing");
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      saveWidths({ sidebar: sidebarEl.offsetWidth, preview: previewEl.offsetWidth });
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  leftHandle.addEventListener("mousedown", (e) => startDrag(e, "left"));
  rightHandle.addEventListener("mousedown", (e) => startDrag(e, "right"));
}
