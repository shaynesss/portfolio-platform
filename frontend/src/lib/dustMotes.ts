// Dust motes drifting through implied light shafts — replaces the
// camera-rig scaffold's static placeholder point cloud (see git history)
// now that the camera path is locked against real geometry. Per the
// Design Brief: "same cursor-repel and prefers-reduced-motion behavior
// [as the old dot field], restyled." The old DotBackground's cursor-repel
// worked in 2D screen space against a fixed camera; here the camera
// travels through the whole scene, so repel instead measures each
// mote's distance to the camera's own pointer RAY in world space — the
// natural 3D analog, and cheap (no per-mote screen projection needed).
//
// Motes are confined to a couple of "shaft" volumes rather than spread
// uniformly, so they read as light falling through specific openings
// (the gate doorway, the rose window) instead of ambient fog.

import * as THREE from "three";

interface Shaft {
  origin: THREE.Vector3;
  // Unit vector — the shaft's own "flow" axis, motes drift along this.
  direction: THREE.Vector3;
  length: number;
  radiusStart: number;
  radiusEnd: number;
  count: number;
}

const SHAFTS: Shaft[] = [
  // Spills through the open gate doorway into the nave. Radius grows
  // modestly, not all the way to the nave's own width — a shaft this
  // wide stops reading as a beam and just becomes room-filling haze.
  {
    origin: new THREE.Vector3(0, 1.6, 1),
    direction: new THREE.Vector3(0, -0.12, -1).normalize(),
    length: 9,
    radiusStart: 0.3,
    radiusEnd: 1.4,
    count: 190,
  },
  // Around the rose window — the narrative's actual light source.
  {
    origin: new THREE.Vector3(0, 6.6, 1.5),
    direction: new THREE.Vector3(0, -0.08, -1).normalize(),
    length: 7,
    radiusStart: 0.35,
    radiusEnd: 1.6,
    count: 160,
  },
  // General ambient coverage through the whole nave depth — the two
  // shafts above are focused light beams, but the mid-nave stretch
  // between them read as too empty on its own; this is a wide, sparse
  // third volume so there's always some drift in frame while traveling
  // through, not just at the two hero beats.
  {
    origin: new THREE.Vector3(0, 3, 5),
    direction: new THREE.Vector3(0, -0.02, -1).normalize(),
    length: 15,
    radiusStart: 1.4,
    radiusEnd: 3,
    count: 150,
  },
];

const DRIFT_SPEED = 0.16; // fraction of shaft length per second
const WOBBLE_SPEED = 0.6;
const WOBBLE_AMOUNT = 0.12;
const REPEL_RADIUS = 1.1;
const REPEL_STRENGTH = 0.9;
const REPEL_EASE_SPEED = 6;
const RETURN_EASE_SPEED = 1.4;
const MOTE_COLOR = 0xe4d9c2;
const MOTE_SIZE = 0.035;
const MOTE_OPACITY = 0.5;

interface MoteState {
  shaftIndex: number;
  t: number; // 0-1 position along the shaft's length, wraps
  radiusFraction: number; // fixed per mote — how far out from the axis
  angle: number; // fixed per mote — angular position around the axis
  wobblePhase: number;
  offset: THREE.Vector3; // current cursor-repel displacement
}

export interface DustMotesAsset {
  points: THREE.Points;
  update: (
    delta: number,
    elapsed: number,
    rayOrigin: THREE.Vector3,
    rayDirection: THREE.Vector3,
    reducedMotion: boolean,
  ) => void;
  dispose: () => void;
}

export function buildDustMotes(): DustMotesAsset {
  const totalCount = SHAFTS.reduce((sum, shaft) => sum + shaft.count, 0);
  const positions = new Float32Array(totalCount * 3);
  const states: MoteState[] = [];

  // A stable (right, up) basis perpendicular to each shaft's own
  // direction, so motes can be placed radially around that axis.
  const shaftBasis = SHAFTS.map((shaft) => {
    const reference =
      Math.abs(shaft.direction.y) > 0.95
        ? new THREE.Vector3(1, 0, 0)
        : new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(shaft.direction, reference).normalize();
    const up = new THREE.Vector3().crossVectors(right, shaft.direction).normalize();
    return { right, up };
  });

  SHAFTS.forEach((shaft, shaftIndex) => {
    for (let i = 0; i < shaft.count; i++) {
      states.push({
        shaftIndex,
        t: Math.random(),
        radiusFraction: Math.random(),
        angle: Math.random() * Math.PI * 2,
        wobblePhase: Math.random() * Math.PI * 2,
        offset: new THREE.Vector3(),
      });
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: MOTE_COLOR,
    size: MOTE_SIZE,
    sizeAttenuation: true,
    transparent: true,
    opacity: MOTE_OPACITY,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);

  // Scratch vectors reused every frame across every mote — this runs
  // once per mote per render call, allocation here would show up.
  const scratchPos = new THREE.Vector3();
  const scratchToMote = new THREE.Vector3();
  const scratchClosest = new THREE.Vector3();
  const zeroVector = new THREE.Vector3();

  const update = (
    delta: number,
    elapsed: number,
    rayOrigin: THREE.Vector3,
    rayDirection: THREE.Vector3,
    reducedMotion: boolean,
  ) => {
    const posAttr = geometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < states.length; i++) {
      const state = states[i];
      const shaft = SHAFTS[state.shaftIndex];
      const basis = shaftBasis[state.shaftIndex];

      if (!reducedMotion) {
        state.t += DRIFT_SPEED * delta;
        if (state.t > 1) state.t -= 1;
      }

      const radius =
        THREE.MathUtils.lerp(shaft.radiusStart, shaft.radiusEnd, state.t) *
        state.radiusFraction;
      const wobble = reducedMotion
        ? 0
        : Math.sin(elapsed * WOBBLE_SPEED + state.wobblePhase) * WOBBLE_AMOUNT;

      scratchPos
        .copy(shaft.origin)
        .addScaledVector(shaft.direction, state.t * shaft.length)
        .addScaledVector(basis.right, Math.cos(state.angle) * radius + wobble)
        .addScaledVector(basis.up, Math.sin(state.angle) * radius);

      // Cursor repel: perpendicular distance from this mote to the
      // camera's pointer ray (only motes in front of the camera count).
      scratchToMote.subVectors(scratchPos, rayOrigin);
      const alongRay = scratchToMote.dot(rayDirection);
      scratchClosest.copy(rayOrigin).addScaledVector(rayDirection, alongRay);
      const distanceToRay = scratchPos.distanceTo(scratchClosest);

      if (alongRay > 0 && distanceToRay < REPEL_RADIUS) {
        const pushAmount = (1 - distanceToRay / REPEL_RADIUS) * REPEL_STRENGTH;
        scratchToMote.subVectors(scratchPos, scratchClosest).normalize().multiplyScalar(pushAmount);
        state.offset.lerp(scratchToMote, Math.min(1, REPEL_EASE_SPEED * delta));
      } else {
        state.offset.lerp(zeroVector, Math.min(1, RETURN_EASE_SPEED * delta));
      }

      scratchPos.add(state.offset);
      posAttr.setXYZ(i, scratchPos.x, scratchPos.y, scratchPos.z);
    }

    posAttr.needsUpdate = true;
  };

  return {
    points,
    update,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}
