"use client";

/**
 * FieldCinematicIntro — one cold-open, then out of the way.
 *
 * Canvas particles drift as market noise, snap into scored rows, the headline
 * flips Noise → Signal, the Field mark locks, and the overlay dissolves.
 * Once per session · skippable · reduced-motion instant · saveData skips.
 * No video download (lighter than the montage; F-24 media weight).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { LogoMarkInline } from "@/components/brand/logo-mark-inline";

const SEEN_KEY = "gse-field-intro-v1";
const MAX_MS = 5200;
const DISSOLVE_MS = 520;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  lag: number;
  seed: number;
  hot: boolean;
};

export function FieldCinematicIntro() {
  const [active, setActive] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const finishingRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  const finish = useCallback(() => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
    setExiting(true);
    timersRef.current.push(window.setTimeout(() => setActive(false), DISSOLVE_MS));
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (reduced || conn?.saveData) return;
    try {
      if (sessionStorage.getItem(SEEN_KEY)) return;
      if (new URLSearchParams(window.location.search).get("intro") === "skip") return;
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* private mode — play anyway */
    }
    setActive(true);
  }, []);

  useEffect(() => {
    if (!active) return;
    const onKey = () => finish();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, finish]);

  useEffect(() => {
    if (!active || exiting) return;
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const t0 = performance.now();
    let parts: Particle[] = [];
    const SIG: [number, number, number] = [255, 77, 46];
    const BONE: [number, number, number] = [237, 232, 224];
    const DIM: [number, number, number] = [143, 138, 130];

    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      cv.width = w * dpr;
      cv.height = h * dpr;
      cv.style.width = `${w}px`;
      cv.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const rows = 5;
      const per = w > 760 ? 110 : 56;
      const boardW = Math.min(w * 0.72, 820);
      const x0 = (w - boardW) / 2;
      const y0 = h * 0.58;
      const gap = Math.min(h * 0.032, 26);
      parts = [];
      for (let r = 0; r < rows; r++) {
        for (let i = 0; i < per; i++) {
          const u = i / (per - 1);
          parts.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.35,
            vy: (Math.random() - 0.5) * 0.35,
            tx: x0 + u * boardW,
            ty: y0 + r * gap + (Math.random() - 0.5) * 1.2,
            lag: r * 0.06 + Math.random() * 0.12,
            seed: Math.random() * 6.28,
            hot: r < 2,
          });
        }
      }
    };

    const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - (1 - x) ** 3);
    const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

    const frame = (now: number) => {
      const elapsed = now - t0;
      const p = ease(clamp01((elapsed - 400) / 2800));
      setProgress(clamp01(elapsed / MAX_MS));
      ctx.clearRect(0, 0, cv.width, cv.height);
      const w = window.innerWidth;
      const h = window.innerHeight;
      for (const q of parts) {
        if (p < 1) {
          q.x += q.vx;
          q.y += q.vy;
          if (q.x < -20) q.x = w + 20;
          if (q.x > w + 20) q.x = -20;
          if (q.y < -20) q.y = h + 20;
          if (q.y > h + 20) q.y = -20;
        }
        const lp = ease(clamp01((p - q.lag) / (1 - q.lag * 0.55)));
        const wob = (1 - lp) * 6;
        const x = q.x + (q.tx - q.x) * lp + Math.sin(now * 0.0017 + q.seed) * wob;
        const y = q.y + (q.ty - q.y) * lp + Math.cos(now * 0.0014 + q.seed) * wob;
        const base = q.hot ? SIG : BONE;
        const col = [
          DIM[0] + ((base[0] ?? 0) - DIM[0]) * lp,
          DIM[1] + ((base[1] ?? 0) - DIM[1]) * lp,
          DIM[2] + ((base[2] ?? 0) - DIM[2]) * lp,
        ];
        ctx.fillStyle = `rgba(${(col[0] ?? 0) | 0},${(col[1] ?? 0) | 0},${(col[2] ?? 0) | 0},${0.3 + 0.55 * lp})`;
        const rad = 1.1 + 0.5 * lp;
        ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
      if (elapsed > MAX_MS - 400) finish();
      else raf = requestAnimationFrame(frame);
    };

    build();
    raf = requestAnimationFrame(frame);
    const onResize = () => build();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [active, exiting, finish]);

  if (!active) return null;
  const flipped = progress > 0.42;

  return (
    <div
      role="dialog"
      aria-label="Galaxy Sports Edge intro"
      className={`fixed inset-0 z-[80] transition-opacity duration-500 ${exiting ? "pointer-events-none opacity-0" : "opacity-100"}`}
      style={{ background: "#08090C" }}
      onClick={finish}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="mb-8 opacity-90">
          <LogoMarkInline size={72} pulse />
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ion-2">Galaxy Sports Edge</p>
        <h1 className="mt-4 font-display text-6xl font-semibold tracking-tight text-ion-white sm:text-7xl">
          {flipped ? (
            <span className="text-plasma">Signal.</span>
          ) : (
            <span>Noise.</span>
          )}
        </h1>
        <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-ion-2">
          We detect. You decide.
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            finish();
          }}
          className="absolute bottom-10 right-6 font-mono text-[10px] uppercase tracking-[0.18em] text-ion-2 transition-colors hover:text-plasma"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
