import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { getPackageBySlug, LIVE_PACKAGE_CATALOG } from "@/lib/packages/catalog";
import { verifyPackagePurchase } from "@/lib/packages/verify-purchase";
import {
  LIVE_SLATE_COACH_WRITEUPS,
  getRedactedTeasersForWindowSlot,
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

  const verification = await verifyPackagePurchase({
    sessionId: searchParams.session_id,
    whopToken: searchParams.whop_token,
    slug: pkg.slug,
  });
  const isUnlocked = verification.authorized;
  const isGuaranteedSelected = searchParams.guaranteed === "1";

  // Filter writeups relevant to package window
  const relevantWriteups: CoachGameWriteup[] = LIVE_SLATE_COACH_WRITEUPS.filter((w) => {
    if (pkg.windowSlot === "WEEKEND_PASS" || pkg.windowSlot === "WEEKLY_PASS") {
      return true;
    }
    if (pkg.windowSlot === "SUN_MAIN") {
      return w.windowSlot === "SUN_EARLY" || w.windowSlot === "SUN_LATE" || w.windowSlot === "SUN_MAIN";
    }
    return w.windowSlot === pkg.windowSlot;
  });

  const standardPrice = (pkg.standardPriceCents / 100).toFixed(2);
  const guaranteedPrice = pkg.guaranteedPriceCents
    ? (pkg.guaranteedPriceCents / 100).toFixed(2)
    : null;

  return (
    <div className="relative min-h-screen w-full bg-carbon text-ion">
      <Nav />
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-xs font-mono text-ion-2">
          <Link href="/packages" className="hover:text-plasma transition-colors">
            ← Back to All Packages
          </Link>
          <span>/</span>
          <span className="text-ion-1">{pkg.title}</span>
        </div>

        {/* Header Hero */}
        <div className="border border-mineral bg-eclipse p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="border border-plasma/30 bg-plasma/10 px-2.5 py-0.5 text-xs font-mono uppercase text-plasma">
                  {pkg.windowSlot}
                </span>
                {isUnlocked ? (
                  <span className="border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-mono uppercase text-emerald-400">
                    VIP UNLOCKED
                  </span>
                ) : (
                  <span className="border border-mineral bg-carbon px-2.5 py-0.5 text-xs font-mono uppercase text-ion-2">
                    LOCKED DOSSIER
                  </span>
                )}
              </div>
              <h1 className="mt-3 font-display text-2xl sm:text-4xl font-semibold text-ion-white">
                {pkg.title}
              </h1>
              <p className="mt-1 text-sm font-mono text-plasma">{pkg.subtitle}</p>
            </div>

            {!isUnlocked && (
              <div className="text-right">
                <div className="text-xs text-ion-2">One-time purchase:</div>
                <div className="font-display text-3xl font-bold text-ion-white">
                  ${isGuaranteedSelected && guaranteedPrice ? guaranteedPrice : standardPrice}
                </div>
                {guaranteedPrice && (
                  <div className="text-[11px] text-plasma font-mono mt-0.5">
                    {isGuaranteedSelected ? "Guaranteed Credit-Back Active" : `Guaranteed Option: $${guaranteedPrice}`}
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="mt-4 text-sm leading-6 text-ion-1 border-t border-mineral/40 pt-4">
            {pkg.description}
          </p>
        </div>

        {/* LOCKED STATE — OnlyFans-Style In-Place Paywall Vault + Teaser */}
        {!isUnlocked && (
          <div className="mt-8 space-y-8">
            <PaywallRevealCard
              pkg={pkg}
              teasers={getRedactedTeasersForWindowSlot(pkg.windowSlot)}
              initialUnlockedWriteups={null}
              initialSessionId={searchParams.session_id || searchParams.whop_token}
            />

            {/* Purchase CTA Card */}
            <div className="border border-plasma/40 bg-eclipse p-6 text-center sm:text-left sm:flex sm:items-center sm:justify-between sm:gap-6">
              <div>
                <h2 className="text-lg font-semibold text-ion-white">
                  Unlock Instant Access to {pkg.title}
                </h2>
                <p className="mt-1 text-xs text-ion-1">
                  Instant Stripe checkout · No subscription · Telegram VIP notification link included
                </p>
              </div>

              <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-3">
                <form action="/api/packages/checkout" method="POST">
                  <input type="hidden" name="packageSlug" value={pkg.slug} />
                  <input type="hidden" name="guaranteed" value={isGuaranteedSelected ? "true" : "false"} />
                  <button
                    type="submit"
                    className="btn-primary w-full sm:w-auto px-6 py-2.5 text-sm font-semibold"
                  >
                    Instant Checkout (${isGuaranteedSelected && guaranteedPrice ? guaranteedPrice : standardPrice})
                  </button>
                </form>

                {guaranteedPrice && !isGuaranteedSelected && (
                  <Link
                    href={`/packages/${pkg.slug}?guaranteed=1`}
                    className="inline-flex items-center justify-center border border-plasma/40 bg-plasma/10 px-4 py-2 text-xs font-semibold text-plasma hover:bg-plasma/20"
                  >
                    Select Guaranteed Tier (${guaranteedPrice})
                  </Link>
                )}
              </div>
            </div>

            {/* Free Slate Teaser */}
            <section className="border border-mineral bg-eclipse p-6">
              <h2 className="text-base font-semibold text-ion-white uppercase tracking-wider">
                Slate Teaser & Pace of Play Breakdown
              </h2>
              <div className="mt-4 space-y-4">
                {relevantWriteups.map((w) => (
                  <div key={w.id} className="border border-mineral/50 bg-carbon p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-ion-white text-sm">{w.matchup}</h3>
                      <span className="text-xs font-mono text-plasma">Kickoff: {new Date(w.kickoff).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3 text-xs">
                      <div className="border border-mineral/30 p-2">
                        <span className="text-ion-2 block">Neutral Pace</span>
                        <span className="font-mono text-ion-white font-semibold">{w.paceOfPlay.neutralSecPerSnap}s / snap</span>
                      </div>
                      <div className="border border-mineral/30 p-2">
                        <span className="text-ion-2 block">Pass EPA / Play</span>
                        <span className="font-mono text-ion-white font-semibold">{w.paceOfPlay.passEpaPlay > 0 ? `+${w.paceOfPlay.passEpaPlay}` : w.paceOfPlay.passEpaPlay}</span>
                      </div>
                      <div className="border border-mineral/30 p-2">
                        <span className="text-ion-2 block">No-Huddle Rate</span>
                        <span className="font-mono text-ion-white font-semibold">{Math.round(w.paceOfPlay.noHuddleRate * 100)}%</span>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-ion-1">{w.schemeMatchup.notes}</p>
                    <div className="mt-3 border-t border-mineral/30 pt-2 text-[11px] text-plasma font-mono">
                      🔒 Side Call, Total Call, Top Props & SGP Ticket Locked. Purchase package to reveal.
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* UNLOCKED STATE — Full Coach Writeup Dossier */}
        {isUnlocked && (
          <div className="mt-8 space-y-8">
            <div className="border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-mono text-emerald-300 flex items-center justify-between">
              <span>✓ UNLOCKED DOSSIER — Full Tactical Writeups & Calibrated Picks</span>
              <span>Session Verified</span>
            </div>

            {relevantWriteups.map((writeup) => (
              <div key={writeup.id} className="border border-mineral bg-eclipse p-6 sm:p-8 space-y-6">
                {/* Matchup Header */}
                <div className="border-b border-mineral pb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-mono uppercase text-plasma">{writeup.windowSlot}</span>
                    <h2 className="text-2xl font-display font-semibold text-ion-white">{writeup.matchup}</h2>
                  </div>
                  <span className="text-xs font-mono text-ion-2">Sealed Game ID: {writeup.gameId}</span>
                </div>

                {/* Tactical Scheme Breakdown */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="border border-mineral/50 bg-carbon p-4">
                    <h3 className="text-xs font-mono uppercase text-plasma">Coverage & Pressure Tendencies</h3>
                    <p className="mt-2 text-xs text-ion-1 leading-5">{writeup.schemeMatchup.coverageShell}</p>
                    <p className="mt-2 text-xs text-ion-2">{writeup.schemeMatchup.blitzRateVsPressureToSack}</p>
                  </div>
                  <div className="border border-mineral/50 bg-carbon p-4">
                    <h3 className="text-xs font-mono uppercase text-plasma">Pace of Play & Tempo</h3>
                    <p className="mt-2 text-xs text-ion-1 leading-5">{writeup.paceOfPlay.notes}</p>
                    <div className="mt-2 text-xs font-mono text-ion-2">
                      Neutral Snap: {writeup.paceOfPlay.neutralSecPerSnap}s · No-Huddle: {Math.round(writeup.paceOfPlay.noHuddleRate * 100)}%
                    </div>
                  </div>
                </div>

                {/* Calibrated Side & Total Call (CONFIDENCE strictly XX/100, NEVER %) */}
                <div className="border border-plasma/40 bg-carbon p-5">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-plasma">
                    Official Side & Total Picks (Calibrated Positive CLV Only)
                  </h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="border border-mineral p-3.5 bg-eclipse">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-ion-2">Side Call:</span>
                        <span className="text-xs font-mono text-emerald-400">Decision: {writeup.sideTotalCall.sideDecision}</span>
                      </div>
                      <div className="mt-1 font-display text-xl font-bold text-ion-white">
                        {writeup.sideTotalCall.sideSelection}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs font-mono border-t border-mineral/40 pt-2">
                        <span className="text-ion-1">Confidence: <span className="text-plasma font-semibold">{writeup.sideTotalCall.sideConfidence}</span></span>
                        <span className="text-ion-2">Exp CLV: +{(writeup.sideTotalCall.sideExpectedClv * 100).toFixed(1)}c</span>
                      </div>
                    </div>

                    <div className="border border-mineral p-3.5 bg-eclipse">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-ion-2">Total Call:</span>
                        <span className="text-xs font-mono text-emerald-400">Decision: {writeup.sideTotalCall.totalDecision}</span>
                      </div>
                      <div className="mt-1 font-display text-xl font-bold text-ion-white">
                        {writeup.sideTotalCall.totalSelection}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs font-mono border-t border-mineral/40 pt-2">
                        <span className="text-ion-1">Confidence: <span className="text-plasma font-semibold">{writeup.sideTotalCall.totalConfidence}</span></span>
                        <span className="text-ion-2">Exp CLV: +{(writeup.sideTotalCall.totalExpectedClv * 100).toFixed(1)}c</span>
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-ion-1 leading-5">{writeup.sideTotalCall.rationale}</p>
                </div>

                {/* Top Player Props with N_eff Volume Notes */}
                {writeup.topProps.length > 0 && (
                  <div>
                    <h3 className="text-xs font-mono uppercase tracking-wider text-plasma">
                      Top Player Props · N_eff Target Usage Edges
                    </h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {writeup.topProps.map((prop) => (
                        <div key={prop.playerId} className="border border-mineral bg-carbon p-3.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-ion-white text-sm">{prop.playerName}</span>
                            <span className="text-xs font-mono text-plasma">{prop.propType}</span>
                          </div>
                          <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-base font-bold text-ion-white">{prop.side} {prop.line}</span>
                            <span className="text-xs font-mono text-ion-1">Conf: <span className="text-plasma">{prop.confidence}</span></span>
                          </div>
                          <p className="mt-2 text-xs text-ion-2 border-t border-mineral/30 pt-1.5">{prop.nEffTargetNotes}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Correlated SGP Ticket */}
                {writeup.correlatedSgpTicket && (
                  <div className="border border-mineral bg-carbon p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-mono uppercase text-plasma">
                        {writeup.correlatedSgpTicket.title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs font-mono">
                        <span className="text-ion-2">Fair: {writeup.correlatedSgpTicket.fairOdds}</span>
                        <span className="text-plasma font-semibold">Market: {writeup.correlatedSgpTicket.marketOdds}</span>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      {writeup.correlatedSgpTicket.legs.map((leg, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs border border-mineral/30 bg-eclipse px-3 py-2">
                          <span className="text-ion-white">{leg.description}</span>
                          <span className="font-mono text-plasma">Conf: {leg.confidence}</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-ion-2">{writeup.correlatedSgpTicket.correlationRationale}</p>
                  </div>
                )}

                {/* DFS Stacks Blueprint */}
                {writeup.dfsStacks && (
                  <div className="border border-mineral bg-carbon p-4">
                    <h3 className="text-xs font-mono uppercase text-plasma">DFS Blueprint (Captain & Tournament Stacks)</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3 text-xs">
                      <div className="border border-mineral/30 p-2.5 bg-eclipse">
                        <span className="text-ion-2 block font-mono">Captain Picks:</span>
                        {writeup.dfsStacks.captainPicks.map((c, i) => (
                          <div key={i} className="mt-1">
                            <div className="font-semibold text-ion-white">{c.player} ({c.position})</div>
                            <div className="text-[10px] text-ion-2">{c.leverageNote}</div>
                          </div>
                        ))}
                      </div>

                      <div className="border border-mineral/30 p-2.5 bg-eclipse">
                        <span className="text-ion-2 block font-mono">Cash Core:</span>
                        {writeup.dfsStacks.cashCore.map((c, i) => (
                          <div key={i} className="mt-1">
                            <div className="font-semibold text-ion-white">{c.player} ({c.position})</div>
                            <div className="text-[10px] text-ion-2">{c.floorNote}</div>
                          </div>
                        ))}
                      </div>

                      <div className="border border-mineral/30 p-2.5 bg-eclipse">
                        <span className="text-ion-2 block font-mono">GPP Tournament Stack:</span>
                        {writeup.dfsStacks.gppStacks.map((g, i) => (
                          <div key={i} className="mt-1">
                            <div className="font-semibold text-ion-white">{g.primaryStack.qb} + {g.primaryStack.passCatchers.join(", ")}</div>
                            <div className="text-[10px] text-ion-2">Bring-back: {g.bringBack}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Quad-Engine Citations */}
                <div className="border-t border-mineral/40 pt-3 flex flex-wrap items-center gap-2 text-[10px] font-mono text-ion-2">
                  <span className="text-ion-1">Citations:</span>
                  {[...writeup.quadEngineCitations.arxiv, ...writeup.quadEngineCitations.openalex, ...writeup.quadEngineCitations.kaggle, ...writeup.quadEngineCitations.hf].map((cit, idx) => (
                    <span key={idx} className="border border-mineral/30 bg-carbon px-1.5 py-0.5">
                      {cit}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
