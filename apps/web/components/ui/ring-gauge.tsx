/**
 * RingGauge — a pure-SVG circular progress gauge (no client JS).
 *
 * Used for headline percentages where a ring reads faster than a number alone
 * (e.g. the Calibration Report win-rate). The arc fill animates via a CSS
 * transition on stroke-dasharray; the global reduced-motion rule neutralizes it.
 *
 * Render ONLY real, computed values — never a placeholder percentage. Callers
 * gate on real data and pass the formatted `display` string themselves.
 */

interface RingGaugeProps {
  /** Arc fill, 0–100. */
  readonly value: number;
  /** Centered text (already formatted, e.g. "54.2%"). */
  readonly display: string;
  /** Small label under the value. */
  readonly caption?: string;
  /** Pixel size of the square SVG. Default 132. */
  readonly size?: number;
  /** Arc color. Default orbital cyan. */
  readonly color?: string;
}

export function RingGauge({
  value,
  display,
  caption,
  size = 132,
  color = "#00E5FF",
}: RingGaugeProps): JSX.Element {
  const pct = Math.min(100, Math.max(0, value));
  const r = size * 0.4;
  const cx = size / 2;
  const circ = 2 * Math.PI * r;
  const filled = (pct / 100) * circ;
  const sw = size * 0.07;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={sw} />
          <circle
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circ - filled}`}
            style={{ filter: `drop-shadow(0 0 6px ${color}88)`, transition: "stroke-dasharray 1.1s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-2xl font-bold tabular-nums text-white">{display}</span>
        </div>
      </div>
      {caption ? (
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">{caption}</p>
      ) : null}
    </div>
  );
}
