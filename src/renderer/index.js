import { mountApp } from "../components/appShell.js";

document.addEventListener("DOMContentLoaded", async () => {
  const root = document.getElementById("app");
  if (!root) {
    throw new Error("Missing #app root element");
  }

  mountApp(root);

  try {
    const health = await window.noteGen.invoke("health:ping");
    console.info("[noteGen]", health.message);
  } catch (error) {
    console.error("[noteGen] health check failed:", error);
  }
});
