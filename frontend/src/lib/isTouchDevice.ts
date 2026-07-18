// Coarse-pointer (touch) devices get native touch scrolling and a
// tap-only card interaction model; fine-pointer (mouse/trackpad)
// devices keep the existing hover + wheel-driven interaction untouched.
// Computed once at module load — a device's pointer capability doesn't
// change at runtime.
export const isTouchDevice =
  typeof window !== "undefined" &&
  (window.matchMedia?.("(pointer: coarse)").matches ?? "ontouchstart" in window);
