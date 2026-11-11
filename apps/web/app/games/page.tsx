import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { getCurrentWeek10Slate } from "@/lib/live-board/current-slate-loader";

export const metadata: Metadata = {
  title: "Week 10 NFL Games & Pre-Kickoff SHA-256 Commitments | Galaxy Sports Edge",
  description:
    "All 14 NFL Week 10 matchups starting with Thursday Night Football (WSH @ NYG, 401873052), including market lines, kickoff times, and pre-kickoff SHA-256 Merkle commitment hashes.",
  alternates: { canonical: "/games" },
};

export default function GamesHubPage(): JSX.Element {
  const slate = getCurrentWeek10Slate();

  return (
    <div className="min-h-screen bg-[#08090C] text-[#EDE8E0]">
      <Nav />
      <main id="main-content" className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="border-b border-slate-800 pb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400">
            Week {slate.activeWeek} Pre-Kickoff Merkle-Sealed Slate ({slate.gamesCount} Games)
          </div>
          <h1 className="mt-4 font-display text-4xl uppercase sm:text-6xl text-white">
            Week {slate.activeWeek} NFL Matchups &amp; Hash Commitments
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-300">
            Every Week {slate.activeWeek} matchup below is timestamped prior to kickoff (<code className="text-emerald-400">effective_at_utc &lt; kickoff_utc</code>) under Merkle root{" "}
            <code className="text-cyan-300">{slate.merkleRootSha256}</code>. Official sides, totals, player props, and Same-Game Parlay legs unlock inside our{" "}
            <Link href="/packages" className="text-emerald-400 underline">
              Week 10 Storefront
            </Link>
            .
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {slate.games.map((game) => (
            <div
              key={game.event_id}
              className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                  <span className="font-mono">ESPN #{game.event_id}</span>
                  <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
                    PRE-KICKOFF SEALED
                  </span>
                </div>
                <h2 className="mt-2 font-display text-2xl uppercase text-white">{game.matchup}</h2>
                <p className="mt-1 text-xs text-slate-400">Kickoff (UTC): {game.kickoff_utc}</p>
                <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs">
                  <div>
                    <div className="text-slate-400">Market Home Spread</div>
                    <div className="mt-0.5 font-mono font-bold text-white">
                      {game.market_home_spread > 0 ? `+${game.market_home_spread}` : game.market_home_spread}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Market Total</div>
                    <div className="mt-0.5 font-mono font-bold text-white">{game.market_total}</div>
                  </div>
                </div>
                <div className="mt-3 font-mono text-[11px] text-slate-400 break-all">
                  Leaf SHA-256: {game.leaf_sha256}
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-3 text-xs font-bold">
                <Link href="/packages" className="text-emerald-400 hover:underline">
                  Unlock Game Pack →
                </Link>
                <Link href="/calibration" className="text-slate-400 hover:text-white">
                  Verify Seal →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
