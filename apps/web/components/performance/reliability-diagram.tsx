"use client";

/**
 * Reliability diagram — the proof surface's flagship visual.
 *
 * A proper calibration scatter plot:
 *   - X axis = expected win rate (confidence / 100)
 *   - Y axis = observed win rate per bucket
 *   - Diagonal = perfect calibration
 *   - Points = (expected, observed) per populated bucket
 *   - Error bars = 95% Wilson CI on observed rate
 *   - Below-diagonal = overconfident; above = underconfident
 *
 * Pure SVG, no charting dependency. Client component for intersection-observer
 * reveal animation (same pattern as calibration-curve.tsx).
 */

import { useEffect, useRef, useState } from "react";
import { NUMERIC_TEXT_CLASS } from "@/lib/format/stat";

export interface ReliabilityPoint {
  readonly label: string;
  readonly expectedWinRate: number;
  readonly observedWinRate: number;
  readonly wilsonLow: number;
  readonly wilsonHigh: number;
  readonly sampleSize: number;
}

interface ReliabilityDiagramProps {
  readonly points: readonly ReliabilityPoint[];
  readonly sampleSize: number;
}

const W = 400;
const H = 300;
const PAD_L = 44;
const PAD_R = 20;
const PAD_T = 20;
const PAD_B = 36;
const INNER_W = W - PAD_L - PAD_R;
const INNER_H = H - PAD_T - PAD_B;

function toX(rate: number): number {
  return PAD_L + Math.max(0, Math.min(1, rate)) * INNER_W;
}
function toY(rate: number): number {
  return H - PAD_B - Math.max(0, Math.min(1, rate)) * INNER_H;
}

const TICK_LABELS = [0, 0.25, 0.5, 0.75, 1.0];

export function ReliabilityDiagram({ points, sampleSize }: ReliabilityDiagramProps) {
  const ref = useRef<SVGSVGElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const populated = points.filter((p) => p.sampleSize > 0);
  const isEmpty = populated.length === 0;

  return (
    <figure aria-label="Calibration reliability diagram" className="w-full">
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Reliability diagram — ${sampleSize} settled picks`}
        className="h-auto w-full"
        data-testid="reliability-diagram"
      >
        {/* Grid lines */}
        {TICK_LABELS.map((t) => (
          <g key={t}>
            <line
              x1={toX(t)}
              y1={PAD_T}
              x2={toX(t)}
              y2={H - PAD_B}
              stroke="currentColor"
              className="text-titanium/50"
              strokeWidth="0.5"
            />
            <line
              x1={PAD_L}
              y1={toY(t)}
              x2={W - PAD_R}
              y2={toY(t)}
              stroke="currentColor"
              className="text-titanium/50"
              strokeWidth="0.5"
            />
            {/* X axis tick labels */}
            <text
              x={toX(t)}
              y={H - PAD_B + 14}
              textAnchor="middle"
              className="fill-ion-3 font-mono text-[9px]"
            >
              {Math.round(t * 100)}%
            </text>
            {/* Y axis tick labels */}
            <text
              x={PAD_L - 6}
              y={toY(t) + 3}
              textAnchor="end"
              className="fill-ion-3 font-mono text-[9px]"
            >
              {Math.round(t * 100)}%
            </text>
          </g>
        ))}

        {/* Axes */}
        <line
          x1={PAD_L}
          y1={H - PAD_B}
          x2={W - PAD_R}
          y2={H - PAD_B}
          className="stroke-titanium"
          strokeWidth="1"
        />
        <line
          x1={PAD_L}
          y1={PAD_T}
          x2={PAD_L}
          y2={H - PAD_B}
          className="stroke-titanium"
          strokeWidth="1"
        />

        {/* Perfect calibration diagonal */}
        <line
          x1={toX(0)}
          y1={toY(0)}
          x2={toX(1)}
          y2={toY(1)}
          className="stroke-ion-3"
          strokeWidth="1.5"
          strokeDasharray="6 5"
          aria-label="Perfect calibration line"
        />
        <text
          x={toX(0.85)}
          y={toY(0.85) - 10}
          className="fill-ion-3 font-mono text-[9px]"
          textAnchor="middle"
        >
          ideal
        </text>

        {/* Break-even horizontal (52.4%) — ATS context reference */}
        <line
          x1={PAD_L}
          y1={toY(0.524)}
          x2={W - PAD_R}
          y2={toY(0.524)}
          stroke="currentColor"
          className="text-caution/40"
          strokeWidth="1"
          strokeDasharray="3 4"
        />
        <text
          x={W - PAD_R - 2}
          y={toY(0.524) - 4}
          textAnchor="end"
          className="fill-caution/60 font-mono text-[8px]"
        >
          52.4% break-even
        </text>

        {isEmpty ? (
          <g>
            <circle cx={W / 2} cy={H / 2} r={46} className="fill-eclipse stroke-mineral" strokeWidth="1.5" />
            <text x={W / 2} y={H / 2 - 4} textAnchor="middle" className="fill-orbital-cyan font-mono text-[16px] font-semibold">
              {sampleSize}/30
            </text>
            <text x={W / 2} y={H / 2 + 14} textAnchor="middle" className="fill-ion-2 font-mono text-[10px]">
              settled picks
            </text>
          </g>
        ) : (
          populated.map((p) => {
            const cx = toX(p.expectedWinRate);
            const cy = toY(p.observedWinRate);
            const errTop = toY(p.wilsonHigh);
            const errBot = toY(p.wilsonLow);
            const TICK = 5;
            return (
              <g
                key={p.label}
                className="transition-opacity duration-500"
                style={{ opacity: visible ? 1 : 0 }}
              >
                {/* Wilson CI bar */}
                <line
                  x1={cx}
                  y1={errTop}
                  x2={cx}
                  y2={errBot}
                  className="stroke-orbital-cyan/30"
                  strokeWidth="1.5"
                />
                <line x1={cx - TICK} y1={errTop} x2={cx + TICK} y2={errTop} className="stroke-orbital-cyan/30" strokeWidth="1.5" />
                <line x1={cx - TICK} y1={errBot} x2={cx + TICK} y2={errBot} className="stroke-orbital-cyan/30" strokeWidth="1.5" />
                {/* Point */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={Math.max(4, Math.min(9, Math.sqrt(p.sampleSize) * 0.6))}
                  className="fill-carbon stroke-orbital-cyan"
                  strokeWidth="2"
                />
                {/* Bucket label */}
                <text
                  x={cx + 10}
                  y={cy - 6}
                  className="fill-ion-1 font-mono text-[9px]"
                >
                  {p.label}
                </text>
              </g>
            );
          })
        )}

        {/* Axis labels */}
        <text x={PAD_L + INNER_W / 2} y={H - 2} textAnchor="middle" className="fill-ion-2 font-mono text-[10px]">
          expected win rate (confidence / 100)
        </text>
        <text
          x={10}
          y={PAD_T + INNER_H / 2}
          textAnchor="middle"
          className="fill-ion-2 font-mono text-[10px]"
          transform={`rotate(-90 10 ${PAD_T + INNER_H / 2})`}
        >
          observed win rate
        </text>
      </svg>
      <figcaption className={`mt-2 text-center text-[11px] text-ion-3 ${NUMERIC_TEXT_CLASS}`}>
        Points = (expected, observed) per confidence bucket · Error bars = 95% Wilson CI
        {populated.length > 0
          ? ` · Dot size ∝ √n · Dashed diagonal = perfect calibration`
          : ""}
      </figcaption>
    </figure>
  );
}
