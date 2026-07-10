import { escapeHtml, escapeAttr } from "./utils.js";
import {
  getPersonaIndex,
  getActivePersona,
  createPersona,
  savePersona,
  deletePersona,
  setActivePersona,
  clearActivePersona,
  refreshPersonaList,
} from "./personaStore.js";
import { createWorkspace } from "./workspaceStore.js";
import { appState } from "./appState.js";
import { getPersonaTemplate, TITLE_STYLE_OPTIONS } from "../constants/formDefaults.js";
import { showToast } from "./toast.js";
import { bindOverlayA11y } from "./overlayFocus.js";

const PLATFORM_OPTIONS = [
  { id: "xiaohongshu", label: "小红书" },
  { id: "wechat", label: "微信公众号" },
];

const HOOK_OPTIONS = TITLE_STYLE_OPTIONS;

/**
 * Mount persona management drawer.
 * @param {HTMLElement} root
 * @returns {{ open: (options?: { mode?: "list" | "create" | "edit"; personaId?: string }) => void; close: () => void }}
 */
export function mountPersonaPanel(root) {
  const overlay = document.createElement("div");
  overlay.className = "persona-overlay settings-overlay settings-overlay--left";
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="settings-drawer persona-drawer" role="dialog" aria-label="运营人设">
      <div class="settings-drawer-header">
        <h2 class="settings-drawer-title">运营人设</h2>
        <button type="button" class="btn-ghost persona-close-btn" aria-label="关闭">✕</button>
      </div>
      <div class="settings-drawer-body persona-drawer-body">
        <div id="persona-list-view">
          <p class="persona-hint">运营人设是<strong>可选</strong>的：可用于统一口吻与读者画像；不选择时也可直接在创作区自由创作。</p>
          <button type="button" id="persona-clear-btn" class="persona-clear-btn">不使用运营人设</button>
          <ul id="persona-list" class="persona-list"></ul>
          <button type="button" id="persona-add-btn" class="sidebar-new-btn">+ 新建运营人设</button>
          <button type="button" id="persona-create-workspace-btn" class="btn-secondary persona-create-workspace-btn" hidden>
            在此人设下新建创作
          </button>
        </div>
        <form id="persona-form-view" class="persona-form" hidden>
          <input type="hidden" id="persona-form-id" />
          <label for="persona-form-name">人设名称</label>
          <input id="persona-form-name" type="text" maxlength="30" placeholder="如：职场干货姐" required />
          <label for="persona-form-platform">发布平台</label>
          <select id="persona-form-platform"></select>
          <label for="persona-form-domain">主领域</label>
          <input id="persona-form-domain" type="text" maxlength="40" placeholder="如：职场效率、探店、育儿" />
          <label for="persona-form-secondary">副领域（逗号分隔，可选）</label>
          <input id="persona-form-secondary" type="text" placeholder="AI工具, 时间管理" />
          <label for="persona-form-reader">目标读者</label>
          <textarea id="persona-form-reader" rows="2" placeholder="写给谁看？如：25-35 岁想提升效率的白领"></textarea>
          <label for="persona-form-voice">口吻简述</label>
          <textarea id="persona-form-voice" rows="2" placeholder="如：干脆、有方法论，像资深同事分享"></textarea>
          <label for="persona-form-taboos">禁忌（逗号分隔，可选）</label>
          <input id="persona-form-taboos" type="text" placeholder="震惊体, 虚构数据" />
          <label for="persona-form-hook">默认标题风格</label>
          <select id="persona-form-hook"></select>
          <div class="persona-form-actions">
            <button type="button" id="persona-form-back" class="btn-secondary">返回</button>
            <button type="submit" id="persona-form-save" class="btn-primary">保存</button>
          </div>
          <p id="persona-form-status" class="settings-status" aria-live="polite"></p>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeBtn = overlay.querySelector(".persona-close-btn");
  const listView = overlay.querySelector("#persona-list-view");
  const formView = overlay.querySelector("#persona-form-view");
  const listEl = overlay.querySelector("#persona-list");
  const clearBtn = overlay.querySelector("#persona-clear-btn");
  const createWorkspaceBtn = overlay.querySelector("#persona-create-workspace-btn");
  const addBtn = overlay.querySelector("#persona-add-btn");
  const form = overlay.querySelector("#persona-form-view");
  const formId = overlay.querySelector("#persona-form-id");
  const formName = overlay.querySelector("#persona-form-name");
  const formPlatform = overlay.querySelector("#persona-form-platform");
  const formDomain = overlay.querySelector("#persona-form-domain");
  const formSecondary = overlay.querySelector("#persona-form-secondary");
  const formReader = overlay.querySelector("#persona-form-reader");
  const formVoice = overlay.querySelector("#persona-form-voice");
  const formTaboos = overlay.querySelector("#persona-form-taboos");
  const formHook = overlay.querySelector("#persona-form-hook");
  const formBack = overlay.querySelector("#persona-form-back");
  const formStatus = overlay.querySelector("#persona-form-status");

  formPlatform.innerHTML = PLATFORM_OPTIONS.map(
    (item) =>
      `<option value="${escapeAttr(item.id)}"${item.disabled ? " disabled" : ""}>${escapeHtml(item.label)}</option>`
  ).join("");

  formHook.innerHTML = HOOK_OPTIONS.map(
    (item) => `<option value="${item.level}">${escapeHtml(item.label)}</option>`
  ).join("");

  function renderList() {
    const personas = getPersonaIndex();
    if (!personas.length) {
      listEl.innerHTML = `<li class="persona-empty">还没有运营人设，先创建一个吧。</li>`;
      return;
    }

    listEl.innerHTML = personas
      .map((item) => {
        const active = appState.activePersonaId === item.id;
        const platformLabel =
          PLATFORM_OPTIONS.find((p) => p.id === item.platform)?.label || item.platform;
        return `
          <li class="persona-list-item${active ? " is-active" : ""}">
            <button type="button" class="persona-list-btn" data-persona-id="${escapeAttr(item.id)}">
              <span class="persona-list-name">${escapeHtml(item.name)}</span>
              <span class="persona-list-meta">${escapeHtml(platformLabel)}${item.primaryDomain ? ` · ${escapeHtml(item.primaryDomain)}` : ""}</span>
            </button>
            <div class="persona-list-actions">
              <button type="button" class="btn-ghost persona-edit-btn" data-persona-id="${escapeAttr(item.id)}">编辑</button>
              <button type="button" class="btn-ghost persona-delete-btn" data-persona-id="${escapeAttr(item.id)}">删除</button>
            </div>
          </li>
        `;
      })
      .join("");

    listEl.querySelectorAll(".persona-list-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-persona-id");
        if (!id) {
          return;
        }
        await setActivePersona(id);
        close();
      });
    });

    listEl.querySelectorAll(".persona-edit-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-persona-id");
        if (!id) {
          return;
        }
        await openForm(id);
      });
    });

    listEl.querySelectorAll(".persona-delete-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-persona-id");
        const item = personas.find((p) => p.id === id);
        if (!id) {
          return;
        }
        try {
          // Snapshot first: undo re-creates the persona from its fields
          // (deletion is only allowed with no linked workspaces, so the
          // new id breaks nothing).
          const snapshot = await window.noteGen.invoke("personas:get", { id });
          await deletePersona(id);
          renderList();
          showToast(`已删除人设「${item?.name || ""}」`, {
            actionLabel: "撤销",
            onAction: async () => {
              await createPersona(snapshot || {});
              renderList();
            },
          });
        } catch (error) {
          showToast(`删除失败：${error.message}`);
        }
      });
    });
  }

  function showList() {
    listView.hidden = false;
    formView.hidden = true;
    formStatus.textContent = "";
    createWorkspaceBtn.hidden = !appState.activePersonaId;
    renderList();
  }

  function applyPersonaFormDefaults(platform = "xiaohongshu") {
    const template = getPersonaTemplate(platform);
    formName.value = template.name;
    formPlatform.value = template.platform;
    formDomain.value = template.primaryDomain;
    formSecondary.value = template.secondaryDomains.join(", ");
    formReader.value = template.targetReader;
    formVoice.value = template.voiceSummary;
    formTaboos.value = template.taboos.join(", ");
    formHook.value = String(template.defaultHookLevel);
  }

  formPlatform.addEventListener("change", () => {
    if (!formId.value) {
      applyPersonaFormDefaults(formPlatform.value || "xiaohongshu");
    }
  });

  async function openForm(personaId) {
    listView.hidden = true;
    formView.hidden = false;
    formStatus.textContent = "";

    if (personaId) {
      const detail = await window.noteGen.invoke("personas:get", { id: personaId });
      formId.value = detail.id;
      formName.value = detail.name || "";
      formPlatform.value = detail.platform || "xiaohongshu";
      formDomain.value = detail.primaryDomain || "";
      formSecondary.value = (detail.secondaryDomains || []).join(", ");
      formReader.value = detail.targetReader || "";
      formVoice.value = detail.voiceSummary || "";
      formTaboos.value = (detail.taboos || []).join(", ");
      formHook.value = String(detail.defaultHookLevel || 2);
    } else {
      form.reset();
      formId.value = "";
      applyPersonaFormDefaults("xiaohongshu");
    }
    formName.focus();
  }

  const a11y = bindOverlayA11y(overlay, { close, initialFocus: () => closeBtn });

  function open(options = {}) {
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add("is-open"));
    a11y.onOpen();
    if (options.mode === "create") {
      openForm(null);
    } else if (options.mode === "edit" && options.personaId) {
      openForm(options.personaId);
    } else {
      showList();
    }
  }

  function close() {
    overlay.classList.remove("is-open");
    a11y.onClose();
    setTimeout(() => {
      overlay.hidden = true;
      showList();
    }, 200);
  }

  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      close();
    }
  });
  addBtn.addEventListener("click", () => openForm(null));
  formBack.addEventListener("click", showList);

  clearBtn.addEventListener("click", async () => {
    await clearActivePersona();
    showList();
    close();
  });

  createWorkspaceBtn.addEventListener("click", async () => {
    if (!appState.activePersonaId) {
      return;
    }
    close();
    await createWorkspace({ usePersona: true });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    formStatus.textContent = "保存中…";

    const payload = {
      name: formName.value.trim() || "未命名人设",
      platform: formPlatform.value || "xiaohongshu",
      primaryDomain: formDomain.value.trim(),
      secondaryDomains: formSecondary.value
        .split(/[,，、]/)
        .map((item) => item.trim())
        .filter(Boolean),
      targetReader: formReader.value.trim(),
      voiceSummary: formVoice.value.trim(),
      taboos: formTaboos.value
        .split(/[,，、]/)
        .map((item) => item.trim())
        .filter(Boolean),
      defaultHookLevel: Number(formHook.value) || 2,
    };

    try {
      if (formId.value) {
        await savePersona({ ...payload, id: formId.value });
      } else {
        await createPersona(payload);
      }
      formStatus.textContent = "已保存";
      showList();
    } catch (error) {
      formStatus.textContent = error.message || "保存失败";
    }
  });

  document.addEventListener("persona:list-updated", renderList);
  document.addEventListener("persona:activated", renderList);
  document.addEventListener("persona:cleared", () => {
    createWorkspaceBtn.hidden = true;
    renderList();
  });

  return { open, close };
}

/**
 * Build compact label for sidebar persona chip.
 * @returns {string}
 */
export function getPersonaSidebarLabel() {
  const persona = getActivePersona();
  if (!persona) {
    const count = getPersonaIndex().length;
    return count > 0 ? "选择运营人设（可选）" : "管理运营人设（可选）";
  }
  const platformLabel = PLATFORM_OPTIONS.find((p) => p.id === persona.platform)?.label || "";
  const domain = persona.primaryDomain ? ` · ${persona.primaryDomain}` : "";
  return `${persona.name}（${platformLabel}${domain}）`;
}
