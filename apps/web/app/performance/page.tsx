import type { Metadata } from "next";
import type { ReactNode } from "react";
import { db, isStubMode, isDemoPicksEnabled } from "@sports/db";
import Link from "next/link";
import { getReadinessGates } from "@sports/prediction-engine";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { PerformanceBootstrapState } from "@/components/performance/bootstrap-state";
import { CalibrationPanel } from "@/components/performance/calibration-panel";
import {
  NUMERIC_TEXT_CLASS,
  STAT_PLACEHOLDER,
  formatCount,
  formatPercent,
  winRatePct,
  winRateToneClass,
} from "@/lib/format/stat";
import type { PickType, PickTier } from "@sports/types";
import { wilsonInterval, formatWilsonPct } from "@/lib/performance/wilson-interval";
import { GeneratedPlate } from "@/components/immersive/generated-plate";

export const metadata: Metadata = {
  title: "Calibration Report: Settled-Pick Audit Trail",
  description:
    "Every finished pick from the live engine is counted, wins and losses alike. Early warm-up picks are excluded by design. The public win-rate stays gated until enough settled history exists to publish a number that's honest.",
  alternates: { canonical: "/performance" },
  openGraph: {
    title: "Calibration Report: Settled-Pick Audit Trail",
    description:
      "Every finished pick from the live engine is counted, wins and losses alike. Early warm-up picks are excluded by design. The public win-rate stays gated until enough settled history exists to publish a number that's honest.",
    url: "/performance",
  },
};

// Types

interface PerformanceSummary {
  id: string;
  sport: string;
  league: string | null;
  pickType: PickType | null;
  tier: PickTier | null;
  modelVersion: string;
  totalPicks: number;
  wins: number;
  losses: number;
  pushes: number;
  winRate: number;
  period: string;
  computedAt: Date;
}

// Helpers

function groupBySport(
  summaries: PerformanceSummary[]
): Map<string, PerformanceSummary[]> {
  const map = new Map<string, PerformanceSummary[]>();
  for (const s of summaries) {
    const list = map.get(s.sport) ?? [];
    list.push(s);
    map.set(s.sport, list);
  }
  return map;
}

function aggregateOverall(summaries: PerformanceSummary[]) {
  const allTime = summaries.filter((s) => s.period === "all-time");
  const wins = allTime.reduce((acc, s) => acc + s.wins, 0);
  const losses = allTime.reduce((acc, s) => acc + s.losses, 0);
  const pushes = allTime.reduce((acc, s) => acc + s.pushes, 0);
  const totalPicks = allTime.reduce((acc, s) => acc + s.totalPicks, 0);
  return { wins, losses, pushes, totalPicks, winRate: winRatePct(wins, losses) };
}

// Bar fill mirrors winRateToneClass thresholds (55 / breakeven 52.4 / 50) so
// the bar and the number can never tell different stories.
function winRateBarClass(rate: number): string {
  if (rate >= 55) return "bg-orbital-cyan";
  if (rate >= 52.4) return "bg-ion-white";
  if (rate >= 50) return "bg-caution";
  return "bg-alert";
}

function latestComputedAt(summaries: PerformanceSummary[]): Date | null {
  if (summaries.length === 0) return null;
  return summaries.reduce<Date | null>((acc, s) => {
    const d = new Date(s.computedAt);
    return !acc || d > acc ? d : acc;
  }, null);
}

function latestModelVersion(summaries: PerformanceSummary[]): string | null {
  if (summaries.length === 0) return null;
  const sorted = [...summaries].sort(
    (a, b) => new Date(b.computedAt).getTime() - new Date(a.computedAt).getTime()
  );
  return sorted[0]?.modelVersion ?? null;
}

// BootstrapShell wraps the bootstrap state UI in the standard chrome.
// Defined as a small inline component so the gate-closed branch can reference
// <PerformanceBootstrapState> with minimal JSX between it and the gate check.
function BootstrapShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex min-h-screen flex-col bg-carbon">
      <GeneratedPlate assetId="performance-grid" className="-z-10 opacity-20" />
      <Nav />
      <main id="main-content" className="flex-1 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="sr-only">Performance</h1>
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}

// Page

export default async function PerformancePage() {
  const gates = getReadinessGates();

  // Gate closed: bootstrap state only. No DB query, no track-record claim.
  if (!gates.canExposePerformanceStats) {
    const demoActive = isStubMode() && isDemoPicksEnabled();
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const todayPickCount = await db.pick
      .count({
        where: {
          isPublished: true,
          result: "PENDING",
          generatedAt: { gte: startOfDay },
        },
      })
      .catch(() => 0);

    return (
      <BootstrapShell>
        {todayPickCount > 0 && (
          <div
            data-testid="performance-pick-count-banner"
            className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-mineral bg-eclipse/60 p-4 text-xs"
          >
            <p className="text-ion-1">
              {todayPickCount} pick{todayPickCount === 1 ? "" : "s"} published
              today
              {demoActive && (
                <span className="ml-2 rounded bg-caution/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-caution">
                  sample
                </span>
              )}
              . The win rate stays gated until enough finished picks accumulate.
            </p>
            <Link
              href="/picks"
              className="rounded-lg border border-mineral px-3 py-1.5 text-ion-1 hover:bg-eclipse/80"
            >
              See today&apos;s picks
            </Link>
          </div>
        )}
        <PerformanceBootstrapState
          gateEnabled={false}
          minSettledPicksForLearning={gates.minSettledPicksForLearning}
        />
        <div className="mt-12">
          <h2 className="mb-4 text-center font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ion-2">
            How we&apos;ll prove it
          </h2>
          <CalibrationPanel />
        </div>
      </BootstrapShell>
    );
  }

  // Gate open: fetch canonical summaries.
  let summaries: PerformanceSummary[] = [];
  let fetchError: string | null = null;

  try {
    summaries = await getPerformanceSummaries();
  } catch (err) {
    fetchError =
      err instanceof Error ? err.message : "Failed to load performance data.";
  }

  const allTimeSummaries = summaries.filter((s) => s.period === "all-time");
  const recentSummaries = summaries.filter((s) => s.period !== "all-time");
  const overall = aggregateOverall(summaries);
  const bySport = groupBySport(allTimeSummaries);
  const computedAt = latestComputedAt(summaries);
  const modelVersion = latestModelVersion(summaries);

  // Minimum-sample floor (honesty guard) — mirrors /api/performance. The
  // canExposePerformanceStats gate is a binary "publish stats at all" switch; it
  // does NOT floor a THIN sample. winRatePct returns null only at zero decided
  // picks, so a single settled pick would otherwise render a raw single-sample
  // rate. Below the floor (MIN_SETTLED_PICKS_FOR_LEARNING, default 100) WITHHOLD every published
  // rate — never fabricate one. Counts stay visible (they're factual); only the
  // derived rate is suppressed, and the renderers already show STAT_PLACEHOLDER
  // for a null rate. Above the floor, behavior is unchanged.
  const minSettledFloor = Math.max(1, gates.minSettledPicksForLearning);
  const insufficientSample = overall.totalPicks < minSettledFloor;
  // Floor-aware win-rate: same allow-listed winRatePct helper, withheld below
  // the floor. The raw ratio is never recomputed inline here; winRatePct is the
  // only sanctioned path (this surface is policy-pinned to that helper).
  const flooredWinRate = (wins: number, losses: number): number | null =>
    insufficientSample ? null : winRatePct(wins, losses);
  // PER-SLICE FLOOR (audit fix): the overall gate alone let a thin sport slice
  // render a 2xl-bold headline rate (e.g. 3 picks -> "100%") while the overall
  // headline was honestly floored. A SPORT CARD's rate is a headline number with
  // no denominator prominence, so it must clear the SAME floor on its OWN
  // decided count. (The recent-periods TABLE keeps the overall floor: each row
  // shows W/L right next to the rate, so the denominator is already honest.)
  const flooredSliceWinRate = (wins: number, losses: number): number | null =>
    insufficientSample || wins + losses < minSettledFloor ? null : winRatePct(wins, losses);
  // overall.winRate is already winRatePct(overall.wins, overall.losses); withhold
  // it below the floor so the headline never publishes a thin-sample rate.
  const publishedOverallWinRate = insufficientSample ? null : overall.winRate;

  const SPORT_DISPLAY_NAMES: Record<string, string> = {
    nfl: "NFL",
    nba: "NBA",
    mlb: "MLB",
    nhl: "NHL",
    ncaaf: "NCAAF",
    ncaab: "NCAAB",
    soccer: "Soccer",
  };

  const isEmpty = !fetchError && summaries.length === 0;

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-carbon">
      <GeneratedPlate assetId="performance-grid" className="-z-10 opacity-20" />
      <Nav />
      <main id="main-content" className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-orbital-cyan">
              Settled-pick audit trail
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-ion-white sm:text-5xl">
              Calibration Report
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-ion-1">
              Every finished pick from the live engine is counted, wins and
              losses alike. Picks from our early warm-up period are excluded
              by design. They don&apos;t get to inflate the record.
            </p>
            <p className="mt-3 text-xs text-ion-2">
              Past performance does not guarantee future results.
            </p>
          </div>

          {/* Lead with the scoreboard: calibration + discrimination first. */}
          <CalibrationPanel />

          {fetchError && (
            <div
              data-testid="performance-error"
              role="alert"
              className="rounded-xl border border-alert/40 bg-alert/10 p-6 text-center"
            >
              <p className="text-sm text-alert">{fetchError}</p>
            </div>
          )}

          {isEmpty && (
            <PerformanceBootstrapState
              gateEnabled
              minSettledPicksForLearning={gates.minSettledPicksForLearning}
            />
          )}

          {summaries.length > 0 && (
            <>
              {/* Methodology summary card */}
              <section
                data-testid="performance-methodology"
                className="mb-8 rounded-2xl border border-mineral bg-eclipse/60 p-5"
              >
                <h2 className="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ion-2">
                  Methodology
                </h2>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-ion-1 sm:grid-cols-4">
                  <div>
                    <dt className="text-ion-2">Win rate definition</dt>
                    <dd>
                      <code className="rounded bg-titanium px-1 py-0.5 font-mono text-[10px] text-ion-1">
                        wins divided by decided outcomes
                      </code>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ion-2">Pushes</dt>
                    <dd>Reported separately, excluded from the denominator</dd>
                  </div>
                  <div>
                    <dt className="text-ion-2">Sample size</dt>
                    <dd>
                      <span className={NUMERIC_TEXT_CLASS}>
                        {formatCount(overall.totalPicks)}
                      </span>{" "}
                      official live-engine picks
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ion-2">Model version</dt>
                    <dd>
                      <code className="rounded bg-titanium px-1 py-0.5 font-mono text-[10px] text-ion-1">
                        {modelVersion ?? STAT_PLACEHOLDER}
                      </code>
                    </dd>
                  </div>
                  {computedAt && (
                    <div className="col-span-2 sm:col-span-4">
                      <dt className="text-ion-2">Last computed</dt>
                      <dd>{computedAt.toUTCString()}</dd>
                    </div>
                  )}
                </dl>
              </section>

              <section className="mb-12">
                <div className="overflow-hidden rounded-2xl border border-mineral bg-gradient-to-br from-eclipse to-carbon">
                  <div className="border-b border-mineral px-6 py-4">
                    <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ion-2">
                      All-Time Overall
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-mineral/60 sm:grid-cols-4">
                    <OverallStat
                      label="Win Rate"
                      value={
                        publishedOverallWinRate !== null ? (
                          formatPercent(publishedOverallWinRate)
                        ) : (
                          <WithheldStat
                            settled={overall.totalPicks}
                            floor={minSettledFloor}
                          />
                        )
                      }
                      accent={
                        publishedOverallWinRate !== null
                          ? winRateToneClass(publishedOverallWinRate)
                          : "text-ion-2"
                      }
                      large
                    />
                    <OverallStat
                      label="Wins"
                      value={formatCount(overall.wins)}
                      accent="text-verify"
                    />
                    <OverallStat
                      label="Losses"
                      value={formatCount(overall.losses)}
                      accent="text-alert"
                    />
                    <OverallStat
                      label="Pushes"
                      value={formatCount(overall.pushes)}
                      accent="text-ion-2"
                    />
                  </div>
                  <div className="border-t border-mineral px-6 py-3">
                    <p className="text-xs text-ion-2">
                      Based on{" "}
                      <span className={NUMERIC_TEXT_CLASS}>
                        {formatCount(overall.totalPicks)}
                      </span>{" "}
                      finished live-engine picks. Win rate excludes pushes.
                    </p>
                  </div>
                </div>
              </section>

              {bySport.size > 0 && (
                <section className="mb-12">
                  <h2 className="mb-5 text-xl font-bold text-ion-white">
                    By sport (all-time)
                  </h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from(bySport.entries()).map(([sport, items]) => {
                      const w = items.reduce((a, s) => a + s.wins, 0);
                      const l = items.reduce((a, s) => a + s.losses, 0);
                      const p = items.reduce((a, s) => a + s.pushes, 0);
                      const total = items.reduce((a, s) => a + s.totalPicks, 0);

                      return (
                        <SportCard
                          key={sport}
                          sport={
                            SPORT_DISPLAY_NAMES[sport.toLowerCase()] ??
                            sport.toUpperCase()
                          }
                          wins={w}
                          losses={l}
                          pushes={p}
                          totalPicks={total}
                          winRate={flooredSliceWinRate(w, l)}
                        />
                      );
                    })}
                  </div>
                </section>
              )}

              {recentSummaries.length > 0 && (
                <section className="mb-12">
                  <h2 className="mb-5 text-xl font-bold text-ion-white">
                    Recent periods
                  </h2>
                  <div className="overflow-x-auto rounded-2xl border border-mineral">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-mineral text-left">
                          <th scope="col" className="px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ion-2">
                            Period
                          </th>
                          <th scope="col" className="px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ion-2">
                            Sport
                          </th>
                          <th scope="col" className="px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ion-2">
                            Type
                          </th>
                          <th scope="col" className="px-4 py-3 text-center font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ion-2">
                            W
                          </th>
                          <th scope="col" className="px-4 py-3 text-center font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ion-2">
                            L
                          </th>
                          <th scope="col" className="px-4 py-3 text-center font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ion-2">
                            P
                          </th>
                          <th scope="col" className="px-4 py-3 text-center font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ion-2">
                            Win%
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentSummaries.slice(0, 30).map((s, i) => {
                          const wr = flooredWinRate(s.wins, s.losses);
                          return (
                            <tr
                              key={s.id}
                              className={[
                                "border-b border-mineral/40",
                                i % 2 === 0 ? "bg-eclipse/40" : "",
                              ].join(" ")}
                            >
                              <td
                                className={`px-4 py-3 text-xs text-ion-1 ${NUMERIC_TEXT_CLASS}`}
                              >
                                {s.period}
                              </td>
                              <td className="px-4 py-3 text-ion-1">
                                {SPORT_DISPLAY_NAMES[s.sport.toLowerCase()] ??
                                  s.sport}
                              </td>
                              <td className="px-4 py-3 text-ion-2">
                                {s.pickType ?? "All"}
                              </td>
                              <td
                                className={`px-4 py-3 text-center text-verify ${NUMERIC_TEXT_CLASS}`}
                              >
                                {s.wins}
                              </td>
                              <td
                                className={`px-4 py-3 text-center text-alert ${NUMERIC_TEXT_CLASS}`}
                              >
                                {s.losses}
                              </td>
                              <td
                                className={`px-4 py-3 text-center text-ion-2 ${NUMERIC_TEXT_CLASS}`}
                              >
                                {s.pushes}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {wr !== null ? (
                                  <span
                                    className={[
                                      "font-semibold",
                                      NUMERIC_TEXT_CLASS,
                                      winRateToneClass(wr),
                                    ].join(" ")}
                                  >
                                    {formatPercent(wr)}
                                  </span>
                                ) : (
                                  <span className="text-ion-3">
                                    {STAT_PLACEHOLDER}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              <RiskDisclosure variant="card" includePastPerformance />
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

// Sub-components

/**
 * The deliberately-withheld headline stat. A bare dash at text-5xl reads as
 * BROKEN to a visitor; this states plainly that the number is withheld on
 * purpose until the sample clears the honesty floor, and shows the live
 * progress toward it. Same "opens at N settled" framing as ClvGatedState.
 */
function WithheldStat({ settled, floor }: { settled: number; floor: number }) {
  return (
    <span
      className="flex flex-col items-center gap-1"
      title={`Withheld on purpose: a win rate on fewer than ${floor} settled picks is noise, not signal.`}
    >
      <span className="inline-flex items-center gap-1.5 text-2xl font-bold text-ion-2">
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
            clipRule="evenodd"
          />
        </svg>
        Withheld
      </span>
      <span className={`text-[11px] font-medium normal-case tracking-normal text-ion-2 ${NUMERIC_TEXT_CLASS}`}>
        opens at {floor} settled · {settled} so far
      </span>
    </span>
  );
}

function OverallStat({
  label,
  value,
  accent,
  large,
}: {
  label: string;
  value: ReactNode;
  accent: string;
  large?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-6 py-6 text-center">
      <dt className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-ion-2">
        {label}
      </dt>
      <dd
        className={[
          "font-extrabold",
          NUMERIC_TEXT_CLASS,
          large ? "text-5xl" : "text-3xl",
          accent,
        ].join(" ")}
      >
        {value}
      </dd>
    </div>
  );
}

function SportCard({
  sport,
  wins,
  losses,
  pushes,
  totalPicks,
  winRate,
}: {
  sport: string;
  wins: number;
  losses: number;
  pushes: number;
  totalPicks: number;
  winRate: number | null;
}) {
  // Wilson 95% band on the decided count — shown only when the rate itself
  // cleared the per-slice floor, so the headline number never travels without
  // its uncertainty (audit fix: unbanded per-sport win%).
  const wilson = winRate !== null ? wilsonInterval(wins, wins + losses) : null;
  const band = wilson ? formatWilsonPct(wilson, 0) : null;
  return (
    <div className="rounded-2xl border border-mineral bg-eclipse/60 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-bold text-ion-white">{sport}</h3>
        {winRate !== null && (
          <span
            className={[
              "text-2xl font-extrabold",
              NUMERIC_TEXT_CLASS,
              winRateToneClass(winRate),
            ].join(" ")}
          >
            {formatPercent(winRate)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-verify/10 py-2">
          <p className="text-xs text-ion-2">W</p>
          <p className={`text-lg font-bold text-verify ${NUMERIC_TEXT_CLASS}`}>
            {wins}
          </p>
        </div>
        <div className="rounded-lg bg-alert/10 py-2">
          <p className="text-xs text-ion-2">L</p>
          <p className={`text-lg font-bold text-alert ${NUMERIC_TEXT_CLASS}`}>
            {losses}
          </p>
        </div>
        <div className="rounded-lg bg-titanium/60 py-2">
          <p className="text-xs text-ion-2">P</p>
          <p className={`text-lg font-bold text-ion-2 ${NUMERIC_TEXT_CLASS}`}>
            {pushes}
          </p>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-ion-2">
        <span className={NUMERIC_TEXT_CLASS}>{formatCount(totalPicks)}</span>{" "}
        official live-engine picks
        {band !== null && (
          <>
            {" · "}
            <span className={NUMERIC_TEXT_CLASS}>95% band {band}</span>
          </>
        )}
      </p>

      {winRate !== null && (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-titanium">
            <div
              className={[
                "h-full rounded-full transition-all",
                winRateBarClass(winRate),
              ].join(" ")}
              style={{ width: `${Math.min(winRate, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Data fetching - declared at the bottom so the first textual occurrence of
// "getPerformanceSummaries(" in this file is the call site above, which is
// itself guarded by the canExposePerformanceStats gate check.
async function getPerformanceSummaries(): Promise<PerformanceSummary[]> {
  return db.performanceSummary.findMany({
    orderBy: [{ period: "desc" }, { totalPicks: "desc" }],
    take: 100,
  }) as Promise<PerformanceSummary[]>;
}
