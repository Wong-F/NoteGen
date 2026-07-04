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

} from "./workspaceStore.js";

import { escapeHtml, escapeAttr } from "./utils.js";



const SECTIONS = [

  { id: "idea", label: "Idea", labelZh: "选题" },

  { id: "writing", label: "Writing", labelZh: "文案" },

  { id: "images", label: "Images", labelZh: "配图" },

];



/** @type {string} */

let searchQuery = "";



/** @type {Array<{ id: string; title: string }>} */

let filteredWorkspaces = [];



/**

 * Mount sidebar with workspace list + workflow navigation.

 * @param {HTMLElement} root

 */

export function mountSidebar(root) {

  root.innerHTML = `

    <nav class="sidebar-nav" aria-label="创作导航">

      <section class="sidebar-section">

        <p class="sidebar-heading">Workspace</p>

        <input type="search" id="workspace-search" class="sidebar-search"

          placeholder="搜索创作…" autocomplete="off" aria-label="搜索创作" />

        <button type="button" id="new-workspace-btn" class="sidebar-new-btn">+ New Workspace</button>

      </section>



      <section class="sidebar-section">

        <p class="sidebar-heading">Recent</p>

        <ul class="sidebar-list" id="workspace-list"></ul>

      </section>



      <section class="sidebar-section sidebar-workflow" id="workflow-section" hidden>

        <p class="sidebar-heading">Current Workflow</p>

        <ul class="sidebar-list" id="sidebar-list"></ul>

      </section>

    </nav>

  `;



  const searchInput = root.querySelector("#workspace-search");

  const newBtn = root.querySelector("#new-workspace-btn");

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



  function render() {

    if (!searchQuery.trim()) {

      filteredWorkspaces = getWorkspaceIndex();

    }

    renderWorkspaceList(workspaceList);

    renderWorkflow(workflowList, workflowSection);

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
    renderWorkflow(workflowList, workflowSection);
  });
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

 */

function renderWorkflow(listEl, sectionEl) {

  const show = appState.workspaceReady;

  sectionEl.hidden = !show;

  if (!show) {

    return;

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

            <span class="sidebar-item-zh">${section.labelZh}</span>

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


