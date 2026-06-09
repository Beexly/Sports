import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { IntelligenceSubnav } from "@/components/intelligence/intelligence-subnav";
import { Footer } from "@/components/ui/footer";
import { Reveal } from "@/components/motion/reveal";
import { Atmosphere } from "@/components/ui/atmosphere";
import { BetTracker } from "@/components/tracker/bet-tracker";
import { StakingCalculator } from "@/components/tracker/staking-calculator";
import { BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "CLV Tracker — Track Your Closing Line Value",
  description:
    "Closing Line Value is the strongest proof of a real edge. Log your bets, settle them against the closing price, and track the stat that actually matters. Stored locally; nothing leaves your device.",
  alternates: { canonical: "/intelligence/track" },
};

export default function TrackPage() {
  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
      <Atmosphere />
      <Nav />
      <IntelligenceSubnav />
      <main id="main-content" className="flex-1">
        <section className="relative isolate overflow-hidden px-4 pb-8 pt-12 sm:px-6 sm:pt-16 lg:px-8">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80" style={{ background: `radial-gradient(55% 80% at 50% 0%, ${BRAND_COLORS.softUltraviolet}16, transparent 70%)` }} />
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow inline-flex items-center gap-2" style={{ color: BRAND_COLORS.softUltraviolet }}><span className="live-dot" /> CLV Tracker</p>
            </Reveal>
            <Reveal delay={90}>
              <h1 className="mt-5 max-w-3xl font-display text-balance text-white" style={{ fontSize: "clamp(2.4rem, 7vw, 5rem)", lineHeight: 0.98, letterSpacing: "-0.02em" }}>
                Closing Line Value is the only stat that proves you have an <span className="gse-editorial" style={{ fontSize: "1.08em" }}>edge</span>.
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-5 max-w-2xl text-lg text-ink-300">
                Wins and losses over a short sample are mostly variance. Beating the close consistently is different —
                it is the strongest public signal that you are finding real edges. Log your bets, settle them with the
                closing price, and watch the stat that actually matters. Stored in your browser; nothing leaves your device.
              </p>
            </Reveal>
          </div>
        </section>
        <section className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl space-y-8">
            <BetTracker />
            <StakingCalculator />
            <Reveal delay={120}>
              <p className="mt-8 text-xs leading-relaxed text-ink-500">
                A personal record keeper — no books, no money, no advice. CLV is computed from the closing odds you
                enter for each exact selection. Learn the why in the <a href="/fantasy/academy" style={{ color: BRAND_COLORS.softUltraviolet }}>Academy&apos;s Market track</a>.
              </p>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
