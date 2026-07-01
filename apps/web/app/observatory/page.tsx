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
import { BRAND_NAME, SURFACES } from "@/lib/brand";
import { BRAND_COLORS } from "@/lib/brand";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edge Map — Live Market Intelligence by Sport, Slate, Matchup",
  description:
    "Real-time line movement, sharp/public splits, and market depth across every active matchup. The same view the model is reading from. Opens after the readiness gate clears.",
  alternates: { canonical: "/observatory" },
};

/**
 * Observatory ("Edge Map") — cinematic pre-launch surface.
 *
 * DOCTRINE: the live panel stays dark until there's enough settled history to
 * publish a calibrated read (readiness gate). This page does NOT show live or
 * fabricated numbers — it explains, beautifully, what the surface will be, in
 * methodology language, with no banned phrasing. The galaxy is aria-hidden and
 * reduced-motion-aware; a scrim guarantees text contrast.
 */

const PREVIEW: ReadonlyArray<{ readonly title: string; readonly body: string; readonly accent: string }> = [
  {
    title: "Line movement",
    body: "How each market drifts from open to close — the path of the price, not just the snapshot, so a late move doesn't slip past you.",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    title: "Sharp / public split",
    body: "Where money and tickets disagree. When the line moves against the crowd, that divergence is a signal worth reading.",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    title: "Market depth",
    body: "How many books have a market and how tightly they agree — a transparency signal you can weigh for yourself.",
    accent: BRAND_COLORS.ionMagenta,
  },
];

export default async function ObservatoryPage() {
  const [slate, calibration] = await Promise.all([getSlateTwin(), loadPublicCalibrationReport()]);
  const live = slate.live;
  const plate = getPlate("observatory-market-field");
  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
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
              background: `linear-gradient(180deg, ${BRAND_COLORS.obsidianBlack}cc 0%, ${BRAND_COLORS.obsidianBlack}33 40%, ${BRAND_COLORS.obsidianBlack}55 72%, ${BRAND_COLORS.obsidianBlack} 100%)`,
            }}
          />
          <div className="mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-center px-4 py-24 sm:px-6 lg:px-8">
            <Reveal>
              <p className="eyebrow" style={{ color: BRAND_COLORS.orbitalCyan }}>
                {SURFACES.observatory.label}
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h1 className="mt-4 max-w-3xl font-display text-display-xl text-balance text-white">
                The market, visualized — the way the model reads it.
              </h1>
            </Reveal>
            <Reveal delay={180}>
              <p className="mt-6 max-w-xl text-lg text-ink-300">
                {SURFACES.observatory.blurb} When the readiness gate opens, the Edge
                Map streams line movement, sharp/public splits, and market depth
                across every active matchup — the same view the engine reads from.
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
              <p className="eyebrow" style={{ color: live ? BRAND_COLORS.orbitalCyan : BRAND_COLORS.softUltraviolet }}>
                {live ? "The slate as a universe · live" : "The slate as a universe · interactive preview"}
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h2 id="twin-heading" className="mt-3 font-display text-3xl text-white sm:text-4xl">
                Don&apos;t take the pick. Enter the model.
              </h2>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-5 max-w-2xl text-ink-300">
                Every game is a star system. Brightness is signal density, the halo is
                volatility, the orbit wobble is contradiction, and the ring tracks
                confidence as you scrub the slate&apos;s timeline. Click a system to open
                its read.{" "}
                {live ? (
                  <>This is today&apos;s <strong className="text-ink-200">live slate</strong> — real
                  games and the metrics the engine produces; encodings without a wired data
                  source stay dark rather than guess.</>
                ) : (
                  <>This preview runs on <strong className="text-ink-200">illustrative data</strong> —
                  when the readiness gate opens, it streams the live slate.</>
                )}
              </p>
            </Reveal>
            <Reveal delay={200}>
              <dl className="mt-6 grid max-w-2xl grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                {[
                  { k: "Brightness", v: "how much signal a game has — brighter means more for the model to read." },
                  { k: "Halo", v: "uncertainty — a wider halo means the read is shakier." },
                  { k: "Wobble", v: "disagreement — the model's own signals pull against each other." },
                  { k: "Ring", v: "our confidence in the read, firming up toward kickoff." },
                ].map(({ k, v }) => (
                  <div key={k} className="flex gap-2">
                    <dt className="shrink-0 font-semibold text-ink-200">{k}:</dt>
                    <dd className="text-ink-300">{v}</dd>
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
              <h2 id="preview-heading" className="font-display text-3xl text-white sm:text-4xl">
                What the Edge Map shows when it opens.
              </h2>
            </Reveal>
            <Stagger className="mt-12 grid gap-5 sm:grid-cols-3" step={100}>
              {PREVIEW.map((p) => (
                <div key={p.title} className="surface-card p-6">
                  <span aria-hidden="true" className="block h-1 w-10 rounded-full" style={{ backgroundColor: p.accent }} />
                  <h3 className="mt-4 text-lg font-semibold text-white">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-300">{p.body}</p>
                </div>
              ))}
            </Stagger>
          </div>
        </section>

        {/* Pre-launch status */}
        <section className="px-4 pb-24 pt-8 sm:px-6 lg:px-8">
          <Reveal>
            <div className="surface-card mx-auto flex max-w-3xl flex-col gap-3 p-8">
              <p className="eyebrow" style={{ color: BRAND_COLORS.orbitalCyan }}>
                Status · Pre-launch
              </p>
              <p className="text-base leading-relaxed text-ink-300">
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
