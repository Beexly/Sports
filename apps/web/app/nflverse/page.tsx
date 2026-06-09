import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { Atmosphere } from "@/components/ui/atmosphere";
import { Reveal } from "@/components/motion/reveal";
import { AmbientGlow, SignatureGrid } from "@/components/motion/signature-grid";
import { UpsellGate } from "@/components/ui/upsell-gate";
import { canAccess, getViewerTier } from "@/lib/access";
import {
  loadBirthdayUsageTrendReport,
  type BirthdayUsageComparison,
} from "@/lib/nflverse/birthday-usage-trend";
import { loadQbAgeRbTrendReport } from "@/lib/nflverse/qb-age-rb-trend";
import { loadNflverseUsagePulse, type NflverseQbAgeRow } from "@/lib/nflverse/usage-pulse";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "NFLverse Usage Pulse - Real Player Usage Rows",
  description:
    "A live read-only nflverse usage pulse showing real player-week rows, opportunities, target share, WOPR, and QB-age context without fabricated projections.",
  alternates: { canonical: "/nflverse" },
};

const numberFormatter = new Intl.NumberFormat("en-US");

function fmtNumber(value: number): string {
  return numberFormatter.format(value);
}

function fmtDecimal(value: number | null, digits = 2): string {
  return value === null ? "N/A" : value.toFixed(digits);
}

function fmtPercent(value: number | null): string {
  return value === null ? "N/A" : `${(value * 100).toFixed(1)}%`;
}

function fmtSignedPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(1)}%`;
}

function fmtSignedDecimal(value: number, digits = 2): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}`;
}

function fmtPValue(value: number): string {
  return value < 0.001 ? value.toExponential(2) : value.toFixed(3);
}

function fmtComparisonMean(comparison: BirthdayUsageComparison): string {
  if (comparison.metric === "relative-opportunity-lift") return fmtSignedPercent(comparison.cohortMean);
  return `${fmtSignedDecimal(comparison.cohortMean)} opp`;
}

function fmtComparisonDelta(comparison: BirthdayUsageComparison): string {
  if (comparison.metric === "relative-opportunity-lift") return fmtSignedPercent(comparison.absoluteDelta);
  return `${fmtSignedDecimal(comparison.absoluteDelta)} opp`;
}

function qbBucketLabel(row: NflverseQbAgeRow): string {
  if (row.qbAge === null) return "age unknown";
  return `${row.qbAge} / ${row.qbAgeBucket}`;
}

export default async function NflversePage(): Promise<JSX.Element> {
  const [tier, pulse, qbAgeTrend, birthdayTrend] = await Promise.all([
    getViewerTier(),
    loadNflverseUsagePulse(),
    loadQbAgeRbTrendReport(),
    loadBirthdayUsageTrendReport(),
  ]);
  const lockedPro = !canAccess(tier, "PRO");
  const oldQbTrend = qbAgeTrend.trends.find((trend) => trend.cohort === "QB age 34+");
  const birthdayResult = birthdayTrend.result;
  // FREE teaser: the top opportunity rows stay visible; the rest of the board is gated.
  const teaserPlayerRows = pulse.playerRows.slice(0, 3);
  const gatedPlayerRows = pulse.playerRows.slice(3);

  return (
    <div className="flex min-h-screen flex-col bg-surface-base text-ion-white">
      <Atmosphere />
      <Nav />
      <main className="flex-1 mx-auto w-full max-w-7xl flex flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-8 border-b border-surface-line pb-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <Reveal>
            <div className="relative isolate overflow-hidden rounded-ds-lg">
              <AmbientGlow className="-z-10" />
              <SignatureGrid className="-z-10" opacity={0.08} />
              <div className="relative z-10 py-2">
                <h1 className="max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl">
                  Real NFL rows before real claims.
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
                  This pulse reads nflverse player-week and roster releases directly. It shows
                  usage, target share, air-yard share, WOPR, and quarterback-age context from
                  real source rows. It does not publish picks, projections, or significant trends.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link href="/api/nflverse/usage-pulse" className="btn-primary min-h-11 px-5 py-3">
                    JSON pulse
                  </Link>
                  <Link
                    href="/trends"
                    className="inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-mineral px-5 py-3 text-sm font-semibold text-ion hover:border-orbital-cyan hover:text-ion-white"
                  >
                    Trend Lab
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>

          <div className="border border-mineral bg-eclipse p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                  Usage pulse
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-ion-white">
                  {pulse.status === "live" ? `Season ${pulse.season}, week ${pulse.week ?? "N/A"}` : "Source unavailable"}
                </h2>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                {pulse.seasonType}
              </p>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Source rows" value={fmtNumber(pulse.sourceRows)} />
              <Metric label="Season rows" value={fmtNumber(pulse.seasonRows)} />
              <Metric label="Week rows" value={fmtNumber(pulse.latestWeekRows)} />
              <Metric label="Publish" value={pulse.canPublishTrends ? "open" : "blocked"} />
            </dl>
            <div className="mt-5 border border-mineral bg-carbon p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-alert">
                Boundary
              </p>
              <p className="mt-2 text-sm leading-6 text-ion-1">{pulse.blockReason}</p>
            </div>
          </div>
        </section>

        {pulse.status === "source-error" ? (
          <section className="border border-mineral bg-eclipse p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-alert">Source error</p>
            <h2 className="mt-2 text-2xl font-semibold text-ion-white">The pulse is intentionally empty.</h2>
            <p className="mt-3 text-sm leading-6 text-ion-1">{pulse.error ?? "UNKNOWN"}</p>
          </section>
        ) : (
          <>
            <section className="border border-mineral bg-eclipse/80">
              <div className="flex flex-col justify-between gap-3 border-b border-mineral px-5 py-4 sm:flex-row sm:items-end">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                    Player usage
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-ion-white">Top opportunity rows</h2>
                </div>
                <p className="max-w-xl text-sm leading-6 text-ion-1">
                  Sorted by carries plus targets for the latest regular-season week in the source file.
                </p>
              </div>
              <div className="flex flex-col gap-3 p-px">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1080px] text-left text-sm">
                    <thead className="border-b border-mineral bg-carbon/70 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                      <tr>
                        <th className="px-4 py-3">Player</th>
                        <th className="px-4 py-3">Team</th>
                        <th className="px-4 py-3">Opp</th>
                        <th className="px-4 py-3">Oppty</th>
                        <th className="px-4 py-3">Tgt</th>
                        <th className="px-4 py-3">Car</th>
                        <th className="px-4 py-3">Tgt share</th>
                        <th className="px-4 py-3">Air share</th>
                        <th className="px-4 py-3">WOPR</th>
                        <th className="px-4 py-3">PPR</th>
                        <th className="px-4 py-3">Age</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-mineral bg-carbon">
                      {teaserPlayerRows.map((row) => (
                        <tr key={`${row.playerId}-${row.team}-${row.opponent}`}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-ion-white">{row.playerName}</p>
                            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                              {row.position}
                            </p>
                          </td>
                          <td className="px-4 py-3 font-mono text-orbital-cyan">{row.team}</td>
                          <td className="px-4 py-3 font-mono text-ion-2">{row.opponent}</td>
                          <td className="px-4 py-3 font-mono text-ion-white">{row.opportunities}</td>
                          <td className="px-4 py-3 font-mono text-ion">{row.targets}</td>
                          <td className="px-4 py-3 font-mono text-ion">{row.carries}</td>
                          <td className="px-4 py-3 font-mono text-ion">{fmtPercent(row.targetShare)}</td>
                          <td className="px-4 py-3 font-mono text-ion">{fmtPercent(row.airYardsShare)}</td>
                          <td className="px-4 py-3 font-mono text-ion">{fmtDecimal(row.wopr)}</td>
                          <td className="px-4 py-3 font-mono text-ion">{fmtDecimal(row.fantasyPointsPpr, 1)}</td>
                          <td className="px-4 py-3 font-mono text-ion">{row.age ?? "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {gatedPlayerRows.length > 0 ? (
                  <UpsellGate locked={lockedPro} tier="PRO" label="The full WOPR & target-share board">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1080px] text-left text-sm">
                        <thead className="border-b border-mineral bg-carbon/70 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                          <tr>
                            <th className="px-4 py-3">Player</th>
                            <th className="px-4 py-3">Team</th>
                            <th className="px-4 py-3">Opp</th>
                            <th className="px-4 py-3">Oppty</th>
                            <th className="px-4 py-3">Tgt</th>
                            <th className="px-4 py-3">Car</th>
                            <th className="px-4 py-3">Tgt share</th>
                            <th className="px-4 py-3">Air share</th>
                            <th className="px-4 py-3">WOPR</th>
                            <th className="px-4 py-3">PPR</th>
                            <th className="px-4 py-3">Age</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-mineral bg-carbon">
                          {gatedPlayerRows.map((row) => (
                            <tr key={`${row.playerId}-${row.team}-${row.opponent}`}>
                              <td className="px-4 py-3">
                                <p className="font-semibold text-ion-white">{row.playerName}</p>
                                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                                  {row.position}
                                </p>
                              </td>
                              <td className="px-4 py-3 font-mono text-orbital-cyan">{row.team}</td>
                              <td className="px-4 py-3 font-mono text-ion-2">{row.opponent}</td>
                              <td className="px-4 py-3 font-mono text-ion-white">{row.opportunities}</td>
                              <td className="px-4 py-3 font-mono text-ion">{row.targets}</td>
                              <td className="px-4 py-3 font-mono text-ion">{row.carries}</td>
                              <td className="px-4 py-3 font-mono text-ion">{fmtPercent(row.targetShare)}</td>
                              <td className="px-4 py-3 font-mono text-ion">{fmtPercent(row.airYardsShare)}</td>
                              <td className="px-4 py-3 font-mono text-ion">{fmtDecimal(row.wopr)}</td>
                              <td className="px-4 py-3 font-mono text-ion">{fmtDecimal(row.fantasyPointsPpr, 1)}</td>
                              <td className="px-4 py-3 font-mono text-ion">{row.age ?? "N/A"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </UpsellGate>
                ) : null}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
              <div className="border border-mineral bg-eclipse p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                  QB age context
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-ion-white">
                  The Jeff Manns-style question starts here.
                </h2>
                <p className="mt-4 text-sm leading-6 text-ion-1">
                  This table does not claim a trend. It simply exposes real quarterback age,
                  pass attempts, and running back target share for the latest week so the
                  cohort engine has readable source material.
                </p>
              </div>
              <div className="overflow-x-auto border border-mineral">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-mineral bg-eclipse font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                    <tr>
                      <th className="px-4 py-3">Team</th>
                      <th className="px-4 py-3">QB</th>
                      <th className="px-4 py-3">Age bucket</th>
                      <th className="px-4 py-3">Attempts</th>
                      <th className="px-4 py-3">RB targets</th>
                      <th className="px-4 py-3">RB target share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-mineral bg-carbon">
                    {pulse.qbAgeRows.map((row) => (
                      <tr key={`${row.team}-${row.qbName}`}>
                        <td className="px-4 py-3 font-mono text-orbital-cyan">{row.team}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-ion-white">{row.qbName}</p>
                          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                            vs {row.opponent}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-mono text-ion">{qbBucketLabel(row)}</td>
                        <td className="px-4 py-3 font-mono text-ion">{row.passAttempts}</td>
                        <td className="px-4 py-3 font-mono text-ion">{row.rbTargets}</td>
                        <td className="px-4 py-3 font-mono text-ion-white">{fmtPercent(row.rbTargetShare)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="border border-mineral bg-eclipse p-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                      Historical cohort result
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-ion-white">
                      QB age 34+ to RB target share
                    </h2>
                  </div>
                  <Link
                    href="/api/nflverse/qb-age-rb-trend"
                    className="text-sm font-semibold text-orbital-cyan hover:text-ion-white"
                  >
                    JSON
                  </Link>
                </div>
                {oldQbTrend ? (
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <Metric label="Cohort n" value={fmtNumber(oldQbTrend.n)} />
                    <Metric label="Field n" value={fmtNumber(oldQbTrend.baselineN)} />
                    <Metric label="Lift" value={fmtSignedPercent(oldQbTrend.relativeDelta)} />
                    <Metric label="p-value" value={fmtPValue(oldQbTrend.pValue)} />
                  </div>
                ) : (
                  <p className="mt-5 text-sm leading-6 text-ion-1">No cohort cleared the minimum sample gate.</p>
                )}
                <p className="mt-5 text-sm leading-6 text-ion-1">
                  The result uses {fmtNumber(qbAgeTrend.quality.observationsUsed)} team-week observations from{" "}
                  {qbAgeTrend.seasonRange.start ?? "N/A"}-{qbAgeTrend.seasonRange.end ?? "N/A"}. It measures
                  running back targets divided by team pass attempts, grouped by the starting quarterback&apos;s age
                  on game day.
                </p>
                <div className="mt-5 border border-mineral bg-carbon p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-alert">
                    Scoring boundary
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ion-1">{qbAgeTrend.boundary}</p>
                </div>
              </div>

              <div className="overflow-x-auto border border-mineral">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-mineral bg-eclipse font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                    <tr>
                      <th className="px-4 py-3">Cohort</th>
                      <th className="px-4 py-3">n</th>
                      <th className="px-4 py-3">RB tgt share</th>
                      <th className="px-4 py-3">Field</th>
                      <th className="px-4 py-3">Delta</th>
                      <th className="px-4 py-3">p-value</th>
                      <th className="px-4 py-3">Gate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-mineral bg-carbon">
                    {qbAgeTrend.trends.map((trend) => (
                      <tr key={trend.cohort}>
                        <td className="px-4 py-3 font-semibold text-ion-white">{trend.cohort}</td>
                        <td className="px-4 py-3 font-mono text-ion">{fmtNumber(trend.n)}</td>
                        <td className="px-4 py-3 font-mono text-ion">{fmtPercent(trend.cohortMean)}</td>
                        <td className="px-4 py-3 font-mono text-ion">{fmtPercent(trend.baselineMean)}</td>
                        <td className="px-4 py-3 font-mono text-orbital-cyan">
                          {fmtSignedPercent(trend.relativeDelta)}
                        </td>
                        <td className="px-4 py-3 font-mono text-ion">{fmtPValue(trend.pValue)}</td>
                        <td className="px-4 py-3 font-mono text-ion-2">
                          {trend.significant ? "significant" : "watch"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="border border-mineral bg-eclipse p-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                    Cohort examples
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-ion-white">Recent 34+ QB team weeks</h2>
                </div>
                <p className="max-w-xl text-sm leading-6 text-ion-1">
                  These rows are examples from the cohort, not recommended bets.
                </p>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {qbAgeTrend.examples.map((row) => (
                  <article key={`${row.season}-${row.week}-${row.team}`} className="border border-mineral bg-carbon p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-orbital-cyan">
                      {row.season} week {row.week}
                    </p>
                    <h3 className="mt-2 font-semibold text-ion-white">{row.qbName}</h3>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-ion-2">
                      {row.team} vs {row.opponent} / age {row.qbAge}
                    </p>
                    <p className="mt-4 font-numerals text-2xl font-semibold text-ion-white">
                      {fmtPercent(row.rbTargetShare)}
                    </p>
                    <p className="mt-1 text-xs text-ion-2">
                      {row.rbTargets} RB targets / {row.passAttempts} attempts
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
              <div className="border border-mineral bg-eclipse p-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                      Birthday usage myth check
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-ion-white">
                      The engine rejected the birthday and milestone boosts.
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
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <Metric label="Observations" value={fmtNumber(birthdayTrend.quality.observationsUsed)} />
                    <Metric label="Window n" value={fmtNumber(birthdayResult.n)} />
                    <Metric label="Opp delta" value={fmtComparisonDelta(birthdayResult)} />
                    <Metric label="p-value" value={fmtPValue(birthdayResult.pValue)} />
                  </div>
                ) : (
                  <p className="mt-5 text-sm leading-6 text-ion-1">The birthday-window report is unavailable.</p>
                )}
                <p className="mt-5 text-sm leading-6 text-ion-1">
                  The test compares RB/WR/TE game opportunities against each player&apos;s prior four-game average.
                  Across {birthdayTrend.seasonRange.start ?? "N/A"}-{birthdayTrend.seasonRange.end ?? "N/A"}, birthday
                  windows and 50-game career milestones both fail the significance gate.
                </p>
                <div className="mt-5 border border-mineral bg-carbon p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-alert">
                    Narrative boundary
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ion-1">{birthdayTrend.boundary}</p>
                </div>
              </div>

              <div className="overflow-x-auto border border-mineral">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="border-b border-mineral bg-eclipse font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                    <tr>
                      <th className="px-4 py-3">Check</th>
                      <th className="px-4 py-3">n</th>
                      <th className="px-4 py-3">Field n</th>
                      <th className="px-4 py-3">Mean</th>
                      <th className="px-4 py-3">Delta</th>
                      <th className="px-4 py-3">p-value</th>
                      <th className="px-4 py-3">Gate</th>
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
                        <td className="px-4 py-3 font-mono text-ion">{fmtNumber(comparison.n)}</td>
                        <td className="px-4 py-3 font-mono text-ion">{fmtNumber(comparison.baselineN)}</td>
                        <td className="px-4 py-3 font-mono text-ion">{fmtComparisonMean(comparison)}</td>
                        <td className="px-4 py-3 font-mono text-orbital-cyan">
                          {fmtComparisonDelta(comparison)}
                        </td>
                        <td className="px-4 py-3 font-mono text-ion">{fmtPValue(comparison.pValue)}</td>
                        <td className="px-4 py-3 font-mono text-ion-2">{comparison.gate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="border border-mineral bg-eclipse p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">Source URLs</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <SourceUrl label="Player stats" href={pulse.sourceUrls.playerStats} />
                <SourceUrl label="Rosters" href={pulse.sourceUrls.rosters} />
                <SourceUrl label="Players" href={birthdayTrend.sourceUrls.players} />
                <SourceUrl label="Schedules" href={birthdayTrend.sourceUrls.schedules} />
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="border border-mineral bg-carbon px-3 py-2">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">{label}</dt>
      <dd className="mt-1 font-numerals text-xl font-semibold tabular-nums text-ion-white">{value}</dd>
    </div>
  );
}

function SourceUrl({ label, href }: { label: string; href: string }): JSX.Element {
  return (
    <div className="border border-mineral bg-carbon p-4">
      <p className="font-semibold text-ion-white">{label}</p>
      <p className="mt-2 break-all font-mono text-xs leading-5 text-ion-2">{href}</p>
    </div>
  );
}
