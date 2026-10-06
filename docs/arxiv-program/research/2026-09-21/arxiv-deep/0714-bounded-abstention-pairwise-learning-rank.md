# [0714] Bounded-Abstention Pairwise Learning to Rank (arXiv:2505.23437v2)

**Citation:** Antonio Ferrara, Andrea Pugnana, Francesco Bonchi, Salvatore Ruggieri (2025). *Bounded-Abstention Pairwise Learning to Rank*. arXiv:2505.23437v2. URL: https://arxiv.org/abs/2505.23437v2
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache, /tmp/arxiv750-cache/fulltext/2505.23437.txt) — read the complete paper including theory (Theorems 3.1–3.2, Proposition 3.3), BALToR algorithm, full experiments on three datasets, limitations, and Appendix A proofs.
**Verdict:** ADAPT — plug-in conditional-risk abstention rule is directly portable to GSE's pick-selection/abstention pipeline; the "coverage budget" framing converts to a posted-pick volume constraint.

## 1. Research question
How should a *given* pairwise learning-to-rank model decide when to abstain from a pairwise comparison (defer to a human) so that accuracy on the remaining pairs is maximized, under a hard constraint that at least a fraction c of pairs must be ranked? The paper distinguishes this bounded-abstention formulation from cost-based abstention (Chow-style reject cost), which is impractical because the cost of abstaining vs. erring is context-dependent and hard to set (Ruggieri & Pugnana 2025, cited in paper).

## 2. Dataset / schema
Three public LETOR/IR ranking datasets, using their five default folds (train/calibration/test predefined):
- **Web-30k** (Qin & Liu 2013): >30,000 queries, ~125 assessed documents/query, 136 features per query-doc pair; relevance judgments 0–4 from retired Microsoft Bing labels.
- **OHSUMED** (Hersh et al. 1994): 106 queries, 16,140 query-doc pairs, 25-dim features (tf-idf, BM25); 3 relevance grades.
- **MQ2007** (TREC 2007 Million Query track): 1,700 queries, 46 features (BM25, PageRank, HITS); relevance 0–2.
No NFL/sports data. All publicly available.

## 3. Method / model
**BALToR (Bounded-Abstention Learning To Rank)** — a model-agnostic, plug-in algorithm:
1. Take a trained ranker f (their experiments use LambdaMART defaults from XGBoost/CatBoost/LightGBM, probabilities from Bradley-Terry or Thurstone-Mosteller tie-adjusted models).
2. On a held-out calibration set D_cal, compute for each pair the conditional risk r̂(x,x') = 1 − max_y p̂(y|x,x') (the estimated pairwise error probability).
3. Set β̂_c = c-th empirical quantile of the calibration conditional risks.
4. Selection function: g(x,x') = 1 iff (1 − max p̂) < β̂_c, else abstain.

Theory: Theorem 3.1 characterizes the optimal g* as accept pairs with conditional risk below β = the c-th risk quantile, reject above β, and randomized acceptance on the β level set (Theorem 3.2 gives the closed form with Bernoulli(p_r) randomization; under symmetric loss, (x,x') and (x',x) are rejected consistently). Proposition 3.3: for the Bayes ranker f*(x,x')=argmax_y p(y|x,x') under 0–1 loss, conditional risk = 1 − max_y p(y|x,x'). Assumption: symmetric loss l(f(x,x'),y) = l(f(x',x),−y).

## 4. Equations & assumptions
- Selective risk: R_l(f,g) = E[l(f(X,X'),Y)·g(X,X')]/φ(g), coverage φ(g)=E[g(X,X')], optimize subject to φ(g) ≥ c.
- β = inf{a: ∫∫_{r(x,x')<a} p(x,x') dx dx' ≥ c} (c-th conditional-risk quantile).
- Tie-adjusted Bradley-Terry: P̂(Y=1|x,x') = e^{s(x)}/(e^{s(x)} + θe^{s(x')}), P̂(Y=0|·) = (θ−1)²e^{s(x)}e^{s(x')}/((θe^{s(x)}+e^{s(x')})(e^{s(x)}+θe^{s(x')})) with θ=e^{ε}.
- Thurstone-Mosteller: P̂(Y=1)=Φ(s(x)−s(x')−ε), P̂(Y=0)=Φ(Δs+ε)−Φ(Δs−ε).
- Tie parameter fixed θ = 2·n_pairs/n_no-ties − 1 (Rao & Kupper 1967 suggestion).
- Assumptions: symmetric loss; human can correctly resolve deferred pairs (flagged as limitation — "learning to defer" with fallible humans is unexplored); given fixed ranker; ambiguity rejection only (no novelty/OOD rejection).

## 5. Features / target
Not feature-centric (ranker given). Inputs: pairs of instances with learned scores s(x); target space 𝒴={−1,0,1} (second preferred / tie / first preferred); target coverages c ∈ {.99,.95,.90,.85,.80,.75,.70}.

## 6. Validation design
Five default folds per dataset with predefined train/calibration/test. LambdaMART default hyperparameters. Baselines: (i) entropy-based abstainer (threshold entropy of predicted probabilities), (ii) random abstainer (uniform selection of fraction c). Metrics: accuracy A_cc on selected pairs; empirical coverage Cov at target c; SelRate = class distribution {−1,0,1} among selected pairs (bias check).

## 7. Numerical results / baselines
(quoted exactly from §4.2, mean±std over five folds)
- **MQ2007** (XGBoost/LambdaMART): full-coverage accuracy ≈ .679±.004 (BT) and ≈ .683±.004 (TM). At c=.70, BALToR reaches ≈ .706±.004 (BT) and ≈ .713±.004 (TM). Random abstainer flat; entropy erratic.
- **Web-30k**: BALToR-BT Acc ≈ .476±.001 at c=.70 vs ≈ .471±.002 at full coverage; BALToR-TM ≈ .477±.001 at c=.70 vs ≈ .470±.003 at full coverage.
- **OHSUMED**: high inter-fold variance; BALToR-BT Acc ≈ .578±.07 at c=.70 vs ≈ .562±.06 at full coverage; BALToR-TM ≈ .594±.076 at c=.70 vs ≈ .573±.07 at full coverage.
- Coverage fidelity: empirical coverage within ≈ .001 of target on MQ2007/Web-30k (BT and TM); ≈ .002 max on OHSUMED (at c=.75, c=.70).
- Class bias: SelRate stable across coverages (e.g., MQ2007: class-0 ≈ .718–.725±.005, ±1 classes ≈ .138–.143±.007); no concentration of rejections in any class.
Caveat (paper's own): the IR ranking baselines are weak in absolute terms (accuracy 0.47–0.71), so lift magnitudes are illustrative, not benchmarks.

## 8. Code / data availability
Code: https://github.com/Ambress92/Bounded-Abstention-LTR. Datasets public (LETOR/OHSUMED). Runs on 64-core AMD EPYC 7313, 1TB RAM, Ubuntu 22.04.5.

## 9. Leakage & limitations
- Weak base rankers inflate the *relative* abstention gain; with a strong ranker gains may vanish (paper cites Franc et al. 2023, Pugnana et al. 2024: selective prediction adds little on top of strong classifiers).
- No real deferred-evaluation: the "human expert" is assumed oracle; no measured deferred-decision quality.
- IR document pairs, not sports; external validity to NFL pick-ranking untested.
- Ambiguity rejection only; no OOD/novelty abstention.
- Accuracy gains on Web-30k are tiny (≈0.005); OHSUMED results noisy (±0.07).

## 10. GSE overlap
Existing-research map (~/workspace/arxiv-sweep/existing-research-map.md) — verified read 2026-09-21. GSE's known abstention work is conformal: CQR (Drive research doc, cqr.ts clamp bug caught 2026-09-21), conformal win probability (2208.08598), grouping loss (2210.16315), LRD calibration dashboard (2207.13770). This is a *new capability* relative to that stack: a provably optimal pairwise abstention rule with a coverage (volume) budget, plus BT/TM tie-adjusted probability estimation for pairwise probabilities — the latter connects to the sports pairwise literature (Bradley-Terry Elo unification is in the corpus, ledger 0004). Not a duplicate; complementary to the conformal abstention work.

## 11. GSE implementation spec
1. Source pairwise pick data: engine spread/moneyline/total pick lists with engine win probabilities; treat each "post vs skip" slate as pairwise comparisons between candidate picks is overkill — simpler mapping: ranker score = engine edge; conditional risk = 1 − P(edge sign correct), estimated via a calibrated BT-style model on historical engine-edge buckets (tie = push/within closing-line margin).
2. Implement BALToR plug-in: calibration window = last 4 seasons of engine picks (time-ordered, no shuffling); set target coverage c = fraction of slates GSE posts (e.g., c=0.70 of candidate picks); β̂_c from calibration risks; selection rule 1{risk<β̂_c}.
3. Replace the BT/TM probability mapping with GSE's already-calibrated win probabilities (CQR intervals for the spread case).
4. Effort: ~2–3 days engineering + backtest harness; no retraining of the engine model required (plug-in property).

## 12. Reproducible test
Dataset: GSE engine `picks` table (3,411 picks, v5.2.7) plus historical pick log with closing lines; split: calibrate β̂_c on 2020–2023 seasons, evaluate on 2024–2025. Metric: hit rate (ATS cover / ML win) on selected picks at target coverage c=0.70 vs random-selection and confidence-top-70% baselines. Must also reproduce coverage fidelity: empirical coverage within 0.02 of target.

## 13. Acceptance / rejection gate
ADOPT the rule into the posting pipeline only if, on the 2024–2025 test window, BALToR-selected picks beat the random-selection baseline by ≥1.5 pp hit rate at c=0.70 with empirical coverage within 0.02 of target, and beat the existing confidence-top-N rule (if any) by ≥0.5 pp. Otherwise REJECT — fall back to status quo.

## 14. Improvement experiment
Replace the plug-in quantile threshold with a *conformalized* conditional-risk threshold (Mondrian CP on edge-sign class) so the risk estimates carry finite-sample coverage guarantees — the paper's β̂_c has no distribution-free guarantee. Also test listwise extension (abstain on full slates, not pairs) as the paper flags in future work.
