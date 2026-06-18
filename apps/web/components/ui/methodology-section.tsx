import { getClaim } from "@/lib/trust-claims";

/**
 * Methodology / Trust Section
 *
 * Replaces the legacy hard-coded testimonials area on the homepage with
 * a factual explanation of how the platform actually evaluates picks.
 *
 * The bullets are sourced from the Trust Claim Registry — anything shown
 * here is either an APPROVED METHODOLOGY/DATA_TRANSPARENCY claim or a
 * GATED PERFORMANCE claim flagged with its readiness gate.
 *
 * This component never invents social proof. It exists specifically so
 * the homepage has substantive trust signal without making unsupported
 * claims about user count, verification, or track record.
 */

interface MethodologyItem {
  readonly title: string;
  readonly claimId: string;
  readonly hint?: string; // small explanatory text under the body
  readonly lane: "data" | "model" | "gate";
}

const ITEMS: readonly MethodologyItem[] = [
  {
    title: "Live odds ingestion",
    claimId: "methodology.odds-ingestion",
    lane: "data",
  },
  {
    title: "Bookmaker coverage as a transparency signal",
    claimId: "methodology.bookmaker-coverage",
    lane: "data",
  },
  {
    title: "Data freshness on every pick",
    claimId: "methodology.data-freshness",
    lane: "data",
  },
  {
    title: "Calibrated confidence presentation",
    claimId: "methodology.confidence-presentation",
    hint: "Until we have enough settled outcomes to calibrate against, confidence is shown as a label, not a number.",
    lane: "model",
  },
  {
    title: "Risk level on every pick",
    claimId: "methodology.risk-levels",
    lane: "model",
  },
  {
    title: "Factor breakdown for subscribers",
    claimId: "methodology.factor-breakdown",
    lane: "model",
  },
  {
    title: "Public performance is gated, not advertised",
    claimId: "performance.public-stats-gated",
    hint: "When you see win-loss numbers on the Performance page, you'll also see the period, sample size, model version, and the exact win-rate definition.",
    lane: "gate",
  },
];

function laneAccent(lane: MethodologyItem["lane"]): string {
  switch (lane) {
    case "model":
      return "text-ultraviolet";
    case "gate":
      return "text-plasma";
    case "data":
    default:
      return "text-orbital-cyan";
  }
}

export function MethodologySection() {
  // Resolve each item against the registry. We use getClaim() so both APPROVED
  // and GATED entries surface — the GATED ones (e.g. performance.public-stats-gated)
  // describe the *policy* about when public stats appear, which is itself an
  // approved methodology claim to make publicly.
  const resolved = ITEMS.map((item) => ({
    item,
    claim: getClaim(item.claimId),
  }));

  return (
    <section
      data-testid="methodology-section"
      className="relative isolate border-y border-white/[0.08] bg-carbon px-4 py-20 sm:px-6 lg:px-8"
      aria-labelledby="methodology-heading"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-rule-fade" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-rule-fade" aria-hidden="true" />
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow text-ink-300">Methodology / Trust Surface</p>
          <h2
            id="methodology-heading"
            className="mt-4 font-display text-4xl font-semibold leading-[1.02] text-white sm:text-6xl"
          >
            The audit trail behind every signal
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-ion sm:text-lg">
            Every published pick ties back to live markets, timestamped data,
            factor scoring, and the gates that keep weak picks off the board.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resolved.map(({ item, claim }) => (
            <article
              key={item.claimId}
              data-claim-id={item.claimId}
              className="surface-card flex min-h-full flex-col gap-4 p-5 transition-colors hover:border-white/[0.08]-hi"
            >
              <div className="flex items-center justify-between gap-3">
                <p className={`font-mono text-[10px] uppercase tracking-[0.16em] ${laneAccent(item.lane)}`}>
                  {item.lane}
                </p>
                <span className="h-px flex-1 bg-mineral" aria-hidden="true" />
              </div>
              <h3 className="text-base font-semibold leading-snug text-white">{item.title}</h3>
              <p className="text-sm leading-6 text-ion">
                {claim?.copy ?? ""}
              </p>
              {item.hint && (
                <p className="mt-auto border-t border-white/[0.08] pt-4 text-xs leading-5 text-ink-300">
                  {item.hint}
                </p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
