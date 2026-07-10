/**
 * Report long-running work to the main process so it can show taskbar
 * progress and, when the window is unfocused, a system notification on
 * completion. Degrades to a plain call outside Electron.
 */

/**
 * @template T
 * @param {() => Promise<T>} fn
 * @param {{ success?: { title: string, body?: string }, failure?: { title: string, body?: string } }} [notify]
 * @returns {Promise<T>}
 */
export async function runLongTask(fn, notify = {}) {
  const invoke = window.noteGen?.invoke;
  if (!invoke) {
    return fn();
  }

  invoke("app:taskStarted").catch(() => {});
  let outcome;
  try {
    const result = await fn();
    outcome = notify.success;
    return result;
  } catch (error) {
    outcome = notify.failure;
    throw error;
  } finally {
    invoke("app:taskFinished", outcome ? { notify: outcome } : {}).catch(() => {});
  }
}
