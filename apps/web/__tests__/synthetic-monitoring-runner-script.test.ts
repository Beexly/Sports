import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..", "..", "..");
const src = readFileSync(resolve(repoRoot, "scripts/synthetic-monitoring-runner.mjs"), "utf8");
const pkg = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));

describe("scripts/synthetic-monitoring-runner.mjs", () => {
  it("runs prod-probe in structured mode", () => {
    expect(src).toContain("prod-probe.mjs");
    expect(src).toContain('PROD_PROBE_JSON: "1"');
    expect(src).toContain("spawnSync");
  });

  it("writes a latest synthetic monitoring artifact", () => {
    expect(src).toContain("SYNTHETIC_MONITORING_OUTPUT_DIR");
    expect(src).toContain("latest.json");
    expect(src).toContain("runs");
    expect(src).toContain("historyPath");
    expect(src).toContain("writeFile");
    expect(src).toContain("JSON.stringify(artifact, null, 2)");
  });

  it("preserves the probe exit code", () => {
    expect(src).toContain("process.exit(result.status ?? 1)");
    expect(src).toContain("exitCode: result.status ?? 1");
  });

  it("can file deduplicated issue-queue entries behind an explicit flag", () => {
    expect(src).toContain("SYNTHETIC_MONITORING_FILE_ISSUES");
    expect(src).toContain("fileIssueQueueEntry");
    expect(src).toContain("synthetic-monitoring:${fingerprint}");
    expect(src).toContain("No open issues.");
    expect(src).toContain("isCriticalProbe");
  });

  it("can auto-close synthetic issue entries on a clean opt-in run", () => {
    expect(src).toContain("closeSyntheticIssueQueueEntries");
    expect(src).toContain("artifact.ok && shouldFileIssues");
    expect(src).toContain("**Status:** RESOLVED");
    expect(src).toContain("**Resolved:**");
  });

  it("is wired through the root package scripts", () => {
    expect(pkg.scripts["synthetic:run"]).toBe("node scripts/synthetic-monitoring-runner.mjs");
  });
});
