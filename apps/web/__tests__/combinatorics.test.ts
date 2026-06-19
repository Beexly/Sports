/**
 * Tests for apps/web/lib/math/combinatorics.ts
 * Covers: factorial, binomialCoeff, combinations, permutationList, powerSet,
 * parlay math, round-robin, binomial/negative-binomial/hypergeometric PMF/CDF,
 * Kelly criterion, odds conversion, scenario enumeration, and more.
 */
import { describe, it, expect } from "vitest";
import {
  factorial,
  binomialCoeff,
  permutations,
  combinations,
  permutationList,
  powerSet,
  parlayOdds,
  parlayOddsFromDecimal,
  profitFromParlay,
  roundRobin,
  roundRobinEv,
  teaserEv,
  binomialPmf,
  binomialCdf,
  negativeBinomialPmf,
  hypergeometricPmf,
  requiredWinRate,
  kellyFraction,
  fractionalKelly,
  removeVig,
  noVigOdds,
  correlatedParlayProb,
  impliedProbability,
  americanToDecimal,
  decimalToAmerican,
  winningScenarios,
  expectedWins,
  exactlyKWins,
  atLeastKWins,
  nthCombination,
  combinationCount,
} from "@/lib/math/combinatorics";

// ---------------------------------------------------------------------------
// factorial
// ---------------------------------------------------------------------------

describe("factorial", () => {
  it("0! = 1", () => expect(factorial(0)).toBe(1));
  it("1! = 1", () => expect(factorial(1)).toBe(1));
  it("5! = 120", () => expect(factorial(5)).toBe(120));
  it("10! = 3628800", () => expect(factorial(10)).toBe(3628800));
  it("20! is a large number", () =>
    expect(factorial(20)).toBeGreaterThan(1e18));
  it("negative integer throws RangeError", () =>
    expect(() => factorial(-1)).toThrow(RangeError));
  it("negative float throws RangeError", () =>
    expect(() => factorial(-0.5)).toThrow(RangeError));
  it("non-integer throws RangeError", () =>
    expect(() => factorial(2.5)).toThrow(RangeError));
  it("171 returns Infinity", () => expect(factorial(171)).toBe(Infinity));
  it("200 returns Infinity", () => expect(factorial(200)).toBe(Infinity));
  it("170 is a finite large number", () =>
    expect(Number.isFinite(factorial(170))).toBe(true));
});

// ---------------------------------------------------------------------------
// binomialCoeff
// ---------------------------------------------------------------------------

describe("binomialCoeff", () => {
  it("C(5,2) = 10", () => expect(binomialCoeff(5, 2)).toBe(10));
  it("C(10,3) = 120", () => expect(binomialCoeff(10, 3)).toBe(120));
  it("C(0,0) = 1", () => expect(binomialCoeff(0, 0)).toBe(1));
  it("C(n,0) = 1", () => expect(binomialCoeff(7, 0)).toBe(1));
  it("C(n,n) = 1", () => expect(binomialCoeff(7, 7)).toBe(1));
  it("C(10,5) = 252", () => expect(binomialCoeff(10, 5)).toBe(252));
  it("k > n returns 0", () => expect(binomialCoeff(3, 5)).toBe(0));
  it("k < 0 returns 0", () => expect(binomialCoeff(5, -1)).toBe(0));
  it("C(20,10) = 184756", () => expect(binomialCoeff(20, 10)).toBe(184756));
  it("symmetric: C(n,k) = C(n,n-k)", () =>
    expect(binomialCoeff(10, 3)).toBe(binomialCoeff(10, 7)));
});

// ---------------------------------------------------------------------------
// combinations (enumeration)
// ---------------------------------------------------------------------------

describe("combinations", () => {
  it("C([1,2,3,4],2) has 6 elements", () =>
    expect(combinations([1, 2, 3, 4], 2)).toHaveLength(6));
  it("each element has length 2", () =>
    combinations([1, 2, 3, 4], 2).forEach((c) =>
      expect(c).toHaveLength(2),
    ));
  it("C([1,2,3],2) contains [1,2]", () =>
    expect(combinations([1, 2, 3], 2)).toContainEqual([1, 2]));
  it("k=0 → [[]]", () => expect(combinations([1, 2], 0)).toEqual([[]]));
  it("k=n → [all]", () => expect(combinations([1, 2], 2)).toEqual([[1, 2]]));
  it("k > n → []", () => expect(combinations([1, 2], 5)).toEqual([]));
  it("k < 0 → []", () => expect(combinations([1, 2], -1)).toEqual([]));
});

// ---------------------------------------------------------------------------
// permutationList
// ---------------------------------------------------------------------------

describe("permutationList", () => {
  it("3 items → 6 permutations", () =>
    expect(permutationList([1, 2, 3])).toHaveLength(6));
  it("2 items → 2 permutations", () =>
    expect(permutationList([1, 2])).toHaveLength(2));
  it("1 item → 1 permutation", () =>
    expect(permutationList([1])).toHaveLength(1));
  it("empty array → 1 permutation (the empty array)", () =>
    expect(permutationList([])).toHaveLength(1));
  it("arr.length > 8 → empty array", () =>
    expect(permutationList([1, 2, 3, 4, 5, 6, 7, 8, 9])).toHaveLength(0));
  it("all permutations are unique", () => {
    const perms = permutationList([1, 2, 3]);
    const strs = perms.map((p) => p.join(","));
    expect(new Set(strs).size).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// powerSet
// ---------------------------------------------------------------------------

describe("powerSet", () => {
  it("3 items → 8 subsets", () =>
    expect(powerSet([1, 2, 3])).toHaveLength(8));
  it("0 items → 1 subset (empty set)", () =>
    expect(powerSet([])).toHaveLength(1));
  it("1 item → 2 subsets", () => expect(powerSet([1])).toHaveLength(2));
  it("includes the empty subset", () =>
    expect(powerSet([1, 2])).toContainEqual([]));
  it("includes the full set", () =>
    expect(powerSet([1, 2])).toContainEqual([1, 2]));
});

// ---------------------------------------------------------------------------
// parlayOdds
// ---------------------------------------------------------------------------

describe("parlayOdds", () => {
  it("empty legs returns neutral result", () => {
    const result = parlayOdds([]);
    expect(result.legs).toBe(0);
    expect(result.winProbability).toBe(1);
  });

  it("2-leg parlay: combinedDecimalOdds = product of decimals", () => {
    const legs = [
      { odds: -110, winProbability: 0.55 },
      { odds: -110, winProbability: 0.55 },
    ];
    const result = parlayOdds(legs);
    const d = americanToDecimal(-110);
    expect(result.combinedDecimalOdds).toBeCloseTo(d * d, 5);
  });

  it("winProbability = product of leg probabilities", () => {
    const legs = [
      { odds: -110, winProbability: 0.6 },
      { odds: +150, winProbability: 0.4 },
    ];
    const result = parlayOdds(legs);
    expect(result.winProbability).toBeCloseTo(0.6 * 0.4, 8);
  });

  it("EV is negative when true win prob is below break-even", () => {
    // 48% true win probability on -110 line gives negative EV
    const legs = [
      { odds: -110, winProbability: 0.48 },
      { odds: -110, winProbability: 0.48 },
    ];
    const result = parlayOdds(legs);
    expect(result.expectedValue).toBeLessThan(0);
  });

  it("EV is positive with favorable true probabilities", () => {
    const legs = [
      { odds: -110, winProbability: 0.7 },
      { odds: -110, winProbability: 0.7 },
    ];
    const result = parlayOdds(legs);
    expect(result.expectedValue).toBeGreaterThan(0);
  });

  it("legs count matches input", () => {
    expect(parlayOdds([{ odds: -110 }, { odds: 200 }]).legs).toBe(2);
  });

  it("breakEvenProb = impliedProbabilityOdds", () => {
    const result = parlayOdds([{ odds: -110 }, { odds: +100 }]);
    expect(result.breakEvenProb).toBeCloseTo(result.impliedProbabilityOdds, 8);
  });
});

// ---------------------------------------------------------------------------
// parlayOddsFromDecimal
// ---------------------------------------------------------------------------

describe("parlayOddsFromDecimal", () => {
  it("2 * 2 = 4.0", () => expect(parlayOddsFromDecimal([2, 2])).toBe(4));
  it("1.91 * 1.91 ≈ 3.648", () =>
    expect(parlayOddsFromDecimal([1.91, 1.91])).toBeCloseTo(3.648, 2));
  it("single leg = itself", () => expect(parlayOddsFromDecimal([3.5])).toBe(3.5));
  it("empty = 1", () => expect(parlayOddsFromDecimal([])).toBe(1));
});

// ---------------------------------------------------------------------------
// profitFromParlay
// ---------------------------------------------------------------------------

describe("profitFromParlay", () => {
  it("$100 on +100 single = $100 profit", () => {
    const profit = profitFromParlay(100, [{ odds: 100, winProbability: 0.5 }]);
    expect(profit).toBeCloseTo(100, 1);
  });

  it("profit = stake * (combinedDecimal - 1)", () => {
    const legs = [{ odds: -110 }, { odds: -110 }];
    const result = parlayOdds(legs);
    const expected = Math.round(50 * (result.combinedDecimalOdds - 1) * 100) / 100;
    expect(profitFromParlay(50, legs)).toBeCloseTo(expected, 2);
  });
});

// ---------------------------------------------------------------------------
// roundRobin
// ---------------------------------------------------------------------------

describe("roundRobin", () => {
  it("count = C(legs, size)", () => {
    const legs = [
      { odds: -110 },
      { odds: -110 },
      { odds: -110 },
    ];
    const rr = roundRobin(legs, 2);
    expect(rr.count).toBe(3); // C(3,2) = 3
  });

  it("totalStake = stakePerBet * count", () => {
    const legs = [{ odds: -110 }, { odds: 100 }, { odds: 150 }];
    const rr = roundRobin(legs, 2, 10);
    expect(rr.totalStake).toBe(rr.count * 10);
  });

  it("size is stored correctly", () => {
    const legs = [{ odds: -110 }, { odds: 100 }, { odds: 150 }];
    expect(roundRobin(legs, 2).size).toBe(2);
  });

  it("maxProfit > 0 for positive-odds legs", () => {
    const legs = [{ odds: 100 }, { odds: 100 }, { odds: 100 }];
    expect(roundRobin(legs, 2).maxProfit).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// roundRobinEv
// ---------------------------------------------------------------------------

describe("roundRobinEv", () => {
  it("negative EV when true probs are below break-even", () => {
    // 48% win probability on -110 = negative EV per bet
    const legs = [
      { odds: -110, winProbability: 0.48 },
      { odds: -110, winProbability: 0.48 },
      { odds: -110, winProbability: 0.48 },
    ];
    expect(roundRobinEv(legs, 2)).toBeLessThan(0);
  });
});

// ---------------------------------------------------------------------------
// teaserEv
// ---------------------------------------------------------------------------

describe("teaserEv", () => {
  it("all legs 100% probability → EV = decimal - 1 (pure profit)", () => {
    const config = { points: 6, legs: 2, odds: -110 };
    const ev = teaserEv([1, 1], config);
    // EV = 1 * profit - 0 * 1 = profit = decimalOdds - 1
    expect(ev).toBeCloseTo(americanToDecimal(-110) - 1, 5);
  });

  it("all legs 0% probability → EV = -1", () => {
    const config = { points: 6, legs: 2, odds: -110 };
    expect(teaserEv([0, 0], config)).toBeCloseTo(-1, 5);
  });
});

// ---------------------------------------------------------------------------
// binomialPmf
// ---------------------------------------------------------------------------

describe("binomialPmf", () => {
  it("P(n=2,k=1,p=0.5) ≈ 0.5", () =>
    expect(binomialPmf(2, 1, 0.5)).toBeCloseTo(0.5, 6));
  it("P(n=10,k=5,p=0.5) ≈ 0.2461", () =>
    expect(binomialPmf(10, 5, 0.5)).toBeCloseTo(0.2461, 3));
  it("k > n → 0", () => expect(binomialPmf(3, 5, 0.5)).toBe(0));
  it("p=0, k=0 → 1", () => expect(binomialPmf(5, 0, 0)).toBe(1));
  it("p=0, k>0 → 0", () => expect(binomialPmf(5, 1, 0)).toBe(0));
  it("p=1, k=n → 1", () => expect(binomialPmf(5, 5, 1)).toBe(1));
  it("p=1, k<n → 0", () => expect(binomialPmf(5, 3, 1)).toBe(0));
  it("PMF sums to 1 for n=10, p=0.3", () => {
    const total = Array.from({ length: 11 }, (_, k) => binomialPmf(10, k, 0.3))
      .reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 5);
  });
  it("log-space handles large n without returning 0", () =>
    expect(binomialPmf(100, 50, 0.5)).toBeGreaterThan(0));
});

// ---------------------------------------------------------------------------
// binomialCdf
// ---------------------------------------------------------------------------

describe("binomialCdf", () => {
  it("P(X≤10 | n=10, p=0.5) = 1", () =>
    expect(binomialCdf(10, 10, 0.5)).toBeCloseTo(1, 4));
  it("CDF is non-decreasing", () => {
    const n = 10;
    const p = 0.4;
    const values = Array.from({ length: n + 1 }, (_, k) => binomialCdf(n, k, p));
    for (let i = 1; i <= n; i++) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]!);
    }
  });
  it("P(X≤0 | n=5, p=0) = 1", () =>
    expect(binomialCdf(5, 0, 0)).toBeCloseTo(1, 8));
});

// ---------------------------------------------------------------------------
// negativeBinomialPmf
// ---------------------------------------------------------------------------

describe("negativeBinomialPmf", () => {
  it("P(r=1,k=0,p=0.5) = 0.5", () =>
    expect(negativeBinomialPmf(1, 0, 0.5)).toBeCloseTo(0.5, 6));
  it("P(r=2,k=0,p=0.5) = 0.25", () =>
    expect(negativeBinomialPmf(2, 0, 0.5)).toBeCloseTo(0.25, 6));
  it("k < 0 → 0", () => expect(negativeBinomialPmf(1, -1, 0.5)).toBe(0));
  it("r < 1 → 0", () => expect(negativeBinomialPmf(0, 1, 0.5)).toBe(0));
});

// ---------------------------------------------------------------------------
// hypergeometricPmf
// ---------------------------------------------------------------------------

describe("hypergeometricPmf", () => {
  it("P(N=10,K=5,n=4,k=2) is positive", () =>
    expect(hypergeometricPmf(10, 5, 4, 2)).toBeGreaterThan(0));
  it("k outside range → 0", () =>
    expect(hypergeometricPmf(10, 2, 3, 5)).toBe(0));
  it("sums to 1 over all valid k for a given (N,K,n)", () => {
    const N = 10, K = 4, n = 3;
    let total = 0;
    for (let k = 0; k <= Math.min(n, K); k++) {
      total += hypergeometricPmf(N, K, n, k);
    }
    expect(total).toBeCloseTo(1, 5);
  });
});

// ---------------------------------------------------------------------------
// requiredWinRate
// ---------------------------------------------------------------------------

describe("requiredWinRate", () => {
  it("-110 → ≈52.38%", () =>
    expect(requiredWinRate(-110)).toBeCloseTo(0.5238, 3));
  it("+100 → 50%", () =>
    expect(requiredWinRate(100)).toBeCloseTo(0.5, 6));
  it("+150 → 40%", () =>
    expect(requiredWinRate(150)).toBeCloseTo(0.4, 6));
  it("-200 → 66.67%", () =>
    expect(requiredWinRate(-200)).toBeCloseTo(0.6667, 3));
});

// ---------------------------------------------------------------------------
// kellyFraction
// ---------------------------------------------------------------------------

describe("kellyFraction", () => {
  it("positive EV at +100 with 60% winProb → positive fraction", () =>
    expect(kellyFraction(0.6, 100)).toBeGreaterThan(0));
  it("negative EV → 0", () =>
    expect(kellyFraction(0.4, -110)).toBe(0));
  it("clamped to [0,1]", () => {
    const f = kellyFraction(0.99, 100);
    expect(f).toBeGreaterThanOrEqual(0);
    expect(f).toBeLessThanOrEqual(1);
  });
  it("even money with 50% win → 0 (breakeven)", () =>
    expect(kellyFraction(0.5, 100)).toBeCloseTo(0, 8));
});

// ---------------------------------------------------------------------------
// fractionalKelly
// ---------------------------------------------------------------------------

describe("fractionalKelly", () => {
  it("quarter kelly = 0.25 * fullKelly", () => {
    const full = kellyFraction(0.6, 100);
    expect(fractionalKelly(0.6, 100)).toBeCloseTo(0.25 * full, 8);
  });
  it("half kelly uses 0.5 fraction", () => {
    const full = kellyFraction(0.6, 100);
    expect(fractionalKelly(0.6, 100, 0.5)).toBeCloseTo(0.5 * full, 8);
  });
});

// ---------------------------------------------------------------------------
// removeVig
// ---------------------------------------------------------------------------

describe("removeVig", () => {
  it("sum equals 1 after devig", () => {
    const probs = [0.55, 0.55]; // overcollects 10%
    const devigged = removeVig(probs);
    expect(devigged.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 8);
  });
  it("already-normalized → unchanged", () => {
    const probs = [0.5, 0.5];
    const devigged = removeVig(probs);
    expect(devigged[0]).toBeCloseTo(0.5, 8);
    expect(devigged[1]).toBeCloseTo(0.5, 8);
  });
  it("three-way market sums to 1", () => {
    const probs = [0.34, 0.34, 0.34];
    const devigged = removeVig(probs);
    expect(devigged.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
  });
});

// ---------------------------------------------------------------------------
// noVigOdds
// ---------------------------------------------------------------------------

describe("noVigOdds", () => {
  it("two-way market: implied probs of result sum to 1", () => {
    const result = noVigOdds([-110, -110]);
    const impliedSum = result.map(impliedProbability).reduce((a, b) => a + b, 0);
    expect(impliedSum).toBeCloseTo(1, 3);
  });
});

// ---------------------------------------------------------------------------
// impliedProbability
// ---------------------------------------------------------------------------

describe("impliedProbability", () => {
  it("+150 → 0.4", () => expect(impliedProbability(150)).toBeCloseTo(0.4, 6));
  it("-110 → ≈0.5238", () =>
    expect(impliedProbability(-110)).toBeCloseTo(0.5238, 3));
  it("+100 → 0.5", () => expect(impliedProbability(100)).toBeCloseTo(0.5, 6));
  it("-200 → 0.6667", () =>
    expect(impliedProbability(-200)).toBeCloseTo(0.6667, 3));
});

// ---------------------------------------------------------------------------
// americanToDecimal / decimalToAmerican
// ---------------------------------------------------------------------------

describe("americanToDecimal", () => {
  it("-110 → ≈1.909", () =>
    expect(americanToDecimal(-110)).toBeCloseTo(1.909, 3));
  it("+100 → 2.0", () => expect(americanToDecimal(100)).toBe(2.0));
  it("+150 → 2.5", () => expect(americanToDecimal(150)).toBe(2.5));
});

describe("decimalToAmerican", () => {
  it("2.0 → +100", () => expect(decimalToAmerican(2.0)).toBe(100));
  it("2.5 → +150", () => expect(decimalToAmerican(2.5)).toBe(150));
  it("1.909 → ≈-110", () =>
    expect(Math.abs(decimalToAmerican(1.909) - (-110))).toBeLessThan(2));
});

// ---------------------------------------------------------------------------
// correlatedParlayProb
// ---------------------------------------------------------------------------

describe("correlatedParlayProb", () => {
  it("correlation=0 → product of probs", () => {
    const probs = [0.6, 0.5, 0.7];
    const product = probs.reduce((a, b) => a * b, 1);
    expect(correlatedParlayProb(probs, 0)).toBeCloseTo(product, 8);
  });

  it("positive correlation increases joint probability", () => {
    const probs = [0.6, 0.6];
    const independent = correlatedParlayProb(probs, 0);
    const correlated = correlatedParlayProb(probs, 0.3);
    expect(correlated).toBeGreaterThan(independent);
  });

  it("result clamped to [0,1]", () => {
    const probs = [0.9, 0.9];
    const result = correlatedParlayProb(probs, 1.0);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it("empty probabilities → 1", () =>
    expect(correlatedParlayProb([])).toBe(1));
});

// ---------------------------------------------------------------------------
// winningScenarios
// ---------------------------------------------------------------------------

describe("winningScenarios", () => {
  it("2 legs, minWins=2 → 1 scenario (both win)", () => {
    const scenarios = winningScenarios(2, 2);
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0]).toEqual([1, 1]);
  });

  it("2 legs, minWins=1 → 3 scenarios", () => {
    expect(winningScenarios(2, 1)).toHaveLength(3);
  });

  it("3 legs, minWins=0 → 8 scenarios (all)", () => {
    expect(winningScenarios(3, 0)).toHaveLength(8);
  });

  it("each scenario has correct length", () => {
    winningScenarios(3, 2).forEach((s) => expect(s).toHaveLength(3));
  });
});

// ---------------------------------------------------------------------------
// expectedWins
// ---------------------------------------------------------------------------

describe("expectedWins", () => {
  it("3 legs all 0.5 → 1.5 expected wins", () =>
    expect(expectedWins([0.5, 0.5, 0.5])).toBeCloseTo(1.5, 8));
  it("empty → 0", () => expect(expectedWins([])).toBe(0));
  it("linearity: [0.3, 0.7] → 1.0", () =>
    expect(expectedWins([0.3, 0.7])).toBeCloseTo(1.0, 8));
});

// ---------------------------------------------------------------------------
// exactlyKWins
// ---------------------------------------------------------------------------

describe("exactlyKWins", () => {
  it("2 independent 50% legs: P(2 wins) = 0.25", () =>
    expect(exactlyKWins([0.5, 0.5], 2)).toBeCloseTo(0.25, 8));
  it("2 independent 50% legs: P(1 win) = 0.5", () =>
    expect(exactlyKWins([0.5, 0.5], 1)).toBeCloseTo(0.5, 8));
  it("2 independent 50% legs: P(0 wins) = 0.25", () =>
    expect(exactlyKWins([0.5, 0.5], 0)).toBeCloseTo(0.25, 8));
  it("k < 0 → 0", () => expect(exactlyKWins([0.5, 0.5], -1)).toBe(0));
  it("k > n → 0", () => expect(exactlyKWins([0.5], 2)).toBe(0));
  it("probabilities sum to 1 across all k", () => {
    const probs = [0.6, 0.4, 0.7];
    const total = Array.from({ length: probs.length + 1 }, (_, k) =>
      exactlyKWins(probs, k),
    ).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 8);
  });
});

// ---------------------------------------------------------------------------
// atLeastKWins
// ---------------------------------------------------------------------------

describe("atLeastKWins", () => {
  it("P(>=1 win) = 1 - P(0 wins)", () => {
    const probs = [0.6, 0.4];
    const atLeast1 = atLeastKWins(probs, 1);
    const zeroWins = exactlyKWins(probs, 0);
    expect(atLeast1).toBeCloseTo(1 - zeroWins, 8);
  });

  it("P(>=0 wins) = 1", () =>
    expect(atLeastKWins([0.5, 0.5], 0)).toBeCloseTo(1, 8));

  it("P(>= n wins) = product of all probs", () => {
    const probs = [0.6, 0.7];
    expect(atLeastKWins(probs, 2)).toBeCloseTo(0.6 * 0.7, 8);
  });
});

// ---------------------------------------------------------------------------
// nthCombination
// ---------------------------------------------------------------------------

describe("nthCombination", () => {
  it("0th combination of [1,2,3,4] choose 2 = [1,2]", () =>
    expect(nthCombination([1, 2, 3, 4], 2, 0)).toEqual([1, 2]));
  it("1st combination = [1,3]", () =>
    expect(nthCombination([1, 2, 3, 4], 2, 1)).toEqual([1, 3]));
  it("matches combinations()[n]", () => {
    const arr = ["a", "b", "c", "d", "e"];
    const all = combinations(arr, 3);
    for (let n = 0; n < all.length; n++) {
      expect(nthCombination(arr, 3, n)).toEqual(all[n]);
    }
  });
});

// ---------------------------------------------------------------------------
// combinationCount
// ---------------------------------------------------------------------------

describe("combinationCount", () => {
  it("combinationCount(5,2) = 10", () => expect(combinationCount(5, 2)).toBe(10));
  it("matches binomialCoeff", () =>
    expect(combinationCount(10, 4)).toBe(binomialCoeff(10, 4)));
});
