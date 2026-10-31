import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { LIVE_PACKAGE_CATALOG } from "@/lib/packages/catalog";
import {
  formatWindowSlotLabel,
  getActiveUpcomingWriteups,
  getRedactedTeasersForWindowSlot,
  sanitizePlainFootballText,
} from "@/lib/writeups/coach-writeup-engine";
import { PaywallRevealCard } from "@/components/packages/paywall-reveal-card";

export const metadata: Metadata = {
  title: "NFL Betting Packs | Galaxy Sports Edge",
  description:
    "Plain-English NFL Picks, Player Props & Parlays — Written so you know exactly what to bet and why in 30 seconds.",
};

/**
 * /packages — the pay-per-slate storefront.
 *
 * Redline Ledger: near-black ground, bone ink, one ember accent, hairline rules.
 * Layout is an editorial ledger — numbered rows, not a grid of cards — so the
 * eye reads pack, price, proof down a single column instead of scanning tiles.
 */
export default function PackagesPage(): JSX.Element {
  const packs = LIVE_PACKAGE_CATALOG.filter((pkg) => pkg.forSale !== false);
  const storylines = getActiveUpcomingWriteups().slice(0, 4);

  return (
    <div className="flex min-h-screen flex-col bg-obsidian">
      <Nav />
      <main id="main-content" className="flex-1">
        {/* ── OPENING · the storefront as a filed report, not a hero card ── */}
        <section
          className="border-b border-mineral px-4 pb-14 pt-24 sm:px-6 lg:px-8"
          aria-labelledby="packages-title"
        >
          <div className="mx-auto max-w-5xl">
            <p className="font-numerals text-[11px] uppercase tracking-[0.22em] text-ion-1">
              Galaxy Picks · Pay-Per-Slate Storefront
            </p>
            <h1
              id="packages-title"
              className="mt-5 max-w-4xl text-balance font-display text-3xl text-ion-white sm:text-5xl"
            >
              Plain-English NFL Picks, Player Props &amp; Parlays — Written so you know exactly what to bet and why in 30 seconds.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-ion-1">
              No monthly subscription and zero confusing math jargon. We study every offensive and defensive line matchup, injury report, and coaching tendency across the slate — then unlock our{" "}
              <strong className="font-semibold text-ion-white">official spread calls, over/under calls, player props, and parlays</strong>{" "}
              right on this page.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="#pack-cards"
                className="inline-flex items-center justify-center border border-plasma bg-plasma px-5 py-3 text-sm font-semibold text-plasma-ink transition-colors hover:bg-plasma-glow"
              >
                Jump to the packs ↓
              </a>
              <Link
                href="/fantasy/dfs"
                className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-ion-1 transition-colors hover:text-ion-white"
              >
                Open the DFS lineup optimizer →
              </Link>
            </div>
          </div>
        </section>

        {/* ── THE BOARD · numbered ledger rows, one pack per rule ── */}
        <section
          id="pack-cards"
          className="scroll-mt-24 border-b border-mineral px-4 py-14 sm:px-6 lg:px-8"
          aria-labelledby="choose-pack-title"
        >
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <div>
                <p className="font-numerals text-[11px] uppercase tracking-[0.22em] text-ion-1">
                  The Board
                </p>
                <h2
                  id="choose-pack-title"
                  className="mt-3 font-display text-3xl text-ion-white sm:text-4xl"
                >
                  Choose your football pack
                </h2>
              </div>
              <p className="font-numerals text-xs uppercase tracking-[0.18em] tabular-nums text-ion-2">
                {packs.length} packs · one-time purchase
              </p>
            </div>
            <p className="mt-4 max-w-2xl text-base leading-7 text-ion-1">
              One-time purchase. Your official picks, player props, and parlays unlock immediately right inside the row below.
            </p>

            <ol className="mt-10 border-t border-mineral">
              {packs.map((pkg, index) => (
                <li
                  key={pkg.slug}
                  id={pkg.slug}
                  className="scroll-mt-24 border-b border-mineral"
                >
                  <div className="grid grid-cols-1 gap-x-8 gap-y-6 py-10 lg:grid-cols-[88px_minmax(0,1fr)]">
                    {/* Rail — the ledger index, held out of the reading column */}
                    <div className="flex items-baseline gap-3 lg:flex-col lg:items-start lg:gap-2">
                      <span
                        aria-hidden
                        className="font-numerals text-2xl font-semibold tabular-nums text-plasma"
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="font-numerals text-[11px] uppercase tracking-[0.18em] text-ion-2">
                        {formatWindowSlotLabel(pkg.windowSlot)}
                      </span>
                    </div>

                    {/* Content — the pack's identity, teasers and unlock rail */}
                    <PaywallRevealCard
                      pkg={pkg}
                      teasers={getRedactedTeasersForWindowSlot(pkg.windowSlot)}
                    />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── DOSSIERS · free matchup storylines, also numbered rows ── */}
        <section
          id="slate-dossiers"
          className="scroll-mt-24 px-4 py-14 sm:px-6 lg:px-8"
          aria-labelledby="dossiers-title"
        >
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <div>
                <p className="font-numerals text-[11px] uppercase tracking-[0.22em] text-ion-1">
                  Free Preview
                </p>
                <h2
                  id="dossiers-title"
                  className="mt-3 font-display text-3xl text-ion-white sm:text-4xl"
                >
                  Free football matchup previews &amp; storylines
                </h2>
              </div>
              <p className="font-numerals text-xs uppercase tracking-[0.18em] text-ion-2">
                Official picks locked in the packs above
              </p>
            </div>
            <p className="mt-4 max-w-2xl text-base leading-7 text-ion-1">
              Read how each matchup sets up in the trenches and secondary — then unlock a pack above to reveal our official spread call, over/under call, and player prop bets.
            </p>

            <ol className="mt-10 border-t border-mineral">
              {storylines.map((writeup, index) => {
                const slotLabel = formatWindowSlotLabel(writeup.windowSlot, writeup.matchup);

                return (
                  <li key={writeup.id} className="border-b border-mineral py-8">
                    <article className="grid grid-cols-1 gap-x-8 gap-y-4 lg:grid-cols-[88px_minmax(0,1fr)]">
                      <p
                        aria-hidden
                        className="font-numerals text-xl tabular-nums text-ion-2"
                      >
                        {String(index + 1).padStart(2, "0")}
                      </p>

                      <div>
                        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                          <span className="font-numerals text-[11px] uppercase tracking-[0.18em] text-ion-1">
                            {slotLabel}
                          </span>
                          <span className="font-numerals text-[11px] uppercase tracking-[0.18em] tabular-nums text-ion-2">
                            {writeup.topProps.length} player prop reads locked
                          </span>
                        </div>

                        <h3 className="mt-3 font-display text-2xl text-ion-white sm:text-3xl">
                          {writeup.matchup}
                        </h3>

                        <p className="mt-3 max-w-2xl text-base leading-7 text-ion-1">
                          {sanitizePlainFootballText(writeup.schemeMatchup.coverageShell)}
                        </p>
                        <p className="mt-2 max-w-2xl text-base leading-7 text-ion-2">
                          {sanitizePlainFootballText(writeup.paceOfPlay.notes)}
                        </p>

                        {/* One honest locked line replaces the twin "call" tiles. */}
                        <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-mineral pt-4">
                          <span className="font-numerals text-[11px] uppercase tracking-[0.18em] text-plasma">
                            Spread call · Over/Under call · {writeup.topProps.length} player props · 3-leg parlay — locked in the packs
                          </span>
                          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                            <Link
                              href={`/games/${writeup.gameId}`}
                              className="text-sm font-semibold text-plasma transition-colors hover:text-plasma-glow"
                            >
                              Read the matchup preview →
                            </Link>
                            <a
                              href="#pack-cards"
                              className="font-numerals text-xs uppercase tracking-[0.18em] text-ion-2 transition-colors hover:text-ion-white"
                            >
                              Unlock official picks ↑
                            </a>
                          </div>
                        </div>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
