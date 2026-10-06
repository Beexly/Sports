# [0867] Using Machine Learning and Alternative Data to Predict Movements in Market Risk (arXiv:2009.07947)

**Citation:** Dierckx, T., Davis, J. & Schoutens, W. (2020). *Using Machine Learning and Alternative Data to Predict Movements in Market Risk*. arXiv:2009.07947 [q-fin.ST]. KU Leuven. URL: https://arxiv.org/abs/2009.07947
**Full-text source:** local cache /tmp/arxiv750-cache/fulltext/2009.07947.txt (43,183 bytes, complete incl. references). Cross-checked against https://arxiv.org/abs/2009.07947.
**Ledger completed:** 2026-09-21. **Read:** full text.
**Verdict:** ADAPT — the paper predicts movements in *implied* volatility (a market-implied quantity), not prices: the direct GSE analog is predicting *line-movement direction* (will the spread/total move for/against you before kickoff?) for bet-timing. Its walk-forward, no-look-ahead evaluation discipline and its honest alternative-data ablation are templates GSE should copy.

## Citation / full-text source
T. Dierckx, J. Davis, W. Schoutens, KU Leuven (Statistics + Computer Science). Builds on Weng et al. (Expert Systems 2017, 2018) feature-generation strategy; CBOE VIX white paper for the IV formula.

## Research question
(1) Can ML predict whether an asset's market implied volatility moves up or down by end of next trading day? (2) Do alternative data (Google News counts, Wikipedia page views) improve on market data? (First ML+alt-data study of implied volatility specifically.)

## Dataset / schema
- **AAPL, Jan 1 2016 – Dec 31 2017** (24 months); **486** daily feature vectors.
- 8 base features/day: OHLC, volume (Yahoo Finance), market implied volatility (VIX formula, eq. 1, applied to personal EOD option data, 30-day term via interpolation), Google News daily keyword counts (scraped), Wikipedia "Apple Inc" daily page views (Wikimedia API).
- **78 features/day** after technical-indicator expansion (Table 5: MA/EMA/ROC/Disparity/Momentum variants n∈{3,5,10}, RSI(14), Williams %R(14), Stochastic(14) — replicating Weng et al. 2017; volume/high/low excluded from expansion).
- Target: y_i^* = ivol_{i+1} − ivol_i; y_i = 1 iff y_i^* > 0 (eq. 2). Class split over test period: **59% down / 41% up**.

## Method
1. **Stationarity:** Augmented Dickey–Fuller on each feature; first-difference the non-stationary ones.
2. **Models (sklearn defaults, no tuning):** Logistic Regression, RBF-SVM (both: standardized inputs, 29-feature subset selected by above-average AdaBoost importance), AdaBoost (no standardization/selection — tree robustness). No deep learning (too few points); no Random Forests (authors argue random sampling clashes with sequential data).
3. **Evaluation:** Walk-Forward Validation — sliding window of **379 days (78%)** train, next day OOS; **106** train-test splits; standardization + feature selection re-run inside each iteration (no look-ahead bias). Metric: **balanced accuracy** (mean per-class recall).
4. **Ablation:** 5 scenarios — (1) market only, (2) news+wiki only, (3) market+wiki, (4) market+news, (5) all.

## Equations / math / assumptions
- VIX formula (eq. 1): VIX = 100·√[(2/T)Σ(ΔK_i/K_i²)e^{RT}Q(K_i) − (1/T)(F/K_0 − 1)²], interpolated across expirations to the target term.
- Target construction (eq. 2); balanced accuracy = (recall_up + recall_down)/2.

## Features / target
78 engineered features → binary next-day IV direction.

## Validation
- Walk-forward, 106 OOS predictions, temporal ordering respected, preprocessing inside folds.
- **Table 9 (balanced accuracy):** Scenario 1 (market only): LR **63.3%**, SVM **64.2%**, AdaBoost 53.7%. Scenario 2 (news+wiki): 52.3/50.5/55.0. Scenario 3 (market+wiki): 52.8/55.6/AdaBoost **63.0%**. Scenario 4 (market+news): 51.8/53.3/49.0. Scenario 5 (all): 61.3/59.1/57.3.
- Headline: market data alone wins for LR/SVM; **AdaBoost + market + Wikipedia = 63.0%** (best AdaBoost) while LR collapses to 52.8% on the same features → "preliminary evidence of non-linear relationships between Wikipedia page-traffic features and IV movements" that linear models miss. Google News counts least effective (best combined showing: second-best scores in scenario 5).

## Exact results with baselines
- Best: SVM 64.2% / LR 63.3% (market-only) vs 50% chance and vs 59% majority-class baseline — modest but real edge on 106 OOS points.
- Honest negative: alternative data does NOT improve LR/SVM; the authors report this plainly rather than burying it.

## Code / data availability
No code or data link; option data described as "personal end-of-day option data" (not shared); feature generation fully specified via Table 5 + Weng et al. 2017.

## Leakage
Carefully avoided by design: walk-forward splits, preprocessing re-fit per iteration. (A good template — note they call this out explicitly.)

## Limitations
- Only 2 years of option data (availability constraint); single asset (AAPL); 106 test points is thin for 78 features.
- No hyperparameter tuning; binary target ignores move magnitude and neutral moves; predicted probabilities not checked against precision/move size.
- Google News counts are crude (keyword hit counts, no sentiment); Wikipedia is a single page.

## GSE overlap vs existing-research-map
- Fills a methodological gap rather than a topical one: the corpus has backtests, but few papers with this explicit walk-forward + in-fold-preprocessing discipline. Worth citing as the evaluation template.
- Topical link: predicting *implied* quantity movements ≈ predicting line movements — a GSE bet-timing input (when to fire: now vs closer to kickoff). Complements the CLV/beat-the-close work.
- The alternative-data ablation result tempers ledgers 0858–0860 (news/X features): expect linear models to show nothing while tree/attention models find non-linear attention effects — ablate per model class, not just per feature set.

## Implementation spec (GSE adaptation)
1. **Line-movement direction model:** target = sign(spread/total at close − spread/total now) using market data (line history, ticket/handle splits) + alt data (X volume, news counts, Wikipedia page views for teams/players). Same 78-style technical expansion on line series (MA/ROC/RSI of line moves). Use case: bet-timing — fire now if the model says the line moves against you, wait if it moves for you.
2. **Evaluation discipline:** walk-forward with in-fold preprocessing re-fit (standardization, feature selection) — audit GSE's existing backtest pipelines against this; any pipeline that standardizes on the full sample before splitting has look-ahead bias by this paper's standard.
3. **Ablation per model class:** test alt-data features separately under linear and non-linear models; the paper shows the value can hide in the interaction (LR 52.8% vs AdaBoost 63.0% on identical features).

## Reproducible test
1. Build the line-movement-direction dataset for one NFL season; run the paper's pipeline (ADF → difference, walk-forward 78% window, balanced accuracy).
2. Gate: market-only features must beat 50% balanced accuracy OOS (the paper's 63–64% is the reference, not the target); then test whether alt-data features add anything *under a non-linear model*. If nothing beats chance, the transfer fails for that market.

## Numeric gate
**SVM 64.2% / LR 63.3% balanced accuracy (market-only, 106 OOS); AdaBoost 63.0% (market+Wikipedia); class split 59/41 down/up; 379-day train window.** For GSE: gate is >50% balanced accuracy OOS on line-movement direction with walk-forward evaluation — the paper's 60%+ is aspirational on 106 points.

## Improvement experiment
Upgrade the target from binary direction to three-class (up/neutral/down with a neutral band at ±0.5 points) and add predicted-probability calibration (the paper's own suggestion): only fire timing bets when predicted probability exceeds a calibrated threshold, and test whether probability correlates with move magnitude — turning a direction signal into a sizing signal.

## Verdict
**ADAPT.** The transferable assets are the problem template (predict movements in a market-implied quantity → GSE line-movement timing), the walk-forward/no-look-ahead evaluation discipline, and the per-model-class ablation honesty — including the caution that alternative data's value may only appear under non-linear models.
