# Grok Bootstrap-CI Transcript — Verification + Kernel Inventory (2026-07-02)

Protocol: VERIFY BY EXECUTION (no labels, no dismissal — the math is recomputed
and the numbers decide). Transcript scope: BCa mechanics, studentized
bootstrap-t, nested/double bootstrap, double-bootstrap calibration, studentized
double BCa hybrid, Edgeworth/Cornish-Fisher theory, skewness/kurtosis/Pareto
coverage impact analyses, R parallelization strategy.

## VERIFIED BY EXECUTION (my own from-scratch reimplementation, Monte-Carlo)

- [VERIFIED-EXECUTED] Studentized pivot t* is asymmetric on right-skewed data:
  my Exp(1) n=30 sample gave t*_L=-2.55, t*_U=+1.78 (transcript: -3.06/+1.67,
  same signature). The inversion (tails reverse) pushes the interval's upper
  edge outward — the exact mechanism claimed.
- [VERIFIED-EXECUTED] Coverage ordering on a skewed mean, Exp(1) n=30,
  3000 sims, nominal 95%: studentized 95.0% > BCa 92.4% > percentile 91.9% >
  basic 90.6%. Studentized best and at nominal. (Transcript's 92.7%/90.0%/88.7%
  from 150 sims is within Monte-Carlo noise of these — 150 sims has ±1.8pp SE.)
- [VERIFIED-EXECUTED] Deterministic test-scale replication (n=25, 400 sims,
  B=400, fully seeded): stud 94.75%, BCa 93.0%, pct 93.0% — pinned as a
  permanent COVERAGE-PROOF test in performance-ci.test.ts (re-verified every CI
  run).
- [VERIFIED-EXECUTED] Jackknife SE of the mean == s/sqrt(n) exactly (pinned in
  test; justified the O(n) fast path that took the hot ROI path from O(B·n²) to
  O(B·n), 84s → 2.2s on the strong-record test).
- [VERIFIED-MATH] BCa transformation formula, z0 and acceleration formulas in
  the transcript match Efron & Tibshirani 1993 and our shipped implementation.
- [VERIFIED-MATH] Cornish-Fisher first-order quantile correction term
  gamma1/(6*sqrt(n))*(z^2-1) matches the standard expansion; the transcript's
  Edgeworth CDF form (p1 skewness term at O(n^-1/2), p2 kurtosis at O(n^-1)) is
  the standard result and correctly explains WHY percentile is first-order and
  BCa/studentized are second-order.

## SHIPPED FROM THIS TRANSCRIPT (commit 6fe54d64, night-shift)

1. studentizedCi / studentizedMeanCi — second-order bootstrap-t, deterministic
   /seeded, SE injectable, receipt carries tLow/tHigh/standardError.
2. meanStandardError — exact O(n) SE fast path.
3. Coverage-proof Monte-Carlo test (the transcript's core claim as a permanent
   computational fact in CI).
4. Public ROI policy DOUBLE-METHOD CORROBORATION: profit claimed only when BOTH
   BCa and studentized 95% lower bounds clear 0. Strictly more conservative.

## UNMINED KERNEL INVENTORY (improve-not-remove; each is a candidate build)

- K1 [BUILDABLE] HEAVY-TAIL WARNING APPLIED TO OUR OWN GATE. The transcript's
  kurtosis/Pareto sections show ALL methods undercover as tails heavy + n small.
  Our ledger returns are bounded below (-1) but unbounded above (+900 winners),
  i.e. right-heavy. MIN_GRADED_DEFAULT=25. OPEN EMPIRICAL QUESTION: at n=25 on
  sports-shaped return mixtures, what is the REALIZED coverage of our exact
  bcaMeanCi/studentizedMeanCi bands? If materially under 95%, the honest moves
  are (a) publish a tail-risk diagnostic next to the band, (b) raise the n gate,
  or (c) widen alpha honestly. This is a potential overclaim in our OWN number.
- K2 [BUILDABLE] COVERAGE SELF-AUDIT HARNESS (double-bootstrap-flavored):
  deterministic TS harness that resamples from the EMPIRICAL ledger shape and
  reports the realized coverage of the published band — "our 95% band covers at
  X% under resampling of our own ledger" is an honesty artifact nobody ships.
  This is the transcript's double-bootstrap calibration idea, repurposed from
  "adjust alpha silently" to "publish the calibration check openly."
- K3 [BUILDABLE, later] Full double-bootstrap calibration (root-finding on
  nominal alpha) — O(B1·B2); feasible deterministically for our small n. Only
  worth shipping if K1's sim shows material undercoverage.
- K4 [PROPOSED] Nested-bootstrap SE for NON-mean statistics (median, quantile,
  Gini, calibration-slope) where jackknife is biased — relevant the day a
  published number is not a mean/proportion. jackknifeStandardError already
  exported; nested SE is a ~30-line addition when needed.
- K5 [PROPOSED] t*-distribution diagnostics on the receipt (symmetry/stability
  check the transcript recommends: "inspect the t* distribution"). tLow/tHigh
  already carried; a skew statistic of t* is cheap.
- K6 [REFERENCE] Studentized-double-BCa hybrid + Edgeworth theory — research
  ceiling; the transcript itself concedes gains are small vs cost except tiny-n
  heavy-tail. Documented here; not a build until K1 says otherwise.
- K7 [REFERENCE] Parallelization doctrine (parallel outer / sequential inner;
  oversubscription warning) — R-specific code but the PATTERN applies to any
  future heavy sim harness (workers on outer loop only).
- K8 [BUILDABLE] Method-selection guidance table (skew/kurtosis/n → method)
  as module docs so future callers pick correctly.

## Where verification ran out

- The transcript's specific simulated coverage TABLES for gamma/t/Pareto shapes
  (e.g. "Pareto α=3.5: BCa 0.80-0.84") were not re-executed here — the QUALITATIVE
  claim (coverage degrades with tail weight, hybrids degrade slowest) is
  consistent with theory and with my executed Exp(1) results, but the exact
  numbers per distribution remain unreplicated until K1's sim runs.
- R-code correctness (future/boot packages) not executed (no R runtime here);
  the statistical structure it encodes matches the executed math above.
