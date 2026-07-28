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
import { buildRoseWindow, WINDOW_CENTER, type RoseWindowAsset } from "@/lib/roseWindowAsset";
import { buildFacade } from "@/lib/facadeAsset";
import { buildDustMotes } from "@/lib/dustMotes";

const BACKGROUND_COLOR = 0x030304;
const CAMERA_FOV = 45;

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
    // Fog starts well past the gate itself now (was 6 — close enough to
    // dim the hero object it was standing in for the whole "too dark"
    // complaint) — it should only fade the deep nave/rose-window
    // distance, never anything in the immediate foreground.
    scene.fog = new THREE.Fog(BACKGROUND_COLOR, 14, 30);

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
    // Without tone mapping, MeshStandardMaterial's PBR response to these
    // light intensities reads muddy/underexposed regardless of how far
    // the lights themselves get pushed up — this was the real cause of
    // "everything is too dark to make out," not just weak lights.
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5;
    container.appendChild(renderer.domElement);

    const dustMotes = buildDustMotes();
    scene.add(dustMotes.points);

    // Lighting rig — now that the gate/nave/ring carry real stone/wood
    // textures (see proceduralTextures.ts), directional light actually
    // matters: a flat ambient-only scene would leave that surface detail
    // invisible. Kept overall dark per the Design Brief (stained glass
    // is meant to be the only strong color), with three roles: a warm
    // key raking across the stone/wood from outside the gate, a dim
    // cool rim from deep in the nave so silhouettes separate from the
    // near-black background instead of flattening into it, and a warm
    // point light at the rose window itself — the narrative's actual
    // light source, only reaching far enough to warm the nave stone
    // once the camera is close to arriving.
    const ambient = new THREE.AmbientLight(0x44444e, 1.1);
    const keyLight = new THREE.DirectionalLight(0xffdca8, 1.8);
    keyLight.position.set(2.5, 5, 6);
    const rimLight = new THREE.DirectionalLight(0x8fa0c2, 0.5);
    rimLight.position.set(-1.5, 3, -10);
    const windowLight = new THREE.PointLight(0xffd9a0, 2.4, 15, 2);
    windowLight.position.copy(WINDOW_CENTER).add(new THREE.Vector3(0, -0.3, 0.6));
    // Small warm accent right at the arcade band (naveAsset.ts) so its
    // carved openings actually catch some light of their own instead of
    // relying entirely on the window/key lights reaching that far.
    const arcadeLight = new THREE.PointLight(0xffcf9a, 1.2, 7, 2);
    arcadeLight.position.set(0, 3.9, 1.2);
    // A light right at the exterior gate itself — everything above was
    // tuned for the nave interior; the closed-gate landing beat needs
    // its own direct source so the facade actually reads before the
    // camera has gone anywhere. A PointLight specifically, not a
    // DirectionalLight — directional lights have no falloff at all (only
    // direction matters, not position), so the first version of this
    // lit the facade wall uniformly bright even deep in the nave, long
    // after the camera had left the gate behind. This one fades out
    // with distance and never reaches past the gate/hinge area.
    const exteriorLight = new THREE.PointLight(0xf5ead0, 6, 14, 2);
    exteriorLight.position.set(0, 2, 8);
    scene.add(ambient, keyLight, rimLight, windowLight, arcadeLight, exteriorLight);

    const gate = buildGate();
    scene.add(gate.group);

    const nave = buildNave();
    scene.add(nave.group);

    const facade = buildFacade();
    scene.add(facade.group);

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

      // Re-cast from the last known pointer position against the
      // CURRENT camera, every frame — not just on pointermove. The
      // camera moves through the whole journey even when the mouse
      // doesn't, so the repel ray needs to track where the cursor
      // currently points on screen as that view changes underneath it.
      raycaster.setFromCamera(pointerNDC, camera);
      // Dust only exists once the gate is open — the gate-doorway
      // shaft's origin sits at z=1, in front of the closed doors (z=0),
      // so those motes were genuinely positioned between the camera and
      // the door and rendered correctly in front of it, reading as
      // "bleeding through" the closed gate. Simplest fix: the motes
      // narratively represent light spilling through an open doorway,
      // so they just shouldn't exist at all until it's actually open.
      dustMotes.points.visible = gateOpenedRef.current;
      dustMotes.update(
        delta,
        clock.elapsedTime,
        raycaster.ray.origin,
        raycaster.ray.direction,
        prefersReducedMotion,
      );

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
      dustMotes.dispose();
      gate.dispose();
      nave.dispose();
      facade.dispose();
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
