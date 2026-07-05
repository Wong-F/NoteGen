import { appState, subscribe, notify } from "./appState.js";
import { saveWorkspaceNow } from "./workspaceStore.js";
import { escapeHtml } from "./utils.js";

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

  function renderMessages() {
    const messages = appState.chatMessages || [];
    if (!messages.length) {
      messagesEl.innerHTML = `<p class="chat-empty">与 AI 自由对话，会参考当前创作与人设。</p>`;
      return;
    }

    messagesEl.innerHTML = messages
      .map(
        (message) => `
        <div class="chat-message chat-message--${escapeHtml(message.role)}">
          <div class="chat-message-body">${escapeHtml(message.content).replace(/\n/g, "<br />")}</div>
        </div>`
      )
      .join("");

    messagesEl.scrollTop = messagesEl.scrollHeight;
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
    statusEl.textContent = "思考中…";

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
      statusEl.textContent = `发送失败：${error.message}`;
    } finally {
      sending = false;
      sendBtn.disabled = false;
      sendBtn.classList.remove("is-loading");
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

  clearBtn.addEventListener("click", () => {
    if (!appState.chatMessages?.length) {
      return;
    }
    if (!window.confirm("确定清空当前创作的对话记录？")) {
      return;
    }
    appState.chatMessages = [];
    statusEl.textContent = "";
    saveWorkspaceNow();
    notify();
  });

  subscribe(renderMessages);
  document.addEventListener("workspace:activated", renderMessages);
  document.addEventListener("workspace:hydrating", renderMessages);
  renderMessages();
}
