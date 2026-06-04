import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal } from "@/components/motion/reveal";
import { Atmosphere } from "@/components/ui/atmosphere";
import { TheBeat } from "@/components/news/the-beat";
import { NATIONAL_INSIDERS, TEAM_BEATS, WIRE_DISCLAIMER } from "@/lib/news/wire";
import { BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "The Beat — Reliability-Tiered Sports Newsroom",
  description:
    "Not a timeline. Every breaking report scored the instant it lands: how reliable the source is, which players and lines it moves, by how much, and the move to make — before the market prices it in.",
  alternates: { canonical: "/the-beat" },
};

export default function TheBeatPage() {
  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
      <Atmosphere />
      <Nav />

      <main id="main-content" className="flex-1">
        <section className="relative isolate overflow-hidden px-4 pb-8 pt-24 sm:px-6 lg:px-8">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80"
            style={{ background: `radial-gradient(55% 80% at 50% 0%, ${BRAND_COLORS.orbitalCyan}16, transparent 70%)` }} />
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow inline-flex items-center gap-2" style={{ color: BRAND_COLORS.orbitalCyan }}>
                <span className="live-dot" /> The Beat
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h1 className="mt-5 max-w-3xl font-display text-balance text-white" style={{ fontSize: "clamp(2.4rem, 7vw, 5rem)", lineHeight: 0.98, letterSpacing: "-0.02em" }}>
                Breaking news, <span className="gse-editorial" style={{ fontSize: "1.08em" }}>scored</span>.
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-5 max-w-2xl text-lg text-ink-300">
                Everyone aggregates the beat writers. We do the part that matters: the instant a report
                lands, we weigh the source by tier, map it to the players and lines it moves, decay it by
                freshness, and tell you the move — before it's priced in.
              </p>
            </Reveal>
          </div>
        </section>

        {/* coverage seed */}
        <section className="px-4 pb-6 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-3">
            <div className="surface-card p-4">
              <p className="font-display text-2xl text-white">{NATIONAL_INSIDERS.length}</p>
              <p className="text-xs text-ink-500">National insiders seeded — real, public, top-tier reporters.</p>
            </div>
            <div className="surface-card p-4">
              <p className="font-display text-2xl text-white">{TEAM_BEATS.length}</p>
              <p className="text-xs text-ink-500">Team beat desks — slots that fill from licensed & official feeds.</p>
            </div>
            <div className="surface-card p-4">
              <p className="font-display text-2xl text-white">5</p>
              <p className="text-xs text-ink-500">Reliability tiers — from in-the-building beat to unconfirmed rumor.</p>
            </div>
          </div>
        </section>

        <section className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <TheBeat />
            <Reveal delay={120}>
              <p className="mt-6 text-xs leading-relaxed text-ink-500">{WIRE_DISCLAIMER}</p>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
