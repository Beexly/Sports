import { describe, it, expect } from "vitest";
import {
  factorial,
  logFactorial,
  choose,
  permutations,
  combinations,
  poissonPmf,
  poissonCdf,
  poissonDistribution,
  binomialPmf,
  binomialCdf,
  negativeBinomialPmf,
  hypergeometricPmf,
  multinomialCoefficient,
  betEv,
  kellyFraction,
  waysToWinLoss,
  exactWinProb,
  atLeastWinsProb,
  dixonColesAdjustment,
} from "@/lib/math/combinatorics";
import {
  confidenceTier,
  tierColorClass,
  formatConfidence,
  clvVerdictLabel,
  clvGrade,
  clvNarrative,
  outcomeLabel,
  outcomeColorClass,
  formatWinRate,
  formatRecord,
  recentFormSummary,
  confidenceToStars,
  pickTierLabel,
  pickHeadline,
  formatPickOdds,
  pickStatusDisplay,
  formatProfitLoss,
  formatRoi,
} from "@/lib/analytics/pick-display";

// ─── combinatorics ────────────────────────────────────────────────────────────

describe("factorial", () => {
  it("0! = 1", () => expect(factorial(0)).toBe(1));
  it("1! = 1", () => expect(factorial(1)).toBe(1));
  it("5! = 120", () => expect(factorial(5)).toBe(120));
  it("10! = 3628800", () => expect(factorial(10)).toBe(3628800));
  it("20! is a large number", () => expect(factorial(20)).toBeGreaterThan(1e18));
  it("negative → NaN", () => expect(factorial(-1)).toBeNaN());
  it("non-integer → NaN", () => expect(factorial(2.5)).toBeNaN());
  it("> 170 → Infinity", () => expect(factorial(200)).toBe(Infinity));
});

describe("logFactorial", () => {
  it("ln(0!) = 0", () => expect(logFactorial(0)).toBeCloseTo(0, 6));
  it("ln(5!) = ln(120)", () => expect(logFactorial(5)).toBeCloseTo(Math.log(120), 4));
  it("ln(100!) is positive", () => expect(logFactorial(100)).toBeGreaterThan(0));
});

describe("choose (binomial coefficient)", () => {
  it("C(5,2) = 10", () => expect(choose(5, 2)).toBe(10));
  it("C(n,0) = 1", () => expect(choose(10, 0)).toBe(1));
  it("C(n,n) = 1", () => expect(choose(7, 7)).toBe(1));
  it("C(0,0) = 1", () => expect(choose(0, 0)).toBe(1));
  it("C(10,5) = 252", () => expect(choose(10, 5)).toBe(252));
  it("k > n → 0", () => expect(choose(3, 5)).toBe(0));
  it("negative n → 0", () => expect(choose(-1, 0)).toBe(0));
  it("C(20,10) = 184756", () => expect(choose(20, 10)).toBe(184756));
});

describe("permutations", () => {
  it("P(5,2) = 20", () => expect(permutations(5, 2)).toBe(20));
  it("P(n,0) = 1", () => expect(permutations(5, 0)).toBe(1));
  it("P(n,n) = n!", () => expect(permutations(5, 5)).toBe(120));
  it("k > n → 0", () => expect(permutations(3, 5)).toBe(0));
});

describe("combinations (enumeration)", () => {
  it("C([1,2,3],2) has 3 items", () => expect(combinations([1, 2, 3], 2)).toHaveLength(3));
  it("C([1,2,3],2) contains [1,2]", () => expect(combinations([1, 2, 3], 2)).toContainEqual([1, 2]));
  it("k=0 → [[]]", () => expect(combinations([1, 2], 0)).toEqual([[]]));
  it("k=n → [all]", () => expect(combinations([1, 2], 2)).toEqual([[1, 2]]));
  it("k > n → []", () => expect(combinations([1, 2], 5)).toEqual([]));
});

describe("Poisson distribution", () => {
  it("PMF: P(0 | λ=1) ≈ e^-1", () => expect(poissonPmf(0, 1)).toBeCloseTo(Math.exp(-1), 6));
  it("PMF: P(1 | λ=1) ≈ e^-1", () => expect(poissonPmf(1, 1)).toBeCloseTo(Math.exp(-1), 6));
  it("PMF: P(0 | λ=0) = 1", () => expect(poissonPmf(0, 0)).toBe(1));
  it("PMF: P(1 | λ=0) = 0", () => expect(poissonPmf(1, 0)).toBe(0));
  it("PMF: negative k → 0", () => expect(poissonPmf(-1, 2)).toBe(0));
  it("CDF: P(X≤0 | λ=2) < P(X≤1 | λ=2)", () => expect(poissonCdf(0, 2)).toBeLessThan(poissonCdf(1, 2)));
  it("CDF: P(X≤100 | λ=1) ≈ 1", () => expect(poissonCdf(100, 1)).toBeCloseTo(1, 4));
  it("Distribution sums to ≈1", () => {
    const dist = poissonDistribution(2.5, 30);
    expect(dist.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 3);
  });
  it("Distribution length = maxK + 1", () => expect(poissonDistribution(1, 10)).toHaveLength(11));
});

describe("Binomial distribution", () => {
  it("PMF: B(1,2,0.5) = 0.5", () => expect(binomialPmf(1, 2, 0.5)).toBeCloseTo(0.5, 6));
  it("PMF: B(0,2,0) = 1", () => expect(binomialPmf(0, 2, 0)).toBe(1));
  it("PMF: B(2,2,1) = 1", () => expect(binomialPmf(2, 2, 1)).toBe(1));
  it("PMF: k > n → 0", () => expect(binomialPmf(5, 3, 0.5)).toBe(0));
  it("CDF: P(X≤10 | n=10, p=0.5) ≈ 1", () => expect(binomialCdf(10, 10, 0.5)).toBeCloseTo(1, 4));
  it("PMF sums to 1", () => {
    const n = 5;
    const p = 0.3;
    const total = Array.from({ length: n + 1 }, (_, k) => binomialPmf(k, n, p)).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 5);
  });
});

describe("negativeBinomialPmf", () => {
  it("P(0,1,0.5) = 0.5", () => expect(negativeBinomialPmf(0, 1, 0.5)).toBeCloseTo(0.5, 6));
  it("invalid inputs → 0", () => expect(negativeBinomialPmf(-1, 1, 0.5)).toBe(0));
});

describe("hypergeometricPmf", () => {
  it("P(2 | N=10, K=5, n=4) is positive", () => expect(hypergeometricPmf(2, 10, 5, 4)).toBeGreaterThan(0));
  it("k outside range → 0", () => expect(hypergeometricPmf(5, 10, 2, 3)).toBe(0));
});

describe("multinomialCoefficient", () => {
  it("C(3;1,1,1) = 6", () => expect(multinomialCoefficient([1, 1, 1])).toBe(6));
  it("C(2;2) = 1", () => expect(multinomialCoefficient([2])).toBe(1));
  it("C(4;2,2) = 6", () => expect(multinomialCoefficient([2, 2])).toBe(6));
});

describe("dixonColesAdjustment", () => {
  it("0-0 scoreline has adjustment ≠ 1", () => {
    const adj = dixonColesAdjustment(0, 0, 1.5, 1.2);
    expect(adj).not.toBe(1);
  });
  it("2-1 scoreline returns 1", () => expect(dixonColesAdjustment(2, 1, 1.5, 1.2)).toBe(1));
});

describe("betEv / kellyFraction", () => {
  it("EV on coin flip at -110 is negative", () => expect(betEv(0.5, 100 / 110 + 1)).toBeLessThan(0));
  it("EV on +EV bet is positive", () => expect(betEv(0.6, 2.0)).toBeGreaterThan(0));
  it("Kelly on -EV bet = 0", () => expect(kellyFraction(0.4, 100 / 110 + 1)).toBe(0));
  it("Kelly on +EV bet > 0", () => expect(kellyFraction(0.55, 100 / 110 + 1)).toBeGreaterThan(0));
});

describe("waysToWinLoss / exactWinProb / atLeastWinsProb", () => {
  it("ways(3,2) = C(5,3) = 10", () => expect(waysToWinLoss(3, 2)).toBe(10));
  it("exactWinProb(5,10,0.5) ≈ 0.246", () => expect(exactWinProb(5, 10, 0.5)).toBeCloseTo(0.246, 2));
  it("atLeastWinsProb(0,5,p) = 1", () => expect(atLeastWinsProb(0, 5, 0.5)).toBe(1));
  it("atLeastWinsProb(1,5,1.0) = 1", () => expect(atLeastWinsProb(1, 5, 1.0)).toBeCloseTo(1, 4));
});

// ─── pick-display ─────────────────────────────────────────────────────────────

describe("confidenceTier", () => {
  it("50 → Signal", () => expect(confidenceTier(50)).toBe("Signal"));
  it("60 → Edge", () => expect(confidenceTier(60)).toBe("Edge"));
  it("75 → Sharp", () => expect(confidenceTier(75)).toBe("Sharp"));
  it("95 → Apex", () => expect(confidenceTier(95)).toBe("Apex"));
  it("0 → Signal", () => expect(confidenceTier(0)).toBe("Signal"));
});

describe("tierColorClass", () => {
  it("Signal has a color class", () => expect(tierColorClass("Signal")).toContain("text-"));
  it("Apex has a different class than Signal", () => {
    expect(tierColorClass("Apex")).not.toBe(tierColorClass("Signal"));
  });
});

describe("formatConfidence", () => {
  it("74.9 → '75%'", () => expect(formatConfidence(74.9)).toBe("75%"));
  it("NaN → '—'", () => expect(formatConfidence(NaN)).toBe("—"));
  it("50 → '50%'", () => expect(formatConfidence(50)).toBe("50%"));
});

describe("clvVerdictLabel", () => {
  it("BEAT_CLOSE → 'Beat Close'", () => expect(clvVerdictLabel("BEAT_CLOSE")).toBe("Beat Close"));
  it("null → 'Unknown'", () => expect(clvVerdictLabel(null)).toBe("Unknown"));
});

describe("clvGrade", () => {
  it("5 → A", () => expect(clvGrade(5)).toBe("A"));
  it("2 → B", () => expect(clvGrade(2)).toBe("B"));
  it("0 → C", () => expect(clvGrade(0)).toBe("C"));
  it("-3 → D", () => expect(clvGrade(-3)).toBe("D"));
  it("-10 → F", () => expect(clvGrade(-10)).toBe("F"));
  it("null → null", () => expect(clvGrade(null)).toBeNull());
});

describe("clvNarrative", () => {
  it("returns a string for A grade", () => expect(typeof clvNarrative(6)).toBe("string"));
  it("null returns 'unavailable' message", () => expect(clvNarrative(null)).toContain("unavailable"));
});

describe("outcomeLabel / outcomeColorClass", () => {
  it("win → 'Win'", () => expect(outcomeLabel("win")).toBe("Win"));
  it("loss → 'Loss'", () => expect(outcomeLabel("loss")).toBe("Loss"));
  it("push → 'Push'", () => expect(outcomeLabel("push")).toBe("Push"));
  it("win color has green", () => expect(outcomeColorClass("win")).toContain("green"));
  it("loss color has red", () => expect(outcomeColorClass("loss")).toContain("red"));
});

describe("formatWinRate", () => {
  it("10-5 → '66.7% (10-5)'", () => expect(formatWinRate(10, 5)).toMatch(/66\.7%/));
  it("0-0 → '—'", () => expect(formatWinRate(0, 0)).toBe("—"));
});

describe("formatRecord", () => {
  it("no pushes", () => expect(formatRecord(10, 5)).toBe("10-5"));
  it("with push", () => expect(formatRecord(10, 5, 2)).toBe("10-5-2"));
  it("0 pushes = no push display", () => expect(formatRecord(10, 5, 0)).toBe("10-5"));
});

describe("recentFormSummary", () => {
  it("empty → 'No recent results'", () => expect(recentFormSummary([])).toBe("No recent results"));
  it("5 outcomes returns summary", () => {
    const outcomes = ["win", "loss", "win", "win", "loss"] as const;
    const result = recentFormSummary(outcomes, 10);
    expect(result).toMatch(/\d+-\d+/);
  });
});

describe("confidenceToStars", () => {
  it("90 → 5", () => expect(confidenceToStars(90)).toBe(5));
  it("70 → 4", () => expect(confidenceToStars(70)).toBe(4));
  it("58 → 3", () => expect(confidenceToStars(58)).toBe(3));
  it("45 → 2", () => expect(confidenceToStars(45)).toBe(2));
  it("20 → 1", () => expect(confidenceToStars(20)).toBe(1));
});

describe("pickTierLabel", () => {
  it("free → 'Free'", () => expect(pickTierLabel("FREE")).toBe("Free"));
  it("PRO → 'Pro'", () => expect(pickTierLabel("PRO")).toBe("Pro"));
  it("ELITE → 'Elite'", () => expect(pickTierLabel("ELITE")).toBe("Elite"));
});

describe("pickHeadline", () => {
  it("with teams", () => {
    const h = pickHeadline({ pick: "Chiefs -3.5", homeTeam: "Chiefs", awayTeam: "Chargers", sport: "NFL" });
    expect(h).toContain("Chiefs");
    expect(h).toContain("(NFL)");
  });
  it("without teams", () => {
    const h = pickHeadline({ pick: "Over 44.5" });
    expect(h).toBe("Over 44.5");
  });
});

describe("formatPickOdds", () => {
  it("+150", () => expect(formatPickOdds(150)).toBe("+150"));
  it("-110", () => expect(formatPickOdds(-110)).toBe("-110"));
  it("0 → EV", () => expect(formatPickOdds(0)).toBe("EV"));
  it("Infinity → '—'", () => expect(formatPickOdds(Infinity)).toBe("—"));
});

describe("pickStatusDisplay", () => {
  it("WON has green", () => expect(pickStatusDisplay("WON").colorClass).toContain("green"));
  it("LOST has red", () => expect(pickStatusDisplay("LOST").colorClass).toContain("red"));
  it("PENDING has label", () => expect(pickStatusDisplay("PENDING").label).toBe("Pending"));
});

describe("formatProfitLoss", () => {
  it("positive", () => expect(formatProfitLoss(120.5)).toBe("+$120.50"));
  it("negative", () => expect(formatProfitLoss(-50)).toBe("-$50.00"));
  it("NaN → '—'", () => expect(formatProfitLoss(NaN)).toBe("—"));
});

describe("formatRoi", () => {
  it("120 profit on 1000 = +12.0%", () => expect(formatRoi(120, 1000)).toBe("+12.0%"));
  it("negative ROI", () => expect(formatRoi(-50, 1000)).toBe("-5.0%"));
  it("zero wagered → '—'", () => expect(formatRoi(0, 0)).toBe("—"));
});
