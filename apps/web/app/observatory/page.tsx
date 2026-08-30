import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { InteractiveGalaxyLazy } from "@/components/hero/interactive-galaxy-lazy";
import { GeneratedPlate } from "@/components/immersive/generated-plate";
import { SignalRoomAtmosphere } from "@/components/motion/signal-room-atmosphere";
import { getPlate } from "@/lib/visual-production/asset-manifest";
import { CipherShard } from "@/components/cipher/cipher-shard";
import { CipherConsoleMount } from "@/components/cipher/cipher-console-mount";
import { GalaxySlateTwinLazy } from "@/components/slate-twin/galaxy-slate-twin-lazy";
import { MarketFairBoard } from "@/components/observatory/market-fair-board";
import { LineShopBoard } from "@/components/observatory/line-shop-board";
import { SimulationCloud } from "@/components/observatory/simulation-cloud";
import { ScoringReliabilityPanel } from "@/components/observatory/scoring-reliability-panel";
import { loadPublicCalibrationReport } from "@/lib/calibration/report";
import { getSlateTwin } from "@/lib/slate-twin/get-slate-twin";
import { getViewerEntitlements } from "@/lib/pricing/tier-access";
import { BRAND_NAME, SURFACES } from "@/lib/brand";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edge Map — Observatory | Galaxy Sports Edge",
  description:
    "Sealed market intelligence surface: illustrative twin and market boards when odds exist; calibrated Edge Map after readiness. No invented sharp/public splits while the gate holds.",
  alternates: { canonical: "/observatory" },
};

/**
 * Observatory ("Edge Map") — readiness-sealed public surface.
 *
 * DOCTRINE: the live panel stays dark until there's enough settled history to
 * publish a calibrated read (readiness gate). Showing the seal is complete
 * product posture — not unfinished work. No fabricated numbers. Methodology
 * language only. Galaxy is aria-hidden and reduced-motion-aware.
 */

const PREVIEW: ReadonlyArray<{ readonly title: string; readonly body: string; readonly accent: string }> = [
  {
    title: "Line movement",
    body: "How each market drifts from open to close: the path of the price, not just the snapshot, so a late move doesn't slip past you.",
    accent: "var(--orbital-cyan)",
  },
  {
    title: "Sharp / public split",
    body: "Where money and tickets disagree. When the line moves against the crowd, that divergence is a signal worth reading.",
    accent: "var(--ultraviolet)",
  },
  {
    title: "Market depth",
    body: "How many books have a market and how tightly they agree: a transparency signal you can weigh for yourself.",
    accent: "var(--plasma)",
  },
];

export default async function ObservatoryPage() {
  // P7-12: resolve the viewer's entitlements server-side so getSlateTwin can
  // hard-filter premium picks from the data layer AND redact confidence/note
  // for non-pro viewers. Anonymous/failure → fail-closed FREE.
  const entitlements = await getViewerEntitlements();
  const [slate, calibration] = await Promise.all([getSlateTwin(entitlements), loadPublicCalibrationReport()]);
  const live = slate.live;
  const plate = getPlate("observatory-market-field");
  return (
    <div className="flex min-h-screen flex-col bg-obsidian">
      <Nav />
      <SignalRoomAtmosphere mode="ambient" />

      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section className="relative isolate overflow-hidden">
          {plate && (
            <GeneratedPlate
              className="-z-30 opacity-60"
              gradient={plate.gradient}
              still={plate.still}
              motion={plate.motion}
            />
          )}
          <div aria-hidden="true" className="absolute inset-0 -z-20">
            <InteractiveGalaxyLazy />
          </div>
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{
              background:
                "linear-gradient(180deg, rgba(5, 7, 11, 0.8) 0%, rgba(5, 7, 11, 0.2) 40%, rgba(5, 7, 11, 0.33) 72%, rgba(5, 7, 11, 1) 100%)",
            }}
          />
          <div className="mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-center px-4 py-24 sm:px-6 lg:px-8">
            <Reveal>
              <p className="eyebrow text-orbital-cyan">
                {SURFACES.observatory.label}
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h1 className="mt-4 max-w-3xl font-display text-display-xl text-balance text-ion-white">
                The market, visualized the way the model reads it.
              </h1>
            </Reveal>
            <Reveal delay={180}>
              <p className="mt-6 max-w-xl text-lg text-ion-1">
                {SURFACES.observatory.blurb} When the readiness gate opens, the Edge
                Map streams line movement, sharp/public splits, and market depth
                across every active matchup: the same view the engine reads from.
              </p>
            </Reveal>
            <Reveal delay={260}>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/methodology" className="btn btn-primary">
                  How it works →
                </Link>
                <Link href="/intelligence" className="btn btn-ghost">
                  Inside the signal
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* The Galaxy Slate Twin — the slate as a navigable universe */}
        <section className="px-4 py-12 sm:px-6 lg:px-8" aria-labelledby="twin-heading">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <p className={`eyebrow ${live ? "text-orbital-cyan" : "text-ultraviolet"}`}>
                {live ? "The slate as a universe · live" : "The slate as a universe · interactive preview"}
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h2 id="twin-heading" className="mt-3 font-display text-3xl text-ion-white sm:text-4xl">
                Don&apos;t take the pick. Enter the model.
              </h2>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-5 max-w-2xl text-ion-1">
                Every game is a star system. Brightness is signal density, the halo is
                volatility, the orbit wobble is contradiction, and the ring tracks
                confidence as you scrub the slate&apos;s timeline. Click a system to open
                its read.{" "}
                {live ? (
                  <>This is today&apos;s <strong className="text-ion">live slate</strong>: real
                  games and the metrics the engine produces; encodings without a wired data
                  source stay dark rather than guess.</>
                ) : (
                  <>This preview runs on <strong className="text-ion">illustrative data</strong>.
                  When the readiness gate opens, it streams the live slate.</>
                )}
              </p>
            </Reveal>
            <Reveal delay={200}>
              <dl className="mt-6 grid max-w-2xl grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                {[
                  { k: "Brightness", v: "how much signal a game has. Brighter means more for the model to read." },
                  { k: "Halo", v: "uncertainty. A wider halo means the read is shakier." },
                  { k: "Wobble", v: "disagreement. The model's own signals pull against each other." },
                  { k: "Ring", v: "our confidence in the read, firming up toward kickoff." },
                ].map(({ k, v }) => (
                  <div key={k} className="flex gap-2">
                    <dt className="shrink-0 font-semibold text-ion">{k}:</dt>
                    <dd className="text-ion-1">{v}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
            <Reveal delay={140} className="mt-8">
              <GalaxySlateTwinLazy slate={slate} />
            </Reveal>
          </div>
        </section>

        {/* What it will show */}
        <section className="px-4 py-10 sm:px-6 lg:px-8" aria-label="Market fair board">
          <div className="mx-auto max-w-5xl">
            <MarketFairBoard />
          </div>
        </section>

        <section className="px-4 py-10 sm:px-6 lg:px-8" aria-label="Line shop">
          <div className="mx-auto max-w-5xl">
            <LineShopBoard />
          </div>
        </section>

        <section className="px-4 py-10 sm:px-6 lg:px-8" aria-label="Simulation cloud">
          <div className="mx-auto max-w-5xl">
            <SimulationCloud />
          </div>
        </section>

        <section className="px-4 py-10 sm:px-6 lg:px-8" aria-label="Scoring reliability">
          <div className="mx-auto max-w-5xl">
            <ScoringReliabilityPanel report={calibration.data} gated={calibration.meta.gated} />
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8" aria-labelledby="preview-heading">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <h2 id="preview-heading" className="font-display text-3xl text-ion-white sm:text-4xl">
                What the Edge Map shows when it opens.
              </h2>
            </Reveal>
            <Stagger className="mt-12 grid gap-5 sm:grid-cols-3" step={100}>
              {PREVIEW.map((p) => (
                <div key={p.title} className="surface-card p-6">
                  <span aria-hidden="true" className="block h-1 w-10 rounded-full" style={{ backgroundColor: p.accent }} />
                  <h3 className="mt-4 text-lg font-semibold text-ion-white">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ion-1">{p.body}</p>
                </div>
              ))}
            </Stagger>
          </div>
        </section>

        {/* Readiness seal */}
        <section className="px-4 pb-24 pt-8 sm:px-6 lg:px-8">
          <Reveal>
            <div className="surface-card mx-auto flex max-w-3xl flex-col gap-3 p-8">
              <p className="eyebrow text-orbital-cyan">
                Status · Readiness sealed
              </p>
              <p className="text-base leading-relaxed text-ion-1">
                The Edge Map stays dark until {BRAND_NAME} has enough settled history
                to publish a calibrated live read. We would rather show you nothing
                than show you a number we can&apos;t yet stand behind. In the
                meantime, the methodology page explains exactly what feeds into it.
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                <Link href="/methodology" className="btn btn-primary">
                  Read the methodology
                </Link>
                <Link href="/picks" className="btn btn-ghost">
                  Today&apos;s board
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <Footer />
      {/* Glass Box Cipher — shard 03 hides here; console nudge */}
      <CipherShard page="observatory" />
      <CipherConsoleMount />
    </div>
  );
}
