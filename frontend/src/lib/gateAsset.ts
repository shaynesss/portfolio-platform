// The cathedral's entry gate — stone archway + two hinged doors.
// Deliberately low-detail/stylized (simple boxes, no carved statues) per
// the Design Brief: texture and lighting carry the read, not geometric
// fidelity. Positioned to roughly fill frame at GATE_WAYPOINT — expect
// retuning once it's judged against the real camera.

import * as THREE from "three";

export const DOOR_WIDTH = 1.6;
export const DOOR_HEIGHT = 4.4;
const DOOR_DEPTH = 0.12;
const DOOR_GAP = 0.05;
const PILLAR_WIDTH = 0.5;
const PILLAR_HEIGHT = DOOR_HEIGHT + 0.5;
export const ARCH_SPAN = DOOR_WIDTH * 2 + DOOR_GAP + PILLAR_WIDTH * 2;
const GATE_BASE_Y = -1.9;

const STONE_COLOR = 0x2c2c32;
const WOOD_COLOR = 0x1c140d;
const GLOW_COLOR = 0xffe9c2;

// How far each door swings open (radians): a small crack on hover, a
// wide swing once fully opened. Exported so CathedralScene can drive
// both states with the same interpolated angle.
export const DOOR_HOVER_CRACK_RAD = 0.11;
export const DOOR_FULL_OPEN_RAD = Math.PI * 0.58;

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

  const stoneMaterial = track(
    new THREE.MeshStandardMaterial({ color: STONE_COLOR, roughness: 0.92, metalness: 0.04 }),
  );
  const woodMaterial = track(
    new THREE.MeshStandardMaterial({ color: WOOD_COLOR, roughness: 0.8, metalness: 0.03 }),
  );

  // Side pillars.
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

  // Pointed (Gothic) lintel — two angled slabs meeting at a peak above
  // the doorway, simple enough to read as an arch silhouette without a
  // custom lathe/extrude shape.
  const lintelGeometry = track(new THREE.BoxGeometry(ARCH_SPAN / 2 + 0.15, 0.42, PILLAR_WIDTH));
  const lintelBaseY = GATE_BASE_Y + PILLAR_HEIGHT;
  const leftLintel = new THREE.Mesh(lintelGeometry, stoneMaterial);
  leftLintel.position.set(-ARCH_SPAN / 4 + 0.1, lintelBaseY + 0.55, 0);
  leftLintel.rotation.z = Math.PI / 7;
  const rightLintel = new THREE.Mesh(lintelGeometry, stoneMaterial);
  rightLintel.position.set(ARCH_SPAN / 4 - 0.1, lintelBaseY + 0.55, 0);
  rightLintel.rotation.z = -Math.PI / 7;
  group.add(leftLintel, rightLintel);

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
