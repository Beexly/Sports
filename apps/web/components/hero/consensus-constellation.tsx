"use client";

/**
 * ConsensusConstellation — a real WebGL, custom-GLSL particle galaxy.
 *
 * ~6,000 GPU points arranged in three spiral arms with differential rotation
 * (inner particles orbit faster — true galactic shear), per-particle twinkle, a
 * radius-graded brand palette (white core → cyan → ultraviolet → magenta rim), and
 * a luminous additive core. Camera slow-orbits and parallaxes to the cursor.
 *
 * Raw three.js (no R3F) for full control + zero framework-version risk. DPR-aware,
 * reduced-motion-aware (renders a single static frame), full GPU resource cleanup.
 * Decorative only — aria-hidden.
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uDpr;
  attribute float aScale;
  attribute float aSeed;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vTw;
  void main() {
    vColor = aColor;
    vec3 p = position;
    float radius = length(p.xz);
    // Differential rotation: inner orbits faster than outer (galactic shear).
    float ang = uTime * (0.16 / (radius * 0.55 + 0.5));
    float s = sin(ang), c = cos(ang);
    vec3 rp = vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);
    vec4 mv = modelViewMatrix * vec4(rp, 1.0);
    vTw = 0.55 + 0.45 * sin(uTime * 1.6 + aSeed * 28.0);
    gl_PointSize = uSize * aScale * vTw * uDpr * (1.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vColor;
  varying float vTw;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float a = smoothstep(0.5, 0.0, d);
    a = pow(a, 1.7);
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor * (0.65 + 0.7 * vTw), a);
  }
`;

const WHITE = new THREE.Color(0xf6f7fa);
const CYAN = new THREE.Color(0x00e5ff);
const UV = new THREE.Color(0x7a5cff);
const MAGENTA = new THREE.Color(0xff2dd6);

function radiusColor(t: number, out: InstanceType<typeof THREE.Color>): void {
  // t in [0,1]: white → cyan → ultraviolet → magenta as radius grows.
  if (t < 0.34) out.copy(WHITE).lerp(CYAN, t / 0.34);
  else if (t < 0.7) out.copy(CYAN).lerp(UV, (t - 0.34) / 0.36);
  else out.copy(UV).lerp(MAGENTA, (t - 0.7) / 0.3);
}

function makeCoreTexture(): InstanceType<typeof THREE.CanvasTexture> {
  const size = 256;
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const ctx = cv.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(246,247,250,0.95)");
  g.addColorStop(0.18, "rgba(0,229,255,0.55)");
  g.addColorStop(0.5, "rgba(123,97,255,0.18)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(cv);
  tex.needsUpdate = true;
  return tex;
}

export function ConsensusConstellation() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduced = prefersReducedMotion();

    const renderer = (() => {
      try {
        return new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
      } catch {
        return null;
      }
    })();
    if (!renderer) return;

    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    mount.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.set(0, 2.4, 6.6);

    const group = new THREE.Group();
    group.rotation.x = -0.62; // 3/4 view of the disk
    scene.add(group);

    // ── Build the galaxy ───────────────────────────────────────────────
    const COUNT = 6000;
    const ARMS = 3;
    const rng = mulberry32(0x5eed);
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const scales = new Float32Array(COUNT);
    const seeds = new Float32Array(COUNT);
    const col = new THREE.Color();

    for (let i = 0; i < COUNT; i++) {
      const radius = Math.pow(rng(), 0.62) * 3.7 + 0.18;
      const arm = Math.floor(rng() * ARMS);
      const armAngle = (arm / ARMS) * Math.PI * 2;
      const spin = radius * 1.35; // arm winding
      const scatter = (rng() - 0.5) * (0.55 / (radius * 0.5 + 0.35));
      const angle = armAngle + spin + scatter;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = (rng() - 0.5) * 0.42 * Math.exp(-radius * 0.45);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      radiusColor(Math.min(1, radius / 3.9), col);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      scales[i] = 0.5 + rng() * rng() * 2.4; // a few bright giants
      seeds[i] = rng();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

    const uniforms = {
      uTime: { value: 0 },
      uSize: { value: 26 },
      uDpr: { value: 1 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geo, mat);
    group.add(points);

    // ── Luminous core ──────────────────────────────────────────────────
    const coreTex = makeCoreTexture();
    const coreMat = new THREE.SpriteMaterial({
      map: coreTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const core = new THREE.Sprite(coreMat);
    core.scale.set(3.2, 3.2, 1);
    group.add(core);

    // ── Bloom post-processing (HDR-style glow bleed) ───────────────────
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.85, 0.55, 0.12);
    composer.addPass(bloom);

    // ── Sizing ─────────────────────────────────────────────────────────
    const resize = () => {
      const rect = mount.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      uniforms.uDpr.value = dpr;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      composer.setPixelRatio(dpr);
      composer.setSize(w, h);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    // ── Mouse parallax ────────────────────────────────────────────────
    const mouse = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouse.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    const pointerTarget = mount.parentElement ?? mount;
    if (!reduced) pointerTarget.addEventListener("pointermove", onMove);

    let raf = 0;
    let disposed = false;
    const start = performance.now();
    let camAz = 0;

    const frame = (now: number) => {
      if (disposed) return;
      const t = (now - start) / 1000;
      uniforms.uTime.value = t;

      // Auto-orbit + cursor parallax (lerped).
      camAz += 0.0016;
      const targetX = Math.sin(camAz) * 6.6 + mouse.x * 0.9;
      const targetZ = Math.cos(camAz) * 6.6;
      const targetY = 2.4 - mouse.y * 0.7;
      camera.position.x += (targetX - camera.position.x) * 0.04;
      camera.position.y += (targetY - camera.position.y) * 0.04;
      camera.position.z += (targetZ - camera.position.z) * 0.04;
      camera.lookAt(0, 0, 0);

      const pulse = 3.2 + Math.sin(t * 1.1) * 0.22;
      core.scale.set(pulse, pulse, 1);

      composer.render();
      if (!reduced) raf = requestAnimationFrame(frame);
    };

    if (reduced) frame(performance.now());
    else raf = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      pointerTarget.removeEventListener("pointermove", onMove);
      geo.dispose();
      mat.dispose();
      coreTex.dispose();
      coreMat.dispose();
      bloom.dispose();
      composer.dispose();
      renderer.dispose();
      if (canvas.parentNode === mount) mount.removeChild(canvas);
    };
  }, []);

  return <div ref={mountRef} aria-hidden="true" className="h-full w-full" />;
}
