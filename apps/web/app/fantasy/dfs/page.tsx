import type { Metadata } from "next";
import Link from "next/link";
import { FantasyShell } from "@/components/fantasy/fantasy-shell";
import { DfsOptimizer } from "@/components/fantasy/dfs-optimizer";
import { loadDfsSalaries } from "@/lib/dfs/salaries";
import { BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "DFS Suite — Salary Board + Optimizer — Galaxy Fantasy",
  description:
    "DFS salaries and the glass-box optimizer in one room: reconciled DraftKings salaries feed cash, GPP, and leverage objectives with QB stacking, locks/fades, and real exposure control.",
  alternates: { canonical: "/fantasy/dfs" },
};

// Salary feeds are provider-keyed at runtime; render per-request so the
// board reflects live availability instead of build-time state.
export const dynamic = "force-dynamic";

/**
 * The DFS Suite — salaries and the optimizer are ONE surface (the salary
 * board is the optimizer's input layer, not a separate destination).
 * Board renders live when a licensed feed is connected; otherwise it shows
 * the honest gate while the optimizer runs on the sample pool.
 */
export default async function DfsSuitePage() {
  const dfs = await loadDfsSalaries().catch(() => null);
  const live = dfs !== null && dfs.status === "live" && dfs.rows.length > 0;
  const topRows = live ? dfs!.rows.slice(0, 24) : [];

  return (
    <FantasyShell
      eyebrow="DFS Suite · Salary Board + Optimizer"
      accent={BRAND_COLORS.orbitalCyan}
      title={<>Solve the slate. <span className="gse-editorial" style={{ fontSize: "1.08em" }}>See the why</span>.</>}
      intro="Salaries and the optimizer live in one room because they're one decision. The board shows what the field costs; the optimizer turns it into cash, GPP, or leverage lineups — QB stacking, locks and fades, unique portfolios with real exposure control. Every lineup ships with its salary, stack, field-ownership, and a leverage score."
      note="Illustrative classic-format sample pool drives the optimizer until a licensed salary feed is connected. Salary-cap optimization, stacking, exposure, and leverage are computed live in your browser."
      wide
    >
      {/* ── Salary Board — the optimizer's input layer ─────────────── */}
      <section id="salary-board" className="surface-card mb-8 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-semibold text-ion-white">Salary board</h2>
          {live ? (
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: BRAND_COLORS.orbitalCyan }}>
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
              Reconciled across providers — a salary is trusted when feeds agree; disagreement is
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
        ) : (
          <p className="mt-2 text-sm text-ion-1">
            No licensed salary feed is connected right now, so no real salaries are shown — the
            board lights up the moment one is.{" "}
            <Link href="/integrations" className="text-orbital-cyan underline-offset-4 hover:underline">
              Data status →
            </Link>{" "}
            The optimizer below runs fully on the sample pool in the meantime.
          </p>
        )}
      </section>

      <DfsOptimizer />
    </FantasyShell>
  );
}
