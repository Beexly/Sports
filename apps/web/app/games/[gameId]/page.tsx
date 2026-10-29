import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import {
  LIVE_SLATE_COACH_WRITEUPS,
  formatWindowSlotLabel,
  sanitizePlainFootballText,
  type CoachGameWriteup,
} from "@/lib/writeups/coach-writeup-engine";

export const dynamic = "force-dynamic";

interface GameDetailPageProps {
  params: { gameId: string };
}

function resolveGameWriteup(gameId: string): CoachGameWriteup | undefined {
  const clean = gameId.toLowerCase().replace(/[^a-z0-9]/g, "");
  return (
    LIVE_SLATE_COACH_WRITEUPS.find((w) => {
      if (w.gameId.toLowerCase() === gameId.toLowerCase()) return true;
      if (w.id.toLowerCase() === gameId.toLowerCase()) return true;
      const matchClean = w.matchup.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (matchClean.includes(clean) || clean.includes(matchClean)) return true;
      const awayClean = w.awayTeam.toLowerCase().replace(/[^a-z0-9]/g, "");
      const homeClean = w.homeTeam.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (clean.includes(awayClean) && clean.includes(homeClean)) return true;
      return false;
    }) || LIVE_SLATE_COACH_WRITEUPS[0]
  );
}

export async function generateMetadata({ params }: GameDetailPageProps): Promise<Metadata> {
  const writeup = resolveGameWriteup(params.gameId);
  if (!writeup) return { title: "Game Matchup Preview | Galaxy Sports Edge" };
  return {
    title: `${writeup.matchup} Matchup Preview | Galaxy Sports Edge`,
    description: `Plain-English football matchup preview, offensive and defensive line notes, and locked official picks for ${writeup.matchup}.`,
  };
}

export default function GamePage({ params }: GameDetailPageProps): JSX.Element {
  const writeup = resolveGameWriteup(params.gameId);
  if (!writeup) {
    notFound();
  }

  const slotLabel = formatWindowSlotLabel(writeup.windowSlot, writeup.matchup);

  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-white">
      <Nav />
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-2 text-xs font-mono text-slate-300">
          <Link href="/packages" className="text-amber-400 hover:text-amber-300 transition-colors">
            ← Back to Football Packs
          </Link>
          <span>/</span>
          <span className="text-slate-100">{writeup.matchup}</span>
        </div>

        {/* Hero Matchup Header */}
        <div className="rounded-2xl border-2 border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-md bg-amber-500/20 border border-amber-400/50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
              {slotLabel}
            </span>
            <span className="font-mono text-xs sm:text-sm font-semibold text-slate-300">
              Kickoff:{" "}
              {new Date(writeup.kickoff).toLocaleString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                timeZoneName: "short",
              })}
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            {writeup.matchup}
          </h1>

          <p className="mt-3 text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
            {sanitizePlainFootballText(writeup.schemeMatchup.coverageShell)}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/packages"
              className="inline-flex items-center justify-center rounded-lg bg-emerald-500 hover:bg-emerald-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition-colors shadow-md"
            >
              Unlock Official Picks in Galaxy Picks →
            </Link>
            <Link
              href="/fantasy/dfs"
              className="inline-flex items-center justify-center rounded-lg border-2 border-slate-700 bg-slate-800 hover:border-amber-400 px-5 py-2.5 text-sm font-bold text-white transition-colors"
            >
              DFS Lineup Blueprint →
            </Link>
          </div>
        </div>

        {/* Free Football Storylines & Trench Matchup */}
        <section className="mt-8 rounded-2xl border-2 border-slate-800 bg-slate-900/90 p-6 sm:p-8">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              What Matters on the Field
            </h2>
            <p className="mt-1 text-sm sm:text-base text-slate-200">
              How the offensive and defensive lines, pass rush, and tempo shape this game.
            </p>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-300">
                Line of Scrimmage &amp; Pass Protection
              </h3>
              <p className="mt-3 text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
                {sanitizePlainFootballText(writeup.schemeMatchup.blitzRateVsPressureToSack)}
              </p>
              <p className="mt-3 text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
                {sanitizePlainFootballText(writeup.schemeMatchup.coachingEdge)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-300">
                Pace, Clock Control &amp; Key Playmakers
              </h3>
              <p className="mt-3 text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
                {sanitizePlainFootballText(writeup.paceOfPlay.notes)}
              </p>
              <p className="mt-3 text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
                {sanitizePlainFootballText(writeup.schemeMatchup.personnelTendencies)}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-5">
            <p className="font-mono text-xs sm:text-sm text-slate-200">
              {sanitizePlainFootballText(writeup.schemeMatchup.notes)}
            </p>
          </div>
        </section>

        {/* Locked Official Picks Card — ZERO leaked picks, sides, totals, or confidence numbers */}
        <section className="mt-8 rounded-2xl border-2 border-amber-500/40 bg-slate-900 p-6 sm:p-8 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/20 border border-amber-400/50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
                🔒 Official Picks Locked
              </span>
              <h2 className="mt-3 text-xl sm:text-2xl font-bold text-white">
                Unlock Our Official {writeup.matchup} Card
              </h2>
            </div>
            <Link
              href="/packages"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-500 hover:bg-emerald-400 px-6 py-3 text-sm font-extrabold text-slate-950 transition-colors shadow-lg"
            >
              Unlock in Galaxy Picks →
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Official Spread Call
              </div>
              <div className="mt-2 font-mono text-base font-bold text-amber-300">
                🔒 Locked Until Purchase
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                Exact side recommendation or disciplined pass call revealed immediately after unlock.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Official Over/Under Call
              </div>
              <div className="mt-2 font-mono text-base font-bold text-amber-300">
                🔒 Locked Until Purchase
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                Full total verdict and plain-English explanation revealed inside the pack.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Player Props &amp; Same-Game Parlay
              </div>
              <div className="mt-2 font-mono text-base font-bold text-amber-300">
                🔒 {writeup.topProps.length} Prop Reads Locked
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                Receiving and rushing yardage props plus our 3-leg same-game parlay ticket.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
