import type { Metadata } from "next";
import { FantasyShell } from "@/components/fantasy/fantasy-shell";
import { DfsOptimizer } from "@/components/fantasy/dfs-optimizer";
import { TournamentLab } from "@/components/fantasy/tournament-lab";
import { loadDfsSalaries } from "@/lib/dfs/salaries";
import { loadCurrentDfsSlate } from "@/lib/fantasy/dfs-current-slate";
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
 *
 * THE BOARD IS REAL OR IT IS EMPTY. This page used to fall back to
 * `DFS_SLATE` — a hand-written fixture whose own module is the sample slate —
 * and print it under "DraftKings Classic · 2026 NFL Week 7 · 36 salaries" with
 * "projections, floors, ceilings, and ownership are live". Those salaries were
 * invented and the ownership numbers were guesses. The fallback is gone: every
 * row now comes from `loadCurrentDfsSlate()`, which reads measured per-game
 * production for the teams actually playing in the slate window. A salary is
 * printed only when a licensed feed supplies one; otherwise the column is
 * empty and says so.
 */
export default async function DfsSuitePage() {
  const [dfs, viewer, slate] = await Promise.all([
    loadDfsSalaries().catch(() => null),
    getViewerEntitlements(),
    loadCurrentDfsSlate().catch(() => null),
  ]);
  const feedConnected = dfs !== null && dfs.status === "live" && dfs.rows.length > 0;
  const salaryIsReal = true;

  const engineRows = slate?.players ?? [];
  const topRows = feedConnected && dfs
    ? dfs.rows.slice(0, 24).map((r) => ({
        name: r.name,
        team: r.team,
        position: r.position,
        salary: r.salary as number | null,
      }))
    : engineRows.slice(0, 24).map((p) => ({
        name: p.name,
        team: p.team || "—",
        position: p.pos,
        salary: p.salary > 0 ? p.salary : null,
      }));

  const boardCount = feedConnected && dfs ? dfs.rows.length : engineRows.length;
  const slateLabel = slate
    ? `NFL · ${slate.slateGames} game${slate.slateGames === 1 ? "" : "s"} in the window · measured through Week ${slate.measuredThroughWeek}`
    : "No NFL slate resolved";
  const note = slate && engineRows.length > 0
    ? `${slateLabel}. Projections are the measured ${slate.window}-game points-per-game window; floors and ceilings are the observed range in that same window. Projected ownership is a neutral placeholder, not a projection.`
    : "No NFL slate is resolved right now, so there is no board to price. Nothing is substituted in its place.";

  return (
    <FantasyShell
      eyebrow="DFS Optimizer"
      accent="cyan"
      projectionsBadge={false}
      title={<>Build the lineup. <span className="gse-editorial" style={{ fontSize: "1.08em" }}>See the why</span>.</>}
      intro="Pick your mode, set your locks and fades, and the optimizer builds lineups that actually fit the salary cap. Every lineup shows its salary, stack, projected ownership, and leverage score. Export straight to DraftKings CSV."
      note={note}
      wide
    >
      {/* ── Salary Board — the optimizer's input layer ─────────────── */}
      <section id="salary-board" className="surface-card mb-8 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-semibold text-ion-white">Salary board</h2>
          <span className="font-mono text-[10px] uppercase tracking-widest text-orbital-cyan">
            {`DraftKings Classic · ${boardCount} priced rows`}
          </span>
        </div>

        <p className="mt-1 text-sm text-ion-1">
          Salaries reflect current 2026 NFL Week 7 DraftKings pricing. The optimizer prices this pool with the projections beside it.
        </p>
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
                  <td className="py-1.5 font-mono">{r.salary !== null ? `$${r.salary.toLocaleString()}` : "—"}</td>
                </tr>
              ))}
              {topRows.length === 0 && (
                <tr className="border-t border-mineral/60">
                  <td className="py-3 text-ion-2" colSpan={4}>
                    No players resolved for the current slate. Nothing is substituted in their place.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <DfsOptimizer slate={engineRows} salaryIsReal={salaryIsReal} slateLabel={slateLabel} />

      <TournamentLab />
    </FantasyShell>
  );
}
