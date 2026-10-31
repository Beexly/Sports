import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { getPackageBySlug } from "@/lib/packages/catalog";
import { verifyPackagePurchase } from "@/lib/packages/verify-purchase";
import {
  LIVE_SLATE_COACH_WRITEUPS,
  formatWindowSlotLabel,
  getRedactedTeasersForWindowSlot,
  sanitizePlainFootballText,
  type CoachGameWriteup,
} from "@/lib/writeups/coach-writeup-engine";
import { PaywallRevealCard } from "@/components/packages/paywall-reveal-card";

interface PackagePageProps {
  params: { slug: string };
  searchParams: {
    unlocked?: string;
    session_id?: string;
    whop_token?: string;
    guaranteed?: string;
  };
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PackagePageProps): Promise<Metadata> {
  const pkg = getPackageBySlug(params.slug);
  if (!pkg) return { title: "Package Not Found" };
  return {
    title: `${pkg.title} | Galaxy Sports Edge`,
    description: pkg.description,
  };
}

export default async function PackageDetailPage({ params, searchParams }: PackagePageProps): Promise<JSX.Element> {
  const pkg = getPackageBySlug(params.slug);
  if (!pkg) {
    notFound();
  }
  if (pkg.forSale === false) {
    return (
      <div className="flex min-h-screen flex-col bg-obsidian">
        <Nav />
        <main id="main-content" className="mx-auto w-full max-w-4xl flex-1 px-4 py-20 sm:px-6">
          <p className="font-numerals text-[11px] uppercase tracking-[0.22em] text-ion-2">
            Final · not for sale
          </p>
          <h1 className="mt-3 font-display text-3xl text-ion-white sm:text-4xl">{pkg.title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-ion-1">{pkg.description}</p>
          <p className="mt-6 border-t border-mineral pt-6 font-numerals text-sm tabular-nums text-ion-2">
            Green Bay 27, Carolina 19. Not for sale.
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  const verification = await verifyPackagePurchase({
    sessionId: searchParams.session_id,
    whopToken: searchParams.whop_token,
    slug: pkg.slug,
  });
  const isUnlocked = verification.authorized;
  const isGuaranteedSelected = searchParams.guaranteed === "1";

  const relevantWriteups: CoachGameWriteup[] = LIVE_SLATE_COACH_WRITEUPS.filter((w) => {
    if (pkg.windowSlot === "WEEKEND_PASS" || pkg.windowSlot === "WEEKLY_PASS") {
      return true;
    }
    if (pkg.windowSlot === "SUN_MAIN") {
      return w.windowSlot === "SUN_EARLY" || w.windowSlot === "SUN_LATE" || w.windowSlot === "SUN_MAIN";
    }
    return w.windowSlot === pkg.windowSlot;
  });

  const standardPrice = (pkg.standardPriceCents / 100).toFixed(0);
  const guaranteedPrice = pkg.guaranteedPriceCents
    ? (pkg.guaranteedPriceCents / 100).toFixed(0)
    : null;

  const eyebrow = "font-numerals text-[11px] uppercase tracking-[0.2em] text-ion-1";

  return (
    <div className="flex min-h-screen flex-col bg-obsidian">
      <Nav />
      <main id="main-content" className="mx-auto w-full max-w-4xl flex-1 px-4 py-16 sm:px-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 font-numerals text-[11px] uppercase tracking-[0.18em] text-ion-2">
          <Link href="/packages" className="text-plasma transition-colors hover:text-plasma-glow">
            ← All football packs
          </Link>
          <span aria-hidden>/</span>
          <span className="text-ion-1">{pkg.title}</span>
        </nav>

        {/* ── Header · filed report, not a hero plate ───────────── */}
        <header className="mt-8 border-b border-mineral pb-8">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className={eyebrow}>
                {pkg.badge || formatWindowSlotLabel(pkg.windowSlot)}
              </span>
              {isUnlocked ? (
                <span className="font-numerals text-[11px] uppercase tracking-[0.2em] text-plasma">
                  Unlocked
                </span>
              ) : (
                <span className="font-numerals text-[11px] uppercase tracking-[0.2em] text-ion-2">
                  Locked pack
                </span>
              )}
            </div>

            {!isUnlocked && (
              <div className="text-right">
                <div className={eyebrow}>One-time purchase</div>
                <div className="mt-1 font-numerals text-3xl font-semibold tabular-nums text-ion-white">
                  ${isGuaranteedSelected && guaranteedPrice ? guaranteedPrice : standardPrice}
                </div>
              </div>
            )}
          </div>

          <h1 className="mt-5 font-display text-3xl text-ion-white sm:text-4xl">
            {pkg.title}
          </h1>
          <p className="mt-2 font-numerals text-xs uppercase tracking-[0.18em] text-ion-2">
            {pkg.subtitle}
          </p>
          <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
            {sanitizePlainFootballText(pkg.description)}
          </p>
        </header>

        {/* ── LOCKED — paywall reveal + free matchup storylines ─── */}
        {!isUnlocked && (
          <div className="mt-10 space-y-12">
            <PaywallRevealCard
              pkg={pkg}
              teasers={getRedactedTeasersForWindowSlot(pkg.windowSlot)}
              initialUnlockedWriteups={null}
              initialSessionId={searchParams.session_id || searchParams.whop_token}
            />

            <section aria-labelledby="games-covered-heading">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                <h2
                  id="games-covered-heading"
                  className="font-display text-2xl text-ion-white"
                >
                  Games Covered in This Pack ({relevantWriteups.length})
                </h2>
                <span className={eyebrow}>Free preview</span>
              </div>
              <p className="mt-3 max-w-2xl text-base leading-7 text-ion-1">
                Matchup storylines and tempo notes are free below. Unlock the pack above to reveal our official spread call, over/under call, player prop bets, and same-game parlay.
              </p>

              <ol className="mt-8 border-t border-mineral">
                {relevantWriteups.map((w, index) => (
                  <li
                    key={w.id}
                    className="border-b border-mineral py-7"
                  >
                    <article className="grid grid-cols-1 gap-x-8 gap-y-3 lg:grid-cols-[64px_minmax(0,1fr)]">
                      <p
                        aria-hidden
                        className="font-numerals text-lg tabular-nums text-ion-2"
                      >
                        {String(index + 1).padStart(2, "0")}
                      </p>
                      <div>
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                          <h3 className="font-display text-xl text-ion-white">{w.matchup}</h3>
                          <span className="font-numerals text-[11px] uppercase tracking-[0.18em] tabular-nums text-ion-2">
                            {formatWindowSlotLabel(w.windowSlot, w.matchup)}
                          </span>
                        </div>
                        <p className="mt-3 max-w-2xl text-base leading-7 text-ion-1">
                          {sanitizePlainFootballText(w.schemeMatchup.coverageShell)}
                        </p>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-ion-2">
                          {sanitizePlainFootballText(w.paceOfPlay.notes)}
                        </p>
                        <p className="mt-4 border-t border-mineral pt-3 font-numerals text-[11px] uppercase tracking-[0.18em] text-plasma">
                          Official spread call · Official over/under call · {w.topProps.length} player prop reads · 3-leg parlay — locked
                        </p>
                      </div>
                    </article>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        )}

        {/* ── UNLOCKED — full actionable picks revealed ─────────── */}
        {isUnlocked && (
          <div className="mt-10">
            <PaywallRevealCard
              pkg={pkg}
              teasers={getRedactedTeasersForWindowSlot(pkg.windowSlot)}
              initialUnlockedWriteups={relevantWriteups}
              initialSessionId={searchParams.session_id || searchParams.whop_token}
            />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
