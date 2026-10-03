# [0958] EventGPT: Capturing Player Impact from Team Action Sequences (arXiv:2512.17266)

## Citation / full-text source

- arXiv:2512.17266 — full text: https://arxiv.org/pdf/2512.17266
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Miru Hong, Minho Lee, Geonhee Jo, Jae-Hee So, Pascal Bauer, Sang-Ki Ko (2025). *EventGPT: Capturing Player Impact from Team Action Sequences Using GPT-Based Framework*. arXiv:2512.17266. URL: https://arxiv.org/abs/2512.17266
**Ledger completed:** 2026-09-21. **Read:** full text — cached manuscript text is the v2 version titled "ScoutGPT" (same model, method, and experiments as the v3 "EventGPT" abstract; framework renamed between versions). All numbers below are from the cached v2 manuscript, whose abstract matches the v3 abstract verbatim in substance.
**Verdict:** ADAPT — player-conditioned GPT-style autoregressive next-event modeling with a residual on-ball value (rOBV) target and counterfactual player substitution; the framework ports to NFL play sequences for scheme-fit and matchup simulation.

## 1. Research question
Can a player-conditioned, value-aware GPT-style autoregressive transformer model football as discrete event sequences — jointly predicting the next action's type, location, timing, outcome, and its residual on-ball value — and thereby simulate counterfactually how a player's value profile changes in a different team/tactical context (transfer fit)?

## 2. Dataset / schema
- Five seasons of Premier League event data (text says 2019/20–2023/24 in §3.1 but Table 1 lists 2020/21–2024/25 — noted inconsistency), SPADL-standardized, episode-segmented (an episode = contiguous play with an unchanged set of 22 on-pitch players; new episode at set-pieces, goals, period transitions, substitutions, dismissals).
- Table 1: 1,900 matches, 173,951 episodes, 22.48 avg events/episode, 1,221 players. Train: 2020/21, 2021/22, 2022/23 seasons + first half of 2023/24 and 2024/25; remainder held out.
- Access: event data source not named as public (StatsBomb-style; no download link stated).

## 3. Method / model
1. **Tokenization:** SPADL event representation; unified vocabulary with non-overlapping token ranges for attributes, player IDs, context markers; continuous attributes (coordinates, elapsed time, OBV) discretized to bounded integer ranges. Episodes ≤ 100 events (truncate/pad).
2. **Context block** per episode: c = (pID_1:22, minute, h_g′, a_g′, h_r′, a_r′, h_y′, a_y′) — the 22 on-pitch player IDs, match minute, cumulative goals and red/yellow cards home/away.
3. **Event tokens:** v_t = (h_t, e_t, x_t, y_t, δ_t, o_t, rOBV_t) — acting team, event type, discretized coordinates, elapsed time since previous event, success indicator, and **residual on-ball value**: rOBV_t = E[Σ_{τ=t}^{T_episode} OBV_τ | state at t, player p_t] — the player's expected future episode value, not just immediate action value.
4. **Architecture:** decoder-only Transformer adapted from Karpathy's NanoGPT: causal self-attention blocks, multi-head attention + position-wise FFN, residual connections, layer norm, single shared embedding matrix, learned positional embeddings, output projection tied to input embeddings. Player ID conditions predictions but is **never itself predicted** — enabling counterfactual substitution by swapping the identity token.
5. **Training:** teacher forcing, next-token loss L = −Σ_{t=1}^{T} log P(v_{t+1} | c, p_{1:t}, v_{1:t}). Hyperparameters (layers, heads, dim, LR, batch): not stated in the manuscript.
6. **Counterfactual transfer simulation:** replace player p_i with p_j in the context block, keep the event sequence fixed, re-evaluate predicted rOBV (or autoregressively regenerate N samples); aggregate per role — arithmetic mean for low-variance roles, **top-quartile (top 25%) truncated mean for attackers** (high-variance OBV, rare high-value outcomes).

## 4. Equations & assumptions
- Context: c = (pID_{1:22}, minute, h_{g′}, a_{g′}, h_{r′}, a_{r′}, h_{y′}, a_{y′}).
- Event: v_t = (h_t, e_t, x_t, y_t, δ_t, o_t, rOBV_t).
- rOBV: rOBV_t = E[Σ_{τ=t}^{T_episode} OBV_τ | state at t, player p_t].
- Next-token distribution: P(v_{t+1} | c, p_{1:t′}, v_{1:t}).
- Loss: L = −Σ_{t=1}^{T} log P(v_{t+1} | c, p_{1:t}, v_{1:t}).
- Assumptions: (a) discretizing coordinates/time/OBV loses nothing important; (b) episodes with fixed 22 players = consistent tactical context; (c) player embeddings capture style independent of context enough to transplant; (d) rOBV estimated from training-window OBV generalizes; (e) top-25% truncated mean is the right attacker aggregator.

## 5. Features / target
- Inputs: context block tokens + preceding event tokens (team, type, x, y, Δt, success, rOBV) + player ID tokens.
- Targets (next-token): all event attributes including rOBV; player ID never predicted.
- Derived: predicted rOBV distributions per player-context pair; embedding-space cosine similarity for retrieval.

## 6. Validation design
- Held-out: second halves of 2023/24 and 2024/25 (temporal holdout).
- Baselines: LEM (original) and "LEM Transformer" (NMSTPP Transformer backbone re-headed to the multi-attribute output). Metrics: accuracy for categorical (h, e, action success a), MAE on original scale for continuous (x, y in meters; δ_t; rOBV).
- Applications: t-SNE of player embeddings (unsupervised role structure); 4 counterfactual case studies (striker cross-substitution, Saka-role RW ranking, embedding-retrieval alternatives, Haaland-into-defense).

## 7. Numerical results / baselines
- Table 2 (columns h↑ e↑ x↓ y↓ t↓ a↑ rOBV↓): LEM — 85.20%, 74.07%, 9.01, 8.11, 1.37, 90.51%, 0.014. LEM Transformer — 96.05%, 80.42%, 7.15, 7.08, 1.40, 86.92%, 0.008. **EventGPT — 94.12%, 82.91%, 4.30, 4.31, 1.11, 92.87%, 0.009.** Event type +2.5pp over LEM Transformer; spatial MAE roughly halved; rOBV MAE 0.009 vs 0.008 (second best — authors flag as competitive).
- Case Study 1 (striker contexts, 2023/24): in Haaland's Man City context, Alexander Isak pred. rOBV **3.76** (own OBV 4.94) > Haaland sim 2.71 ≈ GT 2.59; Højlund 2.23, Núñez 2.12, Mateta 1.94. In Højlund's Man Utd context: Isak 4.65, Núñez 3.91, Højlund sim 2.23 ≈ GT 1.67, Haaland 1.37 — elite finishers' value collapses in the weaker system. Cross-substitution table: Isak consistently strong across contexts; Núñez's low 2023/24 GT rOBV noted as a training-window artifact.
- Case Study 2 (RW in Saka's 2023/24 context, ≥1500 min): Salah 19.78, Madueke 19.36, Semenyo 19.22, Traoré 18.92, Saka sim **18.59** vs GT 15.72 (positive bias acknowledged — sim used as baseline), Mahrez 17.50, Mbeumo 11.80, Bowen 10.10.
- Case Study 3 (embedding retrieval for Saka role): Salah (sim rank 4) and Madueke (rank 5) top again via cosine retrieval + substitution — converging evidence.
- Case Study 4 (Haaland into Arsenal defensive contexts): Haaland 2.35/1.42/1.98/1.37 vs original-player sims 5.19/3.63/5.14/8.78 (Zinchenko/Magalhães/Saliba/White contexts) — value is context-shaped, not label-shaped; no positional labels used in training, yet t-SNE shows clean role clusters (CB/FB dense region, wing-backs intermediate, AM/winger/FW sub-clusters).

## 8. Code / data availability
None stated (no repo URL, no data link; references a linked video clip).

## 9. Leakage
- Train/test: temporal holdout is sound, but player embeddings are learned on train seasons and evaluated on the same players in test — transfer simulation is interpolation, not zero-shot to unseen players.

## Limitations
- rOBV inherits the training window's OBV distribution (Núñez artifact acknowledged); substitution fidelity unvalidated against actual transfers (no ground truth — no player actually moved between the compared contexts).
- Saka positive bias (sim 18.59 vs GT 15.72) suggests systematic overestimation; aggregation choice (top-25% for attackers) is heuristic.
- Hyperparameters unstated; no ablation of player-conditioning vs value-awareness separately in the excerpted tables (claimed but numbers shown only for full model vs baselines).
- Baselines are adapted/re-headed by the authors themselves (LEM Transformer) — fair-ish but home-field.
- The cached manuscript is v2 ("ScoutGPT"); v3 ("EventGPT") differences beyond the rename are unverified.

## 10. GSE overlap
Existing-research-map: "Large Event Models" (LEM) referenced in the map's ML-brief topics? The map mentions representation learning on play-by-play and TabTransformer event representation (2606.09327), but no autoregressive player-conditioned event model has been read in depth. **New capability**: sequence-modeling play progression with player identity conditioning — maps to NFL drive/play sequences with EPA as the value target, and to counterfactual scheme-fit questions (how would WR X perform in team Y's route tree?).

## 11. GSE implementation spec
- Data: nflverse play-by-play 2015–2024, drive/possession segmented (episode analog = drive with fixed personnel? approximate with drive); events = plays with tokens (down, distance, formation, play type, yards, EPA).
- Steps: (a) tokenize each drive as a sequence: context block (22 starters? use offensive personnel + game state: score diff, time, down/distance) + per-play tokens (play type, yards, EPA, success); (b) train nanoGPT-style decoder with player (QB) identity conditioning + residual EPA target rEPA_t = E[Σ future EPA in drive | state, player]; (c) counterfactual: substitute QB/WR embeddings into another team's drive contexts to simulate scheme fit; (d) use for matchup sims and trade/FA fit evaluation.
- Effort: ~1–2 weeks for a prototype (tokenizer + nanoGPT training on ~10 seasons of plays is modest compute).

## 12. Reproducible test
Dataset: nflverse 2020–2024 play-by-play. Baseline: drive-level EPA regression on game state (no sequence, no player conditioning). Test: next-play prediction (play type accuracy, yards MAE) on 2024 held-out drives; then QB-substitution simulation — check that substituting an elite QB's embedding into a weak offense's drive contexts raises predicted drive EPA vs the original QB (face-validity gate), and that the model's predicted EPA correlates with actual next-drive EPA at r ≥ 0.3.

## 13. Acceptance / rejection gate (numeric gate)
ADAPT if: on held-out 2024 drives, the player-conditioned autoregressive model beats the game-state EPA regression on next-play yards MAE by ≥5% AND the QB-substitution face-validity check passes (elite QB embedding raises predicted drive EPA in ≥80% of weak-offense contexts). Otherwise keep only the rEPA residual-value target idea.

## 14. Improvement experiment
Add tracking-derived context (pre-snap defensive shell, receiver separation at route break) as additional tokens in the event sequence, and test whether tracking-conditioned rEPA predicts drive outcomes better than the events-only model; second, validate substitution fidelity against real QB team-changes (e.g., train through 2022, simulate a QB's 2023 performance on his new team, compare to actual).

## Verdict

**ADAPT** — verdict per wave-2 reader-15 report (full-read ledger; the acceptance criterion is stated in the numeric-gate section above).
