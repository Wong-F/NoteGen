import { mountApp } from "../components/appShell.js";
import { mountLoginPage } from "../components/loginPage.js";

function getRoot() {
  const root = document.getElementById("app");
  if (!root) {
    throw new Error("Missing #app root element");
  }
  return root;
}

function showLogin() {
  const root = getRoot();
  root.innerHTML = "";
  mountLoginPage(root, { onSuccess: showApp });
}

function showApp() {
  const root = getRoot();
  root.innerHTML = "";
  mountApp(root, { onLogout: showLogin });
}

async function boot() {
  if (!window.noteGen?.invoke) {
    console.error("[noteGen] window.noteGen is unavailable — run via Electron (npm run dev)");
    showApp();
    return;
  }

  try {
    const sessionResult = await window.noteGen.invoke("auth:session");
    if (sessionResult.renewed) {
      console.info("[noteGen] auth session renewed");
    }
    if (sessionResult.error) {
      console.warn("[noteGen] auth session expired:", sessionResult.error);
    }

    if (sessionResult?.session) {
      showApp();
    } else {
      showLogin();
    }
  } catch (error) {
    console.error("[noteGen] auth check failed:", error);
    showLogin();
  }

  try {
    const health = await window.noteGen.invoke("health:ping");
    console.info("[noteGen]", health.message);
  } catch (error) {
    console.error("[noteGen] health check failed:", error);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
