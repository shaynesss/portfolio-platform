// Shared between ProjectCardScene (the actual Three.js layout/camera) and
// ProjectsSection (which needs to know where a card sits on screen at
// rest, so the HTML content panel can visually grow out of that exact
// spot instead of appearing as an unrelated overlay). Single source of
// truth so the two never drift out of sync.

export const CARD_WIDTH = 2.6;
export const CARD_HEIGHT = 1.46;
export const CARD_SPACING = 3.6;
export const CAMERA_FOV_DEG = 45;
export const MIN_CAMERA_Z = 9;
// Fraction of the frustum's visible width the card row is allowed to
// occupy — the rest is margin on either side.
export const ROW_FILL_FACTOR = 0.62;

export function cardBaseX(index: number, count: number): number {
  const totalWidth = (count - 1) * CARD_SPACING;
  return index * CARD_SPACING - totalWidth / 2;
}

// Full visual span of the row, edge to edge — the gap between the
// outermost card centers plus each of their own half-widths sticking
// out past that. computeCameraZ needs this, not just the center-to-
// center spacing, or the outer cards' edges fall outside the frustum
// on narrow/portrait aspects (masked on wide ones by MIN_CAMERA_Z).
export function rowSpan(count: number): number {
  if (count <= 0) return 0;
  return (count - 1) * CARD_SPACING + CARD_WIDTH;
}

// Zooms the camera out as more cards are added so a row of up to 6
// always fits the frame, instead of overflowing off-screen. The floor
// (MIN_CAMERA_Z by default) exists so a row of only 1-2 cards doesn't
// zoom in uncomfortably close — but that same floor fights a single
// card meant to fill its own (smaller, fixed-aspect) container, so
// callers with their own scene — not a shared row — can pass a lower
// floor instead of the row-tuned default.
export function computeCameraZ(
  totalWidth: number,
  aspect: number,
  minCameraZ: number = MIN_CAMERA_Z,
): number {
  if (totalWidth <= 0) return minCameraZ;
  const halfFovRad = (CAMERA_FOV_DEG * Math.PI) / 360;
  const z = totalWidth / (ROW_FILL_FACTOR * 2 * Math.tan(halfFovRad) * aspect);
  return Math.max(minCameraZ, z);
}

// Progress (0-1) at which the 3D card finishes growing and settling —
// frozen at its full expanded size/orientation from here on, so the
// handoff to the HTML preview image always starts from the same pose
// regardless of how fast the user scrolled through it. Kept well before
// 1 so the image has a long, visible window to shrink into its final
// slot rather than a rushed snap right at the end.
export const CROSSFADE_START_PROGRESS = 0.5;
// How far (world units) the expanding card creeps toward the camera,
// layered on top of its own scale growth.
export const EXPAND_FORWARD_CREEP = 1.5;

function panelMarginPx(viewportWidth: number): number {
  if (viewportWidth >= 768) return 64;
  if (viewportWidth >= 640) return 48;
  return 24;
}

// The final expanded panel's own on-screen footprint (matches its
// `inset-6 sm:inset-12 md:inset-16` classes) — the 3D card grows to
// exactly contain-fit this, never past it, so "zoom in" stops at the
// card's own final size instead of overshooting past the whole screen.
export function panelFinalScreenRect(
  viewportWidth: number,
  viewportHeight: number,
): ScreenRect {
  const margin = panelMarginPx(viewportWidth);
  return {
    x: margin,
    y: margin,
    width: viewportWidth - margin * 2,
    height: viewportHeight - margin * 2,
  };
}

// How much bigger than its resting size the 3D card grows at full
// expansion — solved so it contain-fits the final expanded panel's
// footprint exactly, for this viewport and card count, rather than an
// arbitrary fixed multiplier that may over- or under-shoot it.
export function expandTargetScale(
  count: number,
  viewportWidth: number,
  viewportHeight: number,
  minCameraZ: number = MIN_CAMERA_Z,
): number {
  const aspect = viewportWidth / viewportHeight;
  const restCamZ = computeCameraZ(rowSpan(count), aspect, minCameraZ);
  const camZ = restCamZ - EXPAND_FORWARD_CREEP;
  const halfFovRad = (CAMERA_FOV_DEG * Math.PI) / 360;
  const scale = viewportHeight / (2 * camZ * Math.tan(halfFovRad));
  const panel = panelFinalScreenRect(viewportWidth, viewportHeight);
  const containScale = Math.min(
    panel.width / (CARD_WIDTH * scale),
    panel.height / (CARD_HEIGHT * scale),
  );
  return Math.max(1, containScale);
}

// 0 at rest, 1 once the card has finished growing (reached at
// CROSSFADE_START_PROGRESS and held from there on).
export function expandGrowthT(progress: number): number {
  return Math.min(1, Math.max(0, progress / CROSSFADE_START_PROGRESS));
}

// Ease-in dive amount driving the card's position/scale growth.
export function expandDive(progress: number): number {
  const t = expandGrowthT(progress);
  return t * t;
}

// 0 through the growth phase, ramping 0 -> 1 only after the card has
// finished growing — drives the 3D-card-to-HTML-panel crossfade.
export function crossfadeT(progress: number): number {
  return Math.min(
    1,
    Math.max(
      0,
      (progress - CROSSFADE_START_PROGRESS) / (1 - CROSSFADE_START_PROGRESS),
    ),
  );
}

export interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// The collapsed, at-rest on-screen rect (CSS pixels, viewport-relative)
// for a given card index — a plain-JS re-derivation of the same
// perspective projection the Three.js camera uses, so it stays in sync
// without needing to read anything back out of the canvas.
export function cardRestScreenRect(
  index: number,
  count: number,
  viewportWidth: number,
  viewportHeight: number,
): ScreenRect {
  const aspect = viewportWidth / viewportHeight;
  const camZ = computeCameraZ(rowSpan(count), aspect);
  const halfFovRad = (CAMERA_FOV_DEG * Math.PI) / 360;
  // World-unit-to-pixel scale at the card's depth (z = 0, camera at
  // camZ) — the same factor applies to both axes for an isotropic
  // perspective projection, so there's no distortion to correct for.
  const scale = viewportHeight / (2 * camZ * Math.tan(halfFovRad));
  const baseX = cardBaseX(index, count);
  const widthPx = CARD_WIDTH * scale;
  const heightPx = CARD_HEIGHT * scale;
  const centerX = viewportWidth / 2 + baseX * scale;
  const centerY = viewportHeight / 2;
  return {
    x: centerX - widthPx / 2,
    y: centerY - heightPx / 2,
    width: widthPx,
    height: heightPx,
  };
}

// On-screen rect of the 3D card at the given expand progress — the
// same perspective-projection math as cardRestScreenRect, but applied
// to the card's current (growing/frozen) position and scale, so the
// HTML preview image can hand off from exactly where the 3D card
// currently sits with no visible jump.
export function cardExpandedScreenRect(
  index: number,
  count: number,
  viewportWidth: number,
  viewportHeight: number,
  progress: number,
  minCameraZ: number = MIN_CAMERA_Z,
): ScreenRect {
  const dive = expandDive(progress);
  const aspect = viewportWidth / viewportHeight;
  const restCamZ = computeCameraZ(rowSpan(count), aspect, minCameraZ);
  const camZ = restCamZ - dive * EXPAND_FORWARD_CREEP;
  const halfFovRad = (CAMERA_FOV_DEG * Math.PI) / 360;
  const scale = viewportHeight / (2 * camZ * Math.tan(halfFovRad));
  const baseX = cardBaseX(index, count);
  const meshX = baseX + (0 - baseX) * dive;
  const targetScale = expandTargetScale(count, viewportWidth, viewportHeight, minCameraZ);
  const cardScale = 1 + dive * (targetScale - 1);
  const widthPx = CARD_WIDTH * cardScale * scale;
  const heightPx = CARD_HEIGHT * cardScale * scale;
  const centerX = viewportWidth / 2 + meshX * scale;
  const centerY = viewportHeight / 2;
  return {
    x: centerX - widthPx / 2,
    y: centerY - heightPx / 2,
    width: widthPx,
    height: heightPx,
  };
}
