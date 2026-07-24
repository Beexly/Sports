import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal } from "@/components/motion/reveal";
import { Atmosphere } from "@/components/ui/atmosphere";
import { GeneratedPlate } from "@/components/immersive/generated-plate";
import { getPlate } from "@/lib/visual-production/asset-manifest";
import { ParlayGenome } from "@/components/parlay/parlay-genome";
import { getViewerEntitlements } from "@/lib/pricing/tier-access";
import { TierGatePanel } from "@/components/pricing/tier-gate-panel";

export const metadata: Metadata = {
  title: "Parlay MRI: The Portfolio Surgeon",
  description:
    "See a parlay's genome: per-leg risk, survivability, expected value, the compounded house edge, and hidden same-game correlation. Toggle legs and watch the math move. Risk made legible.",
  alternates: { canonical: "/parlay-mri" },
};

export default async function ParlayMriPage() {
  const viewer = await getViewerEntitlements();
  const plate = getPlate("no-bet-stillness");
  if (!viewer.canUseParlayMri) {
    return (
      <div className="flex min-h-screen flex-col bg-obsidian">
        <Atmosphere />
        <Nav />
        <main id="main-content" className="flex flex-1 flex-col items-center justify-center gap-10 px-4 py-28 sm:px-6">
          <div className="text-center">
            <p className="eyebrow justify-center">Parlay MRI</p>
            <h1 className="mt-4 max-w-3xl text-balance font-display text-4xl leading-[1.02] tracking-tight text-ion-white sm:text-6xl">
              Stacked risk, made <span className="gse-editorial text-[1.08em]">visible</span>.
            </h1>
          </div>
          <TierGatePanel
            need="PRO"
            surface="The Parlay MRI"
            blurb="Per-leg survivability, compounded house edge, hidden same-game correlation: the full genome of any parlay, with legs you can toggle live. This is the portfolio surgeon, and it operates for Pro members."
          />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-obsidian">
      <Atmosphere />
      <Nav />

      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section className="relative isolate overflow-hidden px-4 pb-8 pt-24 sm:px-6 lg:px-8">
          {plate && (
            <GeneratedPlate className="-z-10 opacity-20" gradient={plate.gradient} still={plate.still} motion={plate.motion} />
          )}
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow inline-flex items-center gap-2">
                <span className="live-dot" />
                Risk, made legible
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h1 className="mt-5 text-balance font-display text-5xl leading-none tracking-tight text-ion-white sm:text-6xl lg:text-7xl">
                Parlay <span className="gse-editorial text-[1.1em] text-soft-ultraviolet">MRI</span>
              </h1>
            </Reveal>
            <Reveal delay={170}>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ion-1">
                Most apps sell you the payout. We show you the genome. Every leg carries risk;
                the ticket as a whole has vitals you can read: survivability, expected value,
                the house edge compounding across legs, and the same-game correlation the book
                already priced. Operate on it and watch the math move.
              </p>
            </Reveal>
          </div>
        </section>

        {/* The tool */}
        <section className="px-4 pb-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <div className="surface-card p-5 sm:p-7">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-2xl text-ion-white">The Portfolio Surgeon</h2>
                  <span className="rounded-full border border-mineral px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ion-1">
                    Illustrative legs · transparent math
                  </span>
                </div>
                <ParlayGenome />
              </div>
            </Reveal>
          </div>
        </section>

        {/* Doctrine / responsible-play note */}
        <section className="px-4 pb-24 pt-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mx-auto max-w-3xl rounded-2xl border border-mineral bg-eclipse/60 p-8 text-center">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-orbital-cyan">
                Why we built this
              </p>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-ion-1">
                The whole industry hypes the longshot ticket. We&apos;d rather make its fragility
                legible. This tool runs on illustrative legs and transparent math you can check.
                Its job is to teach how parlay structure changes the odds, so the smartest move is
                often the one you don&apos;t make.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link href="/responsible-play" className="btn btn-primary">
                  Play responsibly
                </Link>
                <Link href="/intelligence" className="btn btn-ghost">
                  Inside the engine
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <Footer />
    </div>
  );
}
