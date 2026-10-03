# Grok Stats Transcript — Verified, Built, and a Correction I Owe (2026-07-02)

A long Grok transcript: FTC substantiation for public loss reporting, bootstrap/
BCa/jackknife CIs, and numerical-optimization methods (Newton, damping, dogleg,
Steihaug-CG, HVP, negative curvature). I did the work this time instead of
dismissing half of it.

## What I VERIFIED against primary sources / first principles
- **FTC framing (sections 1-5): sound and directly actionable.** FTC Act Section
  5 (15 U.S.C. sec 45) + the Policy Statement on Advertising Substantiation do
  require a "reasonable basis" for objective performance claims BEFORE
  dissemination. A literal, sealed, receipted loss ledger with n / time period /
  methodology / honest CIs is exactly the "competent and reliable evidence" that
  substantiates a performance claim — and the literal framing ("model X,
  observed Y") avoids the deception trap. This is the legal backbone of the
  publish-your-losses strategy. [PROPOSED, counsel-required on specifics — as
  Grok correctly tagged.]
- **BCa bootstrap math: correct (Efron & Tibshirani 1993).** z0 = Phi^-1(frac of
  boot < point); jackknife acceleration a = sum(U^3)/(6 sum(U^2)^1.5) with
  U_i = (n-1)(theta_dot - theta_(i)); adjusted alphas via the BCa formula. All
  standard and right. Verified normalCdf/normalQuantile against known values in
  tests.

## What I BUILT (the gold, shipped)
`packages/prediction-engine/src/performance-ci.ts` — the honest-uncertainty
engine for the public ledger, alongside the existing Wilson interval:
- Win rate is a proportion -> Wilson (already existed). ROI/units is a MEAN OF
  SKEWED CONTINUOUS returns -> the normal approximation lies and Wilson does not
  apply. So this adds the **BCa bootstrap** for continuous returns.
- **Deterministic by design** (seeded mulberry32): a PUBLIC performance band must
  be reproducible by anyone from the same sealed ledger, or it is not
  verifiable. The CI itself can live in the receipt. That auditability point is
  the trust-doctrine upgrade the transcript did not stress.
- **General over any statistic** (`bcaCi(data, statistic)`), not just the mean —
  see the correction below for WHY that generality matters.
- 9 tests: known normal values, brackets the point, DETERMINISM (same seed ->
  identical interval), the HONEST result (a 55/100 even-odds record has a lower
  bound below break-even -> cannot yet claim profit), material skew correction,
  and the general-statistic path. Typecheck clean.

## THE CORRECTION I OWE (I called sections 13-20 a "rabbit hole" — I was wrong)
I dismissed the optimization sections (Newton convergence, Levenberg-Marquardt,
dogleg, Steihaug-CG, matrix-free HVP, negative curvature, Hessian-based
influence) as overkill because "the ledger statistic is a mean." That answered
the easy question and ignored the hard one. Reasoned through properly:
- Every edge round I DEMANDED confound control (e.g., "kinkiness must be
  controlled for game volatility"). Controlling confounds = REGRESSION. A robust
  or logistic regression on noisy, outlier-heavy, sometimes-separable sports
  data is an M-ESTIMATION problem whose Hessian CAN be indefinite/ill-
  conditioned — which is EXACTLY when Levenberg-Marquardt / dogleg / Steihaug-CG
  are the correct, standard tooling (sections 15-20).
- To put a BCa interval on a CONFOUND-ADJUSTED edge (not a raw mean) you need its
  INFLUENCE FUNCTION, and section 13's IF approx = -H^-1 psi is precisely the
  efficient bridge from BCa to a regression-derived statistic (it avoids n full
  refits). Grok handed me the influence-function + robust-optimization toolkit
  for the confound-adjusted estimators GSE's own rigor doctrine requires — not
  irrelevant math.
- CONSEQUENCE IN CODE: I generalized the module to `bcaCi(data, statistic)` so a
  confound-adjusted edge estimate plugs straight in. Today it runs the exact
  delete-one jackknife (fine at ledger sizes). The section 13-20 machinery is the
  Phase-2 efficiency layer for when that statistic is an expensive M-estimator
  fit on ill-conditioned data. It is a documented ROADMAP now, not a dismissal.

## Meta-lesson (on me, again)
Twice now I pattern-matched "hallucination / rabbit hole" and was wrong on
verification. The rule stands and it binds ME: verify before dismissing. Grok's
technical substance in this transcript was correct throughout; the only real
issue was that a chunk of it was Phase-2 tooling, not Phase-1 — and that is a
sequencing note, not a flaw.

## Build state
performance-ci.ts + 9 tests, typecheck clean (engine + web), exported from
@sports/prediction-engine. Ready to wire into the public loss ledger surface:
win rate -> Wilson band, ROI/units -> BCa band, both reproducible and receipt-
anchorable.
