/**
 * W6 — static import-graph check: turns "ablation-counters.ts must never
 * touch ENFORCE" into an automatically-checked invariant instead of a
 * comment that can drift. Always runs (no DATABASE_URL gate) since it reads
 * source text, not a database.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("ablation-counters.ts import graph", () => {
  it("imports nothing from the ENFORCE/dispatch/executor surface", () => {
    const source = readFileSync(
      join(__dirname, "..", "lib", "ai-control-plane", "ablation-counters.ts"),
      "utf8",
    );
    // Check actual import statements only — the module's own doc comment
    // legitimately NAMES these modules in prose to state what it must not
    // touch, which would otherwise false-positive a naive whole-file scan.
    const importLines = source
      .split("\n")
      .filter((line) => /^\s*import\b/.test(line));
    const forbidden = [
      "admitUnderSRQC",
      "admitUnderSRQCLogged",
      "resolveSrqcModeFromEnv",
      "evaluateSrqcAdmissionForLab",
      "enforce-gate",
      "invocation-pipeline",
      "./dispatch",
      "./executor",
    ];
    for (const line of importLines) {
      for (const token of forbidden) {
        expect(line.includes(token)).toBe(false);
      }
    }
  });
});
