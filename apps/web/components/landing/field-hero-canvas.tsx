"use client";

/**
 * FieldHeroCanvas — quiet particle field behind the hero.
 * Drifts as noise; a few settle into horizontal "board" rows.
 * No purple, no starfield, no chrome. Reduced-motion → static dots.
 */

import { useEffect, useRef } from "react";

export function FieldHeroCanvas() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    type P = { x: number; y: number; vx: number; vy: number; tx: number; ty: number; hot: boolean; seed: number };
    let parts: P[] = [];
    let raf = 0;
    let t = 0;

    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = cv.clientWidth || window.innerWidth;
      const h = cv.clientHeight || 520;
      cv.width = Math.max(1, w * dpr);
      cv.height = Math.max(1, h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const rows = 6;
      const per = w > 800 ? 90 : 48;
      const boardW = Math.min(w * 0.7, 900);
      const x0 = (w - boardW) / 2;
      const y0 = h * 0.62;
      const gap = 18;
      parts = [];
      for (let r = 0; r < rows; r++) {
        for (let i = 0; i < per; i++) {
          const u = i / Math.max(per - 1, 1);
          parts.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.22,
            vy: (Math.random() - 0.5) * 0.22,
            tx: x0 + u * boardW,
            ty: y0 + r * gap,
            hot: r < 2,
            seed: Math.random() * 6.28,
          });
        }
      }
    };

    const frame = () => {
      t += 1;
      const w = cv.clientWidth || window.innerWidth;
      const h = cv.clientHeight || 520;
      ctx.clearRect(0, 0, w, h);
      // permanent settle amount — field reads as "board forming", not chaos
      const settle = 0.72;
      for (const q of parts) {
        if (!reduced) {
          q.x += q.vx;
          q.y += q.vy;
          if (q.x < -10) q.x = w + 10;
          if (q.x > w + 10) q.x = -10;
          if (q.y < -10) q.y = h + 10;
          if (q.y > h + 10) q.y = -10;
        }
        const wob = reduced ? 0 : (1 - settle) * 4;
        const x = q.x + (q.tx - q.x) * settle + Math.sin(t * 0.01 + q.seed) * wob;
        const y = q.y + (q.ty - q.y) * settle + Math.cos(t * 0.008 + q.seed) * wob;
        ctx.fillStyle = q.hot ? "rgba(255,77,46,0.55)" : "rgba(237,232,224,0.22)";
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
      if (!reduced) raf = requestAnimationFrame(frame);
    };

    build();
    frame();
    const onResize = () => {
      build();
      if (reduced) frame();
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ opacity: 0.85 }}
    />
  );
}
