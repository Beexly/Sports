# [1198] Optimal selection of the starting lineup for a football team (arXiv:2303.12385v2)

**Citation:** Deb, S., & Das, S. (2023). *Optimal selection of the starting lineup for a football team*. arXiv:2303.12385v2 [stat.AP]. URL: https://arxiv.org/abs/2303.12385
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org, 25 pages, complete through supplement tables S2–S12).
**Verdict:** REJECT — EPL soccer lineup-optimization paper whose two-stage LASSO-MLR + GRASP framework is textbook OR with no transfer path to NFL win/total prediction, bet sizing, or GSE's existing salary-cap DFS optimizer.

## 1. Research question
How to select the optimal starting eleven for a soccer team against a specific opponent: (1) a modified multinomial logistic regression identifies which player skills, individual fixed effects, and player-pair synergies drive win/draw/loss probabilities; (2) a GRASP-type multi-start heuristic then searches the lineup space to maximize win probability. Secondary by-product: a "management efficiency" ratio (actual vs optimal win probability) rating each club's team selection. (Sec. 1)

## 2. Dataset / schema
- European Soccer Database (ESD) via Kaggle (link given: kaggle.com/hugomathien/soccer). English Premier League, 8 seasons 2008/09–2015/16.
- Restricted to the 10 clubs present in all 8 seasons; 272–290 usable matches per club (Table 1); per-match starting eleven + positions.
- 33 player attributes (scale 1–99, dynamically updated) aggregated by PCA (first principal component weights, Table S2) into 4 skill indices per player: goalkeeping, defensive, attacking, general.
- Train: seasons 2008/09–2014/15; test: 2015/16 season (38 matches/team). Time-ordered split. (Sec. 2)

## 3. Method / model
- **Stage 1:** Multinomial logistic regression (Draw = pivot) on win/loss/draw. Features: home/away indicator, 10 lineup-strength measures (eq. 2.2) for own + opponent lineups, fixed effects for players with ≥30 appearances in a position, two-way player-pair interactions with ≥30 joint appearances. Feature selection via LASSO with forced inclusion of GK/defender-defensive/midfielder-general/forward-attacking skills (both teams) and a hard cap of ≤20 selected variables; then plain MLR refit on selected set (de-biasing). (Sec. 3.1)
- **Stage 2:** GRASP-type meta-heuristic: multi-start (min 10 random starts, min 20 iterations); neighborhood = lineups differing by exactly one player (eq. 3.4); greedy best-neighbor move; random restart on convergence or cycling; relative-improvement convergence criterion δ on P(win|S). (Sec. 3.2, Algorithm 1)

## 4. Equations & assumptions
- Multinomial logit with Draw pivot: log[P(Y=Loss|x)/P(Y=Draw|x)] = xᵀβ_l; log[P(Y=Win|x)/P(Y=Draw|x)] = xᵀβ_w (eq. 3.1); P(Win) = exp(xᵀβ_w)/[1+exp(xᵀβ_w)+exp(xᵀβ_l)] (eq. 3.2).
- LASSO objective: β̂ = argmin{−log L(β) + λ‖β_S‖₁} over unconstrained coefficients (eq. 3.3).
- Neighbor definition: |S − S*| = Σ|S[i] − S*[i]| = 2 (eq. 3.4).
- Management efficiency = P(win|actual XI) / P(win|optimal XI) ∈ [0,1] (Sec. 4.2).
- Assumptions: opponent fields best-skilled XI; skill indices (PCA-weighted FIFA-style ratings) validly proxy current ability; forced-variable constraints; 30-match threshold for fixed/interaction effects.

## 5. Features / target
- Inputs: home indicator, 20 strength measures (10 own + 10 opponent), player-position fixed effects (600 candidates), pairwise interactions (2,171 candidates).
- Target: match outcome {win, draw, loss} for reference team; optimization objective = maximize P(win).

## 6. Validation design
- Per-team models (10 separate models; combined-team model shown inferior). Train 2008/09–2014/15, test 2015/16 (time-ordered).
- Baselines: plain multinomial LR without LASSO step; plus-minus (PM) rating-based LASSO-MLR variant; compared on AIC (Table S1). Proposed model wins AIC on 9 of 10 teams (exception: Sunderland) and combined (4678.97 vs 4924.34 LR).
- No out-of-sample profit/win-rate vs bookmakers; no calibration metrics; optimization applied recursively per test match.

## 7. Numerical results / baselines
- Management efficiency (2015/16), average: Tottenham 0.822 (best), Aston Villa 0.746, Everton 0.730, Arsenal 0.722, Chelsea 0.662, Man City 0.647, Liverpool 0.604, Man Utd 0.579, Stoke City 0.456, Sunderland 0.403 (Table 4). SD ranges 0.096–0.312.
- Case study (Arsenal vs Tottenham, 8 Nov 2015): 6 suggested changes raise model P(win) from 66.2% to 73.9%; reverse leg (5 Mar 2016, actual 2–2): from 36.7% to 57.1% (Sec. 4.3).
- AIC comparisons: proposed beats LR and PM-rating variants on all teams except Sunderland (Table S1).
- Significant synergies (Table 3), e.g., Chelsea Cole:Mata pair +1.67 (0.677)* on win log-odds; Stoke's Sidibe −2.24 (0.779)* win / −4.03 (0.839)* loss.

## 8. Code / data availability
None stated (no code link). Data: public ESD on Kaggle (link given). Supplement tables included in PDF.

## 9. Leakage & limitations
- Skills (PCA-weighted FIFA-style ratings) are themselves functions of observed performance, including matches being predicted — lookahead/rating-informativeness issue acknowledged implicitly only via "dynamically updated" attributes.
- Adversarial: no comparison against bookmaker odds as a baseline (only AIC vs own variants); optimization gains measured against the model's OWN win probabilities — self-referential (a badly calibrated model yields fake "efficiency gaps"). No holdout-season replication.
- 30-match thresholds and ≤20-variable cap are subjective (authors admit).
- Soccer-specific (draw, formations, 11-a-side, FIFA skill ratings) — no NFL transfer mechanism presented.

## 10. GSE overlap
No direct overlap: GSE's corpus covers team-level NFL efficiency metrics and market-relative modeling, not soccer lineup construction. GSE's DFS lane uses a salary-cap optimizer (different combinatorial problem). The LASSO-MLR + mandatory-covariate pattern and GRASP heuristic are generic OR, already standard in the repo's optimizer tooling. Not duplicate — simply inapplicable.

## 11. GSE implementation spec
None — no NFL-relevant build follows. (Hypothetical: none of the EPL-specific machinery transfers; GSE's starting lineups are effectively fixed in NFL prediction.)

## 12. Reproducible test
N/A — paper is about soccer XI selection; there is no GSE test surface.

## 13. Acceptance / rejection gate
Reject — see verdict.

## 14. Improvement experiment
If revisited for NFL: replace FIFA ratings with tracking-based player participation values and apply the LASSO-with-forced-covariates idea to *prop* markets where individual player outcomes matter (e.g., receiver yardage vs coverage personnel) — but that is a different paper, not this one.
