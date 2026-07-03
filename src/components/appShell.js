import { mountResizableLayout } from "./resizableLayout.js";
import { mountSidebar } from "./sidebar.js";
import { mountWorkspace } from "./workspace.js";
import { mountPreviewPanel } from "./previewPanel.js";
import { mountSettingsPanel } from "./settingsPanel.js";

/**
 * Mount the AI Creative Workspace shell.
 * @param {HTMLElement} root
 */
export function mountApp(root) {
  root.innerHTML = `
    <header class="app-header">
      <div class="header-brand">
        <h1 class="header-logo">noteGen</h1>
      </div>
      <button id="settings-toggle" type="button" class="btn-ghost header-settings-btn"
        aria-label="设置">设置</button>
    </header>
    <div class="app-layout" id="app-layout"></div>
  `;

  const sidebarRoot = document.createElement("div");
  const centerRoot = document.createElement("div");
  const previewRoot = document.createElement("div");

  mountSidebar(sidebarRoot);
  mountWorkspace(centerRoot);
  mountPreviewPanel(previewRoot);

  const layoutEl = root.querySelector("#app-layout");
  mountResizableLayout(layoutEl, {
    sidebar: sidebarRoot,
    center: centerRoot,
    preview: previewRoot,
  });

  const settings = mountSettingsPanel(root);
  root.querySelector("#settings-toggle").addEventListener("click", () => settings.open());
}
