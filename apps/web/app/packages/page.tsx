import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { LIVE_PACKAGE_CATALOG, type PickPackageOffering } from "@/lib/packages/catalog";
import { LIVE_SLATE_COACH_WRITEUPS } from "@/lib/writeups/coach-writeup-engine";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pick Packages & Slate Dossiers | Galaxy Sports Edge",
  description:
    "A-la-carte game packages, high-conviction cards, and DFS blueprints. Calibrated tactical writeups with instant Telegram delivery.",
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
                Storefront · A-La-Carte Pick Packages
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
                  <span className="text-[10px] font-mono text-ion-2">{writeup.paceOfPlay.neutralSecPerSnap}s / snap</span>
                </div>
                <h3 className="mt-1 text-sm font-medium text-ion-white">{writeup.matchup}</h3>
                <p className="mt-2 text-xs text-ion-1 line-clamp-2">
                  {writeup.schemeMatchup.coverageShell}
                </p>
                <div className="mt-3 flex items-center justify-between text-[11px] border-t border-mineral/30 pt-2 text-ion-2">
                  <span>Pass EPA: {writeup.paceOfPlay.passEpaPlay > 0 ? `+${writeup.paceOfPlay.passEpaPlay}` : writeup.paceOfPlay.passEpaPlay}</span>
                  <span className="text-plasma">Edge Unlocked in Pack →</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Storefront Bricks Grid */}
        <section className="mt-10">
          <h2 className="text-xl font-display font-semibold text-ion-white">
            Available Slate Cards & Passes
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {LIVE_PACKAGE_CATALOG.map((pkg) => {
              const standardPrice = (pkg.standardPriceCents / 100).toFixed(2);
              const guaranteedPrice = pkg.guaranteedPriceCents
                ? (pkg.guaranteedPriceCents / 100).toFixed(2)
                : null;

              return (
                <div
                  key={pkg.slug}
                  className="flex flex-col justify-between border border-mineral bg-eclipse p-6 transition-colors hover:border-mineral-hover"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      {pkg.badge && (
                        <span className="border border-plasma/30 bg-plasma/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-plasma">
                          {pkg.badge}
                        </span>
                      )}
                      <span className="text-xs font-mono text-ion-2">
                        {pkg.gamesCount} {pkg.gamesCount === 1 ? "Game" : "Games"}
                      </span>
                    </div>

                    <h3 className="mt-3 text-lg font-semibold text-ion-white">
                      {pkg.title}
                    </h3>
                    <p className="mt-1 text-xs font-mono text-plasma">
                      {pkg.subtitle}
                    </p>
                    <p className="mt-3 text-sm text-ion-1">
                      {pkg.description}
                    </p>

                    <div className="mt-5 space-y-2 border-t border-mineral/40 pt-4">
                      {pkg.highlights.map((highlight, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-ion-1">
                          <span className="text-plasma">✓</span>
                          <span>{highlight}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 border-t border-mineral/50 pt-5">
                    {/* Pricing Display */}
                    <div className="mb-4">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-ion-2">Standard Price:</span>
                        <span className="font-display text-2xl font-bold text-ion-white">
                          ${standardPrice}
                        </span>
                      </div>
                      {guaranteedPrice && (
                        <div className="mt-1 flex items-baseline justify-between text-xs text-ion-1">
                          <span>Guaranteed Credit-Back:</span>
                          <span className="font-mono text-plasma font-semibold">
                            ${guaranteedPrice}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <Link
                        href={`/packages/${pkg.slug}`}
                        className="btn-primary block w-full text-center py-2.5 text-sm font-semibold"
                      >
                        View Slate & Buy (${standardPrice})
                      </Link>

                      {guaranteedPrice && (
                        <Link
                          href={`/packages/${pkg.slug}?guaranteed=1`}
                          className="block w-full border border-plasma/40 bg-plasma/5 py-2 text-center text-xs font-semibold text-plasma hover:bg-plasma/10 transition-colors"
                        >
                          Buy with Credit-Back Guarantee (${guaranteedPrice})
                        </Link>
                      )}

                      <div className="flex items-center justify-between pt-2 text-[11px] text-ion-2">
                        <span>Instant Stripe Checkout</span>
                        <span className="text-ion-1">Telegram Delivery</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
