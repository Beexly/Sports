import type { ReactNode } from "react";

/**
 * The "how we read it" definition list — a term + definition card that every
 * board duplicated inline. Reusable, server-safe, unified-dark surface.
 *
 * Pair it with <PageHero aside={<MetricExplainer ... />} />.
 *
 * Both variants now render on the dark canvas: the `paper` variant is kept as a
 * legacy alias (callers pass `variant="paper"` on data boards) and resolves to
 * the same dark surface so nothing flips light. All text is AA on dark
 * (ion-white / ion-1) and the title uses the brand orbital cyan.
 */

export type ExplainerVariant = "paper" | "dark";

export interface MetricTerm {
  term: ReactNode;
  definition: ReactNode;
}

export interface MetricExplainerProps {
  /** Small heading above the list. */
  title?: string;
  terms: ReadonlyArray<MetricTerm>;
  variant?: ExplainerVariant;
  className?: string;
}

const DARK_VARIANT = {
  wrap: "border-surface-line bg-surface-raised",
  title: "text-orbital-cyan",
  term: "text-ion-white",
  def: "text-ion-1",
} as const;

const VARIANTS: Record<
  ExplainerVariant,
  { wrap: string; title: string; term: string; def: string }
> = {
  // `paper` is a legacy alias → dark, so data boards stay on the unified canvas.
  paper: DARK_VARIANT,
  dark: DARK_VARIANT,
};

export function MetricExplainer({
  title = "How we read it",
  terms,
  variant = "paper",
  className = "",
}: MetricExplainerProps): JSX.Element {
  const v = VARIANTS[variant];
  return (
    <div className={`rounded-ds-md border p-5 ${v.wrap} ${className}`}>
      <p className={`font-mono text-xs font-semibold uppercase tracking-[0.16em] ${v.title}`}>
        {title}
      </p>
      <dl className="mt-4 space-y-3 text-sm leading-6">
        {terms.map((t, i) => (
          <div key={i}>
            <dt className={`font-semibold ${v.term}`}>{t.term}</dt>
            <dd className={v.def}>{t.definition}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
