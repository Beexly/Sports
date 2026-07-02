import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import {
  CONTEXT_INTELLIGENCE_SOURCES,
  PUBLIC_DATA_SOURCES,
  sourceCostLabel,
  sourceStatusLabel,
} from "@/lib/data-sources/catalog";
import { loadBirthdayUsageTrendReport } from "@/lib/nflverse/birthday-usage-trend";
import { loadQbAgeRbTrendReport } from "@/lib/nflverse/qb-age-rb-trend";
import { loadNflverseTrendReadiness } from "@/lib/trends/nflverse-readiness";
import { loadTrendWorkbench } from "@/lib/trends/workbench";
import { getViewerEntitlements } from "@/lib/pricing/tier-access";
import { TierGatePanel } from "@/components/pricing/tier-gate-panel";
import { GeneratedPlate } from "@/components/immersive/generated-plate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trend Lab - Cohort Discovery Without Guessing",
  description:
    "Galaxy Sports Edge Trend Lab shows which statistical questions are ready, which data sources feed them, and why no public trend is published without real observations.",
  alternates: { canonical: "/trends" },
};

const numberFormatter = new Intl.NumberFormat("en-US");

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatSignedPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(1)}%`;
}

function formatSignedDecimal(value: number, digits = 2): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}`;
}

function formatPValue(value: number): string {
  return value < 0.001 ? value.toExponential(2) : value.toFixed(3);
}

export default async function TrendsPage(): Promise<JSX.Element> {
  // Server-side gate: the cohort workbench is a Pro surface. Under-tier
  // viewers get the hero + seal — the gated data is never loaded for them.
  const viewer = await getViewerEntitlements();
  if (!viewer.canUseTrendLab) {
    return (
      <div className="relative isolate min-h-screen bg-carbon text-ion">
        <GeneratedPlate assetId="trends-field" className="-z-10 opacity-20" />
        <Nav />
        <main id="main-content" className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8">
          <section>
            <h1 className="max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl">
              Find the edges before they become consensus.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
              Trend Lab finds the patterns that actually hold up: which player and team
              types beat expectations in specific spots (usage, targets, injuries, age,
              rest, matchup). It only publishes one once it survives the math, not the eye test.
            </p>
          </section>
          <TierGatePanel
            need="PRO"
            surface="The Trend Lab"
            blurb="The full cohort workbench (sample sizes, hit rates, p-values, and the trends that survive scrutiny) is a Pro surface. Free members keep the board, the Academy, and the public verified record."
          />
        </main>
        <Footer />
      </div>
    );
  }

  const workbench = loadTrendWorkbench();
  const [nflverseReadiness, qbAgeTrend, birthdayTrend] = await Promise.all([
    loadNflverseTrendReadiness(),
    loadQbAgeRbTrendReport(),
    loadBirthdayUsageTrendReport(),
  ]);
  const qbAge34Trend = qbAgeTrend.trends.find((trend) => trend.cohort === "QB age 34+");
  const birthdayResult = birthdayTrend.result;

  return (
    <div className="relative isolate min-h-screen bg-carbon text-ion">
      <GeneratedPlate assetId="trends-field" className="-z-10 opacity-20" />
      <Nav />
      <main id="main-content" className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-8 border-b border-mineral pb-8 lg:grid-cols-[1fr_0.72fr] lg:items-end">
          <div>
            <h1 className="max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl">
              Find the edges before they become consensus.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
              Trend Lab finds the patterns that actually hold up: which player and team
              types beat expectations in specific spots (usage, targets, injuries, age,
              rest, matchup). The engine is ready; the public trend table stays empty
              until the data is real enough to defend.
            </p>
          </div>
          <div className="border border-mineral bg-eclipse p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
              Engine status
            </p>
            <dl className="mt-5 grid grid-cols-3 gap-3">
              <Metric label="Observations" value={String(workbench.observationCount)} />
              <Metric label="Candidates" value={String(workbench.candidateCount)} />
              <Metric label="Published" value={String(workbench.publishedTrendCount)} />
            </dl>
            <p className="mt-4 text-sm leading-6 text-ion-1">{workbench.sourceNote}</p>
          </div>
        </section>

        <section className="grid gap-6 border-b border-mineral pb-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="border border-mineral bg-eclipse/80 p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                  Live nflverse pull
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-ion-white">
                  {nflverseReadiness.planTitle}
                </h2>
              </div>
              <Link
                href="/api/trends/nflverse-readiness"
                className="text-sm font-semibold text-orbital-cyan hover:text-ion-white"
              >
                JSON
              </Link>
            </div>
            <p className="mt-4 text-sm leading-6 text-ion-1">
              These are real row counts fetched read-only from nflverse release assets for the
              first trend plan. They are source rows, not published trend observations.
            </p>
            <dl className="mt-5 grid grid-cols-2 gap-3">
              <Metric
                label="Feeds live"
                value={`${nflverseReadiness.liveDatasetCount}/${nflverseReadiness.requiredDatasetCount}`}
              />
              <Metric label="Source rows" value={formatNumber(nflverseReadiness.totalSourceRows)} />
              <Metric label="Joined obs" value={formatNumber(nflverseReadiness.joinedTrendObservations)} />
              <Metric label="Season" value={String(nflverseReadiness.season)} />
            </dl>
            <div className="mt-5 border border-mineral bg-carbon p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-alert">
                Publication blocked
              </p>
              <p className="mt-2 text-sm leading-6 text-ion-1">{nflverseReadiness.blockReason}</p>
            </div>
            <Link
              href="/nflverse"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-mineral px-4 py-2 text-sm font-semibold text-ion hover:border-orbital-cyan hover:text-ion-white"
            >
              Open real usage pulse
            </Link>
          </div>

          <div className="overflow-x-auto border border-mineral">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-mineral bg-eclipse font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                <tr>
                  <th scope="col" className="px-4 py-3">Dataset</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">Rows</th>
                  <th scope="col" className="px-4 py-3">Scope</th>
                  <th scope="col" className="px-4 py-3">Unlocks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mineral bg-carbon">
                {nflverseReadiness.datasets.map((dataset) => (
                  <tr key={dataset.key}>
                    <td className="px-4 py-3 font-semibold text-ion-white">{dataset.name}</td>
                    <td className="px-4 py-3 font-mono text-orbital-cyan">{dataset.status}</td>
                    <td className="px-4 py-3 font-mono text-ion">
                      {dataset.rowCount === null ? "UNKNOWN" : formatNumber(dataset.rowCount)}
                    </td>
                    <td className="px-4 py-3 font-mono text-ion-2">{dataset.scope}</td>
                    <td className="px-4 py-3 text-ion-1">{dataset.unlocks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 border-b border-mineral pb-8 lg:grid-cols-[0.78fr_1.22fr]">
          <div className="border border-mineral bg-eclipse/80 p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                  Read-only research result
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-ion-white">
                  QB age 34+ increases RB target share in the historical file.
                </h2>
              </div>
              <Link
                href="/api/nflverse/qb-age-rb-trend"
                className="text-sm font-semibold text-orbital-cyan hover:text-ion-white"
              >
                JSON
              </Link>
            </div>
            {qbAge34Trend ? (
              <dl className="mt-5 grid grid-cols-2 gap-3">
                <Metric label="Observations" value={formatNumber(qbAgeTrend.quality.observationsUsed)} />
                <Metric label="Cohort n" value={formatNumber(qbAge34Trend.n)} />
                <Metric label="Lift" value={formatSignedPercent(qbAge34Trend.relativeDelta)} />
                <Metric label="p-value" value={formatPValue(qbAge34Trend.pValue)} />
              </dl>
            ) : (
              <p className="mt-5 text-sm leading-6 text-ion-1">No cohort cleared the minimum sample gate.</p>
            )}
            <p className="mt-5 text-sm leading-6 text-ion-1">
              Source-computed from public nflverse player stats, player birth dates, and schedules across{" "}
              {qbAgeTrend.seasonRange.start ?? "N/A"}-{qbAgeTrend.seasonRange.end ?? "N/A"}. This result does
              not affect scoring until persisted joins, backtests, and model-version review clear.
            </p>
            <Link
              href="/nflverse"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-mineral px-4 py-2 text-sm font-semibold text-ion hover:border-orbital-cyan hover:text-ion-white"
            >
              Inspect source rows
            </Link>
          </div>

          <div className="overflow-x-auto border border-mineral">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-mineral bg-eclipse font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                <tr>
                  <th scope="col" className="px-4 py-3">Cohort</th>
                  <th scope="col" className="px-4 py-3">n</th>
                  <th scope="col" className="px-4 py-3">Mean</th>
                  <th scope="col" className="px-4 py-3">Field</th>
                  <th scope="col" className="px-4 py-3">Lift</th>
                  <th scope="col" className="px-4 py-3">p-value</th>
                  <th scope="col" className="px-4 py-3">Gate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mineral bg-carbon">
                {qbAgeTrend.trends.map((trend) => (
                  <tr key={trend.cohort}>
                    <td className="px-4 py-3 font-semibold text-ion-white">{trend.cohort}</td>
                    <td className="px-4 py-3 font-mono text-ion">{formatNumber(trend.n)}</td>
                    <td className="px-4 py-3 font-mono text-ion">{formatPercent(trend.cohortMean)}</td>
                    <td className="px-4 py-3 font-mono text-ion">{formatPercent(trend.baselineMean)}</td>
                    <td className="px-4 py-3 font-mono text-orbital-cyan">
                      {formatSignedPercent(trend.relativeDelta)}
                    </td>
                    <td className="px-4 py-3 font-mono text-ion">{formatPValue(trend.pValue)}</td>
                    <td className="px-4 py-3 font-mono text-ion-2">
                      {trend.significant ? "significant" : "watch"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 border-b border-mineral pb-8 lg:grid-cols-[0.72fr_1.28fr]">
          <div className="border border-mineral bg-eclipse/80 p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                  Rejected narrative
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-ion-white">
                  Birthday and milestone boosts are not publishable.
                </h2>
              </div>
              <Link
                href="/api/nflverse/birthday-usage-trend"
                className="text-sm font-semibold text-orbital-cyan hover:text-ion-white"
              >
                JSON
              </Link>
            </div>
            {birthdayResult ? (
              <dl className="mt-5 grid grid-cols-2 gap-3">
                <Metric label="Observations" value={formatNumber(birthdayTrend.quality.observationsUsed)} />
                <Metric label="Window n" value={formatNumber(birthdayResult.n)} />
                <Metric label="Opp delta" value={`${formatSignedDecimal(birthdayResult.absoluteDelta)} opp`} />
                <Metric label="p-value" value={formatPValue(birthdayResult.pValue)} />
              </dl>
            ) : (
              <p className="mt-5 text-sm leading-6 text-ion-1">The birthday-window report is unavailable.</p>
            )}
            <p className="mt-5 text-sm leading-6 text-ion-1">
              The lab compares birthday-window and career-milestone RB/WR/TE games to each player&apos;s prior
              four-game usage baseline. The current file says no: this is evidence against popular angles,
              not a scoring factor.
            </p>
            <Link
              href="/nflverse"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-mineral px-4 py-2 text-sm font-semibold text-ion hover:border-orbital-cyan hover:text-ion-white"
            >
              Inspect the myth check
            </Link>
          </div>

          <div className="overflow-x-auto border border-mineral">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-mineral bg-eclipse font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                <tr>
                  <th scope="col" className="px-4 py-3">Check</th>
                  <th scope="col" className="px-4 py-3">n</th>
                  <th scope="col" className="px-4 py-3">Field n</th>
                  <th scope="col" className="px-4 py-3">Mean</th>
                  <th scope="col" className="px-4 py-3">Delta</th>
                  <th scope="col" className="px-4 py-3">p-value</th>
                  <th scope="col" className="px-4 py-3">Gate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mineral bg-carbon">
                {[
                  ...birthdayTrend.sensitivity,
                  ...birthdayTrend.milestoneSensitivity,
                  ...birthdayTrend.positionBreakdown,
                ].map((comparison) => (
                  <tr key={`${comparison.label}-${comparison.metric}`}>
                    <td className="px-4 py-3 font-semibold text-ion-white">{comparison.label}</td>
                    <td className="px-4 py-3 font-mono text-ion">{formatNumber(comparison.n)}</td>
                    <td className="px-4 py-3 font-mono text-ion">{formatNumber(comparison.baselineN)}</td>
                    <td className="px-4 py-3 font-mono text-ion">
                      {comparison.metric === "relative-opportunity-lift"
                        ? formatSignedPercent(comparison.cohortMean)
                        : `${formatSignedDecimal(comparison.cohortMean)} opp`}
                    </td>
                    <td className="px-4 py-3 font-mono text-orbital-cyan">
                      {comparison.metric === "relative-opportunity-lift"
                        ? formatSignedPercent(comparison.absoluteDelta)
                        : `${formatSignedDecimal(comparison.absoluteDelta)} opp`}
                    </td>
                    <td className="px-4 py-3 font-mono text-ion">{formatPValue(comparison.pValue)}</td>
                    <td className="px-4 py-3 font-mono text-ion-2">{comparison.gate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border border-mineral bg-eclipse/80">
            <div className="border-b border-mineral px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                Published trends
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-ion-white">No synthetic p-values.</h2>
            </div>
            {workbench.topTrends.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-mineral bg-carbon/70 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                    <tr>
                      <th scope="col" className="px-4 py-3">Cohort</th>
                      <th scope="col" className="px-4 py-3">n</th>
                      <th scope="col" className="px-4 py-3">Mean</th>
                      <th scope="col" className="px-4 py-3">Baseline</th>
                      <th scope="col" className="px-4 py-3">Delta</th>
                      <th scope="col" className="px-4 py-3">p-value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-mineral">
                    {workbench.topTrends.map((trend) => (
                      <tr key={`${trend.feature}-${trend.cohort}`}>
                        <td className="px-4 py-3 font-semibold text-ion-white">{trend.cohort}</td>
                        <td className="px-4 py-3 font-mono text-ion">{trend.n}</td>
                        <td className="px-4 py-3 font-mono text-ion">{trend.cohortMean.toFixed(3)}</td>
                        <td className="px-4 py-3 font-mono text-ion">{trend.baselineMean.toFixed(3)}</td>
                        <td className="px-4 py-3 font-mono text-orbital-cyan">
                          {(trend.relativeDelta * 100).toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 font-mono text-ion">{trend.pValue.toExponential(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-5">
                <div className="border border-mineral bg-carbon p-5">
                  <h3 className="text-lg font-semibold text-ion-white">The lab is waiting on real rows.</h3>
                  <p className="mt-3 text-sm leading-6 text-ion-1">
                    No trend is published from placeholder observations. The first target is the
                    QB-age-to-RB-target-share question: join rosters, player weekly stats,
                    snap counts, and schedules, then let the engine compare age cohorts to the field.
                  </p>
                  <Link
                    href="/integrations"
                    className="mt-5 inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-mineral px-4 py-2 text-sm font-semibold text-ion hover:border-orbital-cyan hover:text-ion-white"
                  >
                    View data readiness
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="border border-mineral bg-eclipse/80 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
              Cost-efficient source stack
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-ion-white">Free first. Paid only where it compounds.</h2>
            <div className="mt-5 flex flex-col divide-y divide-mineral border border-mineral">
              {PUBLIC_DATA_SOURCES.slice(0, 8).map((source) => (
                <div key={source.key} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="font-semibold text-ion-white">{source.name}</p>
                    <p className="mt-1 text-xs leading-5 text-ion-1">{source.unlocks}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-orbital-cyan">
                      {sourceCostLabel(source.cost)}
                    </p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                      {sourceStatusLabel(source.status)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 border border-mineral bg-carbon p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                Context feeds
              </p>
              <div className="mt-4 space-y-4">
                {CONTEXT_INTELLIGENCE_SOURCES.map((source) => (
                  <div key={source.key} className="border-l border-mineral pl-3">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row">
                      <p className="font-semibold text-ion-white">{source.name}</p>
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                        {sourceStatusLabel(source.status)}
                      </p>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-ion-1">{source.liveClaim}</p>
                    {source.complianceNote ? (
                      <p className="mt-1 text-xs leading-5 text-ion-2">{source.complianceNote}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border border-mineral bg-eclipse/70 p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                Research queue
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-ion-white">Questions worth mining first</h2>
            </div>
            <Link href="/methodology" className="text-sm font-semibold text-orbital-cyan hover:text-ion-white">
              Methodology
            </Link>
          </div>
          <div className="mt-5 grid gap-px overflow-hidden border border-mineral bg-mineral lg:grid-cols-5">
            {workbench.backlog.map((item) => (
              <article key={item.key} className="min-h-80 bg-carbon p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-orbital-cyan">
                  {item.status.replace(/-/g, " ")}
                </p>
                <h3 className="mt-3 text-lg font-semibold leading-tight text-ion-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-ion-1">{item.question}</p>
                <dl className="mt-4 space-y-3 text-xs">
                  <div>
                    <dt className="font-mono uppercase tracking-[0.12em] text-ion-2">Metric</dt>
                    <dd className="mt-1 text-ion">{item.metric}</dd>
                  </div>
                  <div>
                    <dt className="font-mono uppercase tracking-[0.12em] text-ion-2">Cohort</dt>
                    <dd className="mt-1 text-ion">{item.cohort}</dd>
                  </div>
                  <div>
                    <dt className="font-mono uppercase tracking-[0.12em] text-ion-2">Sources</dt>
                    <dd className="mt-1 text-ion">{item.requiredSources.join(", ")}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="border border-mineral bg-carbon px-3 py-2">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">{label}</dt>
      <dd className="mt-1 font-numerals text-2xl font-semibold tabular-nums text-ion-white">{value}</dd>
    </div>
  );
}
