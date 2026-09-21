# [1116] Understanding the Impact of News Articles on the Movement of Market Index: A Case on Nifty 50 (arXiv:2412.06794v1)

**Citation:** Subhasis Dasgupta, Pratik Satpati (2024). *Understanding the Impact of News Articles on the Movement of Market Index: A Case on Nifty 50*. arXiv:2412.06794v1. URL: https://arxiv.org/abs/2412.06794
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arXiv, text extracted with pdftotext; the entire five-page paper read).
**Verdict:** ADAPT — the lagged news-sentiment feature pipeline (DistilBERT headline log-odds + VADER + ridge) is a legitimate baseline for GSE's market-microstructure lane, but only after fixing the paper's target and validation flaws; nothing here is adopted as-is.

## 1. Research question
Does news-article sentiment — measured with modern NLP on both headlines and body text — improve prediction of the Nifty 50 index's movement beyond price-history baselines?

## 2. Dataset / schema
- **News:** Economic Times archive, January 2021 – 22 February 2024; **400,000+** news items; topic modeling produced 53 topics, reduced to **22** via a frequency threshold of 200.
- **Market:** Nifty 50 OHLC series over the same window.
- Access: Economic Times archive is proprietary/scraped; Nifty 50 data is public from NSE. Neither is redistributed by the paper.

## 3. Method / model
- Sentiment: **VADER** applied to article text; **DistilBERT** applied to headlines, with the headline score passed through a **log-odds transform**.
- Features: lagged sentiment scores + lagged price features (lag-3 focus).
- Models: ordinary linear regression, **ridge**, lasso, elastic net (standard sklearn-family regularized linear models).
- Train: 1 Jan 2021 – 31 Aug 2023. Test: 1 Oct 2023 – 22 Feb 2024. **September 2023 discarded** (buffer).

## 4. Equations & assumptions
- No novel equations stated. The log-odds transform log(p/(1−p)) on DistilBERT headline scores is the only mathematical operation beyond standard regularized regression objectives. Assumptions: (a) headline sentiment and article sentiment carry complementary signal; (b) a one-month buffer eliminates leakage between train and test; (c) predicting the price *level* is the right target (it is not — see §9).

## 5. Features / target
- Features: lagged VADER article sentiment, lagged DistilBERT headline log-odds sentiment, lagged OHLC-derived price features (lag 3 emphasized). Target: **next-period Nifty 50 price level** (not returns).

## 6. Validation design
- Single temporal split (train ≤ Aug 2023, test ≥ Oct 2023, September discarded). Time-ordered — good. Baselines: lag-3 price-only model. Metric: RMSE. No cross-validation, no second market, no ablation of VADER vs DistilBERT reported in the extracted results.

## 7. Numerical results / baselines
- Baseline (lag-3 price-only) RMSE: **134.85**.
- DistilBERT lag-3 features: linear **128.78**, **ridge 128.74**, lasso **223.45**, elastic net **133.79**.
- Paper's claim: sentiment features modestly beat the price-only baseline (ridge: 134.85 → 128.74, ≈4.5% RMSE reduction). Note the lasso blowup (223.45) — the feature set is unstable under L1.

## 8. Code / data availability
- None stated in paper.

## 9. Leakage & limitations
- **Weekend forward-fill:** weekends were left-joined with OHLC values forward-filled while news accumulates — the target is flat over weekends but features are not, a design flaw that muddies what the model learns around weekends. **Price-level target:** RMSE 134.85 on an index at ~22,000 is 0.6% — a near-random-walk level target makes RMSE reductions look easy and economically meaningless; returns (or direction) is the honest target. (c) Single index, single split, five-page paper — external validity is thin. (d) Lasso exploding to 223.45 while ridge helps suggests multicollinear features and fragile specification. (e) No code, no data release.

## 10. GSE overlap
- Existing-research map: **"Text/news as features beyond the price — ML brief area 13 commissioned, no papers read; beat-writer text embeddings for injury news is untested."** This paper is the first read in that gap — an **extension**, not a duplicate. Related ledgers: `0842-sentiment-analysis-twitter-stock-market.md`, `0845-sentiment-correlation-financial-news-networks.md`, `0860-causalstock-news-driven-prediction.md` — all finance-sentiment, but different markets/methods (none use DistilBERT headline log-odds + VADER on Indian equities). The Grok daily briefs provide news/injury *signals* for the engine, not methods — this paper supplies a method.

## 11. GSE implementation spec
- **Lane:** market microstructure / CLV — predict NFL **closing-line movement** (not price levels) from news sentiment.
- **Data:** beat-writer/injury-news text (existing GSE news feeds) + odds API line histories.
- **Features:** DistilBERT headline log-odds + VADER body sentiment, aggregated per team per day, lags 1–3; entity-resolved to team/player.
- **Model:** ridge regression (the paper's winner) as baseline; target = line movement in points from open to close.
- **Validation fix:** purged/embargoed temporal CV (no forward-fill; drop non-trading equivalents like bye weeks carefully, or model them explicitly).
- **Effort:** ~1–2 engineer-weeks.

## 12. Reproducible test
- Dataset: 2022–2024 NFL regular seasons; daily team-news sentiment vs DraftKings/FanDuel closing-line movement. Metric: RMSE and directional accuracy vs a no-news (line-history-only) ridge baseline, evaluated on 2024 with a one-week embargo.

## 13. Acceptance / rejection gate
- **Adopt** if sentiment features reduce RMSE by ≥3% vs the no-news baseline on the embargoed 2024 test AND directional accuracy improves by ≥1pp; **reject** otherwise. (The paper's own 4.5% RMSE gain is on a flawed level-target; demand a smaller but honest gain on movements.)

## 14. Improvement experiment
- Replace the index-level sentiment average with **entity-level sentiment**: attribute each article's sentiment to specific teams/players (NER + coreference), then build team-day sentiment features. The paper's market-wide average dilutes the signal; for sports, *whose* news it is matters more than *how much* news there is. Test whether entity-resolved features double the RMSE gain.
