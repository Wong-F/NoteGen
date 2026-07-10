/**
 * Global toast notifications: bottom-centered, stacking, auto-dismissing,
 * with an optional action button (e.g. "撤销"). For app-wide events;
 * in-place feedback stays in each panel's status line.
 */

const DEFAULT_DURATION_MS = 5000;

let containerEl = null;

function getContainer() {
  if (!containerEl || !containerEl.isConnected) {
    containerEl = document.createElement("div");
    containerEl.className = "toast-container";
    containerEl.setAttribute("role", "status");
    containerEl.setAttribute("aria-live", "polite");
    document.body.appendChild(containerEl);
  }
  return containerEl;
}

/**
 * @param {string} message
 * @param {{ actionLabel?: string; onAction?: () => void | Promise<void>; duration?: number }} [options]
 * @returns {{ dismiss: () => void }}
 */
export function showToast(message, options = {}) {
  const container = getContainer();
  const toast = document.createElement("div");
  toast.className = "toast";

  const text = document.createElement("span");
  text.className = "toast-message";
  text.textContent = message;
  toast.appendChild(text);

  let settled = false;
  const dismiss = () => {
    if (settled) {
      return;
    }
    settled = true;
    toast.classList.add("is-leaving");
    setTimeout(() => toast.remove(), 250);
  };

  if (options.actionLabel && options.onAction) {
    const actionBtn = document.createElement("button");
    actionBtn.type = "button";
    actionBtn.className = "toast-action";
    actionBtn.textContent = options.actionLabel;
    actionBtn.addEventListener("click", async () => {
      actionBtn.disabled = true;
      try {
        await options.onAction();
      } catch (error) {
        console.warn("[noteGen] toast action failed:", error);
        showToast(`操作失败：${error.message}`);
      }
      dismiss();
    });
    toast.appendChild(actionBtn);
  }

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  setTimeout(dismiss, options.duration ?? DEFAULT_DURATION_MS);

  return { dismiss };
}
