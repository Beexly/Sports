import { describe, expect, it } from "vitest";
import {
  buildGateDecisionRecord,
  GATE_DECISION_STATUSES,
  readGateDecisionOrNull,
  recordGateDecision,
} from "../gate-decision-writer";

const base = {
  gameId: "g1",
  status: "GATED" as const,
  reason: "Not enough sportsbooks are pricing this game yet.",
  reasonCode: "INSUFFICIENT_BOOKS",
  modelVersion: "v5.2.1",
  evaluatedAt: new Date("2026-09-18T00:00:00.000Z"),
  isBootstrap: false,
};

describe("gate decision writer", () => {
  it("fails if isBootstrap is omitted", () => {
    const { isBootstrap: _omit, ...rest } = base;
    expect(() =>
      buildGateDecisionRecord(rest as typeof base),
    ).toThrow("isBootstrap_required");
  });

  it("rejects an unknown status (existing enum, no parallel vocabulary)", () => {
    expect(() =>
      buildGateDecisionRecord({ ...base, status: "PASSED" as never }),
    ).toThrow(/unknown_status/);
    expect(GATE_DECISION_STATUSES).toEqual(["SCORING", "PUBLISHED", "GATED"]);
  });

  it("writes with isBootstrap set explicitly and sink is called", async () => {
    const seen: unknown[] = [];
    const row = await recordGateDecision(base, (r) => {
      seen.push(r);
    });
    expect(row.isBootstrap).toBe(false);
    expect(seen).toHaveLength(1);
  });

  it("reader returns null on no row rather than a default", () => {
    expect(readGateDecisionOrNull(undefined)).toBeNull();
    expect(readGateDecisionOrNull(null)).toBeNull();
    expect(readGateDecisionOrNull(base)).toBe(base);
  });
});
