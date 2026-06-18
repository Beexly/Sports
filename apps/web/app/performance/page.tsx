import type { Metadata } from "next";
import { db, isStubMode, isDemoPicksEnabled } from "@sports/db";
import Link from "next/link";
import { getReadinessGates } from "@sports/prediction-engine";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { PerformanceBootstrapState } from "@/components/performance/bootstrap-state";
import { CalibrationPanel } from "@/components/performance/calibration-panel";
import {
  NUMERIC_TEXT_CLASS,
  STAT_PLACEHOLDER,
  formatCount,
  formatPercent,
  winRatePct,
} from "@/lib/format/stat";
import type { PickType, PickTier } from "@sports/types";
import { GeneratedPlate } from "@/components/immersive/generated-plate";
import { BRAND_COLORS } from "@/lib/brand";

const PERFORMANCE_TITLE = "Calibration Report — Settled-Pick Audit Trail";
const PERFORMANCE_DESCRIPTION =
  "Every settled canonical pick is included. Bootstrap-era picks are excluded by design. The public win-rate stays gated until enough settled history exists to publish a number that's honest.";

export const metadata: Metadata = {
  title: PERFORMANCE_TITLE,
  description: PERFORMANCE_DESCRIPTION,
  alternates: { canonical: "/performance" },
  openGraph: {
    title: PERFORMANCE_TITLE,
    description: PERFORMANCE_DESCRIPTION,
    url: "/performance",
    type: "website",
    siteName: "Galaxy Sports Edge",
  },
  twitter: { card: "summary_large_image", title: PERFORMANCE_TITLE, description: PERFORMANCE_DESCRIPTION },
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

// Chrome used for both the bootstrap (gate-closed) state and the full page
function PageChrome({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative isolate flex min-h-screen flex-col"
      style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem]"
        style={{
          background: `radial-gradient(55% 70% at 50% 0%, ${BRAND_COLORS.orbitalCyan}12, transparent 60%), radial-gradient(35% 50% at 80% 20%, ${BRAND_COLORS.softUltraviolet}0d, transparent 65%)`,
        }}
      />
      <GeneratedPlate assetId="performance-grid" className="absolute inset-0 -z-10 opacity-10" />
      <Nav />
      {children}
      <Footer />
    </div>
  );
}

// Page

export default async function PerformancePage() {
  const gates = getReadinessGates();

  // Gate closed: bootstrap state only.
  if (!gates.canExposePerformanceStats) {
    const demoActive = isStubMode() && isDemoPicksEnabled();
    const todayPickCount = await db.pick
      .count({ where: { isPublished: true, result: "PENDING" } })
      .catch(() => 0);

    return (
      <PageChrome>
        <main className="flex-1 px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <h1 className="sr-only">Performance · Calibration Report</h1>

            {/* Hero */}
            <Reveal>
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{
                  color: BRAND_COLORS.orbitalCyan,
                  borderColor: `${BRAND_COLORS.orbitalCyan}30`,
                  backgroundColor: `${BRAND_COLORS.orbitalCyan}0d`,
                }}
              >
                Calibration Report
              </span>
            </Reveal>
            <Reveal delay={80}>
              <h2
                className="mt-5 font-display text-balance text-white"
                style={{ fontSize: "clamp(2.4rem, 7vw, 4.5rem)", lineHeight: 1.0, letterSpacing: "-0.02em" }}
              >
                The record opens when{" "}
                <span
                  style={{
                    background: `linear-gradient(90deg, ${BRAND_COLORS.orbitalCyan} 0%, ${BRAND_COLORS.softUltraviolet} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  the math is honest.
                </span>
              </h2>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-ink-300">
                {PERFORMANCE_DESCRIPTION}
              </p>
            </Reveal>

            {todayPickCount > 0 && (
              <Reveal delay={220}>
                <div
                  data-testid="performance-pick-count-banner"
                  className="mt-8 flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-xl border p-4 text-sm"
                  style={{
                    borderColor: `${BRAND_COLORS.orbitalCyan}22`,
                    background: `${BRAND_COLORS.orbitalCyan}06`,
                  }}
                >
                  <p className="text-ink-300">
                    {todayPickCount} pick{todayPickCount === 1 ? "" : "s"} published today
                    {demoActive && (
                      <span className="ml-2 rounded bg-caution/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-caution">
                        sample
                      </span>
                    )}
                    . Win-rate aggregation is gated until canonical history accumulates.
                  </p>
                  <Link
                    href="/picks"
                    className="rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors hover:text-white"
                    style={{ borderColor: `${BRAND_COLORS.orbitalCyan}40`, color: BRAND_COLORS.orbitalCyan }}
                  >
                    See today&apos;s picks
                  </Link>
                </div>
              </Reveal>
            )}

            <Reveal delay={260}>
              <div className="mt-10">
                <PerformanceBootstrapState
                  gateEnabled={false}
                  minSettledPicksForLearning={gates.minSettledPicksForLearning}
                />
              </div>
            </Reveal>

            <Reveal delay={300}>
              <div className="mt-12">
                <p
                  className="mb-5 text-center font-mono text-[10px] uppercase tracking-[0.2em]"
                  style={{ color: BRAND_COLORS.orbitalCyan }}
                >
                  How we&apos;ll prove it
                </p>
                <CalibrationPanel />
              </div>
            </Reveal>
          </div>
        </main>
      </PageChrome>
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
    <PageChrome>
      <main className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">

          {/* Hero */}
          <div className="mb-12 pt-12">
            <Reveal>
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{
                  color: BRAND_COLORS.orbitalCyan,
                  borderColor: `${BRAND_COLORS.orbitalCyan}30`,
                  backgroundColor: `${BRAND_COLORS.orbitalCyan}0d`,
                }}
              >
                Calibration Report
              </span>
            </Reveal>
            <Reveal delay={80}>
              <h1
                className="mt-5 font-display text-balance text-white"
                style={{ fontSize: "clamp(2.4rem, 7vw, 4rem)", lineHeight: 1.0, letterSpacing: "-0.02em" }}
              >
                Every settled pick.{" "}
                <span
                  style={{
                    background: `linear-gradient(90deg, ${BRAND_COLORS.orbitalCyan} 0%, ${BRAND_COLORS.softUltraviolet} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Every result.
                </span>
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-ink-300">
                Every settled canonical pick is included. Bootstrap-era picks
                are excluded by design — they don&apos;t get to inflate the record.
              </p>
            </Reveal>
          </div>

          {/* Calibration panel first */}
          <Reveal>
            <CalibrationPanel />
          </Reveal>

          {fetchError && (
            <Reveal>
              <div
                data-testid="performance-error"
                role="alert"
                className="mt-8 rounded-xl border p-6 text-center"
                style={{ borderColor: "rgba(255,100,112,0.30)", background: "rgba(255,100,112,0.06)" }}
              >
                <p className="text-sm" style={{ color: "#FF6470" }}>{fetchError}</p>
              </div>
            </Reveal>
          )}

          {isEmpty && (
            <Reveal>
              <div className="mt-8">
                <PerformanceBootstrapState
                  gateEnabled
                  minSettledPicksForLearning={gates.minSettledPicksForLearning}
                />
              </div>
            </Reveal>
          )}

          {summaries.length > 0 && (
            <>
              {/* Methodology card */}
              <Reveal delay={60}>
                <section
                  data-testid="performance-methodology"
                  className="mt-8 overflow-hidden rounded-2xl border p-5"
                  style={{
                    borderColor: `${BRAND_COLORS.orbitalCyan}18`,
                    background: `linear-gradient(135deg, ${BRAND_COLORS.orbitalCyan}04 0%, rgba(18,14,36,0.7) 100%)`,
                  }}
                >
                  <div
                    className="mb-4 h-0.5 w-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${BRAND_COLORS.orbitalCyan}, transparent 70%)` }}
                    aria-hidden="true"
                  />
                  <p
                    className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em]"
                    style={{ color: BRAND_COLORS.orbitalCyan }}
                  >
                    Methodology
                  </p>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs sm:grid-cols-4">
                    <div>
                      <dt className="font-mono uppercase tracking-[0.1em] text-ink-500">Win rate definition</dt>
                      <dd className="mt-1 text-ink-300">
                        <code
                          className="rounded px-1 py-0.5 font-mono text-[10px]"
                          style={{ background: "rgba(255,255,255,0.07)", color: BRAND_COLORS.orbitalCyan }}
                        >
                          wins divided by decided outcomes
                        </code>
                      </dd>
                    </div>
                    <div>
                      <dt className="font-mono uppercase tracking-[0.1em] text-ink-500">Pushes</dt>
                      <dd className="mt-1 text-ink-300">Reported separately, excluded from denominator</dd>
                    </div>
                    <div>
                      <dt className="font-mono uppercase tracking-[0.1em] text-ink-500">Sample size</dt>
                      <dd className="mt-1 text-ink-300">
                        <span className={NUMERIC_TEXT_CLASS}>{formatCount(overall.totalPicks)}</span>{" "}
                        canonical picks
                      </dd>
                    </div>
                    <div>
                      <dt className="font-mono uppercase tracking-[0.1em] text-ink-500">Model version</dt>
                      <dd className="mt-1 text-ink-300">
                        <code
                          className="rounded px-1 py-0.5 font-mono text-[10px]"
                          style={{ background: "rgba(255,255,255,0.07)", color: BRAND_COLORS.orbitalCyan }}
                        >
                          {modelVersion ?? STAT_PLACEHOLDER}
                        </code>
                      </dd>
                    </div>
                    {computedAt && (
                      <div className="col-span-2 sm:col-span-4">
                        <dt className="font-mono uppercase tracking-[0.1em] text-ink-500">Last computed</dt>
                        <dd className="mt-1 text-ink-300">{computedAt.toUTCString()}</dd>
                      </div>
                    )}
                  </dl>
                </section>
              </Reveal>

              {/* All-time overall */}
              <Reveal delay={100}>
                <section className="mt-8 mb-10">
                  <div
                    className="overflow-hidden rounded-2xl border"
                    style={{
                      borderColor: `${BRAND_COLORS.orbitalCyan}22`,
                      background: `linear-gradient(140deg, ${BRAND_COLORS.orbitalCyan}06 0%, rgba(18,14,36,0.9) 60%)`,
                    }}
                  >
                    <div
                      className="px-6 py-4"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
                    >
                      <p
                        className="font-mono text-[10px] uppercase tracking-[0.2em]"
                        style={{ color: BRAND_COLORS.orbitalCyan }}
                      >
                        All-Time Overall
                      </p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                      <OverallStat
                        label="Win Rate"
                        value={formatPercent(overall.winRate)}
                        hexColor={
                          overall.winRate !== null
                            ? winRateHexColor(overall.winRate)
                            : "rgba(255,255,255,0.30)"
                        }
                        large
                      />
                      <OverallStat
                        label="Wins"
                        value={formatCount(overall.wins)}
                        hexColor={BRAND_COLORS.orbitalCyan}
                      />
                      <OverallStat
                        label="Losses"
                        value={formatCount(overall.losses)}
                        hexColor="#FF6470"
                      />
                      <OverallStat
                        label="Pushes"
                        value={formatCount(overall.pushes)}
                        hexColor="rgba(255,255,255,0.40)"
                      />
                    </div>
                    <div className="px-6 py-3">
                      <p className="text-xs text-ink-500">
                        Based on{" "}
                        <span className={NUMERIC_TEXT_CLASS}>{formatCount(overall.totalPicks)}</span>{" "}
                        canonical settled picks. Win rate excludes pushes.
                      </p>
                    </div>
                  </div>
                </section>
              </Reveal>

              {/* By sport */}
              {bySport.size > 0 && (
                <section className="mb-10">
                  <Reveal>
                    <h2
                      className="mb-6 font-display text-white"
                      style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)", lineHeight: 1.1 }}
                    >
                      By sport (all-time)
                    </h2>
                  </Reveal>
                  <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" step={60}>
                    {Array.from(bySport.entries()).map(([sport, items]) => {
                      const w = items.reduce((a, s) => a + s.wins, 0);
                      const l = items.reduce((a, s) => a + s.losses, 0);
                      const p = items.reduce((a, s) => a + s.pushes, 0);
                      const total = items.reduce((a, s) => a + s.totalPicks, 0);

                      return (
                        <SportCard
                          key={sport}
                          sport={SPORT_DISPLAY_NAMES[sport.toLowerCase()] ?? sport.toUpperCase()}
                          wins={w}
                          losses={l}
                          pushes={p}
                          totalPicks={total}
                          winRate={winRatePct(w, l)}
                        />
                      );
                    })}
                  </Stagger>
                </section>
              )}

              {/* Recent periods table */}
              {recentSummaries.length > 0 && (
                <section className="mb-10">
                  <Reveal>
                    <h2
                      className="mb-6 font-display text-white"
                      style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)", lineHeight: 1.1 }}
                    >
                      Recent periods
                    </h2>
                  </Reveal>
                  <Reveal delay={60}>
                    <div
                      className="overflow-hidden overflow-x-auto rounded-2xl border"
                      style={{
                        borderColor: "rgba(255,255,255,0.08)",
                        background: "rgba(8,6,20,0.5)",
                      }}
                    >
                      <table className="w-full text-sm">
                        <thead
                          className="font-mono text-[10px] uppercase tracking-wider"
                          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)", background: `${BRAND_COLORS.orbitalCyan}04` }}
                        >
                          <tr>
                            <th className="px-4 py-3 text-left">Period</th>
                            <th className="px-4 py-3 text-left">Sport</th>
                            <th className="px-4 py-3 text-left">Type</th>
                            <th className="px-4 py-3 text-center">W</th>
                            <th className="px-4 py-3 text-center">L</th>
                            <th className="px-4 py-3 text-center">P</th>
                            <th className="px-4 py-3 text-center">Win%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentSummaries.slice(0, 30).map((s, i) => {
                            const wr = winRatePct(s.wins, s.losses);
                            return (
                              <tr
                                key={s.id}
                                style={{
                                  borderBottom: i < Math.min(recentSummaries.length, 30) - 1 ? "1px solid rgba(255,255,255,0.05)" : undefined,
                                  background: i % 2 === 0 ? "rgba(255,255,255,0.015)" : undefined,
                                }}
                              >
                                <td className={`px-4 py-3 text-xs text-ink-300 ${NUMERIC_TEXT_CLASS}`}>
                                  {s.period}
                                </td>
                                <td className="px-4 py-3 text-ink-300">
                                  {SPORT_DISPLAY_NAMES[s.sport.toLowerCase()] ?? s.sport}
                                </td>
                                <td className="px-4 py-3 text-ink-400">
                                  {s.pickType ?? "All"}
                                </td>
                                <td className={`px-4 py-3 text-center ${NUMERIC_TEXT_CLASS}`} style={{ color: BRAND_COLORS.orbitalCyan }}>
                                  {s.wins}
                                </td>
                                <td className={`px-4 py-3 text-center text-alert ${NUMERIC_TEXT_CLASS}`}>
                                  {s.losses}
                                </td>
                                <td className={`px-4 py-3 text-center text-ink-400 ${NUMERIC_TEXT_CLASS}`}>
                                  {s.pushes}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {wr !== null ? (
                                    <span
                                      className={["font-semibold", NUMERIC_TEXT_CLASS].join(" ")}
                                      style={{ color: winRateHexColor(wr) }}
                                    >
                                      {formatPercent(wr)}
                                    </span>
                                  ) : (
                                    <span className="text-ink-500">{STAT_PLACEHOLDER}</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Reveal>
                </section>
              )}

              <Reveal delay={80}>
                <RiskDisclosure variant="card" includePastPerformance />
              </Reveal>
            </>
          )}
        </div>
      </main>
    </PageChrome>
  );
}

// Sub-components

function winRateHexColor(rate: number): string {
  if (rate >= 55) return BRAND_COLORS.orbitalCyan;
  if (rate >= 52.4) return "#F6F7FA";
  if (rate >= 50) return "#FFB454";
  return "#FF6470";
}

function OverallStat({
  label,
  value,
  hexColor,
  large,
}: {
  label: string;
  value: string;
  hexColor: string;
  large?: boolean;
}) {
  const glow = large && hexColor === BRAND_COLORS.orbitalCyan
    ? `drop-shadow(0 0 16px rgba(0,229,255,0.5))`
    : undefined;

  return (
    <div
      className="flex flex-col items-center gap-1 px-6 py-6 text-center"
      style={{
        borderRight: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <dt
        className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em]"
        style={{ color: "rgba(255,255,255,0.40)" }}
      >
        {label}
      </dt>
      <dd
        className={["font-extrabold tabular-nums", NUMERIC_TEXT_CLASS, large ? "text-5xl" : "text-3xl"].join(" ")}
        style={{ color: hexColor, filter: glow }}
      >
        {value}
      </dd>
    </div>
  );
}

function WinRateArc({ winRate }: { winRate: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const filled = (winRate / 100) * circ;
  const stroke = winRateHexColor(winRate);
  const glow = winRate >= 55 ? `drop-shadow(0 0 6px ${stroke})` : undefined;

  return (
    <div className="relative flex items-center justify-center">
      <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true" className="-rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
        <circle
          cx="36" cy="36" r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="4"
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeLinecap="round"
          style={glow ? { filter: glow } : undefined}
        />
      </svg>
      <span
        className={`absolute text-sm font-bold tabular-nums ${NUMERIC_TEXT_CLASS}`}
        style={{ color: stroke }}
      >
        {formatPercent(winRate)}
      </span>
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
  const accent = winRate !== null && winRate >= 55
    ? BRAND_COLORS.orbitalCyan
    : winRate !== null && winRate >= 52.4
    ? BRAND_COLORS.softUltraviolet
    : "rgba(255,255,255,0.15)";

  return (
    <div
      className="overflow-hidden rounded-2xl border p-5 transition-shadow hover:shadow-float"
      style={{
        borderColor: `${accent}`,
        background: `linear-gradient(135deg, ${accent === "rgba(255,255,255,0.15)" ? "rgba(255,255,255,0.02)" : `${accent}06`} 0%, rgba(18,14,36,0.8) 100%)`,
      }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-white">{sport}</h3>
        {winRate !== null ? (
          <WinRateArc winRate={winRate} />
        ) : (
          <span className="text-xs text-ink-500">Pending</span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg py-2" style={{ background: `${BRAND_COLORS.orbitalCyan}10` }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-500">W</p>
          <p className={`text-xl font-bold ${NUMERIC_TEXT_CLASS}`} style={{ color: BRAND_COLORS.orbitalCyan }}>{wins}</p>
        </div>
        <div className="rounded-lg py-2" style={{ background: "rgba(255,100,112,0.10)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-500">L</p>
          <p className={`text-xl font-bold text-alert ${NUMERIC_TEXT_CLASS}`}>{losses}</p>
        </div>
        <div className="rounded-lg py-2" style={{ background: "rgba(255,255,255,0.04)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-500">P</p>
          <p className={`text-xl font-bold text-ink-400 ${NUMERIC_TEXT_CLASS}`}>{pushes}</p>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-ink-500">
        <span className={NUMERIC_TEXT_CLASS}>{formatCount(totalPicks)}</span>{" "}canonical picks
      </p>
    </div>
  );
}

// Data fetching
async function getPerformanceSummaries(): Promise<PerformanceSummary[]> {
  return db.performanceSummary.findMany({
    orderBy: [{ period: "desc" }, { totalPicks: "desc" }],
    take: 100,
  }) as Promise<PerformanceSummary[]>;
}
