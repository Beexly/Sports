/**
 * scripts/odds-plan.ts — the zero-spend planner CLI contract.
 *
 * Static source assertions (the repo's convention for script tests — fast, deterministic, no spawn).
 * The bar: the CLI is plan-only, makes no network call, never reads/prints the key value, validates
 * args with a deterministic exit code, and routes all math through the tested economics module.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..", "..", "..", "..");
const src = readFileSync(resolve(repoRoot, "scripts/odds-plan.ts"), "utf8");

describe("scripts/odds-plan.ts", () => {
  it("routes all arithmetic through the tested economics module (no parallel math)", () => {
    expect(src).toMatch(/planOddsApiUsage/);
    expect(src).toMatch(/from "@sports\/data-intelligence"/);
  });

  it("is plan-only and refuses LIVE", () => {
    expect(src).toMatch(/only --mode plan is supported/i);
    expect(src).toMatch(/PLAN_ONLY/);
  });

  it("never reads or prints the key value — presence boolean only", () => {
    expect(src).toMatch(/THE_ODDS_API_KEY/);
    expect(src).toMatch(/value never read or printed|never read or printed the value|value is NEVER read/i);
    // the value must never be interpolated into output — only the derived boolean is serialized
    expect(src).not.toMatch(/\$\{[^}]*THE_ODDS_API_KEY[^}]*\}/); // no `${...THE_ODDS_API_KEY...}` in any output string
    expect(src).toMatch(/keyPresent/);
  });

  it("makes no network call and authorizes no spend", () => {
    expect(src).not.toMatch(/fetch\(|axios|http\.request|https\.request/);
    expect(src).toMatch(/spendUsd: 0/);
  });

  it("validates numeric args with a deterministic exit code (2)", () => {
    expect(src).toMatch(/process\.exit\(2\)/);
    expect(src).toMatch(/invalid numeric arg/i);
  });

  it("supports a JSON output mode for the operator", () => {
    expect(src).toMatch(/format === "json"/);
    expect(src).toMatch(/JSON\.stringify/);
  });
});
