# [0617] Predicting Chess Puzzle Difficulty with Transformers (arXiv:2410.11078v2)

**Citation:** Miłosz, S. & Kapusta, P. (2024). *Predicting Chess Puzzle Difficulty with Transformers*. arXiv:2410.11078v2. URL: https://arxiv.org/abs/2410.11078v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1707 lines).
**Verdict:** ADAPT — core idea is a chess-domain difficulty model with no direct GSE use, but its uncertainty-aware training machinery (rating-deviation target sampling, MAZ metric) ports to GSE calibration and rating labels with heterogeneous label noise.

## 1. Research question
Can a transformer approximate the Glicko-2 rating system for chess puzzle difficulty — i.e., predict how hard a puzzle *feels* to humans of varying skill — by modeling both the spatial piece arrangements and the temporal move sequence of the puzzle solution? The authors present GlickFormer, test whether factorized spatio-temporal processing (two variants) beats a state-of-the-art ChessFormer baseline on 4.2M Lichess puzzles, and whether injecting rating-deviation uncertainty into training targets improves generalization.

## 2. Dataset / schema
- **4.2 million chess puzzles from Lichess.org**, beginner → grandmaster difficulty.
- **Split:** 4,158,000 puzzles train; 42,000 test/validation (~1%).
- **Columns per puzzle:** starting position (FEN); sequence of solution moves; Glicko-2 rating r (difficulty label); rating deviation RD (label reliability); metadata (themes, number of plays, popularity scores, game tags).
- **Label distribution:** mean Glicko-2 rating 1516, std 543. Most RD values in [80, 90] (high-confidence labels); infrequently-solved puzzles have RD > 200.
- **Access:** public — the paper describes the schema; the exact Lichess-derived 4.2M puzzle dump is not linked with a URL (competition data from the IEEE BigData 2024 Cup). Public source, exact export not linked in paper.

## 3. Method / model
**Puzzle encoding.** Each puzzle is encoded as a sequence P = {B_1, B_3, B_5, …, B_N} of every-alternate board position (redundancy reduction), each B_n ∈ R^{16×8×8}: 12 piece channels (6 mover's pieces + 6 opponent's pieces, consistent mover-perspective; board mirrored if Black is the mover) + 4 move channels (previous-move from/to squares, next-move from/to squares). Max sequence length N_max = 5.

**Spatial backbone: ChessFormer** (from Leela Chess Zero's transformer work). Chess-specific self-attention with a learnable per-square bias ("Smolgen"): each token embedding h_i ∈ R^d is compressed via W_c to dimension d_c = d/32, the 64 compressed tokens concatenated to c ∈ R^{64·d_c}, passed through FC + Mish + LayerNorm to h ∈ R^{(64·d_c)×(d/4)}, then to per-head bias embeddings G ∈ R^{h×(d/4)} via W_g, then multiplied by a shared-across-blocks weight W_b ∈ R^{(d/4)×(64·64)} to produce per-head bias matrices B^(j) ∈ R^{64×64}, added to attention scores A^(j) = Q^(j)(K^(j))ᵀ/√d_k + B^(j). This replaces Euclidean positional encoding with chess-movement-topology bias.

**Two temporal variants** (ViViT-inspired factorization):
1. **Factorized Encoder GlickFormer** (late fusion): each board encoded independently through ChessFormer → board embedding s_n (token transform: linear W_1 to d_z=32, concat, project to d_e=512). Board embeddings stacked to S ∈ R^{N×d_e}, learnable temporal positional embeddings t_n added, then L_t = 16 temporal transformer encoder layers. Final s_1^(L_t) → MLP f: R^{d_e} → R predicts difficulty ŷ.
2. **Factorized Self-Attention GlickFormer**: spatial attention (with Smolgen) and temporal attention interleaved inside each of L = 16 encoder blocks — temporal self-attention applied over the N boards per spatial position (reshape to R^{64×N×d}, attend over N), then position-wise FFN; learnable temporal embedding added to token embeddings.

**Training objective:** MSE loss L = (1/M)Σ(ŷ_i − y_i)². Labels standardized: μ_i = (r_i − 1516)/543, φ_i = RD_i/543. **Uncertainty-aware target sampling:** during training, target y_i is sampled from N(μ_i, φ_i²) (clipped to [μ_i − 3φ_i, μ_i + 3φ_i]) — acts as data augmentation (multiple plausible difficulty targets per puzzle) and regularization (stability across samplings, preventing overfit to a single Elo value).

**Implementation details:** Mish activation f(x) = x·tanh(ln(1+e^x)) everywhere. d = 256, d_c = d/32, d_z = 32, d_e = 2d = 512, L = L_t = 16 layers, h = 16 heads, d_k = d_q = d_v = d/h (temporal heads use d/2h). Trained in TensorFlow 2.13 on NVIDIA Quadro RTX 6000 GPUs. 28,000 steps, RMSprop, lr 1×10⁻⁶, ρ = 0.99, batch size 4096. Cyclical optimizer-state restarting, k-th cycle length = 1000k steps. Authors note Adam or higher learning rates collapsed to predicting the dataset mean with zero standard deviation. Sampling-based augmentation was sufficient regularization — no dropout or weight decay used.

## 4. Equations & assumptions
- Encoding: P = {B_1, B_2, …, B_N}, B_n ∈ R^{16×8×8} (in practice every alternate position used).
- Smolgen: c_i = h_i W_c, W_c ∈ R^{d×d_c}; c = concat(c_1,…,c_64) ∈ R^{64·d_c}; h = LayerNorm(φ(c W_h)), W_h ∈ R^{(64·d_c)×(d/4)}; g = LayerNorm(φ(h W_g)), W_g ∈ R^{(d/4)×(h·d/4)}; G = reshape(g) ∈ R^{h×(d/4)}; b^(j) = G^(j) W_b, W_b ∈ R^{(d/4)×(64·64)}; B^(j) = reshape(b^(j), (64,64)); A^(j) = Q^(j)(K^(j))ᵀ/√d_k + B^(j).
- Board embedding: z_{n,i} = h_{n,i} W_1 + b_1; z_n = concat(z_{n,1},…,z_{n,64}) ∈ R^{64·d_z}; s_n = z_n W_2 + b_2, s_n ∈ R^{d_e}.
- Temporal (factorized encoder): S = [s_1; …; s_N] ∈ R^{N×d_e}; s̃_n = s_n + t_n; S^(l) = TemporalTransformerLayer^(l)(S^(l−1)); ŷ = f(s_1^(L_t)), f: R^{d_e} → R.
- Training: L = (1/M)Σ_{i=1}^M (ŷ_i − y_i)²; μ_i = (r_i − 1516)/543; φ_i = RD_i/543; training target y_i ∼ N(μ_i, φ_i²), clipped to [μ_i − 3φ_i, μ_i + 3φ_i].
- Metrics: MAE = (1/N)Σ |r_i − r̂_i|; MAZ = (1/N)Σ |r_i − r̂_i|/RD_i; Accuracy-within-kRD = (1/N)Σ 𝟙(|r_i − r̂_i| ≤ k·RD_i), k = 1,2,3.
- Mish: f(x) = x·tanh(ln(1 + e^x)).
- **Stated assumptions:** (1) every-alternate-position sampling captures puzzle evolution without loss of essential information; (2) RD in Glicko-2 acts as the label's standard deviation under a normal model, justifying Gaussian target sampling; (3) test set of 42,000 puzzles (~1%) is "sufficient to provide a reliable and statistically significant evaluation" due to size and diversity; (4) mirroring the board for Black-movers preserves the mover-perspective representation; (5) chess-movement topology (not Euclidean distance) defines relevant square relationships for attention bias.

## 5. Features / target
- **Inputs:** sequence (≤5) of 16×8×8 board tensors (12 piece channels + previous-move and next-move from/to channels), plus puzzle metadata available (themes, plays, popularity — encoding uses only the board sequence).
- **Target:** standardized Glicko-2 puzzle difficulty rating (regression), with per-sample label uncertainty (standardized RD) used for target sampling at train time only.
- **Horizon:** single static prediction per puzzle (no temporal horizon).

## 6. Validation design
- Train/test split as in §2; not stated to be time-ordered (described as a split of the 4.2M pool, not a date cut).
- **Baselines:** ChessFormer architecture stacking N past boards along input channels (following ChessFormer's own temporal handling) with its value head — a state-of-the-art solution for chess tasks.
- **Metrics:** MAE (raw Elo points), MAZ (error normalized by per-puzzle RD — uncertainty-adjusted), accuracy within 1/2/3 RD (empirical-rule bands: 68%/95%/99.7% under normality).
- **External validation:** entered the IEEE BigData 2024 Cup "Predicting Chess Puzzle Difficulty" competition (11th place); prototype Factorized Encoder reported on the competition test set.
- No cross-validation reported; no ablation isolating the Smolgen bias vs. the temporal components beyond the two variants vs. baseline.

## 7. Numerical results / baselines
- **Test-set MAE (Table I):** ChessFormer baseline 227.00; Factorized Self-Attention GlickFormer 221.80; Factorized Encoder GlickFormer **217.71** (best; −9.29 Elo points vs baseline, ~4.1% relative).
- **Test-set MAZ (Table I):** ChessFormer 2.68; Self-Attention 2.62; Factorized Encoder **2.57**.
- **Accuracy within 1RD / 2RD / 3RD (Table II, %):** ChessFormer 25.42 / 48.21 / 65.29; Self-Attention 26.13 / 48.54 / 66.08; Factorized Encoder **27.00 / 50.45 / 67.66**.
- Both GlickFormer variants beat the baseline on all metrics; the late-fusion Factorized Encoder beats the interleaved self-attention variant.
- MAE by moves-to-solve (Fig. 4): GlickFormer variants outperform baseline across multi-move puzzles; exception — single-move puzzles, where Factorized Self-Attention performs *worse* than the ChessFormer baseline.
- IEEE BigData 2024 Cup competition: 11th place; prototype Factorized Encoder MSE — preliminary test set **75,995**, final test set **158,292** (large gap between prelim/final; paper does not explain the discrepancy).
- Note the absolute scale: MAE ≈ 218 on ratings with std 543 — models explain only a modest fraction of rating variance; 27% within 1 RD means 73% of predictions miss the stated 1-σ confidence band. (Paper's claim: "superior performance"; my read: gains are real but the absolute task difficulty remains high.)

## 8. Code / data availability
None stated. No GitHub link, no data URL in the paper text. (The parallel competition paper [13], Omori & Tadepalli, is a separate CNN-LSTM approach, not this code.)

## 9. Leakage & limitations
- **Label leakage via next-move channels:** the encoding includes 2 channels for the *next* move (anticipated start/end squares). The paper's puzzle encoding uses the solution move sequence — if "next move" is taken from the ground-truth solution line, the model sees part of the answer as input; the paper does not address whether this gives the model direct access to solution structure that should be inferred. Adversarial read: difficulty prediction may partly exploit solution-move hints embedded in the input.
- **Test distribution vs competition discrepancy:** prelim MSE 75,995 vs final 158,292 on the competition test set — a >2× gap with no explanation, suggesting distribution shift or an overfit prototype; the paper reports both numbers but does not discuss the gap.
- **Absolute accuracy is weak:** MAE 217.71 vs rating std 543; only 27% of predictions land within the label's own 1-RD band. The rating itself is noisy; the model may be near the noise floor.
- **RD as σ assumption:** target sampling treats Glicko-2 RD as a normal-distribution standard deviation; Glicko-2's RD conflates information content and time decay, and most RDs cluster at 80–90, so the "uncertainty" channel has limited diversity.
- **Training instability acknowledged:** Adam/higher LRs collapsed to mean prediction with zero variance — the optimization is fragile, and the chosen RMSprop 1e-6 regime may be under-exploring.
- **No time-ordered split; no out-of-domain test** (all puzzles from one source, Lichess); transfer to newly created puzzles untested beyond the competition set.
- **External validity to NFL:** near-zero direct transfer — chess puzzle perception has no analogue in football; the architecture (chess-board topology attention) is domain-locked. Only the meta-ideas (label-uncertainty sampling, RD-normalized error metrics, factorized temporal modeling) transfer.

## 10. GSE overlap
Per `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`: GSE's corpus already inventories Elo, Glicko (mentioned), TrueSkill (mentioned), Bradley-Terry, Plackett-Luce, Dixon-Coles as team-rating machinery, and ledger 0004 is a Bradley-Terry/Elo unification paper — so pairwise-rating machinery is covered ground. What is **new** here: (a) the **MAZ metric** — prediction error normalized by per-sample label uncertainty (RD), which GSE's calibration stack (ECE, grouping loss, CQR) does not currently use for *rating* labels; (b) **uncertainty-aware target sampling** — training with targets drawn from N(μ_i, φ_i²) per-sample as augmentation/regularization, which is not in Garrett's augmentation playbook. Verdict: **extension** — no direct duplicate; the transferable components (label-noise-aware training, uncertainty-normalized metrics) extend the calibration/uncertainty lane.

## 11. GSE implementation spec
Two concrete port candidates, both cheap:
1. **Uncertainty-aware target sampling for spread/total regression models.** GSE's margin model trains on final scores / spreads; early-season labels (few games, noisy ratings) have high effective uncertainty vs. late-season labels. Port: replace point targets with per-sample noise injection scaled by estimated label uncertainty (e.g., rating RD from GSE's dynamic Elo/nested-AR(1) state-space model, or simply σ ∝ 1/√n_games), clipping at ±3σ. Data: nflverse play-by-play 1999–2025 (already in-repo). Effort: ~1 day (training-loop change + one experiment), risk low.
2. **MAZ-style evaluation for probability/rating outputs.** Report calibration error normalized by per-game label uncertainty (e.g., binomial √p(1−p) or rating RD), alongside ECE, on the existing calibration stack (grouping loss 2210.16315 already in-repo). Effort: ~2 hours as a dashboard metric in the calibration lane.
- The transformer architecture itself (Smolgen chess-topology attention) is NOT portable to NFL data — reject that component.

## 12. Reproducible test
- **Dataset:** nflverse 2015–2024 regular-season games, point-spread outcome (favorite margin vs spread) as regression target; label uncertainty per game = GSE dynamic-Elo RD (or, if unavailable, rolling σ of the last 8 games' ATS margins).
- **Baseline:** GSE's existing ridge/OLS margin model trained on point targets.
- **Metric:** test MAE on held-out 2023–2024 seasons, plus a MAZ analogue: mean |error|/σ_i per game.
- **Experiment:** retrain with targets sampled y_i ∼ N(margin_i, σ_i²) (clip ±3σ), 5 seeds; compare to point-target baseline on identical splits.

## 13. Acceptance / rejection gate
- **Adopt** if any of: (a) sampled-target model reduces held-out MAE on 2023–2024 by ≥ 0.15 points vs the identical point-target baseline (averaged over 5 seeds), or (b) the MAZ analogue improves ≥ 3% relative while MAE does not worsen. **Reject otherwise.** Test window fixed before running: train 2015–2021, validate 2022, test 2023–2024. No peeking — gate stated before the run.

## 14. Improvement experiment
Extend the paper's fixed Gaussian sampling to a **two-component label-noise model**: y_i ∼ mixture of N(μ_i, φ_i²) and a heavy-tailed component for known noisy regimes (e.g., backup-QB games, extreme weather), with the mixture weight a function of game metadata (roster flags, wind). The paper clips at ±3φ to kill outliers; instead, model the outliers explicitly — this should beat naive clipping on the subset of games where the "noise" is actually signal about regime change. Evaluate the same gate as §13 plus a per-slice (weather/roster-flag) MAZ improvement ≥ 5%.
