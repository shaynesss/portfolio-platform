import { S, dom, find } from "./state";
import { $, clamp, kelvin } from "./util";

/*
 * The lamp is one number, S.lamp, from 0 to 1. The glow, the shade, the case's
 * light, the darkness and the water all read it; the dimmer sets S.level, which
 * also moves the colour from 2,700 K towards 1,800 K like a real filament.
 */

type Sequence = [atMs: number, value: number][];
let flick: { t0: number; seq: Sequence; then?: () => void } | null = null;

export const flickering = (): boolean => flick !== null;

export function flicker(seq: Sequence, then?: () => void): void {
  flick = { t0: performance.now(), seq, then };
}

export function lampTo(on: boolean, seq?: Sequence): void {
  S.on = on;
  if (on) {
    flicker(seq ?? [[0, 0.6], [90, 0.08], [170, 0.85], [240, 0.3], [330, 1]]);
    S.lampOnSince = performance.now();
  } else {
    flick = null;
    S.lampOnSince = 0;
  }
}

export function dim(step: number): void {
  S.level = clamp(S.level + step, 0.25, 1);
  if (!S.on) lampTo(true);
  find("dim");
}

export function lampColour(): [number, number, number] {
  return kelvin(1800 + 900 * S.level);
}

export function updateLamp(dt: number, now: number): void {
  if (flick) {
    const elapsed = now - flick.t0;
    let v = 0;
    for (const [at, value] of flick.seq) if (elapsed >= at) v = value;
    S.lamp = v * S.level;
    if (elapsed > flick.seq[flick.seq.length - 1][0]) {
      const then = flick.then;
      flick = null;
      then?.();
    }
  } else {
    S.lamp += ((S.on ? S.level : 0) - S.lamp) * Math.min(1, dt / 120);
  }
  const k = lampColour();
  const mix = (c: number) => Math.round(c * 0.6 + 255 * 0.4);
  dom.stage.style.setProperty("--lamp", S.lamp.toFixed(3));
  dom.stage.style.setProperty("--lampRGB", `${mix(k[0])} ${mix(k[1])} ${mix(k[2])}`);
  const lit = S.lamp / Math.max(S.level, 0.01);
  dom.veil.style.opacity = ((S.arrived ? 0.5 : 0.86) * (1 - lit * (S.level < 1 ? 0.9 : 1))).toFixed(3);
}

/* ------------------------------------------------------------------ */
/* The pull cord: a seven-point Verlet rope hanging from the shade.   */

interface Point {
  x: number;
  y: number;
  px: number;
  py: number;
}

const SEG = 6;
const N = 7;
const cord = { pts: [] as Point[], ax: 0, ay: 0, drag: false, touched: false, armed: false, pull: 0, down: 0, lastSway: 0, sways: 0 };
const line = $("cordline") as unknown as SVGPolylineElement;
const beadDot = $("beaddot") as unknown as SVGCircleElement;
const bead = $<HTMLButtonElement>("bead");

export function resetCord(): void {
  cord.ax = S.lampX + 20;
  cord.ay = S.shadeTop + 38;
  cord.pts = Array.from({ length: N }, (_, i) => ({ x: cord.ax, y: cord.ay + i * SEG, px: cord.ax, py: cord.ay + i * SEG }));
}

export function stepCord(dt: number, now: number): void {
  const P = cord.pts;
  if (!P.length) return;
  if (!cord.touched && cord.sways < 3 && S.arrived && now - cord.lastSway > 12000) {
    cord.lastSway = now;
    cord.sways++;
    P[N - 1].px = P[N - 1].x - 3.5;
  }
  const f = Math.min(dt / 16.7, 2);
  for (let i = 1; i < N; i++) {
    if (cord.drag && i === N - 1) continue;
    const p = P[i];
    const vx = (p.x - p.px) * 0.985;
    const vy = (p.y - p.py) * 0.985;
    p.px = p.x;
    p.py = p.y;
    p.x += vx;
    p.y += vy + 0.35 * f;
  }
  P[0].x = cord.ax;
  P[0].y = cord.ay;
  const reach = Math.hypot(P[N - 1].x - cord.ax, P[N - 1].y - cord.ay);
  const seg = cord.drag ? Math.max(SEG, reach / (N - 1)) : SEG;
  for (let iter = 0; iter < 8; iter++) {
    for (let i = 0; i < N - 1; i++) {
      const a = P[i];
      const b = P[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 0.001;
      const diff = (dist - seg) / dist;
      const aPinned = i === 0;
      const bPinned = cord.drag && i + 1 === N - 1;
      if (aPinned && bPinned) continue;
      if (aPinned) {
        b.x -= dx * diff;
        b.y -= dy * diff;
      } else if (bPinned) {
        a.x += dx * diff;
        a.y += dy * diff;
      } else {
        a.x += dx * diff * 0.5;
        a.y += dy * diff * 0.5;
        b.x -= dx * diff * 0.5;
        b.y -= dy * diff * 0.5;
      }
    }
  }
  cord.pull = reach - SEG * (N - 1);
  const end = P[N - 1];
  line.setAttribute("points", P.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "));
  beadDot.setAttribute("cx", end.x.toFixed(1));
  beadDot.setAttribute("cy", (end.y + 2).toFixed(1));
  bead.style.left = `${end.x}px`;
  bead.style.top = `${end.y + 2}px`;
}

function tug(nudge: boolean): void {
  if (nudge) {
    const end = cord.pts[N - 1];
    end.py = end.y - 9;
  }
  lampTo(!S.on);
  find("cord");
}

bead.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  bead.setPointerCapture(e.pointerId);
  cord.drag = true;
  cord.touched = true;
  cord.armed = false;
  cord.down = performance.now();
  const move = (ev: PointerEvent) => {
    const sr = dom.stage.getBoundingClientRect();
    let x = ev.clientX - sr.left;
    let y = ev.clientY - sr.top;
    const dx = x - cord.ax;
    const dy = y - cord.ay;
    const d = Math.hypot(dx, dy);
    const max = SEG * (N - 1) + 48;
    if (d > max) {
      x = cord.ax + (dx / d) * max;
      y = cord.ay + (dy / d) * max;
    }
    const end = cord.pts[N - 1];
    end.x = end.px = x;
    end.y = end.py = y;
    if (cord.pull > 30) cord.armed = true;
  };
  const up = () => {
    bead.removeEventListener("pointermove", move);
    bead.removeEventListener("pointerup", up);
    bead.removeEventListener("pointercancel", up);
    cord.drag = false;
    const quick = performance.now() - cord.down < 250;
    if (cord.armed || quick) tug(!cord.armed);
  };
  bead.addEventListener("pointermove", move);
  bead.addEventListener("pointerup", up);
  bead.addEventListener("pointercancel", up);
});

bead.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    tug(true);
  }
});
