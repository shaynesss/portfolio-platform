// The cathedral's exterior west facade — the solid stone wall the gate
// and rose window actually sit IN. Added 2026-07-27 after Shayne
// pointed out the nave's interior columns and the rose window were
// both visible from the closed-gate exterior view: gateAsset.ts only
// builds the narrow gate structure itself (~4.25 wide), and nothing
// else was blocking the view past its edges into the much wider (9
// unit) nave interior. This fills that gap — side panels beyond the
// gate/window's own footprint, a top panel above the window, and a
// plinth beneath the gate closing the gap down to the nave floor —
// leaving only the gate's own doorway and the window's own footprint
// unblocked, both handled by their own asset files.

import * as THREE from "three";
import { createStoneTexture } from "@/lib/proceduralTextures";
import { ARCH_SPAN, GATE_BASE_Y } from "@/lib/gateAsset";
import { WINDOW_CENTER, WINDOW_TOTAL_RADIUS } from "@/lib/roseWindowAsset";

// Must match naveAsset.ts's own box dimensions/position — duplicated
// rather than imported to keep these files independent; update both if
// the nave's footprint ever changes.
const NAVE_WIDTH = 9;
const NAVE_FLOOR_Y = -4;
const NAVE_CEILING_Y = 10;
const FACADE_Z = -0.32;

export interface FacadeAsset {
  group: THREE.Group;
  dispose: () => void;
}

export function buildFacade(): FacadeAsset {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const texture = track(createStoneTexture());
  texture.repeat.set(NAVE_WIDTH / 3, (NAVE_CEILING_Y - NAVE_FLOOR_Y) / 4);
  const material = track(
    new THREE.MeshStandardMaterial({
      map: texture,
      color: 0xffffff,
      roughness: 0.94,
      metalness: 0.03,
    }),
  );

  // Central column stays open for the gate/window — must clear both
  // the gate's own half-span and the window's total radius.
  const centralHalfWidth = Math.max(ARCH_SPAN / 2, WINDOW_TOTAL_RADIUS) + 0.1;
  const sideWidth = NAVE_WIDTH / 2 - centralHalfWidth;
  const fullHeight = NAVE_CEILING_Y - NAVE_FLOOR_Y;

  if (sideWidth > 0.05) {
    const sideGeometry = track(new THREE.PlaneGeometry(sideWidth, fullHeight));
    const centerY = (NAVE_FLOOR_Y + NAVE_CEILING_Y) / 2;
    for (const side of [-1, 1]) {
      const panel = new THREE.Mesh(sideGeometry, material);
      panel.position.set(side * (centralHalfWidth + sideWidth / 2), centerY, FACADE_Z);
      group.add(panel);
    }
  }

  // Above the window, up to the ceiling.
  const windowTopY = WINDOW_CENTER.y + WINDOW_TOTAL_RADIUS;
  const topHeight = NAVE_CEILING_Y - windowTopY;
  if (topHeight > 0.05) {
    const topGeometry = track(new THREE.PlaneGeometry(NAVE_WIDTH, topHeight));
    const topPanel = new THREE.Mesh(topGeometry, material);
    topPanel.position.set(0, windowTopY + topHeight / 2, FACADE_Z);
    group.add(topPanel);
  }

  // Plinth beneath the gate, closing the gap down to the nave floor —
  // without this the gate's own base (GATE_BASE_Y) just trails off
  // into void above the floor, reading as "not filled at the bottom."
  const plinthHeight = GATE_BASE_Y - NAVE_FLOOR_Y;
  if (plinthHeight > 0.05) {
    const plinthGeometry = track(new THREE.PlaneGeometry(centralHalfWidth * 2, plinthHeight));
    const plinth = new THREE.Mesh(plinthGeometry, material);
    plinth.position.set(0, NAVE_FLOOR_Y + plinthHeight / 2, FACADE_Z);
    group.add(plinth);
  }

  return {
    group,
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}
