// The cathedral's entry gate — stone archway + two hinged doors.
// Rebuilt 2026-07-27 to full replica density against the actual
// reference photos (see SPEC.md's "Architectural density pass" —
// supersedes the earlier "deliberately low-detail" call): bundled
// engaged colonnettes per jamb, a real curved pointed-Gothic arch
// (not flat slabs), dense tiered niche figures up both jambs and
// around the arch, door hardware, and flanking ground statues.
// Positioned to roughly fill frame at GATE_WAYPOINT.

import * as THREE from "three";
import { createStoneTexture, createWoodTexture } from "@/lib/proceduralTextures";

export const DOOR_WIDTH = 1.6;
export const DOOR_HEIGHT = 4.4;
const DOOR_DEPTH = 0.12;
const DOOR_GAP = 0.05;
const PILLAR_WIDTH = 0.5;
export const PILLAR_HEIGHT = DOOR_HEIGHT + 0.5;
export const ARCH_SPAN = DOOR_WIDTH * 2 + DOOR_GAP + PILLAR_WIDTH * 2;
export const GATE_BASE_Y = -1.9;

const GLOW_COLOR = 0xffe9c2;

// How far each door swings open (radians): a small crack on hover, a
// wide swing once fully opened. Exported so CathedralScene can drive
// both states with the same interpolated angle.
export const DOOR_HOVER_CRACK_RAD = 0.11;
export const DOOR_FULL_OPEN_RAD = Math.PI * 0.58;

// Pointed Gothic arch — two circular arcs meeting at a vertical-tangent
// peak, each centered on the springing line at a small inward offset
// from the OPPOSITE spring point (a "drop arch," shallower than the
// classic full-equilateral construction — that construction's peak
// would sit at ~0.87x the span, well outside GATE_WAYPOINT's existing
// frame). Closed-form for a symmetric two-centered arch with half-span
// W and peak height H: the right arc's center sits at
// c = (W² - H²) / (2W) on the springing line, radius r = W - c.
const ARCH_HALF_SPAN = ARCH_SPAN / 2;
// Shrunk from 0.28 -> 0.2 (peak ~3.85 above the springing line, vs. the
// rose window's own bottom edge at ~4.15 — see roseWindowAsset.ts's
// DECORATIVE_OUTER_RADIUS) once the decorative petal ring widened the
// window's footprint enough to nearly collide with a taller arch. Keep
// these two files' numbers in sync if either changes again.
export const ARCH_PEAK_HEIGHT = ARCH_SPAN * 0.2;
const ARCH_CENTER_X =
  (ARCH_HALF_SPAN * ARCH_HALF_SPAN - ARCH_PEAK_HEIGHT * ARCH_PEAK_HEIGHT) /
  (2 * ARCH_HALF_SPAN);
const ARCH_RADIUS = ARCH_HALF_SPAN - ARCH_CENTER_X;
const ARCH_PEAK_ANGLE = Math.atan2(ARCH_PEAK_HEIGHT, -ARCH_CENTER_X);

// A point on the arch's curve, in the gate's own local XY plane (y=0 is
// the springing line, where the jambs end). side: 1 = right half,
// -1 = left half. t: 0 at the springing line, 1 at the peak.
function archPoint(side: 1 | -1, t: number): THREE.Vector2 {
  const centerX = side * ARCH_CENTER_X;
  const startAngle = side === 1 ? 0 : Math.PI;
  const endAngle = side === 1 ? ARCH_PEAK_ANGLE : Math.PI - ARCH_PEAK_ANGLE;
  const angle = startAngle + (endAngle - startAngle) * t;
  return new THREE.Vector2(
    centerX + Math.cos(angle) * ARCH_RADIUS,
    Math.sin(angle) * ARCH_RADIUS,
  );
}

export interface GateAsset {
  group: THREE.Group;
  leftDoorPivot: THREE.Group;
  rightDoorPivot: THREE.Group;
  glowMaterial: THREE.MeshBasicMaterial;
  hitTargets: THREE.Object3D[];
  dispose: () => void;
}

export function buildGate(): GateAsset {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  // color left white on both: the textures already bake in the
  // equivalent base tone (see proceduralTextures.ts), so a dark tint on
  // top would just double-darken and flatten out the noise variation.
  const stoneTexture = track(createStoneTexture());
  stoneTexture.repeat.set(1, 4);
  const woodTexture = track(createWoodTexture());
  woodTexture.repeat.set(2, 3);
  const stoneMaterial = track(
    new THREE.MeshStandardMaterial({
      map: stoneTexture,
      color: 0xffffff,
      roughness: 0.92,
      metalness: 0.04,
    }),
  );
  const woodMaterial = track(
    new THREE.MeshStandardMaterial({
      map: woodTexture,
      color: 0xffffff,
      roughness: 0.8,
      metalness: 0.03,
    }),
  );
  const hardwareMaterial = track(
    new THREE.MeshStandardMaterial({ color: 0x18181c, roughness: 0.55, metalness: 0.55 }),
  );

  // Side pillars — the structural core of each jamb pier.
  const pillarGeometry = track(new THREE.BoxGeometry(PILLAR_WIDTH, PILLAR_HEIGHT, PILLAR_WIDTH));
  const leftPillar = new THREE.Mesh(pillarGeometry, stoneMaterial);
  leftPillar.position.set(
    -ARCH_SPAN / 2 + PILLAR_WIDTH / 2,
    GATE_BASE_Y + PILLAR_HEIGHT / 2,
    0,
  );
  const rightPillar = new THREE.Mesh(pillarGeometry, stoneMaterial);
  rightPillar.position.set(
    ARCH_SPAN / 2 - PILLAR_WIDTH / 2,
    GATE_BASE_Y + PILLAR_HEIGHT / 2,
    0,
  );
  group.add(leftPillar, rightPillar);

  // Bundled colonnettes — engaged shafts on each pier's side faces
  // (not the front, which is reserved for niche figures below), so a
  // jamb reads as a clustered pier rather than a single flat pillar.
  const COLONNETTE_RADIUS = 0.07;
  const colonnetteGeometry = track(
    new THREE.CylinderGeometry(COLONNETTE_RADIUS, COLONNETTE_RADIUS, PILLAR_HEIGHT, 10),
  );
  for (const pillarX of [leftPillar.position.x, rightPillar.position.x]) {
    for (const side of [-1, 1]) {
      const colonnette = new THREE.Mesh(colonnetteGeometry, stoneMaterial);
      colonnette.position.set(
        pillarX + side * (PILLAR_WIDTH / 2 + COLONNETTE_RADIUS * 0.5),
        GATE_BASE_Y + PILLAR_HEIGHT / 2,
        0,
      );
      group.add(colonnette);
    }
  }

  // Pointed Gothic arch — a real curved silhouette (see archPoint above)
  // instead of two flat angled slabs. Solid mass, same as the doorway's
  // former flat lintel — no hollow, the door opening below is just
  // empty space between the pillars.
  const ARCH_CURVE_SEGMENTS = 16;
  const archShape = new THREE.Shape();
  archShape.moveTo(-ARCH_HALF_SPAN, 0);
  for (let i = 1; i <= ARCH_CURVE_SEGMENTS; i++) {
    const p = archPoint(-1, i / ARCH_CURVE_SEGMENTS);
    archShape.lineTo(p.x, p.y);
  }
  for (let i = ARCH_CURVE_SEGMENTS - 1; i >= 0; i--) {
    const p = archPoint(1, i / ARCH_CURVE_SEGMENTS);
    archShape.lineTo(p.x, p.y);
  }
  archShape.lineTo(-ARCH_HALF_SPAN, 0);
  const archGeometry = track(
    new THREE.ExtrudeGeometry(archShape, { depth: PILLAR_WIDTH, bevelEnabled: false }),
  );
  archGeometry.translate(0, 0, -PILLAR_WIDTH / 2);
  const lintelBaseY = GATE_BASE_Y + PILLAR_HEIGHT;
  const archMesh = new THREE.Mesh(archGeometry, stoneMaterial);
  archMesh.position.set(0, lintelBaseY, 0);
  group.add(archMesh);

  // Tiered niche figures — dense repeated rows up both jambs, then
  // continuing as niches following the arch's own curve, all one
  // InstancedMesh (one draw call regardless of count). Still simple
  // repeated capsule forms per figure, not individually sculpted — the
  // density comes from count, not per-figure detail, matching the
  // reference photos' rhythm without the cost of unique models.
  const NICHE_ROWS = 5;
  const NICHE_PER_ROW = 2;
  const NICHE_ROW_STEP = 0.6;
  const NICHE_RADIUS = 0.075;
  const NICHE_LENGTH = 0.26;
  const ARCH_NICHE_PER_SIDE = 5;
  const nicheGeometry = track(new THREE.CapsuleGeometry(NICHE_RADIUS, NICHE_LENGTH, 4, 8));
  const totalNiches = NICHE_ROWS * NICHE_PER_ROW * 2 + ARCH_NICHE_PER_SIDE * 2;
  const nicheMesh = new THREE.InstancedMesh(nicheGeometry, stoneMaterial, totalNiches);
  const dummy = new THREE.Object3D();
  let nicheIndex = 0;
  // Starts above the flanking ground statues (below) so the two don't
  // occupy the same vertical band on the same face.
  const nicheStartY = GATE_BASE_Y + 1.7;
  for (const pillarX of [leftPillar.position.x, rightPillar.position.x]) {
    for (let row = 0; row < NICHE_ROWS; row++) {
      const y = nicheStartY + row * NICHE_ROW_STEP;
      for (let col = 0; col < NICHE_PER_ROW; col++) {
        const xOffset = (col - (NICHE_PER_ROW - 1) / 2) * 0.16;
        dummy.position.set(pillarX + xOffset, y, PILLAR_WIDTH / 2 + NICHE_RADIUS * 0.6);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        nicheMesh.setMatrixAt(nicheIndex++, dummy.matrix);
      }
    }
  }
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < ARCH_NICHE_PER_SIDE; i++) {
      const t = 0.14 + (i / (ARCH_NICHE_PER_SIDE - 1)) * 0.68;
      const p = archPoint(side, t);
      dummy.position.set(p.x, lintelBaseY + p.y, PILLAR_WIDTH / 2 + NICHE_RADIUS * 0.6);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      nicheMesh.setMatrixAt(nicheIndex++, dummy.matrix);
    }
  }
  nicheMesh.instanceMatrix.needsUpdate = true;
  group.add(nicheMesh);

  // Flanking ground statues — larger scale than the niche figures,
  // standing on simple pedestals right beside the doors, matching the
  // reference's prominent door-level figures.
  const FLANK_RADIUS = 0.16;
  const FLANK_LENGTH = 0.9;
  const flankGeometry = track(new THREE.CapsuleGeometry(FLANK_RADIUS, FLANK_LENGTH, 4, 10));
  const pedestalGeometry = track(new THREE.BoxGeometry(0.42, 0.3, 0.32));
  for (const pillarX of [leftPillar.position.x, rightPillar.position.x]) {
    const pedestal = new THREE.Mesh(pedestalGeometry, stoneMaterial);
    pedestal.position.set(pillarX, GATE_BASE_Y + 0.15, PILLAR_WIDTH / 2 + 0.22);
    group.add(pedestal);
    const statue = new THREE.Mesh(flankGeometry, stoneMaterial);
    statue.position.set(
      pillarX,
      GATE_BASE_Y + 0.3 + (FLANK_LENGTH + FLANK_RADIUS * 2) / 2,
      PILLAR_WIDTH / 2 + 0.22,
    );
    group.add(statue);
  }

  // Doors. Each door's geometry is offset so its OUTER edge sits at
  // local x=0 — the pivot group is positioned at that outer hinge point
  // (against its pillar), so rotating the pivot swings the door around
  // its hinge rather than its center.
  const leftDoorGeometry = track(new THREE.BoxGeometry(DOOR_WIDTH, DOOR_HEIGHT, DOOR_DEPTH));
  leftDoorGeometry.translate(DOOR_WIDTH / 2, 0, 0);
  const rightDoorGeometry = track(new THREE.BoxGeometry(DOOR_WIDTH, DOOR_HEIGHT, DOOR_DEPTH));
  rightDoorGeometry.translate(-DOOR_WIDTH / 2, 0, 0);

  const leftDoorMesh = new THREE.Mesh(leftDoorGeometry, woodMaterial);
  const rightDoorMesh = new THREE.Mesh(rightDoorGeometry, woodMaterial);

  // Iron strap-hinge hardware — horizontal bands + stud rows, added as
  // children of each door mesh (in the same post-translate local space
  // as the door's own visible body) so they swing with the door.
  const STRAP_COUNT = 3;
  const strapGeometry = track(new THREE.BoxGeometry(DOOR_WIDTH * 0.92, 0.08, DOOR_DEPTH + 0.02));
  const studGeometry = track(new THREE.SphereGeometry(0.035, 8, 6));
  const addDoorHardware = (doorMesh: THREE.Mesh, doorLocalCenterX: number) => {
    for (let i = 0; i < STRAP_COUNT; i++) {
      const y = -DOOR_HEIGHT / 2 + (DOOR_HEIGHT * (i + 1)) / (STRAP_COUNT + 1);
      const strap = new THREE.Mesh(strapGeometry, hardwareMaterial);
      strap.position.set(doorLocalCenterX, y, DOOR_DEPTH / 2 + 0.005);
      doorMesh.add(strap);
      const studCount = 5;
      for (let s = 0; s < studCount; s++) {
        const sx = doorLocalCenterX + (s - (studCount - 1) / 2) * ((DOOR_WIDTH * 0.92) / studCount);
        const stud = new THREE.Mesh(studGeometry, hardwareMaterial);
        stud.position.set(sx, y, DOOR_DEPTH / 2 + 0.045);
        doorMesh.add(stud);
      }
    }
  };
  addDoorHardware(leftDoorMesh, DOOR_WIDTH / 2);
  addDoorHardware(rightDoorMesh, -DOOR_WIDTH / 2);

  const leftDoorPivot = new THREE.Group();
  leftDoorPivot.position.set(-ARCH_SPAN / 2 + PILLAR_WIDTH, GATE_BASE_Y + DOOR_HEIGHT / 2, 0);
  leftDoorPivot.add(leftDoorMesh);

  const rightDoorPivot = new THREE.Group();
  rightDoorPivot.position.set(ARCH_SPAN / 2 - PILLAR_WIDTH, GATE_BASE_Y + DOOR_HEIGHT / 2, 0);
  rightDoorPivot.add(rightDoorMesh);

  group.add(leftDoorPivot, rightDoorPivot);

  // Light-through-the-gap glow — a simple emissive plane behind the
  // seam, brightened by whatever currently drives the door-open angle
  // (hover crack or full swing), set from CathedralScene's render loop.
  const glowGeometry = track(new THREE.PlaneGeometry(0.5, DOOR_HEIGHT * 0.85));
  const glowMaterial = track(
    new THREE.MeshBasicMaterial({
      color: GLOW_COLOR,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.position.set(0, GATE_BASE_Y + DOOR_HEIGHT / 2, -0.35);
  group.add(glow);

  // A generous invisible hit-plane spanning the whole doorway, so
  // hover/click doesn't require pixel-precise aim on the door meshes.
  const hitGeometry = track(new THREE.PlaneGeometry(ARCH_SPAN, PILLAR_HEIGHT));
  const hitMaterial = track(
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
  );
  const hitPlane = new THREE.Mesh(hitGeometry, hitMaterial);
  hitPlane.position.set(0, GATE_BASE_Y + PILLAR_HEIGHT / 2, 0.1);
  group.add(hitPlane);

  return {
    group,
    leftDoorPivot,
    rightDoorPivot,
    glowMaterial,
    hitTargets: [hitPlane, leftDoorMesh, rightDoorMesh],
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}
