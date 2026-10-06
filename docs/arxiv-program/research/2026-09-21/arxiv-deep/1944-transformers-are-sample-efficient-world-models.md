# [1944] Transformers are Sample-Efficient World Models (arXiv:2209.00588)

**Citation:** Vincent Micheli, Eloi Alonso, François Fleuret (2022). *Transformers are Sample-Efficient World Models*. arXiv:2209.00588 (ICLR 2023). URL: https://arxiv.org/abs/2209.00588
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

the "dynamics as language modeling" framing (VQ tokenizer + autoregressive transformer over play tokens) is a cleaner fit for discrete NFL play sequences than Dreamer's RSSM; needs adaptation from pixels to structured game state.

## 1. Research question
Can a world model built as an autoregressive transformer over discrete tokens — i.e., casting dynamics learning as a sequence-modeling (language-modeling) problem — make imagination-based RL sample-efficient enough to beat humans on Atari with only ~2 hours of gameplay (100k steps), without lookahead search?

## 2. Dataset / schema
Atari 100k benchmark (Kaiser et al. 2020): 26 Atari 2600 games, 100k environment steps per game (≈2 hours real-time), image observations, discrete actions, scalar rewards, termination flags. No external dataset — agent collects its own experience. Public benchmark. No train/test split (online RL, 5 seeds in the results table).

## 3. Method / model
IRIS = discrete autoencoder + GPT-like transformer + actor-critic trained purely in imagination.
- Tokenizer: VQ-VAE-style discrete autoencoder E: R^{h×w×3} → {1..N}^K (K tokens from vocabulary size N; CNN encoder, CNN decoder; argmin over embedding table E={e_i}). Trained with equally-weighted L1 reconstruction + VQ commitment loss + perceptual loss, straight-through estimator.
- World model G: GPT-like transformer over interleaved frame/action tokens: (z_0^1..z_0^K, a_0, r_0, d_0, z_1^1..z_1^K, a_1, …). Self-supervised training on segments of L timesteps: cross-entropy loss for next-token (transition) and termination predictors; MSE or cross-entropy for the reward predictor depending on reward function. Hyperparameters (Table 3): L=20 timesteps, embedding dim D=256, M=10 layers, 4 attention heads, weight decay 0.01, embedding/attention dropout 0.1.
- Imagination: encode initial frame to tokens, policy π predicts action from decoded/current tokens, G autoregressively unfolds next-frame tokens + predicts reward r̂_t and termination d̂_t. Policy (actor-critic) trained exclusively on imagined trajectories; real environment used only to improve the world model.
- Key demonstration: after only 120 games of training on Pong, the world model reenacts a test trajectory "pixel perfect", including the scoreboard-update game mechanic.

## 4. Equations & assumptions
Encoder: z_t^k = argmin_i ‖ y_t^k − e_i ‖_2, y_t = CNN(x_t) ∈ R^{K×d}, codebook E ∈ R^{N×d}.
Autoencoder loss: L(E,D,E) = ‖x−D(z)‖_1 + ‖sg(E(x))−E(z)‖²_2 + ‖sg(E(z))−E(x)‖²_2 + L_perceptual(x, D(z)).
Transformer losses: cross-entropy for token transition and termination; MSE/CE for reward.
RL objective: maximize E_π[ Σ_{t≥0} γ^t r_t ] with π trained on imagined rollouts.
Assumptions (stated): POMDP with image observations; discrete actions; a discrete token language can capture environment dynamics faithfully; imagination horizon adequate for policy learning; world-model accuracy over extended rollouts.

## 5. Features / target
Inputs: image frames → K discrete tokens; interleaved action tokens. Targets: next-frame tokens (CE), reward (MSE/CE), episode termination (CE). Policy target: discounted return in imagination. Prediction horizon: imagination rollouts (L=20 training segments; longer at imagination time).

## 6. Validation design
Atari 100k protocol: 100k env steps per game, 26 games. Baselines (from the results table columns): random, human, SimPLe, DER, OTRainbow, DrQ, SPR, CURL?, and others — IRIS row achieves the reported aggregates. Metrics: mean/median/IQM of human-normalized scores, #superhuman games. 5 seeds.

## 7. Numerical results / baselines
(Paper claims.) IRIS achieves **mean human-normalized score 1.046**, **median 0.289**, **superhuman on 10 of 26 games** — "setting a new state of the art for methods without lookahead search", surpassing SimPLe, DER, OTRainbow, DrQ, SPR, CURL variants in the table (e.g., next-best mean 0.616, next-best superhuman count 6). First method with mean above human-level in the 100k regime without search.

## 8. Code / data availability
Stated: code and models at https://github.com/eloialonso/iris. Atari benchmark public (license acknowledgment required for ROMs).

## 9. Leakage & limitations
No static dataset → no leakage. Limitations: (i) VQ tokenizer is brittle — codebook collapse kills the world model; (ii) pixels → tokens is wasteful for NFL where the true state is structured (down/distance/score), though the token-LM framing transfers; (iii) Atari 100k games are short-horizon and reactive; long-horizon sparse-reward games (Frostbite) remain weak — NFL full-game credit assignment is similarly hard; (iv) policy is trained for control, not unbiased simulation — for pricing we want the generator, not the agent; (v) transformer imagination is O(L²) per rollout vs RSSM's O(L).

## 10. GSE overlap
Complements 1942/1943 (Dreamer line): alternative world-model backbone (discrete tokens + GPT) rather than RSSM. No overlap with existing GSE work — the repo has no token-based sequence model of games. Connects to the corpus rule interest in LLM/sequence techniques from the 2026-09-18 ML brief (frontier-model techniques topic) but nothing built. The token-LM framing is arguably MORE natural for NFL than for Atari: plays are already discrete tokens (play type, formation, result), so no VQ-VAE is needed — the tokenizer problem disappears.

## 11. GSE implementation spec
"GSE-IRIS": tokenize each play as a discrete multi-token tuple (play_type, formation_family, direction, rusher/receiver bucket, yardage bucket, EPA bucket, score_event, turnover flag) — a play-level "language" with vocabulary ~2–5k. Train a GPT-style transformer (causal LM) on nflverse play sequences 2006–2025 with next-token CE + per-play score/termination heads, conditioned on a pregame matchup embedding (team strength priors) prepended as context tokens. At inference, autoregressively sample full games (≤ ~170 play-tokens) 100k times per matchup in parallel; aggregate to score distributions. This directly mirrors IRIS's Fig. 1 imagination loop, replacing pixels with structured play tokens.

## 12. Reproducible test
Same nflverse 2015–2024 protocol as 1942 §12 (train 2015–2022, val 2023, test 2024). Baselines: (a) the RSSM GSE-Dream from 1942 §12, (b) bootstrap historical simulator. Metrics: 2024 one-step-ahead perplexity/log-likelihood of play tuples, weekly final-score TVD, kickoff WP ECE. Success = token-transformer beats (a) and (b) significantly (paired bootstrap p<0.05).

## 13. Acceptance / rejection gate
ADOPT the token-autoregressive architecture as GSE's primary game simulator if on 2024 held-out: one-step-ahead log-likelihood ≥5% better than the RSSM variant AND final-score TVD ≤5% per week AND WP ECE ≤0.03. REJECT if it underperforms the RSSM on two of three metrics — transformers are hungrier for data and NFL has only ~500k plays; RSSM may win on data efficiency. Either way, the losing backbone is dropped.

## 14. Improvement experiment
Beyond the paper: hierarchical tokens — a drive-level summary token emitted every drive (result, points, plays, starting field position) trained with an auxiliary drive-outcome head, giving the transformer explicit long-range structure (drives are the natural "paragraphs" of a football game, ~10–13 per team). Expectation: better 4th-quarter score-distribution tails (comeback regimes) than flat play-token LM. Test: tail calibration (predicted vs empirical P(margin > 14)) on 2024 games.
