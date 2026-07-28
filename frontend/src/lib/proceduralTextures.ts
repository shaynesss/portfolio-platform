// Canvas-generated stone/wood textures — no external image assets, so
// these draw the surface detail (mortar joints, block variation, wood
// grain/plank seams) procedurally at build time. Deliberately cheap and
// tileable (RepeatWrapping), not photoreal: the Design Brief's gate/nave
// are "kept vague/low-detail — texture and lighting carry the read, not
// geometric fidelity," so the goal is enough surface variation to catch
// light believably, not a realistic material scan.

import * as THREE from "three";

// A deterministic, dependency-free value-noise hash — same input always
// gives the same output, so texture generation is reproducible without
// pulling in a noise library for two small canvases.
function hashNoise(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function createStoneTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#2c2c32";
  ctx.fillRect(0, 0, size, size);

  // Blotchy per-cell shading for a rough-cut, uneven surface.
  const cell = Math.max(4, Math.round(size / 42));
  for (let y = 0; y < size; y += cell) {
    for (let x = 0; x < size; x += cell) {
      const n = hashNoise(x * 0.05, y * 0.05);
      const shade = 26 + n * 44;
      ctx.fillStyle = `rgba(${shade + 12}, ${shade + 12}, ${shade + 16}, ${0.12 + n * 0.28})`;
      ctx.fillRect(x, y, cell, cell);
    }
  }

  // Offset-brick mortar lines suggesting cut stone blocks.
  ctx.strokeStyle = "rgba(8, 8, 10, 0.4)";
  ctx.lineWidth = Math.max(1, size / 180);
  const blockH = size / 6;
  const blockW = size / 4;
  for (let row = 0; row <= 6; row++) {
    const y = row * blockH;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
  for (let row = 0; row < 6; row++) {
    const offset = row % 2 === 0 ? 0 : blockW / 2;
    for (let col = -1; col <= 4; col++) {
      const x = col * blockW + offset;
      ctx.beginPath();
      ctx.moveTo(x, row * blockH);
      ctx.lineTo(x, (row + 1) * blockH);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// A stylized ribbed-vault ceiling: diagonal ribs crossing in an X per
// bay plus a straight ridge rib down the center of each — a simple
// quadripartite vault read, tiled along the nave's depth via repeat.
export function createVaultTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#131317";
  ctx.fillRect(0, 0, size, size);

  const bays = 4;
  const bayWidth = size / bays;
  ctx.strokeStyle = "rgba(120, 118, 128, 0.55)";
  ctx.lineWidth = Math.max(1, size / 110);
  for (let b = 0; b < bays; b++) {
    const x0 = b * bayWidth;
    const x1 = x0 + bayWidth;
    ctx.beginPath();
    ctx.moveTo(x0, 0);
    ctx.lineTo(x1, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x1, 0);
    ctx.lineTo(x0, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x0 + bayWidth / 2, 0);
    ctx.lineTo(x0 + bayWidth / 2, size);
    ctx.stroke();
  }
  // Transverse ridge ribs at each bay boundary.
  ctx.lineWidth = Math.max(1, size / 70);
  for (let b = 0; b <= bays; b++) {
    const x = b * bayWidth;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// A blind-arcade band — a row of narrow pointed-arch openings with a
// hint of dark glass behind each, framed in stone. Drawn as one fixed
// pattern (not repeat-tiled noise like the stone/wood textures above)
// since it needs a specific arch count, not an arbitrary repeat.
export function createArcadeBandTexture(archCount = 10): THREE.CanvasTexture {
  const width = 1024;
  const height = 160;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#232329";
  ctx.fillRect(0, 0, width, height);

  const archWidth = width / archCount;
  const margin = archWidth * 0.16;
  for (let i = 0; i < archCount; i++) {
    const x0 = i * archWidth + margin;
    const x1 = (i + 1) * archWidth - margin;
    const w = x1 - x0;
    const topY = height * 0.12;
    const baseY = height * 0.92;

    ctx.fillStyle = "rgba(20, 26, 46, 0.9)";
    ctx.beginPath();
    ctx.moveTo(x0, baseY);
    ctx.lineTo(x0, topY + w / 2);
    ctx.quadraticCurveTo(x0 + w / 2, topY - w * 0.15, x1, topY + w / 2);
    ctx.lineTo(x1, baseY);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(150, 148, 140, 0.6)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createWoodTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#1c140d";
  ctx.fillRect(0, 0, size, size);

  // Vertical wavy grain streaks — doors are upright planks, so the
  // grain runs top to bottom, not side to side.
  for (let x = 0; x < size; x += 2) {
    const n = hashNoise(x * 0.1, 0.5);
    const shade = 18 + n * 20;
    ctx.strokeStyle = `rgba(${shade + 34}, ${shade + 20}, ${shade + 9}, ${0.18 + n * 0.32})`;
    ctx.lineWidth = 1 + n;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    for (let y = 0; y <= size; y += 16) {
      const wobble = Math.sin(y * 0.05 + x * 0.3) * 2;
      ctx.lineTo(x + wobble, y);
    }
    ctx.stroke();
  }

  // Plank seams.
  ctx.strokeStyle = "rgba(5, 3, 2, 0.6)";
  ctx.lineWidth = Math.max(1, size / 128);
  const plankW = size / 3;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * plankW, 0);
    ctx.lineTo(i * plankW, size);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
