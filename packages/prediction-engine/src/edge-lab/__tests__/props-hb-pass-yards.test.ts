import { describe, expect, it } from "vitest";
import { posteriorRate, type GammaPosterior, type GammaPrior } from "../props-hb.js";
import {
  PASS_YARDS_HB_METHOD_TAG,
  fitPassYardsPerAttemptPrior,
  posteriorPassYardsPerAttempt,
  probOverPassYards,
  probOverPassYardsGivenAttempts,
} from "../props-hb-pass-yards.js";

// Realistic QB per-game samples: (attempts, yards).
const QB_SAMPLES: { attempts: number; yards: number }[] = [
  { attempts: 28, yards: 240 },
  { attempts: 32, yards: 298 },
  { attempts: 24, yards: 187 },
  { attempts: 38, yards: 365 },
  { attempts: 18, yards: 152 },
  { attempts: 42, yards: 410 },
  { attempts: 22, yards: 210 },
  { attempts: 30, yards: 275 },
  { attempts: 26, yards: 230 },
  { attempts: 35, yards: 312 },
];

describe("PASS_YARDS_HB_METHOD_TAG", () => {
  it("is the expected method tag", () => {
    expect(PASS_YARDS_HB_METHOD_TAG).toBe("props_hb_pass_yards_v1");
  });
});

describe("fitPassYardsPerAttemptPrior", () => {
  it("fits yards-per-attempt and refuses zero-attempt rows as talent", () => {
    const prior = fitPassYardsPerAttemptPrior(QB_SAMPLES);
    expect(prior).not.toBeNull();
    const mean = prior!.alpha / prior!.beta;
    // yards-per-attempt for a real QB is typically 6-9.
    expect(mean).toBeGreaterThan(5);
    expect(mean).toBeLessThan(12);
  });

  it("rejects samples with attempts=0 — that is the ZIP hurdle, not a rate", () => {
    expect(() => fitPassYardsPerAttemptPrior([{ attempts: 0, yards: 0 }])).toThrow(RangeError);
  });

  it("rejects negative yards", () => {
    expect(() => fitPassYardsPerAttemptPrior([{ attempts: 10, yards: -5 }])).toThrow(RangeError);
  });

  it("returns null for empty input", () => {
    expect(fitPassYardsPerAttemptPrior([])).toBeNull();
  });

  it("throws on non-finite values", () => {
    expect(() => fitPassYardsPerAttemptPrior([{ attempts: NaN, yards: 200 }])).toThrow(RangeError);
    expect(() => fitPassYardsPerAttemptPrior([{ attempts: 10, yards: Infinity }])).toThrow(RangeError);
  });
});

describe("posteriorPassYardsPerAttempt", () => {
  it("updates Gamma posterior with new (yards, attempts) data", () => {
    const prior = fitGroupPriorCompatible();
    const post = posteriorPassYardsPerAttempt(prior, QB_SAMPLES[0]!);
    // Posterior mean should be between prior mean and player's observed rate.
    const priorMean = prior.alpha / prior.beta;
    const observedRate = QB_SAMPLES[0]!.yards / QB_SAMPLES[0]!.attempts;
    expect(post.mean).toBeGreaterThan(Math.min(priorMean, observedRate));
    expect(post.mean).toBeLessThan(Math.max(priorMean, observedRate));
  });

  it("rejects zero-attempt input", () => {
    const prior = fitGroupPriorCompatible();
    expect(() => posteriorPassYardsPerAttempt(prior, { attempts: 0, yards: 0 })).toThrow(RangeError);
  });
});

describe("probOverPassYardsGivenAttempts", () => {
  it("is 0 when attempts=0 and line>=0 — ZIP hurdle (no dropbacks, no yards)", () => {
    const prior = fitPassYardsPerAttemptPrior(QB_SAMPLES)!;
    const post = posteriorPassYardsPerAttempt(prior, QB_SAMPLES[0]!);
    expect(probOverPassYardsGivenAttempts(post, 0, 249.5)).toBe(0);
    expect(probOverPassYardsGivenAttempts(post, 0, 0)).toBe(0);
  });

  it("returns 1 when attempts=0 and line<0 (any non-negative count > negative line)", () => {
    const prior = fitPassYardsPerAttemptPrior(QB_SAMPLES)!;
    const post = posteriorPassYardsPerAttempt(prior, QB_SAMPLES[0]!);
    expect(probOverPassYardsGivenAttempts(post, 0, -1)).toBe(1);
  });

  it("rises with attempts at a fixed line", () => {
    const prior = fitPassYardsPerAttemptPrior(QB_SAMPLES)!;
    const post = posteriorPassYardsPerAttempt(prior, QB_SAMPLES[0]!);
    const few = probOverPassYardsGivenAttempts(post, 15, 249.5);
    const many = probOverPassYardsGivenAttempts(post, 45, 249.5);
    expect(many).toBeGreaterThan(few);
  });

  it("approaches 0 as line → Infinity and 1 as line → -Infinity", () => {
    const prior = fitPassYardsPerAttemptPrior(QB_SAMPLES)!;
    const post = posteriorPassYardsPerAttempt(prior, QB_SAMPLES[0]!);
    expect(probOverPassYardsGivenAttempts(post, 30, 10000)).toBeLessThan(1e-6);
    expect(probOverPassYardsGivenAttempts(post, 30, -100)).toBe(1);
  });

  it("throws on non-finite or negative attempts", () => {
    const prior = fitPassYardsPerAttemptPrior(QB_SAMPLES)!;
    const post = posteriorPassYardsPerAttempt(prior, QB_SAMPLES[0]!);
    expect(() => probOverPassYardsGivenAttempts(post, -1, 250)).toThrow(RangeError);
    expect(() => probOverPassYardsGivenAttempts(post, NaN, 250)).toThrow(RangeError);
  });
});

describe("probOverPassYards — mix over T", () => {
  it("near 0 when next-game attempts are concentrated near 0 (ZIP-heavy)", () => {
    const prior = fitPassYardsPerAttemptPrior(QB_SAMPLES)!;
    const yardPost = posteriorPassYardsPerAttempt(prior, QB_SAMPLES[0]!);
    // Weak attempt posterior: alpha small, beta large → mean ~ 0.5/g, mass at k=0.
    const attPost = posteriorRate({ alpha: 0.5, beta: 1 }, 0, 10);
    expect(probOverPassYards(yardPost, attPost, 249.5)).toBeLessThan(0.1);
  });

  it("exceeds the k=0 slice once attempts have mass", () => {
    const prior = fitPassYardsPerAttemptPrior(QB_SAMPLES)!;
    const yardPost = posteriorPassYardsPerAttempt(prior, QB_SAMPLES[0]!);
    // Strong attempt posterior: ~ 30 attempts/game over 10 games.
    const attPost = posteriorRate({ alpha: 120, beta: 4 }, 300, 10);
    const mixed = probOverPassYards(yardPost, attPost, 249.5);
    expect(mixed).toBeGreaterThan(0.1);
    expect(mixed).toBeLessThan(1);
  });

  it("is 1 for a negative line regardless of attempt distribution", () => {
    const prior = fitPassYardsPerAttemptPrior(QB_SAMPLES)!;
    const yardPost = posteriorPassYardsPerAttempt(prior, QB_SAMPLES[0]!);
    const attPost = posteriorRate({ alpha: 60, beta: 10 }, 60, 10);
    expect(probOverPassYards(yardPost, attPost, -1)).toBe(1);
  });

  it("throws on non-finite line", () => {
    const prior = fitPassYardsPerAttemptPrior(QB_SAMPLES)!;
    const yardPost = posteriorPassYardsPerAttempt(prior, QB_SAMPLES[0]!);
    const attPost = posteriorRate({ alpha: 60, beta: 10 }, 60, 10);
    expect(() => probOverPassYards(yardPost, attPost, NaN)).toThrow(RangeError);
  });
});

/** Build a GammaPrior from the sample data using the same fitGroupPrior used
 *  internally, so tests don't hardcode magic numbers. */
function fitGroupPriorCompatible(): GammaPrior {
  const prior = fitPassYardsPerAttemptPrior(QB_SAMPLES);
  if (!prior) throw new Error("prior should not be null for non-empty valid samples");
  return prior;
}
