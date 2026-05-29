/**
 * Calibration Constellation — the model's shape as a single image.
 *
 * Each settled canonical pick is a point in (confidence × outcome) space.
 * The perfectly-calibrated line is the diagonal. The actual constellation
 * is what we publish.
 *
 * Empty today, populated tomorrow. No mocks, no fabrication. The empty
 * state is the message.
 */

import * as React from "react";

export interface ConstellationPoint {
  readonly confidence: number;     // 0-100
  readonly outcome: 0 | 1;          // 0 = LOSS, 1 = WIN; pushes are excluded
  readonly label?: string;
}

export interface CalibrationConstellationProps {
  readonly points: ReadonlyArray<ConstellationPoint>;
  readonly sampleSize: number;
  readonly width?: number;
  readonly height?: number;
  readonly className?: string;
}

const DEFAULT_WIDTH = 720;
const DEFAULT_HEIGHT = 360;
const PADDING = 32;

export function CalibrationConstellation({
  points,
  sampleSize,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  className,
}: CalibrationConstellationProps): JSX.Element {
  const isEmpty = points.length === 0;

  const innerW = width - 2 * PADDING;
  const innerH = height - 2 * PADDING;

  // x: confidence 50..100 maps left..right
  // y: outcome 0 (top) .. 1 (bottom inverted; outcomes are binned)
  // For visualization, group by bucket and show observed win rate per bucket.
  const buckets = [
    { label: "50-59", min: 50, max: 59 },
    { label: "60-69", min: 60, max: 69 },
    { label: "70-79", min: 70, max: 79 },
    { label: "80-89", min: 80, max: 89 },
    { label: "90-100", min: 90, max: 100 },
  ];

  const bucketStats = buckets.map((b) => {
    const inBucket = points.filter((p) => p.confidence >= b.min && p.confidence <= b.max);
    const wins = inBucket.filter((p) => p.outcome === 1).length;
    const total = inBucket.length;
    return {
      ...b,
      observedRate: total > 0 ? wins / total : null,
      sampleSize: total,
    };
  });

  const xOf = (confidence: number): number => {
    const t = (confidence - 50) / 50; // 0..1
    return PADDING + t * innerW;
  };
  const yOf = (rate: number): number => {
    // rate 0..1; invert so rate=1 is at top
    return PADDING + (1 - rate) * innerH;
  };

  // Perfect calibration line: from (50, 0.5) to (100, 1.0)
  const x1 = xOf(50);
  const y1 = yOf(0.5);
  const x2 = xOf(100);
  const y2 = yOf(1.0);

  return (
    <figure className={className} aria-label="Calibration constellation">
      <div className="rounded-2xl border border-mineral bg-gray-900/55 p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ion-blue">
              Calibration constellation
            </p>
            <p className="mt-1 text-sm text-gray-400">
              {isEmpty
                ? "No settled canonical picks yet. The diagonal is what perfect calibration looks like."
                : `${sampleSize} settled canonical picks plotted by bucket against the perfect-calibration line.`}
            </p>
          </div>
          <span className="font-mono text-[9px] uppercase tracking-widest text-gray-500">
            n = {sampleSize}
          </span>
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          height="auto"
          role="img"
          aria-labelledby="constellation-title"
        >
          <title id="constellation-title">
            Calibration constellation — confidence on the x axis, observed win rate on the y axis.
          </title>
          {/* Axes */}
          <line x1={PADDING} y1={PADDING} x2={PADDING} y2={height - PADDING} stroke="#374151" strokeWidth="1" />
          <line
            x1={PADDING}
            y1={height - PADDING}
            x2={width - PADDING}
            y2={height - PADDING}
            stroke="#374151"
            strokeWidth="1"
          />

          {/* Perfect-calibration diagonal */}
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#06b6d4"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.6"
          />

          {/* Bucket points (only when data exists) */}
          {bucketStats.map((b) => {
            if (b.observedRate === null) return null;
            const cx = xOf((b.min + b.max) / 2);
            const cy = yOf(b.observedRate);
            const r = Math.min(14, Math.max(4, Math.sqrt(b.sampleSize) * 2));
            return (
              <g key={b.label}>
                <circle cx={cx} cy={cy} r={r} fill="#22d3ee" opacity="0.7" />
                <circle cx={cx} cy={cy} r={r + 2} fill="none" stroke="#22d3ee" opacity="0.3" />
                <text
                  x={cx}
                  y={cy - r - 6}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#a5f3fc"
                  fontFamily="monospace"
                >
                  {b.label}
                </text>
              </g>
            );
          })}

          {/* Axis labels */}
          <text x={PADDING} y={height - 8} fontSize="10" fill="#6b7280" fontFamily="monospace">
            50 confidence
          </text>
          <text x={width - PADDING - 48} y={height - 8} fontSize="10" fill="#6b7280" fontFamily="monospace">
            100 confidence
          </text>
          <text
            x={PADDING - 10}
            y={PADDING + 8}
            fontSize="10"
            fill="#6b7280"
            fontFamily="monospace"
            textAnchor="end"
          >
            100% wins
          </text>
          <text
            x={PADDING - 10}
            y={height - PADDING}
            fontSize="10"
            fill="#6b7280"
            fontFamily="monospace"
            textAnchor="end"
          >
            0% wins
          </text>
        </svg>

        {isEmpty && (
          <p className="mt-4 text-xs leading-relaxed text-gray-500">
            The diagonal cyan line is perfect calibration: if the model says 70% confidence, 70% of those picks should win.
            Real constellations have scatter — points above the line mean the model is too cautious; below means too aggressive.
            Galaxy publishes the scatter once canonical history accumulates.
          </p>
        )}
      </div>
    </figure>
  );
}
