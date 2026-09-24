# [2010] DAVED: Data Acquisition via Experimental Design for Data Markets (arXiv:2403.13893)

**Citation:** Lu, C., Huang, B., Karimireddy, S. P., Vepakomma, P., Jordan, M. I., Raskar, R. (2024). *DAVED: Data Acquisition via Experimental Design for Data Markets*. MIT / UC Berkeley / USC / MBZUAI. arXiv:2403.13893. URL: https://arxiv.org/abs/2403.13893
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT
**Verdict rationale:** Data acquisition as V-optimal experimental design aimed at the buyer's *unlabeled* test queries — no validation labels needed, budget- and cost-aware, federated-friendly, and it beats Data Shapley head-to-head while proving Shapley-style validation-based selection suffers "inference after selection" (worst-case gap ≳ σ²d/n_val, as bad as training on the validation set alone). The data-valuation upgrade over ledger 2005's Data Shapley; needs adaptation from linear/eNTK features to GSE's model embeddings.

## 1. Research question
In a data market, how should a buyer with a budget B and *unlabeled* test queries select the most valuable seller datapoints — without the centralized access, labeled validation data, and repeated retraining that current data-valuation methods require — while weighing each datapoint's price against its benefit?

## 2. Dataset / schema
Synthetic Gaussian seller data (1K/5K/100K points) + four real datasets: MIMIC-III (length of hospital stay from 48 attributes), RSNA Pediatric Bone Age (hand X-rays, CLIP ViT-B/32 embeddings), Fitzpatrick17K (dermatology images, CLIP embeddings, 6-point skin-tone target), DrugLib (drug reviews, GPT-2 embeddings, 1–10 ratings). Buyer test queries are random held-out points (100 buyers per experiment); validation-based baselines get 100 labeled validation points.

## 3. Method / model
Step 1 — linearize: assume y = θ*ᵀφ(x) + ε with fixed features φ (eNTK or DNN embeddings). Step 2 — V-optimal experimental-design proxy: for selection w ∈ {0,1}ⁿ, expected test error ≈ L̂^ED(w) = (1/m)Σ_i (x_i^test)ᵀ I(w)† (x_i^test), where I(w) = Σ_j w_j x_j x_jᵀ is the Fisher information matrix — computable from X_train and X_test alone, no labels, no validation set. Step 3 — Frank-Wolfe herding on the convex continuous relaxation: w̃_{t+1} = (1−α_t)w̃_t + α_t e_{j_t} with j_t = argmax_j(−∇_{w_j}L̂/c_j); negative gradient g_j = (1/m)Σ_i ((x_i^test)ᵀ I(w_t)† x_j^train)²; inverse information matrix P_t maintained by Sherman–Morrison rank-one updates; line search on α_t; O(log t₀/t₀) approximation to the NP-hard integer optimum. Step 4 — federated: sellers compute gradients locally; O(d) communication per round. Single-step variant: top-k of Σ_i[(x_i^test)ᵀ P_0 x_j]² — fastest, still strong. Final: sample by w_T without replacement until budget B exhausts. Recommends 1–8 test points per query, 2–5× budget optimization steps.

## 4. Equations & assumptions
- True objective: min_{w∈{0,1}ⁿ} (1/m)Σ_i E[l(f_θ̂(w)(x_i^test), y_i^test)] s.t. Σ_j w_j c_j ≤ B (Eq. 1) — unsolvable without test labels.
- V-optimal proxy: L̂^ED(w) = (1/m)Σ_i (x_i^test)ᵀ I(w)† (x_i^test) (Eq. 4).
- FW selection: j_t = argmax_j (−∇_{w_j}L̂(w_t)/c_j) (Eq. 5–6); g_j = (1/m)Σ_i((x_i^test)ᵀP_t x_j^train)² (Eq. 7); P_{t+1} via Sherman–Morrison (Eq. 8).
- Informal Theorem A.1: validation-based selection gap ≳ σ²d/n_val worst case — "we would get the same error scaling if we threw away the training data and trained on the n_val validation datapoints alone."
- Assumptions: shared conditional D_{y|x} between train/test; linear/eNTK feature approximation adequate (cites fine-tuning-dynamics evidence); costs known; test covariates available.

## 5. Features / target
φ(x): eNTK or DNN embeddings (CLIP ViT-B/32, GPT-2 in experiments). Targets: regression (stay length, bone age, rating, skin tone).

## 6. Validation design
vs. Data Shapley, LOO, Influence Functions, DVRL, LAVA, KNN-Shapley, Data-OOB, random; 100 buyers per setting; metrics = buyer test MSE at budgets 1–10 (Gaussian/MIMIC) / 1–100 (embedded sets); heterogeneous costs c∈{1..5} with √c and c² cost functions + cost-dependent label noise (30%); runtime scaling to 100K sellers and varying d; ablations on regularization, buyer batch size, #steps, FW vs. convex solver, fine-tuning vs. linear probe.

## 7. Numerical results / baselines
- DAVED (multi-step) best on every dataset: Gaussian 100K sellers 0.16 vs. random 1.01 (Shapley/LOO N/A — exceeded runtime); MIMIC 0.37 vs. random 1.38 vs. Data Shapley 0.87; RSNA 171.4 vs. random 283.7; Fitzpatrick 785.2 vs. random 1309.1; DrugLib 9.2 vs. random 21.4. Single-step DAVED second-best in most settings and fastest overall.
- Heterogeneous costs (Table 2): multi-step DAVED wins under both √c and c² (e.g., Gaussian: 0.04/0.2 vs. random 2.26/77.7/288.3); cost-awareness genuinely buys budget efficiency on noisy data.
- Validation-based methods sometimes underperform *random* (Fig. 2) — the overfitting phenomenon the theorem predicts; second-best method overall is Data-OOB, the only other validation-free baseline.
- Runtime: orders of magnitude faster than Data Shapley; single-step faster than KNN-Shapley/LAVA; scales to 100K sellers; iterative FW ≈ convex-solver accuracy at orders-of-magnitude speedup.

## 8. Code / data availability
Not stated in the extracted text; datasets are public (MIMIC-III, RSNA, Fitzpatrick17K, DrugLib).

## 9. Leakage & limitations
- Acknowledged: linear/eNTK approximation may be poor for some models; per-step seller communication (FedAvg/Scaffold-style local steps as future work); test-batch size affects optimization (keep 1–8 queries); moderate regularization λ∈[0.2,0.6] helps.
- Buyer test queries in experiments are drawn from the same distribution as sellers — the motivating distribution-shift case (buyer ≠ seller distribution) is argued but not the evaluated regime.
- Cost-dependent label noise (β=30%) is synthetic; real cost-quality correlation untested.
- No classification extension demonstrated (regression-derived; "procedure can be extended to general linear models").

## 10. GSE overlap
Directly upgrades ledger 2005 (Data Shapley for batch AL): same data-valuation job, but DAVED is validation-free, test-query-adaptive, cost-aware, and scales — and the paper proves the Shapley/validation paradigm can be *worse than random* in exactly GSE's regime (small validation-like recent-game sets, high-dimensional features). Complements ledgers 2007/2008 (cost-aware acquisition) with a principled *which historical games to train on* rule. New capability (test-targeted training-data acquisition), not a duplicate.

## 11. GSE implementation spec
- Reframe weekly model training as the data market: buyer test queries = *this week's slate* (unlabeled by definition — games unplayed), seller pool = historical games with charting costs c_j, budget B = weekly compute/charting dollars.
- Features φ(x): current model embeddings (or GBM leaf-encodings / last-layer features); run FW herding (Eq. 6–8) or the single-step variant to select the training subset minimizing V-optimal proxy error on this week's slate; train the week's head on the selected subset.
- This replaces "train on last N weeks / all history" with "train on the history most informative for *these specific matchups*" — a formalization of recency+matchup-similarity weighting with a cost knob.
- Compose with ledger 2008: the same budget B governs both training-data acquisition (DAVED) and new charting acquisition (ConBatch-BAL) — split B between them by the marginal proxy-loss reduction each buys.
- Effort: ~1 week (embedding pipeline + FW loop with Sherman–Morrison; single-step variant is a day).

## 12. Reproducible test
2024 season walk-forward: each week, test queries = that week's games (features known pre-kickoff), seller pool = all prior games since 2021 with costs c∈{1,2,5}; select training subset with single-step DAVED under budget B = 300 game-cost units; train spread-margin GBM; compare vs. train-on-last-300-games and vs. Data-Shapley-selected 300 (ledger 2005) on that week's ATS log-loss. Baseline to beat: recency window.

## 13. Acceptance / rejection gate
ADOPT DAVED-selected training sets iff they beat the recency-window baseline by ≥ 0.003 weekly ATS log-loss averaged over the 2024 season AND beat it in ≥ 10 of 18 weeks (consistency — the method claims adaptivity per query, so it should win more weeks than it loses), with the win holding under both cost functions (√c, c²). REJECT if DAVED ≈ recency (linear/eNTK proxy adds nothing over time-decay) or if it underperforms random selection in any 4-week stretch (their Fig. 2 failure mode for validation methods, applied as the canary).

## 14. Improvement experiment
Hybrid selector: DAVED's V-optimal term for matchup-relevance plus an explicit recency prior folded into the initial weights w_0 (instead of uniform 1/n, initialize w_0 ∝ exp(−age/τ)) before FW herding. Test whether recency-initialized DAVED beats uniform-initialized DAVED on weekly ATS log-loss — hypothesis: the linear proxy underestimates non-stationarity (coaching changes, injuries), and a recency prior corrects it; τ becomes a tunable "football memory" parameter, ablated over {4, 8, 17, 34} weeks.
