import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import {
  LIVE_PACKAGE_CATALOG,
  WEEK8_GAME_DAY_CATALOG_METADATA,
  type PickPackageOffering,
} from "@/lib/packages/catalog";
import { WEEK9_SUNDAY_SETTLED_PROOF_SUMMARY } from "@/lib/engine/engine-live-bridge";
import { sanitizePlainFootballText } from "@/lib/writeups/coach-writeup-engine";

export const metadata: Metadata = {
  title: { absolute: "Pricing & Plans | Galaxy Sports Edge" },
  description:
    "No monthly subscription needed right now. One-time Week 9 NFL packs: Player Props & SGPs ($29), Sunday & MNF Best Bets ($39), RedZone Standalone DFS ($39.99), and All-Access Bundle ($49). Backed by our documented 47-19-1 (71.2% · +24.92u (with gated props)) official NFL record.",
  alternates: { canonical: "/pricing" },
};

function formatPackPrice(pkg: PickPackageOffering): string {
  const dollars = pkg.standardPriceCents / 100;
  return pkg.standardPriceCents % 100 === 0
    ? `$${dollars.toFixed(0)}`
    : `$${dollars.toFixed(2)}`;
}

export default async function PricingPage(): Promise<JSX.Element> {
  return (
    <div className="relative min-h-screen w-full bg-[#08090C] text-[#EDE8E0]">
      <Nav />
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF4D2E]">
            Official Settled NFL Record: {WEEK8_GAME_DAY_CATALOG_METADATA.seasonLedgerOfRecord.verifiedRecord} (
            {WEEK8_GAME_DAY_CATALOG_METADATA.seasonLedgerOfRecord.verifiedWinPct} ·{" "}
            {WEEK8_GAME_DAY_CATALOG_METADATA.seasonLedgerOfRecord.verifiedUnits}; all-in secondary{" "}
            {WEEK8_GAME_DAY_CATALOG_METADATA.seasonLedgerOfRecord.withGatedPropsRecord} (
            {WEEK8_GAME_DAY_CATALOG_METADATA.seasonLedgerOfRecord.withGatedPropsUnits})) · Week 9 Sunday:{" "}
            {WEEK9_SUNDAY_SETTLED_PROOF_SUMMARY.sundayOfficialPlayRecord} (
            {WEEK9_SUNDAY_SETTLED_PROOF_SUMMARY.sundayNetUnits})
          </p>
          <h1 className="mt-3 font-display text-4xl uppercase tracking-tight text-white sm:text-6xl">
            No Monthly Subscription Needed Right Now
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-[#C4BFB6] sm:text-lg">
            Monthly recurring plans are currently under construction while we operate our live pay-per-slate
            storefront. Every pack below is a one-time purchase with instant in-place browser unlock, built on
            film tendencies, trench matchups, active injury reports, and disciplined pass rules (strictly XX/100
            confidence scores).
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/packages"
              className="inline-flex min-h-[46px] items-center justify-center rounded bg-[#FF4D2E] px-6 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#e03e20]"
            >
              Open Galaxy Picks Storefront →
            </Link>
            <Link
              href="/packages#sgp-correlation-basket"
              className="inline-flex min-h-[46px] items-center justify-center rounded border border-[#FF4D2E] bg-[#12141C] px-6 text-xs font-bold uppercase tracking-wider text-[#EDE8E0] transition-colors hover:bg-[#FF4D2E] hover:text-white"
            >
              MNF Props &amp; SGP Pack · $29 →
            </Link>
            <Link
              href="/fantasy/dfs"
              className="inline-flex min-h-[46px] items-center justify-center rounded border border-[#EDE8E0]/40 px-6 text-xs font-bold uppercase tracking-wider text-[#EDE8E0] transition-colors hover:border-[#FF4D2E] hover:text-[#FF4D2E]"
            >
              Open RedZone DFS Suite →
            </Link>
          </div>
        </div>

        {/* Pack Catalog Section */}
        <section className="mt-14" aria-labelledby="pricing-pack-catalog-heading">
          <h2
            id="pricing-pack-catalog-heading"
            className="font-display text-2xl uppercase tracking-wide text-white sm:text-3xl"
          >
            This Week&apos;s One-Time Packs
          </h2>
          <p className="mt-2 text-sm text-[#C4BFB6]">
            Identical catalog pricing across{" "}
            <Link href="/packages" className="underline decoration-[#FF4D2E] underline-offset-4">
              /packages
            </Link>{" "}
            and{" "}
            <Link href="/fantasy/dfs" className="underline decoration-[#FF4D2E] underline-offset-4">
              /fantasy/dfs
            </Link>
            . One-time checkout, zero recurring billing.
          </p>

          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            {LIVE_PACKAGE_CATALOG.map((pkg) => {
              const isForSale = pkg.forSale !== false;
              const isFeatured = pkg.slug === "week8-all-access" || pkg.slug === "sgp-correlation-basket";
              return (
                <div
                  key={pkg.slug}
                  className={`flex flex-col justify-between rounded-xl border p-7 transition-all ${
                    isFeatured
                      ? "border-[#FF4D2E] bg-[#12141C] shadow-[0_0_30px_rgba(255,77,46,0.18)]"
                      : "border-[#252833] bg-[#0E1015] hover:border-[#3A3F50]"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded bg-[#FF4D2E]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#FF4D2E]">
                        {pkg.badge ?? "ONE-TIME PACK"}
                      </span>
                      {!isForSale && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8F8A82]">
                          Window Closed
                        </span>
                      )}
                    </div>

                    <h3 className="mt-4 font-display text-2xl uppercase tracking-wide text-white">
                      {pkg.title}
                    </h3>

                    <div className="mt-5 flex items-baseline">
                      <span className="font-display text-5xl uppercase tracking-tight text-white">
                        {formatPackPrice(pkg)}
                      </span>
                      <span className="ml-2 text-xs uppercase tracking-wider text-[#8F8A82]">
                        / one-time purchase
                      </span>
                    </div>

                    <p className="mt-4 text-xs leading-relaxed text-[#C4BFB6]">
                      {sanitizePlainFootballText(pkg.description)}
                    </p>

                    <div className="my-6 border-t border-[#252833]" />

                    <ul className="space-y-3 text-xs text-[#EDE8E0]">
                      {pkg.highlights.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className="font-bold text-[#FF4D2E]" aria-hidden="true">
                            ✓
                          </span>
                          <span>{sanitizePlainFootballText(feature)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8 space-y-2">
                    <Link
                      href={`/packages#${pkg.slug}`}
                      className={`inline-flex min-h-[46px] w-full items-center justify-center rounded text-xs font-bold uppercase tracking-wider transition-colors ${
                        isForSale
                          ? "bg-[#FF4D2E] text-white hover:bg-[#e03e20]"
                          : "border border-[#EDE8E0]/30 text-[#C4BFB6] hover:border-[#FF4D2E] hover:text-white"
                      }`}
                    >
                      {isForSale ? `Open Pack · ${formatPackPrice(pkg)} →` : "View Archived Pack →"}
                    </Link>
                    {!isForSale && (
                      <Link
                        href="/packages#sgp-correlation-basket"
                        className="inline-flex min-h-[42px] w-full items-center justify-center rounded bg-[#FF4D2E] text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#e03e20]"
                      >
                        Pivot to Active MNF Props &amp; SGP Pack · $29 →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Verification & Pass Discipline */}
        <div className="mt-16 rounded-xl border border-[#252833] bg-[#0E1015] p-8 text-center sm:p-10">
          <p className="font-display text-2xl uppercase tracking-wide text-white sm:text-3xl">
            Honest Football Grading &amp; Strict Pass Discipline
          </p>
          <p className="mx-auto mt-3 max-w-3xl text-sm leading-relaxed text-[#C4BFB6]">
            Every call published on Galaxy Sports Edge is built from coaching tendencies, offensive and defensive line pass-protection matchups, active injury reports, and de-vigged sportsbook price comparisons. If a game or prop does not give us a clear edge over the market number, we mark it <strong>PASS · NO BET</strong>. We never force action.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-6 text-xs text-[#8F8A82]">
            <span>✓ Settled Record: 47-19-1 (71.2% · +24.92u (with gated props))</span>
            <span>
              ✓ Week 9 Sunday Settled: {WEEK9_SUNDAY_SETTLED_PROOF_SUMMARY.sundayOfficialPlayRecord} (
              {WEEK9_SUNDAY_SETTLED_PROOF_SUMMARY.sundayNetUnits}) ·{" "}
              {WEEK9_SUNDAY_SETTLED_PROOF_SUMMARY.passDisciplineAvoidedLossesCount} Avoided Losses
            </span>
            <span>✓ Timestamped Pre-Kickoff Ledger</span>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
