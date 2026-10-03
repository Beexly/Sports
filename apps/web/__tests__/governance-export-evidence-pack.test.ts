/**
 * Smoke test for scripts/governance/export-evidence-pack.ts: it must run to
 * completion without crashing when the optional sources (AgentReceipt rows,
 * an active SrqcVersion via DATABASE_URL, docs/formal/SRQC_STATUS.md,
 * docs/governance/COMPLIANCE_MATRIX.md) are absent, and it must still
 * produce a valid (possibly empty) EvidenceItem[] and write the pack file.
 */
import { existsSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, beforeEach } from "vitest";

import {
  main,
  collectAgentReceiptEvidence,
  collectSrqcVersionEvidence,
  collectDocEvidenceIfPresent,
} from "../../../scripts/governance/export-evidence-pack";

const REPO_ROOT = resolve(__dirname, "..", "..", "..");

describe("export-evidence-pack", () => {
  beforeEach(() => {
    delete process.env.DATABASE_URL;
  });

  it("skips the AgentReceipt source gracefully on this branch (no such model yet)", async () => {
    const items = await collectAgentReceiptEvidence();
    expect(Array.isArray(items)).toBe(true);
    // Honest expectation for this branch: the model does not exist yet, so
    // nothing is fabricated.
    expect(items).toEqual([]);
  });

  it("skips the SrqcVersion source when DATABASE_URL is unset", async () => {
    const items = await collectSrqcVersionEvidence();
    expect(items).toEqual([]);
  });

  it("skips a doc source that is not present in the working tree", () => {
    const items = collectDocEvidenceIfPresent(
      "docs/this-file-does-not-exist.md",
      "nonexistent control",
      "risk-management",
    );
    expect(items).toEqual([]);
  });

  it("includes a doc source that IS present, with a git-hash-suffixed path", () => {
    const items = collectDocEvidenceIfPresent(
      "docs/governance/EU_AI_ACT_EVIDENCE_PACK.md",
      "EU AI Act evidence pack doc",
      "technical-documentation",
    );
    expect(items).toHaveLength(1);
    expect(items[0]?.artifactPath).toContain(
      "docs/governance/EU_AI_ACT_EVIDENCE_PACK.md",
    );
  });

  it("runs end to end without crashing and writes a valid pack file", async () => {
    await expect(main()).resolves.not.toThrow();

    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const outPath = resolve(
      REPO_ROOT,
      "docs/governance/exports",
      `evidence-pack-${stamp}.json`,
    );
    expect(existsSync(outPath)).toBe(true);

    const parsed = JSON.parse(readFileSync(outPath, "utf8"));
    expect(typeof parsed.generatedAt).toBe("string");
    expect(parsed.disclaimer).toBe(
      "Evidence inventory only. Not a declaration of EU AI Act conformity, CE marking, or high-risk certification.",
    );
    expect(Array.isArray(parsed.items)).toBe(true);

    // Cleanup: don't leave a stray generated artifact behind from the test run.
    rmSync(outPath, { force: true });
  });
});
