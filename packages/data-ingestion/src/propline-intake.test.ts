import { describe, expect, it } from "vitest";
import {
  closingLineValue,
  gradeSettlement,
  ingestPropLines,
  lineAsOf,
  pinnacleNoVig,
  proplineEnabled,
  type PropLineHistoryEntry,
  type PropLineRecord,
  type PropSettlement,
} from "./propline-intake.js";

const enabledEnv = { PROPLINE_INTAKE_ENABLED: "true" } as NodeJS.ProcessEnv;
const disabledEnv = {} as NodeJS.ProcessEnv;

function record(over: Partial<PropLineRecord> = {}): PropLineRecord {
  return {
    eventId: "evt-1",
    playerId: "p1",
    propMarket: "receptions",
    selection: "over",
    pinnacleOverPrice: 1.91,
    pinnacleUnderPrice: 1.91,
    line: 5.5,
    asOf: "2026-09-25T12:00:00.000Z",
    source: "propline",
    ...over,
  };
}

describe("D1 proplineEnabled", () => {
  it("is env-gated and default OFF", () => {
    expect(proplineEnabled(disabledEnv)).toBe(false);
    expect(proplineEnabled(enabledEnv)).toBe(true);
  });
});

describe("D1 pinnacleNoVig", () => {
  it("computes Pinnacle-anchored fair prices", () => {
    const r = pinnacleNoVig(1.91, 1.91);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.overProb).toBeCloseTo(0.5, 3);
      expect(r.data.underProb).toBeCloseTo(0.5, 3);
      expect(r.data.fairOver).toBeCloseTo(2.0, 2);
      expect(r.data.vigRemoved).toBe(true);
    }
  });

  it("removes asymmetric vig", () => {
    const r = pinnacleNoVig(1.85, 2.05);
    expect(r.ok).toBe(true);
    if (r.ok) {
      // Lower price (1.85) → higher implied → higher fair prob after no-vig
      expect(r.data.overProb).toBeGreaterThan(r.data.underProb);
      expect(r.data.overProb + r.data.underProb).toBeCloseTo(1, 5);
    }
  });

  it("fail-closes on missing or invalid prices", () => {
    expect(pinnacleNoVig(null, 1.91).ok).toBe(false);
    expect(pinnacleNoVig(1.91, null).ok).toBe(false);
    expect(pinnacleNoVig(1.0, 1.91).ok).toBe(false);
    expect(pinnacleNoVig(0.5, 1.91).ok).toBe(false);
  });
});

describe("D1 lineAsOf", () => {
  const history: PropLineHistoryEntry[] = [
    { asOf: "2026-09-25T10:00:00.000Z", line: 5.5, overPrice: 1.95, underPrice: 1.87 },
    { asOf: "2026-09-25T12:00:00.000Z", line: 6.0, overPrice: 1.91, underPrice: 1.91 },
    { asOf: "2026-09-25T14:00:00.000Z", line: 6.5, overPrice: 1.88, underPrice: 1.94 },
  ];

  it("returns the latest entry at or before asOfTime", () => {
    const e = lineAsOf(history, "2026-09-25T13:00:00.000Z");
    expect(e).not.toBeNull();
    expect(e!.line).toBe(6.0);
  });

  it("never returns a future line", () => {
    const e = lineAsOf(history, "2026-09-25T09:00:00.000Z");
    expect(e).toBeNull();
  });

  it("returns null on invalid timestamp", () => {
    expect(lineAsOf(history, "not-a-date")).toBeNull();
  });
});

describe("D1 gradeSettlement", () => {
  const settlement: PropSettlement = {
    eventId: "evt-1",
    playerId: "p1",
    propMarket: "receptions",
    actual: 7,
    settledAt: "2026-09-25T23:00:00.000Z",
    overWon: null,
  };

  it("grades over/under against the closing line", () => {
    const r = gradeSettlement(settlement, 6.0);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.overWon).toBe(true);
      expect(r.data.clvEligible).toBe(true);
    }

    const under = gradeSettlement(settlement, 7.5);
    expect(under.ok).toBe(true);
    if (under.ok) expect(under.data.overWon).toBe(false);
  });

  it("fail-closes on missing actual — never imputes", () => {
    expect(gradeSettlement({ ...settlement, actual: null }, 6).ok).toBe(false);
    expect(gradeSettlement(null, 6).ok).toBe(false);
    expect(gradeSettlement(settlement, null).ok).toBe(false);
  });
});

describe("D1 ingestPropLines", () => {
  it("rejects everything when env gate is off", () => {
    const r = ingestPropLines([record()], disabledEnv);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("disabled");
  });

  it("accepts valid records and rejects bad ones", () => {
    const r = ingestPropLines(
      [
        record(),
        record({ eventId: "" }),
        record({ playerId: "  " }),
        record({ asOf: "nope" }),
        record({ eventId: "evt-2", playerId: "p2" }),
      ],
      enabledEnv,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.accepted).toHaveLength(2);
      expect(r.data.rejected).toHaveLength(3);
    }
  });
});

describe("D1 closingLineValue", () => {
  it("computes CLV as fair close prob minus bet implied", () => {
    // Bet at 2.10 → implied 0.476; fair close 0.55 → CLV ≈ 0.074
    const r = closingLineValue(2.1, 0.55);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBeCloseTo(0.55 - 1 / 2.1, 5);
  });

  it("fail-closes on invalid inputs", () => {
    expect(closingLineValue(null, 0.5).ok).toBe(false);
    expect(closingLineValue(1.0, 0.5).ok).toBe(false);
    expect(closingLineValue(2.0, null).ok).toBe(false);
    expect(closingLineValue(2.0, 1.2).ok).toBe(false);
    expect(closingLineValue(2.0, 0).ok).toBe(false);
  });
});
