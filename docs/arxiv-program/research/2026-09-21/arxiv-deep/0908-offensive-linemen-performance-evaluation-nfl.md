# [0908] Evaluating the Performance of Offensive Linemen in the NFL (arXiv:1603.07593v2)

## Citation / full-text source

- arXiv:1603.07593v2 — full text: https://arxiv.org/pdf/1603.07593
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Nikhil Byanna, Diego Klabjan (2016). *Evaluating the Performance of Offensive Linemen in the NFL*. arXiv:1603.07593v2 [stat.ML]. URL: https://arxiv.org/abs/1603.07593v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org, 37 pages incl. appendices).
## Verdict

**ADAPT** — the "differential statistics" (to-side vs not-to-side) construction is a clean teammate-control trick for attributing team outcomes to individuals, and the cluster → salary-distribution → anomaly pipeline ports directly to DFS salary mispricing detection.

## 1. Research question
How can an NFL offensive lineman be evaluated objectively (without film grades), and can such a framework identify linemen whose salaries are anomalous — overvalued or undervalued — relative to comparable players?

## 2. Dataset / schema
- STATS LLC play-by-play, aggregated game-by-game: every OL with ≥1 snap in 2013-14 and 2014-15 regular + playoff games. **5,383 player-game data points × 44 variables** (descriptive: game code, date, player, team, opponent, position, rookie year, draft round/pick, birthday; salary: base, signing bonus, incentives, cap value, snaps; rushing/passing splits).
- Directional splits: line divided into 5 splits (LS, L, M, R, RS); per position, "to side" = plays to the lineman's side (e.g., LT: LS,L; C: L,M,R), "not to side" = all other splits. Rationale: to-side = direct contribution; not-to-side = control for teammates/RB quality.
- Supplements: Pro Bowl / All-Pro selections (Pro-Football-Reference, manual), PFF grades 2007–2015 (manual extract, used as regressor candidate and validation).
- Proprietary (STATS LLC); paper's exact data not released.

## 3. Method / model
Five-stage pipeline: (1) **Stepwise OLS** of cap value (avg $/yr, cap-inflation-adjusted) on 15 candidate predictors to learn what the NFL labor market prices; exclusions: rookie contracts, non-UFAs, pre-2011-CBA contracts; duplicate-contract players averaged to one row. (2) Build Experience/Performance composite metrics from coefficient-weighted predictors; test "team" (adjacent-lineman) controls — dropped, not significant. (3) **k-means** (Hartigan–Wong) on standardized salary-model predictors; k=7 chosen via **Krzanowski–Lai statistic** local maxima. (4) Characterize clusters via 1%-level t-tests vs population means → decide one- vs two-sided anomaly tests. (5) Fit salary distributions per cluster (candidates: Lognormal, Gamma, Beta, Pareto, Weibull — McDonald 1984 income families; chosen by χ² + AIC + P-P/Q-Q plots; clusters with n too small skipped) → flag players with P(salary ≥ S) < 5% (one-sided) as over/undervalued, plus silhouette-value gate s(i) > sample mean (Eq. 7).
- Five "differential statistics": stuff % differential, yards/attempt differential, successful-run % differential, pressures-allowed %, sack % (each = to-side minus not-to-side, or allowed-rate ratios).

## 4. Equations & assumptions
- (1) Salary_i = X_i′β + ε (OLS; equations (2)–(5) define normalized coefficient weights and Experience/Performance composites; (6) Krzanowski–Lai statistic on within-cluster SS; (7) silhouette gate s(i) > mean s).
- Exact formulas for (2)–(7) are garbled in the PDF extraction (symbols missing) — the *procedure* is fully described in prose; do not reconstruct the algebra from memory.
- Assumptions: cap value reflects free-market pricing (after exclusions); differential stats control for opposite-side line/RB quality; clusters are homogeneous enough that intra-cluster salary comparison is fair; salary within cluster drawn from a parametric income-family distribution; silhouette > mean heuristic substitutes for a formal homogeneity test.

## 5. Features / target
Candidate predictors: age, experience, draft round/pick, Pro Bowl count, 3 All-Pro team counts, avg past PFF rating, current-year PFF rating (not significant — dropped), 5 differential stats, snaps, holding penalties. Final salary model (8 predictors): intercept, avg PFF prior to contract, experience, draft round, Pro Bowl selections, stuff % differential, yds/attempt differential, sack %. Target: cap value ($/yr).

## 6. Validation design
No out-of-sample prediction; validation is corroborative: (a) flagged players' PFF relative-performance-rank vs relative-salary-rank (Table 7); (b) real-world follow-ups (releases); (c) regression diagnostics (adjusted R² comparisons of to-side-only vs differential specifications, Appendix A). Cluster count selected by KL statistic, not CV.

## 7. Numerical results / baselines
- Salary model (Table 11, adj. R² = **0.50**): intercept 5,399,261 (p=2.12e-15); avg PFF prior to contract +56,697 (p=0.00268); experience −199,134 (p=0.00831); draft round −264,405 (p=5.38e-5); Pro Bowl selections +624,910 (p=0.000338); stuff % differential −82,247 (p=0.012284); yds/attempt differential +382,197 (p=0.044516); sack % −2,516 (p=0.022994). Current-year PFF rating **not significant** — differential stats beat PFF for salary explanation.
- Differential vs to-side-only (Appendix A): to-side-only adj. R² = 0.47; adding not-to-side terms → 0.50, with not-to-side coefficients opposite-signed to to-side (as the control logic predicts) and successful-run % to-side losing significance.
- Clusters (k=7, n=133): sizes 25/17/18/23/24/8/18; salary means $5.12M/$2.97M/$3.84M/$2.21M/$2.53M/$6.66M/$3.10M (sample mean $3,518,357, SD $2,146,048). Cluster 6 (n=8) dropped as too small. Mean silhouette ≈ **0.16** (weak; Kaufman–Rousseeuw suggest >0.25, ideally >0.5).
- Flagged (Tables 5–6): **undervalued** — John Jerry (NYG G, 2014, $795,635), Mike McGlynn (KC G, 2014, $1,037,594); **overvalued** — Scott Wells (STL C, 2013 & 2014, $5,283,150), Davin Joseph (TB G, 2013, $6,889,518).
- PFF-rank corroboration (Table 7): 4 of 5 agree in direction (Jerry 23 vs 28; Wells 11/13 vs 3; Joseph 30 vs 1); McGlynn disagrees (31 vs 27). Joseph released by TB post-2013; Wells released by STL post-2014.
- Paper-internal inconsistency (flagged, not resolved): abstract §5 say five players; §7 conclusion says "3 overvalued and 3 undervalued… 4 of the 6"; §5.2 says "eleven… eliminated six of the twelve". Tables list 5.

## 8. Code / data availability
None stated. STATS LLC data proprietary; PFF/PFR extracts manual.

## 9. Leakage
Salary (dependent) is negotiated with knowledge of past performance — regressors include Pro Bowls/PFF-prior, so this is explanatory modeling, not prediction; no temporal leakage claimed. Differential stats use same-season outcomes that post-date contract signing for many players — fine for "was he worth it" but not for forecasting. Duplicate-contract players averaged then disaggregated for clustering (mild heteroscedasticity handling, disclosed).

## Limitations
- Tiny sample: 2 seasons, n=133 for clustering; silhouette 0.16 signals weak clusters; one cluster dropped; distribution fits on n≈17–25.
- Internal count inconsistencies (5 vs 6 vs 11/12 flagged players) — the headline finding's exact N is unreliable.
- No out-of-sample validation of the flagging rule; corroboration is anecdotal (2 releases, PFF ranks).
- Differential stats can't handle pull/stretch/counter plays (lineman contributes away from his side); no control for defensive-line quality or scheme (authors acknowledge).
- 2013–2015 data; salary-cap regime and tracking data have both moved on.

## 10. GSE overlap
GSE has no OL-evaluation or salary-mispricing lane; the existing-research-map has nothing on labor-market pricing or differential teammate controls. GSE *does* have adjacent needs: (a) DFS salary value detection (points-per-$K edge), (b) attributing team EPA to individuals with teammate controls (props). The paper's pipeline is an **extension** — a new, cheap analytic — not a duplicate.

## 11. GSE implementation spec
1. **DFS value screen:** cluster each week's DFS slate by position using standardized performance predictors (recent EPA/target share/snap share/route %, matchup); fit lognormal salary distributions per cluster (salaries = DK/FD $K); flag players in the bottom 5% of their cluster's salary distribution as value plays. This is the paper's §4.4–4.5 transplanted from NFL cap to DFS pricing.
2. **Differential stats for props:** for each skill player compute to-role vs off-role differentials — e.g., WR yards/target when targeted vs team yards/play when not targeted; RB yards/carry to his primary gap vs other gaps (nflverse has run location); TE production with/without a co-TE on field. Use as teammate-adjusted features in the prop model.
3. Validate flags against actual DFS points-per-$K over 2023–2025 slates.
4. Effort: small — 2–3 days; all data in nflverse + DK salary CSVs already in repo.

## 12. Reproducible test
Dataset: 2023–2025 DraftKings main slates (salaries + actual fantasy points, already in repo's 2026-09-19-dk-week2/ lineage). Protocol: per slate, per position, k-means (k via KL statistic) on standardized trailing-4-week features; fit lognormal per cluster; flag bottom-5% salary anomalies; measure flagged players' fantasy-points-per-$1K vs slate average, paired by slate.

## 13. Acceptance / rejection gate
**Numeric gate:** ADOPT the cluster-salary value screen as a weekly DFS input iff flagged "undervalued" players outscore their positional slate average in points-per-$1K by ≥ 10% with a paired t-test p < 0.05 over the 2023–2025 test window (≥ 40 slates). Otherwise REJECT.

## 14. Improvement experiment
Replace k-means+KL with a Gaussian mixture selected by BIC (soft assignment handles the paper's weak-silhouette problem), and replace the 5% tail rule with a proper conformal p-value for "salary lower than expected given cluster" — turning the heuristic flag into a calibrated anomaly score that can feed the optimizer as a value prior.

**Verdict: ADAPT** — differential teammate controls for the prop model and a cluster-based DFS salary-value screen, both cheap to build on data GSE already holds.
