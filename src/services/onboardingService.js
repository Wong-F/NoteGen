/**
 * Persist onboarding / product-tour completion flags.
 */

const fs = require("node:fs");
const path = require("node:path");

const TOUR_VERSION = "1";

const DEFAULT_STATE = Object.freeze({
  version: TOUR_VERSION,
  welcomeCompleted: false,
  firstWorkspaceCompleted: false,
  welcomeSkippedAt: null,
  firstWorkspaceSkippedAt: null,
});

class OnboardingService {
  /** @param {string} userDataDir */
  constructor(userDataDir) {
    this.filePath = path.join(userDataDir, "onboarding.json");
  }

  /** @returns {typeof DEFAULT_STATE} */
  get() {
    try {
      const raw = JSON.parse(fs.readFileSync(this.filePath, "utf8"));
      return {
        ...DEFAULT_STATE,
        ...raw,
        version: TOUR_VERSION,
      };
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.warn(`[noteGen] corrupt onboarding state, resetting: ${error.message}`);
      }
      return { ...DEFAULT_STATE };
    }
  }

  /** @param {Partial<typeof DEFAULT_STATE>} patch */
  save(patch) {
    const next = { ...this.get(), ...patch, version: TOUR_VERSION };
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(next, null, 2), "utf8");
    return next;
  }

  /** @param {{ skipped?: boolean }} [options] */
  completeWelcome(options = {}) {
    return this.save({
      welcomeCompleted: true,
      welcomeSkippedAt: options.skipped ? new Date().toISOString() : null,
    });
  }

  /** @param {{ skipped?: boolean }} [options] */
  completeFirstWorkspace(options = {}) {
    return this.save({
      firstWorkspaceCompleted: true,
      firstWorkspaceSkippedAt: options.skipped ? new Date().toISOString() : null,
    });
  }

  reset() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify({ ...DEFAULT_STATE }, null, 2), "utf8");
    return { ...DEFAULT_STATE };
  }
}

module.exports = { OnboardingService, DEFAULT_STATE, TOUR_VERSION };
