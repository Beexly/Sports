# [0205] Heteroscedastic Diffusion for Multi-Agent Trajectory Modeling (arXiv:2605.10717v1)

**Citation:** Capellera, G., Rubio, A., Ferraz, L., & Agudo, A. (2026). *Heteroscedastic Diffusion for Multi-Agent Trajectory Modeling*. arXiv:2605.10717v1 (accepted to IEEE TPAMI; extended version of arXiv:2503.18589, CVPR 2025). URL: https://arxiv.org/abs/2605.10717
**Ledger completed:** 2026-09-21. **Read:** full text (arxiv.org HTML, 1,238 lines).
**Verdict:** ADAPT — adopt only the delta over the CVPR 2025 U2Diff base GSE already absorbed (2503.18589): the bi-variate NLL uncertainty loss, Reverse Gaussian Sampling with Taylor variance propagation, and the RankNN mode-ranking network, evaluated on NFL Football-U data; do not re-derive the base diffusion-forecasting framework.

## 1. Research question
How to extend diffusion-based multi-agent trajectory modeling (trajectory completion: forecasting, imputation, and inferring fully unobserved agents) so that every predicted state carries a calibrated state-wise heteroscedastic uncertainty estimate, and so that the K independently sampled scene modes can be ranked by estimated error probability under the same prior observations? The new U2Diffine framework learns the noise distribution (mean + 2×2 covariance) in the reverse diffusion step, propagates latent uncertainty to output space via a first-order Taylor approximation, and trains a supervised RankNN to output per-mode error probabilities.

## 2. Dataset / schema
- **Basketball-U** [35]: derived from NBA data [20]; 93,490 training / 11,543 testing sequences; each 50 frames (8s), (x,y) for 10 players + ball. Five masking strategies (forecast futures, impute in-between states, infer >5 unobserved agents).
- **Football-U** [35]: NFL Big Data Bowl (https://github.com/nfl-football-ops/Big-Data-Bowl); 10,762 train / 2,624 test sequences; 50 frames, (x,y) for 22 players + ball. **This is NFL tracking data — directly on-domain for GSE.**
- **Soccer-U** [35]: SoccerTrack (https://github.com/AtomScott/SportsLabKit); 9,882 train / 2,448 test sequences; 50 frames, (x,y) for 22 players + ball.
- **NBA SportVU forecasting** [74]: same splits and normalization as LED [25]; 30 frames (6s), (x,y) for 10 players + ball; task = observe first 2s (10 frames), forecast next 4s (20 frames).
- Note units differ per dataset (Feet / Yards / Pixels / Meters), so completion errors are not cross-dataset comparable.

## 3. Method / model
- Base (from 2503.18589, U2Diff): CSDI-inspired conditional diffusion for trajectory completion with binary conditioning mask M (T×N; 1 = visible, 0 = unobserved); unobserved states are zero-filled in X^co; denoiser conditioned on (X_s, s, X^co).
- **U2Diffine (new):** denoiser predicts a bi-variate Gaussian over the noise per agent per frame: mean ε^μ_θ (T×N×2) and covariance ε^Σ_θ (T×N×2×2), parameterized by 5 channels (2 means + 2 stds via Sigmoid → (0,1) + 1 correlation via Tanh → (−1,1), i.e., Cholesky factors). Architecture: X_s and X^co concatenated → T×N×4 → linear+ReLU to 256 dims; denoising step s embedded to 128 (linear+SiLU); learnable 64-dim per-agent embedding concatenated with mask M; two residual denoising blocks each with a Social-temporal Block (bidirectional Temporal Mamba, hidden 256, summed forward/reverse; Social Transformer encoder, FFN 1024, 8 heads) and a Gate-Filter Block; skip outputs J_skip summed and projected to T×N×5.
- **Reverse Gaussian Sampling:** sampling via DDIM with skip interval ζ̄=10 → S=50 steps reduce to 6 denoising steps D=[50,40,30,20,10,1]; per-state latent X_s ~ N(X_s, Var(X_s)); mean propagated via Eq. (16); variance propagated via Eq. (20) with the per-state 2×2 Jacobian J_s of the denoiser's mean — in practice J_s is approximated by its **diagonal** for positive-definiteness (full Jacobian caused ill-conditioning/non-PSD estimates in rare states; singular values clamped to [−100,100]).
- **U2Diff (fast variant, from CVPR 2025 work, retained as baseline):** J_s := 0 (no gradient computation), uni-variate noise model (correlation term = 0); to avoid variance inflation, uncertainty propagation is delayed until intermediate step ŝ=30 < S=50 (for U2Diffine, ŝ=S, no delay). Inference ~4× faster (e.g., 14ms vs 59ms per mode on Football-U, RTX A6000, batch of 128 × 20 modes).
- **RankNN (post-processing):** input per scene = K×T×N×5 (predicted mean X_0, square roots of Var(X_0) eigenvalues, mask M repeated K times) → 64-dim embedding → Social-temporal Block (Temporal Mamba across K×N, Social Transformer across K×T) → average over T,N → K×64 scene embeddings → Multi-scene Transformer (permutation-equivariant, no positional encoding along mode dim K) → linear+ReLU → softmax over K → error probabilities {e^1,…,e^K} summing to 1. Trained (K=20 online modes, 20 epochs, batch 32, lr 1e−3, frozen U2Diff weights; U2Diffine variant fine-tuned 5 epochs) to maximize the differentiable Spearman ρ between e and SADE (Eq. 22).
- Training hyperparams: S=50 diffusion steps, 100 epochs, λ=0.01, batch 64 (Basketball-U) / 16 (others), lr 1e−3 halved every 20 epochs, β_0=1e−4 → β_S=0.5 quadratic schedule, stop-gradient on the noise mean in L_NLL.

## 4. Equations & assumptions
Paper's own equations (quoted from text):

(1) q(X_s|X_{s-1}) = N(X_s; √(1−β_s)·X_{s-1}, β_s·I) — forward transition.
(2) q(X_{1:S}|X_0) = Π_s q(X_s|X_{s-1}).
(3) q(X_s|X_0) = N(X_s; √α̂_s·X_0, (1−α̂_s)·I), α̂_s = Π_i≤s (1−β_i).
(4) X_s = √α̂_s·X_0 + √(1−α̂_s)·ε_s, ε_s ~ N(0,I).
(5) p_θ(X_{s-1}|X_s) = N(X_{s-1}; μ_θ(X_s,s), σ_θ(X_s,s)^2·I).
(6) p_θ(X_{0:S}) = p(X_S)·Π_s p_θ(X_{s-1}|X_s).
(7) μ_θ(X_s,s) = (1/√α_s)·(X_s − (β_s/√(1−α̂_s))·ε_θ(X_s,s)).
(8) L_simple = E_{X_0,ε,s} ‖ε_s − ε_θ(X_s)‖²_2.
(9) X = f(X^co, M) — completion from partial observations with T×N binary mask M.
(10) p(X|X^co,M) = N(X; f^μ(X^co,M), f^Σ(X^co,M)).
(11) p(X^k|X^co,M), ∀k ∈ {1,…,K} — K generated modes.
(12) N(ε_s; ε^μ_θ(X_s), ε^Σ_θ(X_s)) — bi-variate Gaussian over reverse noise; ε^Σ_θ is 2×2 SPD.
(13) L_NLL = (1/2)·E[log(2π|ε^Σ_θ|^{1/2}) + (1/2)·ω^T (ε^Σ_θ)^{−1} ω], ω = ε_s − ε^μ_θ. Note: the paper's displayed form is unusual (½ factors); quoted exactly as rendered.
(14) L_total = L_simple + λ·L_NLL, λ ≈ 0.01; stop-gradient on ε^μ_θ.
(15) DDIM skip step: X_{s−ζ} = a_s·X_s + b_s·ε_θ(X_s), a_s = √(α̂_{s−ζ}/α̂_s), b_s = (γ_{s−ζ} − √(α̂_{s−ζ}/α̂_s)·γ_s), γ_s = √(1−α̂_s); a_s > 1, b_s < 0.
(16) E[X_{s−ζ}] ≈ a_s·X_s + b_s·ε^μ_θ(X_s) (first-order Taylor).
(17–19) Variance and cross-covariance decompositions via the law of total variance and linearization with J_s = ∇_X ε^μ_θ(X)|_{X_s}, J^Σ_s = ∇_X ε^Σ_θ(X)|_{X_s}.
(20) Var(X_{s−ζ}) ≈ (a_s·I + b_s·J_s)·Var(X_s)·(a_s·I + b_s·J_s)^T + b_s²·ε^Σ_θ(X_s).
(21) SADE = Σ_{n,t} ‖x̂^n_t − x^n_t‖_2·(1−m^n_t) / Σ_{n,t} (1−m^n_t).
(22) ρ = (1/K)·Σ_k ((R[e^k]−R̄[e])·(R[SADE^k]−R̄[SADE])) / (‖R[e^k]−R̄[e]‖·‖R[SADE^k]−R̄[SADE]‖) — differentiable Spearman via rank operator R.

Stated assumptions: unobserved entries are exactly zero-filled and the binary mask is given (masking strategy known at inference); reverse noise is Gaussian with diagonalizable (in practice diagonalized) Jacobian; the stop-gradient on the noise mean isolates variance learning; zero heteroscedastic uncertainty at the S-noise step (Var(X_S) := 0).

## 5. Features / target
- Inputs: per-agent (x,y) positions over T frames, binary visibility mask M (T×N), learnable agent embeddings, diffusion step s.
- Targets: full (x,y) trajectory tensor X; per-state covariance Var(X_0); per-mode error probability e^k.
- Completion tasks: forecast futures, impute in-between states, infer completely unobserved agents (>5). Forecasting task: 2s observe → 4s forecast on NBA.

## 6. Validation design
- Completion: three datasets with their fixed train/test splits from [35]; five masking strategies; metrics minADE20[35] (primary, per [35]) and minSADE20 (for UniTraj and own methods); K=20 modes; also minADE_K/minFDE_K agent-wise and minSADE_K/minSFDE_K scene-level, plus NLL, AccRate (Mahalanobis-based, % of ground-truth states inside the 95% ellipse), and Spearman ρ between AvgUcty/e and SADE.
- Forecasting: NBA SportVU, LED's splits/normalization; minADE20/minFDE20, minSADE20/minSFDE20, K=20; ranking experiments (Top-k from 20 modes with Random / AvgUcty / e).
- Baselines: Mean, Median, Linear Fit, LSTM [75], Transformer [57], MAT [20], Naomi [32], INAM [33], SSSD [56], GC-VRNN [26], UniTraj [35], MemoNet [76], NPSN [77], GroupNet [29], AutoBots [7], MID [31], LED [25], MART [52], MoFlow [51].
- Ablations: architecture (w/o Temporal Mamba, w/o Social Transformer, w/o NLL loss); Reverse Gaussian Sampling grid (uni/bi × J_s=0/diag/full); RankNN (w/o TM, w/o ST, w/o Multi-scene Transformer, w/o VAR).

## 7. Numerical results / baselines
Completion, Table I — minADE20[35]↓ (minSADE20↓ in parentheses):
| | Basketball-U (Feet) | Football-U (Yards) | Soccer-U (Pixels) |
| UniTraj [35] | 4.77 (4.29) | 3.55 (4.03) | 94.59 (100.48) |
| U2Diff | 4.65 (3.13) | 2.42 (2.35) | 53.93 (51.14) |
| U2Diffine | 4.59 (3.09) | 2.38 (2.35) | 52.89 (50.65) |
- Paper claims ~33% and ~44% minADE20 improvements over UniTraj on Football-U and Soccer-U; 27% minSADE20 improvement on Basketball-U. U2Diffine slightly beats U2Diff everywhere on displacement; its main gain is calibration.
- Note inference check: on Football-U, UniTraj→U2Diffine minADE20: (3.55−2.38)/3.55 ≈ 33%; Soccer-U: (94.59−52.89)/94.59 ≈ 44%. Basketball-U minSADE20: (4.29−3.09)/4.29 ≈ 28% (~27% as claimed).

Forecasting, Table II — NBA (Meters), minADE20/minFDE20; minSADE20/minSFDE20:
| MemoNet | 1.15 / 1.57 | — |
| NPSN | 1.25 / 1.47 | — |
| GroupNet | 0.94 / 1.22 | 2.12 / 3.72 |
| AutoBots | 1.19 / 1.55 | 1.75 / 2.73 |
| MID | 0.96 / 1.27 | — |
| LED | 0.81 / 1.10 | 1.63 / 2.99 |
| MART | 0.72 / 0.90 | 1.52 / 2.77 |
| MoFlow | 0.71 / 0.86 | 1.52 / 2.73 |
| U2Diff | 0.85 / 1.11 | 1.48 / 2.68 |
| U2Diffine | 0.84 / 1.11 | 1.47 / 2.65 |
- U2Diffine ranks 4th on agent-level but SOTA on scene-level (>3% better than LED/MART/MoFlow on scene metrics), despite i.i.d. sampling vs competitors' mode-covering strategies.

Architecture ablation, Table III (minSADE20): Basketball-U / Football-U / Soccer-U / NBA:
| w/o TM (CSDI) | 3.74 | 2.70 | 58.78 | 1.73 |
| w/o ST | 4.06 | 4.75 | 96.66 | 1.92 |
| w/o NLL | 3.10 | 2.37 | 51.27 | 1.50 |
| U2Diff | 3.13 | 2.35 | 51.14 | 1.48 |
| U2Diffine | 3.09 | 2.35 | 50.65 | 1.47 |

Reverse Gaussian ablation, Table IV (NLL↓ / AccRate↑% / ρ↑; parentheses = best over K=20 modes):
- Football-U: uni/J=0: −2.16 / 93.8 (95.5) / 0.28; uni/J diag: −3.22 / 95.0 (96.6) / 0.33; bi/J=0: −2.12 / 93.8 (95.5) / 0.30; bi/J full: −3.18 / 95.1 (96.7) / 0.35; **bi/J diag (U2Diffine): −3.22 / 95.1 (96.7) / 0.37**.
- Basketball-U U2Diffine: −2.00 (−2.62) / 87.9 (91.9) / 0.30. Soccer-U: −3.60 (−3.71) / 97.0 (98.3) / 0.38. NBA: −1.10 (−1.70) / 81.1 (87.7) / 0.29.
- Inference cost per mode (batch 128 × 20 modes): J=0: 8/14/14/6 ms vs J diag: 31/59/59/23 ms (×3.83–×4.21).

Uncertainty/error correlation, Table V — Spearman ρ mean/median (rank method vs SADE):
| | Basketball-U | Football-U | Soccer-U | NBA |
| U2Diff AvgUcty | 0.27/0.29 | 0.28/0.31 | 0.23/0.25 | 0.30/0.35 |
| U2Diff e (RankNN) | 0.56/0.63 | 0.59/0.65 | 0.72/0.78 | 0.51/0.58 |
| U2Diffine AvgUcty | 0.29/0.32 | 0.37/0.41 | 0.38/0.40 | 0.29/0.35 |
| U2Diffine e | 0.55/0.61 | 0.61/0.66 | 0.72/0.79 | 0.51/0.58 |
| AutoBots AvgUcty / e (NBA only) | — | — | — | 0.09/0.10 / 0.37/0.44 |
- Median error-probability correlation 0.58–0.79 across datasets (per paper's claim); best on Soccer-U (0.79).

Ranking impact, Table VI — NBA minSADE_k over Top-k of 20 modes:
| U2Diff Random | 2.01 | 1.75 | 1.66 | 1.56 | 1.48 |
| U2Diff AvgUcty | 1.91 | 1.71 | 1.63 | 1.55 | 1.48 |
| U2Diff e | 1.82 | 1.66 | 1.60 | 1.54 | 1.48 |
| U2Diffine Random | 2.01 | 1.74 | 1.65 | 1.55 | 1.47 |
| U2Diffine AvgUcty | 1.93 | 1.72 | 1.64 | 1.54 | 1.47 |
| U2Diffine e | 1.81 | 1.66 | 1.60 | 1.53 | 1.47 |
- RankNN e reduces NBA Top-1 error ~10% (2.01 → 1.81).

RankNN ablation, Table VII (mean ρ): Basketball-U / Football-U / Soccer-U / NBA:
| w/o TM w/o ST | 0.28 | 0.37 | 0.31 | 0.40 |
| w/o TM | 0.35 | 0.50 | 0.54 | 0.45 |
| w/o ST | 0.39 | 0.51 | 0.34 | 0.45 |
| w/o MST | 0.52 | 0.47 | 0.65 | 0.50 |
| w/o VAR | 0.54 | 0.56 | 0.55 | 0.50 |
| U2Diff | 0.56 | 0.59 | 0.72 | 0.51 |
| U2Diffine | 0.55 | 0.61 | 0.72 | 0.51 |

## 8. Code / data availability
None stated in the paper text — no code repository URL, no dataset links beyond named references ([35], Big Data Bowl GitHub org, SoccerTrack). Note the CVPR 2025 predecessor (2503.18589) may have released code; not confirmed here.

## 9. Leakage & limitations
- Masking strategy is known at inference — real tracking repairs won't have perfect masks; gap between the five synthetic masks and true occlusion patterns (camera cutaways, jersey occlusions) is untested.
- Zero-filling unobserved states introduces a distribution shift the Social Transformer must learn to ignore; no ablation on learned-mask embeddings vs zeros.
- NLL reported values are negative (densities >1 on concentrated Gaussians) — calibration claims rest on AccRate and ρ, which are more interpretable.
- i.i.d. sampling means no diversity control; mode-covering competitors beat it on agent-level metrics.
- Football-U is one season of Big Data Bowl data (10,762 train sequences) — NFL-specific, but a single competition corpus; generalization to NGS 10Hz data untested.
- U2Diffine's 4× sampling cost only pays in calibration (NLL/AccRate), not displacement error; displacement gains from the bi-variate model are marginal.
- Full Jacobian was unstable; the diagonal approximation is a heuristic, not a theorem — variance inflation is controlled but not proven absent.

## 10. GSE overlap
- The base U2Diff paper 2503.18589 is already deep-read and absorbed per the existing-research map ("diffusion trajectory modeling (2503.18589)" listed among absorbed standouts). This paper is explicitly its TPAMI extension.
- The delta vs. the absorbed base: (a) bi-variate NLL loss + Reverse Gaussian Sampling with first-order Taylor variance propagation; (b) RankNN supervised mode ranking; (c) completion-task framing and Football-U NFL evaluation; (d) Social-temporal Block (Mamba) architecture. Of these, (a)–(c) are genuine extensions; (d) partially overlaps the absorbed base.
- GSE's tracking taxonomy (NGS families) is inventoried but there is no uncertainty-calibrated generative trajectory model with error-ranked modes in GSE's stack. The paper's Football-U results show the base architecture already works on NFL tracking; what GSE lacks is the calibration + ranking layer. Treat as extension of an absorbed paper: implement only the new components.

## 11. GSE implementation spec
- Data: nflverse / NGS tracking (10 Hz, x/y per player), Football-U-style masking (forecast next 4s from 2s, impute occluded frames, infer unobserved defenders on cut-off broadcast feeds).
- Model: port U2Diffine architecture as specified in Sec. V-B (Mamba 256 + Social Transformer 8 heads/FFN 1024, 2 blocks, T×N×5 output head) OR apply the cheaper retrofit: add the L_NLL head (Eq. 13–14, λ=0.01, stop-grad on mean) and diagonal-Jacobian Reverse Gaussian Sampling (Eq. 20) onto GSE's existing diffusion forecaster; ship U2Diff (J=0, ŝ=30) for live inference.
- RankNN: K=20 modes, same Social-temporal backbone, trained to maximize differentiable Spearman ρ vs SADE on held-out games; use e-ranked Top-1 mode for all public-facing "expected path" graphics and feed e into stake-sizing/edge confidence.
- Serving: offline batch repair of tracking (completion) can afford U2Diffine (4× cost); live in-game forecasting uses U2Diff (14ms/mode).
- Effort: ~3–4 engineering weeks for the L_NLL + variance-propagation retrofit; ~2 weeks for RankNN training/serving.

## 12. Reproducible test
- Dataset: nflverse Big Data Bowl 2026 tracking (or current NGS), 2s observe / 4s forecast, Football-U-style masks.
- Metric: minSADE20 and AccRate@95% as in Tables I/IV; Spearman ρ between e and SADE as in Table V.
- Baselines to beat: the absorbed U2Diff base (displacement parity expected), and UniTraj-equivalent on completion (minADE20↓) — plus a RankNN-ablation comparison: e-ranked Top-1 vs random Top-1 on minSADE.
- Time window: one full NFL season, train on weeks 1–13, validate 14–15, test 16–18 (no games shared).

## 13. Acceptance / rejection gate
ADOPT the U2Diffine/RankNN delta if ALL of the following hold on the held-out test: (i) AccRate@95% ≥ 90% on football tracking (paper: 95.1% Football-U); (ii) median Spearman ρ between e and SADE ≥ 0.50 (paper: 0.66 Football-U); (iii) e-ranked Top-1 minSADE20 beats random Top-1 by ≥8% (paper: 2.01 → 1.81, ~10%); (iv) U2Diff sampling cost ≤ 20ms/mode at K=20 on available GPU. REJECT if any fail — in particular, if RankNN's ρ ≤ AvgUcty's ρ, the supervised ranker adds nothing and the unsupervised variance-only path suffices.

## 14. Improvement experiment
Beyond the paper: train RankNN's objective jointly with a calibration loss on AccRate (coverage) rather than pure ranking correlation — ranking tells you which mode is best, but a mode can be best-of-K yet still badly miscalibrated in absolute terms. A RankNN that outputs (e^k, calibrated per-state ellipses) optimized for AccRate = 95% coverage + high ρ would give GSE both a pick (Top-1 mode) and a position size (inverse coverage-weighted), which is what a betting engine actually needs. Test whether coverage-regularized RankNN improves a downstream expected-value wagering simulation vs. pure-ρ RankNN.
