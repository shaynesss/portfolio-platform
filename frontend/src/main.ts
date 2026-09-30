import "./styles.css";
import { enabled, loadAnalytics, optOut, optedOut } from "./analytics";
import { updateBottle, updateMoths } from "./creatures";
import "./input";
import { applyEye, layout, sweep } from "./layout";
import { flicker, flickering, stepCord, updateLamp } from "./lamp";
import { closeAll } from "./overlays";
import { closeProjection, startHints } from "./projection";
import { drawSky } from "./sky";
import { S, dom } from "./state";
import { $, finePointer, reduceMotion } from "./util";
import { water } from "./water";

const skyCtx = $<HTMLCanvasElement>("sky").getContext("2d");

/** The page opens dark; after a beat the lamp flickers on and the silver catches it. */
function arrive(): void {
  S.arrived = false;
  S.on = false;
  S.lamp = 0;
  S.level = 1;
  const settle = () => {
    S.arrived = true;
    sweep();
    startHints();
  };
  if (reduceMotion.matches) {
    S.on = true;
    S.lampOnSince = performance.now();
    S.lamp = 1;
    settle();
    return;
  }
  setTimeout(() => {
    S.on = true;
    S.lampOnSince = performance.now();
    flicker([[0, 0.8], [120, 0.05], [220, 0.9], [330, 0.25], [480, 1]], settle);
  }, 900);
}

let last = performance.now();
let lastWater = 0;
new IntersectionObserver(([entry]) => (S.visible = entry.isIntersecting)).observe(dom.stage);

function loop(now: number): void {
  requestAnimationFrame(loop);
  const dt = Math.min(64, now - last);
  last = now;
  if (!S.visible || document.hidden) return;
  updateLamp(dt, now);
  if (S.open && !S.busy) return; // a card is open: the scene holds still behind it
  stepCord(dt, now);
  if (!finePointer.matches && !S.sweeping && !reduceMotion.matches && now - lastWater > 30) {
    applyEye(S.caseL + S.caseW / 2 + Math.sin(now / 2300) * S.caseW * 0.5, S.caseT + 80);
  }
  updateMoths(dt, now);
  updateBottle(now);
  const busy = water.active || flickering() || S.proj;
  const interval = reduceMotion.matches ? 250 : busy ? 0 : 33;
  if (now - lastWater >= interval) {
    lastWater = now;
    if (water.active) water.step();
    if (skyCtx) drawSky(skyCtx, reduceMotion.matches ? 0 : now);
    water.render(reduceMotion.matches ? 0 : now);
  }
}

let resizeTimer = 0;
addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    closeAll(true);
    closeProjection(true);
    layout();
  }, 150);
});

/** The notice and opt-out that cookie-free counting needs; shown only where counting runs. */
function privacyNotice(): void {
  if (!enabled()) return;
  const note = $("privacy");
  const button = $<HTMLButtonElement>("optout");
  note.hidden = false;
  if (optedOut()) note.textContent = "Visit counting is off for this browser.";
  button.addEventListener("click", () => {
    optOut();
    note.textContent = "Visit counting is off for this browser.";
  });
}

function start(): void {
  loadAnalytics();
  privacyNotice();
  layout();
  arrive();
  requestAnimationFrame(loop);
  const [gw, gh] = water.grid;
  console.log(
    `%cShayne Yong%c\nLooking under the hood? The water is a ${gw} × ${gh} wave-equation grid, bending a reflection that is redrawn upside down from the cabinet itself. No framework, no WebGL.\nType noctis anywhere on the page.`,
    "font:italic 20px Georgia;color:#dfe6f2",
    "color:#a3a8b6",
  );
}

document.fonts.ready.then(start, start);
