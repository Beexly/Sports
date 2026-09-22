/**
 * Tests for ./bayesian-hmm-hothand (arXiv:2303.17863v2, lane=team_ratings).
 *
 * ACCEPTANCE GATE: ADOPT as a live-momentum module if the HMM beats the no-HMM baseline by >=0.005 mean log-loss on
 * held-out games AND the posterior hot-state probability is calibrated (slope of observed vs
 * predicted next-drive TD rate within 0.85-1.15); ADAPT if only the streak-quantification outputs
 * are useful (content feature, no pick use); REJECT if the latent states degenerate as in the
 * paper on NFL data.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./bayesian-hmm-hothand";

describe("Bayesian HMM hot hand (arXiv:2303.17863v2)", () => {
  const h = { pCold: 0.3, pHot: 0.7, aCC: 0.8, aCH: 0.2, aHC: 0.2, aHH: 0.8 };
  it("streaks push the posterior to the matching state (returns P(cold))", () => {
    const post = mod.posteriorStates([1, 1, 1, 1, 1, 1], h)!;
    expect(post[post.length - 1]).toBeLessThan(0.2);
    const cold = mod.posteriorStates([0, 0, 0, 0, 0, 0], h)!;
    expect(cold[cold.length - 1]).toBeGreaterThan(0.8);
  });
  it("bayes factor favors HMM on streaky data", () => {
    const bf = mod.hotHandBayesFactor([1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0], h)!;
    expect(bf).toBeGreaterThan(1);
    expect(mod.hotHandBayesFactor([1, 1, 1, 1], h)).toBeNull();
  });
  it("null on malformed", () => {
    expect(mod.hmmLogLik([], h)).toBeNull();
    expect(mod.hmmLogLik([1], { ...h, aCC: 0.5 })).toBeNull();
    expect(mod.posteriorStates([], h)).toBeNull();
  });
});
