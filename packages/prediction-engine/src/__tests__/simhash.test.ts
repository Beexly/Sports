import { describe, it, expect } from "vitest";
import {
  buildSimhashModel,
  signature,
  hammingDistance,
  estimatedCosine,
  multiProbeSignatures,
  buildSimhashIndex,
  querySimhashIndex,
} from "../simhash.js";

// Deterministic data generators (seeded) — no Math.random anywhere.
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
function gaussian(rand: () => number): number {
  let u = rand();
  if (u <= 0) u = Number.MIN_VALUE;
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}
function gaussVec(dim: number, rand: () => number): number[] {
  return Array.from({ length: dim }, () => gaussian(rand));
}
function dot(a: readonly number[], b: readonly number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i]! * b[i]!;
  return s;
}
function norm(a: readonly number[]): number {
  return Math.sqrt(dot(a, a));
}
function trueCosine(a: readonly number[], b: readonly number[]): number {
  return dot(a, b) / (norm(a) * norm(b));
}
function normalize(a: readonly number[]): number[] {
  const n = norm(a);
  return a.map((x) => x / n);
}
/**
 * A pair of unit vectors at EXACT angle theta: u random on the sphere, v a
 * random direction Gram-Schmidt-orthogonalized against u, pair = (u,
 * cos(theta)·u + sin(theta)·v). Rotating in a seeded random 2D subspace keeps
 * the pair's orientation uniform, which the collision law requires.
 */
function pairAtAngle(dim: number, theta: number, rand: () => number): [number[], number[]] {
  const u = normalize(gaussVec(dim, rand));
  const w = gaussVec(dim, rand);
  const proj = dot(w, u);
  const v = normalize(w.map((x, i) => x - proj * u[i]!));
  const b = u.map((x, i) => Math.cos(theta) * x + Math.sin(theta) * v[i]!);
  return [u, b];
}

describe("buildSimhashModel", () => {
  it("returns null on degenerate dims/bits/seed", () => {
    expect(buildSimhashModel(0, 64, 1)).toBeNull();
    expect(buildSimhashModel(-3, 64, 1)).toBeNull();
    expect(buildSimhashModel(2.5, 64, 1)).toBeNull();
    expect(buildSimhashModel(16, 0, 1)).toBeNull();
    expect(buildSimhashModel(16, 65, 1)).toBeNull(); // bits cap = 64
    expect(buildSimhashModel(16, 32.5, 1)).toBeNull();
    expect(buildSimhashModel(16, 32, Number.NaN)).toBeNull();
  });

  it("builds bits × dim hyperplanes", () => {
    const model = buildSimhashModel(8, 12, 42)!;
    expect(model.hyperplanes.length).toBe(12);
    expect(model.hyperplanes[0]!.length).toBe(8);
    expect(model.hyperplanes.flat().every(Number.isFinite)).toBe(true);
  });
});

describe("collision-probability law: P(bit differs) = theta/pi", () => {
  // MC design: 400 pairs at exact angle theta, one 64-bit model. Each pair's
  // differing-bit fraction has variance p(1-p)/64; pair directions are i.i.d.
  // uniform, so the 400 fractions are i.i.d. and the mean's SE is
  // sqrt(p(1-p)/64/400): at p=0.25, SE = sqrt(0.1875/25600) ≈ 0.0027; at
  // p=0.5, SE ≈ 0.0031. Margin 0.015 ≈ 5·SE.
  const model = buildSimhashModel(32, 64, 101)!;

  function meanDifferingFraction(theta: number, seed: number): number {
    const rand = mulberry32(seed);
    let total = 0;
    const pairs = 400;
    for (let k = 0; k < pairs; k++) {
      const [a, b] = pairAtAngle(32, theta, rand);
      const h = hammingDistance(signature(model, a)!, signature(model, b)!)!;
      total += h / 64;
    }
    return total / pairs;
  }

  it("theta = pi/4 → mean hamming/bits ≈ 0.25", () => {
    // OBSERVED (dim=32, bits=64, model seed 101, pair seed 202, 400 pairs):
    // mean differing fraction = 0.2508203125 vs theory 0.25 —
    // |diff| = 0.00082, well inside the 0.015 (≈5·SE) margin.
    const observed = meanDifferingFraction(Math.PI / 4, 202);
    expect(Math.abs(observed - 0.25)).toBeLessThan(0.015);
  });

  it("theta = pi/2 → mean hamming/bits ≈ 0.5", () => {
    // OBSERVED (same model, pair seed 303, 400 pairs): mean differing fraction
    // = 0.5022265625 vs theory 0.5 — |diff| = 0.00223 < 0.015 (≈5·SE).
    const observed = meanDifferingFraction(Math.PI / 2, 303);
    expect(Math.abs(observed - 0.5)).toBeLessThan(0.015);
  });
});

describe("estimatedCosine", () => {
  it("MAE vs true cosine is small at bits=64 (the cap)", () => {
    // MC design: 300 i.i.d. Gaussian pairs in R^32 (angles concentrate near
    // pi/2 in high dim but the estimator is exercised across the sampled
    // range). Per-pair error scale: d/dp cos(pi·p) = -pi·sin(pi·p), so with
    // SD(p̂)=sqrt(p(1-p)/64) ≈ 0.06 near p=0.5 the per-pair error SD is
    // ≈ pi·0.06 ≈ 0.196 and the expected MAE ≈ 0.8·SD ≈ 0.16 worst-case.
    const model = buildSimhashModel(32, 64, 101)!;
    const rand = mulberry32(404);
    let sumAbs = 0;
    let maxAbs = 0;
    const pairs = 300;
    for (let k = 0; k < pairs; k++) {
      const a = gaussVec(32, rand);
      const b = gaussVec(32, rand);
      const est = estimatedCosine(model, signature(model, a)!, signature(model, b)!)!;
      const err = Math.abs(est - trueCosine(a, b));
      sumAbs += err;
      maxAbs = Math.max(maxAbs, err);
    }
    // OBSERVED (dim=32, bits=64, model seed 101, pair seed 404, 300 pairs):
    // MAE = 0.157089, max abs error = 0.636125 — right at the ≈0.16 prediction,
    // because random Gaussian pairs concentrate near p = 0.5 where the
    // back-transform derivative (pi·sin(pi·p)) is largest. Bound 0.18 =
    // observed MAE + headroom; the lower bound documents that this IS an
    // estimate, not exact similarity.
    const mae = sumAbs / pairs;
    expect(mae).toBeLessThan(0.18);
    expect(mae).toBeGreaterThan(0.05); // sanity: it IS an estimate, not exact
    expect(maxAbs).toBeLessThan(1); // observed 0.636125
  });

  it("is exactly 1 at hamming 0 and -1 at hamming = bits", () => {
    const model = buildSimhashModel(4, 8, 7)!;
    const s = signature(model, [1, 2, 3, 4])!;
    expect(estimatedCosine(model, s, s)).toBe(1);
    const flipped = { ...s, sig: s.sig ^ ((1n << 8n) - 1n) };
    expect(estimatedCosine(model, s, flipped)).toBe(-1);
  });

  it("returns null on width mismatch", () => {
    const m64 = buildSimhashModel(4, 64, 7)!;
    const m8 = buildSimhashModel(4, 8, 7)!;
    const s64 = signature(m64, [1, 2, 3, 4])!;
    const s8 = signature(m8, [1, 2, 3, 4])!;
    expect(estimatedCosine(m64, s64, s8)).toBeNull();
    expect(hammingDistance(s64, s8)).toBeNull();
  });
});

describe("ranking fidelity (estimate vs true cosine)", () => {
  it("top-1 by estimatedCosine agrees with top-1 by true cosine on most comp queries", () => {
    // MC design: 60-vector Gaussian corpus in R^24, bits=64; 40 queries built
    // as corpus[k] + 0.5·noise — the comp-retrieval regime this module exists
    // for (a genuinely close comp exists; with pure random queries all corpus
    // cosines crowd within the estimator's ±0.06 hamming SE and top-1 becomes
    // a coin toss among near-ties, which retrieval + true-cosine re-rank
    // handles downstream). Fully seeded, so the observed rate is an exact
    // replay; the pinned value IS the assertion.
    // OBSERVED (corpus seed 505, query seed 606, model seed 101, noise 0.5):
    // agreement = 39/40 = 0.975. Binomial SE at that rate =
    // sqrt(0.975·0.025/40) ≈ 0.0247, so the 0.85 floor below sits ≈5·SE under
    // the observation — an honest "most queries" claim, not a knife-edge.
    const model = buildSimhashModel(24, 64, 101)!;
    const randC = mulberry32(505);
    const corpus = Array.from({ length: 60 }, () => gaussVec(24, randC));
    const sigs = corpus.map((v) => signature(model, v)!);
    const randQ = mulberry32(606);
    let agree = 0;
    const queries = 40;
    for (let q = 0; q < queries; q++) {
      const base = corpus[q]!;
      const query = base.map((x) => x + 0.5 * gaussian(randQ));
      const qSig = signature(model, query)!;
      let bestTrue = 0;
      let bestEst = 0;
      for (let i = 1; i < corpus.length; i++) {
        if (trueCosine(query, corpus[i]!) > trueCosine(query, corpus[bestTrue]!)) bestTrue = i;
        if (estimatedCosine(model, qSig, sigs[i]!)! > estimatedCosine(model, qSig, sigs[bestEst]!)!) {
          bestEst = i;
        }
      }
      if (bestTrue === bestEst) agree += 1;
    }
    expect(agree / queries).toBe(0.975); // pinned: deterministic given seeds
    expect(agree / queries).toBeGreaterThanOrEqual(0.85);
  });
});

describe("multiProbeSignatures", () => {
  it("orders probes by inverse projection magnitude: least-confident single flips first, then pairs", () => {
    const sig = { bits: 4, sig: 0b1010n, magnitudes: [0.9, 0.1, 0.5, 0.3] } as const;
    const probes = multiProbeSignatures(sig, 10)!;
    // Singles ascending magnitude: bit1 (0.1), bit3 (0.3), bit2 (0.5), bit0 (0.9).
    expect(probes[0]).toBe(0b1010n ^ 0b0010n);
    expect(probes[1]).toBe(0b1010n ^ 0b1000n);
    expect(probes[2]).toBe(0b1010n ^ 0b0100n);
    expect(probes[3]).toBe(0b1010n ^ 0b0001n);
    // Pairs ascending combined magnitude: (1,3)=0.4, (1,2)=0.6, (2,3)=0.8, ...
    expect(probes[4]).toBe(0b1010n ^ 0b0010n ^ 0b1000n);
    expect(probes[5]).toBe(0b1010n ^ 0b0010n ^ 0b0100n);
    expect(probes[6]).toBe(0b1010n ^ 0b0100n ^ 0b1000n);
    expect(probes.length).toBe(10); // 4 singles + 6 pairs
  });

  it("returns [] at maxProbes=0 and null on invalid input", () => {
    const sig = { bits: 2, sig: 0n, magnitudes: [0.1, 0.2] } as const;
    expect(multiProbeSignatures(sig, 0)).toEqual([]);
    expect(multiProbeSignatures(sig, -1)).toBeNull();
    expect(multiProbeSignatures(sig, 2.5)).toBeNull();
    expect(multiProbeSignatures({ bits: 3, sig: 0n, magnitudes: [0.1] }, 4)).toBeNull();
  });

  it("truncates to maxProbes", () => {
    const sig = { bits: 8, sig: 0n, magnitudes: [1, 2, 3, 4, 5, 6, 7, 8] } as const;
    expect(multiProbeSignatures(sig, 3)!.length).toBe(3);
  });
});

describe("multi-probe recall on a seeded corpus", () => {
  it("probes=8 recall of true top-5 strictly exceeds probes=0 recall", () => {
    // MC design: 400-vector Gaussian corpus in R^16, bits=12 (4096 buckets, so
    // buckets actually collide), 40 queries = corpus[7k] + 0.35·noise, so each
    // query has genuinely close neighbors. recall@candidates = |candidates ∩
    // true-top-5-by-cosine| / 5, averaged over queries. Fully seeded — both
    // numbers are exact replays, pinned below; the assertion demands strict
    // improvement, which is the entire point of multi-probe.
    const dim = 16;
    const model = buildSimhashModel(dim, 12, 909)!;
    const randC = mulberry32(707);
    const corpus = Array.from({ length: 400 }, () => gaussVec(dim, randC));
    const index = buildSimhashIndex(model, corpus)!;
    const randN = mulberry32(808);
    const queries: number[][] = [];
    for (let k = 0; k < 40; k++) {
      const base = corpus[7 * k]!;
      queries.push(base.map((x) => x + 0.35 * gaussian(randN)));
    }
    function recallAt(probes: number): number {
      let hits = 0; // integer count out of 40 queries × 5 neighbors = 200
      for (const query of queries) {
        const ranked = corpus
          .map((v, i) => ({ i, cos: trueCosine(query, v) }))
          .sort((a, b) => b.cos - a.cos)
          .slice(0, 5)
          .map((r) => r.i);
        const candidates = new Set(querySimhashIndex(index, query, { probes })!);
        hits += ranked.filter((i) => candidates.has(i)).length;
      }
      return hits / (queries.length * 5);
    }
    const recall0 = recallAt(0);
    const recall8 = recallAt(8);
    // OBSERVED (this exact seeded replay): recall0 = 16/200 = 0.08,
    // recall8 = 35/200 = 0.175 — probes=8 more than doubles recall from the
    // same single index, which is the entire point of multi-probe. Both are
    // deterministic replays, so pinned exactly (no MC margin needed); the
    // strict-inequality assertion is the load-bearing claim.
    expect(recall0).toBe(0.08);
    expect(recall8).toBe(0.175);
    expect(recall8).toBeGreaterThan(recall0); // strict improvement
  });
});

describe("determinism", () => {
  it("same seed → identical hyperplanes, signatures, and buckets", () => {
    const a = buildSimhashModel(12, 24, 4242)!;
    const b = buildSimhashModel(12, 24, 4242)!;
    expect(JSON.stringify(a.hyperplanes)).toBe(JSON.stringify(b.hyperplanes));
    const rand = mulberry32(11);
    const vecs = Array.from({ length: 25 }, () => gaussVec(12, rand));
    for (const v of vecs) {
      expect(signature(a, v)!.sig).toBe(signature(b, v)!.sig);
    }
    const ia = buildSimhashIndex(a, vecs)!;
    const ib = buildSimhashIndex(b, vecs)!;
    expect([...ia.buckets.keys()]).toEqual([...ib.buckets.keys()]);
  });

  it("different seed → different signatures", () => {
    const a = buildSimhashModel(12, 24, 4242)!;
    const b = buildSimhashModel(12, 24, 4243)!;
    const rand = mulberry32(11);
    const v = gaussVec(12, rand);
    expect(signature(a, v)!.sig).not.toBe(signature(b, v)!.sig);
  });
});

describe("degenerate refusals", () => {
  const model = buildSimhashModel(3, 16, 5)!;

  it("signature refuses zero vector, NaN entries, and dim mismatch", () => {
    expect(signature(model, [0, 0, 0])).toBeNull();
    expect(signature(model, [1, Number.NaN, 2])).toBeNull();
    expect(signature(model, [1, Number.POSITIVE_INFINITY, 2])).toBeNull();
    expect(signature(model, [1, 2])).toBeNull();
    expect(signature(model, [1, 2, 3, 4])).toBeNull();
  });

  it("buildSimhashIndex refuses a corpus containing any bad vector", () => {
    expect(buildSimhashIndex(model, [[1, 2, 3], [0, 0, 0]])).toBeNull();
    expect(buildSimhashIndex(model, [[1, 2, 3], [1, Number.NaN, 3]])).toBeNull();
  });

  it("empty corpus → valid empty index; queries return []", () => {
    const index = buildSimhashIndex(model, [])!;
    expect(index).not.toBeNull();
    expect(index.size).toBe(0);
    expect(querySimhashIndex(index, [1, 2, 3], { probes: 4 })).toEqual([]);
  });

  it("querySimhashIndex refuses bad query vectors and bad probes", () => {
    const index = buildSimhashIndex(model, [[1, 2, 3]])!;
    expect(querySimhashIndex(index, [0, 0, 0])).toBeNull();
    expect(querySimhashIndex(index, [1, 2], { probes: 2 })).toBeNull();
    expect(querySimhashIndex(index, [1, 2, 3], { probes: -1 })).toBeNull();
  });

  it("query returns real matches (self only when present in data)", () => {
    const corpus = [
      [1, 0, 0],
      [0, 1, 0],
      [1, 0.01, 0],
    ];
    const index = buildSimhashIndex(model, corpus)!;
    const hits = querySimhashIndex(index, [1, 0, 0])!;
    expect(hits).toContain(0); // identical vector IS in the data → allowed
    for (const h of hits) expect(h).toBeGreaterThanOrEqual(0);
    expect(hits.length).toBeLessThanOrEqual(3);
  });
});

describe("simhash — self-audit: overflow returns null, not a garbage signature", () => {
  it("rejects a finite vector whose normSq overflows to Infinity", () => {
    const m = buildSimhashModel(2, 8, 3)!;
    // 1e200 is finite but 1e200^2 = 1e400 = Infinity -> magnitudes would be NaN.
    expect(signature(m, [1e200, 1e200])).toBeNull();
    // a normal vector still works
    expect(signature(m, [1, 2])).not.toBeNull();
  });
});
