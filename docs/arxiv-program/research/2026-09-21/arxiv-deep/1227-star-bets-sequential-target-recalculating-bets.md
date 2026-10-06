# Deep-Research Ledger 1227 — arXiv:2505.22422v2 (cs.LG, 11 Nov 2025)

**Title:** STaR-Bets: Sequential Target-Recalculating Bets for Tighter Confidence Intervals
**Authors:** Václav Voráček, Francesco Orabona (NeurIPS 2025)
**Version read:** v2 (11 Nov 2025). Full read verified on 2026-09-21: abstract, Sections 1–6 (intro, related work, coin-betting game, testing-by-betting framework, STaR technique, STaR-Bets algorithm, Theorem 8, experiments, conclusions), Appendices A–D (proofs, Bernstein version, extensive experiments C.1–C.4, implementation details D.1–D.3). Text source: `2505.22422.pdf` → `pdftotext -layout` (12,443 words). Code URL verified via web search on 2026-09-21.

## 1. Question asked

For the mean μ of a bounded [0,1] variable with fixed sample size n, can a *betting-based* confidence interval achieve the statistically optimal width σ√(2log(1/δ)/n) — and can sequentially recalculating the bet from the remaining rounds and remaining wealth target strictly improve classical betting CIs (Hoeffding/Bernstein)?

## 2. Dataset / schema

No real dataset. Simulations: n ∈ {8, 16, …, 256}, **1,000 repetitions** per setting, δ = 0.05. Distributions: Beta(5,1), Beta(0.1,2), Beta(2,0.1), Bernoulli(0.1/0.3/0.5/0.9). Metric: average distance of CI endpoint to the true mean; CDF plots of lower bounds over the 1,000 reps (Fig. 3).

## 3. Method

1. **Testing by betting (Thm. 2):** for each candidate mean m, run wealth W_i^m = W_{i−1}^m(1 + ℓ_i(X_i − m)) (Eq. 2), ℓ_i ∈ [−1/(1−m), 1/m]; reject H₀(m): E[X]=m if W_n^m ≥ 1/δ (Markov, Prop. 1). Non-rejected m's form a (1−δ)-CI.
2. **STaR technique:** a betting algorithm is "STaR" if the bet at time t uses only (i) log(1/δ) − log W_t (wealth still needed) and (ii) n − t (rounds left). Fixes two flaws of constant-bet schemes: they can hit 1/δ then lose it, and they ignore the current situation.
3. **Prop. 4 / Cor. 5:** STaR-Hoeffding (Alg. 2) rejects whenever vanilla Hoeffding (Alg. 1) does → its CIs are never wider, sometimes strictly narrower. Same recipe applies to Hoeffding, Bernstein, Bennett (Remark 6).
4. **Bets (Alg. 3):** variance-adaptive bet ℓ ≈ √(2log(1/δ)/(n·v̂)) ∧ 1 with online second-moment estimate v̂ = V/(t−1) + t^{−1}α² ∧ 1 (hyperparameters α, c = 1 per App. D.3).
5. **STaR-Bets (Alg. 4):** STaR-ified Bets — ℓ = √(2(log(1/δ) − lgW)/((n−t+1)v̂)) ∧ 1. Stops betting once the target is hit; bets aggressively near the deadline if behind.
6. **Prop. 7:** exact 1−δ coverage *requires* algorithms that finish with wealth in {0, 1/δ} — STaR's "bankrupt or target" behavior is not a bug.
7. **Implementation (App. D):** clip v̂ to m(1−m) (D.1); optional last-round randomization to an all-or-nothing test variable (D.2); c = 1 robust (D.3, C.3).

## 4. Equations / assumptions

- Wealth: W_i^m = W_{i−1}^m(1 + ℓ_i(X_i − m)); reject iff W_n^m ≥ 1/δ.
- Kelly-style derivation: log(1+ℓ(X−m)) ≈ ℓ(X−m) − ℓ²(X−m)²/2 (Eq. 4); oracle constant bet ℓ⋆ = S/V with S = Σ(X_i−m), V = Σ(X_i−m)² (Eq. 5); target |ℓ⋆| = √(2log(1/δ)/V) (Eq. 6).
- **Theorem 8:** ∀ X ∈ [0,1] with variance σ² > 0, ∀ α,δ ∈ (0,1), c > 0: ∃ n₀ ∈ O(c⁻⁴) such that for n ≥ n₀, Alg. 3 rejects every m ≤ x̄_n − σ√((2+c)log(1/δ)/n) with prob. ≥ 1−α (Eq. 7). **Corollary 9:** CI width optimal up to a 1+o(1) factor — first such finite-time guarantee for a betting CI.
- **Assumptions:** i.i.d. X_i ∈ [0,1]; n ≫ log(1/δ) (else no method gives short intervals); σ² > 0.
- **Caveat (stated):** the optimality proof covers Alg. 3 (Bets); the STaR + Bets combination (Alg. 4) has *empirical* superiority only — "we were not able to prove these optimality properties." Validity (coverage) still holds via Theorem 2.

## 5. Features / target

Features = the sample X_1…X_n plus the running wealth log W_t and second-moment estimate v̂_t. Target = the tightest valid (1−δ)-CI for μ — equivalently, for each m, the binary outcome "wealth reached 1/δ by round n."

## 6. Validation

- **Fig. 2 (width vs n, log-log):** on Beta(5,1), STaR-Bets approaches the (invalid, undercovering) T-test as n grows; on Bernoulli(0.3), STaR-Bets ≈ optimal randomized Clopper-Pearson, beats standard CP at small n, far beats Hedged-CI at large n.
- **Fig. 3 (CDF of lower bounds):** STaR-Bets passes through the (mean, 1−δ-quantile) intersection → coverage ≈ 1−δ; T-test shorter but undercovers; randomized CP unbeatable but STaR-Bets close.
- **App. C.1:** coverage of STaR-Bets "statistically indistinguishable from 1−δ" in most settings; Hedged-CI coverage usually 1 (over-conservative); on Beta with a > b T-test wins on width but violates coverage.
- Byproduct: confidence *sequences* via Ville's inequality (width ≈ log(1/δ)·n/t² up to constants).

## 7. Exact results

- Theorem 8 / Corollary 9 as above: first betting-based CI with proven 1+o(1)-optimal fixed-horizon width.
- Prop. 4: STaR-Hoeffding ⊇ Hoeffding rejections, same data — strict improvement for free.
- Experiments at n ∈ {8,…,256}, 1,000 reps, δ = 0.05; no exact numeric table — all results graphical (Figs. 2–3, App. C).
- Competitors beaten: Hoeffding, empirical Bernstein, Hedged-CI [23], standard Clopper-Pearson, PMBSS [16]; matched: randomized CP (Bernoulli), T-test (Beta, large n — but T-test undercovers).

## 8. Code / data availability

**Code:** https://github.com/vvoracek/STaR-bets-confidence-interval — `star(data, alpha)` returns a lower bound on the mean; `core.py` implements all methods, `main.py` runs the experiments. No real dataset (simulations only).

## 9. Leakage / limitations

- i.i.d. bounded [0,1] only; no dependent or heavy-tailed data.
- The headline optimality theorem does *not* cover the STaR-Bets algorithm itself — only its non-STaR core (Alg. 3). The STaR combination is empirically better but unproven.
- Requires n ≫ log(1/δ); small-n behavior relies on the D.1–D.3 heuristics (clipping, randomization) rather than theory.
- Discretization over m ∈ [0,1] grid needed to form intervals; cost scales with grid fineness.
- All-or-nothing randomization (D.2) makes the procedure randomized — two runs can give different intervals.

## 10. GSE overlap

Highly relevant to GSE's calibration/uncertainty lane:

- **Paper 11 (1230/2603.19551)** uses STaR-Bets as a baseline and extends it to deadline-optimal *policies* — read the two ledgers as a pair: STaR-Bets for tight fixed-n CIs, Learning-to-Bet for anytime deadline testing.
- Calibration lane: replace fixed-sample normal CIs on pick win-rates / calibration-bin accuracies with STaR-Bets intervals — guaranteed coverage plus near-optimal width, no variance pre-knowledge needed.
- The STaR recalculation trick is portable: any GSE sequential procedure with a fixed budget (games left in season, picks left in slate) should recompute its "bet" from (target remaining, time remaining), not from a constant plan.

## 11. Implementation spec (GSE)

**Tighter calibration CIs for engine pick buckets.** For each model probability bucket (e.g., predicted win prob 0.55–0.60):
1. Collect realized outcomes X_i ∈ {0,1} (n picks in bucket).
2. Compute the STaR-Bets lower/upper bounds via the released `star(data, alpha)` (two-sided via 1−data), α = 0.05.
3. Flag buckets where the model's mean predicted probability lies outside the interval → miscalibration with guaranteed coverage.
4. Replace any Hoeffding/Bernstein bounds currently used in calibration reports with STaR-Bets (Prop. 4 guarantees no-worse, usually better).

## 12. Reproducible test

Clone the repo; run `main.py` Bernoulli(0.3) setting at n ∈ {8,…,256}, 1,000 reps, δ = 0.05; verify mean CI width ≤ Hedged-CI width at every n and within 10% of randomized Clopper-Pearson width at n ≥ 64 (Fig. 2R).

## 13. Numeric gate

At n = 256, Bernoulli(0.3), δ = 0.05, over 1,000 reps: STaR-Bets mean CI width must be ≤ 1.1× the randomized Clopper-Pearson mean width (near-optimality, Fig. 2R) with empirical coverage in [0.93, 0.97] (validity, Fig. 3).

## 14. Improvement experiment

Apply §11 to GSE's pick history (Neon `picks`, model v5.2.7): compute STaR-Bets vs normal-approx CIs on win-rate per probability decile; count miscalibrated deciles each method flags. Expectation: STaR-Bets flags a superset of the truly miscalibrated deciles (tighter + valid) — quantify how many picks' worth of sample the tighter intervals save before a miscalibration is detected.

**Verdict:** ADAPT
