import Link from "next/link";
import { getReadinessGates } from "@sports/prediction-engine";
import { db } from "@sports/db";
import { getCalibrationReport, listModelVersions } from "@/lib/signal-ledger";

/**
 * Cockpit calibration — shows Signal Ledger stats alongside readiness gates.
 * Internal only. No auto-publish, no auto-send, no automated betting.
 */
export const dynamic = "force-dynamic";

export default async function CockpitCalibrationPage() {
  const gates = getReadinessGates();

  // Game + pick counts
  const [totalGames, completedGames, totalPicks, settledPicks, pendingPicks] = await Promise.all([
    db.game.count(),
    db.game.count({ where: { status: "FINAL" } }),
    db.pick.count({ where: { isBootstrap: false } }),
    db.pick.count({ where: { isBootstrap: false, result: { in: ["WIN", "LOSS", "PUSH"] } } }),
    db.pick.count({ where: { isBootstrap: false, result: "PENDING" } }),
  ]);

  // Signal Ledger calibration
  const versions = await listModelVersions();
  const latestVersion = versions[0];
  const ledgerReport = latestVersion ? await getCalibrationReport(latestVersion) : null;

  const GATE_THRESHOLD = 30;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Calibration</h1>
        <Link href="/intelligence/calibration" className="text-xs text-gray-500 hover:text-gray-300 underline underline-offset-2" target="_blank">
          Public calibration page ↗
        </Link>
      </div>

      <p
        data-testid="internal-only-banner"
        className="rounded-lg border border-yellow-900 bg-yellow-950/30 px-4 py-2 text-xs text-yellow-200"
      >
        Internal calibration only. No auto-publish. No auto-send. No automated betting.
      </p>

      {/* Pick counts */}
      <section data-testid="calibration-history" className="rounded-2xl border border-mineral bg-gray-900/40 p-4 text-xs">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Canonical pick history
        </h2>
        <ul className="grid grid-cols-2 gap-2 text-gray-300 sm:grid-cols-3">
          <li className="rounded border border-mineral/50 bg-gray-950/40 px-3 py-2">
            <p className="text-gray-500">Games (total)</p>
            <p className="mt-0.5 text-lg font-bold text-white">{totalGames}</p>
          </li>
          <li className="rounded border border-mineral/50 bg-gray-950/40 px-3 py-2">
            <p className="text-gray-500">Games (completed)</p>
            <p className="mt-0.5 text-lg font-bold text-white">{completedGames}</p>
          </li>
          <li className="rounded border border-mineral/50 bg-gray-950/40 px-3 py-2">
            <p className="text-gray-500">Predictions (total)</p>
            <p className="mt-0.5 text-lg font-bold text-white">{totalPicks}</p>
          </li>
          <li className="rounded border border-mineral/50 bg-gray-950/40 px-3 py-2">
            <p className="text-gray-500">Predictions (resolved)</p>
            <p className="mt-0.5 text-lg font-bold text-white">{settledPicks}</p>
          </li>
          <li className="rounded border border-mineral/50 bg-gray-950/40 px-3 py-2">
            <p className="text-gray-500">Predictions (pending)</p>
            <p className="mt-0.5 text-lg font-bold text-white">{pendingPicks}</p>
          </li>
        </ul>
      </section>

      {/* Signal Ledger calibration */}
      {ledgerReport && (
        <section className="rounded-2xl border border-mineral bg-gray-900/40 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              Signal Ledger — model {ledgerReport.modelVersion}
            </h2>
            <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest border ${
              ledgerReport.gateCleared
                ? "text-emerald-400 border-emerald-900"
                : "text-yellow-400 border-yellow-900"
            }`}>
              {ledgerReport.gateCleared ? "GATE CLEARED" : `${ledgerReport.totalSettled}/${GATE_THRESHOLD}`}
            </span>
          </div>

          <p className="mt-2 text-xs text-gray-400">
            {ledgerReport.gateCleared
              ? `Calibration gate cleared. ${ledgerReport.totalSettled} settled picks logged.`
              : `${GATE_THRESHOLD - ledgerReport.totalSettled} more settled picks needed before the Calibration Report can be published.`}
          </p>

          {ledgerReport.bands.some((b) => b.settledCount > 0) && (
            <table className="mt-4 w-full text-xs">
              <thead>
                <tr className="border-b border-mineral/50">
                  <th className="py-1 text-left text-gray-500">Band</th>
                  <th className="py-1 text-right text-gray-500">Settled</th>
                  <th className="py-1 text-right text-gray-500">W</th>
                  <th className="py-1 text-right text-gray-500">L</th>
                  <th className="py-1 text-right text-gray-500">Win %</th>
                </tr>
              </thead>
              <tbody>
                {ledgerReport.bands.map((band) => (
                  <tr key={band.band} className="border-b border-mineral/30">
                    <td className="py-1.5 capitalize text-gray-300">{band.band} ({band.minConfidence}–{band.maxConfidence})</td>
                    <td className="py-1.5 text-right text-gray-300">{band.settledCount}</td>
                    <td className="py-1.5 text-right text-emerald-400">{band.winCount}</td>
                    <td className="py-1.5 text-right text-red-400">{band.lossCount}</td>
                    <td className="py-1.5 text-right text-gray-300">
                      {band.winRate !== null
                        ? `${(band.winRate * 100).toFixed(1)}%`
                        : <span className="text-gray-600">—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* Readiness */}
      <section data-testid="calibration-readiness" className="rounded-2xl border border-mineral bg-gray-900/40 p-4 text-xs">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Readiness gates
        </h2>
        <ul className="space-y-1 text-gray-300">
          <li>canExposePerformanceStats: <span className={gates.canExposePerformanceStats ? "text-emerald-400" : "text-yellow-400"}>{String(gates.canExposePerformanceStats)}</span></li>
          <li>canLearnFromOutcomes: <span className={gates.canLearnFromOutcomes ? "text-emerald-400" : "text-yellow-400"}>{String(gates.canLearnFromOutcomes)}</span></li>
        </ul>
        <h3 className="mt-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Constant blocks
        </h3>
        <ul data-testid="calibration-blocked-reasons" className="space-y-1 text-gray-400">
          <li>autoPublish — ALWAYS BLOCKED (constant gate)</li>
          <li>autoSend — ALWAYS BLOCKED (constant gate)</li>
          <li>automatedBetting — ALWAYS BLOCKED (constant gate)</li>
        </ul>
      </section>

      <Link href="/cockpit" className="w-fit rounded-lg border border-mineral px-3 py-2 text-xs text-gray-300 hover:bg-gray-900/60">
        ← Back to Jarvis
      </Link>
    </div>
  );
}
