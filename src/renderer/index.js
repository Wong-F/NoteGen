import { mountApp } from "../components/appShell.js";

async function boot() {
  const root = document.getElementById("app");
  if (!root) {
    throw new Error("Missing #app root element");
  }

  mountApp(root);

  if (!window.noteGen?.invoke) {
    console.error("[noteGen] window.noteGen is unavailable — run via Electron (npm run dev)");
    return;
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
