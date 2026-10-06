# [0308] Optimizing Fantasy Sports Team Selection with Deep Reinforcement Learning (arXiv:2412.19215)

**Citation:** Shamik Bhattacharjee, Kamlesh Marathe, Nilesh Patil, Hitesh Kapoor (Dream11, 2024). *Optimizing Fantasy Sports Team Selection with Deep Reinforcement Learning*. arXiv:2412.19215v1. URL: https://arxiv.org/abs/2412.19215
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 491 lines).
**Verdict:** ADAPT — fantasy cricket team selection via DQN/PPO; directly relevant to GSE's DFS lane, with caveats on data quality, metric weakness, and sport-specific priors.

## 1. Research question
Can framing fantasy team creation as a sequential decision-making problem and training deep RL agents (DQN, PPO) on historical player data produce fantasy cricket teams that consistently outperform traditional heuristics (last-match performance, popular selection %) and supervised ML baselines (SVM, Random Forest)? (Abstract; Sec. 1)

## 2. Dataset / schema
- Round-level player performance data, T20 internationals + IPL + bilateral/trilateral series. 22 players per round (11 per side), past-90-day feature histories, per-player 10-feature vectors → state shape (22, 10) (Sec. 3.1).
- Train: Jan 2021 – Jan 2023; test: Mar 2023 – Jan 2024, split into 4-fold cross-validation with temporal gap between train/val folds to prevent leakage (Sec. 4).
- Target: the "dream team" = the 11 players with the highest fantasy points in each round (Sec. 3.1). Match-level score normalization to handle high- vs low-scoring matches.

## 3. Method / model
- **MDP formulation:** state O_t = (t, S_t, R_t) — timestep, selected 11, reserve 11; action A_t = (rm_t, ad_t), one player swap between selected and reserve teams; deterministic transitions; custom OpenAI Gym environment (Sec. 3.2).
- **Reward design (Sec. 3.2.3):** −1 per swap (efficiency penalty); +10 on reaching goal state; goal state = selected team scores ≥ α × max possible score, α ∈ [0.7, 1.0], set to **0.8** after an α-ablation (Fig. 4).
- **Algorithms:** DQN — `L_DQN = (r + γ max_{a'} Q(s',a') − Q(s,a))²` with replay buffer 10k, target update 5k steps, ε-exploration 0.1→0.02; PPO — clipped surrogate objective (clip range 0.2), shared feature extractor (FC 256→512→1024, Tanh/ReLU variants) + actor/critic heads.
- **Training:** Stable-Baselines3 on Databricks with multiple GPUs; 2,000,000 timesteps; LR 1×10⁻³ / 0.0001 per Table 1; batch 128; γ=0.99; 10,000 episodes (Table 1; Sec. 4).
- **Baselines:** previous-match performance, popular player-% selection, SVM (RBF, C=1), Random Forest (100 trees, depth 10).

## 4. Equations & assumptions
- `L_DQN = (r + γ max_{a'} Q(s',a') − Q(s,a))²`; policy objective `J(θ) = E_{s∼d^π, a∼π_θ} [Σ_t γ^t r(s_t, a_t)]`
- State shape (22, 10); action = single swap; goal-state condition: team score ≥ α × max score, α=0.8
- Assumes: fantasy points fully determined ex post (no ownership/duplication effects modeled); past-90-day features stationary; the "dream team" ex-post optimum is a learnable target; budget/role constraints approximated away in the swap formulation.

## 5. Features / target
- Inputs: 10 past-90-day features per player (batting average, bowling strike rate, fielding stats, fantasy points, etc.).
- Target: dream-team membership / percentile rank of predicted team vs real-user teams.

## 6. Validation design
4-fold temporal CV on Mar 2023–Jan 2024 test rounds, with a temporal gap between train and validation folds. Percentile score of RL-predicted teams vs all real user teams in each round (Table 2); predicted-to-dream-team score ratio density plots (Fig. 5); α ablation (Fig. 4); PPO training curve (Fig. 3).

## 7. Numerical results / baselines
Table 2 — percentile rank of predicted team vs real user teams, 4 CV folds:
- PPO: 0.67 / 0.62 / 0.64 / 0.62 (best)
- DQN: 0.61 / 0.58 / 0.59 / 0.52
- RF classifier: 0.57 / 0.54 / 0.51 / 0.56; SVM: 0.55 / 0.56 / 0.54 / 0.55
- Previous Performance: 0.54 / 0.51 / 0.57 / 0.54; Player % selection: 0.55 / 0.56 / 0.54 / 0.51
- RL teams averaged above the 60th percentile; in their game top-40th percentile wins rewards (Sec. 5).

## 8. Code / data availability
Not stated; no repository link.

## 9. Leakage & limitations
- **Metric weakness:** the "dream team" is the ex-post optimum — trivially learnable only in hindsight; the percentile-vs-real-users metric conflates selection skill with the fact that most users are uninformed. No prize-money or ROI evaluation (60th percentile means prizes in their game, but EV isn't computed).
- **Data quality (Sec. 5 acknowledged):** "integrating real-time player performance data could enable dynamic team adjustments" — i.e., the evaluation is on historical rounds with 90-day feature windows, not live pre-lock data; no handling of late-breaking news (injuries, lineups, pitch reports).
- **No ownership/duplicate awareness:** DFS contests are won by maximizing probability of a top finish, not expected score; the agent maximizes expected team score with no correlation/ownership modeling — fatal for GPP (large-field) play.
- **No salary-cap constraint:** the swap formulation ignores budget; NFL DFS (DraftKings) is salary-constrained.
- **Author affiliation:** Dream11 (the Indian fantasy platform) — the paper is partly a user-retention tool ("assist new users with a baseline team"); treat claims accordingly.
- **Cricket-specific priors:** 11-player teams from 22; NFL DFS has 9 slots with position eligibility and flex — the Gym environment needs rebuilding.

## 10. GSE overlap
Existing-research map: GSE runs an active DFS lane (weekly DFS packet is a standing deliverable; 2026-09-20 memory). No existing DFS paper ledger covers RL-based team construction. This is the first RL-for-fantasy paper in the sweep; no duplication risk.

## 11. GSE implementation spec
Recommended pilot (small):
1. Rebuild the Gym environment for DraftKings NFL DFS: 9 roster slots (QB/RB/RB/WR/WR/WR/TE/FLEX/DST), $50k salary cap, player pool from nflverse/ESPN projections.
2. Reward: −1 per illegal/inefficient swap, +10 on reaching α×max projected score, α=0.8, plus a GPP overlay term (projected score minus ownership-penalized expected duplications) in a second training phase.
3. Algorithms: PPO (winner here) + DQN; SB3; 2M timesteps; same network template (256→512→1024 feature extractor, actor/critic heads).
4. Baseline: current GSE optimizer's median projected-score lineup on the same slate.
5. Effort: 2–3 engineer-days for the environment; 1–2 days training/comparison.

## 12. Reproducible test
Dataset: nflverse 2020–2025 weekly data + DraftKings salary tables for Weeks 1–8 2025. Metric: percentile rank of the agent's lineup vs the full contest field by realized DK points on held-out Weeks 9–17 2025. Baseline: current GSE median-projection optimizer lineups. Window: 8 held-out slates. Gate in §13.

## 13. Acceptance / rejection gate
**Accept the adaptation if** the PPO agent's mean percentile rank over the 8 held-out NFL slates ≥ the optimizer baseline's mean percentile by ≥ 5 points, with the improvement consistent across ≥ 5 of 8 slates. If it only matches on expected score but loses on GPP-relevant top-1% finish rate, reject the reward design and keep only the environment + α-threshold idea.

## 14. Improvement experiment
The paper's reward maximizes expected team score — wrong objective for GPPs. Train a two-headed variant: head 1 maximizes projected score (cash-game lineups), head 2 maximizes probability of finishing above the 99th percentile of the simulated field (tournament lineups), using a field simulator built from public ownership projections. Compare head-2 lineups against head-1 and the current optimizer on historical GPP slates by actual payout EV. This is the experiment that would turn a retention-tool paper into a money tool.
