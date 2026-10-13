import type { Metadata } from "next";
import Link from "next/link";
import { FantasyShell } from "@/components/fantasy/fantasy-shell";
import { DfsOptimizer } from "@/components/fantasy/dfs-optimizer";
import { TournamentLab } from "@/components/fantasy/tournament-lab";
import { loadDfsSalaries } from "@/lib/dfs/salaries";
import { applySalaries, loadRealDfsSlate } from "@/lib/dfs/real-slate";
import { getViewerEntitlements } from "@/lib/pricing/tier-access";

export const metadata: Metadata = {
  title: "DFS Optimizer",
  description:
    "Build cash, tournament, and leverage lineups. QB stacking, locks, fades, exposure control. CSV export for DraftKings.",
  alternates: { canonical: "/fantasy/dfs" },
  robots: { index: false, follow: true },
};

// Salary feeds are provider-keyed at runtime; render per-request so the
// board reflects live availability instead of build-time state.
export const dynamic = "force-dynamic";

/**
 * The DFS Suite — salaries and the optimizer are ONE surface (the salary
 * board is the optimizer's input layer, not a separate destination).
 * The licensed board renders only when a feed is connected AND the viewer holds
 * the fantasy entitlement; otherwise the section states honestly which of the
 * two is missing.
 *
 * The optimizer's pool is the MEASURED engine slate (lib/dfs/real-slate):
 * real players with projections from actual game logs, or an explicit empty
 * state when the engine has no measured slate — never the illustrative
 * fixture. Licensed salaries join that pool only for entitled viewers (the
 * same gate as the board below); for everyone else the pool carries no
 * salaries and the cap does not bind, which the tool's banner states.
 */
export default async function DfsSuitePage() {
  // Server-side paywall enforcement (CLAUDE.md rule 3), the same depth-limiting
  // idiom as app/fantasy/waivers/page.tsx: the reconciled salary rows are
  // LICENSED provider data, gated on the JSON side by requireFantasyApi()
  // (/api/dfs/salaries → 403 for FREE). Rendering them here ungated republished
  // paid rows to anonymous visitors.
  //
  // This failed OPEN, which is why it had to be fixed before the feed lands: with
  // no provider key configured loadDfsSalaries short-circuits to "gated", so
  // `live` was always false and the leak was invisible — it would have switched
  // itself on the day a licensed DraftKings feed was connected.
  //
  // Note the deliberate split: `feedConnected` is honest availability metadata
  // (shown to everyone, as /integrations already does with row counts), while
  // `live` — may the licensed rows actually render — additionally requires the
  // fantasy entitlement. getViewerEntitlements fails closed to FREE.
  const [dfs, viewer, realSlate] = await Promise.all([
    loadDfsSalaries().catch(() => null),
    getViewerEntitlements(),
    // Fail-closed by construction (the loader returns kind "unavailable"
    // with an empty pool rather than throwing or substituting sample data);
    // the catch is belt-and-braces, matching the salaries call above.
    loadRealDfsSlate().catch(() => null),
  ]);
  const feedConnected = dfs !== null && dfs.status === "live" && dfs.rows.length > 0;
  const live = feedConnected && viewer.canUseFantasyFull;
  const topRows = live ? dfs!.rows.slice(0, 24) : [];

  // The optimizer's pool: the measured engine slate. Licensed salaries are
  // applied ONLY when this viewer is entitled to them (the same `live` gate
  // as the salary board) — the loader returns them as a separate map for
  // exactly this reason. Unentitled viewers get the same real players with
  // no salaries, and the tool discloses that the cap does not bind.
  const poolState: "real" | "empty" =
    realSlate !== null && realSlate.kind === "real" ? "real" : "empty";
  const optimizerPlayers =
    realSlate === null
      ? []
      : live
        ? applySalaries(realSlate.players, realSlate.salaryByKey).players
        : realSlate.players;

  return (
    <FantasyShell
      eyebrow="DFS Optimizer"
      accent="cyan"
      title={<>Build the lineup. <span className="gse-editorial" style={{ fontSize: "1.08em" }}>See the why</span>.</>}
      intro="Pick your mode, set your locks and fades, and the optimizer builds lineups from the measured player pool. Every lineup shows its salary, stack, projected ownership, and leverage score. Export straight to DraftKings CSV."
      // Derived from the slate state, never a constant. This used to be a
      // hardcoded string, so the "sample slate" disclosure rendered over LIVE
      // salaries too — telling a paying customer their real board was fake.
      // Law 8 is about not presenting fabricated data as real; the mirror
      // failure is just as bad, and it was what this actually did. The note
      // now has a branch per state: live salaries, measured pool without
      // salaries, and the empty pool.
      note={
        live
          ? "Live salary feed connected. Salaries and player pool are real; lineup math is ours."
          : poolState === "real"
            ? "Real player pool: projections measured from actual game logs. No licensed salary feed is connected yet, so salaries are absent and the salary cap does not bind. The math is real; the pool is measured."
            : "The real player pool is not available right now, so the optimizer stands empty rather than filling with sample players. The math is real; the pool returns with the engine data."
      }
      wide
    >
      {/* ── Salary Board — the optimizer's input layer ─────────────── */}
      <section id="salary-board" className="surface-card mb-8 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-semibold text-ion-white">Salary board</h2>
          {feedConnected ? (
            /* Availability metadata (operator, date, row COUNT) is honest status,
               not the licensed rows themselves — shown to every tier. */
            <span className="font-mono text-[10px] uppercase tracking-widest text-orbital-cyan">
              DraftKings · {dfs!.date} · {dfs!.rows.length} salaries
            </span>
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-widest text-ion-2">
              feed not connected
            </span>
          )}
        </div>

        {live ? (
          <>
            <p className="mt-1 text-sm text-ion-1">
              Reconciled across providers. A salary is trusted when feeds agree; disagreement is
              flagged ({dfs!.discrepancies} flagged). Top of the slate below; the optimizer prices
              the full board.
            </p>
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
                      <td className="py-1.5 font-mono">${r.salary.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : feedConnected ? (
          /* Feed IS live, viewer is not entitled: say so plainly and sell the
             unlock. No licensed row is serialized into this response. The
             optimizer below runs on the real measured pool for everyone, so
             the free tool is depth-limited, never taken away. */
          <p className="mt-2 text-sm text-ion-1">
            The live salary board is part of the Fantasy suite. {dfs!.rows.length} reconciled
            DraftKings salaries are priced right now; a Fantasy, Pro, or Elite membership opens
            the board.{" "}
            <Link href="/pricing" className="text-orbital-cyan underline-offset-4 hover:underline">
              See plans →
            </Link>{" "}
            The optimizer below runs fully on the real measured pool for everyone.
          </p>
        ) : (
          <p className="mt-2 text-sm text-ion-1">
            No licensed salary feed is connected right now, so no real salaries are shown. The
            board lights up the moment one is.{" "}
            <Link href="/integrations" className="text-orbital-cyan underline-offset-4 hover:underline">
              Data status →
            </Link>{" "}
            The optimizer below runs on the real measured pool in the meantime — projections
            only, until salaries connect.
          </p>
        )}
      </section>

      <DfsOptimizer
        slate={optimizerPlayers}
        slateState={poolState}
        salaryIsReal={live}
        ownershipIsAssumed={realSlate?.ownershipIsAssumed ?? true}
        missingPositions={realSlate?.missingPositions ?? []}
      />

      <TournamentLab slate={optimizerPlayers} slateState={poolState} />
    </FantasyShell>
  );
}
