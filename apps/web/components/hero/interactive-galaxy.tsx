"use client";

import { useEffect, useRef } from "react";

/**
 * Hero atmospheric layer — "Orbital Edge", interactive build.
 *
 * Design intent — cinematic, high-fidelity, alive:
 *   - Pure 2D canvas. No Three.js. Deterministic motion. Smaller bundle.
 *   - Layered particle field with depth-of-field: ~140 particles at three
 *     depth tiers, each scaling alpha + radius + parallax response.
 *   - Constellation lines between near neighbors — hairline cyan, fades
 *     by distance. Reduced motion keeps the static network without animation.
 *   - Mouse parallax of the whole orbital system (whole scene shifts
 *     toward the cursor at 30px max). Adds a real "I'm in space" feel.
 *   - Cursor attractor: nearby particles drift toward the cursor with
 *     soft easing. Strong enough to be felt, gentle enough not to be a toy.
 *   - Multi-orbital system: 3 elliptical orbits (UV, cyan, white) at
 *     different rotations + radii + traveler speeds.
 *   - On traveler ↔ evidence-node contact, the node emits a soft ripple.
 *   - Three faint nebula clouds at deep tier for atmospheric haze.
 *   - DPR-aware up to 3× on high-density displays.
 *
 * Reduced-motion fallback:
 *   - Renders the static composition (orbits, particle field at rest,
 *     evidence nodes, constellation network) without an animation loop.
 */

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type Vec2 = { x: number; y: number };

const ION_WHITE = "246, 247, 250";
const ORBITAL_CYAN = "0, 229, 255";
const ION_MAGENTA = "255, 45, 214";
const SOFT_ULTRAVIOLET = "122, 92, 255";
const MAX_CURSOR_DISPLACEMENT = 30;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseAlpha: number;
  radius: number;
  /** depth tier: 0 = far (smallest parallax), 2 = near (largest parallax) */
  depth: 0 | 1 | 2;
  /** assigned color rgb string */
  rgb: string;
}

interface OrbitDef {
  rxScale: number;
  ryScale: number;
  rotation: number;
  rgb: string;
  alpha: number;
  width: number;
  /** seconds per full lap; 0 = no traveler */
  lapPeriod: number;
  /** angular offset so multiple travelers don't overlap */
  thetaOffset: number;
  /** traveler dot color rgb */
  travRgb: string;
}

const ORBITS: OrbitDef[] = [
  // Outer, slow, ultraviolet
  {
    rxScale: 1.72,
    ryScale: 0.74,
    rotation: -0.48,
    rgb: SOFT_ULTRAVIOLET,
    alpha: 0.20,
    width: 1.2,
    lapPeriod: 56,
    thetaOffset: 0,
    travRgb: SOFT_ULTRAVIOLET,
  },
  // Primary, medium, cyan
  {
    rxScale: 1.22,
    ryScale: 0.52,
    rotation: -0.32,
    rgb: ORBITAL_CYAN,
    alpha: 0.34,
    width: 1.45,
    lapPeriod: 28,
    thetaOffset: Math.PI * 0.6,
    travRgb: ORBITAL_CYAN,
  },
  // Inner, fast, white
  {
    rxScale: 0.74,
    ryScale: 0.30,
    rotation: -0.18,
    rgb: ION_WHITE,
    alpha: 0.24,
    width: 1.05,
    lapPeriod: 16,
    thetaOffset: Math.PI * 1.2,
    travRgb: ION_WHITE,
  },
];

function strokeOrbit(
  ctx: CanvasRenderingContext2D,
  center: Vec2,
  radiusX: number,
  radiusY: number,
  rotation: number,
  rgb: string,
  alpha: number,
  width: number,
): void {
  ctx.beginPath();
  ctx.ellipse(center.x, center.y, radiusX, radiusY, rotation, 0, Math.PI * 2);
  ctx.lineWidth = width;
  ctx.strokeStyle = `rgba(${rgb}, ${alpha})`;
  ctx.stroke();
}

/**
 * Pseudo-random deterministic generator so the initial particle field
 * is the same across mounts (helps debugging). Mulberry32.
 */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function spawnParticles(
  widthCss: number,
  heightCss: number,
  count: number,
): Particle[] {
  const r = rng(0xc0ffee);
  const arr: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const depthRoll = r();
    const depth: 0 | 1 | 2 = depthRoll < 0.45 ? 0 : depthRoll < 0.85 ? 1 : 2;
    const radius =
      depth === 0 ? 0.6 + r() * 0.6 : depth === 1 ? 0.85 + r() * 0.8 : 1.2 + r() * 1.35;
    const baseAlpha =
      depth === 0 ? 0.36 + r() * 0.24 : depth === 1 ? 0.52 + r() * 0.25 : 0.72 + r() * 0.28;
    // Color: mostly white, occasional cyan, rare magenta sparkle (near tier only)
    let rgb = ION_WHITE;
    const colorRoll = r();
    if (depth === 2 && colorRoll < 0.12) rgb = ION_MAGENTA;
    else if (colorRoll < 0.28) rgb = ORBITAL_CYAN;
    arr.push({
      x: r() * widthCss,
      y: r() * heightCss,
      vx: (r() - 0.5) * 0.04,
      vy: (r() - 0.5) * 0.04,
      baseAlpha,
      radius,
      depth,
      rgb,
    });
  }
  return arr;
}

export function InteractiveGalaxy() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    mount.appendChild(canvas);

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduced = prefersReducedMotion();
    let disposed = false;
    let frame = 0;
    let running = false;
    let inView = true;
    const startedAt = performance.now();

    let dpr = 1;
    let widthCss = 1;
    let heightCss = 1;
    let drawFrame: ((t: number) => void) | null = null;

    // Mouse state — drives parallax and the attractor.
    const mouse = { x: 0, y: 0, has: false };
    let parallaxX = 0;
    let parallaxY = 0;

    // Particle field — count scales with viewport area so mobile stays smooth.
    let particles: Particle[] = [];
    const rebuildParticles = () => {
      const area = widthCss * heightCss;
      const count = Math.max(78, Math.min(220, Math.round(area / 6200)));
      particles = spawnParticles(widthCss, heightCss, count);
    };

    const resize = () => {
      if (disposed) return;
      const rect = mount.getBoundingClientRect();
      widthCss = Math.max(1, rect.width);
      heightCss = Math.max(1, rect.height);
      // DPR capped at 2× — crisp on high-density displays without paying the
      // ~2.25× pixel cost of 3× panels for a decorative background.
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(widthCss * dpr);
      canvas.height = Math.round(heightCss * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rebuildParticles();
      if (reduced && drawFrame) {
        window.requestAnimationFrame(drawFrame);
      }
    };

    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    const onPointerMove = (e: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.has = true;
    };
    const onPointerLeave = () => {
      mouse.has = false;
    };
    const pointerTarget = mount.parentElement ?? mount;
    if (!reduced) {
      pointerTarget.addEventListener("pointermove", onPointerMove);
      pointerTarget.addEventListener("pointerleave", onPointerLeave);
    }

    const draw = (t: number) => {
      if (disposed) return;
      const elapsed = (t - startedAt) / 1000;

      ctx.clearRect(0, 0, widthCss, heightCss);

      // Cursor follow stays smooth and capped at the doctrine's 30px max.
      const targetPX = mouse.has ? (mouse.x / widthCss - 0.5) * (MAX_CURSOR_DISPLACEMENT * 2) : 0;
      const targetPY = mouse.has ? (mouse.y / heightCss - 0.5) * (MAX_CURSOR_DISPLACEMENT * 2) : 0;
      // Easing toward target (low-pass filter — no jitter on idle cursor)
      parallaxX += (targetPX - parallaxX) * 0.06;
      parallaxY += (targetPY - parallaxY) * 0.06;

      // ── Vignette background — deep space gradient anchored right of center.
      const cxBase = widthCss * 0.56;
      const cyBase = heightCss * 0.55;
      const cx = cxBase + parallaxX;
      const cy = cyBase + parallaxY;
      const maxR = Math.hypot(widthCss, heightCss);

      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.7);
      bg.addColorStop(0, `rgba(${SOFT_ULTRAVIOLET}, 0.20)`);
      bg.addColorStop(0.4, `rgba(${SOFT_ULTRAVIOLET}, 0.07)`);
      bg.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, widthCss, heightCss);

      // ── Atmospheric nebula clouds — three large, very faint magenta/UV blobs
      //    at the deepest tier. Adds painterly depth.
      const nebulas: Array<[number, number, string, number]> = [
        [widthCss * 0.18, heightCss * 0.36, ION_MAGENTA, 0.075],
        [widthCss * 0.78, heightCss * 0.70, ORBITAL_CYAN, 0.09],
        [widthCss * 0.48, heightCss * 0.18, SOFT_ULTRAVIOLET, 0.085],
      ];
      for (const [nx, ny, rgb, a] of nebulas) {
        const neb = ctx.createRadialGradient(nx, ny, 0, nx, ny, 280);
        neb.addColorStop(0, `rgba(${rgb}, ${a})`);
        neb.addColorStop(1, `rgba(${rgb}, 0)`);
        ctx.fillStyle = neb;
        ctx.fillRect(0, 0, widthCss, heightCss);
      }

      // ── Horizon hairline — single thin meridian.
      const horizonY = Math.round(heightCss * 0.62) + parallaxY * 0.3 + 0.5;
      const horizon = ctx.createLinearGradient(0, horizonY, widthCss, horizonY);
      horizon.addColorStop(0, `rgba(${ION_WHITE}, 0)`);
      horizon.addColorStop(0.5, `rgba(${ION_WHITE}, 0.12)`);
      horizon.addColorStop(1, `rgba(${ION_WHITE}, 0)`);
      ctx.strokeStyle = horizon;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(widthCss, horizonY);
      ctx.stroke();

      // ── Update + render particles (skip motion under reduced).
      if (!reduced) {
        for (const p of particles) {
          // Cursor attractor — only near tier feels it strongly.
          if (mouse.has) {
            const dx = mouse.x - p.x;
            const dy = mouse.y - p.y;
            const d2 = dx * dx + dy * dy;
            const range = 240 * 240;
            if (d2 < range) {
              const factor = (1 - d2 / range) * 0.001 * (p.depth + 1);
              p.vx += dx * factor;
              p.vy += dy * factor;
            }
          }
          // Drift + soft damping
          const speed = Math.hypot(p.vx, p.vy);
          if (speed > 1.35) {
            p.vx = (p.vx / speed) * 1.35;
            p.vy = (p.vy / speed) * 1.35;
          }
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.985;
          p.vy *= 0.985;
          // Wrap edges
          if (p.x < -4) p.x = widthCss + 4;
          if (p.x > widthCss + 4) p.x = -4;
          if (p.y < -4) p.y = heightCss + 4;
          if (p.y > heightCss + 4) p.y = -4;
        }
      }

      // Constellation lines: reduced motion keeps a static network.
      const linkRange = 115;
      const linkRange2 = linkRange * linkRange;
      ctx.lineWidth = 0.75;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        if (!a) continue;
        if (a.depth < 1) continue;
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          if (!b) continue;
          if (b.depth < 1) continue;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < linkRange2) {
            const alpha = (1 - d2 / linkRange2) * 0.13;
            ctx.strokeStyle = `rgba(${ORBITAL_CYAN}, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Particles
      for (const p of particles) {
        // Per-depth parallax — far tier almost still, near tier follows cursor most
        const pxOff = parallaxX * (0.25 + p.depth * 0.35);
        const pyOff = parallaxY * (0.25 + p.depth * 0.35);
        // Subtle twinkle on near tier
        const twinkle =
          !reduced && p.depth === 2
            ? 0.78 + 0.22 * Math.sin(elapsed * 1.6 + p.x * 0.013)
            : 1;
        ctx.fillStyle = `rgba(${p.rgb}, ${p.baseAlpha * twinkle})`;
        ctx.beginPath();
        ctx.arc(p.x + pxOff, p.y + pyOff, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Scene drift — extremely slow rotation of the orbital system.
      const drift = reduced ? 0 : Math.sin(elapsed * 0.026) * 0.06 + elapsed * 0.006;
      const baseR = Math.min(widthCss, heightCss) * 0.42;

      // Draw orbits + travelers
      const travelers: Array<{ x: number; y: number; rgb: string }> = [];
      for (const orbit of ORBITS) {
        const rx = baseR * orbit.rxScale;
        const ry = baseR * orbit.ryScale;
        const rot = orbit.rotation + drift;
        strokeOrbit(ctx, { x: cx, y: cy }, rx, ry, rot, orbit.rgb, orbit.alpha, orbit.width);

        if (orbit.lapPeriod > 0) {
          const theta = reduced
            ? Math.PI * 0.85 + orbit.thetaOffset
            : (elapsed / orbit.lapPeriod) * Math.PI * 2 + orbit.thetaOffset;
          const cosR = Math.cos(rot);
          const sinR = Math.sin(rot);
          const lx = Math.cos(theta) * rx;
          const ly = Math.sin(theta) * ry;
          const tx = cx + lx * cosR - ly * sinR;
          const ty = cy + lx * sinR + ly * cosR;
          travelers.push({ x: tx, y: ty, rgb: orbit.travRgb });

          // Halo
          const halo = ctx.createRadialGradient(tx, ty, 0, tx, ty, 48);
          halo.addColorStop(0, `rgba(${orbit.travRgb}, 0.78)`);
          halo.addColorStop(0.55, `rgba(${orbit.travRgb}, 0.18)`);
          halo.addColorStop(1, `rgba(${orbit.travRgb}, 0)`);
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(tx, ty, 48, 0, Math.PI * 2);
          ctx.fill();
          // Core
          ctx.fillStyle = `rgba(${ION_WHITE}, 0.95)`;
          ctx.beginPath();
          ctx.arc(tx, ty, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ── Evidence nodes — anchored at 4 angular positions around the
      //    primary orbit, ripple when the primary traveler passes near.
      const primary = ORBITS[1]!;
      const primRx = baseR * primary.rxScale;
      const primRy = baseR * primary.ryScale;
      const primRot = primary.rotation + drift;
      const cosP = Math.cos(primRot);
      const sinP = Math.sin(primRot);

      const nodes: Array<[number, string, number, number]> = [
        [0.10, ORBITAL_CYAN, 0.95, 20],
        [0.34, ORBITAL_CYAN, 0.78, 16],
        [0.58, SOFT_ULTRAVIOLET, 0.66, 18],
        [0.82, ION_MAGENTA, 0.72, 15],
      ];
      const primTheta = reduced
        ? Math.PI * 0.85 + primary.thetaOffset
        : (elapsed / primary.lapPeriod) * Math.PI * 2 + primary.thetaOffset;
      for (const [offset, rgb, alpha, radius] of nodes) {
        const nodeTheta = offset * Math.PI * 2;
        const angleDist = Math.abs(
          ((primTheta - nodeTheta) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI
        );
        const proximity = Math.max(0, 1 - angleDist / 0.35);
        const ripple = reduced ? 0 : proximity;

        const nx = Math.cos(nodeTheta) * primRx * 0.78;
        const ny = Math.sin(nodeTheta) * primRy * 0.78;
        const nodeX = cx + nx * cosP - ny * sinP;
        const nodeY = cy + nx * sinP + ny * cosP;

        // Ripple ring
        if (ripple > 0) {
          ctx.strokeStyle = `rgba(${rgb}, ${0.35 * ripple})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(nodeX, nodeY, radius + 8 + ripple * 14, 0, Math.PI * 2);
          ctx.stroke();
        }
        // Disc
        ctx.fillStyle = `rgba(${rgb}, ${alpha * (0.22 + ripple * 0.24)})`;
        ctx.beginPath();
        ctx.arc(nodeX, nodeY, radius, 0, Math.PI * 2);
        ctx.fill();
        // Outline
        ctx.strokeStyle = `rgba(${rgb}, ${alpha * (0.5 + ripple * 0.5)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(nodeX, nodeY, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // ── Distant pulse — magenta beacon, ~7s cadence.
      const pulseT = (elapsed % 7) / 7;
      const pulseAlpha = Math.max(0, 1 - pulseT) * 0.6;
      const pulseR = 1.4 + pulseT * 26;
      const pulseX = widthCss * 0.18 + parallaxX * 0.5;
      const pulseY = heightCss * 0.32 + parallaxY * 0.5;
      if (!reduced) {
        const pulse = ctx.createRadialGradient(pulseX, pulseY, 0, pulseX, pulseY, pulseR);
        pulse.addColorStop(0, `rgba(${ION_MAGENTA}, ${pulseAlpha * 0.7})`);
        pulse.addColorStop(1, `rgba(${ION_MAGENTA}, 0)`);
        ctx.fillStyle = pulse;
        ctx.beginPath();
        ctx.arc(pulseX, pulseY, pulseR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = `rgba(${ION_MAGENTA}, 0.85)`;
      ctx.beginPath();
      ctx.arc(pulseX, pulseY, 1.4, 0, Math.PI * 2);
      ctx.fill();

      if (!reduced && !disposed && running) {
        frame = window.requestAnimationFrame(draw);
      }
    };
    drawFrame = draw;

    // Pause the loop while the tab is hidden or the canvas is off-screen —
    // same frame, zero work when nobody can see it.
    const stopLoop = () => {
      running = false;
      if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
    };
    const startLoop = () => {
      if (reduced || disposed || running) return;
      running = true;
      frame = window.requestAnimationFrame(draw);
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

    if (reduced) {
      draw(performance.now());
    } else {
      startLoop();
    }

    return () => {
      disposed = true;
      stopLoop();
      document.removeEventListener("visibilitychange", onVisibility);
      io?.disconnect();
      observer.disconnect();
      pointerTarget.removeEventListener("pointermove", onPointerMove);
      pointerTarget.removeEventListener("pointerleave", onPointerLeave);
      if (canvas.parentNode === mount) mount.removeChild(canvas);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="interactive-galaxy"
      data-testid="interactive-galaxy"
      aria-hidden="true"
    />
  );
}
