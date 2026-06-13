import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal } from "@/components/motion/reveal";
import { Atmosphere } from "@/components/ui/atmosphere";
import { GeneratedPlate } from "@/components/immersive/generated-plate";
import { PersonalizedBriefing } from "@/components/cockpit/personalized-briefing";
import { buildBriefing } from "@/lib/cockpit/mission-control";
import { BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Mission Control — What Matters Now",
  description:
    "One glance across the whole platform: breaking news, the scheme move re-pricing an offense, your roster's risk, the sharpest DFS and pick'em edges, and your CLV discipline — prioritized and actionable.",
  alternates: { canonical: "/today" },
};

export default function TodayPage() {
  const cards = buildBriefing();
  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
      <Atmosphere />
      <Nav />
      <main id="main-content" className="flex-1">
        <section className="relative isolate overflow-hidden px-4 pb-8 pt-24 sm:px-6 lg:px-8">
          <GeneratedPlate assetId="today-mission" className="-z-20 opacity-60" />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80" style={{ background: `radial-gradient(60% 80% at 50% 0%, ${BRAND_COLORS.orbitalCyan}18, transparent 70%), radial-gradient(40% 60% at 76% 6%, ${BRAND_COLORS.ionMagenta}10, transparent 70%)` }} />
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <p className="eyebrow inline-flex items-center gap-2" style={{ color: BRAND_COLORS.orbitalCyan }}><span className="live-dot" /> Mission Control</p>
            </Reveal>
            <Reveal delay={90}>
              <h1 className="mt-5 max-w-3xl font-display text-balance text-white" style={{ fontSize: "clamp(2.4rem, 7vw, 5rem)", lineHeight: 0.98, letterSpacing: "-0.02em" }}>
                What matters <span className="gse-editorial" style={{ fontSize: "1.08em" }}>now</span>.
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-5 max-w-2xl text-lg text-ink-300">
                The whole platform, prioritized into one glance — across betting and fantasy. The engine ranks what
                deserves your attention this minute and links you straight to the move.
              </p>
            </Reveal>
          </div>
        </section>
        <section className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Reveal><PersonalizedBriefing cards={cards} /></Reveal>
            <Reveal delay={120}>
              <p className="mt-8 text-xs leading-relaxed text-ink-500">
                Illustrative briefing composed live from the platform&apos;s engines. Priorities are computed from real
                signals (news urgency, source reliability, leverage, roster risk); the underlying data is illustrative.
              </p>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
