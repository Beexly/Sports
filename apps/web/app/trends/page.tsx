import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal } from "@/components/motion/reveal";
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
import { BRAND_COLORS } from "@/lib/brand";

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
  const viewer = await getViewerEntitlements();
  if (!viewer.canUseTrendLab) {
    return (
      <div
        className="relative isolate min-h-screen flex flex-col"
        style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem]"
          style={{
            background: `radial-gradient(55% 70% at 50% 0%, ${BRAND_COLORS.orbitalCyan}14, transparent 60%), radial-gradient(35% 45% at 80% 20%, ${BRAND_COLORS.softUltraviolet}0d, transparent 65%)`,
          }}
        />
        <GeneratedPlate assetId="trends-field" className="absolute inset-0 -z-10 opacity-10" />
        <Nav />
        <main className="flex-1 mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-24 sm:px-6 lg:px-8">
          <Reveal>
            <span
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em]"
              style={{
                color: BRAND_COLORS.orbitalCyan,
                borderColor: `${BRAND_COLORS.orbitalCyan}30`,
                backgroundColor: `${BRAND_COLORS.orbitalCyan}0d`,
              }}
            >
              Trend Lab
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1
              className="max-w-4xl font-display text-balance text-white"
              style={{ fontSize: "clamp(2.4rem, 7vw, 4.5rem)", lineHeight: 1.0, letterSpacing: "-0.02em" }}
            >
              Find the edges{" "}
              <span
                style={{
                  background: `linear-gradient(90deg, ${BRAND_COLORS.orbitalCyan} 0%, ${BRAND_COLORS.softUltraviolet} 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                before consensus.
              </span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="max-w-2xl text-lg leading-8 text-ink-300">
              Trend Lab finds the patterns that actually hold up — which player and team
              types beat expectations in specific spots (usage, targets, injuries, age,
              rest, matchup) — and only publishes one once it survives the math, not the eye test.
            </p>
          </Reveal>
          <Reveal delay={220}>
            <TierGatePanel
              need="PRO"
              surface="The Trend Lab"
              blurb="The full cohort workbench — sample sizes, hit rates, p-values, and the trends that survive scrutiny — is a Pro surface. Free members keep the board, the Academy, and the public verified record."
            />
          </Reveal>
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
    <div
      className="relative isolate min-h-screen flex flex-col"
      style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem]"
        style={{
          background: `radial-gradient(55% 70% at 50% 0%, ${BRAND_COLORS.orbitalCyan}14, transparent 60%), radial-gradient(35% 50% at 85% 18%, ${BRAND_COLORS.softUltraviolet}0d, transparent 65%)`,
        }}
      />
      <GeneratedPlate assetId="trends-field" className="absolute inset-0 -z-10 opacity-10" />
      <Nav />

      <main className="flex-1 mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">

        {/* Hero */}
        <section className="grid gap-8 pb-10 pt-16 lg:grid-cols-[1fr_0.72fr] lg:items-end"
          style={{ borderBottom: `1px solid rgba(0,229,255,0.12)` }}>
          <div>
            <Reveal>
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{
                  color: BRAND_COLORS.orbitalCyan,
                  borderColor: `${BRAND_COLORS.orbitalCyan}30`,
                  backgroundColor: `${BRAND_COLORS.orbitalCyan}0d`,
                }}
              >
                Trend Lab
              </span>
            </Reveal>
            <Reveal delay={80}>
              <h1
                className="mt-5 max-w-4xl font-display text-balance text-white"
                style={{ fontSize: "clamp(2.4rem, 6vw, 4rem)", lineHeight: 1.0, letterSpacing: "-0.02em" }}
              >
                Find the edges{" "}
                <span
                  style={{
                    background: `linear-gradient(90deg, ${BRAND_COLORS.orbitalCyan} 0%, ${BRAND_COLORS.softUltraviolet} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  before consensus.
                </span>
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-5 max-w-2xl text-base leading-7 text-ink-300">
                Trend Lab finds the patterns that actually hold up — which player and team
                types beat expectations in specific spots (usage, targets, injuries, age,
                rest, matchup). The engine is ready; the public trend table stays empty
                until the data is real enough to defend.
              </p>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <div
              className="overflow-hidden rounded-2xl border p-5"
              style={{
                borderColor: `${BRAND_COLORS.orbitalCyan}22`,
                background: `linear-gradient(135deg, ${BRAND_COLORS.orbitalCyan}06 0%, rgba(18,14,36,0.8) 100%)`,
              }}
            >
              <div
                className="mb-4 h-0.5 w-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${BRAND_COLORS.orbitalCyan}, transparent 70%)` }}
                aria-hidden="true"
              />
              <p
                className="font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{ color: BRAND_COLORS.orbitalCyan }}
              >
                Engine status
              </p>
              <dl className="mt-5 grid grid-cols-3 gap-3">
                <Metric label="Observations" value={String(workbench.observationCount)} />
                <Metric label="Candidates" value={String(workbench.candidateCount)} />
                <Metric label="Published" value={String(workbench.publishedTrendCount)} />
              </dl>
              <p className="mt-4 text-sm leading-6 text-ink-400">{workbench.sourceNote}</p>
            </div>
          </Reveal>
        </section>

        {/* NFLverse readiness */}
        <section className="grid gap-6 pb-10 lg:grid-cols-[0.85fr_1.15fr]"
          style={{ borderBottom: `1px solid rgba(255,255,255,0.07)` }}>
          <Reveal>
            <div
              className="overflow-hidden rounded-2xl border p-5 h-full"
              style={{
                borderColor: `${BRAND_COLORS.orbitalCyan}22`,
                background: `linear-gradient(135deg, ${BRAND_COLORS.orbitalCyan}05 0%, rgba(18,14,36,0.7) 100%)`,
              }}
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <p
                    className="font-mono text-[10px] uppercase tracking-[0.18em]"
                    style={{ color: BRAND_COLORS.orbitalCyan }}
                  >
                    Live nflverse pull
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    {nflverseReadiness.planTitle}
                  </h2>
                </div>
                <Link
                  href="/api/trends/nflverse-readiness"
                  className="font-mono text-xs font-semibold transition-colors hover:text-white"
                  style={{ color: BRAND_COLORS.orbitalCyan }}
                >
                  JSON ↗
                </Link>
              </div>
              <p className="mt-4 text-sm leading-6 text-ink-400">
                Real row counts fetched read-only from nflverse release assets for the
                first trend plan. Source rows, not published trend observations.
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
              <div
                className="mt-5 overflow-hidden rounded-xl border p-4"
                style={{
                  borderColor: "rgba(255,100,112,0.25)",
                  background: "rgba(255,100,112,0.06)",
                }}
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: "#FF6470" }}>
                  Publication blocked
                </p>
                <p className="mt-2 text-sm leading-6 text-ink-400">{nflverseReadiness.blockReason}</p>
              </div>
              <Link
                href="/nflverse"
                className="mt-5 inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors hover:bg-orbital-cyan/10"
                style={{
                  borderColor: `${BRAND_COLORS.orbitalCyan}40`,
                  color: BRAND_COLORS.orbitalCyan,
                }}
              >
                Open real usage pulse
              </Link>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div
              className="overflow-hidden rounded-2xl border"
              style={{
                borderColor: "rgba(255,255,255,0.08)",
                background: "rgba(8,6,20,0.5)",
              }}
            >
              <div
                className="px-4 py-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,229,255,0.04)" }}
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: BRAND_COLORS.orbitalCyan }}>
                  Dataset readiness
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead
                    className="font-mono text-[10px] uppercase tracking-[0.14em]"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}
                  >
                    <tr>
                      <th className="px-4 py-3">Dataset</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Rows</th>
                      <th className="px-4 py-3">Scope</th>
                      <th className="px-4 py-3">Unlocks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nflverseReadiness.datasets.map((dataset, i) => (
                      <tr
                        key={dataset.key}
                        style={{ borderBottom: i < nflverseReadiness.datasets.length - 1 ? "1px solid rgba(255,255,255,0.05)" : undefined }}
                      >
                        <td className="px-4 py-3 font-semibold text-white">{dataset.name}</td>
                        <td className="px-4 py-3 font-mono" style={{ color: BRAND_COLORS.orbitalCyan }}>{dataset.status}</td>
                        <td className="px-4 py-3 font-mono text-ink-300">
                          {dataset.rowCount === null ? "UNKNOWN" : formatNumber(dataset.rowCount)}
                        </td>
                        <td className="px-4 py-3 font-mono text-ink-400">{dataset.scope}</td>
                        <td className="px-4 py-3 text-ink-400">{dataset.unlocks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>
        </section>

        {/* QB age trend */}
        <section className="grid gap-6 pb-10 lg:grid-cols-[0.78fr_1.22fr]"
          style={{ borderBottom: `1px solid rgba(255,255,255,0.07)` }}>
          <Reveal>
            <div
              className="overflow-hidden rounded-2xl border p-5 h-full"
              style={{
                borderColor: `${BRAND_COLORS.softUltraviolet}22`,
                background: `linear-gradient(135deg, ${BRAND_COLORS.softUltraviolet}05 0%, rgba(18,14,36,0.7) 100%)`,
              }}
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <p
                    className="font-mono text-[10px] uppercase tracking-[0.18em]"
                    style={{ color: BRAND_COLORS.softUltraviolet }}
                  >
                    Read-only research result
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    QB age 34+ increases RB target share in the historical file.
                  </h2>
                </div>
                <Link
                  href="/api/nflverse/qb-age-rb-trend"
                  className="font-mono text-xs font-semibold transition-colors hover:text-white"
                  style={{ color: BRAND_COLORS.softUltraviolet }}
                >
                  JSON ↗
                </Link>
              </div>
              {qbAge34Trend ? (
                <dl className="mt-5 grid grid-cols-2 gap-3">
                  <Metric label="Observations" value={formatNumber(qbAgeTrend.quality.observationsUsed)} />
                  <Metric label="Cohort n" value={formatNumber(qbAge34Trend.n)} />
                  <Metric label="Lift" value={formatSignedPercent(qbAge34Trend.relativeDelta)} accent={BRAND_COLORS.softUltraviolet} />
                  <Metric label="p-value" value={formatPValue(qbAge34Trend.pValue)} />
                </dl>
              ) : (
                <p className="mt-5 text-sm leading-6 text-ink-400">No cohort cleared the minimum sample gate.</p>
              )}
              <p className="mt-5 text-sm leading-6 text-ink-400">
                Source-computed from public nflverse player stats, player birth dates, and schedules across{" "}
                {qbAgeTrend.seasonRange.start ?? "N/A"}-{qbAgeTrend.seasonRange.end ?? "N/A"}. This result does
                not affect scoring until persisted joins, backtests, and model-version review clear.
              </p>
              <Link
                href="/nflverse"
                className="mt-5 inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors"
                style={{
                  borderColor: `${BRAND_COLORS.softUltraviolet}40`,
                  color: BRAND_COLORS.softUltraviolet,
                }}
              >
                Inspect source rows
              </Link>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div
              className="overflow-hidden rounded-2xl border"
              style={{
                borderColor: "rgba(255,255,255,0.08)",
                background: "rgba(8,6,20,0.5)",
              }}
            >
              <div
                className="px-4 py-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: `${BRAND_COLORS.softUltraviolet}06` }}
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: BRAND_COLORS.softUltraviolet }}>
                  Cohort breakdown
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead
                    className="font-mono text-[10px] uppercase tracking-[0.14em]"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}
                  >
                    <tr>
                      <th className="px-4 py-3">Cohort</th>
                      <th className="px-4 py-3">n</th>
                      <th className="px-4 py-3">Mean</th>
                      <th className="px-4 py-3">Field</th>
                      <th className="px-4 py-3">Lift</th>
                      <th className="px-4 py-3">p-value</th>
                      <th className="px-4 py-3">Gate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {qbAgeTrend.trends.map((trend, i) => (
                      <tr
                        key={trend.cohort}
                        style={{ borderBottom: i < qbAgeTrend.trends.length - 1 ? "1px solid rgba(255,255,255,0.05)" : undefined }}
                      >
                        <td className="px-4 py-3 font-semibold text-white">{trend.cohort}</td>
                        <td className="px-4 py-3 font-mono text-ink-300">{formatNumber(trend.n)}</td>
                        <td className="px-4 py-3 font-mono text-ink-300">{formatPercent(trend.cohortMean)}</td>
                        <td className="px-4 py-3 font-mono text-ink-300">{formatPercent(trend.baselineMean)}</td>
                        <td className="px-4 py-3 font-mono" style={{ color: BRAND_COLORS.softUltraviolet }}>
                          {formatSignedPercent(trend.relativeDelta)}
                        </td>
                        <td className="px-4 py-3 font-mono text-ink-300">{formatPValue(trend.pValue)}</td>
                        <td className="px-4 py-3 font-mono text-ink-400">
                          {trend.significant ? "significant" : "watch"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>
        </section>

        {/* Birthday/milestone myth check */}
        <section className="grid gap-6 pb-10 lg:grid-cols-[0.72fr_1.28fr]"
          style={{ borderBottom: `1px solid rgba(255,255,255,0.07)` }}>
          <Reveal>
            <div
              className="overflow-hidden rounded-2xl border p-5 h-full"
              style={{
                borderColor: "rgba(255,100,112,0.22)",
                background: "linear-gradient(135deg, rgba(255,100,112,0.05) 0%, rgba(18,14,36,0.7) 100%)",
              }}
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: "#FF6470" }}>
                    Rejected narrative
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    Birthday and milestone boosts are not publishable.
                  </h2>
                </div>
                <Link
                  href="/api/nflverse/birthday-usage-trend"
                  className="font-mono text-xs font-semibold transition-colors hover:text-white"
                  style={{ color: "#FF6470" }}
                >
                  JSON ↗
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
                <p className="mt-5 text-sm leading-6 text-ink-400">The birthday-window report is unavailable.</p>
              )}
              <p className="mt-5 text-sm leading-6 text-ink-400">
                The lab compares birthday-window and career-milestone RB/WR/TE games to each player&apos;s prior
                four-game usage baseline. The current file says no: this is evidence against popular angles,
                not a scoring factor.
              </p>
              <Link
                href="/nflverse"
                className="mt-5 inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors"
                style={{ borderColor: "rgba(255,100,112,0.40)", color: "#FF6470" }}
              >
                Inspect the myth check
              </Link>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div
              className="overflow-hidden rounded-2xl border"
              style={{
                borderColor: "rgba(255,255,255,0.08)",
                background: "rgba(8,6,20,0.5)",
              }}
            >
              <div
                className="px-4 py-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,100,112,0.04)" }}
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "#FF6470" }}>
                  Sensitivity analysis
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead
                    className="font-mono text-[10px] uppercase tracking-[0.14em]"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}
                  >
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
                  <tbody>
                    {[
                      ...birthdayTrend.sensitivity,
                      ...birthdayTrend.milestoneSensitivity,
                      ...birthdayTrend.positionBreakdown,
                    ].map((comparison, i, arr) => (
                      <tr
                        key={`${comparison.label}-${comparison.metric}`}
                        style={{ borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.05)" : undefined }}
                      >
                        <td className="px-4 py-3 font-semibold text-white">{comparison.label}</td>
                        <td className="px-4 py-3 font-mono text-ink-300">{formatNumber(comparison.n)}</td>
                        <td className="px-4 py-3 font-mono text-ink-300">{formatNumber(comparison.baselineN)}</td>
                        <td className="px-4 py-3 font-mono text-ink-300">
                          {comparison.metric === "relative-opportunity-lift"
                            ? formatSignedPercent(comparison.cohortMean)
                            : `${formatSignedDecimal(comparison.cohortMean)} opp`}
                        </td>
                        <td className="px-4 py-3 font-mono" style={{ color: BRAND_COLORS.orbitalCyan }}>
                          {comparison.metric === "relative-opportunity-lift"
                            ? formatSignedPercent(comparison.absoluteDelta)
                            : `${formatSignedDecimal(comparison.absoluteDelta)} opp`}
                        </td>
                        <td className="px-4 py-3 font-mono text-ink-300">{formatPValue(comparison.pValue)}</td>
                        <td className="px-4 py-3 font-mono text-ink-400">{comparison.gate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>
        </section>

        {/* Published trends + source stack */}
        <section className="grid gap-6 pb-10 lg:grid-cols-[1.1fr_0.9fr]">
          <Reveal>
            <div
              className="overflow-hidden rounded-2xl border h-full"
              style={{
                borderColor: `${BRAND_COLORS.orbitalCyan}22`,
                background: `linear-gradient(135deg, ${BRAND_COLORS.orbitalCyan}04 0%, rgba(18,14,36,0.8) 100%)`,
              }}
            >
              <div
                className="px-5 py-4"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: BRAND_COLORS.orbitalCyan }}>
                  Published trends
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">No synthetic p-values.</h2>
              </div>
              {workbench.topTrends.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead
                      className="font-mono text-[10px] uppercase tracking-[0.14em]"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)", background: "rgba(0,229,255,0.04)" }}
                    >
                      <tr>
                        <th className="px-4 py-3">Cohort</th>
                        <th className="px-4 py-3">n</th>
                        <th className="px-4 py-3">Mean</th>
                        <th className="px-4 py-3">Baseline</th>
                        <th className="px-4 py-3">Delta</th>
                        <th className="px-4 py-3">p-value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workbench.topTrends.map((trend, i) => (
                        <tr
                          key={`${trend.feature}-${trend.cohort}`}
                          style={{ borderBottom: i < workbench.topTrends.length - 1 ? "1px solid rgba(255,255,255,0.05)" : undefined }}
                        >
                          <td className="px-4 py-3 font-semibold text-white">{trend.cohort}</td>
                          <td className="px-4 py-3 font-mono text-ink-300">{trend.n}</td>
                          <td className="px-4 py-3 font-mono text-ink-300">{trend.cohortMean.toFixed(3)}</td>
                          <td className="px-4 py-3 font-mono text-ink-300">{trend.baselineMean.toFixed(3)}</td>
                          <td className="px-4 py-3 font-mono" style={{ color: BRAND_COLORS.orbitalCyan }}>
                            {(trend.relativeDelta * 100).toFixed(1)}%
                          </td>
                          <td className="px-4 py-3 font-mono text-ink-300">{trend.pValue.toExponential(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-5">
                  <div
                    className="overflow-hidden rounded-xl border p-5"
                    style={{
                      borderColor: `${BRAND_COLORS.orbitalCyan}18`,
                      background: `${BRAND_COLORS.orbitalCyan}06`,
                    }}
                  >
                    <h3 className="text-lg font-semibold text-white">The lab is waiting on real rows.</h3>
                    <p className="mt-3 text-sm leading-6 text-ink-400">
                      No trend is published from placeholder observations. The first target is the
                      QB-age-to-RB-target-share question: join rosters, player weekly stats,
                      snap counts, and schedules, then let the engine compare age cohorts to the field.
                    </p>
                    <Link
                      href="/integrations"
                      className="mt-5 inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors"
                      style={{ borderColor: `${BRAND_COLORS.orbitalCyan}40`, color: BRAND_COLORS.orbitalCyan }}
                    >
                      View data readiness
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div
              className="overflow-hidden rounded-2xl border p-5 h-full"
              style={{
                borderColor: `${BRAND_COLORS.softUltraviolet}22`,
                background: `linear-gradient(135deg, ${BRAND_COLORS.softUltraviolet}05 0%, rgba(18,14,36,0.8) 100%)`,
              }}
            >
              <div
                className="mb-4 h-0.5 w-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${BRAND_COLORS.softUltraviolet}, transparent 70%)` }}
                aria-hidden="true"
              />
              <p className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: BRAND_COLORS.softUltraviolet }}>
                Cost-efficient source stack
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Free first. Paid only where it compounds.</h2>
              <div
                className="mt-5 flex flex-col overflow-hidden rounded-xl border"
                style={{ borderColor: "rgba(255,255,255,0.08)" }}
              >
                {PUBLIC_DATA_SOURCES.slice(0, 8).map((source, i) => (
                  <div
                    key={source.key}
                    className="grid gap-3 p-4 sm:grid-cols-[1fr_auto]"
                    style={{ borderBottom: i < 7 ? "1px solid rgba(255,255,255,0.06)" : undefined }}
                  >
                    <div>
                      <p className="font-semibold text-white">{source.name}</p>
                      <p className="mt-1 text-xs leading-5 text-ink-400">{source.unlocks}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: BRAND_COLORS.orbitalCyan }}>
                        {sourceCostLabel(source.cost)}
                      </p>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500">
                        {sourceStatusLabel(source.status)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div
                className="mt-5 overflow-hidden rounded-xl border p-4"
                style={{ borderColor: `${BRAND_COLORS.orbitalCyan}18`, background: `${BRAND_COLORS.orbitalCyan}04` }}
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: BRAND_COLORS.orbitalCyan }}>
                  Context feeds
                </p>
                <div className="mt-4 space-y-4">
                  {CONTEXT_INTELLIGENCE_SOURCES.map((source) => (
                    <div
                      key={source.key}
                      className="pl-3"
                      style={{ borderLeft: `2px solid ${BRAND_COLORS.orbitalCyan}30` }}
                    >
                      <div className="flex flex-col justify-between gap-2 sm:flex-row">
                        <p className="font-semibold text-white">{source.name}</p>
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500">
                          {sourceStatusLabel(source.status)}
                        </p>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-ink-400">{source.liveClaim}</p>
                      {source.complianceNote ? (
                        <p className="mt-1 text-xs leading-5 text-ink-500">{source.complianceNote}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* Research queue */}
        <Reveal>
          <section
            className="overflow-hidden rounded-2xl border pb-8 pt-0"
            style={{
              borderColor: `${BRAND_COLORS.orbitalCyan}18`,
              background: `linear-gradient(135deg, ${BRAND_COLORS.orbitalCyan}04 0%, rgba(18,14,36,0.8) 100%)`,
            }}
          >
            <div
              className="flex flex-col justify-between gap-4 px-5 py-5 sm:flex-row sm:items-end"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: BRAND_COLORS.orbitalCyan }}>
                  Research queue
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Questions worth mining first</h2>
              </div>
              <Link
                href="/methodology"
                className="text-sm font-semibold transition-colors hover:text-white"
                style={{ color: BRAND_COLORS.orbitalCyan }}
              >
                Methodology →
              </Link>
            </div>
            <div className="mt-0 grid gap-px overflow-hidden lg:grid-cols-5" style={{ background: "rgba(0,229,255,0.06)" }}>
              {workbench.backlog.map((item) => (
                <article
                  key={item.key}
                  className="min-h-80 p-4"
                  style={{ background: BRAND_COLORS.obsidianBlack }}
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: BRAND_COLORS.orbitalCyan }}>
                    {item.status.replace(/-/g, " ")}
                  </p>
                  <h3 className="mt-3 text-lg font-semibold leading-tight text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-ink-400">{item.question}</p>
                  <dl className="mt-4 space-y-3 text-xs">
                    <div>
                      <dt className="font-mono uppercase tracking-[0.12em] text-ink-500">Metric</dt>
                      <dd className="mt-1 text-ink-300">{item.metric}</dd>
                    </div>
                    <div>
                      <dt className="font-mono uppercase tracking-[0.12em] text-ink-500">Cohort</dt>
                      <dd className="mt-1 text-ink-300">{item.cohort}</dd>
                    </div>
                    <div>
                      <dt className="font-mono uppercase tracking-[0.12em] text-ink-500">Sources</dt>
                      <dd className="mt-1 text-ink-300">{item.requiredSources.join(", ")}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </section>
        </Reveal>

      </main>
      <Footer />
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}): JSX.Element {
  return (
    <div
      className="overflow-hidden rounded-lg border px-3 py-2"
      style={{
        borderColor: accent ? `${accent}30` : "rgba(255,255,255,0.09)",
        background: accent ? `${accent}08` : "rgba(255,255,255,0.03)",
      }}
    >
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500">{label}</dt>
      <dd
        className="mt-1 font-numerals text-2xl font-semibold tabular-nums"
        style={{ color: accent ?? "white" }}
      >
        {value}
      </dd>
    </div>
  );
}
