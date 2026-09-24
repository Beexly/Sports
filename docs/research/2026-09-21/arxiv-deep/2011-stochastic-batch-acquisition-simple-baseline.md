# [2011] Stochastic Batch Acquisition: A Simple Baseline for Deep Active Learning (arXiv:2106.12059)

**Citation:** Kirsch, A., Farquhar, S., Atighehchian, P., Jesson, A., Branchaud-Charron, F., Gal, Y. (2021). *Stochastic Batch Acquisition: A Simple Baseline for Deep Active Learning*. OATML, University of Oxford / ServiceNow. arXiv:2106.12059. URL: https://arxiv.org/abs/2106.12059
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT
**Verdict rationale:** Three Gumbel-noise stochastic batch rules (softmax/power/soft-rank, O(M log K)) that match BatchBALD/BADGE at orders-of-magnitude lower compute and strictly dominate top-K everywhere — the mandatory cheap baseline for every acquisition method in this wave (including ledgers 2002–2010) and an immediately deployable upgrade to any top-K charting queue; no cost-awareness, so it composes with (rather than replaces) the knapsack rules of ledgers 2007/2008.

## 1. Research question
Can a trivial stochastic adaptation of single-point acquisition scores — sampling batches from a Gumbel-perturbed score distribution instead of taking top-K — match expensive batch methods (BatchBALD, BADGE) that explicitly model point interactions, and should top-K batch acquisition ever be used again?

## 2. Dataset / schema
Repeated-MNIST×4 (redundancy pathology), EMNIST Balanced (132k) / ByMerge (814k, 47 classes), MIO-TCD (649k traffic images, realistic noise/duplicates), Synbols (minority groups, spurious correlation, missing symbols), CLINC-150 (NLP intent classification, DistilBERT), CIFAR-10/SVHN/Fashion-MNIST (MFVI last-layer), IHDP (causal CATE estimation). ~25,000 Titan RTX compute hours.

## 3. Method / model
Three stochastic variants via the Gumbel-top-K trick (Prop 3.1): perturbing scores s_i with ε_i ~ Gumbel(0,β⁻¹) and taking top-K ≡ sampling without replacement from:
- **Softmax**: p(i) ∝ exp(βs_i) — perturb raw scores (shift-invariant, ignores absolute scale).
- **Power**: p(i) ∝ s_i^β — perturb log-scores; zero scores get ~zero mass (right for BALD/entropy where 0 = uninformative); "when using BALD, entropy... power acquisition is the most sensible."
- **Soft-rank**: p(i) ∝ r_i^{−β} — perturb −log(rank); robust to unreliable absolute scores.
β=1 default; β→∞ → top-K, β→0 → uniform. Motivation: top-K implicitly assumes score rank-correlation stays 1 within a batch, but Spearman correlation between scores at step t and t+n falls with n (Fig. 2/5) — fastest for the top-quantile most-informative points, which even anti-correlate early in training. Gumbel justified by EVT (max of exponential-tailed variables → Gumbel; scores look truncated-exponential, "80/20 rule"). Asymptotic theory: total correlation TC = Σ_i I[Y_i;Ω|x_i] − I[Y_1:K;Ω|x_1:K] → 0 as |D_train|→∞, so top-K BALD → BatchBALD late in training — top-K hurts most *early*; frozen-score experiment: freezing at t=20 diverges after ~20 acquisitions, freezing at t=120 matches step-by-step for ~50. Also notes BatchBALD's MC estimator is capped by log M (M = parameter samples), so its informativeness collapses after a few acquisitions.

## 4. Equations & assumptions
- BatchBALD decomposition: I[Y_1:K;Ω|x_1:K,D] = Σ_j E[I[Y_j;Ω|x_j,prev,D]] ≠ Σ_j s_BALD(i_j) (Eq. 10–11) — the top-K fallacy.
- Prop 3.1 (Gumbel-top-K): arg top_k{s_i + ε_i}, ε_i ~ Gumbel(0,β⁻¹) ≡ ordered sample w/o replacement from Categorical(exp(βs_i)/Σ_j exp(βs_j)).
- TC → 0 (Eq. 16–18); I[Y;Ω|x,D] → 0 as |D_train|→∞ (Eq. 19).
- Complexity O(M log K), identical to top-K.
- Assumptions: scores non-negative with 0 = uninformative (power); score perturbations ~ Gumbel; β fixed (no tuning recipe offered).

## 5. Features / target
Vision/NLP/causal features → classification labels / CATE.

## 6. Validation design
vs. top-K BALD/entropy, BatchBALD, BADGE, ACS-FW, uniform across the dataset suite; 3–10 trials, 95% CIs; runtime table on synthetic M=10K pool; β ablations {0.1,1,4,8}; acquisition sizes 5–500; score-dynamics analyses (rank correlations, AUROC quantile stability, frozen-score).

## 7. Numerical results / baselines
- Runtime (Table 1): stochastic = top-K = 0.2s at K=10/100/500 vs. BatchBALD 566s/5,364s/29,984s vs. BADGE 9.2s/82.1s/409.3s.
- Repeated-MNIST×4: PowerBALD (K=10) > top-K BALD, > BADGE, ≈ BatchBALD (K=5) — despite being orders of magnitude cheaper.
- EMNIST Balanced: PowerBALD (K=10) > BatchBALD (K=5) and BADGE (K=10); ByMerge (814k): PowerBALD > BatchBALD (K=5); BADGE OOM'd; BatchBALD took >12 days for 115 acquisitions before being halted.
- MIO-TCD (K=100): PowerBALD > BALD, ≈ BADGE. Synbols minority groups (K=100): PowerBALD ≈ BADGE > BALD. CLINC-150: PowerEntropy ≈ BADGE > entropy.
- MFVI last-layer (CIFAR-10/SVHN, large K): no method dominates; ACS-FW much slower.
- IHDP causal: power CausalBALD (tuned β) >> top-K and uniform on √PEHE; BADGE/BatchBALD not even well-defined for CATE.
- β ablations: PowerBALD β=8 beats BatchBALD on Repeated-MNIST; SoftmaxBALD β=4 best on EMNIST ByMerge; best β is dataset-dependent.

## 8. Code / data availability
Implementation in appendix G (short); datasets all public.

## 9. Leakage & limitations
- Acknowledged: no recipe for choosing β (the one hyperparameter); larger-batches-later hypothesis unexplored; ~25k GPU-hours but still no cost-aware variant.
- BatchBALD given an advantage in comparisons (smaller K=5, where it's known to do better); MFVI setting shows stochastic ≈ top-K ≈ everything at large K on CIFAR-10/SVHN — the method's edge concentrates in early training and redundant pools.
- The Gumbel/EVT justification is heuristic ("we do not claim the distribution of acquisition scores really is truncated exponential"; hypoexponential extension unproved, only simulated).
- Classification-focused experiments; the regression case (GSE's heads) is not directly tested — though the mechanism is score-agnostic.

## 10. GSE overlap
New: the only paper in the wave addressing *how* to turn single-point scores into batches cheaply. It is the mandatory baseline under every other ledger's test (2002–2010 all compare fancier methods against top-K or random, never against stochastic acquisition) and an instant upgrade path: any existing top-K charting queue becomes power acquisition by adding Gumbel noise. Composes with ledgers 2007/2008 (perturb cost-adjusted scores s_i/c_i) and 2009 (stochastic sampling from black-box kernel scores).

## 11. GSE implementation spec
- Immediate (zero-model-change): wherever GSE currently takes top-K games by any acquisition/uncertainty score for charting, replace with power sampling p(game) ∝ s(game)^β, β=1, sampled without replacement via Gumbel-top-K (5 lines). Expected effect: less redundant queues (no more 5 NFC-East slugfests in one week) at identical compute.
- Season-aware schedule from §6: small batches early season (weeks 1–6, high total correlation — scores stale fast), larger batches late season (scores stable; frozen-score result says staleness hurts less) — formalize the "charting intensity" calendar.
- Combine with cost: stochastic sampling from cost-adjusted scores s_i/c_i (ledger 2007's ratio) under the ConBatch-BAL budget loop (ledger 2008) — stochasticity also breaks the threshold-starvation pathology by occasionally admitting expensive items.
- Effort: ~2 hours for the drop-in; ~2 days for the season-aware + cost-composed version.

## 12. Reproducible test
2024 season: weekly pool = games, score = ensemble disagreement on spread margin (K=10 GBM). Compare top-K (K=8) vs. power sampling (β∈{1,4}) vs. soft-rank on end-of-season margin-model RMSE per charting dollar, plus a redundancy metric (mean pairwise feature distance within weekly batches — stochastic should increase it). Baseline to beat: top-K (their paper says stochastic is "never worse" — verify on sports data).

## 13. Acceptance / rejection gate
ADOPT power acquisition as the default batch rule iff it is never worse than top-K on weekly ATS log-loss across the 2024 season (paired weekly differences, stochastic mean ≥ top-K in ≥ 12 of 18 weeks) AND increases mean within-batch pairwise distance by ≥ 10% (diversity gain is the mechanism; if no diversity gain, there's no reason to switch). REJECT if power sampling underperforms top-K by > 0.002 mean weekly log-loss (sports score distributions may not be Gumbel-friendly) or if β-tuning is required per week to match top-K (then it's not the hyperparameter-free baseline the paper claims).

## 14. Improvement experiment
Adaptive β schedule: β_t = f(estimated total correlation) — high β (near top-K) late season when TC→0 and scores are stable, low β (near uniform) in weeks 1–4 when scores decorrelate fastest. Estimate TC weekly from the ensemble's joint-vs-marginal prediction entropy on the pool (Eq. 17 is computable from MC samples). Test whether adaptive-β beats fixed β=1 on log-loss per dollar — hypothesis: the paper's §6 dynamics predict the optimal stochasticity is itself time-varying, and football's regime changes (preseason priors → midseason convergence) are the ideal test bed.
