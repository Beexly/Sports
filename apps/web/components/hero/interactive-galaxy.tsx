"use client";

import { useEffect, useRef } from "react";

/**
 * Hero atmospheric layer — "Orbital Edge".
 *
 * Intentionally restrained. Replaces the previous Three.js galaxy field
 * (3,600 particles, dual rings, pulsing magenta core) which read as
 * generic AI-startup template.
 *
 * Design intent — quiet, cinematic, calibrated:
 *   - Pure 2D canvas. No Three.js. Lighter bundle, deterministic motion.
 *   - One primary orbit, one secondary orbit, one traveling signal point.
 *   - A faint horizon hairline crossing the frame.
 *   - One distant pulse every ~7s — the "signal acquired" beat.
 *   - The whole scene drifts a few degrees over 60s. Barely perceptible.
 *   - Subtle radial vignette to seat the orbit in deep space, not a
 *     bedroom-poster particle cloud.
 *
 * Reduced-motion: still renders the static composition (orbits + signal
 * dot at rest), but no animation loop runs.
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

/** Draw an ellipse outline with the given rotation (radians). */
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

export function InteractiveGalaxy() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvasRef.current = canvas;
    mount.appendChild(canvas);

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduced = prefersReducedMotion();
    let disposed = false;
    let frame = 0;
    const startedAt = performance.now();

    let dpr = 1;
    let widthCss = 1;
    let heightCss = 1;

    const resize = () => {
      if (disposed) return;
      const rect = mount.getBoundingClientRect();
      widthCss = Math.max(1, rect.width);
      heightCss = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(widthCss * dpr);
      canvas.height = Math.round(heightCss * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    const draw = (t: number) => {
      if (disposed) return;
      // Elapsed seconds since mount.
      const elapsed = (t - startedAt) / 1000;

      ctx.clearRect(0, 0, widthCss, heightCss);

      // ── Vignette background — deep space, not a particle pop-up.
      const cx = widthCss * 0.62; // orbit anchored right of center
      const cy = heightCss * 0.55;
      const maxR = Math.hypot(widthCss, heightCss);

      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.65);
      bg.addColorStop(0, `rgba(${SOFT_ULTRAVIOLET}, 0.10)`);
      bg.addColorStop(0.45, `rgba(${SOFT_ULTRAVIOLET}, 0.03)`);
      bg.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, widthCss, heightCss);

      // ── Horizon hairline — a single thin meridian that suggests a horizon
      //    crossing the orbit. Gives the frame a real-world reference.
      const horizonY = Math.round(heightCss * 0.62) + 0.5;
      const horizon = ctx.createLinearGradient(0, horizonY, widthCss, horizonY);
      horizon.addColorStop(0, `rgba(${ION_WHITE}, 0)`);
      horizon.addColorStop(0.5, `rgba(${ION_WHITE}, 0.06)`);
      horizon.addColorStop(1, `rgba(${ION_WHITE}, 0)`);
      ctx.strokeStyle = horizon;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(widthCss, horizonY);
      ctx.stroke();

      // ── Scene drift — extremely slow rotation of the whole orbital system.
      const drift = reduced ? 0 : Math.sin(elapsed * 0.018) * 0.04;

      // Orbit dimensions, anchored to the right portion of the frame.
      const baseR = Math.min(widthCss, heightCss) * 0.42;

      // ── Outer orbit — soft ultraviolet, very faint.
      strokeOrbit(
        ctx,
        { x: cx, y: cy },
        baseR * 1.45,
        baseR * 0.62,
        -0.42 + drift,
        SOFT_ULTRAVIOLET,
        0.10,
        1,
      );

      // ── Primary orbit — cyan hairline.
      strokeOrbit(
        ctx,
        { x: cx, y: cy },
        baseR * 1.05,
        baseR * 0.44,
        -0.32 + drift,
        ORBITAL_CYAN,
        0.18,
        1,
      );

      // ── Traveler — one bright cyan signal point traversing the primary orbit.
      //    One full lap every 28s. Cinematic, not frantic.
      const lapPeriod = reduced ? 0 : 28;
      const theta = lapPeriod > 0 ? (elapsed / lapPeriod) * Math.PI * 2 : Math.PI * 0.85;
      const rx = baseR * 1.05;
      const ry = baseR * 0.44;
      const rot = -0.32 + drift;
      const cosR = Math.cos(rot);
      const sinR = Math.sin(rot);
      const localX = Math.cos(theta) * rx;
      const localY = Math.sin(theta) * ry;
      const travX = cx + localX * cosR - localY * sinR;
      const travY = cy + localX * sinR + localY * cosR;

      // Soft glow halo around the traveler.
      const halo = ctx.createRadialGradient(travX, travY, 0, travX, travY, 26);
      halo.addColorStop(0, `rgba(${ORBITAL_CYAN}, 0.55)`);
      halo.addColorStop(0.5, `rgba(${ORBITAL_CYAN}, 0.10)`);
      halo.addColorStop(1, `rgba(${ORBITAL_CYAN}, 0)`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(travX, travY, 26, 0, Math.PI * 2);
      ctx.fill();

      // The traveler itself.
      ctx.fillStyle = `rgba(${ION_WHITE}, 0.95)`;
      ctx.beginPath();
      ctx.arc(travX, travY, 2.4, 0, Math.PI * 2);
      ctx.fill();

      // ── Distant pulse — one fixed point in the upper-left that pulses
      //    once every ~7s. The "signal acquired" beat.
      const pulseT = (elapsed % 7) / 7;
      const pulseAlpha = Math.max(0, 1 - pulseT) * 0.6;
      const pulseR = 1.4 + pulseT * 22;
      const pulseX = widthCss * 0.18;
      const pulseY = heightCss * 0.32;

      if (!reduced) {
        const pulse = ctx.createRadialGradient(pulseX, pulseY, 0, pulseX, pulseY, pulseR);
        pulse.addColorStop(0, `rgba(${ION_MAGENTA}, ${pulseAlpha * 0.7})`);
        pulse.addColorStop(1, `rgba(${ION_MAGENTA}, 0)`);
        ctx.fillStyle = pulse;
        ctx.beginPath();
        ctx.arc(pulseX, pulseY, pulseR, 0, Math.PI * 2);
        ctx.fill();
      }

      // The pulse anchor point itself — always visible, just a single pixel.
      ctx.fillStyle = `rgba(${ION_MAGENTA}, 0.85)`;
      ctx.beginPath();
      ctx.arc(pulseX, pulseY, 1.4, 0, Math.PI * 2);
      ctx.fill();

      // ── Three reference stars — barely-there, fixed positions. Just enough
      //    to give the frame depth without becoming a particle field.
      const stars: Array<[number, number, number]> = [
        [widthCss * 0.84, heightCss * 0.22, 0.55],
        [widthCss * 0.32, heightCss * 0.80, 0.40],
        [widthCss * 0.92, heightCss * 0.78, 0.32],
      ];
      ctx.fillStyle = `rgba(${ION_WHITE}, 0.5)`;
      for (const [sx, sy, alpha] of stars) {
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (!reduced && !disposed) {
        frame = window.requestAnimationFrame(draw);
      }
    };

    if (reduced) {
      // Single static draw at t=0 — composition intact, no animation.
      draw(performance.now());
    } else {
      frame = window.requestAnimationFrame(draw);
    }

    return () => {
      disposed = true;
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
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
