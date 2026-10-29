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
    "Coach & Reasoning Mind First, Book Last. Deep DFS slate writeups powered by full-spectrum football intelligence, tactical scheme matchups, N_eff target concentration, pace-of-play telemetry, and 10,000-simulation cash and 20-max GPP lineup construction.",
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
    ? `${slateLabel}. Projections are built Coach & Reasoning Mind First across 10,000 correlated play-by-play simulations, N_eff load scaling, and tactical scheme matchups, then compared against salaries and ownership last.`
    : "No NFL licensed salary feed is resolved right now; our Coach & Reasoning Mind First T-48h 10,000-run simulation dossier and game-environment writeups below govern lineup construction.";
  const note = feedDown
    ? `No licensed salary feed is connected. ${measuredCopy}`
    : measuredCopy;

  const dfsPackage = getPackageBySlug("sunday-dfs-pro-20max-pack")!;
  const tnfPackage = getPackageBySlug("tnf-all-in-prime-pack")!;

  return (
    <FantasyShell
      eyebrow="DFS Intelligence Dossier · Coach & Reasoning Mind First · Book Last"
      accent="cyan"
      projectionsBadge={false}
      title={
        <>
          Coach &amp; Reasoning Mind First.{" "}
          <span className="gse-editorial" style={{ fontSize: "1.08em" }}>
            Salaries &amp; Ownership Last.
          </span>
        </>
      }
      intro="We retired the generic linear optimizer because football is never played on a spreadsheet. Our engine reasons like a coaching staff first: synthesizing film autopsy residuals, play-caller DNA, defensive shell rotations, trench win rates, injury cascades, situational/emotional spots, neutral pace, and N_eff usage concentration, then simulates every possible player and lineup construction 10,000 times before ever comparing against the salary cap or field ownership."
      note={note}
      wide
    >
      {/* ── SECTION 1: COACH/REASONING MIND FIRST → ALL DATA → 10,000 SIMS → BOOK LAST ── */}
      <section
        id="dfs-methodology-writeup"
        data-testid="dfs-writeup-dossier"
        className="surface-card mb-8 border border-mineral bg-eclipse p-6 sm:p-8"
      >
        <div className="border-b border-mineral pb-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-plasma">
            The GSE Doctrine · Coach &amp; Reasoning Mind First → 3,742 Research Nodes → 10,000 Play-by-Play Sims → Salary Cap Last
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-ion-white sm:text-3xl">
            Every Layer of Data, Football Reasoning &amp; Simulation Behind Our DFS Writeups
          </h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-ion-1">
            Immediately after Sunday&apos;s <span className="font-mono text-ion-white">16:00 CT</span>,{" "}
            <span className="font-mono text-ion-white">19:30 CT</span>, and{" "}
            <span className="font-mono text-ion-white">22:45 CT</span> windows (plus Thursday and Monday night), our
            post-game film autopsy grades every pre-play expectation against actual snap telemetry. Then at{" "}
            <span className="font-mono text-ion-white">04:00 CT</span> (48 hours prior to each slate), the reasoning
            mind runs 10,000 full-game simulations across the entire player pool before comparing our independent truth
            against the salaries and market numbers at the very end.
          </p>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <div className="border border-mineral/70 bg-carbon p-5">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-plasma">STAGE 01</span>
              <span className="text-ion-2">COACH &amp; REASONING MIND</span>
            </div>
            <h3 className="mt-2 font-semibold text-ion-white">
              Tactical Schemes, Trench Leverage &amp; Situational Spots
            </h3>
            <p className="mt-2 text-xs leading-5 text-ion-1">
              Before looking at a single salary or betting line, the mind reads the football matchup:{" "}
              <strong className="text-ion-white">Coordinator Play-Call DNA</strong> by down/distance/score-state,{" "}
              <strong className="text-ion-white">Defensive Coverage Shell Rotations</strong> (
              <span className="font-mono">Cover-0 Simulated Blitz</span>, <span className="font-mono">Cover-1 Man</span>,{" "}
              <span className="font-mono">Tampa-2</span>, <span className="font-mono">Cover-3 Seams</span>,{" "}
              <span className="font-mono">Split-Safety Quarters</span>),{" "}
              <strong className="text-ion-white">Pre-Snap Motion Response</strong>,{" "}
              <strong className="text-ion-white">11/12/21 Personnel Grouping Wars</strong>,{" "}
              <strong className="text-ion-white">OL vs. DL Pass-Block &amp; Run-Block Trench Win Rates</strong>,{" "}
              <strong className="text-ion-white">QB Time-to-Throw vs. Pressure-to-Sack Conversion</strong>, receiver
              route-tree separation, Tuesday-to-Sunday coach-speak/beat signals, weather/wind vectors, travel disruption,
              and referee crew tendencies.
            </p>
          </div>

          <div className="border border-mineral/70 bg-carbon p-5">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-plasma">STAGE 02</span>
              <span className="text-ion-2">PACE, TOTALS &amp; N_EFF</span>
            </div>
            <h3 className="mt-2 font-semibold text-ion-white">
              Tempo, Injury Cascades &amp; Non-Linear Load (N_eff = 1 / HHI)
            </h3>
            <p className="mt-2 text-xs leading-5 text-ion-1">
              Next, the engine models how the game environment and active roster shape total play volume and usage
              concentration: <strong className="text-ion-white">Neutral-Script Seconds/Snap</strong>,{" "}
              <strong className="text-ion-white">No-Huddle Acceleration</strong>,{" "}
              <strong className="text-ion-white">Pass Rate Over Expectation (PROE)</strong>, drive-sustain EPA, and{" "}
              <strong className="text-ion-white">Red-Zone / Inside-the-5 Play Scripts</strong>. When an injury hits an
              offensive tackle, boundary corner, or pass-catcher, our{" "}
              <strong className="text-ion-white">Injury Cascade v2 &amp; Herfindahl-Hirschman Index (N_eff = 1 / HHI)</strong>{" "}
              re-computes how protection slides and first-read target shares condense non-linearly, creating massive
              ceiling spikes that linear averages never see.
            </p>
          </div>

          <div className="border border-mineral/70 bg-carbon p-5">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-plasma">STAGE 03</span>
              <span className="text-ion-2">10,000 PLAY-BY-PLAY SIMS</span>
            </div>
            <h3 className="mt-2 font-semibold text-ion-white">
              All Possible Players &amp; Correlated Game Environments
            </h3>
            <p className="mt-2 text-xs leading-5 text-ion-1">
              With our coaching and situational priors locked, we simulate every game on the slate{" "}
              <strong className="text-ion-white">10,000 times play-by-play</strong>. In every simulated world, we score{" "}
              <strong className="text-ion-white">every possible QB, RB, WR, TE, and DST</strong> simultaneously,
              capturing true within-game covariance (&Sigma;_game): how a shootout script lifts a QB + 2 pass-catchers
              and forces the opposing WR1 into 12+ catch-up targets, or how a front-seven pass-rush advantage correlates
              an RB1 clock-bleed workload with DST sacks and turnovers.
            </p>
          </div>

          <div className="border border-mineral/70 bg-carbon p-5">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-plasma">STAGE 04</span>
              <span className="text-ion-2">BOOK &amp; SALARY LAST</span>
            </div>
            <h3 className="mt-2 font-semibold text-ion-white">
              Combinatorial Lineup Construction &amp; Ownership Leverage
            </h3>
            <p className="mt-2 text-xs leading-5 text-ion-1">
              <strong className="text-ion-white">Only at the very end</strong> do we introduce DFS salaries, market
              lines, and simulated field ownership (<strong className="text-ion-white">Dirichlet-Multinomial field model</strong>).
              We evaluate millions of salary-legal lineup combinations across the 10,000 simulated worlds to isolate where
              our football mind disagrees with public pricing and chalk ownership, outputting{" "}
              <strong className="text-ion-white">80th-Pct Floor Cash Cores</strong>,{" "}
              <strong className="text-ion-white">Showdown 1.5x Captain Leverage</strong>, and{" "}
              <strong className="text-ion-white">20-Max GPP Lineup Portfolios</strong> (QB + 2 Pass Catchers + Opposing
              Bring-Back + Sub-$4.5k Value Pivot).
            </p>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: GAME-BY-GAME DFS ENVIRONMENT, PACE, SCHEME & MATCHUP WRITEUPS ── */}
      <section className="surface-card mb-8 border border-mineral bg-eclipse p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-mineral pb-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-plasma">
              Game-by-Game Coaching &amp; Environment Autopsy (Free Public Layer)
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-ion-white">
              Every Slate Game Scored: Pace, Totals, Scheme Funnels &amp; Stack Thesis
            </h2>
          </div>
          <span className="border border-plasma/40 bg-plasma/10 px-3 py-1 font-mono text-xs text-plasma">
            10,000-Sim Environment Read · W1-W7 (18,738 Plays)
          </span>
        </div>

        <div className="mt-6 space-y-6">
          {LIVE_SLATE_COACH_WRITEUPS.map((w) => (
            <div key={w.id} className="border border-mineral/70 bg-carbon p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-mineral/50 pb-3">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-plasma">
                    {w.windowSlot} · {w.kickoff}
                  </span>
                  <h3 className="mt-0.5 font-display text-xl font-semibold text-ion-white">
                    {w.matchup}
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  <span className="border border-mineral bg-eclipse px-2.5 py-1 text-ion-1">
                    Pace: <strong className="text-ion-white">{w.paceOfPlay.neutralSecPerSnap}s/snap</strong>
                  </span>
                  <span className="border border-mineral bg-eclipse px-2.5 py-1 text-ion-1">
                    No-Huddle: <strong className="text-ion-white">{(w.paceOfPlay.noHuddleRate * 100).toFixed(1)}%</strong>
                  </span>
                  <span className="border border-mineral bg-eclipse px-2.5 py-1 text-ion-1">
                    Pass EPA: <strong className="text-ion-white">{w.paceOfPlay.passEpaPlay}</strong>
                  </span>
                  <span className="border border-plasma/40 bg-plasma/10 px-2.5 py-1 text-plasma">
                    Conviction: <strong>{w.sideTotalCall.sideConfidence}</strong>
                  </span>
                </div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-orbital-cyan">
                    Pace &amp; No-Huddle Environment (2026 W1-W7)
                  </div>
                  <p className="mt-1 text-xs leading-5 text-ion-1">{w.paceOfPlay.notes}</p>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-orbital-cyan">
                    Coverage Shell &amp; Trench Leverage
                  </div>
                  <p className="mt-1 text-xs leading-5 text-ion-1">
                    {w.schemeMatchup.coverageShell}. {w.schemeMatchup.blitzRateVsPressureToSack} {w.schemeMatchup.notes}
                  </p>
                </div>
              </div>
              <div className="mt-4 border-t border-mineral/40 pt-3 font-mono text-xs text-plasma">
                🔒 Constructed 9-Man Lineup Shell, Showdown 1.5x Captain Leverage, Cash Core &amp; 20-Max Stack Unlocks in Vault Below
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
