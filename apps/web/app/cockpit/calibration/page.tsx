import Link from "next/link";
import { db } from "@sports/db";
import { getReadinessGates } from "@sports/prediction-engine";

/**
 * Cockpit calibration — live data binding, rebuilt. Preserves the
 * source-level invariants that public-safety tests enforce.
 *
 * Markers:
 *   - data-testid="internal-only-banner"
 *   - "Internal calibration only. No auto-publish. No auto-send. No automated betting."
 *   - data-testid="calibration-history" with Games/Predictions rows
 *   - data-testid="calibration-readiness" + data-testid="calibration-blocked-reasons"
 *   - "ALWAYS BLOCKED (constant gate)" enumerated
 *   - never writes a published timestamp
 *
 * The confidence-bucket table is the actual calibration readout: settled,
 * non-bootstrap picks grouped by confidence band vs realized win rate.
 * Read-only — proposals route through the guarded API, never this page.
 */
export const dynamic = "force-dynamic";

type SettledRow = { confidence: number; result: "WIN" | "LOSS" | "PUSH" | "VOID" };

const BUCKETS = [
  { label: "50–59", min: 50, max: 59 },
  { label: "60–69", min: 60, max: 69 },
  { label: "70–79", min: 70, max: 79 },
  { label: "80–89", min: 80, max: 89 },
  { label: "90–100", min: 90, max: 100 },
] as const;

export default async function CockpitCalibrationPage() {
  const gates = getReadinessGates();

  // Defensive counts — page renders zeros in stub mode / DB outage.
  const [gamesTotal, gamesCompleted, picksTotal, picksResolved, settledRows, clvAgg] =
    await Promise.all([
      db.game.count().catch(() => 0),
      db.game.count({ where: { status: "FINAL" } }).catch(() => 0),
      db.pick.count().catch(() => 0),
      db.pick.count({ where: { result: { not: "PENDING" } } }).catch(() => 0),
      db.pick
        .findMany({
          where: { result: { in: ["WIN", "LOSS", "PUSH"] }, isBootstrap: false },
          select: { confidence: true, result: true },
          orderBy: { settledAt: "desc" },
          take: 2000,
        })
        .catch(() => [] as SettledRow[]),
      db.pick
        .aggregate({
          where: { clvValue: { not: null } },
          _avg: { clvValue: true },
          _count: { clvValue: true },
        })
        .catch(() => null),
    ]);
  const picksPending = picksTotal - picksResolved;

  const bucketStats = BUCKETS.map((b) => {
    const rows = (settledRows as SettledRow[]).filter(
      (r) => r.confidence >= b.min && r.confidence <= b.max && r.result !== "PUSH",
    );
    const wins = rows.filter((r) => r.result === "WIN").length;
    return {
      ...b,
      n: rows.length,
      winRate: rows.length > 0 ? (wins / rows.length) * 100 : null,
    };
  });
  const eligibleSettled = (settledRows as SettledRow[]).length;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-white">Calibration</h1>
      <p
        data-testid="internal-only-banner"
        className="rounded-lg border border-yellow-900 bg-yellow-950/30 px-4 py-2 text-xs text-yellow-200"
      >
        Internal calibration only. No auto-publish. No auto-send. No automated betting.
      </p>

      <section data-testid="calibration-history" className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4 text-xs">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Game / prediction history
        </h2>
        <ul className="grid grid-cols-2 gap-1 text-gray-300 sm:grid-cols-3">
          <li>Games (total): {gamesTotal}</li>
          <li>Games (completed): {gamesCompleted}</li>
          <li>Predictions (total): {picksTotal}</li>
          <li>Predictions (resolved): {picksResolved}</li>
          <li>Predictions (pending): {picksPending}</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4 text-xs">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Confidence vs realized win rate
          <span className="ml-2 normal-case tracking-normal text-gray-600">
            (settled · non-bootstrap · pushes excluded · last {eligibleSettled})
          </span>
        </h2>
        {eligibleSettled === 0 ? (
          <p className="text-gray-500">
            No eligible settled picks yet — the table fills as non-bootstrap picks settle.
          </p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-gray-600">
                <th className="py-1 pr-4 font-medium">Confidence band</th>
                <th className="py-1 pr-4 font-medium">Settled (n)</th>
                <th className="py-1 pr-4 font-medium">Realized win rate</th>
                <th className="py-1 font-medium">Read</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              {bucketStats.map((b) => {
                const mid = (b.min + Math.min(b.max, 100)) / 2;
                const drift = b.winRate === null ? null : b.winRate - mid;
                return (
                  <tr key={b.label} className="border-t border-gray-800/60">
                    <td className="py-1.5 pr-4 font-mono">{b.label}</td>
                    <td className="py-1.5 pr-4">{b.n}</td>
                    <td className="py-1.5 pr-4">{b.winRate === null ? "—" : `${b.winRate.toFixed(1)}%`}</td>
                    <td className="py-1.5 text-gray-500">
                      {drift === null
                        ? "insufficient sample"
                        : Math.abs(drift) <= 5
                          ? "within band"
                          : drift > 0
                            ? `running hot +${drift.toFixed(1)}`
                            : `running cold ${drift.toFixed(1)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4 text-xs">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Closing-line value
        </h2>
        {!clvAgg || !clvAgg._count.clvValue ? (
          <p className="text-gray-500">No graded CLV yet — fills as locks are graded against closes.</p>
        ) : (
          <p className="text-gray-300">
            {clvAgg._count.clvValue} graded picks · average CLV{" "}
            <span className="font-mono">{(clvAgg._avg.clvValue ?? 0).toFixed(2)}</span> (positive = beat the close)
          </p>
        )}
      </section>

      <section data-testid="calibration-readiness" className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4 text-xs">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Readiness
        </h2>
        <ul className="space-y-1 text-gray-300">
          <li>canExposePerformanceStats: {String(gates.canExposePerformanceStats)}</li>
          <li>canLearnFromOutcomes: {String(gates.canLearnFromOutcomes)}</li>
        </ul>
        <h3 className="mt-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Blocked reasons
        </h3>
        <ul data-testid="calibration-blocked-reasons" className="space-y-1 text-gray-400">
          <li>autoPublish — ALWAYS BLOCKED (constant gate)</li>
          <li>autoSend — ALWAYS BLOCKED (constant gate)</li>
          <li>automatedBetting — ALWAYS BLOCKED (constant gate)</li>
        </ul>
      </section>

      <Link href="/cockpit" className="w-fit rounded-lg border border-gray-800 px-3 py-2 text-xs text-gray-300 hover:bg-gray-900/60">
        ← Back to Jarvis
      </Link>
    </div>
  );
}
