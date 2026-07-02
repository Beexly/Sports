"use client";

/**
 * VoiceWaveform — The intelligence speaking.
 *
 * A canvas-based audio waveform visualization that ripples outward from a
 * central point in concentric rings of cyan light. The waveform breathes and
 * shifts like a living voice — calm, authoritative, alive.
 *
 * Used in the "Jarvis is speaking" hero variant and the Command Deck page.
 * Reduced motion → static rings.
 */

import { useEffect, useRef } from "react";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function VoiceWaveform({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = prefersReducedMotion();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let w = 0, h = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.floor(rect.width * dpr);
      h = Math.floor(rect.height * dpr);
      canvas.width = w;
      canvas.height = h;
    };
    resize();

    let raf = 0;
    let time = 0;
    let running = false;
    let inView = true;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      if (!reduced) time += 1;

      const cx = w / 2;
      const cy = h * 0.55;
      const maxRadius = Math.min(w, h) * 0.45;

      // Draw concentric waveform rings
      const ringCount = 6;
      for (let i = 0; i < ringCount; i++) {
        const baseRadius = (i + 1) * (maxRadius / ringCount);
        const waveOffset = Math.sin(time * 0.03 + i * 0.8) * 8 * dpr;
        const radius = baseRadius + waveOffset;
        const alpha = 0.15 - i * 0.02;

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 229, 255, ${alpha})`;
        ctx.lineWidth = 1 * dpr;
        ctx.stroke();

        // Add arc segments that "speak" — thicker where the wave peaks
        const speakAngle = time * 0.01 + i * 0.5;
        const arcStart = speakAngle;
        const arcEnd = speakAngle + 0.3 + Math.sin(time * 0.05 + i) * 0.2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, arcStart, arcEnd);
        ctx.strokeStyle = `rgba(0, 229, 255, ${alpha + 0.15})`;
        ctx.lineWidth = 2 * dpr;
        ctx.stroke();
      }

      // Central glow
      const glowRadius = 20 * dpr + Math.sin(time * 0.04) * 6 * dpr;
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius * 3);
      glow.addColorStop(0, "rgba(0, 229, 255, 0.25)");
      glow.addColorStop(0.5, "rgba(0, 229, 255, 0.08)");
      glow.addColorStop(1, "rgba(0, 229, 255, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, glowRadius * 3, 0, Math.PI * 2);
      ctx.fill();

      // Core dot
      ctx.fillStyle = "rgba(0, 229, 255, 0.9)";
      ctx.beginPath();
      ctx.arc(cx, cy, 3 * dpr, 0, Math.PI * 2);
      ctx.fill();

      if (running) raf = requestAnimationFrame(draw);
    };

    // Pause the loop while the tab is hidden or the canvas is off-screen;
    // resume (same frame) when it is watchable again.
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
      raf = requestAnimationFrame(draw);
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
    io?.observe(canvas);

    startLoop();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      stopLoop();
      document.removeEventListener("visibilitychange", onVisibility);
      io?.disconnect();
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
