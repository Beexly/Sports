import type { Metadata } from "next";
import Link from "next/link";
import { FantasyShell } from "@/components/fantasy/fantasy-shell";
import { DfsOptimizer } from "@/components/fantasy/dfs-optimizer";
import { loadDfsSalaries } from "@/lib/dfs/salaries";
import { getViewerEntitlements } from "@/lib/pricing/tier-access";

export const metadata: Metadata = {
  title: "DFS Suite: Salary Board + Optimizer · Galaxy Fantasy",
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
 * The licensed board renders only when a feed is connected AND the viewer holds
 * the fantasy entitlement; otherwise the section states honestly which of the
 * two is missing. The optimizer runs on the sample pool for everyone, at every
 * tier — the paywall limits the licensed rows, never the tool.
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
  const [dfs, viewer] = await Promise.all([
    loadDfsSalaries().catch(() => null),
    getViewerEntitlements(),
  ]);
  const feedConnected = dfs !== null && dfs.status === "live" && dfs.rows.length > 0;
  const live = feedConnected && viewer.canUseFantasyFull;
  const topRows = live ? dfs!.rows.slice(0, 24) : [];

  return (
    <FantasyShell
      eyebrow="DFS Suite · Salary Board + Optimizer"
      accent="cyan"
      title={<>Solve the slate. <span className="gse-editorial" style={{ fontSize: "1.08em" }}>See the why</span>.</>}
      intro="Salaries and the optimizer live in one room because they're one decision. The board shows what the field costs; the optimizer turns it into cash, GPP, or leverage lineups: QB stacking, locks and fades, unique portfolios with real exposure control. Every lineup ships with its salary, stack, field-ownership, and a leverage score."
      note="Illustrative classic-format sample pool drives the optimizer until a licensed salary feed is connected. Salary-cap optimization, stacking, exposure, and leverage are computed live in your browser."
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
             optimizer below stays fully free on the sample pool, so the free
             tool is depth-limited, never taken away. */
          <p className="mt-2 text-sm text-ion-1">
            The live salary board is part of the Fantasy suite. {dfs!.rows.length} reconciled
            DraftKings salaries are priced right now; a Fantasy, Pro, or Elite membership opens
            the board.{" "}
            <Link href="/pricing" className="text-orbital-cyan underline-offset-4 hover:underline">
              See plans →
            </Link>{" "}
            The optimizer below runs fully on the sample pool for everyone.
          </p>
        ) : (
          <p className="mt-2 text-sm text-ion-1">
            No licensed salary feed is connected right now, so no real salaries are shown. The
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
