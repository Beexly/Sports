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
      <section id="salary-board" className="mb-12">
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <p className="eyebrow" style={{ color: BRAND_COLORS.orbitalCyan }}>
              Step 1 · the field
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-ion-white">
              Salary board
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-300">
              What the field costs — the optimizer&rsquo;s input layer. It prices the full board;
              the slate below is the top of it.
            </p>
          </div>
          {live ? (
            <span className="shrink-0 rounded-full border border-mineral bg-eclipse/60 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-orbital-cyan">
              DraftKings · {dfs!.date} · {dfs!.rows.length} salaries
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-mineral bg-eclipse/60 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-ink-400">
              <span className="h-1.5 w-1.5 rounded-full bg-ink-500" />
              feed not connected
            </span>
          )}
        </header>

        {live ? (
          <div className="surface-card mt-5 overflow-hidden">
            <p className="border-b border-mineral px-5 py-3 text-sm text-ink-300">
              Reconciled across providers — a salary is trusted when feeds agree; disagreement is
              flagged{" "}
              <strong className="font-medium text-ion-white">({dfs!.discrepancies} flagged)</strong>.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-mineral font-mono text-[11px] uppercase tracking-widest text-ink-500">
                    <th className="px-5 py-2.5 font-medium">Player</th>
                    <th className="px-5 py-2.5 font-medium">Team</th>
                    <th className="px-5 py-2.5 font-medium">Pos</th>
                    <th className="px-5 py-2.5 text-right font-medium">Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {topRows.map((r) => (
                    <tr key={`${r.name}-${r.team}`} className="border-b border-mineral/50 last:border-b-0">
                      <td className="px-5 py-2.5 font-medium text-ion-white">{r.name}</td>
                      <td className="px-5 py-2.5 text-ink-300">{r.team}</td>
                      <td className="px-5 py-2.5 font-mono text-xs text-ink-400">{r.position}</td>
                      <td className="px-5 py-2.5 text-right font-mono text-ion-white">${r.salary.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="surface-card mt-5 p-6">
            <p className="text-sm leading-relaxed text-ink-300">
              No licensed salary feed is connected right now, so no real salaries are shown — the
              board lights up the moment one is. The optimizer below runs fully on the sample pool in
              the meantime.
            </p>
            <Link
              href="/integrations"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-orbital-cyan underline-offset-4 hover:underline"
            >
              Data status
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        )}
      </section>

      {/* ── Optimizer — turn the board into lineups ─────────────────── */}
      <section id="optimizer">
        <header className="mb-5">
          <p className="eyebrow" style={{ color: BRAND_COLORS.orbitalCyan }}>
            Step 2 · the build
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-ion-white">
            The optimizer
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-300">
            Turn the board into cash, GPP, or leverage lineups — set the objective, pin or fade
            players, then generate. Every lineup ships with its salary, stack, ownership, and a
            leverage score.
          </p>
        </header>
        <DfsOptimizer />
      </section>
    </FantasyShell>
  );
}
