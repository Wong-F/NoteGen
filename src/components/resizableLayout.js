const STORAGE_KEY = "notegen-panel-widths";
const MIN_SIDEBAR = 180;
const MIN_PREVIEW = 200;
const MIN_CENTER = 400;

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
 * Mount a three-column resizable layout.
 * @param {HTMLElement} container
 * @param {{ sidebar: HTMLElement; center: HTMLElement; preview: HTMLElement }} panels
 */
export function mountResizableLayout(container, panels) {
  container.innerHTML = `
    <div class="layout-sidebar" id="layout-sidebar"></div>
    <div class="resize-handle" id="resize-left" role="separator" aria-orientation="vertical"
      aria-label="调整侧边栏宽度"></div>
    <div class="layout-center" id="layout-center"></div>
    <div class="resize-handle" id="resize-right" role="separator" aria-orientation="vertical"
      aria-label="调整预览栏宽度"></div>
    <div class="layout-preview" id="layout-preview"></div>
  `;

  const sidebarEl = container.querySelector("#layout-sidebar");
  const centerEl = container.querySelector("#layout-center");
  const previewEl = container.querySelector("#layout-preview");
  const leftHandle = container.querySelector("#resize-left");
  const rightHandle = container.querySelector("#resize-right");

  sidebarEl.appendChild(panels.sidebar);
  centerEl.appendChild(panels.center);
  previewEl.appendChild(panels.preview);

  const saved = loadWidths();
  if (saved) {
    sidebarEl.style.width = `${saved.sidebar}px`;
    previewEl.style.width = `${saved.preview}px`;
  }

  /**
   * @param {MouseEvent} startEvent
   * @param {"left" | "right"} side
   */
  function startDrag(startEvent, side) {
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
      } else {
        const newPreview = Math.max(MIN_PREVIEW, Math.min(startPreview - dx, totalWidth - MIN_CENTER - MIN_SIDEBAR));
        previewEl.style.width = `${newPreview}px`;
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
