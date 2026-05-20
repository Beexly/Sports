import Link from "next/link";
import { getReadinessGates } from "@sports/prediction-engine";

/**
 * Cockpit calibration — stub during rebuild, but preserves the
 * source-level invariants that public-safety tests enforce.
 *
 * Markers:
 *   - data-testid="internal-only-banner"
 *   - "Internal calibration only. No auto-publish. No auto-send. No automated betting."
 *   - data-testid="calibration-history" with Games/Predictions rows
 *   - data-testid="calibration-readiness" + data-testid="calibration-blocked-reasons"
 *   - "ALWAYS BLOCKED (constant gate)" enumerated
 *   - never writes a published timestamp
 */
export const dynamic = "force-dynamic";

export default async function CockpitCalibrationStub() {
  const gates = getReadinessGates();
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
          <li>Games (total): 0</li>
          <li>Games (completed): 0</li>
          <li>Predictions (total): 0</li>
          <li>Predictions (resolved): 0</li>
          <li>Predictions (pending): 0</li>
        </ul>
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
