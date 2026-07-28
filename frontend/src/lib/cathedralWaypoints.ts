// Camera rig for the cathedral scene — one shared camera moving through
// named waypoints, replacing the old per-section independent canvases.
//
// SCAFFOLD NOTE: these positions are rough placeholders, not tuned to
// final geometry — the nave and rose window are still just placeholder
// atmosphere (tasks 3-4). They exist to prove the camera path/beats feel
// right; expect further retuning once those assets land.

import * as THREE from "three";

export interface CameraWaypoint {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
}

// Tight enough that the gate itself dominates the frame — a hero
// object with a little breathing room, not a small shape floating in a
// lot of empty background. Retuned again to frame just the gate
// (ground through the arch peak, ~y=-1.9 to 3.85) without reaching high
// enough to catch the rose window's own bottom edge (~y=4.15) — Shayne
// flagged the window peeking through at the top of this shot as a real
// leak, not an intentional teaser.
export const GATE_WAYPOINT: CameraWaypoint = {
  position: new THREE.Vector3(0, 0.45, 7.6),
  lookAt: new THREE.Vector3(0, 0.85, 0),
};

// Click-triggered (not scroll-driven — see applyJourneyCamera below):
// the camera actually crosses the gate's threshold (the doors sit at
// z=0 — see gateAsset.ts) and stops just past it, not somewhere still
// in front of it. Pulled back ever so slightly (z=-1.2 -> -0.5, just
// barely past the threshold rather than a stride in) — the gate->hinge
// shot itself was already right, this is a small nudge, not a rework.
// lookAt height matches GATE_WAYPOINT's exactly (y=1) — no tilt yet.
// The perspective shift from moving forward reads as motion on its
// own; panning the gaze on top of that before the camera has even
// gone anywhere reads as fake. About appears here, once the camera has
// actually stepped through — before scroll does anything at all.
export const HINGE_WAYPOINT: CameraWaypoint = {
  position: new THREE.Vector3(0, 0.5, -0.5),
  lookAt: new THREE.Vector3(0, 1, -6),
};

// A real walk further in this time (z -1.2 -> -6.5, more than double
// the previous distance) — where the gaze first starts lifting (from
// y=1 to y=3), coinciding with How I Work appearing. This is the first
// beat that pans; the hinge->here move should read as walking, not
// looking around yet.
export const NAVE_WAYPOINT: CameraWaypoint = {
  position: new THREE.Vector3(0, 0.5, -6.5),
  lookAt: new THREE.Vector3(0, 3, -11),
};

// The rose window sits above the gate we just walked through — turning
// back around to find it. Framed to show it in context (the gate's own
// archway silhouette visible below it, as a small margin strip — about
// a quarter of the frame) rather than a tight crop on only the glass.
// Computed from the actual geometry rather than eyeballed (see
// gateAsset.ts/roseWindowAsset.ts): window spans y=[4.5, 8.3], gate
// arch peak is around y=4 — targets a visible vertical span of roughly
// y=[2.5, 9] (gate silhouette in the bottom ~25%, window filling the
// rest with a little headroom) at ~45° FOV, solved for distance so
// that span fills most of the frame height.
export const ROSE_WINDOW_WAYPOINT: CameraWaypoint = {
  position: new THREE.Vector3(0, 4.5, -9),
  lookAt: new THREE.Vector3(0, 5.75, 0.3),
};

// Fraction of the post-gate scroll journey spent moving the camera
// between waypoints vs. holding still so DOM content can be read.
// HINGE_TO_NAVE_TRANSITION grew to match the nave walk's longer
// physical distance — proportionate, not doubled, since JOURNEY_VH
// (App.tsx) also grew a bit to give it real absolute scroll room.
// NAVE_TO_ROSE_TRANSITION still dominates — it's the turn-around onto
// the window, the biggest and slowest move in the whole sequence.
export const HINGE_TO_NAVE_TRANSITION = 0.16;
export const NAVE_HOLD = 0.18;
export const NAVE_TO_ROSE_TRANSITION = 0.43;
export const ROSE_WINDOW_HOLD = 0.23;

export function easeInOutCubic(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

function lerpWaypoint(
  a: CameraWaypoint,
  b: CameraWaypoint,
  t: number,
  outPosition: THREE.Vector3,
  outLookAt: THREE.Vector3,
) {
  outPosition.lerpVectors(a.position, b.position, easeInOutCubic(t));
  outLookAt.lerpVectors(a.lookAt, b.lookAt, easeInOutCubic(t));
}

// journeyRaw: 0-1 across the whole post-gate scrollable journey, which
// starts at HINGE_WAYPOINT (raw=0) — the click-triggered gate->hinge
// move happens before this, driven separately by CathedralScene's own
// camera easing once gateOpened flips true (see there). Writes the
// interpolated camera position/lookAt into the two out vectors (avoids
// allocating every frame in the render loop).
export function applyJourneyCamera(
  journeyRaw: number,
  outPosition: THREE.Vector3,
  outLookAt: THREE.Vector3,
) {
  const raw = Math.min(1, Math.max(0, journeyRaw));
  const naveHoldStart = HINGE_TO_NAVE_TRANSITION;
  const naveHoldEnd = naveHoldStart + NAVE_HOLD;
  const roseTransitionEnd = naveHoldEnd + NAVE_TO_ROSE_TRANSITION;

  if (raw <= naveHoldStart) {
    lerpWaypoint(HINGE_WAYPOINT, NAVE_WAYPOINT, raw / HINGE_TO_NAVE_TRANSITION, outPosition, outLookAt);
  } else if (raw <= naveHoldEnd) {
    outPosition.copy(NAVE_WAYPOINT.position);
    outLookAt.copy(NAVE_WAYPOINT.lookAt);
  } else if (raw <= roseTransitionEnd) {
    const t = (raw - naveHoldEnd) / NAVE_TO_ROSE_TRANSITION;
    lerpWaypoint(NAVE_WAYPOINT, ROSE_WINDOW_WAYPOINT, t, outPosition, outLookAt);
  } else {
    outPosition.copy(ROSE_WINDOW_WAYPOINT.position);
    outLookAt.copy(ROSE_WINDOW_WAYPOINT.lookAt);
  }
}

// Crossfade weight (0-1) for the About content vs. "How I Work",
// spanning just the hinge->nave transition — 0 = still at the hinge
// (About visible), 1 = arrived at the nave (How I Work visible).
export function hingeToNaveT(journeyRaw: number): number {
  const raw = Math.min(1, Math.max(0, journeyRaw));
  return easeInOutCubic(raw / HINGE_TO_NAVE_TRANSITION);
}

// Crossfade weight (0-1) for the "How I Work" content vs. the
// "Projects" content, driven by the same raw journey progress so the
// DOM overlay never drifts out of sync with the camera. 0 = How I Work
// fully visible, 1 = Projects fully visible.
export function journeyContentT(journeyRaw: number): number {
  const raw = Math.min(1, Math.max(0, journeyRaw));
  const naveHoldEnd = HINGE_TO_NAVE_TRANSITION + NAVE_HOLD;
  const roseTransitionEnd = naveHoldEnd + NAVE_TO_ROSE_TRANSITION;

  if (raw <= naveHoldEnd) return 0;
  if (raw >= roseTransitionEnd) return 1;
  return easeInOutCubic((raw - naveHoldEnd) / NAVE_TO_ROSE_TRANSITION);
}
