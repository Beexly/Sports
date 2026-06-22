import type { ReactNode } from "react";

/**
 * The "how we read it" panel — a branded, progressive-disclosure definition
 * list. Each metric shows its term + plain-English definition up front; the
 * deeper envelope (Known weakness + Decision use) is tucked behind a native
 * <details> disclosure so the panel reads clean and expands only when a reader
 * wants the caveats. No JS, fully accessible, reduced-motion safe.
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
  { wrap: string; title: string; term: string; def: string; divide: string; rail: string }
> = {
  paper: {
    wrap: "border-paper-border bg-paper-raised",
    title: "text-orbital-cyan-on-light",
    term: "text-ink",
    def: "text-ink-1",
    divide: "divide-paper-border",
    rail: "border-orbital-cyan-on-light/30",
  },
  dark: {
    wrap: "border-mineral bg-eclipse",
    title: "text-orbital-cyan",
    term: "text-ion-white",
    def: "text-ion-1",
    divide: "divide-mineral/60",
    rail: "border-orbital-cyan/30",
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
      <div className="flex items-center gap-2.5">
        <p className={`font-mono text-xs font-semibold uppercase tracking-[0.16em] ${v.title}`}>
          {title}
        </p>
        <span
          aria-hidden
          className="h-px flex-1"
          style={{ backgroundImage: "var(--signal-fade)", opacity: 0.5 }}
        />
      </div>
      <div className={`mt-4 flex flex-col divide-y ${v.divide} text-sm leading-6`}>
        {terms.map((t, i) => {
          const hasEnvelope = t.weakness != null || t.decisionUse != null;
          if (!hasEnvelope) {
            return (
              <div key={i} className="py-3 first:pt-0 last:pb-0">
                <p className={`font-semibold ${v.term}`}>{t.term}</p>
                <p className={`mt-1 ${v.def}`}>{t.definition}</p>
              </div>
            );
          }
          return (
            <details key={i} className="group py-3 first:pt-0 last:pb-0">
              <summary className="flex cursor-pointer list-none items-start gap-3 [&::-webkit-details-marker]:hidden">
                <span className="flex-1">
                  <span className={`font-semibold ${v.term}`}>{t.term}</span>
                  <span className={`mt-1 block ${v.def}`}>{t.definition}</span>
                </span>
                <span
                  aria-hidden
                  className={`mt-0.5 shrink-0 text-xs transition-transform duration-200 group-open:rotate-90 ${v.title}`}
                >
                  ▸
                </span>
              </summary>
              <div className={`mt-2.5 space-y-1.5 border-l-2 pl-3 ${v.rail}`}>
                {t.weakness != null && (
                  <p className={`text-xs leading-5 ${v.def} opacity-90`}>
                    <span className="font-semibold">Known weakness:</span> {t.weakness}
                  </p>
                )}
                {t.decisionUse != null && (
                  <p className={`text-xs leading-5 ${v.def} opacity-90`}>
                    <span className="font-semibold">Decision use:</span> {t.decisionUse}
                  </p>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
