import { db } from "@sports/db";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import type { PickType, PickTier } from "@sports/types";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// Data fetching
// ─────────────────────────────────────────────

async function getPerformanceSummaries(): Promise<PerformanceSummary[]> {
  return db.performanceSummary.findMany({
    orderBy: [{ period: "desc" }, { totalPicks: "desc" }],
    take: 100,
  }) as Promise<PerformanceSummary[]>;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

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
  const decidedPicks = wins + losses;
  const winRate = decidedPicks > 0 ? (wins / decidedPicks) * 100 : null;
  return { wins, losses, pushes, totalPicks, winRate };
}

function winRateColor(rate: number): string {
  if (rate >= 60) return "text-green-400";
  if (rate >= 55) return "text-brand-400";
  if (rate >= 50) return "text-yellow-400";
  return "text-red-400";
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default async function PerformancePage() {
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

  const SPORT_DISPLAY_NAMES: Record<string, string> = {
    nfl: "NFL",
    nba: "NBA",
    mlb: "MLB",
    nhl: "NHL",
    ncaaf: "NCAAF",
    ncaab: "NCAAB",
    soccer: "Soccer",
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-950">
      <Nav />

      <main className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <div className="mb-10 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Track Record
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-gray-400">
              Every pick result is published here. No cherrypicking, no
              re-grading — the record speaks for itself.
            </p>
            <p className="mt-3 text-xs text-gray-600">
              Past performance does not guarantee future results. Sports betting
              involves risk.
            </p>
          </div>

          {/* Error state */}
          {fetchError && (
            <div className="rounded-xl border border-red-800/60 bg-red-950/40 p-6 text-center">
              <p className="text-sm text-red-400">{fetchError}</p>
            </div>
          )}

          {/* Empty state */}
          {!fetchError && summaries.length === 0 && (
            <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-12 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-800">
                <svg
                  className="h-7 w-7 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
                  />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-white">
                No performance data yet
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Performance summaries are computed after games settle. Check
                back after the first results are recorded.
              </p>
            </div>
          )}

          {summaries.length > 0 && (
            <>
              {/* Overall headline stats */}
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
                          : "—"
                      }
                      accent={
                        overall.winRate !== null
                          ? winRateColor(overall.winRate)
                          : "text-gray-400"
                      }
                      large
                    />
                    <OverallStat label="Wins" value={overall.wins.toString()} accent="text-green-400" />
                    <OverallStat label="Losses" value={overall.losses.toString()} accent="text-red-400" />
                    <OverallStat
                      label="Pushes"
                      value={overall.pushes.toString()}
                      accent="text-gray-400"
                    />
                  </div>
                  <div className="border-t border-gray-800 px-6 py-3">
                    <p className="text-xs text-gray-600">
                      Based on {overall.totalPicks} total published picks.
                      Win rate excludes pushes.
                    </p>
                  </div>
                </div>
              </section>

              {/* Per-sport breakdown */}
              {bySport.size > 0 && (
                <section className="mb-12">
                  <h2 className="mb-5 text-xl font-bold text-white">
                    By Sport (All-Time)
                  </h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from(bySport.entries()).map(
                      ([sport, sportSummaries]) => {
                        const w = sportSummaries.reduce(
                          (a, s) => a + s.wins,
                          0
                        );
                        const l = sportSummaries.reduce(
                          (a, s) => a + s.losses,
                          0
                        );
                        const p = sportSummaries.reduce(
                          (a, s) => a + s.pushes,
                          0
                        );
                        const total = sportSummaries.reduce(
                          (a, s) => a + s.totalPicks,
                          0
                        );
                        const decided = w + l;
                        const wr =
                          decided > 0
                            ? (w / decided) * 100
                            : null;

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
                      }
                    )}
                  </div>
                </section>
              )}

              {/* Recent period summaries */}
              {recentSummaries.length > 0 && (
                <section className="mb-12">
                  <h2 className="mb-5 text-xl font-bold text-white">
                    Recent Periods
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
                            decided > 0
                              ? (s.wins / decided) * 100
                              : null;
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
                                  <span className="text-gray-600">—</span>
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

              {/* Win rate explanation */}
              <section className="rounded-xl border border-gray-800 bg-gray-900/40 p-6">
                <h2 className="mb-3 text-sm font-semibold text-white">
                  How We Calculate Win Rate
                </h2>
                <div className="grid grid-cols-1 gap-4 text-sm text-gray-400 sm:grid-cols-2">
                  <p>
                    Win rate is calculated as{" "}
                    <code className="rounded bg-gray-800 px-1 py-0.5 font-mono text-xs text-gray-300">
                      Wins / (Wins + Losses)
                    </code>
                    . Push results are excluded from the denominator since
                    they represent no outcome.
                  </p>
                  <p>
                    All picks are logged at the time of generation with the
                    closing line. Results are graded against the official game
                    outcome. No picks are deleted or modified retroactively.
                  </p>
                </div>
              </section>

              {/* Disclaimer */}
              <p className="mt-8 text-center text-xs text-gray-600">
                Past performance does not guarantee future results. SportsPicks
                Pro provides data-driven analysis for informational purposes only.
                We do not guarantee outcomes. Please gamble responsibly.
              </p>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

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
            className={[
              "text-2xl font-extrabold",
              winRateColor(winRate),
            ].join(" ")}
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
        {totalPicks} total picks
      </p>

      {/* Win rate bar */}
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
