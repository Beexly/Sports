# Grok "self-regularizing residual-information e-process" — audit

Founder ran side research with Grok proposing an elevated engine: hierarchical
negative-binomial totals model, Rao-Blackwellized particle filter, Liu-West
kernel on variance components, Cubature Kalman updates, and a fractional
e-process whose bet intensity λ and prior temperature are modulated by a
"residual information" estimate and the capital path itself. Verdict below;
adopt only ADOPT.

## Real and correctly stated

The algorithmic core is genuine, standard machinery, correctly described:
Liu & West (2001) kernel (formula as given is the correct a·φ + (1−a)·mean +
sqrt(1−a²)·noise construction), Arasaratnam & Haykin (2009) cubature filter
(2n equal-weight points, all positive), Rao-Blackwellized particle filtering,
negative-binomial over Poisson for overdispersed MLB totals. The NB
hierarchical model with park/weather/pitcher/umpire effects converges with the
design our own round-2/round-5 research already adopted (C-22 lineage). No
fabricated algorithms, no invented citations. Its own power framing is honest:
at n=241 this is "a high-quality kill test, not a discovery test."

## Rejected claims

**E-1. "This closed loop does not exist in any published paper" — novelty
inflation.** A λ_t that depends on past capital and past data is a
*predictable betting strategy*, which the existing anytime-valid theory
(Waudby-Smith & Ramdas; GRAPA/aGRAPA-style adaptive bets) already fully
licenses and instantiates. Validity holds precisely BECAUSE it is the old
math. A novel engineering combination, perhaps; a new statistical object, no.
We do not describe it otherwise, internally or publicly.

**E-2. The residual-information gate is the weakest piece, not the crown.**
Sequential estimation of conditional mutual information I(X;Y given m) with a
few hundred binary outcomes is noise-dominated — the gate would modulate λ on
estimator variance, not on signal. The proposal never specifies the estimator
or its confidence sequence. Until that exists with demonstrated behavior on
synthetic nulls, the gate is a liability dressed as an innovation.

**E-3. Its step 1 ("run the kill test on the real 241-game archive") is
declined.** Track E is CLOSED on this corpus (C-44, pre-registered, no
appeal). The fundamentals-vs-outcome question differs from the killed
price-microstructure mechanisms, but the master plan's do-not-do list bars
new mechanism studies on this corpus, and Grok's own power math says n=241
cannot detect a realistic edge — running it buys the appearance of activity,
not knowledge. The 2-4% posterior for a real MLB totals edge (Bickel & Kim
update) prices the expected value of that run at approximately zero.

**E-4. The sandbox result (final capital ≈896) is a smoke test, never
evidence.** Synthetic data with a planted edge, in Grok's own sandbox. It may
never be cited in any ledger row, page, or claim.

**E-5. Umpire/ABS magnitudes (±0.3-0.5 runs, CS% thresholds) are
folklore-tier and unverified.** The hierarchical-shrinkage treatment it
recommends is correct regardless of the true magnitude, which is exactly why
that treatment is right.

## ADOPT — where this actually fits

C-44 left exactly one research door open: a future, separately pre-registered
prospective program on forward data (NFL accumulating since 2026-08-20, MLB
2027, phase-tagged archive now writing). The Grok stack is a legitimate
CANDIDATE ENGINE for that program, and it can be built and validated NOW at
zero risk because synthetic validation touches no real data and makes no
claim:

- NB hierarchical model + RBPF + Liu-West, with a FIXED-λ fractional
  e-process as the pre-registered baseline;
- adaptive-λ variant included for comparison, never as primary until it
  proves itself;
- acceptance criterion that matters most: **dies cleanly on pure noise** —
  across many noise seeds, the capital process certifies at no more than the
  nominal α rate. An engine that cannot pass the null test has no business
  near real data. Second criterion: recovers planted hierarchical edges
  faster than the open-loop baseline.
- single primary entry window (its dependence fix — correct, adopted).

Queued as R-9 (Hermes, synthetic-first, after launch work). If the future
prospective track ever opens, this engine arrives already null-validated —
which is the only way an "edge discovery" system is allowed to exist at GSE.
