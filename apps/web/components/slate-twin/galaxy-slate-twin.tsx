"use client";

/**
 * GalaxySlateTwin - a spatial digital twin of the slate, rebuilt as a spatial
 * intelligence instrument (mission-control / terminal grade, not a decorative
 * galaxy).
 *
 * Games are star systems; each system ENCODES its real metrics, not decoration:
 *   - core brightness/size  <- signal density
 *   - volatility halo size  <- volatility (fragility)
 *   - orbital wobble        <- contradiction mass (credible counter-evidence)
 *   - confidence orbit ring <- confidence at the scrubbed time step
 *   - core colour           <- verdict (PLAY / WATCHLIST / NO-BET / HOLD)
 *   - market satellites      <- markets; satellite size <- market depth
 *   - odds trail             <- line-movement direction/magnitude
 * A time scrubber moves every system through Opening line -> ... -> Result (the
 * 4D axis). Click a system to fly to it; the inspect HUD argues the read in
 * five scannable fields.
 *
 * Raw three.js (no R3F) for control + zero framework-version risk. The heavy GL
 * layer is lazy-mounted by galaxy-slate-twin-lazy. DPR + device aware, with a
 * per-device particle budget, rAF paused when offscreen/hidden, and full GPU
 * dispose on unmount. The canvas is aria-hidden; the Slate manifest + inspector
 * below are the accessible source of truth and the keyboard controls.
 * prefers-reduced-motion renders a single static, de-conflicted, fully legible
 * frame with no animation loop. Demo data only.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import {
  TIMELINE, VERDICT_HEX, LEAGUES,
  type TwinGame, type TwinVerdict, type TwinLeague, type TwinImpact, type TwinSlate, type TwinMarket,
} from "@/lib/slate-twin/demo-slate";
import { computeGalaxyLayout, type Vec3 } from "@/lib/slate-twin/layout";
import { deriveHud } from "@/lib/slate-twin/hud";
import { BRAND_COLORS } from "@/lib/brand";

type LeagueFilter = TwinLeague | "ALL";

const HOLD_HEX = "#8893a5"; // a held read desaturates toward steel

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Per-device particle + bloom budget so mid laptops hold 60fps and mobile stays smooth. */
function qualityBudget(): { far: number; mid: number; near: number; bloom: number; dprCap: number } {
  if (typeof window === "undefined") return { far: 280, mid: 120, near: 44, bloom: 1.1, dprCap: 2 };
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const mem = nav.deviceMemory ?? 4;
  const small = Math.min(window.innerWidth, window.innerHeight) < 760;
  const weak = cores <= 4 || mem <= 4 || small;
  const strong = cores >= 8 && mem >= 8 && !small;
  if (weak) return { far: 200, mid: 80, near: 26, bloom: 0.9, dprCap: 1.5 };
  if (strong) return { far: 620, mid: 240, near: 92, bloom: 1.35, dprCap: 2 };
  return { far: 360, mid: 150, near: 56, bloom: 1.15, dprCap: 2 };
}

/** Radial-gradient sprite/point texture - the floor for round, soft particles (no square POINTS). */
function makeGlow(inner = 0.12): InstanceType<typeof THREE.CanvasTexture> {
  const s = 128;
  const cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const ctx = cv.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(inner, "rgba(255,255,255,0.6)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(cv);
  t.needsUpdate = true;
  return t;
}

type StarTier = {
  points: InstanceType<typeof THREE.Points>;
  group: InstanceType<typeof THREE.Group>;
  spin: number;
};

type System = {
  game: TwinGame;
  group: InstanceType<typeof THREE.Group>;
  core: InstanceType<typeof THREE.Sprite>;
  halo: InstanceType<typeof THREE.Sprite>;
  ring: InstanceType<typeof THREE.LineLoop>;
  sats: InstanceType<typeof THREE.Sprite>[];
  satHalos: InstanceType<typeof THREE.Sprite>[];
  focus: number;
  trail: InstanceType<typeof THREE.Line>;
  trailHead: InstanceType<typeof THREE.Sprite>;
  trailPts: Float32Array;
  pressure: InstanceType<typeof THREE.Sprite>;
  sharpNode: InstanceType<typeof THREE.Sprite>;
  lensRing: InstanceType<typeof THREE.LineLoop>;
  impactRing: InstanceType<typeof THREE.LineLoop>;
  publicMoney: number;
  sharp: number;
  impact: TwinImpact | null;
  base: number;
  baseHex: string;
  screen: { x: number; y: number; vis: boolean };
};

const TLEN = TIMELINE.length;
const LABEL_GAP = 22;
const LEADER_MIN = 9;

export function GalaxySlateTwin({ slate }: { slate: TwinSlate }) {
  const games = slate.games;
  const illustrative = slate.illustrative;
  const mountRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [timeIndex, setTimeIndex] = useState<number>(TLEN - 2);
  const [league, setLeague] = useState<LeagueFilter>("ALL");
  const [marketIndex, setMarketIndex] = useState<number | null>(null);

  const selRef = useRef<string | null>(null);
  const timeRef = useRef<number>(TLEN - 2);
  const leagueRef = useRef<LeagueFilter>("ALL");
  const marketRef = useRef<number | null>(null);
  const satScreensRef = useRef<{ x: number; y: number; vis: boolean }[]>([]);
  const renderOnceRef = useRef<(() => void) | null>(null);

  useEffect(() => { selRef.current = selectedId; }, [selectedId]);
  useEffect(() => { timeRef.current = timeIndex; }, [timeIndex]);
  useEffect(() => { leagueRef.current = league; }, [league]);
  useEffect(() => { marketRef.current = marketIndex; }, [marketIndex]);
  useEffect(() => { setMarketIndex(null); }, [selectedId]);
  useEffect(() => { renderOnceRef.current?.(); }, [selectedId, timeIndex, league, marketIndex]);

  const pickLeague = (l: LeagueFilter) => { setLeague(l); setSelectedId(null); };
  const selected = useMemo(() => games.find((g) => g.id === selectedId) ?? null, [games, selectedId]);

  useEffect(() => {
    const mount = mountRef.current;
    const overlay = overlayRef.current;
    if (!mount || !overlay) return;
    const reduced = prefersReducedMotion();
    const budget = qualityBudget();
    const layout = computeGalaxyLayout(games);

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
    Object.assign(canvas.style, { display: "block", width: "100%", height: "100%" });
    mount.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 240);
    camera.position.set(0, 4, 30);

    const glow = makeGlow(0.1);
    const soft = makeGlow(0.5);
    const starTex = makeGlow(0.25);
    const disposables: { dispose: () => void }[] = [glow, soft, starTex];

    // Volumetric starfield: 3 depth tiers of ROUND, soft, textured points on a
    // far shell (radius 40..96) so none nears the camera as a giant square; the
    // round texture removes the hard POINTS-quad look. Each tier parallaxes.
    let starSeed = 0x51a7e;
    const srng = () => {
      starSeed = (starSeed + 0x6d2b79f5) | 0;
      let t = Math.imul(starSeed ^ (starSeed >>> 15), 1 | starSeed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const tierDefs = [
      { count: budget.far, size: 0.55, opacity: 0.34, color: 0x6b7a92, rMin: 64, rMax: 96, spin: 0.006 },
      { count: budget.mid, size: 0.9, opacity: 0.55, color: 0x9fb3c8, rMin: 50, rMax: 78, spin: 0.011 },
      { count: budget.near, size: 1.5, opacity: 0.82, color: 0xcfe0f2, rMin: 40, rMax: 60, spin: 0.018 },
    ];
    const starTiers: StarTier[] = [];
    for (const def of tierDefs) {
      const pos = new Float32Array(def.count * 3);
      for (let i = 0; i < def.count; i++) {
        const r = def.rMin + srng() * (def.rMax - def.rMin);
        const th = srng() * Math.PI * 2;
        const ph = Math.acos(srng() * 2 - 1);
        pos[i * 3] = Math.sin(ph) * Math.cos(th) * r;
        pos[i * 3 + 1] = (srng() - 0.5) * r * 0.9;
        pos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        map: starTex, color: def.color, size: def.size, sizeAttenuation: true,
        transparent: true, opacity: def.opacity, depthWrite: false, blending: THREE.AdditiveBlending, alphaTest: 0.01,
      });
      const pts = new THREE.Points(geo, mat);
      const group = new THREE.Group();
      group.add(pts);
      scene.add(group);
      starTiers.push({ points: pts, group, spin: def.spin });
      disposables.push(geo, mat);
    }

    const ringGeo = (() => {
      const N = 96;
      const arr: number[] = [];
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * Math.PI * 2;
        arr.push(Math.cos(a), 0, Math.sin(a));
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(arr), 3));
      return g;
    })();
    disposables.push(ringGeo);

    const systems: System[] = [];
    for (const game of games) {
      const color = new THREE.Color(VERDICT_HEX[game.verdict]);
      const group = new THREE.Group();
      const p = layout.positions.get(game.id) ?? (game.pos as Vec3);
      group.position.set(p[0], p[1], p[2]);
      group.rotation.x = -0.5;

      const base = 0.5 + game.signalDensity * 1.3;
      const coreMat = new THREE.SpriteMaterial({ map: glow, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      const core = new THREE.Sprite(coreMat);
      core.scale.set(base, base, 1);
      group.add(core);
      disposables.push(coreMat);

      const haloMat = new THREE.SpriteMaterial({ map: soft, color, transparent: true, opacity: 0.06 + game.volatility * 0.16, depthWrite: false, blending: THREE.AdditiveBlending });
      const halo = new THREE.Sprite(haloMat);
      const haloScale = 1.6 + game.volatility * 3.2;
      halo.scale.set(haloScale, haloScale, 1);
      group.add(halo);
      disposables.push(haloMat);

      const ringMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false });
      const ring = new THREE.LineLoop(ringGeo, ringMat);
      group.add(ring);
      disposables.push(ringMat);

      const sats: InstanceType<typeof THREE.Sprite>[] = [];
      const satHalos: InstanceType<typeof THREE.Sprite>[] = [];
      for (let mi = 0; mi < game.markets.length; mi++) {
        const mk = game.markets[mi]!;
        const haloM = new THREE.SpriteMaterial({ map: soft, color: new THREE.Color(mk.volatility > 0.55 ? 0xff2dd6 : 0x7a5cff), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
        const sh = new THREE.Sprite(haloM);
        const hs = 0.5 + mk.volatility * 1.3;
        sh.scale.set(hs, hs, 1);
        group.add(sh);
        satHalos.push(sh);
        disposables.push(haloM);

        const satMat = new THREE.SpriteMaterial({ map: glow, color: new THREE.Color(0xeafcff), transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending });
        const sat = new THREE.Sprite(satMat);
        sat.scale.set(0.26, 0.26, 1);
        group.add(sat);
        sats.push(sat);
        disposables.push(satMat);
      }

      const odds = game.oddsPath ?? game.confidence;
      const trailPts = new Float32Array(TLEN * 3);
      const spanX = 2.6, spanY = 1.5, offY = -1.55;
      for (let i = 0; i < TLEN; i++) {
        const v = odds[i] ?? 0.5;
        trailPts[i * 3] = (i / (TLEN - 1) - 0.5) * spanX;
        trailPts[i * 3 + 1] = offY + (v - 0.5) * spanY;
        trailPts[i * 3 + 2] = 0;
      }
      const trailGeo = new THREE.BufferGeometry();
      trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPts, 3));
      const trailMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
      const trail = new THREE.Line(trailGeo, trailMat);
      group.add(trail);
      disposables.push(trailGeo, trailMat);

      const headMat = new THREE.SpriteMaterial({ map: glow, color, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending });
      const trailHead = new THREE.Sprite(headMat);
      trailHead.scale.set(0.34, 0.34, 1);
      group.add(trailHead);
      disposables.push(headMat);

      const pm = game.publicMoney ?? 0;
      const pressMat = new THREE.SpriteMaterial({ map: soft, color: new THREE.Color(0xff2dd6), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
      const pressure = new THREE.Sprite(pressMat);
      const ps = 1.5 + pm * 1.9;
      pressure.scale.set(ps, ps, 1);
      group.add(pressure);
      disposables.push(pressMat);

      const sharp = game.sharp ?? 0;
      const sharpMat = new THREE.SpriteMaterial({ map: glow, color: new THREE.Color(0x00e5ff), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
      const sharpNode = new THREE.Sprite(sharpMat);
      const sns = 0.7 + sharp * 1.0;
      sharpNode.scale.set(sns, sns, 1);
      group.add(sharpNode);
      disposables.push(sharpMat);

      const lensMat = new THREE.LineBasicMaterial({ color: new THREE.Color(0x00e5ff), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      const lensRing = new THREE.LineLoop(ringGeo, lensMat);
      group.add(lensRing);
      disposables.push(lensMat);

      const impact = game.impact ?? null;
      const impMat = new THREE.LineBasicMaterial({ color: new THREE.Color(0xff2dd6), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      const impactRing = new THREE.LineLoop(ringGeo, impMat);
      group.add(impactRing);
      disposables.push(impMat);

      scene.add(group);
      systems.push({ game, group, core, halo, ring, sats, satHalos, focus: 0, trail, trailHead, trailPts, pressure, sharpNode, lensRing, impactRing, publicMoney: pm, sharp, impact, base, baseHex: VERDICT_HEX[game.verdict], screen: { x: 0, y: 0, vis: false } });
    }

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), budget.bloom, 0.7, 0.2);
    composer.addPass(bloom);

    // Label system: HTML overlay (crisp text + a11y), SVG layer for leader lines.
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    Object.assign(svg.style, { position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" } as Partial<CSSStyleDeclaration>);
    overlay.appendChild(svg);

    const labelFor = new Map<string, HTMLDivElement>();
    const leaderFor = new Map<string, SVGLineElement>();
    for (const s of systems) {
      const leader = document.createElementNS("http://www.w3.org/2000/svg", "line");
      leader.setAttribute("stroke", `${VERDICT_HEX[s.game.verdict]}88`);
      leader.setAttribute("stroke-width", "1");
      leader.style.opacity = "0";
      svg.appendChild(leader);
      leaderFor.set(s.game.id, leader);

      const el = document.createElement("div");
      el.textContent = s.game.label;
      Object.assign(el.style, {
        position: "absolute", transform: "translate(-50%,-50%)", whiteSpace: "nowrap",
        font: "600 11px var(--f-mono, monospace)", letterSpacing: "0.04em",
        color: "#eaf6ff", padding: "3px 8px", borderRadius: "6px",
        // Solid frosted chip + text-shadow so the label stays legible even when
        // sitting on top of a bright, bloomed core at close zoom.
        background: "rgba(3,4,6,0.88)", border: `1px solid ${VERDICT_HEX[s.game.verdict]}66`,
        backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)",
        textShadow: "0 1px 3px rgba(0,0,0,0.95)", boxShadow: "0 2px 10px rgba(0,0,0,0.55)",
        pointerEvents: "none", opacity: "0", transition: reduced ? "none" : "opacity 160ms",
      } as Partial<CSSStyleDeclaration>);
      overlay.appendChild(el);
      labelFor.set(s.game.id, el);
    }

    const marketLabels: HTMLDivElement[] = [];
    for (let i = 0; i < 4; i++) {
      const el = document.createElement("div");
      Object.assign(el.style, {
        position: "absolute", transform: "translate(-50%,-50%)", whiteSpace: "nowrap",
        font: "500 10px var(--f-mono, monospace)", color: "#9fb3c8",
        pointerEvents: "none", opacity: "0", transition: reduced ? "none" : "opacity 160ms",
      } as Partial<CSSStyleDeclaration>);
      overlay.appendChild(el);
      marketLabels.push(el);
    }

    const leaguePos = {} as Record<TwinLeague, InstanceType<typeof THREE.Vector3>>;
    const constLabels: { league: TwinLeague; el: HTMLDivElement }[] = [];
    for (const lg of layout.activeLeagues) {
      const c = layout.leagueCenters[lg];
      leaguePos[lg] = new THREE.Vector3(c[0], c[1], c[2]);
      const el = document.createElement("div");
      el.textContent = lg;
      Object.assign(el.style, {
        position: "absolute", transform: "translate(-50%,-50%)", whiteSpace: "nowrap",
        font: "700 13px var(--f-arch, sans-serif)", letterSpacing: "0.14em", color: "#e7f1fb",
        padding: "4px 12px", borderRadius: "999px", background: "rgba(5,6,8,0.55)",
        border: "1px solid rgba(255,255,255,0.18)", cursor: "pointer", pointerEvents: "auto",
        opacity: "0", transition: reduced ? "none" : "opacity 220ms",
      } as Partial<CSSStyleDeclaration>);
      const lgCaptured = lg;
      el.addEventListener("pointerdown", (e) => { e.stopPropagation(); setSelectedId(null); setLeague(lgCaptured); });
      overlay.appendChild(el);
      constLabels.push({ league: lg, el });
    }

    // Inspect HUD: compact, scannable read on hover/focus.
    const hud = document.createElement("div");
    Object.assign(hud.style, {
      position: "absolute", minWidth: "210px", maxWidth: "248px", transform: "translate(-50%,0)",
      padding: "10px 12px", borderRadius: "10px", background: "rgba(6,8,11,0.86)",
      border: "1px solid rgba(255,255,255,0.14)", backdropFilter: "blur(6px)",
      boxShadow: "0 8px 30px rgba(0,0,0,0.5)", pointerEvents: "none", opacity: "0",
      transition: reduced ? "none" : "opacity 140ms", zIndex: "20",
    } as Partial<CSSStyleDeclaration>);
    const hudHead = document.createElement("div");
    Object.assign(hudHead.style, { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "7px" } as Partial<CSSStyleDeclaration>);
    const hudTitle = document.createElement("span");
    Object.assign(hudTitle.style, { font: "700 12px var(--f-arch, sans-serif)", color: "#fff", letterSpacing: "0.02em" } as Partial<CSSStyleDeclaration>);
    const hudVerdict = document.createElement("span");
    Object.assign(hudVerdict.style, { font: "700 10px var(--f-mono, monospace)", letterSpacing: "0.08em", padding: "2px 7px", borderRadius: "999px" } as Partial<CSSStyleDeclaration>);
    hudHead.append(hudTitle, hudVerdict);
    hud.appendChild(hudHead);
    const hudRows: { key: "whatChanged" | "risk" | "breakRead" | "receipt"; label: string; tip: string }[] = [
      { key: "whatChanged", label: "Changed", tip: "What moved between the opening read and the scrubbed step" },
      { key: "risk", label: "Risk", tip: "How fragile the read is: volatility band + contradiction mass" },
      { key: "breakRead", label: "Breaks on", tip: "The single event that would invalidate the read" },
      { key: "receipt", label: "Receipt", tip: "Settlement / receipt status" },
    ];
    const hudValues = new Map<string, HTMLSpanElement>();
    for (const row of hudRows) {
      const r = document.createElement("div");
      Object.assign(r.style, { display: "grid", gridTemplateColumns: "62px 1fr", gap: "8px", padding: "2px 0", alignItems: "baseline" } as Partial<CSSStyleDeclaration>);
      r.title = row.tip;
      const k = document.createElement("span");
      k.textContent = row.label;
      Object.assign(k.style, { font: "600 9px var(--f-mono, monospace)", textTransform: "uppercase", letterSpacing: "0.1em", color: "#6b7785" } as Partial<CSSStyleDeclaration>);
      const v = document.createElement("span");
      Object.assign(v.style, { font: "500 11px var(--f-mono, monospace)", color: "#d6e4f2", lineHeight: "1.35" } as Partial<CSSStyleDeclaration>);
      r.append(k, v);
      hud.appendChild(r);
      hudValues.set(row.key, v);
    }
    overlay.appendChild(hud);
    let hudKey = "";

    let W = 1, H = 1;
    const resize = () => {
      const rect = mount.getBoundingClientRect();
      W = Math.max(1, rect.width); H = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, budget.dprCap);
      renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
      camera.aspect = W / H; camera.updateProjectionMatrix();
      composer.setPixelRatio(dpr); composer.setSize(W, H);
      if (reduced) renderOnceRef.current?.();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    const ptr = { x: 0, y: 0, has: false };
    const onMove = (e: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      ptr.x = e.clientX - rect.left; ptr.y = e.clientY - rect.top; ptr.has = true;
    };
    const onLeave = () => { ptr.has = false; };
    const nearest = (): string | null => {
      let best: string | null = null, bd = 46;
      const lg = leagueRef.current;
      for (const s of systems) {
        if (!s.screen.vis) continue;
        if (lg !== "ALL" && s.game.league !== lg) continue;
        const d = Math.hypot(s.screen.x - ptr.x, s.screen.y - ptr.y);
        if (d < bd) { bd = d; best = s.game.id; }
      }
      return best;
    };
    const onClick = () => {
      if (!ptr.has) return;
      if (selRef.current) {
        const sats = satScreensRef.current;
        let bestI = -1, bd = 34;
        for (let i = 0; i < sats.length; i++) {
          const s = sats[i]!;
          if (!s.vis) continue;
          const d = Math.hypot(s.x - ptr.x, s.y - ptr.y);
          if (d < bd) { bd = d; bestI = i; }
        }
        if (bestI >= 0) { setMarketIndex((cur) => (cur === bestI ? null : bestI)); return; }
      }
      const hit = nearest();
      setMarketIndex(null);
      setSelectedId((cur) => (hit ? (cur === hit ? null : hit) : null));
    };
    if (!reduced) {
      mount.addEventListener("pointermove", onMove);
      mount.addEventListener("pointerleave", onLeave);
    }
    mount.addEventListener("pointerdown", onClick);

    const proj = new THREE.Vector3();
    const camTarget = new THREE.Vector3(0, 0, 0);
    const desiredPos = new THREE.Vector3();
    const lookAt = new THREE.Vector3();
    const ORIGIN = new THREE.Vector3(0, 0, 0);
    let raf = 0, disposed = false, az = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = (now - start) / 1000;
      const ti = timeRef.current;
      const sel = selRef.current;
      const lg = leagueRef.current;
      const drill = marketRef.current;

      if (!reduced) az += 0.0015;
      for (const tier of starTiers) {
        if (!reduced) tier.group.rotation.y += tier.spin * 0.01;
      }

      const selSys = sel ? systems.find((s) => s.game.id === sel) : null;
      const lerpP = reduced ? 1 : 0.05;
      const lerpL = reduced ? 1 : 0.1;
      if (selSys) {
        const p = selSys.group.position;
        const orbit = drill != null ? 4.6 : 6.6;
        desiredPos.set(p.x + Math.sin(az) * orbit, p.y + (drill != null ? 1.8 : 2.6), p.z + Math.cos(az) * orbit);
        camTarget.lerp(p, reduced ? 1 : 0.09);
      } else if (lg !== "ALL") {
        const c = leaguePos[lg] ?? ORIGIN;
        desiredPos.set(c.x + Math.sin(az) * 11, c.y + 3, c.z + Math.cos(az) * 11);
        camTarget.lerp(c, reduced ? 1 : 0.07);
      } else {
        desiredPos.set(Math.sin(az) * 30, 6, Math.cos(az) * 30);
        camTarget.lerp(ORIGIN, reduced ? 1 : 0.06);
      }
      camera.position.lerp(desiredPos, lerpP);
      lookAt.lerp(camTarget, lerpL);
      camera.lookAt(lookAt);

      // Zoom-aware bloom: the additive glow is lush on the wide galaxy view but
      // blows out labels/HUD once the camera moves in on a system. Dial bloom
      // DOWN with proximity — full strength out wide (dist ~30), ~40% when
      // focused (dist ~5-7) — so a zoomed read stays legible. Smoothed to avoid
      // flicker; honours the per-device bloom budget as the ceiling.
      const camDist = camera.position.distanceTo(lookAt);
      const zoomT = Math.min(1, Math.max(0, (camDist - 7) / 15)); // 0 = zoomed in, 1 = wide
      const targetBloom = budget.bloom * (0.4 + 0.6 * zoomT);
      bloom.strength += (targetBloom - bloom.strength) * (reduced ? 1 : 0.08);

      const hoverId = ptr.has ? nearest() : null;

      for (const s of systems) {
        const g = s.game;
        const offLeague = lg !== "ALL" && g.league !== lg;
        const dim = sel && sel !== g.id ? 0.12 : offLeague ? 0.07 : 1;
        const conf = g.confidence[ti] ?? g.confidence[g.confidence.length - 1] ?? 0.4;
        const held = conf < 0.3 && g.verdict !== "NO-BET";
        const tint = new THREE.Color(held ? HOLD_HEX : s.baseHex);

        const targetFocus = sel === g.id ? 1 : 0;
        s.focus += reduced ? (targetFocus - s.focus) : (targetFocus - s.focus) * 0.12;
        const focus = s.focus;
        s.group.scale.setScalar(1 + focus * 0.6);

        const tw = reduced ? 1 : 0.9 + Math.sin(t * 1.4 + g.pos[0]) * 0.1 * g.signalDensity;
        const cs = s.base * tw * (held ? 0.8 : 1);
        s.core.scale.set(cs, cs, 1);
        (s.core.material as InstanceType<typeof THREE.SpriteMaterial>).color.copy(tint);
        // Damp the focused core's glow so its label reads on top of it (the ring,
        // group scale, leader line, and HUD still mark it as selected).
        (s.core.material as InstanceType<typeof THREE.SpriteMaterial>).opacity = dim * (held ? 0.7 : 1) * (1 - focus * 0.4);
        (s.halo.material as InstanceType<typeof THREE.SpriteMaterial>).color.copy(tint);
        (s.halo.material as InstanceType<typeof THREE.SpriteMaterial>).opacity = (0.06 + g.volatility * 0.16) * dim;

        const rr = 0.7 + conf * 1.7;
        s.ring.scale.set(rr, rr, rr);
        (s.ring.material as InstanceType<typeof THREE.LineBasicMaterial>).color.copy(tint);
        (s.ring.material as InstanceType<typeof THREE.LineBasicMaterial>).opacity = (held ? 0.12 : 0.18 + conf * 0.5) * dim;

        const pm = s.publicMoney;
        const sharp = s.sharp;
        const publicCx = -pm * 0.7;
        const sharpCx = sharp * 0.7;
        const cx = publicCx + sharpCx;
        const spin = reduced ? 0 : t * (0.3 + g.marketGravity * 0.4) * (sel === g.id ? 1.5 : 1);
        for (let i = 0; i < s.sats.length; i++) {
          const mk = g.markets[i]!;
          const sat = s.sats[i]!;
          const ang = (i / s.sats.length) * Math.PI * 2 + spin;
          const wobble = reduced ? 0 : Math.sin(t * 2 + i * 1.7) * g.contradictionMass * 0.28;
          const baseRad = mk.radius * (1 - g.marketGravity * 0.12) + wobble;
          const rad = baseRad * (1 + pm * 0.32 * Math.cos(ang));
          const px = cx + Math.cos(ang) * rad, pz = Math.sin(ang) * rad;
          sat.position.set(px, 0, pz);
          const mi = marketRef.current;
          const activeMkt = sel === g.id && mi === i;
          const dimMkt = sel === g.id && mi != null && mi !== i;
          const depthScale = 0.22 + (mk.radius / 2.1) * 0.14;
          const ss = (depthScale + focus * 0.24) * (activeMkt ? 1.7 : 1);
          sat.scale.set(ss, ss, 1);
          const satOp = sel === g.id ? (activeMkt ? 1 : dimMkt ? 0.3 : 0.95) : 0.7;
          (sat.material as InstanceType<typeof THREE.SpriteMaterial>).opacity = satOp * dim;
          const sh = s.satHalos[i]!;
          sh.position.set(px, 0, pz);
          const haloBoost = activeMkt ? 1.9 : dimMkt ? 0.35 : 1;
          (sh.material as InstanceType<typeof THREE.SpriteMaterial>).opacity = focus * (0.08 + mk.volatility * 0.4) * haloBoost * dim;
        }
        s.pressure.position.set(publicCx * 1.5, 0, 0);
        (s.pressure.material as InstanceType<typeof THREE.SpriteMaterial>).opacity = (sel === g.id ? 0.3 : 0.14) * pm * dim;
        s.sharpNode.position.set(sharpCx * 1.5, 0, 0);
        (s.sharpNode.material as InstanceType<typeof THREE.SpriteMaterial>).opacity = (sel === g.id ? 0.5 : 0.28) * sharp * dim;
        const lensScale = 1.5 + sharp * 1.1;
        s.lensRing.scale.set(lensScale, lensScale, lensScale);
        s.lensRing.position.set(cx * 0.5, 0, 0);
        (s.lensRing.material as InstanceType<typeof THREE.LineBasicMaterial>).opacity = (0.05 + sharp * 0.22) * (sel === g.id ? 1.2 : 0.8) * dim;

        if (s.impact) {
          let op = 0, sc = 1;
          if (ti === s.impact.step) {
            const ph = reduced ? 0.6 : Math.sin(t * 3) * 0.5 + 0.5;
            op = (0.5 + ph * 0.4) * dim;
            sc = 1.2 + (reduced ? 0.5 : ph * 1.7);
          } else if (ti > s.impact.step) {
            op = 0.28 * dim; sc = 2.0;
          }
          s.impactRing.scale.set(sc, sc, sc);
          (s.impactRing.material as InstanceType<typeof THREE.LineBasicMaterial>).opacity = op;
        }

        (s.trail.geometry as InstanceType<typeof THREE.BufferGeometry>).setDrawRange(0, ti + 1);
        s.trailHead.position.set(s.trailPts[ti * 3] ?? 0, s.trailPts[ti * 3 + 1] ?? 0, s.trailPts[ti * 3 + 2] ?? 0);
        const trailBase = sel === g.id ? 0.9 : lg !== "ALL" && !offLeague ? 0.55 : 0.28;
        (s.trail.material as InstanceType<typeof THREE.LineBasicMaterial>).opacity = trailBase * dim;
        (s.trailHead.material as InstanceType<typeof THREE.SpriteMaterial>).opacity = (sel === g.id ? 0.95 : 0.6) * dim;

        proj.copy(s.group.position).project(camera);
        const x = (proj.x * 0.5 + 0.5) * W;
        const y = (-proj.y * 0.5 + 0.5) * H;
        s.screen = { x, y, vis: proj.z < 1 };
      }

      // Progressive-disclosure labels with vertical de-confliction + leaders.
      const labelVisible = (s: System): boolean => {
        if (sel) return s.game.id === sel;
        if (reduced) return lg === "ALL" ? true : s.game.league === lg;
        if (lg !== "ALL") return s.game.league === lg;
        return hoverId === s.game.id;
      };
      const showing = systems
        .filter((s) => s.screen.vis && labelVisible(s))
        .map((s) => ({ s, nodeY: s.screen.y, x: s.screen.x, labelY: s.screen.y }))
        .sort((a, b) => a.nodeY - b.nodeY);
      let lastY = -Infinity;
      for (const e of showing) {
        let y = Math.max(12, Math.min(H - 12, e.nodeY - 18));
        if (y - lastY < LABEL_GAP) y = lastY + LABEL_GAP;
        e.labelY = y;
        lastY = y;
      }
      const showingIds = new Set(showing.map((e) => e.s.game.id));
      for (const s of systems) {
        const el = labelFor.get(s.game.id)!;
        const leader = leaderFor.get(s.game.id)!;
        if (!showingIds.has(s.game.id)) { el.style.opacity = "0"; leader.style.opacity = "0"; continue; }
        const e = showing.find((q) => q.s.game.id === s.game.id)!;
        el.style.left = `${e.x}px`; el.style.top = `${e.labelY}px`;
        el.style.opacity = sel === s.game.id ? "1" : "0.92";
        el.style.borderColor = `${VERDICT_HEX[s.game.verdict]}${sel === s.game.id ? "cc" : "66"}`;
        if (Math.abs(e.labelY - e.nodeY) > LEADER_MIN) {
          leader.setAttribute("x1", `${e.x}`); leader.setAttribute("y1", `${e.nodeY}`);
          leader.setAttribute("x2", `${e.x}`); leader.setAttribute("y2", `${e.labelY + 8}`);
          leader.style.opacity = "0.55";
        } else leader.style.opacity = "0";
      }

      if (selSys) {
        const mi = marketRef.current;
        const screens: { x: number; y: number; vis: boolean }[] = [];
        for (let i = 0; i < selSys.sats.length; i++) {
          const sat = selSys.sats[i]!;
          sat.getWorldPosition(proj);
          proj.project(camera);
          const vis = proj.z < 1;
          const sx = (proj.x * 0.5 + 0.5) * W, sy = (-proj.y * 0.5 + 0.5) * H;
          screens.push({ x: sx, y: sy, vis });
          const ml = marketLabels[i];
          if (ml) {
            const mk = selSys.game.markets[i];
            if (mk && vis) {
              ml.textContent = mk.key;
              ml.style.left = `${sx}px`; ml.style.top = `${sy}px`;
              ml.style.opacity = mi == null ? "0.85" : mi === i ? "1" : "0.3";
              ml.style.color = mi === i ? "#eafcff" : "#9fb3c8";
            } else ml.style.opacity = "0";
          }
        }
        satScreensRef.current = screens;
      } else {
        for (const ml of marketLabels) ml.style.opacity = "0";
        satScreensRef.current = [];
      }

      const showConst = lg === "ALL" && !sel && !reduced;
      for (const cl of constLabels) {
        cl.el.style.pointerEvents = showConst ? "auto" : "none";
        if (!showConst) { cl.el.style.opacity = "0"; continue; }
        proj.copy(leaguePos[cl.league]!).project(camera);
        if (proj.z < 1) {
          cl.el.style.left = `${(proj.x * 0.5 + 0.5) * W}px`;
          cl.el.style.top = `${(-proj.y * 0.5 + 0.5) * H}px`;
          cl.el.style.opacity = "0.92";
        } else cl.el.style.opacity = "0";
      }

      const hudId = sel ?? hoverId;
      const hudSys = hudId ? systems.find((s) => s.game.id === hudId) : null;
      if (hudSys && hudSys.screen.vis) {
        const key = `${hudId}|${ti}|${illustrative}`;
        if (key !== hudKey) {
          hudKey = key;
          const d = deriveHud(hudSys.game, ti, illustrative);
          const tail = hudSys.game.label.split(" ").pop() ?? hudSys.game.label;
          hudTitle.textContent = `${hudSys.game.league} ${tail}`;
          const vh = d.verdict === "HOLD" ? HOLD_HEX : VERDICT_HEX[d.verdict as TwinVerdict];
          hudVerdict.textContent = `${d.verdict} - ${d.confidence}`;
          hudVerdict.style.color = vh;
          hudVerdict.style.background = `${vh}1c`;
          hudVerdict.style.border = `1px solid ${vh}55`;
          hudValues.get("whatChanged")!.textContent = d.whatChanged;
          hudValues.get("risk")!.textContent = d.risk;
          hudValues.get("breakRead")!.textContent = d.breakRead;
          hudValues.get("receipt")!.textContent = d.receipt;
        }
        const hx = Math.max(120, Math.min(W - 130, hudSys.screen.x));
        const below = hudSys.screen.y + 18;
        const top = below + 150 > H ? Math.max(8, hudSys.screen.y - 168) : below;
        hud.style.left = `${hx}px`; hud.style.top = `${top}px`;
        hud.style.opacity = "1";
      } else {
        hud.style.opacity = "0";
        hudKey = "";
      }

      let hoverable = !!hoverId;
      if (!hoverable && selRef.current && ptr.has) {
        for (const s of satScreensRef.current) {
          if (s.vis && Math.hypot(s.x - ptr.x, s.y - ptr.y) < 34) { hoverable = true; break; }
        }
      }
      mount.style.cursor = ptr.has && hoverable ? "pointer" : "default";

      composer.render();
    };

    renderOnceRef.current = () => { if (!disposed) tick(performance.now()); };

    // rAF lifecycle: pause when offscreen or tab hidden.
    let onScreen = true;
    let visible = typeof document === "undefined" || document.visibilityState !== "hidden";
    const loop = (now: number) => {
      if (disposed) return;
      tick(now);
      raf = requestAnimationFrame(loop);
    };
    const startLoop = () => {
      if (reduced || disposed || raf) return;
      if (!onScreen || !visible) return;
      raf = requestAnimationFrame(loop);
    };
    const stopLoop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };

    const io = new IntersectionObserver((entries) => {
      onScreen = entries[0]?.isIntersecting ?? true;
      if (onScreen) startLoop(); else stopLoop();
    }, { threshold: 0.01 });
    io.observe(mount);

    const onVisibility = () => {
      visible = document.visibilityState !== "hidden";
      if (visible) startLoop(); else stopLoop();
    };
    document.addEventListener("visibilitychange", onVisibility);

    if (reduced) renderOnceRef.current();
    else startLoop();

    return () => {
      disposed = true;
      stopLoop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      mount.removeEventListener("pointermove", onMove);
      mount.removeEventListener("pointerleave", onLeave);
      mount.removeEventListener("pointerdown", onClick);
      renderOnceRef.current = null;
      labelFor.forEach((el) => el.remove());
      leaderFor.forEach((el) => el.remove());
      marketLabels.forEach((el) => el.remove());
      constLabels.forEach((c) => c.el.remove());
      hud.remove();
      svg.remove();
      disposables.forEach((d) => d.dispose());
      bloom.dispose();
      composer.dispose();
      renderer.dispose();
      if (canvas.parentNode === mount) mount.removeChild(canvas);
    };
  }, [games, illustrative]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs uppercase tracking-[0.16em] text-ink-500">Navigate</span>
        {(["ALL", ...LEAGUES] as LeagueFilter[]).map((l) => {
          const active = league === l;
          return (
            <button
              key={l}
              type="button"
              onClick={() => pickLeague(l)}
              aria-pressed={active}
              className="rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-1"
              style={{
                color: active ? BRAND_COLORS.obsidianBlack : "var(--ion-1)",
                background: active ? BRAND_COLORS.orbitalCyan : "rgba(255,255,255,0.05)",
                border: `1px solid ${active ? BRAND_COLORS.orbitalCyan : BRAND_COLORS.steelGray}`,
              }}
            >
              {l === "ALL" ? "All leagues" : l}
            </button>
          );
        })}
      </div>

      <div className="relative overflow-hidden rounded-2xl" style={{ border: `1px solid ${BRAND_COLORS.steelGray}`, background: BRAND_COLORS.obsidianBlack }}>
        <div ref={mountRef} className="relative h-[58vh] min-h-[420px] w-full" />
        <div ref={overlayRef} aria-hidden className="pointer-events-none absolute inset-0 z-10" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[5]"
          style={{ background: `radial-gradient(120% 90% at 50% 45%, transparent 52%, ${BRAND_COLORS.obsidianBlack}66 78%, ${BRAND_COLORS.obsidianBlack} 100%)` }}
        />
        <p className="pointer-events-none absolute bottom-3 left-4 z-10 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-500">
          {marketIndex != null
            ? "Drilled into a market - click it again to step back"
            : selectedId
              ? "Click a market satellite to drill in - click empty space to release"
              : "Click a system to inspect - drag the timeline below"}
        </p>
        <p
          className="pointer-events-none absolute right-4 top-3 z-10 font-mono text-[10px] uppercase tracking-[0.2em]"
          style={{ color: slate.live ? BRAND_COLORS.orbitalCyan : "var(--ion-3, #6b7785)" }}
        >
          {slate.live && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: BRAND_COLORS.orbitalCyan, boxShadow: `0 0 8px ${BRAND_COLORS.orbitalCyan}` }} />}
          {slate.generatedLabel}
        </p>
      </div>

      {slate.dataNote && (
        <p className="mt-3 text-xs leading-relaxed text-ink-500">
          <span aria-hidden>i </span>{slate.dataNote}
        </p>
      )}

      <Legend />

      <div className="mt-5 rounded-xl p-4" style={{ border: `1px solid ${BRAND_COLORS.steelGray}`, background: "rgba(255,255,255,0.02)" }}>
        <div className="flex items-center justify-between">
          <label htmlFor="twin-time" className="text-xs uppercase tracking-[0.16em] text-ink-500">Timeline</label>
          <span className="font-mono text-sm" style={{ color: BRAND_COLORS.orbitalCyan }}>{TIMELINE[timeIndex]}</span>
        </div>
        <input
          id="twin-time"
          type="range"
          min={0}
          max={TLEN - 1}
          step={1}
          value={timeIndex}
          onChange={(e) => setTimeIndex(Number(e.target.value))}
          className="mt-3 w-full accent-cyan-400"
          aria-valuetext={TIMELINE[timeIndex]}
        />
        <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wider text-ink-500">
          {TIMELINE.map((s, i) => (
            <span key={s} className={i === timeIndex ? "text-white" : ""}>{s.split(" ")[0]}</span>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Inspector game={selected} timeIndex={timeIndex} illustrative={slate.illustrative} marketIndex={marketIndex} onMarket={setMarketIndex} />
        <Manifest games={games} selectedId={selectedId} onSelect={setSelectedId} league={league} />
      </div>
    </div>
  );
}

const LEGEND_ROWS: ReadonlyArray<{ enc: string; means: string; color: string }> = [
  { enc: "Core size + brightness", means: "Signal density - how many independent factors align", color: BRAND_COLORS.orbitalCyan },
  { enc: "Halo", means: "Volatility - how fragile the read is", color: BRAND_COLORS.softUltraviolet },
  { enc: "Orbit wobble", means: "Contradiction - credible counter-evidence in play", color: BRAND_COLORS.softUltraviolet },
  { enc: "Confidence ring", means: "Confidence at the scrubbed step (collapses when held)", color: BRAND_COLORS.orbitalCyan },
  { enc: "Trail", means: "Line movement - direction and magnitude over time", color: BRAND_COLORS.ionWhite },
  { enc: "Satellites", means: "Markets orbiting the game; size = market depth", color: BRAND_COLORS.ionWhite },
  { enc: "Magenta lobe vs cyan node", means: "Public-money pull vs sharp divergence (dark-matter)", color: BRAND_COLORS.ionMagenta },
  { enc: "Core colour", means: "Verdict - PLAY / WATCHLIST / NO-BET (grey = held)", color: BRAND_COLORS.orbitalCyan },
];

function Legend() {
  return (
    <details className="mt-3 rounded-xl" style={{ border: `1px solid ${BRAND_COLORS.steelGray}`, background: "rgba(255,255,255,0.02)" }}>
      <summary className="cursor-pointer list-none px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-ink-400 transition-colors hover:text-white focus-visible:outline-none">
        <span aria-hidden>+ </span>Legend - how to read the instrument
      </summary>
      <ul className="grid gap-2 px-4 pb-4 pt-1 sm:grid-cols-2">
        {LEGEND_ROWS.map((r) => (
          <li key={r.enc} className="flex items-start gap-2.5 text-xs">
            <span aria-hidden className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: r.color, boxShadow: `0 0 8px ${r.color}` }} />
            <span><span className="font-semibold text-ink-100">{r.enc}</span> <span className="text-ink-400">- {r.means}</span></span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function Bar({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] text-ink-400">
        <span>{label}</span>
        <span className="font-mono">{Math.round(value * 100)}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div className="h-full rounded-full" style={{ width: `${Math.round(value * 100)}%`, background: color }} />
      </div>
    </div>
  );
}

function Sparkline({ values, index, color }: { values: readonly number[]; index: number; color: string }) {
  const w = 220, h = 44, pad = 4;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - v * (h - pad * 2);
    return [x, y] as const;
  });
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const cur = pts[index] ?? pts[pts.length - 1]!;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Confidence over the timeline">
      <path d={d} fill="none" stroke={color} strokeWidth="1.75" style={{ filter: `drop-shadow(0 0 6px ${color}aa)` }} />
      <circle cx={cur[0]} cy={cur[1]} r="3.5" fill={BRAND_COLORS.ionWhite} />
    </svg>
  );
}

const VERDICT_COPY: Record<TwinVerdict, string> = {
  PLAY: "The case survives its own cross-examination.",
  WATCHLIST: "Real edge, but a falsifier is still in play.",
  "NO-BET": "Nothing independent survives the price - silence is the call.",
};

function Inspector({ game, timeIndex, illustrative, marketIndex, onMarket }: { game: TwinGame | null; timeIndex: number; illustrative: boolean; marketIndex: number | null; onMarket: (i: number | null) => void }) {
  if (!game) {
    return (
      <div className="surface-card flex min-h-[260px] items-center justify-center p-8 text-center">
        <p className="max-w-xs text-sm text-ink-400">
          Select a system to open its read - the engine&apos;s case for, against, and the
          confidence that moved across the slate&apos;s timeline.
        </p>
      </div>
    );
  }
  const color = VERDICT_HEX[game.verdict];
  const impact = game.impact ?? null;
  const sharp = game.sharp;
  const pub = game.publicMoney;
  const hasSplit = pub != null && sharp != null;
  return (
    <div className="surface-card relative overflow-hidden p-6">
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full blur-3xl" style={{ background: `${color}1f` }} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-ink-500">{game.league} - {illustrative ? "illustrative" : "live"}</p>
          <h3 className="mt-1 font-display text-xl text-white">{game.label}</h3>
        </div>
        <span className="rounded-full px-3 py-1 text-sm font-bold" style={{ color, background: `${color}14`, border: `1px solid ${color}55` }}>
          {game.verdict}
        </span>
      </div>
      <p className="relative mt-2 text-xs italic text-ink-500">{VERDICT_COPY[game.verdict]}</p>

      <div className="relative mt-5 grid gap-3 sm:grid-cols-2">
        <Bar value={game.signalDensity} color={BRAND_COLORS.orbitalCyan} label="Signal density" />
        <Bar value={game.contradictionMass} color={BRAND_COLORS.softUltraviolet} label="Contradiction" />
        <Bar value={game.volatility} color={BRAND_COLORS.softUltraviolet} label="Volatility" />
        {hasSplit ? (
          <Bar value={pub!} color={BRAND_COLORS.ionMagenta} label="Public pressure" />
        ) : (
          <div>
            <div className="flex justify-between text-[11px] text-ink-400">
              <span>Public pressure</span>
              <span className="font-mono text-ink-600">n/a</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />
          </div>
        )}
      </div>

      {hasSplit ? (
        <div className="relative mt-4 rounded-lg p-3" style={{ background: `${BRAND_COLORS.orbitalCyan}0c`, border: `1px solid ${BRAND_COLORS.orbitalCyan}2a` }}>
          <div className="flex items-center justify-between text-[11px] text-ink-400">
            <span>Sharp vs public - dark-matter pull</span>
            <span className="font-mono" style={{ color: BRAND_COLORS.orbitalCyan }}>{Math.round(sharp! * 100)}</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: BRAND_COLORS.ionMagenta }}>Public</span>
            <div className="relative h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.round(pub! * 50)}%`, background: BRAND_COLORS.ionMagenta }} />
              <div className="absolute inset-y-0 right-0 rounded-full" style={{ width: `${Math.round(sharp! * 50)}%`, background: BRAND_COLORS.orbitalCyan }} />
            </div>
            <span className="text-[10px] uppercase tracking-wider" style={{ color: BRAND_COLORS.orbitalCyan }}>Sharp</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink-300">
            {sharp! > 0.55
              ? "Sharp money is moving against the crowd - that divergence is the signal worth reading."
              : "No strong sharp/public split here - the crowd and the sharps mostly agree."}
          </p>
        </div>
      ) : (
        <div className="relative mt-4 rounded-lg p-3 text-xs leading-relaxed text-ink-500" style={{ border: `1px dashed ${BRAND_COLORS.steelGray}` }}>
          Public / sharp split - not yet instrumented for live games. The platform tracks
          bookmaker consensus today; ticket-vs-handle splits arrive when that source is wired.
        </div>
      )}

      <div className="relative mt-5">
        <div className="flex items-center justify-between text-[11px] text-ink-400">
          <span>Confidence - {TIMELINE[timeIndex]}</span>
          <span className="font-mono" style={{ color }}>{Math.round((game.confidence[timeIndex] ?? 0) * 100)}</span>
        </div>
        <div className="mt-1">
          <Sparkline values={game.confidence} index={timeIndex} color={color} />
        </div>
      </div>

      {game.oddsPath && (
        <div className="relative mt-4">
          <div className="flex items-center justify-between text-[11px] text-ink-400">
            <span>Line movement - {TIMELINE[timeIndex]}</span>
            <span className="font-mono text-ink-500">{illustrative ? "illustrative" : "from opening"}</span>
          </div>
          <div className="mt-1">
            <Sparkline values={game.oddsPath} index={timeIndex} color={BRAND_COLORS.ionWhite} />
          </div>
        </div>
      )}

      <div className="relative mt-5">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">
            Market system - {game.markets.length} {game.markets.length === 1 ? "market" : "markets"}
          </p>
          {marketIndex != null && (
            <button type="button" onClick={() => onMarket(null)} className="text-[10px] uppercase tracking-wider text-ink-400 transition-colors hover:text-white focus-visible:outline-none">
              all markets
            </button>
          )}
        </div>
        <div className="space-y-1.5">
          {game.markets.map((mk, i) => {
            const c = mk.volatility > 0.55 ? BRAND_COLORS.ionMagenta : BRAND_COLORS.softUltraviolet;
            const active = marketIndex === i;
            return (
              <button
                key={mk.key}
                type="button"
                onClick={() => onMarket(active ? null : i)}
                aria-pressed={active}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/5 focus-visible:outline-none"
                style={{ background: active ? `${c}14` : "transparent", boxShadow: active ? `inset 0 0 0 1px ${c}55` : "none" }}
              >
                <span className="w-20 shrink-0 text-xs" style={{ color: active ? "#fff" : "var(--ion-2, #c8d2dd)" }}>{mk.key}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.round(mk.volatility * 100)}%`, background: c }} />
                </div>
                <span className="w-8 shrink-0 text-right font-mono text-[11px] text-ink-400">{Math.round(mk.volatility * 100)}</span>
              </button>
            );
          })}
        </div>
        {marketIndex != null && game.markets[marketIndex] ? (
          <MarketDetail market={game.markets[marketIndex]!} />
        ) : (
          <p className="mt-1.5 text-[10px] text-ink-500">bar = market volatility - click a market (or its satellite) to drill in</p>
        )}
      </div>

      <p className="relative mt-4 text-sm leading-relaxed text-ink-300">{game.note}</p>

      {impact && (
        <div
          className="relative mt-4 flex items-start gap-2 rounded-lg p-3"
          style={{ background: `${BRAND_COLORS.ionMagenta}10`, border: `1px solid ${BRAND_COLORS.ionMagenta}33` }}
        >
          <span aria-hidden className="mt-0.5" style={{ color: BRAND_COLORS.ionMagenta }}>!</span>
          <p className="text-xs leading-relaxed text-ink-200">
            Impact event - <strong className="text-white">{impact.label}</strong> at {TIMELINE[impact.step]}
            {timeIndex >= impact.step ? " - in effect" : " - upcoming on the timeline"}
          </p>
        </div>
      )}
    </div>
  );
}

function MarketDetail({ market }: { market: TwinMarket }) {
  const c = market.volatility > 0.55 ? BRAND_COLORS.ionMagenta : BRAND_COLORS.softUltraviolet;
  const vlabel = market.volatility > 0.6 ? "fragile" : market.volatility > 0.4 ? "moderate" : "firm";
  return (
    <div className="mt-3 rounded-lg p-3" style={{ background: `${c}0c`, border: `1px solid ${c}33` }}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">{market.key} market</p>
        <span className="font-mono text-[11px]" style={{ color: c }}>{vlabel}</span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-ink-300">
        Volatility {Math.round(market.volatility * 100)} -{" "}
        {market.volatility > 0.55
          ? "this leg is the fragile one - a single shock moves it most."
          : "this leg is comparatively stable across the book."}
      </p>
    </div>
  );
}

function Manifest({ games: allGames, selectedId, onSelect, league }: { games: readonly TwinGame[]; selectedId: string | null; onSelect: (id: string | null) => void; league: LeagueFilter }) {
  const games = league === "ALL" ? allGames : allGames.filter((g) => g.league === league);
  return (
    <div className="surface-card p-5">
      <p className="mb-3 text-xs uppercase tracking-[0.16em] text-ink-500">
        Slate manifest - {games.length} system{games.length === 1 ? "" : "s"}{league === "ALL" ? "" : ` - ${league}`}
      </p>
      <ul className="space-y-1.5">
        {games.map((g) => {
          const color = VERDICT_HEX[g.verdict];
          const active = selectedId === g.id;
          return (
            <li key={g.id}>
              <button
                type="button"
                onClick={() => onSelect(active ? null : g.id)}
                aria-pressed={active}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-1"
                style={{ background: active ? `${color}12` : "transparent", boxShadow: active ? `inset 0 0 0 1px ${color}55` : "none" }}
              >
                <span className="flex items-center gap-2.5">
                  <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                  <span className="text-sm text-white">{g.label}</span>
                </span>
                <span className="flex items-center gap-2">
                  {g.impact && (
                    <span aria-label="has impact event" title="Impact event" style={{ color: BRAND_COLORS.ionMagenta }}>!</span>
                  )}
                  <span className="font-mono text-[11px] uppercase tracking-wider" style={{ color }}>{g.verdict}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
