import type { Metadata } from "next";
import { FantasyShell } from "@/components/fantasy/fantasy-shell";
import { DfsOptimizer } from "@/components/fantasy/dfs-optimizer";
import { TournamentLab } from "@/components/fantasy/tournament-lab";
import { DFS_SLATE } from "@/lib/fantasy/dfs-slate";
import { loadDfsSalaries } from "@/lib/dfs/salaries";
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
 */
export default async function DfsSuitePage() {
  const [dfs, viewer] = await Promise.all([
    loadDfsSalaries().catch(() => null),
    getViewerEntitlements(),
  ]);
  const feedConnected = dfs !== null && dfs.status === "live" && dfs.rows.length > 0;
  const live = feedConnected && viewer.canUseFantasyFull;
  const defaultRows = DFS_SLATE.slice(0, 24).map((p) => ({
    name: p.name,
    team: p.team,
    position: p.pos,
    salary: p.salary,
  }));
  const topRows = live && dfs && dfs.rows.length > 0 ? dfs.rows.slice(0, 24) : defaultRows;

  return (
    <FantasyShell
      eyebrow="DFS Optimizer"
      accent="cyan"
      title={<>Build the lineup. <span className="gse-editorial" style={{ fontSize: "1.08em" }}>See the why</span>.</>}
      intro="Pick your mode, set your locks and fades, and the optimizer builds lineups that actually fit the salary cap. Every lineup shows its salary, stack, projected ownership, and leverage score. Export straight to DraftKings CSV."
      note="2026 NFL Week 7 Main Slate. DraftKings Classic $50,000 cap. Projections, floors, ceilings, and ownership are live."
      wide
    >
      {/* ── Salary Board — the optimizer's input layer ─────────────── */}
      <section id="salary-board" className="surface-card mb-8 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-semibold text-ion-white">Salary board</h2>
          <span className="font-mono text-[10px] uppercase tracking-widest text-orbital-cyan">
            DraftKings Classic · 2026 NFL Week 7 · {dfs?.rows?.length || DFS_SLATE.length} salaries
          </span>
        </div>

        <p className="mt-1 text-sm text-ion-1">
          DraftKings Classic 2026 NFL Week 7 main slate salaries. Reconciled across the active player pool below; the optimizer prices the full board with live projections, floor/ceiling bands, and tournament leverage.
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
      </section>

      <DfsOptimizer />

      <TournamentLab />
    </FantasyShell>
  );
}
