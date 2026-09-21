# [0720] Cost-Sensitive Conformal Prediction and Human-in-the-Loop Abstention for Imbalanced High-Stakes Decision Support: A Multi-Domain Benchmark (arXiv:2607.27143v1)

**Citation:** Manpreet Singh, Akshatha Srikantha, Shyamal Lakhanpal (2026). *Cost-Sensitive Conformal Prediction and Human-in-the-Loop Abstention for Imbalanced High-Stakes Decision Support: A Multi-Domain Benchmark*. arXiv:2607.27143v1. URL: https://arxiv.org/abs/2607.27143v1
**Ledger completed:** 2026-09-21. **Read:** full text via local cache /tmp/arxiv750-cache/fulltext/2607.27143.txt (349 lines, full: abstract, §2 related work, §3 framework, §4 benchmark design, §5 results incl. Tables 2–3 and case studies, §6 deployment guidelines incl. queue model, §7 conclusion, references).
**Verdict:** ADAPT — the minority-coverage-collapse finding and the Mondrian + cost-matrix deferral framework are directly operational for GSE's conformal lane and Garrett's manual-review economics.

## 1. Research question
Does standard marginal conformal prediction protect rare, costly classes under severe imbalance? The paper benchmarks marginal CP, Mondrian (class-conditional) CP, and a cost-controlled abstention mechanism across 15 imbalanced tabular datasets, 7 classifiers, 3 calibrations, 10 seeds (3,150 runs) — and derives the economic break-even threshold for human review.

## 2. Dataset / schema
15 OpenML tabular datasets, binary classification, imbalance ratios 2.3:1 (credit_g) to 580:1 (fraud): aps_failure (58:1, n=76k), seismic_bumps (14.2:1), pc1 (13.5:1), oil_spill (17.9:1), mammography (42.5:1), sick_numeric, wilt, ozone_level_8hr, miniboone, fraud (0.17% prevalence), uci_default (n=30k), diabetes130us (n=101,766), credit_g, +2 more. No sports data.

## 3. Method / model
Nonconformity score S(X,y) = 1 − P̂(Y=y|X). Marginal CP: single quantile q_marg over all calibration samples → Ĉ_marg(X) = {y: S(X,y) ≤ q_marg}, global coverage ≥1−α. Mondrian CP: separate quantiles q_0, q_1 per class → Ĉ_Mondrian(X) = {y: S(X,y) ≤ q_y}, guaranteeing P(Y ∈ Ĉ | Y=y) ≥ 1−α for each class. Action rule Ŷ_action: singletons (|Ĉ|=1) auto-execute; multi-label (|Ĉ|=2) and empty sets trigger abstention → human review. Cost matrix C: C_FP=1.0, C_FN=10.0, review cost C_rev ∈ [0.1, 5.0]; noisy-human model: deferral cost C_rev + ε_hum(C_FN·1(Y=1) + C_FP·1(Y=0)). Break-even threshold C_rev* where deferral beats threshold tuning. Deployment: 4-tier architecture (inference tier, Mondrian quantile server, cost-optimal routing engine, audit & recalibration pipeline); M/M/k queue stability ρ = λ·r_abs/(k·μ) < 1; dynamic α(t) bounds abstention under review budgets.

## 4. Equations & assumptions
- C = [[0, C_FP],[C_FN, 0]]; Bayes cost-tuned threshold τ* = C_FP/(C_FN + C_FP).
- q_marg = Quantile({S(X_i,Y_i)}, ⌈(n_cal+1)(1−α)⌉/n_cal); q_y analogously per class.
- Marginal guarantee: P(Y ∈ Ĉ_marg) ≥ 1−α. Mondrian: P(Y ∈ Ĉ_Mond | Y=y) ≥ 1−α ∀y.
- Congested cost: E[L_congested] = E[L_conf] + P(W>0)·E[C_delay(W)].
- Assumptions: exchangeability of calibration vs test (threat: temporal drift needs online conformal); binary; calibration n₁ ≥ ~50 minority samples for stable q₁ (else clustered Mondrian); human error ε_hum constant (threat: fatigue).

## 5. Features / target
Tabular features per dataset. Targets: binary minority-class events. Error level α=0.10 (90% target coverage) throughout.

## 6. Validation design
3,150 runs: 15 datasets × 7 models (HistGradientBoosting, LogReg, Random Forest, Extra Trees, GB, AdaBoost, Gaussian NB) × 3 calibrations (none, Platt/sigmoid, isotonic) × 10 seeds {7,19,31,42,101,202,303,404,505,606}. Metrics: minority coverage, majority coverage, avg set size, abstention rate, mean per-instance decision cost. Paired Wilcoxon tests + 1,000 bootstrap CIs. Baselines: default point predictor, Bayes τ*, marginal CP, APS, RAPS, confidence rejector, conformal risk control rejector.

## 7. Numerical results / baselines
(quoted exactly)
- **Marginal CP minority coverage: 30.5% average; aps_failure 0.8% (<1%)** under GB; seismic_bumps 4.0%; pc1 7.6% — while meeting the global 90% target. Minority coverage degrades monotonically with imbalance ratio.
- Mondrian CP: 92.2% average minority coverage; **+61.71 pp gain over marginal CP (95% CI [58.20%, 65.22%], paired Wilcoxon p=1.52×10⁻⁸²)**. Nemenyi diagram: marginal CP ranks last by >1 critical difference (CD=2.71).
- Full decision comparison (averaged): Bayes τ* — minority 80.0%, set 1.00, abst 0%, cost 0.340; Marginal CP — 30.5%, 1.04, 12.5%, 0.413; APS — 55.6%, 1.09, 19.8%, 0.380; RAPS — 48.7%, 1.07, 15.7%, 0.444; Mondrian raw — 92.2%, 1.36, 38.3%, 0.143; **Cost-controlled Mondrian — 97.7%, 1.71, 71.9%, 0.021**.
- Cost-controlled Mondrian at C_rev=0.5: mean cost 0.313 — **54.1% below default point classification (0.682), 38.6% below Bayes thresholding (0.510)**; vs Bayes p=2.93×10⁻⁴⁰, vs confidence rejectors p=1.18×10⁻⁷², vs risk-controlled p=5.12×10⁻⁵⁴.
- Isotonic calibration: GB minority coverage 94.3%, set 1.44, abstention 46.0%, cost 0.109; isotonic cut RF set size 1.42→1.35 and abstention −6.8 pp — but on linear models isotonic raised cost to 0.351 (calibration interacts with model family).
- Break-even: C_rev* rises 0.82→4.35 as C_FN goes 5→50; net savings persist while noisy-human error ε_hum < 0.18.
- Case studies: aps_failure — 65.3% cost reduction vs Bayes, 34.1% of ambiguous cases routed to technicians; uci_default — 13.6% reduction; diabetes130us — 94.9% minority coverage at 24.1% abstention.

## 8. Code / data availability
Code: https://github.com/physics-vibes15/cost-sensitive-conformal. Data: OpenML (programmatic retrieval). Fully deterministic given 10 seeds.

## 9. Leakage & limitations
- Paper's own five threats: (1) non-stationarity — static quantiles break under drift, needs online adaptive Mondrian; (2) binary-only (multi-class K>2 needs hierarchical Mondrian partitions); (3) sparse minority calibration (n₁<50 → clustered Mondrian); (4) expert fatigue — ε_hum assumed constant; (5) tabular features only, no unstructured modalities.
- Benchmark is offline; no randomized deployment experiment.

## 10. GSE overlap
Direct upgrade to GSE's existing conformal stack (verified in the existing-research map: CQR research in Drive, cqr.ts with the clamp bug caught 2026-09-21, conformal win probability 2208.08598 read in depth, Mondrian/cross-conformal listed in the ML brief): any conformal interval/set GSE builds on imbalanced sports outcomes (upset detection, rare prop hits, tail cover events) inherits the minority-coverage collapse — a 90% global guarantee can silently give <1% coverage to the rare outcome GSE cares about most. The fix is Mondrian partitions by outcome class. The C_FN/C_FP/C_rev cost matrix maps cleanly to GSE posting economics: cost of posting a loser, cost of missing a winner, cost of Garrett's manual review. The break-even C_rev* gives a principled rule for which picks get manual review vs auto-post. The M/M/k capacity model + dynamic α(t) maps to Garrett's review bandwidth on busy slates. Complements 0717 (C1/C2 gate diagnostic) and 0719 (hybrid uncertainty) — no duplication.

## 11. GSE implementation spec
1. Convert GSE's conformal gate to Mondrian: separate nonconformity quantiles for cover vs not-cover outcomes at α=0.10; verify minority-class (cover/upset) empirical coverage ≥ target on backtest before deployment.
2. Formalize posting economics: set C_FP (cost of posted loser), C_FN (cost of withheld winner), C_rev (Garrett's manual-review time); compute break-even C_rev* per league; route ambiguous prediction sets (|Ĉ|≠1) to review.
3. Implement the capacity constraint: on high-volume slates, dynamically raise α(t) to cap review queue at Garrett's bandwidth (the ρ<1 rule).
Effort: 3–5 days, leveraging existing cqr.ts.

## 12. Reproducible test
Dataset: engine picks 2023–2025, binary cover/not-cover. Build marginal vs Mondrian conformal sets (α=0.10) on a calibration split; verify marginal minority coverage collapses on rare outcomes and Mondrian restores it. Then run the cost comparison: Mondrian + deferral vs Bayes-τ* vs confidence rejector on 2025 with calibrated C_FP/C_FN/C_rev. Pass if Mondrian restores minority coverage within ±3 pp of target and cost-controlled deferral beats Bayes τ* by ≥20%.

## 13. Acceptance / rejection gate
ADOPT if Mondrian restores minority-class coverage on GSE's rare-outcome picks and cost-controlled deferral beats the current threshold gate by ≥20% expected cost. REJECT if sports outcome imbalance is mild enough that marginal and Mondrian coverage differ by <5 pp — then the paper's headline mechanism doesn't bite, and the current gate stands.

## 14. Improvement experiment
Test the paper's own flagged future direction: online adaptive Mondrian quantiles q_y(t) updated with adaptive learning rates under weekly regime drift — the paper's static-quantile design is known to break under drift, and sports is drift. Also: extend to the K=3 outcome space (cover/push/not-cover) with hierarchical Mondrian partitions, which the paper explicitly leaves open.
