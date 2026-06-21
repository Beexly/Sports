import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { Reveal } from "@/components/motion/reveal";
import { InteractiveGalaxyLazy } from "@/components/hero/interactive-galaxy-lazy";
import { HumanPerformancePanel } from "@/components/human/human-performance-panel";
import { BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Human Performance — Confidence, Not Claims",
  description:
    "A confidence-band layer that turns public human-performance signals — venue surface, weather, official injury designations — into better questions about uncertainty. It never claims a player's body, never trusts a video-game number, and only ever widens the band or moves a read to watchlist / no-bet.",
  alternates: { canonical: "/human" },
};

const RULES: readonly string[] = [
  "Never claims a player's medical state — only \"availability uncertain per public report.\"",
  "Only ever WIDENS uncertainty or downgrades to watchlist / no-bet. Never manufactures confidence.",
  "Public data only: official injury designations, public weather, public venue facts.",
  "Video-game ratings are priors (weight-capped ≤ 5%), never truth.",
  "Every signal carries a provenance tier; nothing licensed/admin-only is shown publicly.",
];

export default function HumanPage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
      <Nav />
      <main id="main-content" className="flex-1">
        {/* Cinematic hero — house pattern (galaxy backdrop + scrim + staggered reveal) */}
        <section className="relative isolate overflow-hidden">
          <div aria-hidden="true" className="absolute inset-0 -z-20">
            <InteractiveGalaxyLazy />
          </div>
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{
              background: `linear-gradient(180deg, ${BRAND_COLORS.obsidianBlack}cc 0%, ${BRAND_COLORS.obsidianBlack}33 42%, ${BRAND_COLORS.obsidianBlack}66 74%, ${BRAND_COLORS.obsidianBlack} 100%)`,
            }}
          />
          <div className="mx-auto flex min-h-[72vh] max-w-6xl flex-col justify-center px-4 py-24 sm:px-6 lg:px-8">
            <Reveal>
              <p className="eyebrow" style={{ color: BRAND_COLORS.orbitalCyan }}>
                Human Performance · Black Label
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h1 className="mt-4 max-w-3xl font-display text-display-xl text-balance text-white">
                Confidence, not claims.
              </h1>
            </Reveal>
            <Reveal delay={180}>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-300">
                This layer makes the edge <em>more honest about uncertainty</em>, not more confident. It reads
                the venue&apos;s surface and roof, the game-day weather, and the official injury designation,
                and turns them into a band that can only widen — plus a clear verdict: play, watchlist, or
                no-bet. It never asserts a body and never trusts a video-game rating.
              </p>
            </Reveal>
            <Reveal delay={260}>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/fantasy/connect" className="btn btn-primary">
                  See it on your roster →
                </Link>
                <Link href="/data" className="btn btn-ghost">
                  How we source data
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-16 sm:px-6 lg:px-8">
          <Reveal>
            <section className="surface-card p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ion-2">The non-negotiables</p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {RULES.map((r) => (
                  <li key={r} className="flex gap-2 text-sm leading-6 text-ion-1">
                    <span className="text-orbital-cyan">▸</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </section>
          </Reveal>

          <Reveal delay={80}>
            <HumanPerformancePanel />
          </Reveal>
        </div>
      </main>
      <Footer />
    </div>
  );
}
