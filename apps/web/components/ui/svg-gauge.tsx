"use client";

/**
 * Animated SVG ring gauge — pure SVG, zero dependencies.
 * Pattern: stroke-dasharray + CSS transition on stroke-dashoffset.
 * Attribution: Inspired by naikus/svg-gauge (MIT, github.com/naikus/svg-gauge)
 */

interface SvgGaugeProps {
  /** Value 0–100 */
  value: number;
  /** Display size in px */
  size?: number;
  /** Stroke width relative to radius */
  strokeWidth?: number;
  /** Track (background arc) color */
  trackColor?: string;
  /** Fill (progress arc) color */
  fillColor?: string;
  /** Label shown in center; defaults to `${value}%` */
  label?: string;
  /** CSS class */
  className?: string;
}

export function SvgGauge({
  value,
  size = 80,
  strokeWidth = 8,
  trackColor = "currentColor",
  fillColor = "currentColor",
  label,
  className,
}: SvgGaugeProps) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - clampedValue / 100);
  const displayLabel = label ?? `${Math.round(clampedValue)}%`;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      role="meter"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${displayLabel} gauge`}
    >
      {/* Track */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
        opacity={0.2}
      />
      {/* Progress arc — starts at 12 o'clock (rotate -90°) */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={fillColor}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dashoffset 0.6s ease-out" }}
      />
      {/* Center label */}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size * 0.2}
        fill="currentColor"
        aria-hidden="true"
      >
        {displayLabel}
      </text>
    </svg>
  );
}
