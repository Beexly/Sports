import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * docs/launch-runbook.md — top-level structure invariants.
 *
 * The runbook is the operator's morning recipe. Section headings serve
 * as bookmarks; a missing or renamed section breaks operator muscle
 * memory and the cross-links from the morning handoff.
 */

const repoRoot = resolve(__dirname, "..", "..", "..");
const src = readFileSync(resolve(repoRoot, "docs/launch-runbook.md"), "utf8");

const REQUIRED_SECTIONS = [
  /## 0\. Pre-flight/i,
  /## 1\. Local verification/i,
  /## 2\. Branch \+ commit \+ push \+ PR/i,
  /## 3\. Stage validation/i,
  /## 4\. Data warm-up/i,
  /## 5\. Opening the performance gate/i,
  /## 6\. Rollback/i,
  /## 7\. Daily operator checklist/i,
  /## 8\. Known invariants/i,
];

describe("docs/launch-runbook.md — top-level structure", () => {
  for (const pattern of REQUIRED_SECTIONS) {
    it(`includes section matching ${pattern}`, () => {
      expect(pattern.test(src), `Missing section: ${pattern}`).toBe(true);
    });
  }

  it("section 5 calls out PERFORMANCE_STATS_ENABLED as the flag to flip", () => {
    expect(src).toMatch(/PERFORMANCE_STATS_ENABLED=true/);
  });

  it("section 6 explains the gate-only rollback before the full revert option", () => {
    // The pattern: gate-only rollback explanation appears BEFORE the
    // git checkout/revert option.
    const flagIdx = src.indexOf("PERFORMANCE_STATS_ENABLED=false");
    const revertIdx = src.indexOf("git revert");
    expect(flagIdx).toBeGreaterThan(-1);
    expect(revertIdx).toBeGreaterThan(-1);
    expect(flagIdx).toBeLessThan(revertIdx);
  });

  it("section 8 enumerates the canonical never-break invariants", () => {
    for (const phrase of [
      "isBootstrap=true",
      "PENDING",
      "VOID",
      "canExposePerformanceStats=false",
      "ADMIN session",
      "MODEL_VERSION",
    ]) {
      expect(src, `Section 8 should mention "${phrase}"`).toMatch(
        new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      );
    }
  });
});
