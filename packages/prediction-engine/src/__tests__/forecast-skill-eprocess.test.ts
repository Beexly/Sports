import { describe, it, expect } from "vitest";
import {
  forecastSkillEProcess,
  initForecastSkillFold,
  foldForecastSkillPick,
  summarizeForecastSkillFold,
  CONSERVATIVE_EVIDENCE_THRESHOLD,
  type ForecastSkillPoint,
  type ForecastSkillFoldState,
} from "../forecast-skill-eprocess.js";

/**
 * Seeded PRNG (mulberry32). NO Math.random() anywhere in this suite: the
 * Monte-Carlo proofs below are FIXED numbers under a fixed seed, so a
 * "the martingale property holds" assertion can never be flaky — if it ever
 * fails, the construction changed, not the dice.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LN20 = Math.log(20);

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * The two branch factors E(y=1), E(y=0) for one (p, m) under a given config,
 * read back out of the PUBLIC api (a one-point ledger's logM IS ln E_t). This
 * is how the conditional identity below is checked against the shipped code
 * path rather than against a re-derivation of it.
 */
function branchFactors(
  p: number,
  m: number,
  opts: { epsilon?: number; floor?: number } = {},
): { e1: number; e0: number } {
  const cfg = { ...opts, minPicks: 1 };
  const one = forecastSkillEProcess([{ p, m, y: 1 }], cfg)!;
  const zero = forecastSkillEProcess([{ p, m, y: 0 }], cfg)!;
  return { e1: Math.exp(one.logM), e0: Math.exp(zero.logM) };
}

/** E[E_t | F_{t-1}] under H0 (y ~ Bernoulli(m)) — the quantity that must be 1. */
function conditionalMean(
  p: number,
  m: number,
  opts: { epsilon?: number; floor?: number } = {},
): number {
  const { e1, e0 } = branchFactors(p, m, opts);
  return m * e1 + (1 - m) * e0;
}

/** Draw a ledger whose outcomes come from the MARKET — i.e. simulate under H0. */
function underNull(
  gen: () => number,
  n: number,
  deviation: (g: () => number) => number,
  mLo = 0.35,
  mHi = 0.65,
): ForecastSkillPoint[] {
  const out: ForecastSkillPoint[] = [];
  for (let i = 0; i < n; i++) {
    const m = mLo + (mHi - mLo) * gen();
    const p = clamp01(m + deviation(gen));
    const y: 0 | 1 = gen() < m ? 1 : 0;
    out.push({ p, m, y });
  }
  return out;
}

/** Draw a ledger whose outcomes come from OUR forecast — i.e. simulate under H1. */
function underSkill(gen: () => number, n: number, m: number, p: number): ForecastSkillPoint[] {
  const out: ForecastSkillPoint[] = [];
  for (let i = 0; i < n; i++) {
    const y: 0 | 1 = gen() < p ? 1 : 0;
    out.push({ p, m, y });
  }
  return out;
}

describe("forecastSkillEProcess — guards and honest degradation", () => {
  it("refuses bad options rather than silently correcting them", () => {
    const pts: ForecastSkillPoint[] = [{ p: 0.6, m: 0.5, y: 1 }];
    expect(forecastSkillEProcess(pts, { alpha: 0 })).toBeNull();
    expect(forecastSkillEProcess(pts, { alpha: 1 })).toBeNull();
    expect(forecastSkillEProcess(pts, { alpha: Number.NaN })).toBeNull();
    // A threshold <= 1 would "reject" before any data (M starts at 1).
    expect(forecastSkillEProcess(pts, { evidenceThreshold: 1 })).toBeNull();
    expect(forecastSkillEProcess(pts, { evidenceThreshold: 0.5 })).toBeNull();
    expect(forecastSkillEProcess(pts, { epsilon: -0.01 })).toBeNull();
    expect(forecastSkillEProcess(pts, { epsilon: 0.51 })).toBeNull();
    expect(forecastSkillEProcess(pts, { floor: 0 })).toBeNull();
    expect(forecastSkillEProcess(pts, { floor: 0.5 })).toBeNull();
    expect(forecastSkillEProcess(pts, { minPicks: 0 })).toBeNull();
    expect(forecastSkillEProcess(pts, { minPicks: 2.5 })).toBeNull();
  });

  it("refuses the WHOLE batch on a malformed point (dropping rows is a selection effect)", () => {
    const good: ForecastSkillPoint = { p: 0.6, m: 0.5, y: 1 };
    expect(forecastSkillEProcess([good, { p: Number.NaN, m: 0.5, y: 1 }])).toBeNull();
    expect(forecastSkillEProcess([good, { p: 0.5, m: Number.POSITIVE_INFINITY, y: 0 }])).toBeNull();
    expect(forecastSkillEProcess([good, { p: 1.2, m: 0.5, y: 1 }])).toBeNull();
    expect(forecastSkillEProcess([good, { p: -0.1, m: 0.5, y: 1 }])).toBeNull();
    expect(forecastSkillEProcess([good, { p: 0.5, m: 1.5, y: 0 }])).toBeNull();
    // y outside {0,1} — cast through unknown so the runtime guard is what is tested.
    const badY = { p: 0.5, m: 0.5, y: 2 } as unknown as ForecastSkillPoint;
    expect(forecastSkillEProcess([good, badY])).toBeNull();
  });

  it("an EMPTY ledger yields an n=0 'insufficient' result — never a fabricated verdict", () => {
    const res = forecastSkillEProcess([])!;
    expect(res).not.toBeNull();
    expect(res.n).toBe(0);
    expect(res.logM).toBe(0);
    expect(res.m).toBe(1);
    expect(res.growthRatePerPick).toBe(0);
    expect(res.growthRateBitsPerPick).toBe(0);
    expect(res.verdict).toBe("insufficient");
    expect(res.eligible).toBe(false);
    expect(res.rejectsAt).toBeNull();
    expect(res.anytimeValidPValue).toBe(1);
    expect(res.operatorHint).toContain("No settled picks");
  });

  it("n below the minimum is 'insufficient' EVEN IF the threshold was crossed", () => {
    // 10 wildly confident, correct picks: enough evidence to cross 20, not
    // enough picks to be allowed to say so.
    const pts: ForecastSkillPoint[] = Array.from({ length: 10 }, () => ({
      p: 0.95,
      m: 0.5,
      y: 1 as const,
    }));
    const res = forecastSkillEProcess(pts)!;
    expect(res.n).toBe(10);
    expect(res.maxLogM).toBeGreaterThan(LN20);
    expect(res.firstCrossedAtPick).not.toBeNull();
    expect(res.eligible).toBe(false);
    expect(res.verdict).toBe("insufficient");
    expect(res.verdict).not.toBe("evidence-of-skill-vs-market");
    expect(res.operatorHint).toContain("NO verdict");
    // DELIBERATE, and pinned because it is a foot-gun: `rejectsAt` is a
    // statement about the STATISTIC (the max really did cross), so it is
    // non-null here while the product gate withholds. `verdict` / `eligible`
    // are the publish gates; anything downstream that gates on `rejectsAt`
    // alone would publish off a 10-pick ledger.
    expect(res.rejectsAt).toBe(20);
    expect(res.eligible).toBe(false);
    expect(res.operatorHint).not.toContain("SCOPE:");
  });
});

describe("forecastSkillEProcess — numerical construction", () => {
  it("is DETERMINISTIC: identical input -> deeply identical output", () => {
    const pts = underNull(mulberry32(7), 120, (g) => (g() - 0.5) * 0.2);
    expect(forecastSkillEProcess(pts)).toEqual(forecastSkillEProcess(pts));
    // and independent of the caller's array identity
    expect(forecastSkillEProcess([...pts])).toEqual(forecastSkillEProcess(pts));
  });

  it("log-space accumulation EQUALS the naive product on small well-conditioned input", () => {
    const gen = mulberry32(11);
    const pts: ForecastSkillPoint[] = Array.from({ length: 25 }, () => {
      const m = 0.3 + 0.4 * gen();
      const p = 0.25 + 0.5 * gen();
      const y: 0 | 1 = gen() < m ? 1 : 0;
      return { p, m, y };
    });
    // eps = 0 makes the module compute the LITERAL naive likelihood ratio; with
    // p, m well inside (0,1) the clamp is a no-op, so the two must agree.
    const res = forecastSkillEProcess(pts, { epsilon: 0 })!;
    let product = 1;
    for (const pt of pts) product *= pt.y === 1 ? pt.p / pt.m : (1 - pt.p) / (1 - pt.m);
    expect(res.m).toBeCloseTo(product, 10);
    expect(res.logM).toBeCloseTo(Math.log(product), 12);
  });

  it("CLAMPING handles p and m at exactly 0 and 1 without NaN/Infinity", () => {
    const extremes: ForecastSkillPoint[] = [
      { p: 0, m: 0.5, y: 1 }, // maximally wrong, would be log(0) unclamped
      { p: 1, m: 0.5, y: 0 }, // the mirror case
      { p: 0.5, m: 0, y: 1 }, // divide-by-zero unclamped
      { p: 0.5, m: 1, y: 0 }, // divide-by-zero unclamped
      { p: 0, m: 0, y: 0 },
      { p: 1, m: 1, y: 1 },
      { p: 0, m: 1, y: 1 },
      { p: 1, m: 0, y: 0 },
    ];
    for (const pt of extremes) {
      const res = forecastSkillEProcess([pt], { epsilon: 0 })!;
      expect(Number.isFinite(res.logM)).toBe(true);
      expect(Number.isFinite(res.m)).toBe(true);
    }
    // Exact value of the unshrunk worst case: ln(floor) - ln(0.5).
    const worst = forecastSkillEProcess([{ p: 0, m: 0.5, y: 1 }], { epsilon: 0, floor: 1e-6 })!;
    expect(worst.logM).toBeCloseTo(Math.log(1e-6) - Math.log(0.5), 9);
    // p = m = 1 (both clamped identically) is a zero-information pick.
    const tie = forecastSkillEProcess([{ p: 1, m: 1, y: 1 }], { epsilon: 0 })!;
    expect(tie.logM).toBeCloseTo(0, 12);
  });

  it("reports M as SATURATING rather than overflowing to Infinity", () => {
    // 3000 confident correct picks: exp(logM) overflows a float many times over.
    const pts: ForecastSkillPoint[] = Array.from({ length: 3000 }, () => ({
      p: 0.99,
      m: 0.5,
      y: 1 as const,
    }));
    const res = forecastSkillEProcess(pts)!;
    expect(res.logM).toBeGreaterThan(1000);
    expect(res.m).toBe(Number.MAX_VALUE);
    expect(res.maxM).toBe(Number.MAX_VALUE);
    expect(Number.isFinite(res.m)).toBe(true);
    // logM stays exact and usable while M is pinned at the cap.
    expect(res.growthRatePerPick).toBeCloseTo(res.logM / 3000, 12);
    expect(res.growthRateBitsPerPick).toBeCloseTo(res.growthRatePerPick / Math.LN2, 12);
    // exp(-maxLogM) underflows to literal 0 at this scale. A published p-value
    // of exactly 0 asserts impossibility, which no finite ledger earns; the
    // floor is still a true UPPER bound on 1/max M, so the guarantee direction
    // is preserved.
    expect(Math.exp(-res.maxLogM)).toBe(0);
    expect(res.anytimeValidPValue).toBeGreaterThan(0);
    expect(res.anytimeValidPValue).toBe(Number.MIN_VALUE);
    expect(res.anytimeValidPValue).toBeLessThan(1e-300);
  });

  it("EVERY single-pick factor respects the worst-case bound (the absorbing-zero guarantee)", () => {
    const gen = mulberry32(23);
    const pts: ForecastSkillPoint[] = Array.from({ length: 400 }, () => {
      // deliberately adversarial: forecasts pinned at the extremes
      const m = 0.02 + 0.96 * gen();
      const p = gen() < 0.5 ? 0 : 1;
      const y: 0 | 1 = gen() < 0.5 ? 1 : 0;
      return { p, m, y };
    });
    let state = initForecastSkillFold()!;
    const bound = summarizeForecastSkillFold(state).worstCaseLogFactorPerPick;
    expect(bound).toBeCloseTo(Math.log(0.05), 12);
    for (const pt of pts) {
      const prev = state.logM;
      const next = foldForecastSkillPick(state, pt)!;
      expect(next.logM - prev).toBeGreaterThanOrEqual(bound - 1e-12);
      state = next;
    }
  });
});

describe("forecastSkillEProcess — THE MARTINGALE PROPERTY (the crux)", () => {
  /**
   * THE load-bearing test. Everything else in this block is corroboration.
   *
   * The property the module rests on is CONDITIONAL: E[E_t | F_{t-1}] = 1 for
   * every (p, m), which under H0 (y ~ Bernoulli(m)) is exactly
   *     m * E(y=1) + (1-m) * E(y=0) = 1.
   * That is a closed-form identity, so it is checked exactly (1e-12) on a grid
   * — not estimated by averaging.
   *
   * WHY THE MONTE-CARLO BELOW CANNOT REPLACE THIS (demonstrated by mutation,
   * not assumed): score y=1 with the y=0 branch and vice versa. The conditional
   * mean becomes 1 + d*(1-2m)/(m(1-m)) with d = p~ - m, which is a real
   * violation at every m != 1/2 — but its sign flips with (m - 1/2), so under a
   * generator with d symmetric and independent of m it averages to EXACTLY 1.
   * That mutant passes every simulation in this file, including both Ville
   * checks. The grid below fails it on the first m != 1/2 point.
   */
  it("EXACT: E[E_t | past] = 1 for every (p, m, eps, floor) inside the clamp band", () => {
    const ms = [0.02, 0.15, 0.3, 0.49, 0.5, 0.5001, 0.7, 0.85, 0.98];
    const ps = [0, 0.01, 0.2, 0.5, 0.75, 0.99, 1];
    const epsilons = [0, 0.05, 0.2, 0.5];
    const floors = [1e-6, 1e-9];
    let checked = 0;
    let asymmetric = 0;
    for (const floor of floors) {
      for (const epsilon of epsilons) {
        for (const m of ms) {
          for (const p of ps) {
            const mean = conditionalMean(p, m, { epsilon, floor });
            expect(Math.abs(mean - 1)).toBeLessThan(1e-12);
            checked++;
            if (m !== 0.5) asymmetric++;
          }
        }
      }
    }
    // Guard the guard: a grid that never leaves m = 1/2 would be blind to the
    // branch-swap mutant described above.
    expect(checked).toBe(floors.length * epsilons.length * ms.length * ps.length);
    expect(asymmetric).toBeGreaterThan(checked * 0.8);
  });

  it("EXACT: both branch factors are floored at epsilon, so no factor can be ~0", () => {
    for (const epsilon of [0, 0.05, 0.2, 0.5]) {
      for (const m of [1e-6, 0.02, 0.5, 0.97, 1 - 1e-6]) {
        for (const p of [0, 0.5, 1]) {
          const { e1, e0 } = branchFactors(p, m, { epsilon, floor: 1e-6 });
          expect(e1).toBeGreaterThanOrEqual(epsilon);
          expect(e0).toBeGreaterThanOrEqual(epsilon);
          expect(e1).toBeGreaterThan(0);
          expect(e0).toBeGreaterThan(0);
        }
      }
    }
  });

  /**
   * The clamp is the ONE place the identity is not exact: clamping m replaces
   * the null's own denominator. The header derives that f(p~) is linear with
   * f(m^) = 1 and a slope whose sign always points AWAY from the reachable side
   * of p~, so the conditional mean can only fall BELOW 1 — a supermartingale,
   * which is still everything Ville needs. Pinned here in both directions so a
   * future "simplification" of the clamp cannot quietly flip it.
   */
  it("EXACT: m outside the clamp band degrades to <= 1 (supermartingale), never above", () => {
    const floor = 1e-6;
    const outside = [0, 5e-7, 9.9e-7, 1 - 9.9e-7, 1 - 5e-7, 1];
    let strict = 0;
    for (const epsilon of [0, 0.05, 0.5]) {
      for (const m of outside) {
        for (const p of [0, 0.25, 0.5, 0.75, 1]) {
          const mean = conditionalMean(p, m, { epsilon, floor });
          expect(mean).toBeLessThanOrEqual(1 + 1e-12);
          if (mean < 1 - 1e-6) strict++;
        }
      }
    }
    // Non-vacuity: the inequality is real, not equality dressed up.
    expect(strict).toBeGreaterThan(20);
    // And it really is the SAFE direction — an m just inside the band is exact.
    expect(Math.abs(conditionalMean(0.25, floor, { floor }) - 1)).toBeLessThan(1e-12);
  });

  /**
   * CORROBORATION of the exact identity above, along realistic sequential
   * paths: if E[E_t | past] = 1 under H0 then E[M_n] = 1 for every n, so the
   * Monte-Carlo mean of the final M over independent H0 ledgers must sit at 1
   * up to Monte-Carlo error. Read it as "the product of many steps really does
   * stay centred", NOT as the proof of the step identity — see the mutation
   * note on the exact test above for why an average cannot carry that weight.
   *
   * Config is chosen so the variance of M stays small enough that the sample
   * mean is a sharp instrument: |p - m| <= 0.10, m in [0.35, 0.65], n = 50.
   * Analytically E[E_t^2] = 1 + d^2/(m(1-m)) with d = (1-eps)(p-m), giving
   * Var(M_50) ~ 0.9 and a standard error near 0.013 over 5000 runs.
   *
   * MEASURED (fixed numbers under seed 2026): mean M = 1.0091 with eps = 0.05
   * (sd 0.938, SE 0.0133) and 1.0099 with eps = 0 (sd 1.006, SE 0.0142) — both
   * within one standard error of the theoretical 1. The +-0.045 tolerance below
   * is ~3.4 SE around the theoretical value; it is a deterministic seeded
   * quantity, so this is a pin, not a coin flip.
   */
  function meanFinalM(seed: number, runs: number, n: number, epsilon: number): number {
    const gen = mulberry32(seed);
    let total = 0;
    for (let r = 0; r < runs; r++) {
      const pts = underNull(gen, n, (g) => (g() - 0.5) * 0.2);
      const res = forecastSkillEProcess(pts, { epsilon, minPicks: 1 })!;
      total += res.m;
    }
    return total / runs;
  }

  it("mean of final M over H0 ledgers is 1 (shrunk process, the production default)", () => {
    const mean = meanFinalM(2026, 5000, 50, 0.05);
    expect(mean).toBeGreaterThan(0.955);
    expect(mean).toBeLessThan(1.045);
  });

  it("VALIDITY SURVIVES SHRINKAGE: the unshrunk process has the same mean-1 property", () => {
    // eps only changes the forecast that gets scored; the mean-1 identity holds
    // for ANY predictable forecast, so eps = 0 and eps = 0.05 are both valid.
    // (eps buys the absorbing-zero fix; it does not buy — or cost — validity.)
    const naive = meanFinalM(2026, 5000, 50, 0);
    const shrunk = meanFinalM(2026, 5000, 50, 0.05);
    expect(naive).toBeGreaterThan(0.955);
    expect(naive).toBeLessThan(1.045);
    expect(shrunk).toBeGreaterThan(0.955);
    expect(shrunk).toBeLessThan(1.045);
    // Shrinkage is not a no-op — it really did change the trajectories.
    expect(Math.abs(naive - shrunk)).toBeGreaterThan(0);
    // ...and the exact statement of the same claim: at every eps in [0, 0.5] the
    // conditional identity is untouched, so the alpha is literally identical.
    for (const epsilon of [0, 0.05, 0.25, 0.5]) {
      expect(Math.abs(conditionalMean(0.8, 0.3, { epsilon }) - 1)).toBeLessThan(1e-12);
      expect(Math.abs(conditionalMean(0.1, 0.62, { epsilon }) - 1)).toBeLessThan(1e-12);
    }
  });

  it("VILLE: empirical false-rejection rate over H0 ledgers stays within alpha", () => {
    // Higher-variance config so crossings are actually reachable (a config where
    // M can never move would make this check vacuous): |p - m| = 0.12, n = 400.
    //
    // MEASURED (seeded, so these are fixed numbers): 68/1500 = 0.0453 against a
    // 0.05 budget, with 33.6% of runs wandering above M = e. The bound is nearly
    // ATTAINED, which is exactly what theory predicts — a nonnegative martingale
    // run to a long horizon hits level a with probability approaching 1/a — so
    // this is the strongest available evidence that the check is not passing by
    // being vacuously conservative.
    const gen = mulberry32(4242);
    const RUNS = 1500;
    let rejections = 0;
    let anyMovement = 0;
    for (let r = 0; r < RUNS; r++) {
      const pts = underNull(gen, 400, (g) => (g() < 0.5 ? -0.12 : 0.12), 0.4, 0.6);
      const res = forecastSkillEProcess(pts, { alpha: 0.05, minPicks: 30 })!;
      if (res.rejectsAt !== null) rejections++;
      if (res.maxLogM > 1) anyMovement++;
    }
    const rate = rejections / RUNS;
    // Ville's inequality: P(exists T: M_T >= 1/alpha) <= alpha = 0.05.
    expect(rate).toBeLessThanOrEqual(0.05);
    // Non-vacuity: the process really does wander upward sometimes; it just
    // doesn't reach the threshold more often than alpha allows.
    expect(anyMovement).toBeGreaterThan(RUNS * 0.05);
  });

  it("VILLE holds at the conservative M >= 100 threshold too, and rejects strictly less often", () => {
    const gen = mulberry32(4242);
    const RUNS = 1500;
    let at20 = 0;
    let at100 = 0;
    for (let r = 0; r < RUNS; r++) {
      const pts = underNull(gen, 400, (g) => (g() < 0.5 ? -0.12 : 0.12), 0.4, 0.6);
      const loose = forecastSkillEProcess(pts, { alpha: 0.05, minPicks: 30 })!;
      const strict = forecastSkillEProcess(pts, {
        evidenceThreshold: CONSERVATIVE_EVIDENCE_THRESHOLD,
        minPicks: 30,
      })!;
      expect(strict.threshold).toBe(100);
      if (loose.rejectsAt !== null) at20++;
      if (strict.rejectsAt !== null) at100++;
    }
    expect(at100 / RUNS).toBeLessThanOrEqual(0.01);
    expect(at100).toBeLessThanOrEqual(at20);
  });
});

describe("forecastSkillEProcess — power and direction", () => {
  it("POWER: a genuinely better forecaster crosses the threshold on every seed", () => {
    // Outcomes drawn from p = 0.68 while the market says 0.50: real skill.
    for (let seed = 1; seed <= 20; seed++) {
      const pts = underSkill(mulberry32(seed * 977), 600, 0.5, 0.68);
      const res = forecastSkillEProcess(pts)!;
      expect(res.verdict).toBe("evidence-of-skill-vs-market");
      expect(res.rejectsAt).toBe(20);
      expect(res.firstCrossedAtPick).not.toBeNull();
      expect(res.logM).toBeGreaterThan(10);
      expect(res.growthRatePerPick).toBeGreaterThan(0.02);
      expect(res.anytimeValidPValue).toBeLessThan(0.05);
    }
  });

  it("POWER: evidence per pick is the interpretable, sample-size-comparable quantity", () => {
    const short = forecastSkillEProcess(underSkill(mulberry32(31), 200, 0.5, 0.68))!;
    const long = forecastSkillEProcess(underSkill(mulberry32(31), 2000, 0.5, 0.68))!;
    // M differs by many orders of magnitude; nats/pick describes one forecaster.
    expect(long.logM).toBeGreaterThan(short.logM * 5);
    expect(long.growthRatePerPick).toBeCloseTo(short.growthRatePerPick, 1);
    expect(long.growthRateBitsPerPick).toBeCloseTo(long.growthRatePerPick / Math.LN2, 12);
  });

  it("a WORSE forecaster drives logM negative and never rejects", () => {
    // Outcomes come from the market (0.5) but we insist on 0.35 — systematically
    // on the wrong side.
    const pts = underSkill(mulberry32(555), 500, 0.5, 0.5).map<ForecastSkillPoint>((pt) => ({
      p: 0.35,
      m: 0.5,
      y: pt.y,
    }));
    const res = forecastSkillEProcess(pts)!;
    expect(res.logM).toBeLessThan(-5);
    expect(res.growthRatePerPick).toBeLessThan(0);
    expect(res.rejectsAt).toBeNull();
    expect(res.verdict).toBe("no-evidence");
    // Honest framing: a negative path is a DIAGNOSTIC, not a finding against us.
    expect(res.operatorHint).toContain("diagnostic only");
  });

  it("the RUNNING MAXIMUM is the statistic: a crossing counts even after it decays away", () => {
    // 60 strong picks push M far above 20, then 300 bad picks drag it back down.
    const up: ForecastSkillPoint[] = Array.from({ length: 60 }, () => ({
      p: 0.8,
      m: 0.5,
      y: 1 as const,
    }));
    const down: ForecastSkillPoint[] = Array.from({ length: 300 }, () => ({
      p: 0.8,
      m: 0.5,
      y: 0 as const,
    }));
    const res = forecastSkillEProcess([...up, ...down])!;
    expect(res.logM).toBeLessThan(0); // current evidence is gone...
    expect(res.maxLogM).toBeGreaterThan(LN20); // ...but the crossing happened
    expect(res.rejectsAt).toBe(20);
    expect(res.firstCrossedAtPick).not.toBeNull();
    expect(res.firstCrossedAtPick!).toBeLessThanOrEqual(60);
    expect(res.verdict).toBe("evidence-of-skill-vs-market");
    // The anytime-valid p-value is likewise driven by the max, not the tail.
    expect(res.anytimeValidPValue).toBeLessThan(0.05);
  });
});

describe("forecastSkillEProcess — the running maximum, against an independent oracle", () => {
  /**
   * Ville bounds the SUPREMUM of the path, so `maxLogM` (and the p-value and
   * `firstCrossedAtPick` derived from it) is the published statistic. Comparing
   * the fold to the batch cannot check it — both route through the same
   * accumulator, so an off-by-one in the max is invisible to that test (verified
   * by mutation: `Math.max(state.maxLogM, state.logM)`, which silently drops the
   * newest pick from the supremum, passed the entire suite before this test
   * existed). The oracle here is built OUTSIDE the accumulator: the per-prefix
   * logM values, maxed independently.
   */
  function prefixLogMs(pts: readonly ForecastSkillPoint[]): number[] {
    return pts.map((_, i) => forecastSkillEProcess(pts.slice(0, i + 1), { minPicks: 1 })!.logM);
  }

  it("maxLogM equals the independently recomputed max over all prefixes (M_0 = 1 included)", () => {
    const pts = underNull(mulberry32(97), 120, (g) => (g() - 0.5) * 0.6);
    const res = forecastSkillEProcess(pts, { minPicks: 1 })!;
    const logs = prefixLogMs(pts);
    // M_0 = 1 is a point on the path, so ln M_0 = 0 is in the running max.
    const oracle = Math.max(0, ...logs);
    expect(res.maxLogM).toBe(oracle);
    expect(res.logM).toBe(logs[logs.length - 1]);
    // Non-vacuity: this ledger genuinely wanders, and its max is NOT its tail.
    expect(oracle).toBeGreaterThan(0);
    expect(res.maxLogM).toBeGreaterThan(res.logM);
    // The published p-value is a function of the max, not of the tail.
    expect(res.anytimeValidPValue).toBe(Math.max(Math.min(1, Math.exp(-oracle)), Number.MIN_VALUE));
  });

  it("firstCrossedAtPick equals the first prefix whose logM reaches ln(threshold)", () => {
    const pts = underSkill(mulberry32(1234), 300, 0.5, 0.66);
    const res = forecastSkillEProcess(pts, { minPicks: 1 })!;
    const logs = prefixLogMs(pts);
    const oracle = logs.findIndex((l) => l >= LN20);
    expect(oracle).toBeGreaterThanOrEqual(0);
    expect(res.firstCrossedAtPick).toBe(oracle + 1);
    // ...and the crossing index is a FIRST crossing, not merely some crossing.
    const before = logs.slice(0, oracle);
    expect(before.every((l) => l < LN20)).toBe(true);
  });

  it("a crossing on the VERY LAST pick is still in the maximum (the off-by-one trap)", () => {
    // p = 0.8 vs m = 0.5, all correct: +0.4513 nats/pick, so ln 20 = 2.9957 is
    // first reached at pick 7 — which is also the last pick of this ledger, so
    // the maximum sits exactly on the final step.
    const pts: ForecastSkillPoint[] = Array.from({ length: 7 }, () => ({
      p: 0.8,
      m: 0.5,
      y: 1 as const,
    }));
    const six = forecastSkillEProcess(pts.slice(0, 6), { minPicks: 1 })!;
    expect(six.maxLogM).toBeLessThan(LN20);
    expect(six.rejectsAt).toBeNull();

    const res = forecastSkillEProcess(pts, { minPicks: 1 })!;
    expect(res.maxLogM).toBe(res.logM); // monotone path: max IS the final value
    expect(res.maxLogM).toBeGreaterThanOrEqual(LN20);
    expect(res.firstCrossedAtPick).toBe(7);
    expect(res.rejectsAt).toBe(20);
    expect(res.verdict).toBe("evidence-of-skill-vs-market");
    // maxM and the p-value must agree with the same final step.
    expect(res.maxM).toBe(res.m);
    expect(res.anytimeValidPValue).toBeLessThanOrEqual(0.05);
  });

  /**
   * The whole verdict surface must be a function of the SUPREMUM, not of the
   * tail, on every path — including paths that crossed and then gave it all
   * back. Checked as an invariant over a family of seeded ledgers rather than
   * on one hand-built example, so that "reads the final value instead of the
   * record" cannot survive by getting one example right.
   */
  it("rejectsAt / verdict / p-value are all functions of the oracle max, on every path", () => {
    let crossers = 0;
    let nonCrossers = 0;
    let decayed = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const gen = mulberry32(seed * 7919);
      const p = seed % 2 === 0 ? 0.7 : 0.56; // strong and weak forecasters
      const build: ForecastSkillPoint[] = Array.from({ length: 80 }, () => ({
        p,
        m: 0.5,
        y: (gen() < p + 0.05 ? 1 : 0) as 0 | 1,
      }));
      const giveBack: ForecastSkillPoint[] = Array.from({ length: 120 }, () => ({
        p,
        m: 0.5,
        y: (gen() < 1 - p ? 1 : 0) as 0 | 1,
      }));
      const pts = [...build, ...giveBack];

      const res = forecastSkillEProcess(pts, { minPicks: 1 })!;
      const logs = prefixLogMs(pts);
      const oracleMax = Math.max(0, ...logs);
      const oracleFirst = logs.findIndex((l) => l >= LN20);

      expect(res.maxLogM).toBe(oracleMax);
      expect(res.rejectsAt).toBe(oracleMax >= LN20 ? 20 : null);
      expect(res.firstCrossedAtPick).toBe(oracleFirst >= 0 ? oracleFirst + 1 : null);
      expect(res.verdict).toBe(oracleMax >= LN20 ? "evidence-of-skill-vs-market" : "no-evidence");
      expect(res.anytimeValidPValue).toBe(
        Math.max(Math.min(1, Math.exp(-oracleMax)), Number.MIN_VALUE),
      );

      if (oracleMax >= LN20) crossers++;
      else nonCrossers++;
      if (res.maxLogM > res.logM) decayed++;
    }
    // Non-vacuity: the family really does contain both outcomes, and paths that
    // crossed and then decayed (the case where max != tail actually bites).
    expect(crossers).toBeGreaterThan(0);
    expect(nonCrossers).toBeGreaterThan(0);
    expect(decayed).toBe(12);
  });

  it("maxLogM never decreases along the fold, and never falls below the current logM", () => {
    const pts = underNull(mulberry32(8181), 200, (g) => (g() - 0.5) * 0.5);
    let state = initForecastSkillFold({ minPicks: 1 })!;
    let previousMax = state.maxLogM;
    expect(previousMax).toBe(0);
    for (const pt of pts) {
      state = foldForecastSkillPick(state, pt)!;
      expect(state.maxLogM).toBeGreaterThanOrEqual(previousMax);
      expect(state.maxLogM).toBeGreaterThanOrEqual(state.logM);
      previousMax = state.maxLogM;
    }
  });
});

describe("forecastSkillEProcess — the absorbing-zero defect is FIXED", () => {
  /**
   * The naive product dies on a single confident-and-wrong pick. These two
   * ledgers are IDENTICAL; only eps differs. With the default shrinkage the
   * disaster costs ln(1/0.05) = 3.0 nats and 40 good picks more than repay it;
   * with eps = 0 it costs ~13.1 nats and the same 40 picks cannot climb back.
   */
  const disaster: ForecastSkillPoint = { p: 0, m: 0.5, y: 1 };
  const good: ForecastSkillPoint[] = Array.from({ length: 40 }, () => ({
    p: 0.6,
    m: 0.5,
    y: 1 as const,
  }));
  const ledger: ForecastSkillPoint[] = [disaster, ...good];

  it("shrinkage bounds the damage of one catastrophic pick to ln(1/eps)", () => {
    const only = forecastSkillEProcess([disaster], { minPicks: 1 })!;
    // The structural floor is ln(eps) = -2.9957. The realised value sits a hair
    // ABOVE it (-2.99569) because the clamp turns p = 0 into 1e-6, which the
    // shrinkage then carries through as (1-eps)*1e-6 of extra mass. Never below.
    expect(only.logM).toBeGreaterThanOrEqual(only.worstCaseLogFactorPerPick);
    expect(only.logM).toBeCloseTo(Math.log(0.05), 4);
    expect(only.logM).toBeGreaterThan(-3);
  });

  it("RECOVERY IS POSSIBLE with shrinkage, and provably not without it", () => {
    const shrunk = forecastSkillEProcess(ledger, { epsilon: 0.05, minPicks: 30 })!;
    const naive = forecastSkillEProcess(ledger, { epsilon: 0, minPicks: 30 })!;

    // Same picks, same order, same everything but eps.
    expect(shrunk.n).toBe(naive.n);

    // Shrunk: fully recovered AND past the rejection threshold.
    expect(shrunk.logM).toBeGreaterThan(0);
    expect(shrunk.logM).toBeGreaterThan(LN20);
    expect(shrunk.verdict).toBe("evidence-of-skill-vs-market");

    // Naive: still deep underwater after the identical 40 good picks. The
    // process was effectively killed by ONE pick.
    expect(naive.logM).toBeLessThan(0);
    expect(naive.rejectsAt).toBeNull();
    expect(naive.logM).toBeLessThan(shrunk.logM - 8);
  });

  it("the naive process needs ~2.5x as many good picks to undo the same single mistake", () => {
    const breakEven = (epsilon: number): number => {
      let state = initForecastSkillFold({ epsilon, minPicks: 1 })!;
      state = foldForecastSkillPick(state, disaster)!;
      let picks = 0;
      while (state.logM < 0 && picks < 10_000) {
        state = foldForecastSkillPick(state, { p: 0.6, m: 0.5, y: 1 })!;
        picks++;
      }
      return picks;
    };
    const shrunkPicks = breakEven(0.05);
    const naivePicks = breakEven(0);
    expect(shrunkPicks).toBeLessThan(25);
    expect(naivePicks).toBeGreaterThan(2 * shrunkPicks);
  });
});

describe("forecastSkillEProcess — incremental fold", () => {
  it("the fold IS the batch: prefix-by-prefix exact equality", () => {
    const pts = underNull(mulberry32(64), 90, (g) => (g() - 0.5) * 0.3);
    let state: ForecastSkillFoldState = initForecastSkillFold({ minPicks: 30 })!;
    for (let i = 0; i < pts.length; i++) {
      const pt = pts[i];
      expect(pt).toBeDefined();
      state = foldForecastSkillPick(state, pt!)!;
      const batch = forecastSkillEProcess(pts.slice(0, i + 1), { minPicks: 30 })!;
      expect(summarizeForecastSkillFold(state)).toEqual(batch);
    }
  });

  it("fold states are immutable and refuse malformed picks without corrupting state", () => {
    const state = initForecastSkillFold()!;
    const next = foldForecastSkillPick(state, { p: 0.6, m: 0.5, y: 1 })!;
    expect(state.n).toBe(0);
    expect(state.logM).toBe(0);
    expect(next.n).toBe(1);
    expect(foldForecastSkillPick(next, { p: Number.NaN, m: 0.5, y: 1 })).toBeNull();
    // the state the caller already holds is untouched and still usable
    expect(next.n).toBe(1);
    expect(foldForecastSkillPick(next, { p: 0.6, m: 0.5, y: 1 })!.n).toBe(2);
  });

  it("a fresh fold state summarizes exactly like an empty batch", () => {
    expect(summarizeForecastSkillFold(initForecastSkillFold()!)).toEqual(
      forecastSkillEProcess([])!,
    );
  });

  it("rejects the same bad options as the batch entry point", () => {
    expect(initForecastSkillFold({ alpha: 0 })).toBeNull();
    expect(initForecastSkillFold({ epsilon: 0.6 })).toBeNull();
    expect(initForecastSkillFold({ floor: -1 })).toBeNull();
    expect(initForecastSkillFold({ evidenceThreshold: 1 })).toBeNull();
    expect(initForecastSkillFold({ minPicks: -3 })).toBeNull();
  });
});

describe("forecastSkillEProcess — honesty surface", () => {
  it("a rejection NEVER claims profitability or PROVEN, and always carries the de-vig condition", () => {
    const res = forecastSkillEProcess(underSkill(mulberry32(88), 600, 0.5, 0.68))!;
    expect(res.verdict).toBe("evidence-of-skill-vs-market");
    expect(res.operatorHint).toContain("NOT profitability");
    expect(res.operatorHint).toContain("NOT the PROVEN gate");
    expect(res.operatorHint).toContain("DE-VIGGED");
    expect(res.operatorHint).toContain("one pick per game");
    expect(res.operatorHint).not.toContain("proven edge");
  });

  it("every verdict carries the de-vig / one-pick-per-game condition, not just the flattering one", () => {
    const insufficient = forecastSkillEProcess([{ p: 0.6, m: 0.5, y: 1 }])!;
    const none = forecastSkillEProcess(
      underNull(mulberry32(3), 100, (g) => (g() - 0.5) * 0.05),
    )!;
    for (const res of [insufficient, none]) {
      expect(res.operatorHint).toContain("DE-VIGGED");
      expect(res.operatorHint).toContain("one pick per game");
    }
    expect(none.verdict).toBe("no-evidence");
    expect(none.operatorHint).toContain("H0");
  });

  it("vigWarning fires on market probabilities that sit above the realised base rate", () => {
    // 200 picks where the market says 0.62 but the event lands 45% of the time —
    // the signature of vig-inclusive inputs (or of a real edge; the screen
    // cannot tell, and the hint says so).
    const gen = mulberry32(404);
    const pts: ForecastSkillPoint[] = Array.from({ length: 200 }, () => ({
      p: 0.5,
      m: 0.62,
      y: (gen() < 0.45 ? 1 : 0) as 0 | 1,
    }));
    const res = forecastSkillEProcess(pts)!;
    expect(res.marketMeanProbability).toBeCloseTo(0.62, 9);
    expect(res.realisedRate).toBeLessThan(0.55);
    expect(res.vigWarning).toBe(true);
    expect(res.operatorHint).toContain("INPUT AUDIT");
    // ...and it stays quiet when the market's numbers track the outcomes.
    const clean = forecastSkillEProcess(
      underNull(mulberry32(405), 300, (g) => (g() - 0.5) * 0.1),
    )!;
    expect(clean.vigWarning).toBe(false);
    expect(clean.operatorHint).not.toContain("INPUT AUDIT");
  });

  it("echoes its configuration so a stored result is self-describing", () => {
    const res = forecastSkillEProcess([{ p: 0.6, m: 0.5, y: 1 }], {
      evidenceThreshold: CONSERVATIVE_EVIDENCE_THRESHOLD,
      epsilon: 0.1,
      floor: 1e-9,
      minPicks: 100,
    })!;
    expect(res.alpha).toBe(0.05);
    expect(res.threshold).toBe(100);
    expect(res.epsilon).toBe(0.1);
    expect(res.floor).toBe(1e-9);
    expect(res.minPicks).toBe(100);
    expect(res.worstCaseLogFactorPerPick).toBeCloseTo(Math.log(0.1), 12);
    // `alpha` here is the CONFIGURED value and is NOT the level being tested at
    // — the threshold overrode it. The honest level is derived, and reported.
    expect(res.deliveredAlpha).toBe(0.01);
  });

  it("reports the level Ville ACTUALLY delivers, not the configured alpha", () => {
    // Default case: the two agree exactly and nothing extra is said.
    const plain = forecastSkillEProcess(underSkill(mulberry32(19), 400, 0.5, 0.68))!;
    expect(plain.deliveredAlpha).toBe(plain.alpha);
    expect(plain.operatorHint).not.toContain("LEVEL:");

    // The trap: a caller names a strict alpha AND a loose threshold. The test is
    // then running at 1/20 = 0.05, not at the 0.01 the config advertises, and a
    // stored result that only carried `alpha` would read as a 1%-level finding.
    const pts = underSkill(mulberry32(19), 400, 0.5, 0.68);
    const mismatched = forecastSkillEProcess(pts, { alpha: 0.01, evidenceThreshold: 20 })!;
    expect(mismatched.alpha).toBe(0.01);
    expect(mismatched.threshold).toBe(20);
    expect(mismatched.deliveredAlpha).toBe(0.05);
    expect(mismatched.verdict).toBe("evidence-of-skill-vs-market");
    expect(mismatched.operatorHint).toContain("LEVEL:");
    expect(mismatched.operatorHint).toContain("OVERRIDES the configured alpha");
    expect(mismatched.operatorHint).toContain("quote that, not the configured alpha");
    // The p-value is unaffected by any of this — it is a property of the path.
    expect(mismatched.anytimeValidPValue).toBe(plain.anytimeValidPValue);
  });

  it("operator copy never carries float dust from a non-terminating 1/alpha", () => {
    // 1/0.03 = 33.333333333333336 in binary floating point.
    const res = forecastSkillEProcess(underNull(mulberry32(21), 60, (g) => (g() - 0.5) * 0.05), {
      alpha: 0.03,
    })!;
    expect(res.threshold).toBe(1 / 0.03); // the exact value is preserved...
    expect(res.operatorHint).not.toContain("33.333333333333336"); // ...but not quoted
    expect(res.operatorHint).toContain("33.33");
  });
});
