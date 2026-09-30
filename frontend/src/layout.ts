import { IN_PROGRESS, PROJECTS } from "./content";
import { resetCord } from "./lamp";
import { openDrawer } from "./overlays";
import { buildStars } from "./sky";
import { S, dom } from "./state";
import { $, clamp, esc } from "./util";
import { water } from "./water";

const skyCanvas = $<HTMLCanvasElement>("sky");
const lap = $("lap");

/** Build the drawers. Projects first; the next drawer stands ajar for work in progress. */
function buildCabinet(narrow: boolean): void {
  const cols = 3;
  const count = Math.max(9, Math.ceil((PROJECTS.length + 1) / cols) * cols);
  const rows = count / cols;
  const dh = Math.round(clamp((S.H - S.yb - 90) / rows - 5, narrow ? 40 : 42, 60));
  dom.cabinet.innerHTML = `<div class="cap"></div><div class="carcass"><div class="drawers" id="drawers" style="--dh:${dh}px"></div></div><div class="plank"></div><div class="feet"><i></i><i></i></div><div class="case-light"></div><p class="count-cap">Commits per project · GitHub, 29 Sep 2026</p>`;
  const grid = $("drawers");
  S.drawers = [];
  for (let i = 0; i < count; i++) {
    const p = PROJECTS[i];
    const el = document.createElement("button");
    el.type = "button";
    el.className = "drawer";
    if (p) {
      el.innerHTML = `<span class="holder"><span class="lbl">${esc(p.title)}</span><span class="lbl-n">${p.commits}</span></span><span class="pull"></span>`;
      el.setAttribute("aria-label", `${p.title}, ${p.category}, ${p.date}. Open the drawer`);
      el.setAttribute("aria-expanded", "false");
      el.addEventListener("click", () => openDrawer(p, el, i));
      S.drawers.push({ el, project: p });
    } else if (i === PROJECTS.length) {
      el.className = "drawer wip";
      el.innerHTML = `<span class="holder"><span class="lbl"></span></span><span class="pull"></span><span class="peek" aria-hidden="true"><span class="gtab">In progress</span><i></i><i></i></span>`;
      el.setAttribute("aria-label", "Projects still being written. Open the drawer");
      el.setAttribute("aria-expanded", "false");
      el.addEventListener("click", () => openDrawer(IN_PROGRESS, el, i));
    } else {
      el.className = "drawer blank";
      el.tabIndex = -1;
      el.setAttribute("aria-hidden", "true");
      el.innerHTML = `<span class="holder"><span class="lbl"></span></span><span class="pull"></span>`;
    }
    grid.appendChild(el);
  }
}

export function layout(): void {
  const W = dom.stage.clientWidth;
  const H = dom.stage.clientHeight;
  const narrow = W < 760;
  S.W = W;
  S.H = H;
  S.hz = Math.round(H * 0.5);
  S.yb = Math.round(narrow ? H * 0.8 : H * 0.64);
  dom.stage.style.setProperty("--hz", `${S.hz}px`);

  const caseW = narrow ? Math.min(W - 40, 360) : clamp(W * 0.29, 360, 470);
  S.caseW = caseW;
  buildCabinet(narrow);
  dom.wrap.style.width = `${caseW}px`;
  const caseH = dom.cabinet.offsetHeight;
  const left = narrow ? (W - caseW) / 2 : Math.min(W - caseW - 36, W * 0.66 - caseW / 2);
  S.caseL = left;
  S.caseT = S.yb - caseH;
  dom.wrap.style.left = `${left}px`;
  dom.wrap.style.top = `${S.caseT}px`;
  lap.style.left = `${left - 10}px`;
  lap.style.width = `${caseW + 20}px`;
  lap.style.top = `${S.yb - 8}px`;

  const lampTop = S.caseT - 96;
  S.lampX = left + caseW - 18 - 32;
  S.lampY = lampTop + 22;
  S.shadeTop = lampTop;
  dom.stage.style.setProperty("--lampPX", `${S.lampX}px`);
  dom.stage.style.setProperty("--lampPY", `${lampTop + 30}px`);
  dom.stage.style.setProperty("--lampIn", `${((caseW - 50) / caseW) * 100}%`);
  dom.stage.style.setProperty("--case-w", `${caseW}px`);

  // Each silver fitting knows where it sits, so one light band sweeps across them in order.
  const cr = dom.cabinet.getBoundingClientRect();
  for (const el of dom.cabinet.querySelectorAll<HTMLElement>(".holder")) el.style.setProperty("--hx", `${el.getBoundingClientRect().left - cr.left}px`);

  skyCanvas.width = W;
  skyCanvas.height = S.hz;
  buildStars();
  water.resize();
  water.buildSource();
  resetCord();
  applyEye(S.eyeX ?? S.lampX, S.eyeY ?? S.lampY);
}

/** Where the viewer's eye is: silver fittings catch the light as it moves. */
export function applyEye(x: number, y: number): void {
  S.eyeX = x;
  S.eyeY = y;
  dom.stage.style.setProperty("--lx", `${x - S.caseL}px`);
}

/** Sweep the eye across the cabinet once, so the silver glints in order. */
export function sweep(fast = false): void {
  const x0 = S.caseL - 40;
  const x1 = S.caseL + S.caseW + 40;
  const y = S.caseT + 60;
  const t0 = performance.now();
  const D = fast ? 700 : 1500;
  S.sweeping = true;
  const step = (t: number) => {
    const k = Math.min(1, (t - t0) / D);
    applyEye(fast ? x1 - (x1 - x0) * k : x0 + (x1 - x0) * (1 - Math.pow(1 - k, 2)), y);
    if (k < 1) requestAnimationFrame(step);
    else S.sweeping = false;
  };
  requestAnimationFrame(step);
}
