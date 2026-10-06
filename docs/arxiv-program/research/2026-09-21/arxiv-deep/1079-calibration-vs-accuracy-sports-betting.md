# 1079 — Machine learning for sports betting: should model selection be based on accuracy or calibration?

- **arXiv ID**: 2303.06021v4
- **Full-text URL**: https://arxiv.org/pdf/2303.06021v4
- **Authors**: Conor Walsh, Alok Joshi (University of Bath)
- **Lane**: calibration_uncertainty
- **Verdict**: **ADAPT**
- **Replacement chain**: fresh-search replacement for 1806.10648v2 (REJECT — pure minimax theory, no data/code/experiments). The assigned reserve 2207.11709v2 was already consumed and rejected on the 1610.06833 chain, so no reserve slot remained.
- **Fresh-search record**: On 2026-09-21 I queried the arXiv API with targeted calibration-lane queries: `all:calibration AND all:predictive uncertainty`, `all:recalibration AND all:sports`, `ti:calibration AND all:betting`, and `all:probability forecasting AND all:sport AND all:calibration`. The most GSE-relevant non-dedup results were 2303.06021v4 (this paper; calibration-vs-accuracy model selection with real betting ROI experiments) and 2608.11505v1 (structural-model-vs-closing-price in Serie A). I selected 2303.06021v4 because it (a) directly tests calibration as a model-selection criterion against accuracy, (b) runs full moneyline betting simulations on published bookmaker odds with real bankroll accounting and fractional Kelly sizing, (c) reports numeric ROI outcomes, and (d) maps one-to-one onto GSE's pick-selection and staking problems. It is clear of phase-one dedup (not in done-ids.txt).
- **Read depth**: FULL READ of the complete v4 PDF text via pdftotext: graphical abstract/highlights, introduction (moneyline, implied probability, bookmaker margin), related work (bookmaker strategies, Kelly criterion and fractional Kelly, calibration literature), central hypothesis, classwise-ECE definition with the 80%-non-empty-bins constraint, two-branch predictive modelling pipeline (feature selection + BO-TPE hyperparameter optimisation on accuracy vs classwise-ECE), novel feature engineering (average out-performance vs opponents, covariate-shift KS screening), betting experiment design (bet-all-value-bets strategy; fixed $100 and eighth-Kelly rules), results tables and bankroll figures, value-bet scatter analysis, discussion, conclusions, acknowledgements, and full references.
- **Wave**: wave2-reader-20
- **GSE overlap**: None found in phase-one tracker, existing-research-map, or wave-one reports.

## Summary

The paper tests one hypothesis: **for sports betting, selecting a predictive model by calibration beats selecting by accuracy**. Two parallel pipelines train LR/RF/SVM/MLP on NBA data (basketball-reference, 2014/15–2018/19 seasons, with chronological train/validation/test splits and covariate-shift screening via two-sample KS tests at 1%): one branch optimises feature selection + BO-TPE hyperparameter tuning for accuracy, the other for **classwise expected calibration error** (20 bins; bins <80% non-empty are penalised to ECE=1 to stop degenerate mean-predictions). SVM wins both branches (test accuracy 66.55%; test classwise-ECE 3.23%). The two final SVMs then drive identical betting simulations on the 2018/19 season with Westgate closing moneyline odds from a $10,000 bankroll: bet every value bet (model probability > implied probability), sizing by either fixed $100 or eighth-Kelly. Results: calibration-driven system averages **+34.69% ROI** (max 36.93%, eighth-Kelly), accuracy-driven averages **−35.17%** (best case 5.56% fixed; Kelly counterpart lost 75.9% of the bankroll). The mechanism: the accuracy-driven model is overconfident — its value bets cluster at probability extremes, implying more false positives — and Kelly sizing amplifies miscalibration into ruin. Core GSE lesson: **Kelly-based staking only works on top of a well-calibrated model**; model selection for the betting layer should optimise calibration, not raw hit rate.

## Method, math, and equations

- Classwise-ECE (Eq. 3): \(\text{classwise-ECE} = \frac{1}{k}\sum_{i=1}^{k}\sum_{j=1}^{m}\frac{|B_{j,i}|}{n}\,|\bar{y}_i(B_{j,i}) - \bar{p}_i(B_{j,i})|\), with M=20 bins; degenerate-concentration guard: if <80% of bins non-empty, set ECE=1.
- Kelly fraction (Eq. 1): \(k = \frac{pb - q}{b}\), p=model probability, b=odds−1, q=1−p; eighth-Kelly stakes \(\frac{1}{8}k \times \text{bankroll}\).
- Betting simulation (Table 1): bankroll $10,000; for each game in chronological order, bet home if P_h > 1/O_h, away if P_a > 1/O_a; fixed $100 or eighth-Kelly stake; ROI = percentage change in initial bankroll.
- Pipeline: Spearman-correlation filter (>0.7 → drop redundant), then sequential forward selection with LR under accuracy vs classwise-ECE objectives; BO-TPE hyperparameter optimisation per branch; final model selection on 2017/18 test season; retrain on 2014–2018; simulate 2018/19.
- Features: differences in average box-score out-performance vs opponents (relative, shift-resistant) + previous-season winning percentage; first 10 team-games of each season excluded from training; KS-test covariate-shift screening.

## Datasets

- NBA seasons 2014/15–2018/19 from basketball-reference.com; 2014/15–2015/16 initial train, 2016/17 validation, 2014/15–2016/17 extended train, 2017/18 test, 2018/19 betting simulation.
- Published closing moneyline odds for 2018/19 from Westgate via sportsbookreviewsonline.com.

## GSE application and implementation spec

This is a direct, actionable finding for GSE's pick pipeline:

1. **Model-selection metric for the betting layer**: GSE currently ranks engine variants largely on hit-rate/accuracy-style metrics. This paper's experiment shows an accuracy-optimised model can be overconfident and Kelly-ruinous while a calibration-optimised sibling earns +37%. **Implementation**: add a calibration-selection branch to the engine's model bake-off — compute classwise-ECE (with the non-degenerate-bins guard) for each candidate model on the holdout season and select the staking-layer model on minimum ECE, not maximum accuracy.
2. **Fractional Kelly guardrail**: the eighth-Kelly accuracy-driven system lost 75.9%; the same sizing on the calibrated model earned +36.93%. GSE's staking module should gate fractional-Kelly sizing on a calibration check: if the live model's calibration error exceeds a threshold, fall back to flat stakes.
3. **Value-bet diagnostics**: the scatter plot of model probability vs implied probability (their Figure 5) is a cheap diagnostic GSE can run nightly — overconfident models show bimodal/extreme value-bet clustering; well-calibrated models show uniform spread.
4. **Feature engineering transfer**: the average-out-performance-vs-opponents feature construction (relative rather than absolute box scores) is directly portable to NFL features — average EPA/success-rate differentials vs opponents faced, rather than raw team averages.

## Leakage

- Chronological splits preserved (no shuffling; cross-validation explicitly rejected per Bunker & Thabtah) — no lookahead in feature construction; first 10 team-games excluded so features are "well-informed".
- Odds used are published closing moneylines for the simulation season only; no odds leak into training.
- Covariate-shift screening (KS test at 1%) drops features whose validation distribution differs from training.

## Limitations

- Single betting season (2018/19) — no multi-season robustness; authors flag this themselves.
- NBA moneyline only; no spreads, totals, or props — GSE's core markets need separate validation.
- The 80%-non-empty-bins constraint is arbitrary and author-chosen; ECE binning choices (20 bins) affect results.
- Both final models bet on ~88–90% of games (bet-all-value-bets strategy); a more selective strategy might change the ROI gap.
- SVM won both branches, limiting the model-diversity of the comparison.
- Authors are explicit that the findings need replication across seasons and leagues.

## GSE overlap

None in the tracked corpus. Thematic neighbours exist (calibration papers like ENIR 1511.05191v1, Kelly sizing material), but no paper previously tested calibration-vs-accuracy *model selection* against betting ROI.

## Implementation difficulty

Low. Everything is sklearn-level: classwise-ECE computation, a binning guard, and a calibration branch in the existing model bake-off. The eighth-Kelly fallback rule is a few lines in the staking module. Porting features to NFL uses existing nflverse/box-score-style data.

## Reproducible test

- Reimplement the classwise-ECE (M=20, 80%-bins guard) on the paper's reported test-set predictions; verify SVM achieves the lowest ECE among LR/RF/SVM/MLP (reported 3.23% vs 3.61/4.39/3.59).
- Replay the betting simulation table on published 2018/19 NBA closing odds: calibration-driven SVM must reach ≈$13,244 (32.45% ROI) under fixed $100 and ≈$13,693 (36.93% ROI) under eighth-Kelly; accuracy-driven SVM must reach ≈$10,556 (5.56%) and ≈$2,410 (−75.9%) respectively, within simulation tolerance.

## Numeric gate

**ADAPT iff the calibration-vs-accuracy ROI gap is replicated in direction on GSE's own NFL backtest: a model selected by minimum classwise-ECE must beat the accuracy-selected model on bankroll ROI under eighth-Kelly sizing over at least two NFL seasons;** if calibration selection does not beat accuracy selection, the adaptation's premise fails for GSE's markets.

## Improvement experiment

Port the two-branch pipeline to NFL: (1) replace NBA box-score features with nflverse team features (EPA/play differentials vs opponents, previous-season win%), (2) run calibration-branch vs accuracy-branch model selection on 2020–2023 holdout seasons, (3) simulate moneyline *and* spread betting with eighth-Kelly sizing, (4) add the paper's own future-work question: trace accuracy as classwise-ECE → 0 to find the bookmaker-implied accuracy ceiling. Success criterion: calibration-selected model shows higher Kelly ROI and lower bankroll drawdown in both markets.

## Verdict

**ADAPT** — The first paper in this wave to give GSE an operational rule with numbers attached: select the betting-layer model by calibration (classwise-ECE), not accuracy, and never size by Kelly on an uncalibrated model. The +34.69% vs −35.17% ROI gap, the Kelly-ruin mechanism, and the value-bet scatter diagnostic are all directly portable to GSE's NFL pipeline. Adapt the two-branch bake-off and the eighth-Kelly calibration gate into the engine; validate on NFL seasons before production use.
