// The rose window — sits above the gate on the same wall (a real
// cathedral's west-facade layout), so it's seen from inside by turning
// back around, not by continuing forward. Six wedge panes in a radial
// "wheel," one per project slot, each meant to actually preview that
// project's own demo media — tinted and leaded like real stained glass,
// not flat arbitrary color blocks. Hover illuminates + subtly shakes a
// pane; click/tap expands it (see CathedralScene.tsx and
// useCardExpand) — hover-to-expand was tried first and dropped, it
// didn't work reliably.

import * as THREE from "three";
import type { Project } from "@/lib/api";
import { crossfadeT, expandGrowthT } from "@/lib/cardLayout";
import { createStoneTexture } from "@/lib/proceduralTextures";

const PANE_COUNT = 6;
export const WINDOW_CENTER = new THREE.Vector3(0, 6.4, 0.2);
const OUTER_RADIUS = 1.9;
const GAP_ANGLE = 0.05;
const CANVAS_SIZE = 512;
// The window's full visual footprint (panes + decorative ring +
// tracery frame) — 2.25 = (OUTER_RADIUS+0.2) decorative outer radius
// + 0.15 tracery extension, matching the actual geometry built below.
// Exported so naveAsset.ts's arcade band and facadeAsset.ts's panel
// sizing can stay in sync with this file without duplicating the math.
export const WINDOW_TOTAL_RADIUS = 2.25;

// Jewel-tone tint per pane — glass color even before/regardless of
// whatever image is showing through it.
const PANE_TINTS = [
  { r: 0x35, g: 0x50, b: 0x9e },
  { r: 0x9e, g: 0x35, b: 0x50 },
  { r: 0xb0, g: 0x8a, b: 0x2a },
  { r: 0x2a, g: 0x7d, b: 0x5f },
  { r: 0x6a, g: 0x3a, b: 0x9e },
  { r: 0x2a, g: 0x6a, b: 0x9e },
];
// Empty (unpopulated) slot — muted, clearly not "a project," still
// glass-like rather than a flat dead color.
const EMPTY_TINT = { r: 0x2a, g: 0x2a, b: 0x32 };

const PANE_BASE_OPACITY = 0.88;
// Hover affordance: no expand-on-hover anymore (that mechanic didn't
// work reliably and was dropped) — just illuminate a bit and shake
// very subtly, so it's clear the pane is interactive before a click
// commits to actually expanding it.
const HOVER_OPACITY = 1;
const HOVER_EASE_SPEED = 6;
const SHAKE_FREQUENCY = 14;
const SHAKE_AMPLITUDE = 0.012;
// Once any other pane's expand progress passes this, the rest fade out
// fast — same idea as the row cards: an idle pane shouldn't clutter the
// frame once one is actually expanding. Mirrors ProjectCardScene's own
// OTHERS_FADE_DISTANCE exactly, for a consistent feel across the site.
const OTHERS_FADE_DISTANCE = 0.12;
// Small forward creep + scale-up as a pane grows, echoing the row
// cards' own EXPAND_FORWARD_CREEP — just enough "coming toward you"
// motion to read as the source of the panel it's handing off to.
const PANE_EXPAND_SCALE = 0.2;
const PANE_EXPAND_CREEP = 0.35;

interface PaneHandle {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  tint: { r: number; g: number; b: number };
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  baseZ: number;
  baseRotationZ: number;
  hoverT: number;
}

function drawLeadLines(ctx: CanvasRenderingContext2D, size: number) {
  ctx.strokeStyle = "rgba(10, 8, 6, 0.55)";
  ctx.lineWidth = size * 0.012;
  ctx.beginPath();
  ctx.moveTo(size * 0.15, size * 0.35);
  ctx.lineTo(size * 0.85, size * 0.42);
  ctx.moveTo(size * 0.1, size * 0.68);
  ctx.lineTo(size * 0.9, size * 0.6);
  ctx.moveTo(size * 0.4, size * 0.05);
  ctx.lineTo(size * 0.48, size * 0.95);
  ctx.stroke();
}

function paintPane(handle: PaneHandle, image: HTMLImageElement | null) {
  const { ctx, tint } = handle;
  const size = CANVAS_SIZE;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = `rgb(${tint.r}, ${tint.g}, ${tint.b})`;
  ctx.fillRect(0, 0, size, size);

  if (image) {
    // Cover-fit the project's own demo media, then a tint wash on top
    // so it still reads as colored glass, not a flat photo.
    const scale = Math.max(size / image.width, size / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    ctx.globalAlpha = 0.8;
    ctx.drawImage(image, (size - w) / 2, (size - h) / 2, w, h);
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = `rgb(${tint.r}, ${tint.g}, ${tint.b})`;
    ctx.fillRect(0, 0, size, size);
    ctx.globalAlpha = 1;
  }

  drawLeadLines(ctx, size);
  handle.texture.needsUpdate = true;
}

// CircleGeometry's default UVs follow the full circle's polar mapping,
// which for a narrow wedge slice only occupies a sliver of the 0-1 UV
// square — a composited canvas texture would show only a tiny corner
// of itself. Remapped here to the wedge's own local bounding box
// instead, so the canvas maps across the whole visible pane shape.
function remapUVsToLocalBounds(geometry: THREE.CircleGeometry) {
  const position = geometry.attributes.position;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const uv = new Float32Array(position.count * 2);
  for (let i = 0; i < position.count; i++) {
    uv[i * 2] = (position.getX(i) - minX) / spanX;
    uv[i * 2 + 1] = (position.getY(i) - minY) / spanY;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

export interface RoseWindowAsset {
  group: THREE.Group;
  // Raycast against this ONE object for hover/click, then resolve which
  // pane via getPaneIndexAtPoint — deliberately not raycasting against
  // the 6 individual wedge meshes directly. Six thin pie-slice polygons
  // are an easy miss (especially with a tighter camera crop pushing
  // some of them toward the frame edge), and hover/click reportedly
  // didn't register at all — a single generous circular hit-region is
  // far more forgiving than depending on a precise hit against a thin
  // wedge's actual triangles.
  hitTarget: THREE.Object3D;
  getPaneIndexAtPoint: (worldPoint: THREE.Vector3) => number;
  applyProjects: (projects: Project[]) => void;
  // progress: per-pane expand progress (0-1), index-aligned with
  // paneMeshes/applyProjects. hoveredIndex drives the illuminate+shake
  // hover affordance (expand is click-only now, not hover-driven).
  // Called every frame from the render loop.
  updateExpand: (
    progress: number[],
    hoveredIndex: number | null,
    delta: number,
    elapsed: number,
  ) => void;
  dispose: () => void;
}

export function buildRoseWindow(): RoseWindowAsset {
  const group = new THREE.Group();
  group.position.copy(WINDOW_CENTER);
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const anglePerPane = (Math.PI * 2) / PANE_COUNT;
  const panes: PaneHandle[] = [];

  for (let i = 0; i < PANE_COUNT; i++) {
    const thetaStart = i * anglePerPane + GAP_ANGLE / 2;
    const thetaLength = anglePerPane - GAP_ANGLE;
    const geometry = track(
      new THREE.CircleGeometry(OUTER_RADIUS, 16, thetaStart, thetaLength),
    );
    remapUVsToLocalBounds(geometry);

    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext("2d")!;
    const texture = track(new THREE.CanvasTexture(canvas));
    texture.colorSpace = THREE.SRGBColorSpace;

    const material = track(
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: PANE_BASE_OPACITY,
        side: THREE.DoubleSide,
      }),
    );
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);

    const handle: PaneHandle = {
      canvas,
      ctx,
      texture,
      tint: PANE_TINTS[i % PANE_TINTS.length],
      mesh,
      material,
      baseZ: mesh.position.z,
      baseRotationZ: mesh.rotation.z,
      hoverT: 0,
    };
    paintPane(handle, null);
    panes.push(handle);
  }

  // Decorative outer ring — non-interactive smaller petals surrounding
  // the 6 real panes, so the window reads as a two-ring window like the
  // reference (16-20+ petals) without touching the 6-slot interaction
  // model at all: no hitTarget coverage, no hover/click, no canvas
  // texture — just a flat tinted wedge per petal.
  const DECORATIVE_PETAL_COUNT = 12;
  const DECORATIVE_GAP_ANGLE = 0.035;
  const DECORATIVE_INNER_RADIUS = OUTER_RADIUS + 0.05;
  // Shrunk from +0.5 -> +0.2 (see WINDOW_TOTAL_RADIUS below) — the
  // wider version pushed the window's overall footprint down far enough
  // to nearly collide with the gate's arch peak beneath it.
  const DECORATIVE_OUTER_RADIUS = OUTER_RADIUS + 0.2;
  const decorativeAnglePerPetal = (Math.PI * 2) / DECORATIVE_PETAL_COUNT;
  for (let i = 0; i < DECORATIVE_PETAL_COUNT; i++) {
    const thetaStart = i * decorativeAnglePerPetal + DECORATIVE_GAP_ANGLE / 2;
    const thetaLength = decorativeAnglePerPetal - DECORATIVE_GAP_ANGLE;
    const geometry = track(
      new THREE.RingGeometry(
        DECORATIVE_INNER_RADIUS,
        DECORATIVE_OUTER_RADIUS,
        8,
        1,
        thetaStart,
        thetaLength,
      ),
    );
    const tint = PANE_TINTS[i % PANE_TINTS.length];
    const material = track(
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(tint.r / 255, tint.g / 255, tint.b / 255),
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      }),
    );
    group.add(new THREE.Mesh(geometry, material));
  }

  // Stone tracery ring framing the window, now pushed out past the
  // decorative petals. RingGeometry's UVs wrap angularly (u) and
  // radially (v) rather than a flat box mapping, so the repeat below
  // tiles around the circumference, not across a rectangle — 16 gives
  // a modest segmented-stone look without the texture reading as a
  // smear at this ring's thinness.
  const ringTexture = track(createStoneTexture());
  ringTexture.repeat.set(16, 1);
  const ringGeometry = track(
    new THREE.RingGeometry(DECORATIVE_OUTER_RADIUS - 0.02, DECORATIVE_OUTER_RADIUS + 0.15, 48),
  );
  const ringMaterial = track(
    new THREE.MeshStandardMaterial({
      map: ringTexture,
      color: 0xffffff,
      roughness: 0.9,
      side: THREE.DoubleSide,
    }),
  );
  group.add(new THREE.Mesh(ringGeometry, ringMaterial));

  // One generous invisible disc covering the whole window (a bit past
  // its outer edge) — the actual raycast target. Slightly in front of
  // the panes/ring (+0.05 local z) so it always wins the intersection
  // over them regardless of draw order.
  const hitGeometry = track(new THREE.CircleGeometry(OUTER_RADIUS + 0.15, 32));
  const hitMaterial = track(
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide }),
  );
  const hitTarget = new THREE.Mesh(hitGeometry, hitMaterial);
  hitTarget.position.z = 0.05;
  group.add(hitTarget);

  const localPoint = new THREE.Vector3();
  const getPaneIndexAtPoint = (worldPoint: THREE.Vector3): number => {
    localPoint.copy(worldPoint);
    group.worldToLocal(localPoint);
    let angle = Math.atan2(localPoint.y, localPoint.x);
    if (angle < 0) angle += Math.PI * 2;
    const index = Math.floor(angle / anglePerPane);
    return Math.min(PANE_COUNT - 1, Math.max(0, index));
  };

  // Re-entrant: called once at build time (before projects have even
  // fetched) and again once they arrive, so every pane's tint is
  // decided fresh on each call rather than assuming whichever ran last
  // already got it right — otherwise an empty-array call (the normal
  // pre-fetch state) permanently stamps every pane, including ones
  // that get real data moments later, with the empty tint.
  const applyProjects = (projects: Project[]) => {
    for (let i = 0; i < PANE_COUNT; i++) {
      const handle = panes[i];
      const project = projects[i];
      if (project && project.demoMediaType === "image") {
        handle.tint = PANE_TINTS[i % PANE_TINTS.length];
        paintPane(handle, null);
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => paintPane(handle, image);
        image.src = project.demoMediaUrl;
      } else {
        // No project (or a video — live video texture on a wedge is
        // its own follow-up, not this pass) yet at this slot — visibly
        // muted rather than implying a real project sits here.
        handle.tint = EMPTY_TINT;
        paintPane(handle, null);
      }
    }
  };

  // Per-frame visual response to expand progress: fades a pane out as
  // it hands off to its HTML panel (crossfadeT), a small forward
  // creep + scale-up while it's actively growing (expandGrowthT), and
  // a fast fade-to-invisible for every other pane the moment any one
  // of them starts expanding (othersFade) — same shape as the row
  // cards' own behavior, just applied to a wedge instead of a slab.
  // Reused across calls (overwritten each time) rather than allocated
  // fresh — this runs every frame from the render loop.
  const maxOtherProgress = new Array(PANE_COUNT).fill(0);
  const updateExpand = (
    progress: number[],
    hoveredIndex: number | null,
    delta: number,
    elapsed: number,
  ) => {
    maxOtherProgress.fill(0);
    for (let i = 0; i < PANE_COUNT; i++) {
      for (let j = 0; j < PANE_COUNT; j++) {
        if (i === j) continue;
        maxOtherProgress[i] = Math.max(maxOtherProgress[i], progress[j] ?? 0);
      }
    }
    for (let i = 0; i < PANE_COUNT; i++) {
      const handle = panes[i];
      const p = progress[i] ?? 0;
      const growthT = expandGrowthT(p);
      const fade = crossfadeT(p);
      const othersFade = 1 - Math.min(1, maxOtherProgress[i] / OTHERS_FADE_DISTANCE);

      const hoverTarget = hoveredIndex === i ? 1 : 0;
      handle.hoverT += (hoverTarget - handle.hoverT) * Math.min(1, HOVER_EASE_SPEED * delta);

      const opacity = PANE_BASE_OPACITY + (HOVER_OPACITY - PANE_BASE_OPACITY) * handle.hoverT;
      handle.material.opacity = opacity * (1 - fade) * othersFade;

      const scale = 1 + growthT * PANE_EXPAND_SCALE;
      handle.mesh.scale.setScalar(scale);
      handle.mesh.position.z = handle.baseZ + growthT * PANE_EXPAND_CREEP;
      handle.mesh.rotation.z =
        handle.baseRotationZ +
        Math.sin(elapsed * SHAKE_FREQUENCY) * SHAKE_AMPLITUDE * handle.hoverT;
    }
  };

  return {
    group,
    hitTarget,
    getPaneIndexAtPoint,
    applyProjects,
    updateExpand,
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}
