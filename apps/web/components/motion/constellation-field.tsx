"use client";

/**
 * ConstellationField — a living, cursor-reactive particle constellation.
 *
 * The brand's signature "alive" surface: drifting points of light that link
 * into a shifting constellation and lean toward the pointer, so the page feels
 * responsive without a heavy 3D engine. Pure Canvas 2D — no dependencies.
 *
 * Discipline (matches ShootingStars / Atmosphere):
 *   - aria-hidden + pointer-events-none: never touches the a11y tree or input.
 *   - prefers-reduced-motion: renders ONE static frame, no loop, no pointer.
 *   - perf-budgeted: particle count scales with area and is hard-capped; the
 *     loop pauses when the field scrolls offscreen (IntersectionObserver) or
 *     the tab is hidden (visibilitychange); devicePixelRatio capped at 2.
 *
 * Mount inside any `relative overflow-hidden` section; it fills the parent.
 */

import { useEffect, useRef } from "react";

export interface ConstellationFieldProps {
  /** Wrapper className for positioning/opacity. */
  className?: string;
  /** Particle density multiplier (~0.5–1.5). Default 1. */
  density?: number;
  /** React to the pointer. Default true. */
  interactive?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

// rgb triples (brand palette) — alpha is applied per-draw.
const DOT = "0, 229, 255"; // orbital cyan
const POINTER_LINK = "122, 92, 255"; // soft ultraviolet
const LINK = "0, 229, 255";

const LINK_DIST = 124;
const POINTER_DIST = 150;

export function ConstellationField({
  className = "",
  density = 1,
  interactive = true,
}: ConstellationFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    const context = node.getContext("2d");
    if (!context) return;
    // Bind to non-null-typed locals so the nested render loop type-checks
    // under next build's stricter closure narrowing.
    const canvas = node;
    const ctx = context;

    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let raf = 0;
    let running = false;
    let visible = true;
    let bounds: DOMRect | null = null;
    const pointer = { x: -9999, y: -9999, active: false };

    function seed(): void {
      const target = Math.max(
        16,
        Math.min(90, Math.round(((width * height) / 16000) * density)),
      );
      particles = Array.from({ length: target }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.24,
        vy: (Math.random() - 0.5) * 0.24,
        r: Math.random() * 1.4 + 0.6,
      }));
    }

    function resize(): void {
      const parent = canvas.parentElement;
      const rect = parent?.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect?.width ?? window.innerWidth));
      height = Math.max(1, Math.floor(rect?.height ?? window.innerHeight));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bounds = canvas.getBoundingClientRect();
      seed();
    }

    function update(): void {
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -12) p.x = width + 12;
        else if (p.x > width + 12) p.x = -12;
        if (p.y < -12) p.y = height + 12;
        else if (p.y > height + 12) p.y = -12;

        if (interactive && pointer.active) {
          const dx = pointer.x - p.x;
          const dy = pointer.y - p.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 28900 && d2 > 1) {
            p.vx += dx * 0.0006;
            p.vy += dy * 0.0006;
          }
        }

        p.vx *= 0.99;
        p.vy *= 0.99;
        const sp = Math.hypot(p.vx, p.vy);
        if (sp > 0.6) {
          p.vx = (p.vx / sp) * 0.6;
          p.vy = (p.vy / sp) * 0.6;
        }
      }
    }

    function render(): void {
      ctx.clearRect(0, 0, width, height);
      const n = particles.length;

      for (let i = 0; i < n; i++) {
        const a = particles[i];
        if (!a) continue;
        for (let j = i + 1; j < n; j++) {
          const b = particles[j];
          if (!b) continue;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK_DIST * LINK_DIST) {
            const alpha = (1 - Math.sqrt(d2) / LINK_DIST) * 0.5;
            ctx.strokeStyle = `rgba(${LINK}, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      if (interactive && pointer.active) {
        for (const p of particles) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < POINTER_DIST * POINTER_DIST) {
            const alpha = (1 - Math.sqrt(d2) / POINTER_DIST) * 0.6;
            ctx.strokeStyle = `rgba(${POINTER_LINK}, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(pointer.x, pointer.y);
            ctx.stroke();
          }
        }
      }

      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${DOT}, 0.9)`;
        ctx.fill();
      }
    }

    function frame(): void {
      update();
      render();
      raf = requestAnimationFrame(frame);
    }

    function start(): void {
      if (running || reduce || !visible) return;
      running = true;
      raf = requestAnimationFrame(frame);
    }

    function stop(): void {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    function onPointerMove(e: PointerEvent): void {
      if (!bounds) return;
      const x = e.clientX - bounds.left;
      const y = e.clientY - bounds.top;
      pointer.active = x >= 0 && y >= 0 && x <= width && y <= height;
      pointer.x = x;
      pointer.y = y;
    }
    function onPointerLeave(): void {
      pointer.active = false;
    }
    function onScroll(): void {
      bounds = canvas.getBoundingClientRect();
    }
    function onVisibility(): void {
      if (document.hidden) stop();
      else start();
    }

    resize();

    if (reduce) {
      render(); // single static frame; no loop, no listeners
      return () => {};
    }

    const observer =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              visible = entries[0]?.isIntersecting ?? true;
              if (visible) start();
              else stop();
            },
            { threshold: 0 },
          )
        : null;
    observer?.observe(canvas);

    window.addEventListener("resize", resize);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    if (interactive) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerleave", onPointerLeave);
    }

    start();

    return () => {
      stop();
      observer?.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [density, interactive]);

  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
