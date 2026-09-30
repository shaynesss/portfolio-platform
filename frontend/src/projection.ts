import { track } from "./analytics";
import { sweep } from "./layout";
import { lampTo } from "./lamp";
import { closeAll } from "./overlays";
import { S, dom } from "./state";
import { $, clamp, dur, hull, polygon, reduceMotion, type Pt } from "./util";

/*
 * Clicking the shade tilts it and throws Noctis onto the mist, like a magic-lantern
 * show. The beam is the convex hull of the shade and the panel, used as a clip path.
 */

const proj = $("proj");
const panel = $("panel");
const cone = $("cone");
const screen = $("screen");
const testCone = $("testcone");
const testScreen = $("testscreen");
const title = $("p-title");
const diagramEdges = Array.from(document.querySelectorAll<SVGPathElement>("#diagram .edge"));

function geometry() {
  const narrow = S.W < 760;
  const pw = narrow ? S.W - 24 : clamp(S.caseL - 64, 520, 780);
  const ph = narrow ? S.H * 0.62 : S.H - 56;
  const left = narrow ? 12 : Math.max(24, S.caseL - 40 - pw);
  const top = narrow ? 18 : 28;
  return { pw, ph, left, top, ax: S.lampX - 6, ay: S.shadeTop + 6 };
}

function aimAt(el: HTMLElement, pts: Pt[], ax: number, ay: number): void {
  (el.firstElementChild as HTMLElement).style.clipPath = polygon(hull(pts));
  el.style.setProperty("--ax", `${ax}px`);
  el.style.setProperty("--ay", `${ay}px`);
}

export function openProjection(): void {
  if (S.open) closeAll(true);
  if (S.proj) return;
  if (!S.on) lampTo(true);
  S.proj = true;
  hints.clicked = true;
  track("noctis-projected");
  dom.stage.classList.remove("peeking", "testing");
  const g = geometry();
  Object.assign(panel.style, { left: `${g.left}px`, top: `${g.top}px`, width: `${g.pw}px`, maxHeight: `${g.ph}px` });
  const h = panel.offsetHeight || g.ph;
  Object.assign(screen.style, { left: `${g.left - 30}px`, top: `${g.top - 20}px`, width: `${g.pw + 60}px`, height: `${h + 40}px` });
  aimAt(cone, [[g.ax - 12, g.ay], [g.ax + 12, g.ay], [g.left, g.top], [g.left + g.pw, g.top], [g.left + g.pw, g.top + h], [g.left, g.top + h]], g.ax, g.ay);
  dom.stage.classList.add("projecting");
  dom.shade.setAttribute("aria-expanded", "true");
  proj.classList.add("on");
  sweep(true);
  setTimeout(() => proj.classList.add("focus"), dur(600));
  setTimeout(() => {
    proj.classList.add("draw");
    title.focus({ preventScroll: true });
  }, dur(1000));
  setTimeout(travelLoop, dur(1900));
}

/** One dot follows a request once, from the window to the vault, then stops. */
function travelLoop(): void {
  if (!S.proj || reduceMotion.matches) return;
  const path = $("flow") as unknown as SVGPathElement;
  const dot = $("dot") as unknown as SVGCircleElement;
  const L = path.getTotalLength();
  const t0 = performance.now();
  const step = (now: number) => {
    const u = (now - t0) / 2600;
    if (u > 1 || !S.proj) {
      dot.style.opacity = "0";
      return;
    }
    const p = path.getPointAtLength(u * L);
    dot.setAttribute("cx", String(p.x));
    dot.setAttribute("cy", String(p.y));
    dot.style.opacity = String(Math.sin(u * Math.PI));
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function closeProjection(instant = false): void {
  if (!S.proj) return;
  S.proj = false;
  proj.classList.remove("focus", "draw");
  dom.stage.classList.remove("projecting");
  dom.shade.setAttribute("aria-expanded", "false");
  setTimeout(() => proj.classList.remove("on"), instant ? 0 : dur(450));
  if (!instant) dom.shade.focus({ preventScroll: true });
}

dom.shade.addEventListener("click", () => (S.proj ? closeProjection() : openProjection()));
$("p-close").addEventListener("click", () => closeProjection());
$("projdim").addEventListener("click", () => closeProjection());
for (const [i, path] of diagramEdges.entries()) {
  path.style.setProperty("--len", String(path.getTotalLength()));
  path.style.transitionDelay = `${i * 110}ms`;
}

/* ------------------------------------------------------------------ */
/* Hints that the lamp does something: it tilts when hovered, and     */
/* once, just after it settles, it tests its beam and withdraws.      */

const hints = { clicked: false, timer: 0 };

function aimTest(): void {
  const g = geometry();
  const sh = 420;
  aimAt(testCone, [[g.ax - 12, g.ay], [g.ax + 12, g.ay], [g.left, g.top], [g.left + g.pw, g.top], [g.left + g.pw, g.top + sh], [g.left, g.top + sh]], g.ax, g.ay);
  Object.assign(testScreen.style, { left: `${g.left - 20}px`, top: `${g.top - 10}px`, width: `${g.pw + 40}px`, height: `${sh + 20}px` });
}

const peekOn = () => {
  if (!S.proj && S.on) dom.stage.classList.add("peeking");
};
const peekOff = () => dom.stage.classList.remove("peeking");
dom.shade.addEventListener("pointerenter", peekOn);
dom.shade.addEventListener("pointerleave", peekOff);
dom.shade.addEventListener("focus", () => dom.shade.matches(":focus-visible") && peekOn());
dom.shade.addEventListener("blur", peekOff);

/** Called once the arrival settles. */
export function startHints(): void {
  clearTimeout(hints.timer);
  hints.clicked = false;
  hints.timer = window.setTimeout(() => {
    if (S.proj || S.open || hints.clicked || !S.on) return;
    aimTest();
    dom.stage.classList.remove("testing");
    void dom.stage.offsetWidth;
    dom.stage.classList.add("testing");
    window.setTimeout(() => dom.stage.classList.remove("testing"), dur(2700));
  }, dur(3000));
}
