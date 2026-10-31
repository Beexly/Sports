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
      <div className="relative min-h-screen w-full bg-slate-950 text-white">
        <Nav />
        <main id="main-content" className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-extrabold text-white">{pkg.title}</h1>
          <p className="mt-4 text-lg text-[#F3EFE6]">{pkg.description}</p>
          <p className="mt-4 text-amber-300">Green Bay 27, Carolina 19. Not for sale.</p>
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

  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-white">
      <Nav />
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-xs font-mono text-slate-300">
          <Link href="/packages" className="text-amber-400 hover:text-amber-300 transition-colors">
            ← Back to All Football Packs
          </Link>
          <span>/</span>
          <span className="text-slate-100">{pkg.title}</span>
        </div>

        {/* Header Hero */}
        <div className="rounded-2xl border-2 border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="rounded-md border border-amber-400/50 bg-amber-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
                  {pkg.badge || formatWindowSlotLabel(pkg.windowSlot)}
                </span>
                {isUnlocked ? (
                  <span className="rounded-md border border-emerald-500/50 bg-emerald-500/20 px-3 py-1 text-xs font-bold uppercase text-emerald-300">
                    ✓ UNLOCKED
                  </span>
                ) : (
                  <span className="rounded-md border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-bold uppercase text-slate-300">
                    🔒 LOCKED PACK
                  </span>
                )}
              </div>
              <h1 className="mt-3 text-2xl sm:text-4xl font-extrabold text-white">
                {pkg.title}
              </h1>
              <p className="mt-1 text-sm font-semibold text-amber-300">{pkg.subtitle}</p>
            </div>

            {!isUnlocked && (
              <div className="text-right">
                <div className="text-xs text-slate-300">One-time purchase</div>
                <div className="text-3xl font-extrabold text-amber-400">
                  ${isGuaranteedSelected && guaranteedPrice ? guaranteedPrice : standardPrice}
                </div>
              </div>
            )}
          </div>

          <p className="mt-4 text-base leading-relaxed text-[#F3EFE6] border-t border-slate-800 pt-4">
            {sanitizePlainFootballText(pkg.description)}
          </p>
        </div>

        {/* LOCKED STATE — Paywall Reveal Card + Free Matchup Storyline Teasers (Zero Leaked Picks) */}
        {!isUnlocked && (
          <div className="mt-8 space-y-8">
            <PaywallRevealCard
              pkg={pkg}
              teasers={getRedactedTeasersForWindowSlot(pkg.windowSlot)}
              initialUnlockedWriteups={null}
              initialSessionId={searchParams.session_id || searchParams.whop_token}
            />

            <section className="rounded-2xl border-2 border-slate-800 bg-slate-900 p-6 sm:p-8">
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Games Covered in This Pack ({relevantWriteups.length})
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                Matchup storylines and tempo notes are free below. Unlock the pack above to reveal our official spread call, over/under call, player prop bets, and same-game parlay.
              </p>
              <div className="mt-5 space-y-4">
                {relevantWriteups.map((w) => (
                  <div key={w.id} className="rounded-xl border border-slate-800 bg-slate-950 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-bold text-white text-base">{w.matchup}</h3>
                      <span className="text-xs font-semibold text-amber-300">
                        {formatWindowSlotLabel(w.windowSlot, w.matchup)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm sm:text-base leading-relaxed text-[#F3EFE6]">
                      {sanitizePlainFootballText(w.schemeMatchup.coverageShell)}
                    </p>
                    <p className="mt-2 text-xs sm:text-sm text-slate-300">
                      {sanitizePlainFootballText(w.paceOfPlay.notes)}
                    </p>
                    <div className="mt-3 border-t border-slate-800 pt-3 text-xs font-bold text-amber-300">
                      🔒 Official Spread Call · Official Over/Under Call · {w.topProps.length} Player Prop Reads · 3-Leg Parlay Locked
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* UNLOCKED STATE — Full Actionable Picks Revealed */}
        {isUnlocked && (
          <div className="mt-8 space-y-8">
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
