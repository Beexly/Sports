# 1028-R Google Research Football: A Novel Reinforcement Learning Environment (arXiv:1907.11180v2) — REPLACEMENT for 2410.10736

**Citation:** Karol Kurach et al. (Google Research, Brain Team) (2020). *Google Research Football: A Novel Reinforcement Learning Environment*. arXiv:1907.11180v2. URL: https://arxiv.org/abs/1907.11180
**Full-text source:** https://arxiv.org/html/1907.11180v2 (fetched 2026-09-21; converted to text, complete incl. appendices).
**Ledger completed:** 2026-09-21. **Read:** full text (not abstract).
**Lane (assignment):** abstention (reserve replacement; original lane n/a — environment paper).
**Replacement for:** 2410.10736 (REJECT).

## 1. Research question
Can we build an RL environment that is simultaneously challenging, computationally accessible, stochastic, open-source, and supportive of multi-agent/self-play research? The paper introduces the Google Research Football (GRF) environment — a physics-based 3D soccer simulator — plus Football Benchmarks (3 full-game difficulties), Football Academy (11 curriculum scenarios), and baseline results for IMPALA, PPO, and Ape-X DQN.

## 2. Dataset / schema
No static dataset — a simulator. Football Engine: heavily customized GameplayFootball (Schuiling 2017) in optimized C++; full 11v11 soccer rules (goals, fouls, corners, penalties, offsides, yellow/red cards, handballs); default game = 3000 frames (10 fps × 5 min); players have per-player stats (speed, accuracy) and fatigue; both teams share the same player stat set for fairness. Rule-based opponent bot with difficulty θ ∈ [0,1] (easy 0.05, medium 0.6, hard 0.95). Open-source: github.com/google-research/football. Performance: ~140M steps/day on a single hexa-core Intel Xeon W-2135.

## 3. Method / model
- Observations (3 representations): Pixels (1280×720 RGB), Super Mini Map (4 binary 72×96 matrices: home/away/ball/active player; stackable across timesteps), Floats (115-dim compact vector: coordinates, possession, direction, game mode).
- Actions (19): 8 movement directions, short/high/long pass, shot, slide tackle, dribble, sprint, stop-dribble, stop-moving, stop-sprint, do-nothing. Moving/sprinting are sticky until an explicit stop action. (A switch-active-player action was removed after policies exploited it to hand control back to the built-in AI.)
- Rewards: **Scoring** (+1 goal / −1 conceded) and **Checkpoint** (shaped): opponent half divided into 10 checkpoint regions by Euclidean distance to goal; first controlled possession in each region pays +0.1 (max +1 = one goal); uncollected checkpoints are credited on scoring; once per episode. Stochastic mode default (same shot → different outcomes); deterministic mode available. OpenAI Gym API.
- Benchmarks: 3 full-game tasks (easy/medium/hard opponent). Baselines: PPO (16 parallel workers, single machine), IMPALA (500 actors), Ape-X DQN (150 actors), all on stacked SMM, 5 seeds, 500M steps; hyperparameter search: 100 configs × 3 seeds on easy, best selected at 500M (IMPALA/DQN) or 50M (PPO).

## 4. Equations & assumptions
No formal equations (environment paper). Key quantitative definitions: checkpoint reward +0.1 × 10 regions; difficulty θ parameterization via bot reaction-time scaling; game length 3000 frames default / 400 frames for Academy scenarios (ending on score, ball loss, or stoppage).

## 5. Features / target
Target: episodic goal difference. Inputs are the three observation representations above. Academy scenarios (11): Empty Goal Close, Empty Goal, Run to Score, Run to Score with Keeper, Pass and Shoot with Keeper, Run/Pass and Shoot with Keeper, 3v1 with Keeper, Corner, Easy/Hard Counter-Attack, 11v11 with Lazy Opponents.

## 6. Validation design
- Benchmarks: 3 difficulties × 2 rewards × 3 algorithms × 5 seeds = reported as mean average goal difference with 95% bootstrapped CIs (Figure 4; exact means/std in Appendix Tables 5-6).
- Academy: 11 scenarios × 5 seeds, 50M steps (Figures 6-7, 9-10).
- Representation experiment: Floats vs Pixels-gray (72×96) vs SMM vs stacked SMM, IMPALA + Checkpoint on easy 11v11, 100M and 500M steps (Table 4).
- Self-play non-transitivity experiment (Table 2): agent A trained vs built-in AI (medium); agent B trained vs frozen A.
- Multi-agent experiment (Table 3): control 1/2/3 players in 3v1-with-Keeper at 5M and 50M steps.

## 7. Numerical results / baselines
Exact numbers (mean ± std over 5 seeds, average goal difference):
- Benchmarks, Scoring reward @500M (Table 5): DQN easy **8.16±1.05**, medium **2.01±0.27**, hard **0.27±0.56**; IMPALA easy 5.14±2.88, medium −0.36±0.11, hard −0.47±0.48; PPO @50M easy 0.09±0.13, medium −0.84±0.10, hard −1.39±0.22.
- Benchmarks, Checkpoint reward @500M (Table 6): IMPALA easy **12.83±1.30**, medium **5.54±0.90**, hard **3.15±0.37**; DQN easy 7.06±0.85, medium 2.18±0.25, hard 1.20±0.40; PPO @50M easy 8.71±0.72, medium 1.11±0.45, hard −0.75±0.13. (Checkpoint massively helps policy-gradient methods; DQN similar under both rewards.)
- Representation (Table 4, 500M steps): stacked SMM **12.89±0.51**, SMM 9.75±4.15, pixels-gray 7.18±0.85, floats 5.73±0.28. (Hand-designed spatial encoding beats raw pixels and compact floats.)
- Self-play non-transitivity (Table 2): A vs built-in AI **4.25±1.72**; B vs A **11.93±2.19**; B vs built-in AI **−0.27±0.33** — B crushes A yet loses to the bot A beats.
- Multi-agent (Table 3, 50M steps): 1 player 0.68±0.03, 2 players 0.81±0.17, 3 players 0.86±0.08 (slower start, higher ceiling).
- Academy: empty-goal scenarios solved by PPO/IMPALA in ~1M steps ("unit tests"); mid scenarios need 5-50M steps; Corner is hardest.
- Throughput: ~140M env steps/day on one hexa-core machine.

## 8. Code / data availability
Environment open-source: github.com/google-research/football. Hyperparameters fully tabulated (Tables 7-9): e.g., IMPALA lr 0.00013730 (scoring) / 0.00019896 (checkpoint), γ=0.993, 500 actors, unroll 32; PPO lr 0.00011879/0.000343, 16 actors, unroll 512, GAE λ=0.95; DQN lr 0.00001475/0.0000115, 150 actors, γ=0.999.

## 9. Leakage
- Baselines are from 2019-2020 (IMPALA/PPO/Ape-X DQN); headroom claims are stale — modern methods (e.g., MuZero-style) have since beaten the hard benchmark. Not a flaw for the environment's purpose, but the numbers are not SOTA.
- Hyperparameters tuned on easy then transferred to medium/hard — favors algorithms whose hyperparameters transfer (IMPALA) over those needing per-difficulty tuning.
- PPO was run for only 50M steps vs 500M for IMPALA/DQN (single-machine constraint), making cross-algorithm comparisons uneven.
- Academy v1.x vs v2.x version mixing noted in the appendix figures.

## Limitations
- Soccer, not American football: rules, state space, and action semantics do not transfer to the NFL.
- Sparse-reward conclusions (Checkpoint >> Scoring for policy gradients) are specific to this simulator's dynamics.
- The environment is a game AI benchmark, not a prediction-modeling testbed; nothing in it models betting markets, odds, or probabilistic forecasting.
- Results reflect 2020-era algorithms; the "large headroom" framing is dated.

## 10. GSE overlap
Existing-research map check: nothing in the map covers RL environments or game-AI benchmarks; GSE's engine is a supervised probabilistic prediction system (model v5.2.7), not an RL agent. No duplication. Two transferable ideas: (1) the self-play **non-transitivity** result (B beats A 11.93±2.19, A beats bot 4.25±1.72, yet B loses to bot −0.27±0.33) is a direct caution for GSE's engine-benchmark lane — pairwise model bake-offs can misrank; (2) the representation experiment (stacked spatial encodings 12.89±0.51 ≫ compact floats 5.73±0.28) is evidence for the tracking lane that spatial/mini-map-style encodings of player positions beat raw coordinate vectors in learned models. Checkpoint reward shaping (+0.1 per region, capped at +1) is a clean template for dense intermediate rewards if GSE ever trains sequential decision policies (e.g., in-play bet-timing agents).

## 11. GSE implementation spec
- **Evaluation-protocol fix (cheap, immediate):** when comparing candidate engine versions, replace head-to-head backtest bake-offs with a fixed benchmark suite (frozen historical slates + fixed opponent = the market/consensus baseline) plus an Elo-style rating, precisely because pairwise superiority is non-transitive (Table 2). Document the protocol in the Sports repo benchmark docs.
- **Tracking representation experiment (medium):** build a mini-map encoding of NFL tracking data (e.g., 32×32 spatial grids per frame for offense/defense/ball, stacked over ±5 frames) as an alternative input to the current coordinate-based features for a play-outcome model; compare against the floats-style vector on a fixed prediction task.
- **If GSE ever does sequential RL** (in-play hedging/timing agents): adopt the Checkpoint pattern — dense shaping rewards proportional to progress toward the objective (e.g., fraction of edge captured), capped at the sparse terminal reward, credited once per episode.

## 12. Reproducible test
Dataset: GSE's existing engine-version backtests. Protocol: take the last 3 candidate engine versions and rank them (a) by pairwise head-to-head P&L on 2024 season slates, and (b) by P&L against the fixed consensus/market baseline suite. Test: check whether the pairwise ranking and the fixed-suite ranking disagree (non-transitivity check) on at least one pair — if they do, the fixed-suite protocol becomes the standing selection rule. Metric: rank correlation between the two orderings.

## 13. Acceptance / rejection gate
**Gate:** adopt the fixed-suite selection protocol if the non-transitivity test shows ≥1 rank disagreement between pairwise and fixed-suite orderings across the last 3 engine versions, or if any version that wins pairwise loses to the market baseline. This is a process adoption, not a model — the gate is the demonstrated disagreement.

## 14. Improvement experiment
Go beyond the paper's fixed bot: implement a *league* of frozen historical engine versions as the benchmark suite (analogous to GRF's self-play pool) and rate new versions by Elo against the league rather than by raw P&L — this directly operationalizes the non-transitivity lesson and gives a stable, comparable "engine rating" over time. Second: run the mini-map vs floats representation bake-off on NFL tracking data for play-level EPA prediction; if spatial encodings win, port them into the tracking lane's feature store.

**Verdict: ADAPT** — no NFL-transferable model, but two concrete portable ideas: non-transitive evaluation (fix GSE's model-selection protocol) and spatial mini-map encodings for tracking data.
