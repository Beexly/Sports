import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { SignalDecode } from "@/components/motion/signal-decode";
import { GalaxyCursor } from "@/components/ui/galaxy-cursor";
import { FieldCinematicIntro } from "@/components/landing/field-cinematic-intro";
import { FieldHeroCanvas } from "@/components/landing/field-hero-canvas";
import { FieldBoardTicker } from "@/components/landing/field-board-ticker";
import { FieldRecordPanel } from "@/components/landing/field-record-panel";
import { DoorCard } from "@/components/landing/door-card";
import {
  NflverseLabDoor,
  NflverseLabDoorPlaceholder,
} from "@/components/landing/nflverse-lab-door";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { MethodologySection } from "@/components/ui/methodology-section";
import { Reveal } from "@/components/motion/reveal";
import { WorldSection } from "@/components/world/world-section";
import { NoBetGateChapter } from "@/components/world/no-bet-gate";
import { loadBoardState } from "@/lib/board/state";
import { publishedTickerLine, heldTickerLine } from "@/lib/board/market-label";
import { loadPublicCalibrationReport } from "@/lib/calibration/report";
import { LIVE_PACKAGE_CATALOG } from "@/lib/packages/catalog";
import {
  LIVE_SLATE_COACH_WRITEUPS,
  getRedactedTeasersForWindowSlot,
} from "@/lib/writeups/coach-writeup-engine";
import { PaywallRevealCard } from "@/components/packages/paywall-reveal-card";

export const dynamic = "force-dynamic";

// The description names only always-on free surfaces. It used to promise
// "paper contests" (Contest Bay); that surface has since been removed from
// the site entirely, so the description must not advertise it at all.
// Pinned by apps/web/__tests__/free-tier-gate-coupling.test.ts.
export const metadata: Metadata = {
  // FE-13: the layout's title template appends the brand, and this title is
  // already the brand, so it must be absolute.
  title: { absolute: "Galaxy Sports Edge" },
  description:
    "A scored board, a public record, and the guts to show what we passed on. We detect. You decide.",  alternates: { canonical: "/" },
};

export default async function HomePage(): Promise<JSX.Element> {
  // P16-01: loadNflverseUsagePulse() (a full-archive fetch) is deliberately
  // NOT in this Promise.all. It is loaded inside the Suspense-bounded
  // NflverseLabDoor component below so the page shell streams immediately
  // instead of blocking on the nflverse archive.
  const [stateResult, calibrationResult] = await Promise.all([
    loadBoardState(),
    loadPublicCalibrationReport(),
  ]);
  const state = stateResult.data;
  const calibration = calibrationResult.data;

  const cleared = state.publishedToday.length;
  const gated = state.gatedTodayRows.length;
  const scoring = state.scoringNow.length;
  const settled = calibration.sampleSize;

  // Honest degraded states. The loaders zero their counts on infra failure, a
  // shape byte-identical to a genuinely quiet board. Read the loader meta so an
  // outage is never dressed up as calm live truth ("Gate holding", "0 cleared",
  // "Intake warming up"). When unavailable, say so plainly instead.
  //
  // "Unavailable" covers TWO board states that both zero the counts without a
  // genuinely quiet slate: a hard DB outage (meta.dataError), AND an intentional
  // suppression (the stale-data kill switch parking a failed-freshness slate, or
  // demo rows held off the public board) that the loader flags via degradation
  // codes but NOT dataError. /board reads the same codes; mirror it here so a
  // suppressed slate never renders as a healthy "0 cleared · 0 gated".
  const boardSuppressed = stateResult.meta.degradations.some(
    (degradation) =>
      degradation.code === "STALE_DATA_SUPPRESSED" ||
      degradation.code === "DEMO_DATA_SUPPRESSED",
  );
  const boardUnavailable =
    stateResult.meta.dataError === "DB_UNREACHABLE" || boardSuppressed;

  // The market slot is redacted to a sentinel for non-premium viewers, and it
  // was being printed raw: "we're on ALL_MARKETS". A held row also said "we
  // passed", which on the fallback path is a judgement nobody made. Both now go
  // through lib/board/market-label.ts.
  const tickerItems = [
    ...state.publishedToday.slice(0, 8).map(
      (p) => publishedTickerLine(p.matchup, p.market),
    ),
    ...state.gatedTodayRows.slice(0, 6).map(
      (row) => heldTickerLine(row.matchup, row.gateReason),
    ),
  ];

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-carbon text-ion">
      {/* Site front door: ONE cinematic cold-open over the Field ground,
          climaxing on the brand mark. Self-gating (localStorage) so it plays
          once per session, skippable, reduced-motion safe. The slow doctrine
          intro was retired. */}
      <FieldCinematicIntro />
      <Nav />
      <main id="main-content">
        {/* HERO. The thesis, the graphic, two ways in. */}
        <section
          className="relative isolate overflow-hidden border-b border-mineral"
          style={{ background: "#08090C", minHeight: "min(92vh, 820px)" }}
        >
          <FieldHeroCanvas />
          <div
            aria-hidden="true"
            className="grain-overlay absolute inset-0 -z-10"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(ellipse 55% 40% at 70% 18%, rgba(255,77,46,0.09), transparent 58%), linear-gradient(180deg, #08090Cdd 0%, #08090C88 42%, #08090C 100%)",
            }}
          />
          <div className="relative mx-auto flex min-h-[inherit] max-w-5xl flex-col justify-center px-4 py-28 sm:px-6 lg:px-8">
            <Reveal>
              <p className="mb-6 inline-flex items-center gap-2.5 border border-mineral bg-eclipse/70 px-3.5 py-1.5 text-[11px] uppercase tracking-wider text-ion-2">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full bg-plasma"
                  style={{ animation: "pp-live-pulse 2s ease-in-out infinite" }}
                />
                Live now
              </p>
            </Reveal>
            <Reveal delay={60}>
              <h1
                className="max-w-5xl font-display font-semibold leading-[0.9] tracking-tight text-ion-white"
                style={{ fontSize: "clamp(3.5rem, 10vw, 7.5rem)" }}
              >
                The market is full of <span className="text-plasma">noise</span>.
                <br />
                We find the <span className="text-plasma">signal</span>.
              </h1>
            </Reveal>
            <Reveal delay={120}>
              <p className="mt-6 max-w-xl text-lg leading-8 text-ion-1">
                Every Sunday the takes pile up. We score every game, publish what
                we&apos;re on, and show what we passed on, with the reason.
              </p>
            </Reveal>
            <Reveal delay={180}>
              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row">
                {/* F-28 (founder-delegated 2026-09-08, via orchestrator):
                    primary CTA to /picks, secondary to /pricing. */}
                <Link href="/picks" className="btn-primary min-h-12 px-7 py-3 text-base">
                  See today&apos;s picks
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex min-h-12 items-center justify-center border border-mineral px-7 py-3 text-base font-semibold text-ion-1 transition-colors hover:border-plasma hover:text-ion-white"
                >
                  See pricing
                </Link>
              </div>
            </Reveal>
            <Reveal delay={240}>
              <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.24em] text-ion-2">
                <SignalDecode speed={28}>We detect. You decide.</SignalDecode>
              </p>
            </Reveal>
            <Reveal delay={280}>
              <dl className="mt-12 grid max-w-2xl grid-cols-2 gap-px border border-mineral bg-mineral sm:grid-cols-4">
                {[
                  { k: "Today's picks", v: boardUnavailable ? "n/a" : String(cleared) },
                  { k: "We passed on", v: boardUnavailable ? "n/a" : String(gated) },
                  { k: "Graded picks", v: settled > 0 ? String(settled) : "building" },
                  { k: "Anyone can check", v: "yes" },
                ].map((cell) => (
                  <div key={cell.k} className="bg-eclipse px-4 py-3">
                    <dt className="text-[11px] uppercase tracking-wider text-ion-2">
                      {cell.k}
                    </dt>
                    <dd className="mt-1 font-display text-2xl font-semibold tabular-nums text-ion-white">
                      {cell.v}
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </section>

        <FieldBoardTicker items={tickerItems} />

        {/* 5-PILLAR REVENUE & T-48H PROJECTIONS SECTION */}
        <section
          id="revenue-pillars"
          data-testid="five-pillar-revenue-section"
          className="border-b border-mineral bg-eclipse/40 px-4 py-12 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-mineral pb-6">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-plasma">
                    5-Pillar Architecture · T-48h Intelligence
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-semibold text-ion-white sm:text-3xl">
                    Five Ways In. Zero Noise. Calibrated Commercial Value.
                  </h2>
                </div>
                <Link
                  href="/packages"
                  className="btn-primary min-h-10 px-5 py-2 text-sm font-semibold whitespace-nowrap"
                >
                  Explore Slate Packages →
                </Link>
              </div>
            </Reveal>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Link
                href="/picks"
                className="group flex flex-col justify-between border border-mineral bg-carbon p-5 transition-colors hover:border-plasma"
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-plasma">01</span>
                    <span className="border border-mineral px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-ion-2 group-hover:border-plasma/40 group-hover:text-plasma">
                      LIVE PICKS
                    </span>
                  </div>
                  <h3 className="mt-3 font-semibold text-ion-white group-hover:text-plasma transition-colors">
                    Today&apos;s Picks
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-ion-1">
                    Calibrated side &amp; total signals with strictly positive CLV and verified receipts.
                  </p>
                </div>
                <span className="mt-4 font-mono text-[11px] text-ion-2 group-hover:text-ion-white">
                  Open Picks →
                </span>
              </Link>

              <Link
                href="/fantasy/props"
                className="group flex flex-col justify-between border border-mineral bg-carbon p-5 transition-colors hover:border-plasma"
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-plasma">02</span>
                    <span className="border border-mineral px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-ion-2 group-hover:border-plasma/40 group-hover:text-plasma">
                      N_EFF PROPS
                    </span>
                  </div>
                  <h3 className="mt-3 font-semibold text-ion-white group-hover:text-plasma transition-colors">
                    Player Props Lab
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-ion-1">
                    N_eff usage volume models, first-read metrics, and Underdog / PrizePicks edges.
                  </p>
                </div>
                <span className="mt-4 font-mono text-[11px] text-ion-2 group-hover:text-ion-white">
                  Open Props →
                </span>
              </Link>

              <Link
                href="/sgp-projections"
                className="group flex flex-col justify-between border border-mineral bg-carbon p-5 transition-colors hover:border-plasma"
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-plasma">03</span>
                    <span className="border border-mineral px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-ion-2 group-hover:border-plasma/40 group-hover:text-plasma">
                      CORRELATION
                    </span>
                  </div>
                  <h3 className="mt-3 font-semibold text-ion-white group-hover:text-plasma transition-colors">
                    SGP Projections
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-ion-1">
                    Joint distribution modeling exposing bookmakers&apos; 15-30% same-game parlay hold.
                  </p>
                </div>
                <span className="mt-4 font-mono text-[11px] text-ion-2 group-hover:text-ion-white">
                  Open SGP →
                </span>
              </Link>

              <Link
                href="/fantasy/dfs"
                className="group flex flex-col justify-between border border-mineral bg-carbon p-5 transition-colors hover:border-plasma"
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-plasma">04</span>
                    <span className="border border-mineral px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-ion-2 group-hover:border-plasma/40 group-hover:text-plasma">
                      10,000 SIMS
                    </span>
                  </div>
                  <h3 className="mt-3 font-semibold text-ion-white group-hover:text-plasma transition-colors">
                    DFS Writeups &amp; Lineups
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-ion-1">
                    Coach-mind-first game environment writeups, tactical scheme funnels, N_eff usage scaling, and 10,000-sim constructed cash &amp; 20-max GPP lineups.
                  </p>
                </div>
                <span className="mt-4 font-mono text-[11px] text-ion-2 group-hover:text-ion-white">
                  Open DFS Writeup →
                </span>
              </Link>

              <Link
                href="/packages"
                className="group flex flex-col justify-between border border-mineral bg-carbon p-5 transition-colors hover:border-plasma"
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-plasma">05</span>
                    <span className="border border-mineral px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-ion-2 group-hover:border-plasma/40 group-hover:text-plasma">
                      STOREFRONT
                    </span>
                  </div>
                  <h3 className="mt-3 font-semibold text-ion-white group-hover:text-plasma transition-colors">
                    Instant Packages
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-ion-1">
                    WagerTalk-style a-la-carte slate packages with instant Stripe checkout &amp; Telegram delivery.
                  </p>
                </div>
                <span className="mt-4 font-mono text-[11px] text-ion-2 group-hover:text-ion-white">
                  Open Packages →
                </span>
              </Link>
            </div>

            {/* WAGERTALK-STYLE A-LA-CARTE SLATE PACKAGES & INSTANT CHECKOUT BRICKS ON HOMEPAGE */}
            <div className="mt-12 border-t border-mineral pt-10" data-testid="homepage-wagertalk-storefront">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-plasma">
                    A-La-Carte Storefront · T-48h 04:00 CT 10,000-Run Simulations
                  </p>
                  <h3 className="mt-1 font-display text-2xl font-semibold text-ion-white">
                    Live Slate Packages &amp; Guaranteed Cards
                  </h3>
                  <p className="mt-1 text-xs text-ion-1">
                    Buy individual slates with zero subscription. Free Pace-of-Play &amp; Scheme Teasers below — Official Sides, Totals, N_eff Props, Correlated SGPs &amp; 20-Max DFS Lineups unlock immediately upon Stripe or Whop checkout + @GalaxySportsEdge_bot VIP delivery.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href="https://t.me/GalaxySportsEdge_bot"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 border border-plasma/40 bg-plasma/10 px-3.5 py-2 text-xs font-mono text-plasma hover:bg-plasma/20 transition-colors"
                  >
                    <span className="h-2 w-2 rounded-full bg-plasma animate-pulse" />
                    @GalaxySportsEdge_bot VIP
                  </a>
                  <Link
                    href="/packages"
                    className="inline-flex items-center border border-mineral bg-carbon px-3.5 py-2 text-xs font-mono text-ion-1 hover:border-plasma hover:text-ion-white"
                  >
                    Full Storefront ({LIVE_PACKAGE_CATALOG.length} Packs) →
                  </Link>
                </div>
              </div>

              {/* Free Pace-of-Play & Scheme Matchup Teasers (with Strict Lock Redaction) */}
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {LIVE_SLATE_COACH_WRITEUPS.slice(0, 4).map((w) => (
                  <Link
                    key={w.id}
                    href="/packages"
                    className="group border border-mineral/60 bg-carbon/90 p-4 transition-colors hover:border-plasma"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-plasma uppercase">{w.windowSlot}</span>
                      <span className="text-ion-2">{w.paceOfPlay.neutralSecPerSnap}s / snap · {Math.round(w.paceOfPlay.noHuddleRate * 100)}% No-Huddle</span>
                    </div>
                    <div className="mt-1.5 text-sm font-semibold text-ion-white group-hover:text-plasma">
                      {w.matchup}
                    </div>
                    <p className="mt-1.5 text-xs text-ion-1 line-clamp-2">
                      {w.schemeMatchup.coverageShell}
                    </p>
                    <div className="mt-3 border-t border-mineral/40 pt-2 font-mono text-[10px] text-plasma">
                      🔒 Side ({w.sideTotalCall.sideConfidence}) · Total ({w.sideTotalCall.totalConfidence}) · {w.topProps.length} Props · SGP Locked
                    </div>
                  </Link>
                ))}
              </div>

              {/* 5 OnlyFans / WagerTalk-Style Paywall Reveal Cards with In-Place Unlock */}
              <div className="mt-6 grid gap-6 lg:grid-cols-3">
                {LIVE_PACKAGE_CATALOG.map((pkg) => (
                  <PaywallRevealCard
                    key={pkg.slug}
                    pkg={pkg}
                    teasers={getRedactedTeasersForWindowSlot(pkg.windowSlot)}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SIGNAL MAP. Four ways in, one decision each. */}
        <section
          id="doors"
          className="border-b border-mineral px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <p className="text-[11px] uppercase tracking-wider text-plasma">
                Where to start
              </p>
              <h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold text-ion-white sm:text-4xl">
                What are you here to decide?
              </h2>
            </Reveal>
            <div className="mt-10 grid gap-px overflow-hidden border border-mineral bg-mineral sm:grid-cols-2 lg:grid-cols-4">
              <DoorCard
                index={1}
                label="Board"
                decides="Every game we scored today, and what we decided."
                stat={
                  boardUnavailable
                    ? "Board temporarily unavailable"
                    : cleared > 0 || gated > 0
                      ? `${cleared} picks · ${gated} passes`
                      : "Quiet slate. Nothing forced."
                }
                action="Open the board"
                href="/board"
                bar={boardUnavailable ? undefined : { a: cleared, b: gated }}
              />
              <Suspense fallback={<NflverseLabDoorPlaceholder />}>
                <NflverseLabDoor />
              </Suspense>
              <DoorCard
                index={3}
                label="Intelligence"
                decides="Why the engine reads a game the way it does."
                stat={
                  settled > 0
                    ? `Graded on ${settled} settled picks`
                    : "Calibration sample building"
                }
                action="Open the engines"
                href="/intelligence/engines"
                accent
              />
              <DoorCard
                index={4}
                label="Fantasy & Daily"
                decides="Start-sit, waivers, trades and DFS, in one read."
                stat={`${scoring > 0 ? `${scoring} scoring now · ` : ""}Season + daily tools`}
                action="Open the tools"
                href="/fantasy"
              />
            </div>
            {/* The live-counts line is a real operational readout. During a
                board outage/suppression its cleared/gated counts are zeroed, so
                we withhold the numbers rather than caption unverifiable zeros as
                "Live counts". The player-rows metric lives in the
                Suspense-bounded NflverseLabDoor above (P16-01): nflverse errors
                surface there, not here. */}
            <p className="mt-8 text-center text-sm text-ion-2">
              {boardUnavailable ? (
                <>Board counts are temporarily unavailable.</>
              ) : (
                <>
                  Right now: <span className="text-ion-white">{cleared} picks</span> on the board,{" "}
                  <span className="text-ion-white">{gated} we passed on</span>.
                </>
              )}
              {settled > 0 ? (
                <>  Graded on {settled} settled picks.</>
              ) : (
                <>  Building our graded sample.</>
              )}
            </p>
          </div>
        </section>

        {/* NO-BET. Restraint is a first-class output. */}
        <WorldSection
          index="01"
          id="gate"
          className="neb-band"
          eyebrow="The hold"
          title={
            <>
              A pass is not a blank. It is{" "}
              <span className="text-plasma">the finding</span>.
            </>
          }
          lede="Knowing what not to trust is the product. Four checks keep weak games off the board, and every pass is logged in public, same as a published pick."
          tone="deep"
        >
          <NoBetGateChapter />
        </WorldSection>

        {/* PROOF STRIP. One band, routes to the proof itself. */}
        <section className="neb-band border-b border-mineral px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-plasma">
                The proof
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-ion-white sm:text-3xl">
                Trust is an architecture, not a tagline.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-ion-1">
                Picks publish with tamper-evident receipts, frozen before kickoff:
                hashed, committed, impossible to edit after the game. No fabricated
                picks, no invented stats, no silent edits. And you don&apos;t have to
                take our word for it. Check a receipt yourself.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link href="/proof" className="btn-primary whitespace-nowrap">
                See the sealed record
              </Link>
              <Link
                href="/engine"
                className="text-sm font-semibold text-ion-1 hover:text-ion-white"
              >
                Open the sealed engine
              </Link>
              <Link
                href="/verify"
                className="text-sm font-semibold text-ion-1 hover:text-ion-white"
              >
                Check a receipt →
              </Link>
            </div>
          </div>
        </section>

        {/* RECORD. Calm, live, sample-aware. */}
        <section
          className="border-b border-mineral px-4 py-14 sm:px-6 lg:px-8"
          style={{ background: "#0A0C10" }}
        >
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-plasma">
                Record
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-ion-white sm:text-4xl">
                Every number ships with its sample.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-ion-1">
                Receipts freeze before kickoff. Hits print with period, sample size,
                model version, and the definition used. Thin samples stay dark with the
                gap named. Recompute any seal yourself.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/calibration" className="btn-primary min-h-11 px-5 py-2.5">
                  Full record
                </Link>
                <Link
                  href="/verify"
                  className="inline-flex min-h-11 items-center border border-mineral px-5 py-2.5 text-sm font-semibold text-ion-1 hover:border-plasma hover:text-ion-white"
                >
                  Verify a receipt
                </Link>
              </div>
            </div>
            <FieldRecordPanel
              sampleSize={calibration.sampleSize}
              gated={calibrationResult.meta.gated}
              publicMessage={calibration.publicMessage}
              buckets={(calibration.buckets ?? []).map((b) => ({
                label: b.label,
                expectedWinRate: b.expectedWinRate,
                observedWinRate: b.observedWinRate,
                sampleSize: b.sampleSize,
                sufficientSample: b.sampleSize >= 30,
              }))}
            />
          </div>
        </section>

        {/* The live-counts ledger band is a real operational readout. During a
            board outage/suppression its cleared/gated counts are zeroed, so we
            withhold the whole band rather than caption unverifiable zeros as
            "Live counts". The player-rows metric moved to the Suspense-bounded
            NflverseLabDoor above (P16-01): nflverse errors surface there, not
            here. The methodology cards below stay; they explain method, not
            live numbers. */}
        <MethodologySection
          metrics={
            boardUnavailable
              ? undefined
              : {
                  settled,
                  cleared,
                  gated,
                  lastRefresh: state.lastRefresh,
                }
          }
        />

        <section
          data-testid="homepage-responsible-close"
          className="gw-nebula px-4 py-14 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-5xl border border-mineral bg-eclipse p-5 sm:p-7">
            <h2 className="text-2xl font-semibold text-ion-white">
              The math can point. The decision stays yours.
            </h2>
            <p className="mt-3 text-sm leading-6 text-ion-1">
              This product is research, not certainty. We get better by adding settled
              rows and clearer uncertainty, not by making louder claims.
            </p>
            <RiskDisclosure variant="compact" includePastPerformance className="mt-5 text-ion-1" />
          </div>
        </section>
      </main>
      {/* FE-17: restricted to the home hero, not mounted globally.
          See app/layout.tsx. */}
      <GalaxyCursor />
      <Footer />
    </div>
  );
}
