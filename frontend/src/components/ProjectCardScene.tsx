import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Project } from "@/lib/api";
import {
  CARD_WIDTH,
  CARD_HEIGHT,
  CARD_SPACING,
  CAMERA_FOV_DEG,
  EXPAND_FORWARD_CREEP,
  cardBaseX,
  computeCameraZ,
  expandDive,
  expandGrowthT,
  expandTargetScale,
  crossfadeT,
} from "@/lib/cardLayout";

interface ProjectCardSceneProps {
  projects: Project[];
  progress: number[];
  onHover: (index: number | null) => void;
  onWheel: (index: number, deltaY: number) => boolean;
  onToggleExpand: (index: number) => void;
}

interface CardInstance {
  mesh: THREE.Mesh;
  frameMaterial: THREE.MeshPhysicalMaterial;
  frontMaterial: THREE.MeshPhysicalMaterial;
  faceTexture: THREE.Texture | null;
  faceVideo: HTMLVideoElement | null;
  restQuaternion: THREE.Quaternion;
  wobbleSpeed: number;
  wobblePhase: number;
  floatPhase: number;
  floatSpeed: number;
  baseX: number;
  baseY: number;
  // Tilt targets (radians), derived from where the cursor last hit the
  // card's face in its own local coordinates — updated on pointer move,
  // eased toward every frame, and only applied while actually hovered.
  tiltTargetX: number;
  tiltTargetY: number;
  currentTiltX: number;
  currentTiltY: number;
  // Extra angular velocity from a swipe gesture, layered on top of the
  // card's idle wobble and decaying back to zero over time.
  swipeAxis: THREE.Vector3;
  swipeSpeed: number;
}

const CARD_DEPTH = 0.16;
const CARD_RADIUS = 0.05;

// BoxGeometry/RoundedBoxGeometry face-group material order: [+x, -x,
// +y, -y, +z, -z]. The card faces the camera along +z, so index 4 is
// the only face that gets the project's preview texture.
const FRONT_MATERIAL_INDEX = 4;

function createCardGeometry() {
  return new RoundedBoxGeometry(CARD_WIDTH, CARD_HEIGHT, CARD_DEPTH, 4, CARD_RADIUS);
}

// A sparse field of small bright points on a surrounding sphere — used
// as the reflection environment so the cards' specular highlights read
// as reflecting a dotted starfield (like the page background) rather
// than a generic lit interior.
function createStarfieldEnvironmentTexture(pmrem: THREE.PMREMGenerator) {
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x0d0d10);

  // Soft top-to-bottom gradient sphere so curved surfaces pick up a
  // smooth mirror-like sheen, not just pinpoint star highlights.
  const gradientGeometry = new THREE.SphereGeometry(45, 32, 32);
  const colorTop = new THREE.Color(0x82828d);
  const colorBottom = new THREE.Color(0x2a2a30);
  const gradPos = gradientGeometry.attributes.position;
  const gradColors = new Float32Array(gradPos.count * 3);
  for (let i = 0; i < gradPos.count; i++) {
    const t = (gradPos.getY(i) / 45 + 1) / 2;
    const c = colorBottom.clone().lerp(colorTop, t);
    gradColors[i * 3] = c.r;
    gradColors[i * 3 + 1] = c.g;
    gradColors[i * 3 + 2] = c.b;
  }
  gradientGeometry.setAttribute("color", new THREE.BufferAttribute(gradColors, 3));
  const gradientMaterial = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.BackSide,
  });
  const gradientMesh = new THREE.Mesh(gradientGeometry, gradientMaterial);
  envScene.add(gradientMesh);

  const starCount = 500;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 40;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const starMaterial = new THREE.PointsMaterial({
    color: 0xe4e4e7,
    size: 0.6,
    sizeAttenuation: true,
  });
  const stars = new THREE.Points(starGeometry, starMaterial);
  envScene.add(stars);

  const envTexture = pmrem.fromScene(envScene, 0.02).texture;
  starGeometry.dispose();
  starMaterial.dispose();
  gradientGeometry.dispose();
  gradientMaterial.dispose();
  return envTexture;
}

// Polished silver — mirror-like edges and back so the card reads as a
// suspended chrome slab, reflecting more light than it absorbs.
// `transparent` is on so each instance can fade out independently once
// the HTML preview panel takes over near full expansion.
function createFrameMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xc7c7cf,
    metalness: 0.95,
    roughness: 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    envMapIntensity: 1.8,
    transparent: true,
  });
}

// The front face carries the project preview — less metallic than the
// frame so the image itself stays legible under a light reflective sheen.
function createFrontMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x3a3a40,
    metalness: 0.3,
    roughness: 0.2,
    clearcoat: 0.7,
    clearcoatRoughness: 0.12,
    envMapIntensity: 0.8,
    transparent: true,
  });
}

// YouTube embed URLs look like `.../embed/<id>`; the standard thumbnail
// endpoint gives us a static preview image without touching the iframe.
function youtubeThumbnailUrl(embedUrl: string): string | null {
  const match = embedUrl.match(/embed\/([\w-]+)/);
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
}

const FACE_TEXTURE_RESOLUTION = 1024;

// Source images rarely match the card's own aspect ratio. Cropping
// (cover) cuts off content, plain letterboxing (contain) leaves dead
// bars. Composite instead: a blurred, cover-fit copy of the same image
// fills the frame, with a sharp, uncropped contain-fit copy centered
// on top — no cropping, no stretching, no empty space.
function compositeContainWithBlurFill(
  image: HTMLImageElement,
  aspect: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = FACE_TEXTURE_RESOLUTION;
  canvas.height = Math.round(FACE_TEXTURE_RESOLUTION / aspect);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const cw = canvas.width;
  const ch = canvas.height;
  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;

  const coverScale = Math.max(cw / iw, ch / ih);
  const coverW = iw * coverScale;
  const coverH = ih * coverScale;
  ctx.filter = "blur(28px)";
  ctx.globalAlpha = 0.55;
  ctx.drawImage(image, (cw - coverW) / 2, (ch - coverH) / 2, coverW, coverH);
  ctx.filter = "none";
  ctx.globalAlpha = 1;

  const containScale = Math.min(cw / iw, ch / ih);
  const containW = iw * containScale;
  const containH = ih * containScale;
  ctx.drawImage(image, (cw - containW) / 2, (ch - containH) / 2, containW, containH);

  return canvas;
}

// Loads whatever the project's own demo media is onto the card face —
// an image texture for image projects and YouTube (via its thumbnail),
// a live-playing video texture for self-hosted video.
function loadFaceTexture(
  project: Project,
  material: THREE.MeshPhysicalMaterial,
): { texture: THREE.Texture | null; video: HTMLVideoElement | null } {
  const applyImage = (url: string, texture: THREE.Texture) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      texture.image = compositeContainWithBlurFill(image, CARD_WIDTH / CARD_HEIGHT);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      material.color.set(0xffffff);
      material.needsUpdate = true;
    };
    image.src = url;
  };

  if (project.demoMediaType === "video" && project.videoSource === "youtube") {
    const thumb = youtubeThumbnailUrl(project.demoMediaUrl);
    const texture = new THREE.Texture();
    material.map = texture;
    if (thumb) applyImage(thumb, texture);
    return { texture, video: null };
  }

  if (project.demoMediaType === "video") {
    const video = document.createElement("video");
    video.src = project.demoMediaUrl;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.play().catch(() => {});
    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.colorSpace = THREE.SRGBColorSpace;
    material.map = videoTexture;
    material.color.set(0xffffff);
    material.needsUpdate = true;
    return { texture: videoTexture, video };
  }

  const texture = new THREE.Texture();
  material.map = texture;
  applyImage(project.demoMediaUrl, texture);
  return { texture, video: null };
}

// Per-second decay rate for swipe-induced extra spin — not a physical
// friction coefficient, just tuned so a flick settles within a second
// or so instead of spinning indefinitely.
const SWIPE_DAMPING_PER_SECOND = 7;
// Bounded idle sway, in radians, at rest (collapsed) — a gentle drift,
// not a tumble. Scales down to zero as a card expands.
const WOBBLE_AMPLITUDE = 0.1;
// How fast the card's orientation eases back toward its fixed resting
// pose (facing the camera) every frame — constant regardless of expand
// progress, so a mid-swipe card still settles square once expanded.
const RETURN_EASE_PER_SECOND = 3.2;
// Max tilt (radians) at the card's edge when the cursor is hovering —
// a "magnetic" tilt-toward-cursor effect, on top of the idle sway.
const TILT_MAX = 0.68;
// How fast the current tilt tracks its target — snappy, so the card
// feels directly reactive to the cursor rather than lagging behind it.
const TILT_EASE_PER_SECOND = 8;
// The tilt target is computed from where the cursor hits relative to
// the card's bounds, then divided by this (< 1) before clamping — so
// the full tilt range is already reached before the cursor gets all
// the way to the physical edge, and continues to track a bit past the
// edge before saturating. Reads as more responsive to cursor movement
// across and around the card, not just dead-center-to-edge.
const TILT_REACH = 0.7;
// Progress distance over which a card fades out once some OTHER card
// starts expanding — short, so idle cards clear out of frame quickly.
const OTHERS_FADE_DISTANCE = 0.12;

function layoutPositions(count: number): THREE.Vector3[] {
  return Array.from(
    { length: count },
    (_, i) => new THREE.Vector3(cardBaseX(i, count), 0, 0),
  );
}

export default function ProjectCardScene({
  projects,
  progress,
  onHover,
  onWheel,
  onToggleExpand,
}: ProjectCardSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const onHoverRef = useRef(onHover);
  onHoverRef.current = onHover;
  const onWheelRef = useRef(onWheel);
  onWheelRef.current = onWheel;
  const onToggleExpandRef = useRef(onToggleExpand);
  onToggleExpandRef.current = onToggleExpand;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || projects.length === 0) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const totalRowWidth = (projects.length - 1) * CARD_SPACING;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      CAMERA_FOV_DEG,
      width / height,
      0.1,
      100,
    );
    let restCameraZ = computeCameraZ(totalRowWidth, width / height);
    camera.position.set(0, 0, restCameraZ);
    let targetExpandScale = expandTargetScale(projects.length, width, height);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.domElement.style.touchAction = "none";
    container.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTexture = createStarfieldEnvironmentTexture(pmrem);
    scene.environment = envTexture;

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.65);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.34);
    rimLight.position.set(-4, -2, 3);
    scene.add(rimLight);

    const geometry = createCardGeometry();

    const positions = layoutPositions(projects.length);
    const instances: CardInstance[] = projects.map((project, i) => {
      const frameMaterial = createFrameMaterial();
      const frontMaterial = createFrontMaterial();
      const materials = [
        frameMaterial,
        frameMaterial,
        frameMaterial,
        frameMaterial,
        frameMaterial,
        frameMaterial,
      ];
      materials[FRONT_MATERIAL_INDEX] = frontMaterial;
      const mesh = new THREE.Mesh(geometry, materials);
      mesh.position.copy(positions[i]);

      const restQuaternion = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          THREE.MathUtils.degToRad((Math.random() - 0.5) * 12),
          THREE.MathUtils.degToRad((Math.random() - 0.5) * 16),
          THREE.MathUtils.degToRad((Math.random() - 0.5) * 6),
        ),
      );
      mesh.quaternion.copy(restQuaternion);
      scene.add(mesh);

      const { texture, video } = loadFaceTexture(project, frontMaterial);

      return {
        mesh,
        frameMaterial,
        frontMaterial,
        faceTexture: texture,
        faceVideo: video,
        restQuaternion,
        wobbleSpeed: 0.35 + Math.random() * 0.2,
        wobblePhase: Math.random() * Math.PI * 2,
        floatPhase: Math.random() * Math.PI * 2,
        floatSpeed: 0.4 + Math.random() * 0.3,
        baseX: positions[i].x,
        baseY: positions[i].y,
        tiltTargetX: 0,
        tiltTargetY: 0,
        currentTiltX: 0,
        currentTiltY: 0,
        swipeAxis: new THREE.Vector3(0, 1, 0),
        swipeSpeed: 0,
      };
    });

    // --- interaction: raycast-based hover, wheel-scoped expand, click fallback ---
    const raycaster = new THREE.Raycaster();
    const pointerNDC = new THREE.Vector2();
    const localHitPoint = new THREE.Vector3();
    let currentHoverIndex: number | null = null;

    // Swipe-to-twirl tuning: a fast, deliberate pointer move while
    // hovering imparts a small extra spin in whatever direction the
    // pointer moved, capped low and damped fast so it reads as a gentle
    // nudge, not a big reactive flick.
    const SWIPE_MIN_VELOCITY = 900; // px/sec before it counts as a swipe
    const SWIPE_TO_ANGULAR = 0.0008; // px/sec -> rad/sec
    const MAX_SWIPE_ANGULAR_SPEED = 0.9; // rad/sec cap
    let lastPointerX = 0;
    let lastPointerY = 0;
    let lastPointerTime = 0;

    const updatePointerNDC = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    const raycastHit = () => {
      raycaster.setFromCamera(pointerNDC, camera);
      const hits = raycaster.intersectObjects(
        instances.map((inst) => inst.mesh),
        false,
      );
      if (hits.length === 0) return { index: null as number | null, point: null as THREE.Vector3 | null };
      const idx = instances.findIndex((inst) => inst.mesh === hits[0].object);
      return idx === -1
        ? { index: null, point: null }
        : { index: idx, point: hits[0].point };
    };

    const handlePointerMove = (event: PointerEvent) => {
      updatePointerNDC(event.clientX, event.clientY);
      const { index: idx, point } = raycastHit();
      const now = performance.now();

      if (idx !== currentHoverIndex) {
        currentHoverIndex = idx;
        onHoverRef.current(idx);
        lastPointerX = event.clientX;
        lastPointerY = event.clientY;
        lastPointerTime = now;
      }

      if (idx !== null && point) {
        const instance = instances[idx];

        // Hit point in the card's own unrotated coordinate space, so
        // "cursor near the right edge" always tilts the same way
        // regardless of the card's current orientation.
        localHitPoint.copy(point);
        instance.mesh.worldToLocal(localHitPoint);
        instance.tiltTargetY = THREE.MathUtils.clamp(
          localHitPoint.x / (CARD_WIDTH / 2) / TILT_REACH,
          -1,
          1,
        ) * TILT_MAX;
        instance.tiltTargetX = THREE.MathUtils.clamp(
          -localHitPoint.y / (CARD_HEIGHT / 2) / TILT_REACH,
          -1,
          1,
        ) * TILT_MAX;

        const dt = (now - lastPointerTime) / 1000;
        if (dt > 0.001) {
          const dx = event.clientX - lastPointerX;
          const dy = event.clientY - lastPointerY;
          const speed = Math.sqrt(dx * dx + dy * dy) / dt;
          if (speed > SWIPE_MIN_VELOCITY) {
            const impulse = Math.min(
              MAX_SWIPE_ANGULAR_SPEED,
              speed * SWIPE_TO_ANGULAR,
            );
            instance.swipeAxis.set(-dy, dx, 0).normalize();
            instance.swipeSpeed = Math.min(
              MAX_SWIPE_ANGULAR_SPEED,
              instance.swipeSpeed + impulse,
            );
          }
        }
      }

      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      lastPointerTime = now;
    };

    const handlePointerLeave = () => {
      if (currentHoverIndex !== null) {
        currentHoverIndex = null;
        onHoverRef.current(null);
      }
    };

    const handleWheelEvent = (event: WheelEvent) => {
      if (currentHoverIndex === null) return;
      const consumed = onWheelRef.current(currentHoverIndex, event.deltaY);
      if (consumed) event.preventDefault();
    };

    const handleClick = (event: MouseEvent) => {
      updatePointerNDC(event.clientX, event.clientY);
      const { index: idx } = raycastHit();
      if (idx !== null) onToggleExpandRef.current(idx);
    };

    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerleave", handlePointerLeave);
    renderer.domElement.addEventListener("wheel", handleWheelEvent, {
      passive: false,
    });
    renderer.domElement.addEventListener("click", handleClick);

    const clock = new THREE.Clock();
    let frameId: number | null = null;

    const wobbleEuler = new THREE.Euler();
    const wobbleQuat = new THREE.Quaternion();
    const targetQuat = new THREE.Quaternion();
    const identityQuat = new THREE.Quaternion();

    const render = () => {
      const delta = clock.getDelta();
      const elapsed = clock.elapsedTime;
      for (let i = 0; i < instances.length; i++) {
        const instance = instances[i];
        const p = progressRef.current[i] ?? 0;

        // As soon as any OTHER card starts expanding, this one fades
        // out fast — otherwise, once the active card zooms in close,
        // every other still-idle card stays sitting in the same frame
        // (small, tilted, at its normal rest distance) and reads as
        // unrelated visual clutter behind the one being interacted with.
        let maxOtherProgress = 0;
        for (let j = 0; j < instances.length; j++) {
          if (j === i) continue;
          const pj = progressRef.current[j] ?? 0;
          if (pj > maxOtherProgress) maxOtherProgress = pj;
        }
        const othersFade =
          1 - Math.min(1, maxOtherProgress / OTHERS_FADE_DISTANCE);

        // As a card expands, its idle sway and swipe responsiveness
        // fade out so its content is readable. Position stays anchored
        // relative to its own base throughout the collapsed range —
        // moving it while collapsed would carry it out from under a
        // stationary cursor mid-gesture and silently drop the hover
        // that's driving the expand-via-scroll in the first place.
        // Growth/settle both reach their end state at
        // CROSSFADE_START_PROGRESS and hold from there — the card is
        // fully grown and perfectly still before the HTML panel ever
        // starts taking over, so the handoff never catches it mid-tilt.
        const growthT = expandGrowthT(p);
        const settle = 1 - growthT;
        const isHovered = i === currentHoverIndex;

        // Bounded idle sway around the fixed resting orientation, plus
        // a "magnetic" tilt toward wherever the cursor is hovering on
        // the card's face — both fade out as the card expands.
        const wobbleX =
          Math.sin(elapsed * instance.wobbleSpeed + instance.wobblePhase) *
          WOBBLE_AMPLITUDE *
          settle;
        const wobbleY =
          Math.cos(
            elapsed * instance.wobbleSpeed * 0.8 + instance.wobblePhase,
          ) *
          WOBBLE_AMPLITUDE *
          settle;

        const tiltTargetX = isHovered ? instance.tiltTargetX : 0;
        const tiltTargetY = isHovered ? instance.tiltTargetY : 0;
        const tiltEase = Math.min(1, TILT_EASE_PER_SECOND * delta);
        instance.currentTiltX += (tiltTargetX - instance.currentTiltX) * tiltEase;
        instance.currentTiltY += (tiltTargetY - instance.currentTiltY) * tiltEase;

        wobbleEuler.set(
          wobbleX + instance.currentTiltX * settle,
          wobbleY + instance.currentTiltY * settle,
          0,
        );
        wobbleQuat.setFromEuler(wobbleEuler);
        targetQuat.copy(instance.restQuaternion).multiply(wobbleQuat);
        // Blends from the card's own idle resting tilt toward perfectly
        // square-on as it finishes growing — its natural tilt is nice
        // for idle variety, but handing off to the flat HTML panel from
        // an off-axis pose reads as a jump rather than a smooth landing.
        targetQuat.slerp(identityQuat, growthT);

        if (instance.swipeSpeed > 0.001) {
          instance.mesh.rotateOnWorldAxis(
            instance.swipeAxis,
            instance.swipeSpeed * settle * delta,
          );
          instance.swipeSpeed = Math.max(
            0,
            instance.swipeSpeed - SWIPE_DAMPING_PER_SECOND * delta,
          );
        }

        // Eases back toward the target every frame — during a swipe
        // this is a gentle drag against the impulse, and once the swipe
        // decays to zero it's what carries the card back into place.
        instance.mesh.quaternion.slerp(
          targetQuat,
          Math.min(1, RETURN_EASE_PER_SECOND * delta),
        );

        const floatOffset =
          Math.sin(elapsed * instance.floatSpeed + instance.floatPhase) *
          0.2 *
          settle;

        // The card itself grows and recenters toward the camera axis as
        // it expands — it reads as the object opening up in place,
        // rather than the camera flying toward a point in empty space.
        // Growth freezes at CROSSFADE_START_PROGRESS (see expandDive).
        const dive = expandDive(p);
        instance.mesh.position.x = THREE.MathUtils.lerp(
          instance.baseX,
          0,
          dive,
        );
        instance.mesh.position.y = THREE.MathUtils.lerp(
          instance.baseY + floatOffset,
          0,
          dive,
        );
        instance.mesh.position.z = dive * EXPAND_FORWARD_CREEP;

        const scale = 1 + dive * (targetExpandScale - 1);
        instance.mesh.scale.setScalar(scale);

        // Once fully grown and settled, the 3D card fades out exactly
        // as the HTML preview panel fades in over the same spot — a
        // clean crossfade instead of both being visible at once. Also
        // fades out fast if some other card is the one expanding.
        const cardOpacity = (1 - crossfadeT(p)) * othersFade;
        instance.frameMaterial.opacity = cardOpacity;
        instance.frontMaterial.opacity = cardOpacity;
      }

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(render);
    };

    if (prefersReducedMotion) {
      renderer.render(scene, camera);
    } else {
      frameId = requestAnimationFrame(render);
    }

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      restCameraZ = computeCameraZ(totalRowWidth, w / h);
      camera.position.z = restCameraZ;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      targetExpandScale = expandTargetScale(projects.length, w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerleave", handlePointerLeave);
      renderer.domElement.removeEventListener("wheel", handleWheelEvent);
      renderer.domElement.removeEventListener("click", handleClick);
      if (frameId !== null) cancelAnimationFrame(frameId);
      geometry.dispose();
      for (const instance of instances) {
        instance.frameMaterial.dispose();
        instance.frontMaterial.dispose();
        instance.faceTexture?.dispose();
        if (instance.faceVideo) {
          instance.faceVideo.pause();
          instance.faceVideo.removeAttribute("src");
          instance.faceVideo.load();
        }
      }
      envTexture.dispose();
      pmrem.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
    // Interaction callbacks are read via refs above so this effect only
    // re-runs when the actual project list changes, not on every
    // progress/hover update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
