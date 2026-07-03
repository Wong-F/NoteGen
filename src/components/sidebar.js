import {
  appState,
  subscribe,
  setActiveSection,
  isSectionDone,
  getSectionSummary,
} from "./appState.js";

const SECTIONS = [
  { id: "idea", label: "Idea", labelZh: "选题" },
  { id: "writing", label: "Writing", labelZh: "文案" },
  { id: "images", label: "Images", labelZh: "配图" },
];

/**
 * Mount sidebar navigation.
 * @param {HTMLElement} root
 */
export function mountSidebar(root) {
  root.innerHTML = `
    <nav class="sidebar-nav" aria-label="创作流程">
      <p class="sidebar-heading">工作流</p>
      <ul class="sidebar-list" id="sidebar-list"></ul>
    </nav>
  `;

  const listEl = root.querySelector("#sidebar-list");

  function render() {
    listEl.innerHTML = SECTIONS.map((section) => {
      const done = isSectionDone(section.id);
      const active = appState.activeSection === section.id;
      const summary = done ? getSectionSummary(section.id) : "";
      const statusIcon = done ? "✓" : "";

      return `
        <li>
          <button type="button"
            class="sidebar-item${active ? " is-active" : ""}${done ? " is-done" : ""}"
            data-section="${section.id}"
            aria-current="${active ? "step" : "false"}">
            <span class="sidebar-item-label">
              ${statusIcon ? `<span class="sidebar-check">${statusIcon}</span>` : ""}
              <span class="sidebar-item-name">${section.label}</span>
              <span class="sidebar-item-zh">${section.labelZh}</span>
            </span>
            ${summary ? `<span class="sidebar-item-summary">${escapeHtml(summary)}</span>` : ""}
          </button>
        </li>
      `;
    }).join("");

    listEl.querySelectorAll(".sidebar-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const section = btn.getAttribute("data-section");
        if (section === "idea" || section === "writing" || section === "images") {
          setActiveSection(section);
        }
      });
    });
  }

  subscribe(render);
  render();
}

/** @param {string} text */
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
