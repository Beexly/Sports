# [0311] Early Churn Prediction from Large Scale User-Product Interaction Time Series (arXiv:2309.14390v1)

**Citation:** Shamik Bhattacharjee, Utkarsh Thukral, Nilesh Patil (2023). *Early Churn Prediction from Large Scale User-Product Interaction Time Series*. arXiv:2309.14390v1 (preprint dated July 1, 2022). URL: https://arxiv.org/abs/2309.14390v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 696 lines).
**Verdict:** ADAPT — the transformer-on-behavioral-time-series pattern is worth porting, but only to GSE's own product/user-retention analytics (subscriber/newsletter churn), never to the sports-prediction engine; the paper's evaluation has temporal-leakage flaws that must be fixed in any port.

## 1. Research question
The paper asks whether deep sequence models (CNNs, LSTMs, Transformers) can predict user churn earlier and more accurately than classical ML (logistic regression, random forests, gradient-boosted trees) on large-scale user-product interaction time series. The applied setting is Dream11 fantasy-sports user retention; the methodological claim is that self-attention over daily interaction features beats tree ensembles on multi-week churn horizons.

## 2. Dataset / schema
Proprietary Dream11 transaction data: 2018-01-01 through 2020-12-31, approximately 10^6 users and 10^8 raw transactions (paper's stated scale). Schema (aggregated form): per user, per day, 11 interaction features (exact feature identities withheld — the paper describes them only as daily aggregates of transaction/product activity); input window = previous 30 days of the 11 daily features; targets = 4 binary labels, one per week for the next 4 weeks, where churn = a full week of inactivity. Access: proprietary, not shared, no public URL. No independent replication possible.

## 3. Method / model
Baselines: logistic regression (LR), random forest (RF), gradient-boosted trees (GBT). Deep models: several CNN variants (including ConvNeXt and Inception-ResNet backbones adapted to time series), LSTM, and an 8-block Transformer. Training stack: PyTorch with Horovod distributed training and Petastorm data loading on 4 Nvidia A10 GPUs; batch size 16K; learning rate 10^-4; up to 100 epochs; Adam optimizer. Model sizes/times: Transformer ~1.8M parameters, ~13 hours training; CNN ~6 hours (paper's figures). The Transformer takes the 30×11 daily-feature matrix and predicts the 4 weekly churn labels (multi-task binary classification).

## 4. Equations & assumptions
No equations stated in the paper (no formal equations; the architecture descriptions are textual). Implicit assumptions: (a) a full week of inactivity is the correct churn definition for all users; (b) 30 days of daily aggregates carry sufficient signal for 1–4-week-ahead prediction; (c) the 11 daily features are comparable across the 2018–2020 window (no feature drift); (d) users are exchangeable conditional on their 30-day window (no cohort or seasonality effects modeled). None are tested.

## 5. Features / target
Input features: 11 daily user-product interaction aggregates over a 30-day lookback (exact identities withheld in the paper; described as transaction/activity aggregates). Target: 4 binary labels, one for each of the next 4 weeks, where label = 1 if the user is inactive for the entire week. Prediction horizons: 1, 2, 3, 4 weeks ahead. Churn definition: full-week inactivity.

## 6. Validation design
Random train/validation/test split with ratios 0.75/0.05/0.20 over the user pool — explicitly NOT stated to be time-ordered (the paper describes a random split across the 2018–2020 interaction history). No backtesting protocol, no walk-forward evaluation, no temporal holdout. Baselines compared: LR, RF, GBT vs. CNN variants, ConvNeXt, Inception-ResNet, LSTM, Transformer. Metric reported: AUC per weekly horizon. No calibration analysis, no intervention/uplift evaluation (the paper does not test whether acting on predictions reduces churn).

## 7. Numerical results / baselines
Paper's AUC table (per weekly horizon, weeks 1–4): LR: 0.644, 0.749, 0.672, 0.662; RF: 0.640, 0.775, 0.699, 0.687; GBT: 0.646, 0.773, 0.703, 0.694; Transformer: 0.858, 0.756, 0.732, 0.716. The paper claims the Transformer improves on the best GBT by ~6% on average (my check: mean Transformer AUC 0.7655 vs. mean GBT AUC 0.704 — consistent with the claim). Notable pattern in the paper's own numbers: the Transformer dominates at week 1 (0.858 vs. 0.646–0.775) but its advantage narrows sharply by weeks 3–4 (0.732/0.716 vs. GBT 0.703/0.694). These are the paper's claims; the random-split design (Section 9) means all of them should be read as optimistic.

## 8. Code / data availability
None stated. No code repository, no data release. Data is proprietary Dream11 data.

## 9. Leakage & limitations
(a) Temporal leakage: the random 0.75/0.05/0.20 split is drawn across a three-year interaction history with no time ordering stated — test users' windows can come from earlier calendar periods than training users' windows, and seasonal/sporting-calendar structure (IPL seasons, COVID-2020 anomalies) is shared across splits, inflating AUC. A proper evaluation needs walk-forward splits. (b) Feature identities are withheld, so the feature engineering cannot be audited or replicated. (c) The churn label (full-week inactivity) conflates genuine churn with seasonal disengagement (e.g., no cricket season), which the paper does not address. (d) No calibration or decision analysis: AUC gains are reported without showing that the scores rank-order intervention value or that any retention action works. (e) External validity to NFL prediction: none — this is user-behavior modeling, not sports-outcome modeling; it must never feed the GSE prediction engine. (f) Class imbalance handling and the positive-class prevalence per horizon are not stated.

## 10. GSE overlap
The existing-research map has no user-retention/churn lane: the corpus covers prediction, calibration, tracking/NGS, DFS optimization, and market microstructure, but nothing on modeling GSE's own audience behavior (site visitors, newsletter subscribers, future paying users). The DFS practice dirs (`2026-09-13-dfs/`, `2026-09-19-dk-week2/`) cover contest strategy, not user analytics. Classification: new capability — in a product-analytics domain, not a sports-prediction domain. It does not duplicate or extend any existing GSE sports model.

## 11. GSE implementation spec
Port strictly to GSE product analytics, isolated from the prediction engine: (a) data source — GSE's own first-party telemetry (site visits, newsletter opens/clicks, X engagement, kit-page interactions), aggregated to daily per-user features over a 30-day window; (b) target — binary inactivity labels for each of the next 4 weeks (e.g., no site visit / no email open for a full week); (c) model — start with GBT baseline on the same 30×F matrix, then an 8-block Transformer matching the paper's recipe (Adam, lr 1e-4, batch sized to data, early stopping); (d) training protocol — walk-forward temporal splits (train on months 1–M, validate M+1, test M+2, rolling), NOT the paper's random split; (e) serving — weekly batch scoring of the user base, scores pushed to the CRM/ops sheet for targeted re-engagement; (f) estimated effort: 1–2 weeks for data plumbing + baseline, 1 week for the Transformer port. Keep all of this out of the picks pipeline.

## 12. Reproducible test
Dataset: GSE's own user-activity logs (define the cohort and feature set explicitly before starting). Metric: AUC per weekly horizon (weeks 1–4), plus calibration (reliability curve) on the test window. Baseline to beat: GBT on identical features and splits. Time window: walk-forward — e.g., train Jan–Aug 2026 activity, validate Sep 2026, test Oct 2026 (adjust to available history; minimum 3 months train). The test must use strictly time-ordered splits.

## 13. Acceptance / rejection gate
Adopt the Transformer for production retention scoring only if, on the walk-forward test window, it beats the GBT baseline by ≥0.02 mean AUC across the 4 horizons AND its calibration curve shows no systematic miscalibration in the top-risk decile (the decile actually targeted). Otherwise keep the GBT (simpler, cheaper, nearly as good at weeks 3–4 per the paper's own table). Reject any version trained with random splits.

## 14. Improvement experiment
Beyond the paper: add a causal layer — run a small randomized retention experiment (e.g., re-engagement email vs. holdout) stratified by model risk score, and estimate heterogeneous treatment effects to learn *who benefits from intervention*, not just who churns. Rationale: the paper optimizes pure prediction AUC, but retention value comes from uplift; a model that predicts churn well but cannot identify intervenable users is operationally useless. This directly addresses the paper's missing decision analysis.
