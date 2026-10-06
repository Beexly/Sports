# [0426] CAMP: A Context-Aware Cricket Players Performance Metric (arXiv:2307.13700v1)

**Citation:** Ayub et al. (2023). *CAMP: A Context-Aware Cricket Players Performance Metric*. arXiv:2307.13700v1. URL: https://arxiv.org/abs/2307.13700v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 5140 lines).
**Verdict:** REJECT — the headline validation is circular: the wicket penalty and batting/bowling weights were tuned to maximize agreement with Man-of-the-Match on the same corpus they are evaluated on; the context-decomposition idea is salvageable only as a from-scratch rebuild with held-out tuning.

## 1. Research question
Can cricket player performance be rated in a context-aware way — adjusting for match state (remaining runs, wickets, overs) — better than traditional averages and the prior LNC metric, using Man-of-the-Match (MoM) awards as the ground-truth proxy for "best performance"?

## 2. Dataset / schema
ESPNcricinfo ball-by-ball ODI data, 2001–2019. 1,625 original matches; 1,110 after preprocessing; evaluation on 961 matches. 1,002 batters, 802 bowlers. Preprocessing: matches involving Bangladesh/Zimbabwe removed; matches with total scores beyond ±2 SD filtered out. Schema: ball-by-ball events, batter/bowler IDs, runs, wickets, over number; player vectors: team 72-d (k=3 clusters), batter 132-d (k=4 clusters + dummy fifth), bowler 156-d (k=4 clusters + dummy fifth). Code/data: https://github.com/sohaibayub/CAMP. The Bangladesh/Zimbabwe removal and ±2 SD filtering are survivorship/external-validity problems — see §9.

## 3. Method / model
Expected-remaining-runs model R(S_i) = P(S_i) − T(S_i), where P(S_i) is projected total and T(S_i) is the Duckworth-Lewis-style target/resource adjustment for state S_i (the paper builds its own projection from clustered player/team vectors). Per-over expected value e_i = R(S_i) − R(S_{i+1}); wicket-adjusted e'_i = (1−w)·e_i if a wicket fell in the over, else e_i, with w tuned to 1. Actual over value r_i = A(S_i) − A(S_{i+1}) from realized scores. Batter contribution per over: c_i^p = r_i^p − (e'_i/6)·b_p (b_p = balls faced by batter p). Bowler contribution: ĉ_i^p = e'_i − r_i. Aggregated across the match into C_bat(p), C_bowl(p); final CAMP_score = w_bat·C_bat(p) + w_bowl·C_bowl(p) with w_bat = 1, w_bowl = 0.2 — both weights tuned to maximize MoM agreement on the evaluation corpus (the circularity).

## 4. Equations & assumptions
Stated in the paper:
- R(S_i) = P(S_i) − T(S_i) (expected remaining runs in state S_i)
- e_i = R(S_i) − R(S_{i+1}) (expected runs in over i)
- e'_i = (1 − w)·e_i if wicket lost in over i, else e_i; tuned w = 1
- r_i = A(S_i) − A(S_{i+1}) (actual runs in over i)
- c_i^p = r_i^p − (e'_i/6)·b_p (batter p's contribution)
- ĉ_i^p = e'_i − r_i (bowler p's contribution)
- CAMP_score = w_bat·C_bat(p) + w_bowl·C_bowl(p); tuned w_bat = 1, w_bowl = 0.2
Assumptions: (a) MoM awards are a valid ground truth for best performance; (b) expected-remaining-runs fully captures match context; (c) a wicket in an over zeroes that over's expected value for batters (w=1); (d) batting and bowling contributions combine linearly with fixed weights; (e) clustered player vectors (k=3/4) adequately represent player quality.

## 5. Features / target
Features: clustered team/batter/bowler embedding vectors (72-d/132-d/156-d), ball-by-ball match state (overs, wickets, runs, target). Target for validation: agreement with official Man-of-the-Match awards (top-1/top-2/top-3 rank agreement among the winning team's 11 and among all 22 players).

## 6. Validation design
No train/test split in the ML sense; no temporal validation. The wicket weight w and the batting/bowling weights (1, 0.2) are tuned to maximize MoM agreement and then reported on the same 961-match corpus. Baselines: traditional averages and the LNC metric. Metric: fraction of matches where the metric's top-ranked (top-2, top-3) player matches the official MoM.

## 7. Numerical results / baselines
Table 9 — MoM agreement (exact):
Among the winning team's 11:
- Rank 1: CAMP 638/961 (66.3%), LNC 585/961 (60.8%)
- Top 2: CAMP 799/961 (83.1%), LNC 784/961 (81.5%)
- Top 3: CAMP 867/961 (90.2%), LNC 864/961 (89.9%)
Among all 22 players:
- Rank 1: CAMP 458/961 (47.6%), LNC 461/961 (47.9%)
- Top 2: CAMP 686/961 (71.3%), LNC 650/961 (67.6%)
- Top 3: CAMP 789/961 (82.1%), LNC 773/961 (80.4%)
My interpretation: the rank-1 edge over LNC among the winning eleven (+53 matches, +5.5 pp) is the paper's headline, but it is measured on the tuning corpus — the weights were chosen to maximize exactly this number. The all-22 rank-1 result (CAMP 47.6% vs. LNC 47.9%) shows no edge where it matters most. Net: no credible evidence of improvement.

## 8. Code / data availability
Code and data: https://github.com/sohaibayub/CAMP (public GitHub). Data source: ESPNcricinfo.

## 9. Leakage & limitations
Fatal, adversarial: (a) The wicket penalty (w=1) and the batting/bowling weights (1, 0.2) are tuned to maximize MoM agreement on the same 961 matches used for evaluation — textbook data snooping; the Table 9 deltas are in-sample. (b) No temporal or held-out validation of any kind. (c) Preprocessing removes Bangladesh/Zimbabwe matches and ±2 SD outliers — the metric is validated only on competitive, typical matches; survivorship bias. (d) MoM as ground truth is noisy and narrative-driven (voters reward match-winning moments, exactly what a context metric also rewards — shared bias inflates agreement). (e) w=1 (a wicket zeroes the over's expectation) is an extreme tuned constant with no cricket justification offered. (f) Linear batting+bowling combination ignores all-rounders' joint value. External validity to NFL: cricket overs are discrete, symmetric, and fully observed — a cleaner setting than football; the decomposition idea (expected vs. actual state value per play, credited to participants) transfers, but the paper's validation teaches nothing.

## 10. GSE overlap
New capability in form, familiar in substance. The map shows GSE already computes EPA/play, success rate, drive/down splits, and EPA distributions — the NFL-native version of "actual minus expected state value." What the map does NOT show is per-player attribution of that value in a context-aware decomposition (the snap-APM idea from ledger 0421 is the GSE-native version of this). CAMP's specific contribution — wicket-adjusted over expectations tuned to MoM — has no NFL analogue and no place in the corpus. Classify as: rejected method, with the decomposition concept already better covered by ledgers 0419/0421's residual/APM approaches. No duplication of existing GSE work; also no adoption.

## 11. GSE implementation spec
Do NOT implement CAMP. If the decomposition concept is wanted, build it NFL-natively instead: (1) Data: nflverse 2020–2025. (2) Per-play expected points (from the existing GSE EP model) vs. actual EPA; credit the EPA delta to participants with a snap-APM design (ledger 0421) rather than CAMP's over-level arithmetic. (3) Tune nothing against awards or narrative proxies — validate on out-of-sample prediction (ledger 0421 §12 gate). This is strictly a pointer to the 0421 build; CAMP contributes no additional machinery worth porting. Effort: 0 days for CAMP itself; the real work is already specified in 0421.

## 12. Reproducible test
A fair test of CAMP's actual claim requires re-running their pipeline with the weights tuned on 2001–2010 and evaluated on 2011–2019 — the paper did not do this, and with the public code it would take ~1 day. The predicted result: the rank-1 edge over LNC shrinks to noise, consistent with the all-22 rank-1 numbers already showing no edge. For GSE purposes the test that matters is ledger 0421's §12, not CAMP's.

## 13. Acceptance / rejection gate
REJECT CAMP unconditionally as a method: any metric whose parameters are tuned on its evaluation metric on the same corpus cannot be adopted regardless of the headline numbers. The salvage concept (context-decomposed per-player credit) is gated by ledger 0421 §13 — it must win as snap-APM on held-out NFL data, with no award-agreement tuning anywhere in the pipeline.

## 14. Improvement experiment
The honest version of this paper: rebuild the decomposition with all weights (wicket penalty, bat/bowl balance) tuned on 2001–2010 via cross-validation and evaluated once on 2011–2019, with MoM agreement as the metric but computed strictly out-of-sample — and add a second, harder ground truth: correlation of the metric with next-season player performance (does "context-aware contribution" predict future value better than averages?). If the held-out MoM edge disappears but next-season predictiveness appears, the paper's idea is vindicated with the wrong validation; if both fail, the decomposition adds nothing over averages. Either outcome is more informative than Table 9.
