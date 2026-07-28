// The cathedral nave. Rebuilt 2026-07-27 for real structure (see
// SPEC.md's "Architectural density pass") — previously a single flat
// textured box read as empty; now the box keeps a dedicated ribbed-
// vault ceiling face, engaged side columns run along both walls at a
// regular rhythm as the camera travels through, and the gate-facing
// wall carries a blind-arcade band of narrow window openings between
// the door and the rose window (matching the reference photo's layout
// — that same wall holds the gate and rose window objects, built
// separately in gateAsset.ts/roseWindowAsset.ts).

import * as THREE from "three";
import {
  createStoneTexture,
  createVaultTexture,
  createArcadeBandTexture,
} from "@/lib/proceduralTextures";
import { ARCH_PEAK_HEIGHT, GATE_BASE_Y, PILLAR_HEIGHT } from "@/lib/gateAsset";
import { WINDOW_CENTER, WINDOW_TOTAL_RADIUS } from "@/lib/roseWindowAsset";

const NAVE_WIDTH = 9;
const NAVE_HEIGHT = 14;
const NAVE_DEPTH = 27;
// Centered to comfortably contain the whole post-gate camera path
// (hinge z-1.2 through the rose-window turn-around at z-11) plus the
// rose window itself (~y8.3 at its top) with margin on every side.
const NAVE_CENTER = new THREE.Vector3(0, 3, 0);

export interface NaveAsset {
  group: THREE.Group;
  dispose: () => void;
}

export function buildNave(): NaveAsset {
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const wallTexture = track(createStoneTexture());
  wallTexture.repeat.set(NAVE_WIDTH / 2, NAVE_DEPTH / 2);
  const ceilingTexture = track(createVaultTexture());
  ceilingTexture.repeat.set(NAVE_WIDTH / 2, NAVE_DEPTH / 3);

  // Walls read as dim/receding stone the camera moves through (mid-
  // grey tint multiplied against the already-dark texture lands
  // near-black), while the ceiling gets its own brighter tint so the
  // rib pattern is actually visible when the camera tilts up to it.
  const wallMaterial = track(
    new THREE.MeshStandardMaterial({
      map: wallTexture,
      color: 0x3a3a42,
      roughness: 0.96,
      metalness: 0.02,
      side: THREE.BackSide,
    }),
  );
  const ceilingMaterial = track(
    new THREE.MeshStandardMaterial({
      map: ceilingTexture,
      color: 0x6a6a76,
      roughness: 0.9,
      metalness: 0.02,
      side: THREE.BackSide,
    }),
  );

  // BoxGeometry's default face groups are [+X, -X, +Y, -Y, +Z, -Z] —
  // index 2 (+Y) is the one we want the vault texture on; the rest
  // share the plain wall material.
  const geometry = track(new THREE.BoxGeometry(NAVE_WIDTH, NAVE_HEIGHT, NAVE_DEPTH));
  const mesh = new THREE.Mesh(geometry, [
    wallMaterial,
    wallMaterial,
    ceilingMaterial,
    wallMaterial,
    wallMaterial,
    wallMaterial,
  ]);
  mesh.position.copy(NAVE_CENTER);

  const group = new THREE.Group();
  group.add(mesh);

  // Engaged side columns — a plain cylinder shaft attached to each
  // side wall's inner face, repeated at a steady rhythm along the
  // camera's whole travel range, so the nave reads as a colonnaded
  // interior instead of an empty box. Z_FRONT must stay behind the gate
  // (z=0) — it was previously +6 (in front of the gate, in the exterior
  // space the closed-gate camera sits in), which is exactly why columns
  // were visible from outside before anything opened.
  const COLUMN_RADIUS = 0.26;
  const COLUMN_HEIGHT = 7.5;
  const COLUMN_Y = NAVE_CENTER.y - 3.5;
  const COLUMN_Z_FRONT = -0.6;
  const COLUMN_Z_BACK = -11;
  const COLUMN_SPACING = 2.8;
  const columnGeometry = track(
    new THREE.CylinderGeometry(COLUMN_RADIUS, COLUMN_RADIUS, COLUMN_HEIGHT, 12),
  );
  const innerX = NAVE_WIDTH / 2 - COLUMN_RADIUS * 0.6;
  for (let z = COLUMN_Z_FRONT; z >= COLUMN_Z_BACK; z -= COLUMN_SPACING) {
    for (const side of [-1, 1]) {
      const column = new THREE.Mesh(columnGeometry, wallMaterial);
      column.position.set(side * innerX, COLUMN_Y, z);
      group.add(column);
    }
  }

  // Blind-arcade band on the gate-facing wall — a thin decorative
  // plane (not real depth, the vertical gap between the gate's arch
  // and the rose window is tight) spanning a row of narrow arched
  // openings, sized to the actual gap between the arch peak and the
  // window's own footprint (both imported) rather than guessed
  // constants, so it can't silently overlap either one again if either
  // file's numbers change. Faces -Z since the camera approaching from
  // the nave (more negative Z) looks back toward +Z.
  const archPeakY = GATE_BASE_Y + PILLAR_HEIGHT + ARCH_PEAK_HEIGHT;
  const windowBottomY = WINDOW_CENTER.y - WINDOW_TOTAL_RADIUS;
  const arcadeGapMargin = 0.05;
  const arcadeCenterY = (archPeakY + windowBottomY) / 2;
  const arcadeHeight = Math.max(0.15, windowBottomY - archPeakY - arcadeGapMargin * 2);

  const arcadeTexture = track(createArcadeBandTexture());
  const arcadeMaterial = track(
    new THREE.MeshStandardMaterial({
      map: arcadeTexture,
      color: 0xffffff,
      roughness: 0.85,
      side: THREE.DoubleSide,
    }),
  );
  const ARCADE_WIDTH = 5.4;
  const arcadeGeometry = track(new THREE.PlaneGeometry(ARCADE_WIDTH, arcadeHeight));
  const arcade = new THREE.Mesh(arcadeGeometry, arcadeMaterial);
  arcade.position.set(0, arcadeCenterY, 0.25);
  group.add(arcade);

  return {
    group,
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}
