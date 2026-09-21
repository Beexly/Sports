# [1354] Modeling Matches as Language: A Generative Transformer Approach for Counterfactual Player Valuation in Football (arXiv:2603.15212v2)

**Citation:** Hong, M., Lee, M., Jo, G., Cho, H., Kim, H., Bauer, P., & Ko, S.-K. (2026). *Modeling Matches as Language: A Generative Transformer Approach for Counterfactual Player Valuation in Football*. arXiv:2603.15212v2 [cs.AI]. URL: https://arxiv.org/abs/2603.15212
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org, 16 pages + references, complete).
**Verdict:** ADAPT — ScoutGPT's value-aware generative event model with Monte Carlo counterfactual simulation gives GSE a concrete architecture for simulating "what-if" roster/scenario outcomes from play-by-play token streams; the transfer-valuation framing (naive carry-over MAE 1.84 → simulated 1.25 across 40 transferred players) maps directly onto NFL trade/free-agency impact estimation and prop-market scenario pricing, though the K League event schema and VERSA taxonomy must be rebuilt for NFL play-by-play.

## 1. Research question
Can football matches be modeled as a language — serialized event tokens fed to a GPT-style transformer — so that the model both predicts the next event and simulates full counterfactual event sequences under hypothetical lineups (e.g., "what would this player's value be if transferred to team X")? The paper introduces ScoutGPT, a player-conditioned, value-aware autoregressive framework, and tests whether Monte Carlo simulation of hypothetical transfers predicts post-transfer player value (episode VAEP) better than naive carry-over extrapolation. (Secs. 1–2)

## 2. Dataset / schema
K League 1 and 2 (South Korea) event data, 2021–2025, standardized to the VERSA event representation (29 action types), chronologically split (Table 2):
- Train 2021–2023: 1,320 matches, 132,315 episodes, 3,528,635 events (26.67 events/episode), 1,090 players
- Valid 2024: 462 matches, 43,579 episodes, 1,277,169 events (29.31 events/episode), 848 players
- Test 2025: 501 matches, 47,046 episodes, 1,324,363 events (28.15 events/episode), 859 players
- Episodes = single in-play segments (set-piece/kickoff → goal, foul, or ball out of play); capped at Tmax = 100 events, longer episodes split with sliding window stride 50. (Secs. 3.2, 4.1)

## 3. Method / model
- **Tokenization:** 54-dim match-context vector c (team IDs, 22 player roles, 22 player IDs, 8 match-state tokens) + each event as a 10-token tuple (team ID, role, player ID, action type, start x/y, end x/y, elapsed time δt, outcome); flattened to one sequence s = (c1..c54, s1,1..s1,10, ..., sT,1..sT,10) (eq. 1). Continuous fields quantized into shared integer bins 0–105.
- **Backbone:** NanoGPT (GPT-2 decoder-only transformer), shared token-embedding table Wtok ∈ R^|V|×d with per-field sub-vocabularies for categorical fields and a shared bin vocabulary for quantized continuous fields, learnable positional embeddings, stack of L pre-LayerNorm blocks with causal masked multi-head self-attention and GELU MLP (eqs. 2–3).
- **Two heads:** (i) next-token cross-entropy L_next; (ii) goal-prediction head at each event's last token predicting binary indicators g_t^+, g_t^- (acting team scores/concedes within 15 s), loss L_goal. Composite loss L = L_next + L_goal (Sec. 3.4).
- **Constrained decoding (inference):** ownership-lock on the ball-carrier across in-possession events; dynamic episode termination on EOS / set-piece restart / goal / foul / own goal (Sec. 3.5).
- **Counterfactual transfer simulation:** swap the transferred player's ID/role tokens into the target team's context, Monte Carlo-generate episode sequences, aggregate residual on-ball value → simulated episode VAEP (Secs. 3.5, 5.2).

## 4. Equations & assumptions
- Sequence: s = (c1,…,c54, s1,1,…,s1,10,…,sT,1,…,sT,10) (eq. 1).
- Embeddings: h^(0) = Wtok[s] + Wpos[:N] ∈ R^{N×d} (eq. 2); block update h̃^(l) = MSA(LN(h^(l))) + h^(l), h^(l+1) = MLP(LN(h̃^(l))) + h̃^(l) (eq. 3).
- Objectives: P(e_{t+1} | c, e_{1:t}; θ), P(g_t^+ = 1 | c, e_{1:t}; θ), P(g_t^- = 1 | c, e_{1:t}; θ) (Sec. 3.1); composite loss L = L_next + L_goal, eq. (6) (Sec. 3.4) — no weighting coefficient λ.
- Assumptions: matches partition cleanly into independent in-play episodes; VERSA taxonomy (29 action types) captures all tactically relevant variation; player identity is fully captured by role+ID tokens; 15-second goal window is the right value horizon; Monte Carlo samples from the learned distribution approximate true counterfactuals (no unobserved confounding between transfer choice and team context).

## 5. Features / target
Inputs: 54 context tokens (home/away team IDs, 22 role tokens, 22 player-ID tokens, 8 match-state tokens: period, minutes, home/away goals, yellow/red cards) + per-event 10 tokens (acting team, role, player ID, action type, start/end pitch coordinates, elapsed seconds, success/failure). Targets: next token (categorical, per-field vocabularies) and two binary goal indicators within 15 s. Downstream: episode-level VAEP sums for transfer valuation.

## 6. Validation design
Chronological split (train 2021–2023 / valid 2024 / test 2025) — time-ordered, no leakage across seasons. Three evaluation axes: (i) next-event prediction accuracy vs sequence baselines, (ii) goal-prediction quality, (iii) counterfactual transfer simulation: top 40 transferred players by post-transfer minutes in 2025, comparing simulated post-transfer episode VAEP against ground truth and a naive baseline (previous-season VAEP extrapolated with playing-time adjustment only). Ablations remove each component (accuracy/F1 for categorical attributes, R²/MAE for continuous; Sec. 4). Self-to-self reconstruction fidelity checked via mean absolute delta vs number of Monte Carlo samples (Fig. 3).

## 7. Numerical results / baselines
- Transfer simulation (Table 8, 40 players): mean absolute error of post-transfer episode VAEP — naive 1.84 → ScoutGPT-simulated 1.25 ("substantial relative error reduction"); average episode VAEP sums: naive 4.85, ground truth 4.71, simulated 4.59.
- Case study Jinsu Kim (left back): naive 7.00 vs GT 11.07 vs simulated 11.63 → absolute errors 4.07 (naive) vs 0.56 (simulated); his transfer was regarded as highly successful and he was named team captain the next season.
- Reis (left wing): GT 12.19, simulated 12.06 (error 0.13) vs naive 16.15 (error 3.96). Jihoon Cho (central mid): simulated error 0.22 vs naive 3.74.
- Gains appear across roles (full-backs, wingers, central midfielders), not confined to one position.
- Ablations (Table 5): removing lineup info degrades role accuracy/F1 (−0.090/−0.156); removing the context block degrades time R² (−0.184) and inflates time MAE (+0.069); w/o-both worst on time (−0.212 R², +0.097 MAE). Note the headline MAE gains (start-x 4.59 → 0.97, time 1.42 → 0.75) are from Table 3 main results vs the LEM-Transformer baseline — not from the ablation.
- Player embeddings (t-SNE, Fig. 4): clusters align with tactical roles; multi-role players (e.g., Jinsub Park between DM and CB clusters) sit between role clusters, matching known versatility.
- Cross-season player retrieval via embeddings (Table 7) reported as supporting representation quality.

## 8. Code / data availability
Paper code: none stated (refers only to the public NanoGPT implementation, https://github.com/karpathy/nanoGPT, and supplementary material with role/action taxonomies). K League event data: not public (league-proprietary feed, standardized via VERSA [19]).

## 9. Leakage & limitations
- Chronological split is clean, but the transfer-simulation evaluation conditions on players who actually transferred — transfer decisions are non-random (better players move to better teams), so simulated-vs-GT error conflates model skill with selection effects; no causal identification, despite "counterfactual" framing.
- VAEP itself is a model-based value metric, so the target is partly synthetic; errors in VAEP propagate into the evaluation.
- K League–specific: VERSA taxonomy, 29 action types, and player-ID vocabularies do not transfer to other leagues; out-of-vocabulary players/teams need re-tokenization.
- Monte Carlo simulation cost per hypothetical scenario is not benchmarked in wall-clock terms; episode cap Tmax=100 truncates long phases of play.
- No comparison against a modern tabular/gradient-boosting baseline on the transfer task — only against the naive carry-over.

## 10. GSE overlap
Garrett's corpus already contains sequence/event representation work for sports (TabTransformer event representation 2606.09327; diffusion trajectory modeling 2503.18589; existing-research-map.md lines 45, 70) and NFL play-by-play modeling via nflverse. Nothing in the corpus does GPT-style generative simulation of full play sequences for counterfactual roster/scenario valuation — the "what would happen if" simulation layer is new capability, extending the existing event-representation work into a generative direction. Complements rather than duplicates.

## 11. GSE implementation spec
- Data: nflverse play-by-play 2009–2025 as the token stream; define an NFL "episode" as a drive (or possession segment); quantize yard lines (0–100), seconds, down/distance into integer bins; context block = teams, 22 starters' IDs/positions, score, clock, timeouts, weather.
- Model: NanoGPT-style decoder-only transformer; per-field sub-vocabularies (play type, formation, personnel, outcome) + shared bin vocab for coordinates; two heads — next-play-token cross-entropy and drive-outcome (points scored on drive) binary/multinomial head; composite loss as in Sec. 3.4.
- Counterfactual use cases: (a) trade/free-agency impact — swap player-ID tokens into a team's context, Monte Carlo full-season drive sequences, compare expected points added vs naive carry-over; (b) prop-market scenario pricing — condition on game script (score/clock context tokens) and simulate player stat distributions instead of closed-form projections.
- Effort: 3–5 weeks for tokenizer + training pipeline on a single 8×A100-class box; VERSA-equivalent NFL taxonomy is the main manual lift.

## 12. Reproducible test
Dataset: nflverse pbp 2021–2024 (train 2021–2022, valid 2023, test 2024), drives as episodes. Metric: next-play type top-1 accuracy and drive-points MAE vs a Markov-chain baseline and vs XGBoost on hand features. Transfer-analog test: for the 40 highest-snap free-agency team-switchers of 2024, compare simulated post-switch EPA/play against naive prior-season EPA/play carry-over; gate on MAE reduction.

## 13. Acceptance / rejection gate
ADOPT the architecture if, on the 2024 test season, the transformer beats the Markov baseline on next-play accuracy by ≥3 points AND the free-agency simulation MAE is ≥15% lower than naive carry-over; otherwise REJECT the generative-simulation layer and keep only the next-play predictor as a feature generator.

## 14. Improvement experiment
Condition generation on sportsbook odds context tokens (spread/total moneyline-implied probabilities as additional context fields): test whether market-implied game-script information improves simulated player-stat distributions for prop pricing — i.e., a market-conditioned ScoutGPT whose Monte Carlo outputs are directly comparable to sportsbook prop lines for edge detection.
