/**
 * Parlay X-Ray — logic-only tests (node env, no DOM).
 *
 * The 2-leg QB-WR case is cross-checked against an INDEPENDENT implementation
 * of the fitted survival-copula formula (theta 0.788, as fitted in
 * packages/prediction-engine/src/nfl/sgp-copula.ts), not against the engine
 * function itself — so a wiring regression cannot pass tautologically.
 */
import { describe, expect, it } from "vitest";
import {
  americanDisplay,
  americanToDecimal,
  americanToImpliedProb,
  chanceDisplay,
  classifyPair,
  impliedProbToAmerican,
  parseAmericanOdds,
  parseXrayRequest,
  relationshipForPairing,
  xrayTicket,
  type XrayResult,
} from "./xray";

/** Independent Clayton survival joint: 1 - u - v + (u^-t + v^-t - 1)^(-1/t). */
function claytonSurvival(p1: number, p2: number, theta: number): number {
  const u = 1 - p1;
  const v = 1 - p2;
  return 1 - u - v + Math.pow(Math.pow(u, -theta) + Math.pow(v, -theta) - 1, -1 / theta);
}

const QB_WR_THETA = 0.788; // fitted constant from the engine module
const P_MINUS_110 = 110 / 210;

describe("odds helpers", () => {
  it("converts negative American odds", () => {
    expect(americanToImpliedProb(-110)).toBeCloseTo(0.5238095, 6);
    expect(americanToImpliedProb(-200)).toBeCloseTo(2 / 3, 6);
    expect(americanToImpliedProb(-100)).toBeCloseTo(0.5, 6);
  });

  it("converts positive American odds", () => {
    expect(americanToImpliedProb(150)).toBeCloseTo(0.4, 6);
    expect(americanToImpliedProb(100)).toBeCloseTo(0.5, 6);
    expect(americanToImpliedProb(260)).toBeCloseTo(100 / 360, 6);
  });

  it("rejects out-of-range and non-numeric odds", () => {
    for (const bad of [0, 50, -50, 99, NaN, Infinity, -Infinity]) {
      expect(americanToImpliedProb(bad)).toBeNull();
    }
    expect(parseAmericanOdds("abc")).toBeNull();
    expect(parseAmericanOdds("")).toBeNull();
    expect(parseAmericanOdds(null)).toBeNull();
    expect(parseAmericanOdds({})).toBeNull();
  });

  it("parses string odds with signs, spaces and commas", () => {
    expect(parseAmericanOdds("+170")).toBe(170);
    expect(parseAmericanOdds(" -110 ")).toBe(-110);
    expect(parseAmericanOdds("170")).toBe(170);
    expect(parseAmericanOdds("+1,000")).toBe(1000);
  });

  it("converts American to decimal", () => {
    expect(americanToDecimal(-110)).toBeCloseTo(1.9090909, 6);
    expect(americanToDecimal(150)).toBeCloseTo(2.5, 6);
    expect(americanToDecimal(50)).toBeNull();
  });

  it("round-trips probability → American", () => {
    expect(impliedProbToAmerican(0.4)).toBe(150);
    expect(impliedProbToAmerican(0.6)).toBe(-150);
    expect(impliedProbToAmerican(0.5)).toBe(-100);
    expect(impliedProbToAmerican(P_MINUS_110)).toBe(-110);
    expect(impliedProbToAmerican(0)).toBeNull();
    expect(impliedProbToAmerican(1)).toBeNull();
    expect(impliedProbToAmerican(NaN)).toBeNull();
  });

  it("formats displays without a % sign on chances", () => {
    expect(chanceDisplay(0.3466)).toBe("35/100");
    expect(chanceDisplay(0.5)).toBe("50/100");
    expect(chanceDisplay(1.4)).toBe("100/100");
    expect(chanceDisplay(-1)).toBe("0/100");
    expect(americanDisplay(170)).toBe("+170");
    expect(americanDisplay(-110)).toBe("-110");
  });
});

describe("pairing classification", () => {
  it("takes the skill leg's declared relationship", () => {
    expect(classifyPair("OTHER", "QB-WR")).toBe("QB-WR");
    expect(classifyPair("QB-TE", "OTHER")).toBe("QB-TE");
    expect(classifyPair("OTHER", "OTHER")).toBe("OTHER");
  });

  it("maps pairings to plain relationships", () => {
    expect(relationshipForPairing("QB-WR")).toBe("complementary");
    expect(relationshipForPairing("QB-TE")).toBe("complementary");
    expect(relationshipForPairing("QB-RB")).toBe("cannibalistic");
    expect(relationshipForPairing("OTHER")).toBe("independent");
  });
});

describe("xrayTicket — known 2-leg QB-WR case vs independence", () => {
  const outcome = xrayTicket(
    [
      { label: "QB over 275.5 passing yards", americanOdds: -110, role: "OTHER" },
      { label: "WR1 over 74.5 receiving yards", americanOdds: -110, role: "QB-WR" },
    ],
    170,
  );

  it("succeeds", () => {
    expect(outcome.ok).toBe(true);
  });

  const result = outcome.ok ? outcome.result : (null as unknown as XrayResult);

  it("model joint matches the fitted survival copula, not independence", () => {
    const expected = claytonSurvival(P_MINUS_110, P_MINUS_110, QB_WR_THETA);
    expect(result.modelJointProb).toBeCloseTo(expected, 9);
    expect(result.modelJointProb).toBeCloseTo(0.3466952, 5);
    // Complementary legs: strictly above the naive product.
    expect(result.modelJointProb).toBeGreaterThan(P_MINUS_110 * P_MINUS_110);
    expect(result.naiveJointProb).toBeCloseTo(P_MINUS_110 * P_MINUS_110, 9);
  });

  it("hidden hold = book implied − model joint", () => {
    const bookImplied = 100 / 270; // +170
    expect(result.bookImpliedProb).toBeCloseTo(bookImplied, 9);
    expect(result.hiddenHold).toBeCloseTo(bookImplied - result.modelJointProb, 9);
    expect(result.hiddenHold).toBeGreaterThan(0);
    expect(result.hiddenHoldPp).toBeCloseTo(result.hiddenHold * 100, 9);
    expect(result.hiddenHoldDisplay).toContain("extra margin");
  });

  it("fair price derives from the model joint", () => {
    expect(result.fairAmericanOdds).toBe(188); // 1/0.34668 ≈ 2.8845 → +188
    expect(result.fairPriceDisplay).toBe("+188");
  });

  it("renders chances as integer XX/100", () => {
    expect(result.modelChanceDisplay).toBe("35/100");
    expect(result.bookChanceDisplay).toBe("37/100");
  });

  it("flags the QB-WR pair as complementary with plain copy", () => {
    expect(result.pairs).toHaveLength(1);
    const pair = result.pairs[0]!;
    expect(pair.relationship).toBe("complementary");
    expect(pair.headline).toBe("These legs help each other");
    expect(pair.pairJointProb).toBeCloseTo(result.modelJointProb, 9);
    expect(pair.pairNaiveProb).toBeCloseTo(P_MINUS_110 * P_MINUS_110, 9);
  });

  it("verdict names the help AND the hidden margin", () => {
    expect(result.verdictTone).toBe("help");
    expect(result.verdict).toContain("help each other");
    expect(result.verdict).toContain("hides extra margin");
  });
});

describe("xrayTicket — cannibalistic QB-RB", () => {
  const outcome = xrayTicket(
    [
      { americanOdds: -110, role: "OTHER" },
      { americanOdds: -110, role: "QB-RB" },
    ],
    260,
  );

  it("flags legs that fight each other", () => {
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const pair = outcome.result.pairs[0]!;
    expect(pair.relationship).toBe("cannibalistic");
    expect(pair.headline).toBe("These legs fight each other");
    expect(outcome.result.verdictTone).toBe("fight");
    expect(outcome.result.verdict).toContain("worse than it looks");
    // QB-RB dependence is far weaker than QB-WR (flat to substitutive).
    const wrJoint = claytonSurvival(P_MINUS_110, P_MINUS_110, QB_WR_THETA);
    expect(pair.pairJointProb).toBeLessThan(wrJoint);
    expect(pair.pairJointProb).toBeCloseTo(
      claytonSurvival(P_MINUS_110, P_MINUS_110, 0.1),
      9,
    );
  });
});

describe("xrayTicket — 3-leg path", () => {
  const outcome = xrayTicket(
    [
      { americanOdds: -110, role: "OTHER" },
      { americanOdds: -110, role: "QB-WR" },
      { americanOdds: -110, role: "QB-TE" },
    ],
    400,
  );

  it("uses the engine 3-leg joint within its correlation band", () => {
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const r = outcome.result;
    expect(r.legCount).toBe(3);
    // Engine: jointExceedance(p1,p2, QB-WR theta) * p3, banded to [0.14, 0.28].
    const expected = claytonSurvival(P_MINUS_110, P_MINUS_110, QB_WR_THETA) * P_MINUS_110;
    expect(r.modelJointProb).toBeCloseTo(expected, 9);
    expect(r.modelJointProb).toBeGreaterThanOrEqual(0.14);
    expect(r.modelJointProb).toBeLessThanOrEqual(0.28);
    expect(r.pairs).toHaveLength(3);
    expect(r.bookImpliedProb).toBeCloseTo(0.2, 9);
    expect(r.hiddenHold).toBeCloseTo(0.2 - r.modelJointProb, 9);
  });
});

describe("input guards", () => {
  it("rejects fewer than 2 or more than 3 legs", () => {
    const one = xrayTicket([{ americanOdds: -110 }], 170);
    expect(one.ok).toBe(false);
    const four = xrayTicket(
      [
        { americanOdds: -110 },
        { americanOdds: -110 },
        { americanOdds: -110 },
        { americanOdds: -110 },
      ],
      170,
    );
    expect(four.ok).toBe(false);
    if (!one.ok) expect(one.error).toContain("2 or 3");
  });

  it("rejects bad leg odds and a bad book quote", () => {
    expect(xrayTicket([{ americanOdds: "abc" }, { americanOdds: -110 }], 170).ok).toBe(false);
    expect(xrayTicket([{ americanOdds: 50 }, { americanOdds: -110 }], 170).ok).toBe(false);
    expect(xrayTicket([{ americanOdds: -110 }, { americanOdds: -110 }], "").ok).toBe(false);
    expect(xrayTicket([{ americanOdds: -110 }, { americanOdds: -110 }], 0).ok).toBe(false);
    expect(xrayTicket([{ label: "no price" }, { americanOdds: -110 }], 170).ok).toBe(false);
  });

  it("accepts implied probabilities and clamps them to 0..1", () => {
    const ok = xrayTicket(
      [
        { impliedProb: 0.5, role: "OTHER" },
        { impliedProb: 0.5, role: "QB-WR" },
      ],
      170,
    );
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.result.modelJointProb).toBeCloseTo(claytonSurvival(0.5, 0.5, QB_WR_THETA), 9);
    }
    const clamped = xrayTicket(
      [
        { impliedProb: 1.7, role: "OTHER" },
        { impliedProb: -0.3, role: "OTHER" },
      ],
      170,
    );
    expect(clamped.ok).toBe(true);
    if (clamped.ok) {
      expect(clamped.result.legs[0]!.prob).toBe(1);
      expect(clamped.result.legs[1]!.prob).toBe(0);
      expect(Number.isFinite(clamped.result.modelJointProb)).toBe(true);
    }
  });

  it("parseXrayRequest guards malformed payloads and defaults roles/labels", () => {
    expect(parseXrayRequest(null).ok).toBe(false);
    expect(parseXrayRequest({ legs: "nope", bookQuote: 170 }).ok).toBe(false);
    const parsed = parseXrayRequest({
      legs: [
        { americanOdds: "-110", role: "BOGUS" },
        { americanOdds: "+150" },
      ],
      bookQuote: "+170",
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.legs[0]!.role).toBe("OTHER");
      expect(parsed.legs[0]!.label).toBe("Leg 1");
      expect(parsed.legs[1]!.label).toBe("Leg 2");
      expect(parsed.bookQuote).toBe(170);
    }
  });
});

describe("public copy fence", () => {
  const BANNED = [
    /\bcopula\b/i,
    /\br-?vine\b/i,
    /\bclayton\b/i,
    /\btheta\b/i,
    /\bfr[ée]chet\b/i,
    /\bsinkhorn\b/i,
    /\bjev\b/i,
    /\bt4\b/i,
    /\bjoint exceedance\b/i,
    /\bmarginal\b/i,
    /\block\b/i,
    /\bguarantee[ds]?\b/i,
    /\brisk[-\s]?free\b/i,
    /\bwin rate\b/i,
  ];

  function collectStrings(value: unknown, out: string[]): void {
    if (typeof value === "string") out.push(value);
    else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out));
    else if (value && typeof value === "object")
      Object.values(value).forEach((v) => collectStrings(v, out));
  }

  it("no math jargon or banned claims in any user-facing string", () => {
    const outcome = xrayTicket(
      [
        { label: "QB over 275.5 passing yards", americanOdds: -110, role: "OTHER" },
        { label: "WR1 over 74.5 receiving yards", americanOdds: -110, role: "QB-WR" },
        { label: "RB over 64.5 rushing yards", americanOdds: -110, role: "QB-RB" },
      ],
      400,
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const strings: string[] = [];
    collectStrings(outcome.result, strings);
    expect(strings.length).toBeGreaterThan(10);
    for (const s of strings) {
      for (const pattern of BANNED) {
        expect(s, `banned pattern ${pattern} in: ${s}`).not.toMatch(pattern);
      }
    }
  });

  it("chance displays never carry a % sign", () => {
    const outcome = xrayTicket(
      [
        { americanOdds: -110, role: "OTHER" },
        { americanOdds: -110, role: "QB-WR" },
      ],
      170,
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const displays = [
      outcome.result.modelChanceDisplay,
      outcome.result.bookChanceDisplay,
      ...outcome.result.legs.map((l) => l.chanceDisplay),
      ...outcome.result.pairs.flatMap((p) => [p.pairChanceDisplay, p.naiveChanceDisplay]),
    ];
    for (const d of displays) {
      expect(d).toMatch(/^\d{1,3}\/100$/);
      expect(d).not.toContain("%");
    }
  });
});