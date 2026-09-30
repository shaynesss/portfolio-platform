import { track } from "./analytics";
import type { Project, Secret } from "./content";
import { $ } from "./util";

/** Something open over the scene: a drawer's cards, or the bottle's note. */
export interface Opened {
  el?: HTMLElement;
  card: HTMLElement;
  anim?: HTMLElement;
  clone?: HTMLElement;
  kf?: Keyframe[];
  kfD?: Keyframe[];
}

export interface Drawer {
  el: HTMLButtonElement;
  project: Project;
}

/** The scene's live state. Geometry is in CSS pixels, relative to the stage. */
export const S = {
  W: 0,
  H: 0,
  hz: 0,
  yb: 0,
  caseL: 0,
  caseT: 0,
  caseW: 0,
  lampX: 0,
  lampY: 0,
  shadeTop: 0,
  lamp: 0,
  level: 1,
  on: true,
  arrived: false,
  lampOnSince: 0,
  open: null as Opened | null,
  busy: false,
  proj: false,
  sweeping: false,
  visible: true,
  eyeX: null as number | null,
  eyeY: null as number | null,
  drawers: [] as Drawer[],
  found: new Set<Secret>(),
};

export const dom = {
  stage: $("stage"),
  wrap: $("wrap"),
  cabinet: $("cabinet"),
  lamp: $("lamp"),
  shade: $<HTMLButtonElement>("shade"),
  veil: $("veil"),
  read: $("read"),
  close: $<HTMLButtonElement>("close"),
};

export function find(key: Secret): void {
  if (S.found.has(key)) return;
  S.found.add(key);
  track("secret-found", { secret: key });
}
