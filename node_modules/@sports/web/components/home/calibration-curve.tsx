"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface CalibrationCurvePoint {
  readonly label: string;
  readonly expectedWinRate: number;
  readonly observedWinRate: number;
  readonly sampleSize: number;
  /** Only plot a bucket once it clears the publish floor (30+ settled picks) —
   * a 2-pick bucket reading "100%" must never appear on the curve. */
  readonly sufficientSample: boolean;
}

interface CalibrationCurveProps {
  readonly points: readonly CalibrationCurvePoint[];
  readonly sampleSize: number;
}

const WIDTH = 340;
const HEIGHT = 230;
const PAD = 34;
const INNER_W = WIDTH - PAD * 2;
const INNER_H = HEIGHT - PAD * 2;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function pointToSvg(point: CalibrationCurvePoint): { x: number; y: number } {
  return {
    x: PAD + clamp01(point.expectedWinRate) * INNER_W,
    y: HEIGHT - PAD - clamp01(point.observedWinRate) * INNER_H,
  };
}

function buildPath(points: readonly CalibrationCurvePoint[]): string {
  return points
    .map((point, index) => {
      const svgPoint = pointToSvg(point);
      return `${index === 0 ? "M" : "L"} ${svgPoint.x.toFixed(1)} ${svgPoint.y.toFixed(1)}`;
    })
    .join(" ");
}

export function CalibrationCurve({
  points,
  sampleSize,
}: CalibrationCurveProps): JSX.Element {
  const ref = useRef<SVGSVGElement | null>(null);
  const [visible, setVisible] = useState(false);
  // Plot only buckets that clear the min-sample publish floor; a thin bucket's
  // observed rate is an unsupported claim, so it stays off the curve (the empty
  // state then shows the honest "N/30 settled" collecting view).
  const actualPoints = points.filter((point) => point.sufficientSample);
  const path = useMemo(() => buildPath(actualPoints), [actualPoints]);

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
      { threshold: 0.45 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`Calibration reliability curve with ${sampleSize} settled canonical picks`}
      className="h-auto w-full overflow-visible"
      data-testid="homepage-calibration-curve"
      data-visible={visible ? "true" : "false"}
    >
      <line
        x1={PAD}
        y1={HEIGHT - PAD}
        x2={WIDTH - PAD}
        y2={PAD}
        className="stroke-mineral"
        strokeWidth="1.5"
        strokeDasharray="5 7"
      />
      <line
        x1={PAD}
        y1={HEIGHT - PAD}
        x2={WIDTH - PAD}
        y2={HEIGHT - PAD}
        className="stroke-mineral"
        strokeWidth="1"
      />
      <line
        x1={PAD}
        y1={PAD}
        x2={PAD}
        y2={HEIGHT - PAD}
        className="stroke-mineral"
        strokeWidth="1"
      />
      <text x={PAD} y={HEIGHT - 8} className="fill-ion-2 font-mono text-[10px]">
        predicted
      </text>
      <text
        x={8}
        y={PAD + 6}
        className="fill-ion-2 font-mono text-[10px]"
        transform={`rotate(-90 8 ${PAD + 6})`}
      >
        observed
      </text>
      {actualPoints.length > 1 ? (
        <path
          d={path}
          pathLength="1"
          fill="none"
          className="stroke-orbital-cyan transition-[stroke-dashoffset] duration-[1200ms] ease-[var(--ease-out)] motion-reduce:transition-none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1"
          strokeDashoffset={visible ? "0" : "1"}
        />
      ) : null}
      {actualPoints.map((point) => {
        const svgPoint = pointToSvg(point);
        return (
          <g key={point.label}>
            <circle
              cx={svgPoint.x}
              cy={svgPoint.y}
              r="5"
              className="fill-carbon stroke-orbital-cyan"
              strokeWidth="2"
            />
            <text
              x={svgPoint.x + 8}
              y={svgPoint.y - 8}
              className="fill-ion-1 font-mono text-[10px]"
            >
              {point.label}
            </text>
          </g>
        );
      })}
      {actualPoints.length === 0 ? (
        <g>
          <circle
            cx={WIDTH / 2}
            cy={HEIGHT / 2}
            r="42"
            className="fill-eclipse stroke-mineral"
            strokeWidth="1.5"
          />
          <text
            x={WIDTH / 2}
            y={HEIGHT / 2 - 4}
            textAnchor="middle"
            className="fill-orbital-cyan font-mono text-[18px] font-semibold"
          >
            {sampleSize}/30
          </text>
          <text
            x={WIDTH / 2}
            y={HEIGHT / 2 + 16}
            textAnchor="middle"
            className="fill-ion-2 font-mono text-[10px]"
          >
            settled picks
          </text>
        </g>
      ) : null}
    </svg>
  );
}
