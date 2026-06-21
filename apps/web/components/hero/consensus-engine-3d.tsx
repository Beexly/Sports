"use client";

/**
 * ConsensusEngine3D — the hero IS the working model.
 *
 * A WebGL field of ~4,000 GPU particles (the data) with SIX bright, labeled
 * referee nodes — the engine's real independent estimators — orbiting a central
 * signal core. Data streams down beams from each referee into the core; HTML
 * labels are projected onto the nodes every frame so you read the model as it
 * runs, and the node nearest your cursor lights up. UnrealBloom for HDR glow.
 *
 * Raw three.js + a projected-DOM label layer (accessible real text). DPR-aware,
 * reduced-motion-aware, full GPU + DOM cleanup. Decorative geometry is aria-hidden;
 * the labels are real text describing the engine.
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

type V3 = InstanceType<typeof THREE.Vector3>;

const REFEREES = [
  { label: "Market consensus", hex: 0x00e5ff },
  { label: "Kalshi exchange", hex: 0x00e5ff },
  { label: "Elo model", hex: 0x7a5cff },
  { label: "Poisson model", hex: 0x7a5cff },
  { label: "Closing line", hex: 0xff2dd6 },
  { label: "Narrative signal", hex: 0xf6f7fa },
] as const;

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

function makeGlowTexture(): InstanceType<typeof THREE.CanvasTexture> {
  const s = 128;
  const cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const ctx = cv.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.12, "rgba(255,255,255,0.5)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(cv);
  tex.needsUpdate = true;
  return tex;
}

function makeSoftTexture(): InstanceType<typeof THREE.CanvasTexture> {
  const s = 256;
  const cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const ctx = cv.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,0.55)");
  g.addColorStop(0.4, "rgba(255,255,255,0.16)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(cv);
  tex.needsUpdate = true;
  return tex;
}

const VERT = /* glsl */ `
  uniform float uTime; uniform float uSize; uniform float uDpr;
  attribute float aScale; attribute float aSeed; attribute vec3 aColor;
  varying vec3 vColor; varying float vTw;
  void main() {
    vColor = aColor;
    vec3 p = position;
    float r = length(p.xz);
    float ang = uTime * (0.14 / (r * 0.55 + 0.5));
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
  varying vec3 vColor; varying float vTw;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = pow(smoothstep(0.5, 0.0, d), 2.0);
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor * (0.55 + 0.45 * vTw), a);
  }
`;

export function ConsensusEngine3D() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    const overlay = overlayRef.current;
    if (!mount || !overlay) return;
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
    Object.assign(canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%", zIndex: "0" } as CSSStyleDeclaration);
    mount.insertBefore(canvas, overlay);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 100);
    camera.position.set(0, 0.6, 7.4);

    const group = new THREE.Group();
    group.rotation.x = -0.34;
    scene.add(group);

    const glow = makeGlowTexture();

    // ── Background data field ──────────────────────────────────────────
    // Reconciled to the documented ~4k budget: 45k Float32 points through the
    // bloom pass every frame was a 10x GPU cost for no visible gain.
    const COUNT = 4500;
    const ARMS = 3;
    const rng = mulberry32(0x515ed);
    const fp = new Float32Array(COUNT * 3);
    const fc = new Float32Array(COUNT * 3);
    const fs = new Float32Array(COUNT);
    const fseed = new Float32Array(COUNT);
    const tmpC = new THREE.Color();
    const WHITE = new THREE.Color(0xf6f7fa), CYAN = new THREE.Color(0x00e5ff), UV = new THREE.Color(0x7a5cff), MAG = new THREE.Color(0xff2dd6);
    for (let i = 0; i < COUNT; i++) {
      const radius = Math.pow(rng(), 1.7) * 3.7 + 0.08;
      const arm = Math.floor(rng() * ARMS);
      const angle = (arm / ARMS) * Math.PI * 2 + radius * 2.3 + (rng() - 0.5) * (0.5 / (radius * 0.5 + 0.35));
      fp[i * 3] = Math.cos(angle) * radius;
      fp[i * 3 + 1] = (rng() - 0.5) * 0.34 * Math.exp(-radius * 0.5);
      fp[i * 3 + 2] = Math.sin(angle) * radius;
      const tt = Math.min(1, radius / 3.8);
      if (tt < 0.34) tmpC.copy(WHITE).lerp(CYAN, tt / 0.34);
      else if (tt < 0.7) tmpC.copy(CYAN).lerp(UV, (tt - 0.34) / 0.36);
      else tmpC.copy(UV).lerp(MAG, (tt - 0.7) / 0.3);
      // True-galaxy HDR: most stars dim, a rare few bright — so only those bloom.
      const bright = 0.4 + Math.pow(rng(), 2.6) * 2.2;
      fc[i * 3] = tmpC.r * bright; fc[i * 3 + 1] = tmpC.g * bright; fc[i * 3 + 2] = tmpC.b * bright;
      fs[i] = 0.35 + rng() * rng() * 1.5;
      fseed[i] = rng();
    }
    const fieldGeo = new THREE.BufferGeometry();
    fieldGeo.setAttribute("position", new THREE.BufferAttribute(fp, 3));
    fieldGeo.setAttribute("aColor", new THREE.BufferAttribute(fc, 3));
    fieldGeo.setAttribute("aScale", new THREE.BufferAttribute(fs, 1));
    fieldGeo.setAttribute("aSeed", new THREE.BufferAttribute(fseed, 1));
    const fieldUniforms = { uTime: { value: 0 }, uSize: { value: 12 }, uDpr: { value: 1 } };
    const fieldMat = new THREE.ShaderMaterial({
      uniforms: fieldUniforms, vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    group.add(new THREE.Points(fieldGeo, fieldMat));

    // ── Nebula haze — diffuse colored glow gives the galaxy real depth ──
    const neb = makeSoftTexture();
    const NEBULAS: ReadonlyArray<readonly [number, number, number, number, number, number]> = [
      [0, 0, 0, 0x9fe8ff, 4.6, 0.22],
      [0, 0, 0, 0x7a5cff, 7.2, 0.13],
      [1.8, 0.1, 1.1, 0x00e5ff, 3.4, 0.10],
      [-1.7, -0.1, -1.3, 0x7a5cff, 3.7, 0.10],
      [0.5, 0.0, -2.0, 0xff2dd6, 2.9, 0.08],
      [-2.0, 0.1, 1.5, 0xf6f7fa, 2.6, 0.07],
      [2.3, -0.1, -1.5, 0x7a5cff, 3.0, 0.07],
      [-1.1, 0.1, 2.3, 0x00e5ff, 2.9, 0.07],
    ];
    const nebMats: InstanceType<typeof THREE.SpriteMaterial>[] = [];
    for (const [nx, ny, nz, hex, sc, op] of NEBULAS) {
      const m = new THREE.SpriteMaterial({ map: neb, color: new THREE.Color(hex), transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending });
      const s = new THREE.Sprite(m);
      s.position.set(nx, ny, nz);
      s.scale.set(sc, sc, 1);
      group.add(s);
      nebMats.push(m);
    }

    // ── Referee nodes + beams + streaming data ─────────────────────────
    const N = REFEREES.length;
    const RING = 3.1;
    const nodePos: V3[] = [];
    const nodeSprites: InstanceType<typeof THREE.Sprite>[] = [];
    const nodeColors: InstanceType<typeof THREE.Color>[] = [];
    const beamPos: number[] = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2;
      const pos = new THREE.Vector3(Math.cos(a) * RING, Math.sin(a) * RING * 0.42 + 0.4, Math.sin(a) * RING * 0.5);
      nodePos.push(pos);
      const color = new THREE.Color(REFEREES[i]!.hex);
      nodeColors.push(color);
      const mat = new THREE.SpriteMaterial({ map: glow, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      const sp = new THREE.Sprite(mat);
      sp.position.copy(pos);
      sp.scale.set(0.32, 0.32, 1);
      group.add(sp);
      nodeSprites.push(sp);
      beamPos.push(pos.x, pos.y, pos.z, 0, 0, 0);
    }
    const beamGeo = new THREE.BufferGeometry();
    beamGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(beamPos), 3));
    const beamMat = new THREE.LineBasicMaterial({ color: 0x9fdcff, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false });
    group.add(new THREE.LineSegments(beamGeo, beamMat));

    // Streaming particles travelling node → core.
    const PER = 16;
    const STREAM = N * PER;
    const sp2 = new Float32Array(STREAM * 3);
    const sc2 = new Float32Array(STREAM * 3);
    const ss2 = new Float32Array(STREAM);
    const streamT = new Float32Array(STREAM);
    const streamNode = new Int16Array(STREAM);
    for (let i = 0; i < STREAM; i++) {
      const ni = i % N;
      streamNode[i] = ni;
      streamT[i] = Math.floor(i / N) / PER + rng() * 0.02;
      const c = nodeColors[ni]!;
      sc2[i * 3] = c.r; sc2[i * 3 + 1] = c.g; sc2[i * 3 + 2] = c.b;
      ss2[i] = 0.7 + rng() * 0.6;
    }
    const streamGeo = new THREE.BufferGeometry();
    streamGeo.setAttribute("position", new THREE.BufferAttribute(sp2, 3));
    streamGeo.setAttribute("aColor", new THREE.BufferAttribute(sc2, 3));
    streamGeo.setAttribute("aScale", new THREE.BufferAttribute(ss2, 1));
    streamGeo.setAttribute("aSeed", new THREE.BufferAttribute(new Float32Array(STREAM), 1));
    const streamMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uSize: { value: 22 }, uDpr: { value: 1 } },
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const streamPoints = new THREE.Points(streamGeo, streamMat);
    group.add(streamPoints);

    // ── Signal core ────────────────────────────────────────────────────
    const coreMat = new THREE.SpriteMaterial({ map: glow, color: new THREE.Color(0xe6fbff), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const core = new THREE.Sprite(coreMat);
    core.scale.set(1.75, 1.75, 1);
    group.add(core);

    // ── DOM labels (real text, accessible) ─────────────────────────────
    const labelEls: HTMLDivElement[] = [];
    const coreLabel = document.createElement("div");
    coreLabel.textContent = "Consensus signal";
    Object.assign(coreLabel.style, {
      position: "absolute", left: "0", top: "0", transform: "translate(-50%,-50%)",
      padding: "4px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: "700",
      letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap",
      color: "#F5F7FF", background: "rgba(5,6,8,0.55)", border: "1px solid rgba(0,229,255,0.45)",
      backdropFilter: "blur(6px)", boxShadow: "0 0 18px rgba(0,229,255,0.25)",
    });
    overlay.appendChild(coreLabel);
    for (let i = 0; i < N; i++) {
      const el = document.createElement("div");
      const hex = "#" + REFEREES[i]!.hex.toString(16).padStart(6, "0");
      Object.assign(el.style, {
        position: "absolute", left: "0", top: "0", transform: "translate(-50%,-50%)",
        display: "flex", alignItems: "center", gap: "6px", padding: "3px 9px",
        borderRadius: "999px", fontSize: "11px", fontWeight: "600", whiteSpace: "nowrap",
        color: "#cfd6e6", background: "rgba(5,6,8,0.5)", border: "1px solid rgba(255,255,255,0.1)",
        backdropFilter: "blur(6px)", transition: "color 200ms, border-color 200ms, transform 120ms", willChange: "transform, opacity",
      });
      const dot = document.createElement("span");
      Object.assign(dot.style, { width: "6px", height: "6px", borderRadius: "999px", background: hex, boxShadow: `0 0 8px ${hex}` } as CSSStyleDeclaration);
      const txt = document.createElement("span");
      txt.textContent = REFEREES[i]!.label;
      el.appendChild(dot);
      el.appendChild(txt);
      overlay.appendChild(el);
      labelEls.push(el);
    }

    // ── Sizing / composer ──────────────────────────────────────────────
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 1.55, 0.8, 0.5);
    composer.addPass(bloom);

    let W = 1, H = 1;
    const resize = () => {
      const rect = mount.getBoundingClientRect();
      W = Math.max(1, rect.width); H = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
      fieldUniforms.uDpr.value = dpr; streamMat.uniforms.uDpr!.value = dpr;
      camera.aspect = W / H; camera.updateProjectionMatrix();
      composer.setPixelRatio(dpr); composer.setSize(W, H);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    const mouse = { x: -9999, y: -9999, has: false };
    const onMove = (e: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      mouse.x = e.clientX - rect.left; mouse.y = e.clientY - rect.top; mouse.has = true;
    };
    const onLeave = () => { mouse.has = false; };
    mount.addEventListener("pointermove", onMove);
    mount.addEventListener("pointerleave", onLeave);

    const proj = new THREE.Vector3();
    const world = new THREE.Vector3();
    let raf = 0, disposed = false;
    const start = performance.now();

    const project = (p: V3): { x: number; y: number; vis: boolean } => {
      proj.copy(p).project(camera);
      return { x: (proj.x * 0.5 + 0.5) * W, y: (-proj.y * 0.5 + 0.5) * H, vis: proj.z < 1 };
    };

    const frame = (now: number) => {
      if (disposed) return;
      const t = (now - start) / 1000;
      fieldUniforms.uTime.value = t;
      streamMat.uniforms.uTime!.value = t;

      // advance streams (local space; group transform handles rotation)
      for (let i = 0; i < STREAM; i++) {
        let tt = streamT[i]! + (reduced ? 0 : 0.0065);
        if (tt > 1) tt -= 1;
        streamT[i] = tt;
        const np = nodePos[streamNode[i]!]!;
        const e = tt * tt * (3 - 2 * tt);
        sp2[i * 3] = np.x * (1 - e);
        sp2[i * 3 + 1] = np.y * (1 - e);
        sp2[i * 3 + 2] = np.z * (1 - e);
      }
      streamGeo.attributes.position!.needsUpdate = true;

      if (!reduced) {
        group.rotation.y = t * 0.06;
      }
      camera.position.x += ((mouse.has ? (mouse.x / W - 0.5) * 1.6 : 0) - camera.position.x) * 0.04;
      camera.position.y += ((mouse.has ? 0.6 - (mouse.y / H - 0.5) * 1.0 : 0.6) - camera.position.y) * 0.04;
      camera.lookAt(0, 0.2, 0);

      core.scale.setScalar(1.75 + Math.sin(t * 1.2) * 0.12);

      // labels + hover
      let nearest = -1, nd = 60 * 60;
      const screen: Array<{ x: number; y: number; vis: boolean }> = [];
      for (let i = 0; i < N; i++) {
        nodeSprites[i]!.getWorldPosition(world);
        const s = project(world);
        screen.push(s);
        if (mouse.has && s.vis) {
          const dx = s.x - mouse.x, dy = s.y - mouse.y, d2 = dx * dx + dy * dy;
          if (d2 < nd) { nd = d2; nearest = i; }
        }
      }
      for (let i = 0; i < N; i++) {
        const el = labelEls[i]!, s = screen[i]!, active = i === nearest;
        el.style.transform = `translate(-50%,-50%) translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px) scale(${active ? 1.08 : 1})`;
        el.style.opacity = s.vis ? "1" : "0";
        el.style.color = active ? "#F5F7FF" : "#cfd6e6";
        el.style.borderColor = active ? "rgba(0,229,255,0.6)" : "rgba(255,255,255,0.1)";
        const sp = nodeSprites[i]!;
        sp.scale.setScalar(active ? 0.52 : 0.32);
        (sp.material as InstanceType<typeof THREE.SpriteMaterial>).opacity = active ? 1 : 0.85;
      }
      core.getWorldPosition(world);
      const cs = project(world);
      coreLabel.style.transform = `translate(-50%,-50%) translate(${cs.x.toFixed(1)}px, ${(cs.y - 64).toFixed(1)}px)`;
      coreLabel.style.opacity = cs.vis ? "1" : "0";

      composer.render();
      if (!reduced) raf = requestAnimationFrame(frame);
    };
    if (reduced) frame(performance.now());
    else raf = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      mount.removeEventListener("pointermove", onMove);
      mount.removeEventListener("pointerleave", onLeave);
      labelEls.forEach((el) => el.remove());
      coreLabel.remove();
      fieldGeo.dispose(); fieldMat.dispose();
      beamGeo.dispose(); beamMat.dispose();
      streamGeo.dispose(); streamMat.dispose();
      nodeSprites.forEach((s) => (s.material as InstanceType<typeof THREE.SpriteMaterial>).dispose());
      coreMat.dispose(); glow.dispose();
      neb.dispose(); nebMats.forEach((m) => m.dispose());
      bloom.dispose(); composer.dispose(); renderer.dispose();
      if (canvas.parentNode === mount) mount.removeChild(canvas);
    };
  }, []);

  return (
    <div ref={mountRef} className="relative h-full w-full">
      <div ref={overlayRef} className="pointer-events-none absolute inset-0 z-10" aria-label="The engine's independent referees converging on a signal" />
    </div>
  );
}
