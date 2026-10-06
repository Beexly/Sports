# Rescue 2026-09-26 (3/6): four research papers wired into the scorecard (PR #916)

- From: hermes → (Garrett / Mimo)
- Created: 2026-09-26
- Status: done
- Repo: `Beexly/Sports` · branch: `hermes/verifier-integrity-metrics`
- PR: [#916](https://github.com/Beexly/Sports/pull/916) (draft, **stacked on #914**)

## Why this exists

Garrett supplied seven research papers and asked what in them could be wired into
the engine, with the instruction not to lose the rescue thread. Four of them had
a clean, honest fit to this repo's measurement doctrine. All four landed.

| Paper | Its point | Where it landed |
|---|---|---|
| [arXiv:2607.00164](https://arxiv.org/abs/2607.00164) *Verifiable Rewards for Calibrated Probabilistic Forecasting* | Brier alone is ambiguous — by the Murphy decomposition two forecasters can be equally calibrated and differ in Brier purely through **resolution** | `calibration.ts`; new `Scorecard` fields + markdown block |
| [arXiv:2604.01491](https://arxiv.org/abs/2604.01491) *Opponent-Adjusted Evaluation of NFL Pass Blocking/Rushing* | 153k interactions from 266 games → uncertainty must come from **end-to-end game resampling**; an interval covering zero is "directional, not decisive" | `clusterBootstrap` + `decide`; `Scorecard.clusterVerdict` |
| [arXiv:2603.03613](https://arxiv.org/abs/2603.03613) *NFL Violations in Permutation-Based Optimization* | Its result "applies to ... procedures based on relabeling, resampling, and permutation tests" | `relabelingNull` — the artifact check for a search-many-keep-the-winners gate |
| [arXiv:2505.23703](https://arxiv.org/abs/2505.23703) *Let's Reason Formally* | Natural language says WHICH claim matters; the formal layer discharges it | `exact.ts` — BigInt-exact Wilson, which **settles the caveat #914 had to tolerate** |

## Test results

**168 passed, 0 failed** — the package's 108 existing tests plus 60 new pins,
run through the same shim as #914. New: 23 calibration, 18 integrity, 15 exact,
4 scorecard-integration.

Every expected value is derived **by hand in a comment**, not copied from a run.

## Three defects the pins caught, and what I did about them

1. **BigInt/Number mixing** in the exact path — fixed, not pinned around.
2. **A runaway guard set below the fractions' real size** — the reduced Wilson
   fractions carry z² (denominator 10³⁰) through n² and every add/multiply, so
   96 bits was far too tight. Raised to a 4096-bit runaway guard, documented as
   such (BigInt never silently rounds, so it is not a precision guard).
3. **The relabeling null's orientation was wrong, and the API changed because of
   it.** A p-value alone lies here: a *uniformly* better candidate wins under
   **every** relabeling, so its p is ~1 while it is maximally robust, whereas a
   lucky arrangement has a low p because relabeling does better. The API now
   reports `survivesRelabeling` as the gate-able verdict and ships the p beside
   it. Also: a mean difference is **invariant** under permuting one arm, so it
   cannot be permutation-tested at all — the null uses the row-wise hit rate,
   which is also the statistic the scorecard already bands.

## The Murphy identity needed care

On a sample, `brier - (reliability - resolution + uncertainty)` is **not** zero in
general. The module derives the exact residual — `SUM_b (n_b/n)·var_p(b)`, the
within-bucket variance of the *stated* probabilities — and `binningResidual`
recomputes it from the buckets so the pins assert two independent routes agree to
1e-12. A single sign error in any of the four terms fails the suite. The residual
measures binning coarseness, not estimator failure, and the docs say so.

## Open for a human

- `calibrationDiagnosis` and `relabelingNull`'s verdict are **judgment calls** and
  are the two things worth a careful review.
- Nothing here changes a keep/kill rule or a threshold, and no gate flips. It
  only makes the scorecard able to say things it previously could not.
- `tsc` is a phantom pass on this host (positive control confirms it), so CI is
  the typecheck gate.
- Merge order: #914 first. `packages/verifier` does not exist on `main` yet.
