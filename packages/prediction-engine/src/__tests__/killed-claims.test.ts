import { describe, expect, it } from "vitest";
import {
  FOUR_MINUTE_RUN_RATE,
  KilledClaimError,
  fourMinuteRunPrior,
  redZoneTotalMultiplier,
  schemeFingerprintDefenceScore,
} from "../nfl/killed-claims";

describe("killed claims stay killed", () => {
  it("refuses a defence-level scheme fingerprint", () => {
    expect(() => schemeFingerprintDefenceScore()).toThrow(KilledClaimError);
  });

  it("refuses a cross-season red-zone rating and allows a market-shape scope with no lift", () => {
    expect(() => redZoneTotalMultiplier("cross-season-rating")).toThrow(/KILLED/);
    expect(redZoneTotalMultiplier("current-season-market-shape")).toBe(1);
  });

  it("refuses a run-heavy 4-minute prior", () => {
    expect(FOUR_MINUTE_RUN_RATE).toBeCloseTo(0.422, 3);
    expect(() => fourMinuteRunPrior(0.7)).toThrow(/0\.422/);
    expect(fourMinuteRunPrior(0.42)).toBeCloseTo(0.422, 3);
  });
});
