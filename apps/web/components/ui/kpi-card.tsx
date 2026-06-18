import type { ReactNode } from "react";
import { toneClass, type SignalTone } from "@/lib/intelligence/colors";

/**
 * A single stat card: label + big value + optional sublabel + optional accent.
 * Replaces the inline "Metric"/KPI tiles scattered across boards. Server-safe,
 * paper-surface by default. The big value renders in the numerals face with
 * tabular-nums so columns of KPIs line up.
 */

export type KpiVariant = "paper" | "dark";

export interface KpiCardProps {
  label: ReactNode;
  value: ReactNode;
  sublabel?: ReactNode;
  /** Tones the big value (good/bad/neutral) using the shared color helpers. */
  tone?: SignalTone;
  variant?: KpiVariant;
  className?: string;
}

const VARIANTS: Record<
  KpiVariant,
  { wrap: string; label: string; value: string; sub: string }
> = {
  paper: {
    wrap: "border-paper-border bg-paper-raised",
    label: "text-ink-2",
    value: "text-ink",
    sub: "text-ink-2",
  },
  dark: {
    wrap: "border-white/10 bg-white/[0.04]",
    label: "text-ink-300",
    value: "text-white",
    sub: "text-ink-300",
  },
};

export function KpiCard({
  label,
  value,
  sublabel,
  tone,
  variant = "paper",
  className = "",
}: KpiCardProps): JSX.Element {
  const v = VARIANTS[variant];
  const valueColor = tone ? toneClass(tone) : v.value;
  return (
    <div className={`rounded-ds-md border p-5 ${v.wrap} ${className}`}>
      <p className={`font-mono text-xs font-semibold uppercase tracking-[0.14em] ${v.label}`}>
        {label}
      </p>
      <p className={`mt-2 font-numerals text-4xl font-semibold tabular-nums ${valueColor}`}>
        {value}
      </p>
      {sublabel ? <p className={`mt-1 text-xs leading-5 ${v.sub}`}>{sublabel}</p> : null}
    </div>
  );
}
