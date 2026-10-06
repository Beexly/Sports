# [1112] Social Media Sentiment Analysis for Cryptocurrency Market Prediction (arXiv:2204.10185v1)

**Citation:** Ali Raheman, Anton Kolonin, Igors Fridkins, and Ikram Ansari (2022). *Social Media Sentiment Analysis for Cryptocurrency Market Prediction*. arXiv:2204.10185v1. URL: https://arxiv.org/abs/2204.10185v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — an interpretable lexicon-and-lag-feature recipe (per-channel sentiment metrics incl. a "contradictive" compound, lagged correlations, selectively weighted indicators) worth porting as GSE's sports-news sentiment lag experiment, with explicit snooping caveats.

## 1. Research question
Can social-media sentiment (Twitter/Reddit) predict cryptocurrency market movements, and which sentiment metrics, channels, and time lags carry the signal?

## 2. Dataset / schema
~100,000 Twitter/Reddit items across 77 public feeds/subreddits, July–December 2021 (six months). Reference set: 490 posts from 5 randomly selected Twitter feeds, labeled by 2 reviewers. 21 base sentiment models evaluated; 22 after fine-tuning Aigents.

## 3. Method / model
Per-channel sentiment scoring with multiple base models; aggregate temporal metrics including a "contradictive" compound: contradictive = SQRT(positive × ABS(negative)). Correlations of sentiment metrics with market moves at lags 0/1/2 days; a selectively weighted compound indicator combining channels and metrics.

## 4. Equations & assumptions
contradictive = SQRT(positive × ABS(negative)). "Not stated in paper" for the exact weighting scheme of the compound indicator at re-implementable fidelity. Assumptions: social sentiment leads price; channel/metric selection is stable; six months of data suffice.

## 5. Features / target
Inputs: per-channel sentiment metrics (positive, negative, contradictive, compounds). Target: crypto price/market direction at 0–2 day lags.

## 6. Validation design
Reference labeling on 490 posts; 21 base models compared by Pearson correlation with ground truth; temporal correlations computed on the same six-month series used for selection. No held-out period — see section 9.

## 7. Numerical results / baselines
Pearson correlation with ground-truth labels: Aigents 0.33, fine-tuned Aigents 0.57, finBERT 0.32 (best of 22). Aggregate temporal correlations ~0.15 at 1–2 day lags. Selectively weighted compound indicator reached 0.55 correlation at lag −1 day.

## 8. Code / data availability
Aigents platform referenced; "Not stated in paper" for a single reproducible code/data link in this read.

## 9. Leakage & limitations
Serious snooping/leakage risk: channel and metric selection was optimized on the same six-month series used to report the 0.55 correlation — no held-out predictive backtest. Six months is one market regime. The 0.57 tuned-model correlation is on 490 labeled posts from 5 feeds (tiny). Correlation ≠ tradable signal (no transaction-cost or timing analysis). Crypto dynamics ≠ sports news dynamics.

## 10. GSE overlap
Extension: GSE has sentiment-monitoring lanes but no documented lag-feature sentiment experiment with a compound indicator. Cite `~/workspace/arxiv-sweep/existing-research-map.md` (text-as-features GAP 12; market microstructure GAP 3). Not duplicative.

## 11. GSE implementation spec
(a) Collect 2024-season player/team news sentiment from X + beat-writer RSS with a fixed lexicon (port the 1106 CNN as one channel); (b) compute per-entity daily metrics incl. the contradictive compound; (c) test lagged correlation with next-week fantasy/projection-error at 1–7 day lags; (d) build the compound indicator with weights fit on 2024 and *locked*, then evaluated on 2025. Effort: ~1 engineer-week.

## 12. Reproducible test
Dataset: 2024 NFL season (fit), 2025 season (locked evaluation). Metric: correlation of the locked compound sentiment indicator with GSE projection error at lag −1 day/week. Baseline to beat: zero correlation; acceptance requires r ≥ 0.10 out-of-sample (well below the paper's in-sample 0.55, accounting for snooping).

## 13. Acceptance / rejection gate
ADAPT into the projection pipeline if the locked 2025 evaluation shows |r| ≥ 0.10 with the correct sign and the indicator adds RMSE improvement in a bivariate blend; REJECT if out-of-sample |r| < 0.05 (signal was selection artifact).

## 14. Improvement experiment
Run the channel/metric selection under a proper nested time-series CV (walk-forward, refit quarterly) instead of the paper's single-series optimization, and add a *disagreement* metric (variance of sentiment across channels) — disagreement, not level, is the more plausible predictor of projection error and market mispricing.
