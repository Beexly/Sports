import { getClaim } from "@/lib/trust-claims";

/**
 * Methodology / Trust Section
 *
 * Replaces the legacy hard-coded testimonials block on the homepage with
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
}

const ITEMS: readonly MethodologyItem[] = [
  {
    title: "Live odds ingestion",
    claimId: "methodology.odds-ingestion",
  },
  {
    title: "Bookmaker coverage as a transparency signal",
    claimId: "methodology.bookmaker-coverage",
  },
  {
    title: "Data freshness on every pick",
    claimId: "methodology.data-freshness",
  },
  {
    title: "Calibrated confidence presentation",
    claimId: "methodology.confidence-presentation",
    hint: "Until we have enough settled outcomes to calibrate against, confidence is shown as a label, not a number.",
  },
  {
    title: "Risk level on every pick",
    claimId: "methodology.risk-levels",
  },
  {
    title: "Factor breakdown for subscribers",
    claimId: "methodology.factor-breakdown",
  },
  {
    title: "Public performance is gated, not advertised",
    claimId: "performance.public-stats-gated",
    hint: "When you see win-loss numbers on the Performance page, you'll also see the period, sample size, model version, and the exact win-rate definition.",
  },
];

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
      className="px-4 py-20 sm:px-6 lg:px-8"
      aria-labelledby="methodology-heading"
    >
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <h2
            id="methodology-heading"
            className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
          >
            The audit trail behind every signal
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-gray-400">
            Every published signal ties back to live markets, timestamped data,
            factor scoring, and the gates that keep weak signals off the board.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {resolved.map(({ item, claim }) => (
            <article
              key={item.claimId}
              data-claim-id={item.claimId}
              className="flex flex-col gap-3 rounded-lg border border-gray-800 bg-gray-900/60 p-6"
            >
              <h3 className="text-base font-semibold text-white">{item.title}</h3>
              <p className="text-sm leading-relaxed text-gray-400">
                {claim?.copy ?? ""}
              </p>
              {item.hint && (
                <p className="text-xs leading-relaxed text-gray-500">
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
