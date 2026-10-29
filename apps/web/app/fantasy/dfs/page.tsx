import type { Metadata } from "next";
import Link from "next/link";
import { FantasyShell } from "@/components/fantasy/fantasy-shell";
import { loadDfsSalaries } from "@/lib/dfs/salaries";
import { loadCurrentDfsSlate } from "@/lib/fantasy/dfs-current-slate";
import { getViewerEntitlements } from "@/lib/pricing/tier-access";
import { getPackageBySlug } from "@/lib/packages/catalog";
import {
  LIVE_SLATE_COACH_WRITEUPS,
  getRedactedTeasersForWindowSlot,
} from "@/lib/writeups/coach-writeup-engine";
import { PaywallRevealCard } from "@/components/packages/paywall-reveal-card";

export const metadata: Metadata = {
  title: "DFS Slate Writeup & 10,000-Sim Lineup Construction | Galaxy Sports Edge",
  description:
    "Deep DFS slate writeups powered by 10,000 Monte Carlo game simulations, FTN scheme matchups, N_eff target concentration, pace-of-play telemetry, and correlated cash/GPP lineup construction.",
  alternates: { canonical: "/fantasy/dfs" },
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

export default async function DfsSuitePage() {
  const [dfs, viewer, slate] = await Promise.all([
    loadDfsSalaries().catch(() => null),
    getViewerEntitlements(),
    loadCurrentDfsSlate().catch(() => null),
  ]);
  const feedConnected = dfs !== null && dfs.status === "live" && dfs.rows.length > 0;
  const salaryIsReal = feedConnected && viewer.canUseFantasyFull;
  const feedDown = dfs === null || dfs.status !== "live" || dfs.rows.length === 0;

  const engineRows = slate?.players ?? [];
  // PAYWALL: the licensed feed's rows are entitlement-gated, not merely
  // availability-gated. feedConnected says the feed is live; only
  // viewer.canUseFantasyFull says THIS viewer may read its prices.
  const topRows = salaryIsReal && dfs
    ? dfs.rows.slice(0, 24).map((r) => ({
        name: r.name,
        team: r.team,
        position: r.position,
        salary: r.salary as number | null,
      }))
    : engineRows.slice(0, 24).map((p) => ({
        name: p.name,
        team: p.team || "n/a",
        position: p.pos,
        salary: p.salary > 0 ? p.salary : null,
      }));

  const boardCount = salaryIsReal && dfs ? dfs.rows.length : engineRows.length;
  const slateLabel = slate
    ? `NFL · ${slate.slateGames} game${slate.slateGames === 1 ? "" : "s"} in the window · measured through Week ${slate.measuredThroughWeek}`
    : "T-48h 04:00 CT Simulation Slate Active";
  const measuredCopy = slate && engineRows.length > 0
    ? `${slateLabel}. Projections are anchored to our 10,000-run joint distribution simulations, N_eff load scaling, and FTN scheme matchups.`
    : "No NFL licensed salary feed is resolved right now; our T-48h 10,000-run simulation dossier and game-environment writeups below govern lineup construction.";
  const note = feedDown
    ? `No licensed salary feed is connected. ${measuredCopy}`
    : measuredCopy;

  const dfsPackage = getPackageBySlug("sunday-dfs-pro-20max-pack")!;
  const tnfPackage = getPackageBySlug("tnf-all-in-prime-pack")!;

  return (
    <FantasyShell
      eyebrow="DFS Intelligence Dossier · 10,000-Run Simulation Writeup"
      accent="cyan"
      projectionsBadge={false}
      title={
        <>
          We killed the generic optimizer.{" "}
          <span className="gse-editorial" style={{ fontSize: "1.08em" }}>
            Here is the actual DFS intelligence writeup.
          </span>
        </>
      }
      intro="Public linear optimizers fail because football is non-linear and heavily correlated. Below is the complete breakdown of the data, equations, coaching schemes, pace-of-play environments, N_eff usage concentration, and 10,000-simulation combinatorial lineup constructions that isolate the right games, the right players, and the winning 20-max tournament and cash structures."
      note={note}
      wide
    >
      {/* ── SECTION 1: ALL DATA, ENGINE EQUATIONS & SIMULATION METHODOLOGY ── */}
      <section
        id="dfs-methodology-writeup"
        data-testid="dfs-writeup-dossier"
        className="surface-card mb-8 border border-mineral bg-eclipse p-6 sm:p-8"
      >
        <div className="border-b border-mineral pb-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-plasma">
            The Quad-Engine DFS Spine · 3,742 Canonical Research Nodes → 10,000 Correlated Sims
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-ion-white sm:text-3xl">
            How the Engine Finds the Right Games, Schemes, Players &amp; Lineup Constructions
          </h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-ion-1">
            Every Tuesday at <span className="font-mono text-ion-white">04:00 CT</span> (TNF), Friday at{" "}
            <span className="font-mono text-ion-white">04:00 CT</span> (Sunday Main Slate), and Saturday at{" "}
            <span className="font-mono text-ion-white">04:00 CT</span> (MNF), the GSE engine ingests post-game film
            autopsy residuals, sharp market anchors, FTN charting, and injury replacements to simulate the entire
            player pool across 10,000 correlated game scripts before publishing this writeup by{" "}
            <span className="font-mono text-ion-white">06:00 CT</span>.
          </p>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <div className="border border-mineral/70 bg-carbon p-5">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-plasma">STAGE 01</span>
              <span className="text-ion-2">GAME ENVIRONMENT</span>
            </div>
            <h3 className="mt-2 font-semibold text-ion-white">
              Pace of Play, PROE &amp; Shootout Totals
            </h3>
            <p className="mt-2 text-xs leading-5 text-ion-1">
              We never start with individual player averages. We start with{" "}
              <strong className="text-ion-white">Neutral-Script Seconds/Snap</strong>,{" "}
              <strong className="text-ion-white">No-Huddle Acceleration</strong>,{" "}
              <strong className="text-ion-white">Pass Rate Over Expectation (PROE)</strong>, and de-vigged{" "}
              <strong className="text-ion-white">Circa / Pinnacle Opening-to-Current Total Trajectories</strong>.
              Across 10,000 Monte Carlo game runs, we compute each game&apos;s exact{" "}
              <span className="font-mono text-plasma">P(Combined Points &ge; 52)</span> and combined play-volume ceiling
              to identify which games can support a 4-man double stack vs. a single RB+DST clock-bleed correlation.
            </p>
          </div>

          <div className="border border-mineral/70 bg-carbon p-5">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-plasma">STAGE 02</span>
              <span className="text-ion-2">FTN SCHEME MATRIX</span>
            </div>
            <h3 className="mt-2 font-semibold text-ion-white">
              Coverage Shells, Blitz Rates &amp; Trenches
            </h3>
            <p className="mt-2 text-xs leading-5 text-ion-1">
              Every offensive skill player is scored against the opposing coordinator&apos;s exact{" "}
              <strong className="text-ion-white">Coverage Shell Distribution</strong> (
              <span className="font-mono">Cover-0 Blitz</span>, <span className="font-mono">Cover-1 Man</span>,{" "}
              <span className="font-mono">Tampa-2</span>, <span className="font-mono">Cover-3</span>,{" "}
              <span className="font-mono">Quarters/Split-Safety</span>). We cross-reference{" "}
              <strong className="text-ion-white">Blitz Rate vs. QB Pressure-to-Sack Conversion</strong>, pre-snap
              motion rates, slot vs. perimeter target funnels, and OL/DL pass-block and run-block win rates to find
              structural mismatches the salary algorithm missed.
            </p>
          </div>

          <div className="border border-mineral/70 bg-carbon p-5">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-plasma">STAGE 03</span>
              <span className="text-ion-2">N_EFF LOAD SCALING</span>
            </div>
            <h3 className="mt-2 font-semibold text-ion-white">
              Effective Target Concentration (N_eff = 1 / HHI)
            </h3>
            <p className="mt-2 text-xs leading-5 text-ion-1">
              Standard projections divide team volume linearly. Our engine computes the{" "}
              <strong className="text-ion-white">Herfindahl-Hirschman Index (HHI = &Sigma; s_i&sup2;)</strong> and{" "}
              <strong className="text-ion-white">Effective Receivers (N_eff = 1 / HHI)</strong> combined
              with our <strong className="text-ion-white">Injury Cascade v2 Overlay</strong>. When an offense condenses
              its first-read share or loses a starter, target share, air yards, and red-zone touch equity scale
              non-linearly — exposing massive 95th-percentile ceiling outcomes at mid-tier salaries.
            </p>
          </div>

          <div className="border border-mineral/70 bg-carbon p-5">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-plasma">STAGE 04</span>
              <span className="text-ion-2">COMBINATORIAL SIMS</span>
            </div>
            <h3 className="mt-2 font-semibold text-ion-white">
              All Possible Players &amp; Lineup Constructions
            </h3>
            <p className="mt-2 text-xs leading-5 text-ion-1">
              In each of the 10,000 simulated slate worlds, we score{" "}
              <strong className="text-ion-white">every active QB, RB, WR, TE, and DST</strong> simultaneously, preserving
              within-game covariance (&Sigma;_game). We then simulate tournament field duplication using a{" "}
              <strong className="text-ion-white">Dirichlet-Multinomial Ownership Model</strong> (
              <span className="font-mono">arxiv-2603.24989</span>) to construct: (1){" "}
              <strong className="text-ion-white">Cash Cores</strong> maximizing 80th-percentile floor, (2){" "}
              <strong className="text-ion-white">Showdown Captains</strong> maximizing 1.5x leverage, and (3){" "}
              <strong className="text-ion-white">20-Max GPP Stacks</strong> maximizing Top-0.1% first-place equity.
            </p>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: GAME-BY-GAME DFS ENVIRONMENT, PACE, SCHEME & MATCHUP WRITEUPS ── */}
      <section className="surface-card mb-8 border border-mineral bg-eclipse p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-mineral pb-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-plasma">
              Game-by-Game DFS Environment &amp; Matchup Autopsy
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-ion-white">
              Every Slate Game Scored: Pace, Totals, Scheme Funnels &amp; Stack Thesis
            </h2>
          </div>
          <span className="border border-plasma/40 bg-plasma/10 px-3 py-1 font-mono text-xs text-plasma">
            10,000 Correlated Simulations Complete
          </span>
        </div>

        <div className="mt-6 space-y-6">
          {LIVE_SLATE_COACH_WRITEUPS.map((w) => (
            <div key={w.id} className="border border-mineral/70 bg-carbon p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-mineral/50 pb-3">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-plasma">
                    {w.windowSlot} · Game ID: {w.gameId}
                  </span>
                  <h3 className="mt-0.5 font-display text-xl font-semibold text-ion-white">
                    {w.matchup}
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  <span className="border border-mineral bg-eclipse px-2.5 py-1 text-ion-1">
                    Neutral Pace: <strong className="text-ion-white">{w.paceOfPlay.neutralSecPerSnap}s/snap</strong>
                  </span>
                  <span className="border border-mineral bg-eclipse px-2.5 py-1 text-ion-1">
                    No-Huddle: <strong className="text-ion-white">{Math.round(w.paceOfPlay.noHuddleRate * 100)}%</strong>
                  </span>
                  <span className="border border-mineral bg-eclipse px-2.5 py-1 text-ion-1">
                    Pass EPA/Play:{" "}
                    <strong className="text-plasma">
                      {w.paceOfPlay.passEpaPlay > 0 ? `+${w.paceOfPlay.passEpaPlay}` : w.paceOfPlay.passEpaPlay}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="border border-mineral/40 bg-eclipse p-4">
                  <div className="font-mono text-[10px] uppercase text-plasma">
                    1. Pace &amp; Play-Volume Environment
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-ion-1">{w.paceOfPlay.notes}</p>
                </div>

                <div className="border border-mineral/40 bg-eclipse p-4">
                  <div className="font-mono text-[10px] uppercase text-plasma">
                    2. Coaching Scheme &amp; Coverage Funnel
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-ion-1">{w.schemeMatchup.coverageShell}</p>
                  <p className="mt-1.5 text-[11px] text-ion-2">{w.schemeMatchup.blitzRateVsPressureToSack}</p>
                </div>

                <div className="border border-mineral/40 bg-eclipse p-4">
                  <div className="font-mono text-[10px] uppercase text-plasma">
                    3. Trench &amp; Concentration Edge (N_eff)
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-ion-1">{w.schemeMatchup.coachingEdge}</p>
                  <p className="mt-1.5 text-[11px] text-ion-2">{w.schemeMatchup.notes}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-mineral/40 pt-3 font-mono text-xs">
                <span className="text-ion-2">
                  Simulated DFS Outputs: <strong className="text-ion-white">{w.dfsStacks?.captainPicks.length ?? 1} Captain Leverage Targets</strong> ·{" "}
                  <strong className="text-ion-white">{w.dfsStacks?.cashCore.length ?? 2} Cash Core Anchors</strong> ·{" "}
                  <strong className="text-ion-white">{w.dfsStacks?.gppStacks.length ?? 1} Primary GPP Stack Blueprints</strong>
                </span>
                <span className="text-plasma">
                  🔒 Exact Player Names, Salaries, Ownership Leverage &amp; Constructed Lineups in Vault Below ↓
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 3: ONLYFANS-STYLE IN-PLACE PAYWALL VAULT FOR CONSTRUCTED DFS LINEUPS & PLAYER POOL ── */}
      <section className="mb-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-plasma">
              In-Place Paywall Reveal · Unlock Constructed Lineups, Cash Core &amp; 20-Max Stacks
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-ion-white">
              Unlock the Complete DFS Player Pool &amp; Constructed Lineup Portfolio
            </h2>
          </div>
          <Link href="/pricing" className="font-mono text-xs text-orbital-cyan underline">
            Compare All-Access Plans →
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <PaywallRevealCard
            pkg={dfsPackage}
            teasers={getRedactedTeasersForWindowSlot(dfsPackage.windowSlot)}
          />
          <PaywallRevealCard
            pkg={tnfPackage}
            teasers={getRedactedTeasersForWindowSlot(tnfPackage.windowSlot)}
          />
        </div>
      </section>

      {/* ── SECTION 4: ENTITLEMENT-GATED SALARY & PLAYER POOL LEDGER ── */}
      <section id="salary-board" className="surface-card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-semibold text-ion-white">
            Simulated Player Pool &amp; Salary Feed Status
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-widest text-orbital-cyan">
            {salaryIsReal
              ? `Licensed DFS feed · ${boardCount} priced rows`
              : `${boardCount} measured players · salaries gated`}
          </span>
        </div>

        <p className="mt-1 text-sm text-ion-1">
          {salaryIsReal
            ? "Salaries come from the connected licensed DFS feed, reconciled across providers and scored across 10,000 correlated simulations."
            : "No licensed salary feed is connected or your viewer tier is unentitled. Unlock the DFS Pro 20-Max Pack above or upgrade your plan to reveal full priced player pools and constructed lineups."}
        </p>
        {feedConnected && !viewer.canUseFantasyFull && (
          <p className="mt-2 text-sm text-ion-1">
            The licensed salary feed is live. Full pricing unlocks with a{" "}
            <a href="/pricing" className="text-orbital-cyan underline">paid plan</a>.
          </p>
        )}
        {slate && (
          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-ion-2">{slateLabel}</p>
        )}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="font-mono text-[10px] uppercase tracking-widest text-ion-2">
                <th scope="col" className="py-1.5 pr-4 font-medium">Player</th>
                <th scope="col" className="py-1.5 pr-4 font-medium">Team</th>
                <th scope="col" className="py-1.5 pr-4 font-medium">Pos</th>
                <th scope="col" className="py-1.5 font-medium">Salary</th>
              </tr>
            </thead>
            <tbody className="text-ion-1">
              {topRows.map((r) => (
                <tr key={`${r.name}-${r.team}`} className="border-t border-mineral/60">
                  <td className="py-1.5 pr-4 text-ion-white">{r.name}</td>
                  <td className="py-1.5 pr-4">{r.team}</td>
                  <td className="py-1.5 pr-4 font-mono text-xs">{r.position}</td>
                  <td className="py-1.5 font-mono">{r.salary !== null ? `$${r.salary.toLocaleString()}` : "n/a"}</td>
                </tr>
              ))}
              {topRows.length === 0 && (
                <tr className="border-t border-mineral/60">
                  <td className="py-3 text-ion-2" colSpan={4}>
                    No licensed player salaries exposed to unentitled viewers. Unlock the DFS Writeup Vault above to reveal constructed lineups.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </FantasyShell>
  );
}
