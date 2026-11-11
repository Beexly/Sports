import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { SealedTable } from "@/components/week8/sealed-table";
import { getCurrentWeek10Slate } from "@/lib/live-board/current-slate-loader";

export const metadata: Metadata = {
  title: "Week 10 Sealed Board & Public Glass Ledger | Galaxy Sports Edge",
  description:
    "NFL Public Glass Ledger: Weeks 8-9 staked 43-17-1 (+22.20u, n=61), Week 8 staked 36-13-1 (+20.14u, n=50), Week 8 all-in 47-19-1 (+24.92u, n=67). Live Week 10 pre-kickoff SHA-256 Merkle commitments starting with WSH @ NYG TNF.",
  alternates: { canonical: "/board" },
};

export default function BoardPage(): JSX.Element {
  const slate = getCurrentWeek10Slate();
  const card = slate.settledCardArchive;
  const lockedMain = card.main.filter((row) => row.publishAllowed && row.decision === "PUBLISH");
  const lockedProps = card.props.filter((row) => row.publishAllowed && row.decision === "PUBLISH");

  return (
    <div className="min-h-screen bg-[#08090C] text-[#EDE8E0]">
      <Nav />
      <main id="main-content" className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        {/* Verification Ledger Header */}
        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-[#0c0e14] p-6 sm:p-10 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Week {slate.activeWeek} Pre-Kickoff Merkle Board &amp; Glass Ledger
            </span>
            <span className="font-mono text-xs text-slate-400">
              Week {slate.activeWeek} Merkle {slate.merkleRootSha256.slice(0, 16)}...
            </span>
          </div>

          <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="text-xs uppercase tracking-wider text-slate-400">Weeks 8–9 Staked Main/Deriv</div>
              <div className="mt-1 font-mono text-3xl font-extrabold text-emerald-400">
                {slate.scopes.weeks8_9_cumulative_staked.record}
              </div>
              <div className="text-xs text-slate-400">
                {slate.scopes.weeks8_9_cumulative_staked.net_units_display} · n={slate.scopes.weeks8_9_cumulative_staked.n} (Week 8: 36-13-1 +20.14u)
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="text-xs uppercase tracking-wider text-slate-400">Week 8 All-In &amp; Base Views</div>
              <div className="mt-1 font-mono text-3xl font-extrabold text-cyan-400">47-19-1</div>
              <div className="text-xs text-slate-400">
                +24.92u (n=67) · Base 38-13-1 (+22.85u, n=52) · W8-9 All-In 54-23-1
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="text-xs uppercase tracking-wider text-slate-400">Week {slate.activeWeek} Active Slate</div>
              <div className="mt-1 font-mono text-3xl font-extrabold text-amber-400">{slate.gamesCount} Games</div>
              <div className="text-xs text-slate-400">
                Starts Thu {slate.tnfGame.matchup} ({slate.tnfGame.kickoff_utc})
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="text-xs uppercase tracking-wider text-slate-400">Evaluated Markets</div>
              <div className="mt-1 font-mono text-3xl font-extrabold text-white">{card.counts.evaluated}</div>
              <div className="text-xs text-slate-400">Strict Pass Discipline Gate</div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold">
            <Link
              href="/packages"
              className="rounded-lg bg-emerald-500 hover:bg-emerald-400 px-5 py-2.5 text-black transition-colors"
            >
              Unlock Week 10 Slate ($19 TNF / $49 All-Access) →
            </Link>
            <Link
              href="/games"
              className="rounded-lg border border-slate-700 bg-slate-800 hover:border-slate-500 px-5 py-2.5 text-slate-200 transition-colors"
            >
              Week 10 Games &amp; SHA-256 Seals →
            </Link>
            <Link
              href="/calibration"
              className="rounded-lg border border-slate-700 bg-slate-800 hover:border-slate-500 px-5 py-2.5 text-slate-200 transition-colors"
            >
              View Calibration Proof Room →
            </Link>
          </div>
        </div>

        {/* Section 0: Week 10 Pre-Kickoff Sealed Slate Summary */}
        <div className="mt-12 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-xl font-bold uppercase text-white">
                Week {slate.activeWeek} Pre-Kickoff SHA-256 Merkle Commitments ({slate.gamesCount} Matchups)
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Every Week 10 matchup is pre-kickoff committed (`effective_at_utc &lt; kickoff_utc`) starting with Thursday Night Football ({slate.tnfGame.matchup}).
              </p>
            </div>
            <Link href="/games" className="text-xs font-mono text-emerald-400 hover:underline">
              Inspect All 14 Game Leaves →
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
            {slate.games.slice(0, 4).map((g) => (
              <div key={g.event_id} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                <div className="font-bold text-white">{g.matchup}</div>
                <div className="mt-1 text-slate-400">Kickoff: {g.kickoff_utc}</div>
                <div className="mt-1 text-emerald-400">
                  Line: Home {g.market_home_spread} · O/U {g.market_total}
                </div>
                <div className="mt-1 font-mono text-[10px] text-slate-400">
                  SHA-256: {g.leaf_sha256.slice(0, 14)}…
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 1: Official Main Game Calls */}
        <div className="mt-14">
          <div className="flex items-baseline justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-2xl font-bold uppercase tracking-tight text-white sm:text-3xl">
                Official Main Game Calls ({lockedMain.length})
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Built from coaching tendencies, offensive &amp; defensive line trench matchups, active injury reports, and de-vigged line comparisons.
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-400">Top 2 Free · Remaining Locked</span>
          </div>

          <div className="mt-6">
            <SealedTable rows={lockedMain} freeLimit={2} />
          </div>
        </div>

        {/* Section 2: Player Props & Derivative Watchlist */}
        <div className="mt-16">
          <div className="flex items-baseline justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-2xl font-bold uppercase tracking-tight text-white sm:text-3xl">
                Player Props &amp; Derivative Watchlist ({lockedProps.length})
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Injury target &amp; carry redistribution, depth chart matchup edges, and four-quarter role projections.
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-400">Top 2 Free · Remaining Locked</span>
          </div>

          <div className="mt-6">
            <SealedTable rows={lockedProps} freeLimit={2} />
          </div>
        </div>

        {/* Section 3: 5-Step Football Breakdown Summary */}
        <div className="mt-16 rounded-xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
          <h3 className="text-xl font-bold text-white">How We Grade the Slate: 5-Step Football Breakdown</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Unlike generic tout sheets that recycle box scores, every play on this board must clear all five football and line-value checks. If a line does not give us clear value against the de-vigged sportsbook price, we mark it <code className="text-amber-400">PASS · NO BET</code>.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-5 text-xs text-slate-400">
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
              <div className="font-bold text-emerald-400">Step 1</div>
              <div className="mt-1 text-slate-200">Film &amp; Injury Check</div>
              <div className="mt-1">Active depth charts, practice participation &amp; vacated snaps</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
              <div className="font-bold text-emerald-400">Step 2</div>
              <div className="mt-1 text-slate-200">Snap &amp; Drive Script</div>
              <div className="mt-1">Play-calling tendencies across all four quarters</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
              <div className="font-bold text-emerald-400">Step 3</div>
              <div className="mt-1 text-slate-200">Trench &amp; Coverage</div>
              <div className="mt-1">Pass protection vs pressure rate &amp; man/zone shells</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
              <div className="font-bold text-emerald-400">Step 4</div>
              <div className="mt-1 text-slate-200">Situational Spot</div>
              <div className="mt-1">Short-week rest, travel, weather &amp; fourth-quarter pace</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
              <div className="font-bold text-emerald-400">Step 5</div>
              <div className="mt-1 text-slate-200">Line Value &amp; Pass Gate</div>
              <div className="mt-1">De-vigged sportsbook comparison &amp; strict pass discipline</div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
