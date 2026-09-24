import { describe, expect, it } from "vitest";
import { composeLedger } from "../signal-ledger.js";
import {
  RUSH_LEDGER_CONFIDENCE,
  RUSH_LEDGER_WEIGHT,
  rushProfileToLedgerPlayer,
  rushProfileToLedgerSignals,
  type RushProfileLedgerInput,
} from "../rush-profile-ledger.js";

const CAPTURED_AT = "2026-09-24T12:00:00.000Z";

function profile(over: Partial<RushProfileLedgerInput> = {}): RushProfileLedgerInput {
  return {
    runs: 200,
    guardRuns: 110,
    tackleRuns: 50,
    endRuns: 40,
    leftRuns: 60,
    middleRuns: 80,
    rightRuns: 60,
    epaPerRun: 0.12,
    capturedAt: CAPTURED_AT,
    ...over,
  };
}

describe("rushProfileToLedgerSignals", () => {
  it("maps interior/power and EPA to conservative ledger rows", () => {
    const rows = rushProfileToLedgerSignals(profile());
    expect(rows.map((row) => row.key)).toEqual(["rush.epa_per_run", "rush.scheme_lean"]);
    expect(rows[0]!.value).toBe(0.12);
    expect(rows[1]!.value).toBe(1);
    expect(rows.every((row) => row.weight === RUSH_LEDGER_WEIGHT)).toBe(true);
    expect(rows.every((row) => row.confidence === RUSH_LEDGER_CONFIDENCE)).toBe(true);
  });

  it("maps outside/zone as the opposite directional lean and clamps EPA", () => {
    const rows = rushProfileToLedgerSignals(
      profile({ guardRuns: 40, tackleRuns: 40, endRuns: 100, epaPerRun: -2 }),
    );
    expect(rows.find((row) => row.key === "rush.scheme_lean")!.value).toBe(-1);
    expect(rows.find((row) => row.key === "rush.epa_per_run")!.value).toBe(-1);
  });

  it("does not vote a scheme for a balanced profile", () => {
    const rows = rushProfileToLedgerSignals(
      profile({ guardRuns: 70, tackleRuns: 70, endRuns: 40, middleRuns: 20 }),
    );
    expect(rows.map((row) => row.key)).toEqual(["rush.epa_per_run"]);
  });

  it("drops low-sample and non-finite readings", () => {
    expect(rushProfileToLedgerSignals(profile({ runs: 19 }))).toEqual([]);
    expect(rushProfileToLedgerSignals(profile({ epaPerRun: Number.NaN }))).toEqual([]);
  });

  it("composes through the existing ledger with a bad timestamp inert", () => {
    const player = rushProfileToLedgerPlayer("p1", profile());
    const score = composeLedger(player.signals, { now: CAPTURED_AT, halfLifeDays: 0 });
    expect(score.signalsUsed).toBe(2);
    const bad = rushProfileToLedgerSignals(profile({ capturedAt: "not-a-date" }));
    expect(composeLedger(bad, { now: CAPTURED_AT, halfLifeDays: 0 }).signalsUsed).toBe(0);
  });
});
