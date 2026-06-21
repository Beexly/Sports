"use client";

/**
 * HealthRing — A breathing company health gauge.
 *
 * A large luminous ring that pulses gently, with segmented arcs representing
 * different system health metrics. The ring breathes like a living organism.
 * Reduced motion → static.
 */

import { useState } from "react";

export function HealthRing({
  size = 200,
  health = 0.87,
  segments = [
    { label: "Data intake", value: 0.92, color: "#00E5FF" },
    { label: "Model inference", value: 0.85, color: "#7B61FF" },
    { label: "Board state", value: 0.78, color: "#00E5FF" },
    { label: "Media pipeline", value: 0.91, color: "#7B61FF" },
    { label: "Trust ledger", value: 0.96, color: "#00E5FF" },
  ],
}: {
  size?: number;
  health?: number;
  segments?: { label: string; value: number; color: string }[];
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = 4;
  const available = circumference - segments.length * gap;
  const segmentArc = available / segments.length;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth={stroke}
        />
        {/* Segments */}
        {segments.map((seg, i) => {
          const offset = i * (segmentArc + gap);
          const dash = `${segmentArc * seg.value} ${segmentArc * (1 - seg.value) + gap}`;
          const isHovered = hovered === i;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={isHovered ? stroke + 2 : stroke}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              opacity={isHovered ? 1 : 0.75}
              style={{
                filter: isHovered ? `drop-shadow(0 0 8px ${seg.color})` : "none",
                transition: "opacity 0.2s, stroke-width 0.2s",
                animation: `health-ring-breathe 4s ease-in-out infinite`,
                animationDelay: `${i * 0.3}s`,
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer"
            />
          );
        })}
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-numerals text-3xl font-bold text-ion-white" style={{ textShadow: "0 0 20px rgba(0,229,255,0.3)" }}>
          {Math.round(health * 100)}%
        </span>
        <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-ion-2">
          System health
        </span>
      </div>
      {/* Tooltip */}
      {hovered !== null && (
        <div
          className="absolute -bottom-12 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-mineral bg-eclipse px-3 py-1.5"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: segments[hovered]!.color }}>
            {segments[hovered]!.label}
          </p>
          <p className="font-numerals text-sm text-ion-white">{Math.round(segments[hovered]!.value * 100)}%</p>
        </div>
      )}
    </div>
  );
}
