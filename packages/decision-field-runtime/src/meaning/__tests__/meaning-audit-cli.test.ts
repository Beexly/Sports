/**
 * scripts/meaning-audit.ts — the runnable Meaning Integrity Audit contract.
 *
 * Static source assertions (the repo convention for script tests), resolved from __dirname so it is
 * cwd-independent (CI runs each workspace's vitest from the package dir). The bar: the audit routes
 * through the canonical engine, checks the integrity invariants, exits non-zero on a violation, and
 * makes no network call / authorizes no spend.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// __tests__ → meaning → src → decision-field-runtime → packages → repo root
const repoRoot = resolve(__dirname, "..", "..", "..", "..", "..");
const src = readFileSync(resolve(repoRoot, "scripts/meaning-audit.ts"), "utf8");

describe("scripts/meaning-audit.ts", () => {
  it("routes through the canonical compiler (no parallel audit math)", () => {
    expect(src).toMatch(/compileAllFixtures/);
    expect(src).toMatch(/validateClaimObject/);
    expect(src).toMatch(/from "@sports\/decision-field-runtime"/);
  });

  it("checks the key integrity invariants", () => {
    for (const inv of ["fixture-ceiling", "prediction-trial", "trend-passport", "web-evidence", "refusal", "engine"]) {
      expect(src).toContain(inv);
    }
  });

  it("exits non-zero on a violation and makes no network call / authorizes no spend", () => {
    expect(src).toMatch(/process\.exit\(violations\.length === 0 \? 0 : 1\)/);
    expect(src).not.toMatch(/fetch\(|axios|http\.request|https\.request/);
    expect(src).not.toMatch(/priced\s*=\s*true|stripe|charge\(/i); // no spend-authorizing code
  });

  it("requires at least one visible refusal", () => {
    expect(src).toMatch(/no visible refusal/);
  });
});
