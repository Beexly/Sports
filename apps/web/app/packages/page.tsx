import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import {
  TWO_DOOR_PACK_OFFERS,
  membershipCheckoutAvailability,
} from "@/lib/packages/two-door-offers";
import { LIVE_PACKAGE_CATALOG, getActiveForSalePackages } from "@/lib/packages/catalog";
import { scrubOfferingCopy } from "@/lib/packages/copy-fence";
import { getRedactedTeasersForWindowSlot } from "@/lib/writeups/coach-writeup-engine";
import { PaywallRevealCard } from "@/components/packages/paywall-reveal-card";
import { getStage5GateStatus } from "@/lib/packages/stage5-gate";
import { SingleSlateCard, MembershipPlans } from "./_components/two-door-checkout";

// The Stage-5 gate is live state: never cache this page into a stale
// "checkout open" or "checkout closed" snapshot.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Season Membership & Single-Slate Packs | Galaxy Sports Edge" },
  description:
    "Two doors: a season membership at founding pricing, or single-slate packs with store-credit protection. Every official play clears a five-stage check - and every pass is published free.",
};

const eyebrow = "font-numerals text-[11px] uppercase tracking-[0.22em]";

const FIVE_STAGES: readonly { readonly title: string; readonly body: string }[] = [
  {
    title: "Fresh-data check",
    body: "Injury reports, roster rulings and odds are verified fresh before any number is trusted. Stale data never reaches a pick.",
  },
  {
    title: "Full-market scan",
    body: "We compare the number across every book we track - not one screen - so the price we grade against is the real market.",
  },
  {
    title: "Edge verification",
    body: "The model must show a measurable edge at the current number. No edge, no play - regardless of how good the storyline sounds.",
  },
  {
    title: "Price check",
    body: "If the line has already moved past our fair price, the play dies here. We do not chase steam and call it conviction.",
  },
  {
    title: "Publication gate",
    body: "A sealed five-stage receipt must be attached before a pick can be published or sold. No receipt, no official play.",
  },
];

export default async function PackagesPage(): Promise<JSX.Element> {
  const gate = await getStage5GateStatus();
  const membershipAvailability = membershipCheckoutAvailability();
  const stripePacks = LIVE_PACKAGE_CATALOG.filter((pkg) => Boolean(pkg.forSale) && Boolean(pkg.stripePriceId));

  return (
    <div className="relative min-h-screen bg-obsidian text-ion-white">
      {/* Page-level motion + scrollbar language (flat FIELD surfaces, no glow) */}
      <style>{`
        .gse-packages ::-webkit-scrollbar { width: 10px; height: 10px; }
        .gse-packages ::-webkit-scrollbar-track { background: #08090C; }
        .gse-packages ::-webkit-scrollbar-thumb { background: #23262E; border: 2px solid #08090C; }
        .gse-packages ::-webkit-scrollbar-thumb:hover { background: #31353F; }
        .gse-packages { scrollbar-width: thin; scrollbar-color: #23262E #08090C; }
        @keyframes gse-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .gse-rise { animation: gse-rise 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .gse-rise-1 { animation-delay: 0.06s; }
        .gse-rise-2 { animation-delay: 0.14s; }
        .gse-rise-3 { animation-delay: 0.22s; }
        @keyframes gse-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        .gse-pulse { animation: gse-pulse 1.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .gse-rise, .gse-pulse { animation: none; }
        }
      `}</style>

      <div className="gse-packages">
        <Nav />
        <main id="main-content" className="mx-auto w-full max-w-6xl px-4 pb-24 pt-14 sm:px-6">
          {/* - Pack Cards (above the fold, mobile-first 1-tap Buy Now) - */}
        <section id="pack-cards" aria-labelledby="door-2-heading" className="gse-rise">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <div>
              <p className={`${eyebrow} text-ion-2`}>Instant Access</p>
              <h1 id="door-2-heading" className="mt-2 font-display text-3xl text-ion-white sm:text-5xl">
                Choose Your Football Pack
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-ion-1">
                One-time purchase. Your official picks, player props, and parlays unlock immediately right inside the card.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            {stripePacks.map((pkg) => {
              const priceDollars = Math.round(pkg.standardPriceCents / 100);
              return (
                <div
                  key={pkg.slug}
                  className="border border-mineral-hi bg-eclipse p-5 sm:p-6"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h2 className="font-display text-2xl text-ion-white">
                      {pkg.title}
                    </h2>
                    <span className="font-numerals text-2xl font-semibold text-emerald-400">
                      ${priceDollars}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-ion-1">
                    {pkg.subtitle}
                  </p>
                  <form method="POST" action="/api/packages/checkout" className="mt-4">
                    <input type="hidden" name="packageSlug" value={pkg.slug} />
                    <button
                      type="submit"
                      className="flex min-h-[52px] w-full items-center justify-center bg-emerald-500 px-5 py-3 text-base font-semibold text-obsidian transition-colors hover:bg-emerald-400"
                    >
                      {"Buy Pack Now - $" + priceDollars + " ->"}
                    </button>
                  </form>
                </div>
              );
            })}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {getActiveForSalePackages().map((rawPkg, idx) => {
              const cleanPkg = scrubOfferingCopy(rawPkg);
              const teasers = getRedactedTeasersForWindowSlot(cleanPkg.windowSlot);
              return (
                <div key={cleanPkg.slug} id={`checkout-${cleanPkg.slug}`}>
                  <PaywallRevealCard
                    pkg={cleanPkg}
                    teasers={teasers}
                    featured={idx === 0 || cleanPkg.slug === "week8-all-access"}
                    ctaTone="solid"
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* - Five-stage check (compact horizontal band) - */}
        <section aria-labelledby="gate-heading" className="mt-16 border-t border-mineral pt-12">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 id="gate-heading" className="font-display text-2xl text-ion-white sm:text-3xl">
              Five stages. No shortcuts.
            </h2>
            <p className={`${eyebrow} text-ion-2`}>Every slate clears all five before listing</p>
          </div>
          <ol className="mt-6 grid gap-px border border-mineral bg-mineral sm:grid-cols-2 lg:grid-cols-5">
            {FIVE_STAGES.map((stage, idx) => (
              <li key={stage.title} className="bg-eclipse p-5">
                <span className="font-numerals text-xs text-plasma">{String(idx + 1).padStart(2, "0")}</span>
                <h3 className="mt-2 text-sm font-semibold text-ion-white">{stage.title}</h3>
                <p className="mt-1.5 text-xs leading-5 text-ion-1">{stage.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* - Record band - link, never quote - */}
        <section className="mt-16 border border-mineral bg-eclipse p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
            <div className="max-w-2xl">
              <p className={`${eyebrow} text-ion-2`}>The verified record</p>
              <p className="mt-2 font-display text-2xl text-ion-white">
                We don&apos;t quote win rates on this page.
              </p>
              <p className="mt-2 text-sm leading-6 text-ion-1">
                Every graded play, every pass and every unit is sealed in the public
                record - wins and losses alike. Read it before you spend a dollar.
              </p>
            </div>
            <Link
              href="/record"
              className="border border-plasma px-6 py-3.5 font-numerals text-sm uppercase tracking-[0.18em] text-plasma transition-colors hover:bg-plasma hover:text-obsidian"
            >
              See the verified record
            </Link>
          </div>
        </section>

        {/* - Collapsed Whop / legacy archive - */}
        <details className="mt-14 border border-mineral bg-eclipse p-5">
          <summary className="cursor-pointer font-mono text-xs uppercase tracking-[0.18em] text-ion-2">
            Season Membership &amp; Gate Archive
          </summary>
          <div className="mt-6 space-y-10">
            <header className="border-b border-mineral pb-10">
              <p className={`${eyebrow} text-plasma`}>Galaxy Sports Edge - Week 10 - Storefront</p>
              <h2 className="mt-4 max-w-3xl font-display text-4xl leading-[1.05] text-ion-white sm:text-5xl">
                Two doors. One standard.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1 sm:text-lg">
                Join for the season, or buy a single slate. Either way, you only ever pay for
                plays that clear our five-stage check - and when we pass, the reasoning is
                published free. Passing is a decision we are proud of, not a gap we hide.
              </p>
              <div
                data-testid="stage5-gate-band"
                className={`mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 border px-4 py-3.5 ${
                  gate.checkoutEnabled ? "border-mineral-hi bg-eclipse" : "border-plasma/60 bg-eclipse"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className={`gse-pulse inline-block h-2 w-2 ${gate.checkoutEnabled ? "bg-ion-white" : "bg-plasma"}`}
                  />
                  <span className={`${eyebrow} ${gate.checkoutEnabled ? "text-ion-white" : "text-plasma"}`}>
                    Stage-5 gate - {gate.checkoutEnabled ? "open" : "closed"}
                  </span>
                </span>
                <span className="text-sm text-ion-2">
                  {gate.officialPlayCount} official {gate.officialPlayCount === 1 ? "play" : "plays"} published
                </span>
                <span className="w-full text-sm leading-6 text-ion-1 sm:w-auto sm:flex-1">
                  {gate.reason}{" "}
                  <Link href="/pricing" className="ml-3 text-xs font-semibold uppercase tracking-[0.12em] text-ion-white underline">
                    Pricing
                  </Link>
                </span>
              </div>
            </header>

            <section id="season-membership" aria-labelledby="door-1-heading">
              <h2 id="door-1-heading" className="font-display text-2xl text-ion-white sm:text-3xl">
                Season Membership
              </h2>
              <div className="mt-4 border border-mineral bg-obsidian p-6">
                <MembershipPlans gate={gate} availability={membershipAvailability} />
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              {TWO_DOOR_PACK_OFFERS.map((offer) => (
                <SingleSlateCard
                  key={offer.slug}
                  offer={offer}
                  gate={gate}
                />
              ))}
            </div>
          </div>
        </details>

        {/* - Still browsing? Free surfaces - */}
        <p className="mt-10 text-sm leading-6 text-ion-2">
          Not ready to buy? The free board shows every published pass with its reasoning:{" "}
          <Link href="/board" className="text-plasma transition-colors hover:text-plasma-glow">
            open the board
          </Link>
        </p>
      </main>
      <Footer />
    </div>
  </div>
  );
}        
