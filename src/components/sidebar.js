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



const SECTIONS = [

  { id: "idea", label: "选题" },

  { id: "writing", label: "文案" },

  { id: "images", label: "配图" },

];



/** @type {string} */

let searchQuery = "";



/** @type {Array<{ id: string; title: string }>} */

let filteredWorkspaces = [];



/**

 * Mount sidebar with workspace list + workflow navigation.

 * @param {HTMLElement} root

 * @param {{ openPersonaPanel?: () => void }} [options]

 */

export function mountSidebar(root, options = {}) {

  root.innerHTML = `

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

      if (!window.confirm(`确定删除「${title}」？此操作不可撤销。`)) {

        return;

      }

      const result = await deleteWorkspace(id);

      filteredWorkspaces = searchQuery.trim()

        ? await searchWorkspaces(searchQuery)

        : getWorkspaceIndex();

      if (!result.hasWorkspaces) {

        document.dispatchEvent(new CustomEvent("workspace:empty"));

      } else {

        document.dispatchEvent(new CustomEvent("workspace:activated"));

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


