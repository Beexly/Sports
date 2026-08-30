import { describe, expect, it } from "vitest";
import { PromotionIntegrityError, validateWalkForwardIntegrity } from "../integrity.js";
import type { ClvRow, PairedBrierRow, RegisteredWindow } from "../types.js";

const baseWindow: RegisteredWindow = {
  windowId: "w-2026-h1",
  marketFamily: "nfl-spreads",
  registeredAt: "2026-01-01T00:00:00.000Z",
  start: "2026-02-01T00:00:00.000Z",
  end: "2026-03-01T00:00:00.000Z",
  nMin: 500,
  deltaPrac: 0.002,
  epsilonClv: 0.0005,
  minClvN: 100,
  concurrentChallengers: 1,
  alpha: 0.05,
  registeredEventIds: ["evt-1", "evt-2", "evt-3"],
  coverageFloor: 0.95,
};

function brierRow(overrides: Partial<PairedBrierRow> = {}): PairedBrierRow {
  return {
    eventId: "evt-1",
    championProb: 0.55,
    challengerProb: 0.6,
    outcome: 1,
    lockedAt: "2026-02-05T00:00:00.000Z",
    settledAt: "2026-02-06T00:00:00.000Z",
    ...overrides,
  };
}

function clvRow(overrides: Partial<ClvRow> = {}): ClvRow {
  return {
    pickId: "pick-1",
    model: "champion",
    clv: 0.01,
    lockedAt: "2026-02-05T00:00:00.000Z",
    settledAt: "2026-02-06T00:00:00.000Z",
    ...overrides,
  };
}

describe("validateWalkForwardIntegrity", () => {
  it("passes for a properly registered window with valid rows", () => {
    expect(() => validateWalkForwardIntegrity(baseWindow, [brierRow()], [clvRow()])).not.toThrow();
  });

  it("rejects when registeredAt equals window.start", () => {
    const window: RegisteredWindow = { ...baseWindow, registeredAt: baseWindow.start };
    expect(() => validateWalkForwardIntegrity(window, [], [])).toThrow(PromotionIntegrityError);
  });

  it("rejects when registeredAt is after window.start", () => {
    const window: RegisteredWindow = { ...baseWindow, registeredAt: "2026-02-15T00:00:00.000Z" };
    expect(() => validateWalkForwardIntegrity(window, [], [])).toThrow(PromotionIntegrityError);
  });

  it("rejects a brier row with lockedAt before window.start", () => {
    const row = brierRow({ lockedAt: "2026-01-15T00:00:00.000Z", settledAt: "2026-02-06T00:00:00.000Z" });
    expect(() => validateWalkForwardIntegrity(baseWindow, [row], [])).toThrow(PromotionIntegrityError);
  });

  it("rejects a brier row with lockedAt after window.end", () => {
    const row = brierRow({ lockedAt: "2026-03-15T00:00:00.000Z", settledAt: "2026-03-16T00:00:00.000Z" });
    expect(() => validateWalkForwardIntegrity(baseWindow, [row], [])).toThrow(PromotionIntegrityError);
  });

  it("rejects a clv row with lockedAt outside the window", () => {
    const row = clvRow({ lockedAt: "2026-03-15T00:00:00.000Z", settledAt: "2026-03-16T00:00:00.000Z" });
    expect(() => validateWalkForwardIntegrity(baseWindow, [], [row])).toThrow(PromotionIntegrityError);
  });

  it("rejects a row where settledAt equals lockedAt", () => {
    const row = brierRow({ lockedAt: "2026-02-05T00:00:00.000Z", settledAt: "2026-02-05T00:00:00.000Z" });
    expect(() => validateWalkForwardIntegrity(baseWindow, [row], [])).toThrow(PromotionIntegrityError);
  });

  it("rejects a row where settledAt is before lockedAt", () => {
    const row = brierRow({ lockedAt: "2026-02-05T12:00:00.000Z", settledAt: "2026-02-05T00:00:00.000Z" });
    expect(() => validateWalkForwardIntegrity(baseWindow, [row], [])).toThrow(PromotionIntegrityError);
  });

  it("rejects a window where start is not before end", () => {
    const window: RegisteredWindow = { ...baseWindow, start: baseWindow.end, end: baseWindow.start };
    expect(() => validateWalkForwardIntegrity(window, [], [])).toThrow(PromotionIntegrityError);
  });

  it("rejects an unparseable timestamp", () => {
    const window: RegisteredWindow = { ...baseWindow, registeredAt: "not-a-date" };
    expect(() => validateWalkForwardIntegrity(window, [], [])).toThrow(PromotionIntegrityError);
  });

  it("reports which row and field failed in the error message", () => {
    const row = brierRow({ settledAt: "2026-02-01T00:00:00.000Z", lockedAt: "2026-02-05T00:00:00.000Z" });
    expect(() => validateWalkForwardIntegrity(baseWindow, [row], [])).toThrow(/brierRows\[0\]/);
  });

  it("rejects a timestamp without an explicit timezone (local-TZ parsing breaks replay)", () => {
    const row = brierRow({ lockedAt: "2026-02-05T00:00:00", settledAt: "2026-02-06T00:00:00.000Z" });
    expect(() => validateWalkForwardIntegrity(baseWindow, [row], [])).toThrow(/explicit timezone/);
    const window: RegisteredWindow = { ...baseWindow, registeredAt: "2026-01-01T00:00:00" };
    expect(() => validateWalkForwardIntegrity(window, [], [])).toThrow(/explicit timezone/);
  });

  it("accepts an explicit non-Z offset timestamp", () => {
    const row = brierRow({ lockedAt: "2026-02-05T01:00:00.000+01:00", settledAt: "2026-02-06T00:00:00.000Z" });
    expect(() => validateWalkForwardIntegrity(baseWindow, [row], [])).not.toThrow();
  });

  it("rejects duplicate brier eventIds (a repeated favorable event must not inflate N or the mean)", () => {
    const rows = [brierRow(), brierRow({ challengerProb: 0.9 })]; // same evt-1 twice
    expect(() => validateWalkForwardIntegrity(baseWindow, rows, [])).toThrow(/duplicate/);
  });

  it("rejects duplicate clv pickIds", () => {
    const rows = [clvRow(), clvRow({ clv: 0.5 })]; // same pick-1 twice
    expect(() => validateWalkForwardIntegrity(baseWindow, [], rows)).toThrow(/duplicate/);
  });

  it("rejects a brier eventId outside the pre-registered universe (cherry-picking by construction)", () => {
    const row = brierRow({ eventId: "evt-rogue" });
    expect(() => validateWalkForwardIntegrity(baseWindow, [row], [])).toThrow(/pre-registered event universe/);
  });

  it("rejects an empty registered universe and an out-of-range coverageFloor", () => {
    expect(() =>
      validateWalkForwardIntegrity({ ...baseWindow, registeredEventIds: [] }, [], []),
    ).toThrow(PromotionIntegrityError);
    expect(() => validateWalkForwardIntegrity({ ...baseWindow, coverageFloor: 0 }, [], [])).toThrow(
      PromotionIntegrityError,
    );
    expect(() => validateWalkForwardIntegrity({ ...baseWindow, coverageFloor: 1.2 }, [], [])).toThrow(
      PromotionIntegrityError,
    );
  });

  it("rejects out-of-range or non-finite probabilities and non-binary outcomes", () => {
    expect(() =>
      validateWalkForwardIntegrity(baseWindow, [brierRow({ championProb: 1.7 })], []),
    ).toThrow(/finite probability/);
    expect(() =>
      validateWalkForwardIntegrity(baseWindow, [brierRow({ challengerProb: Number.NaN })], []),
    ).toThrow(/finite probability/);
    expect(() =>
      validateWalkForwardIntegrity(baseWindow, [brierRow({ outcome: 2 as unknown as 0 | 1 })], []),
    ).toThrow(/exactly 0 or 1/);
  });

  it("rejects an unknown clv model label instead of letting it be silently dropped from Leg 2", () => {
    const rogue = clvRow({ model: "chalenger" as unknown as ClvRow["model"] });
    expect(() => validateWalkForwardIntegrity(baseWindow, [], [rogue])).toThrow(/champion" or "challenger/);
  });

  it("rejects a non-finite clv value", () => {
    expect(() =>
      validateWalkForwardIntegrity(baseWindow, [], [clvRow({ clv: Number.POSITIVE_INFINITY })]),
    ).toThrow(/must be finite/);
  });
});
