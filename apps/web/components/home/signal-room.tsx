"use client";

/**
 * The Signal Room — live instrument renderer.
 *
 * Reads the deterministic scene from `@/lib/signal-room/scene` (built on the
 * homepage from REAL pipeline telemetry) and animates it on a 2D canvas:
 * stations glow, conduits carry in-flight signals, the no-bet gate holds what
 * it stops, and the calibration ring fills to its public sample.
 *
 * This component owns motion + colour only; it never invents data. When the
 * scene is "quiet" (no live rows) nothing is in flight — the room sits at rest.
 *
 * Discipline:
 *  - `prefers-reduced-motion` → one static, meaningful frame (no rAF).
 *  - IntersectionObserver → animate only while on screen; pause when hidden.
 *  - devicePixelRatio-aware; ResizeObserver refits crisply.
 *  - Full cleanup (cancelAnimationFrame + disconnect observers) on unmount.
 *  - Canvas is aria-hidden; the honest summary is exposed as text for AT.
 */

import { useEffect, useRef } from "react";
import type {
  ConduitTone,
  SignalRoomScene,
  StationId,
} from "@/lib/signal-room/scene";

interface SignalRoomProps {
  readonly scene: SignalRoomScene;
}

/** Brand-token hexes mirrored for the canvas (canvas can't read CSS vars). */
const C = {
  intake: "#7A5CFF", // ultraviolet — depth / raw intake
  signal: "#00E5FF", // orbital cyan — signal in motion
  gravity: "#9F87FF", // ultraviolet glow — market pull
  verify: "#00E5FF", // orbital cyan — verified / cleared
  contradiction: "#FF2DD6", // ion magenta — held / stopped
  core: "#00E5FF",
  hold: "#FF2DD6",
  text: "#F6F7FA",
} as const;

function toneColor(tone: ConduitTone): string {
  switch (tone) {
    case "intake":
      return C.intake;
    case "gravity":
      return C.gravity;
    case "contradiction":
      return C.contradiction;
    case "signal":
    case "verify":
      return C.signal;
  }
}

interface Pt {
  readonly x: number;
  readonly y: number;
}

export function SignalRoom({ scene }: SignalRoomProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<SignalRoomScene>(scene);
  sceneRef.current = scene;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let rafId = 0;
    let running = false;
    const start = typeof performance !== "undefined" ? performance.now() : Date.now();

    const reduceMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Normalised → canvas-px mapping, with margins so labels stay in frame.
    const coordOf = (id: StationId): Pt => {
      const st = sceneRef.current.stations.find((s) => s.id === id);
      const nx = st ? st.x : 0.5;
      const ny = st ? st.y : 0.5;
      const mx = width * 0.07;
      const my = height * 0.16;
      return { x: mx + nx * (width - mx * 2), y: my + ny * (height - my * 2) };
    };

    function setSize(): void {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function glow(point: Pt, radius: number, color: string, alpha: number): void {
      if (!ctx) return;
      const grad = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
      grad.addColorStop(0, color);
      grad.addColorStop(1, "transparent");
      ctx.globalAlpha = alpha;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    function drawConduits(pulse: number): void {
      if (!ctx) return;
      const s = sceneRef.current;
      for (const conduit of s.conduits) {
        const a = coordOf(conduit.from);
        const b = coordOf(conduit.to);
        const color = toneColor(conduit.tone);
        // The track.
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.16;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.globalAlpha = 1;
        // In-flight signals.
        if (conduit.flow > 0) {
          for (let i = 0; i < conduit.flow; i += 1) {
            const base = (i + 0.5) / conduit.flow;
            const phase = reduceMotion ? base : (base + pulse * 0.5) % 1;
            const px = a.x + (b.x - a.x) * phase;
            const py = a.y + (b.y - a.y) * phase;
            glow({ x: px, y: py }, 7, color, 0.5);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(px, py, 1.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    function drawCore(point: Pt, intensity: number, breathe: number): void {
      if (!ctx) return;
      glow(point, 46 + breathe * 8, C.core, 0.18 + intensity * 0.22);
      ctx.strokeStyle = C.core;
      for (let r = 0; r < 3; r += 1) {
        ctx.globalAlpha = 0.5 - r * 0.13;
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 10 + r * 9 + breathe * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = C.core;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawGate(point: Pt, breathe: number): void {
      if (!ctx) return;
      const s = sceneRef.current;
      const holding = s.gate.holding;
      const color = holding ? C.hold : C.signal;
      const h = 30;
      // Posts.
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(point.x, point.y - h);
      ctx.lineTo(point.x, point.y + h);
      ctx.stroke();
      ctx.globalAlpha = 1;
      if (holding) {
        glow(point, 24 + breathe * 6, C.hold, 0.5);
        // Stacked held markers (capped for legibility).
        const shown = Math.min(5, s.gate.holdCount);
        ctx.fillStyle = C.hold;
        for (let i = 0; i < shown; i += 1) {
          ctx.beginPath();
          ctx.arc(point.x - 9, point.y - h + 6 + i * ((h * 2 - 12) / 5), 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        glow(point, 16, C.signal, 0.22);
      }
    }

    function drawCalibration(point: Pt): void {
      if (!ctx) return;
      const ring = sceneRef.current.calibration;
      const radius = 16;
      // Full faint track.
      ctx.strokeStyle = C.intake;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      // Filled arc to the sample fraction.
      ctx.strokeStyle = ring.ready ? C.verify : C.intake;
      ctx.globalAlpha = ring.ready ? 0.95 : 0.7;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ring.fraction);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    function drawStation(id: StationId): void {
      if (!ctx) return;
      const st = sceneRef.current.stations.find((s) => s.id === id);
      if (!st) return;
      const p = coordOf(id);
      switch (id) {
        case "decision-core":
          return; // drawn by drawCore for the breathing pass
        case "no-bet-gate":
          return; // drawn by drawGate
        case "calibration":
          drawCalibration(p);
          break;
        case "source-mesh": {
          glow(p, 22, C.intake, 0.18 + st.intensity * 0.2);
          ctx.fillStyle = C.intake;
          const dots = Math.min(6, Math.max(1, st.count));
          for (let i = 0; i < dots; i += 1) {
            const ang = (i / dots) * Math.PI * 2;
            ctx.globalAlpha = 0.85;
            ctx.beginPath();
            ctx.arc(p.x + Math.cos(ang) * 9, p.y + Math.sin(ang) * 9, 1.8, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          break;
        }
        case "market-gravity": {
          glow(p, 24, C.gravity, 0.14 + st.intensity * 0.18);
          ctx.strokeStyle = C.gravity;
          ctx.globalAlpha = 0.55;
          ctx.lineWidth = 1.25;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        }
        case "evidence":
        case "board": {
          const color = id === "board" ? C.verify : C.signal;
          glow(p, 20, color, 0.14 + st.intensity * 0.2);
          ctx.strokeStyle = color;
          ctx.globalAlpha = 0.7;
          ctx.lineWidth = 1.25;
          ctx.strokeRect(p.x - 8, p.y - 8, 16, 16);
          ctx.globalAlpha = 1;
          break;
        }
      }
    }

    function draw(now: number): void {
      if (!ctx) return;
      const t = (now - start) / 1000;
      const breathe = reduceMotion ? 0.6 : 0.5 + 0.5 * Math.sin(t * Math.PI * 0.8);
      const pulse = reduceMotion ? 0 : (t * 0.16) % 1;

      ctx.clearRect(0, 0, width, height);

      drawConduits(pulse);
      for (const st of sceneRef.current.stations) drawStation(st.id);
      drawGate(coordOf("no-bet-gate"), breathe);
      const core = sceneRef.current.stations.find((s) => s.id === "decision-core");
      drawCore(coordOf("decision-core"), core ? core.intensity : 0.3, breathe);
    }

    function loop(now: number): void {
      draw(now);
      rafId = window.requestAnimationFrame(loop);
    }

    function play(): void {
      if (running) return;
      running = true;
      if (reduceMotion) {
        draw(typeof performance !== "undefined" ? performance.now() : Date.now());
        return; // single static frame
      }
      rafId = window.requestAnimationFrame(loop);
    }

    function pause(): void {
      running = false;
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = 0;
    }

    setSize();
    // Static frame immediately so SSR→hydration shows the instrument at rest.
    draw(start);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            setSize();
            if (!running || reduceMotion) draw(typeof performance !== "undefined" ? performance.now() : Date.now());
          })
        : null;
    if (resizeObserver) resizeObserver.observe(canvas);

    const intersectionObserver =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              const entry = entries[0];
              if (entry?.isIntersecting) play();
              else pause();
            },
            { threshold: 0.12 }
          )
        : null;
    if (intersectionObserver) intersectionObserver.observe(canvas);
    else play(); // no observer support → just animate

    return () => {
      pause();
      if (resizeObserver) resizeObserver.disconnect();
      if (intersectionObserver) intersectionObserver.disconnect();
    };
  }, []);

  const legend: ReadonlyArray<{ color: string; label: string }> = [
    { color: C.verify, label: "verified / cleared" },
    { color: C.contradiction, label: "held at the gate" },
    { color: C.intake, label: "depth / intake" },
  ];

  return (
    <figure className="relative m-0">
      <div
        className="relative isolate w-full overflow-hidden rounded-ds-lg"
        style={{
          aspectRatio: "16 / 7",
          minHeight: 260,
          border: "1px solid rgba(0,229,255,0.16)",
          background:
            "radial-gradient(ellipse 60% 80% at 50% 50%, rgba(122,92,255,0.10), transparent 70%), #050608",
        }}
      >
        <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />
        <p className="sr-only">{scene.summary}</p>
        <span
          className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em]"
          style={{
            border: "1px solid rgba(0,229,255,0.22)",
            background: "rgba(8,6,20,0.6)",
            color: scene.mode === "active" ? "#00E5FF" : "#9F87FF",
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: scene.mode === "active" ? "#00E5FF" : "#9F87FF" }}
          />
          {scene.mode === "active" ? "Room live" : "Room at rest"}
        </span>
      </div>
      <figcaption className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm leading-6 text-ink-300">
          {scene.mode === "active"
            ? "The instrument is reading live rows through the pipeline."
            : "Nothing is in flight. An at-rest room is the no-bet gate doing its job."}
        </span>
        <span className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400">
          {legend.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: item.color }} />
              {item.label}
            </span>
          ))}
        </span>
      </figcaption>
    </figure>
  );
}
