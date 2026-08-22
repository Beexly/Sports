import { describe, expect, it } from "vitest";
import {
  evaluateProductNoBet,
  PRODUCT_NO_BET_COPY,
  type ProductNoBetCode,
  type ProductNoBetEvidence,
} from "../no-bet-gate.js";

const ALL_CODES: readonly ProductNoBetCode[] = [
  "LIVE_BOARD_OFF",
  "FRESHNESS_FAILED",
  "PRICE_BELOW_THRESHOLD",
  "MODEL_DISAGREEMENT",
  "SAMPLE_FLOOR",
  "WIDTH_EXCEEDED",
  "EDGE_BELOW_TAU",
  "STALE_ODDS",
  "MISSING_INPUT",
  "RIGHTS_HOLD",
];

/** Default evidence that PASSES (PLAY). */
function passingEvidence(
  overrides: Partial<ProductNoBetEvidence> = {},
): ProductNoBetEvidence {
  return {
    oddsAgeMs: 1_000,
    maxOddsAgeMs: 5_000,
    n: 40,
    nMin: 20,
    width: 0.04,
    widthMax: 0.10,
    pLo: 0.58,
    q: 0.50,
    tau: 0.02,
    liveBoardEnabled: true,
    missingInput: null,
    rightsHold: false,
    ...overrides,
  };
}

function expectUniqueCodes(codes: readonly ProductNoBetCode[]): void {
  expect(codes).toEqual([...new Set(codes)]);
}

describe("evaluateProductNoBet PLAY default", () => {
  it("returns PLAY with empty codes when every gate is open", () => {
    const evidence = passingEvidence();
    const result = evaluateProductNoBet(evidence);

    expect(result.action).toBe("PLAY");
    expect(result.codes).toEqual([]);
    expect(result.logged).toBe(true);
    expect(result.modelVersion).toBe("gse-gate-1.0.0");
    expect(result.summary).toBe("All gates open under current evidence.");
    expect(result.edge).toBeCloseTo(evidence.pLo - evidence.q, 12);
    expect(result.edge).toBeCloseTo(0.08, 12);
  });

  it("treats missingInput undefined the same as null", () => {
    const result = evaluateProductNoBet(
      passingEvidence({ missingInput: undefined }),
    );
    expect(result.action).toBe("PLAY");
    expect(result.codes).toEqual([]);
  });

  it("keeps PLAY on inclusive boundaries (age/n/width) when edge still clears tau", () => {
    const result = evaluateProductNoBet(
      passingEvidence({
        oddsAgeMs: 5_000,
        maxOddsAgeMs: 5_000,
        n: 20,
        nMin: 20,
        width: 0.10,
        widthMax: 0.10,
        pLo: 0.53,
        q: 0.50,
        tau: 0.02,
      }),
    );
    expect(result.action).toBe("PLAY");
    expect(result.codes).toEqual([]);
    expect(result.edge).toBeCloseTo(0.03, 12);
  });

  it("honors an explicit modelVersion on PLAY", () => {
    const result = evaluateProductNoBet(passingEvidence(), "gate-test-9");
    expect(result.action).toBe("PLAY");
    expect(result.modelVersion).toBe("gate-test-9");
  });
});

describe("evaluateProductNoBet independent codes", () => {
  it("fires LIVE_BOARD_OFF alone when the live board flag is off", () => {
    const result = evaluateProductNoBet(passingEvidence({ liveBoardEnabled: false }));
    expect(result.action).toBe("NO_BET");
    expect(result.codes).toEqual(["LIVE_BOARD_OFF"]);
    expectUniqueCodes(result.codes);
  });

  it("fires RIGHTS_HOLD alone when rightsHold is true", () => {
    const result = evaluateProductNoBet(passingEvidence({ rightsHold: true }));
    expect(result.action).toBe("NO_BET");
    expect(result.codes).toEqual(["RIGHTS_HOLD"]);
    expectUniqueCodes(result.codes);
  });

  it("fires MISSING_INPUT alone when a required input label is present", () => {
    const result = evaluateProductNoBet(
      passingEvidence({ missingInput: "pLo" }),
    );
    expect(result.action).toBe("NO_BET");
    expect(result.codes).toEqual(["MISSING_INPUT"]);
    expectUniqueCodes(result.codes);
  });

  it("fires STALE_ODDS with FRESHNESS_FAILED and nothing else when odds are stale", () => {
    const result = evaluateProductNoBet(
      passingEvidence({ oddsAgeMs: 5_001, maxOddsAgeMs: 5_000 }),
    );
    expect(result.action).toBe("NO_BET");
    expect(result.codes).toEqual(["STALE_ODDS", "FRESHNESS_FAILED"]);
    expectUniqueCodes(result.codes);
    expect(result.codes.filter((c) => c === "STALE_ODDS")).toHaveLength(1);
    expect(result.codes.filter((c) => c === "FRESHNESS_FAILED")).toHaveLength(1);
  });

  it("fires SAMPLE_FLOOR alone when n is below nMin", () => {
    const result = evaluateProductNoBet(passingEvidence({ n: 19, nMin: 20 }));
    expect(result.action).toBe("NO_BET");
    expect(result.codes).toEqual(["SAMPLE_FLOOR"]);
    expectUniqueCodes(result.codes);
  });

  it("fires WIDTH_EXCEEDED with MODEL_DISAGREEMENT and nothing else when width exceeds budget", () => {
    const result = evaluateProductNoBet(
      passingEvidence({ width: 0.11, widthMax: 0.10 }),
    );
    expect(result.action).toBe("NO_BET");
    expect(result.codes).toEqual(["WIDTH_EXCEEDED", "MODEL_DISAGREEMENT"]);
    expectUniqueCodes(result.codes);
    expect(result.codes.filter((c) => c === "WIDTH_EXCEEDED")).toHaveLength(1);
    expect(result.codes.filter((c) => c === "MODEL_DISAGREEMENT")).toHaveLength(1);
  });

  it("fires EDGE_BELOW_TAU with PRICE_BELOW_THRESHOLD and nothing else when edge does not clear tau", () => {
    const result = evaluateProductNoBet(
      passingEvidence({ pLo: 0.51, q: 0.50, tau: 0.02 }),
    );
    expect(result.action).toBe("NO_BET");
    expect(result.codes).toEqual(["EDGE_BELOW_TAU", "PRICE_BELOW_THRESHOLD"]);
    expectUniqueCodes(result.codes);
    expect(result.codes.filter((c) => c === "EDGE_BELOW_TAU")).toHaveLength(1);
    expect(result.codes.filter((c) => c === "PRICE_BELOW_THRESHOLD")).toHaveLength(1);
    expect(result.edge).toBeCloseTo(0.01, 12);
  });

  it("covers every ProductNoBetCode via a dedicated independent trigger", () => {
    const fired = new Set<ProductNoBetCode>();
    const cases: Array<{
      name: ProductNoBetCode;
      evidence: ProductNoBetEvidence;
      expected: readonly ProductNoBetCode[];
    }> = [
      {
        name: "LIVE_BOARD_OFF",
        evidence: passingEvidence({ liveBoardEnabled: false }),
        expected: ["LIVE_BOARD_OFF"],
      },
      {
        name: "RIGHTS_HOLD",
        evidence: passingEvidence({ rightsHold: true }),
        expected: ["RIGHTS_HOLD"],
      },
      {
        name: "MISSING_INPUT",
        evidence: passingEvidence({ missingInput: "q" }),
        expected: ["MISSING_INPUT"],
      },
      {
        name: "STALE_ODDS",
        evidence: passingEvidence({ oddsAgeMs: 9_000, maxOddsAgeMs: 1_000 }),
        expected: ["STALE_ODDS", "FRESHNESS_FAILED"],
      },
      {
        name: "FRESHNESS_FAILED",
        evidence: passingEvidence({ oddsAgeMs: 9_000, maxOddsAgeMs: 1_000 }),
        expected: ["STALE_ODDS", "FRESHNESS_FAILED"],
      },
      {
        name: "SAMPLE_FLOOR",
        evidence: passingEvidence({ n: 0, nMin: 1 }),
        expected: ["SAMPLE_FLOOR"],
      },
      {
        name: "WIDTH_EXCEEDED",
        evidence: passingEvidence({ width: 1, widthMax: 0.2 }),
        expected: ["WIDTH_EXCEEDED", "MODEL_DISAGREEMENT"],
      },
      {
        name: "MODEL_DISAGREEMENT",
        evidence: passingEvidence({ width: 1, widthMax: 0.2 }),
        expected: ["WIDTH_EXCEEDED", "MODEL_DISAGREEMENT"],
      },
      {
        name: "EDGE_BELOW_TAU",
        evidence: passingEvidence({ pLo: 0.50, q: 0.50, tau: 0.01 }),
        expected: ["EDGE_BELOW_TAU", "PRICE_BELOW_THRESHOLD"],
      },
      {
        name: "PRICE_BELOW_THRESHOLD",
        evidence: passingEvidence({ pLo: 0.50, q: 0.50, tau: 0.01 }),
        expected: ["EDGE_BELOW_TAU", "PRICE_BELOW_THRESHOLD"],
      },
    ];

    for (const row of cases) {
      const result = evaluateProductNoBet(row.evidence);
      expect(result.action).toBe("NO_BET");
      expect(result.codes).toEqual(row.expected);
      expect(result.codes).toContain(row.name);
      for (const code of result.codes) fired.add(code);
    }

    expect([...fired].sort()).toEqual([...ALL_CODES].sort());
    expect(Object.keys(PRODUCT_NO_BET_COPY).sort()).toEqual([...ALL_CODES].sort());
  });
});

describe("evaluateProductNoBet combination and de-duplication", () => {
  it("unions independent triggers without requiring every gate", () => {
    const result = evaluateProductNoBet(
      passingEvidence({
        liveBoardEnabled: false,
        rightsHold: true,
        n: 5,
        nMin: 10,
      }),
    );
    expect(result.action).toBe("NO_BET");
    expect(result.codes).toEqual(["LIVE_BOARD_OFF", "RIGHTS_HOLD", "SAMPLE_FLOOR"]);
    expectUniqueCodes(result.codes);
    expect(result.summary).toBe("No-Bet is intelligence. 3 gate(s) closed.");
  });

  it("combines paired triggers (stale + width + edge) without duplicating companion codes", () => {
    const result = evaluateProductNoBet(
      passingEvidence({
        oddsAgeMs: 10_000,
        maxOddsAgeMs: 1_000,
        width: 0.5,
        widthMax: 0.1,
        pLo: 0.40,
        q: 0.50,
        tau: 0.02,
      }),
    );
    expect(result.action).toBe("NO_BET");
    expect(result.codes).toEqual([
      "STALE_ODDS",
      "FRESHNESS_FAILED",
      "WIDTH_EXCEEDED",
      "MODEL_DISAGREEMENT",
      "EDGE_BELOW_TAU",
      "PRICE_BELOW_THRESHOLD",
    ]);
    expectUniqueCodes(result.codes);
    expect(result.codes.filter((c) => c === "STALE_ODDS")).toHaveLength(1);
    expect(result.codes.filter((c) => c === "FRESHNESS_FAILED")).toHaveLength(1);
    expect(result.codes.filter((c) => c === "WIDTH_EXCEEDED")).toHaveLength(1);
    expect(result.codes.filter((c) => c === "MODEL_DISAGREEMENT")).toHaveLength(1);
    expect(result.codes.filter((c) => c === "EDGE_BELOW_TAU")).toHaveLength(1);
    expect(result.codes.filter((c) => c === "PRICE_BELOW_THRESHOLD")).toHaveLength(1);
  });

  it("fires all ten ProductNoBetCodes together exactly once each via Set de-duplication", () => {
    const result = evaluateProductNoBet(
      passingEvidence({
        liveBoardEnabled: false,
        rightsHold: true,
        missingInput: "odds",
        oddsAgeMs: 8_000,
        maxOddsAgeMs: 100,
        n: 1,
        nMin: 50,
        width: 0.9,
        widthMax: 0.05,
        pLo: 0.40,
        q: 0.55,
        tau: 0.03,
      }),
    );
    expect(result.action).toBe("NO_BET");
    expect([...result.codes].sort()).toEqual([...ALL_CODES].sort());
    expect(result.codes).toHaveLength(ALL_CODES.length);
    expectUniqueCodes(result.codes);
    expect(result.summary).toBe("No-Bet is intelligence. 10 gate(s) closed.");
    expect(result.logged).toBe(true);
  });

  it("does not fire companion codes unless their paired trigger is active", () => {
    const boardOnly = evaluateProductNoBet(
      passingEvidence({ liveBoardEnabled: false }),
    );
    expect(boardOnly.codes).not.toContain("FRESHNESS_FAILED");
    expect(boardOnly.codes).not.toContain("MODEL_DISAGREEMENT");
    expect(boardOnly.codes).not.toContain("PRICE_BELOW_THRESHOLD");
  });
});

describe("evaluateProductNoBet edge = pLo - q", () => {
  it("reports the same pLo - q arithmetic on PLAY", () => {
    const evidence = passingEvidence({ pLo: 0.61, q: 0.47, tau: 0.05 });
    const result = evaluateProductNoBet(evidence);
    expect(result.action).toBe("PLAY");
    expect(result.edge).toBe(evidence.pLo - evidence.q);
    expect(result.edge).toBeCloseTo(0.14, 12);
  });

  it("reports pLo - q on NO_BET when the edge gate itself closes", () => {
    const evidence = passingEvidence({ pLo: 0.52, q: 0.50, tau: 0.03 });
    const result = evaluateProductNoBet(evidence);
    expect(result.action).toBe("NO_BET");
    expect(result.codes).toEqual(["EDGE_BELOW_TAU", "PRICE_BELOW_THRESHOLD"]);
    expect(result.edge).toBe(evidence.pLo - evidence.q);
    expect(result.edge).toBeCloseTo(0.02, 12);
  });

  it("still reports pLo - q on NO_BET when a non-edge gate closes and edge would have passed", () => {
    const evidence = passingEvidence({
      liveBoardEnabled: false,
      pLo: 0.70,
      q: 0.55,
      tau: 0.02,
    });
    const result = evaluateProductNoBet(evidence);
    expect(result.action).toBe("NO_BET");
    expect(result.codes).toEqual(["LIVE_BOARD_OFF"]);
    expect(result.edge).toBe(evidence.pLo - evidence.q);
    expect(result.edge).toBeCloseTo(0.15, 12);
  });

  it("closes the edge gate when pLo - q equals tau (strict greater-than)", () => {
    const evidence = passingEvidence({ pLo: 0.75, q: 0.5, tau: 0.25 });
    const result = evaluateProductNoBet(evidence);
    expect(result.edge).toBe(evidence.pLo - evidence.q);
    expect(result.edge).toBe(evidence.tau);
    expect(result.action).toBe("NO_BET");
    expect(result.codes).toEqual(["EDGE_BELOW_TAU", "PRICE_BELOW_THRESHOLD"]);
  });

  it("reports a negative edge without changing the subtraction", () => {
    const evidence = passingEvidence({ pLo: 0.40, q: 0.55, tau: 0.01 });
    const result = evaluateProductNoBet(evidence);
    expect(result.action).toBe("NO_BET");
    expect(result.edge).toBe(evidence.pLo - evidence.q);
    expect(result.edge).toBeCloseTo(-0.15, 12);
  });
});
