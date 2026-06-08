import type { ReactNode } from "react";
import { toneClass, type SignalTone } from "@/lib/intelligence/colors";

/**
 * A single stat card: label + big value + optional sublabel + optional accent.
 * Replaces the inline "Metric"/KPI tiles scattered across boards. Server-safe,
 * unified-dark surface. The big value renders in the numerals face with
 * tabular-nums so columns of KPIs line up.
 *
 * Both variants render on the dark canvas: the `paper` variant is a legacy
 * alias (callers on data boards pass it) and resolves to the same dark surface
 * so nothing flips light. Text is AA on dark (ion-white / ion-1 / ion-2).
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

const DARK_VARIANT = {
  wrap: "border-surface-line bg-surface-raised",
  label: "text-ion-2",
  value: "text-ion-white",
  sub: "text-ion-2",
} as const;

const VARIANTS: Record<
  KpiVariant,
  { wrap: string; label: string; value: string; sub: string }
> = {
  // `paper` is a legacy alias → dark, so KPI tiles stay on the unified canvas.
  paper: DARK_VARIANT,
  dark: DARK_VARIANT,
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
