# [1446] Ranking by points and ordinal models (arXiv:2608.23859)

**Citation:** Leszek Szczecinski (2026). *Ranking by points and ordinal models*. arXiv:2608.23859v1 [math.ST]. URL: https://arxiv.org/abs/2608.23859
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 33 pages incl. appendix with full proof of Lemma 1, converted via pdftotext).
**Verdict:** ADAPT — use Lemma 1's constant-sum sufficiency test and the uniform-rule recommendation to (a) audit GSE's team-rating pipeline: replace ad-hoc points-style aggregations with the fitted AC model; (b) build the adjacent-categories (AC) ordinal model with slopes = score points as GSE's discrete-outcome (win/draw/loss, cover/push/no-cover) rating engine, with the venue-balanced round-robin corollary justifying when plain point counting equals the MAP skill ranking.

## 1. Research question
Sports leagues rank teams by counting points with mandated score-points (e.g., football (0-1-3), NHL (0-1-2-2)), with no probabilistic model behind them. Under what model is the accumulated score a *sufficient statistic* for team skill, and under what schedule conditions does ranking by score reproduce the ranking by estimated skills?

## 2. Dataset / schema
Nine leagues across association football (Division 1 England 1950–1991, EPL 1992–2025, Championship 1993–2025, Bundesliga 1965–2025 — covering 2-point and 3-point eras), ice hockey (NHL 2005–2025, SHL 1999–2003 & 2010–2025), volleyball (SuperLega Italy 2009–2024). Outcomes: football L=3 (loss/draw/win); NHL L=4 (regulation loss/OT loss/OT win/regulation win); SHL L=4; SuperLega L=6 (set scores 0-3…3-0). Excludes COVID seasons 2019/20–2020/21, NHL lockout 2012/13, pre-2005 NHL draws, 2004/05–2009/10 SHL draws. Data source: league records (described, not linked in extracted text).

## 3. Method / model
Theoretical: adjacent-categories (AC) multinomial logistic model P_y^h(z) = exp(α_y^h + δ_y z)/Σ_l exp(α_l^h + δ_l z) with linear predictor α_y^h + δ_y z; gradients ℓ̇_y^h(z) = δ_y − G^h(z) where G^h(z) = E[δ_Y|z]. MAP estimation (eq. 16) with Gaussian prior of precision γ (strictly concave → unique estimate; prevents divergence for all-win/all-loss teams). Parameters + γ estimated jointly by maximizing marginal likelihood via EM (skills integrated out, Gaussian posterior approximation, Gauss–Hermite quadrature per match; γ̂⁻¹ = mean_i(θ̂_i² + [H⁻¹]_ii)). Home advantage via home-boost model P_y^h(z) = P_y(z+η), P_y^a(z) = P_y(z−η), equivalent to α_y^h = α_y + δ_y η.

## 4. Equations & assumptions
- Score: s_i = Σ_y ξ_y k_{y;i} (eq. 3). Ranking: s_i > s_j ⟹ i ≻ j.
- Venue reciprocity: P_y^h(z_{i,j}) = P_{L−1−y}^a(−z_{i,j}) (eq. 7); venue-neutral: P_y(z) = P_{L−1−y}(−z).
- AC model (eq. 9): P_y^h(z) = e^{α_y^h+δ_y z}/D^h(z), D^h(z) = Σ_l e^{α_l^h+δ_l z}.
- **Lemma 1 (sufficiency):** the point count (3) is a sufficient statistic for the skills ⟺ (i) score-points are constant-sum, ξ_y + ξ_{L−1−y} = 1 (so every match distributes the same total), AND (ii) outcomes follow the AC model with slopes δ_y = ξ_y (the score-points themselves).
- Estimating equation (18)/(20): Σ_{j≠i}[k_{i,j} G̃(θ̂_i−θ̂_j) + d_{i,j} Ğ(θ̂_i−θ̂_j)] + γ θ̂_i = s_i, where k_{i,j} = meetings, d_{i,j} = home−away imbalance. Data enter ONLY through the score s_i.
- **Proposition 1:** if pair (i,j) is schedule-equivalent (meets every other opponent equally often) and venue-balanced (hosts/visits every opponent equally often), then s_i ≥ s_j ⟺ θ̂_i ≥ θ̂_j. Corollary 1: on a venue-balanced round-robin (e.g., double round-robin), point counting and the exact MAP ranking agree for ALL pairs, and coincide with Elo (order-invariant to intercepts, home advantage, and prior — Corollary 2).
- Assumptions: players orderable by scalar skill; outcomes depend on skill difference z_{i,j} = θ_i − θ_j only (plus venue); rational non-decreasing score-points; log-concave prior. Limitation acknowledged: players know the points rule and it acts as an incentive (e.g., (0-1-3) rewards offense), which the probabilistic model does not capture.

## 5. Features / target
Input features: per-team per-opponent outcome counts k_{y;i,j}^h (home) with away alias k_{y;i,j}^a = k_{L−1−y;j,i}^h; schedule structure (k_{i,j}, d_{i,j}). Target: ranking order via estimated skill θ̂_i (MAP) vs accumulated score s_i with fitted slopes.

## 6. Validation design
Nine leagues, multiple seasons; EM-fit AC model with fitted free slopes (none needed for football L=3 where δ_1 = 1/2 forced; δ̂_1 for hockey; δ̂_1, δ̂_2 for SuperLega); comparison of score order vs skill order by (a) count of reordered pairs among those with distinct scores, (b) Kendall's τ_b (penalizes ties) for league rule vs uniform rule vs fitted slopes, averaged over seasons. Refits with η = 0 to measure venue effect.

## 7. Numerical results / baselines
Quoted exactly:
- Constant-sum test: football (0-1-3) FAILS (distributes 3 pts for decisive, 2 for draw); NHL (0-1-2-2) FAILS (2 in regulation, 3 in OT). For L=3, sufficiency forces draw = half a win: rule (0-1-2). L=4 requires 0+ξ_3 = ξ_1+ξ_2 (SHL (0-1-2-3) passes).
- Fitted home advantages η̂: Division 1 (2pt era) 0.80±0.02, EPL 0.58±0.02, Championship 0.51±0.02, Bundesliga 2pt era 1.13±0.03 / 3pt era 0.56±0.03, NHL 0.23±0.02, SHL 0.42±0.03, SuperLega 0.64±0.08. Free slopes: NHL δ̂_1 = 0.38±0.02 (≈1/3), SuperLega δ̂_1 = 0.20±0.02, δ̂_2 = 0.40±0.02.
- Proposition 1 holds empirically: no schedule-equivalent pair reordered (719 such pairs in NHL+SHL); where schedule equivalence fails, ≤3.2% of pairs reordered (NHL 2005–07: 42/1298 = 3.2%; NHL 2021–25: 25/2476 = 1.0%); reorderings occur between teams with similar scores (median 0.4 pts apart in NHL vs 7.0 overall).
- **Uniform rule (ξ_y = y) outperforms each league's own rule in every league where they differ** (Kendall τ̄): NHL own 0.907 → uniform 0.965 (fitted 0.968); SuperLega own 0.963 → uniform 0.993; EPL/Championship own 0.952–0.965 → uniform 1. Fitted slopes add ≤0.01 beyond uniform.
- Venue: refit with η = 0 barely moves reorder counts (e.g., NHL 2005–07: 42 vs 42); 2010–14 SHL breaks only tied pairs, no strict order disturbed.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
- Team-strength stationarity within a season is assumed (skills independent between seasons; within-season form not modeled).
- The constant-sum test is necessary, not sufficient, for a *good* ranking: SuperLega's rule passes but still underperforms uniform because its own points mis-space the outcome levels (ξ_0=ξ_1, ξ_4=ξ_5 flattened).
- Incentive effect: teams optimize for the points rule (offense rewarded by (0-1-3)), so the fitted model describes outcomes under that incentive regime, not counterfactual strength.
- NFL relevance: NFL outcomes are binary (win/loss) → L=2 reduces to Bradley–Terry, and the uniform rule is trivially the only rule; the paper's ordinal machinery (covers/pushes, win/draw/loss in soccer props) and the schedule-equivalence analysis (NFL's unbalanced schedule → Proposition 1 rarely applies league-wide) are where the value lies.
- Excluded seasons (COVID, lockouts) — model-based standard errors only.

## 10. GSE overlap
Existing-research map: Massey/Sagarin/Colley, Elo, nfelo, Bradley–Terry, Dixon-Coles, Harville all inventoried; Glicko/TrueSkill mentioned. What's NEW: (a) the *sufficiency* lens — a principled test for whether any GSE points-style aggregation (weekly power-score sums, matchup-grade composites) is a sufficient statistic of the underlying skill model, with the constant-sum check as the audit; (b) the AC ordinal model as a replacement family for GSE's discrete-outcome ratings (cover/push/no-cover, win/draw/loss soccer, set-score volleyball) with estimated slopes instead of mandated points; (c) the schedule-equivalence proposition formalizing *when* simple point counting equals a fitted model — NFL's unbalanced schedule means Proposition 1 fails league-wide, which is a principled argument for model-based ratings over standings in NFL (relevant to GSE's SOS/market-implied rating work); (d) the uniform-rule recommendation: fitted slopes cluster near uniform, so GSE can use ξ_y = y with negligible loss and zero estimation.

## 11. GSE implementation spec
1. Build the AC ordinal rating engine: for NFL-relevant discrete outcomes (e.g., spread cover/push/no-cover with L=3; soccer W/D/L), implement the AC model with constant-sum slopes, MAP + Gaussian prior (precision via EM marginal likelihood), home-boost η.
2. Estimate free slopes on nflverse/odds data (spread-cover AC: δ̂ for push?; soccer via Dixon-Coles-style data) and test against uniform ξ_y = y — adopt uniform if |δ̂_y − y/L−1| within 2 SE.
3. Schedule-equivalence audit: compute per-season which NFL team pairs are schedule-equivalent + venue-balanced; quantify the standings-vs-model-rating reorder rate (expect higher than NHL's 3.2% given 17-game unbalanced schedules) — publish as GSE content ("why standings lie").
4. Use the AC model as the discrete-outcome head for GSE's spread/total pick engine: P(cover), P(push), P(no-cover) from one fitted model rather than separate binary models.
5. Effort: 3–4 days (model + EM fitting); reorder-rate audit 1–2 days.

## 12. Reproducible test
Dataset: nflverse 2014–2025 (game outcomes, spreads, home/away). Test 1: fit AC model on (cover, push, no-cover) vs spread with home boost; compare out-of-sample log loss of AC vs three separate binary logistics — adopt AC if ≥ as good. Test 2: compute season-end score order (uniform points: 1 per cover-level) vs MAP skill order; measure reorder rate among team pairs; compare against the paper's NHL 1.0–3.2% range. Test 3: verify Corollary 2 — refit with η = 0 and different priors; confirm order invariance on schedule-equivalent subsets.

## 13. Acceptance / rejection gate
ADOPT the AC ordinal head for GSE's spread/total engine if on 2020–2024 NFL seasons the AC model's out-of-sample log loss on (cover/push/no-cover) is ≤ the best single binary baseline and the fitted slopes are within 2 SE of uniform (then use uniform with zero estimation cost). REJECT if AC underperforms binary logistics by >0.005 nats — then keep separate binary heads. REJECT the uniform-rule simplification if any fitted slope deviates from uniform by >3 SE with out-of-sample gain from the fitted value.

## 14. Improvement experiment
The paper leaves venue-dependent score-points (ξ_y^h for host, ξ_y^a for visitor, linked by reciprocity (7)) as an un-exploited extension. GSE should fit venue-dependent slopes on NFL spread-cover data: if home covers are "worth" different score-points than away covers (e.g., because home underdogs cover differently), the estimated (ξ^h, ξ^a) pair gives a principled home-field *scoring-rule* adjustment — a novel, interpretable home-field measure distinct from the η boost — and feeds directly into GSE's spread-pricing edge.
