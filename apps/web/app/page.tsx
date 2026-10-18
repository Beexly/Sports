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
import { DoorCard } from "@/components/landing/door-card";
import {
  NflverseLabDoor,
  NflverseLabDoorPlaceholder,
} from "@/components/landing/nflverse-lab-door";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { MethodologySection } from "@/components/ui/methodology-section";
import { Reveal } from "@/components/motion/reveal";
import { loadBoardState } from "@/lib/board/state";
import { publishedTickerLine, heldTickerLine } from "@/lib/board/market-label";
import { loadPublicCalibrationReport } from "@/lib/calibration/report";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  // FE-13: the layout's title template appends the brand, and this title is
  // already the brand, so it must be absolute.
  title: { absolute: "Galaxy Sports Edge" },
  description:
    "A scored board, a public record, and the guts to show what we passed on. We detect. You decide.",
  alternates: { canonical: "/" },
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

  // Public record = wins and losses only (owner directive). These counts come
  // from the same server-gated report: when the performance gate is closed the
  // loader returns an empty population, so the page never decides access on
  // its own. Pushes and in-play exclusions are named beside the record because
  // they change what it counts (law 10). No rate is shown.
  // Read defensively: a partial payload renders the "building" state, never a
  // crash and never an invented zero record (showRecord needs decided > 0).
  const wins = calibration.population?.wins ?? 0;
  const losses = calibration.population?.losses ?? 0;
  const pushes = calibration.population?.pushes ?? 0;
  const decided = calibration.population?.decided ?? 0;
  const excludedInPlay = calibration.excludedInPlay ?? 0;
  const showRecord = !calibrationResult.meta.gated && decided > 0;

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
                      ? `${cleared} ${cleared === 1 ? "pick" : "picks"} · ${gated} ${gated === 1 ? "pass" : "passes"}`
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
                    : "Results build as picks settle"
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

        {/* RECORD. Wins and losses only, with the count (owner directive:
            public proof is win/loss and units, nothing about method). Units
            are not in the report this page reads, so none are shown. The
            calibration curve, the receipts strip and the gate chapter that
            used to sit here were removed; their routes stay reachable. */}
        <section
          data-testid="homepage-record"
          className="border-b border-mineral px-4 py-14 sm:px-6 lg:px-8"
          style={{ background: "#0A0C10" }}
        >
          <div className="mx-auto max-w-7xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-plasma">
              Record
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-ion-white sm:text-4xl">
              Wins and losses, all of them.
            </h2>
            {showRecord ? (
              <>
                <dl className="mt-6 grid max-w-xl grid-cols-3 gap-px border border-mineral bg-mineral">
                  {[
                    { k: "Wins", v: wins },
                    { k: "Losses", v: losses },
                    { k: "Decided picks", v: decided },
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
                <p className="mt-3 max-w-xl text-sm leading-6 text-ion-1">
                  Record: {wins}-{losses} across {decided} decided picks.
                  {pushes > 0 ? (
                    <> {pushes} {pushes === 1 ? "push is" : "pushes are"} not counted as a win or a loss.</>
                  ) : null}
                  {excludedInPlay > 0 ? (
                    <> {excludedInPlay} {excludedInPlay === 1 ? "pick" : "picks"} made after kickoff {excludedInPlay === 1 ? "is" : "are"} left out.</>
                  ) : null}
                </p>
              </>
            ) : (
              <p className="mt-3 max-w-xl text-sm leading-6 text-ion-1">
                Results build as picks settle. Wins and losses show here once
                there are graded picks to count.
              </p>
            )}
            <div className="mt-6">
              <Link href="/picks" className="btn-primary min-h-11 px-5 py-2.5">
                See today&apos;s picks
              </Link>
            </div>
          </div>
        </section>

        {/* The live-counts ledger band is a real operational readout. During a
            board outage/suppression its cleared/gated counts are zeroed, so we
            withhold the whole band rather than caption unverifiable zeros as
            "Live counts". The player-rows metric moved to the Suspense-bounded
            NflverseLabDoor above (P16-01): nflverse errors surface there, not
            here. The ledger variant drops the methodology cards (customer copy
            pass) and keeps the counts plus their freshness stamp. */}
        <MethodologySection
          variant="ledger"
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
