# [2071] TTS-GAN: Transformer-based Time-Series GAN (arXiv:2202.02691)

**Citation:** Xiaomin Li, Vangelis Metsis, Huangyingrui Wang, Anne Hee Hiong Ngu (Texas State University, 2022). *TTS-GAN: A Transformer-based Time-Series Generative Adversarial Network*. arXiv:2202.02691. URL: https://arxiv.org/abs/2202.02691. Code: https://github.com/imics-lab/tts-gan.
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, 2202.02691, §§1–5 + Appendices 0.A–0.B; architecture, losses, Table 1, training details verified).
**Verdict:** ADAPT — the fast GAN counterpart to TimeGrad (2070): pure-transformer GAN for fixed-length multivariate sequence synthesis, with per-class training demonstrated and reusable feature-based fidelity metrics (avg cosine similarity, avg JS distance). Diffusion (TimeGrad) is stronger but 100× costlier to sample; TTS-GAN is the cheap unconditional trajectory generator for bulk augmentation. Its missing piece — a downstream train-synthetic-test-real utility test — is exactly what the NFL bridge must add before trusting it.

## 1. Research question
Can a *pure transformer* GAN (no RNN anywhere) generate realistic multivariate time-series, given that RNN-based time-series GANs struggle with long sequences and irregular temporal relations? Follow-on: does the transformer-GAN beat Time-GAN (Yoon et al. 2019), the best existing alternative, on both visual and quantitative fidelity?

## 2. Dataset / schema
Three datasets: (1) simulated sinusoids — 10,000 samples, 24 timesteps, 5 dims, x_i(t)=sin(At+B) with A,B∈(0,0.1); (2) UniMiB SHAR human activity — Jumping (600) and Running (1,572) samples, 150 timesteps × 3 accelerometer channels, channel-wise normalized (mean 0, var 1); (3) PTB Diagnostic ECG — normal (4,046) and abnormal (10,506) heartbeats at 125 Hz, original length 188 zero-padded, only timesteps 5–55 used (the informative region). NFL translation: a "sample" = one team's fixed-length weekly stat trajectory (18 weeks × K metrics) or a fixed-window drive sequence; "class" = matchup regime (home favorite, divisional, dome, etc.).

## 3. Method / model
Both generator and discriminator are pure transformer encoders (3 encoder blocks each: multi-head self-attention + feed-forward MLP with GELU, pre-norm, dropout, residual connections — the standard Vaswani block). Time series is treated like a ViT image: input shape (BatchSize, C, 1, W) where C = channels (image RGB), W = timesteps (image width), height fixed at 1 (§3.2); the W axis is split into W/N patches with learned soft positional encoding appended ((BatchSize, C, 1, (W/N)+1) into the discriminator). Generator: noise z∈ℝ^100, z_i∼U(0,1) → mapped to a (M embedding dims, 1, timesteps) sequence → patches + positional encoding → 3 transformer blocks → Conv2D 1×1 projecting to real data dims (C, 1, W). Training is LSGAN-style (§3.3, Appendix 0.A): MSE losses d_real_loss = MSE(D(real),1), d_fake_loss = MSE(D(G(z)),0), g_loss = MSE(D(G(z)),1); soft labels and label flipping as stabilization heuristics; Adam (β1=0.9, β2=0.999), lr_G=1e−4, lr_D=3e−4, batch 32; 2× Nvidia 1080.

## 4. Equations & assumptions
d_loss = MSE(D(real), real_label) + MSE(D(G(z)), fake_label); g_loss = MSE(D(G(z)), real_label), with real_label≈1, fake_label≈0 (soft, occasionally flipped). Fidelity metrics (Appendix 0.B): 7 signal features per channel (median, mean, std, variance, RMS, max, min) → feature vector f; avg_cos_sim = (1/n)Σ cos_sim(f_real, f_synth) (higher better); avg_jen_dis = Σ_i √[(D(f_i,real‖m) + D(f_i,syn‖m))/2], m = pointwise mean (lower better). Assumptions: (1) fixed-length sequences (18-week NFL seasons fit; variable-length drive sequences need padding like the ECG data); (2) separate GAN per class (they train Jumping/Running/Normal/Abnormal separately — no class conditioning inside one model); (3) MSE/LSGAN objective suffices — no Wasserstein or spectral-norm machinery; (4) fidelity = feature-distribution match, not downstream utility (no TSTR test — the paper's biggest gap).

## 5. Features / target
Targets are raw multivariate sequences. NFL features: per-week team vectors (EPA/play, success rate, explosive rate, pressure rate allowed/generated, pace) across 18 weeks; class label = regime (rest edge, divisional, indoor, altitude, short week). The paper's per-class training maps to training one generator per regime — or better, extending the architecture with a class embedding (the paper doesn't, so this is an adaptation).

## 6. Validation design
Qualitative: raw-signal plots (Fig. 3), PCA + t-SNE of real (red) vs synthetic (blue) distributions (Fig. 4). Quantitative (Table 1): avg_cos_sim and avg_jen_dis on the 7-feature vectors vs Time-GAN baseline, 5 classes × 2 metrics = 10 comparisons. No downstream predictive-utility test, no held-out generalization of the generator itself, no ablation of depth/lr/patch size reported.

## 7. Numerical results / baselines
Table 1 — TTS-GAN avg_cos_sim: sinusoid 0.9936, Jumping 0.9982, Running 0.9988, Normal ECG 0.9855, Abnormal ECG 0.9768; avg_jen_dis: 0.0980, 0.0870, 0.0497, 0.1861, 0.2911. TTS-GAN beats Time-GAN in 7/10 comparisons (loses Running cos_sim 0.9988 vs 0.9989, Running jen_dis 0.0497 vs 0.0470, Normal ECG cos_sim 0.9855 vs 0.9878). Margins are small — this is parity-with-a-slight-edge, not dominance. Honest read: transformer-GAN matches the RNN state of the art with a simpler architecture and no vanishing-gradient issues on long sequences; the "arbitrary length" claim in the abstract is only weakly tested (max 150 timesteps).

## 8. Code / data availability
Code: github.com/imics-lab/tts-gan (linked in abstract). Data: UniMiB SHAR, PTB ECG public; sinusoids are synthetic. Reproducibility of the NFL port is good — simple architecture, standard components.

## 9. Leakage & limitations
Adversarial notes: (1) No TSTR (train-synthetic-test-real) utility test — fidelity scores alone don't prove the synthetic data helps a downstream model; the NFL bridge must supply this. (2) Separate-model-per-class is expensive and loses cross-regime sharing; add class conditioning instead. (3) Max tested length 150 timesteps — an 18-week season is fine, but full-game play sequences (~150 plays) are at the edge of what's validated. (4) GAN training instability is real despite LSGAN: no convergence diagnostics reported; budget for mode-collapse checks (the JS-distance metric catches it — reuse it). (5) Small margins over Time-GAN mean the architecture choice matters less than the training/eval protocol. (6) Zero-padded ECG handling suggests padding works, but masked attention isn't discussed — use explicit padding masks in the NFL port.

## 10. GSE overlap
Checked /home/hatch/workspace/arxiv-sweep/existing-research-map.md: no overlap. Within-lane: TTS-GAN is the GAN pole opposite TimeGrad's diffusion pole (2070) for *sequential* synthesis; the tabular ledgers (2062–2069) are all i.i.d. row generators. Portability: the paper's 7-feature fidelity protocol (cosine sim + JS distance) is directly reusable as a cheap acceptance check for any sequential generator in this lane, including TimeGrad trajectories.

## 11. GSE implementation spec
Build plan (effort: ~4 engineer-days; reuses the 2070 data panel):
1. Data: same 32-team × 18-week × K-metric panel as 2070 (nflverse 2015–2024), channel-wise normalized (paper's HAR preprocessing).
2. Class structure: replace separate-per-class training with a regime class-embedding concatenated to the noise vector and to discriminator patches (conditional TTS-GAN): classes = {home favorite, home dog, divisional, dome, altitude, short-week}.
3. Architecture: 3-block transformer encoder G and D (paper spec), sequence (BatchSize, K, 1, 18), patch size 2 or 3 weeks, learned positional encoding; Conv2D 1×1 output head; padding mask for bye weeks if included.
4. Training: LSGAN losses, lr_G=1e−4 / lr_D=3e−4, batch 32, latent 100 — then a small lr/patch-size sweep the paper didn't do.
5. Generation: 500+ synthetic 18-week trajectories per regime class; combine with 2070's TimeGrad samples as a two-pole ensemble (diffusion for fidelity, GAN for volume).

## 12. Reproducible test
Dataset: nflverse 2015–2022 train, 2023–2024 held-out (season-level splits). Baseline: Time-GAN trained on the same panel. Challenger: conditional TTS-GAN. Metrics: (a) the paper's own avg_cos_sim (≥0.98) and avg_jen_dis on the 7-feature vectors, TTS-GAN vs Time-GAN; (b) the paper's missing test — TSTR: train the engine's week-ahead spread classifier on synthetic-only trajectories, test on real 2023–2024, require ≥90% of real-trained AUC (utility proof); (c) downstream: real+synthetic vs real-only log-loss on held-out weeks (the lane's standard gate).

## 13. Acceptance / rejection gate
ADOPT conditional-TTS-GAN for bulk trajectory augmentation if: (a) it matches or beats Time-GAN on ≥7/10 of the paper's fidelity comparisons on NFL data (the paper's own bar), AND (b) TSTR AUC ≥ 90% of real-trained AUC on held-out seasons (utility, which the paper never tested), AND (c) real+synthetic spread log-loss beats real-only by ≥0.003 on held-out weeks, AND (d) generation throughput ≥100 trajectories/second on a single GPU (the speed justification vs TimeGrad). REJECT if mode collapse appears (avg_jen_dis worse than Time-GAN by >20%, or TSTR AUC < 85% of real-trained) — GAN instability is the known failure mode, and the gate must catch it rather than assume it away. Gate set before running.

## 14. Improvement experiment
Regime-conditional single model + TSTR-driven early stopping: the paper trains one GAN per class and stops on fixed epochs. Experiment: (1) single conditional generator with regime embedding vs the paper's per-class models — expect the shared model to win on rare regimes (short-week, altitude) via cross-regime transfer; (2) replace epoch-based stopping with stopping on the TSTR proxy (a small probe classifier trained on synthetic, validated on real) — select the checkpoint that maximizes downstream utility rather than discriminator equilibrium. If the probe-selected checkpoint beats the final-epoch checkpoint on held-out log-loss by ≥0.002, adopt utility-stopped training as the lane standard for all GAN generators.

**Verdict:** ADAPT
