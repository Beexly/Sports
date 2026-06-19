import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { ShaderAuroraLazy } from "@/components/hero/shader-aurora-lazy";
import { GeneratedPlate } from "@/components/immersive/generated-plate";
import { getPlate } from "@/lib/visual-production/asset-manifest";
import { CinematicEntrance } from "@/components/landing/cinematic-entrance";
import { CountUp } from "@/components/ui/count-up";
import { BRAND_COLORS } from "@/lib/brand";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { MethodologySection } from "@/components/ui/methodology-section";
import { Reveal } from "@/components/motion/reveal";
import { WorldSection } from "@/components/world/world-section";
import { WorldWaypoints } from "@/components/world/world-waypoints";
import { GalaxyTwinPreview } from "@/components/world/galaxy-twin-preview";
import { SignalFragmentField } from "@/components/world/signal-fragment-field";
import { MarketMirageChapter } from "@/components/world/market-mirage";
import { NoBetGateChapter } from "@/components/world/no-bet-gate";
import { DecisionAutopsyPreview } from "@/components/world/decision-autopsy-preview";
import { ParlayMriPreview } from "@/components/world/parlay-mri-preview";
import { CostOfNoiseCalculator } from "@/components/world/cost-of-noise-calculator";
import { loadBoardPasses } from "@/lib/board/passes";
import { loadBoardState, type BoardStateRow } from "@/lib/board/state";
import { loadPublicCalibrationReport } from "@/lib/calibration/report";
import {
  CONTEXT_INTELLIGENCE_SOURCES,
  DATA_SOURCE_STACK,
  PUBLIC_DATA_SOURCES,
  TREND_BACKLOG,
  sourceStatusLabel,
} from "@/lib/data-sources/catalog";
import { loadNflverseUsagePulse } from "@/lib/nflverse/usage-pulse";
import { loadTrendWorkbench } from "@/lib/trends/workbench";
import { loadSummary, loadActiveMetricManifest } from "@/lib/statking/product";
import { SignalPipeline } from "@/components/world/signal-pipeline";
import type { PipelineSummary } from "@/components/world/signal-pipeline";
import { IntelligenceLayer } from "@/components/home/intelligence-layer";
import { SignatureGrid, AmbientGlow } from "@/components/motion/signature-grid";

export const dynamic = "force-dynamic";

const HOME_TITLE = "A Sports Intelligence Operating System";
const HOME_DESCRIPTION =
  "Galaxy Sports Edge + Galaxy Sports Network: the market's noise turned into structured signal — public board state, no-bet gating, decision autopsies, media intelligence, and receipts for all of it.";

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: "/",
    type: "website",
    siteName: "Galaxy Sports Edge",
  },
  twitter: { card: "summary_large_image", title: HOME_TITLE, description: HOME_DESCRIPTION },
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
  const publicSourceCount = PUBLIC_DATA_SOURCES.length;
  const contextSourceCount = CONTEXT_INTELLIGENCE_SOURCES.length;
  let pipelineSummary: PipelineSummary = {
    activeSources: publicSourceCount + contextSourceCount,
    activeMetrics: 0,
    candidateCount: 0,
  };
  try {
    const sk = loadSummary();
    const mm = loadActiveMetricManifest();
    pipelineSummary = {
      activeSources: sk.source_count,
      activeMetrics: mm.active_calculated_count,
      candidateCount: sk.candidate_count,
    };
  } catch {
    // data files may not exist in all environments; fallback keeps the page renderable
  }
  const suppressedDemo =
    stateResult.meta.suppressedDemoData === true ||
    passesResult.meta.suppressedDemoData === true;
  const dbUnreachable =
    stateResult.meta.dataError === "DB_UNREACHABLE" ||
    passesResult.meta.dataError === "DB_UNREACHABLE";
  const totalRows =
    state.scoringNow.length + state.publishedToday.length + state.gatedTodayRows.length + passes.length;
  const heroPlate = getPlate("home-hero-cosmos");

  return (
    <div className="min-h-screen w-full overflow-x-hidden" style={{ backgroundColor: BRAND_COLORS.obsidianBlack, color: "white" }}>
      {/* Site front door: the cinematic "SIGNAL ACQUIRED" cold open. Self-gating
          (localStorage) so it plays once on arrival, ~3s on return, skippable,
          reduced-motion safe — it dissolves to reveal the world behind it. */}
      <CinematicEntrance />
      <Nav />
      <main id="main-content">
        {/* ── 00 · THE WORLD OPENS ─────────────────────────────────────
            The entrance burst dissolves into this: aurora, starfield, the
            thesis, and live board telemetry. Real data, honest empty states. */}
        <section className="gw-nebula-deep relative isolate overflow-hidden bg-carbon" style={{ borderBottom: "1px solid rgba(0,229,255,0.12)" }}>
          {heroPlate && (
            <GeneratedPlate
              className="-z-30 opacity-70"
              gradient={heroPlate.gradient}
              still={heroPlate.still}
              motion={heroPlate.motion}
              priority
            />
          )}
          <div aria-hidden="true" className="absolute inset-0 -z-20">
            <ShaderAuroraLazy />
          </div>
          <div aria-hidden="true" className="gw-starfield -z-10" />
          {/* Lighter damping than before — the aurora is the show; the copy
              column gets its own local scrim for AA contrast. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{
              background: `radial-gradient(ellipse 70% 60% at 78% 18%, ${"#FF2DD6"}21, transparent 60%), radial-gradient(ellipse 60% 55% at 12% 80%, ${"#7A5CFF"}2b, transparent 65%), linear-gradient(180deg, ${BRAND_COLORS.obsidianBlack}b3 0%, ${BRAND_COLORS.obsidianBlack}59 44%, ${BRAND_COLORS.obsidianBlack}99 72%, ${BRAND_COLORS.obsidianBlack} 100%)`,
            }}
          />
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.04fr_0.96fr] lg:items-center lg:px-8">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="gw-chip-cyan">Sports intelligence — not a sportsbook</span>
              </div>
              <h1 className="mt-6 max-w-4xl font-display text-display-xl font-semibold leading-[1.0] text-balance text-white">
                The market is full of <span className="gw-chrome-plasma">noise</span>.
                <br />
                <span className="gw-chrome-ice">Galaxy turns it into</span>{" "}
                <span className="gse-editorial text-orbital-cyan gw-text-glow-cyan">signal</span>.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-300">
                We turn real sportsbook data into picks you can actually check — and
                the discipline to know when not to bet.{" "}
                The board is only as smart as the data behind it.{" "}
                No public pick or projection appears unless the inputs are real enough
                to defend — and every edge earns a receipt.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/board" className="btn-primary min-h-11 px-5 py-3">
                  Enter today&apos;s board
                </Link>
                <Link
                  href="/sample-desk"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-orbital-cyan/60 px-5 py-3 text-sm font-semibold text-orbital-cyan transition-shadow hover:border-orbital-cyan hover:text-white hover:shadow-[0_0_28px_-6px_rgba(0,229,255,0.6)]"
                >
                  See a sample read
                </Link>
              </div>

              {/* Three reasons the read is worth trusting — proof, calibration,
                  discipline. Concepts, not numbers: no record is claimed before
                  it's earned. This is what answers "why you" in the first screen. */}
              <ul className="mt-7 grid gap-2.5 sm:max-w-xl">
                <li className="flex items-start gap-2.5 text-sm leading-6 text-ink-300">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orbital-cyan" />
                  <span>
                    <span className="font-semibold text-white">Closing-line value.</span> Every
                    pick is graded against the number the market closes at — the benchmark most
                    services hide.
                  </span>
                </li>
                <li className="flex items-start gap-2.5 text-sm leading-6 text-ink-300">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orbital-cyan" />
                  <span>
                    <span className="font-semibold text-white">Calibrated confidence.</span> A
                    confidence score is only worth showing if it means what it says — measured in
                    public, never asserted.
                  </span>
                </li>
                <li className="flex items-start gap-2.5 text-sm leading-6 text-ink-300">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orbital-cyan" />
                  <span>
                    <span className="font-semibold text-white">The No-Bet gate.</span> When the
                    math doesn&apos;t support action, &ldquo;no bet&rdquo; is the call — and we log
                    it like any other.
                  </span>
                </li>
              </ul>

              <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400">
                We detect. You decide.
              </p>
              <div className="mt-5 flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-5">
                <Link
                  href="/founding-desk"
                  className="inline-flex items-center gap-1.5 font-semibold text-orbital-cyan transition-colors hover:text-white"
                >
                  Join the Founding Desk
                  <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href="/ask-galaxy"
                  className="inline-flex items-center gap-1.5 text-ink-300 transition-colors hover:text-white"
                >
                  Send Galaxy one game for a read
                  <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href="/trends"
                  className="inline-flex items-center gap-1.5 text-ink-300 transition-colors hover:text-white"
                >
                  Open Trend Lab
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>

            <div
              className="gw-card-hover overflow-hidden rounded-ds-lg bg-eclipse p-5 border border-mineral"
            >
              <div
                className="mb-4 h-0.5 w-full rounded-full"
                style={{ background: "linear-gradient(90deg, rgba(0,229,255,0.8), transparent 70%)" }}
                aria-hidden="true"
              />
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                    Board state · live telemetry
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-ion-white">
                    {totalRows > 0 ? "Live rows available" : "No public rows yet"}
                  </h2>
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400">
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
                <div
                  className="mt-5 overflow-hidden rounded-ds-sm px-4 py-3"
                  style={{ border: "1px solid rgba(255,100,112,0.25)", background: "rgba(255,100,112,0.06)" }}
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-alert">
                    Data store unreachable
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink-400">
                    The public page is online, but the local database is not reachable from this
                    checkout. Rows stay empty instead of blocking the experience or inventing data.
                  </p>
                </div>
              ) : suppressedDemo ? (
                <div
                  className="mt-5 overflow-hidden rounded-ds-sm px-4 py-3"
                  style={{ border: "1px solid rgba(0,229,255,0.20)", background: "rgba(0,229,255,0.04)" }}
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-orbital-cyan">
                    Demo data suppressed
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink-400">
                    Deterministic sample picks exist for internal testing, but the public front door
                    is showing an empty readiness state instead of fake action.
                  </p>
                </div>
              ) : null}
              <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-500">
                An empty board is the gate doing its job — not a promise withheld.
              </p>
            </div>
          </div>
          {/* LIVE ribbon — BlueYard-style ticker, fed only by real state.
              Honest empty states ride the same ribbon. */}
          <div className="relative" style={{ borderTop: "1px solid rgba(0,229,255,0.10)", background: "rgba(8,6,20,0.6)" }}>
            <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5 sm:px-6 lg:px-8">
              <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-alert/90 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-white" style={{ animation: "pp-live-pulse 2s ease-in-out infinite" }} />
                Live
              </span>
              <div className="gse-marquee min-w-0 flex-1" style={{ ["--gse-marquee-dur" as string]: "44s" }}>
                <div className="gse-marquee-track font-mono text-[11px] uppercase tracking-[0.16em] text-ink-300">
                  {[0, 1].map((copy) => (
                    <span key={copy} aria-hidden={copy === 1}>
                      <span className="px-6">Board · {state.publishedToday.length} public {state.publishedToday.length === 1 ? "row" : "rows"} cleared today</span>
                      <span className="px-6 text-orbital-cyan">◆</span>
                      <span className="px-6">Gate · {state.gatedTodayRows.length} {state.gatedTodayRows.length === 1 ? "row" : "rows"} holding behind the no-bet gate</span>
                      <span className="px-6 text-plasma">◆</span>
                      <span className="px-6">Scoring · {state.scoringNow.length} live</span>
                      <span className="px-6 text-orbital-cyan">◆</span>
                      <span className="px-6">Calibration sample · {calibration.sampleSize}</span>
                      <span className="px-6 text-plasma">◆</span>
                      <span className="px-6">Trend observations · {trendWorkbench.observationCount}</span>
                      <span className="px-6 text-orbital-cyan">◆</span>
                      <span className="px-6">Last refresh · {timeLabel(state.lastRefresh)}</span>
                      <span className="px-6 text-plasma">◆</span>
                      <span className="px-6">We detect. You decide.</span>
                      <span className="px-6 text-orbital-cyan">◆</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* The module index — the journey's map, at the hero's seam. */}
          <WorldWaypoints />
        </section>

        {/* ── 01 · GALAXY TWIN ──────────────────────────────────────── */}
        <WorldSection
          index="01"
          id="twin"
          eyebrow="Galaxy Twin · Market Observatory"
          title={
            <>
              The slate, read as a <span className="gse-editorial text-orbital-cyan gw-text-glow-cyan">living system</span>.
            </>
          }
          lede="Every game is a node held by market gravity — bent by public pressure, flagged by context gaps, opened by edge windows, closed by the no-bet gate. Select a state to see how the engine reads it."
          tone="deep"
        >
          <GalaxyTwinPreview />
        </WorldSection>

        {/* ── 02 · SIGNAL VS NOISE ──────────────────────────────────── */}
        <WorldSection
          index="02"
          id="signal"
          eyebrow="Signal vs noise"
          title="Same market. Two completely different readings."
          lede="The inputs that reach you arrive as argument — takes, steam, rumor, stale numbers. The engine takes the same inputs and structures them into something accountable."
        >
          <SignalFragmentField />

          {/* Ten-second product test — the live telemetry behind the claim. */}
          <div className="mt-14 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <Reveal>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                Ten-second product test
              </p>
              <h3 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">
                See the current state, not a promise.
              </h3>
              <p className="mt-4 text-sm leading-6 text-ink-300">
                Anyone can claim signal. The honest version is checkable in ten seconds:
                what cleared, what passed, which sources are live, and which trends are
                statistically defensible — right now, on this page.
              </p>
            </Reveal>
            <div className="grid gap-px overflow-hidden rounded-ds-md sm:grid-cols-2 lg:grid-cols-4" style={{ border: "1px solid rgba(0,229,255,0.14)", background: "rgba(0,229,255,0.08)" }}>
              <StatusPanel
                title="Public picks"
                value={state.publishedToday.length}
                detail={state.publishedToday.length > 0 ? "Published rows available." : "No fabricated picks."}
                href="/board"
              />
              <StatusPanel
                title="Trend observations"
                value={trendWorkbench.observationCount}
                detail="Trend engine is ready; observations are waiting on live intake writes."
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
                    ? `Usage pulse: ${nflversePulse.season} week ${nflversePulse.week ?? "N/A"}.`
                    : "Usage pulse warming up."
                }
                href="/nflverse"
              />
            </div>
          </div>
        </WorldSection>

        {/* ── 03 · MARKET MIRAGE ────────────────────────────────────── */}
        <WorldSection
          index="03"
          id="mirage"
          eyebrow="Market Mirage"
          title={
            <>
              The most dangerous pick is the <span className="gse-editorial gw-chrome-plasma">obvious</span> one.
            </>
          }
          lede="Public pressure, stale lines, decayed prices, and incomplete context can make distortion look like consensus. Peel the layers and watch the sure-looking thing dissolve."
          tone="nebula"
        >
          <MarketMirageChapter />
        </WorldSection>

        {/* ── 04 · THE NO-BET GATE ──────────────────────────────────── */}
        <WorldSection
          index="04"
          id="gate"
          eyebrow="The No-Bet Gate"
          title={<>No-Bet is not absence. It is <span className="gw-chrome-ice">intelligence</span>.</>}
          lede="The edge is not the pick — the edge is knowing what not to trust. Restraint is a first-class output of this system, logged with reasons like any other decision."
          tone="deep"
        >
          <NoBetGateChapter />

          {/* The real lanes — what's scoring, published, and gated right now. */}
          <div
            className="mt-14 overflow-hidden rounded-ds-lg p-5"
            style={{
              border: "1px solid rgba(0,229,255,0.18)",
              background: "linear-gradient(135deg, rgba(0,229,255,0.05) 0%, rgba(8,6,20,0.88) 100%)",
            }}
          >
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                  Today&apos;s lanes · live
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-white">Scored, published, passed</h3>
              </div>
              <Link href="/board" className="text-sm font-semibold text-orbital-cyan hover:text-white">
                Full board
              </Link>
            </div>
            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              <Lane title="Scoring" rows={state.scoringNow} empty="No active scoring rows." accent="cyan" />
              <Lane title="Published" rows={state.publishedToday} empty="No public pick has cleared." accent="verify" />
              <Lane title="Gated" rows={state.gatedTodayRows} empty="No pass rows logged." accent="plasma" />
            </div>
          </div>
        </WorldSection>

        {/* ── 05 · DECISION AUTOPSY ─────────────────────────────────── */}
        <WorldSection
          index="05"
          id="autopsy"
          eyebrow="Decision Autopsy"
          title="Every decision leaves evidence."
          lede="Published rows don't vanish when they settle. They get x-rayed in public: original signal, market movement, caveats, result, lesson."
        >
          <DecisionAutopsyPreview />
        </WorldSection>

        {/* ── 06 · PARLAY MRI ───────────────────────────────────────── */}
        <WorldSection
          index="06"
          id="mri"
          eyebrow="Parlay MRI"
          title="See inside the slip before money does."
          lede="Stacked legs hide correlation, dependency, and compounding fragility. The MRI is risk education — it shows the structure, you make the call."
        >
          <ParlayMriPreview />
        </WorldSection>

        {/* ── 07 · THE BEAT — the public face of media intelligence.
            The pipeline behind it (claims, review gates, studio) is ours and
            stays internal; the visitor sees the graded OUTPUT and how it
            plays into the board. */}
        <WorldSection
          index="07"
          id="gsn"
          eyebrow="Galaxy Sports Network · The Beat"
          title={
            <>
              Sports media is a market too. <span className="gse-editorial text-plasma gw-text-glow-plasma">Noisy</span> — and
              now <span className="gse-editorial text-orbital-cyan gw-text-glow-cyan">accountable</span>.
            </>
          }
          lede="We grade the noise so you don't have to. Reporting is reliability-scored before it touches a number — and when a story moves our read on a game, you can see exactly where it landed."
          tone="nebula"
        >
          <div
            className="grid gap-px overflow-hidden rounded-ds-md md:grid-cols-3"
            style={{ border: "1px solid rgba(0,229,255,0.14)", background: "rgba(0,229,255,0.08)" }}
          >
            <div className="p-5" style={{ background: BRAND_COLORS.obsidianBlack }}>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-orbital-cyan">Scored at the source</p>
              <p className="mt-2 text-sm leading-6 text-ink-300">
                Every report carries a reliability grade earned on the record — not a follower count.
              </p>
            </div>
            <div className="p-5" style={{ background: BRAND_COLORS.obsidianBlack }}>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-orbital-cyan">Plays into the board</p>
              <p className="mt-2 text-sm leading-6 text-ink-300">
                A graded story becomes context on the game node it touches — injuries, roles, weather, scheme.
              </p>
            </div>
            <div className="p-5" style={{ background: BRAND_COLORS.obsidianBlack }}>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-plasma">Browse it like a feed</p>
              <p className="mt-2 text-sm leading-6 text-ink-300">
                The Beat reads casual; the grading underneath is anything but.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Link href="/the-beat" className="btn btn-primary">
              Open The Beat
            </Link>
          </div>
        </WorldSection>

        {/* ── 08 · COST OF NOISE ────────────────────────────────────── */}
        <WorldSection
          index="08"
          id="noise"
          eyebrow="Cost of Noise"
          title="How much of your process is noise?"
          lede="Describe a typical week and get a directional read on your decision quality — where avoidable noise leaks in, and which Galaxy modules tighten it. Education, not a profit promise."
          tone="deep"
        >
          <CostOfNoiseCalculator />
        </WorldSection>

        {/* ── 09 · RECEIPTS ─────────────────────────────────────────── */}
        <WorldSection
          index="09"
          id="receipts"
          eyebrow="Receipts"
          title="Trust is an architecture, not a tagline."
          lede="No fabricated picks, no invented stats, no silent edits. The ledger below is the live state of the engine's intake — status, grain, and what each lane unlocks."
        >
          {/* Source health — our intake lanes, in our language. Vendor names
              and license attribution live on /integrations, by design. */}
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                Source health
              </p>
              <h3 className="mt-2 font-display text-2xl font-semibold text-white sm:text-3xl">
                The engine&apos;s intake lanes
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-300">
                {publicSourceCount} structured intake lanes and {contextSourceCount} context feeds are tracked
                separately so structured data, owned media workflows, licensed reporting, and
                permission-gated references never blur together. Every lane is graded before it
                touches a number you see.
              </p>
            </div>
            <Link href="/integrations" className="text-sm font-semibold text-orbital-cyan hover:text-white">
              Rights &amp; attribution
            </Link>
          </div>
          <div
            className="mt-6 overflow-x-auto overflow-hidden rounded-ds-md"
            style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(8,6,20,0.5)" }}
          >
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead
                className="font-mono text-[10px] uppercase tracking-[0.14em]"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.40)", background: "rgba(0,229,255,0.04)" }}
              >
                <tr>
                  <th className="px-4 py-3">Intake lane</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Grain</th>
                  <th className="px-4 py-3">What it unlocks</th>
                </tr>
              </thead>
              <tbody>
                {PUBLIC_DATA_SOURCES.map((source, i) => (
                  <tr key={source.key} style={{ borderBottom: i < PUBLIC_DATA_SOURCES.length - 1 ? "1px solid rgba(255,255,255,0.05)" : undefined }}>
                    <td className="px-4 py-3 font-semibold text-white">{source.publicLabel}</td>
                    <td className="px-4 py-3 font-mono text-orbital-cyan">{sourceStatusLabel(source.status)}</td>
                    <td className="px-4 py-3 text-ink-400">{source.grain}</td>
                    <td className="px-4 py-3 text-ink-400">{source.unlocks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-400">
            + {CONTEXT_INTELLIGENCE_SOURCES.length} context feeds (broadcast claims, beat intelligence,
            studio assets, international reference) graded behind the same gates — all{" "}
            {DATA_SOURCE_STACK.length} lanes on the{" "}
            <Link href="/integrations" className="text-orbital-cyan hover:text-white">
              rights ledger
            </Link>
            .
          </p>

          {/* First trend targets */}
          <div
            className="mt-10 overflow-hidden rounded-ds-lg p-5"
            style={{
              border: `1px solid ${BRAND_COLORS.softUltraviolet}22`,
              background: `linear-gradient(135deg, ${BRAND_COLORS.softUltraviolet}05 0%, rgba(8,6,20,0.88) 100%)`,
            }}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: BRAND_COLORS.softUltraviolet }}>
              First trend targets
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-white">The engine needs questions worth mining.</h3>
            <div
              className="mt-5 grid gap-px overflow-hidden rounded-ds-md lg:grid-cols-4"
              style={{ border: `1px solid ${BRAND_COLORS.softUltraviolet}14`, background: `${BRAND_COLORS.softUltraviolet}08` }}
            >
              {TREND_BACKLOG.slice(0, 4).map((item) => (
                <div key={item.key} className="p-4" style={{ background: BRAND_COLORS.obsidianBlack }}>
                  <p className="font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-ink-400">{item.question}</p>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500">
                    {item.requiredSources.join(" + ")}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* CLV — the benchmark we publish */}
          <div
            className="mt-10 overflow-hidden rounded-ds-lg p-5 sm:p-7"
            style={{
              border: `1px solid ${BRAND_COLORS.orbitalCyan}30`,
              background: `${BRAND_COLORS.orbitalCyan}06`,
            }}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
              The benchmark we publish
            </p>
            <h3 className="mt-2 font-display text-2xl font-semibold text-white sm:text-3xl">
              Closing line value — the one number touts never show.
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-300">
              A win streak is a screenshot. Whether the price we locked beat where the
              market closed is the sharp-credible leading indicator of a real edge —
              counted over every settled pick, and gated until it can be honestly
              backed. You can track your own bets against the same metric, too.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link href="/clv" className="btn btn-primary">
                See our CLV
              </Link>
              <Link href="/track" className="text-sm font-semibold text-orbital-cyan hover:text-white">
                Track your own →
              </Link>
              <Link href="/accountability" className="text-sm font-semibold text-orbital-cyan hover:text-white">
                Full accountability →
              </Link>
            </div>
          </div>
        </WorldSection>

        {/* ── 10 · SIGNAL PIPELINE ──────────────────────────────────── */}
        <WorldSection
          index="10"
          id="pipeline"
          eyebrow="How it works"
          title="The signal pipeline."
          lede="Five stages from raw data intake to receipted pick — every step logged, every gate honest."
          tone="void"
        >
          <SignalPipeline summary={pipelineSummary} />
        </WorldSection>

        {/* ── 11 · THE INTELLIGENCE LAYER ───────────────────────────────
            The front door to every surface of the decision-OS. A subtle
            radar grid + drifting ambient glow sit behind the cards as an
            atmosphere (aria-hidden, reduced-motion safe via globals). */}
        <div className="relative isolate overflow-hidden">
          <SignatureGrid className="-z-10" opacity={0.1} rotate />
          <AmbientGlow className="-z-10" />
          <IntelligenceLayer />
        </div>

        <MethodologySection />

        <section data-testid="homepage-responsible-close" className="gw-nebula px-4 py-14 sm:px-6 lg:px-8">
          <div
            className="mx-auto max-w-5xl overflow-hidden rounded-ds-lg p-5 sm:p-7"
            style={{
              border: `1px solid ${BRAND_COLORS.orbitalCyan}18`,
              background: `linear-gradient(135deg, ${BRAND_COLORS.orbitalCyan}05 0%, rgba(8,6,20,0.88) 100%)`,
            }}
          >
            <h2 className="text-2xl font-semibold text-white">The math can point. The decision stays yours.</h2>
            <p className="mt-3 text-sm leading-6 text-ink-300">
              This product is research, not certainty. The upgrade path is more data, better receipts,
              and clearer uncertainty, not louder claims.
            </p>
            <RiskDisclosure variant="compact" includePastPerformance className="mt-5 text-ink-400" />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div
      className="overflow-hidden rounded-ds-sm px-3 py-2"
      style={{ border: "1px solid rgba(0,229,255,0.18)", background: "rgba(0,229,255,0.05)" }}
    >
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500">{label}</dt>
      <dd className="mt-1 font-numerals text-2xl font-semibold tabular-nums text-orbital-cyan">
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
      className="block min-h-52 p-5 transition-colors hover:bg-white/[0.025]"
      style={{ background: BRAND_COLORS.obsidianBlack }}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-500">{title}</p>
      <p className="gw-text-glow-cyan mt-4 font-numerals text-5xl font-semibold tabular-nums text-orbital-cyan">
        <CountUp value={value} group={group} />
      </p>
      <p className="mt-4 text-sm leading-6 text-ink-300">{detail}</p>
    </Link>
  );
}

const LANE_ACCENT = {
  cyan:   { label: "text-orbital-cyan",  border: "border-orbital-cyan/30",  dot: "bg-orbital-cyan animate-live-pulse",  link: "border-orbital-cyan/20" },
  verify: { label: "text-verify",        border: "border-verify/30",        dot: "bg-verify",                           link: "border-verify/20" },
  plasma: { label: "text-plasma",        border: "border-plasma/30",        dot: "bg-plasma animate-live-pulse",        link: "border-plasma/20" },
} as const;

function Lane({
  title,
  rows,
  empty,
  accent = "cyan",
}: {
  title: string;
  rows: readonly BoardStateRow[];
  empty: string;
  accent?: keyof typeof LANE_ACCENT;
}): JSX.Element {
  const a = LANE_ACCENT[accent];
  return (
    <div className={`rounded-ds-sm border ${a.border} p-4`} style={{ background: "rgba(8,6,20,0.7)" }}>
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${a.dot}`} aria-hidden="true" />
        <p className={`font-mono text-[10px] uppercase tracking-[0.16em] ${a.label}`}>{title}</p>
        <span className={`ml-auto font-numerals text-sm tabular-nums ${a.label}`}>{rows.length}</span>
      </div>
      <div className="mt-4 space-y-3">
        {rows.length > 0 ? (
          rows.slice(0, 3).map((row) => (
            <Link key={row.id} href={`/room/${row.gameId}`} className={`block border-l ${a.link} pl-3 transition-colors hover:border-l-2`}>
              <p className="text-sm font-semibold text-white">{row.matchup}</p>
              <p className="mt-1 text-xs text-ink-400">
                {row.sport} / {row.edgeIndex === null ? "EI pending" : `EI ${row.edgeIndex}`}
              </p>
            </Link>
          ))
        ) : (
          <p className="text-sm leading-6 text-ink-300">{empty}</p>
        )}
      </div>
    </div>
  );
}
