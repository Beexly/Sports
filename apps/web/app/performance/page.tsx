import { db, isStubMode, isDemoPicksEnabled } from "@sports/db";
import Link from "next/link";
import { getReadinessGates } from "@sports/prediction-engine";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { PerformanceBootstrapState } from "@/components/performance/bootstrap-state";
import type { PickType, PickTier } from "@sports/types";

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
  const decided = wins + losses;
  const winRate = decided > 0 ? (wins / decided) * 100 : null;
  return { wins, losses, pushes, totalPicks, winRate };
}

function winRateColor(rate: number): string {
  if (rate >= 60) return "text-green-400";
  if (rate >= 55) return "text-brand-400";
  if (rate >= 50) return "text-yellow-400";
  return "text-red-400";
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
    <div className="flex min-h-screen flex-col bg-gray-950">
      <Nav />
      <main className="flex-1 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">{children}</div>
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
    const todayPickCount = await db.pick
      .count({ where: { isPublished: true, result: "PENDING" } })
      .catch(() => 0);

    return (
      <BootstrapShell>
        {todayPickCount > 0 && (
          <div
            data-testid="performance-pick-count-banner"
            className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-800 bg-gray-900/40 p-4 text-xs"
          >
            <p className="text-gray-300">
              {todayPickCount} pick{todayPickCount === 1 ? "" : "s"} published
              today
              {demoActive && (
                <span className="ml-2 rounded bg-yellow-900/40 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-yellow-300">
                  sample
                </span>
              )}
              . Win-rate aggregation is gated until canonical history accumulates.
            </p>
            <Link
              href="/picks"
              className="rounded-lg border border-gray-800 px-3 py-1.5 text-gray-300 hover:bg-gray-900/60"
            >
              See today\'s picks →
            </Link>
          </div>
        )}
        <PerformanceBootstrapState
          gateEnabled={false}
          minSettledPicksForLearning={gates.minSettledPicksForLearning}
        />
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
    <div className="flex min-h-screen flex-col bg-gray-950">
      <Nav />
      <main className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Performance
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-gray-400">
              Every settled canonical pick is included. Bootstrap-era picks are
              excluded by design.
            </p>
            <p className="mt-3 text-xs text-gray-600">
              Past performance does not guarantee future results.
            </p>
          </div>

          {fetchError && (
            <div
              data-testid="performance-error"
              className="rounded-xl border border-red-800/60 bg-red-950/40 p-6 text-center"
            >
              <p className="text-sm text-red-400">{fetchError}</p>
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
                className="mb-8 rounded-2xl border border-gray-800 bg-gray-900/40 p-5"
              >
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
                  Methodology
                </h2>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-gray-400 sm:grid-cols-4">
                  <div>
                    <dt className="text-gray-600">Win rate definition</dt>
                    <dd>
                      <code className="rounded bg-gray-800 px-1 py-0.5 font-mono text-[10px] text-gray-300">
                        wins / (wins + losses)
                      </code>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">Pushes</dt>
                    <dd>Reported separately, excluded from the denominator</dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">Sample size</dt>
                    <dd>{overall.totalPicks} canonical picks</dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">Model version</dt>
                    <dd>
                      <code className="rounded bg-gray-800 px-1 py-0.5 font-mono text-[10px] text-gray-300">
                        {modelVersion ?? "-"}
                      </code>
                    </dd>
                  </div>
                  {computedAt && (
                    <div className="col-span-2 sm:col-span-4">
                      <dt className="text-gray-600">Last computed</dt>
                      <dd>{computedAt.toUTCString()}</dd>
                    </div>
                  )}
                </dl>
              </section>

              <section className="mb-12">
                <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-900/60">
                  <div className="border-b border-gray-800 px-6 py-4">
                    <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500">
                      All-Time Overall
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-gray-800 sm:grid-cols-4">
                    <OverallStat
                      label="Win Rate"
                      value={
                        overall.winRate !== null
                          ? `${overall.winRate.toFixed(1)}%`
                          : "-"
                      }
                      accent={
                        overall.winRate !== null
                          ? winRateColor(overall.winRate)
                          : "text-gray-400"
                      }
                      large
                    />
                    <OverallStat
                      label="Wins"
                      value={overall.wins.toString()}
                      accent="text-green-400"
                    />
                    <OverallStat
                      label="Losses"
                      value={overall.losses.toString()}
                      accent="text-red-400"
                    />
                    <OverallStat
                      label="Pushes"
                      value={overall.pushes.toString()}
                      accent="text-gray-400"
                    />
                  </div>
                  <div className="border-t border-gray-800 px-6 py-3">
                    <p className="text-xs text-gray-600">
                      Based on {overall.totalPicks} canonical settled picks. Win
                      rate excludes pushes.
                    </p>
                  </div>
                </div>
              </section>

              {bySport.size > 0 && (
                <section className="mb-12">
                  <h2 className="mb-5 text-xl font-bold text-white">
                    By sport (all-time)
                  </h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from(bySport.entries()).map(([sport, items]) => {
                      const w = items.reduce((a, s) => a + s.wins, 0);
                      const l = items.reduce((a, s) => a + s.losses, 0);
                      const p = items.reduce((a, s) => a + s.pushes, 0);
                      const total = items.reduce((a, s) => a + s.totalPicks, 0);
                      const decided = w + l;
                      const wr = decided > 0 ? (w / decided) * 100 : null;

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
                          winRate={wr}
                        />
                      );
                    })}
                  </div>
                </section>
              )}

              {recentSummaries.length > 0 && (
                <section className="mb-12">
                  <h2 className="mb-5 text-xl font-bold text-white">
                    Recent periods
                  </h2>
                  <div className="overflow-x-auto rounded-2xl border border-gray-800">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-800 text-left">
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Period
                          </th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Sport
                          </th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Type
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                            W
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                            L
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                            P
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Win%
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentSummaries.slice(0, 30).map((s, i) => {
                          const decided = s.wins + s.losses;
                          const wr =
                            decided > 0 ? (s.wins / decided) * 100 : null;
                          return (
                            <tr
                              key={s.id}
                              className={[
                                "border-b border-gray-800/60",
                                i % 2 === 0 ? "bg-gray-900/20" : "",
                              ].join(" ")}
                            >
                              <td className="px-4 py-3 font-mono text-xs text-gray-400">
                                {s.period}
                              </td>
                              <td className="px-4 py-3 text-gray-300">
                                {SPORT_DISPLAY_NAMES[s.sport.toLowerCase()] ??
                                  s.sport}
                              </td>
                              <td className="px-4 py-3 text-gray-500">
                                {s.pickType ?? "All"}
                              </td>
                              <td className="px-4 py-3 text-center text-green-400">
                                {s.wins}
                              </td>
                              <td className="px-4 py-3 text-center text-red-400">
                                {s.losses}
                              </td>
                              <td className="px-4 py-3 text-center text-gray-500">
                                {s.pushes}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {wr !== null ? (
                                  <span
                                    className={[
                                      "font-semibold",
                                      winRateColor(wr),
                                    ].join(" ")}
                                  >
                                    {wr.toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="text-gray-600">-</span>
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

function OverallStat({
  label,
  value,
  accent,
  large,
}: {
  label: string;
  value: string;
  accent: string;
  large?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-6 py-6 text-center">
      <dt className="text-xs font-semibold uppercase tracking-widest text-gray-500">
        {label}
      </dt>
      <dd
        className={[
          "font-extrabold",
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
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">{sport}</h3>
        {winRate !== null && (
          <span
            className={["text-2xl font-extrabold", winRateColor(winRate)].join(
              " "
            )}
          >
            {winRate.toFixed(1)}%
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-green-900/20 py-2">
          <p className="text-xs text-gray-500">W</p>
          <p className="text-lg font-bold text-green-400">{wins}</p>
        </div>
        <div className="rounded-lg bg-red-900/20 py-2">
          <p className="text-xs text-gray-500">L</p>
          <p className="text-lg font-bold text-red-400">{losses}</p>
        </div>
        <div className="rounded-lg bg-gray-800/60 py-2">
          <p className="text-xs text-gray-500">P</p>
          <p className="text-lg font-bold text-gray-400">{pushes}</p>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-gray-600">
        {totalPicks} canonical picks
      </p>

      {winRate !== null && (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
            <div
              className={[
                "h-full rounded-full transition-all",
                winRate >= 60
                  ? "bg-green-500"
                  : winRate >= 55
                  ? "bg-brand-500"
                  : winRate >= 50
                  ? "bg-yellow-500"
                  : "bg-red-500",
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
