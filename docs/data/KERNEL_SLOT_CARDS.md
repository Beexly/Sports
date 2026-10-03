# Kernel Slot Cards — free-fleet work orders (Wave K)

**Data class: PUBLIC** (textbook statistics; nothing proprietary). Safe for any free
model, stealth included, per `docs/ops/FREE_WINDOW_BLITZ.md` §3.

**The frozen contract** lives at
`packages/prediction-engine/src/edge-lab/kernel/contract.ts` (branch
`claude/grok-stats-analysis-i8muyp`, PR #554) with shared numerics in
`kernel/numeric.ts` (lgamma, logBeta, logChoose, regularizedGammaP, erf, normalCdf,
normalQuantile, boxMuller, digamma — USE these, never re-derive) and the shared
distribution test standard in `kernel/conformance.ts`. **Implementers add files; they
never edit those three.**

**Per card:** create `kernel/slots/<key>.ts` + `kernel/__tests__/<key>.test.ts`.
Exports must carry the EXACT contract type annotations. Imports use ESM `.js`
extensions (`"../contract.js"`, `"../numeric.js"`; tests import `"../slots/<key>.js"`).
Strict TS, `noUncheckedIndexedAccess` is on, no `any`, **no `Math.random` anywhere**
(injected `Rng` only; tests use `makeRng`), no I/O, fail closed with `KernelError`.

**Gate (deterministic — a model's opinion is not a gate):**
```
cd packages/prediction-engine && npx vitest run src/edge-lab/kernel/__tests__/<key>.test.ts && npx tsc --noEmit
```
Every distribution card's tests MUST call `assertDistributionConformance`.

**Cross-verify (different model family than the author):** run the gate, check
contract-type fidelity, then work the card's ATTACK list — each attack checked by a
computation, not by reading. A test that recomputes the implementation's own formula
and compares is vacuous — reject it; known values must come from independent
derivations.

---

## K1 · crps
**Exports:** `crpsDiscrete: CrpsDiscreteFn`, `crpsEmpirical: CrpsEmpiricalFn`
**Spec:** discrete: Σ (F(k) − 1{k≥y})² over support truncated at tail mass < 1e-12
(cap 100000; include observed in the range). empirical: mean|Xi − y| − ½·E|Xi − Xj|
with the O(n log n) sorted identity — sorted x(1..n): Σ_{i<j}(x(j)−x(i)) =
Σ_i (2i−n−1)·x(i); never the O(n²) loop; never mutate input.
**Attacks:** truncation of unbounded supports; observed outside range ignored;
sorted-identity off-by-one (brute-force cross-check on small ensemble); input
mutated by sort; point-mass ensemble at y ⇒ CRPS 0; deterministic dist at its atom ⇒ 0.

## K2 · pit
**Exports:** `pitDiscrete: PitDiscreteFn`, `pitHistogram: PitHistogramFn`
**Spec:** u = F(y−1) + v·pmf(y), v = rng(); F(min−1) = 0 (never call cdf below
support). Histogram: bins ≥ 2 (default 10), u = 1 in last bin; chi-square GOF,
df = bins − 1, p = 1 − regularizedGammaP(df/2, χ²/2).
**Attacks:** non-randomized PIT (tests MUST simulate ~5000 outcomes from a discrete
dist with makeRng, assert randomized-PIT uniformity p > 0.01 AND that the
non-randomized variant fails it); y = support.min edge; u = 1.0 bin index overflow;
df = bins not bins−1.

## K3 · brier-murphy
**Exports:** `brierMurphy: BrierMurphyFn`
**Spec:** binned Murphy decomposition (bins ≥ 2, default 10, p = 1 in last bin):
reliability = (1/N)Σ n_b(f_b − o_b)²; resolution = (1/N)Σ n_b(o_b − o)²;
uncertainty = o(1−o). Identity rel − res + unc equals the Brier score with each
forecast replaced by its bin-mean — assert exactly (1e-12). Headline `brier` =
true unbinned mean (p − y)². Skip empty bins.
**Attacks:** claiming the identity for the UNBINNED Brier (false — within-bin
variance); empty-bin division; p = 1 boundary; uncertainty from outcome rate not
forecast rate.

## K4 · calibration-fit
**Exports:** `calibrationFit: CalibrationFitFn`
**Spec:** Cox recalibration: clamp p to [1e-12, 1−1e-12], x = logit(p), fit
y ~ sigmoid(a + b·x) by IRLS (budget 100, tol 1e-10, weight floor 1e-10, closed-form
2×2 solve). NO_CONVERGENCE past budget (perfect separation may trigger — document).
**Attacks:** slope/intercept flipped (calibrated sim data ⇒ slope ∈ [0.9, 1.1],
intercept ≈ 0); overconfident forecasts ⇒ slope < 1; all-identical p ⇒ KernelError,
never NaN; clamp documented.

## K5 · bh-fdr
**Exports:** `benjaminiHochberg: BenjaminiHochbergFn`
**Spec:** step-up; q_i = p_(i)·m/rank; cumulative min from LARGEST rank down; cap 1;
map back to INPUT order. rejected: largest k with p_(k) ≤ αk/m, reject ranks ≤ k;
threshold = p_(k) or 0.
**Attacks:** q-values in sorted order instead of input order (shuffled-input test);
cumulative min direction; tie at threshold must reject; property: rejected[i] ⟺
qValues[i] ≤ α on random inputs; m = 1; all-equal p-values.

## K6 · ess
**Exports:** `effectiveSampleSize: EffectiveSampleSizeFn`
**Spec:** one-way ANOVA ICC: n0 = (N − Σm_j²/N)/(J−1); ρ = (MSB − MSW)/(MSB +
(n0−1)MSW) clamped [0,1]; ess = N/(1 + (m̄−1)ρ); designEffect = N/ess. J = 1 ⇒
document (ρ := 1, ess = 1 cluster-equivalent). All singletons ⇒ ess = N. All values
identical ⇒ ρ := 0, ess = N (document).
**Attacks:** ess > N or ≤ 0 ever (property over random clusterings); deff < 1;
singleton case exactly N; constant-within/differing-across clusters ⇒ ess ≈ J;
clamp actually applied.

## K7 · block-bootstrap
**Exports:** `blockBootstrap: BlockBootstrapFn`
**Spec:** validate 1 ≤ blockLength ≤ n, resamples ≥ 1, level ∈ (0,1). ceil(n/L)
non-wrapping block starts uniform on [0, n−L]; concatenate; truncate to n;
percentile CI by nearest rank ceil(q·R)−1 clamped; point = statistic(original);
deterministic under a fixed rng.
**Attacks:** wrapping starts; resample length ≠ n; mutation of original;
determinism with makeRng(7); blockLength = n ⇒ every resample IS the original
(deterministic statistic ⇒ interval collapses to the point); verify each test
claim is actually true, not aspirational.

## K8 · neg-binomial
**Exports:** `fitNegBinomial: FitNegBinomialFn`, `makeNegBinomial: MakeNegBinomialFn`
**Spec:** (r, p) real-valued r: log pmf = lgamma(k+r) − lgamma(r) − lgamma(k+1) +
r·ln p + k·ln(1−p); mean r(1−p)/p; var r(1−p)/p². Moments fit: v ≤ m ⇒ near-Poisson
(r = 1e6, documented, no throw); else r = m²/(v−m), p = r/(r+m). Support [0, ∞);
quantile by cdf walk (cap 1e6, NO_CONVERGENCE); sample by inversion on one uniform.
Conformance mandatory.
**Attacks:** (r,p) convention (mean() == r(1−p)/p on known params); round-trip fit
from 20000 draws recovers r, p within 15%; non-integer r = 2.5 works (lgamma form);
variance denominator n−1; degeneracy silent as documented.

## K9 · beta-binomial
**Exports:** `fitBetaBinomial: FitBetaBinomialFn`, `makeBetaBinomial: MakeBetaBinomialFn`
**Spec:** log pmf = logChoose(n,k) + logBeta(k+α, n−k+β) − logBeta(α,β); mean nα/(α+β);
var nαβ(α+β+n)/((α+β)²(α+β+1)). Fit returns Omit<Params,"n"> by trial-weighted
moments (document estimator + small-sample bias); underdispersion ⇒ α+β = 1e6 at
mean μ; floors 1e-6. Validate s_i ≤ t_i. Conformance mandatory.
**Attacks:** fit returning an `n` field; success > trials accepted; overflow at
n = 300 (pmf finite, sums to 1); moment formulas on known params; round-trip from
5000 simulated rows (α=3, β=7, trials 3..40) within 25%.

## K10 · zip-hurdle
**Exports:** `fitZip: FitZipFn`, `makeZip: MakeZipFn`
**Spec:** pmf(0) = zi + (1−zi)·base.pmf(0); pmf(k>0) = (1−zi)·base.pmf(k);
mean (1−zi)·mB; var (1−zi)(vB + zi·mB²). Fit: NB on full sample (reuse
./neg-binomial.js); z_obs > NB-implied p0 ⇒ zi = (z_obs − p0)/(1 − p0) + refit base
on the excess-zero-removed moments (document bias); else zi = 0. Conformance
mandatory.
**Attacks:** pmf(0) double-count; variance vs 200000-draw empirical within 2%;
no-excess-zeros data ⇒ zi ≈ 0; 50% structural zeros + NB(5, 0.5) ⇒ zi within 0.1.

## K11 · dirichlet-multinomial  ⟵ THE SHARE CORE
**Exports:** `fitDirichletMultinomial: FitDirichletMultinomialFn`,
`sampleDirichletMultinomial: SampleDirichletMultinomialFn`
**Spec:** sample: gamma(α_i) via Marsaglia–Tsang (a < 1 via boost U^(1/a)) using ONLY
rng + boxMuller; normalize; allocate trials by per-trial cdf inversion; counts sum
EXACTLY to trials. fit: Minka fixed point with digamma from ../numeric.js —
α_j ← α_j · Σ_rows[ψ(x_ij + α_j) − ψ(α_j)] / Σ_rows[ψ(n_i + A) − ψ(A)]; init
2·mean-share (floor 1e-3); budget 500, tol 1e-9, NO_CONVERGENCE; α floor 1e-6.
**Attacks:** any of 500 draws not summing exactly to trials; **teammate negative
correlation** — α = [2,2,2], trials 30, 3000 draws ⇒ empirical corr(counts_i,
counts_j) < 0 (the entire point of the slot — must be asserted); α = [0.5, 0.5]
neither hangs nor NaNs; round-trip α = [5,3,2], trials 40, 2000 rows within 20%;
digamma imported, not re-derived.

## K12 · censored-count
**Exports:** `makeCensoredCount: MakeCensoredCountFn`
**Spec:** pmf(k) = (1−c)·base.pmf(k) + c·Σ_j base.pmf(j)·Binom(j, f).pmf(k) (base
truncated at tail < 1e-12); support min 0 (thinning goes below base.min) unless
f = 1; mean (1−c+cf)·mB; variance by law of total variance (derive in comments);
sample: base draw, then Bernoulli(f) thinning when rng() < c. Degenerate identities
f = 1 ⇒ base exactly, c = 0 ⇒ base exactly (assert to 1e-12). Conformance mandatory.
**Attacks:** mean ≠ (1−c+cf)·mB; variance vs 200000-draw empirical within 2%;
support min claimed base.min with f < 1; unbounded-base convolution unguarded;
degenerate identities absent from tests.

## K13 · lognormal-tail
**Exports:** `makeLognormalTailMixture: MakeLognormalTailMixtureFn`
**Spec:** w on the lognormal: cdf = (1−w)·Φ((x−m)/s) + w·(x ≤ 0 ? 0 :
Φ((ln x − μ)/σ)); mean (1−w)m + w·exp(μ + σ²/2); E[X²] = (1−w)(s² + m²) +
w·exp(2μ + 2σ²); quantile by bisection (bracket wide, tol 1e-10, budget 200);
sample by component pick + boxMuller; support (−∞, ∞). No conformance (discrete-only)
— instead assert: cdf monotone on a grid; quantile inverts cdf to 1e-8; 200000-draw
mean/var within 2%; **median < mean** for w=0.3, μ=3, σ=0.8, m=4, s=2 (the shape
fact the slot exists for).
**Attacks:** weight on wrong component; lognormal cdf at x ≤ 0 NaN; E[X²] slip
(exp(2μ+2σ²), not exp(2μ+σ²)); brackets too narrow at p = 0.001/0.999; median<mean
assertion missing.
