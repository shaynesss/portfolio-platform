import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { Project } from "@/lib/api";
import {
  GATE_WAYPOINT,
  HINGE_WAYPOINT,
  applyJourneyCamera,
  easeInOutCubic,
} from "@/lib/cathedralWaypoints";
import {
  buildGate,
  DOOR_HOVER_CRACK_RAD,
  DOOR_FULL_OPEN_RAD,
} from "@/lib/gateAsset";
import { buildNave } from "@/lib/naveAsset";
import { buildRoseWindow, type RoseWindowAsset } from "@/lib/roseWindowAsset";

const BACKGROUND_COLOR = 0x030304;
const CAMERA_FOV = 45;

// Placeholder atmosphere for the camera-rig scaffold only — a static
// scattered point cloud spanning the whole camera path (gate through
// rose-window), just so there's something in frame to read camera
// motion/parallax against. Deliberately NOT a port of DotBackground's
// dot field: that shader's size/fog falloff is tuned for a fixed camera
// at a fixed distance from a flat plane, which doesn't hold up once the
// camera itself travels through several world units of depth. The real
// "dust motes in light shafts" restyle (cursor-reactive, reduced-motion
// aware) is its own later task once the camera path is locked against
// real geometry.
const PLACEHOLDER_POINT_COUNT = 900;
const PLACEHOLDER_SPREAD_X = 14;
const PLACEHOLDER_SPREAD_Y = 10;
const PLACEHOLDER_Z_FRONT = 14;
const PLACEHOLDER_Z_BACK = -16;

function buildPlaceholderAtmosphere() {
  const positions = new Float32Array(PLACEHOLDER_POINT_COUNT * 3);
  for (let i = 0; i < PLACEHOLDER_POINT_COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * PLACEHOLDER_SPREAD_X;
    positions[i * 3 + 1] = (Math.random() - 0.5) * PLACEHOLDER_SPREAD_Y;
    positions[i * 3 + 2] =
      PLACEHOLDER_Z_FRONT + Math.random() * (PLACEHOLDER_Z_BACK - PLACEHOLDER_Z_FRONT);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xe4e4e7,
    size: 0.045,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  return new THREE.Points(geometry, material);
}

interface CathedralSceneProps {
  gateOpened: boolean;
  journeyRaw: number;
  onGateClick: () => void;
  projects: Project[];
  // Rose-window pane interaction — click/tap-only expand now (hover-to-
  // expand via wheel was tried and dropped, it didn't work reliably).
  // Hover just illuminates + subtly shakes the pane (see
  // roseWindowAsset.ts's updateExpand).
  projectExpandProgress: number[];
  onProjectHover: (index: number | null) => void;
  onProjectToggleExpand: (index: number) => void;
  // True while a pane is fully expanded (see App.tsx's isProjectExpanded).
  // The expanded panel is a modal moment — hover/click on the canvas
  // underneath must stop entirely so a click "behind" the open card can't
  // land on a different pane. Closing happens through the DOM panel's own
  // image click (ProjectCard), not through the canvas at all.
  blockInteraction: boolean;
}

export default function CathedralScene({
  gateOpened,
  journeyRaw,
  onGateClick,
  projects,
  projectExpandProgress,
  onProjectHover,
  onProjectToggleExpand,
  blockInteraction,
}: CathedralSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Latest prop values, read imperatively inside the render loop (and
  // inside the click handler) so neither needs to restart when
  // scroll/gate state changes — same pattern DotBackground uses for
  // cursor position.
  const gateOpenedRef = useRef(gateOpened);
  const journeyRawRef = useRef(journeyRaw);
  const onGateClickRef = useRef(onGateClick);
  const projectExpandProgressRef = useRef(projectExpandProgress);
  const onProjectHoverRef = useRef(onProjectHover);
  const onProjectToggleExpandRef = useRef(onProjectToggleExpand);
  const blockInteractionRef = useRef(blockInteraction);
  const roseWindowAssetRef = useRef<RoseWindowAsset | null>(null);
  gateOpenedRef.current = gateOpened;
  journeyRawRef.current = journeyRaw;
  onGateClickRef.current = onGateClick;
  projectExpandProgressRef.current = projectExpandProgress;
  onProjectHoverRef.current = onProjectHover;
  onProjectToggleExpandRef.current = onProjectToggleExpand;
  blockInteractionRef.current = blockInteraction;

  // Projects load asynchronously, after the scene has already mounted
  // — applied to the already-built panes rather than rebuilding the
  // whole scene when they arrive.
  useEffect(() => {
    roseWindowAssetRef.current?.applyProjects(projects);
  }, [projects]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(BACKGROUND_COLOR, 6, 26);

    const camera = new THREE.PerspectiveCamera(
      CAMERA_FOV,
      window.innerWidth / window.innerHeight,
      0.1,
      100,
    );
    camera.position.copy(GATE_WAYPOINT.position);
    camera.lookAt(GATE_WAYPOINT.lookAt);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(BACKGROUND_COLOR, 1);
    container.appendChild(renderer.domElement);

    const atmosphere = buildPlaceholderAtmosphere();
    scene.add(atmosphere);

    // Minimal lighting — MeshStandardMaterial (the gate's stone/wood)
    // needs at least one light source to read at all. Kept dim and
    // warm: the Design Brief wants the scene dark, with the gate's own
    // hover/open glow doing the visual work, not general illumination.
    const ambient = new THREE.AmbientLight(0x3a3a42, 0.6);
    const keyLight = new THREE.DirectionalLight(0xcfd0d6, 0.7);
    keyLight.position.set(2, 4, 6);
    scene.add(ambient, keyLight);

    const gate = buildGate();
    scene.add(gate.group);

    const nave = buildNave();
    scene.add(nave.group);

    const roseWindow = buildRoseWindow();
    scene.add(roseWindow.group);
    roseWindowAssetRef.current = roseWindow;
    roseWindow.applyProjects(projects);

    // Hover-crack/full-open door angle: hoverRef flips via raycasting
    // below, gateOpenedRef (already tracked above) drives the full
    // swing. Eased toward its target each frame rather than snapping.
    const hoverRef = { current: false };
    let doorAngle = 0;

    // Which rose-window pane (if any) is currently hovered. A ray from
    // the cursor through the camera can only ever hit a pane that's
    // actually rendered at that screen pixel — so this naturally only
    // fires once the panes are in frame (near the end of the journey),
    // with no extra gating needed against the earlier gate/nave beats.
    const paneHoverRef = { current: null as number | null };

    const raycaster = new THREE.Raycaster();
    const pointerNDC = new THREE.Vector2();

    const updatePointerNDC = (event: PointerEvent | MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handlePointerMove = (event: PointerEvent) => {
      updatePointerNDC(event);
      raycaster.setFromCamera(pointerNDC, camera);

      if (!gateOpenedRef.current) {
        const hit = raycaster.intersectObjects(gate.hitTargets, false).length > 0;
        hoverRef.current = hit;
        renderer.domElement.style.cursor = hit ? "pointer" : "";
        return;
      }

      if (blockInteractionRef.current) {
        renderer.domElement.style.cursor = "";
        return;
      }

      const hits = raycaster.intersectObject(roseWindow.hitTarget, false);
      const newHover =
        hits.length > 0 ? roseWindow.getPaneIndexAtPoint(hits[0].point) : null;
      if (newHover !== paneHoverRef.current) {
        paneHoverRef.current = newHover;
        onProjectHoverRef.current(newHover);
      }
      renderer.domElement.style.cursor = newHover !== null ? "pointer" : "";
    };

    const handleClick = (event: MouseEvent) => {
      updatePointerNDC(event);
      raycaster.setFromCamera(pointerNDC, camera);

      if (!gateOpenedRef.current) {
        if (raycaster.intersectObjects(gate.hitTargets, false).length > 0) {
          onGateClickRef.current();
        }
        return;
      }

      if (blockInteractionRef.current) return;

      const hits = raycaster.intersectObject(roseWindow.hitTarget, false);
      if (hits.length > 0) {
        onProjectToggleExpandRef.current(roseWindow.getPaneIndexAtPoint(hits[0].point));
      }
    };

    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("click", handleClick);

    const camPosition = new THREE.Vector3().copy(GATE_WAYPOINT.position);
    const camLookAt = new THREE.Vector3().copy(GATE_WAYPOINT.lookAt);

    // Click-triggered gate->hinge push: a deliberate, fixed-duration
    // cinematic move (eased in/out), not a generic spring chasing a
    // target — a spring reads as snappy at the start and laggy at the
    // end, not like a directed camera move.
    const GATE_PUSH_DURATION = 2.6;
    let gateAnimElapsed = 0;
    let gatePushDone = false;

    const clock = new THREE.Clock();
    let frameId: number | null = null;

    const DOOR_EASE_SPEED = 3.2;
    const GLOW_EASE_SPEED = 5;
    let glowOpacity = 0;

    const render = () => {
      const delta = clock.getDelta();

      const doorTargetAngle = gateOpenedRef.current
        ? DOOR_FULL_OPEN_RAD
        : hoverRef.current
          ? DOOR_HOVER_CRACK_RAD
          : 0;
      doorAngle = prefersReducedMotion
        ? doorTargetAngle
        : doorAngle + (doorTargetAngle - doorAngle) * Math.min(1, DOOR_EASE_SPEED * delta);
      gate.leftDoorPivot.rotation.y = -doorAngle;
      gate.rightDoorPivot.rotation.y = doorAngle;

      // The glow is a hover affordance for the still-closed gate only —
      // it has nothing to do with doorAngle once the gate is actually
      // opening/open (that used to be the bug: it stayed lit at a fixed
      // opacity through the whole swing since doorAngle just kept
      // climbing past the crack threshold instead of coming back down).
      const glowTarget = !gateOpenedRef.current && hoverRef.current ? 0.85 : 0;
      glowOpacity = prefersReducedMotion
        ? glowTarget
        : glowOpacity + (glowTarget - glowOpacity) * Math.min(1, GLOW_EASE_SPEED * delta);
      gate.glowMaterial.opacity = glowOpacity;

      if (gateOpenedRef.current) {
        if (!gatePushDone) {
          if (prefersReducedMotion) {
            camPosition.copy(HINGE_WAYPOINT.position);
            camLookAt.copy(HINGE_WAYPOINT.lookAt);
            gatePushDone = true;
          } else {
            gateAnimElapsed += delta;
            const t = easeInOutCubic(Math.min(1, gateAnimElapsed / GATE_PUSH_DURATION));
            camPosition.lerpVectors(GATE_WAYPOINT.position, HINGE_WAYPOINT.position, t);
            camLookAt.lerpVectors(GATE_WAYPOINT.lookAt, HINGE_WAYPOINT.lookAt, t);
            if (t >= 1) gatePushDone = true;
          }
        } else {
          // journeyRawRef.current is already smoothed — by
          // useCathedralJourney, the same value App.tsx's content
          // crossfade reads too, so the camera and the DOM content
          // are always in lockstep instead of drifting apart (that
          // used to be the bug: content crossfade read raw scroll
          // directly and could pop in well before this camera, which
          // deliberately lags, had gone anywhere).
          applyJourneyCamera(journeyRawRef.current, camPosition, camLookAt);
        }
      } else {
        camPosition.copy(GATE_WAYPOINT.position);
        camLookAt.copy(GATE_WAYPOINT.lookAt);
      }
      camera.position.copy(camPosition);
      camera.lookAt(camLookAt);

      roseWindow.updateExpand(
        projectExpandProgressRef.current,
        paneHoverRef.current,
        delta,
        clock.elapsedTime,
      );

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(render);
    };
    frameId = requestAnimationFrame(render);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("click", handleClick);
      if (frameId !== null) cancelAnimationFrame(frameId);
      atmosphere.geometry.dispose();
      (atmosphere.material as THREE.Material).dispose();
      gate.dispose();
      nave.dispose();
      roseWindow.dispose();
      roseWindowAssetRef.current = null;
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      // No z-index here on purpose (unlike the old DotBackground this
      // replaced, which used -z-10) — a NEGATIVE z-index child is
      // hit-tested behind its own parent's box, which means the parent
      // wins document.elementFromPoint at any point where the parent
      // itself has no other content, regardless of pointer-events on
      // this element. That's exactly what was breaking clicks/hover on
      // the rose-window panes. Being first in App.tsx's JSX already
      // puts this behind every later sibling in normal paint order —
      // no z-index needed to stay visually behind everything else.
      className="fixed inset-0"
      aria-hidden="true"
    />
  );
}
