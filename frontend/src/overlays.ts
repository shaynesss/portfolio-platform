import { track } from "./analytics";
import { indexCard, noteHTML, projectCard } from "./cards";
import { STOCK, type Project } from "./content";
import { S, dom } from "./state";
import { dur } from "./util";

/*
 * Opening a drawer: the drawer slides out towards the viewer, an index card rises
 * out of it and settles on the left, and the project card opens on the right. The
 * card is built at its final size and animated down from the drawer, so its type
 * stays sharp instead of being scaled up from a small render.
 */
export function openDrawer(p: Project, el: HTMLButtonElement, slot: number): void {
  if (S.open || S.busy || S.proj) return;
  const sr = dom.stage.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const narrow = sr.width < 760;
  const solo = p.id === "wip";
  const x0 = r.left - sr.left;
  const y0 = r.top - sr.top;

  const clone = document.createElement("div");
  clone.className = "drawer-clone";
  clone.setAttribute("aria-hidden", "true");
  clone.style.cssText = `left:${x0}px;top:${y0}px;width:${r.width}px;height:${r.height}px`;
  const copy = el.cloneNode(true) as HTMLElement;
  copy.tabIndex = -1;
  copy.style.cssText = "width:100%;height:100%;visibility:visible";
  clone.appendChild(copy);

  const cw = narrow ? Math.min(sr.width - 40, 340) : Math.min(430, sr.width * 0.32);
  const ch = cw * 0.6;
  const cx = solo || narrow ? sr.width / 2 : Math.max(40 + cw / 2, sr.width * 0.25);
  const cy = solo ? sr.height / 2 : narrow ? 30 + ch / 2 : sr.height / 2;
  const ic = document.createElement("div");
  ic.className = "icard";
  ic.style.cssText = `left:${cx - cw / 2}px;top:${cy - ch / 2}px;width:${cw}px;height:${ch}px;--u:${cw / 430};--stock:${STOCK[p.category]}`;
  ic.innerHTML = indexCard(p, slot);

  const s0 = (r.width * 0.82) / cw;
  const dx0 = x0 + r.width / 2 - cx;
  const dy0 = y0 + r.height * 0.35 - cy;
  const kf: Keyframe[] = [
    { transform: `translate(${dx0}px,${dy0}px) scale(${s0})`, opacity: 0 },
    { transform: `translate(${dx0}px,${dy0 - r.height * 0.9}px) scale(${s0})`, opacity: 1, offset: 0.38 },
    { transform: "translate(0px,0px) scale(1) rotate(-2deg)", opacity: 1 },
  ];
  const kfD: Keyframe[] = [
    { transform: "translate(0,0) scale(1)" },
    { transform: "translate(0,10px) scale(1.14)", offset: 0.3 },
    { transform: "translate(0,10px) scale(1.14)", opacity: 1, offset: 0.7 },
    { transform: "translate(0,10px) scale(1.14)", opacity: 0 },
  ];

  const card = document.createElement("div");
  card.className = "r-card";
  card.style.cssText = narrow
    ? `top:${30 + ch + 26}px;left:16px;right:16px;bottom:10px`
    : `top:24px;bottom:24px;left:${sr.width / 2 + 16}px;right:16px`;
  card.innerHTML = solo ? "" : projectCard(p);

  dom.read.append(ic, clone, card);
  track("drawer-open", { project: p.id });
  S.open = { el, anim: ic, clone, card, kf, kfD };
  S.busy = true;
  el.setAttribute("aria-expanded", "true");
  dom.read.classList.add("on");
  ic.addEventListener("click", () => closeAll());
  clone.animate(kfD, { duration: dur(1100), easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" });
  ic.animate(kf, { duration: dur(1100), easing: "cubic-bezier(.5,0,.15,1)", fill: "forwards" }).finished.then(() => {
    dom.read.classList.add("show");
    S.busy = false;
    const title = card.querySelector<HTMLElement>(".c-title");
    if (title) {
      title.tabIndex = -1;
      title.focus({ preventScroll: true });
    } else dom.close.focus({ preventScroll: true });
  });
}

/** The bottle's note: how many hidden things have been found. */
export function openNote(): void {
  if (S.open) return;
  const sr = dom.stage.getBoundingClientRect();
  const w = Math.min(340, sr.width - 48);
  const note = document.createElement("div");
  note.className = "note";
  note.setAttribute("role", "dialog");
  note.setAttribute("aria-labelledby", "n-count");
  note.style.cssText = `left:${(sr.width - w) / 2}px;width:${w}px;top:${Math.max(40, sr.height * 0.22)}px;max-height:${sr.height * 0.7}px`;
  note.innerHTML = noteHTML();
  dom.read.appendChild(note);
  S.open = { card: note };
  dom.read.classList.add("on");
  requestAnimationFrame(() => dom.read.classList.add("show"));
  dom.close.focus({ preventScroll: true });
}

export function closeAll(instant = false): void {
  const o = S.open;
  if (!o || (S.busy && !instant)) return;
  dom.read.classList.remove("show");
  const done = () => {
    o.card.remove();
    o.anim?.remove();
    o.clone?.remove();
    if (o.el) {
      o.el.setAttribute("aria-expanded", "false");
      if (!instant) o.el.focus({ preventScroll: true });
    }
    S.open = null;
    S.busy = false;
  };
  setTimeout(() => dom.read.classList.remove("on"), instant ? 0 : dur(420));
  if (o.anim && o.kf && o.kfD) {
    S.busy = true;
    const back = o.kf
      .slice()
      .reverse()
      .map((k, n) => ({ ...k, offset: n === 1 ? 0.72 : undefined }));
    o.clone?.animate(o.kfD.slice().reverse().map((k) => ({ ...k, offset: undefined })), { duration: instant ? 0 : dur(800), fill: "forwards" });
    o.anim.animate(back, { duration: instant ? 0 : dur(900), easing: "cubic-bezier(.5,0,.2,1)", fill: "forwards" }).finished.then(done);
  } else setTimeout(done, instant ? 0 : dur(420));
}

dom.close.addEventListener("click", () => closeAll());
dom.read.querySelector(".veil")?.addEventListener("click", () => closeAll());
