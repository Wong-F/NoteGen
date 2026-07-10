import { appState, subscribe, notify } from "./appState.js";
import { saveWorkspaceNow } from "./workspaceStore.js";
import { escapeHtml } from "./utils.js";
import { renderBusyStatus, renderErrorStatus } from "./statusLine.js";
import { showToast } from "./toast.js";

/**
 * Group flat messages into user-led turns for sticky header layout.
 * @param {Array<{ role: string; content: string }>} messages
 */
function groupIntoTurns(messages) {
  /** @type {Array<{ user: object | null; replies: object[] }>} */
  const turns = [];
  let current = null;

  for (const message of messages) {
    if (message.role === "user") {
      if (current) {
        turns.push(current);
      }
      current = { user: message, replies: [] };
    } else if (current) {
      current.replies.push(message);
    } else {
      turns.push({ user: null, replies: [message] });
    }
  }
  if (current) {
    turns.push(current);
  }
  return turns;
}

/**
 * @param {{ role: string; content: string }} message
 */
function renderMessageBody(message) {
  return escapeHtml(message.content).replace(/\n/g, "<br />");
}

/**
 * Mount free-form AI chat panel.
 * @param {HTMLElement} root
 */
export function mountChatPanel(root) {
  root.innerHTML = `
    <div class="chat-panel">
      <div id="chat-messages" class="chat-messages" role="log" aria-live="polite"></div>
      <form id="chat-form" class="chat-form">
        <textarea id="chat-input" class="chat-input field-borderless" rows="3"
          placeholder="向 AI 提问…" aria-label="对话输入"></textarea>
        <div class="chat-form-actions">
          <button type="button" id="chat-clear-btn" class="btn-ghost chat-clear-btn">清空</button>
          <button type="submit" id="chat-send-btn" class="btn-primary">发送</button>
        </div>
      </form>
      <p id="chat-status" class="chat-status" aria-live="polite"></p>
    </div>
  `;

  const messagesEl = root.querySelector("#chat-messages");
  const form = root.querySelector("#chat-form");
  const inputEl = root.querySelector("#chat-input");
  const clearBtn = root.querySelector("#chat-clear-btn");
  const sendBtn = root.querySelector("#chat-send-btn");
  const statusEl = root.querySelector("#chat-status");

  let sending = false;
  let shouldStickToBottom = true;
  /** @type {IntersectionObserver | null} */
  let stickyObserver = null;

  function isNearBottom() {
    const distance = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight;
    return distance < 48;
  }

  function updateStickyStates() {
    const containerTop = messagesEl.getBoundingClientRect().top;
    for (const el of messagesEl.querySelectorAll(".chat-message--user")) {
      const sentinel = el.querySelector(".chat-sticky-sentinel");
      if (!sentinel) {
        continue;
      }
      const isStuck = sentinel.getBoundingClientRect().top < containerTop;
      el.classList.toggle("is-stuck", isStuck);
    }
  }

  function observeStickySentinels() {
    if (!stickyObserver) {
      stickyObserver = new IntersectionObserver(() => updateStickyStates(), {
        root: messagesEl,
        threshold: [0, 1],
      });
      messagesEl.addEventListener("scroll", updateStickyStates, { passive: true });
    }

    stickyObserver.disconnect();
    for (const sentinel of messagesEl.querySelectorAll(".chat-sticky-sentinel")) {
      stickyObserver.observe(sentinel);
    }
    updateStickyStates();
  }

  function renderMessages() {
    const messages = appState.chatMessages || [];
    if (!messages.length) {
      messagesEl.innerHTML = `<p class="chat-empty">与 AI 自由对话，会参考当前创作与人设。</p>`;
      return;
    }

    const turns = groupIntoTurns(messages);
    messagesEl.innerHTML = turns
      .map((turn, turnIndex) => {
        const userBlock = turn.user
          ? `
        <div class="chat-message chat-message--user" style="z-index:${turnIndex + 1}">
          <div class="chat-sticky-sentinel" aria-hidden="true"></div>
          <div class="chat-message-body">${renderMessageBody(turn.user)}</div>
        </div>`
          : "";
        const replies = turn.replies
          .map(
            (reply) => `
        <div class="chat-message chat-message--assistant">
          <div class="chat-message-body">${renderMessageBody(reply)}</div>
        </div>`
          )
          .join("");
        return `<section class="chat-turn">${userBlock}${replies}</section>`;
      })
      .join("");

    observeStickySentinels();

    if (shouldStickToBottom) {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }

  function buildContextPayload() {
    const copy = appState.copyDraft;
    return {
      personaId: appState.personaId || appState.activePersonaId || undefined,
      workflowType: appState.workflowType,
      workspaceTitle: appState.workspaceTitle,
      ideaInput: appState.ideaInput,
      selectedTopic: appState.selectedTopic,
      copyDraft: copy
        ? {
            title: copy.title,
            summary: copy.summary,
            body: copy.body,
          }
        : null,
    };
  }

  async function handleSend() {
    const text = inputEl.value.trim();
    if (!text || sending) {
      return;
    }
    if (!window.noteGen?.invoke) {
      statusEl.textContent = "请通过 Electron 启动应用（npm run dev）";
      return;
    }

    sending = true;
    sendBtn.disabled = true;
    sendBtn.classList.add("is-loading");
    renderBusyStatus(statusEl, "思考中…");
    shouldStickToBottom = true;

    const userMessage = { role: "user", content: text };
    appState.chatMessages = [...(appState.chatMessages || []), userMessage];
    inputEl.value = "";
    renderMessages();
    notify();

    try {
      const result = await window.noteGen.invoke("chat:send", {
        messages: appState.chatMessages.map((item) => ({
          role: item.role,
          content: item.content,
        })),
        context: buildContextPayload(),
      });
      appState.chatMessages = [
        ...appState.chatMessages,
        { role: "assistant", content: result.reply || "" },
      ];
      statusEl.textContent = "";
      saveWorkspaceNow();
      notify();
    } catch (error) {
      renderErrorStatus(statusEl, "发送失败", error);
    } finally {
      sending = false;
      sendBtn.disabled = false;
      sendBtn.classList.remove("is-loading");
      shouldStickToBottom = true;
      renderMessages();
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    handleSend();
  });

  inputEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  });

  messagesEl.addEventListener("scroll", () => {
    shouldStickToBottom = isNearBottom();
  }, { passive: true });

  clearBtn.addEventListener("click", () => {
    if (!appState.chatMessages?.length) {
      return;
    }
    const cleared = appState.chatMessages;
    const workspaceId = appState.activeWorkspaceId;
    appState.chatMessages = [];
    statusEl.textContent = "";
    shouldStickToBottom = true;
    saveWorkspaceNow();
    notify();
    showToast("已清空对话记录", {
      actionLabel: "撤销",
      onAction: () => {
        if (appState.activeWorkspaceId !== workspaceId) {
          throw new Error("已切换创作，无法恢复该对话");
        }
        appState.chatMessages = cleared;
        saveWorkspaceNow();
        notify();
      },
    });
  });

  subscribe(renderMessages);
  document.addEventListener("workspace:activated", renderMessages);
  document.addEventListener("workspace:hydrating", renderMessages);
  renderMessages();
}
