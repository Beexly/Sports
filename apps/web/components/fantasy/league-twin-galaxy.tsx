"use client";

/**
 * LeagueTwinGalaxy — your roster rendered as a physics galaxy.
 *
 * Each player is a star system whose appearance ENCODES its metrics (projection →
 * brightness, usage → size, volatility → halo, position → colour, bye → eclipse
 * ring, injury/trend → shock pulse); same-team stacks are orbital ties. Raw
 * three.js for control and zero framework-version risk; DPR- and reduced-motion-
 * aware; full GPU dispose on unmount. The canvas is aria-hidden — the visible
 * roster manifest + inspector are the accessible source of truth and the keyboard
 * controls. Illustrative data.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { buildLeagueTwin, SHOCK_HEX, type TwinNode } from "@/lib/fantasy/league-twin";
import { BRAND_COLORS } from "@/lib/brand";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function radialTexture(stops: [number, string][]): InstanceType<typeof THREE.CanvasTexture> {
  const s = 128;
  const cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const ctx = cv.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(cv);
  t.needsUpdate = true;
  return t;
}

function ringTexture(): InstanceType<typeof THREE.CanvasTexture> {
  const s = 128;
  const cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const ctx = cv.getContext("2d")!;
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s / 2 - 8, 0, Math.PI * 2);
  ctx.stroke();
  const t = new THREE.CanvasTexture(cv);
  t.needsUpdate = true;
  return t;
}

type SystemObj = {
  node: TwinNode;
  group: InstanceType<typeof THREE.Group>;
  core: InstanceType<typeof THREE.Sprite>;
  baseScale: number;
  pos: InstanceType<typeof THREE.Vector3>;
};

export function LeagueTwinGalaxy() {
  const twin = useMemo(() => buildLeagueTwin(), []);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [focusId, setFocusId] = useState<string>(twin.nodes[0]?.player.id ?? "");
  const focusRef = useRef(focusId);
  focusRef.current = focusId;
  const setFocusRef = useRef<(id: string) => void>(() => {});

  const focused = twin.nodes.find((n) => n.player.id === focusId) ?? twin.nodes[0];

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduced = prefersReducedMotion();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 100);
    camera.position.set(0, 7.5, 14);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.setAttribute("aria-hidden", "true");

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.9, 0.6, 0.2);
    composer.addPass(bloom);

    const glow = radialTexture([[0, "rgba(255,255,255,1)"], [0.18, "rgba(255,255,255,0.65)"], [1, "rgba(255,255,255,0)"]]);
    const softGlow = radialTexture([[0, "rgba(255,255,255,0.5)"], [0.5, "rgba(255,255,255,0.18)"], [1, "rgba(255,255,255,0)"]]);
    const ring = ringTexture();

    const root = new THREE.Group();
    scene.add(root);

    // faint galactic disc
    const disc = new THREE.Mesh(
      new THREE.RingGeometry(2, 11, 64),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(BRAND_COLORS.softUltraviolet), transparent: true, opacity: 0.04, side: THREE.DoubleSide }),
    );
    disc.rotation.x = -Math.PI / 2;
    root.add(disc);

    const systems: SystemObj[] = [];
    const idByCore = new Map<InstanceType<typeof THREE.Sprite>, string>();

    for (const node of twin.nodes) {
      const g = new THREE.Group();
      const x = Math.cos(node.angle) * node.radius;
      const z = Math.sin(node.angle) * node.radius;
      const y = (node.brightness - 0.5) * 1.6;
      g.position.set(x, y, z);

      const color = new THREE.Color(node.hex);

      // volatility halo
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softGlow, color, transparent: true, opacity: 0.12 + node.halo * 0.32, blending: THREE.AdditiveBlending, depthWrite: false }));
      const haloScale = 1.4 + node.halo * 2.4;
      halo.scale.set(haloScale, haloScale, 1);
      g.add(halo);

      // core
      const coreOpacity = node.eclipsed ? 0.28 : 0.55 + node.brightness * 0.45;
      const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color, transparent: true, opacity: coreOpacity, blending: THREE.AdditiveBlending, depthWrite: false }));
      const baseScale = 0.6 + node.size * 1.25;
      core.scale.set(baseScale, baseScale, 1);
      g.add(core);
      idByCore.set(core, node.player.id);

      // eclipse ring (bye blackout)
      if (node.eclipsed) {
        const er = new THREE.Sprite(new THREE.SpriteMaterial({ map: ring, color: new THREE.Color("#9fb3c8"), transparent: true, opacity: 0.5, depthWrite: false }));
        const rs = baseScale * 2.1;
        er.scale.set(rs, rs, 1);
        g.add(er);
      }

      // shock ring (injury / trend)
      if (node.shock !== "none") {
        const sr = new THREE.Sprite(new THREE.SpriteMaterial({ map: ring, color: new THREE.Color(SHOCK_HEX[node.shock]), transparent: true, opacity: node.shock === "critical" ? 0.7 : 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
        const rs = baseScale * 1.7;
        sr.scale.set(rs, rs, 1);
        g.add(sr);
      }

      root.add(g);
      systems.push({ node, group: g, core, baseScale, pos: new THREE.Vector3(x, y, z) });
    }

    // stack ties
    const tieLines: InstanceType<typeof THREE.Line>[] = [];
    for (const t of twin.ties) {
      const a = systems.find((s) => s.node.player.id === t.a);
      const b = systems.find((s) => s.node.player.id === t.b);
      if (!a || !b) continue;
      const geo = new THREE.BufferGeometry().setFromPoints([a.pos, b.pos]);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: new THREE.Color(BRAND_COLORS.softUltraviolet), transparent: true, opacity: 0.32 }));
      root.add(line);
      tieLines.push(line);
    }

    // focus highlight: a thin selection ring we move to the focused node
    const selMat = new THREE.SpriteMaterial({ map: ring, color: new THREE.Color("#ffffff"), transparent: true, opacity: 0.85, depthWrite: false });
    const sel = new THREE.Sprite(selMat);
    sel.scale.set(2.4, 2.4, 1);
    root.add(sel);

    const applyFocus = (id: string) => {
      const s = systems.find((x) => x.node.player.id === id);
      if (s) sel.position.copy(s.group.position);
    };
    applyFocus(focusRef.current);
    setFocusRef.current = (id: string) => { setFocusId(id); applyFocus(id); };

    // sizing
    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      bloom.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    // picking
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(systems.map((s) => s.core), false);
      const first = hits[0]?.object as InstanceType<typeof THREE.Sprite> | undefined;
      if (first) {
        const id = idByCore.get(first);
        if (id) setFocusRef.current(id);
      }
    };
    renderer.domElement.addEventListener("click", onClick);
    renderer.domElement.style.cursor = "pointer";

    // animate
    let raf = 0;
    let t = 0;
    let running = false;
    let inView = true;
    const tick = () => {
      t += 0.016;
      if (!reduced) root.rotation.y += 0.0016;
      sel.material.opacity = 0.55 + Math.sin(t * 2.4) * 0.3;
      for (const s of systems) {
        if (s.node.shock === "critical" || s.node.shock === "caution") {
          const pulse = 1 + Math.sin(t * (s.node.shock === "critical" ? 3.4 : 2.2)) * (reduced ? 0.02 : 0.08);
          s.core.scale.set(s.baseScale * pulse, s.baseScale * pulse, 1);
        }
      }
      composer.render();
      if (running) raf = requestAnimationFrame(tick);
    };

    // Pause the render loop while the tab is hidden or the galaxy is
    // off-screen; resume where it left off when it is watchable again.
    const stopLoop = () => {
      running = false;
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    const startLoop = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(tick);
    };
    const onVisibility = () => {
      if (document.hidden) stopLoop();
      else if (inView) startLoop();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const io =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              inView = entries[0]?.isIntersecting ?? true;
              if (inView && !document.hidden) startLoop();
              else stopLoop();
            },
            { threshold: 0 },
          )
        : null;
    io?.observe(mount);

    tick(); // immediate first frame so the canvas never flashes empty
    startLoop();

    return () => {
      stopLoop();
      document.removeEventListener("visibilitychange", onVisibility);
      io?.disconnect();
      ro.disconnect();
      renderer.domElement.removeEventListener("click", onClick);
      scene.traverse((obj: InstanceType<typeof THREE.Object3D>) => {
        const any = obj as unknown as { geometry?: { dispose(): void }; material?: { dispose(): void; map?: { dispose(): void } } };
        any.geometry?.dispose?.();
        if (any.material) { any.material.map?.dispose?.(); any.material.dispose?.(); }
      });
      glow.dispose(); softGlow.dispose(); ring.dispose();
      composer.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [twin]);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      {/* galaxy */}
      <div className="surface-card relative overflow-hidden p-0">
        <div ref={mountRef} className="h-[58vh] min-h-[360px] w-full" />
        <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap gap-3 text-[10px] uppercase tracking-wider">
          {(["QB", "RB", "WR", "TE"] as const).map((p) => (
            <span key={p} className="flex items-center gap-1" style={{ color: { QB: "#00E5FF", RB: "#7B61FF", WR: "#FF38C7", TE: "#F5F7FF" }[p] }}>
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: "currentColor" }} /> {p}
            </span>
          ))}
        </div>
        <p className="pointer-events-none absolute bottom-3 left-4 text-[10px] text-ink-600">
          Brightness = projection · size = usage · halo = volatility · ring = bye/shock · ties = stacks
        </p>
      </div>

      {/* accessible manifest + inspector (source of truth) */}
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-2 text-center">
          <Stat label="Proj" value={twin.totalProj} />
          <Stat label="Stacks" value={twin.stackCount} hex={BRAND_COLORS.softUltraviolet} />
          <Stat label="Risk" value={twin.riskCount} hex="#E0A800" />
          <Stat label={`Bye W${twin.currentWeek}`} value={twin.byeExposure} hex={BRAND_COLORS.ionMagenta} />
        </div>

        {focused && (
          <div className="surface-card p-4" role="status" aria-live="polite">
            <div className="flex items-center gap-2">
              <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ color: focused.hex, background: `${focused.hex}1c` }}>{focused.pos}</span>
              <span className="text-sm font-semibold text-white">{focused.player.name}</span>
              <span className="ml-auto font-mono text-xs text-ink-500">{focused.player.team} · bye {focused.player.bye}</span>
            </div>
            <p className="mt-2 text-xs text-ink-300">{focused.player.note}</p>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
              <Enc label="Projection" v={`${focused.player.proj}`} />
              <Enc label="Usage" v={`${Math.round(focused.player.usage * 100)}%`} />
              <Enc label="Volatility" v={`${Math.round(focused.halo * 100)}%`} />
              <Enc label="VOR" v={`${focused.vor}`} />
            </div>
            <p className="mt-3 text-[11px]" style={{ color: SHOCK_HEX[focused.shock] }}>
              {focused.eclipsed ? `Eclipse: on bye week ${twin.currentWeek}. ` : ""}{focused.shockNote}
            </p>
          </div>
        )}

        <div className="surface-card p-3">
          <p className="mb-2 px-1 text-[10px] uppercase tracking-wider text-ink-600">Roster · select to focus</p>
          <div className="max-h-[26vh] space-y-0.5 overflow-y-auto">
            {twin.nodes.map((n) => {
              const active = n.player.id === focusId;
              return (
                <button
                  key={n.player.id}
                  type="button"
                  onClick={() => setFocusRef.current(n.player.id)}
                  aria-pressed={active}
                  className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs transition-colors"
                  style={{ background: active ? "rgba(255,255,255,0.08)" : "transparent" }}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: n.hex }} />
                  <span className="flex-1 truncate text-white">{n.player.name}</span>
                  {n.eclipsed && <span role="img" aria-label="on bye week" title="bye" style={{ color: BRAND_COLORS.ionMagenta }}>◑</span>}
                  {n.shock !== "none" && <span role="img" aria-label={`shock: ${n.shock}`} title={n.shock} style={{ color: SHOCK_HEX[n.shock] }}>●</span>}
                  <span className="font-mono text-[10px] text-ink-500">{n.player.proj}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, hex }: { label: string; value: number; hex?: string }) {
  return (
    <div className="surface-card p-2">
      <p className="font-display text-xl" style={{ color: hex ?? "#fff" }}>{value}</p>
      <p className="text-[9px] uppercase tracking-wider text-ink-600">{label}</p>
    </div>
  );
}

function Enc({ label, v }: { label: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-600">{label}</span>
      <span className="font-mono text-ink-200">{v}</span>
    </div>
  );
}
