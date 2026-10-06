# [1494] Nonparametric Estimation in the Dynamic Bradley-Terry Model (arXiv:2003.00083v1)

**Citation:** Heejong Bong, Wanshan Li, Shamindra Shrotriya, Alessandro Rinaldo (CMU, 2020). *Nonparametric Estimation in the Dynamic Bradley-Terry Model*. AISTATS 2020 (PMLR 108). arXiv:2003.00083v1. URL: https://arxiv.org/abs/2003.00083
**Ledger completed:** 2026-09-21. **Read:** full text (PDF — abstract, intro/prior work, model setup, estimation, contributions, existence/uniqueness, oracle bounds, experiments, NFL application, conclusion, references; the entire Appendix 9 read line by line — §9.1.1–9.1.7 (proofs of Theorem 4.1 via Hessian graph-Laplacian argument, Theorem 5.1 via union bound on Condition 4.1 failure, Theorem 5.2 kernel-smoothing oracle bound via Simons–Yao argument, Lemma 9.1 kernel-bias bound, Theorem 5.3 uniform bound via covering argument, Theorem 5.4 via Lemma 9.2 pmin-bound on max|βi*−βj*|), §9.2 (LOOCV bandwidth-tuning procedure), §9.3.1–9.3.4 (Gaussian-process experiment settings, LOOCV curve with optimal h*=0.03 in Figure 3, runtime comparison of original vs dynamic BT in Figure 4, Condition-4.1 frequency Tables 4–6 on original data, and the MLE divergence example in Figure 5)).
**Lane:** bayesian.
**Verdict:** ADAPT
kernel-smoothed dynamic Bradley-Terry as a minimalist, theory-backed team-strength benchmark and a smoothing primitive for GSE's power-rating pipeline; adapt the LOOCV bandwidth tuner and the oracle-bound discipline, not the exact estimator as a replacement for the engine's own ratings.

## 1. Research question
Can the Bradley-Terry model be generalized to time-varying team strengths nonparametrically (kernel smoothing over time), with (a) necessary/sufficient conditions for estimator existence/uniqueness, (b) uniform oracle bounds in a model-agnostic setting where BT is not the true DGP, and (c) practical effectiveness on sparse sports data?

## 2. Dataset / schema
Simulations: N=50 teams, M=50 time points, n_ij(t)=1; strengths drawn from Gaussian processes; both BT-true and model-agnostic (p_ij(t) GP-drawn, scaled to [0.05, 0.95]) settings; 20 repeats. Real data: 5 NFL seasons 2011–2015 via nflWAR package (Yurko et al. 2018), N=32 teams × M=16 rounds per season (only 16 games per time point — sparse). Comparison: FiveThirtyEight NFL ELO (Paine 2015, uses margin of victory). Code: https://github.com/shamindras/bttv-aistats2020.

## 3. Method / model
Three-step procedure: (1) Kernel-smooth pairwise data over time: X̃(t) = Σ_m W_h(t,t_m) X^(m), Gaussian kernel with bandwidth h; (2) Fit static BT on smoothed data: β̂(t) = argmin_{Σβ_i=0} R(β;t), R = negative log-likelihood on X̃_ij(t) (Eq. 6); (3) Rank by β̂(t). Reduces to static BT when all t_m equal. Bandwidth h tuned by leave-one-out cross-validation (LOOCV) procedure detailed in appendix 9.2. Existence/uniqueness: Ford (1957) condition adapted to smoothed data — Condition 4.1: every partition of teams has an i→j edge with X̃_ij(t)>0 (⇔ strong connectivity of the smoothed comparison graph); Theorem 4.1 gives uniqueness at time t. Key benefit: smoothing weakens per-time-point data requirements — a team can be ranked in a round it didn't play.

## 4. Equations & assumptions
logit(p_ij(t)) = β_i(t) − β_j(t), Σ_i β_i(t) = 0 (Eq. 2). Smoothed negative log-likelihood R(β;t) = Σ_{i≠j} [X̃_ij(t)·(β_j−β_i) + X̃_ij(t)·log(1+exp(β_i−β_j))] (Eq. 6). Oracle (projection) parameter β*(t) = argmin R under true p_ij(t) (Eqs. 14–15). Pointwise oracle bound: ‖β̂(t)−β*(t)‖_∞ ≤ 48M*(t)κ_h(t) + C_s·h (Thm 5.2); uniform version with log(NT) bandwidth (Thm 5.3); simplified via K = exp(1/p_min): ‖β̂(t)−β*(t)‖_∞ ≤ 72Kκ_h(t) + C_s·h (Thm 5.4). Rates: pointwise O(max{M*κ_h, (log N/(NT))^{1/3}}), matching the Hölder-1 nonparametric rate (exponent 2/3). Assumptions: (A5.1) each pair plays ≥T̲>0 times with controlled irregular spacing (D_m, D_M constants); (A5.2) p_ij(t) Lipschitz with constant L_p and uniformly ≥ p_min > 0; (A5.3) symmetric bounded kernel with finite total variation. Existence w.h.p.: P(Cond 4.1 holds ∀t) ≥ 1 − 4N²exp(−NTp_min/2) (Thm 5.1).

## 5. Features / target
Features: timestamped win/loss outcomes only (no margin, no covariates). Target: time-varying team strengths β(t) and induced rankings.

## 6. Validation design
Simulations vs win-rate and static BT on: average rank displacement, LOO win/loss prediction error, LOO negative log-likelihood. NFL: season-ending rankings vs FiveThirtyEight ELO top-10 overlap (6–10 of top 10 matched across 5 seasons) — ELO uses margin of victory, BT uses wins only. No test-set win-probability calibration reported.

## 7. Numerical results / baselines
BT-true simulation: rank displacement 2.29 (dynamic BT) vs 3.75 (win rate) vs 3.75 (static BT); LOO prob error 0.37 (both BTs) vs 0.44 (win rate); LOO nll 0.55 vs 0.56. Model-agnostic: rank displacement 5.48 vs 10.68/10.70; LOO prob 0.49 (all — near coin flip, data are GP noise); LOO nll 0.68 vs 0.71. NFL 2011–2015: dynamic BT season-end top-10s matched 6–10 of ELO's top 10 each season despite using no margin-of-victory information; average rank displacement vs ELO 3.4–5.0 across seasons (Table 3). Authors position it as a minimalist benchmarking tool.

## 8. Code / data availability
Code: https://github.com/shamindras/bttv-aistats2020. Data: nflWAR package (open). No pretrained artifacts.

## 9. Leakage & limitations
Stated: method targets smoothly changing strengths — can miss small abrupt changes; oracle bounds require κ_h(t)→0 (design regularity) and p_min bounded away from 0 (no uniformly dominated teams); LOOCV bandwidth selection is data-driven but expensive. Added: NFL validation is rank-overlap only, no probabilistic forecast skill shown; static BT with 16 games/season-point is a weak baseline for the NFL comparison; Gaussian-process simulations are smooth by construction (favorable to the method); no home-field term in the BT fit (ELO comparison partially absorbs this).

## 10. GSE overlap
The existing-research map shows GSE's engine has its own power-rating/model stack (ratings lanes commissioned); this paper does not duplicate any documented GSE component — no kernel-smoothed dynamic BT or LOOCV-tuned rating benchmark exists in the corpus. It slots into the thin bayesian lane as a ratings-methodology reference.

## 11. GSE implementation spec
Adapt as a benchmark and a smoothing primitive, not as a ratings replacement:
1. Minimalist benchmark: fit kernel-smoothed dynamic BT on game outcomes (weekly, Gaussian kernel, LOOCV-tuned h) as a "dumb" power-rating baseline. Any feature-rich engine rating must beat its LOO log-likelihood and rank-displacement on a rolling basis; if it doesn't, the extra features aren't earning their keep. This is the paper's own recommended use ("useful benchmarking tool for other feature-rich time-varying ranking models").
2. Smoothing primitive: where GSE needs a smooth time-varying strength curve (e.g. team-strength inputs to the engine, or opponent-adjustment series), use the kernel-smoothing-then-fit pattern with the LOOCV bandwidth tuner rather than hand-picked decay factors — the bandwidth becomes a data-driven parameter with the paper's oracle-bound discipline behind it.
3. Existence check: before fitting any pairwise rating at a time point, verify Condition 4.1 (strong connectivity of the comparison graph); if it fails, the MLE doesn't exist and the rating is arbitrary — smooth or regularize rather than publish. This is a cheap, principled guardrail for early-season ratings.

## 12. Reproducible test
Fit dynamic BT on the last 5 NFL seasons (nflverse schedules, weekly resolution) with LOOCV-tuned Gaussian bandwidth; compare LOO log-likelihood and Brier score vs GSE's current power ratings and vs a static BT baseline. Pass criterion: dynamic BT beats static BT (replicating the paper) — then require the engine's ratings to beat dynamic BT's LOO nll before any new rating feature is promoted to production.

## 13. Acceptance / rejection gate
ADAPT: the method is theoretically clean and practically validated on NFL data, but it is a minimalist benchmark, not a production rating system — its value to GSE is as the "dumb baseline that feature-rich models must beat" plus the transferable LOOCV bandwidth discipline and existence-condition guardrail. Not ADOPT: it uses wins only (no margin, no home field, no covariates) and the paper shows rank agreement, not forecast skill.

## 14. Improvement experiment
Beyond the paper: use the kernel-smoothed dynamic BT estimate as the *prior mean* of a feature-rich Elo/Glickman-style state-space update. The paper's BT is wins-only (no margin of victory, no home field); the hybrid keeps the paper's existence guarantee and LOOCV-tuned bandwidth as the base strength curve, then lets margin-of-victory and home-field features move off it. This tests whether the minimalist nonparametric curve is a better prior than a constant/flat start — the paper never combines smoothing with covariates. Success: hybrid beats both pure dynamic BT and a features-only model on LOO log-likelihood across five NFL seasons.
