/**
 * Backtest report artifact writer — local-file store, same fallback shape as
 * `apps/web/lib/gse/waitlist-store.ts`: no DB table exists for this yet (and
 * this mission is explicitly forbidden from adding one), so the
 * provenance-stamped report is written to a JSON file the founder/ops can
 * read directly. Default path is the repo-level `reports/calibration/` dir
 * (override with `BACKTEST_HARNESS_OUTPUT_DIR`), mirroring the existing
 * `reports/*` convention of committed, dated report artifacts.
 *
 * Best-effort by design: a serverless deploy's filesystem may be read-only or
 * ephemeral, so every write is wrapped and failures are reported back to the
 * caller rather than thrown — the cron route must never 500 just because the
 * artifact couldn't be persisted this run. This is the same fail-open posture
 * as the rest of the platform's cron/report code (e.g. reconcile-entitlements
 * never lets a partial failure crash the response).
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import type { BacktestHarnessReport } from "@/lib/backtest/harness";

export interface BacktestArtifactWriteResult {
  readonly written: boolean;
  readonly path: string | null;
  readonly error: string | null;
}

function outputDirectory(): string {
  return process.env.BACKTEST_HARNESS_OUTPUT_DIR
    ? path.resolve(process.env.BACKTEST_HARNESS_OUTPUT_DIR)
    : path.resolve(process.cwd(), "reports", "calibration");
}

function fileNameFor(report: BacktestHarnessReport): string {
  // One dated file per run plus a rolling `latest.json` so ops can `cat` the
  // newest report without knowing the exact timestamp.
  const stamp = report.generatedAt.replace(/[:.]/g, "-");
  return `backtest-${stamp}.json`;
}

/**
 * Write the report to disk. Returns a result object instead of throwing so
 * callers can report a failed write honestly in the response body rather
 * than 500ing the whole cron run over it.
 */
export async function writeBacktestArtifact(
  report: BacktestHarnessReport,
): Promise<BacktestArtifactWriteResult> {
  const dir = outputDirectory();
  const datedPath = path.join(dir, fileNameFor(report));
  const latestPath = path.join(dir, "latest.json");
  const body = JSON.stringify(report, null, 2);

  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(datedPath, body, "utf8");
    await fs.writeFile(latestPath, body, "utf8");
    return { written: true, path: datedPath, error: null };
  } catch (err) {
    return {
      written: false,
      path: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
