/**
 * Turn raw IPC/AI errors into actionable Chinese messages (pure logic).
 * AiServiceError codes are lost across ipcRenderer.invoke, so mapping keys
 * off the stable English message fragments thrown by aiService.js.
 */

/**
 * Strip Electron's "Error invoking remote method 'x': SomeError: " prefix.
 * @param {string} message
 * @returns {string}
 */
export function cleanIpcErrorMessage(message) {
  if (typeof message !== "string") {
    return "";
  }
  return message
    .replace(/^Error invoking remote method '[^']+':\s*/, "")
    .replace(/^\w*Error:\s*/, "")
    .trim();
}

/**
 * @param {unknown} error
 * @returns {{ text: string; action?: "settings" }}
 */
export function describeAiError(error) {
  const message = cleanIpcErrorMessage(
    error && typeof error === "object" && "message" in error ? String(error.message) : String(error)
  );

  if (/is not configured/i.test(message)) {
    return { text: "尚未配置 AI 服务，请先在设置中填写服务地址与模型", action: "settings" };
  }
  if (/rejected the API key/i.test(message)) {
    return { text: "AI 密钥无效或已过期，请检查设置中的 API Key", action: "settings" };
  }
  if (/Cannot reach AI endpoint/i.test(message)) {
    return { text: "无法连接 AI 服务，请检查设置中的服务地址与网络", action: "settings" };
  }
  if (/timed out/i.test(message)) {
    return { text: "AI 响应超时，可稍后重试或换用更快的模型" };
  }
  if (/已取消/.test(message)) {
    return { text: "已取消" };
  }
  return { text: message || "发生未知错误" };
}
