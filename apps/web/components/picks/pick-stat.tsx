import type { ReactNode } from "react";

/**
 * One visual grammar for "a pick", shared by the pick card, the board rows and
 * the game page's reading rows, so the three read as one component family.
 *
 * Type scale (three sizes, nothing in between):
 *   - meta / label: small mono uppercase (league, start time, stat labels)
 *   - pick: the single display size (the selection, or the matchup on a row
 *     that has no selection to show)
 *   - value: the stat numeral (Edge, Confidence, Books, Line)
 *
 * Presentation only. These components render whatever value the caller passes;
 * they never decide whether a value may be shown. Tier redaction happens in the
 * API / loader before anything reaches them.
 */
export const PICK_TYPE = {
  meta: "font-mono text-[11px] uppercase tracking-[0.14em] text-ion-2",
  label: "font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2",
  pick: "font-display text-3xl font-semibold leading-[1.05] tracking-tight",
  value: "font-display text-2xl font-semibold leading-none tabular-nums",
} as const;

export type PickStatTone = "accent" | "default" | "muted";

const TONE: Record<PickStatTone, string> = {
  accent: "text-plasma",
  default: "text-ion-white",
  muted: "text-ion-3",
};

/**
 * The stat row. Always three columns, so Edge / Confidence / Books sit in the
 * same column on every card in a grid and on every row in a list.
 */
export function PickStatRow({
  children,
  className = "",
}: {
  readonly children: ReactNode;
  readonly className?: string;
}): JSX.Element {
  return <dl className={`grid grid-cols-3 gap-x-4 gap-y-3 ${className}`}>{children}</dl>;
}

/** One stat: small mono label above a larger numeral. */
export function PickStat({
  label,
  children,
  tone = "default",
  title,
  dataTestid,
}: {
  readonly label: string;
  readonly children: ReactNode;
  readonly tone?: PickStatTone;
  readonly title?: string;
  readonly dataTestid?: string;
}): JSX.Element {
  return (
    <div className="min-w-0" title={title} {...(dataTestid ? { "data-testid": dataTestid } : {})}>
      <dt className={PICK_TYPE.label}>{label}</dt>
      <dd className={`mt-1.5 ${PICK_TYPE.value} ${TONE[tone]}`}>{children}</dd>
    </div>
  );
}
