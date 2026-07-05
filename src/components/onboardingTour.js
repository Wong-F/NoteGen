/**
 * Product tour — spotlight overlay with tooltip and step navigation.
 */

import { appState } from "./appState.js";

/** @typedef {{ selector: string; title: string; body: string; placement?: "top" | "bottom" | "left" | "right"; altSelectors?: string[] }} TourStep */

/** @type {HTMLElement | null} */
let activeRoot = null;

export function isTourActive() {
  return Boolean(activeRoot);
}

/** @type {(() => void) | null} */
let resizeHandler = null;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {string} selector
 * @param {string[]} [altSelectors]
 */
function resolveTarget(selector, altSelectors = []) {
  for (const sel of [selector, ...altSelectors]) {
    const el = document.querySelector(sel);
    if (el && el.getClientRects().length) {
      return el;
    }
  }
  return null;
}

/**
 * @param {string} selector
 * @param {number} [timeoutMs]
 */
async function waitForTarget(selector, timeoutMs = 4000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const el = document.querySelector(selector);
    if (el && !el.hidden && el.getClientRects().length) {
      return el;
    }
    await delay(80);
  }
  return null;
}

function teardownTour() {
  if (resizeHandler) {
    window.removeEventListener("resize", resizeHandler);
    resizeHandler = null;
  }
  activeRoot?.remove();
  activeRoot = null;
}

/**
 * @param {TourStep[]} steps
 * @param {{ onComplete?: (result: { skipped: boolean }) => void | Promise<void> }} [options]
 */
export function runTour(steps, options = {}) {
  return new Promise((resolve) => {
    teardownTour();

    let index = 0;
    let skipped = false;

    const root = document.createElement("div");
    root.className = "onboarding-root";
    root.innerHTML = `
      <div class="onboarding-spotlight" aria-hidden="true"></div>
      <div class="onboarding-tooltip" role="dialog" aria-modal="true" aria-live="polite">
        <div class="onboarding-tooltip-arrow" aria-hidden="true"></div>
        <p class="onboarding-step-label"></p>
        <h3 class="onboarding-tooltip-title"></h3>
        <p class="onboarding-tooltip-body"></p>
        <div class="onboarding-tooltip-actions">
          <button type="button" class="btn-ghost onboarding-skip-btn">跳过教程</button>
          <button type="button" class="btn-primary onboarding-next-btn">下一步</button>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    activeRoot = root;

    const spotlight = root.querySelector(".onboarding-spotlight");
    const tooltip = root.querySelector(".onboarding-tooltip");
    const arrow = root.querySelector(".onboarding-tooltip-arrow");
    const stepLabel = root.querySelector(".onboarding-step-label");
    const titleEl = root.querySelector(".onboarding-tooltip-title");
    const bodyEl = root.querySelector(".onboarding-tooltip-body");
    const skipBtn = root.querySelector(".onboarding-skip-btn");
    const nextBtn = root.querySelector(".onboarding-next-btn");

    const finish = async (didSkip) => {
      skipped = didSkip;
      teardownTour();
      await options.onComplete?.({ skipped: didSkip });
      resolve({ skipped: didSkip });
    };

    const positionStep = () => {
      const step = steps[index];
      if (!step) {
        return;
      }

      const target = resolveTarget(step.selector, step.altSelectors);
      if (!target || !spotlight || !tooltip || !arrow) {
        return;
      }

      target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });

      const rect = target.getBoundingClientRect();
      const pad = 8;
      const spotTop = Math.max(8, rect.top - pad);
      const spotLeft = Math.max(8, rect.left - pad);
      const spotWidth = Math.min(window.innerWidth - spotLeft - 8, rect.width + pad * 2);
      const spotHeight = Math.min(window.innerHeight - spotTop - 8, rect.height + pad * 2);

      spotlight.style.top = `${spotTop}px`;
      spotlight.style.left = `${spotLeft}px`;
      spotlight.style.width = `${spotWidth}px`;
      spotlight.style.height = `${spotHeight}px`;

      stepLabel.textContent = `第 ${index + 1} / ${steps.length} 步`;
      titleEl.textContent = step.title;
      bodyEl.textContent = step.body;
      nextBtn.textContent = index === steps.length - 1 ? "完成" : "下一步";

      const placement = step.placement || "bottom";
      tooltip.classList.remove(
        "is-top",
        "is-bottom",
        "is-left",
        "is-right"
      );
      tooltip.classList.add(`is-${placement}`);

      const tipRect = tooltip.getBoundingClientRect();
      const margin = 16;
      let tipTop = spotTop + spotHeight + margin;
      let tipLeft = spotLeft + spotWidth / 2 - tipRect.width / 2;

      if (placement === "top") {
        tipTop = spotTop - tipRect.height - margin;
      } else if (placement === "left") {
        tipTop = spotTop + spotHeight / 2 - tipRect.height / 2;
        tipLeft = spotLeft - tipRect.width - margin;
      } else if (placement === "right") {
        tipTop = spotTop + spotHeight / 2 - tipRect.height / 2;
        tipLeft = spotLeft + spotWidth + margin;
      }

      tipLeft = Math.max(12, Math.min(tipLeft, window.innerWidth - tipRect.width - 12));
      tipTop = Math.max(12, Math.min(tipTop, window.innerHeight - tipRect.height - 12));

      tooltip.style.top = `${tipTop}px`;
      tooltip.style.left = `${tipLeft}px`;

      arrow.style.top = "";
      arrow.style.left = "";
      if (placement === "bottom" || placement === "top") {
        const arrowLeft = spotLeft + spotWidth / 2 - tipLeft - 8;
        arrow.style.left = `${Math.max(16, Math.min(arrowLeft, tipRect.width - 32))}px`;
      }
    };

    const showStep = async () => {
      while (index < steps.length) {
        const step = steps[index];
        let target = resolveTarget(step.selector, step.altSelectors);
        if (!target) {
          target = await waitForTarget(step.selector);
        }
        if (!target && step.altSelectors?.length) {
          for (const alt of step.altSelectors) {
            target = await waitForTarget(alt, 1200);
            if (target) {
              break;
            }
          }
        }
        if (!target) {
          index += 1;
          continue;
        }
        positionStep();
        requestAnimationFrame(() => positionStep());
        return;
      }
      finish(skipped);
    };

    resizeHandler = () => positionStep();
    window.addEventListener("resize", resizeHandler);

    skipBtn.addEventListener("click", () => finish(true));
    nextBtn.addEventListener("click", () => {
      index += 1;
      if (index >= steps.length) {
        finish(false);
        return;
      }
      showStep();
    });

    root.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        finish(true);
      }
    });

    showStep();
  });
}

/** @returns {TourStep[]} */
function getWelcomeSteps() {
  return [
    {
      selector: "#empty-new-workspace-btn",
      altSelectors: ["#new-workspace-btn"],
      title: "从这里开始创作",
      body: "点击「新建创作」创建你的第一个笔记项目，之后所有进度都会自动保存。",
      placement: "bottom",
    },
    {
      selector: "#persona-selector-btn",
      title: "运营人设（可选）",
      body: "如果你运营多个账号，可以在这里切换口吻与人设；单账号使用时可以跳过。",
      placement: "bottom",
    },
    {
      selector: "#sidebar-recent-section",
      title: "最近 · 历史创作",
      body: "你创建过的项目会出现在这里，随时点击切换继续编辑。",
      placement: "right",
    },
    {
      selector: "#settings-toggle",
      title: "设置",
      body: "在这里配置 AI 文案与图像 API Key，连接本地 Ollama 或云端模型。",
      placement: "bottom",
    },
  ];
}

/** @returns {TourStep[]} */
function getFirstWorkspaceSteps() {
  return [
    {
      selector: '#sidebar-list [data-section="idea"]',
      title: "第一步 · 选题",
      body: "输入关键词，让 AI 帮你找值得写的角度，并选定一个方向。",
      placement: "right",
    },
    {
      selector: '#sidebar-list [data-section="writing"]',
      title: "第二步 · 成文",
      body: "根据选题生成正文，可直接编辑，也可让小节「继续生成」。",
      placement: "right",
    },
    {
      selector: '#sidebar-list [data-section="images"]',
      title: "第三步 · 配图",
      body: "规划页面结构并生成卡片或配图，与文案一起导出。",
      placement: "right",
    },
    {
      selector: ".preview-panel",
      title: "实时预览",
      body: "右侧会同步显示笔记效果，完成后可复制文案或导出到文件夹。",
      placement: "left",
    },
  ];
}

/**
 * @param {{ onComplete?: (result: { skipped: boolean }) => void | Promise<void> }} [options]
 */
export function startWelcomeTour(options) {
  return runTour(getWelcomeSteps(), options);
}

/**
 * @param {{ onComplete?: (result: { skipped: boolean }) => void | Promise<void> }} [options]
 */
export async function startFirstWorkspaceTour(options) {
  await waitForTarget("#workflow-section", 3000);
  await delay(300);
  return runTour(getFirstWorkspaceSteps(), options);
}

export async function maybeStartWelcomeTour() {
  if (!window.noteGen?.invoke) {
    return;
  }
  const state = await window.noteGen.invoke("onboarding:get");
  if (state.welcomeCompleted) {
    if (appState.workspaceReady && !state.firstWorkspaceCompleted) {
      await maybeStartFirstWorkspaceTour();
    }
    return;
  }
  await delay(700);
  await startWelcomeTour({
    onComplete: async ({ skipped }) => {
      await window.noteGen.invoke("onboarding:completeWelcome", { skipped });
    },
  });

  const next = await window.noteGen.invoke("onboarding:get");
  if (appState.workspaceReady && !next.firstWorkspaceCompleted) {
    while (isTourActive()) {
      await delay(200);
    }
    await maybeStartFirstWorkspaceTour();
  }
}

export async function maybeStartFirstWorkspaceTour() {
  if (!window.noteGen?.invoke) {
    return;
  }
  const state = await window.noteGen.invoke("onboarding:get");
  if (state.firstWorkspaceCompleted) {
    return;
  }
  while (isTourActive()) {
    await delay(200);
  }
  await delay(500);
  await startFirstWorkspaceTour({
    onComplete: async ({ skipped }) => {
      await window.noteGen.invoke("onboarding:completeFirstWorkspace", { skipped });
    },
  });
}

/**
 * Reset flags and replay welcome tour (from settings).
 * @param {{ closeSettings?: () => void }} [options]
 */
export async function replayWelcomeTour(options = {}) {
  if (!window.noteGen?.invoke) {
    return;
  }
  await window.noteGen.invoke("onboarding:reset");
  options.closeSettings?.();
  await delay(300);
  await startWelcomeTour({
    onComplete: async ({ skipped }) => {
      await window.noteGen.invoke("onboarding:completeWelcome", { skipped });
    },
  });
}
