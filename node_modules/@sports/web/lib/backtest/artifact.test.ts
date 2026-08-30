import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { runBacktestHarness, type BacktestHarnessReport } from "./harness";
import { writeBacktestArtifact } from "./artifact";

/**
 * Local-file artifact writer — same fallback shape as gse/waitlist-store.ts.
 * `outputDirectory()` reads `BACKTEST_HARNESS_OUTPUT_DIR` at call time (not
 * import time), so `vi.stubEnv` alone is enough per test — no module reset
 * needed.
 */

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "backtest-artifact-test-"));
  vi.stubEnv("BACKTEST_HARNESS_OUTPUT_DIR", tmpDir);
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function sampleReport(): BacktestHarnessReport {
  return runBacktestHarness(
    [
      { id: "a", confidence: 70, result: "WIN", modelVersion: "v1" },
      { id: "b", confidence: 60, result: "LOSS", modelVersion: "v1" },
    ],
    { now: new Date("2026-07-17T00:00:00.000Z"), minSampleSize: 1 },
  );
}

describe("writeBacktestArtifact", () => {
  it("writes both a dated file and latest.json under BACKTEST_HARNESS_OUTPUT_DIR", async () => {
    const report = sampleReport();
    const result = await writeBacktestArtifact(report);

    expect(result.written).toBe(true);
    expect(result.error).toBeNull();
    expect(result.path).toMatch(/backtest-.*\.json$/);

    const latest = JSON.parse(await fs.readFile(path.join(tmpDir, "latest.json"), "utf8")) as BacktestHarnessReport;
    expect(latest.provenance.inputsHash).toBe(report.provenance.inputsHash);

    const dated = JSON.parse(await fs.readFile(result.path!, "utf8")) as BacktestHarnessReport;
    expect(dated.provenance.outputHash).toBe(report.provenance.outputHash);
  });

  it("creates the output directory when it does not exist yet", async () => {
    const nested = path.join(tmpDir, "nested", "dir");
    vi.stubEnv("BACKTEST_HARNESS_OUTPUT_DIR", nested);

    const result = await writeBacktestArtifact(sampleReport());
    expect(result.written).toBe(true);
    const entries = await fs.readdir(nested);
    expect(entries).toContain("latest.json");
  });

  it("fails soft (never throws) when the target path cannot be a directory", async () => {
    // Point the output dir AT an existing regular file — mkdir(recursive) on
    // top of a file must fail, and the writer must report that, not throw.
    const blockerFile = path.join(tmpDir, "blocker");
    await fs.writeFile(blockerFile, "not a directory", "utf8");
    vi.stubEnv("BACKTEST_HARNESS_OUTPUT_DIR", blockerFile);

    const result = await writeBacktestArtifact(sampleReport());
    expect(result.written).toBe(false);
    expect(result.path).toBeNull();
    expect(result.error).not.toBeNull();
  });
});
