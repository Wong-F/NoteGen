import { replayWelcomeTour } from "./onboardingTour.js";
import { THEMES, getStoredTheme, setTheme } from "./theme.js";
import { bindOverlayA11y } from "./overlayFocus.js";
import { escapeHtml, escapeAttr } from "./utils.js";

/**
 * Mount settings drawer (triggered from sidebar user bar).
 * @param {HTMLElement} root — app root for overlay placement
 * @param {{ onLogout?: () => void; openManual?: () => void }} [options]
 * @returns {{ open: () => void; close: () => void }}
 */
export function mountSettingsPanel(root, options = {}) {
  const overlay = document.createElement("div");
  overlay.className = "settings-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="settings-drawer" role="dialog" aria-label="设置">
      <div class="settings-drawer-header">
        <h2 class="settings-drawer-title">设置</h2>
        <button type="button" class="btn-ghost settings-close-btn" aria-label="关闭">✕</button>
      </div>
      <div class="settings-drawer-body">
        <section class="settings-group">
          <h3 class="settings-group-title">外观</h3>
          <div class="theme-options" role="radiogroup" aria-label="界面主题">
            ${THEMES.map(
              (theme) => `
              <button type="button" class="theme-option" role="radio"
                data-theme-id="${theme.id}" aria-checked="false">
                <span class="theme-option-swatch theme-option-swatch--${theme.id}"></span>
                <span class="theme-option-name">${theme.name}</span>
                <span class="theme-option-desc">${theme.desc}</span>
              </button>`
            ).join("")}
          </div>
        </section>
        <section class="settings-group">
          <h3 class="settings-group-title">帮助</h3>
          <p class="settings-help-text">需要详细说明时，可打开使用手册；也可重新观看新手教程。</p>
          <div class="settings-help-actions">
            <button id="settings-open-manual-btn" type="button" class="btn-secondary">
              打开使用手册
            </button>
            <button id="settings-replay-tour-btn" type="button" class="btn-secondary">
              重新观看新手教程
            </button>
          </div>
        </section>
        <section class="settings-group">
          <h3 class="settings-group-title">账户</h3>
          <div id="settings-account-card" class="settings-account-card">
            <p class="settings-account-value">加载中…</p>
          </div>
          <button id="settings-logout-btn" type="button" class="btn-secondary settings-logout-btn">
            退出登录
          </button>
        </section>
        <section class="settings-group">
          <h3 class="settings-group-title">AI 文案服务</h3>
          <p class="settings-help-text">
            默认对接 DeepSeek（
            <a href="https://platform.deepseek.com" target="_blank" rel="noopener">platform.deepseek.com</a>
            ）。想白嫖可用 Agnes（永久免费）：
            <a href="https://www.agnes-ai.cn/" target="_blank" rel="noopener">www.agnes-ai.cn</a>
            ，服务地址填 <code>https://api.agnes-ai.cn/v1</code>。填好后点「测试文案连接」即可从列表中选用模型；其他 OpenAI 兼容服务商同理，详见使用手册。
          </p>
          <label for="ai-base-url">服务地址</label>
          <input id="ai-base-url" type="text" placeholder="https://api.deepseek.com/v1" />
          <label for="ai-model">模型</label>
          <input id="ai-model" type="text" list="ai-model-options"
            placeholder="deepseek-v4-flash" autocomplete="off" />
          <datalist id="ai-model-options"></datalist>
          <div id="ai-model-picker" class="settings-model-picker" hidden></div>
          <label for="ai-api-key">API Key（本地 Ollama 可留空）</label>
          <input id="ai-api-key" type="password" placeholder="sk-..." />
        </section>
        <section class="settings-group">
          <h3 class="settings-group-title">图像 API</h3>
          <label for="image-base-url">服务地址</label>
          <input id="image-base-url" type="text" placeholder="https://api.openai.com/v1" />
          <label for="image-model">模型</label>
          <input id="image-model" type="text" placeholder="dall-e-3" />
          <label for="image-api-key">API Key</label>
          <input id="image-api-key" type="password" placeholder="sk-..." />
        </section>
        <section class="settings-group">
          <h3 class="settings-group-title">图库 API</h3>
          <p class="settings-help-text">
            用于配图步骤的「图库搜图」，至少配置一家即可。Pexels：
            <a href="https://www.pexels.com/api/" target="_blank" rel="noopener">pexels.com/api</a>
            ；Unsplash：
            <a href="https://unsplash.com/developers" target="_blank" rel="noopener">unsplash.com/developers</a>
            （填 Access Key）。填好后点「测试图库连接」，详见使用手册。
          </p>
          <label for="pexels-api-key">Pexels API Key</label>
          <input id="pexels-api-key" type="password" placeholder="pexels.com/api" />
          <label for="unsplash-access-key">Unsplash Access Key</label>
          <input id="unsplash-access-key" type="password" placeholder="unsplash.com/developers" />
        </section>
        <div class="settings-actions">
          <button id="ai-test-btn" type="button" class="btn-secondary">测试文案连接</button>
          <button id="image-test-btn" type="button" class="btn-secondary">测试图像连接</button>
          <button id="stock-test-btn" type="button" class="btn-secondary">测试图库连接</button>
          <button id="settings-save-btn" type="button" class="btn-primary">保存</button>
        </div>
        <p id="settings-status" class="settings-status" aria-live="polite"></p>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const drawer = overlay.querySelector(".settings-drawer");
  const closeBtn = overlay.querySelector(".settings-close-btn");
  const accountCard = overlay.querySelector("#settings-account-card");
  const logoutBtn = overlay.querySelector("#settings-logout-btn");
  const baseUrlInput = overlay.querySelector("#ai-base-url");
  const modelInput = overlay.querySelector("#ai-model");
  const modelOptions = overlay.querySelector("#ai-model-options");
  const modelPicker = overlay.querySelector("#ai-model-picker");
  const apiKeyInput = overlay.querySelector("#ai-api-key");
  const testBtn = overlay.querySelector("#ai-test-btn");
  const imageTestBtn = overlay.querySelector("#image-test-btn");
  const stockTestBtn = overlay.querySelector("#stock-test-btn");
  const saveBtn = overlay.querySelector("#settings-save-btn");
  const replayTourBtn = overlay.querySelector("#settings-replay-tour-btn");
  const openManualBtn = overlay.querySelector("#settings-open-manual-btn");
  const statusEl = overlay.querySelector("#settings-status");
  const themeButtons = [...overlay.querySelectorAll(".theme-option")];

  /** @type {string[]} */
  let discoveredModels = [];
  /** @type {string | null} */
  let modelValueBeforeFocus = null;

  /**
   * Chromium filters <datalist> by the current input value, so a filled model
   * field only shows 1 matching option. Clear on focus to reveal the full list.
   */
  modelInput.addEventListener("focus", () => {
    if (modelOptions.children.length === 0) {
      return;
    }
    modelValueBeforeFocus = modelInput.value;
    modelInput.value = "";
  });

  modelInput.addEventListener("blur", () => {
    if (modelValueBeforeFocus != null && !modelInput.value.trim()) {
      modelInput.value = modelValueBeforeFocus;
    }
    modelValueBeforeFocus = null;
    syncModelPickerActive();
  });

  modelInput.addEventListener("input", () => {
    syncModelPickerActive();
  });

  modelPicker.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-model-id]");
    if (!(chip instanceof HTMLElement)) {
      return;
    }
    const modelId = chip.dataset.modelId || "";
    if (!modelId) {
      return;
    }
    modelInput.value = modelId;
    modelValueBeforeFocus = null;
    syncModelPickerActive();
  });

  /**
   * @param {string[]} models
   */
  function renderDiscoveredModels(models) {
    discoveredModels = models.filter((id) => typeof id === "string" && id.trim());
    modelOptions.innerHTML = discoveredModels
      .map((id) => `<option value="${escapeAttr(id)}"></option>`)
      .join("");

    if (discoveredModels.length === 0) {
      modelPicker.hidden = true;
      modelPicker.innerHTML = "";
      return;
    }

    modelPicker.hidden = false;
    modelPicker.innerHTML = `
      <p class="settings-model-picker-label">已发现模型（点击选用）</p>
      <div class="settings-model-chips">
        ${discoveredModels
          .map(
            (id) =>
              `<button type="button" class="settings-model-chip" data-model-id="${escapeAttr(id)}">${escapeHtml(id)}</button>`
          )
          .join("")}
      </div>
    `;
    syncModelPickerActive();
  }

  function syncModelPickerActive() {
    const current = modelInput.value.trim();
    for (const chip of modelPicker.querySelectorAll("[data-model-id]")) {
      chip.classList.toggle("is-active", chip.dataset.modelId === current);
    }
  }

  function renderThemeButtons(activeId) {
    for (const btn of themeButtons) {
      const isActive = btn.dataset.themeId === activeId;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-checked", String(isActive));
    }
  }

  renderThemeButtons(getStoredTheme());

  for (const btn of themeButtons) {
    btn.addEventListener("click", () => {
      const applied = setTheme(btn.dataset.themeId);
      renderThemeButtons(applied);
    });
  }

  function renderAccountCard(profile) {
    if (!profile) {
      accountCard.innerHTML = `<p class="settings-account-value">未登录</p>`;
      logoutBtn.hidden = true;
      return;
    }

    const statusClass = profile.subscriptionStatus === "active" ? "is-active" : "is-expired";
    accountCard.innerHTML = `
      <div class="settings-account-row">
        <span class="settings-account-label">账户</span>
        <span class="settings-account-value">${profile.phone}</span>
      </div>
      <div class="settings-account-row">
        <span class="settings-account-label">订阅状态</span>
        <span class="settings-account-value">
          <span class="settings-account-status ${statusClass}">${profile.subscriptionLabel}</span>
        </span>
      </div>
      <div class="settings-account-row">
        <span class="settings-account-label">AI 能量点</span>
        <span class="settings-account-value">${profile.aipoint}</span>
      </div>
      <div class="settings-account-row">
        <span class="settings-account-label">激活时间</span>
        <span class="settings-account-value">${profile.activeDate || "—"}</span>
      </div>
      <div class="settings-account-row">
        <span class="settings-account-label">到期时间</span>
        <span class="settings-account-value">${profile.expireDate || "—"}</span>
      </div>
      ${profile.devBypass ? `<div class="settings-account-row"><span class="settings-account-label">模式</span><span class="settings-account-value">开发后门</span></div>` : ""}
    `;
    logoutBtn.hidden = false;
  }

  const a11y = bindOverlayA11y(overlay, { close, initialFocus: () => closeBtn });

  function open() {
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add("is-open"));
    a11y.onOpen();
    loadSettings();
  }

  function close() {
    overlay.classList.remove("is-open");
    a11y.onClose();
    setTimeout(() => {
      overlay.hidden = true;
    }, 200);
  }

  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      close();
    }
  });

  logoutBtn.addEventListener("click", async () => {
    try {
      await window.noteGen.invoke("auth:logout");
      close();
      options.onLogout?.();
    } catch (error) {
      statusEl.textContent = `退出失败：${error.message}`;
    }
  });

  async function loadSettings() {
    try {
      const [settings, authResult] = await Promise.all([
        window.noteGen.invoke("settings:get"),
        window.noteGen.invoke("auth:session"),
      ]);

      renderAccountCard(authResult?.profile || null);

      baseUrlInput.value = settings.ai.baseUrl;
      modelInput.value = settings.ai.model;
      apiKeyInput.value = settings.ai.apiKey;
      overlay.querySelector("#image-base-url").value = settings.image?.baseUrl || "";
      overlay.querySelector("#image-model").value = settings.image?.model || "";
      overlay.querySelector("#image-api-key").value = settings.image?.apiKey || "";
      overlay.querySelector("#pexels-api-key").value = settings.stock?.pexelsApiKey || "";
      overlay.querySelector("#unsplash-access-key").value = settings.stock?.unsplashAccessKey || "";
    } catch (error) {
      statusEl.textContent = `读取设置失败：${error.message}`;
    }
  }

  function collectSettings() {
    return {
      ai: {
        baseUrl: baseUrlInput.value.trim(),
        model: modelInput.value.trim(),
        apiKey: apiKeyInput.value.trim(),
      },
      image: {
        baseUrl: overlay.querySelector("#image-base-url").value.trim(),
        model: overlay.querySelector("#image-model").value.trim(),
        apiKey: overlay.querySelector("#image-api-key").value.trim(),
      },
      stock: {
        pexelsApiKey: overlay.querySelector("#pexels-api-key").value.trim(),
        unsplashAccessKey: overlay.querySelector("#unsplash-access-key").value.trim(),
      },
    };
  }

  testBtn.addEventListener("click", async () => {
    statusEl.textContent = "文案服务连接测试中…";
    try {
      await window.noteGen.invoke("settings:save", collectSettings());
      const result = await window.noteGen.invoke("ai:testConnection");
      if (result.ok) {
        renderDiscoveredModels(result.models || []);
        statusEl.textContent = discoveredModels.length
          ? `连接成功，发现 ${discoveredModels.length} 个模型`
          : "连接成功，但无可用模型";
      } else {
        statusEl.textContent = `连接失败（${result.code}）：${result.message}`;
      }
    } catch (error) {
      statusEl.textContent = `连接失败：${error.message}`;
    }
  });

  imageTestBtn.addEventListener("click", async () => {
    statusEl.textContent = "图像 API 连接测试中（会发起一次最小生图请求）…";
    try {
      await window.noteGen.invoke("settings:save", collectSettings());
      const result = await window.noteGen.invoke("image:testConnection");
      if (result.ok) {
        statusEl.textContent = `图像 API 连接成功（模型：${result.model}）`;
      } else {
        statusEl.textContent = `图像 API 连接失败（${result.code}）：${result.message}`;
      }
    } catch (error) {
      statusEl.textContent = `图像 API 连接失败：${error.message}`;
    }
  });

  stockTestBtn.addEventListener("click", async () => {
    statusEl.textContent = "图库连接测试中…";
    try {
      await window.noteGen.invoke("settings:save", collectSettings());
      const result = await window.noteGen.invoke("stock:testConnection");
      if (result.code === "CONFIG") {
        statusEl.textContent = result.message;
        return;
      }
      const label = { pexels: "Pexels", unsplash: "Unsplash" };
      const parts = result.providers.map((item) => {
        const name = label[item.id] || item.id;
        if (!item.configured) {
          return `${name}：未配置`;
        }
        return item.ok ? `${name}：${item.message}` : `${name} 失败：${item.message}`;
      });
      statusEl.textContent = result.ok
        ? `图库连接成功 — ${parts.join("；")}`
        : `图库连接失败 — ${parts.join("；")}`;
    } catch (error) {
      statusEl.textContent = `图库连接失败：${error.message}`;
    }
  });

  saveBtn.addEventListener("click", async () => {
    try {
      await window.noteGen.invoke("settings:save", collectSettings());
      statusEl.textContent = "设置已保存";
    } catch (error) {
      statusEl.textContent = `保存失败：${error.message}`;
    }
  });

  replayTourBtn.addEventListener("click", async () => {
    try {
      await replayWelcomeTour({ closeSettings: close });
    } catch (error) {
      statusEl.textContent = `无法启动教程：${error.message}`;
    }
  });

  openManualBtn.addEventListener("click", () => {
    close();
    options.openManual?.();
  });

  return { open, close };
}
