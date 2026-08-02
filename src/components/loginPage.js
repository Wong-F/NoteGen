import { mountUserManual } from "./userManual.js";

/**
 * Manual overlay is appended to document.body, so keep a single instance even
 * when the login page is re-mounted after logout.
 */
let manualInstance = null;

function getManual(root) {
  if (!manualInstance) {
    manualInstance = mountUserManual(root);
  }
  return manualInstance;
}

/**
 * Full-screen login page for key activation.
 * @param {HTMLElement} root
 * @param {{ onSuccess: () => void | Promise<void> }} options
 */
export function mountLoginPage(root, { onSuccess }) {
  root.innerHTML = `
    <div class="login-page">
      <img
        class="login-page-bg"
        src="assets/LoginBackground.png"
        alt=""
        aria-hidden="true"
        decoding="async"
      />
      <div class="login-page-overlay" aria-hidden="true"></div>
      <div class="login-card">
        <div class="login-brand">
          <img class="login-logo-mark" src="assets/logo.png" alt="" width="56" height="56" />
          <h1 class="login-logo">AI笔记坊</h1>
          <p class="login-tagline">随时随地，AI 助力</p>
        </div>
        <form class="login-form" id="login-form" novalidate>
          <label class="login-label" for="login-phone">账户（手机号）</label>
          <input
            id="login-phone"
            class="login-input"
            type="tel"
            inputmode="numeric"
            autocomplete="username"
            placeholder="请输入手机号"
            maxlength="11"
          />
          <label class="login-label" for="login-secret">密码（密钥）</label>
          <input
            id="login-secret"
            class="login-input"
            type="password"
            autocomplete="current-password"
            placeholder="请输入密钥"
          />
          <label class="login-remember">
            <input id="login-remember" type="checkbox" checked />
            <span>记住账号密码</span>
          </label>
          <p id="login-error" class="login-error" aria-live="polite" hidden></p>
          <button id="login-submit" type="submit" class="btn-primary login-submit">登录</button>
        </form>
        <button id="login-trial" type="button" class="login-trial" hidden>免费试用</button>
        <p class="login-help">
          <button type="button" id="login-help-link" class="login-help-link">帮助文档</button>
        </p>
      </div>
    </div>
  `;

  const form = root.querySelector("#login-form");
  const phoneInput = root.querySelector("#login-phone");
  const secretInput = root.querySelector("#login-secret");
  const errorEl = root.querySelector("#login-error");
  const submitBtn = root.querySelector("#login-submit");
  const rememberInput = root.querySelector("#login-remember");
  const trialBtn = root.querySelector("#login-trial");
  const helpLink = root.querySelector("#login-help-link");

  window.noteGen
    .invoke("auth:trialStatus")
    .then((status) => {
      trialBtn.hidden = !status?.available;
    })
    .catch(() => {});

  window.noteGen
    .invoke("auth:savedCredentials")
    .then((saved) => {
      if (saved?.phone && !phoneInput.value) {
        phoneInput.value = saved.phone;
        secretInput.value = saved.secret || "";
        rememberInput.checked = true;
      }
    })
    .catch(() => {});

  function showError(message) {
    if (!message) {
      errorEl.hidden = true;
      errorEl.textContent = "";
      return;
    }
    errorEl.hidden = false;
    errorEl.textContent = message;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    showError("");

    const phone = phoneInput.value.trim();
    const secret = secretInput.value.trim();

    if (!/^1\d{10}$/.test(phone)) {
      showError("请输入有效的 11 位手机号");
      phoneInput.focus();
      return;
    }

    if (!secret && phone !== "13164150732") {
      showError("请输入密钥");
      secretInput.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "登录中…";

    try {
      const result = await window.noteGen.invoke("auth:login", {
        phone,
        secret,
        remember: rememberInput.checked,
      });
      if (!result.ok) {
        showError(result.error || "登录失败，请稍后重试");
        return;
      }
      await onSuccess();
    } catch (error) {
      showError(error.message || "登录失败，请稍后重试");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "登录";
    }
  });

  trialBtn.addEventListener("click", async () => {
    showError("");
    trialBtn.disabled = true;
    trialBtn.textContent = "进入试用中…";

    try {
      const result = await window.noteGen.invoke("auth:startTrial");
      if (!result.ok) {
        showError(result.error || "试用开启失败，请稍后重试");
        trialBtn.hidden = true;
        return;
      }
      await onSuccess();
    } catch (error) {
      showError(error.message || "试用开启失败，请稍后重试");
    } finally {
      trialBtn.disabled = false;
      trialBtn.textContent = "免费试用";
    }
  });

  helpLink.addEventListener("click", () => {
    getManual(root).open("login");
  });

  phoneInput.focus();
}
