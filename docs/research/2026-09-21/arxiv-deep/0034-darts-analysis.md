# [0034] Darts Analysis (arXiv:2511.14537v1)

**Citation:** Ayham Makhamra, Yelyzaveta Satynska, and Michael Weselcouch (2025). *Darts Analysis*. arXiv:2511.14537v1. URL: https://arxiv.org/abs/2511.14537v1
**Ledger completed:** 2026-09-21. **Read:** full local text (3,722-line extract: abstract, §§1–5, Tables 1–7, Figures 2–8, references). All equations, tables, and numbers below are quoted verbatim from the local text.
**Verdict:** ADAPT — the darts-specific model does not transfer, but the head-to-head betting-game evaluation protocol (one model sets odds, the other bets) is a portable, decision-relevant way to compare probability models that GSE's model-comparison stack lacks.

## 1. Research question
Can simple mathematical models predict the outcomes of amateur darts games — both at game start and updated as the live score changes — and which of five candidate models (null, logistic regression, basic simulation, time-adjusted simulation, and a new score-dependent Massey variation) performs best under both proper-scoring (Brier) and economic (head-to-head betting) evaluation? The paper closes by sketching how the score-dependent Massey framework adapts to other competitive settings (NHL season-progress weighting, in-race checkpoints, product-comparison experiments). (Abstract; §5.1)

## 2. Dataset / schema
Games of **"Darts 271"** — a variant played at the spring 2025 **Minton Invitational** (Roanoke College): head-to-head, three darts per turn per player, race to 271 points (may surpass; no exact-finish or double-out requirement, unlike traditional 501); scores tallied per round after all six darts. Collection via a custom RC-credentialed website (QR code beside the dartboard): Feb 6 – May 2, 2025; train = games completed before April 1, 2025; test = games on/after April 1, 2025. **1,131 games, 15,306 rounds, 45,918 throws, 45 players**; each row = one recorded throw (game start time, thrower/opponent IDs, game ID, round number, points). Test set: 362 games at Round 1; 2,465 round-predictions total (Table 3). Key descriptives: average 6.78 rounds/game (most games 5–9 rounds); most players played <40 games while 7 played 100+ (self-scheduling overrepresents frequent players); most players averaged 11–13 points/throw, a few exceeded 14 (skill gap small → upsets common). Limitations: first-thrower not recorded; throw order within rounds not recorded; scores achievable multiple ways not distinguished (all assumed single-region). No code/data link stated; dataset treated as non-public (authors/Roanoke College).

## 3. Method / model
Five win-probability models π(p1, p2, s1, s2), evaluated at game start and at the start of each round:
1. **Null** (§3.1): score-only, `π_NULL(p1,p2,s1,s2) = 1/2·(1 + (s1−s2)/100)`, truncated to [0,1] — each point of score differential shifts win probability by 0.5 pp (the "100" chosen "simply to make the score difference translate conveniently into a probability difference").
2. **Logistic regression** (§3.2): `π_REG(p1,p2,s1,s2) = 1/(1 + e^{-(c0 + c_{p1} − c_{p2} + c1·s1 + c2·s2)})` — predictors are the two player IDs and their current scores; coefficients estimated on the training set.
3. **Basic simulation** (§3.3): Monte Carlo — 1000 simulated games from the current score, each turn sampling 3 throws from each player's empirical point distribution; `π_SIM(p1,p2,s1,s2) = W/1000` where W = simulated games won by p1. Notes non-transitivity of darts strategies (rock–paper–scissors analogy) as motivation for simulation.
4. **Time-adjusted simulation** (§3.4): each player characterized by a **distance vector** (accuracy: proportions of throws in Distance 0/1/2/Miss, each extrapolated via separate linear regressions on date/time to April 1, 2025 then normalized — example vector ⟨0.284, 0.431, 0.159, 0.127⟩) and a **multiplier vector** m = ⟨m0, m1, m2, m3⟩ (m0 = empirical zero-rate; m1 = (1−m0)·N_{19,20}/N_S, m2 = (1−m0)·N_{38,40}/N_S, m3 = (1−m0)·N_{57,60}/N_S, where S = {19,20,38,40,57,60}). Baseline values per category: 19.5 / 4 / 15.75 / 9.2; throw score = v_t · m_t (baseline × multiplier sampled independently).
5. **Score-dependent Massey model (SDMM, new, §3.5):** per-round equations (not per-game) with two ratings per player, r_i^(1) and r_i^(2); **perceived strength** at score s_i: `(271−s_i)/271·r_i^(1) + s_i/271·r_i^(2)`. Equation per round: strength-difference = ±1 (winner), plus game-conclusion equation `r_i^(2) − r_j^(2) = ±1`; regularization via extra 6·C(n,2) rows (±1 at pure r^(1), half-and-half, pure r^(2)) guaranteeing X'X nullity 1, plus Σ ratings = 0 (low-sample players pulled toward league average).

## 4. Equations & assumptions
- Null: `π_NULL(p1,p2,s1,s2) = 1/2·(1 + (s1−s2)/100)` → "+0.5 percentage points per point scored."
- SDMM probability: `π_SDMM(p1,p2,s1,s2) = 1/2·(1 + (271−s1)/271·r_1^(1) + s1/271·r_1^(2) − ((271−s2)/271·r_2^(1) + s2/271·r_2^(2)))`, truncated to [0,1].
- Marginal effect identity: for two league-average players, `π_SDMM = 1/2 + (Δr/542)·(s1−s2)` where Δr = r^(2) − r^(1); `100·Δr/542 = 100·3.176/542 = 0.59` percentage points per point scored, "where Δr = 3.176 (see Table 4) is the value obtained by solving a least-squares problem during model fitting for π_SDMM."
- Recalibrated null: `π'_NULL(p1,p2,s1,s2) = 1/2·(1 + (s1−s2)/85)` → marginal effect `100/(85·2) = 0.59` pp/point, "the same marginal effect implied by the score-dependent Massey model."
- Betting-game payout (Table 1): player B bets on event if β_t > α_t (event occurs): payout `|α_t−β_t|·(1−α_t)` correct, `−|α_t−β_t|·(1−α_t)` incorrect; if β_t ≤ α_t (event does not occur): payout `|α_t−β_t|·α_t` correct, `−|α_t−β_t|·α_t` incorrect. Expected payout for betting on the event: `|α_t−β_t|·(p_t − α_t)` — positive iff the true probability exceeds model α's estimate.
- SDMM ratings (Table 4): r^(1): mean −1.588, SD 0.088, median −1.603, Q1 −1.634, Q3 −1.548, min −1.738, max −1.323; r^(2): mean 1.588, SD 0.072, median 1.577, Q1 1.555, Q3 1.635, min 1.421, max 1.784.
- The least-squares objective for SDMM simplifies to exactly 4× the Brier score on the training set — "solving the least-squares problem directly minimizes the Brier score."
**Assumptions:** linear score-differential → win-probability mapping (null/SDMM); Massey least-squares ratings estimated on training games generalize; throw distributions stationary (basic sim) or shifting linearly in date/time (adjusted sim); multiplier proportions from 19/20 sectors generalize board-wide; rounds treated as simultaneous (no mid-round data).

## 5. Features / target
Features: live cumulative scores (s1, s2); player identities/ratings (SDMM); player throw distributions / distance+multiplier vectors (simulations); date/time (adjusted simulation). Target: binary game winner, predicted at game start and re-predicted at each round start (in-game updating). No round-number feature ("none of the models… account for round numbers" — flagged as a possible improvement).

## 6. Validation design
Two evaluation approaches, each applied at game start and at each round start: (1) **Brier scores** (proper scoring; defined in §2.3 as mean squared error `B(π) = (1/n)Σ(π_t − σ_t)²`); (2) **head-to-head betting game**: model α sets odds, model β bets, profit decides; "betting edge" = positive net payout; possible for both models to have edges — higher total profit wins. Bets placed per round (Tables 5, 7a) and game-start-only (Tables 6, 7b). Baselines: the five models against each other (no external baseline). The paper is 16 pages, 8 figures. Worked example (Table 2): Alice vs. Bob, model-B payouts −0.0275 + 0.0624 = +0.0349 vs. reversed −0.018 → model β superior.

## 7. Numerical results / baselines
- **Brier (Table 3), all rounds (n = 2,465):** Null 0.1902, Logistic 0.1980, Basic Sim. 0.1849, Adjusted Sim. 0.1857, **SDMM 0.1807 — best overall** ("the score-dependent Massey model performs best overall in terms of the Brier score"). Round-1 (n=362): SDMM 0.2372 vs. Null 0.2500, Basic Sim. 0.2425. Logistic is worst overall (0.1980); authors diagnose overfitting — Figure 7 example where π_REG "consistently estimates that player A is heavily favored to win" despite trailing the whole match, because player B "played only eight games and won just one" in training ("effectively learning that player B usually loses, regardless of the current game context").
- **Betting game, per-round bets (Tables 5, 7a):** "the score-dependent Massey model outperforms all other models when compared head-to-head. The adjusted simulation model earned the most profit when the logistic model was used to set the odds." Basic sim beats adjusted sim by 1.92 head-to-head (attributed to §3.4 "not properly captur[ing] the players' improvement"); logistic/adjusted-sim produce "the most extreme predictions" (Figure 8).
- **Betting game, game-start bets only (Tables 6, 7b):** "Again, the score-dependent Massey model outperforms all other models. Interestingly, the null model shows a betting edge over every model except the score-dependent Massey model. Because the null model assigns each player a 50% chance of winning at the start of the game, its positive profit indicates that the other models systematically overestimated the favorite's probability of winning."
- Recalibrated null: `B(π'_NULL) = 0.1889` over all test rounds — "a slight improvement over the Brier score of the null model."
- Conclusion (exact): "we conclude that the probabilities generated by the score-dependent Massey model most accurately reflect reality, although the model may systematically err on the conservative side."

## 8. Code / data availability
None stated. Acknowledgements: Roanoke College Summer Scholars program; RC Information Technology department.

## 9. Leakage & limitations
- **Tiny amateur dataset** (single college invitational, 45 players, mostly first-time throwers): massive skill heterogeneity and small sample; fitted effects (e.g., Δr = 3.176) are noisy and setting-specific; frequent players overrepresented.
- Train/test split is honest (pre/post April 1, 2025), but SDMM's least-squares objective directly minimizes the training Brier score — test Brier 0.1807 vs. training-optimality is in-sample-adjacent.
- The "time-adjusted" variant's failure (not capturing improvement) is asserted, not diagnosed with numbers; baseline values (19.5/4/15.75/9.2) are ad hoc category averages.
- **Darts 271 ≠ standard darts** (no double-out, overshoot allowed) and ≠ any GSE sport; the score-differential→win-probability linearity is an artifact of a race-to-N format.
- **External validity to NFL:** nil for the model itself; the evaluation *design* (betting game) is the portable part (see §11).

## 10. GSE overlap
Massey ratings are already in GSE's inventoried metric catalog (existing-research map §1), and in-game win probability is covered by iWinRNFL (1704.00197, read in depth). What is **new**: (a) a *score-dependent* Massey variant that re-solves ratings conditional on live score — a small twist on live-WP modeling; (b) the **betting-game model comparison**: model A posts odds, model B bets, profit decides — an economic evaluation of probability models that complements GSE's Brier/log-loss/CLV stack. GSE's corpus has CLV/beat-the-close and calibration work but no head-to-head market-maker-vs-bettor protocol. This is an **extension** (evaluation methodology), not a duplicate.

## 11. GSE implementation spec
Port the evaluation protocol, not the darts model:
1. **Betting-game harness** for GSE's NFL probability models (engine spread/ML/total probabilities vs. baselines: de-vigged consensus, Elo, market): for each game in a held-out season, model A converts its probabilities to fair odds; model B stakes Kelly-fractional bets wherever its probability implies edge over A's odds; score by P&L and ROI, all ordered pairs.
2. This directly answers "which model would make money against which" — decision-relevant in a way Brier differences are not, and it surfaces favorite-overestimation (the paper's null-model finding) which pure scoring rules can mask.
3. Data: GSE's existing picks DB + historical odds (Odds API / odds captures in repo). Effort: ~1 day to build the harness; rerun each model iteration.

## 12. Reproducible test
Dataset: 2024 NFL season games with GSE engine probabilities and de-vigged closing lines (already in repo odds captures). Run the betting-game protocol: engine-as-bookmaker vs. consensus-as-bettor and vice versa, flat 1-unit + fractional-Kelly staking, all games. Baseline to beat: Brier/log-loss model ranking — test whether the betting-game ranking *disagrees* with the proper-score ranking (as in the paper, where the null model's betting edge contradicted its middling Brier). Metric: head-to-head P&L per pair.

## 13. Acceptance / rejection gate
**Adopt** the betting-game harness as a standing model-comparison tool if, on the 2024 held-out season, it identifies at least one model pair whose profitability ranking reverses the Brier ranking (i.e., it adds information beyond proper scores) **and** results are stable under half-season splits. **Reject** as redundant if the betting-game ranking merely echoes Brier/log-loss orderings.

## 14. Improvement experiment
Make the market-maker *adaptive*: instead of fixed fair odds from model A, let the bookmaker update odds via a simple inventory/steam rule as model B's bets arrive (adverse-selection simulation). This tests robustness of a model's edge to line movement — the missing link between the paper's static betting game and GSE's real CLV/steam concerns — and directly addresses the paper's finding that static models systematically overestimate favorites.
