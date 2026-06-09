import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { ShaderAuroraLazy } from "@/components/hero/shader-aurora-lazy";
import { CinematicEntrance } from "@/components/landing/cinematic-entrance";
import { CountUp } from "@/components/ui/count-up";
import { Reveal } from "@/components/motion/reveal";
import { Atmosphere } from "@/components/ui/atmosphere";
import { AmbientGlow, SignatureGrid } from "@/components/motion/signature-grid";
import { BRAND_COLORS } from "@/lib/brand";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { MethodologySection } from "@/components/ui/methodology-section";
import { loadBoardPasses } from "@/lib/board/passes";
import { loadBoardState } from "@/lib/board/state";
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
    <div className="min-h-screen w-full overflow-x-hidden bg-surface-base text-ion-white">
      {/* Site front door: the cinematic "SIGNAL ACQUIRED" cold open. Self-gating
          (localStorage) so it plays once on arrival, ~3s on return, skippable,
          reduced-motion safe — it dissolves to reveal the home behind it. */}
      <CinematicEntrance />
      {/* Film grain + vignette — the same cinematic chrome the intelligence hub wears. */}
      <Atmosphere />
      <Nav />
      <main id="main-content">
        {/* HERO — the GSE Rating is the destination. Lead with the number, the
            read, and a few live counts; everything else folds below. */}
        <section className="relative isolate overflow-hidden border-b border-surface-line">
          <div aria-hidden="true" className="absolute inset-0 -z-20">
            <ShaderAuroraLazy />
          </div>
          <AmbientGlow className="-z-10" />
          <SignatureGrid className="-z-10" opacity={0.1} rotate />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{
              background: `linear-gradient(180deg, ${BRAND_COLORS.obsidianBlack}d9 0%, ${BRAND_COLORS.obsidianBlack}80 44%, ${BRAND_COLORS.obsidianBlack}b3 72%, ${BRAND_COLORS.obsidianBlack} 100%)`,
            }}
          />
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:px-8">
            <div>
              <Reveal>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                  One number. The record behind it.
                </p>
              </Reveal>
              <Reveal delay={90}>
                <h1 className="mt-4 max-w-4xl font-display text-display-xl font-semibold leading-[1.0] text-balance text-ion-white">
                  The GSE Rating reads the matchup so you don&apos;t have to.
                </h1>
              </Reveal>
              <Reveal delay={170}>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-ion-1">
                  One score per matchup, with a plain-English read and the receipts to
                  back it. The board only publishes when the data earns it.
                </p>
              </Reveal>
              <Reveal delay={250}>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link href="/intelligence/rating" className="btn-primary min-h-11 px-5 py-3">
                    See the GSE Rating
                  </Link>
                  <Link
                    href="/board"
                    className="inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-surface-line px-5 py-3 text-sm font-semibold text-ion-1 transition-colors hover:border-orbital-cyan hover:text-ion-white"
                  >
                    Today&apos;s board
                  </Link>
                </div>
              </Reveal>
            </div>

            <Reveal direction="scale" delay={160}>
              <div className="rounded-ds-md border border-surface-line bg-surface-raised/80 p-5 backdrop-blur-sm">
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
                  <div className="mt-5 rounded-ds-sm border border-surface-line bg-surface-sunken px-4 py-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-alert">
                      Data store unreachable
                    </p>
                    <p className="mt-2 text-sm leading-6 text-ion-1">
                      The public page is online, but the local database is not reachable from this
                      checkout. Rows stay empty instead of blocking the experience or inventing data.
                    </p>
                  </div>
                ) : suppressedDemo ? (
                  <div className="mt-5 rounded-ds-sm border border-surface-line bg-surface-sunken px-4 py-3">
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
            </Reveal>
          </div>
        </section>

        {/* Ten-second product test — live counts as four destinations. */}
        <section className="border-b border-surface-line px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <Reveal>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                  Ten-second product test
                </p>
              </Reveal>
              <Reveal delay={90}>
                <h2 className="mt-3 font-display text-3xl font-semibold text-ion-white sm:text-4xl">
                  See where things stand right now.
                </h2>
              </Reveal>
              <Reveal delay={150}>
                <p className="mt-4 text-sm leading-6 text-ion-1">
                  Live counts, not marketing. What cleared, what we passed on, and how the
                  record reads today.
                </p>
              </Reveal>
            </div>
            <Reveal delay={120}>
              <div className="grid gap-px overflow-hidden rounded-ds-md border border-surface-line bg-surface-line sm:grid-cols-2 lg:grid-cols-4">
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
                  href="/intelligence/trends"
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
            </Reveal>
          </div>
        </section>

        <MethodologySection />

        {/* Value band — one confident invitation to the plans. Tease the depth,
            never the method. */}
        <section className="border-b border-surface-line px-4 py-16 sm:px-6 lg:px-8">
          <Reveal>
            <div className="relative isolate mx-auto max-w-5xl overflow-hidden rounded-ds-md border border-surface-line bg-surface-raised/70 p-8 sm:p-10">
              <AmbientGlow className="-z-10 opacity-70" />
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                Free to start
              </p>
              <h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold text-ion-white sm:text-4xl">
                The rating is free. The depth is where it gets serious.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-ion-1">
                Everyone sees the GSE Rating and the headline read. Pro and Elite open the
                deeper views — the full positions, the reasoning trail, and alerts when the
                board moves. See what each tier unlocks.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link href="/pricing" className="btn-primary min-h-11 px-5 py-3">
                  See plans
                </Link>
                <Link
                  href="/intelligence"
                  className="inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-surface-line px-5 py-3 text-sm font-semibold text-ion-1 transition-colors hover:border-orbital-cyan hover:text-ion-white"
                >
                  How the intelligence works
                </Link>
              </div>
            </div>
          </Reveal>
        </section>

        <section data-testid="homepage-responsible-close" className="px-4 py-16 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mx-auto max-w-5xl rounded-ds-md border border-surface-line bg-surface-raised/70 p-5 sm:p-7">
              <h2 className="text-2xl font-semibold text-ion-white">We do the analysis. You make the call.</h2>
              <p className="mt-3 text-sm leading-6 text-ion-1">
                Every read comes with a source and a confidence level. Where the data isn&apos;t
                sufficient, we publish a dash instead of a guess.
              </p>
              <RiskDisclosure variant="compact" includePastPerformance className="mt-5 text-ion-1" />
            </div>
          </Reveal>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div className="rounded-ds-sm border border-surface-line bg-surface-sunken px-3 py-2">
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
    <Link
      href={href}
      className="group block min-h-52 bg-surface-raised p-5 transition-colors hover:bg-surface-sunken"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ion-2">{title}</p>
      <p className="mt-4 font-numerals text-5xl font-semibold tabular-nums text-orbital-cyan">
        <CountUp value={value} group={group} />
      </p>
      <p className="mt-4 text-sm leading-6 text-ion-1">{detail}</p>
    </Link>
  );
}
