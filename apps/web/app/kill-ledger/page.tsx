/**
 * /kill-ledger — Public record of failed strategies.
 *
 * Thesis: "We test the strategies this industry sells. When they fail,
 * we publish the failure."
 *
 * Four entries from pre-registered research:
 *   - L-15  market-level close-prediction
 *   - L-16A per-book shading
 *   - L-16B cross-book lead-lag
 *   - L-17  price-path geometry
 *
 * Each entry renders: mechanism, pre-registered rule, observed numbers,
 * verdict, and a link to the evidence doc path.
 *
 * Copy rules: no banned claim words. Every entry names its pre-registered
 * threshold. Closing line: "We test things so you don't have to learn the
 * hard way."
 */

import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { BRAND_NAME } from "@/lib/brand";
import { jsonLdScript } from "@/lib/seo/json-ld";
import { SITE_URL } from "@/lib/seo/site-url";

export const metadata: Metadata = {
  title: `Kill Ledger · ${BRAND_NAME}`,
  description:
    "We test the strategies this industry sells. When they fail, we publish the failure.",
  alternates: { canonical: "/kill-ledger" },
  openGraph: {
    title: `Kill Ledger · ${BRAND_NAME}`,
    description:
      "Pre-registered research results: what we tested, what the numbers said, and why we are not selling it.",
    url: "/kill-ledger",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `Kill Ledger · ${BRAND_NAME}`,
    description:
      "These are things we tested and found not to work. We publish them so you do not pay for the same mistakes.",
  },
};

interface Entry {
  readonly id: string;
  readonly label: string;
  readonly title: string;
  readonly dated: string;
  readonly mechanism: string;
  readonly rule: string;
  readonly observed: string;
  readonly verdict: string;
  readonly evidence: string;
  readonly evidenceLabel: string;
}

const ENTRIES: readonly Entry[] = [
  {
    id: "l15",
    label: "L-15",
    title: "Market-level close-prediction",
    dated: "2026-08-19",
    mechanism:
      "A Ridge model on 5-fold grouped cross-validation by game, predicting the change in median Shin no-vig probability from entry snapshot to closing line. The pre-registered model used the full pre-entry feature set (alpha = 1.0); a post-hoc entry-probability-only Ridge was run as the diagnostic that exposed the artifact. 776 entry-window labels across 216 games, drawn from the 241-game clean-close corpus.",
    rule:
      "Pre-registered decision threshold: grouped-CV Spearman r ≥ 0.15 continue; r < 0.10 stop, no appeal.",
    observed:
      "Totals grouped-CV Spearman r = 0.490. That number looks promising, but it is a textbook corr(X, Y−X) artifact: corr(p_entry, p_close) = 0.40, so corr(p_entry, Δ) = −0.51 by identity. A Ridge on p_entry alone matches the full model (r = 0.503, R² = 0.284). Moneyline grouped-CV r = 0.091 with negative R². Totals no-vig P(over) itself sits in a narrow band around 50% (standard deviation 1.35 percentage points), which is what makes the artifact dominate.",
    verdict:
      "Kill. The apparent signal is measurement error dressed up as forecast skill. There is no tradable close-prediction edge at public-data cadence on this corpus.",
    evidence: "docs/ops/hermes/l15-close-pred-feasibility/RESULTS.md",
    evidenceLabel: "L-15 evidence",
  },
  {
    id: "l16a",
    label: "L-16A",
    title: "Per-book shading",
    dated: "2026-08-19",
    mechanism:
      "For each book, measured the mean deviation of its entry price from the consensus close (e = p_book_entry − p_median_close). Liang-Zeger standard errors clustered by game. Anti-shade bet: when |p_book − p_median_entry| ≥ 0.005, take the opposite side; score CLV against the consensus close.",
    rule:
      "Pre-registered kill clauses: no book has |t| > 2 with n ≥ 50, or no such book shows positive mean CLV on ≥150 bets.",
    observed:
      "11 executable books, 863–947 labels each. The largest absolute t-statistic is betus at +1.48 (mean e = +0.12pp, n = 901). No book clears |t| > 2. On the |deviation| ≥ 0.5pp subset, anti-shade CLV is +1.2 to +1.8pp, but that subset is small and the pattern is outlier noise, not persistent shade.",
    verdict:
      "Dead. No book persistently shades the totals close in a way that survives the pre-registered gate. Do not build a copier or an outlier screen on this corpus.",
    evidence: "docs/ops/hermes/l16-book-microstructure/RESULTS.md",
    evidenceLabel: "L-16A evidence",
  },
  {
    id: "l16b",
    label: "L-16B",
    title: "Cross-book lead-lag",
    dated: "2026-08-19",
    mechanism:
      "At ~19-minute cadence, computed the first-order autocorrelation of each book's price changes (r_b,t = p_b,t − p_b,t−1). A leads B if ρ₁(A,B) > 0.1 and ρ₁(B,A) ≤ 0 with Benjamini-Hochberg q < 0.05. 110 ordered pairs tested; first 120 games for selection, last 121 for holdout CLV.",
    rule:
      "Pre-registered kill clause: no qualifying pair has positive mean CLV on ≥150 holdout trades.",
    observed:
      "Raw-lead count = 0. BH-lead count = 0. The largest raw ρ₁ is bovada → draftkings at 0.075; the reverse is +0.054, so it is not one-way. No pair is simulated because none clears the selection gate.",
    verdict:
      "Dead. No book leads another at this cadence in a way that survives the pre-registered gate. Do not build a copier or a lag-screen on this corpus.",
    evidence: "docs/ops/hermes/l16-book-microstructure/RESULTS.md",
    evidenceLabel: "L-16B evidence",
  },
  {
    id: "l17",
    label: "L-17",
    title: "Price-path geometry",
    dated: "2026-08-19",
    mechanism:
      "Six path-geometry features computed strictly before the pre-entry snapshot: realized variation, increment autocorrelation, sign-change rate, dispersion half-life, cross-sectional skew, and staleness fraction. All six passed decimation. Ridge with alpha = 1.0, grouped 5-fold CV by game, predicting realized CLV on 210 MLB totals games with ≥10 pre-entry snapshots.",
    rule:
      "Pre-registered decision threshold: grouped-CV Spearman r ≥ 0.15 continue; r < 0.10 stop, no appeal.",
    observed:
      "Totals grouped-CV Spearman r = 0.091 (n = 203 games, p = 0.19, R² = −0.049). Moneyline r = −0.047, R² = −0.072. Spreads r = 0.209 with negative R². Mean CLV is −0.00045 (sd 0.010). Univariate realized variation is −0.192, but it is one of six looks and was not used to change the decision.",
    verdict:
      "Stop. The pre-registered rule fires at r < 0.10. The research program ends on this corpus. No booster, no second experiment, no appeal.",
    evidence: "docs/ops/hermes/l17-path-geometry/RESULTS.md",
    evidenceLabel: "L-17 evidence",
  },
];

const killLedgerJsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: `Kill Ledger · ${BRAND_NAME}`,
  description:
    "These are things we tested and found not to work. We publish them so you do not pay for the same mistakes.",
  url: `${SITE_URL}/kill-ledger`,
  itemListElement: ENTRIES.map((entry, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: `${entry.label} ${entry.title}`,
    url: `${SITE_URL}/kill-ledger#${entry.id}`,
  })),
};

function EntryCard({ entry }: { entry: Entry }): JSX.Element {
  return (
    <article
      id={entry.id}
      className="surface-card mt-6 scroll-mt-24 p-6 sm:p-8"
      data-testid={`kill-ledger-entry-${entry.id}`}
    >
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-orbital-cyan">
            {entry.label}
          </p>
          <h2 className="mt-2 text-xl font-bold text-ion-white">{entry.title}</h2>
        </div>
        <time
          dateTime={entry.dated}
          className="shrink-0 font-mono text-xs text-ion-2"
        >
          {entry.dated}
        </time>
      </header>

      <section className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-ion-2">
            Mechanism
          </h3>
          <p className="text-sm leading-6 text-ion-1">{entry.mechanism}</p>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-ion-2">
            Pre-registered rule
          </h3>
          <p className="text-sm leading-6 text-ion-1">{entry.rule}</p>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-ion-2">
            Observed
          </h3>
          <p className="text-sm leading-6 text-ion-1">{entry.observed}</p>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-ion-2">
            Verdict
          </h3>
          <p className="text-sm leading-6 text-ion-1">{entry.verdict}</p>
        </div>
      </section>

      <footer className="mt-6 border-t border-mineral pt-4">
        {/* Repo is private, so a hyperlink would be dead for the public.
            Cite the evidence artifact by its repository path instead — the
            path is stable, and the full document is available on request. */}
        <p className="text-xs leading-5 text-ion-2">
          {entry.evidenceLabel}:{" "}
          <code className="rounded bg-mineral/40 px-1.5 py-0.5 font-mono text-[11px] text-ion-1">
            {entry.evidence}
          </code>
        </p>
      </footer>
    </article>
  );
}

export default function KillLedgerPage(): JSX.Element {
  return (
    <div className="relative isolate min-h-screen bg-carbon text-ion">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(killLedgerJsonLd) }}
      />
      <Nav />

      <main id="main-content" className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8">
        <header className="border-b border-mineral pb-10">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-orbital-cyan">
            Kill Ledger
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-ion-white sm:text-5xl">
            We test the strategies this industry sells.
            <span className="block text-ion-1">
              When they fail, we publish the failure.
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
            These are not opinions. They are pre-registered experiments with
            fixed decision rules, observed numbers, and a verdict rendered
            against those rules — not against whether we wanted the result to
            be favorable.
          </p>
          <p className="mt-3 text-sm text-ion-2">
            Every entry below is a strategy commonly sold in this industry.
            None of them survived our tests.
          </p>
        </header>

        <section data-testid="kill-ledger-entries">
          {ENTRIES.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </section>

        <section className="border-t border-mineral pt-8">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ion-2">
            Why this exists
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ion-1">
            The sports prediction industry is built on strategies that sound
            plausible and are never tested in the open. We run those tests,
            pre-register the rules before we look at the data, and publish the
            result whether it helps us or hurts us.
          </p>
          <p className="mt-3 text-base font-semibold text-ion-white">
            These are things we tested and found not to work. We publish them
            so you do not pay for the same mistakes.
          </p>
        </section>

        <RiskDisclosure variant="compact" className="text-center" />
      </main>

      <Footer />
    </div>
  );
}
