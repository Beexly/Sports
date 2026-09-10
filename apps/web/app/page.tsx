import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { SignalSpine } from "@/components/motion/signal-spine";
import { SignalDecode } from "@/components/motion/signal-decode";
import { ObservatoryBeacon } from "@/components/motion/observatory-beacon";
import { GalaxyCursor } from "@/components/ui/galaxy-cursor";
import { SentientWeather } from "@/components/motion/sentient-weather";
import { GeneratedPlate } from "@/components/immersive/generated-plate";
import { getPlate } from "@/lib/visual-production/asset-manifest";
import { MontageEntrance } from "@/components/landing/montage-entrance";
import { CLOSING_LINE } from "@/lib/brand";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { MethodologySection } from "@/components/ui/methodology-section";
import { Reveal } from "@/components/motion/reveal";
import { WorldSection } from "@/components/world/world-section";
import { NoBetGateChapter } from "@/components/world/no-bet-gate";
import { loadBoardState } from "@/lib/board/state";
import { loadPublicCalibrationReport } from "@/lib/calibration/report";
import { NflverseLabDoor, NflverseLabDoorPlaceholder } from "@/components/landing/nflverse-lab-door";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Galaxy Sports Edge",
  description:
    "A scored board, a public record, and the guts to show what we held back. We detect. You decide.",
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
  const heroPlate = getPlate("signal-room-hero");

  const cleared = state.publishedToday.length;
  const gated = state.gatedTodayRows.length;
  const scoring = state.scoringNow.length;
  const settled = calibration.sampleSize;
  // Honest degraded states. The loaders zero their counts on infra failure, a
  // shape byte-identical to a genuinely quiet board. Read the loader meta so an
  // outage is never dressed up as calm live truth ("Gate holding", "0 cleared ·
  // 0 gated", "Intake warming up"). When unavailable, say so plainly instead.
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

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-carbon text-ion">
      <SentientWeather state="active" intensity={0.5} />
      {/* Site front door: ONE cinematic cold-open (~3.6s) over a real motion bed,
          climaxing on the brand mark. Self-gating (localStorage) so it plays once
          per session, skippable, reduced-motion safe. It dissolves to reveal the
          world behind it. The slow doctrine intro was retired. */}
      <MontageEntrance />
      <Nav />
      <SignalSpine />
      <main id="main-content">
        {/* ── HERO · Field thesis ──────────────────────────────────────── */}
        <section className="relative isolate overflow-hidden border-b border-mineral" style={{ background: "var(--void)" }}>
          {heroPlate && (
            <GeneratedPlate
              className="-z-30 opacity-60"
              gradient={heroPlate.gradient}
              still={heroPlate.still}
              motion={heroPlate.motion}
              eager
            />
          )}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(ellipse 55% 45% at 80% 20%, rgba(255,77,60,0.08), transparent 55%), linear-gradient(180deg, #08090Ccc 0%, #08090C66 45%, #08090C 100%)",
            }}
          />
          <div className="mx-auto max-w-5xl px-4 py-24 text-center sm:px-6 sm:py-32 lg:px-8">
            <Reveal>
              <p className="mb-7 inline-flex items-center gap-2.5 border border-mineral bg-eclipse/60 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ion-2">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-plasma" style={{ animation: "pp-live-pulse 2s ease-in-out infinite" }} />
                Live slate
              </p>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mx-auto max-w-4xl font-display text-display-xl font-semibold leading-[0.95] text-balance text-ion-white">
                Noise.
                <br />
                <span className="text-plasma">Signal.</span>
              </h1>
            </Reveal>
            <Reveal delay={150}>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-ion-1">
                Every Sunday the takes pile up. We score the markets, publish what
                survives, and put the holds on the record with their reasons.
              </p>
            </Reveal>
            <Reveal delay={220}>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/picks" className="btn-primary min-h-11 px-6 py-3">
                  Open the board
                </Link>
                <Link
                  href="/performance"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-mineral px-6 py-3 text-sm font-semibold text-ion-1 transition-colors hover:border-mineral-hi hover:text-ion-white"
                >
                  See the record
                </Link>
              </div>
            </Reveal>
            <p className="mt-7 font-mono text-[10px] uppercase tracking-[0.24em] text-ion-2">
              <SignalDecode speed={28}>{CLOSING_LINE}</SignalDecode>
            </p>
          </div>
        </section>

        {/* ── SIGNAL MAP · the command console of four doors ──────────── */}
        <section id="doors" className="border-b border-mineral bg-void/30 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">
                Four doors
              </p>
              <h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold text-ion-white sm:text-4xl">
                What are you here to do?
              </h2>
            </Reveal>
            <div className="mt-10 grid gap-px overflow-hidden rounded-ds-lg border border-mineral bg-mineral sm:grid-cols-2 lg:grid-cols-4">
              <DoorCard
                index={1}
                label="Board"
                decides="The gate's reasoning behind every pass and every clear."
                stat={
                  boardUnavailable
                    ? "Live board data unavailable"
                    : cleared > 0 || gated > 0
                      ? `${cleared} cleared · ${gated} gated`
                      : "Gate holding. No forced action"
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
                stat={settled > 0 ? `Graded on ${settled} settled picks` : "Calibration sample building"}
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
            <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-ion-2">
              {boardUnavailable ? (
                <>Live board counts are temporarily unavailable.</>
              ) : (
                <>
                  Right now · <span className="text-ion-white">{cleared} cleared</span> ·{" "}
                  <span className="text-ion-white">{gated} gated</span> ·{" "}
                </>
              )}
              {settled > 0 ? (
                <>graded on <span className="text-ion-white">{settled} settled picks</span></>
              ) : (
                <>calibration sample building</>
              )}
            </p>
          </div>
        </section>

        {/* ── NO-BET · restraint is a first-class output ──────────────── */}
        <WorldSection
          index="01"
          id="gate"
          className="neb-band"
          eyebrow="The No-Bet Gate"
          title={<>A held row is not a blank. It is <span className="text-plasma">the finding</span>.</>}
          lede="Knowing what not to trust is the product. Four gates keep weak markets off the board, and every pass is logged in public — same as a published pick."
          tone="deep"
        >
          <NoBetGateChapter />
        </WorldSection>

        {/* ── PROOF STRIP · one band, routes to the proof ─────────────── */}
        <section className="neb-band border-y border-mineral px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                The proof
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-ion-white sm:text-3xl">
                Every number ships with its sample.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-ion-1">
                Receipts freeze before kickoff. Hits print with period, sample size,
                model version, and the definition used. When the sample is too thin
                to stand up, we withhold the number and print why. Recompute any
                seal yourself.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link href="/proof" className="btn btn-primary whitespace-nowrap">
                See the sealed record
              </Link>
              <Link href="/verify" className="text-sm font-semibold text-ion-1 hover:text-ion-white">
                Check a receipt →
              </Link>
            </div>
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

        <section data-testid="homepage-responsible-close" className="gw-nebula px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl rounded-ds-lg border border-mineral bg-eclipse p-5 sm:p-7">
            <h2 className="text-2xl font-semibold text-ion-white">The model can point. The call stays yours.</h2>
            <p className="mt-3 text-sm leading-6 text-ion-1">
              Research, not certainty. We get better by adding settled rows and clearer
              uncertainty — not louder claims.
            </p>
            <RiskDisclosure variant="compact" includePastPerformance className="mt-5 text-ion-1" />
          </div>
        </section>

      </main>
      <ObservatoryBeacon />
      {/* FE-17: restricted to the home hero, not mounted globally.
          See app/layout.tsx. */}
      <GalaxyCursor />
      <Footer />
    </div>
  );
}

/* ── Signal-map door. A console cell ─────────────────────────────────── */
function DoorCard({
  index,
  label,
  decides,
  stat,
  action,
  href,
  accent = false,
  bar,
}: {
  index: number;
  label: string;
  decides: string;
  stat: string;
  action: string;
  href: string;
  accent?: boolean;
  /** Optional two-segment micro-bar: shows magnitude, not just text. */
  bar?: { a: number; b: number };
}): JSX.Element {
  const showBar = bar && bar.a + bar.b > 0;
  const aPct = showBar ? Math.round((bar.a / (bar.a + bar.b)) * 100) : 0;
  return (
    <Reveal delay={index * 70} className="flex">
      <Link
        href={href}
        className="group relative flex w-full flex-col gap-4 bg-eclipse p-6 transition-colors duration-300 hover:bg-carbon"
      >
        {/* accent rail. Draws across the top on hover (left origin) */}
        <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-mineral" />
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-orbital-cyan transition-transform duration-500 ease-out group-hover:scale-x-100"
        />

        {/* header rail. Index + status dot */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] tracking-[0.3em] text-ion-2 tabular-nums">
            {String(index).padStart(2, "0")}
          </span>
          <span
            aria-hidden
            className={`h-1.5 w-1.5 rounded-full ${accent ? "bg-orbital-cyan" : "bg-soft-ultraviolet"} opacity-60 transition-opacity group-hover:opacity-100`}
          />
        </div>

        <p className="font-display text-2xl font-semibold leading-tight text-ion-white">{label}</p>
        <p className="flex-1 text-sm leading-6 text-ion-1">{decides}</p>

        {/* live readout */}
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-orbital-cyan tabular-nums">{stat}</p>

        {/* micro-bar: show the split, do not just say it */}
        {showBar && (
          <span aria-hidden className="flex h-1 overflow-hidden rounded-full bg-mineral">
            <span className="h-full bg-orbital-cyan" style={{ width: `${aPct}%` }} />
            <span className="h-full flex-1 bg-plasma/70" />
          </span>
        )}

        <p className="flex items-center gap-1.5 border-t border-mineral/70 pt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ion-2 transition-colors group-hover:text-ion-white">
          {action}
          <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span>
        </p>
      </Link>
    </Reveal>
  );
}
