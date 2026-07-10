import {

  appState,

  subscribe,

  setActiveSection,

  isSectionDone,

  getSectionSummary,

} from "./appState.js";

import {

  getWorkspaceIndex,

  createWorkspace,

  switchWorkspace,

  deleteWorkspace,

  renameWorkspace,

  searchWorkspaces,

  refreshWorkspaceList,

  rebindActiveWorkspacePersona,

} from "./workspaceStore.js";

import { getPersonaSidebarLabel } from "./personaPanel.js";

import { escapeHtml, escapeAttr } from "./utils.js";

import { showToast } from "./toast.js";



const SECTIONS = [

  { id: "idea", label: "选题" },

  { id: "writing", label: "文案" },

  { id: "images", label: "配图" },

];

/**
 * @param {string} phone
 * @returns {string}
 */
function formatSidebarUserName(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length >= 7) {
    return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
  }
  return phone || "用户";
}

/**
 * @param {string} phone
 * @returns {string}
 */
function getAvatarInitial(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.slice(-1) || "U";
}



/** @type {string} */

let searchQuery = "";



/** @type {Array<{ id: string; title: string }>} */

let filteredWorkspaces = [];



/**

 * Mount sidebar with workspace list + workflow navigation.

 * @param {HTMLElement} root

 * @param {{ openPersonaPanel?: () => void; openSettings?: () => void }} [options]

 */

export function mountSidebar(root, options = {}) {

  root.innerHTML = `

    <div class="sidebar-shell">

      <nav class="sidebar-nav" aria-label="创作导航">

      <section class="sidebar-section sidebar-persona-section">

        <p class="sidebar-heading">运营人设</p>

        <button type="button" id="persona-selector-btn" class="persona-selector-btn">

          <span id="persona-selector-label" class="persona-selector-label">加载中…</span>

          <span class="persona-selector-chevron" aria-hidden="true">▾</span>

        </button>

      </section>



      <section class="sidebar-section">

        <p class="sidebar-heading">创作</p>

        <input type="search" id="workspace-search" class="sidebar-search"

          placeholder="搜索创作…" autocomplete="off" aria-label="搜索创作" />

        <button type="button" id="new-workspace-btn" class="sidebar-new-btn">+ 新建创作</button>

        <button type="button" id="new-workspace-persona-btn" class="sidebar-new-persona-btn" hidden>

          + 用人设新建

        </button>

      </section>



      <section class="sidebar-section" id="sidebar-recent-section">

        <p class="sidebar-heading">最近</p>

        <ul class="sidebar-list" id="workspace-list"></ul>

      </section>



      <section class="sidebar-section sidebar-workflow" id="workflow-section" hidden>

        <p class="sidebar-heading">当前流程</p>

        <button type="button" id="workspace-bind-btn" class="sidebar-rebind-btn" hidden>

          绑定当前运营人设

        </button>

        <button type="button" id="workspace-rebind-btn" class="sidebar-rebind-btn" hidden>

          改绑到当前运营人设

        </button>

        <button type="button" id="workspace-unbind-btn" class="sidebar-rebind-btn" hidden>

          解除人设绑定

        </button>

        <ul class="sidebar-list" id="sidebar-list"></ul>

      </section>

      </nav>

      <footer class="sidebar-user-bar">
        <div class="sidebar-user-info">
          <span class="sidebar-user-avatar" id="sidebar-user-avatar" aria-hidden="true">—</span>
          <div class="sidebar-user-text">
            <span class="sidebar-user-name" id="sidebar-user-name">加载中…</span>
            <span class="sidebar-user-plan" id="sidebar-user-plan"></span>
          </div>
        </div>
        <button type="button" id="settings-toggle" class="sidebar-settings-btn" aria-label="设置" title="设置">
          <svg class="sidebar-settings-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z" stroke="currentColor" stroke-width="1.75"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </footer>

    </div>

  `;



  const searchInput = root.querySelector("#workspace-search");

  const newBtn = root.querySelector("#new-workspace-btn");

  const newPersonaBtn = root.querySelector("#new-workspace-persona-btn");

  const personaBtn = root.querySelector("#persona-selector-btn");

  const personaLabel = root.querySelector("#persona-selector-label");

  const bindBtn = root.querySelector("#workspace-bind-btn");

  const rebindBtn = root.querySelector("#workspace-rebind-btn");

  const unbindBtn = root.querySelector("#workspace-unbind-btn");

  const workspaceList = root.querySelector("#workspace-list");

  const workflowSection = root.querySelector("#workflow-section");

  const workflowList = root.querySelector("#sidebar-list");



  searchInput.addEventListener("input", async () => {

    searchQuery = searchInput.value;

    if (searchQuery.trim()) {

      filteredWorkspaces = await searchWorkspaces(searchQuery);

    } else {

      filteredWorkspaces = getWorkspaceIndex();

    }

    renderWorkspaceList(workspaceList);

  });



  newBtn.addEventListener("click", async () => {

    await createWorkspace();

    searchInput.value = "";

    searchQuery = "";

    filteredWorkspaces = getWorkspaceIndex();

  });



  newPersonaBtn.addEventListener("click", async () => {

    await createWorkspace({ usePersona: true });

    searchInput.value = "";

    searchQuery = "";

    filteredWorkspaces = getWorkspaceIndex();

  });



  personaBtn.addEventListener("click", () => {

    options.openPersonaPanel?.();

  });



  bindBtn.addEventListener("click", async () => {

    if (!appState.activePersonaId) {

      return;

    }

    await rebindActiveWorkspacePersona(appState.activePersonaId);

  });



  rebindBtn.addEventListener("click", async () => {

    if (!appState.activePersonaId) {

      return;

    }

    await rebindActiveWorkspacePersona(appState.activePersonaId);

  });



  unbindBtn.addEventListener("click", async () => {

    await rebindActiveWorkspacePersona(null);

  });



  function renderPersonaChip() {

    personaLabel.textContent = getPersonaSidebarLabel();

    newPersonaBtn.hidden = !appState.activePersonaId;

  }



  function render() {

    renderPersonaChip();

    if (!searchQuery.trim()) {

      filteredWorkspaces = getWorkspaceIndex();

    }

    renderWorkspaceList(workspaceList);

    renderWorkflow(workflowList, workflowSection, { bindBtn, rebindBtn, unbindBtn });

  }



  subscribe(render);

  render();



  document.addEventListener("workspace:activated", () => {
    workflowSection.hidden = !appState.workspaceReady;
    render();
  });

  document.addEventListener("workspace:list-updated", () => {
    if (!searchQuery.trim()) {
      filteredWorkspaces = getWorkspaceIndex();
    }
    renderWorkspaceList(workspaceList);
    renderWorkflow(workflowList, workflowSection, { bindBtn, rebindBtn, unbindBtn });
  });

  document.addEventListener("persona:activated", render);
  document.addEventListener("persona:empty", render);

  const settingsBtn = root.querySelector("#settings-toggle");
  const userNameEl = root.querySelector("#sidebar-user-name");
  const userPlanEl = root.querySelector("#sidebar-user-plan");
  const userAvatarEl = root.querySelector("#sidebar-user-avatar");

  settingsBtn?.addEventListener("click", () => {
    options.openSettings?.();
  });

  async function loadUserBar() {
    if (!window.noteGen?.invoke) {
      userNameEl.textContent = "访客";
      userPlanEl.textContent = "开发模式";
      userAvatarEl.textContent = "访";
      return;
    }

    try {
      const authResult = await window.noteGen.invoke("auth:session");
      const profile = authResult?.profile;
      if (!profile) {
        userNameEl.textContent = "未登录";
        userPlanEl.textContent = "";
        userAvatarEl.textContent = "?";
        return;
      }

      userNameEl.textContent = formatSidebarUserName(profile.phone);
      userPlanEl.textContent = profile.devBypass ? "开发模式" : profile.subscriptionLabel;
      userAvatarEl.textContent = getAvatarInitial(profile.phone);
    } catch {
      userNameEl.textContent = "—";
      userPlanEl.textContent = "";
      userAvatarEl.textContent = "?";
    }
  }

  loadUserBar();
}



/** @param {HTMLElement} listEl */

function renderWorkspaceList(listEl) {

  if (!filteredWorkspaces.length) {

    listEl.innerHTML = searchQuery.trim()

      ? `<li class="sidebar-empty-hint">没有匹配的创作</li>`

      : "";

    return;

  }



  listEl.innerHTML = filteredWorkspaces

    .map((item) => {

      const active = appState.activeWorkspaceId === item.id;

      return `

        <li class="sidebar-workspace-item">

          <button type="button"

            class="sidebar-item sidebar-workspace-btn${active ? " is-active" : ""}"

            data-workspace-id="${escapeAttr(item.id)}"

            aria-current="${active ? "true" : "false"}">

            <span class="sidebar-workspace-dot" aria-hidden="true">•</span>

            <span class="sidebar-workspace-title">${escapeHtml(item.title)}</span>

          </button>

          <button type="button" class="sidebar-delete-btn"

            data-workspace-id="${escapeAttr(item.id)}"

            aria-label="删除 ${escapeAttr(item.title)}"

            title="删除">×</button>

        </li>

      `;

    })

    .join("");



  listEl.querySelectorAll(".sidebar-workspace-btn").forEach((btn) => {

    btn.addEventListener("click", async () => {

      const id = btn.getAttribute("data-workspace-id");

      if (!id || id === appState.activeWorkspaceId) {

        return;

      }

      await switchWorkspace(id);
    });



    btn.addEventListener("dblclick", (event) => {

      event.preventDefault();

      const id = btn.getAttribute("data-workspace-id");

      if (!id || id !== appState.activeWorkspaceId) {

        return;

      }

      startTitleEdit(btn, id);

    });

  });



  listEl.querySelectorAll(".sidebar-delete-btn").forEach((btn) => {

    btn.addEventListener("click", async (event) => {

      event.stopPropagation();

      const id = btn.getAttribute("data-workspace-id");

      const item = filteredWorkspaces.find((ws) => ws.id === id);

      const title = item?.title || "此创作";

      // Snapshot first so the deletion can be undone losslessly:
      // workspaces:save re-creates the file under the same id.
      const snapshot = await window.noteGen.invoke("workspaces:get", { id });

      const result = await deleteWorkspace(id);

      filteredWorkspaces = searchQuery.trim()

        ? await searchWorkspaces(searchQuery)

        : getWorkspaceIndex();

      if (!result.hasWorkspaces) {

        document.dispatchEvent(new CustomEvent("workspace:empty"));

      } else {

        document.dispatchEvent(new CustomEvent("workspace:activated"));

      }

      if (snapshot) {
        showToast(`已删除「${title}」`, {
          actionLabel: "撤销",
          onAction: async () => {
            await window.noteGen.invoke("workspaces:save", snapshot);
            await refreshWorkspaceList();
            await switchWorkspace(snapshot.id);
            document.dispatchEvent(new CustomEvent("workspace:activated"));
          },
        });
      }

    });

  });

}



/**

 * @param {HTMLButtonElement} btn

 * @param {string} id

 */

function startTitleEdit(btn, id) {

  const titleEl = btn.querySelector(".sidebar-workspace-title");

  if (!titleEl) {

    return;

  }

  const current = titleEl.textContent || "";

  const input = document.createElement("input");

  input.type = "text";

  input.className = "sidebar-title-input";

  input.value = current;

  input.maxLength = 40;

  titleEl.replaceWith(input);

  input.focus();

  input.select();



  const finish = async () => {

    const next = input.value.trim() || "未命名创作";

    if (id === appState.activeWorkspaceId) {

      await renameWorkspace(next);

    } else if (window.noteGen?.invoke) {

      const ws = await window.noteGen.invoke("workspaces:get", { id });

      if (ws) {

        await window.noteGen.invoke("workspaces:save", { ...ws, title: next });

        await refreshWorkspaceList();

      }

    }

    document.dispatchEvent(new CustomEvent("workspace:activated"));

  };



  input.addEventListener("blur", finish);

  input.addEventListener("keydown", (event) => {

    if (event.key === "Enter") {

      input.blur();

    }

    if (event.key === "Escape") {

      input.value = current;

      input.blur();

    }

  });

}



/**

 * @param {HTMLElement} listEl

 * @param {HTMLElement} sectionEl

 * @param {{ bindBtn?: HTMLButtonElement; rebindBtn?: HTMLButtonElement; unbindBtn?: HTMLButtonElement }} [personaActions]

 */

function renderWorkflow(listEl, sectionEl, personaActions = {}) {

  const { bindBtn, rebindBtn, unbindBtn } = personaActions;

  const show = appState.workspaceReady;

  sectionEl.hidden = !show;

  if (!show) {

    return;

  }



  const boundPersonaId = appState.personaId;

  const contextPersonaId = appState.activePersonaId;



  if (bindBtn) {

    bindBtn.hidden = !(contextPersonaId && !boundPersonaId);

  }

  if (rebindBtn) {

    rebindBtn.hidden = !(

      contextPersonaId && boundPersonaId && boundPersonaId !== contextPersonaId

    );

  }

  if (unbindBtn) {

    unbindBtn.hidden = !boundPersonaId;

  }



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

          </span>

          ${summary ? `<span class="sidebar-item-summary">${escapeHtml(summary)}</span>` : ""}

        </button>

      </li>

    `;

  }).join("");



  listEl.querySelectorAll(".sidebar-item[data-section]").forEach((btn) => {

    btn.addEventListener("click", () => {

      const section = btn.getAttribute("data-section");

      if (section === "idea" || section === "writing" || section === "images") {

        setActiveSection(section);

      }

    });

  });

}


