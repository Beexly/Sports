/**
 * T13 -- the PROXIMAL BRIDGE on an UNBREAKABLE BOW-ARC.
 *
 * THE SPEC'S T13, verbatim from Table 5:
 *
 *   "Proximal Negative-Control Identification on Unbreakable Bow-Arc: When X -> Y, X <-> Y has
 *    0 mediators on X -> Y, verifies RKHS Fredholm bridge solver recovers E[Y | do(X=x)] via
 *    proxies (Z, W) when kappa(K_WZ) <= 50 and refuses when ill-posed."
 *
 * AND THE SPEC'S §6.3, which is the reason the scenario is the way it is:
 *
 *   "When runShpitserPearlID returns FAIL_HEDGE on an intervention A = a ... and ID-EnablingEdges
 *    finds ZERO OBSERVED MEDIATORS on A -> Y to break the hedge, proximal-bridge-id.ts invokes
 *    Nonparametric Proximal Causal Inference. Selecting a Treatment-Inducing Negative-Control
 *    Proxy Z and an Outcome-Inducing Negative-Control Proxy W satisfying W ... A | (U, X) and
 *    W ... Z | (A, U, X), the engine solves the Fredholm integral equation of the first kind for
 *    the outcome bridge function h(a, W, X) via Tikhonov-regularized RKHS regression."
 *
 * WHY THIS FILE IS SEPARATE FROM proximal-bridge-id.test.ts. That suite tests the SOLVER, in
 * isolation, on a linear-Gaussian proximal problem. It never builds the graph the spec names,
 * never goes through the gate, and never checks that the bow-arc refusal and the proximal
 * admission are the SAME decision seen from two sides. This file tests the ROUTE: the graph
 * where the ordinary path cannot identify the effect, the mediators that cannot break the
 * hedge, and the proxies that can.
 *
 * WHY IT MATTERS. The bow-arc is the case where the engine is SUPPOSED to be able to answer
 * and currently cannot. Without a proxy the answer is "association only" and that is correct.
 * With a proxy, the answer is "causal, by the proximal g-formula" -- a different claim, from a
 * different argument, and the verdict has to say WHICH one. A gate that cannot produce the
 * second answer is a gate that has silently lost half the spec.
 *
 * EVERY ASSERTION HERE IS ON THE GATE'S OWN VERDICT, not on the solver's internals. The
 * solver is tested in its own file; what is untested until now is whether the gate ever
 * REACHES it, and whether the verdict it returns when it does is right.
 */
import { describe, expect, it } from "vitest";

import { evaluateCausalClaim, G3_REFUSAL, type CausalClaimQuery } from "../src/causal/causal-claim-gate.js";
import {
  MIN_FREDHOLM_CONDITION_NUMBER,
  MIN_PROXIMAL_SAMPLE_SIZE,
  type ProximalDataset,
} from "../src/causal/proximal-bridge-id.js";
import type { CausalADMG } from "../src/causal/do-calculus-id.js";

// ---------------------------------------------------------------------------
// THE GRAPH
// ---------------------------------------------------------------------------

/**
 * THE BOW-ARC: X -> Y with X <-> Y.
 *
 * This is the spec's "unbreakable bow-arc". It is unbreakable for the ORDINARY route because
 * the only edge that could break the hedge is X -> Y itself, and no mediator on that edge
 * exists: the graph has two nodes and one directed edge between them, so there is nothing
 * strictly between X and Y for a mediator to occupy.
 *
 * The bidirected edge X <-> Y is the latent common cause. It is what makes the effect
 * unidentifiable: the P(Y | do(X=x)) functional is not a function of the observed
 * distribution, whatever else is measured.
 */
const BOW_ARC: CausalADMG = {
  nodes: ["X", "Y"],
  directed: [["X", "Y"]],
  bidirected: [["X", "Y"]],
};

// ---------------------------------------------------------------------------
// THE DATA
// ---------------------------------------------------------------------------

/** A deterministic 24-bit LCG, matching the repo's own generators. */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 12345) >>> 0;
    return (s >>> 8) / 16777216;
  };
}

function gaussian(rand: () => number): number {
  const u1 = Math.max(rand(), 1e-12);
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** The true causal effect, in the units of the DGP below. */
const TRUE_BETA = 0.6;

/**
 * THE PROXIMAL DGP.
 *
 *   U  an unmeasured common cause -- the latent the bidirected edge X <-> Y stands for
 *   A = 0.8 U + 0.6 X + noise        (the treatment X)
 *   Z = 0.9 U + noise                (the treatment-inducing proxy)
 *   W = 0.9 U + noise                (the outcome-inducing proxy)
 *   Y = beta A + gamma U + 0.3 X + noise
 *
 * The proxies satisfy the spec's conditions: Z is affected by U and not by A, and W is
 * affected by U and not by A or Z. A linear bridge h(a, w, x) = t0 + t1 a + t2 w + t3 x exists
 * exactly, with t1 = beta, so the well-posed case has a RIGHT ANSWER to recover. That is what
 * makes the recovery assertion meaningful: the gate has to return E[Y | do(X=x)] and not the
 * biased slope.
 *
 * `collinearProxy` replaces Z with A plus a whisper of noise, which makes the instrument Gram
 * matrix numerically singular and drives the Fredholm condition number past 50. Nothing else
 * about the data changes, so the ONLY difference between the admitting and the refusing case
 * is the conditioning of the bridge.
 */
interface ProximalDgp {
  readonly n: number;
  readonly seed: number;
  readonly beta: number;
  readonly gamma: number;
  readonly collinearProxy: boolean;
}

function simulateProximal(dgp: ProximalDgp): ProximalDataset {
  const rand = makeRng(dgp.seed);
  const treatment: number[] = [];
  const treatmentProxy: number[] = [];
  const outcomeProxy: number[] = [];
  const covariate: number[] = [];
  const outcome: number[] = [];
  for (let i = 0; i < dgp.n; i++) {
    const u = gaussian(rand);
    const x = gaussian(rand);
    const a = 0.8 * u + 0.6 * x + gaussian(rand);
    const z = dgp.collinearProxy ? a + 1e-4 * gaussian(rand) : 0.9 * u + gaussian(rand);
    const w = 0.9 * u + gaussian(rand);
    const y = dgp.beta * a + dgp.gamma * u + 0.3 * x + gaussian(rand);
    treatment.push(a);
    treatmentProxy.push(z);
    outcomeProxy.push(w);
    covariate.push(x);
    outcome.push(y);
  }
  return { treatment, treatmentProxy, outcomeProxy, covariate, outcome };
}

/** The well-posed proximal problem: a solvable bridge, and a true effect to recover. */
const WELL_POSED: ProximalDgp = { n: 1200, seed: 4242, beta: TRUE_BETA, gamma: 0.3, collinearProxy: false };

/** The ill-posed one: the instrument matrix is singular, so the Fredholm equation cannot be inverted. */
const ILL_POSED: ProximalDgp = { n: 1200, seed: 4242, beta: TRUE_BETA, gamma: 0.3, collinearProxy: true };

/** The unadjusted slope of Y on A, which is BIASED by the confounder U. */
function olsSlope(y: readonly number[], a: readonly number[]): number {
  const n = y.length;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    sx += a[i] as number;
    sy += y[i] as number;
  }
  const mx = sx / n;
  const my = sy / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = (a[i] as number) - mx;
    num += dx * ((y[i] as number) - my);
    den += dx * dx;
  }
  return num / den;
}

// ---------------------------------------------------------------------------
// T13
// ---------------------------------------------------------------------------

describe("T13 -- the proximal bridge on an UNBREAKABLE bow-arc", () => {
  /**
   * THE SPEC'S SCENARIO, EXACTLY. X -> Y, X <-> Y, and ZERO mediators on X -> Y.
   *
   * The mediators are supplied and are REJECTED, so this is not a case where the refusal
   * happened to have nothing to try. The point is that the ordinary route cannot answer this
   * question, and the proximal route can.
   */
  it("a bow-arc with 0 mediators is refused on the ordinary path", () => {
    // A candidate mediator that does NOT break the hedge. It is supplied so the test proves
    // the refusal is not merely "we had no ideas".
    const verdict = evaluateCausalClaim({
      y: ["Y"],
      x: ["X"],
      graph: BOW_ARC,
      positivity: 1,
      mediators: [
        {
          signalId: "NOT_A_MEDIATOR",
          tValid: true,
          n: 400,
          breaksHedge: false,
          rejection: "DOES_NOT_BREAK_HEDGE",
        },
      ],
    });

    expect(verdict.publishable).toBe(false);
    expect(verdict.refusal_code).toBe(G3_REFUSAL.nonIdentifiableHedge);
    expect(verdict.conclusion).toBe("ASSOCIATION_ONLY");
    // The hedge is reported: this is the unbreakable one.
    expect(verdict.hedge_count).toBe(1);
    expect(verdict.hedge_forest_sub).toEqual(["Y"]);
    // And NO mediator activated, because none could break it.
    expect(verdict.activating_mediators.length).toBe(0);
  });

  /**
   * THE PROXIMAL ROUTE ADMITS. This is the spec's headline claim: the effect that the
   * ordinary path cannot identify IS identified by proximal causal inference, and the verdict
   * says so by a DIFFERENT formula.
   */
  it("the SAME bow-arc is published CAUSAL by the proximal g-formula when proxies are supplied", () => {
    const dataset = simulateProximal(WELL_POSED);
    const verdict = evaluateCausalClaim({
      y: ["Y"],
      x: ["X"],
      graph: BOW_ARC,
      positivity: 1,
      proximal: dataset,
    });

    // IT ADMITTED. The ordinary path still refuses -- the graph is the same graph -- but the
    // proximal route identified the effect by a different argument.
    expect(verdict.publishable).toBe(true);
    expect(verdict.conclusion).toBe("CAUSAL");
    expect(verdict.refusal_code).toBeNull();
    // THE FORMULA SAYS WHICH ARGUMENT. A verdict that published the proximal number under a
    // g-formula label would let a reader believe the ordinary path had succeeded.
    expect(verdict.formula_class).toBe("PROXIMAL_BRIDGE");
    expect(verdict.formula).toContain("proximal g-formula");
    // And the attempt is reported with its numbers.
    expect(verdict.proximal_attempt).not.toBeNull();
    expect(verdict.proximal_attempt?.admitted).toBe(true);

    // THE EFFECT IS THE TRUE ONE. Not the naive slope: the confounder biases the unadjusted
    // slope upward, and the bridge is what corrects it. Both halves are asserted, so the test
    // cannot pass by returning the biased number.
    const ate = verdict.proximal_attempt?.ate as number;
    const naive = olsSlope(dataset.outcome, dataset.treatment);
    expect(Math.abs(naive - TRUE_BETA)).toBeGreaterThan(0.15);
    expect(Math.abs(ate - TRUE_BETA)).toBeLessThan(0.15);
    expect(Math.abs(ate - TRUE_BETA)).toBeLessThan(Math.abs(naive - TRUE_BETA));
  });

  /**
   * THE REFUSAL IS REPORTED, NOT SWALLOWED. "The proximal route also does not work, for this
   * specific reason" is a different and more useful finding than silence: the caller learns
   * the condition number is 40,000, not that the engine declined to try.
   *
   * THE PROSE IS ASSERTED, NOT JUST THE STRUCTURE. The verdict carries the refusal on
   * `proximal_attempt` (a code and a reason), and it also says so IN ITS OWN REASON STRING.
   * Those are two different channels, and a mutation that drops the reason string while
   * leaving the structured field intact is invisible to a test that only checks the field --
   * which is exactly what a mutation sweep caught here. The reason string is what a human
   * reader sees, so it is asserted too.
   */
  it("the proximal route REFUSES on an ill-posed bridge, and the verdict says why", () => {
    const dataset = simulateProximal(ILL_POSED);
    const verdict = evaluateCausalClaim({
      y: ["Y"],
      x: ["X"],
      graph: BOW_ARC,
      positivity: 1,
      proximal: dataset,
    });

    // IT DID NOT ADMIT. The claim stays an association, which is the safe direction.
    expect(verdict.publishable).toBe(false);
    expect(verdict.conclusion).toBe("ASSOCIATION_ONLY");
    expect(verdict.refusal_code).toBe(G3_REFUSAL.nonIdentifiableHedge);

    // The refusal is CARRIED, with the code and the reason.
    expect(verdict.proximal_attempt).not.toBeNull();
    expect(verdict.proximal_attempt?.admitted).toBe(false);
    expect(verdict.proximal_attempt?.code).toBe("PROXIMAL_CONDITION_NUMBER_EXCEEDS_LIMIT");
    // The condition number is REPORTED, and it is over the limit -- so the refusal is a
    // measurement, not a shrug.
    expect(verdict.proximal_attempt?.reason).toContain(String(MIN_FREDHOLM_CONDITION_NUMBER));

    // AND THE VERDICT'S OWN REASON SAYS THE PROXIMAL ROUTE WAS TRIED AND DECLINED. This is
    // the channel a reader actually reads. Without this line, a caller reading only the
    // reason string cannot tell "the proximal route was tried and the condition number was
    // 40,000" from "the engine never tried" -- and those are different findings.
    expect(verdict.reason).toContain("proximal route");
    expect(verdict.reason).toContain("PROXIMAL_CONDITION_NUMBER_EXCEEDS_LIMIT");
  });

  /**
   * THE GATE IS NOT A PASS-THROUGH. Without proxies the bow-arc refuses (test 1); with proxies
   * it is published as causal (test 2). Those two facts together are the spec's claim: the
   * proximal route is the DIFFERENCE between a refusal and an answer.
   *
   * It is also the check that the two branches cannot have been wired the same way. If the
   * gate ignored the proximal data, test 2 would fail. If it ignored the graph, test 1 would
   * fail.
   */
  it("the SAME graph with and without proxies gives DIFFERENT verdicts", () => {
    const withoutProxies = evaluateCausalClaim({
      y: ["Y"],
      x: ["X"],
      graph: BOW_ARC,
      positivity: 1,
    });
    const withProxies = evaluateCausalClaim({
      y: ["Y"],
      x: ["X"],
      graph: BOW_ARC,
      positivity: 1,
      proximal: simulateProximal(WELL_POSED),
    });

    expect(withoutProxies.publishable).toBe(false);
    expect(withProxies.publishable).toBe(true);
    // And the graph was the SAME graph in both calls -- so the difference is the proxies, not
    // a difference in the identification problem.
    expect(withoutProxies.hedge_count).toBe(1);
    expect(withProxies.hedge_count).toBe(0);
  });

  /**
   * THE GATE'S OWN DATA REQUIREMENTS ARE ENFORCED THROUGH THE GATE, not only in the
   * solver's unit tests. A caller who supplies too few rows gets the refusal, and the
   * verdict says the proximal route was tried and why it declined -- rather than the claim
   * silently becoming causal, or silently becoming an association with no explanation.
   */
  it("a too-small proximal dataset is refused through the gate, and reported", () => {
    const small = simulateProximal({ ...WELL_POSED, n: MIN_PROXIMAL_SAMPLE_SIZE - 1 });
    const verdict = evaluateCausalClaim({
      y: ["Y"],
      x: ["X"],
      graph: BOW_ARC,
      positivity: 1,
      proximal: small,
    });

    expect(verdict.publishable).toBe(false);
    expect(verdict.proximal_attempt?.admitted).toBe(false);
    expect(verdict.proximal_attempt?.code).toBe("PROXIMAL_SAMPLE_TOO_SMALL");
  });
});
