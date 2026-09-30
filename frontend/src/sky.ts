import { S } from "./state";
import { rng } from "./util";

/** "Nocturne, stars": after Whistler, with a clear sky. The same values are in styles.css. */
export const SCENE = {
  sky: ["#10161d", "#18212b", "#263443", "#384d5f"],
  deep: "#090d12",
  stars: 70,
  starReflection: 0.3,
  ambientRipple: 0.45,
  tint: "rgba(8,14,22,.3)",
} as const;

export interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
  phase: number;
  speed: number;
}

export let stars: Star[] = [];

export function buildStars(): void {
  const r = rng(71);
  stars = [];
  for (let i = 0; i < SCENE.stars; i++) {
    stars.push({
      x: r() * S.W,
      y: Math.pow(r(), 1.5) * S.hz * 0.94,
      size: 0.5 + r() * (r() < 0.08 ? 1.6 : 0.9),
      alpha: 0.35 + r() * 0.6,
      phase: r() * 6.28,
      speed: 0.6 + r() * 1.8,
    });
  }
}

export function drawSky(ctx: CanvasRenderingContext2D, t: number): void {
  const ts = t / 1000;
  ctx.clearRect(0, 0, S.W, S.hz);
  ctx.fillStyle = "#e8eefc";
  for (const s of stars) {
    ctx.globalAlpha = s.alpha * (0.72 + 0.28 * Math.sin(ts * s.speed + s.phase));
    ctx.fillRect(s.x, s.y, s.size, s.size);
  }
  ctx.globalAlpha = 1;
}
