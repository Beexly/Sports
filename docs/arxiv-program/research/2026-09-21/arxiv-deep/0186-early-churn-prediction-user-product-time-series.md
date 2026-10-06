# [0186] Early Churn Prediction from Large Scale User-Product Interaction Time Series (arXiv:2309.14390v1)

**Citation:** Shamik Bhattacharjee, Utkarsh Thukral, Nilesh Patil (2023). *Early Churn Prediction from Large Scale User-Product Interaction Time Series*. arXiv:2309.14390v1. URL: https://arxiv.org/abs/2309.14390v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 696 lines).
**Verdict:** ADAPT — port the 30-day → 4-week multivariate churn formulation with a Transformer encoder to GSE's audience/subscriber retention problem, replacing Dream11's transaction features with GSE engagement features and enforcing time-ordered splits, which the paper itself does not use.

## 1. Research question
Can customer churn in a non-subscription, transaction-heavy business (Dream11 fantasy sports) be predicted as multivariate time-series classification — using the past 30 days of user-product interaction to predict churn probabilities for each of the next four weeks — with deep models that learn features automatically, outperforming classical models that require extensive domain-driven feature engineering? A secondary production motive: feature-engineering pipelines consume >70% of inference time at ~10^8-user scale, so reducing that cost matters.

## 2. Dataset / schema
Dream11 proprietary data, not public. User transaction-history records from **2018-01-01 to 2020-12-31**; a random sample yielding **~10^6 distinct users and ~10^8 raw transactions** of various types. Raw schema (Table 1): Transaction ID, User ID, Timestamp, Feature Vector per transaction. Processing pipeline: Level-01 features = day-level aggregates (count, sum, mean) per user per day (Table 2: User ID, Date, Feature Vector, No. of Transactions); Level-02 features = 30-day aggregations (mean μ, std σ) for classical models. **Eleven features were shortlisted from a large pool via EDA and domain knowledge, but the eleven are not individually named in the paper.** Sporting events are deliberately excluded ("we are not doing analysis for individual sporting events"). Not replicable outside Dream11.

## 3. Method / model
Two approaches (§3.3):
- **Approach 1 — Classical ML:** aggregate the 30-day window into Level-02 vector Gi = {μi,1, σi,1, ..., μi,N, σi,N}; predict P(Ci|Gi) = Model(Gi) (Eq. 1) with Logistic Regression, Random Forest, or Gradient Boosting Trees.
- **Approach 2 — Deep learning:** treat the 30 days as a multivariate sequence Fi = [f⃗t−30, ..., f⃗t−1]; predict P(Ci|Fi) = Model(Fi) (Eq. 2) with: vanilla/VGG-like CNN; CNN with kernel width = n_features (cross-feature interactions within a day); CNN with kernel height = τ = 30 (long-term patterns); custom **Inception-ResNet hybrid** (9 inception blocks, kernels 3×3/5×5/7×7, ~2.4M params; InceptionTime variant tried and deteriorated); scaled-down **ConvNeXt** (~0.8M params); **5-layer LSTM** + 2-dense head (~1M params); and a scaled-down **Vision-Transformer-style encoder-only Transformer** (8 self-attention blocks, ~1.8M params, no decoder).
- **Training (§5):** PyTorch, Adam, lr fixed at 1e-4, global batch 16K (~4K/GPU), 100 epochs (metrics plateau after ~20, no gain after 50), grid search over hyperparameters on validation, BatchNorm + Dropout (p 0.1–0.4), distributed via Horovod on **4× Nvidia A10**, data via Petastorm from S3. Training time: CNN ~6 h, Transformer ~13 h.

## 4. Equations & assumptions
Quoted faithfully from the paper:
- Training objective: min_θ Σ_i=1^N Σ_j=1^4 (yij − gj(θ; Xi))² (MSE over users × 4 weeks).
- Approach 1: P(Ci|Gi) = Model(Gi) (Eq. 1). Approach 2: P(Ci|Fi) = Model(Fi) (Eq. 2).
- Level-02 aggregation: μi,j = (1/30) Σ_k=0^29 fi,k,j; σi,j = sqrt((1/30) Σ_k=0^29 (fi,k,j − μi,j)²); Gi = {μi,1, σi,1, ..., μi,N, σi,N}; Yi = {yi,1, ..., yi,4}.
- Label: yi,w = 1 if user i has no activity in week w, else 0.
- Metrics: TPR = TP/(TP+FN) (Eq. 3); FPR = FP/(FP+TN) (Eq. 4).
Stated assumptions: churn = a full week of inactivity (acknowledged not to capture reduced-but-nonzero activity); user behavior is driven by factors outside platform control (e.g., marquee international events cannibalizing smaller events); the 30-day input window and 4-week horizon are business-chosen, not derived.

## 5. Features / target
Input features: the eleven shortlisted Level-01/Level-02 features (not individually listed in the paper — a gap I do not fill). Target: binary churn vector Yi = [yweek1, yweek2, yweek3, yweek4] (Eq. §4), where yweek_w = 1 iff the user has zero activity in week w after the 30-day window. Prediction horizon: 4 weekly churn probabilities from 30 days of history.

## 6. Validation design
Train/validation/test ratio **0.75 / 0.05 / 0.20** over the sampled users — a **random split, not time-ordered** (no dates given for splits; all data spans 2018–2020 uniformly). Hyperparameter grid search on the held-out validation set. Baselines: LR, RF, GBT (classical) compared against all deep variants. Metrics: ROC curves and AUC per week (Table 3, Fig. 1), plus Precision–Recall curves (discussed, not numerically tabulated). The paper notes label skew of **2× to 10×** across weeks, which is why PR curves separate models more than ROC does.

## 7. Numerical results / baselines
Table 3 (AUC per churn week W01–W04), quoted exactly:
- LR: 0.644 / 0.749 / 0.672 / 0.662
- RF: 0.640 / 0.775 / 0.699 / 0.687
- GBT: 0.646 / 0.773 / 0.703 / 0.694
- CNN: 0.797 / 0.705 / 0.686 / 0.675
- ConvNeXt: 0.835 / 0.751 / 0.729 / 0.717
- Inception-ResNet: 0.819 / 0.729 / 0.704 / 0.696
- CNN H=τ: 0.807 / 0.742 / 0.725 / 0.716
- CNN W=N: 0.822 / 0.747 / 0.728 / 0.729
- LSTM: 0.800 / 0.742 / 0.727 / 0.721
- **Transformer: 0.858 / 0.756 / 0.732 / 0.716**
Paper's headline claim (my distinction: claim, not my inference): the Transformer is the best model, showing "**~6% improvement on an average across all time periods** compared to best performing GBT model." Classical models "under-perform substantially" vs. the Transformer. PR curves show "substantial difference between each model variant," with classical models' ROC looking competitive in places but PR revealing poor performance under class imbalance. Note the oddity in the table that I preserve rather than smooth: classical models beat deep models on W02 AUC (RF 0.775, GBT 0.773 vs Transformer 0.756) — the paper's "~6% average" claim rests on the other three weeks.

## 8. Code / data availability
None stated — no repository, no dataset release; all data is Dream11-proprietary.

## 9. Leakage & limitations
Adversarial view: (1) **Random user split, not time-ordered**, over a 2018–2020 window that includes the COVID-19 regime shift in sports — no temporal generalization test, so reported AUCs may not hold forward in time; this is the design's biggest weakness for GSE use. (2) The eleven selected features are never named, so the experiment is not reproducible even in principle. (3) Grid-search details (search space, selection metric, number of trials) are not reported — data-snooping risk on the validation set. (4) The label definition (full week of inactivity) misses partial churn and is acknowledged as incomplete. (5) AUC is reported but churn interventions need calibrated probabilities under 2–10× skew — no calibration analysis. (6) Sporting-event features are excluded by design, yet the paper itself argues events drive churn — a contradiction that caps the ceiling. (7) The "~6% improvement" averages over weeks where GBT actually wins W02. (8) External validity to GSE: Dream11's daily-transaction user base is far denser than GSE's audience engagement signal; sparser inputs may not support the same gains.

## 10. GSE overlap
Checked `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. No overlap: the map contains no churn, retention, or customer-lifetime work in the Sports repo, Drive files, or Gmail threads. Not a duplicate, not an extension — a **new capability** for GSE's audience/revenue operations: predicting which site visitors, newsletter subscribers, or affiliate-clickers go inactive, so retention effort (content, promos, Kit upsells) can be targeted. Adjacent to the standing autonomous-money mandate (retention is revenue), but nothing in the corpus covers the method.

## 11. GSE implementation spec
Concrete build plan:
- **Data:** first-party engagement events — site pageviews, newsletter opens/clicks, X engagement with @GalaxySportsHQ, Kit-page visits. Build per-user daily aggregates (Level-01 analog) over trailing 30 days.
- **Features:** daily counts of each engagement type + recency features; Level-02 μ/σ aggregates for the classical baseline.
- **Models:** GBT baseline (LightGBM) on Level-02 aggregates; Transformer encoder (scaled-down, ~1–2M params, mirroring the paper's 8-block design) on the 30-day sequences, 4 sigmoid heads for weeks 1–4.
- **Training:** time-ordered split (train on months 1–9, validate month 10, test months 11–12 — fixing the paper's random-split weakness); Adam, early stopping on validation mean AUC; class weighting for skew.
- **Serving:** weekly batch scoring of the audience; scores feed the retention playbook (win-back content, promo targeting).
- **Estimated effort:** ~3 engineer-weeks (data pipeline dominates).

## 12. Reproducible test
- **Dataset:** GSE's own engagement logs, trailing 12 months; churn = zero engagement for a full week (same definition as the paper).
- **Metric:** AUC per week W01–W04; **baseline:** GBT on aggregated features (the paper's best classical model).
- **Window:** time-ordered — train months 1–9, validate month 10, test months 11–12.
- Runnable: yes, all first-party data.

## 13. Acceptance / rejection gate
**ADAPT if:** the Transformer encoder beats the GBT baseline by **≥ 0.03 AUC on at least 3 of the 4 weeks** on the time-ordered test window; **reject otherwise** (keep the cheaper GBT). Gate evaluated before any production scoring. Note the paper's own W02 result (GBT winning) is the reason for the 3-of-4 requirement rather than a mean-improvement rule.

## 14. Improvement experiment
Add the covariates the paper deliberately excluded: **exogenous event features** — NFL schedule intensity (primetime games, bye weeks), GSE content calendar, and promo drops — as additional input channels to the Transformer. The paper argues marquee events drive churn through "unexpected secondary and tertiary interactions" yet models users in a vacuum; test whether event-aware inputs lift W03/W04 AUC (where the paper's models degrade fastest: 0.732/0.716) by ≥ 0.02. This goes beyond the paper by modeling the cause it names but does not use.
