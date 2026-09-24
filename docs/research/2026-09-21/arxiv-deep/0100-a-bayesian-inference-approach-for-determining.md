# [0100] A Bayesian inference approach for determining player abilities in football (arXiv:1710.00001)

**Citation:** Gavin A. Whitaker, Ricardo Silva, Daniel Edwards, Ioannis Kosmidis (2017). *A Bayesian approach for determining player abilities in football*. arXiv:1710.00001v2. URL: https://arxiv.org/abs/1710.00001
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2136 lines).
**Verdict:** REJECT — per-player latent-ability framework is methodologically interesting, but the paper is soccer-specific, its data is proprietary (Stratagem Technologies), and GSE has no soccer lane or transferable event-type feature path into the NFL engine.

## 1. Research question
The paper answers: can we infer an interpretable, uncertainty-quantified measure of each football player's ability at a given event type (e.g., scoring a goal) from touch-by-touch event data, and do those inferred latent abilities improve prediction of team-level goals when plugged into the Bayesian hierarchical scoring model of Baio and Blangiardo (2010)? It targets two applications: ranking players by ability (e.g., "who is the best goalscorer") and predicting whether over or under 2.5 goals will be scored in a future match.

## 2. Dataset / schema
Two datasets, both proprietary — supplied by Stratagem Technologies, acknowledged at the end of the paper (Sec. 5, Acknowledgements). Unreplicable without Stratagem access.

1. **Touch-by-touch event data**: 2013/2014 and 2014/2015 English Premier League seasons; roughly 1.2 million events total, approximately 1600 per game; 39 event types (listed in Table 1, e.g., Pass, Tackle, Goal, Interception, SavedShot, TakeOn). Each event records time, team, player, type, and outcome. The authors group events into four categories (Stop, Control, Disruption, Miscellanea) and drop Stop events for ability estimation (except SubstitutionOn/SubstitutionOff for playing-time calculation). 2013/2014 season: 380 matches, 20 teams, 544 players used. OffsideGiven removed as inverse of OffsideProvoked.
2. **Odds data**: 2014/2015 EPL over/under 2.5 goals market odds, provided by Stratagem Technologies (not disclosed; used only for the betting validation in Sec. 4.2).

Schema for model input (Table 2): game id, player id, team id, and a count of each event type per player per game, plus fraction of time played per game (τ_{i,k}).

## 3. Method / model
**Player ability model (Sec. 3.1):** For event counts X^e_{i,k} by player i (team j) in match k, with e in a paired interacting event set E = {e1, e2} (e.g., Pass and Interception):

- X^e_{i,k} ~ Poisson(η^e_{i,k} τ_{i,k}), τ_{i,k} ∈ [0,1] fraction of time on pitch (e.g., 60/90 min → τ = 2/3).
- η^e_{i,k} = exp(Δ^e_i + τ_{i,k} λ^e_1 Σ_{i0 ∈ P^j_k \ i} Δ^e_{i0} − λ^e_2 Σ_{i0 ∈ P^{T_k \ j}_k} Δ^{E\e}_{i0} + δ_{T^H_{k,j}} γ^e) — each player's rate combines their own latent ability Δ^e_i, their team's ability in the event (scaled by time played), the opposition's ability to stop it, and a home effect γ^e. λs constrained positive for identifiability.
- Priors: independent Gaussian over all abilities; used prior π(Δ^e_i) ~ N(−2, 2²), "where −2 represents the ability of an average player"; little difference found with alternative priors.
- Fit by mean-field variational inference: q(Δ^e_i | φ^e_i) ~ N(μ_{Δ^e_i}, σ²_{Δ^e_i}); closed-form ELBO (Appendix A); maximized with ADAM + autograd, 7000 iterations to convergence; 2182 parameters for a pair of interacting event types [544 players × 4 variational params + 6 fixed hyperparameters ψ = (λ^{e1}_1, λ^{e1}_2, γ^{e1}, λ^{e2}_1, λ^{e2}_2, γ^{e2})].
- Players ranked by the 2.5% quantile of their marginal posterior variational density q(Δ^e_i).

**Hierarchical team-goals extension (Sec. 3.2):** Baseline of Baio and Blangiardo (2010): y^t_k ~ Poisson(θ_t), t ∈ {h, a}, with log(θ_h) = home + att_h + def_a, log(θ_a) = att_a + def_h, sum-to-zero constraints on att/def, hyperpriors home ~ N(0, 100²), μ_att, μ_def ~ N(0, 100²), σ_att, σ_def ~ Inv-Gamma(0.1, 0.1). Extension adds f(q(Δ))_h and f(q(Δ))_a to the log-intensities, where f sums the posterior mean latent abilities (Goal, Shots, ChainEvents) of the starting eleven minus the opponents' stopping abilities (GoalStop, ShotStop, AntiPass). Fitted with PyStan (~10K independent posterior draws after burn-in).

**Composite event types (Sec. 4.1, Appendix B):** GoalStop (BallRecovery, Challenge, Claim, Error, Interception, KeeperPickup, Punch, Save, Smother, Tackle); Shots (Goal, MissedShots, SavedShot, ShotOnPost); ShotStop (Challenge, Claim, Interception, KeeperPickup, Punch, Save, Smother, Tackle); ChainEvents (prevalence in lead-up to a good attacking chance); AntiPass (ability to stop the opposition passing).

## 4. Equations & assumptions
Key equations (numbering as in paper):

(1) X^e_{i,k} ~ Poisson(η^e_{i,k} τ_{i,k}).

(2) η^e_{i,k} = exp(Δ^e_i + τ_{i,k} λ^e_1 Σ_{i0 ∈ P^j_k \ i} Δ^e_{i0} − λ^e_2 Σ_{i0 ∈ P^{T_k\j}_k} Δ^{E\e}_{i0} + δ_{T^H_{k,j}} γ^e). **Uncertainty:** the summation limits and sign structure were visually garbled in the PDF extraction; the form above is reconstructed from the fragments ("Σ_{i0∈P^j_k\i}" own-team abilities, "Σ_{i0∈P^{T_k\j}_k}" opposition abilities in the paired event E\e, home-effect Kronecker term) and the accompanying text (L390–458). Treat as reconstruction, not verbatim.

(3) Log-likelihood: ℓ = Σ_{e∈E} Σ_{k=1}^K Σ_{j∈T_k} Σ_{i∈P^j_k} [X^e_{i,k} log(η^e_{i,k} τ_{i,k}) − η^e_{i,k} τ_{i,k} − log(X^e_{i,k}!)].

(4)–(8): VI setup — ELBO(q(ν)) = E_q[log π(ν, x)] − E_q[log q(ν)]; mean-field factorization q(ν) = Π_{r=1}^R q(ν_r | φ_r); Gaussian variational factors q(Δ^e_i | φ^e_i) ~ N(μ_{Δ^e_i}, σ²_{Δ^e_i}); ELBO decomposed in (8) and closed form in Appendix A (equations 22–25, entropy/cross-entropy terms verified as standard Gaussian forms).

(9)–(13): Baseline team goals y^t_k ~ Poisson(θ_t) with log-intensities (10) log(θ_h) = home + att_h + def_a, (11) log(θ_a) = att_a + def_h, and extension (12)–(13) adding f(q(Δ))_h / f(q(Δ))_a.

(14)–(15): f(q(Δ))_h = Σ_{i∈I^H_k} Σ_e μ_{Δ^e_i} − Σ_{i∈I^A_k} Σ_{E\e} μ_{Δ^{E\e}_i}, f(q(Δ))_a mirrors with teams swapped; concretely (17)–(18): f(Δ)_h = Σ_{i∈I^{T^H_k}_k} [Δ^Goal_i + Δ^Shots_i + Δ^ChainEvents_i] − Σ_{i∈I^{T^A_k}_k} [Δ^GoalStop_i + Δ^ShotStop_i + Δ^AntiPass_i], with the reverse for the away team.

(16): prior π(Δ^e_i) ~ N(−2, 2²).

Stated assumptions (Sec. 3 and Sec. 5): (a) independence between events when grouped; (b) more involvements in an event type ⇒ higher ability; (c) time played τ_{i,k} proxies a player's interaction with own team/opposition; (d) a player retains the same latent abilities when injured or transferred; (e) mean-field independence of latent variables (authors acknowledge this underestimates posterior uncertainty, citing Bishop 2006); (f) predicted starting lineups from expert analysts are accurate (86% over the season); (g) penalties not separated from other goals; (h) home effect constant across teams and the whole timespan.

## 5. Features / target
Inputs: per-player per-game counts of each event type (from ~1.2M touch-by-touch events) plus fraction of time played τ_{i,k}, and human-predicted starting lineups (86% accuracy) for the prediction application. Target 1 (ability model): player ability rankings per event type (no external ground truth — validated by face-validity against the 2013/2014 season and by the prediction experiment). Target 2 (hierarchical model): probability that over 2.5 goals are scored in a future match; averaged over posterior samples of θ = θ_h + θ_a.

## 6. Validation design
Time-ordered design. Ability model fitted on the full 2013/2014 EPL season (380 games). Prediction model: fit on all past data, predict forward in blocks — block 0 = all of 2013/2014; blocks 1–4 add 80 games of 2014/2015 each; final block adds 60 games (380 total). Predictions for prediction blocks 1–5 (block 1: 57 games, excluding promoted teams; blocks 2–4: 80 games; block 5: 60 games). Baselines: the Baio–Blangiardo model without latent abilities. Metrics: AUC of over/under 2.5 predictions (Table 7); mean predictive log-likelihood; cumulative betting return under a Kelly-like strategy with £100 stakes (strategy details not disclosed — tied to Stratagem's business decisions). Sensitivity check on τ_{i,k}: out-of-sample prediction biases with vs. without the time component (Goal 0.201 vs 0.237; GoalStop 4.374 vs 5.130; Shots 0.807 vs 0.807).

## 7. Numerical results / baselines
All quoted exactly as in the paper (Sec. 4).

- **AUC (over/under 2.5), baseline vs. with latent player abilities (Table 7):** Block 1: 0.47 / 0.54; Block 2: 0.60 / 0.65; Block 3: 0.53 / 0.58; Block 4: 0.55 / 0.68; Block 5: 0.61 / 0.62. Latent abilities improved AUC in all five blocks, though the block-5 gap is small (authors attribute this to the baseline having nearly a full season of data and to end-of-season lineup volatility).
- **Mean predictive log-likelihood, block 1** (log-likelihood of the second 80 games of 2014/2015): with latent abilities −163.106 vs. baseline −159.578 — the extension was *worse* on log-likelihood; authors state predictions, not log-likelihood, are their main judgement. (Similar pattern across other blocks.)
- **Betting validation:** cumulative return over the 2014/2015 season at £100 per bet: **+£4486.73** (with latent abilities) vs. **−£378.54** (baseline). Baseline fluctuates around zero, as expected.
- **Fixed hyperparameters ψ for Goal/GoalStop (Table 4):** Goal: λ_1 = 2.907×10⁻⁸, λ_2 = 0.041, γ = 0.165; GoalStop: λ_1 = 1.621×10⁻⁷, λ_2 = 0.009, γ = 0.003. Home effect for Goal much larger than for GoalStop.
- **Top-10 Goal ranking (Table 5, by 2.5% quantile):** 1. Suarez (Liverpool; quantile 0.508, mean 0.869, sd 0.184, 31 goals, 3185 min); 2. Sturridge (0.176, 0.617, 0.225, 21, 2414); 3. Agüero (0.147, 0.636, 0.250, 17, 1616); 4. Y. Touré; 5. Rooney; 6. Dzeko; 7. van Persie; 8. Rémy; 9. Bony; 10. Rodríguez. Model elevates Agüero (3rd) and van Persie (7th) above their raw goal totals because of limited minutes — expert analysts agreed.
- **Top-10 GoalStop (Table 6):** 1. Mulumbu (2.575 quantile); 2. Kallström (only 144 min — sd 0.177, large uncertainty); 3. Mannone; 4. Yacob; 5. Tioté; 6. Lewis (98 min); 7. Palacios; 8. Jedinak; 9. Ruddy; 10. Arteta. Made up mainly of defensive midfielders plus two goalkeepers.
- Example posterior behavior: Daniel Sturridge (29 apps, 2414 min, 21 goals) has tight posterior; Harrison Reed (4 apps, 23 min, 0 goals) has posterior resembling the prior.
- Within-sample: nearly all observed per-game counts fall inside the 95% prediction intervals of the η model (Figure 6).
- No connection found between GoalStop occurrence and goals conceded (Chelsea and Norwich City have similar GoalStop predictive distributions despite conceding 27 vs. 62 goals).

## 8. Code / data availability
None stated. The paper mentions implementation in native Python with autograd + ADAM (for the ability model) and PyStan (for the hierarchical model), but no repository or code link appears in the text. Data and odds dataset are proprietary to Stratagem Technologies.

## 9. Leakage & limitations
- **External validity to NFL:** none directly — soccer touch-by-touch events and over/under 2.5 goals have no NFL counterpart; the ranking target ("best goalscorer") is domain-specific. The methodological shell (per-player Poisson ability + team context + playing-time scaling, VI fitting) is the only transferable part.
- **Unreplicable:** proprietary Stratagem data and odds; undisclosed betting strategy; expert-defined event groupings; human-predicted lineups (86% accuracy). The method hinges on ~1.2M manually/tagged events with analyst-defined composite event types — no public equivalent on the NFL side beyond charting data.
- **Overfitting/unidentifiability risks:** 2182 parameters; λ^Goal_1 = 2.907×10⁻⁸ is effectively zero, suggesting the own-team ability term barely participates (degeneracy not discussed).
- **Mean-field underestimates uncertainty** (acknowledged, citing Bishop 2006) — the 2.5%-quantile ranking, which explicitly depends on posterior variance, is therefore built on systematically understated uncertainty; small-count players (Kallström, 144 min) rank 2nd in GoalStop despite huge sds.
- **Confounding:** abilities are per-team-game counts normalized by minutes, but team quality and ability are entangled (λ1 ≈ 0, and team effects largely persist in att/def, which the model only partially absorbs — the variance reduction in Figure 10 is the evidence).
- **Betting validation is weak evidence:** undisclosed strategy, no confidence interval on £4486.73, no multiple-testing accounting across 5 blocks, and log-likelihood (the proper scoring rule) favors the baseline.
- **Penalties not separated; injuries/transfers assumed ability-preserving; independence across grouped events assumed without evidence (authors flag this themselves).**

## 10. GSE overlap
No duplicate in the existing-research map (checked 2026-09-21; arXiv ID 1710.00001 does not appear in its already-read/dedup list). GSE is an NFL engine (spread/moneyline/total only, model v5.2.7 per memory) — there is no soccer lane and no per-player event-ability component in the current engine, so this is not duplicate work. It is, however, an out-of-scope capability: nothing in GSE's data stack (nflverse, FTN charting, odds APIs) maps to touch-by-touch soccer event counts or a 2.5-goals market.

## 11. GSE implementation spec
No implementation is recommended (REJECT). The only salvageable concept — latent per-player ability with playing-time exposure and team-context terms — would, if ever pursued for NFL player props, require: (a) FTN/Sportradar charting event counts per player per game (targets, tackles, pressures) plus snap counts as τ; (b) a Poisson/NB model of count events per player per game with team-opposition terms; (c) VI fitting; (d) summation of posterior abilities into drive/team scoring rates. Effort: 4–8 engineer-weeks for a prototype. This is not sanctioned work: no GSE lane consumes player-event ability estimates, and the engine's current scope is spread/moneyline/total only.

## 12. Reproducible test
A transferability test (not a verbatim replication — the paper's soccer charting data are unavailable to GSE): dataset = nflverse play-by-play 2020–2025, aggregated to per-player-per-game event counts (targets for WR/TE, tackles for defenders, snap counts τ). Fit the paper's Poisson per-player ability model with team-opposition terms via variational inference on seasons 2020–2024; evaluate on the 2025 season held-out. Metric: held-out predictive log-likelihood per game on player event counts. Baseline: naive team-rate Poisson (no per-player latent ability). Time window: one full season (2025, 18 weeks). Gate: the latent-ability model must beat the baseline's predictive log-likelihood by ≥ 2% on the held-out season; otherwise the paper's core claim — that the latent-ability structure adds predictive value — does not transfer, and the adaptation stays rejected.

## 13. Acceptance / rejection gate
Gate: adopt or adapt only if a per-player latent-ability feature, built from GSE's own charting data, lifts a held-out prop or totals prediction metric by a numeric margin — e.g., ≥ 0.005 improvement in log-loss on player totals markets — beyond the current engine baseline in a time-ordered backtest over one full NFL season (2025, 18 weeks), with a proper scoring rule, not betting ROI. Absent that numeric margin, reject. This paper itself fails the proper-scoring-rule bar (its baseline wins on predictive log-likelihood).

## 14. Improvement experiment
If the latent-ability shell were ever adapted to NFL charting data, the paper's own discussion suggests the key upgrade: replace the mean-field approximation with a structured variational approximation that allows correlations among latent abilities (or apply the Giordano et al. 2018 variance correction), since ranking by the 2.5% posterior quantile is exactly where underestimated variance distorts the answer — a structured posterior would give more robust rankings and possibly improve the predictive power the paper was chasing.
