/**
 * WP-0 hard write gate — future picks cannot publish without a
 * fiveStageReceipt (schemaVersion 2026-11-13-v1) and generatedAt >=
 * gameDataFreshnessAt. Past games are exempt (Q3a historical record).
 */
import { describe, expect, it } from "vitest";
import {
  FIVE_STAGE_RECEIPT_SCHEMA_VERSION,
  evaluateFuturePickPublication,
  futurePickPublishable,
} from "../publication-gate.js";

const NOW = new Date("2026-11-13T08:00:00Z");
const FUTURE_KICKOFF = new Date("2026-11-15T18:00:00Z");
const PAST_KICKOFF = new Date("2026-11-12T01:20:00Z");
const FRESH = new Date("2026-11-13T07:00:00Z");
const GENERATED = new Date("2026-11-13T07:30:00Z");

const receipt = { schemaVersion: FIVE_STAGE_RECEIPT_SCHEMA_VERSION, gatePassed: true };
const goodInput = {
  factorBreakdown: { fiveStageReceipt: receipt },
  generatedAt: GENERATED,
  gameDataFreshnessAt: FRESH,
  gameCommenceTime: FUTURE_KICKOFF,
  now: NOW,
};

describe("futurePickPublishable (WP-0 hard write gate)", () => {
  it("allows a future pick with a valid receipt generated after its data", () => {
    expect(futurePickPublishable(goodInput)).toBe(true);
  });

  it("exempts past games even with no receipt (Q3a historical record)", () => {
    const decision = evaluateFuturePickPublication({
      ...goodInput,
      factorBreakdown: {},
      gameCommenceTime: PAST_KICKOFF,
    });
    expect(decision.allowed).toBe(true);
    expect(decision.reason).toContain("Q3a");
  });

  it("blocks a future pick with no receipt", () => {
    const decision = evaluateFuturePickPublication({ ...goodInput, factorBreakdown: {} });
    expect(decision.allowed).toBe(false);
    expect(decision.blockedBy.join(" ")).toContain("fiveStageReceipt.schemaVersion");
  });

  it("blocks a future pick with a stale schemaVersion receipt", () => {
    expect(
      futurePickPublishable({
        ...goodInput,
        factorBreakdown: { fiveStageReceipt: { schemaVersion: "2026-09-01-v0", gatePassed: true } },
      }),
    ).toBe(false);
  });

  it("blocks a future pick generated before its game data freshness", () => {
    const decision = evaluateFuturePickPublication({
      ...goodInput,
      generatedAt: new Date("2026-11-13T06:00:00Z"),
    });
    expect(decision.allowed).toBe(false);
    expect(decision.blockedBy.join(" ")).toContain("predates its own data");
  });

  it("allows generatedAt exactly equal to gameDataFreshnessAt", () => {
    expect(futurePickPublishable({ ...goodInput, generatedAt: FRESH })).toBe(true);
  });

  it("fails closed when kickoff is unknown", () => {
    expect(futurePickPublishable({ ...goodInput, gameCommenceTime: null })).toBe(false);
  });

  it("fails closed when freshness or generatedAt is missing", () => {
    expect(futurePickPublishable({ ...goodInput, gameDataFreshnessAt: null })).toBe(false);
    expect(futurePickPublishable({ ...goodInput, generatedAt: undefined })).toBe(false);
  });

  it("fails closed on null/absent factorBreakdown", () => {
    expect(futurePickPublishable({ ...goodInput, factorBreakdown: null })).toBe(false);
    expect(futurePickPublishable({ ...goodInput, factorBreakdown: undefined })).toBe(false);
  });

  it("accepts ISO string timestamps as well as Dates", () => {
    expect(
      futurePickPublishable({
        factorBreakdown: { fiveStageReceipt: receipt },
        generatedAt: GENERATED.toISOString(),
        gameDataFreshnessAt: FRESH.toISOString(),
        gameCommenceTime: FUTURE_KICKOFF.toISOString(),
        now: NOW,
      }),
    ).toBe(true);
  });
});