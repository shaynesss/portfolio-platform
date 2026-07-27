// The cathedral nave — deliberately vague/low-detail per the Design
// Brief ("doesn't have to be super detailed, can be vague and dark").
// One big enclosing box rendered from the inside (BackSide) is enough
// to read as a dark stone interior without modeling walls/ceiling/floor
// as separate pieces.

import * as THREE from "three";

const NAVE_WIDTH = 9;
const NAVE_HEIGHT = 14;
const NAVE_DEPTH = 27;
// Centered to comfortably contain the whole post-gate camera path
// (hinge z-1.2 through the rose-window turn-around at z-11) plus the
// rose window itself (~y8.3 at its top) with margin on every side.
const NAVE_CENTER = new THREE.Vector3(0, 3, 0);

const STONE_COLOR = 0x151519;

export interface NaveAsset {
  group: THREE.Group;
  dispose: () => void;
}

export function buildNave(): NaveAsset {
  const geometry = new THREE.BoxGeometry(NAVE_WIDTH, NAVE_HEIGHT, NAVE_DEPTH);
  const material = new THREE.MeshStandardMaterial({
    color: STONE_COLOR,
    roughness: 0.96,
    metalness: 0.02,
    side: THREE.BackSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(NAVE_CENTER);

  const group = new THREE.Group();
  group.add(mesh);

  return {
    group,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}
