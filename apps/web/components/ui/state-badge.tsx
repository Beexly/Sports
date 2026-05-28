import type { ReactNode } from "react";

/**
 * StateBadge — canonical surface-state primitive.
 *
 * Every public surface in Galaxy Sports Edge can be in one of seven
 * readiness states. The badge sits at the top of the hero and tells
 * the visitor — before any sample content is shown — exactly what
 * they are looking at. Demo data, beta access, waitlist, or live.
 *
 * Used by /fantasy, /market-gravity, /brain, /rumor-radar, /developer,
 * /intelligence, and any future public surface.
 *
 * Honesty is the moat. This component exists so demo content is never
 * mistaken for live data, and live data is never under-promoted as demo.
 */

export type StateBadgeState =
  | "live"
  | "preview"
  | "beta"
  | "demo"
  | "waitlist"
  | "internal"
  | "locked";

interface StateBadgeProps {
  state: StateBadgeState;
  detail?: ReactNode;
  /** Override the default label for the state (e.g. "Beta · Gated"). */
  label?: string;
  className?: string;
}

const STATE_CONFIG: Record<
  StateBadgeState,
  {
    label: string;
    border: string;
    bg: string;
    text: string;
    detailText: string;
  }
> = {
  live: {
    label: "Live",
    border: "border-emerald-900",
    bg: "bg-emerald-950/40",
    text: "text-emerald-300",
    detailText: "text-emerald-200",
  },
  preview: {
    label: "Preview",
    border: "border-cyan-900",
    bg: "bg-cyan-950/40",
    text: "text-ion-blue",
    detailText: "text-cyan-200",
  },
  beta: {
    label: "Beta",
    border: "border-purple-900",
    bg: "bg-purple-950/40",
    text: "text-purple-300",
    detailText: "text-purple-200",
  },
  demo: {
    label: "Demo",
    border: "border-yellow-900",
    bg: "bg-yellow-950/40",
    text: "text-yellow-300",
    detailText: "text-yellow-200",
  },
  waitlist: {
    label: "Waitlist",
    border: "border-cyan-900",
    bg: "bg-cyan-950/40",
    text: "text-ion-blue",
    detailText: "text-cyan-200",
  },
  internal: {
    label: "Internal",
    border: "border-gray-700",
    bg: "bg-gray-900/60",
    text: "text-gray-300",
    detailText: "text-gray-400",
  },
  locked: {
    label: "Locked",
    border: "border-red-900",
    bg: "bg-red-950/40",
    text: "text-red-300",
    detailText: "text-red-200",
  },
};

export function StateBadge({
  state,
  detail,
  label,
  className,
}: StateBadgeProps): JSX.Element {
  const config = STATE_CONFIG[state];
  return (
    <div
      data-state={state}
      data-testid={`state-badge-${state}`}
      className={[
        "inline-flex items-center gap-2 border px-3 py-1",
        config.border,
        config.bg,
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        className={`font-mono text-[10px] uppercase tracking-[0.18em] ${config.text}`}
      >
        {label ?? config.label}
      </span>
      {detail && <span className={`text-xs ${config.detailText}`}>{detail}</span>}
    </div>
  );
}
