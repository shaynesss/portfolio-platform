export const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as T;
};

export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

export const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
export const finePointer = matchMedia("(hover: hover) and (pointer: fine)");

/** A duration that collapses to zero when the visitor asks for reduced motion. */
export const dur = (ms: number): number => (reduceMotion.matches ? 0 : ms);

/** Small seeded generator (mulberry32), so the stars fall in the same places every visit. */
export function rng(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Colour of a black body at a temperature in kelvin (Tanner Helland's fit). */
export function kelvin(k: number): [number, number, number] {
  const t = k / 100;
  const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
}

export type Pt = [number, number];

/** Convex hull (monotone chain), used to cut the lamp's beam as one shape. */
export function hull(points: Pt[]): Pt[] {
  const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Pt[] = [];
  const upper: Pt[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  for (const p of pts.slice().reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

export const polygon = (pts: Pt[]): string => `polygon(${pts.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(",")})`;

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
export const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ESC[c]);
