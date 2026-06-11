"use client";

/**
 * WarpNebula — the BlueYard-class particle tier for the cinematic entrance.
 *
 * A Three.js point cloud (~16,000 particles) forming a spiral nebula the
 * visitor flies through. Two modes:
 *  - "warp": particles stream past the camera (z-advance with wrap) — the
 *    tunnel flight. Speed eases in so engagement feels like ignition.
 *  - "idle": the stream decelerates to a slow galactic rotation — arrival.
 *
 * Discipline (same contract as ShaderAurora / ConsensusEngine3D):
 *  - Deterministic geometry (mulberry32 seed) — no hydration drift, stable art.
 *  - Additive blending, soft point sprites, brand palette only.
 *  - Mouse steering via eased uniform (no React re-renders).
 *  - prefers-reduced-motion → renders one static frame, no loop.
 *  - Pauses when tab hidden; DPR clamped; full dispose on unmount.
 *  - WebGL unavailable → renders nothing (the CSS warp behind it carries).
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";

const COUNT = 16000;
const DEPTH = 90;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const VERT = `
uniform float u_time;
uniform float u_speed;
uniform vec2 u_steer;
attribute float a_seed;
attribute vec3 a_color;
varying vec3 v_color;
varying float v_fade;
void main() {
  v_color = a_color;
  vec3 p = position;
  // stream toward the camera and wrap — the tunnel
  p.z = mod(p.z + u_time * u_speed, ${DEPTH.toFixed(1)}) - ${(DEPTH / 2).toFixed(1)};
  // gentle spiral rotation, deeper turns more
  float ang = u_time * 0.02 + p.z * 0.012;
  float c = cos(ang), s = sin(ang);
  p.xy = mat2(c, -s, s, c) * p.xy;
  // steering: the field leans away from the cursor vector
  p.x += u_steer.x * (p.z + ${(DEPTH / 2).toFixed(1)}) * 0.06;
  p.y -= u_steer.y * (p.z + ${(DEPTH / 2).toFixed(1)}) * 0.06;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float twinkle = 0.75 + 0.25 * sin(u_time * (1.5 + a_seed * 2.0) + a_seed * 40.0);
  gl_PointSize = (1.4 + a_seed * 2.6) * twinkle * (140.0 / -mv.z);
  // fade at both ends of the tunnel so wrap is invisible
  float zn = (p.z + ${(DEPTH / 2).toFixed(1)}) / ${DEPTH.toFixed(1)};
  v_fade = smoothstep(0.0, 0.12, zn) * (1.0 - smoothstep(0.82, 1.0, zn));
  gl_Position = projectionMatrix * mv;
}
`;

const FRAG = `
precision mediump float;
varying vec3 v_color;
varying float v_fade;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d);
  float glow = exp(-r * r * 9.0) - exp(-0.25 * 9.0);
  if (glow <= 0.0) discard;
  gl_FragColor = vec4(v_color, glow * v_fade);
}
`;

// brand palette as vec3s — weighted toward white/cyan with uv/plasma accents
const PALETTE: ReadonlyArray<readonly [number, number, number]> = [
  [0.965, 0.969, 0.98], // ion white
  [0.0, 0.898, 1.0],    // orbital cyan
  [0.478, 0.361, 1.0],  // ultraviolet
  [1.0, 0.176, 0.839],  // plasma
];
const WEIGHTS = [0.46, 0.3, 0.18, 0.06] as const;

export function WarpNebula({ mode }: { mode: "warp" | "idle" }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "high-performance" });
    } catch {
      return; // no WebGL — CSS warp carries the scene
    }
    // Software rasterizers (SwiftShader/llvmpipe — VMs, blocklisted GPUs)
    // cannot push 16k additive points per frame; the CSS warp carries those
    // clients instead of a stalled intro.
    try {
      const gl = renderer.getContext();
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      const rname = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "";
      if (/swiftshader|llvmpipe|software/i.test(rname)) {
        renderer.dispose();
        return;
      }
    } catch {
      /* renderer name unavailable — proceed */
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;opacity:0;transition:opacity 700ms ease";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(62, 1, 0.1, DEPTH);
    camera.position.z = DEPTH / 2 - 2;

    // ── deterministic spiral nebula ──────────────────────────────────
    const rand = mulberry32(20260611);
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const seed = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      // radius biased inward + 3-arm spiral with cluster blooms
      const arm = i % 3;
      const t = Math.pow(rand(), 0.62);
      const radius = t * 26;
      const swirl = radius * 0.16 + (arm * Math.PI * 2) / 3;
      const spread = (rand() - 0.5) * (1.6 + radius * 0.22);
      const ang = swirl + spread * 0.22 + rand() * 0.35;
      pos[i * 3] = Math.cos(ang) * radius + (rand() - 0.5) * 1.6;
      pos[i * 3 + 1] = Math.sin(ang) * radius * 0.62 + (rand() - 0.5) * 1.6;
      pos[i * 3 + 2] = rand() * DEPTH - DEPTH / 2;
      const w = rand();
      let acc = 0, pi = 0;
      for (let k = 0; k < WEIGHTS.length; k++) { acc += WEIGHTS[k]!; if (w <= acc) { pi = k; break; } }
      const c = PALETTE[pi]!;
      const dim = 0.55 + rand() * 0.45;
      col[i * 3] = c[0] * dim; col[i * 3 + 1] = c[1] * dim; col[i * 3 + 2] = c[2] * dim;
      seed[i] = rand();
    }
    const steerVec = new THREE.Vector2(0, 0);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("a_color", new THREE.BufferAttribute(col, 3));
    geo.setAttribute("a_seed", new THREE.BufferAttribute(seed, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        u_time: { value: 0 },
        u_speed: { value: 0 },
        u_steer: { value: steerVec },
      },
    });
    scene.add(new THREE.Points(geo, mat));

    const resize = () => {
      const w = host.clientWidth || window.innerWidth;
      const h = host.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    // steering follows the pointer with easing (no React involved)
    const steerTarget = new THREE.Vector2(0, 0);
    const onMove = (e: MouseEvent) => {
      steerTarget.set(
        (e.clientX / window.innerWidth - 0.5) * 2,
        (e.clientY / window.innerHeight - 0.5) * 2,
      );
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    let raf = 0, disposed = false, speed = 0;
    const t0 = performance.now();
    const frame = () => {
      if (disposed) return;
      const t = (performance.now() - t0) / 1000;
      const wantSpeed = modeRef.current === "warp" ? 14 : 2.0;
      speed += (wantSpeed - speed) * 0.022; // eases like ignition / deceleration
      mat.uniforms.u_time!.value = t;
      mat.uniforms.u_speed!.value = speed;
      steerVec.lerp(steerTarget, 0.06);
      renderer.render(scene, camera);
      if (!reduced) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    requestAnimationFrame(() => { renderer.domElement.style.opacity = "1"; });

    const onVis = () => {
      if (reduced) return;
      cancelAnimationFrame(raf);
      if (!document.hidden && !disposed) raf = requestAnimationFrame(frame);
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("visibilitychange", onVis);
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} aria-hidden className="pointer-events-none absolute inset-0" />;
}
