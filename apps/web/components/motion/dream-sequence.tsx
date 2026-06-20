"use client";

/**
 * DreamSequence — The site dreams when you look away.
 *
 * After 60 seconds of idle, the page drifts into a generative sequence:
 * historical predictions, current signals, and future possibilities blend
 * in an ambient visual flow. Moving the mouse or pressing a key wakes it.
 *
 * A canvas-based particle system where each dot is a memory — past picks,
 * current board rows, gated signals — drifting like stars in deep space.
 * Pure canvas, no React re-renders during the dream.
 */

import { useEffect, useRef, useState } from "react";

interface DreamDot {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  birth: number;
  life: number;
  color: string;
  label: string;
}

const DREAM_MEMORIES = [
  { label: "WEEK 3", color: "0,229,255" },
  { label: "GATED", color: "255,45,214" },
  { label: "SCORING", color: "0,229,255" },
  { label: "PUBLISHED", color: "95,217,163" },
  { label: "NO BET", color: "255,45,214" },
  { label: "PENDING", color: "122,92,255" },
  { label: "SIGNAL", color: "0,229,255" },
  { label: "NOISE", color: "122,92,255" },
] as const;

const IDLE_THRESHOLD = 60000;

export function DreamSequence() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dreaming, setDreaming] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();
  const rafRef = useRef(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const resetIdle = () => {
      setDreaming(false);
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => setDreaming(true), IDLE_THRESHOLD);
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, resetIdle, { passive: true }));
    idleTimer.current = setTimeout(() => setDreaming(true), IDLE_THRESHOLD);

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetIdle));
      clearTimeout(idleTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!dreaming) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = (canvas.width = window.innerWidth * dpr);
    const h = (canvas.height = window.innerHeight * dpr);

    const dots: DreamDot[] = [];
    const spawnDot = () => {
      const mem = DREAM_MEMORIES[Math.floor(Math.random() * DREAM_MEMORIES.length)];
      dots.push({
        x: Math.random() * w,
        y: Math.random() * h,
        z: Math.random(),
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        birth: performance.now(),
        life: 8000 + Math.random() * 12000,
        color: mem.color,
        label: mem.label,
      });
    };

    for (let i = 0; i < 40; i++) spawnDot();

    let time = 0;
    const draw = (now: number) => {
      time += 1;
      ctx.fillStyle = "rgba(5, 6, 8, 0.08)";
      ctx.fillRect(0, 0, w, h);

      // Spawn new memories
      if (dots.length < 60 && Math.random() < 0.03) spawnDot();

      for (let i = dots.length - 1; i >= 0; i--) {
        const d = dots[i];
        const age = now - d.birth;
        if (age > d.life) {
          dots.splice(i, 1);
          continue;
        }

        d.x += d.vx;
        d.y += d.vy;

        const alpha = Math.sin((age / d.life) * Math.PI) * 0.5;
        const size = (1 + Math.sin(time * 0.01 + i) * 0.5) * (0.5 + d.z * 1.5);

        // Glow
        const glow = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, size * 8);
        glow.addColorStop(0, `rgba(${d.color}, ${alpha * 0.3})`);
        glow.addColorStop(1, `rgba(${d.color}, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(d.x, d.y, size * 8, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = `rgba(${d.color}, ${alpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, size, 0, Math.PI * 2);
        ctx.fill();

        // Label (faint, only for larger dots)
        if (d.z > 0.7 && alpha > 0.3) {
          ctx.font = `500 ${7 * dpr}px var(--f-mono)`;
          ctx.fillStyle = `rgba(${d.color}, ${alpha * 0.25})`;
          ctx.fillText(d.label, d.x + size * 3, d.y + size);
        }
      }

      // Vignette
      const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.8);
      vig.addColorStop(0, "rgba(5,6,8,0)");
      vig.addColorStop(1, "rgba(5,6,8,0.4)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [dreaming]);

  if (!dreaming) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[55]"
      style={{ mixBlendMode: "screen" }}
    />
  );
}
