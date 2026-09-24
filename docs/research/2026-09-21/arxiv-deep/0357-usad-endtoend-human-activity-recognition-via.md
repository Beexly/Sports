# [0357] USAD: End-to-End Human Activity Recognition via Diffusion Model with Spatiotemporal Attention (arXiv:2507.02827v2)

**Citation:** Hang Xiao, Ying Yu, Jiarui Li, Zhifan Yang, Haotian Tang, Hanyu Liu, Chao Li (2025). *USAD: End-to-End Human Activity Recognition via Diffusion Model with Spatiotemporal Attention*. arXiv:2507.02827v2. URL: https://arxiv.org/abs/2507.02827
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 3131 lines incl. appendices).
**Verdict:** ADAPT — validated SOTA on three HAR benchmarks with full ablations; port the *statistics-guided conditional diffusion augmentation* and the *adaptive composite loss* (CE + focal + label smoothing with feedback weight updates) to GSE's rare-event classification problems. Do not port the full multi-branch network as-is.

## 1. Research question
Can human activity recognition under scarce labels and severe class imbalance be solved end-to-end by (a) unsupervised statistics-guided diffusion augmentation of minority classes, (b) a multi-branch spatiotemporal-attention network, and (c) an adaptive composite loss — while remaining deployable on embedded devices?

## 2. Dataset / schema
- **WISDM** [30]: 29 participants, 6 activities (walking, jogging, sitting, standing, upstairs, downstairs); 3 tri-axial wrist accelerometers; sliding window 90, batch 512, 50 epochs, lr 0.005. Mild imbalance.
- **PAMAP2** [31]: 9 subjects, 12 physical activities; accel + gyro + magnetometer on wrist/chest/ankle → 40 channels; window 171, batch 256, 70 epochs, lr 0.0005. Moderate imbalance.
- **OPPORTUNITY** [32]: 12 participants, naturalistic activities, 72 sensors of 17 types; window 30, batch 128, 80 epochs, lr 0.001. Severe imbalance.
- Data-enhancement experiments used the PAMAP2 3-axis acceleration subset (method inspired by [17]).

## 3. Method / model
Three stages + deployment:
1. **Unsupervised statistics-guided conditional diffusion augmentation:** extract global stats (μ, σ, skewness γ) and local Z-scores z_i per sequence → build 4L-dimensional conditioning vector f = [μ×L, σ×L, γ×L, z_1..z_L]; label-specific prototypes μ_y = E[f|y]; DDPM forward process with cosine noise schedule (s = 0.008); reverse denoising via generator G_θ(x_t, t, f, y) with Adaptive Group Normalization AdaGN(h,t,y) = γ_y(t)⊙(h−μ_h)/σ_h + β_y(t), (γ_y, β_y) from MLP(concat[e_y, ψ(t)]) with 128-d sinusoidal time embedding; training objective weighted MSE with importance weight w_t = √((1−ᾱ_t)/(ᾱ_t(1−ᾱ_{t−1}))). Then: pretrain classifier on class-balanced synthetic data D_syn, fine-tune on real data; risk gap bounded by O(Wasserstein(p_syn, p_real)).
2. **Multi-branch spatiotemporal interaction network:** ResNeSt-inspired cardinality (K) × radix (R) grouping; parallel residual branches with 3×3, 5×5, 7×7 kernels; channel-wise soft-attention split fusion (eq. 21); spatial attention (avg+max pooling → conv → M_s(F)); temporal/channel attention via per-group GAP + two FC layers; cross-branch fusion unit; residual connections; 1×1 convs unified into grouped convs, 3×1 conv for fusion.
3. **Adaptive composite loss:** Loss_total = ω_0·Loss_sl-nll + ω_1·Loss_fl + ω_2·Loss_ce (label-smoothing NLL + focal + cross-entropy). Weights updated each epoch by a feedback rule: ω_1 = 2 − τ − 1/(acc + 1e−8); ω_0 = ω_2 = 0.5(1 − ω_1) — if accuracy rises, the dominant weight relaxes and the others increase, and vice versa.
4. **Embedded deployment:** Raspberry Pi 5 (quad Cortex-A76 @ 2.4 GHz, 8 GB), PyTorch 2.2.2; latency budget = 5% of the segment's window length per inference.

## 4. Equations & assumptions
- Statistical features (eqs. 1–3): μ = (1/L)Σx_{0,i}; σ = √((1/L)Σ(x_{0,i}−μ)²); γ = (1/L)Σ((x_{0,i}−μ)/σ)³; z_i = (x_{0,i}−μ)/σ; f ∈ R^{4L}.
- Diffusion forward (eqs. 5–7): x_t = √ᾱ_t x_0 + √(1−ᾱ_t) ε; cosine schedule ᾱ_t = cos(π/2·(t/T+s)/(1+s))/cos(π/2·s/(1+s)), s = 0.008.
- AdaGN conditioning (eqs. 9–10) and importance-weighted denoising loss (eqs. 11–12) as above.
- Radix soft assignment (eq. 21): a_i^k(c) = softmax over splits (R > 1) or sigmoid (R = 1).
- Composite loss (eqs. 23–26) and adaptive weights (eq. 27) as above.
- **Assumptions:** synthetic samples preserving global μ/σ/γ are distributionally close enough that pretrain→fine-tune transfers (Wasserstein bound asserted, not measured); the accuracy-feedback weight rule is stable (no oscillation analysis); minority classes benefit from label-conditioned generation even with few real exemplars (the few-shot regime is not stress-tested — PAMAP2-50% is the hardest test); Raspberry Pi 5 latency generalizes to other edge targets.

## 5. Features / target
- Inputs: multivariate sensor time series (windowed); classifier input = 5-channel concat of raw signal x and statistical feature vector f.
- Targets: activity class (6 / 12 / 12+ classes per dataset).

## 6. Validation design
- **Three public benchmarks** with increasing imbalance severity (WISDM → PAMAP2 → OPPORTUNITY), full metric suite: Acc, Precision, Recall, F1 (weighted/macro), G-mean, AUC.
- **Ablation** dissecting backbone-only → +spatial attention → +temporal attention → +both → +adaptive loss (ACL) → +diffusion augmentation (= full USAD), plus fixed-weight composite-loss combinations (0.3/0.4/0.3 and 0.15/0.7/0.15) vs adaptive.
- **Comparative:** CNN, LSTM, LSTM-CNN, CNN-GRU, SE-Res2Net, ResNeXt, Gated-Res2Net, Rev-Attention, MAG-Res2Net, HAR-CE, ELK, DanHAR, ATFA, TCCSNet; PAMAP2 at 100% and 50% data volume.
- **Feature-space analysis:** t-SNE visualizations + intra/inter-class distance ratios (Appendix B).
- **Hyperparameter study** (Appendix C): label-smoothing coefficient sweep (ŷ = 0.05 optimal: val acc 0.9760, ECE 0.0109), focal-loss and class-balanced-loss sweeps.
- **Deployment:** parameter count, memory, per-segment inference latency on Raspberry Pi 5 (100× repeated runs), 5%-of-window latency budget.

## 7. Numerical results / baselines
- **Final USAD:** WISDM acc **98.84%** (F1 98.79); PAMAP2 **94.07%** (F1 93.72; 50%-data 89.29%/88.92); OPPORTUNITY abstract claims 80.92% but §4.2.1 reports 84.68% acc / 78.46% F1 / G-mean 88.95 / AUC 89.44 — **internal inconsistency flagged** (abstract vs body differ on OPPORTUNITY accuracy; treat the §4.2.1 table values as primary since they're tied to the reported per-metric breakdown).
- **Ablation (PAMAP2):** backbone-only 90.71% → +spatiotemporal attention 92.00% → +ACL 93.43% → +augmentation **94.07%** (+3.36 pp from augmentation). **OPPORTUNITY:** 78.05% → 84.60% (+6.55 pp from augmentation). Attention alone sometimes *hurt* single-dimension metrics — only the joint spatiotemporal interaction helped consistently.
- **Comparative (Table 3):** USAD beats all 12 baselines on PAMAP2-100% (next best MAG-Res2Net 88.57%/87.80) and PAMAP2-50% (89.29% vs ELK competitive). On WISDM, USAD 98.84/98.79 tops SE-Res2Net (98.23/97.71) and ELK (98.05/98.06).
- **Class balance:** OPPORTUNITY G-mean 88.95 vs CNN 0.7971-equivalent collapse on baselines; per-class WISDM table shows USAD leading on downstairs (95.86/95.91) and upstairs (95.72/95.56), the hard classes.
- **Feature separability (App. B):** USAD best inter/intra ratio on all three datasets (WISDM 17.063, PAMAP2 4.395, OPPO 3.271).
- **Deployment:** USAD params 3.47e5 (WISDM) / 1.09e6 (OPPO) — fewer than most SOTA; memory 718.50/751.30 (lowest-ish); inference < 25 ms on OPPORTUNITY segments (within the 5%-of-window budget); ResNeXt exceeded the budget.

## 8. Code / data availability
None stated. Public datasets used (WISDM, PAMAP2, OPPORTUNITY). No code repo link in the extracted text.

## 9. Leakage & limitations
- **OPPORTUNITY accuracy inconsistency** (80.92% abstract vs 84.68% §4.2.1) — sloppy reporting; the headline numbers need care.
- **No confidence intervals or significance tests** on any comparison; single-run numbers throughout.
- **Diffusion augmentation is evaluated only down to 50% data** — the true few-shot regime (5–10% data, where augmentation matters most) is untested.
- **Augmentation quality is asserted via downstream accuracy**, not via a direct distributional check (the Wasserstein bound is theoretical, unmeasured).
- **Domain gap:** wrist/ankle IMU activity recognition ≠ sports video/tracking; the sensor modality doesn't map to GSE's NGS/video inputs — only the *methodological patterns* (augmentation, loss) transfer.
- **Baseline tuning asymmetry:** 12 baselines compared, but no evidence of equal hyperparameter search effort; ELK nearly matches USAD on PAMAP2-50%.
- **No test-set leakage discussion:** sliding-window segmentation with standard splits; subject-independent splitting not explicitly confirmed (a classic HAR leakage vector).

## 10. GSE overlap
Per the existing-research-map: no diffusion-based augmentation work in the corpus; no adaptive composite-loss work; HAR is a new source domain (the 0350 tennis-IMU paper was sensor-based but rejected on transfer grounds — this one differs because the transferable artifacts are *methodological*, not sensor-specific). The rare-event/imbalance problem is central to GSE (coverage busts, pick plays, broken tackles, explosive plays are all minority classes). Not a duplicate; fills a genuine methodological gap.

## 11. GSE implementation spec
Port two components; skip the network:
- **(a) Statistics-guided diffusion augmentation for rare NFL events:** for minority play classes (e.g., broken-tackle runs, coverage busts, pick/rub routes) represented as NGS kinematic time series, implement the paper's augmentation recipe: extract per-play global stats (μ, σ, skewness of speed/accel series) + local z-scores → conditioning vector f; train a label-conditioned DDPM on the (small) real minority set; generate class-balanced synthetic plays; pretrain the event classifier on synthetic, fine-tune on real. Directly addresses GSE's rarest, most valuable labels. Start with a 1:4 real:synthetic blend ratio (the ratio Shao [9] found optimal, cited in the paper).
- **(b) Adaptive composite loss for GSE classifiers:** Loss = ω_0·label-smoothing + ω_1·focal + ω_2·CE with the feedback update ω_1 = 2 − τ − 1/(acc+1e−8), ω_0 = ω_2 = 0.5(1−ω_1). Drop-in replacement for plain CE on any imbalanced GSE classifier (play-type, prop-hit, coverage-label models). Tune τ and the smoothing coefficient (paper's optimum ŷ = 0.05 with ECE 0.0109 is the starting point; monitor ECE as they did).
- **(c) Deployment discipline:** adopt their latency-budget method — inference must complete within 5% of the input window's duration — for any real-time GSE feature (in-game win-probability or live prop edges).
- Do NOT port: the full multi-branch ResNeSt network (heavy, sensor-tuned; GSE's 1D-CNN/Transformer baselines from ledgers 0355/0356 are the right backbones); the AdaGN-MLP conditioning internals can be simplified to standard label-embedding conditioning first.

## 12. Reproducible test
- **Data:** NGS tracking plays labeled for a rare event (e.g., broken tackles, ~2–5% positive rate) with game-level holdout.
- **Pipeline:** (1) baseline classifier (1D-CNN from ledger 0355) with plain CE on real data only; (2) + adaptive composite loss; (3) + diffusion augmentation (pretrain synthetic → fine-tune real); (4) report Acc/F1/G-mean/AUC on held-out games — G-mean and AUC are the decision metrics (the paper's own emphasis for imbalance).
- **Pass gate:** augmentation + adaptive loss improves minority-class recall and G-mean by ≥ 3 pp over the CE baseline on held-out games (the paper's PAMAP2 +3.36 pp bar), with ECE not worsening (calibration check from Appendix C). **Fail gate:** gains < 1 pp or ECE degrades → the synthetic plays aren't distributionally faithful; fall back to focal loss alone (cheapest component).
- **Second test:** ablate the 1:4 real:synthetic blend ratio (1:1, 1:4, 1:8) — the ratio is a load-bearing hyperparameter the paper inherits from prior work without re-validating.

## 13. Acceptance / rejection gate
- **Accept as evidence** that statistics-guided diffusion augmentation + adaptive composite loss improves imbalanced time-series classification (consistent gains across three benchmarks of increasing imbalance severity, full ablations, deployment validation) — clears the evidence bar for the two portable components.
- **Gate the GSE port** on the reproducible test above: only adopt augmentation if it clears the +3 pp G-mean gate on held-out NFL games; adopt the adaptive loss immediately as a low-cost experiment (it's a few lines of code).

## 14. Improvement experiment
- **(i) Few-shot stress test the paper didn't run:** re-run their PAMAP2 experiment at 10% and 5% data volume — the regime where augmentation should matter most. Hypothesis: the augmentation gain *grows* as data shrinks (up to the point where the diffusion model itself collapses from too few exemplars); finding that collapse point defines the minimum viable minority-class size, which is exactly the number GSE needs to know before collecting rare-event labels.
- **(ii) Direct distributional validation:** compute the Wasserstein distance between synthetic and real minority-class series (their eq. 19 bound, never measured) and correlate it with downstream gain — turns their theoretical justification into an operational quality gate for synthetic plays.
- **(iii) GSE-side improvement:** condition the diffusion model not just on the event label but on *game situation* (down, distance, score differential) as an additional embedding alongside e_y — tests whether situation-conditioned synthetic plays beat label-only conditioning, on the hypothesis that rare NFL events are situation-dependent in ways HAR activities are not.
