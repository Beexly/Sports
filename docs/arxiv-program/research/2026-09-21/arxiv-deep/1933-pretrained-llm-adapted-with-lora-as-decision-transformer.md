# [1933] Pretrained LLM Adapted with LoRA as a Decision Transformer for Offline RL in Quantitative Trading (arXiv:2411.17900)

**Citation:** Suyeol Yun (2024). *Pretrained LLM Adapted with LoRA as a Decision Transformer for Offline RL in Quantitative Trading*. arXiv:2411.17900. URL: https://arxiv.org/abs/2411.17900
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

## 1. Research question
Can a Decision Transformer initialized with pretrained LLM (GPT-2) weights and fine-tuned with LoRA learn better trading policies from offline expert trajectories than (a) the same architecture with random weights, and (b) standard offline RL baselines (CQL, IQL, BC)? The motivation: financial time series have complex temporal dependencies, offline data is limited, and pretrained sequence priors may generalize better than tabula-rasa training.

## 2. Dataset / schema
Simulated trading of 29 DJIA constituent stocks. Phase 1: five RL algorithms (A2C, DDPG, PPO, TD3, SAC) trained as experts on 2009-01-01 → 2020-07-01 (~2,892 trading days). Phase 2: expert trajectories collected → offline training set. Phase 3: evaluation 2020-07-01 → 2021-10-29 (~335 trading days, unseen market conditions). State = market features per stock; action = portfolio weights/trades; reward = portfolio return. Metrics: cumulative return %, maximum drawdown %, Sharpe ratio.

## 3. Method / model
**DT-LoRA-GPT2.** Decision Transformer (returns-to-go/state/action tokens, GPT backbone) initialized with pretrained GPT-2 weights, fine-tuned with Low-Rank Adaptation (LoRA — only a small fraction of parameters updated). Control: identical architecture with randomly initialized GPT-2-shaped weights + LoRA. Baselines trained on the same expert trajectories: CQL, IQL, BC. Training objective: match expert actions conditioned on returns-to-go (standard DT supervised loss).

## 4. Equations & assumptions
- Standard DT formulation: trajectory τ=(R̂_1,s_1,a_1,…,R̂_T,s_T,a_T); autoregressive action prediction.
- LoRA: W = W_0 + BA with low-rank update (rank r ≪ d); W_0 frozen at GPT-2 pretrained values.
- Objective: supervised action-matching loss on expert trajectories ("encourages the model to generate actions that closely match the expert actions in the offline dataset").
- Assumptions: expert trajectories are near-optimal; GPT-2's sequence prior transfers to financial time series; test period (2020–2021, COVID-recovery regime) is representative.

## 5. Features / target
Input: sequences of (returns-to-go, market state, action) tokens over 29 stocks. Target: next action (portfolio allocation). Horizon: trading days (long sequences).

## 6. Validation design
Time-ordered: train experts 2009–2020, collect trajectories, train offline models, test 2020-07-01 → 2021-10-29 (strictly out-of-sample period). Baselines: CQL, IQL, BC, random-init DT+LoRA, and the experts themselves. Metrics: cumulative return, MDD, Sharpe. Results reported per expert-trajectory source (A2C block, DDPG block, etc.).

## 7. Numerical results / baselines
Table 2 (test period; cumulative return % / MDD % / Sharpe):
- A2C-expert block: Expert 34.69/−9.12/1.60; **DT-LoRA-GPT2 43.72±2.04/−8.42±0.57/1.76±0.08**; DT-LoRA-Random 38.66±0.43/−9.42±0.18/1.80±0.02; CQL 48.00±3.75/−9.32/2.23±0.10; IQL 40.26±3.24/−10.12±0.58/1.84±0.15; BC 40.10±1.22/−8.24±0.43/1.71±0.11.
- DDPG-expert block: Expert 48.44/−9.33/2.26; DT-LoRA-GPT2 47.98±1.35/−9.47±0.21/2.22±0.04; DT-LoRA-Random 42.88±1.89/(rest cut off in extraction).
- Findings: GPT-2 initialization consistently beats random initialization (43.72 vs 38.66 on A2C; 47.98 vs 42.88 on DDPG); DT-LoRA-GPT2 beats the expert it learned from on A2C trajectories and matches it on DDPG; CQL is the strongest baseline on raw return/Sharpe in the A2C block. "Effectively handles sparse and delayed rewards and captures complex temporal dependencies."

## 8. Code / data availability
"Replication code for our experiments is publicly available at the project" page (URL in paper; not extracted verbatim here). Market data: DJIA constituents (public via standard vendors).

## 9. Leakage & limitations
- Experts trained on 2009–2020 then evaluated on trajectories from the same experts — the offline dataset is high-quality by construction; GSE's logged picks are medium-quality (real, mixed-skill historical rules), a harder regime.
- Test window is a single 335-day bull-market recovery — one regime, no bear-market test.
- CQL beats DT-LoRA-GPT2 on cumulative return and Sharpe in the A2C block — pretraining helps, but value-based offline RL is still competitive.
- Single author, workshop paper (ICAIF '24 workshop), small-scale by modern standards.
- GPT-2 is tiny/old; the transfer claim may be stronger or weaker with modern models (untested).

## 10. GSE overlap
Directly upgrades ledger 1924 (Decision Transformer for staking): instead of training a small GPT from scratch on 6 seasons, warm-start from a pretrained sequence model + LoRA. No repo work uses pretrained sequence models for decisions (transformer mentions are limited to TFT as a brief topic). Also reinforces ledger 1923: CQL remains the baseline to beat. New capability.

## 11. GSE implementation spec
1. Take the season-episode trajectory format from ledger 1924 (weekly R̂_t, s_t, stake-vector a_t).
2. Initialize a small causal LM (GPT-2-scale or a modern small instruct model) as the DT backbone; add LoRA adapters (rank 8–16); modality embedding heads for (R̂, s, a) tokens as in the paper's Figure 1.
3. Fine-tune on 2019–2023 season episodes; control = random-init identical architecture.
4. Inference as in 1924 (prompt target season return, decrement weekly).
5. Also fine-tune a variant on the *text* side: prepend a short natural-language slate summary token sequence (the paper doesn't do this; LLMs can consume it) — tests whether the pretrained prior helps more when the state has a language channel.
6. Effort: ~2 weeks on top of 1924 (LoRA training is cheap; the work is tokenization + the control experiment).

## 12. Reproducible test
Dataset: GSE season episodes 2019–2024 (train 2019–2023, test 2024). Compare: (a) DT-LoRA-pretrained, (b) DT-LoRA-random, (c) CQL staking (1923), (d) fractional-Kelly. Metrics: 2024 ROI, max drawdown, and the paper's transfer diagnostic — (a) vs (b) gap. Prompted-target/achieved-return correlation as in 1924.

## 13. Acceptance / rejection gate
ADOPT iff on 2024 (a) beats (b) by ≥1pp ROI (transfer works in this domain) AND (a) beats fractional-Kelly by ≥2pp with drawdown no worse; if (a)≈(b), REJECT the pretraining complexity and use the from-scratch DT from 1924.

## 14. Improvement experiment
Cross-domain pretraining: pretrain the DT backbone on *other* sequential decision logs (e.g., public betting-market histories, synthetic Kelly-optimal trajectories) before LoRA-tuning on GSE seasons. Tests whether the transfer gain comes from generic sequence modeling (scales with any sequential data) or from language priors specifically — if synthetic-data pretraining matches GPT-2 init, GSE can generate unlimited pretraining data in-house.
