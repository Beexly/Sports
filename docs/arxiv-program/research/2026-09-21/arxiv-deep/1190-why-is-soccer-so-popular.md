# [1190] Why is soccer so popular: Understanding underdog achievement and randomness in team ball sports (arXiv:2404.06626v1)

**Citation:** Vicente, L. N. et al. (2024). *Why is soccer so popular: Understanding underdog achievement and randomness in team ball sports*. arXiv:2404.06626v1. URL: https://arxiv.org/abs/2404.06626v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 26 pages / 978 extracted lines, all read).
**Verdict:** REJECT

## 1. Research question
Why is soccer so popular? The paper's hypothesis: soccer's appeal comes from high "underdog achievement" — weak teams beat or draw strong teams unusually often — and it seeks to quantify that across 12 international team-ball sports and explain it with a 14-factor randomness model.

## 2. Dataset / schema
- **Sports:** 12 — basketball, cricket, field hockey, futsal, handball, ice hockey, lacrosse, roller hockey, rugby, soccer, volleyball, water polo. **American football is explicitly excluded** (paper: no suitable international competitions).
- **Scores:** scraped from Wikipedia for major international competitions per sport (Table 7 lists edition years, e.g., FIFA World Cup 1930–2014 for soccer; Summer/Winter Olympics for basketball/handball/ice hockey; World Cups for cricket, field hockey, futsal, lacrosse, roller hockey, rugby, volleyball, water polo).
- **Companion dataset:** Alleck, T. N. et al., "Match score dataset for team ball sports," ISE Technical Report 24T-003, Lehigh University, 2024 (cited as [1]).
- **Rankings:** per-edition team ranking R_e sorted by matches played (desc), wins (desc), draws (desc), losses (asc), total score (desc); weighted across editions: wr(i) = (N − c(i)) + λ·wr_prev, with λ ∈ {1, 0.5, 0}.
- **Factors dataset (Appendix B, Tables 8–10):** 12 rows × 14 columns of min-max-normalized randomness-factor values per sport, plus auxiliary raw values and a movement-rules table (RAM/RPM counts).

## 3. Method / model
- **Underdog achievement score (UAS):** a team is "weak" in edition e if its rank is ≥ τ places below the opponent's (eq. 3.1), where **τ = the median of the sport's rank-difference distribution** (Table 3: soccer τ=7, water polo τ=2.5, all others 3–5). Weakness is judged on the weighted ranking through the **previous** edition (no current-edition leakage). UAS = (# victories or draws by weak teams) / (# matches containing a weak team), aggregated over editions (eqs. 3.2–3.4). 95% confidence intervals computed per sport.
- **Randomness model:** 14 hand-specified factors in 3 groups (Table 5): physical environment — BL (ball lightness = max(BW)−ball weight), BV (ball velocity), FS/BS (field/ball size), GS/BS (goal/ball size), BG (ball geometry, 3 classes), BB (ball bounciness, 11 classes); player — PP (body mass index), PBH (proportion of body interacting with ball), PBD (ball dispossession = max(PBP)−PBP), PI (inexperience = max(PE)−avg retirement age); team — NP/FS (players/field size), GS/NPG (goal size/defenders), SI (scoring infrequency = max(SF)−scoring frequency), NRAM/NRPM (movement vs movement-preventing rules ratio). Each column min-max normalized to [0,1] via a′ = (a − min(a)) / (max(a) − min(a)).
- **Analysis:** PCA on the 14-factor dataset (first two PCs explain **56%** of variance; scree plot Fig. 7) and a Pearson correlation heatmap of all factors plus UAS (Fig. 8).

## 4. Equations & assumptions
- Weighted ranking: wr≤e_h(i) = (N_eh − c(i, R_eh)) + λ·wr≤e_{h−1}(i) for participating teams; c(i, R) ∈ [1, N] is rank position.
- UAS_eh (3.2): fraction of weak-team wins/draws among matches with a weak team in edition e_h; aggregate UAS (3.4): numerator/denominator summed over editions h = 2..|E|.
- Normalization: a′ = (a − min(a)) / (max(a) − min(a)).
- Pearson correlation: cov(X,Y)/(σ_X·σ_Y), range [−1, 1] (definition restated in §5).
- Assumptions: (a) higher factor values always increase randomness (positive impact direction asserted a priori); (b) factors negatively correlated with UAS are interpreted as having "weaker effect on randomness" — an ad-hoc post-hoc reinterpretation; (c) cricket's GS/BS and GS/NPG are imputed by averaging other sports (cricket has no goal); (d) λ ∈ {1, 0.5, 0} chosen to test history-weighting sensitivity; (e) τ = median rank difference is a fair weak-team threshold.

## 5. Features / target
- **Inputs (rankings):** historical match scores per edition.
- **Inputs (randomness model):** the 14 hand-specified sport-level factors above (constants per sport, not per match).
- **Target:** UAS per sport — a descriptive cross-sport statistic. No prediction target for any individual match, team, or season. **Prediction horizon: none.**

## 6. Validation design
- **No predictive validation at all.** The paper is descriptive/explanatory: Kruskal–Wallis test on UASeh across sports yields **p = 2.47×10⁻¹⁰** (significant at 5%); Dunn's test with Bonferroni correction (Table 4) flags significant pairs: soccer vs cricket (0.01239), lacrosse (0.00007), roller hockey (0.00002), rugby (0.00011); water polo vs lacrosse (0.00160), roller hockey (0.00044), rugby (0.00161); field hockey vs lacrosse (0.00884), roller hockey (0.00244), rugby (0.00841); ice hockey vs lacrosse (0.01292), roller hockey (0.00353), rugby (0.01294).
- A Laney p′-chart (Fig. 5) shows nearly all sports fall outside control limits — used to argue the metric is stable across metrics, not as a validation.
- No train/test split, no baseline model, no forecasting accuracy, no calibration, no betting evaluation. The three metrics (3.2, 3.3, 3.4) are presented as mutual corroboration of the same descriptive quantity.

## 7. Numerical results / baselines
Every key number quoted exactly as in the paper (Table 3, λ=1 / 0.5 / 0):
- Water Polo: 0.37 / 0.34 / 0.32. Soccer: 0.36 / 0.27 / 0.22. Field Hockey: 0.31 / 0.22 / 0.20. Ice Hockey: 0.30 / 0.21 / 0.18. Basketball: 0.25 / 0.19 / 0.16. Volleyball: 0.22 / 0.11 / 0.07. Handball: 0.21 / 0.17 / 0.11. Futsal: 0.17 / 0.13 / 0.07. Cricket: 0.15 / 0.11 / 0.08. Lacrosse: 0.08 / 0.07 / 0.06. Rugby: 0.07 / 0.04 / 0.03. Roller Hockey: 0.05 / 0.02 / 0.01.
- Kruskal–Wallis p = **2.47×10⁻¹⁰**.
- PCA: first two components explain **56%** of variance.
- Correlation: UAS strongest positive with **GS/NPG**; strongest negative with **NRAM/NRPM, PI, BG**; weaker negative with SI, PP, FS/BS, BL. Positive-impact factors named: GS/NPG, NP/FS, PBD, PBH, BB, and to a lesser extent GS/BS and BV.
- No baseline or forecasting accuracy numbers exist in the paper.

## 8. Code / data availability
Code: https://github.com/thaksheel/randomness-team-ball-sports.git (stated). Score dataset: Wikipedia scraping code in the repo; companion technical report ISE 24T-003.

## 9. Leakage & limitations
- **Adversarial core:** the 14 "randomness factors" are hand-authored, hand-scored constants per sport (e.g., bounciness categories 0–11, retirement-age experience proxy). The PCA/correlation "explanation" of UAS is circular-adjacent: factors were chosen precisely because they plausibly drive upsets, so finding they correlate with upsets is weak evidence of anything. Negative correlations are reinterpreted post-hoc rather than treated as theory falsification.
- **No predictive content:** UAS is a retrospective aggregate; nothing here forecasts a future match.
- **American football excluded:** the sport GSE cares about most is absent by design.
- **Arbitrary imputation:** cricket's goal-dependent factors are filled by other-sport averages.
- **External validity to NFL:** none. Soccer's high UAS (0.36) is driven by low scoring and draws — the opposite of NFL structure.
- The "answer" to the title question is a narrative, not a number GSE can use.

## 10. GSE overlap
Per the existing-research map, GSE's corpus covers Elo/Glicko/TrueSkill/Bradley-Terry ratings and their expected-score formulas — which already quantify upset probability by rating gap far more precisely for NFL than UAS does for soccer. Nothing in this paper extends or duplicates a GSE capability; it is a different (sociological, cross-sport) inquiry with no GSE analogue.

## 11. GSE implementation spec
None — there is no model to implement. The one transferable idea (upset rate by rating gap) is already subsumed by Elo expected-score curves in GSE's rating work.

## 12. Reproducible test
Not applicable as a predictive test. A descriptive reproduction: recompute UAS on the repo's match-score dataset for soccer and verify UAS(λ=1) = 0.36 — this reproduces the statistic, not a forecast.

## 13. Acceptance / rejection gate
**REJECT.** Rejection stands: no predictive model, no calibration, no market path, NFL excluded by design, and the upsets-by-gap concept is already better handled by rating systems in GSE's corpus. No numeric gate could be cleared because no forecasting numbers exist.

## 14. Improvement experiment
If the question mattered for GSE: compute a per-game underdog win probability as a function of pre-game Elo gap on NFL data (nflverse, 2009–2025), fit a logistic upset curve, and compare its calibration against bookmaker moneylines — turning the paper's descriptive UAS into an actual NFL upset-pricing tool. The paper itself offers no path to this.
