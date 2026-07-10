/**
 * Cursor-style inline AI rewrite.
 *
 * Select text inside an attached input/textarea (or a topic card) and a
 * floating "AI 改写" bubble appears; Ctrl+K opens the instruction box
 * directly. The selected fragment is rewritten in context via the
 * copy:rewriteSelection IPC route, previewed as old → new, then applied
 * in place (through execCommand so the native undo stack is preserved).
 *
 * Ctrl+K also works globally with no selection: it targets the focused
 * (or most recently used) field and generates new content at its caret
 * via the copy:insertAtCursor route.
 */

import { escapeHtml } from "./utils.js";

const MARK_OPEN = "<<<";
const MARK_CLOSE = ">>>";

let singleton = null;

/**
 * All rewrite-enabled fields, so a global Ctrl+K can find a target even
 * when focus sits elsewhere (inputs keep selection/caret after blur).
 * @type {Array<{ el: HTMLElement, buildRequest: () => object | null, buildInsertRequest: () => object }>}
 */
const attachedFields = [];
/** The field that most recently produced a selection. */
let lastSelectionEl = null;
/** The field that most recently had focus. */
let lastFocusedEl = null;

function rankedFields() {
  const candidates = attachedFields.filter((entry) => entry.el.isConnected);
  const rank = (entry) =>
    entry.el === document.activeElement
      ? 0
      : entry.el === lastFocusedEl
        ? 1
        : entry.el === lastSelectionEl
          ? 2
          : 3;
  return candidates.sort((a, b) => rank(a) - rank(b));
}

/** Find the attached field whose selection Ctrl+K should rewrite. */
function findSelectionRequest() {
  for (const entry of rankedFields()) {
    const request = entry.buildRequest();
    if (request) {
      return { entry, request };
    }
  }
  return null;
}

/** With no selection anywhere, Ctrl+K generates content at a field's caret. */
function findInsertRequest() {
  const [entry] = rankedFields();
  return entry ? { entry, request: entry.buildInsertRequest() } : null;
}

/** Lazily create the shared floating widget. */
export function getInlineRewrite() {
  if (!singleton) {
    singleton = createWidget();
  }
  return singleton;
}

function createWidget() {
  const pop = document.createElement("div");
  pop.className = "rewrite-pop";
  pop.hidden = true;
  document.body.appendChild(pop);

  /**
   * @type {{
   *   mode: "bubble" | "prompt" | "loading" | "preview";
   *   request: null | {
   *     fieldLabel: string;
   *     selection: string;
   *     fullText: string;
   *     getPayloadExtras: () => object;
   *     apply: (replacement: string) => void;
   *     isStale: () => boolean;
   *   };
   *   instruction: string;
   *   replacement: string;
   *   error: string;
   * }}
   */
  const state = { mode: "bubble", request: null, instruction: "", replacement: "", error: "" };

  function close() {
    pop.hidden = true;
    state.request = null;
    state.instruction = "";
    state.replacement = "";
    state.error = "";
  }

  function position(anchor) {
    // Keep the popup on-screen; prefer above the anchor point.
    const rect = pop.getBoundingClientRect();
    const x = Math.min(Math.max(anchor.x, 8), window.innerWidth - rect.width - 8);
    const y = Math.max(anchor.y - rect.height - 10, 8);
    pop.style.left = `${x}px`;
    pop.style.top = `${y}px`;
  }

  function render(anchor) {
    if (state.mode === "bubble") {
      pop.innerHTML = `
        <button type="button" class="rewrite-bubble-btn">✦ AI 改写
          <span class="rewrite-kbd">Ctrl K</span>
        </button>`;
      pop.querySelector(".rewrite-bubble-btn").addEventListener("mousedown", (e) => {
        // mousedown (not click) so the field selection is not collapsed first.
        e.preventDefault();
        toPrompt(anchor);
      });
    } else if (state.mode === "prompt") {
      const isInsert = state.request.kind === "insert";
      const hint = isInsert
        ? `插入：在「${escapeHtml(state.request.fieldLabel || "正文")}」光标处生成内容`
        : `改写：${escapeHtml(truncate(state.request.selection, 60))}`;
      const placeholder = isInsert
        ? "想写点什么？例：补一句开头 / 加一个转折"
        : "想怎么改？例：更口语一点 / 压缩到 15 字";
      pop.innerHTML = `
        <div class="rewrite-panel">
          <p class="rewrite-selection-hint">${hint}</p>
          <input type="text" class="rewrite-input"
            placeholder="${placeholder}"
            value="${escapeHtml(state.instruction)}" />
          ${state.error ? `<p class="rewrite-error">${escapeHtml(state.error)}</p>` : ""}
          <p class="rewrite-hint">Enter 提交 · Esc 取消</p>
        </div>`;
      const input = pop.querySelector(".rewrite-input");
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          submit(anchor, input.value);
        } else if (e.key === "Escape") {
          e.preventDefault();
          close();
        }
      });
      requestAnimationFrame(() => input.focus());
    } else if (state.mode === "loading") {
      pop.innerHTML = `
        <div class="rewrite-panel">
          <p class="rewrite-loading">✦ ${state.request.kind === "insert" ? "生成中" : "改写中"}…</p>
        </div>`;
    } else if (state.mode === "preview") {
      const oldLine =
        state.request.kind === "insert"
          ? ""
          : `<p class="rewrite-diff-old">${escapeHtml(truncate(state.request.selection, 160))}</p>`;
      pop.innerHTML = `
        <div class="rewrite-panel">
          ${oldLine}
          <p class="rewrite-diff-new">${escapeHtml(truncate(state.replacement, 400))}</p>
          <div class="rewrite-actions">
            <button type="button" class="btn-primary rewrite-apply-btn">采用</button>
            <button type="button" class="btn-secondary rewrite-retry-btn">重试</button>
            <button type="button" class="btn-ghost rewrite-discard-btn">放弃</button>
          </div>
        </div>`;
      pop.querySelector(".rewrite-apply-btn").addEventListener("click", () => {
        const req = state.request;
        if (req.isStale()) {
          state.mode = "prompt";
          state.error =
            req.kind === "insert" ? "内容已变化，请重新定位光标后再生成" : "内容已变化，请重新选中后再改写";
          render(anchor);
          position(anchor);
          return;
        }
        req.apply(state.replacement);
        close();
      });
      pop.querySelector(".rewrite-retry-btn").addEventListener("click", () => {
        state.mode = "prompt";
        render(anchor);
        position(anchor);
      });
      pop.querySelector(".rewrite-discard-btn").addEventListener("click", close);
    }
    pop.hidden = false;
    position(anchor);
  }

  function toPrompt(anchor) {
    state.mode = "prompt";
    state.error = "";
    render(anchor);
  }

  async function submit(anchor, instruction) {
    const trimmed = instruction.trim();
    if (!trimmed) {
      return;
    }
    state.instruction = trimmed;
    state.mode = "loading";
    render(anchor);

    if (!window.noteGen?.invoke) {
      state.mode = "prompt";
      state.error = "请通过 Electron 启动应用（npm run dev）";
      render(anchor);
      return;
    }

    const req = state.request;
    const isInsert = req.kind === "insert";
    try {
      const result = await window.noteGen.invoke(
        isInsert ? "copy:insertAtCursor" : "copy:rewriteSelection",
        {
          ...(isInsert ? {} : { selection: req.selection }),
          instruction: trimmed,
          fullText: req.fullText,
          fieldLabel: req.fieldLabel,
          ...req.getPayloadExtras(),
        }
      );
      state.replacement = result.replacement;
      state.mode = "preview";
    } catch (error) {
      state.mode = "prompt";
      state.error = `${isInsert ? "生成" : "改写"}失败：${error.message}`;
    }
    if (state.request !== req) {
      return; // closed (or replaced) while waiting
    }
    render(anchor);
  }

  /** Open the widget for a prepared request. */
  function open(anchor, request, { direct = false } = {}) {
    state.request = request;
    state.instruction = "";
    state.replacement = "";
    state.error = "";
    state.mode = direct ? "prompt" : "bubble";
    render(anchor);
  }

  /** Brief self-dismissing message when Ctrl+K has nothing to rewrite. */
  function showHint(message) {
    state.mode = "hint";
    state.request = null;
    pop.innerHTML = `
      <div class="rewrite-panel">
        <p class="rewrite-hint">${escapeHtml(message)}</p>
      </div>`;
    pop.hidden = false;
    position({ x: window.innerWidth / 2 - 110, y: 140 });
    setTimeout(() => {
      if (state.mode === "hint") {
        close();
      }
    }, 1800);
  }

  // Dismiss when interacting anywhere outside the popup (selection is gone
  // anyway). Use composedPath(): handlers inside the popup may re-render its
  // content first, so by the time this runs e.target can already be detached
  // and pop.contains(e.target) would wrongly report "outside".
  document.addEventListener("mousedown", (e) => {
    if (!pop.hidden && !e.composedPath().includes(pop)) {
      close();
    }
  });

  // Global Ctrl+K: works from anywhere, not only inside a focused field.
  // With a selection it rewrites; without one it generates content at the
  // target field's caret. Field-level handlers run first (target before
  // document) and preventDefault when they consume the shortcut.
  document.addEventListener("keydown", (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "k" || e.defaultPrevented) {
      return;
    }
    e.preventDefault();
    const found = findSelectionRequest() || findInsertRequest();
    if (found) {
      const rect = found.entry.el.getBoundingClientRect();
      open({ x: rect.left + 24, y: rect.top + 8 }, found.request, { direct: true });
    } else {
      showHint("当前界面没有可写入的字段");
    }
  });

  return { open, close, element: pop };
}

function truncate(text, max) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/**
 * Wire selection-rewrite onto a text input or textarea.
 * @param {HTMLInputElement | HTMLTextAreaElement} el
 * @param {{ fieldLabel: string; getPayloadExtras?: () => object }} options
 */
export function attachFieldRewrite(el, options) {
  const widget = getInlineRewrite();
  const getPayloadExtras = options.getPayloadExtras || (() => ({}));
  attachedFields.push({
    el,
    buildRequest: () => buildRequest(),
    buildInsertRequest: () => buildInsertRequest(),
  });
  el.addEventListener("focus", () => {
    lastFocusedEl = el;
  });

  function buildRequest() {
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start === end) {
      return null;
    }
    const value = el.value;
    const selection = value.slice(start, end);
    return {
      kind: "rewrite",
      fieldLabel: options.fieldLabel,
      selection,
      fullText: `${value.slice(0, start)}${MARK_OPEN}${selection}${MARK_CLOSE}${value.slice(end)}`,
      getPayloadExtras,
      isStale: () => !el.isConnected || el.value !== value,
      apply: (replacement) => {
        el.focus();
        el.setSelectionRange(start, end);
        // execCommand keeps the native undo stack and fires an input event,
        // so existing appState sync/save listeners run unchanged.
        document.execCommand("insertText", false, replacement);
      },
    };
  }

  /** Generate-at-caret request (inputs keep their caret after blur). */
  function buildInsertRequest() {
    const value = el.value;
    const caret = Math.min(el.selectionStart ?? value.length, value.length);
    return {
      kind: "insert",
      fieldLabel: options.fieldLabel,
      selection: "",
      fullText: `${value.slice(0, caret)}${MARK_OPEN}${MARK_CLOSE}${value.slice(caret)}`,
      getPayloadExtras,
      isStale: () => !el.isConnected || el.value !== value,
      apply: (replacement) => {
        el.focus();
        el.setSelectionRange(caret, caret);
        document.execCommand("insertText", false, replacement);
      },
    };
  }

  // Listen on document, not the field: selection drags often end with the
  // pointer released OUTSIDE the field, so the field itself never gets the
  // mouseup. The field keeps focus during the drag, which scopes the handler.
  const onDocMouseUp = (e) => {
    if (!el.isConnected) {
      document.removeEventListener("mouseup", onDocMouseUp);
      return;
    }
    if (e.button !== 0 || document.activeElement !== el) {
      return;
    }
    if (e.composedPath().includes(widget.element)) {
      return; // interacting with the popup itself
    }
    // Defer so the browser finalizes the selection first.
    setTimeout(() => {
      const request = buildRequest();
      if (request) {
        lastSelectionEl = el;
        widget.open({ x: e.clientX, y: e.clientY }, request);
      }
    }, 0);
  };
  document.addEventListener("mouseup", onDocMouseUp);

  el.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      // Selection → rewrite it; no selection → generate at the caret.
      const request = buildRequest() || buildInsertRequest();
      e.preventDefault();
      if (request.kind === "rewrite") {
        lastSelectionEl = el;
      }
      const rect = el.getBoundingClientRect();
      widget.open({ x: rect.left + 24, y: rect.top + 8 }, request, { direct: true });
    }
  });

  // Keyboard selections (Shift+arrows) get the bubble anchored to the field.
  el.addEventListener("keyup", (e) => {
    if (!e.shiftKey || !e.key.startsWith("Arrow")) {
      return;
    }
    const request = buildRequest();
    if (request) {
      lastSelectionEl = el;
      const rect = el.getBoundingClientRect();
      widget.open({ x: rect.left + 24, y: rect.top + 8 }, request);
    }
  });
}
