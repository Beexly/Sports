#!/usr/bin/env tsx
/**
 * Read-only status report for the shadow prediction engine. Answers one
 * question: has the pipeline actually accumulated anything yet?
 *
 * Reports NUMBERS ONLY. Crossing the E-process evidence threshold is
 * deliberately NOT reported as "PROVEN": `forecast-skill-eprocess.ts`'s header
 * is explicit that a crossing is "NOT a licence to claim PROVEN" — PROVEN is a
 * separate product gate (>=100 settled picks AND published calibration). Both
 * happening to involve the number 100 is a coincidence this script must not blur.
 *
 * Touches nothing: no writes, no Pick reads, no publishing.
 */
import { db } from "@sports/db";
import { MIN_COMPARISON_SAMPLE } from "../../apps/web/lib/ops/shadow-vs-live-report";

/** Mirrors ForecastSkillFoldState's persisted shape (a Json column — already an object, never a string). */
interface PersistedFoldState {
  readonly n?: number;
  readonly logM?: number;
  readonly maxLogM?: number;
  readonly firstCrossedAtPick?: number | null;
  readonly threshold?: number;
  readonly minPicks?: number;
}

function fmt(value: number | undefined, digits = 4): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "n/a";
}

async function main(): Promise<void> {
  console.log("=== Shadow pipeline status ===\n");

  // ── Filter state, per scope ───────────────────────────────────────────────
  const states = await db.filterStateSnapshot.findMany({
    select: {
      scope: true,
      version: true,
      observations: true,
      forecastSkillState: true,
      baeeWeights: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  if (states.length === 0) {
    console.log("No filter_state_snapshots rows. The refresh-odds cron has not persisted a cycle yet.\n");
  }

  for (const row of states) {
    console.log(`[${row.scope}] version=${row.version} settled-observations=${row.observations}`);
    console.log(`  last saved: ${row.updatedAt.toISOString()}`);

    const fold = (row.forecastSkillState ?? null) as PersistedFoldState | null;
    if (fold === null) {
      // Legitimately absent on a row written before the column existed, or when
      // no game has settled through the fold yet. Not an error.
      console.log("  forecast-skill fold: none persisted yet");
    } else {
      const n = fold.n ?? 0;
      const threshold = fold.threshold;
      const logThreshold = typeof threshold === "number" ? Math.log(threshold) : null;
      console.log(`  forecast-skill fold: n=${n} logM=${fmt(fold.logM)} maxLogM=${fmt(fold.maxLogM)}`);
      console.log(
        `    minPicks floor: ${fold.minPicks ?? "n/a"} (below this the module reports no verdict at all)`,
      );
      if (logThreshold !== null) {
        const maxLogM = fold.maxLogM ?? 0;
        console.log(
          `    evidence threshold: M>=${threshold} (log ${logThreshold.toFixed(4)}); current max log ${maxLogM.toFixed(4)}`,
        );
        console.log(
          fold.firstCrossedAtPick != null
            ? `    threshold first reached at pick ${fold.firstCrossedAtPick} — informational, NOT the PROVEN product gate`
            : `    remaining to threshold: ${Math.max(0, logThreshold - maxLogM).toFixed(4)} log-units`,
        );
      }
    }

    const weights = row.baeeWeights;
    console.log(
      `  BAEE weights: ${Array.isArray(weights) ? JSON.stringify(weights) : "none persisted yet"}` +
        (Array.isArray(weights) && weights.length === 1
          ? "  (single model — weight is trivially 1.0 until a second model exists)"
          : ""),
    );
    console.log("");
  }

  // ── ShadowSignal counts ───────────────────────────────────────────────────
  const [total, settled] = await Promise.all([
    db.shadowSignal.count(),
    db.shadowSignal.count({ where: { outcome: { not: null } } }),
  ]);

  console.log(`shadow_signals rows: ${total} total, ${settled} settled, ${total - settled} pending`);
  console.log(
    settled >= MIN_COMPARISON_SAMPLE
      ? `  >= ${MIN_COMPARISON_SAMPLE} settled: the weekly comparison can return a verdict instead of "insufficient-sample".`
      : `  need ${MIN_COMPARISON_SAMPLE - settled} more SETTLED rows before the weekly comparison returns a verdict ` +
          `(unsettled rows do not count — only games with a real outcome are scoreable).`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`[verify-shadow-pipeline] FAILED: ${err instanceof Error ? err.stack : err}`);
    process.exit(1);
  });
