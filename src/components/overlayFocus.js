/**
 * Overlay a11y trio: move focus in on open, close on Escape, and return
 * focus to the trigger element on close.
 */

/**
 * @param {HTMLElement} overlay hidden-toggled overlay root
 * @param {{ close: () => void; initialFocus: () => HTMLElement | null }} options
 * @returns {{ onOpen: () => void; onClose: () => void }} call from the panel's open()/close()
 */
export function bindOverlayA11y(overlay, options) {
  /** @type {HTMLElement | null} */
  let opener = null;

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !overlay.hidden && !event.defaultPrevented) {
      event.preventDefault();
      options.close();
    }
  });

  return {
    onOpen() {
      opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      requestAnimationFrame(() => options.initialFocus()?.focus());
    },
    onClose() {
      if (opener?.isConnected) {
        opener.focus();
      }
      opener = null;
    },
  };
}
