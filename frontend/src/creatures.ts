import { openNote } from "./overlays";
import { S, find } from "./state";
import { $, clamp, reduceMotion } from "./util";
import { water } from "./water";

/* ------------------------------------------------------------------ */
/* Moths. They keep their backs to the light, which is why real moths */
/* end up circling a lamp (Fabian et al., Nature Communications 2024). */

interface Moth {
  el: HTMLElement;
  th: number;
  r: number;
  rt: number;
  w: number;
  ph: number;
  leave: boolean;
}

const moths: Moth[] = [];
const mothLayer = $("moths");

export function updateMoths(dt: number, now: number): void {
  const lit = S.on && S.lamp > 0.5 && S.lampOnSince > 0 && now - S.lampOnSince > 45000 && !reduceMotion.matches;
  if (lit && moths.length === 0) {
    for (let i = 0; i < 3; i++) {
      const el = document.createElement("span");
      el.className = "moth";
      mothLayer.appendChild(el);
      moths.push({ el, th: Math.random() * 6.28, r: 150 + Math.random() * 60, rt: 26 + Math.random() * 30, w: (1.6 + Math.random()) * (Math.random() < 0.5 ? -1 : 1), ph: Math.random() * 6, leave: false });
    }
    find("moths");
  }
  if (!lit) for (const m of moths) m.leave = true;
  for (let i = moths.length - 1; i >= 0; i--) {
    const m = moths[i];
    m.th += (m.w * dt) / 1000;
    let target = m.leave ? m.r + 400 : m.rt + 10 * Math.sin(now / 700 + m.ph);
    if (S.eyeX !== null && S.eyeY !== null && !m.leave) {
      const ex = S.lampX + m.r * Math.cos(m.th) - S.eyeX;
      const ey = S.lampY + 0.6 * m.r * Math.sin(m.th) - S.eyeY;
      if (ex * ex + ey * ey < 3600) target += 60;
    }
    m.r += (target - m.r) * Math.min(1, dt / (m.leave ? 900 : 400));
    const x = S.lampX + m.r * Math.cos(m.th) + 3 * Math.sin(now / 90 + m.ph);
    const y = S.lampY + 6 + 0.6 * m.r * Math.sin(m.th) + 3 * Math.cos(now / 110 + m.ph);
    m.el.style.transform = `translate(${x}px,${y}px)`;
    if (m.leave && m.r > 380) {
      m.el.remove();
      moths.splice(i, 1);
    }
  }
}

/* ------------------------------------------------------------------ */
/* A bottle drifts past every so often, leaving a wake. Its note      */
/* counts the hidden things found.                                    */

const bottle = $<HTMLButtonElement>("bottle");
const drift = { on: false, t0: 0, next: 0, lastWake: 0 };

export function updateBottle(now: number): void {
  if (!S.arrived || S.open || S.proj) return;
  if (!drift.on) {
    if (!drift.next) drift.next = now + 22000;
    if (now > drift.next) {
      drift.on = true;
      drift.t0 = now;
      bottle.hidden = false;
    }
    return;
  }
  const u = (now - drift.t0) / 42000;
  const x = -60 + u * (S.W + 120);
  const y = S.hz + (S.H - S.hz) * 0.6 + 3 * Math.sin(now / 800);
  bottle.style.transform = `translate(${x}px,${y}px) rotate(${4 * Math.sin(now / 1100)}deg)`;
  if (now - drift.lastWake > 380) {
    drift.lastWake = now;
    water.drop(x - 18, y + 8, 1, 60);
  }
  if (u >= 1) {
    drift.on = false;
    bottle.hidden = true;
    drift.next = now + 60000;
  }
}

bottle.addEventListener("click", () => {
  find("bottle");
  drift.on = false;
  bottle.hidden = true;
  drift.next = performance.now() + 60000;
  openNote();
});

/* ------------------------------------------------------------------ */
/* Skipping a stone: a fast sideways flick across the water.          */

const stone = $("stone");
const skips = $("skips");

export function skipStone(x: number, y: number, vx: number): void {
  const dir = Math.sign(vx);
  let d = clamp(Math.abs(vx) * 90, 60, 240);
  let px = x;
  const hops: { x: number; t: number; hit?: boolean }[] = [];
  while (d > 14 && hops.length < 9) {
    px += dir * d;
    hops.push({ x: px, t: 0 });
    d *= 0.7;
  }
  const inside = hops.filter((h) => h.x > 0 && h.x < S.W);
  if (!inside.length) {
    water.drop(x, y, 3, 520);
    return;
  }
  let acc = 0;
  inside.forEach((h, i) => {
    const from = i === 0 ? x : inside[i - 1].x;
    h.t = acc;
    acc += 150 + Math.abs(h.x - from) * 0.5;
  });
  water.drop(x, y, 2, 240);
  stone.style.opacity = "1";
  const start = performance.now();
  const step = (now: number) => {
    const e = now - start;
    const i = inside.findIndex((h, j) => e < h.t + 150 + Math.abs(h.x - (j === 0 ? x : inside[j - 1].x)) * 0.5);
    for (let j = 0; j < (i === -1 ? inside.length : i); j++) {
      if (!inside[j].hit) {
        inside[j].hit = true;
        water.drop(inside[j].x, y, 2, 300 * (1 - j / 12));
      }
    }
    if (i === -1) {
      stone.style.opacity = "0";
      skips.textContent = `${inside.length} ${inside.length === 1 ? "skip" : "skips"}`;
      skips.style.left = `${inside[inside.length - 1].x}px`;
      skips.style.top = `${y - 26}px`;
      skips.style.opacity = "1";
      setTimeout(() => (skips.style.opacity = "0"), 1600);
      if (inside.length >= 3) find("stone");
      return;
    }
    const fromX = i === 0 ? x : inside[i - 1].x;
    const to = inside[i];
    const u = clamp((e - to.t) / (150 + Math.abs(to.x - fromX) * 0.5), 0, 1);
    const sx = fromX + (to.x - fromX) * u;
    const sy = y - Math.sin(u * Math.PI) * Math.abs(to.x - fromX) * 0.12;
    stone.style.transform = `translate(${sx}px,${sy}px)`;
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

