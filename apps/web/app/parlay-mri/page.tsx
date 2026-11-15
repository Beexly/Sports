import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { isPagePublic } from "@/lib/launch/internal-surface-fence";
import { Reveal } from "@/components/motion/reveal";
import { Atmosphere } from "@/components/ui/atmosphere";
import { GeneratedPlate } from "@/components/immersive/generated-plate";
import { getPlate } from "@/lib/visual-production/asset-manifest";
import { ParlayGenome } from "@/components/parlay/parlay-genome";
import { ParlayXRay } from "@/components/parlay/parlay-xray";
import { getViewerEntitlements } from "@/lib/pricing/tier-access";
import { TierGatePanel } from "@/components/pricing/tier-gate-panel";

export const metadata: Metadata = {
  title: "Parlay MRI: Free Same-Game Parlay X-Ray",
  description:
    "Books hide extra margin in same-game parlays by pricing legs like separate coin flips. X-Ray your ticket: its real chance, the price's implied chance, and the hidden hold between them. One free scan, no account.",
  alternates: { canonical: "/parlay-mri" },
};

export default async function ParlayMriPage() {
  // Launch doctrine (2026-11-13): the free X-Ray is PUBLIC — one scan for
  // every anonymous visitor, then email capture unlocks 3 more, then Pro.
  // The internal-surface fence now governs only the PRO genome section
  // below (per-leg risk internals stay gated); the free tool renders for
  // everyone. The fence itself is unchanged for every other surface.
  const genomeSurfacePublic = isPagePublic("/parlay-mri");
  const viewer = await getViewerEntitlements();
  const showGenome = genomeSurfacePublic && viewer.canUseParlayMri;
  const plate = getPlate("no-bet-stillness");

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
                The hidden hold, made visible
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h1 className="mt-5 text-balance font-display text-5xl leading-none tracking-tight text-ion-white sm:text-6xl lg:text-7xl">
                Parlay <span className="gse-editorial text-[1.1em] text-soft-ultraviolet">MRI</span>
              </h1>
            </Reveal>
            <Reveal delay={170}>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ion-1">
                Books typically hide 15-30% extra margin in same-game parlays. They price each
                leg like a separate coin flip, but real legs move together: your quarterback
                and his receivers rise and fall on the same drives. X-Ray your ticket to see
                its real chance, the chance the book&apos;s price implies, and the gap between
                them. One free scan, no account needed.
              </p>
            </Reveal>
          </div>
        </section>

        {/* The free public X-Ray */}
        <section className="px-4 pb-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <div className="surface-card p-5 sm:p-7">
                <ParlayXRay />
              </div>
            </Reveal>
          </div>
        </section>

        {/* PRO genome — still behind the fence + entitlement gate */}
        <section className="px-4 pb-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              {showGenome ? (
                <div className="surface-card p-5 sm:p-7">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-display text-2xl text-ion-white">The Portfolio Surgeon</h2>
                    <span className="rounded-full border border-mineral px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ion-1">
                      Illustrative legs · transparent math
                    </span>
                  </div>
                  <ParlayGenome />
                </div>
              ) : (
                <TierGatePanel
                  need="PRO"
                  surface="The Parlay MRI"
                  blurb="Per-leg survivability, compounded house edge, hidden same-game correlation: the full genome of any parlay, with legs you can toggle live. This is the portfolio surgeon, and it operates for Pro members."
                />
              )}
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
                legible. The X-Ray runs on the odds you enter and transparent math you can
                check; the genome below it runs on illustrative legs. Their job is to teach how
                parlay structure changes the odds, so the smartest move is often the one you
                don&apos;t make.
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