import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import {
  LIVE_SLATE_COACH_WRITEUPS,
  type CoachGameWriteup,
} from "@/lib/writeups/coach-writeup-engine";
import { sanitizePlainFootballText } from "@/components/packages/paywall-reveal-card";

export const dynamic = "force-dynamic";

interface GameSlugPageProps {
  params: { slug: string };
}

function resolveGameWriteup(slug: string): CoachGameWriteup | undefined {
  const clean = slug.toLowerCase().replace(/[^a-z0-9]/g, "");
  return LIVE_SLATE_COACH_WRITEUPS.find((w) => {
    if (w.gameId.toLowerCase() === slug.toLowerCase()) return true;
    if (w.id.toLowerCase() === slug.toLowerCase()) return true;
    const matchClean = w.matchup.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (matchClean.includes(clean) || clean.includes(matchClean)) return true;
    const awayClean = w.awayTeam.toLowerCase().replace(/[^a-z0-9]/g, "");
    const homeClean = w.homeTeam.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (clean.includes(awayClean) && clean.includes(homeClean)) return true;
    return false;
  }) || LIVE_SLATE_COACH_WRITEUPS[0];
}

export async function generateMetadata({ params }: GameSlugPageProps): Promise<Metadata> {
  const writeup = resolveGameWriteup(params.slug);
  if (!writeup) return { title: "Game Dossier | Galaxy Sports Edge" };
  return {
    title: `${writeup.matchup} Game Dossier | Galaxy Sports Edge`,
    description: `Full plain-English game breakdown, coaching matchups, pace analysis, and betting decisions for ${writeup.matchup}.`,
  };
}

export default function GameDossierPage({ params }: GameSlugPageProps): JSX.Element {
  const writeup = resolveGameWriteup(params.slug);
  if (!writeup) {
    notFound();
  }

  const sidePlay = writeup.sideTotalCall.sideDecision === "PLAY";
  const totalPlay = writeup.sideTotalCall.totalDecision === "PLAY";

  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-white">
      <Nav />
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-xs font-mono text-slate-300">
          <Link href="/packages" className="text-amber-400 hover:text-amber-300 transition-colors">
            ← Back to Packages
          </Link>
          <span>/</span>
          <span className="text-slate-100">{writeup.matchup}</span>
        </div>

        {/* Hero Header */}
        <div className="rounded-2xl border-2 border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-md bg-amber-500/20 border border-amber-400/50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
              {writeup.windowSlot === "TNF" ? "TONIGHT · TNF" : `${writeup.windowSlot} SLATE`}
            </span>
            <span className="font-mono text-xs sm:text-sm font-semibold text-slate-300">
              Kickoff: {new Date(writeup.kickoff).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit", timeZoneName: "short" })}
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            {writeup.matchup}
          </h1>

          <p className="mt-3 text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
            Official game dossier and matchup analysis. We examine coordinator tendencies, offensive and defensive line battles, injury impacts, and neutral pace to determine which bets hold true value.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/packages"
              className="inline-flex items-center justify-center rounded-lg bg-emerald-500 hover:bg-emerald-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition-colors shadow-md"
            >
              Unlock This Slate in Galaxy Picks →
            </Link>
            <Link
              href="/fantasy/dfs"
              className="inline-flex items-center justify-center rounded-lg border-2 border-slate-700 bg-slate-800 hover:border-amber-400 px-5 py-2.5 text-sm font-bold text-white transition-colors"
            >
              DFS Lineup Blueprint →
            </Link>
          </div>
        </div>

        {/* Tactical Schemes & Coaching Matchup */}
        <section className="mt-8 rounded-2xl border-2 border-slate-800 bg-slate-900/90 p-6 sm:p-8">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Tactical Matchup &amp; Coaching Breakdown
            </h2>
            <p className="mt-1 text-sm sm:text-base text-slate-200">
              Coaching tendencies, defensive coverage rotation, and trench protection dynamics.
            </p>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-300">
                Coverage Shell &amp; Defensive Pressure
              </h3>
              <p className="mt-3 text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
                {sanitizePlainFootballText(writeup.schemeMatchup.coverageShell)}
              </p>
              <p className="mt-3 text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
                {sanitizePlainFootballText(writeup.schemeMatchup.blitzRateVsPressureToSack)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-300">
                Pace of Play, Tempo &amp; Clock Control
              </h3>
              <p className="mt-3 text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
                {sanitizePlainFootballText(writeup.paceOfPlay.notes)}
              </p>
              <p className="mt-3 text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
                {sanitizePlainFootballText(writeup.schemeMatchup.personnelTendencies)}
              </p>
            </div>
          </div>

          {writeup.schemeMatchup.coachingEdge && (
            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-300">
                Coaching &amp; Execution Edge
              </h3>
              <p className="mt-2 text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
                {sanitizePlainFootballText(writeup.schemeMatchup.coachingEdge)}
              </p>
            </div>
          )}
        </section>

        {/* Official Side & Total Calls */}
        <section className="mt-8 rounded-2xl border-2 border-slate-800 bg-slate-900/90 p-6 sm:p-8">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Official Spread &amp; Total Betting Verdicts
            </h2>
            <p className="mt-1 text-sm sm:text-base text-slate-200">
              Only plays with verified mathematical edge receive a PLAY badge. When the book price is fair, we pass.
            </p>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {/* Spread Call */}
            <div className="rounded-xl border-2 border-slate-800 bg-slate-950 p-6">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  SPREAD CALL
                </span>
                {sidePlay ? (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 font-bold tracking-wide shadow-sm px-3 py-1 rounded-md text-xs sm:text-sm">
                    PLAY
                  </span>
                ) : (
                  <span className="bg-amber-500/20 text-amber-200 border border-amber-400/50 font-semibold tracking-wide px-3 py-1 rounded-md text-xs sm:text-sm">
                    PASS — NO BET
                  </span>
                )}
              </div>

              <div className="mt-3 font-mono text-xl sm:text-2xl font-bold text-white tabular-nums">
                {sidePlay ? writeup.sideTotalCall.sideSelection : "No Edge — Market Fair"}
              </div>

              <div className="mt-2 flex items-center justify-between border-t border-slate-800 pt-3">
                <span className="text-xs text-slate-300 font-mono">Confidence Rating:</span>
                <span className="font-mono text-base sm:text-lg font-bold text-white tabular-nums">
                  {writeup.sideTotalCall.sideConfidence}
                </span>
              </div>
            </div>

            {/* Total Call */}
            <div className="rounded-xl border-2 border-slate-800 bg-slate-950 p-6">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  TOTAL CALL
                </span>
                {totalPlay ? (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 font-bold tracking-wide shadow-sm px-3 py-1 rounded-md text-xs sm:text-sm">
                    PLAY
                  </span>
                ) : (
                  <span className="bg-amber-500/20 text-amber-200 border border-amber-400/50 font-semibold tracking-wide px-3 py-1 rounded-md text-xs sm:text-sm">
                    PASS — NO BET
                  </span>
                )}
              </div>

              <div className="mt-3 font-mono text-xl sm:text-2xl font-bold text-white tabular-nums">
                {totalPlay ? writeup.sideTotalCall.totalSelection : "No Edge — Market Fair"}
              </div>

              <div className="mt-2 flex items-center justify-between border-t border-slate-800 pt-3">
                <span className="text-xs text-slate-300 font-mono">Confidence Rating:</span>
                <span className="font-mono text-base sm:text-lg font-bold text-white tabular-nums">
                  {writeup.sideTotalCall.totalConfidence}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Why We Take This Position
            </h3>
            <p className="mt-2 text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
              {sanitizePlainFootballText(writeup.sideTotalCall.rationale)}
            </p>
          </div>
        </section>

        {/* Top Player Props */}
        {writeup.topProps.length > 0 && (
          <section className="mt-8 rounded-2xl border-2 border-slate-800 bg-slate-900/90 p-6 sm:p-8">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Player Prop Analysis &amp; Target Distribution
              </h2>
              <p className="mt-1 text-sm sm:text-base text-slate-200">
                Individual player usage, defensive mismatches, and volume expectations.
              </p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {writeup.topProps.map((prop, idx) => {
                const propPlay = prop.decision === "PLAY";
                return (
                  <div
                    key={`${prop.playerId}-${idx}`}
                    className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950 p-5"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-base font-bold text-white">{prop.playerName}</span>
                        {propPlay ? (
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 font-bold tracking-wide shadow-sm px-2.5 py-0.5 rounded text-xs">
                            PLAY
                          </span>
                        ) : (
                          <span className="bg-amber-500/20 text-amber-200 border border-amber-400/50 font-semibold tracking-wide px-2.5 py-0.5 rounded text-xs">
                            PASS — NO BET
                          </span>
                        )}
                      </div>

                      <div className="mt-2 font-mono text-base sm:text-lg font-bold text-white tabular-nums">
                        {prop.side} {prop.line} {prop.propType}
                      </div>

                      <p className="mt-3 text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
                        {sanitizePlainFootballText(prop.nEffTargetNotes)}
                      </p>
                    </div>

                    <div className="mt-4 border-t border-slate-800 pt-3 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-300">Confidence:</span>
                      <span className="font-mono text-base font-bold text-white tabular-nums">
                        {prop.confidence}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Correlated Same-Game Parlay */}
        {writeup.correlatedSgpTicket && (
          <section className="mt-8 rounded-2xl border-2 border-slate-800 bg-slate-900/90 p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  Correlated Same-Game Parlay
                </h2>
                <p className="mt-1 text-sm sm:text-base text-slate-200">
                  {sanitizePlainFootballText(writeup.correlatedSgpTicket.title)}
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm font-mono">
                <span className="text-slate-300">
                  Book Odds: <span className="font-mono text-base sm:text-lg font-bold text-white tabular-nums">{writeup.correlatedSgpTicket.marketOdds}</span>
                </span>
                <span className="text-slate-300">
                  Fair Odds: <span className="font-mono text-base sm:text-lg font-bold text-white tabular-nums">{writeup.correlatedSgpTicket.fairOdds}</span>
                </span>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {writeup.correlatedSgpTicket.legs.map((leg, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-3.5 text-sm"
                >
                  <span className="font-semibold text-white">
                    • {sanitizePlainFootballText(leg.description)}
                  </span>
                  <span className="font-mono text-sm font-bold text-slate-200">
                    Confidence: <span className="font-mono text-base font-bold text-white tabular-nums">{leg.confidence}</span>
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-4 text-base sm:text-[17px] leading-relaxed text-[#F3EFE6] border-t border-slate-800 pt-4">
              {sanitizePlainFootballText(writeup.correlatedSgpTicket.correlationRationale)}
            </p>
          </section>
        )}

        {/* Bottom CTA to Packages */}
        <div className="mt-10 rounded-2xl border-2 border-amber-500/50 bg-slate-900 p-6 sm:p-8 text-center shadow-xl">
          <h3 className="text-2xl font-bold text-white">
            Unlock All Week 8 Plays &amp; Best Bets
          </h3>
          <p className="mt-2 text-base sm:text-[17px] leading-relaxed text-[#F3EFE6] max-w-2xl mx-auto">
            Get instant on-screen access to every side, total, top player prop, and Same-Game Parlay with zero subscription required.
          </p>
          <div className="mt-6">
            <Link
              href="/packages"
              className="inline-flex items-center justify-center rounded-lg bg-emerald-500 hover:bg-emerald-400 px-8 py-3 text-base font-bold text-slate-950 shadow-lg transition-colors"
            >
              Choose Your Betting Pack →
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
