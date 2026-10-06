# [0270] How Much Does Home Field Advantage Matter in Soccer Games? A Causal Inference Approach for English Premier League Analysis (arXiv:2205.07193)

**Citation:** Katherine Price, Hengrui Cai, Weining Shen, Guanyu Hu (2022). *How Much Does Home Field Advantage Matter in Soccer Games? A Causal Inference Approach for English Premier League Analysis*. arXiv:2205.07193. URL: https://arxiv.org/abs/2205.07193
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 3068 lines).
**Verdict:** ADAPT — the paired home/away differencing trick that identifies team-level causal home effects without a neutral-field control transfers to NFL division games, but the league-wide hierarchy must be re-fit on multi-season unbalanced schedules rather than the paper's clean double round-robin.

## 1. Research question
What is the *causal* effect of home-field advantage — not merely its correlation — on team performance, and how can it be identified and estimated when (a) every game has exactly one home team (no neutral-field control group exists) and (b) schedules are pre-determined pairwise matchups rather than randomized trials? Applied to the 2020–21 English Premier League across eleven offensive, defensive, and referee-bias summary statistics.

## 2. Dataset / schema
- **EPL 2020–21 season:** 380 games, 20 teams, full double round-robin (each pair meets twice, once home each). Source: **Hudl & Wyscout** scouting data (proprietary; not publicly downloadable).
- Eleven team-level per-game statistics: Attacks w/ Shot, Defence Interceptions, Reaching Opponent Box, Reaching Opponent Half, Shots Blocked, Shots from Box, Shots from Danger Zone, Successful Key Passes, Touches in Box, Expected Goals (XG), Yellow Cards (referee-bias proxy).
- Key descriptives: 144 home wins (37.89%) vs. 153 away wins (40.26%) — i.e., no raw home win edge that season; 514 home goals (50.19%) vs. 510 away goals (49.81%) of 1024. Home-mean vs. away-mean per stat in Table 1 (e.g., XG: home 1.577 vs. away 1.395; Yellow Cards: home 1.447 vs. away 1.474).
- Simulations: synthetic, fully described (§4.1) — no proprietary data needed.

## 3. Method / model
**Hierarchical causal model with paired home/away differencing.** Outcome is the net difference Y_{i,j} = c_i − c_j for a match where team i is home, decomposed as **Y_{i,j} = α_{i,j} + β_i + ε_{i,j}** (eq. 3), where α_{i,j} is the hypothetical neutral-field expected net outcome (nuisance), β_i is team i's causal home effect, and ε_{i,j} ~ N(0, σ₀²). Because the return fixture reverses venue (Y_{j,i} = −α_{i,j} + β_j + ε_{j,i}), summing the pair cancels the nuisance parameter: **Y_{i,j} + Y_{j,i} = β_i + β_j + ε_{i,j} + ε_{j,i}** (eq. 6). Stacking all N/2 pairs gives the linear system **H β = Y** (eq. 7) with a full-rank (n ≥ 3) incidence matrix H, solved by OLS: **β̂ = (HᵀH)⁻¹ H Y**. League effect **Δ̂ = Σ_i β̂_i / n** (eq. 8). Team effects are modeled hierarchically as **β_i ~ N(Δ, σ²)** (eq. 4); exact normality of β̂ − β (Prop. 3.1) with estimated covariance **σ̂²_β (HᵀH)⁻¹**, **σ̂²_β = 2‖Hβ̂ − Y‖²₂/N**. The league-variance σ² is estimated *unbiasedly* via the law of total variance: **σ̂² = Σ_i(β̂_i − Δ̂)²/(n−1) − Σ_i diag{σ̂²_β(HᵀH)⁻¹}_i/n** (eq. 10), avoiding the biased quadratic-form estimator; CI **Δ̂ ± z_{α/2}√(σ̂²/n)** (eq. 11). Team-level CIs: **β̂ ± z_{α/2}√(diag{σ̂²_β(HᵀH)⁻¹})** (eq. 9). Validation: extensive Monte Carlo simulations (n ∈ {10,20,40,80}, σ₀² ∈ {0.5,1,2}, Δ=1, β_i ~ N(1, 0.3²), 1000 replicates, two α_{i,j} generation scenarios), then application to the EPL data with 95% CIs/p-values per team and per statistic.

## 4. Equations & assumptions
- (1) Team causal effect: **β_i = E_j{Y*(δ_i=1, δ_j=0) − Y*(δ_i=0, δ_j=0)}**, i = 1..n.
- (2) League causal effect: **Δ = E_i{β_i}**, finite-sample estimand **Δ ≡ Σ_i β_i/n**.
- (3) Match model: **Y_{i,j} = α_{i,j} + β_i + ε_{i,j}**, α_{i,j} = E{Y*(δ_i=0, δ_j=0)}, ε_{i,j} ~ N(0, σ₀²).
- (4) Hierarchical: **β_i ~ N(Δ, σ²)**.
- (5) Return fixture: **Y_{j,i} = −α_{i,j} + β_j + ε_{j,i}**, with antisymmetry α_{i,j} = −α_{j,i}.
- (6) Paired cancellation: **Y_{i,j} + Y_{j,i} = β_i + β_j + ε_{i,j} + ε_{j,i}**.
- (7) Linear system: **H_{N/2×n} β_{n×1} + ε_{N/2×1} = Y_{N/2×1}**; estimator **β̂ = (HᵀH)⁻¹ H Y** (note: text prints (HᵀH)⁻¹H Y, missing the trailing ᵀ on the second H — presumably a typesetting slip for (HᵀH)⁻¹HᵀY).
- (8) **Δ̂ = Σ_i β̂_i/n**.
- (9) CI: **β̂ ± z_{α/2}√(diag{σ̂²_β(HᵀH)⁻¹})**, σ̂²_β = 2‖Hβ̂−Y‖²₂/N.
- (10) **σ̂² = (1/(n−1))Σ_i(β̂_i−Δ̂)² − (1/n)Σ_i diag{σ̂²_β(HᵀH)⁻¹}_i**.
- (11) CI: **Δ̂ ± z_{α/2}√(σ̂²/n)**.
- Assumptions: **(A1) SUTVA** — Y_{i,j} equals the potential outcome under the realized venue assignment; **(A2) Ignorability** — potential outcomes independent of venue assignment, stated to hold automatically because the schedule is pre-determined; **(A3) Non-monotonicity** — no transitivity of team dominance (rules out correlated α across matches involving the same team); i.i.d. Gaussian noise; β_i Gaussian for exact (not merely asymptotic) inference; n ≥ 3 so H is full rank; neutral-field potential outcome is a coherent counterfactual.

## 5. Features / target
- No ML features. The "input" is the schedule-structured panel: for each ordered team pair (i, j), the per-game net statistic difference Y_{i,j} (home team's stat minus away team's stat) for each of eleven outcomes.
- Target: team-level causal home effect β_i and league-level Δ per statistic. Prediction horizon: none (retrospective estimation).

## 6. Validation design
- **Simulation (validity check, not a test split):** 1000 replicates per scenario; Δ = 1 fixed; β_i ~ N(1, 0.3²); σ₀² ∈ {0.5, 1, 2}; n ∈ {10, 20, 40, 80}; two scenarios for α_{i,j} (i.i.d. N(0,2²) antisymmetric; or α_{i,j} = Ab_i − Ab_j with Ab_i ~ N(0,2²)). Metrics: bias, coverage probability (nominal 95%), sample variance of estimates (SV), mean of variance estimates (MV). Not time-ordered — irrelevant for the design.
- **Real data:** no holdout; inference via the exact normal CIs above. Baselines: none — the comparison is the naive home-vs-away mean difference, which the authors show is confounded (e.g., the EPL season had *more* away wins than home wins, yet causal offensive effects remain positive).

## 7. Numerical results / baselines
- Simulation (Table 2, Δ̂): biases tiny across all scenarios (e.g., scenario 1, n=20, σ₀²=1: **bias −0.0059**; scenario 2, n=80, σ₀²=2: bias −0.0010). Coverage probabilities approach the 95% nominal level as n grows: e.g., n=10 CPs 0.882–0.913; n=20: 0.914–0.950; n=80: 0.947–0.955 (SE of CP estimate = √(0.05·0.95/1000) = 0.0069, per paper). SV and MV match closely in all rows (e.g., scenario 1, n=40, σ₀²=1: SV 0.0030, MV 0.0030). Team-level β̂ boxplots "essentially unbiased" in all scenarios (Figures 4–7); CPs "fairly close to 0.95, especially when n ≥ 20" (Figure 8). Estimator performs well even when α_{i,j} are not i.i.d. (scenario 2), because α is never estimated.
- EPL 2020–21, league-level Δ̂ (Table 3, Δ̂ / σ̂ / p-value): Attacks w/ Shot **1.568 / 0.556 / 0.005**; Defence Interceptions **−1.997 / 1.200 / 0.096**; Reaching Opponent Box **1.732 / 0.608 / 0.004**; Reaching Opponent Half **3.592 / 0.949 / 0.000**; Shots Blocked 0.350 / 0.329 / 0.287; Shots from Box **1.066 / 0.379 / 0.005**; Shots from Danger Zone **0.786 / 0.279 / 0.005**; Successful Key Passes **0.489 / 0.237 / 0.039**; Touches in Box **2.253 / 1.043 / 0.031**; XG **0.232 / 0.092 / 0.011**; Yellow Cards −0.026 / 0.126 / 0.834.
- Findings: **7 of 11 statistics significant** at α=0.05, all offense-side (attacks with shot, reaching opponent box/half, shots from box/danger zone, successful key passes, touches in box, XG); defensive stats (interceptions, blocked shots) and referee proxy (yellow cards) not significant — home advantage lives in *offensive chance creation*, not goals (goals showed no significant HFA), defense, or officiating. Teams with the most significant team-level statistics: Fulham, Brighton, Newcastle United, Wolverhampton Wanderers — all bottom-half finishers (Fulham relegated), i.e., **weaker teams retain larger home advantage**; top teams (Man City, Man Utd, Liverpool) dominate regardless of venue.

## 8. Code / data availability
**None stated** — no code repository and no public data link (Wyscout data is proprietary). The method is fully specified in the text and reimplementable from the equations.

## 9. Leakage & limitations
- **2020–21 was a COVID season** with empty/reduced crowds — the paper's own suggested follow-up (compare to normal seasons) admits the headline finding (no officiating bias, no goal-level HFA) may be a crowd-absence artifact; external validity to normal NFL stadiums is questionable.
- **A3 non-monotonicity is strong**: it assumes neutral-field pair outcomes are independent across matches sharing a team — i.e., no style-matchup correlation — which the authors motivate by anecdote ("style rivalries") rather than evidence. If α_{i,j} correlates within teams, the paired sum does not fully remove confounding.
- Only **one season, one league, n=20**: team-level β_i estimates rest on 19 paired differences each; Brighton-style wide CIs show how noisy team-level inference is at this N.
- The antisymmetry α_{i,j} = −α_{j,i} and additive decomposition are untestable structural assumptions; any home/away asymmetry in *how* teams play (not just venue) leaks into β_i.
- Gaussianity and i.i.d. noise across matches of the same team are assumed for exact CIs; soccer (and NFL) outcomes are heteroskedastic.
- NFL transfer caution: NFL schedules are not double round-robins — the exact pairing trick only applies within division pairs (home+away in the same season) or across multi-season aggregates, and the 16/17-game season gives far fewer pairs per team than EPL's 38.

## 10. GSE overlap
- **New capability.** The existing-research-map tracks home-field-adjacent facts (bye/rest edge vanished post-2011 CBA; travel/altitude has "no verified coefficient"), but GSE has **no causal decomposition of home-field advantage** — no team-specific home-effect estimates, no league-level hierarchical HFA model, no paired-difference identification. The map's market-microstructure and calibration lanes do not cover this.
- Adjacent: GSE's team-metric lab (2026-09-17 gse-lab) computes EPA/play, success rate, down splits etc. from nflverse — those are the outcome variables this method would decompose; the method is a wrapper around any per-game team metric. Extension of the metrics lane in that sense, but the causal identification strategy is new to the corpus.

## 11. GSE implementation spec
- **Data:** nflverse play-by-play (seasons 2018–2025), aggregated to team-game metrics: offensive EPA/play, defensive EPA/play allowed, success rate, early-down EPA, red-zone EPA, penalty counts/yards (referee proxy), turnover luck (existing gse-lab CSVs reusable).
- **Design:** NFL lacks a double round-robin, so build paired differences from **division games only** (each division pair plays home+away every season → 6 paired differences per team-season). Stack pairs across 2018–2025 with a season fixed effect absorbed into α_{i,j} (or year-by-year estimation). Model: Y_{i,j,s} = α_{i,j,s} + β_{i,s} + ε; β_{i,s} ~ N(Δ_s, σ²_s) per season, or a pooled hierarchical model with team random effects.
- **Estimation:** construct H per season (32 teams, ~96 division pairs), OLS β̂ = (HᵀH)⁻¹HᵀY, exact normal CIs per Prop. 3.1–3.2, unbiased σ̂² via eq. 10. One script (~200 lines Python/numpy or R) — the paper gives every formula.
- **Outputs:** team-season causal home effects for offensive EPA/play, defensive EPA/play, penalty margin; league-level Δ per season (test whether NFL HFA is declining); team rankings of "venue dependence" as matchup content (e.g., which teams' offenses collapse on the road).
- **Serving:** offline research artifact — seasonal CSV + matchup table for the props/matchup engine; refresh each offseason. No real-time serving.
- **Effort estimate:** 1–2 days (data already in-repo; method is closed-form linear algebra).

## 12. Reproducible test
- **Dataset:** nflverse pbp 2020–2024 seasons, division games only (home+away pairs per season), outcome = offensive EPA/play net difference (home offense minus away offense per game).
- **Metric:** league-level Δ̂ with 95% CI per Prop. 3.2; team-level β̂_i.
- **Baseline:** naive home-minus-away mean EPA/play difference (confounded by team strength); the causal estimator must (a) produce a Δ̂ with the same sign as the naive mean but (b) attribute the effect to offense vs. defense vs. penalties separately — test passes if offensive-EPA Δ̂ > 0 with p < 0.05 and defensive-EPA (EPA allowed) Δ̂ is not significant, mirroring the paper's offense-only finding.
- **Window:** fit on 2020–2022 (paired differences), confirm sign and significance on 2023–2024 holdout seasons.

## 13. Acceptance / rejection gate
- **Adopt** the division-pair HFA module into the matchup engine if on the 2020–2022 fit window: (a) league offensive-EPA Δ̂ > 0 with p < 0.05, (b) the estimated unbiased variance σ̂² ≥ 0 (sanity — the eq.-10 correction must not collapse), and (c) on the 2023–2024 holdout the sign of offensive-EPA Δ̂ persists (p < 0.10).
- **Reject** if the paired estimator's Δ̂ is indistinguishable from the naive mean difference (i.e., the causal machinery adds nothing), or if σ̂² comes out negative/unstable across seasons (hierarchy not identified at NFL sample sizes), or if the offense/defense split shows no structure (both significant or both null) — then the EPL offense-only finding does not transfer and a simpler constant-HFA adjustment suffices.

## 14. Improvement experiment
Extend the model to **time-varying venue effects with crowd size as a moderator**: add an interaction term β_{i,s} = β_i^base + γ·crowd_{i,s} + δ·travel_miles_{i,j} (using official attendance and travel distances), estimated by the same paired-difference OLS with the H matrix augmented by crowd/travel columns. This directly tests the paper's proposed future direction (crowd involvement as an HFA factor) on NFL data, where the 2020 COVID season provides a natural zero-crowd experiment — if γ > 0 and the 2020 Δ̂ collapses relative to 2018–2019/2021–2022, GSE gets a crowd-adjusted, team-specific HFA coefficient usable in game models instead of a flat +2.5-point home edge.
