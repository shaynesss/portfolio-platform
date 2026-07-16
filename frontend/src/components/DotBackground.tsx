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
const STAGGER_WINDOW_SECONDS = 2.0;
// Once a dot's turn comes, how long its own fade-in takes.
const PARTICLE_FADE_SECONDS = 0.9;

// Exported so other landing-sequence UI (About's text fade) can wait
// until the particle field has essentially finished appearing.
export const LANDING_SEQUENCE_MS =
  (STAGGER_WINDOW_SECONDS + PARTICLE_FADE_SECONDS) * 1000;

const VERTEX_SHADER = `
  attribute float aPhase;
  attribute float aAppearAt;
  uniform float uOscTime;
  uniform float uAppearElapsed;
  uniform float uSize;
  uniform float uParticleFadeSeconds;
  varying float vOpacity;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize;
    gl_Position = projectionMatrix * mvPosition;

    float appear = clamp(
      (uAppearElapsed - aAppearAt) / uParticleFadeSeconds,
      0.0,
      1.0
    );
    float breathe = 0.05 + 0.85 * (0.5 + 0.5 * sin(uOscTime + aPhase));
    vOpacity = appear * breathe;
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

  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const appearTimes = new Float32Array(count);

  let i = 0;
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      positions[i * 3] = (x - cols / 2) * SPACING;
      positions[i * 3 + 1] = (y - rows / 2) * SPACING;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
      phases[i] = Math.random() * Math.PI * 2;
      appearTimes[i] = Math.random() * STAGGER_WINDOW_SECONDS;
      i++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute(
    "aAppearAt",
    new THREE.BufferAttribute(appearTimes, 1),
  );
  return geometry;
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

    let geometry = buildGeometry(window.innerWidth, window.innerHeight);

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
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    let points = new THREE.Points(geometry, material);
    scene.add(points);

    const clock = new THREE.Clock();
    let frameId: number | null = null;

    const render = () => {
      const elapsed = clock.getElapsedTime();
      material.uniforms.uOscTime.value = elapsed * 2.4;
      material.uniforms.uAppearElapsed.value = elapsed;
      renderer.render(scene, camera);
      if (!prefersReducedMotion) {
        frameId = requestAnimationFrame(render);
      }
    };

    if (prefersReducedMotion) {
      // Static frame, fully visible immediately: uOscTime stays 0 so
      // aPhase alone still gives each dot its own resting opacity —
      // organic, just not animating and no staged reveal motion.
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
      geometry = buildGeometry(window.innerWidth, window.innerHeight);
      points = new THREE.Points(geometry, material);
      scene.add(points);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
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
