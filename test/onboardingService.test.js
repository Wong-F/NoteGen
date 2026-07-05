const { describe, it, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { OnboardingService } = require("../src/services/onboardingService");

const tmpDirs = [];

function makeTmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "notegen-onboarding-"));
  tmpDirs.push(dir);
  return dir;
}

after(() => {
  for (const dir of tmpDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("OnboardingService", () => {
  it("returns default state when file is missing", () => {
    const service = new OnboardingService(makeTmpDir());
    const state = service.get();
    assert.equal(state.welcomeCompleted, false);
    assert.equal(state.firstWorkspaceCompleted, false);
  });

  it("marks welcome tour complete", () => {
    const service = new OnboardingService(makeTmpDir());
    const saved = service.completeWelcome();
    assert.equal(saved.welcomeCompleted, true);
    assert.equal(service.get().welcomeCompleted, true);
  });

  it("marks first workspace tour complete with skip timestamp", () => {
    const service = new OnboardingService(makeTmpDir());
    const saved = service.completeFirstWorkspace({ skipped: true });
    assert.equal(saved.firstWorkspaceCompleted, true);
    assert.ok(saved.firstWorkspaceSkippedAt);
  });

  it("reset clears completion flags", () => {
    const dir = makeTmpDir();
    const service = new OnboardingService(dir);
    service.completeWelcome();
    service.completeFirstWorkspace();
    const reset = service.reset();
    assert.equal(reset.welcomeCompleted, false);
    assert.equal(reset.firstWorkspaceCompleted, false);
    assert.equal(service.get().welcomeCompleted, false);
  });
});
