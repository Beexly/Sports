import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { GalaxyCursor } from "@/components/ui/galaxy-cursor";
import { FieldCinematicIntro } from "@/components/landing/field-cinematic-intro";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { LIVE_PACKAGE_CATALOG } from "@/lib/packages/catalog";
import {
  LIVE_SLATE_COACH_WRITEUPS,
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
  title: { absolute: "Galaxy Sports Edge" },
  description:
    "Plain-English NFL Picks, Player Props & Parlays — Written so you know exactly what to bet and why in 30 seconds.",
  alternates: { canonical: "/" },
};

// Dossiers are filtered by kickoff at render time; regenerate so a game that
// has kicked off never stays featured beside an unlock link.
export const revalidate = 300;

export default async function HomePage(): Promise<JSX.Element> {
  const packs = orderPacksForStorefront(LIVE_PACKAGE_CATALOG);
  const fromPrice = lowestPriceDollars(packs);
  const dossiers = upcomingOnly(LIVE_SLATE_COACH_WRITEUPS);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-obsidian text-ion">
      <FieldCinematicIntro />
      <Nav />
      <main id="main-content">
        {/* ── HERO · stadium plate, thesis in the dark stands ───────── */}
        <section
          data-od-id="home-hero"
          aria-labelledby="home-hero-title"
          className="relative isolate overflow-hidden border-b border-mineral bg-obsidian"
        >
          <div className="relative z-10 mx-auto max-w-[1440px] lg:grid lg:min-h-[calc(100svh-6.5rem)] lg:grid-cols-12">
            <div className="flex flex-col px-5 pb-10 pt-12 sm:px-8 sm:pt-20 lg:col-span-7 lg:px-12 lg:pb-12 lg:pt-16">
              <p className="rl-eyebrow">GALAXY PICKS (PAID) · NFL pay-per-slate packs</p>
              <h1 id="home-hero-title" className="rl-display rl-hero-title mt-6">
                <span className="block">The market is full of <span className="text-ion-2">noise</span>.</span>
                <span className="mt-[0.1em] block">We find the <span className="rl-gain">signal</span>.</span>
              </h1>
              <p className="mt-7 max-w-[34rem] text-lg leading-relaxed text-ion-1 sm:text-xl">
                Plain-English NFL Picks, Player Props &amp; Parlays — Written so you know exactly what
                to bet and why in 30 seconds.
              </p>
              <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
                <Link href="/packages" className="btn-primary rl-btn rl-btn-solid rl-figure w-full sm:w-auto" data-od-id="home-hero-cta">
                  {fromPrice ? `Unlock this week’s packs — from $${fromPrice}` : "Unlock this week’s packs"}
                </Link>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
                  <Link href="/fantasy/dfs" className="rl-link">
                    DFS Optimizer &amp; Stacks
                  </Link>
                  <Link href="/pricing" className="rl-link">
                    See pricing
                  </Link>
                </div>
              </div>
              <p className="rl-eyebrow mt-auto hidden pt-12 lg:block">We detect. You decide.</p>
            </div>
          </div>

          <div className="relative aspect-[4/3] w-full sm:aspect-[16/9] lg:absolute lg:inset-y-0 lg:right-0 lg:aspect-auto lg:w-[54%]">
            <Image
              src="/brand/redline-stadium.png"
              alt="An empty football stadium at night, field lines and goalposts lit against dark stands"
              fill
              priority
              sizes="(min-width: 1024px) 54vw, 100vw"
              className="rl-photo rl-photo-hero"
            />
          </div>
          <p className="rl-eyebrow px-5 py-6 sm:px-8 lg:hidden">We detect. You decide.</p>
        </section>

        {/* ── THE PACKS · three purchase bands, price beside action ─── */}
        <section
          id="revenue-pillars"
          data-testid="five-pillar-revenue-section"
          data-od-id="home-packs"
          aria-labelledby="packs-title"
          className="scroll-mt-28 border-b border-mineral bg-obsidian px-5 py-20 sm:px-8 lg:px-12 lg:py-28"
        >
          <div className="mx-auto max-w-[1344px]">
            <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-7">
                <p className="rl-eyebrow">Galaxy Picks · pay once per slate</p>
                <h2 id="packs-title" className="rl-display mt-5 text-[length:clamp(3rem,7vw,5rem)]">
                  Pay once. Picks open right here.
                </h2>
              </div>
              <p className="max-w-[38rem] text-base leading-relaxed text-ion-1 sm:text-[17px] lg:col-span-5">
                No subscription. Buy a pack and its official calls open inside the band you bought,
                on this page, the moment checkout clears.
              </p>
            </div>

            <div data-testid="homepage-wagertalk-storefront" className="mt-14 border-b border-mineral lg:mt-20">
              {packs.map((pkg, index) => (
                <PaywallRevealCard
                  key={pkg.slug}
                  pkg={pkg}
                  teasers={getRedactedTeasersForWindowSlot(pkg.windowSlot)}
                  featured={index === 0 && isFullSlatePack(pkg)}
                  ctaTone={index === 0 ? "solid" : "line"}
                />
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-4 text-sm">
              <Link href="/packages" className="rl-link">
                Compare every pack
              </Link>
              <Link href="/fantasy/dfs" className="rl-link">
                Playing daily fantasy? DFS writeups &amp; lineups
              </Link>
            </div>
          </div>
        </section>

        {/* ── DOSSIERS · one featured matchup, then quiet entries ────── */}
        <section
          id="slate-dossiers"
          data-od-id="home-dossiers"
          aria-labelledby="dossiers-title"
          className="scroll-mt-28 border-b border-mineral bg-obsidian px-5 py-20 sm:px-8 lg:px-12 lg:py-28"
        >
          <div className="mx-auto max-w-[1344px]">
            <p className="rl-eyebrow">Free game dossiers · official picks stay in the packs</p>
            <h2 id="dossiers-title" className="rl-display mt-5 text-[length:clamp(3rem,7vw,5rem)]">
              Read the matchup first.
            </h2>
            <DossierLedger writeups={dossiers} entries={3} unlockHref="/packages" />
          </div>
        </section>

        {/* ── CLOSE · the decision stays with the reader ─────────────── */}
        <section
          data-testid="homepage-responsible-close"
          data-od-id="home-close"
          className="bg-obsidian px-5 py-20 sm:px-8 lg:px-12 lg:py-28"
        >
          <div className="mx-auto grid max-w-[1344px] gap-10 lg:grid-cols-12">
            <h2 className="rl-display text-[length:clamp(2.75rem,6vw,4.5rem)] lg:col-span-7">
              The math can point. The decision stays yours.
            </h2>
            <div className="lg:col-span-5 lg:pt-3">
              <p className="text-base leading-relaxed text-ion-1 sm:text-[17px]">
                This product is research, not certainty. We get better by adding settled rows and
                clearer uncertainty, not by making louder claims.
              </p>
              <RiskDisclosure variant="compact" includePastPerformance className="mt-6 text-ion-2" />
            </div>
          </div>
        </section>
      </main>
      <GalaxyCursor />
      <Footer />
    </div>
  );
}
