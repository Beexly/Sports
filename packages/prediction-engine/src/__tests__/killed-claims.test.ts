import { describe, expect, it } from "vitest";
import {
  FOUR_MINUTE_RUN_RATE,
  KilledClaimError,
  assertKnownByLock,
  blendWinAndClv,
  bocpdRookieBreakpoint,
  clvTag,
  crewDpiRating,
  dispersionAsUncertainty,
  fourthShortAlternative,
  FOURTH_SHORT_GO_RATE,
  safetyOutExplosiveBoost,
  steamExhaustionFade,
  twoSignalCellRule,
  flatKickingEnvelope,
  fourMinuteRunPrior,
  nickelSlotSuppression,
  offensiveLineTotalPenalty,
  rankForWin,
  redZoneTotalMultiplier,
  schemeFingerprintDefenceScore,
  singleCopulaFamily,
} from "../nfl/killed-claims";
import { pairingDependence } from "../copula/archimedean-sgp";

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

  it("refuses the retractions from the 2026-10-23 measurements", () => {
    expect(() => nickelSlotSuppression()).toThrow(/6\.18/);
    expect(() => offensiveLineTotalPenalty()).toThrow(/KILLED/);
    expect(() => bocpdRookieBreakpoint()).toThrow(/27\.4/);
    expect(() => flatKickingEnvelope(1.15)).toThrow(/0\.826/);
    expect(() => blendWinAndClv()).toThrow(/0\.241/);
    expect(() => singleCopulaFamily()).toThrow(/0\.385/);
    const ranked = rankForWin([
      { id: "a", marketFairProb: 0.4, confidence: 0.9 },
      { id: "b", marketFairProb: 0.7, confidence: 0.2 },
    ]);
    expect(ranked.map((r) => r.id)).toEqual(["b", "a"]);
    expect(clvTag(ranked[1]!.confidence)).toBe(0.9);
    expect(pairingDependence("QB_WR1").sign).toBe("positive");
    expect(pairingDependence("QB_RB1").sign).toBe("flat");
    expect(() => assertKnownByLock("2026-10-22T18:00:00Z", "2026-10-21T23:59:00Z")).toThrow(/FAIL-CLOSED/);
    expect(() => assertKnownByLock("2026-10-21T12:00:00Z", "2026-10-21T23:59:00Z")).not.toThrow();
    expect(() => steamExhaustionFade()).toThrow(/0\.005/);
    expect(() => dispersionAsUncertainty()).toThrow(/0\.90/);
    expect(() => safetyOutExplosiveBoost()).toThrow(/0\.0258/);
    expect(() => crewDpiRating()).toThrow(/0\.50/);
    expect(() => twoSignalCellRule()).toThrow(/z-score/);
    expect(() => fourthShortAlternative("PUNT")).toThrow(/17 of 1,018/);
    expect(fourthShortAlternative("FG")).toBeCloseTo(0.195, 3);
    expect(FOURTH_SHORT_GO_RATE).toBeCloseTo(0.694, 3);
  });
});
