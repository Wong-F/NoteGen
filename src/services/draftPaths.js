/**
 * Draft workspace paths under Electron userData.
 */

const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

/**
 * @param {string} userDataDir
 * @param {string} [sessionId]
 */
function resolveSessionId(sessionId) {
  return sessionId?.trim() || randomUUID();
}

/**
 * @param {string} userDataDir
 * @param {string} sessionId
 */
function getDraftDir(userDataDir, sessionId) {
  return path.join(userDataDir, "drafts", sessionId);
}

/**
 * @param {string} userDataDir
 * @param {string} sessionId
 */
function getAssetsDir(userDataDir, sessionId) {
  return path.join(getDraftDir(userDataDir, sessionId), "assets");
}

/**
 * @param {string} userDataDir
 * @param {string} sessionId
 */
function getOutputDir(userDataDir, sessionId) {
  return path.join(getDraftDir(userDataDir, sessionId), "output");
}

/**
 * @param {string} dir
 */
function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

module.exports = {
  resolveSessionId,
  getDraftDir,
  getAssetsDir,
  getOutputDir,
  ensureDir,
};
