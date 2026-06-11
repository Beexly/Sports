import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal } from "@/components/motion/reveal";
import { Atmosphere } from "@/components/ui/atmosphere";
import { BetTracker } from "@/components/tracker/bet-tracker";
import { StakingCalculator } from "@/components/tracker/staking-calculator";
import { BRAND_COLORS } from "@/lib/brand";
import { getViewerEntitlements } from "@/lib/pricing/tier-access";
import { TierGatePanel } from "@/components/pricing/tier-gate-panel";

export const metadata: Metadata = {
  title: "CLV Tracker — Your Glass-Box Bet Ledger",
  description:
    "Log your bets, settle them with the closing line, and track the metric that actually predicts edge: Closing Line Value — plus ROI and calibration. Stored locally; nothing leaves your device.",
  alternates: { canonical: "/track" },
};

export default async function TrackPage() {
  const viewer = await getViewerEntitlements();
  if (!viewer.canUseClvLedger) {
    return (
      <div className="flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
        <Atmosphere />
        <Nav />
        <main className="flex flex-1 flex-col items-center justify-center gap-10 px-4 py-28 sm:px-6">
          <div className="text-center">
            <p className="eyebrow justify-center" style={{ color: BRAND_COLORS.softUltraviolet }}>
              CLV Tracker
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-balance text-white" style={{ fontSize: "clamp(2.2rem, 6vw, 4rem)", lineHeight: 1 }}>
              Track the number, not the <span className="gse-editorial" style={{ fontSize: "1.08em" }}>noise</span>.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-ink-300">
              Closing Line Value is the strongest public proof of edge there is.
            </p>
          </div>
          <TierGatePanel
            need="ELITE"
            surface="The CLV Ledger + Staking Toolkit"
            blurb="The glass-box bet ledger, closing-line settlement, ROI and calibration readouts, and the Kelly-aware staking calculator — the professional toolkit, reserved for Elite members."
          />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
      <Atmosphere />
      <Nav />
      <main id="main-content" className="flex-1">
        <section className="relative isolate overflow-hidden px-4 pb-8 pt-24 sm:px-6 lg:px-8">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80" style={{ background: `radial-gradient(55% 80% at 50% 0%, ${BRAND_COLORS.softUltraviolet}16, transparent 70%)` }} />
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow inline-flex items-center gap-2" style={{ color: BRAND_COLORS.softUltraviolet }}><span className="live-dot" /> CLV Tracker</p>
            </Reveal>
            <Reveal delay={90}>
              <h1 className="mt-5 max-w-3xl font-display text-balance text-white" style={{ fontSize: "clamp(2.4rem, 7vw, 5rem)", lineHeight: 0.98, letterSpacing: "-0.02em" }}>
                Track the number, not the <span className="gse-editorial" style={{ fontSize: "1.08em" }}>noise</span>.
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-5 max-w-2xl text-lg text-ink-300">
                Your record is mostly variance over any human-sized sample. Closing Line Value isn't — beating the
                close consistently is the strongest public proof you have an edge. Log your bets, settle them with the
                closing price, and watch your real scoreboard. It lives in your browser; nothing leaves your device.
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
