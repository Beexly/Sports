import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { LIVE_PACKAGE_CATALOG } from "@/lib/packages/catalog";
import {
  getActiveUpcomingWriteups,
  getRedactedTeasersForWindowSlot,
} from "@/lib/writeups/coach-writeup-engine";
import { PaywallRevealCard } from "@/components/packages/paywall-reveal-card";
import { DossierLedger } from "@/components/packages/dossier-ledger";
import {
  isFullSlatePack,
  lowestPriceDollars,
  orderPacksForStorefront,
  upcomingOnly,
} from "@/components/packages/storefront-order";

export const metadata: Metadata = {
  title: "NFL Betting Packs | Galaxy Sports Edge",
  description:
    "Plain-English NFL Picks, Player Props & Parlays — Written so you know exactly what to bet and why in 30 seconds.",
};

// Dossiers are filtered by kickoff at render time; keep them current.
export const revalidate = 300;

/**
 * /packages — the pay-per-slate storefront.
 *
 * Same Redline world as the homepage: stadium plate, purchase bands with the
 * price beside the action, one featured dossier then quiet entries.
 */
export default function PackagesPage(): JSX.Element {
  const packs = orderPacksForStorefront(LIVE_PACKAGE_CATALOG);
  const fromPrice = lowestPriceDollars(packs);
  const dossiers = upcomingOnly(getActiveUpcomingWriteups());

  return (
    <div className="flex min-h-screen flex-col bg-obsidian">
      <Nav />
      <main id="main-content" className="flex-1">
        {/* ── OPENING ─────────────────────────────────────────────── */}
        <section aria-labelledby="packages-title" data-od-id="packages-opening" className="border-b border-mineral">
          <div className="mx-auto grid max-w-[1440px] lg:grid-cols-12">
            <div className="px-5 pb-12 pt-14 sm:px-8 sm:pt-20 lg:col-span-7 lg:px-12 lg:pb-16 lg:pt-24">
              <p className="rl-eyebrow">Galaxy Picks · pay-per-slate storefront</p>
              <h1 id="packages-title" className="rl-display mt-6 text-[length:clamp(3.25rem,10vw,7rem)]">
                Choose Your Betting Pack
              </h1>
              <p className="mt-8 max-w-[36rem] text-lg leading-relaxed text-ion-white sm:text-xl">
                Plain-English NFL Picks, Player Props &amp; Parlays — Written so you know exactly what to bet and why in 30 seconds.
              </p>
              <p className="mt-5 max-w-[36rem] text-base leading-relaxed text-ion-1 sm:text-[17px]">
                No monthly subscription. We study every line matchup, injury report and coaching
                tendency across the slate, then unlock our official spread calls, over/under calls,
                player props and parlays right on this page.
              </p>
              <div className="mt-9 flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
                <a href="#pack-cards" className="rl-btn rl-btn-line rl-figure w-full sm:w-auto">
                  {fromPrice ? `See the packs — from $${fromPrice}` : "See the packs"}
                </a>
                <Link href="/fantasy/dfs" className="rl-link text-sm">
                  Open the DFS lineup optimizer
                </Link>
              </div>
            </div>
            <div className="relative aspect-[16/9] w-full lg:col-span-5 lg:aspect-auto lg:min-h-[34rem]">
              <Image
                src="/brand/redline-stadium.png"
                alt=""
                fill
                sizes="(min-width: 1024px) 42vw, 100vw"
                className="rl-photo rl-photo-band"
              />
            </div>
          </div>
        </section>

        {/* ── THE BOARD · one band per pack; anchors are the slugs ──── */}
        <section
          id="pack-cards"
          data-od-id="packages-board"
          aria-labelledby="choose-pack-title"
          className="scroll-mt-28 border-b border-mineral px-5 py-20 sm:px-8 lg:px-12 lg:py-24"
        >
          <div className="mx-auto max-w-[1344px]">
            <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-7">
                <p className="rl-eyebrow rl-figure">{packs.length} packs · one-time purchase</p>
                <h2 id="choose-pack-title" className="rl-display mt-5 text-[length:clamp(3rem,7vw,5rem)]">
                  Pay once. Picks open in the band.
                </h2>
              </div>
              <p className="max-w-[38rem] text-base leading-relaxed text-ion-1 sm:text-[17px] lg:col-span-5">
                Checkout runs through Stripe. Your official picks open inside the band you bought;
                your receipt ID reopens them later.
              </p>
            </div>

            <ol className="mt-14 border-b border-mineral lg:mt-20">
              {packs.map((pkg, index) => (
                <li key={pkg.slug} id={pkg.slug} className="scroll-mt-28">
                  <PaywallRevealCard
                    pkg={pkg}
                    teasers={getRedactedTeasersForWindowSlot(pkg.windowSlot)}
                    featured={index === 0 && isFullSlatePack(pkg)}
                    ctaTone={index === 0 ? "solid" : "line"}
                  />
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── DOSSIERS ────────────────────────────────────────────── */}
        <section
          id="slate-dossiers"
          data-od-id="packages-dossiers"
          aria-labelledby="dossiers-title"
          className="scroll-mt-28 px-5 py-20 sm:px-8 lg:px-12 lg:py-24"
        >
          <div className="mx-auto max-w-[1344px]">
            <p className="rl-eyebrow">Free preview · official picks stay in the packs above</p>
            <h2 id="dossiers-title" className="rl-display mt-5 text-[length:clamp(3rem,7vw,5rem)]">
              Game dossiers
            </h2>
            <DossierLedger writeups={dossiers} entries={5} unlockHref="#pack-cards" />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
