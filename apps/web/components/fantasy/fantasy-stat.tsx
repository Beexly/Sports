/**
 * FantasyStat: the one stat pattern across the fantasy suite.
 *
 * Small mono uppercase label above a larger tabular numeral, the same shape
 * the betting side uses (components/ui/kpi-card.tsx) without the card chrome,
 * so it can sit inside rows, cards, and summary bands alike. The numeral is
 * always the visually dominant element; pick `size` so the primary number of
 * a row or card is the largest one on it.
 *
 * Server-safe (no hooks), so both server pages and client tools can use it.
 */

import type { ReactNode } from "react";

export type FantasyStatSize = "xs" | "sm" | "md" | "lg" | "xl";

const VALUE_SIZE: Record<FantasyStatSize, string> = {
  xs: "text-sm",
  sm: "text-base",
  md: "text-xl",
  lg: "text-3xl",
  xl: "text-5xl",
};

export function FantasyStat({
  label,
  value,
  sub,
  size = "md",
  align = "left",
  tone,
  title,
  className = "",
  testId,
}: {
  label: ReactNode;
  value: ReactNode;
  /** Optional quiet line under the numeral (a range, a unit, a comparison). */
  sub?: ReactNode;
  size?: FantasyStatSize;
  align?: "left" | "right" | "center";
  /** CSS color (a design-token var) for the numeral. Defaults to ion-white. */
  tone?: string;
  /** Native tooltip, used to spell out an abbreviated label. */
  title?: string;
  className?: string;
  testId?: string;
}) {
  const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <div className={`min-w-0 ${alignClass} ${className}`.trim()} title={title} data-testid={testId}>
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ion-2">{label}</p>
      <p
        className={`mt-1 font-numerals font-semibold leading-none tabular-nums ${VALUE_SIZE[size]} ${tone ? "" : "text-ion-white"}`.trim()}
        style={tone ? { color: tone } : undefined}
      >
        {value}
      </p>
      {sub != null && sub !== "" && (
        <p className="mt-1 font-mono text-[11px] tabular-nums text-ion-2">{sub}</p>
      )}
    </div>
  );
}
