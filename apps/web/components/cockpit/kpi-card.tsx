/**
 * KpiCard — premium KPI tile for the admin cockpit.
 *
 * Renders a large focal number (via CountUp on the client, or a plain span
 * on the server for SSR), a small uppercase label, an optional delta line,
 * an optional inline SVG sparkline, and a status accent color.
 *
 * HONESTY RULES (non-negotiable):
 * - A `null` value renders "—" plus a muted "unknown" note — never 0.
 * - A real number is animated via CountUp (client) or shown as-is (SSR).
 * - The caller is responsible for passing a real value or null; this component
 *   never fabricates, rounds up, or treats unknown as zero.
 *
 * Server-safe: imports CountUp (a "use client" component) only inside JSX —
 * Next.js renders it as a client island while the card shell stays a server
 * component. No runtime import() needed because Next.js handles the boundary.
 */

import { CountUp } from "@/components/ui/count-up";

// ── Accent colour definitions ─────────────────────────────────────────────────

export type KpiAccent = "neutral" | "positive" | "warning" | "unknown";

const ACCENT_STYLES: Record<
  KpiAccent,
  { border: string; number: string; dot: string }
> = {
  neutral: {
    border: "border-white/[0.06]",
    number: "text-white",
    dot: "bg-sky-400",
  },
  positive: {
    border: "border-emerald-700/40",
    number: "text-emerald-200",
    dot: "bg-emerald-400",
  },
  warning: {
    border: "border-amber-700/40",
    number: "text-amber-200",
    dot: "bg-amber-400",
  },
  unknown: {
    border: "border-white/[0.04]",
    number: "text-ink-500",
    dot: "bg-ink-600",
  },
};

// ── Inline sparkline (pure SVG, no deps) ─────────────────────────────────────

function Sparkline({
  data,
  accent,
}: {
  readonly data: readonly number[];
  readonly accent: KpiAccent;
}): JSX.Element | null {
  if (data.length < 2) return null;

  const W = 64;
  const H = 24;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const polyline = pts.join(" ");

  // Colour: positive → emerald, warning → amber, else sky
  const stroke =
    accent === "positive"
      ? "#34d399"
      : accent === "warning"
      ? "#fbbf24"
      : "#38bdf8";

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
      className="shrink-0 opacity-70"
    >
      <polyline
        points={polyline}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── KpiCard ───────────────────────────────────────────────────────────────────

export interface KpiCardProps {
  /** The numeric value to display. null → renders "—" with an "unknown" note. */
  readonly value: number | null;
  /** Small uppercase label beneath the focal number. */
  readonly label: string;
  /**
   * How to format the number for CountUp:
   * - "integer"  → integer, thousands-grouped
   * - "currency" → prefix="$", integer, grouped
   * - "decimal"  → fixed to `decimals` places
   */
  readonly format?: "integer" | "currency" | "decimal";
  /** Decimal places for format="decimal". Default 1. */
  readonly decimals?: number;
  /**
   * Optional delta line, e.g. "+3 this week" or "MRR × 12 — not a forecast".
   * Rendered in muted ink below the label.
   */
  readonly delta?: string;
  /**
   * Optional sparkline data. An array of at least 2 numbers. If fewer than 2
   * or omitted, the sparkline is hidden.
   */
  readonly sparkline?: readonly number[];
  /** Visual accent colour. Defaults to "neutral". */
  readonly accent?: KpiAccent;
  /** Optional note shown when value is null in place of the generic "unknown". */
  readonly unknownNote?: string;
}

export function KpiCard({
  value,
  label,
  format = "integer",
  decimals = 1,
  delta,
  sparkline,
  accent: accentProp,
  unknownNote,
}: KpiCardProps): JSX.Element {
  const isUnknown = value === null;
  const accent: KpiAccent = accentProp ?? (isUnknown ? "unknown" : "neutral");
  const styles = ACCENT_STYLES[accent];

  // Derive CountUp props from format
  const prefix = format === "currency" ? "$" : undefined;
  const countDecimals = format === "decimal" ? decimals : 0;
  const group = format === "integer" || format === "currency";

  return (
    <div
      className={`surface-card gw-card-hover flex flex-col gap-3 px-5 py-4 ${styles.border}`}
    >
      {/* Dot accent + label row */}
      <div className="flex items-center gap-2">
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${styles.dot}`}
          aria-hidden="true"
        />
        <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">
          {label}
        </p>
      </div>

      {/* Focal number + sparkline */}
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          {isUnknown ? (
            <>
              <p className="font-display text-4xl font-bold tabular-nums text-ink-500">
                —
              </p>
              <p className="mt-1 text-[11px] text-ink-600">
                {unknownNote ?? "unknown"}
              </p>
            </>
          ) : (
            <p className={`font-display text-4xl font-bold tabular-nums ${styles.number}`}>
              <CountUp
                value={value}
                decimals={countDecimals}
                group={group}
                prefix={prefix}
                durationMs={1100}
              />
            </p>
          )}
        </div>

        {!isUnknown && sparkline && sparkline.length >= 2 && (
          <Sparkline data={sparkline} accent={accent} />
        )}
      </div>

      {/* Delta / sub-line */}
      {delta && !isUnknown && (
        <p className="text-[11px] leading-snug text-ink-500">{delta}</p>
      )}
    </div>
  );
}
