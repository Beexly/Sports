"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

export type TelemetryMode = "septic_shock" | "survivor_control" | "live_stream";

export interface BraidMetrics {
  circulation: number; // Chen Lévy Area Circulation (A_ij)
  entropy: number;     // Seifert Irreversible Entropy (S_irr)
  dispersion: number;  // Clock Velocity Dispersion (Δφ)
  slippage: number;    // DTW Temporal Slippage (τ_DTW)
  avalanchePhase: "RUNAWAY_THERMALIZING_AVALANCHE" | "FAILED_AVALANCHE_ARRESTED";
  status: "CRITICAL_DECOUPLED_SHOCK_HORIZON" | "LAMINAR_SYNCHRONIZED_CONTROL";
  magicMonotoneTheor: number; // Byles D(S3) Theoretical (0.2076)
  magicMonotoneExp: number;   // Byles D(S3) Experimental (0.2580)
}

const PRESET_MODES: Record<"septic_shock" | "survivor_control", BraidMetrics> = {
  septic_shock: {
    circulation: 2.2688,
    entropy: 2.8933,
    dispersion: 5.4756,
    slippage: 0.9083,
    avalanchePhase: "RUNAWAY_THERMALIZING_AVALANCHE",
    status: "CRITICAL_DECOUPLED_SHOCK_HORIZON",
    magicMonotoneTheor: 0.2076,
    magicMonotoneExp: 0.2580,
  },
  survivor_control: {
    circulation: 0.4042,
    entropy: 1.4972,
    dispersion: 2.8308,
    slippage: 0.2898,
    avalanchePhase: "FAILED_AVALANCHE_ARRESTED",
    status: "LAMINAR_SYNCHRONIZED_CONTROL",
    magicMonotoneTheor: 0.2076,
    magicMonotoneExp: 0.2580,
  },
};

interface SubsystemStrand {
  name: string;
  code: string;
  unit: string;
  color: string;
  glowColor: string;
  baseYOffsetRatio: number;
  freq: number;
  amplitude: number;
  phaseShift: number;
}

const SUBSYSTEMS: SubsystemStrand[] = [
  {
    name: "Mean Arterial Pressure",
    code: "MAP",
    unit: "mmHg",
    color: "#00E5FF",
    glowColor: "rgba(0, 229, 255, 0.4)",
    baseYOffsetRatio: 0.22,
    freq: 1.1,
    amplitude: 28,
    phaseShift: 0.0,
  },
  {
    name: "Pulse Oximetry",
    code: "SpO2",
    unit: "%",
    color: "#38BDF8",
    glowColor: "rgba(56, 189, 248, 0.4)",
    baseYOffsetRatio: 0.36,
    freq: 0.85,
    amplitude: 22,
    phaseShift: 1.2,
  },
  {
    name: "Heart Rate",
    code: "HR",
    unit: "bpm",
    color: "#FBBF24",
    glowColor: "rgba(251, 191, 36, 0.4)",
    baseYOffsetRatio: 0.50,
    freq: 1.45,
    amplitude: 34,
    phaseShift: 2.5,
  },
  {
    name: "Respiratory Rate",
    code: "RespRate",
    unit: "br/min",
    color: "#A78BFA",
    glowColor: "rgba(167, 139, 250, 0.4)",
    baseYOffsetRatio: 0.64,
    freq: 1.9,
    amplitude: 26,
    phaseShift: 3.8,
  },
  {
    name: "Lactate / Shock Index",
    code: "Lactate/ShockIdx",
    unit: "ratio",
    color: "#FF4D2E",
    glowColor: "rgba(255, 77, 46, 0.45)",
    baseYOffsetRatio: 0.78,
    freq: 2.3,
    amplitude: 38,
    phaseShift: 5.1,
  },
];

export function BraidVisualizationMesh() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<TelemetryMode>("septic_shock");
  const [metrics, setMetrics] = useState<BraidMetrics>(PRESET_MODES.septic_shock);
  const [wsStatus, setWsStatus] = useState<"disconnected" | "connecting" | "connected" | "fallback">("disconnected");
  const [fps, setFps] = useState<number>(60);
  const [hoveredStrand, setHoveredStrand] = useState<string | null>(null);

  const animationFrameId = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const timeRef = useRef<number>(0);
  const lastTimestampRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);
  const lastFpsCalcRef = useRef<number>(performance.now());

  // WebSocket Live Stream handler with offline fallback
  useEffect(() => {
    if (mode !== "live_stream") {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setWsStatus("disconnected");
      if (mode === "septic_shock") {
        setMetrics(PRESET_MODES.septic_shock);
      } else if (mode === "survivor_control") {
        setMetrics(PRESET_MODES.survivor_control);
      }
      return;
    }

    setWsStatus("connecting");
    let socket: WebSocket | null = null;
    let fallbackTimer: NodeJS.Timeout | null = null;

    try {
      socket = new WebSocket("ws://localhost:8000/api/v3/frontier/ws-braid-stream");
      wsRef.current = socket;

      socket.onopen = () => {
        setWsStatus("connected");
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload && payload.metrics) {
            setMetrics((prev) => ({
              ...prev,
              ...payload.metrics,
            }));
          }
        } catch {
          // ignore ill-formed payloads
        }
      };

      socket.onerror = () => {
        setWsStatus("fallback");
      };

      socket.onclose = () => {
        setWsStatus("fallback");
      };
    } catch {
      setWsStatus("fallback");
    }

    // Fallback: If not connected within 1.2s, gracefully fall back to deterministic synthesis
    fallbackTimer = setTimeout(() => {
      setWsStatus((cur) => (cur === "connected" ? cur : "fallback"));
    }, 1200);

    return () => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (socket) {
        socket.close();
      }
      wsRef.current = null;
    };
  }, [mode]);

  // Handle fallback real-time metric evolution in live mode
  useEffect(() => {
    if (mode !== "live_stream" || wsStatus !== "fallback") return;

    const interval = setInterval(() => {
      const t = Date.now() / 3000;
      const wobble = Math.sin(t) * 0.25;
      setMetrics({
        circulation: Number((1.35 + wobble * 0.8).toFixed(4)),
        entropy: Number((2.15 + wobble * 0.5).toFixed(4)),
        dispersion: Number((4.12 + wobble * 1.1).toFixed(4)),
        slippage: Number((0.61 + wobble * 0.25).toFixed(4)),
        avalanchePhase: wobble > 0 ? "RUNAWAY_THERMALIZING_AVALANCHE" : "FAILED_AVALANCHE_ARRESTED",
        status: wobble > 0 ? "CRITICAL_DECOUPLED_SHOCK_HORIZON" : "LAMINAR_SYNCHRONIZED_CONTROL",
        magicMonotoneTheor: 0.2076,
        magicMonotoneExp: 0.2580,
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [mode, wsStatus]);

  // Main 60 FPS Canvas Render Loop
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // High-DPI scaling
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }
    ctx.resetTransform();
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    // Time advancement
    const now = performance.now();
    const delta = (now - lastTimestampRef.current) / 1000;
    lastTimestampRef.current = now;

    // FPS counter
    frameCountRef.current++;
    if (now - lastFpsCalcRef.current >= 1000) {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
      lastFpsCalcRef.current = now;
    }

    // Speed multiplier based on state
    const speed = mode === "septic_shock" ? 1.45 : mode === "survivor_control" ? 0.75 : 1.1;
    timeRef.current += delta * speed;
    const t = timeRef.current;

    // 1. Clear with deep canvas obsidian
    ctx.fillStyle = "#08090C";
    ctx.fillRect(0, 0, w, h);

    // 2. Draw $(d+1)$ spacetime coordinate grid
    ctx.strokeStyle = "rgba(35, 38, 46, 0.65)";
    ctx.lineWidth = 1;

    // Time grid verticals
    const numGridCols = 8;
    for (let c = 0; c <= numGridCols; c++) {
      const x = (w / numGridCols) * c;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();

      // Timeline tick labels
      if (c > 0 && c < numGridCols) {
        ctx.fillStyle = "rgba(143, 138, 130, 0.4)";
        ctx.font = "9px ui-monospace, SFMono-Regular, monospace";
        ctx.textAlign = "center";
        const hrOffset = ((numGridCols - c) * 3).toFixed(0);
        ctx.fillText(`t - ${hrOffset}h`, x, h - 8);
      }
    }

    // Subsystem baseline horizontals
    SUBSYSTEMS.forEach((sub) => {
      const y = h * sub.baseYOffsetRatio;
      ctx.strokeStyle = "rgba(25, 28, 35, 0.85)";
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    });

    // 3. Compute sampled worldlines
    const numSamples = 160;
    const xStep = w / (numSamples - 1);
    const isShock = mode === "septic_shock" || (mode === "live_stream" && metrics.status === "CRITICAL_DECOUPLED_SHOCK_HORIZON");

    interface StrandPoint {
      x: number;
      y: number;
    }

    const strandPoints: StrandPoint[][] = SUBSYSTEMS.map((sub, sIdx) => {
      const points: StrandPoint[] = [];
      const baseY = h * sub.baseYOffsetRatio;
      const ampMod = isShock ? 1.65 : 0.65;
      const freqMod = isShock ? 1.35 : 0.85;

      for (let i = 0; i < numSamples; i++) {
        const x = i * xStep;
        // Space-time spatial progression parameter
        const progress = x / w;

        // Wave formulation with harmonic interference
        const phase = t * sub.freq * freqMod + progress * 7.5 + sub.phaseShift;
        const wave1 = Math.sin(phase) * sub.amplitude * ampMod;
        const wave2 = Math.cos(phase * 0.45 + sub.phaseShift) * (sub.amplitude * 0.35 * ampMod);

        // Ergodicity breaking divergence in septic shock mode near the right horizon
        const runawayDivergence = isShock ? Math.pow(progress, 2.2) * 55 * Math.sin(t * 3.2 + sIdx * 1.5) : 0;

        const y = baseY + wave1 + wave2 + runawayDivergence;
        points.push({ x, y: Math.max(12, Math.min(h - 22, y)) });
      }
      return points;
    });

    // 4. Detect spacetime braid intersections (crossings) for dynamic glow
    interface CrossingGlow {
      x: number;
      y: number;
      intensity: number;
      s1: number;
      s2: number;
    }
    const crossings: CrossingGlow[] = [];

    for (let i = 0; i < numSamples; i += 2) {
      for (let s1 = 0; s1 < SUBSYSTEMS.length; s1++) {
        for (let s2 = s1 + 1; s2 < SUBSYSTEMS.length; s2++) {
          const p1 = strandPoints[s1]![i]!;
          const p2 = strandPoints[s2]![i]!;
          const dist = Math.abs(p1.y - p2.y);
          if (dist < 10) {
            crossings.push({
              x: p1.x,
              y: (p1.y + p2.y) / 2,
              intensity: Math.max(0, 1 - dist / 10),
              s1,
              s2,
            });
          }
        }
      }
    }

    // 5. Draw worldline paths with over/under shadow depth
    SUBSYSTEMS.forEach((sub, sIdx) => {
      const points = strandPoints[sIdx]!;
      const isHovered = hoveredStrand === sub.code;

      // Under-shadow / glow halo
      ctx.save();
      ctx.strokeStyle = isHovered ? "#FFFFFF" : sub.color;
      ctx.lineWidth = isHovered ? 4.5 : isShock ? 2.8 : 2.2;
      ctx.shadowColor = sub.glowColor;
      ctx.shadowBlur = isShock ? 14 : 7;
      ctx.globalAlpha = hoveredStrand && !isHovered ? 0.35 : 0.95;

      ctx.beginPath();
      ctx.moveTo(points[0]!.x, points[0]!.y);
      for (let i = 1; i < points.length; i++) {
        const xc = (points[i - 1]!.x + points[i]!.x) / 2;
        const yc = (points[i - 1]!.y + points[i]!.y) / 2;
        ctx.quadraticCurveTo(points[i - 1]!.x, points[i - 1]!.y, xc, yc);
      }
      ctx.lineTo(points[points.length - 1]!.x, points[points.length - 1]!.y);
      ctx.stroke();
      ctx.restore();

      // Lead particle node at the current front (t_0)
      const leadPoint = points[points.length - 1]!;
      ctx.save();
      ctx.fillStyle = sub.color;
      ctx.shadowColor = sub.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(leadPoint.x, leadPoint.y, isHovered ? 5.5 : 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 6. Draw dynamic crossing node halos
    crossings.forEach((c) => {
      ctx.save();
      const radius = isShock ? 12 * c.intensity : 6 * c.intensity;
      const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, radius);
      const colorA = isShock ? "rgba(255, 77, 46, 0.75)" : "rgba(0, 229, 255, 0.65)";
      const colorB = "rgba(0, 0, 0, 0)";
      grad.addColorStop(0, colorA);
      grad.addColorStop(1, colorB);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(c.x, c.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Sharp central intersection vortex core
      ctx.fillStyle = "#EDE8E0";
      ctx.beginPath();
      ctx.arc(c.x, c.y, 1.8 * c.intensity, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 7. Spacetime Phase Legend & Current Horizon Header inside canvas
    ctx.fillStyle = "rgba(237, 232, 224, 0.85)";
    ctx.font = "bold 11px ui-monospace, SFMono-Regular, monospace";
    ctx.textAlign = "left";
    ctx.fillText(
      `TEB (d+1) SPACETIME BRAID MESH · ${metrics.status === "CRITICAL_DECOUPLED_SHOCK_HORIZON" ? "CRITICAL HORIZON [ALERT]" : "LAMINAR SYNC [NOMINAL]"}`,
      14,
      20
    );

    animationFrameId.current = requestAnimationFrame(renderCanvas);
  }, [mode, metrics, hoveredStrand]);

  useEffect(() => {
    animationFrameId.current = requestAnimationFrame(renderCanvas);
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [renderCanvas]);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-titanium bg-obsidian/90 p-5 shadow-2xl backdrop-blur-md">
      {/* 1. Mode Selector Button Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-titanium/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                  metrics.status === "CRITICAL_DECOUPLED_SHOCK_HORIZON" ? "bg-alert" : "bg-verify"
                }`}
              />
              <span
                className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                  metrics.status === "CRITICAL_DECOUPLED_SHOCK_HORIZON" ? "bg-alert" : "bg-verify"
                }`}
              />
            </span>
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-ion-white">
              Thermodynamic Ergodic Braid Mesh (TEB)
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-ion-2">
            5-subsystem worldline entanglement in $(d+1)$ spacetime · Chen Lévy circulation &amp; time-slippage
          </p>
        </div>

        {/* 3-Mode Selector */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-titanium bg-carbon/80 p-1">
          <button
            type="button"
            onClick={() => setMode("septic_shock")}
            className={`rounded-lg px-3 py-1.5 font-mono text-[11px] font-semibold transition-all ${
              mode === "septic_shock"
                ? "border border-alert/60 bg-alert/20 text-alert shadow-sm"
                : "text-ion-2 hover:bg-titanium/50 hover:text-ion-white"
            }`}
          >
            MIMIC-IV Septic Shock (Stay #39104281 — Runaway Avalanche)
          </button>

          <button
            type="button"
            onClick={() => setMode("survivor_control")}
            className={`rounded-lg px-3 py-1.5 font-mono text-[11px] font-semibold transition-all ${
              mode === "survivor_control"
                ? "border border-verify/60 bg-verify/20 text-verify shadow-sm"
                : "text-ion-2 hover:bg-titanium/50 hover:text-ion-white"
            }`}
          >
            MIMIC-IV Survivor Control (Stay #31098412 — Failed Avalanche Arrested)
          </button>

          <button
            type="button"
            onClick={() => setMode("live_stream")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[11px] font-semibold transition-all ${
              mode === "live_stream"
                ? "border border-orbital-cyan/60 bg-orbital-cyan/20 text-ion-white shadow-sm"
                : "text-ion-2 hover:bg-titanium/50 hover:text-ion-white"
            }`}
          >
            <span>Live WebSocket Stream (ws://localhost:8000)</span>
            {mode === "live_stream" && (
              <span
                className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                  wsStatus === "connected"
                    ? "bg-verify text-obsidian"
                    : wsStatus === "fallback"
                    ? "bg-caution text-obsidian"
                    : "bg-titanium text-ion-2"
                }`}
              >
                {wsStatus === "connected" ? "ONLINE" : wsStatus === "fallback" ? "FALLBACK" : "CONNECTING"}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. Interactive Canvas Mesh */}
      <div className="relative aspect-[21/9] w-full min-h-[280px] overflow-hidden rounded-xl border border-titanium bg-obsidian">
        <canvas ref={canvasRef} className="h-full w-full block cursor-crosshair" />

        {/* Top-Right Performance & Stream Overlay */}
        <div className="absolute right-3 top-3 flex items-center gap-2">
          <span className="rounded-md border border-titanium bg-obsidian/80 px-2 py-0.5 font-mono text-[10px] text-ion-2">
            {fps} FPS
          </span>
          <span
            className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
              metrics.status === "CRITICAL_DECOUPLED_SHOCK_HORIZON"
                ? "border-alert/50 bg-alert/20 text-alert"
                : "border-verify/50 bg-verify/20 text-verify"
            }`}
          >
            {metrics.status}
          </span>
        </div>

        {/* Subsystem Strand Interactive Chip Bar */}
        <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-1.5">
          {SUBSYSTEMS.map((sub) => (
            <button
              key={sub.code}
              type="button"
              onMouseEnter={() => setHoveredStrand(sub.code)}
              onMouseLeave={() => setHoveredStrand(null)}
              className={`flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10px] transition-all ${
                hoveredStrand === sub.code
                  ? "border-ion-white bg-titanium text-ion-white scale-105"
                  : "border-titanium bg-obsidian/85 text-ion-2 hover:border-ion-3"
              }`}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: sub.color }} />
              <span className="font-semibold text-ion-1">{sub.code}</span>
              <span className="opacity-60">({sub.unit})</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Metric Readouts Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* Chen Lévy Area Circulation */}
        <div className="rounded-xl border border-titanium bg-carbon/60 p-3">
          <div className="flex items-center justify-between text-ion-3">
            <span className="font-mono text-[10px] uppercase tracking-wider">Chen Lévy Area (A_ij)</span>
          </div>
          <p className="mt-1 font-mono text-xl font-bold tabular-nums text-ion-white">
            {metrics.circulation.toFixed(4)}
          </p>
          <p className="mt-0.5 text-[10px] text-ion-3">
            {metrics.circulation > 1.0 ? "Turbulent non-commutative loop" : "Laminar bounded area"}
          </p>
        </div>

        {/* Seifert Irreversible Entropy */}
        <div className="rounded-xl border border-titanium bg-carbon/60 p-3">
          <div className="flex items-center justify-between text-ion-3">
            <span className="font-mono text-[10px] uppercase tracking-wider">Seifert Entropy (S_irr)</span>
          </div>
          <p className="mt-1 font-mono text-xl font-bold tabular-nums text-ion-white">
            {metrics.entropy.toFixed(4)}
          </p>
          <p className="mt-0.5 text-[10px] text-ion-3">
            Broken detailed balance flux
          </p>
        </div>

        {/* Clock Velocity Dispersion */}
        <div className="rounded-xl border border-titanium bg-carbon/60 p-3">
          <div className="flex items-center justify-between text-ion-3">
            <span className="font-mono text-[10px] uppercase tracking-wider">Clock Dispersion (Δφ)</span>
          </div>
          <p className="mt-1 font-mono text-xl font-bold tabular-nums text-ion-white">
            {metrics.dispersion.toFixed(4)}
          </p>
          <p className="mt-0.5 text-[10px] text-ion-3">
            Subsystem speed desynchrony
          </p>
        </div>

        {/* DTW Temporal Slippage */}
        <div className="rounded-xl border border-titanium bg-carbon/60 p-3">
          <div className="flex items-center justify-between text-ion-3">
            <span className="font-mono text-[10px] uppercase tracking-wider">DTW Slippage (τ_DTW)</span>
          </div>
          <p className="mt-1 font-mono text-xl font-bold tabular-nums text-ion-white">
            {metrics.slippage.toFixed(4)}
          </p>
          <p className="mt-0.5 text-[10px] text-ion-3">
            Dynamic warp path displacement
          </p>
        </div>

        {/* Crowley Avalanche Phase */}
        <div className="rounded-xl border border-titanium bg-carbon/60 p-3">
          <div className="flex items-center justify-between text-ion-3">
            <span className="font-mono text-[10px] uppercase tracking-wider">Crowley Avalanche</span>
          </div>
          <div className="mt-1">
            <span
              className={`inline-block rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-tight ${
                metrics.avalanchePhase === "RUNAWAY_THERMALIZING_AVALANCHE"
                  ? "bg-alert/20 text-alert border border-alert/40"
                  : "bg-verify/20 text-verify border border-verify/40"
              }`}
            >
              {metrics.avalanchePhase === "RUNAWAY_THERMALIZING_AVALANCHE" ? "RUNAWAY AVALANCHE" : "FAILED ARRESTED"}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-ion-3">
            {metrics.avalanchePhase === "RUNAWAY_THERMALIZING_AVALANCHE" ? "Ergodic phase collapse" : "Coherent self-regulation"}
          </p>
        </div>

        {/* Byles Magic Monotone */}
        <div className="rounded-xl border border-titanium bg-carbon/60 p-3">
          <div className="flex items-center justify-between text-ion-3">
            <span className="font-mono text-[10px] uppercase tracking-wider">Byles D(S3) Monotone</span>
          </div>
          <p className="mt-1 font-mono text-xl font-bold tabular-nums text-ion-white">
            {metrics.magicMonotoneTheor} <span className="text-xs font-normal text-ion-3">/ {metrics.magicMonotoneExp}</span>
          </p>
          <p className="mt-0.5 text-[10px] text-ion-3">
            Theor 0.2076 · Exp 0.2580 (M_2)
          </p>
        </div>
      </div>
    </div>
  );
}
