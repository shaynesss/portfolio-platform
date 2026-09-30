import { skipStone } from "./creatures";
import { applyEye } from "./layout";
import { dim, lampTo } from "./lamp";
import { closeAll } from "./overlays";
import { closeProjection } from "./projection";
import { S, dom, find } from "./state";
import { $, dur, finePointer } from "./util";
import { water } from "./water";

/* The cursor is the viewer's eye: silver catches the light as it moves. */
let pending: [number, number] | null = null;
let frame = 0;
dom.stage.addEventListener("pointermove", (e) => {
  if (!finePointer.matches || S.sweeping) return;
  const sr = dom.stage.getBoundingClientRect();
  pending = [e.clientX - sr.left, e.clientY - sr.top];
  if (!frame)
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (pending) applyEye(pending[0], pending[1]);
    });
});

/* Clicking the water drops a ripple; a fast sideways flick skips a stone. */
let flick: [number, number, number][] | null = null;
const onControl = (t: EventTarget | null) => t instanceof Element && t.closest("button, a, .panel, .reading, .keys, .case-wrap, .intro");

dom.stage.addEventListener("pointerdown", (e) => {
  if (onControl(e.target) || S.open || S.proj) return;
  const sr = dom.stage.getBoundingClientRect();
  const y = e.clientY - sr.top;
  if (y < S.hz + 6) return;
  flick = [[e.clientX - sr.left, y, performance.now()]];
});
dom.stage.addEventListener("pointermove", (e) => {
  if (!flick) return;
  const sr = dom.stage.getBoundingClientRect();
  flick.push([e.clientX - sr.left, e.clientY - sr.top, performance.now()]);
  if (flick.length > 12) flick.shift();
});
addEventListener("pointerup", () => {
  if (!flick) return;
  const samples = flick;
  flick = null;
  const now = performance.now();
  const recent = samples.filter((p) => now - p[2] < 90);
  const last = samples[samples.length - 1];
  if (recent.length >= 2) {
    const a = recent[0];
    const b = recent[recent.length - 1];
    const dt = Math.max(1, b[2] - a[2]);
    const vx = (b[0] - a[0]) / dt;
    const vy = (b[1] - a[1]) / dt;
    if (Math.abs(vx) > 0.8 && Math.abs(vx) > Math.abs(vy) * 1.5) {
      skipStone(last[0], last[1], vx);
      return;
    }
  }
  water.drop(last[0], last[1], 3, 520);
  find("ripple");
});

/* Keys. Left and right dim the lamp (up and down still scroll), L switches it,  */
/* Alt shows each drawer's commit count, and typing "noctis" gets an answer.     */
const keys = $("keys");
let typed = "";
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (S.open) closeAll();
    else if (S.proj) closeProjection();
    keys.hidden = true;
    return;
  }
  if (e.key === "Alt") {
    dom.stage.classList.add("counts");
    find("chart");
    return;
  }
  if (e.metaKey || e.ctrlKey) return;
  if (e.key === "?") {
    keys.hidden = !keys.hidden;
    return;
  }
  if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && !S.open && !S.proj) {
    e.preventDefault();
    dim(e.key === "ArrowRight" ? 0.12 : -0.12);
    return;
  }
  if (e.key.length !== 1) return;
  typed = (typed + e.key.toLowerCase()).slice(-12);
  if (typed.endsWith("noctis")) {
    typed = "";
    const t0 = performance.now();
    lampTo(true, [[0, 1], [80, 0.2], [160, 1], [240, 0.2], [320, 1]]);
    setTimeout(() => console.log(`%c[noctis]%c lamp.on latency=${Math.round(performance.now() - t0)}ms`, "color:#ffd49c;font-weight:bold", "color:inherit"), dur(340));
    find("noctis");
    return;
  }
  if (e.key.toLowerCase() === "l" && !S.open && !S.proj) lampTo(!S.on);
});
document.addEventListener("keyup", (e) => {
  if (e.key === "Alt") dom.stage.classList.remove("counts");
});
addEventListener("blur", () => dom.stage.classList.remove("counts"));
