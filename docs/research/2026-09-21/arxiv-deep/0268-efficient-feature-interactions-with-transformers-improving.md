# 0268 Efficient Feature Interactions with Transformers: Improving User Spending Propensity Predictions in Gaming (arXiv:2409.17077v1)

**Citation:** Ved Prakash and Kartavya Kothari (2024; all authors contributed equally). *Efficient Feature Interactions with Transformers: Improving User Spending Propensity Predictions in Gaming*. arXiv:2409.17077v1. URL: https://arxiv.org/abs/2409.17077v1
**Ledger completed:** 2026-09-21. **Read:** full text (local extract, 1,104 lines, including references).
**Verdict:** ADAPT — the proximity-aware contextual transformer (FT-Transformer + structured feature-relationship embeddings) is a concrete architecture upgrade for GSE's tabular models, and its feature-engineering idea (neighboring-round context windows) ports directly to play/drive-level NFL features; the Dream11 spending numbers themselves do not transfer.

## 1. Research question

On Dream11 (a 200M+ user fantasy-sports real-money-gaming platform), the authors ask: can a deep-learning architecture designed for tabular data beat gradient-boosted trees and existing tabular transformers at predicting a user's spending propensity in a gaming round, for downstream upselling and personalized product listing? They benchmark MLP, ResNet, TabTransformer, FT-Transformer, and GBDTs, and propose a "Proximity-Aware Contextual Transformer" that explicitly structures feature relationships (statistical correlations, temporal patterns, contextual proximity) instead of leaving the network to discover them.

## 2. Dataset / schema

- **User Round Spends data (proprietary, Dream11):** train 7,074,749 tuples; validation 1,165,011; test 831,583.
- **Schema:** 21 categorical features; 60 proximity-aware contextual features; 120 numerical features; regression task (spending propensity).
- **Feature groups:** U (user features — demographics U_d, aggregated past winnings U_w, wallet balance U_b, ...); R (game/round features — game type R_g, expected active round users R_u, ...); C (proximity-aware features — game features of rounds before and after the current round, C_t for t−5 to t+5 around current round t).
- **Access:** proprietary; no public release. Scale (millions of rows, hundreds of features) is the paper's key context — the authors note most tabular-DL benchmarks use far smaller data.

## 3. Method / model

1. **Proximity-Aware Contextual Transformer** (adaptation of FT-Transformer): a Feature Tokenizer maps each feature x_j to an embedding T_j = b_j + f_j(x_j) ∈ ℝ^d — numerical features via element-wise multiplication with W_j^(num) ∈ ℝ^d, categoricals via lookup W_j^(cat) ∈ ℝ^{S_j×d} — stacked to T ∈ ℝ^{k×d}; the token sequence (plus [CLS]) goes through a standard Transformer stack, and the [CLS] representation feeds the regression head. The novelty is feeding explicitly constructed proximity-aware contextual features (the t−5..t+5 round window) as first-class tokens so self-attention models feature relationships the authors argue plain FT-Transformer misses at high feature counts.
2. **Benchmarks:** MLP, ResNet, TabTransformer, FT-Transformer (all per Gorishniy et al. 2023 configurations), XGBoost and CatBoost (label-encoded categoricals; embeddings for DL models, consistent embedding size).
3. **Training protocol:** standardization/normalization of continuous features, no target normalization; Optuna Bayesian optimization for hyperparameters (validation-set selection, test never touched); 10 random seeds per configuration, average reported. Deliberately no model-agnostic DL tricks (no pretraining, augmentation, distillation, LR warmup/decay) — the comparison isolates architectural inductive bias.

## 4. Equations & assumptions

Paper's mathematics, quoted faithfully:

- Problem: learn f with P = f(U, R, C); dataset D = {(U_i, R_i, C_i, P_i)}_{i=1}^N; predictions P̂_i = f(U_i, R_i, C_i) ∀ i ∈ {1,...,N}; objective L̂ = min_f Σ_{i=1}^N L(P_i, P̂_i).
- Feature groups: U = {U_d, U_w, U_b, ...}, R = {R_g, R_f, R_u, ...}, C = {R_{t−5}, ..., R_{t+5}, ...}.
- Feature tuple: x ≡ {x_cat, x_cont, x_context}, x_cont ∈ ℝ^c, x_context ∈ ℝ^s; x_cat ≡ {x_1, ..., x_m}.
- Tokenizer: T_j = b_j + f_j(x_j) ∈ ℝ^d, f_j: 𝕏_j → ℝ^d; T_j^(num) = b_j^(num) + x_j^(num)·W_j^(num) ∈ ℝ^d; T_j^(cat) = b_j^(cat) + x_j^(cat)·W_j^(cat) ∈ ℝ^d; T = stack[T_1^(num), ..., T_{k^(num)}^(num), T_1^(cat), ..., T_{k^(cat)}^(cat)] ∈ ℝ^{k×d}.
- Split: D = D_train ∪ D_val ∪ D_test (disjoint).

Assumptions: the t±5 round window captures the relevant temporal context; statistical/temporal/contextual feature relationships are usefully pre-structured rather than learned; 10-seed averaging adequately captures optimizer variance; the no-tricks protocol fairly isolates architecture effects.

## 5. Features / target

**Inputs:** 21 categorical + 120 numerical + 60 proximity-aware contextual features (user demographics/winnings/wallet; game type/expected users; neighboring-round game features t−5..t+5). **Target:** user's spending propensity in a gaming round (continuous, regression; exact monetary definition not disclosed). **Horizon:** the current gaming round.

## 6. Validation design

Single time-agnostic split (train/val/test sizes above; dates not given — not stated to be time-ordered). Hyperparameters via Optuna Bayesian optimization on validation; test used once. Metrics: MAE and MSE, each averaged over 10 seeds. Baselines: GBDT (XGBoost/CatBoost labeled "GBDT Baseline"), MLP, ResNet, TabTransformer, FT-Transformer — all tuned under the same protocol. Additional analysis: performance vs training-set fraction (Table 3 / Figure 3) for the proposed model and FT-Transformer.

## 7. Numerical results / baselines

All numbers are the paper's:

- **Table 2 (test MAE / MSE):** GBDT Baseline 42.4 / 500.35; MLP 40.4 / 362.53; ResNet 41.34 / 397.48; TabTransformer 37.99 / 442.74; FT-Transformer 38.07 / 448.90; **Proximity-Aware Contextual Transformer 37.13 / 351.01** (best on both).
- **Headline claim:** the proposed model beats FT-Transformer by 2.5% on MAE and 21.8% on MSE — verified: (38.07−37.13)/38.07 = 2.47%; (448.90−351.01)/448.90 = 21.8%.
- **Table 3 (train-size fraction → MAE):** 0.05 → 38.56; 0.15 → 37.56; 0.3 → 37.54; 0.4 → 37.43; 0.5 → 37.13; 0.7 → 36.95; 0.8 → 36.86; 0.9 → 36.78. Monotone improvement; the proposed model reaches FT-Transformer's full-data performance at smaller fractions (faster convergence, per Figure 3 with seed error bars).
- **Authors' error-distribution reading:** MLP has higher MAE but relatively low MSE (fewer extreme errors); TabTransformer/FT-Transformer have good MAE but worse MSE than the proposed model (more large errors).
- **Discussion claims (not empirically isolated):** robustness to uninformative features, reduced sample complexity via broken rotational invariance from embeddings — argued from literature (Grinsztajn et al. 2022; Ng 2004), not ablated in this paper.

## 8. Code / data availability

Paper states: "The code and all the details of the study are open sourced" — but no URL is given in the extract. Data is proprietary Dream11 data, not released. Effectively: code availability asserted, not linked; data unavailable.

## 9. Leakage & limitations

- **Split not time-ordered (as far as stated).** For a spending-propensity task with temporal drift, a random split leaks future behavior patterns into training; the authors don't state dates, so temporal validity is unknown.
- **No ablation of the novelty.** The paper never isolates *what* drives the gain: the t±5 contextual features, the joint-training scheme, or just more parameters. An FT-Transformer *with* the contextual features as plain inputs is the missing baseline — without it, the architectural claim is unproven.
- **Proprietary, single-domain data.** One platform, one task, undisclosed target definition — no external replication possible; the 2.5%/21.8% deltas may not survive outside Dream11.
- **Weak GBDT baseline.** "GBDT Baseline" is a single MAE/MSE row with no tuning details comparable to the Optuna treatment the DL models got — the GBDT-vs-DL framing the paper downplays may still be undertuned.
- **No calibration or uncertainty.** Point predictions only; for a propensity used in upsell/incentive decisions, uncalibrated outputs are a product risk the paper ignores.
- **Discussion overclaims.** The rotational-invariance/sample-complexity arguments are literature citations, not experiments — the paper presents them as explanations without ablative evidence.

## 10. GSE overlap

**Extension of covered ground.** The existing-research map shows: the 2026-09-18 ML brief commissions "tabular learners" as an area; the Drive 58-paper dossiers already include a TabTransformer event-representation paper (2606.09327, read in depth); and GSE's production models are XGBoost-style tabular learners (nflfastR lineage). What this paper adds that the corpus lacks: (1) the **proximity-aware contextual feature pattern** — explicitly windowing neighboring events (t−5..t+5) as first-class features, which ports beautifully to NFL play/drive sequences; (2) a worked large-scale (7M-row, 201-feature) DL-vs-GBDT benchmark protocol with Optuna tuning and 10-seed reporting that GSE can copy for its own model comparisons; (3) the feature-tokenizer equations as a concrete FT-Transformer implementation reference. It does not duplicate anything — no corpus item covers contextual-window feature design for tabular sports models.

## 11. GSE implementation spec

1. **Feature idea first (cheapest win):** port the C-feature pattern to nflverse play-by-play — for each play, build rolling-window features over the previous/next 5 plays (or drives): EPA momentum, success-rate trend, personnel/score-delta trajectory. Feed these as ordinary features into GSE's existing XGBoost models. This requires no architecture change and tests whether the paper's real contribution is feature engineering, not transformers.
2. **Architecture second:** implement the Proximity-Aware Contextual Transformer (tokenizer equations in §4 + standard Transformer encoder + [CLS] head) for a GSE tabular task with natural context windows — e.g., drive-outcome prediction or player-prop regression — and benchmark against the tuned XGBoost baseline under the paper's own protocol (Optuna, 10 seeds, MAE/MSE or log loss).
3. **Fix the paper's missing baseline:** run FT-Transformer *with* the contextual features included, to isolate architecture vs features — the ablation the authors skipped.
4. **Serving:** batch inference (nightly/weekly slates); the Transformer is heavier than GBDT, so keep GBDT as the latency-sensitive path and use the transformer where its measured edge justifies the cost.
5. **Effort:** 2–3 days for the rolling-window features on existing models; 1–2 weeks for the transformer implementation + benchmark.

## 12. Reproducible test

On nflverse 2016–2024, drive-outcome prediction (points scored on the drive): baseline = tuned XGBoost on standard play features; challenger A = XGBoost + t±5 play-window contextual features (the paper's C-pattern); challenger B = the Proximity-Aware Contextual Transformer on the same feature set. Train 2016–2021, validate 2022, test 2023–2024 (time-ordered — fixing the paper's unstated split). Metric: MAE and MSE on drive points, 10 seeds. Success = challenger A or B beats baseline XGBoost on both MAE and MSE with non-overlapping seed intervals; the A-vs-B comparison then answers the paper's unasked question (features vs architecture).

## 13. Acceptance / rejection gate

ADAPT in two stages. Stage 1 (features): adopt the t±5 contextual-window features if challenger A beats baseline XGBoost on 2023–2024 test MAE by ≥ 1% with non-overlapping 10-seed intervals — cheap, reversible, no architecture risk. Stage 2 (architecture): adopt the transformer only if challenger B beats *both* baseline and challenger A by ≥ 1% MAE *and* the inference cost stays within the nightly batch budget. REJECT the architecture if B cannot beat A (the paper's gain was feature engineering all along), and never quote the 2.5%/21.8% Dream11 deltas as expected GSE gains — they are single-domain, single-split numbers on undisclosed targets.

## 14. Improvement experiment

Go beyond the paper on its weakest axis: **time-aware contextual attention.** The paper's t±5 window is position-based, but game time is irregular — 5 plays can span 30 seconds or 8 minutes, and a window crossing halftime or a quarter boundary mixes regimes. Experiment: replace fixed positional windows with *time-decayed* contextual features (exponential decay on game-clock distance) and let the transformer's attention see explicit inter-play time gaps as an additional token feature. If the model is truly capturing "proximity-aware" relationships, time-aware proximity should beat position-aware proximity on drive-outcome prediction — and it directly tests whether the paper's "proximity" concept was the right formalization. A second axis: add the calibration the paper ignored — isotonic/temperature-scaled outputs with ECE reporting — since any propensity GSE publishes must be calibrated, not just low-MAE.
