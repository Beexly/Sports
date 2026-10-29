import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { LIVE_PACKAGE_CATALOG } from "@/lib/packages/catalog";

export const metadata: Metadata = {
  title: "Pricing & Betting Packs | Galaxy Sports Edge",
  description:
    "Monthly subscription plans are currently under construction. Grab individual NFL Betting Packs or open the DFS Optimizer today with zero subscription.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage(): JSX.Element {
  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-white">
      <Nav />
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="rounded-2xl border-2 border-amber-400/50 bg-slate-900 p-8 sm:p-12 text-center shadow-2xl">
          <span className="inline-block rounded-md bg-amber-500/20 border border-amber-400 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-amber-300">
            🚧 Monthly Subscriptions Under Construction
          </span>
          <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            No Monthly Subscription Needed Right Now
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-slate-200">
            Our monthly membership tiers are currently under construction while we focus 100% on{" "}
            <strong className="text-white">this week&apos;s NFL Betting Packs</strong> and our{" "}
            <strong className="text-white">Daily Fantasy (DFS) Lineup Optimizer</strong>. You can grab any individual
            game pack below with a simple one-time checkout.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/packages"
              className="rounded-xl bg-amber-500 hover:bg-amber-400 px-7 py-4 text-base font-extrabold text-slate-950 shadow-lg transition-colors"
            >
              View This Week&apos;s NFL Betting Packs →
            </Link>
            <Link
              href="/fantasy/dfs"
              className="rounded-xl border-2 border-slate-700 bg-slate-800 hover:border-amber-400 px-7 py-4 text-base font-bold text-white transition-colors"
            >
              Open DFS Lineup Optimizer →
            </Link>
          </div>
        </div>

        <section className="mt-12">
          <h2 className="text-2xl font-bold text-white text-center">
            Available Pay-Per-Slate NFL Packs (One-Time Purchase)
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {LIVE_PACKAGE_CATALOG.map((pkg) => (
              <div
                key={pkg.slug}
                className="flex flex-col justify-between rounded-xl border-2 border-slate-800 bg-slate-900 p-6 shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-300">
                      {pkg.badge || pkg.windowSlot}
                    </span>
                    <span className="text-2xl font-extrabold text-amber-400">
                      ${(pkg.standardPriceCents / 100).toFixed(0)}
                    </span>
                  </div>
                  <h3 className="mt-3 text-xl font-bold text-white">{pkg.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-200">{pkg.description}</p>
                </div>
                <Link
                  href={`/packages#${pkg.slug}`}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-amber-500 hover:bg-amber-400 px-4 py-3 text-sm font-bold text-slate-950 transition-colors"
                >
                  Open Pack (${(pkg.standardPriceCents / 100).toFixed(0)}) →
                </Link>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
