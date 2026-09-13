"use client";

/**
 * SignalCoreScene — the flagship WebGL layer, on react-three-fiber.
 *
 * A real 3D scene (depth + bloom + camera choreography) in place of a
 * fullscreen fragment pass, built on the stack the repo's build-references doc
 * names as priority: react-three-fiber + postprocessing + GSAP.
 *
 * Discipline (docs/design/galaxy-build-references.md + GALAXY_2026_PUBLIC_WORLD):
 *  - Restrained "lock-on" precision — every entrance beat is a multiple of 240ms.
 *  - `prefers-reduced-motion` → one static frame, no timeline, no loop.
 *  - Decorative only: aria-hidden, no pointer capture, no scroll hijack.
 *  - Cheap by construction: one core, one instanced lattice, one filament set,
 *    one Bloom pass, dpr clamped to 1.5. Pauses off-screen / on hidden tab and
 *    disposes every GPU resource on unmount.
 *
 * React 18 constraint: this app is React 18.3 / Next 14, so this uses the r3f
 * 8.x line (@react-three/fiber 8.18, postprocessing 2.19). r3f 9 /
 * react-postprocessing 3 are React 19-only and are NOT usable until the app is
 * migrated — do not bump these without doing that migration first.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { gsap } from "gsap";
import * as THREE from "three";
import { BRAND_COLORS } from "@/lib/brand";

/** One "lock-on" beat. Every entrance step lands on a multiple of this. */
export const LOCK_ON_MS = 240;
const NODE_COUNT = 96;
const RADIUS = 2.35;

/**
 * three.js object types, derived from the value side.
 *
 * `import * as THREE from "three"` exposes values but NOT the type-namespace
 * members in this toolchain: @types/three ships an `exports` map that mirrors
 * three's own and carries no `"types"` condition, so under
 * `moduleResolution: "bundler"` the type side of the namespace resolves empty
 * while the value side (resolved from the JS build) works. `THREE.Mesh` as a
 * type therefore fails with TS2694; `typeof THREE.Mesh` does not. These aliases
 * keep the annotations honest until the upstream types are fixed, and they cost
 * nothing at runtime. Reproduce with: `THREE.Mesh` in a type position fails,
 * `new THREE.Mesh()` passes.
 */
type Vec3 = InstanceType<typeof THREE.Vector3>;
type Mesh = InstanceType<typeof THREE.Mesh>;
type InstancedMesh = InstanceType<typeof THREE.InstancedMesh>;
type LineSegments = InstanceType<typeof THREE.LineSegments>;
type Material = InstanceType<typeof THREE.Material>;
type LineBasicMaterial = InstanceType<typeof THREE.LineBasicMaterial>;

/** Fibonacci sphere — even node distribution, no RNG. */
function latticePoints(count: number, radius: number): Vec3[] {
  const out: Vec3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i += 1) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    out.push(
      new THREE.Vector3(Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius)
    );
  }
  return out;
}

/** WebGL availability — checked before a Canvas is ever created. */
export function hasWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const probe = document.createElement("canvas");
    return Boolean(
      probe.getContext("webgl2") ??
        probe.getContext("webgl") ??
        probe.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

function usePrefersReducedMotion(): boolean {
  // Starts false so first paint never depends on a media query, then settles on
  // the real value once mounted (same contract as components/motion/reveal).
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
  }, []);
  return reduced;
}

/** Latest scroll progress (0–1), read from the window with no React re-render. */
function useScrollProgressRef(): { current: number } {
  const progress = useRef(0);
  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const span = document.documentElement.scrollHeight - window.innerHeight;
      progress.current = span > 0 ? Math.min(1, Math.max(0, window.scrollY / span)) : 0;
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return progress;
}

interface SceneParts {
  core: Mesh;
  shell: Mesh;
  nodes: InstancedMesh;
  filaments: LineSegments;
}

/** Builds every object imperatively so materials, colours and disposal are explicit. */
function createParts(): SceneParts {
  const cyan = new THREE.Color(BRAND_COLORS.orbitalCyan);
  const violet = new THREE.Color(BRAND_COLORS.softUltraviolet);
  const magenta = new THREE.Color(BRAND_COLORS.ionMagenta);

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.62, 3),
    new THREE.MeshBasicMaterial({ color: cyan, toneMapped: false })
  );
  core.scale.setScalar(0.001);

  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.86, 1),
    new THREE.MeshBasicMaterial({
      color: violet,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
      toneMapped: false,
    })
  );
  shell.rotation.set(0.6, 0.2, 0);

  const nodes = new THREE.InstancedMesh(
    new THREE.OctahedronGeometry(0.055, 0),
    new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    NODE_COUNT
  );
  nodes.scale.setScalar(0.001);
  nodes.frustumCulled = false;

  const points = latticePoints(NODE_COUNT, RADIUS);
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const unit = new THREE.Vector3(1, 1, 1);
  const tint = new THREE.Color();
  let index = 0;
  for (const p of points) {
    matrix.compose(p, quat, unit);
    nodes.setMatrixAt(index, matrix);
    // Violet at the rim → cyan as a node approaches the core.
    tint.copy(violet).lerp(cyan, THREE.MathUtils.clamp(1 - p.length() / RADIUS, 0, 1));
    nodes.setColorAt(index, tint);
    index += 1;
  }
  nodes.instanceMatrix.needsUpdate = true;
  if (nodes.instanceColor) nodes.instanceColor.needsUpdate = true;

  const verts = new Float32Array(NODE_COUNT * 6);
  let v = 0;
  for (const p of points) {
    verts[v] = p.x;
    verts[v + 1] = p.y;
    verts[v + 2] = p.z;
    // Inner end pulled just off-centre so filaments converge instead of stacking.
    verts[v + 3] = p.x * 0.06;
    verts[v + 4] = p.y * 0.06;
    verts[v + 5] = p.z * 0.06;
    v += 6;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(verts, 3));
  const filaments = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({
      color: magenta,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
  );
  filaments.frustumCulled = false;

  return { core, shell, nodes, filaments };
}

function disposeParts({ core, shell, nodes, filaments }: SceneParts): void {
  core.geometry.dispose();
  (core.material as Material).dispose();
  shell.geometry.dispose();
  (shell.material as Material).dispose();
  nodes.geometry.dispose();
  (nodes.material as Material).dispose();
  filaments.geometry.dispose();
  (filaments.material as Material).dispose();
}

function SignalCore({
  reduced,
  parts,
  onInvalidate,
}: {
  reduced: boolean;
  parts: SceneParts;
  onInvalidate: () => void;
}) {
  const scroll = useScrollProgressRef();

  // The lock-on entrance: the core resolves, the lattice ignites on the next
  // beat, the filaments fade in behind it, the shell counter-rotates last.
  useEffect(() => {
    if (reduced) return;
    const beat = LOCK_ON_MS / 1000;
    const filamentMaterial = parts.filaments.material as LineBasicMaterial;
    const shellStart = parts.shell.rotation.y;
    const timeline = gsap.timeline({ onUpdate: onInvalidate, onComplete: onInvalidate });

    timeline.to(parts.core.scale, { x: 1, y: 1, z: 1, duration: beat * 3, ease: "power3.out" }, 0);
    timeline.to(
      parts.nodes.scale,
      { x: 1, y: 1, z: 1, duration: beat, ease: "power3.out" },
      beat
    );
    timeline.fromTo(
      filamentMaterial,
      { opacity: 0 },
      { opacity: 0.22, duration: beat, ease: "power2.out" },
      beat
    );
    timeline.to(
      parts.shell.rotation,
      { y: shellStart + Math.PI * 0.35, duration: beat * 5, ease: "power2.out" },
      beat * 2
    );

    return () => {
      timeline.kill();
    };
  }, [reduced, parts, onInvalidate]);

  // Ambient drift + damped pointer parallax + a whisper of scroll coupling.
  useFrame((state, delta) => {
    if (reduced) return;
    const t = state.clock.elapsedTime;
    const depth = 6 - (scroll.current - 0.5) * 1.1;
    const damping = 0.05;

    parts.core.scale.setScalar(1 + Math.sin(t * 0.8) * 0.025);
    parts.core.rotation.y += delta * 0.12;
    parts.shell.rotation.x += delta * 0.05;
    parts.shell.rotation.z += delta * 0.03;
    parts.nodes.rotation.y += delta * 0.04;
    parts.filaments.rotation.y += delta * 0.04;

    state.camera.position.x += (state.pointer.x * 0.35 - state.camera.position.x) * damping;
    state.camera.position.y += (state.pointer.y * 0.22 - state.camera.position.y) * damping;
    state.camera.position.z += (depth - state.camera.position.z) * damping;
    state.camera.lookAt(0, 0, 0);
  });

  return (
    <group>
      <primitive object={parts.core} />
      <primitive object={parts.shell} />
      <primitive object={parts.nodes} />
      <primitive object={parts.filaments} />
    </group>
  );
}

/** Exposes r3f's invalidate() so the GSAP timeline can drive demand renders. */
function InvalidateBridge({ onReady }: { onReady: (invalidate: () => void) => void }) {
  const { invalidate } = useThree();
  useEffect(() => {
    onReady(invalidate);
  }, [invalidate, onReady]);
  return null;
}

export interface SignalCoreSceneProps {
  className?: string;
}

export function SignalCoreScene({ className }: SignalCoreSceneProps) {
  const reduced = usePrefersReducedMotion();
  const holderRef = useRef<HTMLDivElement>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [active, setActive] = useState(true);
  const invalidateRef = useRef<(() => void) | null>(null);
  const parts = useMemo(() => createParts(), []);

  useEffect(() => {
    setSupported(hasWebGL());
  }, []);

  useEffect(() => () => disposeParts(parts), [parts]);

  // Pause the loop entirely when the surface is off-screen or the tab is hidden.
  useEffect(() => {
    const node = holderRef.current;
    if (!node) return;
    let onScreen = true;
    const emit = () => setActive(onScreen && !document.hidden);
    const observer = new IntersectionObserver(
      (entries) => {
        onScreen = entries[0]?.isIntersecting ?? true;
        emit();
      },
      { threshold: 0 }
    );
    observer.observe(node);
    document.addEventListener("visibilitychange", emit);
    emit();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", emit);
    };
  }, []);

  const handleReady = useMemo(
    () => (invalidate: () => void) => {
      invalidateRef.current = invalidate;
      invalidate();
    },
    []
  );

  const onInvalidate = useMemo(
    () => () => {
      invalidateRef.current?.();
    },
    []
  );

  if (supported === null || !supported) return null;

  return (
    <div ref={holderRef} className={className} aria-hidden="true">
      <Canvas
        // Reduced motion renders one frame and stops; otherwise a live loop that
        // halts completely when the surface leaves the viewport.
        frameloop={reduced ? "demand" : active ? "always" : "never"}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 6], fov: 42, near: 0.1, far: 40 }}
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <InvalidateBridge onReady={handleReady} />
        <SignalCore reduced={reduced} parts={parts} onInvalidate={onInvalidate} />
        {reduced ? null : (
          <EffectComposer>
            <Bloom
              intensity={0.85}
              luminanceThreshold={0.22}
              luminanceSmoothing={0.28}
              mipmapBlur
            />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
