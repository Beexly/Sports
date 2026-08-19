/**
 * /bookgrade — BookGrade + PulseScore v1
 *
 * BookGrade is a quality score, not a betting signal. It tells you what a
 * price historically cost at a book, not which side to take.
 *
 * Data source: apps/web/lib/truthmetrics/bookgrade-v1.ts (L-18 totals only).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { MetricHonesty } from "@/components/ui/metric-honesty";
import { BRAND_NAME } from "@/lib/brand";
import { BOOKGRADE_V1, PULSE_SCORE_V1, BOOKGRADE_PROVENANCE } from "@/lib/truthmetrics/bookgrade-v1";

export const metadata: Metadata = {
  title: `BookGrade · ${BRAND_NAME}`,
  description:
    "Per-book price quality vs consensus close and book update reliability, from the 241-game MLB clean-close corpus.",
  alternates: { canonical: "/bookgrade" },
};

export const dynamic = "force-static";

function formatBpqi(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(2)}pp`;
}

export default function BookGradePage(): JSX.Element {
  const sortedByT = [...BOOKGRADE_V1].sort((a, b) => Math.abs(b.clusteredT) - Math.abs(a.clusteredT));
  const sortedBurs = [...PULSE_SCORE_V1].sort((a, b) => b.burs - a.burs);

  const honestyBlock = {
    measures: "How far each book's closing price historically sat from the cross-book consensus close, on MLB totals markets, averaged across 241 clean-close games.",
    doesNotMeasure: "Which side to bet, whether a book is beatable, or whether a price is wrong. It is a quality score, not a betting signal.",
    caveat: "Totals only. Spread-market BPQI is not shown here because spread numbers differ across books for non-vig reasons. A same-line filter is required before spread BPQI can be treated as price quality.",
  };

  return (
    <div className="relative isolate min-h-screen bg-carbon text-ion">
      <Nav />

      <main id="main-content" className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8">
        <header className="border-b border-mineral pb-10">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-orbital-cyan">
            TruthMetrics
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-ion-white sm:text-5xl">
            BookGrade + PulseScore
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
            BookGrade measures what a price historically cost at a book.
            PulseScore measures how live each book's prices actually are.
            Neither is a betting signal.
          </p>
        </header>

        <section data-testid="bookgrade-mandatory-copy">
          <p className="text-sm font-semibold text-ion-1">
            A quality score, not a betting signal. It tells you what a price
            historically cost at a book, not which side to take.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-mineral bg-eclipse/40 p-6">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-ion-2">
              BookGrade (totals)
            </h2>
            <p className="mt-2 text-xs text-ion-2">
              Mean deviation vs consensus close · clustered t · {BOOKGRADE_PROVENANCE.games} games
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-mineral text-xs uppercase tracking-wider text-ion-2">
                    <th className="pb-2 font-medium">Book</th>
                    <th className="pb-2 font-medium">BPQI</th>
                    <th className="pb-2 font-medium">SE</th>
                    <th className="pb-2 font-medium">t</th>
                    <th className="pb-2 font-medium">Snapshots</th>
                    <th className="pb-2 font-medium">Games</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mineral/60">
                  {sortedByT.map((row) => (
                    <tr key={row.book} className="text-ion-1">
                      <td className="py-2 font-medium text-ion-white">{row.book}</td>
                      <td className="py-2 font-mono">{formatBpqi(row.bpqi)}</td>
                      <td className="py-2 font-mono text-ion-2">{(row.se * 100).toFixed(2)}pp</td>
                      <td className="py-2 font-mono text-ion-2">{row.clusteredT.toFixed(2)}</td>
                      <td className="py-2 font-mono text-ion-2">{row.snapshots.toLocaleString()}</td>
                      <td className="py-2 font-mono text-ion-2">{row.games}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-mineral bg-eclipse/40 p-6">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-ion-2">
              PulseScore
            </h2>
            <p className="mt-2 text-xs text-ion-2">
              Fraction of consecutive polls with a changed quote · higher = more live
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-mineral text-xs uppercase tracking-wider text-ion-2">
                    <th className="pb-2 font-medium">Book</th>
                    <th className="pb-2 font-medium">PulseScore</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mineral/60">
                  {sortedBurs.map((row) => (
                    <tr key={row.book} className="text-ion-1">
                      <td className="py-2 font-medium text-ion-white">{row.book}</td>
                      <td className="py-2 font-mono">{(row.burs * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section data-testid="bookgrade-provenance" className="rounded-2xl border border-mineral bg-eclipse/40 p-6">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-ion-2">
            Provenance
          </h2>
          <p className="mt-2 text-sm leading-6 text-ion-1">
            {BOOKGRADE_PROVENANCE.games} MLB clean-close games · {BOOKGRADE_PROVENANCE.dateRange} · {BOOKGRADE_PROVENANCE.market} · {BOOKGRADE_PROVENANCE.snapshots} · {BOOKGRADE_PROVENANCE.method}.
          </p>
          <div className="mt-4">
            <MetricHonesty
              measures={honestyBlock.measures}
              doesNotMeasure={honestyBlock.doesNotMeasure}
              caveat={honestyBlock.caveat}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-mineral bg-eclipse/40 p-6">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-ion-2">
            Deeper history
          </h2>
          <p className="mt-2 text-sm leading-6 text-ion-1">
            Full historical BookGrade and PulseScore series, per-book trend charts,
            and downloadable series are Pro features. The free surface above shows
            the current v1 numbers only.
          </p>
          <Link
            href="/pricing"
            className="mt-4 inline-block rounded-lg border border-mineral px-4 py-2 text-sm font-semibold text-ion-1 hover:bg-eclipse/80"
          >
            See Pro plans →
          </Link>
        </section>

        <div className="border-t border-mineral pt-8">
          <RiskDisclosure variant="compact" includePastPerformance />
        </div>
      </main>

      <Footer />
    </div>
  );
}
