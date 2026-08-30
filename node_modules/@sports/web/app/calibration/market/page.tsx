/**
 * /calibration/market — the market-calibration baseline page.
 *
 * The single strongest trust asset a latecomer cannot fake.
 *
 * `apps/web/app/api/calibration/market-backtest/route.ts` and
 * `apps/web/app/api/calibration/elo-backtest/route.ts` are LIVE, public,
 * unauthenticated endpoints backed by `market-backtest.ts` + `elo-backtest.ts`.
 * They de-vig the CLOSING moneyline over the whole HistoricalGame archive
 * (nflverse, 1999→present) and compute real Brier decomposition / ECE /
 * reliability curves against actual outcomes.
 *
 * NO page anywhere consumed them until this one. This page closes that gap:
 * it renders the market's own calibration as the efficient-market baseline the
 * platform model must beat — and the Elo-vs-market comparison showing whether
 * a simple independent model matches the closing line.
 *
 * It is NOT a claim about GSE's picks (those live elsewhere). It is a proof
 * of the denominator: "the close's Brier is X; ours must beat X."
 *
 * Honest empty state is mandatory: when HistoricalGame has no rows the loaders
 * return an explicit "run the backfill" message — surfaced here, never a
 * fabricated or zero-filled chart.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { ReliabilityChart } from "@/components/calibration/reliability-chart";
import { MetricHonesty } from "@/components/ui/metric-honesty";
import { BRAND_NAME } from "@/lib/brand";
import { NUMERIC_TEXT_CLASS } from "@/lib/format/stat";
import { loadMarketCalibrationBacktest } from "@/lib/calibration/market-backtest";
import { loadEloVsMarketBacktest } from "@/lib/calibration/elo-backtest";

export const metadata: Metadata = {
  title: `Market calibration baseline · ${BRAND_NAME}`,
  description:
    "The closing line's own Brier score, ECE, and reliability curve over the full historical archive — the efficient-market baseline the platform model must beat, and an Elo-vs-market comparison. No picks, no fabricated stats.",
  alternates: { canonical: "/calibration/market" },
};

export const dynamic = "force-dynamic";

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-mineral bg-eclipse/40 p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ion-2">{label}</p>
      <p className={`mt-2 text-3xl font-extrabold text-orbital-cyan ${NUMERIC_TEXT_CLASS}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-ion-2">{sub}</p>}
    </div>
  );
}

function MarketSection({
  market,
}: {
  market: Awaited<ReturnType<typeof loadMarketCalibrationBacktest>>;
}) {
  const empty = market.status === "no-data" || market.sampleSize === 0;

  return (
    <section data-testid="market-section" className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-mono text-xs uppercase tracking-[0.16em] text-ion-2">The market baseline</h2>
        {!empty && (
          <p className="text-xs text-ion-2">
            n={market.sampleSize.toLocaleString()} · seasons {market.seasonRange ? `${market.seasonRange.from}–${market.seasonRange.to}` : "—"}
          </p>
        )}
      </div>

      {empty ? (
        <div
          data-testid="market-empty"
          className="rounded-2xl border border-mineral bg-eclipse/40 p-6 text-center"
        >
          <p className="text-sm text-ion-1">{market.note}</p>
          <p className="mt-2 text-xs text-ion-2">
            This chart appears once the historical-games backfill has been run. The closing line&apos;s own
            calibration is the denominator every future claim must beat.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Brier score" value={market.brier.toFixed(4)} sub="lower is better calibrated" />
            <StatCard label="Reliability" value={market.reliability.toFixed(4)} sub="distance from perfect (0)" />
            <StatCard label="Resolution" value={market.resolution.toFixed(4)} sub="discriminative power (higher)" />
            <StatCard label="ECE" value={(market.ece * 100).toFixed(2)} sub="expected calibration error %" />
          </div>

          <div className="max-w-xs">
            <ReliabilityChart bins={market.curve} title="Market reliability curve" className="w-full" />
            <p className="mt-2 text-xs text-ion-2">
              The dashed diagonal is a perfectly-calibrated forecaster. Points below the diagonal mean the market is
              overconfident (predicts more extreme outcomes than reality); above means underconfident.
            </p>
          </div>

          <p className="text-xs text-ion-2">{market.note}</p>
          <p className="text-xs text-ion-3">Generated {market.generatedAt}</p>
        </>
      )}
    </section>
  );
}

function EloSection({
  elo,
}: {
  elo: Awaited<ReturnType<typeof loadEloVsMarketBacktest>>;
}) {
  const empty = elo.status === "no-data" || elo.comparisonSampleSize === 0;

  return (
    <section data-testid="elo-section" className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-mono text-xs uppercase tracking-[0.16em] text-ion-2">Elo vs. the market</h2>
        {!empty && <p className="text-xs text-ion-2">Same {elo.comparisonSampleSize.toLocaleString()} games, two forecasters</p>}
      </div>

      {empty ? (
        <div
          data-testid="elo-empty"
          className="rounded-2xl border border-mineral bg-eclipse/40 p-6 text-center"
        >
          <p className="text-sm text-ion-1">{elo.note}</p>
          <p className="mt-2 text-xs text-ion-2">
            This comparison appears once the historical-games backfill has been run. It answers whether a simple
            results-only model can match the closing line.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Market Brier" value={elo.market.brier.toFixed(4)} sub="de-vigged closing line" />
            <StatCard label="Elo Brier" value={elo.elo.brier.toFixed(4)} sub={`Elo (n=${elo.elo.teamsRated} teams)`} />
            <StatCard
              label="Better calibrated"
              value={elo.betterCalibrated.toUpperCase()}
              sub={elo.betterCalibrated === "tie" ? "Brier scores are equal" : "Lower Brier wins"}
            />
            <StatCard
              label="Elo accuracy"
              value={`${(elo.elo.accuracy * 100).toFixed(1)}%`}
              sub="share of favored home side winning"
            />
          </div>

          <div className="max-w-xs">
            <ReliabilityChart bins={elo.elo.curve} title="Elo reliability curve" className="w-full" />
          </div>

          <p className="text-xs text-ion-2">{elo.note}</p>
          <p className="text-xs text-ion-3">Generated {elo.generatedAt}</p>
        </>
      )}
    </section>
  );
}

export default async function MarketCalibrationPage() {
  // Fetch both loaders. Each already returns an honest "no-data" state when
  // HistoricalGame has no rows, so there is no fabrication path here. We catch
  // at the loader level so a single DB blip does not take down the whole page.
  const market = await loadMarketCalibrationBacktest().catch(() => ({
    status: "no-data" as const,
    generatedAt: new Date().toISOString(),
    sampleSize: 0,
    seasonsCovered: 0,
    seasonRange: null,
    baseRate: 0,
    brier: 0,
    reliability: 0,
    resolution: 0,
    ece: 0,
    curve: [],
    note: "The market-baseline endpoint could not be reached. No data is shown.",
  }));
  const elo = await loadEloVsMarketBacktest().catch(() => ({
    status: "no-data" as const,
    generatedAt: new Date().toISOString(),
    comparisonSampleSize: 0,
    seasonRange: null,
    elo: {
      sampleSize: 0,
      accuracy: 0,
      brier: 0,
      reliability: 0,
      resolution: 0,
      ece: 0,
      baseRate: 0,
      curve: [],
      teamsRated: 0,
    },
    market: { sampleSize: 0, brier: 0, reliability: 0, resolution: 0, ece: 0, baseRate: 0 },
    betterCalibrated: "tie" as const,
    note: "The Elo-vs-market endpoint could not be reached. No data is shown.",
  }));

  return (
    <div className="relative isolate min-h-screen bg-carbon text-ion">
      <Nav />
      <main
        id="main-content"
        className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8"
      >
        <header className="gw-nebula-deep -mx-4 rounded-ds-lg border-b border-mineral px-4 pb-10 pt-6 sm:-mx-6 sm:px-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-orbital-cyan">
            The Proof Room · Market baseline
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-ion-white sm:text-5xl">
            The market, as a baseline
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
            The closing line is the market&apos;s most efficient forecast. Here it is de-vigged and calibrated
            against actual outcomes over the full historical archive — the denominator every future GSE claim must
            beat. Below, a results-only Elo is scored on the <em>same</em> games to show whether a simple
            independent model can match the market. Neither number is a GSE pick; both are honest baselines.
          </p>
        </header>

        <div className="mt-12 space-y-12">
          <MarketSection market={market} />
          <EloSection elo={elo} />
        </div>

        <div className="mt-12">
          <MetricHonesty
            measures="How well the MARKET's own de-vigged closing prices are calibrated against real outcomes - the ECE and Brier on this page belong to the market baseline, not to any GSE model."
            doesNotMeasure="Any independent forecasting skill by GSE. A market ECE near zero says the closing line is honest about itself; it says nothing about whether anyone can beat it."
            caveat="This baseline exists so every future model claim has something honest to be measured against."
          />
        </div>

        <div className="mt-12 rounded-2xl border border-mineral bg-eclipse/30 p-6">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-ion-2">
            What this surface proves
          </h2>
          <div className="space-y-3 text-sm leading-relaxed text-ion-1">
            <p>
              This page publishes the market&apos;s <em>own</em> calibration curve — Brier, ECE, and a reliability
              diagram computed from the de-vigged closing moneyline. It needs no platform track record because it
              makes no claim about any model. A latecomer cannot fake 25 seasons of nflverse outcomes, which is
              why this baseline is the first proof every future edge claim is measured against.
            </p>
            <p>
              This is a baseline, not a tip sheet. No picks are published here, no fabricated stats are
              ever shown, and when there is no data the loaders return an explicit no-data state that this
              page surfaces verbatim — never a zero-filled chart.
            </p>
            <p>
              The data is computed by two live public endpoints (
              <code>/api/calibration/market-backtest</code> and{" "}
              <code>/api/calibration/elo-backtest</code>). When the historical-games backfill has not yet run, the
              loaders return an explicit no-data state — surfaced here as plain text, never a fabricated or
              zero-filled chart.
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/calibration"
              className="rounded-lg border border-mineral px-4 py-2 text-sm text-ion-1 hover:bg-eclipse/80"
            >
              Back to the Proof Room →
            </Link>
            <Link
              href="/methodology"
              className="rounded-lg border border-mineral px-4 py-2 text-sm text-ion-1 hover:bg-eclipse/80"
            >
              Methodology →
            </Link>
          </div>
        </div>

        <div className="mt-8">
          <RiskDisclosure variant="compact" includePastPerformance />
        </div>
      </main>
      <Footer />
    </div>
  );
}
