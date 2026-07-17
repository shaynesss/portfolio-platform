import { useEffect, useRef } from "react";
import * as THREE from "three";

const SPACING = 0.8;
const DOT_SIZE_PX = 7.5;
const BACKGROUND_COLOR = 0x030304;
const DOT_COLOR = new THREE.Color("#e4e4e7");
const CAMERA_Z = 25;
const CAMERA_FOV = 50;

// Each dot gets its own random start time within this window, so the
// field visibly fills in — a few dots, then more, then more — rather
// than the whole field brightening uniformly.
const STAGGER_WINDOW_SECONDS = 2.2;
// Once a dot's turn comes, how long its own fade-in (and depth arrival,
// see APPEAR_DEPTH_OFFSET) takes.
const PARTICLE_FADE_SECONDS = 1.4;

// How far (world units) a dot's push from the cursor reaches.
const REPEL_RADIUS = 1.8;
// Maximum displacement (world units) at the cursor's exact position.
const MAX_PUSH = 1.8;
// How fast displacement eases toward its target each second — governs
// both how quickly a dot springs away and how quickly it returns home.
const EASE_SPEED = 5.5;

// Full range of each dot's resting depth (world units) — was a barely-
// there ±1 sliver; wide enough now that perspective size/fog actually
// read as depth instead of every dot looking the same distance away.
const DEPTH_RANGE = 14;
// Extra distance (world units) beyond its resting depth that each dot
// starts at before drifting in as it appears — turns the landing
// sequence into dots condensing out of the dark toward the viewer,
// rather than a flat in-place fade.
const APPEAR_DEPTH_OFFSET = 10;
// Perspective size falloff: a dot at this view-space distance renders
// at exactly uSize; closer reads bigger, farther reads smaller.
const SIZE_REF_DIST = CAMERA_Z;
// Fog window (view-space distance): fully bright at/inside FOG_NEAR,
// fully dimmed by FOG_FAR — sells atmospheric depth on top of size.
const FOG_NEAR = CAMERA_Z - DEPTH_RANGE / 2 - 2;
const FOG_FAR = CAMERA_Z + DEPTH_RANGE / 2 + APPEAR_DEPTH_OFFSET + 4;

// Subtle camera drift toward the cursor's screen position — near and
// far dots shift at different apparent rates as the camera re-aims,
// the classic parallax depth cue a flat crossfade can't give you.
const PARALLAX_STRENGTH = 2.4;
const PARALLAX_EASE_SPEED = 1.8;

// Exported so other landing-sequence UI (About's text fade) can wait
// until the particle field has essentially finished appearing.
export const LANDING_SEQUENCE_MS =
  (STAGGER_WINDOW_SECONDS + PARTICLE_FADE_SECONDS) * 1000;

const VERTEX_SHADER = `
  attribute float aPhase;
  attribute float aAppearAt;
  attribute float aAppearDepthOffset;
  uniform float uOscTime;
  uniform float uAppearElapsed;
  uniform float uSize;
  uniform float uParticleFadeSeconds;
  uniform float uSizeRefDist;
  uniform float uFogNear;
  uniform float uFogFar;
  varying float vOpacity;

  void main() {
    float appear = clamp(
      (uAppearElapsed - aAppearAt) / uParticleFadeSeconds,
      0.0,
      1.0
    );
    // Ease-out cubic: arrives quickly, settles gently — reads as
    // condensing into place rather than a linear drift.
    float appearEase = 1.0 - pow(1.0 - appear, 3.0);

    vec3 animatedPosition = position;
    animatedPosition.z -= aAppearDepthOffset * (1.0 - appearEase);

    vec4 mvPosition = modelViewMatrix * vec4(animatedPosition, 1.0);
    float viewDist = -mvPosition.z;

    float sizeRatio = clamp(uSizeRefDist / viewDist, 0.4, 2.2);
    gl_PointSize = uSize * sizeRatio;
    gl_Position = projectionMatrix * mvPosition;

    float fog = clamp((uFogFar - viewDist) / (uFogFar - uFogNear), 0.0, 1.0);
    float breathe = 0.05 + 0.85 * (0.5 + 0.5 * sin(uOscTime + aPhase));
    vOpacity = appearEase * breathe * fog;
  }
`;

const FRAGMENT_SHADER = `
  uniform vec3 uColor;
  varying float vOpacity;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float edge = smoothstep(0.5, 0.2, dist);
    gl_FragColor = vec4(uColor, vOpacity * edge);
  }
`;

function buildGeometry(width: number, height: number) {
  // Cover the viewport at CAMERA_Z with ~30% overscan margin so edges
  // stay filled through resizes without rebuilding on every frame.
  const worldHeight =
    2 * Math.tan((CAMERA_FOV * Math.PI) / 360) * CAMERA_Z * 1.3;
  const worldWidth = worldHeight * (width / height) * 1.3;

  const cols = Math.ceil(worldWidth / SPACING);
  const rows = Math.ceil(worldHeight / SPACING);
  const count = cols * rows;

  const basePositions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const appearTimes = new Float32Array(count);
  const appearDepthOffsets = new Float32Array(count);

  let i = 0;
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      basePositions[i * 3] = (x - cols / 2) * SPACING;
      basePositions[i * 3 + 1] = (y - rows / 2) * SPACING;
      basePositions[i * 3 + 2] = (Math.random() - 0.5) * DEPTH_RANGE;
      phases[i] = Math.random() * Math.PI * 2;
      appearTimes[i] = Math.random() * STAGGER_WINDOW_SECONDS;
      appearDepthOffsets[i] = Math.random() * APPEAR_DEPTH_OFFSET;
      i++;
    }
  }

  // The attribute gets its own copy — basePositions stays the fixed
  // "home" each dot springs back to, livePositions is what's actually
  // displaced and rendered each frame.
  const livePositions = basePositions.slice();

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(livePositions, 3),
  );
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute(
    "aAppearAt",
    new THREE.BufferAttribute(appearTimes, 1),
  );
  geometry.setAttribute(
    "aAppearDepthOffset",
    new THREE.BufferAttribute(appearDepthOffsets, 1),
  );
  return { geometry, basePositions, count };
}

export default function DotBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      CAMERA_FOV,
      window.innerWidth / window.innerHeight,
      0.1,
      100,
    );
    camera.position.set(0, 0, CAMERA_Z);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(BACKGROUND_COLOR, 1);
    container.appendChild(renderer.domElement);

    let { geometry, basePositions, count } = buildGeometry(
      window.innerWidth,
      window.innerHeight,
    );
    let dispX = new Float32Array(count);
    let dispY = new Float32Array(count);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uOscTime: { value: 0 },
        uAppearElapsed: {
          value: prefersReducedMotion
            ? STAGGER_WINDOW_SECONDS + PARTICLE_FADE_SECONDS
            : 0,
        },
        uSize: { value: DOT_SIZE_PX * pixelRatio },
        uColor: { value: DOT_COLOR },
        uParticleFadeSeconds: { value: PARTICLE_FADE_SECONDS },
        uSizeRefDist: { value: SIZE_REF_DIST },
        uFogNear: { value: FOG_NEAR },
        uFogFar: { value: FOG_FAR },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    let points = new THREE.Points(geometry, material);
    scene.add(points);

    // --- cursor tracking, projected onto the dot field's z=0 plane ---
    const raycaster = new THREE.Raycaster();
    const pointerNDC = new THREE.Vector2();
    let hasPointer = false;
    let cursorWorld: THREE.Vector3 | null = null;

    const handlePointerMove = (event: PointerEvent) => {
      pointerNDC.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointerNDC.y = -(event.clientY / window.innerHeight) * 2 + 1;
      hasPointer = true;
    };
    const handlePointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget) hasPointer = false;
    };
    window.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerout", handlePointerOut);

    const clock = new THREE.Clock();
    let frameId: number | null = null;
    let camOffsetX = 0;
    let camOffsetY = 0;

    const render = () => {
      const delta = clock.getDelta();
      const elapsed = clock.elapsedTime;
      material.uniforms.uOscTime.value = elapsed * 2.4;
      material.uniforms.uAppearElapsed.value = elapsed;

      // Camera drifts toward the cursor's screen position and re-aims
      // at the field's center — near and far dots shift at different
      // apparent rates as it moves, the parallax cue a flat crossfade
      // can't give. Computed before the raycast below so the cursor's
      // world-space position reflects this frame's camera, not last
      // frame's.
      const targetCamX = hasPointer ? pointerNDC.x * PARALLAX_STRENGTH : 0;
      const targetCamY = hasPointer ? pointerNDC.y * PARALLAX_STRENGTH : 0;
      const camEase = Math.min(1, PARALLAX_EASE_SPEED * delta);
      camOffsetX += (targetCamX - camOffsetX) * camEase;
      camOffsetY += (targetCamY - camOffsetY) * camEase;
      camera.position.x = camOffsetX;
      camera.position.y = camOffsetY;
      camera.lookAt(0, 0, 0);

      if (hasPointer) {
        raycaster.setFromCamera(pointerNDC, camera);
        const dir = raycaster.ray.direction;
        const t = -raycaster.ray.origin.z / dir.z;
        cursorWorld = t > 0 ? raycaster.ray.origin.clone().addScaledVector(dir, t) : null;
      } else {
        cursorWorld = null;
      }

      const posArray = geometry.attributes.position.array as Float32Array;
      const easeFactor = Math.min(1, EASE_SPEED * delta);
      for (let idx = 0; idx < count; idx++) {
        const bx = basePositions[idx * 3];
        const by = basePositions[idx * 3 + 1];
        let targetX = 0;
        let targetY = 0;

        if (cursorWorld) {
          const dx = bx - cursorWorld.x;
          const dy = by - cursorWorld.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < REPEL_RADIUS * REPEL_RADIUS && distSq > 1e-6) {
            const dist = Math.sqrt(distSq);
            const strength = (1 - dist / REPEL_RADIUS) * MAX_PUSH;
            targetX = (dx / dist) * strength;
            targetY = (dy / dist) * strength;
          }
        }

        dispX[idx] += (targetX - dispX[idx]) * easeFactor;
        dispY[idx] += (targetY - dispY[idx]) * easeFactor;
        posArray[idx * 3] = bx + dispX[idx];
        posArray[idx * 3 + 1] = by + dispY[idx];
      }
      geometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(render);
    };

    if (prefersReducedMotion) {
      // Static frame, fully visible immediately: uOscTime stays 0 so
      // aPhase alone still gives each dot its own resting opacity —
      // organic, just not animating, no staged reveal, no cursor motion.
      renderer.render(scene, camera);
    } else {
      frameId = requestAnimationFrame(render);
    }

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);

      scene.remove(points);
      geometry.dispose();
      const rebuilt = buildGeometry(window.innerWidth, window.innerHeight);
      geometry = rebuilt.geometry;
      basePositions = rebuilt.basePositions;
      count = rebuilt.count;
      dispX = new Float32Array(count);
      dispY = new Float32Array(count);
      points = new THREE.Points(geometry, material);
      scene.add(points);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerout", handlePointerOut);
      if (frameId !== null) cancelAnimationFrame(frameId);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 -z-10"
      aria-hidden="true"
    />
  );
}
