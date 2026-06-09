/**
 * Methodology / Trust Section
 *
 * Outcome-framed trust surface for the homepage. Each card says what the
 * customer GETS from a GSE Rating — not how the number is produced. The
 * recipe (data sources, factor anchors, formulas) stays off the public
 * surface by design.
 *
 * Every card still maps to an APPROVED or GATED entry in the Trust Claim
 * Registry via `data-claim-id`, so the public-copy scanner and source
 * review can audit what we assert. The visible copy is written here,
 * outcome-first, rather than echoing the registry's internal phrasing.
 *
 * This component never invents social proof.
 */

interface TrustCard {
  readonly title: string;
  readonly body: string;
  /** Registry claim this card is accountable to (for audit + scanner). */
  readonly claimId: string;
  /** Optional small line under the body. */
  readonly hint?: string;
  readonly accent: "score" | "proof" | "honest";
}

const CARDS: readonly TrustCard[] = [
  {
    title: "One number you can act on",
    body: "Every matchup gets a GSE Rating. You read the score and decide. No spreadsheet, no homework, no guessing what matters.",
    claimId: "methodology.confidence-presentation",
    accent: "score",
  },
  {
    title: "Graded against the closing line",
    body: "We hold our ratings up to where the market actually landed and show you how they held up. The proof lives on the record, not in a sales pitch.",
    claimId: "performance.public-stats-gated",
    hint: "When win-loss numbers appear on the Performance page, you also see the period, the sample size, and exactly how win rate is counted.",
    accent: "proof",
  },
  {
    title: "Dashes, never filler",
    body: "When the data behind a game isn't sufficient, you get a dash. Nothing on the board is invented to look busy.",
    claimId: "methodology.data-freshness",
    accent: "honest",
  },
];

function cardAccent(accent: TrustCard["accent"]): string {
  switch (accent) {
    case "proof":
      return "text-ultraviolet";
    case "honest":
      return "text-plasma";
    case "score":
    default:
      return "text-orbital-cyan";
  }
}

export function MethodologySection() {
  return (
    <section
      data-testid="methodology-section"
      className="relative isolate border-y border-mineral bg-carbon px-4 py-20 sm:px-6 lg:px-8"
      aria-labelledby="methodology-heading"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-rule-fade" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-rule-fade" aria-hidden="true" />
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <h2
            id="methodology-heading"
            className="font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl"
          >
            The score is the product
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-ion sm:text-lg">
            We do the work and hand you one rating per game. You see how it holds
            up against the market, and a dash whenever the read isn&apos;t there.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
          {CARDS.map((card) => (
            <article
              key={card.claimId}
              data-claim-id={card.claimId}
              className="surface-card flex min-h-full flex-col gap-4 p-5 transition-colors hover:border-mineral-hi"
            >
              <div className="flex items-center gap-3">
                <span className={`h-2 w-2 rounded-full bg-current ${cardAccent(card.accent)}`} aria-hidden="true" />
                <span className="h-px flex-1 bg-mineral" aria-hidden="true" />
              </div>
              <h3 className="text-base font-semibold leading-snug text-ion-white">{card.title}</h3>
              <p className="text-sm leading-6 text-ion">{card.body}</p>
              {card.hint && (
                <p className="mt-auto border-t border-mineral pt-4 text-xs leading-5 text-ion-1">
                  {card.hint}
                </p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
