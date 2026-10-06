/**
 * LM prior for symbolic regression — tests (arXiv 2304.06333v2).
 *
 * ACCEPTANCE GATE: the prior assigns higher log-probability to
 * corpus-like trees than to alien ones; Laplace log-evidence prefers
 * the better-fitting, simpler model; the combined ranking demotes
 * degenerate equations; the degeneracy guard catches top-5 violations;
 * empty corpus throws.
 */
import { describe, expect, it } from "vitest";
import {
  degeneracyGuard,
  extractPhrases,
  inputCount,
  isDegenerate,
  logEvidence,
  logPrior,
  rankByPrior,
  rankByRmse,
  trainPrior,
  type Candidate,
  type OpNode,
} from "./lm-prior";

// Pythagorean expectation: win% = pf^2 / (pf^2 + pa^2).
const pythag: OpNode = {
  kind: "op",
  op: "div",
  children: [
    { kind: "op", op: "pow", children: [{ kind: "var", name: "pf" }, { kind: "const", value: 2 }] },
    {
      kind: "op",
      op: "add",
      children: [
        { kind: "op", op: "pow", children: [{ kind: "var", name: "pf" }, { kind: "const", value: 2 }] },
        { kind: "op", op: "pow", children: [{ kind: "var", name: "pa" }, { kind: "const", value: 2 }] },
      ],
    },
  ],
};

// Elo update: r + k*(s - 1/(1+10^((ro- r)/400))).
const elo: OpNode = {
  kind: "op",
  op: "add",
  children: [
    { kind: "var", name: "r" },
    {
      kind: "op",
      op: "mul",
      children: [
        { kind: "var", name: "k" },
        {
          kind: "op",
          op: "sub",
          children: [
            { kind: "var", name: "s" },
            {
              kind: "op",
              op: "div",
              children: [
                { kind: "const", value: 1 },
                {
                  kind: "op",
                  op: "add",
                  children: [
                    { kind: "const", value: 1 },
                    {
                      kind: "op",
                      op: "pow",
                      children: [
                        { kind: "const", value: 10 },
                        {
                          kind: "op",
                          op: "div",
                          children: [
                            {
                              kind: "op",
                              op: "sub",
                              children: [
                                { kind: "var", name: "ro" },
                                { kind: "var", name: "r" },
                              ],
                            },
                            { kind: "const", value: 400 },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const degenerate: OpNode = { kind: "const", value: 0.5 };

describe("extractPhrases + trainPrior + logPrior", () => {
  it("prefers corpus-like trees", () => {
    const prior = trainPrior([pythag, elo]);
    expect(extractPhrases(pythag).length).toBeGreaterThan(0);
    const lpPythag = logPrior(pythag, prior);
    // An alien tree (unseen ops) scores worse than a corpus member.
    const alien: OpNode = {
      kind: "op",
      op: "bessel",
      children: [{ kind: "var", name: "x" }],
    };
    expect(logPrior(alien, prior)).toBeLessThan(lpPythag);
    expect(() => trainPrior([])).toThrow();
  });
});

describe("isDegenerate + inputCount", () => {
  it("flags constant-only and single-input trees", () => {
    expect(isDegenerate(degenerate)).toBe(true);
    expect(isDegenerate({ kind: "var", name: "x" })).toBe(true);
    expect(isDegenerate(pythag)).toBe(false);
    expect(inputCount(pythag)).toBe(2); // pf, pa
    expect(inputCount(elo)).toBe(4); // r, k, s, ro
  });
});

describe("logEvidence", () => {
  it("prefers better fit with fewer parameters", () => {
    const mk = (rmse: number, nParams: number): Candidate => ({
      name: `${rmse}-${nParams}`,
      tree: pythag,
      rmse,
      nParams,
      nObs: 1000,
    });
    expect(logEvidence(mk(0.1, 2))).toBeGreaterThan(logEvidence(mk(0.2, 2)));
    expect(logEvidence(mk(0.1, 2))).toBeGreaterThan(logEvidence(mk(0.1, 10)));
    expect(() => logEvidence({ ...mk(0.1, 2), nObs: 0 })).toThrow();
  });
});

describe("rankByPrior + degeneracyGuard", () => {
  it("demotes degenerate equations out of the top 5", () => {
    const prior = trainPrior([pythag, elo]);
    const candidates: Candidate[] = [
      { name: "pythag", tree: pythag, rmse: 0.10, nParams: 1, nObs: 1000 },
      { name: "elo", tree: elo, rmse: 0.12, nParams: 2, nObs: 1000 },
      // Degenerate constant with a suspiciously good in-sample RMSE.
      { name: "const-fit", tree: degenerate, rmse: 0.05, nParams: 1, nObs: 1000 },
    ];
    // Plain RMSE ranking falls for the degenerate fit.
    expect(rankByRmse(candidates)[0]).toBe("const-fit");
    // The prior+evidence ranking should not put it first; the guard
    // must hold on the final ranking.
    const ranked = rankByPrior(candidates, prior);
    expect(ranked[0]?.name).not.toBe("const-fit");
    expect(degeneracyGuard(ranked)).toBe(true);
    // A ranking that admits a degenerate tree in the top 5 fails.
    const bad = [{ name: "d", score: -100, degenerate: true }];
    expect(degeneracyGuard(bad)).toBe(false);
  });
});
