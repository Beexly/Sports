# [0282] A Systematic Review of Machine Learning in Sports Betting: Techniques, Challenges, and Future Directions (arXiv:2410.21484v1)

**Citation:** Galekwa, R. M., Tshimula, J. M., Tajeuna, E. G., & Kyandoghere, K. (2024). *A Systematic Review of Machine Learning in Sports Betting: Techniques, Challenges, and Future Directions*. arXiv:2410.21484v1. URL: https://arxiv.org/abs/2410.21484v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 3756 lines; body + tables; references skimmed).
**Verdict:** ADAPT — no original method, but a high-value pointer map: it flags calibration-over-accuracy (Walsh & Joshi 2024, +69.86% returns), adaptive fractional Kelly (Matej et al. 2021), and Black–Litterman betting portfolios (Abinzano et al. 2021) — directly naming GSE's Kelly/portfolio gaps.

## 1. Research question
What does the 2010–July 2024 literature (219 included studies across soccer, basketball, tennis, cricket, American football, baseball, horse racing, rugby, golf, hockey) say about ML techniques for sports betting — which algorithms and features work, what challenges persist, and where should research go (especially toward adaptive betting portfolios treated like financial portfolios)?

## 2. Dataset / schema
- No original dataset: PRISMA systematic review. Search: IEEE Xplore (25), Springer (20), Science Direct (19), MDPI, arXiv, Google Scholar. 259 identified → 219 included after criteria (English, ML-applied, empirical, Jan 2010–Jul 2024).
- Catalogs per sport: datasets (e.g., football-data.co.uk, Open International Soccer Database 200k–219k matches, Kaggle NFL pbp 2009–2017 289,191 plays, NFL Big Data Bowl/NGS 2018–2019, PFF, Pro-Football-Reference, ESPN, FiveThirtyEight Elo, covers.com), features, and metrics per sport (Tables 3–12).

## 3. Method / model
- Method: PRISMA-guided systematic review, data extraction (algorithm, dataset, metrics, findings, limitations), synthesis by sport (§4.1–4.10) + cross-cutting sections on datasets/features/metrics (§6), betting-tip platforms (§7), challenges (§8), and portfolio-management future directions (§9–10).
- No new model is trained or proposed; the "method" is the review protocol itself.

## 4. Equations & assumptions
No equations stated — narrative review. (No formulas for Kelly, RPS, calibration, or portfolio optimization are written out; they are cited, not derived.)

## 5. Features / target
- Surveyed features for American football (per §6.2): game location, yards to go, down, formation, score difference, field position, RFID/NGS tracking data, player movements, game time, distance to goal line, score differential, team passing percentage.
- Surveyed metrics for American football (§6.3): accuracy, precision, recall, RMSE, trajectory metrics, expected points (EP), win probability (WP), AUC, Brier scores, probabilistic forecasts.

## 6. Validation design
- Not applicable — review paper, no experiments. Quality appraisal is via PRISMA inclusion criteria only; no meta-analytic pooling or effect-size synthesis.

## 7. Numerical results / baselines
All are paper-reported summaries of cited studies (claims, not this paper's experiments):
- Walsh & Joshi 2024: calibration-optimized models generated **69.86% higher average returns** than accuracy-optimized models in sports betting.
- Matej et al. 2021: adaptive fractional Kelly beat pure Kelly in horse racing, basketball, soccer when risk-control modifications applied.
- Stübinger et al. 2019: ML ensemble on 47,856 matches (top-5 European leagues 2006–2018) returned **1.58% per match**; Stübinger & Knoll 2018: Random Forest 75.62% accuracy, **5.42% return per match** on 8,082 matches.
- Patel 2023 (NFL spreads): XGBoost with Elo/spread features — 58.5% cross-validated accuracy, **53.65% accuracy on 2021 season** (profitable at −110 odds), RMSE near the set spread.
- Sinha et al. 2013: Twitter volume rate-of-change features → >55% precision on winners-vs-spread, "sufficient for profitability."
- Warner 2010 (NFL, Gaussian process): 64.36% straight-up winners but <51% ATS — below the 52.4% breakeven.
- Morgan V 2024 (nflfastR playoffs 2002–2023): 64.41% winners, **56.78% ATS**.
- Szalkowski & Nelson 2012: home underdogs 53.5% ATS (beats 52.38% breakeven), 2,560 NFL games 2002–2011.
- Ötting 2021: HMM play-call prediction 71.5% out-of-sample (Patriots 77.9%, Seahawks 60.2%).
- Deng & Zhong 2020 (soccer): DNN 99% accuracy — implausibly high, likely leakage/overfit; treat as suspect.
- Anzer & Bauer 2021 xG (XGBoost, 105,627 Bundesliga shots): RPS 0.197.

## 8. Code / data availability
None stated — review article; primary sources cited per study. No repo.

## 9. Leakage & limitations
- Second-hand numbers: every figure is a cited study's self-report with no verification, no quality weighting, and obvious publication bias (profitable strategies get published; 99%-accuracy soccer claims go unchallenged).
- No meta-analysis: 219 studies synthesized narratively; no effect-size pooling, no heterogeneity analysis — the "findings" are a catalog, not evidence.
- Methodology sloppiness: inclusion counts inconsistent (259→219 in text vs 350 screened in Figure 1); sport coverage uneven (American football section thin relative to soccer).
- Challenges section (§8) is generic (data quality, overfitting, compute, regulation) — nothing actionable.
- External validity to GSE: the value is as a reading list, not as evidence. Two cited results (calibration +69.86%; fractional Kelly) are pointers to primary papers that should be read in depth, not conclusions to act on.

## 10. GSE overlap
Per existing-research-map: the 15-area ML brief already covers calibration/uncertainty and market-relative learning; repo has temperature scaling, grouping loss, ECE-by-slice, CLV-as-label, de-vigged consensus, beat-the-close. This review DUPLICATES that territory at survey depth. Its unique value is the explicit pointer list for GSE's gap list: **Gap 1 (Kelly — "mentioned 12×, zero papers read")** is directly addressed by the review's citations of Matej et al. 2021 (adaptive fractional Kelly) and Abinzano et al. 2021 (Black–Litterman betting portfolio) — both should be fetched as primary reads. Also validates the calibration-first doctrine (Walsh & Joshi 2024) already in the repo's calibration stack. Relevant repo anchors: `competitor-scrape-2026-09-12.md` (calibration), prediction-market triage docs (Kelly/Wang Transform).

## 11. GSE implementation spec
- No implementation from this paper. Action: queue the two primary papers as deep-read candidates — (1) Matej et al. 2021 "experimental review of the most popular betting approaches using modern portfolio theory and the Kelly criterion" (adaptive fractional Kelly), (2) Abinzano et al. 2021 "Sports betting and the black-litterman model" (portfolio construction). Both map to GSE Gap 1 and the portfolio-sizing question in the weekly DFS/engine pipeline.
- Secondary: Patel 2023's NFL spread XGBoost setup (Elo + spread + 4-week rolling features, quadratic terms) is a reasonable baseline spec already close to GSE's stack — low priority.

## 12. Reproducible test
- Not applicable to the review itself. The testable claims live in the primary papers: reproduce Walsh & Joshi's calibration-vs-accuracy comparison on GSE's own 2024 NFL probability outputs (recalibrate half the pipeline for calibration, optimize the other for accuracy; compare realized ROI on positive-EV spots), and backtest Matej's adaptive fractional Kelly vs flat Kelly on 2021–2024 NFL seasons with GSE edges.

## 13. Acceptance / rejection gate
- For the review as evidence: REJECT as a source of conclusions (narrative, unverified, no pooling) — accept only as a pointer list. Promote a cited primary paper to deep-read only if it is retrievable and contains an auditable experiment (Matej 2021 and Abinzano 2021 pass; Deng & Zhong 2020's 99% claim fails the smell test without code/data).

## 14. Improvement experiment
What the review should have been: a proper meta-analysis with pooled effect sizes — estimate the distribution of reported ROI across the 219 studies, adjust for publication bias (funnel plot / selection models), and test whether calibration-optimized vs accuracy-optimized studies differ significantly in reported profitability. For GSE: run that comparison internally — the calibration-vs-accuracy bake-off in §12 — since the review's most important claim (Walsh & Joshi's +69.86%) has never been validated on NFL data in-repo.
