import type { ReactNode } from "react";

/**
 * The "how we read it" definition list — a term + definition card that every
 * board duplicated inline. Reusable, server-safe, paper-surface by default.
 *
 * Pair it with <PageHero aside={<MetricExplainer ... />} />.
 */

export type ExplainerVariant = "paper" | "dark";

export interface MetricTerm {
  term: ReactNode;
  definition: ReactNode;
  /**
   * Stat-envelope fields (stat commandment): the metric's known weakness
   * and what decisions it may honestly inform. Optional during rollout —
   * tests pin which surfaces are fully enveloped; source + timestamp live
   * at view level (sourceIds/generatedAt).
   */
  weakness?: ReactNode;
  decisionUse?: ReactNode;
}

export interface MetricExplainerProps {
  /** Small heading above the list. */
  title?: string;
  terms: ReadonlyArray<MetricTerm>;
  variant?: ExplainerVariant;
  className?: string;
}

const VARIANTS: Record<
  ExplainerVariant,
  { wrap: string; title: string; term: string; def: string }
> = {
  paper: {
    wrap: "border-paper-border bg-paper-raised",
    title: "text-orbital-cyan-on-light",
    term: "text-ink",
    def: "text-ink-1",
  },
  dark: {
    wrap: "border-white/[0.08] bg-white/[0.04]",
    title: "text-orbital-cyan",
    term: "text-white",
    def: "text-ink-300",
  },
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
            <dd className={v.def}>
              {t.definition}
              {t.weakness != null && (
                <span className="mt-1 block text-xs opacity-80">
                  <span className="font-semibold">Known weakness:</span>{" "}
                  {t.weakness}
                </span>
              )}
              {t.decisionUse != null && (
                <span className="mt-1 block text-xs opacity-80">
                  <span className="font-semibold">Decision use:</span>{" "}
                  {t.decisionUse}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
