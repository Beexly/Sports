# [0678] Partially Regularized Ordinal Regression to Adjust Teams' Scoring for Strength of Schedule and Complementary Unit Performance in American Football (arXiv:2506.03057)

**Citation:** Andrey Skripnikov, Sujit Sivadanam (2025). *Partially Regularized Ordinal Regression to Adjust Teams' Scoring for Strength of Schedule and Complementary Unit Performance in American Football*. arXiv:2506.03057. URL: https://arxiv.org/abs/2506.03057
**Ledger completed:** 2026-09-21. **Read:** full text (local cache /tmp/arxiv750-cache/fulltext/2506.03057.txt, sections 1–4 incl. variable-selection stability, surrogate diagnostics, projection, out-of-sample testing, discussion).
**Verdict:** ADAPT — complementary football (defense→offense turnover/field-position linkage) is a proven, calibrated drive-level feature family; adapt for GSE's expected-points and team-rating models.

## 1. Research question
Which complementary-football features (one unit's performance affecting the other unit's scoring) matter most in American football, and does adding them — alongside full strength-of-schedule adjustment — improve out-of-sample drive-scoring prediction?

## 2. Dataset / schema
Drive-by-drive data: FBS college 2014–2020 (~15,000 drives/season retained after cleaning, 65% of halves; 55–60 drives/team), NFL 2009–2017 from Kaggle (98% games retained). Five ordinal drive outcomes: defensive TD (−7, 1%), safety (−2, <0.5%), no score (0, 65%/65%), field goal (3, 14%/8%), offensive TD (7, 20%/26%). Access: public (Kaggle NFL, cfbfastR-style FBS).

## 3. Method / model
Regularized ordinal regression with partial elastic-net penalty (extension of Wurm et al. 2021 ordinalNet): team-level SoS effects unpenalized (guaranteed full SoS adjustment), complementary features penalized with partial non-proportional-odds relaxation (non-proportional coefficient only for the "≥ field goal" cumulative equation). λ via 10-fold CV ×3 replicates, metric out-of-sample multinomial log-likelihood. Surrogate residual diagnostics (Liu & Zhang 2018) extended to non-proportional odds via binarized per-category plots (extended R package sure).

## 4. Equations & assumptions
- Drive outcome Y_{ijkl} ~ Multinomial(π_ijkl), s = 1..5 ordinal; cumulative logit links with proportional odds for team effects (α_i offense, β_j defense, Σα=Σβ=0), penalized complementary features γ with partial non-proportional terms.
- Model: logit P(Y ≤ s) = τ_s − (α_i + β_j + home + context + γ·complementary); selected non-proportional coefficient on "≥ FG" equation.
- Assumptions: drives conditionally independent given team/context; ordinal categories ordered; SoS fully captured by unpenalized team margins; turnover×field-position interaction linear in logit.

## 5. Features / target
Complementary features tested: non-scoring turnover indicator (prev drive), turnover×post-turnover starting position, yards allowed, plus special-teams metrics. Context: homefield, half, time remaining, score differential. Target: ordinal drive scoring outcome (5 categories).

## 6. Validation design
3 replicates of 10-fold CV per season for λ and selection stability; final 10-fold CV comparing GS vs GS+SoS vs GS+SoS+Complem on MAE of expected points; binarized surrogate residual diagnostics per season; calibration of scoring-category probabilities (Yurko et al. 2019 style).

## 7. Numerical results / baselines
Non-scoring turnover indicator selected ≥80% of CV replicates (always positive); turnover×starting-position term selected 100% after inclusion; yards allowed selected 70% (negative). Median post-turnover starting position: own 41-yard line, +21 yards vs no turnover. Takeaway adds +0.6–1.0 points/drive (parabolic vs baseline, maxing at ~2–2.5 baseline pts/drive). Non-proportional "≥ FG" coefficient selected 90% — turnovers boost FG probability disproportionately (FG range 70–75 yards advanced in NFL). 10-fold CV: GS+SoS+Complem beats GS and GS+SoS in MAE across NFL and CFB seasons; SoS gain larger in CFB (more disparity); ordinal regression slightly beats linear regression; well-calibrated across all five scoring categories in most seasons. Contextualized rankings: offenses with elite complementary defenses downgraded when projected onto league-average defense, and vice versa.

## 8. Code / data availability
Extended ordinalNet/sure functionality described; no repo link stated in paper.

## 9. Leakage & limitations
Drive-level MAE gains shown graphically (Figure 5) without tabulated numbers — effect size visible but not precisely quotable. Previous-drive features are in-sample per game (no leakage across games since CV is within season, but adjacent drives in same game can split across folds). Special-teams field-position dynamics excluded. CFB data heavily cleaned (35% halves dropped). NFL data 2009–2017 (pre-17-game era).

## 10. GSE overlap
Existing-research-map has opponent-adjusted metrics and drive-level work but no complementary-unit (defense→offense) adjustment. The 0667 blocker-rusher ledger covers unit capability, not cross-unit scoring linkage. This is a new feature family for GSE ratings: turnover-generated field position as an explicit offensive-expectation input.

## 11. GSE implementation spec
Add to GSE's drive-level expected-points model: previous-drive non-scoring turnover indicator and turnover×starting-position interaction, with a non-proportional-odds boost on the FG-probability equation; project team offensive/defensive ratings onto league-average complementary units for the published power ratings. Refit on nflverse 2015–2024 play-by-play. Effort: ~3 days.

## 12. Reproducible test
Dataset: nflverse play-by-play 2015–2024. Protocol: replicate the ordinal regression (GS / GS+SoS / GS+SoS+Complem) with 10-fold CV; metric: MAE of expected drive points + calibration of scoring-category probabilities. Baseline to beat: nflfastR expected points. Pass criterion: GS+SoS+Complem MAE lower with non-overlapping SE bars, and FG-category calibration slope ∈ [0.9,1.1].

## 13. Acceptance / rejection gate
Adopt complementary features permanently if 10-fold CV on 2015–2024 shows MAE improvement with SE bars non-overlapping vs GS+SoS in ≥4 of 10 seasons; otherwise keep SoS-only.

## 14. Improvement experiment
Add punter/kicker-specific field-position value (expected post-punt/kickoff starting position given returner and coverage units) to the complementary feature set; test whether return-game quality is a stable, predictive team trait that survives the elastic-net selection across seasons.
