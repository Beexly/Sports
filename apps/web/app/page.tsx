import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { ShaderAuroraLazy } from "@/components/hero/shader-aurora-lazy";
import { CinematicEntrance } from "@/components/landing/cinematic-entrance";
import { CountUp } from "@/components/ui/count-up";
import { BRAND_COLORS } from "@/lib/brand";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { MethodologySection } from "@/components/ui/methodology-section";
import { loadBoardPasses } from "@/lib/board/passes";
import { loadBoardState, type BoardStateRow } from "@/lib/board/state";
import { loadPublicCalibrationReport } from "@/lib/calibration/report";
import { loadNflverseUsagePulse } from "@/lib/nflverse/usage-pulse";
import { loadTrendWorkbench } from "@/lib/trends/workbench";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sports Intelligence With Receipts",
  description:
    "Galaxy Sports Edge gives you one rating per matchup, graded against the closing line. Honest dashes when the read isn't there, never fabricated picks.",
  alternates: { canonical: "/" },
};

function timeLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "pending";
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default async function HomePage(): Promise<JSX.Element> {
  const [stateResult, passesResult, calibrationResult, nflversePulse] = await Promise.all([
    loadBoardState(),
    loadBoardPasses(),
    loadPublicCalibrationReport(),
    loadNflverseUsagePulse(),
  ]);
  const state = stateResult.data;
  const passes = passesResult.data.passes;
  const calibration = calibrationResult.data;
  const trendWorkbench = loadTrendWorkbench();
  const suppressedDemo =
    stateResult.meta.suppressedDemoData === true ||
    passesResult.meta.suppressedDemoData === true;
  const dbUnreachable =
    stateResult.meta.dataError === "DB_UNREACHABLE" ||
    passesResult.meta.dataError === "DB_UNREACHABLE";
  const totalRows =
    state.scoringNow.length + state.publishedToday.length + state.gatedTodayRows.length + passes.length;

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-carbon text-ion">
      {/* Site front door: the cinematic "SIGNAL ACQUIRED" cold open. Self-gating
          (localStorage) so it plays once on arrival, ~3s on return, skippable,
          reduced-motion safe — it dissolves to reveal the home behind it. */}
      <CinematicEntrance />
      <Nav />
      <main id="main-content">
        <section className="relative isolate overflow-hidden border-b border-mineral">
          <div aria-hidden="true" className="absolute inset-0 -z-20">
            <ShaderAuroraLazy />
          </div>
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{
              background: `linear-gradient(180deg, ${BRAND_COLORS.obsidianBlack}d9 0%, ${BRAND_COLORS.obsidianBlack}80 44%, ${BRAND_COLORS.obsidianBlack}b3 72%, ${BRAND_COLORS.obsidianBlack} 100%)`,
            }}
          />
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:px-8">
            <div>
              <h1 className="max-w-4xl font-display text-display-xl font-semibold leading-[1.0] text-balance text-ion-white">
                The board is only as smart as the data behind it.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-ion-1">
                Galaxy Sports Edge reads every matchup and hands you one rating, with
                the record to back it. Nothing reaches the board unless the read behind
                it is real enough to defend.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/board" className="btn-primary min-h-11 px-5 py-3">
                  Today&apos;s board
                </Link>
                <Link
                  href="/trends"
                  className="inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-mineral px-5 py-3 text-sm font-semibold text-ion hover:border-orbital-cyan hover:text-ion-white"
                >
                  Open Trend Lab
                </Link>
              </div>
            </div>

            <div className="border border-mineral bg-eclipse p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                    Board state
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-ion-white">
                    {totalRows > 0 ? "Live rows available" : "No public rows yet"}
                  </h2>
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                  updated {timeLabel(state.lastRefresh)}
                </p>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric label="Sports" value={state.sportsWatched} />
                <Metric label="Books" value={state.booksPolled} />
                <Metric label="Open" value={state.openPicks} />
                <Metric label="Gated" value={state.gatedToday} />
              </dl>
              {dbUnreachable ? (
                <div className="mt-5 border border-mineral bg-carbon px-4 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-alert">
                    Data store unreachable
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ion-1">
                    The public page is online, but the local database is not reachable from this
                    checkout. Rows stay empty instead of blocking the experience or inventing data.
                  </p>
                </div>
              ) : suppressedDemo ? (
                <div className="mt-5 border border-mineral bg-carbon px-4 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-orbital-cyan">
                    Demo data suppressed
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ion-1">
                    Deterministic sample picks exist for internal testing, but the public front door
                    is showing an empty readiness state instead of fake action.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="border-b border-mineral px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                Ten-second product test
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-ion-white sm:text-4xl">
                See where things stand right now.
              </h2>
              <p className="mt-4 text-sm leading-6 text-ion-1">
                Live counts, not marketing. What cleared, what we passed on, and how the
                record reads today.
              </p>
            </div>
            <div className="grid gap-px overflow-hidden border border-mineral bg-mineral sm:grid-cols-2 lg:grid-cols-4">
              <StatusPanel
                title="Public picks"
                value={state.publishedToday.length}
                detail={state.publishedToday.length > 0 ? "Published rows available." : "No fabricated picks."}
                href="/board"
              />
              <StatusPanel
                title="Trend observations"
                value={trendWorkbench.observationCount}
                detail="Trend engine is ready; observations land as real game data settles."
                href="/trends"
              />
              <StatusPanel
                title="Calibration sample"
                value={calibration.sampleSize}
                detail={calibration.publicMessage}
                href="/performance"
              />
              <StatusPanel
                title="Real NFL rows"
                value={nflversePulse.status === "live" ? nflversePulse.sourceRows : 0}
                group
                detail={
                  nflversePulse.status === "live"
                    ? `nflverse usage pulse: ${nflversePulse.season} week ${nflversePulse.week ?? "N/A"}.`
                    : "nflverse source pull unavailable."
                }
                href="/nflverse"
              />
            </div>
          </div>
        </section>

        <section className="border-b border-mineral px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl border border-mineral bg-eclipse p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                  Today&apos;s lanes
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-ion-white">Scored, published, passed</h2>
              </div>
              <Link href="/board" className="text-sm font-semibold text-orbital-cyan hover:text-ion-white">
                Full board
              </Link>
            </div>
            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              <Lane title="Scoring" rows={state.scoringNow} empty="No active scoring rows." />
              <Lane title="Published" rows={state.publishedToday} empty="No public pick has cleared." />
              <Lane title="Gated" rows={state.gatedTodayRows} empty="No pass rows logged." />
            </div>
          </div>
        </section>

        <MethodologySection />

        <section data-testid="homepage-responsible-close" className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl border border-mineral bg-eclipse p-5 sm:p-7">
            <h2 className="text-2xl font-semibold text-ion-white">The math can point. The decision stays yours.</h2>
            <p className="mt-3 text-sm leading-6 text-ion-1">
              This product is research, not certainty. The upgrade path is more data, better receipts,
              and clearer uncertainty, not louder claims.
            </p>
            <RiskDisclosure variant="compact" includePastPerformance className="mt-5 text-ion-1" />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div className="border border-mineral bg-carbon px-3 py-2">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">{label}</dt>
      <dd className="mt-1 font-numerals text-2xl font-semibold tabular-nums text-ion-white">
        <CountUp value={value} />
      </dd>
    </div>
  );
}

function StatusPanel({
  title,
  value,
  detail,
  href,
  group,
}: {
  title: string;
  value: number;
  detail: string;
  href: string;
  group?: boolean;
}): JSX.Element {
  return (
    <Link href={href} className="block min-h-52 bg-eclipse p-5 transition-colors hover:bg-slate">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ion-2">{title}</p>
      <p className="mt-4 font-numerals text-5xl font-semibold tabular-nums text-orbital-cyan">
        <CountUp value={value} group={group} />
      </p>
      <p className="mt-4 text-sm leading-6 text-ion-1">{detail}</p>
    </Link>
  );
}

function Lane({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: readonly BoardStateRow[];
  empty: string;
}): JSX.Element {
  return (
    <div className="border border-mineral bg-carbon p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-orbital-cyan">{title}</p>
        <span className="font-numerals text-sm text-ion-2">{rows.length}</span>
      </div>
      <div className="mt-4 space-y-3">
        {rows.length > 0 ? (
          rows.slice(0, 3).map((row) => (
            <Link key={row.id} href={`/room/${row.gameId}`} className="block border-l border-mineral pl-3">
              <p className="text-sm font-semibold text-ion-white">{row.matchup}</p>
              <p className="mt-1 text-xs text-ion-2">
                {row.sport} / {row.edgeIndex === null ? "EI pending" : `EI ${row.edgeIndex}`}
              </p>
            </Link>
          ))
        ) : (
          <p className="text-sm leading-6 text-ion-1">{empty}</p>
        )}
      </div>
    </div>
  );
}
