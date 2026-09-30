import { SCENE, stars } from "./sky";
import { S, dom } from "./state";
import { $, kelvin, rng } from "./util";

/*
 * The water. A height grid at a quarter of screen resolution runs the wave equation
 * (Hugo Elias's ripple method): each cell becomes the average of its four neighbours
 * minus its own previous value, then damps. The grid's slope bends a reflection that
 * is redrawn upside down from the cabinet's real layout, at half resolution, and the
 * lamp's share of that reflection is kept separate so its brightness can change
 * every frame without redrawing anything.
 */
class Water {
  private readonly ctx: CanvasRenderingContext2D;
  private gw = 0;
  private gh = 0;
  private sw = 0;
  private a = new Float32Array(0);
  private b = new Float32Array(0);
  private base: Uint8ClampedArray | null = null;
  private lampLayer: Uint8ClampedArray | null = null;
  private out: ImageData | null = null;
  active = false;

  constructor(private readonly cv: HTMLCanvasElement) {
    const ctx = cv.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    this.ctx = ctx;
  }

  get grid(): [number, number] {
    return [this.sw, this.gh];
  }

  resize(): void {
    const wh = S.H - S.hz;
    this.cv.style.top = `${S.hz}px`;
    this.cv.style.height = `${wh}px`;
    this.gw = Math.ceil(S.W / 2);
    this.gh = Math.ceil(wh / 2);
    this.sw = Math.ceil(S.W / 4);
    this.cv.width = this.gw;
    this.cv.height = this.gh;
    this.a = new Float32Array(this.sw * this.gh);
    this.b = new Float32Array(this.sw * this.gh);
    this.out = this.ctx.createImageData(this.gw, this.gh);
    this.active = false;
  }

  /** Redraw what the water reflects. Called on layout, never per frame. */
  buildSource(): void {
    const { W, H, hz, yb } = S;
    const wh = H - hz;
    const make = () => {
      const c = document.createElement("canvas");
      c.width = this.gw;
      c.height = this.gh;
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("no 2d context");
      ctx.setTransform(this.gw / W, 0, 0, this.gh / wh, 0, 0);
      return ctx;
    };
    const b = make();
    const l = make();

    // The sky, mirrored about the horizon, darkened into water.
    const sky = b.createLinearGradient(0, 0, 0, hz);
    sky.addColorStop(0, SCENE.sky[3]);
    sky.addColorStop(0.22, SCENE.sky[2]);
    sky.addColorStop(0.62, SCENE.sky[1]);
    sky.addColorStop(1, SCENE.sky[0]);
    b.fillStyle = sky;
    b.fillRect(0, 0, W, wh);
    b.fillStyle = SCENE.tint;
    b.fillRect(0, 0, W, wh);
    const r = rng(5);
    for (let i = 0; i < 60; i++) {
      b.fillStyle = `rgba(200,215,225,${0.02 + r() * 0.045})`;
      b.fillRect(0, r() * wh, W, 1 + r() * 2.5);
    }
    for (const s of stars) {
      const ly = hz - s.y;
      if (ly < wh) {
        b.fillStyle = `rgba(225,232,250,${s.alpha * SCENE.starReflection})`;
        b.fillRect(s.x, ly, s.size * 1.1, s.size * 1.1);
      }
    }

    // The cabinet, mirrored about the waterline it stands in.
    const m = (y: number) => yb - hz + (yb - y);
    const sr = dom.stage.getBoundingClientRect();
    const rect = (el: Element) => {
      const q = el.getBoundingClientRect();
      return { x: q.left - sr.left, y: q.top - sr.top, w: q.width, h: q.height };
    };
    const cr = rect(dom.cabinet);
    b.fillStyle = "#1d1712";
    b.fillRect(cr.x - 7, m(cr.y + cr.h), cr.w + 14, cr.h);
    b.fillStyle = "#120e0b";
    b.fillRect(cr.x + 14, m(cr.y + cr.h - 14), cr.w - 28, cr.h - 27);
    for (const el of dom.cabinet.querySelectorAll(".drawer")) {
      const q = rect(el);
      b.fillStyle = "#2b211a";
      b.fillRect(q.x, m(q.y + q.h), q.w, q.h);
      b.fillStyle = "rgba(160,168,180,.4)";
      b.fillRect(q.x + q.w * 0.2, m(q.y + q.h * 0.45), q.w * 0.6, q.h * 0.3);
    }
    const lx = S.lampX;
    const shadeBottom = m(S.shadeTop + 40);
    const shadeTop = m(S.shadeTop);
    const shade = (ctx: CanvasRenderingContext2D) => {
      ctx.beginPath();
      ctx.moveTo(lx - 32, shadeBottom);
      ctx.lineTo(lx + 32, shadeBottom);
      ctx.lineTo(lx + 19, shadeTop);
      ctx.lineTo(lx - 19, shadeTop);
      ctx.closePath();
      ctx.fill();
    };
    b.fillStyle = "rgba(150,165,190,.55)";
    b.fillRect(lx - 2, m(S.caseT), 4, 50);
    b.fillStyle = "#22283a";
    shade(b);

    // The lamp's own light, kept apart so the loop can scale it.
    l.fillStyle = "#000";
    l.fillRect(0, 0, W, wh);
    l.fillStyle = "rgb(250,215,165)";
    shade(l);
    const cy = (shadeBottom + shadeTop) / 2;
    const glow = l.createRadialGradient(lx, cy, 4, lx, cy, 220);
    glow.addColorStop(0, "rgba(255,205,150,.5)");
    glow.addColorStop(0.4, "rgba(255,190,130,.16)");
    glow.addColorStop(1, "rgba(255,190,130,0)");
    l.fillStyle = glow;
    l.fillRect(0, 0, W, wh);
    const onTop = l.createRadialGradient(lx - 60, m(S.caseT) - 10, 10, lx - 60, m(S.caseT) - 10, cr.w * 0.7);
    onTop.addColorStop(0, "rgba(255,200,140,.34)");
    onTop.addColorStop(1, "rgba(255,200,140,0)");
    l.fillStyle = onTop;
    l.fillRect(0, 0, W, wh);

    this.base = b.getImageData(0, 0, this.gw, this.gh).data;
    this.lampLayer = l.getImageData(0, 0, this.gw, this.gh).data;
  }

  /** Push the surface down in a small disc at stage coordinates (x, y). */
  drop(x: number, y: number, radius: number, strength: number): void {
    const cx = Math.round(x / 4);
    const cy = Math.round((y - S.hz) / 2);
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > radius * radius) continue;
        const px = cx + dx;
        const py = cy + dy;
        if (px > 0 && px < this.sw - 1 && py > 0 && py < this.gh - 1) this.a[py * this.sw + px] += strength;
      }
    }
    this.active = true;
  }

  step(): void {
    const { sw, gh: sh } = this;
    const a = this.a;
    const b = this.b;
    let energy = 0;
    for (let y = 1; y < sh - 1; y++) {
      const row = y * sw;
      for (let x = 1; x < sw - 1; x++) {
        const i = row + x;
        let n = (a[i - 1] + a[i + 1] + a[i - sw] + a[i + sw]) * 0.5 - b[i];
        n -= n * 0.032;
        b[i] = n;
        energy += n < 0 ? -n : n;
      }
    }
    this.a = b;
    this.b = a;
    if (energy / (sw * sh) < 0.015) {
      this.a.fill(0);
      this.b.fill(0);
      this.active = false;
    }
  }

  render(t: number): void {
    const { gw, gh, sw, a, base, lampLayer, out } = this;
    if (!base || !lampLayer || !out) return;
    const o = out.data;
    const k = kelvin(1800 + 900 * S.level);
    const kr = S.lamp * (0.45 + (0.55 * k[0]) / 255);
    const kg = S.lamp * (0.45 + (0.55 * k[1]) / 255);
    const kb = S.lamp * (0.45 + (0.55 * k[2]) / 255);
    const amb = SCENE.ambientRipple;
    const ts = t / 1000;
    const act = this.active;
    for (let oy = 0; oy < gh; oy++) {
      const d = oy / gh;
      const shift = amb * ((0.5 + 6 * d) * Math.sin(28 / (d + 0.08) - ts * 1.4) + 1.5 * d * Math.sin(oy * 0.22 - ts * 0.7)) * 0.5;
      const row = oy * sw;
      for (let ox = 0; ox < gw; ox++) {
        let hx = 0;
        let hy = 0;
        if (act) {
          const sx0 = ox >> 1;
          if (sx0 > 0 && sx0 < sw - 1 && oy > 0 && oy < gh - 1) {
            const i = row + sx0;
            hx = a[i - 1] - a[i + 1];
            hy = a[i - sw] - a[i + sw];
          }
        }
        let sx = (ox + shift + hx * 0.014) | 0;
        let sy = (oy + hy * 0.01) | 0;
        if (sx < 0) sx = 0;
        else if (sx >= gw) sx = gw - 1;
        if (sy < 0) sy = 0;
        else if (sy >= gh) sy = gh - 1;
        const p = (sy * gw + sx) << 2;
        const q = (oy * gw + ox) << 2;
        const shade = hx * 0.05;
        o[q] = base[p] + kr * lampLayer[p] + shade;
        o[q + 1] = base[p + 1] + kg * lampLayer[p + 1] + shade;
        o[q + 2] = base[p + 2] + kb * lampLayer[p + 2] + shade * 1.1;
        o[q + 3] = 255;
      }
    }
    this.ctx.putImageData(out, 0, 0);

    // The lamp's broken streak on the water, the only warm one.
    if (S.lamp > 0.02) {
      const ctx = this.ctx;
      const wh = S.H - S.hz;
      ctx.save();
      ctx.setTransform(gw / S.W, 0, 0, gh / wh, 0, 0);
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgb(${k[0]},${Math.min(255, k[1] + 40)},${Math.min(255, k[2] + 60)})`;
      const y0 = S.yb - S.hz + 4;
      const span = wh - y0;
      for (let y = y0; y < wh; y += 3) {
        const dd = (y - y0) / span;
        const n = 0.5 + 0.5 * Math.sin(y * 0.31 + ts * 2.1) * Math.sin(y * 0.07 - ts * 0.8);
        if (n < 0.45) continue;
        ctx.globalAlpha = S.lamp * 0.3 * (0.35 + 0.65 * Math.sin(dd * Math.PI * 0.9)) * n;
        const w = 10 * (0.6 + 2.2 * dd) * n;
        ctx.fillRect(S.lampX - w / 2 + amb * 3 * Math.sin(y * 0.09 - ts * 1.1), y, w, 1.5);
      }
      ctx.restore();
    }
  }
}

export const water = new Water($<HTMLCanvasElement>("water"));
