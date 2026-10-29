import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { LIVE_PACKAGE_CATALOG } from "@/lib/packages/catalog";
import {
  LIVE_SLATE_COACH_WRITEUPS,
  getRedactedTeasersForWindowSlot,
} from "@/lib/writeups/coach-writeup-engine";
import { PaywallRevealCard } from "@/components/packages/paywall-reveal-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pick Packages & Slate Dossiers | Galaxy Sports Edge",
  description:
    "Galaxy Picks. Calibrated writeups with instant Telegram delivery.",
};

export default function PackagesPage(): JSX.Element {
  return (
    <div className="relative min-h-screen w-full bg-carbon text-ion">
      <Nav />
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header Hero */}
        <div className="border-b border-mineral pb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-plasma">
                Storefront · Galaxy Picks
              </p>
              <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ion-white sm:text-5xl">
                Slate Packages & Coach Breakdowns
              </h1>
              <p className="mt-3 max-w-2xl text-base text-ion-1">
                Zero subscription required. Buy individual slates with instant Stripe checkout,
                tamper-evident receipts, and automated VIP Telegram delivery.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 border border-mineral bg-eclipse px-3 py-1.5 text-xs font-mono text-ion-1">
                <span className="h-2 w-2 rounded-full bg-plasma animate-pulse" />
                Telegram VIP Bot Active
              </span>
              <span className="inline-flex items-center gap-2 border border-mineral bg-eclipse px-3 py-1.5 text-xs font-mono text-ion-1">
                Whop Pass Enabled
              </span>
            </div>
          </div>
        </div>

        {/* Free Pace-of-Play Teasers Strip */}
        <section className="mt-8 border border-mineral bg-eclipse p-5">
          <div className="flex items-center justify-between border-b border-mineral/50 pb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ion-white">
              Free Slate Pace-of-Play & Tactical Teaser
            </h2>
            <span className="text-xs font-mono text-plasma">T-48h Live Feed</span>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LIVE_SLATE_COACH_WRITEUPS.slice(0, 4).map((writeup) => (
              <div key={writeup.id} className="border border-mineral/40 bg-carbon/60 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-plasma">{writeup.windowSlot}</span>
                  <span className="text-[10px] font-mono text-ion-2">
                    {(writeup.paceOfPlay.noHuddleRate * 100).toFixed(1)}% no-huddle
                  </span>
                </div>
                <h3 className="mt-1 text-sm font-medium text-ion-white">{writeup.matchup}</h3>
                <p className="mt-2 text-xs text-ion-1 line-clamp-2">
                  {writeup.schemeMatchup.coverageShell}
                </p>
                <div className="mt-3 flex items-center justify-between text-[11px] border-t border-mineral/30 pt-2 text-ion-2">
                  <span>{writeup.paceOfPlay.neutralSecPerSnap}s / snap</span>
                  <span className="text-plasma">
                    🔒 {writeup.sideTotalCall.sideConfidence} Side + {writeup.topProps.length} Props
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Galaxy Picks paywall cards */}
        <section className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-display font-semibold text-ion-white">
              Available Slate Cards &amp; In-Place Paywall Vaults
            </h2>
            <span className="font-mono text-xs text-plasma">
              🔒 Zero DOM Leak · Instant In-Place Reveal on Payment or Receipt Key
            </span>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {LIVE_PACKAGE_CATALOG.map((pkg) => (
              <PaywallRevealCard
                key={pkg.slug}
                pkg={pkg}
                teasers={getRedactedTeasersForWindowSlot(pkg.windowSlot)}
              />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
