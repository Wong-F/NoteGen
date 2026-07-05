import { mountResizableLayout } from "./resizableLayout.js";

import { mountSidebar } from "./sidebar.js";

import { mountWorkspace } from "./workspace.js";

import { mountPreviewPanel } from "./previewPanel.js";

import { mountSettingsPanel } from "./settingsPanel.js";

import { mountPersonaPanel } from "./personaPanel.js";

import { initWorkspaceStore, createWorkspace } from "./workspaceStore.js";
import { initPersonaStore } from "./personaStore.js";
import { appState, subscribe } from "./appState.js";
import { maybeStartWelcomeTour } from "./onboardingTour.js";
import { mountUserManual } from "./userManual.js";



/**

 * Mount the AI Creative Workspace shell.

 * @param {HTMLElement} root

 */

export function mountApp(root, options = {}) {

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



  const personaPanel = mountPersonaPanel(root);

  mountSidebar(sidebarRoot, { openPersonaPanel: (opts) => personaPanel.open(opts) });

  mountWorkspace(centerRoot);

  mountPreviewPanel(previewRoot);



  const layoutEl = root.querySelector("#app-layout");

  mountResizableLayout(layoutEl, {

    sidebar: sidebarRoot,

    center: centerRoot,

    preview: previewRoot,

  });



  const userManual = mountUserManual(root);
  const settings = mountSettingsPanel(root, {
    onLogout: options.onLogout,
    openManual: () => userManual.open(),
  });

  root.querySelector("#settings-toggle").addEventListener("click", () => settings.open());

  window.noteGen?.onMenuAction?.("app:openManual", () => userManual.open());

  bootWorkspaces(centerRoot).then(() => maybeStartWelcomeTour());
}



/**

 * @param {HTMLElement} centerRoot

 */

async function bootWorkspaces(centerRoot) {

  const emptyEl = document.createElement("div");

  emptyEl.className = "workspace-empty-state";

  emptyEl.id = "workspace-empty-state";

  emptyEl.hidden = true;

  emptyEl.innerHTML = `

    <div class="workspace-empty-inner">

      <h2 class="workspace-empty-title">开始你的第一个创作</h2>

      <p class="workspace-empty-desc">

        生成选题、撰写文案、制作配图——<br />

        一切进度都会自动保存。运营人设可选，用于多账号口吻统一。

      </p>

      <button type="button" id="empty-new-workspace-btn" class="btn-primary">新建创作</button>

    </div>

  `;

  centerRoot.appendChild(emptyEl);



  const updateEmptyState = () => {

    const inner = centerRoot.querySelector("#workspace-inner");

    const showEmpty = !appState.workspaceReady;

    emptyEl.hidden = !showEmpty;

    if (inner) {

      inner.hidden = showEmpty;

    }

  };



  document.addEventListener("workspace:activated", updateEmptyState);
  document.addEventListener("workspace:empty", updateEmptyState);
  subscribe(updateEmptyState);



  emptyEl.querySelector("#empty-new-workspace-btn").addEventListener("click", async () => {
    await createWorkspace();
  });



  if (window.noteGen?.invoke) {

    await initPersonaStore();
    await initWorkspaceStore();

    document.dispatchEvent(

      new CustomEvent(appState.workspaceReady ? "workspace:activated" : "workspace:empty")

    );

  } else {

    document.dispatchEvent(new CustomEvent("workspace:empty"));

  }

}
