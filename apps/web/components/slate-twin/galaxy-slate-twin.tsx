"use client";

/**
 * GalaxySlateTwin — a spatial digital twin of the slate.
 *
 * Games are star systems; each system ENCODES its real metrics, not decoration:
 *   • core brightness/size  ← signal density
 *   • volatility halo size  ← volatility (fragility)
 *   • orbital wobble        ← contradiction mass (credible counter-evidence)
 *   • confidence orbit ring ← confidence at the scrubbed time step
 *   • core colour           ← verdict (PLAY / WATCHLIST / NO-BET)
 *   • inward pull on markets ← market gravity
 * A time scrubber moves every system through Opening line → … → Result (the 4D
 * axis). Click a system to focus it; the inspector argues the read.
 *
 * Raw three.js (no R3F) for control + zero framework-version risk. DPR-aware,
 * reduced-motion-aware (continuous motion damped), full GPU dispose on unmount.
 * The canvas is aria-hidden; the visible Slate manifest + inspector are the
 * accessible source of truth and the keyboard controls. Demo data only.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import {
  TIMELINE, VERDICT_HEX, LEAGUES, leagueCentroid,
  type TwinGame, type TwinVerdict, type TwinLeague, type TwinImpact, type TwinSlate, type TwinMarket,
} from "@/lib/slate-twin/demo-slate";
import { BRAND_COLORS } from "@/lib/brand";

type LeagueFilter = TwinLeague | "ALL";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

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

type System = {
  game: TwinGame;
  group: InstanceType<typeof THREE.Group>;
  core: InstanceType<typeof THREE.Sprite>;
  halo: InstanceType<typeof THREE.Sprite>;
  ring: InstanceType<typeof THREE.LineLoop>;
  sats: InstanceType<typeof THREE.Sprite>[];
  satHalos: InstanceType<typeof THREE.Sprite>[]; // per-market volatility halos
  focus: number; // 0..1 animated expansion when this system is selected
  trail: InstanceType<typeof THREE.Line>;
  trailHead: InstanceType<typeof THREE.Sprite>;
  trailPts: Float32Array; // TLEN points (x,y,z) in local space
  pressure: InstanceType<typeof THREE.Sprite>; // public-money lobe
  sharpNode: InstanceType<typeof THREE.Sprite>; // sharp-divergence node (the signal)
  lensRing: InstanceType<typeof THREE.LineLoop>; // dark-matter lensing ring
  impactRing: InstanceType<typeof THREE.LineLoop>; // injury impact shockwave
  publicMoney: number;
  sharp: number; // sharp-vs-public divergence
  impact: TwinImpact | null;
  base: number; // base core scale
  screen: { x: number; y: number; vis: boolean };
};

const TLEN = TIMELINE.length;

export function GalaxySlateTwin({ slate }: { slate: TwinSlate }) {
  const games = slate.games;
  const mountRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [timeIndex, setTimeIndex] = useState<number>(TLEN - 2); // default "Final"
  const [league, setLeague] = useState<LeagueFilter>("ALL");
  const [marketIndex, setMarketIndex] = useState<number | null>(null); // drilled market within the focused game

  const selRef = useRef<string | null>(null);
  const timeRef = useRef<number>(TLEN - 2);
  const leagueRef = useRef<LeagueFilter>("ALL");
  const marketRef = useRef<number | null>(null);
  const satScreensRef = useRef<{ x: number; y: number; vis: boolean }[]>([]); // focused game's satellite screen coords
  useEffect(() => { selRef.current = selectedId; }, [selectedId]);
  useEffect(() => { timeRef.current = timeIndex; }, [timeIndex]);
  useEffect(() => { leagueRef.current = league; }, [league]);
  useEffect(() => { marketRef.current = marketIndex; }, [marketIndex]);
  useEffect(() => { setMarketIndex(null); }, [selectedId]); // reset drill when the game changes

  // Selecting a league clears any focused game.
  const pickLeague = (l: LeagueFilter) => { setLeague(l); setSelectedId(null); };

  const selected = useMemo(() => games.find((g) => g.id === selectedId) ?? null, [games, selectedId]);

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
    if (!renderer) return; // accessible DOM still works
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, { display: "block", width: "100%", height: "100%" });
    mount.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 200);
    camera.position.set(0, 3.5, 18);

    // starfield backdrop
    const starCount = 1400;
    const sp = new Float32Array(starCount * 3);
    let seed = 0x51a7e;
    const rng = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (let i = 0; i < starCount; i++) {
      const r = 30 + rng() * 50;
      const th = rng() * Math.PI * 2;
      const ph = Math.acos(rng() * 2 - 1);
      sp[i * 3] = Math.sin(ph) * Math.cos(th) * r;
      sp[i * 3 + 1] = (rng() - 0.5) * 40;
      sp[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    const starMat = new THREE.PointsMaterial({ color: 0x9fb3c8, size: 0.6, sizeAttenuation: true, transparent: true, opacity: 0.5, depthWrite: false });
    scene.add(new THREE.Points(starGeo, starMat));

    const glow = makeGlow(0.1);
    const soft = makeGlow(0.5);
    const ringGeo = (() => {
      const N = 64;
      const pts: number[] = [];
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * Math.PI * 2;
        pts.push(Math.cos(a), 0, Math.sin(a));
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pts), 3));
      return g;
    })();

    const disposables: { dispose: () => void }[] = [glow, soft, starGeo, starMat, ringGeo];
    const systems: System[] = [];

    for (const game of games) {
      const color = new THREE.Color(VERDICT_HEX[game.verdict]);
      const group = new THREE.Group();
      group.position.set(game.pos[0], game.pos[1], game.pos[2]);
      group.rotation.x = -0.5; // tilt the orbital plane

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
        // per-market volatility halo — only blooms when the system is focused
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

      // Odds-movement trail — a small "path of the price" beneath the system.
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

      // public-money pressure lobe (magenta) on the pulled side; 0 if not instrumented
      const pm = game.publicMoney ?? 0;
      const pressMat = new THREE.SpriteMaterial({ map: soft, color: new THREE.Color(0xff2dd6), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
      const pressure = new THREE.Sprite(pressMat);
      const ps = 1.5 + pm * 1.9;
      pressure.scale.set(ps, ps, 1);
      group.add(pressure);
      disposables.push(pressMat);

      // sharp-divergence node (cyan = signal) + dark-matter lensing ring; 0 if not instrumented
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

      // injury / roster impact shockwave ring, fired by the scrubber; null if not instrumented
      const impact = game.impact ?? null;
      const impMat = new THREE.LineBasicMaterial({ color: new THREE.Color(0xff2dd6), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      const impactRing = new THREE.LineLoop(ringGeo, impMat);
      group.add(impactRing);
      disposables.push(impMat);

      scene.add(group);
      systems.push({ game, group, core, halo, ring, sats, satHalos, focus: 0, trail, trailHead, trailPts, pressure, sharpNode, lensRing, impactRing, publicMoney: pm, sharp, impact, base, screen: { x: 0, y: 0, vis: false } });
    }

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 1.25, 0.7, 0.2);
    composer.addPass(bloom);

    // labels
    const labelFor = new Map<string, HTMLDivElement>();
    for (const s of systems) {
      const el = document.createElement("div");
      el.textContent = s.game.label;
      Object.assign(el.style, {
        position: "absolute", transform: "translate(-50%,-160%)", whiteSpace: "nowrap",
        font: "600 11px var(--f-mono, monospace)", letterSpacing: "0.04em",
        color: "#cfe9ff", padding: "2px 6px", borderRadius: "6px",
        background: "rgba(5,6,8,0.55)", border: `1px solid ${VERDICT_HEX[s.game.verdict]}55`,
        pointerEvents: "none", opacity: "0.0", transition: "opacity 160ms",
      } as Partial<CSSStyleDeclaration>);
      overlay.appendChild(el);
      labelFor.set(s.game.id, el);
    }
    const marketLabels: HTMLDivElement[] = [];
    for (let i = 0; i < 3; i++) {
      const el = document.createElement("div");
      Object.assign(el.style, {
        position: "absolute", transform: "translate(-50%,-50%)", whiteSpace: "nowrap",
        font: "500 10px var(--f-mono, monospace)", color: "#9fb3c8",
        pointerEvents: "none", opacity: "0", transition: "opacity 160ms",
      } as Partial<CSSStyleDeclaration>);
      overlay.appendChild(el);
      marketLabels.push(el);
    }

    // Constellation labels — click a league name to fly to its cluster.
    const leaguePos = {} as Record<TwinLeague, InstanceType<typeof THREE.Vector3>>;
    const constLabels: { league: TwinLeague; el: HTMLDivElement }[] = [];
    for (const lg of LEAGUES) {
      const c = leagueCentroid(games, lg);
      leaguePos[lg] = new THREE.Vector3(c[0], c[1], c[2]);
      const el = document.createElement("div");
      el.textContent = lg;
      Object.assign(el.style, {
        position: "absolute", transform: "translate(-50%,-50%)", whiteSpace: "nowrap",
        font: "700 13px var(--f-arch, sans-serif)", letterSpacing: "0.14em", color: "#e7f1fb",
        padding: "4px 11px", borderRadius: "999px", background: "rgba(5,6,8,0.5)",
        border: "1px solid rgba(255,255,255,0.16)", cursor: "pointer", pointerEvents: "auto",
        opacity: "0", transition: "opacity 220ms",
      } as Partial<CSSStyleDeclaration>);
      const lgCaptured = lg;
      el.addEventListener("pointerdown", (e) => { e.stopPropagation(); setSelectedId(null); setLeague(lgCaptured); });
      overlay.appendChild(el);
      constLabels.push({ league: lg, el });
    }

    // sizing
    let W = 1, H = 1;
    const resize = () => {
      const rect = mount.getBoundingClientRect();
      W = Math.max(1, rect.width); H = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
      camera.aspect = W / H; camera.updateProjectionMatrix();
      composer.setPixelRatio(dpr); composer.setSize(W, H);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    // pointer
    const ptr = { x: 0, y: 0, has: false };
    const onMove = (e: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      ptr.x = e.clientX - rect.left; ptr.y = e.clientY - rect.top; ptr.has = true;
    };
    const onLeave = () => { ptr.has = false; };
    const nearest = (): string | null => {
      let best: string | null = null, bd = 44;
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
      // If a game is focused, a click near one of its market satellites drills that market.
      if (selRef.current) {
        const sats = satScreensRef.current;
        let bestI = -1, bd = 34;
        for (let i = 0; i < sats.length; i++) {
          const s = sats[i]!;
          if (!s.vis) continue;
          const d = Math.hypot(s.x - ptr.x, s.y - ptr.y);
          if (d < bd) { bd = d; bestI = i; }
        }
        if (bestI >= 0) {
          setMarketIndex((cur) => (cur === bestI ? null : bestI));
          return;
        }
      }
      // Otherwise select/release a game.
      const hit = nearest();
      setMarketIndex(null);
      setSelectedId((cur) => (hit ? (cur === hit ? null : hit) : null));
    };
    mount.addEventListener("pointermove", onMove);
    mount.addEventListener("pointerleave", onLeave);
    mount.addEventListener("pointerdown", onClick);

    const proj = new THREE.Vector3();
    const camTarget = new THREE.Vector3(0, 0, 0);
    const desiredPos = new THREE.Vector3();
    const lookAt = new THREE.Vector3();
    const ORIGIN = new THREE.Vector3(0, 0, 0);
    let raf = 0, disposed = false, az = 0;
    const start = performance.now();

    const frame = (now: number) => {
      if (disposed) return;
      const t = (now - start) / 1000;
      const ti = timeRef.current;
      const sel = selRef.current;
      const lg = leagueRef.current;

      if (!reduced) az += 0.0015;
      // camera: focus a selected system › frame a league constellation › overview
      const selSys = sel ? systems.find((s) => s.game.id === sel) : null;
      if (selSys) {
        const p = selSys.group.position;
        desiredPos.set(p.x + Math.sin(az) * 6.4, p.y + 2.6, p.z + Math.cos(az) * 6.4);
        camTarget.lerp(p, 0.08);
      } else if (lg !== "ALL") {
        const c = leaguePos[lg]!;
        desiredPos.set(c.x + Math.sin(az) * 9, c.y + 2.6, c.z + Math.cos(az) * 9);
        camTarget.lerp(c, 0.07);
      } else {
        desiredPos.set(Math.sin(az) * 18, 4, Math.cos(az) * 18);
        camTarget.lerp(ORIGIN, 0.06);
      }
      camera.position.lerp(desiredPos, 0.045);
      lookAt.lerp(camTarget, 0.1);
      camera.lookAt(lookAt);

      for (const s of systems) {
        const g = s.game;
        const offLeague = lg !== "ALL" && g.league !== lg;
        const dim = sel && sel !== g.id ? 0.12 : offLeague ? 0.07 : 1;
        const conf = g.confidence[ti] ?? g.confidence[g.confidence.length - 1] ?? 0.4;

        // focus expansion: the selected system blooms into its own market system
        const targetFocus = sel === g.id ? 1 : 0;
        s.focus += (targetFocus - s.focus) * 0.12;
        const focus = s.focus;
        s.group.scale.setScalar(1 + focus * 0.6);

        // core twinkle by signal density
        const tw = reduced ? 1 : 0.9 + Math.sin(t * 1.4 + g.pos[0]) * 0.1 * g.signalDensity;
        const cs = s.base * tw;
        s.core.scale.set(cs, cs, 1);
        (s.core.material as InstanceType<typeof THREE.SpriteMaterial>).opacity = dim;
        (s.halo.material as InstanceType<typeof THREE.SpriteMaterial>).opacity = (0.06 + g.volatility * 0.16) * dim;

        // confidence ring: radius + brightness track confidence at this step
        const rr = 0.7 + conf * 1.7;
        s.ring.scale.set(rr, rr, rr);
        (s.ring.material as InstanceType<typeof THREE.LineBasicMaterial>).opacity = (0.18 + conf * 0.5) * dim;

        // market satellites: orbit (per-sat), wobble = contradiction, and the
        // PUBLIC-MONEY gravity well pulls the orbit off-centre + makes it eccentric
        const pm = s.publicMoney;
        const sharp = s.sharp;
        const publicCx = -pm * 0.7; // the crowd drags the market one way
        const sharpCx = sharp * 0.7; // sharp "dark matter" pulls it back
        const cx = publicCx + sharpCx; // the net, resolved orbit centre
        const spin = reduced ? 0 : t * (0.3 + g.marketGravity * 0.4) * (sel === g.id ? 1.5 : 1);
        for (let i = 0; i < s.sats.length; i++) {
          const mk = g.markets[i]!;
          const sat = s.sats[i]!;
          const ang = (i / s.sats.length) * Math.PI * 2 + spin;
          const wobble = reduced ? 0 : Math.sin(t * 2 + i * 1.7) * g.contradictionMass * 0.28;
          const baseRad = mk.radius * (1 - g.marketGravity * 0.12) + wobble;
          const rad = baseRad * (1 + pm * 0.32 * Math.cos(ang)); // eccentric toward the pull
          const px = cx + Math.cos(ang) * rad, pz = Math.sin(ang) * rad;
          sat.position.set(px, 0, pz);
          // per-market drill: the chosen satellite swells & brightens, siblings recede
          const mi = marketRef.current;
          const activeMkt = sel === g.id && mi === i;
          const dimMkt = sel === g.id && mi != null && mi !== i;
          const ss = (0.26 + focus * 0.24) * (activeMkt ? 1.7 : 1);
          sat.scale.set(ss, ss, 1);
          const satOp = sel === g.id ? (activeMkt ? 1 : dimMkt ? 0.3 : 0.95) : 0.7;
          (sat.material as InstanceType<typeof THREE.SpriteMaterial>).opacity = satOp * dim;
          // per-market volatility halo blooms only when focused; strongest on the drilled market
          const sh = s.satHalos[i]!;
          sh.position.set(px, 0, pz);
          const haloBoost = activeMkt ? 1.9 : dimMkt ? 0.35 : 1;
          (sh.material as InstanceType<typeof THREE.SpriteMaterial>).opacity = focus * (0.08 + mk.volatility * 0.4) * haloBoost * dim;
        }
        // tug-of-war: magenta public lobe vs cyan sharp node, plus the dark-matter lens
        s.pressure.position.set(publicCx * 1.5, 0, 0);
        (s.pressure.material as InstanceType<typeof THREE.SpriteMaterial>).opacity = (sel === g.id ? 0.3 : 0.14) * pm * dim;
        s.sharpNode.position.set(sharpCx * 1.5, 0, 0);
        (s.sharpNode.material as InstanceType<typeof THREE.SpriteMaterial>).opacity = (sel === g.id ? 0.5 : 0.28) * sharp * dim;
        // dark-matter lensing ring — unseen mass, shown only by how it warps the system
        const lensScale = 1.5 + sharp * 1.1;
        s.lensRing.scale.set(lensScale, lensScale, lensScale);
        s.lensRing.position.set(cx * 0.5, 0, 0);
        (s.lensRing.material as InstanceType<typeof THREE.LineBasicMaterial>).opacity = (0.05 + sharp * 0.22) * (sel === g.id ? 1.2 : 0.8) * dim;

        // injury / roster impact-event: shockwave at the step, residual ring after
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

        // odds-movement trail: reveal the price path up to the scrubbed step
        (s.trail.geometry as InstanceType<typeof THREE.BufferGeometry>).setDrawRange(0, ti + 1);
        s.trailHead.position.set(s.trailPts[ti * 3] ?? 0, s.trailPts[ti * 3 + 1] ?? 0, s.trailPts[ti * 3 + 2] ?? 0);
        const trailBase = sel === g.id ? 0.9 : lg !== "ALL" && !offLeague ? 0.55 : 0.28;
        (s.trail.material as InstanceType<typeof THREE.LineBasicMaterial>).opacity = trailBase * dim;
        (s.trailHead.material as InstanceType<typeof THREE.SpriteMaterial>).opacity = (sel === g.id ? 0.95 : 0.6) * dim;

        // project core to screen for labels + hit testing
        proj.copy(s.group.position).project(camera);
        const x = (proj.x * 0.5 + 0.5) * W;
        const y = (-proj.y * 0.5 + 0.5) * H;
        s.screen = { x, y, vis: proj.z < 1 };
        const el = labelFor.get(g.id)!;
        if (proj.z < 1) {
          el.style.left = `${x}px`; el.style.top = `${y}px`;
          const show = sel === g.id ? 1 : sel ? 0 : offLeague ? 0 : lg !== "ALL" ? 0.85 : 0.6;
          el.style.opacity = String(show);
          el.style.borderColor = `${VERDICT_HEX[g.verdict]}${sel === g.id ? "cc" : "55"}`;
        } else el.style.opacity = "0";
      }

      // market labels + satellite hit-targets for the selected system
      if (selSys) {
        const mi = marketRef.current;
        const screens: { x: number; y: number; vis: boolean }[] = [];
        for (let i = 0; i < selSys.sats.length; i++) {
          const sat = selSys.sats[i]!;
          sat.getWorldPosition(proj);
          proj.project(camera);
          const vis = proj.z < 1;
          const x = (proj.x * 0.5 + 0.5) * W, y = (-proj.y * 0.5 + 0.5) * H;
          screens.push({ x, y, vis });
          const ml = marketLabels[i];
          if (ml) {
            const mk = selSys.game.markets[i];
            if (mk && vis) {
              ml.textContent = mk.key;
              ml.style.left = `${x}px`;
              ml.style.top = `${y}px`;
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

      // constellation labels — only in overview (no league focus, no selection)
      const showConst = lg === "ALL" && !sel;
      for (const cl of constLabels) {
        cl.el.style.pointerEvents = showConst ? "auto" : "none";
        if (!showConst) { cl.el.style.opacity = "0"; continue; }
        proj.copy(leaguePos[cl.league]!).project(camera);
        if (proj.z < 1) {
          cl.el.style.left = `${(proj.x * 0.5 + 0.5) * W}px`;
          cl.el.style.top = `${(-proj.y * 0.5 + 0.5) * H}px`;
          cl.el.style.opacity = "0.9";
        } else cl.el.style.opacity = "0";
      }

      let hoverable: boolean = !!nearest();
      if (!hoverable && selRef.current && ptr.has) {
        for (const s of satScreensRef.current) {
          if (s.vis && Math.hypot(s.x - ptr.x, s.y - ptr.y) < 34) { hoverable = true; break; }
        }
      }
      mount.style.cursor = ptr.has && hoverable ? "pointer" : "default";

      composer.render();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      mount.removeEventListener("pointermove", onMove);
      mount.removeEventListener("pointerleave", onLeave);
      mount.removeEventListener("pointerdown", onClick);
      labelFor.forEach((el) => el.remove());
      marketLabels.forEach((el) => el.remove());
      constLabels.forEach((c) => c.el.remove());
      disposables.forEach((d) => d.dispose());
      bloom.dispose();
      composer.dispose();
      renderer.dispose();
      if (canvas.parentNode === mount) mount.removeChild(canvas);
    };
    // `games` is a stable prop per render; rebuild the scene only if the slate changes.
  }, [games]);

  return (
    <div>
      {/* league constellation navigation */}
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
              className="rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors focus-visible:outline-none"
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

      {/* canvas stage */}
      <div className="relative overflow-hidden rounded-2xl" style={{ border: `1px solid ${BRAND_COLORS.steelGray}`, background: BRAND_COLORS.obsidianBlack }}>
        <div ref={mountRef} className="relative h-[58vh] min-h-[420px] w-full" />
        <div ref={overlayRef} aria-hidden className="pointer-events-none absolute inset-0 z-10" />
        {/* hint */}
        <p className="pointer-events-none absolute bottom-3 left-4 z-10 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-500">
          {marketIndex != null
            ? "Drilled into a market · click it again to step back"
            : selectedId
              ? "Click a market satellite to drill in · click empty space to release"
              : "Click a system to inspect · drag the timeline below"}
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
          <span aria-hidden>ⓘ </span>{slate.dataNote}
        </p>
      )}

      {/* time scrubber — the 4D axis */}
      <div className="mt-5 rounded-xl p-4" style={{ border: `1px solid ${BRAND_COLORS.steelGray}`, background: "rgba(255,255,255,0.02)" }}>
        <div className="flex items-center justify-between">
          <label htmlFor="twin-time" className="text-xs uppercase tracking-[0.16em] text-ink-500">
            Timeline
          </label>
          <span className="font-mono text-sm" style={{ color: BRAND_COLORS.orbitalCyan }}>
            {TIMELINE[timeIndex]}
          </span>
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

      {/* inspector + accessible slate manifest */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Inspector game={selected} timeIndex={timeIndex} illustrative={slate.illustrative} marketIndex={marketIndex} onMarket={setMarketIndex} />
        <Manifest games={games} selectedId={selectedId} onSelect={setSelectedId} league={league} />
      </div>
    </div>
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
  "NO-BET": "Nothing independent survives the price — silence is the call.",
};

function Inspector({ game, timeIndex, illustrative, marketIndex, onMarket }: { game: TwinGame | null; timeIndex: number; illustrative: boolean; marketIndex: number | null; onMarket: (i: number | null) => void }) {
  if (!game) {
    return (
      <div className="surface-card flex min-h-[260px] items-center justify-center p-8 text-center">
        <p className="max-w-xs text-sm text-ink-400">
          Select a system to open its read — the engine&apos;s case for, against, and the
          confidence that moved across the slate&apos;s timeline.
        </p>
      </div>
    );
  }
  const color = VERDICT_HEX[game.verdict];
  const impact = game.impact ?? null;
  const sharp = game.sharp; // undefined = not instrumented (live)
  const pub = game.publicMoney; // undefined = not instrumented (live)
  const hasSplit = pub != null && sharp != null;
  return (
    <div className="surface-card relative overflow-hidden p-6">
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full blur-3xl" style={{ background: `${color}1f` }} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-ink-500">{game.league} · {illustrative ? "illustrative" : "live"}</p>
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

      {/* sharp-vs-public tug-of-war — the dark-matter signal */}
      {hasSplit ? (
        <div className="relative mt-4 rounded-lg p-3" style={{ background: `${BRAND_COLORS.orbitalCyan}0c`, border: `1px solid ${BRAND_COLORS.orbitalCyan}2a` }}>
          <div className="flex items-center justify-between text-[11px] text-ink-400">
            <span>Sharp vs public · dark-matter pull</span>
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
              ? "Sharp money is moving against the crowd — that divergence is the signal worth reading."
              : "No strong sharp/public split here — the crowd and the sharps mostly agree."}
          </p>
        </div>
      ) : (
        <div className="relative mt-4 rounded-lg p-3 text-xs leading-relaxed text-ink-500" style={{ border: `1px dashed ${BRAND_COLORS.steelGray}` }}>
          Public / sharp split — not yet instrumented for live games. The platform tracks
          bookmaker consensus today; ticket-vs-handle splits arrive when that source is wired.
        </div>
      )}

      <div className="relative mt-5">
        <div className="flex items-center justify-between text-[11px] text-ink-400">
          <span>Confidence · {TIMELINE[timeIndex]}</span>
          <span className="font-mono" style={{ color }}>{Math.round((game.confidence[timeIndex] ?? 0) * 100)}</span>
        </div>
        <div className="mt-1">
          <Sparkline values={game.confidence} index={timeIndex} color={color} />
        </div>
      </div>

      {game.oddsPath && (
        <div className="relative mt-4">
          <div className="flex items-center justify-between text-[11px] text-ink-400">
            <span>Line movement · {TIMELINE[timeIndex]}</span>
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
            Market system · {game.markets.length} {game.markets.length === 1 ? "market" : "markets"}
          </p>
          {marketIndex != null && (
            <button type="button" onClick={() => onMarket(null)} className="text-[10px] uppercase tracking-wider text-ink-400 transition-colors hover:text-white focus-visible:outline-none">
              ← all markets
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
          <p className="mt-1.5 text-[10px] text-ink-500">bar = market volatility · click a market (or its satellite) to drill in</p>
        )}
      </div>

      <p className="relative mt-4 text-sm leading-relaxed text-ink-300">{game.note}</p>

      {impact && (
        <div
          className="relative mt-4 flex items-start gap-2 rounded-lg p-3"
          style={{ background: `${BRAND_COLORS.ionMagenta}10`, border: `1px solid ${BRAND_COLORS.ionMagenta}33` }}
        >
          <span aria-hidden className="mt-0.5" style={{ color: BRAND_COLORS.ionMagenta }}>⚠</span>
          <p className="text-xs leading-relaxed text-ink-200">
            Impact event · <strong className="text-white">{impact.label}</strong> at {TIMELINE[impact.step]}
            {timeIndex >= impact.step ? " — in effect" : " — upcoming on the timeline"}
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
        Volatility {Math.round(market.volatility * 100)} ·{" "}
        {market.volatility > 0.55
          ? "this leg is the fragile one — a single shock moves it most."
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
        Slate manifest · {games.length} system{games.length === 1 ? "" : "s"}{league === "ALL" ? "" : ` · ${league}`}
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
                    <span aria-label="has impact event" title="Impact event" style={{ color: BRAND_COLORS.ionMagenta }}>⚠</span>
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
