# [0386] IMUDiffusion: A Diffusion Model for Multivariate Time Series Synthetisation for Inertial Motion Capturing Systems (arXiv:2411.02954)

**Citation:** Heiko Oppel, Michael Munz (2024). *IMUDiffusion: A Diffusion Model for Multivariate Time Series Synthetisation for Inertial Motion Capturing Systems*. arXiv:2411.02954. URL: https://arxiv.org/abs/2411.02954
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1275 lines).
**Verdict:** REJECT — a wearable-IMU human-activity-recognition paper (DDPM adapted to synthesize accelerometer/gyroscope time series). GSE has no IMU/wearable data in its stack (NGS = RFID position chips), so the demonstrated result doesn't transfer; the underlying technique (diffusion-based minority-class augmentation) is noted but unproven outside 4-class wearable HAR.

## 1. Research question
Can a diffusion model adapted from image DDPMs synthesize realistic multivariate IMU time series (accelerometer + gyroscope) to fix the two classic HAR problems — minority-class underrepresentation and confusable classes — and thereby improve a downstream activity classifier trained on scarce labeled data? IMUDiffusion: STFT-transformed IMU sequences fed to a Ho-et-al.-style DDPM with per-sensor-type noise schedulers; synthetic data lifts the classifier to macro F1 = 1.0 on 8/12 held-out participants, with the abstract claiming "almost 30%" macro F1 improvement in some cases.

## 2. Dataset / schema
- **Banos et al. benchmark** (sensor-displacement HAR): 33 activities, 17 participants, 9 Movella IMUs; authors use the ideal-placement setup, reduced to a **single IMU on the right thigh**, and 4 classes: **Walking, Running, Jump Up** (minority class), **Cycling**. 12 participants retained (PIDs 1,2,3,5,8,9,10,11,12,13,14,16); others dropped for missing Cycling.
- 50 Hz sampling; sequences of 160 timesteps, shift 40 (120-step overlap). Recording durations (Table 1): Walking 72.55±16.42 s; Running 52.59±5.03 s; Jump Up 11.12±0.91 s (20 jumps each); Cycling 69.57±15.66 s. Per-axis standardization.
- **Signal transform (§2.2.3):** STFT with Hanning window (length 22, overlap 20) → 12 frequency bins × 80 time steps × 12 channels (6 IMU axes × real/imaginary).

## 3. Method / model
- **IMUDiffusion (§2.3):** DDPM (Ho et al. 2020) adapted from images: 3 blocks (Down/Mid/Up), each = 2 ResNet + 2 multi-head self-attention in serial with skip connections; base channels 32; single dimension reduction **along time only**; kernels convolve across time only; sinusoidal time embedding (Eq. 1, t_dim = 128).
- **Forward process:** T = **3000** steps (vs. 1000 in Ho — needed for smooth noise→motion transition); **separate linear schedulers per sensor type**: β_Acc = 9e−4, β_Gyro = 6e−4 (Eq. 2).
- **Training:** 4500 epochs, Adam lr = 4e−4, smooth-L1 loss (β_L1 = 1.0). Cost: ~8 min training per class/participant + 3 min per 128 synthesized sequences on RTX 3090; **78.4 compute hours total**; 3840 synthetic sequences generated per class per LOSOCV step.
- **Downstream classifier (§2.4):** CNN — 3 conv layers (5×1 kernels, time only), MaxPool after 2nd conv, 3 linear layers, dropout 0.3, L2 λ = 1e−4; 4-class (Walking/Running/Jump Up/Cycling).
- **Evaluation:** LOSOCV (train on 11 participants, test on the 12th); synthetic quality also assessed via UMAP and kMeans+DTW with DTW barycenter averaging (k = 20 clusters).

## 4. Equations & assumptions
- (1) `TE_t = [sin(t/10000^{i/t_dim}), cos(t/10000^{i/t_dim})], i ∈ [0, t_dim]` — sinusoidal diffusion-step embedding.
- (2) `x_{k,t} = √(1−β_{k,t}) x_{k,t−1} + √(β_{k,t}) ε, ε ~ N(0,I), t ∈ {N | 0 < t < 3000}, k ∈ {Acc, Gyro}` — per-sensor-type forward diffusion.

Assumptions: (a) STFT representation preserves the movement characteristics the classifier needs (phase information kept via real/imag channels); (b) separate β per sensor type is sufficient to handle accelerometer/gyroscope scale differences (no per-axis scheduling); (c) LOSOCV participant-independence holds despite identical lab protocol; (d) synthetic sequences inherit the training participants' movement styles — the PID 1 failure (see §9) shows this breaks when the test participant moves idiosyncratically.

## 5. Features / target
Input features: standardized 6-axis IMU (3D accel + 3D gyro) from a thigh-mounted sensor, STFT-transformed to 12×80×12 tensors. Target (generator): realistic synthetic sequences per activity class. Target (classifier): 4-class activity label. Horizon: N/A (sequence classification, not forecasting).

## 6. Validation design
LOSOCV over 12 participants. Three classifier conditions: **2 Sample** (only the 88 real sequences the diffusion model saw), **Full-Set** (80% of ~2600–2700 available real sequences), **2 Sample Full Synth** (2 Sample + all 3840/class synthetic sequences); all tested on real hold-out sequences only. Synthetic-dose sweep: 1%→100% of synthetic data in 1% steps (Figure 9). Quality analysis: UMAP + kMeans/DTW/DBA visual comparison. No external generative baseline (no GAN/VAE comparison run — discussed in §1 only).

## 7. Numerical results / baselines
Quoted exactly:

- **2 Sample Full Synth:** macro F1 = **1.0** on 8/12 participants; exceptions PIDs 1, 3, 12, 13. **PID 1 dropped below 0.6** — the only participant where synthetic data *hurt* (Cycling sequences all misclassified as Jump Up).
- **Full-Set baseline:** 1.0 on 6/12 participants; remainder 0.7–<1.0; worst on PID 16 (which synth lifted to 1.0, as also for PIDs 2, 5, 9 — all beating Full-Set).
- **Class-level:** with the 2 Sample baseline, Running↔Walking were confused in every participant (Running→Walking in all 12; Walking→Running in 9/12); with synth, confusion in only 1 participant. **Minority class (Jump Up): zero misclassifications** with synth (still misclassified under both baselines).
- **Conclusion's headline:** "Except for one participant, we were able to improve the score value by at least **11 ppt**"; abstract: "almost **30%**" macro F1 improvement in some cases.
- **Dose response (Figure 9):** test scores fluctuate ±0.3 with <1500 synthetic sequences/class (PID 14); fluctuations shrink to ≤0.15 as dose increases, but 15–20% drops persist for some participants even at full dose.

## 8. Code / data availability
None stated in this extract (no repository URL). Banos et al. dataset is a public benchmark; the paper's sequencing/STFT pipeline and hyperparameters are fully documented.

## 9. Leakage & limitations
- **PID 1 failure is the honest headline:** synthetic data *degraded* one participant below 0.6 because the diffusion model couldn't capture that participant's idiosyncratic Cycling style (cluster analysis, Figure 8) — synthetic augmentation can bake in training-distribution bias and hurt exactly the atypical cases where you most want robustness.
- **No GAN/VAE baseline** despite §1 framing diffusion as the fix for their mode-collapse — the comparison is asserted, not run.
- **Tiny effective training set:** 22 sequences/class/participant for the diffusion model; 78.4 GPU-hours for a 4-class toy problem — the compute-to-data ratio is extreme.
- **Lab protocol:** treadmill-like repetitive 1-minute recordings, single IMU, ideal placement — far from in-the-wild movement.
- **UMAP check is weak:** synthetic sequences formed 2 tight clusters while real sequences spread broadly (Figure 3a) — visually suggesting *less* diversity than real data, the opposite of the claimed variability gain.
- **External validity to NFL/GSE:** GSE has **no IMU or wearable data** — NGS is RFID position tracking. Nothing in GSE's stack consumes accelerometer/gyroscope time series. The minority-class-augmentation *technique* could in principle apply to GSE classifiers with rare-event imbalance, but GSE's imbalance problems are on structured/tabular data where the paper gives no evidence, and the PID 1 failure is a direct warning about synthetic-data bias on atypical cases (injuries, by definition, are atypical).

## 10. GSE overlap
Read `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. Relevant: (a) **2026-09-21 existing-research-map — diffusion trajectory modeling already absorbed** — the diffusion machinery here adds nothing new to that; (b) **NGS 27-family taxonomy** — GSE's sensor data is positional (RFID chips at 10 Hz), not inertial; no repo work touches IMU/wearable signals; (c) no biomechanics or HAR lane exists. Status: **no overlap and no data modality match** — the paper's inputs don't exist in GSE's stack.

## 11. GSE implementation spec
No build recommended (REJECT). If GSE ever acquires wearable/IMU data (it has none today), the transferable recipe would be: per-sensor-type diffusion schedulers + STFT representation + LOSOCV-style subject-holdout validation, with the PID-1 lesson as a mandatory atypical-subject stress test. Not actionable now.

## 12. Reproducible test
Not applicable — REJECT. There is no GSE classifier on IMU data whose minority-class performance this could change.

## 13. Acceptance / rejection gate
**Reject** — pre-registered data-modality gate: adopt only if GSE acquires wearable/IMU time series with a labeled minority-class problem (no such data exists in the stack). The technique note (diffusion augmentation for class imbalance, with the PID-1 bias warning) is preserved in §11 without adopting the paper.

## 14. Improvement experiment
For the HAR community: **atypical-subject stress test as the primary metric.** The paper's real finding is the PID 1 failure — synthetic data hurting the most idiosyncratic subject. The experiment: deliberately hold out the most movement-atypical participants (ranked by DTW distance to the population barycenter), and report synth-augmented classifier performance as a function of test-subject atypicality, comparing diffusion vs. simple augmentation (time-warping, jitter). Hypothesis: diffusion augmentation helps typical subjects but its advantage over cheap augmentation vanishes or reverses on atypical ones — which would reframe when generative augmentation is actually worth 78 GPU-hours.
