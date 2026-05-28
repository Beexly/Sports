import Link from "next/link";
import { db } from "@sports/db";

/**
 * Cockpit — Pick Engine Performance
 *
 * Internal operator win/loss dashboard. All queries use .catch(() => fallback)
 * so stub mode (no DB) always renders without throwing.
 *
 * Rules:
 *  - isBootstrap: false  — only canonical, non-bootstrap picks are counted
 *  - No fabricated stats — ROI is explicitly marked as requiring live data
 *  - No auto-publish, no auto-send, no automated betting
 */
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Types inferred from Prisma schema (no `any`)
// ---------------------------------------------------------------------------

type PickResult = "WIN" | "LOSS" | "PUSH" | "PENDING" | "VOID";
type PickType = "SPREAD" | "MONEYLINE" | "TOTAL";

interface SettledPick {
  id: string;
  selection: string;
  result: PickResult;
  confidence: number;
  pickType: PickType;
  settledAt: Date | null;
  game: {
    homeTeamName: string;
    awayTeamName: string;
    sport: { name: string };
  };
}

interface SportRow {
  sport: string;
  wins: number;
  losses: number;
  pushes: number;
}

interface PickTypeRow {
  pickType: PickType;
  wins: number;
  losses: number;
  pushes: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function winRate(wins: number, losses: number): string {
  const decided = wins + losses;
  if (decided === 0) return "—";
  return ((wins / decided) * 100).toFixed(1) + "%";
}

function winRateClass(wins: number, losses: number): string {
  const decided = wins + losses;
  if (decided === 0) return "text-gray-500";
  const rate = (wins / decided) * 100;
  if (rate >= 55) return "text-green-400";
  if (rate >= 50) return "text-yellow-400";
  return "text-red-400";
}

function resultBadge(result: PickResult): { label: string; cls: string } {
  switch (result) {
    case "WIN":
      return { label: "WIN", cls: "text-green-400" };
    case "LOSS":
      return { label: "LOSS", cls: "text-red-400" };
    case "PUSH":
      return { label: "PUSH", cls: "text-yellow-400" };
    default:
      return { label: result, cls: "text-gray-500" };
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CockpitPicksPage() {
  // ── Summary counts ──────────────────────────────────────────────────────
  const [wins, losses, pushes, pending, total] = await Promise.all([
    db.pick.count({ where: { isBootstrap: false, result: "WIN" } }).catch(() => 0),
    db.pick.count({ where: { isBootstrap: false, result: "LOSS" } }).catch(() => 0),
    db.pick.count({ where: { isBootstrap: false, result: "PUSH" } }).catch(() => 0),
    db.pick.count({ where: { isBootstrap: false, result: "PENDING" } }).catch(() => 0),
    db.pick.count({ where: { isBootstrap: false } }).catch(() => 0),
  ]);

  // ── Bootstrap mode detection ─────────────────────────────────────────────
  const bootstrapTotal = await db.pick.count({ where: { isBootstrap: true } }).catch(() => 0);
  const isBootstrapOnly = total === 0 && bootstrapTotal > 0;

  // ── Recent settled picks (last 20) ───────────────────────────────────────
  const recentSettledRaw = await db.pick
    .findMany({
      where: { isBootstrap: false, result: { in: ["WIN", "LOSS", "PUSH"] } },
      include: { game: { include: { sport: { select: { name: true } } } } },
      orderBy: { settledAt: "desc" },
      take: 20,
    })
    .catch(() => []);

  const recentSettled = recentSettledRaw as SettledPick[];

  // ── Sport breakdown (in-memory from settled picks population) ────────────
  // We fetch settled picks for grouping, capped at 500 for performance in stub mode.
  // Using select-only (no include) to avoid Prisma mixing restriction.
  const allSettledForBreakdown = await db.pick
    .findMany({
      where: { isBootstrap: false, result: { in: ["WIN", "LOSS", "PUSH"] } },
      select: {
        result: true,
        pickType: true,
        game: { select: { sport: { select: { name: true } } } },
      },
      take: 500,
    })
    .catch(() => []) as Array<{
    result: PickResult;
    pickType: PickType;
    game: { sport: { name: string } };
  }>;

  // Group by sport
  const sportMap = new Map<string, { wins: number; losses: number; pushes: number }>();
  for (const p of allSettledForBreakdown) {
    const name = p.game.sport.name;
    const existing = sportMap.get(name) ?? { wins: 0, losses: 0, pushes: 0 };
    if (p.result === "WIN") existing.wins++;
    else if (p.result === "LOSS") existing.losses++;
    else if (p.result === "PUSH") existing.pushes++;
    sportMap.set(name, existing);
  }
  const sportBreakdown: SportRow[] = Array.from(sportMap.entries())
    .map(([sport, counts]) => ({ sport, ...counts }))
    .sort((a, b) => b.wins + b.losses + b.pushes - (a.wins + a.losses + a.pushes));

  // Group by pick type
  const pickTypeMap = new Map<PickType, { wins: number; losses: number; pushes: number }>();
  for (const p of allSettledForBreakdown) {
    const existing = pickTypeMap.get(p.pickType) ?? { wins: 0, losses: 0, pushes: 0 };
    if (p.result === "WIN") existing.wins++;
    else if (p.result === "LOSS") existing.losses++;
    else if (p.result === "PUSH") existing.pushes++;
    pickTypeMap.set(p.pickType, existing);
  }
  const pickTypeBreakdown: PickTypeRow[] = (["SPREAD", "MONEYLINE", "TOTAL"] as PickType[])
    .filter((pt) => pickTypeMap.has(pt))
    .map((pickType) => ({ pickType, ...(pickTypeMap.get(pickType) ?? { wins: 0, losses: 0, pushes: 0 }) }));

  // ── Derived stats ────────────────────────────────────────────────────────
  const decidedCount = wins + losses;
  const winRateStr = winRate(wins, losses);
  const winRateCls = winRateClass(wins, losses);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Pick Engine Performance</h1>
        <Link
          href="/cockpit/calibration"
          className="text-xs text-gray-500 hover:text-gray-300 underline underline-offset-2"
        >
          Calibration →
        </Link>
      </div>

      {/* Internal-only banner */}
      <p
        data-testid="internal-only-banner"
        className="rounded-lg border border-yellow-900 bg-yellow-950/30 px-4 py-2 text-xs text-yellow-200"
      >
        Internal performance data only. No auto-publish. No auto-send. No automated betting.
        Canonical picks only (isBootstrap = false).
      </p>

      {/* Bootstrap mode warning */}
      {isBootstrapOnly && (
        <div
          data-testid="bootstrap-warning"
          className="rounded-lg border border-orange-900 bg-orange-950/30 px-4 py-3 text-sm text-orange-200"
        >
          <p className="font-semibold">Engine is in bootstrap mode — results not canonical</p>
          <p className="mt-1 text-xs text-orange-300/80">
            All {bootstrapTotal.toLocaleString()} recorded picks have isBootstrap = true. No canonical
            performance metrics are available yet. Settle picks under canonical mode before
            reviewing win/loss stats here.
          </p>
        </div>
      )}

      {/* Summary cards */}
      <section data-testid="performance-summary" className="rounded-2xl border border-mineral bg-gray-900/40 p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Summary — Canonical picks
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <StatCard label="Total picks" value={total.toLocaleString()} />
          <StatCard label="Wins" value={wins.toLocaleString()} valueClass="text-green-400" />
          <StatCard label="Losses" value={losses.toLocaleString()} valueClass="text-red-400" />
          <StatCard label="Pushes" value={pushes.toLocaleString()} valueClass="text-yellow-400" />
          <StatCard label="Pending" value={pending.toLocaleString()} valueClass="text-gray-300" />
          <StatCard label="Decided" value={decidedCount.toLocaleString()} />
          <StatCard label="Win rate" value={winRateStr} valueClass={winRateCls} />
          <StatCard
            label="ROI"
            value="Requires live data"
            valueClass="text-gray-500 text-xs font-normal"
          />
        </div>
        <p className="mt-3 text-[10px] text-gray-600">
          Win rate = wins ÷ (wins + losses). Pushes and voids excluded from win rate denominator.
          ROI calculation requires closing-line unit tracking — not fabricated.
        </p>
      </section>

      {/* Sport breakdown */}
      {sportBreakdown.length > 0 && (
        <section
          data-testid="sport-breakdown"
          className="rounded-2xl border border-mineral bg-gray-900/40 p-5"
        >
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
            By sport
          </h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-mineral/50 text-gray-500">
                <th className="pb-2 text-left">Sport</th>
                <th className="pb-2 text-right">W</th>
                <th className="pb-2 text-right">L</th>
                <th className="pb-2 text-right">P</th>
                <th className="pb-2 text-right">Win %</th>
              </tr>
            </thead>
            <tbody>
              {sportBreakdown.map((row) => (
                <tr key={row.sport} className="border-b border-mineral/30">
                  <td className="py-2 font-medium text-gray-200">{row.sport}</td>
                  <td className="py-2 text-right text-green-400 font-mono">{row.wins}</td>
                  <td className="py-2 text-right text-red-400 font-mono">{row.losses}</td>
                  <td className="py-2 text-right text-yellow-400 font-mono">{row.pushes}</td>
                  <td className={`py-2 text-right font-mono ${winRateClass(row.wins, row.losses)}`}>
                    {winRate(row.wins, row.losses)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Pick type breakdown */}
      {pickTypeBreakdown.length > 0 && (
        <section
          data-testid="pick-type-breakdown"
          className="rounded-2xl border border-mineral bg-gray-900/40 p-5"
        >
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
            By pick type
          </h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-mineral/50 text-gray-500">
                <th className="pb-2 text-left">Type</th>
                <th className="pb-2 text-right">W</th>
                <th className="pb-2 text-right">L</th>
                <th className="pb-2 text-right">P</th>
                <th className="pb-2 text-right">Win %</th>
              </tr>
            </thead>
            <tbody>
              {pickTypeBreakdown.map((row) => (
                <tr key={row.pickType} className="border-b border-mineral/30">
                  <td className="py-2 font-medium text-gray-200">{row.pickType}</td>
                  <td className="py-2 text-right text-green-400 font-mono">{row.wins}</td>
                  <td className="py-2 text-right text-red-400 font-mono">{row.losses}</td>
                  <td className="py-2 text-right text-yellow-400 font-mono">{row.pushes}</td>
                  <td className={`py-2 text-right font-mono ${winRateClass(row.wins, row.losses)}`}>
                    {winRate(row.wins, row.losses)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Recent settled picks */}
      {recentSettled.length > 0 ? (
        <section
          data-testid="recent-settled-picks"
          className="rounded-2xl border border-mineral bg-gray-900/40 p-5"
        >
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
            Recent settled picks (last {recentSettled.length})
          </h2>
          <ul className="divide-y divide-gray-800/60 text-sm">
            {recentSettled.map((pick) => {
              const badge = resultBadge(pick.result);
              return (
                <li key={pick.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-200">{pick.selection}</p>
                    <p className="mt-0.5 text-[11px] text-gray-500">
                      {pick.game.awayTeamName} @ {pick.game.homeTeamName}
                      {" · "}
                      <span className="text-gray-400">{pick.game.sport.name}</span>
                      {" · "}
                      <span className="text-gray-400">{pick.pickType}</span>
                      {pick.settledAt && (
                        <>
                          {" · "}
                          <span className="text-gray-600">
                            {new Date(pick.settledAt).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-xs text-gray-400">
                      {pick.confidence}% conf
                    </span>
                    <span className={`font-mono text-xs font-bold ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <section className="rounded-2xl border border-mineral bg-gray-900/40 p-5 text-sm text-gray-500">
          No settled canonical picks recorded yet.
          {isBootstrapOnly && (
            <span className="ml-1 text-orange-400">
              Engine is in bootstrap mode — settle picks under canonical mode first.
            </span>
          )}
        </section>
      )}

      {/* Nav */}
      <div className="flex flex-wrap gap-2 text-xs">
        <Link
          href="/cockpit/calibration"
          className="rounded-lg border border-mineral px-3 py-2 text-gray-300 hover:border-gray-700 hover:bg-gray-900/60"
        >
          Calibration →
        </Link>
        <Link
          href="/cockpit/history"
          className="rounded-lg border border-mineral px-3 py-2 text-gray-300 hover:border-gray-700 hover:bg-gray-900/60"
        >
          Pick history →
        </Link>
        <Link
          href="/cockpit/losses"
          className="rounded-lg border border-mineral px-3 py-2 text-gray-300 hover:border-gray-700 hover:bg-gray-900/60"
        >
          Loss autopsies →
        </Link>
        <Link
          href="/cockpit"
          className="rounded-lg border border-mineral px-3 py-2 text-gray-300 hover:border-gray-700 hover:bg-gray-900/60"
        >
          ← Back to Jarvis
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded border border-mineral/50 bg-gray-950/40 px-3 py-2.5">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className={`mt-0.5 font-mono font-bold text-lg ${valueClass ?? "text-white"}`}>
        {value}
      </p>
    </div>
  );
}
