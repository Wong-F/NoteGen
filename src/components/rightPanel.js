import { mountPreviewPanel } from "./previewPanel.js";
import { mountChatPanel } from "./chatPanel.js";

const ACTIVE_TAB_KEY = "notegen-right-panel-active";

const TABS = [
  { id: "preview", label: "预览" },
  { id: "chat", label: "对话" },
];

/**
 * @returns {"preview" | "chat"}
 */
function loadActiveTab() {
  try {
    const saved = localStorage.getItem(ACTIVE_TAB_KEY);
    return saved === "chat" ? "chat" : "preview";
  } catch {
    return "preview";
  }
}

/**
 * @param {"preview" | "chat"} tabId
 */
function saveActiveTab(tabId) {
  try {
    localStorage.setItem(ACTIVE_TAB_KEY, tabId);
  } catch {
    /* ignore */
  }
}

/**
 * Mount right panel with a minimal preview / chat switcher.
 * @param {HTMLElement} root
 * @returns {{ openTab: (tabId: string) => void }}
 */
export function mountRightPanel(root) {
  root.className = "layout-panel-slot";
  root.innerHTML = `
    <div class="right-panel">
      <div class="right-panel-switch" role="tablist" aria-label="右侧面板">
        ${TABS.map(
          (tab) =>
            `<button type="button" class="right-panel-switch-btn" role="tab"
              data-tab="${tab.id}" aria-selected="false">${tab.label}</button>`
        ).join("")}
      </div>
      <div class="right-panel-body"></div>
    </div>
  `;

  const switchEl = root.querySelector(".right-panel-switch");
  const bodyEl = root.querySelector(".right-panel-body");

  /** @type {Record<string, HTMLElement>} */
  const panes = {};
  for (const tab of TABS) {
    const pane = document.createElement("div");
    pane.className = "right-panel-pane";
    pane.dataset.tab = tab.id;
    pane.hidden = true;
    bodyEl.appendChild(pane);
    panes[tab.id] = pane;
  }

  mountPreviewPanel(panes.preview);
  mountChatPanel(panes.chat);

  let activeTab = loadActiveTab();

  function setActiveTab(tabId) {
    if (!panes[tabId]) {
      return;
    }
    activeTab = tabId;
    saveActiveTab(tabId);

    switchEl.querySelectorAll(".right-panel-switch-btn").forEach((btn) => {
      const selected = btn.getAttribute("data-tab") === tabId;
      btn.classList.toggle("is-active", selected);
      btn.setAttribute("aria-selected", selected ? "true" : "false");
    });

    for (const tab of TABS) {
      panes[tab.id].hidden = tab.id !== tabId;
    }

    if (tabId === "chat") {
      requestAnimationFrame(() => {
        panes.chat.querySelector("#chat-input")?.focus();
      });
    }
  }

  switchEl.querySelectorAll(".right-panel-switch-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabId = btn.getAttribute("data-tab");
      if (tabId) {
        setActiveTab(tabId);
      }
    });
  });

  window.noteGen?.onMenuAction?.("app:showPanelTab", (payload) => {
    if (payload?.tab === "chat" || payload?.tab === "preview") {
      setActiveTab(payload.tab);
    }
  });

  setActiveTab(activeTab);
  return { openTab: setActiveTab };
}
