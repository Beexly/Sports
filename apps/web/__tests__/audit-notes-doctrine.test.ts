import { describe, it, expect } from "vitest";
import {
  resolveMaxOddsAgeMs,
  MAX_CANDIDATE_ODDS_AGE_MS,
} from "@/lib/board/load-gate-slate";
import { buildCalibrationRows, buildCandidateRows } from "@/lib/board/gate-rows";

/**
 * Doctrine regressions from the cascade audit. Neither was release-blocking,
 * but each contradicted a rule the codebase states about itself.
 */

describe("the per-call odds-age override can only TIGHTEN the 6h budget", () => {
  const SIX_HOURS = 6 * 60 * 60 * 1000;

  it("the protected constant is still 6h", () => {
    expect(MAX_CANDIDATE_ODDS_AGE_MS).toBe(SIX_HOURS);
  });

  it("an absent override uses the constant", () => {
    expect(resolveMaxOddsAgeMs(undefined)).toBe(MAX_CANDIDATE_ODDS_AGE_MS);
  });

  it("a TIGHTER window is honored — that is the legitimate use", () => {
    expect(resolveMaxOddsAgeMs(60_000)).toBe(60_000);
  });

  it("a WIDER window is clamped down to the constant, never applied", () => {
    // Binding law: the 6h budget must not be widened. This option was the one
    // seam around it — an ungated per-call override could pass 24h and admit
    // day-old quotes without touching the protected constant at all.
    expect(resolveMaxOddsAgeMs(24 * 60 * 60 * 1000)).toBe(MAX_CANDIDATE_ODDS_AGE_MS);
    expect(resolveMaxOddsAgeMs(Number.MAX_SAFE_INTEGER)).toBe(MAX_CANDIDATE_ODDS_AGE_MS);
  });

  it("exactly the constant is allowed unchanged", () => {
    expect(resolveMaxOddsAgeMs(SIX_HOURS)).toBe(SIX_HOURS);
  });

  it("nonsense input falls back to the constant rather than disabling the check", () => {
    // The dangerous failure would be Infinity/NaN silently meaning "never stale".
    for (const bad of [Number.POSITIVE_INFINITY, NaN, 0, -1]) {
      expect(resolveMaxOddsAgeMs(bad)).toBe(MAX_CANDIDATE_ODDS_AGE_MS);
    }
  });
});

/** Minimal raw pick shape — only the fields the row builders read. */
function pick(overrides: Record<string, unknown> = {}) {
  return {
    id: "pick-1",
    selection: "Chiefs -3",
    sportName: "americanfootball_nfl",
    homeTeamName: "Chiefs",
    awayTeamName: "Broncos",
    pickType: "SPREAD",
    result: "PENDING",
    confidence: 60,
    line: -3,
    clvLockLine: -3,
    homePrice: -110,
    awayPrice: -110,
    modelVersion: "v5.1.0",
    ...overrides,
  } as never;
}

describe("gate-rows honors its own no-silent-drops contract", () => {
  it("a PUSH is EXCLUDED WITH A REASON from calibration, not silently dropped", () => {
    // A push is genuinely not a learning label — coercing it to a loss would
    // bias the calibration set. But vanishing it made input length disagree
    // with rows + excluded, and a caller could not tell a dropped row from one
    // that was never there.
    const built = buildCalibrationRows([pick({ id: "p-push", result: "PUSH" })]);
    expect(built.rows).toHaveLength(0);
    expect(built.excluded).toHaveLength(1);
    expect(built.excluded[0]!.rowId).toBe("p-push");
    expect(built.excluded[0]!.missing.join(" ")).toMatch(/PUSH/);
    expect(built.excluded[0]!.missing.join(" ")).toMatch(/not a loss/i);
  });

  it("a VOID is likewise accounted for", () => {
    const built = buildCalibrationRows([pick({ id: "p-void", result: "VOID" })]);
    expect(built.excluded.map((e) => e.rowId)).toEqual(["p-void"]);
  });

  it("a PENDING pick is accounted for on the calibration side", () => {
    const built = buildCalibrationRows([pick({ id: "p-pending", result: "PENDING" })]);
    expect(built.rows).toHaveLength(0);
    expect(built.excluded).toHaveLength(1);
  });

  it("every calibration input appears in exactly one of rows or excluded", () => {
    const input = [
      pick({ id: "a", result: "WIN" }),
      pick({ id: "b", result: "PUSH" }),
      pick({ id: "c", result: "LOSS" }),
      pick({ id: "d", result: "VOID" }),
    ];
    const built = buildCalibrationRows(input);
    expect(built.rows.length + built.excluded.length).toBe(input.length);
  });

  it("a SETTLED pick is excluded with a reason from the candidate side", () => {
    const built = buildCandidateRows([pick({ id: "p-win", result: "WIN" })]);
    expect(built.rows).toHaveLength(0);
    expect(built.excluded).toHaveLength(1);
    expect(built.excluded[0]!.rowId).toBe("p-win");
    expect(built.excluded[0]!.missing.join(" ")).toMatch(/placeable/i);
  });

  it("every candidate input appears in exactly one of rows or excluded", () => {
    const input = [
      pick({ id: "a", result: "PENDING" }),
      pick({ id: "b", result: "WIN" }),
      pick({ id: "c", result: "PUSH" }),
    ];
    const built = buildCandidateRows(input);
    expect(built.rows.length + built.excluded.length).toBe(input.length);
  });
});
