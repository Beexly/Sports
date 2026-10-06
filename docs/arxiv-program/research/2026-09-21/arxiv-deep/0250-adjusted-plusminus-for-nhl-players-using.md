# [0250] Adjusted Plus-Minus for NHL Players using Ridge Regression with Goals, Shots, Fenwick, and Corsi (arXiv:1201.0317v2)

**Citation:** Macdonald, B. (2012). *Adjusted Plus-Minus for NHL Players using Ridge Regression with Goals, Shots, Fenwick, and Corsi*. arXiv:1201.0317v2. URL: https://arxiv.org/abs/1201.0317
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 3218 lines).
**Verdict:** REJECT — an NHL player-rating paper whose shift-stint design cannot transfer to GSE's NFL lane (no per-play full-lineup data in nflverse; APM's teammate-collinearity fix is weakest exactly where football lineups are most collinear), and its portable sub-ideas (ridge shrinkage, proxy-outcome rescaling) are already standard in the ML/calibration lanes.

## 1. Research question
Can regression-based adjusted plus-minus (APM) for NHL skaters be made stable and precise enough for decisions (trades, salary negotiation) by replacing OLS with ridge regression and by fitting models on higher-frequency proxy outcomes (shots, Fenwick, Corsi) instead of only goals, then rescaling the estimates back to expected goals per 60 minutes?

## 2. Dataset / schema
Every shift of every NHL game in four seasons (2007-08, 2008-09, 2009-10, 2010-11); shift start/end times, players on ice per shift, zone of starting faceoff, goals/shots/missed shots/blocked shots during the shift; empty-net situations removed. Each shift yields two observation rows (home team's and away team's goals/60 etc.), weighted by shift duration. N = 2,324,528 observations at even strength; N = 461,022 for special teams. Response variables: goals, shots, Fenwick (shots + missed shots), Corsi (shots + missed shots + blocked shots), all per 60 minutes of ice time. Data source not stated as public (NHL shift/scoring data of that era; now analogous to NHL's official API / Evolving-Hockey).

## 3. Method / model
Linear model per situation (even strength / special teams) and per response variable (4 outcomes → 8 models). Design matrix: offense indicator X_j (1 if skater j is on offense during observation), defense indicator D_j, plus zone-start indicators Z_off, Z_def for shifts beginning with a faceoff in the offensive/defensive zone; goalies included as defensive variables in goals models. y = β_0 + Σ_j β_j X_j + Σ_j δ_j D_j + ζ_off Z_off + ζ_def Z_def, i.e. y = Xβ with X N×(2J+3). Coefficients β_j, δ_j are player j's offensive/defensive contributions in (expected) goals per 60 minutes, adjusted for teammates, opponents, and zone starts; totals, per-60, per-season, and replacement-adjusted variants are reported. Instead of OLS, ridge regression is used. The ridge penalty λ is chosen per model as the maximum of four candidate values: (1) randomized generalized cross-validation (Girard 1991 trace estimator, since n ~ 10^6, p ~ 10^3), (2) trace-curve stabilization point, (3) Hoerl–Kennard–Baldwin λ_HKB = p·MSE/(β̂ᵀβ̂), (4) the λ needed to bring all variance inflation factors (VIF) below 10. For the displayed models λ ≈ 0.5 (vertical line in trace-curve Figure 1). Proxy outcomes (shots/Fenwick/Corsi) are rescaled to expected goals per 60 minutes by multiplying by league-average goals-per-shot, goals-per-Fenwick, goals-per-Corsi computed separately for even strength, power play, and short-handed using four seasons of league data (~10 shots per goal).

## 4. Equations & assumptions
- Model: y = β_0 + β_1X_1 + ⋯ + β_JX_J + δ_1D_1 + ⋯ + δ_JD_J + ζ_offZ_off + ζ_defZ_def   (Eq. 10); matrix form y = Xβ (Eq. 11).
- OLS objective: Q = Σ_i (y_i − ŷ_i)² (Eq. 12); normal equations XᵀXβ̂ = Xᵀy.
- Ridge objective: Q = (y − Xβ)ᵀ(y − Xβ) + λβᵀβ (Eq. 16); solved via (XᵀX + λI)β̂ = Xᵀy (Eq. 18).
- HKB choice: λ_HKB = p·MSE/(β̂ᵀβ̂) (Eq. 23).
- Ridge VIF: diagonal elements of (XᵀX + λI)^{-1}XᵀX(XᵀX + λI)^{-1} (Eq. 24); target: all VIF < 10.
- Year-to-year stability measured via Pearson correlation of per-60 estimates across seasons (≥500 EV minutes / ≥150 special-teams minutes thresholds).
- Assumptions: additivity of player contributions within a shift; shift-level outcomes independent given lineups; duration weighting corrects for exposure; zone-start dummies fully capture deployment effects; league-average shooting percentages are a valid rescaling (i.e., shot quality is league-average for all players); empty-net removal does not bias.

## 5. Features / target
Inputs: per-shift binary indicators for every skater on offense/defense, zone-start faceoff dummies, shift duration (weights). Target: goals/60, shots/60, Fenwick/60, or Corsi/60 during each observation row. Output: 36 per-player estimates (offense/defense × even-strength/power-play/short-handed × 4 outcomes) in goals or expected-goals per 60 minutes; 48 when expanded to per-season and all-situations totals. Trophy finalists derived from G, G_def, G_off aggregations (Selke/Norris/Hart tables).

## 6. Validation design
No held-out prediction test; validation is (a) face validity of trophy lists vs actual NHL award voting (Datsyuk's Selke wins, Lidstrom/Chara Norris, Ovechkin/Sedin Hart wins are all consistent), (b) year-to-year correlation of estimates (ridge vs OLS), (c) trace-curve stabilization as λ increases, (d) standard-error comparison: ridge SEs < OLS SEs, and shots/Fenwick/Corsi SEs < goals SEs. Ridge chosen per-model by max of GCV / trace-stabilization / HKB / VIF<10. No out-of-sample forecasting evaluation (e.g., predict next-season goals or team wins) is performed.

## 7. Numerical results / baselines
Four-season offensive leaders (G_off, goals/season): Sidney Crosby 23 (S_off 12, F_off 13, C_off 14), Jonathan Toews 18, Alex Ovechkin 17 (S 17, F 20, C 24), Daniel Sedin 16, Joe Thornton 16. Per-60 EV offense (SE): Crosby 0.83 (0.20), Ovechkin 0.46 (0.18), Datsyuk 0.53 (0.19); shots-based SEs ~0.05–0.08 — roughly 2.5–3× smaller than goals-based SEs. Ovechkin EV offense: G 0.46 (0.18), S 0.45 (0.07), F 0.53 (0.06), C 0.63 (0.05) — the SE collapse with proxy outcomes is the paper's central numerical result. Year-to-year correlations: ridge > OLS for EV offense (goals) and for shots/Fenwick/Corsi in all three displayed panels (EV offense ≥500 min, PP offense ≥150 min, SH defense ≥150 min), except SH defense where ridge-goals ≈ OLS but shots/Fenwick/Corsi still higher. Chosen λ ≈ 0.5 for the illustrated PP-offense model (Figure 1); Datsyuk's PP offense estimate flips from negative (λ=0, OLS) to elite-positive (λ=0.5); Lidstrom's OLS estimate ≈ 4.0 goals/60 collapses under ridge. Award agreement: Datsyuk ranked #1 defensive forward (G_def 12) and #1 overall (G 27); actual Selke wins 2007-08–2009-10 confirmed. These are the paper's claims; no external replication is attempted.

## 8. Code / data availability
None stated (no code or data link in the paper).

## 9. Leakage & limitations
- No predictive validation: year-to-year correlation and face validity against award votes are not out-of-sample tests; the paper never predicts future performance, team outcomes, or anything a decision-maker would actually use.
- Rescaling by league-average shooting percentage assumes all players have league-average finishing — this erases exactly the skill dimension (shooting talent) that distinguishes elite goal scorers from shot-volume compilers; Ovechkin's C_off (24) vs G_off (17) spread illustrates how much the rescaling can move conclusions.
- λ chosen as the *maximum* of four heuristics is ad hoc and conservative-by-design; heavier shrinkage flatters well-known players (Datsyuk "stabilizes" to elite) — trace-curve inspection is subjective and could rationalize any λ.
- Shift-level i.i.d. assumption ignores within-game state (score effects, which massively distort Corsi), goalie quality (acknowledged for goals models), and opponent-line matching.
- Shot-quality confounders: Fenwick/Corsi credit blocked shots and misses equally to on-net shots; zone-start dummies are a crude deployment adjustment.
- Survivorship/coaching effects: estimates condition on observed deployment; a player's APM is partly his coach's usage (QoC/QoT are handled only via opponent indicators, and the goals model only).
- External validity to NFL: near-zero. APM needs per-observation full lineups with frequent partial rotation (hockey shifts); NFL plays are 11 fixed starters with near-total collinearity, and nflverse play-by-play does not record which 22 players are on the field per play — the design matrix cannot be built. Player-level EPA attribution already exists in GSE's inventory (RYOE, YPRR, TPRR).

## 10. GSE overlap
New domain (NHL player ratings), but no actionable overlap — the map's non-NFL gap list notes NHL is thin, yet Garrett's standing priority is NFL first and this paper offers no NFL-transferable estimate. The portable sub-ideas are duplicates: ridge/L2 shrinkage is routine in GSE's ML lanes (the 2026-09-18 ML research brief covers tabular learners and hierarchical pooling; repo has XGBoost-based nflfastR CPOE), and "use a noisier high-frequency proxy, rescale to the target unit" is the same principle as EPA per-play vs points (already the engine's core) — nothing new is imported. No repo file implements APM-style on/off player decomposition for NFL, but per §9 the input data to build one (per-play full lineups) does not exist in nflverse.

## 11. GSE implementation spec
No build recommended. If a future data source ever supplies per-play full NFL lineups (e.g., FTN charting expanded to all-22 presence), the port would be: observations = drives or play-blocks (N ~ 40k drives/season), X_j = offensive snap indicators for skill players only (QB/RB/WR/TE), D_j = defensive starters, y = EPA per 60 plays, ridge with λ chosen by the paper's max-of-four rule; but the effort (~1–2 weeks) is unjustified now given the data gap and the existence of snap-weighted player EPA metrics already in the inventory.

## 12. Reproducible test
Not applicable — REJECT. The honest reproducibility check would be: re-fit ridge APM on 2010-11 NHL shift data and compare trophy-list agreement, but the input data is not available to GSE and the output serves no GSE product lane (engine picks are team/game-level; props use charting-based player projections, not APM).

## 13. Acceptance / rejection gate
REJECT stands unless (a) a per-play full-lineup NFL data feed becomes available AND (b) a pilot ridge-APM on one NFL season shows year-to-year QB/WR EPA-contribution correlations exceeding the current snap-weighted EPA metrics' stability by ≥0.05 — neither condition holds today.

## 14. Improvement experiment
Within the paper's own NHL frame: replace the ad hoc λ = max(GCV, trace, HKB, VIF<10) with a proper time-series cross-validation choosing λ to minimize next-season prediction error of player goals/60, and add a shot-quality-weighted response (the paper's own "future work" suggestion of Krzywicki/Schuckers weighted shots) — this would test whether the proxy-outcome trick survives when the rescaling is player-specific rather than league-average, which is exactly the assumption that currently biases elite finishers toward the mean.
