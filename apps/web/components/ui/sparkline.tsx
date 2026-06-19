"use client";

/**
 * Pure SVG sparkline — zero npm dependencies.
 * Re-implemented TS-native. Inspired by the math pattern common in MIT-licensed
 * sparkline libs (recharts, react-sparklines, etc.).
 */

interface SparklineProps {
  /** Data points (numbers). Needs ≥2 to render. */
  data: number[];
  width?: number;
  height?: number;
  strokeColor?: string;
  strokeWidth?: number;
  /** When true, fills the area under the line */
  filled?: boolean;
  fillColor?: string;
  /** Accessible label for screen readers */
  "aria-label"?: string;
}

export function Sparkline({
  data,
  width = 80,
  height = 24,
  strokeColor = "currentColor",
  strokeWidth = 1.5,
  filled = false,
  fillColor,
  "aria-label": ariaLabel,
}: SparklineProps) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = strokeWidth;

  const toX = (i: number) => pad + (i / (data.length - 1)) * (width - pad * 2);
  const toY = (v: number) =>
    pad + (1 - (v - min) / range) * (height - pad * 2);

  const points = data.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");

  const fillPath = filled
    ? `M ${toX(0)},${height} ` +
      data.map((v, i) => `L ${toX(i)},${toY(v)}`).join(" ") +
      ` L ${toX(data.length - 1)},${height} Z`
    : undefined;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      role={ariaLabel ? "img" : undefined}
      style={{ overflow: "visible", display: "block" }}
    >
      {filled && fillPath && (
        <path
          d={fillPath}
          fill={fillColor ?? strokeColor}
          fillOpacity={0.15}
          stroke="none"
        />
      )}
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Endpoint dot */}
      <circle
        cx={toX(data.length - 1)}
        cy={toY(data[data.length - 1]!)}
        r={strokeWidth * 1.2}
        fill={strokeColor}
      />
    </svg>
  );
}
