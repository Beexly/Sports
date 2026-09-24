# Entropy of the Linear Pool and Forecast Disagreement (Krüger, 2024)

## 1. Citation and full-text verification
- **arXiv ID:** 2412.09430 (full text fetched from ar5iv on 2026-09-22 — Fabian Krüger, "Entropy of the Linear Pool and Forecast Disagreement")
- **Full text read:** complete, 1,218 extracted lines (Abstract → §1 Introduction → §2 Formal Setup (scoring rules, kernel scores) → §3 Entropy of the Linear Pool (Proposition 3.1) → §4 Disagreement for Various Outcome Types (Table 2: squared error, Brier, RPS, CRPS, energy score) → §5 Disagreement and Forecasting Performance (Proposition 5.1) → §6 Empirical Illustrations (SCE consumer inflation probabilities; BVAR US inflation) → §7 Disagreement-based Motivation for Linear Pooling (Proposition 7.1) → §8 Discussion → References)
- **Cross-reference check:** not in the ledger corpus (dedup vs `ledger-tracker-750.jsonl`, `wave4b-dedup-baseids.txt`, existing `arxiv-deep` headers: zero hits)

## 2. Problem and method
**Problem:** The linear pool (Stone 1961: F^ω=ΣᵢωᵢFⁱ) is the workhorse of distributional forecast combination, but we lacked a unified account of *what disagreement among components does* for probabilistic forecasts beyond the squared-error point-forecast case (Wallis 2005: Var(pool)=average Var + disagreement).
**Method:** Treat entropy as uncertainty measured by a proper scoring rule (Gneiting–Raftery 2007), and prove the variance-style decomposition for the whole family of **kernel scores** (squared error, Brier, RPS, CRPS, energy score — univariate/multivariate, discrete/continuous): pool entropy = average component entropy + a disagreement term D≥0. Then: (a) Proposition 5.1 shows D exactly equals the pool's realized score improvement over the average component score; (b) Proposition 7.1 shows the linear pool is the most "central" combination under any kernel score — it minimizes average divergence to components. Empirical illustrations on NY Fed SCE consumer inflation-range probabilities and BVAR US inflation forecasts.

## 3. Core equations
- **Entropy decomposition (Prop 3.1, eq. 4):** E_{F^ω}[S(F^ω,X)] = Σᵢωᵢ·d(F^ω,Fⁱ) [D = average divergence = disagreement] + Σᵢωᵢ·E_{Fⁱ}[S(Fⁱ,X)] [average component entropy], for any proper S; D≥0. For kernel scores: D = ½E_{F^ω}[L(X,X̃)] − ½ΣᵢωᵢE_{Fⁱ}[L(X,X̃)] (eq. 6); kernel divergences are symmetric, entropy nonnegative (advantages over log-score/KL).
- **Realized-score improvement (Prop 5.1):** S_L(F^ω,y) = ΣᵢωᵢS_L(Fⁱ,y) − D — the pool beats the average component score by exactly D. Corollary: for fixed average component performance, diversity is strictly desirable.
- **Maximal centrality (Prop 7.1):** for any kernel score and finite outcome space, the linear pool minimizes D_gen(h)=Σᵢωᵢd(h,Fⁱ) over all probability vectors h — the linear pool IS the quasi-arithmetic pool (Neyman–Roughgarden 2023) under kernel scores. (For log-score, the quasi-arithmetic pool is instead the log pool — a drawback of KL's asymmetry.)
- **Table 2 disagreement expressions:** squared error: Σᵢωᵢ(μ^ω−μⁱ)²; Brier: weighted mean squared prob deviations; CRPS/energy: energy-statistic forms — GSE can compute these directly on simulated ensembles.

## 4. Datasets and empirical results
Two illustrations (R replication code at gitlab.kit.edu/fabian.krueger/kernel_pool_replication): (1) **NY Fed Survey of Consumer Expectations** inflation-range probabilities — disagreement (RPS-based D) among consumers correlates strongly (0.86) with pool variance and 0.68 with pool ERPS, validating D as a principled disagreement metric; (2) **BVAR forecasts of US inflation**. The empirical role is illustration, not testing — the propositions are exact identities, not estimates. Notable tension discussed: D makes the pool's *self-assessed* entropy more pessimistic (eq. 6) while improving its *realized* score (Prop 5.1) — with calibration implications (Knüppel & Krüger 2022).

## 5. GSE application
This paper gives GSE two operational quantities for its probabilistic ensemble (which will be a linear pool of component predictive distributions under ledgers 1672–1674):
1. **A diversity budget D:** compute the CRPS/energy-score disagreement term D across component models each week; Prop 5.1 says the realized score gain of pooling over the average component equals exactly D. Track D over the season — when D collapses (models agree), pooling adds nothing and GSE is paying combination complexity for zero gain; when D is large, the pool's edge is mechanically largest. Use D as a health metric for the ensemble.
2. **A centrality justification:** Prop 7.1 says that under any kernel score (including CRPS/energy, GSE's natural choices), the linear pool is the most central combination of the components — a principled defense of linear pooling over quantile averaging or nonlinear reprocessing for GSE's published distributions.
3. **Component selection:** for a fixed average component skill, Prop 5.1 says maximize D — prefer a new model that disagrees with the pool over one that merely matches its skill. This operationalizes the diversity principle of ledger 1677 in score units.
Caveat: D's improvement is relative to the *average component*, not the *best* component — pooling can still lose to the single best model; D quantifies the gain over the average only.

## 6. Implementation notes
- D is computable from simulated draws: for energy score L(x,y)=‖x−y‖, D = ½·(mean pairwise distance within pooled draws) − ½Σᵢωᵢ·(mean pairwise distance within component-i draws). Implementable in a few lines on GSE's ensemble simulation output.
- The paper excludes the log score (not a kernel score; KL asymmetric, entropy can be negative) — prefer CRPS/energy for GSE's internal diversity accounting even if log-score is reported externally.
- Weights are exogenous here (no weight optimization) — pair with Allen et al. 2024 (kernel-score weight optimization, cited) or the stacking papers (ledgers 1672–1674).
- Watch the calibration tension: high D ⇒ better realized score but more pessimistic self-assessed uncertainty — monitor PIT histograms alongside D.

## 7. Tests and evaluation
On GSE backtests: (a) compute weekly D (energy-score form) for the component ensemble and verify Prop 5.1's identity empirically: realized energy score of pool ≈ average component energy score − D; (b) test the diversity-selection rule: adding a component that increases D should improve the pooled score more than adding one that matches skill but agrees (ΔD predicts Δscore); (c) monitor D vs realized calibration — weeks with high D should show the pool's PIT closer to uniform than low-D weeks. Pass criterion: the Prop 5.1 identity holds within numerical tolerance and ΔD is a positive predictor of pooled-score improvement.

## 8. Strengths
- Exact, assumption-free identities (Props 3.1, 5.1, 7.1) covering all kernel scores — no estimation, no asymptotics, no symmetry assumptions.
- Unifies squared-error intuition (Wallis 2005) with modern distributional scores (CRPS, energy) in one framework.
- Prop 7.1 gives the cleanest justification available for preferring linear pooling over alternatives under kernel scores.
- Practical: Table 2 gives closed-form D for every score GSE would use; replication code published.
- Honest about the log-score exclusion and the entropy-pessimism vs realized-gain tension.

## 9. Limitations and risks
- Weights are taken as given — no guidance on choosing ω; must be paired with weight-optimization machinery.
- D measures gain over the *average* component, not over the best — can mislead if one component dominates.
- Log score (GSE's likely external reporting score) is excluded from the centrality result; the quasi-arithmetic pool under log-score is the log pool, not linear.
- Empirical illustrations are macroeconomic and illustrative only; no sports or high-frequency validation.
- Finite-outcome-space assumption for Prop 7.1 (though n_Ω arbitrarily large, and simulation-draw representations fit naturally).

## 10. Comparison to prior art
vs **Wallis (2005) variance decomposition**: this paper's Prop 3.1 is its strict generalization from squared error to all kernel scores.
vs **Shoja & Soofi (2017)**: log-score analogue (KL-based); this paper covers kernel scores with the symmetry advantage.
vs **Knüppel & Krüger (2022)**: studied the pessimism/gain tension under squared error; this paper generalizes to all kernel scores.
vs **Neyman & Roughgarden (2023)**: their quasi-arithmetic pool under general proper scores; Prop 7.1 shows it coincides with the linear pool for kernel scores — and their worst-case gain analysis complements Prop 5.1's exact gain.
vs **Allen et al. (2024)**: optimizes linear-pool weights under kernel scores (the companion piece — this paper takes weights as given).

## 11. Novelty
First entropy/disagreement decomposition of the linear pool for the full kernel-score family (previously only squared error and log-score special cases); first proof that the linear pool is the maximally-central (quasi-arithmetic) combination under all kernel scores; first exact identity linking disagreement D to realized pooling gains.

## 12. Reading difficulty
Medium: requires proper-scoring-rule literacy (Gneiting–Raftery 2007) and comfort with kernel/energy statistics; the propositions are clean and the empirical sections are accessible. Easiest deep read of the wave for anyone with the scoring-rule background.

## 13. Related papers
- Stone (1961): linear pool; Wallis (2005): variance decomposition.
- Gneiting & Raftery (2007): proper scoring rules; Gneiting (2012): kernel scores.
- Knüppel & Krüger (2022): linear pool properties under squared error.
- Allen et al. (2024): kernel-score weight optimization for the linear pool — the companion implementation piece.
- Neyman & Roughgarden (2023): quasi-arithmetic pooling; Pettigrew (2019).

## 14. GSE value
Hands GSE an exact, computable diversity metric D (in CRPS/energy-score units) for its probabilistic ensemble: realized pooling gain over the average component equals D, so D is both the ensemble's health monitor and its component-selection criterion (maximize disagreement at fixed skill) — plus the strongest available theoretical justification for linear pooling as GSE's combination form.

**Verdict:** ADAPT
