import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { SignalCoreLazy } from "@/components/hero/signal-core-lazy";
import { SignalSpine } from "@/components/motion/signal-spine";
import { SignalDecode } from "@/components/motion/signal-decode";
import { ObservatoryBeacon } from "@/components/motion/observatory-beacon";
import { SentientWeather } from "@/components/motion/sentient-weather";
import { GeneratedPlate } from "@/components/immersive/generated-plate";
import { getPlate } from "@/lib/visual-production/asset-manifest";
import { MontageEntrance } from "@/components/landing/montage-entrance";
import { BRAND_COLORS } from "@/lib/brand";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { MethodologySection } from "@/components/ui/methodology-section";
import { Reveal } from "@/components/motion/reveal";
import { WorldSection } from "@/components/world/world-section";
import { SignalFragmentField } from "@/components/world/signal-fragment-field";
import { NoBetGateChapter } from "@/components/world/no-bet-gate";
import { loadBoardState } from "@/lib/board/state";
import { loadPublicCalibrationReport } from "@/lib/calibration/report";
import { loadNflverseUsagePulse } from "@/lib/nflverse/usage-pulse";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "A Sports Intelligence Operating System",
  description:
    "Galaxy Sports Edge turns the market's noise into structured signal. A live board, no-bet gating, and receipts for all of it. We detect. You decide.",
  alternates: { canonical: "/" },
};

export default async function HomePage(): Promise<JSX.Element> {
  const [stateResult, calibrationResult, nflversePulse] = await Promise.all([
    loadBoardState(),
    loadPublicCalibrationReport(),
    loadNflverseUsagePulse(),
  ]);
  const state = stateResult.data;
  const calibration = calibrationResult.data;
  const heroPlate = getPlate("signal-room-hero");

  const cleared = state.publishedToday.length;
  const gated = state.gatedTodayRows.length;
  const scoring = state.scoringNow.length;
  const settled = calibration.sampleSize;
  const nflRows = nflversePulse.status === "live" ? nflversePulse.sourceRows : 0;

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
        {/* ── HERO · the thesis, the graphic, two ways in ─────────────── */}
        <section className="gw-nebula-deep relative isolate overflow-hidden border-b border-mineral">
          {heroPlate && (
            <GeneratedPlate
              className="-z-30 opacity-85"
              gradient={heroPlate.gradient}
              still={heroPlate.still}
              motion={heroPlate.motion}
              eager
            />
          )}
          <div aria-hidden="true" className="absolute inset-0 -z-20">
            <SignalCoreLazy />
          </div>
          <div aria-hidden="true" className="gw-starfield -z-10" />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{
              background: `radial-gradient(ellipse 70% 60% at 78% 18%, ${BRAND_COLORS.ionMagenta}1c, transparent 60%), radial-gradient(ellipse 60% 55% at 12% 80%, ${BRAND_COLORS.softUltraviolet}24, transparent 65%), linear-gradient(180deg, ${BRAND_COLORS.obsidianBlack}b3 0%, ${BRAND_COLORS.obsidianBlack}4d 46%, ${BRAND_COLORS.obsidianBlack}99 74%, ${BRAND_COLORS.obsidianBlack} 100%)`,
            }}
          />
          <div className="mx-auto max-w-5xl px-4 py-24 text-center sm:px-6 sm:py-32 lg:px-8">
            <Reveal>
              <p className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-mineral/80 bg-eclipse/40 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.28em] text-ion-2 backdrop-blur-sm">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-orbital-cyan" style={{ animation: "pp-live-pulse 2s ease-in-out infinite" }} />
                Sports decision intelligence
              </p>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mx-auto max-w-4xl font-display text-display-xl font-semibold leading-[1.0] text-balance text-ion-white">
                The market is full of <span className="gw-chrome-plasma">noise</span>.
                <br />
                <span className="gw-chrome-ice">Galaxy turns it into</span>{" "}
                <span className="gse-editorial text-orbital-cyan gw-text-glow-cyan">signal</span>.
              </h1>
            </Reveal>
            <Reveal delay={150}>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-ion-1">
                Real sportsbook data, structured into picks you can check, and the
                discipline to know when not to bet.
              </p>
            </Reveal>
            <Reveal delay={220}>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/board" className="btn-primary min-h-11 px-6 py-3">
                  Enter today&apos;s board
                </Link>
                <Link
                  href="/the-beat"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-orbital-cyan/60 px-6 py-3 text-sm font-semibold text-orbital-cyan transition-shadow hover:border-orbital-cyan hover:text-ion-white hover:shadow-[0_0_28px_-6px_rgba(0,229,255,0.6)]"
                >
                  Watch The Beat
                </Link>
              </div>
            </Reveal>
            <p className="mt-7 font-mono text-[10px] uppercase tracking-[0.24em] text-ion-2">
              <SignalDecode speed={28}>We detect. You decide.</SignalDecode>
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
                Pick the decision you came to make.
              </h2>
            </Reveal>
            <div className="mt-10 grid gap-px overflow-hidden rounded-ds-lg border border-mineral bg-mineral sm:grid-cols-2 lg:grid-cols-4">
              <DoorCard
                index={1}
                label="Board"
                decides="What's worth a play today, and what to pass."
                stat={cleared > 0 || gated > 0 ? `${cleared} cleared · ${gated} gated` : "Gate holding. No forced action"}
                action="Open the board"
                href="/board"
                bar={{ a: cleared, b: gated }}
              />
              <DoorCard
                index={2}
                label="The Lab"
                decides="Who to trust this week, with every signal in one place."
                stat={nflRows > 0 ? `${nflRows.toLocaleString()} live player rows` : "Intake warming up"}
                action="Open the lab"
                href="/players"
              />
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
          </div>
        </section>

        {/* ── SIGNAL VS NOISE · the one signature teaching beat ───────── */}
        <WorldSection
          index="01"
          id="signal"
          className="gw-grid-field"
          eyebrow="Signal vs noise"
          title="Same market. Two completely different readings."
          lede="Takes, steam, rumor, stale numbers: what reaches you arrives as argument. The engine starts from the same inputs and structures them into something accountable."
        >
          <SignalFragmentField />
          <p className="mt-10 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-ion-2">
            Right now ·{" "}
            <span className="text-orbital-cyan">{cleared} cleared</span> ·{" "}
            <span className="text-plasma">{gated} gated</span> ·{" "}
            {settled > 0 ? (
              <>graded on <span className="text-ion-white">{settled} settled picks</span> ·{" "}</>
            ) : (
              <>calibration sample building ·{" "}</>
            )}
            <Link href="/accountability" className="text-orbital-cyan underline-offset-4 hover:text-ion-white hover:underline">
              see the receipts
            </Link>
          </p>
        </WorldSection>

        {/* ── NO-BET · restraint is a first-class output ──────────────── */}
        <WorldSection
          index="02"
          id="gate"
          eyebrow="The No-Bet Gate"
          title={<>No-Bet is not absence. It is <span className="gw-chrome-ice">intelligence</span>.</>}
          lede="The edge is not the pick. The edge is knowing what not to trust. Restraint is a decision this system makes on purpose, logged with reasons like any other."
          tone="deep"
        >
          <NoBetGateChapter />
        </WorldSection>

        {/* ── PROOF STRIP · one band, routes to the proof ─────────────── */}
        <section className="border-y border-orbital-cyan/20 bg-orbital-cyan/[0.04] px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
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
              <Link href="/proof" className="btn btn-primary whitespace-nowrap">
                See the sealed record
              </Link>
              <Link href="/engine" className="text-sm font-semibold text-orbital-cyan hover:text-ion-white">
                Watch it commit →
              </Link>
              <Link href="/verify" className="text-sm font-semibold text-orbital-cyan hover:text-ion-white">
                Check a receipt →
              </Link>
              <Link href="/clv" className="text-sm font-semibold text-orbital-cyan hover:text-ion-white">
                Closing line value →
              </Link>
              <Link href="/performance" className="text-sm font-semibold text-orbital-cyan hover:text-ion-white">
                Calibration →
              </Link>
            </div>
          </div>
        </section>

        <MethodologySection
          metrics={{ settled, cleared, gated, playerRows: nflRows }}
        />

        <section data-testid="homepage-responsible-close" className="gw-nebula px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl rounded-ds-lg border border-mineral bg-eclipse p-5 sm:p-7">
            <h2 className="text-2xl font-semibold text-ion-white">The math can point. The decision stays yours.</h2>
            <p className="mt-3 text-sm leading-6 text-ion-1">
              This product is research, not certainty. The upgrade path is more data, better receipts,
              and clearer uncertainty, not louder claims.
            </p>
            <RiskDisclosure variant="compact" includePastPerformance className="mt-5 text-ion-1" />
          </div>
        </section>
      </main>
      <ObservatoryBeacon />
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
