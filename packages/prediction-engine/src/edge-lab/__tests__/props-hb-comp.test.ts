import { describe, expect, it } from "vitest";
import { posteriorRate } from "../props-hb.js";
import {
  COMP_HB_METHOD_TAG,
  betaBinomialProbOverCompletions,
  fitCompletionPrior,
  posteriorCompletion,
  probOverCompletions,
  scoreCompletionsOver,
} from "../props-hb-comp.js";

describe("fitCompletionPrior / posteriorCompletion", () => {
  it("fits a Beta whose mean is the pooled completion rate and skips calendar games", () => {
    const prior = fitCompletionPrior([
      { attempts: 32, completions: 24 },
      { attempts: 28, completions: 14 },
      { attempts: 40, completions: 30 },
      { attempts: 22, completions: 8 },
      { attempts: 35, completions: 26 },
      { attempts: 18, completions: 7 },
    ]);
    expect(prior).not.toBeNull();
    expect(prior!.alpha / (prior!.alpha + prior!.beta)).toBeCloseTo(109 / 175, 8);
    expect(COMP_HB_METHOD_TAG).toBe("props_hb_comp_v1");
  });

  it("rejects 0-attempt rows — they are not a 0% passer", () => {
    expect(() => fitCompletionPrior([{ attempts: 0, completions: 0 }])).toThrow(RangeError);
  });

  it("leaves the prior unchanged at attempts=0", () => {
    const post = posteriorCompletion({ alpha: 8, beta: 4 }, 0, 0);
    expect(post.alpha).toBe(8);
    expect(post.beta).toBe(4);
  });
});

describe("betaBinomialProbOverCompletions", () => {
  it("is 0 when n=0 and line>=0, 1 when line<0", () => {
    const post = { alpha: 12, beta: 8, mean: 0.6 };
    expect(betaBinomialProbOverCompletions(post, 0.5, 0)).toBe(0);
    expect(betaBinomialProbOverCompletions(post, -0.1, 0)).toBe(1);
  });

  it("is 0 when the line is at or above n (cannot complete more than attempts)", () => {
    const post = { alpha: 18, beta: 6, mean: 0.75 };
    expect(betaBinomialProbOverCompletions(post, 19.5, 19)).toBe(0);
  });

  it("rises with n at a fixed line", () => {
    const post = { alpha: 16, beta: 8, mean: 2 / 3 };
    const small = betaBinomialProbOverCompletions(post, 14.5, 20);
    const large = betaBinomialProbOverCompletions(post, 14.5, 35);
    expect(large).toBeGreaterThan(small);
  });
});

describe("probOverCompletions — ZIP hurdle is P(T=0)", () => {
  it("is near 0 when the attempt posterior is concentrated at 0", () => {
    const compPost = posteriorCompletion({ alpha: 20, beta: 10 }, 0, 0);
    const attemptPost = posteriorRate({ alpha: 0.1, beta: 20 }, 0, 10);
    expect(probOverCompletions(compPost, attemptPost, 14.5)).toBeLessThan(0.05);
  });

  it("scoreCompletionsOver uses all attempt games including zeros", () => {
    const compPrior = fitCompletionPrior([
      { attempts: 32, completions: 24 },
      { attempts: 28, completions: 14 },
      { attempts: 40, completions: 30 },
      { attempts: 22, completions: 8 },
    ]);
    expect(compPrior).not.toBeNull();
    const p = scoreCompletionsOver({
      compPrior: compPrior!,
      attemptPrior: { alpha: 40, beta: 2 },
      compHistory: [
        { attempts: 32, completions: 24 },
        { attempts: 28, completions: 14 },
      ],
      attemptGames: 6,
      attemptTotal: 120,
      line: 14.5,
    });
    expect(p).toBeGreaterThan(0.2);
    expect(p).toBeLessThan(1);
  });
});
