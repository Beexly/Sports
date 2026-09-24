# 1080 — Time-Varying Home Field Advantage in Football: Learning from a Non-Stationary Causal Process

## Citation / full-text source

- arXiv:2506.11399v1 — full text: https://arxiv.org/pdf/2506.11399
- (Section added during wave-2 reconciliation; citation details also appear in the ledger front matter/title above.)

- **arXiv ID**: 2506.11399v1
- **Full-text URL**: https://arxiv.org/pdf/2506.11399v1 (read in full; HTML conversion, 245,588 bytes; also at https://arxiv.org/abs/2506.11399)
- **Authors**: Minhao Qi, Hengrui Cai, Guanyu Hu, Weining Shen
- **Lane**: calibration_uncertainty (replacement for REJECT 1806.10648v2)
- **Verdict**: **ADAPT**
- **Replacement chain**: 1806.10648v2 REJECT → 2303.06021v4 (ledger 1079, read in full but disqualified as non-compliant: drawn from calibration/betting searches, not the mandated referee-bias/home-advantage lane) → **2506.11399v1 ADAPT (compliant fresh search: referee-bias/home-advantage mechanism lane)**
- **Fresh-search record (2026-09-21)**: five arXiv API queries, all in the referee-bias/home-advantage mechanism lane:
  1. `ti:"referee bias" OR ti:"home advantage"` → 13 entries, 12 fresh (incl. 2509.22683, 2506.09287, 2411.12509, 2308.06279, 2105.01446, 2104.11595, 2101.00457, 2012.14949, 2008.05417, 2007.12255, 1701.07555, 1207.0700; 2401.16392v3 flagged DUP — already ledged as 1077)
  2. `all:"referee bias" AND all:sport` → 2 fresh: **2506.11399v1** (selected), 1603.08821v1
  3. `all:"home advantage" AND all:football` → 12 entries, 7 fresh (2506.21253, 2411.12509, 2308.06279, 2104.11595, 2101.00457, 2007.12255, 1701.07555)
  4. `all:"home advantage" AND (all:NFL OR all:basketball)` → 6 entries, 2 fresh (2104.11595v1, 1603.08821v1)
  5. `all:officiating AND all:bias AND all:sport` → 3 entries, 2 fresh (2608.01696 irrelevant CV; 2511.00553 Olympic judging — out of scope)
- **Selection rationale**: 2506.11399v1 chosen over 2104.11595v1 (NFL crowd HA, descriptive only) and 2008.05417v2 (Bundesliga bookmaker mispricing, strong but soccer-only and descriptive) because it is (a) explicitly referee-bias mechanism + time-varying causal discovery, (b) methodological and reusable (novel causal-discovery algorithm with identifiability/consistency guarantees, not just a league case study), (c) improves a prediction task (goal-prediction MSE beats DYNOTEAR and raw xG), and (d) the newest (2025) with team-specific, within-match HA estimates — closest match to GSE's need for a dynamic, team- and official-aware NFL home-field adjustment.
- **Reason for ADAPT**: GSE currently treats home-field advantage as a near-static scalar per team/league. This paper shows HA is time-varying within a match, team-specific, and driven by a quantifiable referee-bias pathway (opponent fouls → opponent yellow cards under crowd pressure), and provides a portable method (DYNAMO local kernel-weighted DAG learning) plus a concrete proof that modeling the time-varying causal structure beats raw xG on minute-level goal prediction. The causal-discovery machinery ports directly to NFL: NFL officiating-crew penalty patterns + attendance/snap-timing data are the exact analogues of the EPL variables, and the 2401.16392v3 ledger already established HA's 1.73-point NFL baseline and decline. DYNAMO is the first mechanism in the corpus that can decompose *why* a given team's home edge moved — crew-specific referee bias vs crowd-driven performance — which is actionable for spread pricing and CLV.
- **Read depth**: FULL READ cover to cover: abstract, introduction (all four literature strands), motivating data section (EPL seasons, XG-by-minute patterns, variable definitions), full method (model eq. 1, stationary approximation props 1–2, linear and nonlinear DYNAMO losses, kernel bandwidth quasi-k-fold CV, Theorems 1–2), simulation study (SHD/F1 vs DYNOTEARS, NTS-NOTEAR, PCMCI+, CD-NOD), Section 5 applications (4-team analysis, XG MSE table, referee-bias patterns, remaining 16 teams), conclusion/future work, references.
- **Wave**: wave2-reader-20
- **GSE overlap**: The existing-research map has no causal-discovery-for-home-advantage entry. Ledger 1077 (2401.16392v3) provides the static Bayesian HA baseline (NFL 1.73 pts, declining −0.032/yr) that DYNAMO would extend dynamically; no DYNAMO/NOTEARS/DYNOTEARS/causal-graph work exists in the corpus. Not a duplicate — extension into mechanism-level, within-game HA modeling.

## Research question

How can time-varying causal graphs be learned from non-stationary time series without assuming stationarity, faithfulness, or constant Gaussian noise?

## Summary

The paper proposes DYNAMO (DYnamic Non-stAtionary local M-estimatOrs), a causal structure learning method for non-stationary time series that estimates time-varying causal graphs without stationarity, faithfulness, or constant-Gaussian-noise assumptions. Core trick: approximate the non-stationary process at each time t by a stationary process sharing the same causal structure (Dahlhaus-style local stationarity, Props 1–2), then estimate per-time-point DAGs with a kernel-localized M-estimator (Epanechnikov, bandwidth via quasi-k-fold CV) using NOTEARS (linear) or NTS-NOTEAR (nonlinear) losses. Theorems 1–2 prove structural identifiability and estimation consistency. Applied to 1.6M Wyscout events from 760 EPL matches (2020-21 no-crowd, 2021-22 with crowds), the paper finds: (1) HA collapsed in empty stadiums — 2020-21 home win 37.9% vs away 40.3%; 2021-22 home win 43.0%, +9 points over away; (2) referee-bias pathways (opponent fouls OF / opponent yellow cards OY → expected goals XG) are time-varying within matches and team-specific: Liverpool gets steady escalating bias with crowds (Anfield), Man City triggers early opponent yellows then second-half fouls, Arsenal flips from second-half favoritism (empty) to performance-driven bias (crowded); (3) non-relegated teams shifted from opponent fouls (empty) to opponent yellow cards (crowded) — crowd pressure makes refs punish away teams more harshly; lower-ranked/relegated teams barely change; (4) DYNAMO-predicted minute-level XG beats DYNOTEAR and raw XG on goal-prediction MSE for all 4 studied teams across both seasons.

## Method, math, and equations

- Model (eq. 1): **x**_t := f(Pa(**x**_t), **ε**_t; **θ**(τ_t)), τ_t = t/T, parents from instantaneous + L lagged variables; causal structure **θ**(τ_t) varies smoothly with t.
- Assumptions: 1 (unconfoundedness — no unobserved confounders), 2 (DAG acyclicity at each t), 3 (locally stationary causality — Lipschitz contraction Σα_j(ϑ)<1, parameter-space Lipschitz), 4 (symmetric Lipschitz kernel, bandwidth h with (T,h)→(∞,0), Th→∞).
- Prop 1–2: for each τ there exists a stationary approximation **x̃**_t(τ) with identical causal structure; ‖**x**_t − **x̃**_t(τ_t)‖_q = O(T^{−1}).
- DYNAMO loss (eq. 3): ℒ_t(ϑ) = (1/Th) Σ_l ℓ(**x**_l, Y_{l−1}; ϑ) K_h(τ_l − τ_t).
- Linear (eq. 4): NOTEARS loss ‖**x**_l − W_t^T**x**_l − A_t^TY_{l−1}‖²₂ K_h + λ₁‖W_t‖ + λ₂‖A_t‖ + (ρ/2)H(W_t)² + αH(W_t), H(W)=tr(e^{W∘W})−d (acyclicity trace-exponential); solved via W=W₊−W₋ split with L-BFGS-B.
- Nonlinear (eq. 5): NTS-NOTEAR loss with neural net g_t and graph W_t(g_t).
- Bandwidth selection: "quasi-k-fold CV" — local likelihood excluding fold T_k, ĥ_t minimizing ℒ_CV^t(h) (eq. 6); Epanechnikov kernel recommended.
- Theorem 1: DYNAMO structurally identifiable under Assumptions 1–4 (no faithfulness assumption needed).
- Theorem 2: θ̂(τ_t) → θ(τ_t) with probability →1 as (T,h)→(∞,0), Th→∞, Th⁷→0.

## Datasets

- Primary: >1.6M within-game events from 760 matches, English Premier League 2020-21 (closed doors) and 2021-22 (spectators), via collaboration with Hudl & Wyscout. Variables per minute per team (home−away differences, demeaned vs opponent): Total Passes, Total Shots, Pass Accuracy, Shot Accuracy, Opponent's Yellow Cards, Opponent's Fouls, Expected Goals; controls: key passes, dribbles, tackles, etc.
- Simulation: ER graphs with cosine time-varying weights (threshold γ, speed Φ), T=500, linear + tanh/sigmoid nonlinear, 20 seeds; metrics SHD and F1 vs DYNOTEARS, NTS-NOTEAR, PCMCI+, CD-NOD.
- Access: proprietary (Wyscout collaboration; not public). Appendices D–E detail preprocessing/robustness but were not fetched — the data-provenance risk is flagged under Limitations.

## GSE application and implementation spec

1. **Data sources**: NFL officiating data (penalty calls by crew — NFL penalty data is public via nflverse play-by-play; crew assignment from official gamebooks), attendance figures (NFL publishes; COVID 2020 partial/empty-stadium weeks are the natural experiment), and GSE's own per-drive expected-points engine outputs as the XG analogue.
2. **Variables** (NFL analogues of the EPL set): pass/rush success rate, EPA per play, sack rate, opponent penalties accepted (OY analogue), penalty yards against opponent (OF analogue), per-drive xP — as minute- or drive-binned series, home−away differences, opponent-strength adjusted.
3. **Model**: linear DYNAMO (NOTEARS base learner) per team, τ over the season/game; Epanechnikov kernel with quasi-k-fold bandwidth; L=1 lag. Output: time-varying per-team home-field structure with referee-bias pathway weights separated from performance pathways.
4. **Serving**: precompute weekly HA decomposition (crew-adjusted home edge = performance component + referee-bias component × crew's historical bias); feed as features into the spread/ML pricing model and CLV tracker. Effort: ~2–3 weeks for one engineer (NOTEARS is public; the kernel-localized wrapper is new).
5. **First deliverable**: reproduce Table-1-style MSE test — DYNAMO-predicted per-drive xP vs static-HA xP vs baseline xP, 2020–2024 NFL seasons, held out weekly.

## Leakage

- Minute-level home−away differences are constructed from full-match stats and demeaned vs opponent — the paper's own Appendix D preprocessing wasn't independently verified; unobserved confounders (Assumption 1 unconfoundedness is strong for football: tactical shifts, score-state effects, referee crew fixed effects) are assumed away, so causal claims rest on the assumption, not on design.
- 2020-21 vs 2021-22 comparison conflates crowd return with other season changes (new players, managers, rule tweaks) — a confounded natural experiment; the paper partially addresses it via the 16-team heterogeneity analysis but cannot eliminate it.
- Simulation evaluation: authors generate the data from their own model class (cosine-weight ER graphs), favoring their method; SHD/F1 comparisons on that distribution are circular.

## Limitations

- Data is proprietary (Hudl & Wyscout); the core empirical result cannot be independently reproduced without licensing event data.
- Analysis is soccer (EPL); NFL dynamics (officials' crew structure, discrete drives, 16–17 game seasons vs 38) differ materially — transfer of the quantitative patterns, not just the method, is not established.
- Four-team deep dive (Man City, Liverpool, Arsenal, Man United) is cherry-picked for narrative clarity; the 16-team summary is compressed into Appendix D.
- "Referee bias" is inferred from foul/yellow-card differentials, not from direct measurement of officiating errors — it is an association labeled as bias; the paper acknowledges the inferential gap.
- No runtime/cost analysis for per-time-point optimization; nonlinear DYNAMO via NTS-NOTEAR is expensive and scaling to a full league-weekly NFL pipeline is unstated.
- Assumption of no unobserved confounders is violated in football by construction (score state, weather, injuries); the paper does not test sensitivity to violations.
- Table 1 MSE improvements are small in absolute terms (e.g., Arsenal 2020-21: 0.00046 vs 0.00063 XG baseline) — statistically consistent but practically modest for goal prediction.

## GSE overlap

- Ledger 1077 (2401.16392v3): static Bayesian NFL HA (1.73 points, declining) — the baseline DYNAMO would decompose dynamically. No causal-discovery method exists anywhere in the corpus; no NOTEARS/DYNOTEARS/DAG-learning ledger; no referee-bias mechanism ledger. The existing-research map has no home-advantage mechanism entry. **Extension, not duplicate**: it converts HA from a scalar into a time-varying, crew-aware, mechanism-separated feature.

## Implementation difficulty

Medium. Linear DYNAMO's NOTEARS base learner is public and the kernel wrapper is straightforward math; the hard parts are (a) building the NFL per-drive panel with crew assignments and attendance (data engineering, not science), (b) per-time-point nonconvex optimization cost at league scale, and (c) validating that the referee-bias pathway survives the unconfoundedness assumption's violation in NFL data. Nonlinear DYNAMO is a stretch goal — start linear.

## Reproducible test

Reproduce the paper's Table-1 MSE test on NFL: build per-drive series for 2020–2024 (home−away differences in EPA/play, success rate, opponent penalties accepted, penalty yards against, expected points), fit linear DYNAMO per team with L=1 and Epanechnikov kernel (quasi-k-fold bandwidth), predict per-drive xP, and compare MSE vs (a) DYNOTEARS, (b) static-HA-adjusted xP, (c) raw xP. Baseline to beat: raw xP MSE on held-out 2024 weeks. Success criterion is in the Numeric gate.

## Numeric gate

**0.00079** — DYNAMO's worst per-team 2021-22 goal-prediction MSE (Arsenal), which beat both DYNOTEAR (0.00106) and raw XG (0.00111): adopt the method for GSE only if, on the NFL reproducibility test, DYNAMO-predicted per-drive xP achieves **MSE at least 10% lower than the raw-xP baseline on held-out weeks** — the paper's Arsenal 2021-22 improvement (0.00079 vs 0.00111, ≈29%) sets the bar for a meaningful gain; below 10% the complexity is not worth the NFL pipeline cost.

## Improvement experiment

Replace the assumed-away unconfoundedness (Assumption 1) with an explicit officiating-crew model: add crew fixed effects and crew×crowd interaction terms as observed nodes in the DYNAMO graph for NFL, and test whether the referee-bias pathway (penalty differentials → xP) collapses when crew identity is controlled — if the bias pathway survives, GSE has a crew-specific HA adjustment worth pricing; if it collapses, the "bias" was crew assignment (scheduling) not bias, and the feature should be a schedule term instead. Second, swap NOTEARS for a score-based nonlinear base learner (e.g., DAGMA) inside the DYNAMO kernel wrapper and test whether nonlinear edges add predictive MSE beyond linear on NFL per-drive data.

## Verdict

**ADAPT** — DYNAMO's time-varying, team-specific causal decomposition of home-field advantage (referee-bias pathway via opponent fouls/yellow cards vs crowd-driven performance pathway, validated on the 2020-21/2021-22 EPL natural experiment and improving minute-level goal-prediction MSE over DYNOTEAR and raw xG) is directly portable to NFL: GSE's HA feature should stop being a static scalar and become a crew-aware, within-game causal structure. Implement linear DYNAMO on NFL per-drive penalty/episode data first; gate on a ≥10% MSE improvement over raw xP on held-out weeks.
