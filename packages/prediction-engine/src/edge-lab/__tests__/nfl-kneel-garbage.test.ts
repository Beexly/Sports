import { describe, expect, it } from "vitest";
import {
  KNEEL_GARBAGE_METHOD_TAG,
  evaluateKneelGarbage,
  type KneelGarbageInput,
} from "../nfl-kneel-garbage.js";

function base(over: Partial<KneelGarbageInput> = {}): KneelGarbageInput {
  return {
    spreadLine: 7,
    scoreDifferential: 0,
    gameSecondsRemaining: 900,
    playType: "pass",
    posteamType: "favorite",
    ...over,
  };
}

describe("evaluateKneelGarbage", () => {
  it.each([
    {
      name: "kneel-out favorite deletes remaining pass attempts",
      input: base({
        spreadLine: 10,
        scoreDifferential: 14,
        gameSecondsRemaining: 90,
        playType: "run",
        posteamType: "favorite",
      }),
      want: { ok: true, regime: "kneel_out" as const, deletedPos: true, inflationZero: true },
    },
    {
      name: "qb_kneel in kneel-out window supports kneel_out",
      input: base({
        spreadLine: 7,
        scoreDifferential: 3,
        gameSecondsRemaining: 40,
        playType: "qb_kneel",
        posteamType: "favorite",
      }),
      want: { ok: true, regime: "kneel_out" as const, deletedPos: true, inflationZero: true },
    },
    {
      name: "trailing garbage inflates pass attempts (opposite sign)",
      input: base({
        spreadLine: -7,
        scoreDifferential: -14,
        gameSecondsRemaining: 90,
        playType: "pass",
        posteamType: "underdog",
      }),
      want: { ok: true, regime: "garbage_hurry" as const, deletedZero: true, inflationPos: true },
    },
    {
      name: "mid-game 15:00 leftover → normal zeros",
      input: base({
        spreadLine: 10,
        scoreDifferential: 14,
        gameSecondsRemaining: 900,
        playType: "pass",
        posteamType: "favorite",
      }),
      want: { ok: true, regime: "normal" as const, deletedZero: true, inflationZero: true },
    },
  ])("$name", ({ input, want }) => {
    const r = evaluateKneelGarbage(input);
    expect(r.priced).toBe(false);
    expect(r.methodTag).toBe(KNEEL_GARBAGE_METHOD_TAG);
    expect(r.ok).toBe(want.ok);
    if (!r.ok) throw new Error("expected ok");
    expect(r.regime).toBe(want.regime);
    if (want.deletedPos) expect(r.remainingPassAttemptsDeleted).toBeGreaterThan(0);
    if (want.deletedZero) expect(r.remainingPassAttemptsDeleted).toBe(0);
    if (want.inflationPos) expect(r.garbagePassInflation).toBeGreaterThan(0);
    if (want.inflationZero) expect(r.garbagePassInflation).toBe(0);
  });

  it("refuses a NaN clock (fail-closed, no imputation)", () => {
    const r = evaluateKneelGarbage(base({ gameSecondsRemaining: Number.NaN }));
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected refuse");
    expect(r.refuse).toBe("bad_input");
    expect(r.priced).toBe(false);
    expect(r.methodTag).toBe(KNEEL_GARBAGE_METHOD_TAG);
  });

  it("refuses a negative clock as bad_input", () => {
    const r = evaluateKneelGarbage(base({ gameSecondsRemaining: -1 }));
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected refuse");
    expect(r.refuse).toBe("bad_input");
  });

  it("refuses zero remaining clock rather than inventing volume", () => {
    const r = evaluateKneelGarbage(base({ gameSecondsRemaining: 0 }));
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected refuse");
    expect(r.refuse).toBe("insufficient_clock");
    expect(r.priced).toBe(false);
  });

  it("priced === false always, methodTag frozen", () => {
    expect(KNEEL_GARBAGE_METHOD_TAG).toBe("nfl_kneel_garbage_v1");
    const rows: KneelGarbageInput[] = [
      base({ scoreDifferential: 14, gameSecondsRemaining: 80, posteamType: "favorite" }),
      base({ scoreDifferential: -17, gameSecondsRemaining: 45, posteamType: "underdog" }),
      base({ gameSecondsRemaining: 900 }),
      base({ gameSecondsRemaining: Number.NaN }),
      base({ spreadLine: Number.NaN }),
    ];
    for (const input of rows) {
      const r = evaluateKneelGarbage(input);
      expect(r.priced).toBe(false);
      expect(r.methodTag).toBe("nfl_kneel_garbage_v1");
    }
  });
});
