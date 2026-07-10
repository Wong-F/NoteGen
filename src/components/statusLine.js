/**
 * Status-line rendering shared by the workflow panels.
 *
 * - Errors become actionable: AI config problems get an "打开设置" button
 *   (appShell listens for the app:openSettingsRequest event).
 * - In-flight AI work gets a "取消" button wired to the ai:cancel route.
 * - Success messages can be transient: they fade out after a few seconds
 *   unless newer status text has replaced them.
 */

import { describeAiError } from "../constants/errorText.js";

const TRANSIENT_MS = 5000;
let statusToken = 0;

/**
 * @param {HTMLElement} statusEl
 * @param {string} text
 * @param {{ action?: { label: string; onAction: () => void }; transient?: boolean }} [options]
 */
export function renderStatus(statusEl, text, options = {}) {
  const token = String(++statusToken);
  statusEl.dataset.statusToken = token;
  statusEl.textContent = text;

  if (options.action) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "status-action-btn";
    btn.textContent = options.action.label;
    btn.addEventListener("click", options.action.onAction);
    statusEl.append(" ", btn);
  }

  if (options.transient) {
    setTimeout(() => {
      if (statusEl.isConnected && statusEl.dataset.statusToken === token) {
        statusEl.textContent = "";
      }
    }, TRANSIENT_MS);
  }
}

/**
 * Render a failure with a friendly, actionable message.
 * @param {HTMLElement} statusEl
 * @param {string} prefix e.g. "选题生成失败"
 * @param {unknown} error
 */
export function renderErrorStatus(statusEl, prefix, error) {
  const described = describeAiError(error);
  const isCancelled = described.text === "已取消";
  const text = isCancelled ? described.text : `${prefix}：${described.text}`;
  renderStatus(statusEl, text, {
    transient: isCancelled,
    action:
      described.action === "settings"
        ? {
            label: "打开设置",
            onAction: () => document.dispatchEvent(new CustomEvent("app:openSettingsRequest")),
          }
        : undefined,
  });
}

/**
 * Render an in-progress message with a cancel button for the current AI call.
 * @param {HTMLElement} statusEl
 * @param {string} text e.g. "正在生成选题候选…"
 */
export function renderBusyStatus(statusEl, text) {
  renderStatus(statusEl, text, {
    action: {
      label: "取消",
      onAction: (event) => {
        const btn = event?.target instanceof HTMLButtonElement ? event.target : null;
        if (btn) {
          btn.disabled = true;
        }
        window.noteGen?.invoke?.("ai:cancel").catch(() => {});
      },
    },
  });
}
