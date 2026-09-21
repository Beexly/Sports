# [0388] GST: Precise 3D Human Body from a Single Image with Gaussian Splatting Transformers (arXiv:2409.04196)

**Citation:** Lorenza Prospero, Abdullah Hamdi, Joao F. Henriques, Christian Rupprecht (2024). *GST: Precise 3D Human Body from a Single Image with Gaussian Splatting Transformers*. arXiv:2409.04196. URL: https://arxiv.org/abs/2409.04196
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1350 lines; v2).
**Verdict:** REJECT — single-human 3D body reconstruction from one image (SMPL-anchored Gaussian splats + rendering supervision, 47 fps). Strong paper from Oxford's Podium Institute for Sports Medicine, but like 0383 it solves single-athlete biomechanical reconstruction, which is not a GSE product input; NGS already supplies the positional data GSE needs. The transferable idea — training 3D pose predictors on multi-view images *without* 3D ground truth — is banked for any future pose work.

## 1. Research question
Can precise 3D human body models (pose + shape + appearance) be inferred from a *single* image at near real-time speed, *without* expensive diffusion priors or 3D supervision — by combining SMPL pose estimation with 3D Gaussian Splatting (3DGS) and training on multi-view images alone? GST anchors one Gaussian per SMPL vertex (6890 Gaussians), predicts small offsets plus Gaussian attributes with a transformer, and uses novel-view rendering as the supervision signal. Result: MPJPE within 6–7 mm of HMR2 fine-tuned *with* full 3D ground truth, at 47 fps.

## 2. Dataset / schema
- **Training/eval (multi-view, no 3D GT needed):** THuman (90 train / 10 test subjects), RenderPeople (450 / 30), ZJU MoCap (SHERF split), HuMMan (317 train / 22 test sequences, 17 frames each). **TH21:** 2,500 3D scans (200 eval) for large-scale training. **CMU Panoptic** single-human partition (9 sequences, 31 HD views) — sports-sequence qualitative results (Figure 1). **Human3.6M** sparse-view experiment (4 views; PSNR 18.68).
- Notes: SportsPose (Ingwersen et al. 2023) would have been suitable but released no multi-view data; all four main datasets are "small in terms of subject diversity," causing slight rendering blurriness (§6).

## 3. Method / model
- **Representation (§3.1):** each SMPL vertex v_n gets a Gaussian G_n = (μ_n, Σ_n, α_n, c_n) (Eq. 1); covariance factorized as rotation × diagonal (9→6 DoF), so G_n ∈ R^14. Learned offset δ_n lets Gaussians model clothing/geometry SMPL can't.
- **Architecture:** HMR2's ViT (frozen, pretrained weights) + extended decoder with extra learnable tokens: vertices grouped into K = 26 groups of 265 Gaussians → 5K+1 tokens (5 params × 26 groups + 1 SMPL-shape token); token outputs → linear layer → Gaussian params. (5 tokens/Gaussian = 34k+ tokens would be infeasible.)
- **Losses (§3.2):** image reconstruction (MSE + LPIPS perceptual + masked opacity/transparency loss, Eq. 2) + Gaussian tightness regularization (Eq. 3, keeps offsets small so pose corrections live in SMPL params); total Eq. 4. Weights: L_perceptual = 0.01, L_α = 0.1, L_tight = 0.1; optional L2 on SMPL β (affects only body thickness).
- **Training:** 256-px square crops, single A6000, batch 32, 3 days. **Inference: 47 fps**, single forward pass, joint pose estimation + reconstruction.

## 4. Equations & assumptions
- (1) `μ_n = v_n + δ_n` — Gaussian mean = SMPL vertex + learned offset.
- (2) `L_img = (1/M) Σ_{i=1}^{M} (‖Î_i − I_i‖²₂ + λ_perceptual·LPIPS(Î_i, I_i) + λ_α‖M̂_i − I_i^α‖²₂)` — multi-view rendering loss.
- (3) `L_tight = (1/V) Σ_{n=1}^{V} ‖δ_n‖₂`, V = 6890.
- (4) `L = L_img + λ_tight·L_tight`.

Assumptions: (a) SMPL vertices give adequate spatial density/init for Gaussians (incl. back faces); (b) multi-view training images with known cameras and foreground masks are available (the key data requirement — no 3D GT, but calibrated multi-view is still needed); (c) small offsets suffice for clothing (tightness prior); (d) single human per crop.

## 5. Features / target
Input features: a single RGB image crop (256×256) of one person. Target: SMPL pose/shape parameters + per-vertex Gaussian attributes (color, rotation, scale, opacity, offset) → renderable 3D human from any viewpoint. Horizon: N/A (per-image reconstruction).

## 6. Validation design
Datasets: RenderPeople, HuMMan (3D keypoint MPJPE vs. GT SMPL joints), ZJU MoCap, THuman, TH21 (novel-view PSNR/SSIM/LPIPS), CMU Panoptic (qualitative sports), Human3.6M (sparse-view stress). Baselines: NHP, MPS-NeRF, PixelNeRF (multi-view GT-SMPL reference); SHERF (adapted to HMR2/TokenHMR-estimated SMPL for fairness); HMR2 (pretrained, 2D-only fine-tuned, 3D fine-tuned); TokenHMR; Splatter Image. Ablation (Table 5): LPIPS/tightness/transparency losses on HuMMan. Appendix: extra ablations (2–3 Gaussians/vertex, MSCOCO single-view augmentation — no gain).

## 7. Numerical results / baselines
Quoted exactly:

- **3D keypoints (Table 2, MPJPE mm, RenderPeople / HuMMan):** HMR2 101.0 / 133.4; HMR2 2D-only fine-tuned 127.40 / 163.77 (worse than pretrained — "2D information alone is not enough"); HMR2 3D fine-tuned 57.33 / 61.20; TokenHMR 77.9 / 91.4; **GST 67.6 / 64.6** — no 3D supervision, yet only 7 mm / 6 mm worse than HMR2 with full 3D GT, and better than TokenHMR.
- **Novel view (Table 2):** RenderPeople — GST 17.80/0.81/0.25 (PSNR/SSIM/LPIPS) vs. SHERF w/ HMR2 13.55/0.62/0.37; HuMMan — GST 18.40/0.87/0.14 vs. 18.00/0.85/0.18.
- **Table 3 (ZJU MoCap / THuman NVS):** GST 21.26/0.85/0.16 vs. SHERF w/ HMR2 19.11/0.81/0.21 (ZJU, GST wins); THuman 16.34/0.84/0.20 vs. 17.27/0.85/0.16 (SHERF wins on THuman).
- **Table 4 (TH21, 2,500 scans):** GST 22.20/0.90/0.09 vs. Splatter Image 23.74/0.91/0.10 — Splatter leads on PSNR/SSIM, GST on LPIPS *and* additionally predicts the 3D body (Splatter doesn't).
- **Ablation (Table 5, HuMMan MPJPE):** all three losses → 50.8 mm; removing transparency → 52.3; removing tightness → 53.6; LPIPS only → 82.3. Tightness regularization has the largest 3D-precision impact (Figure 7).

## 8. Code / data availability
Code: https://github.com/prosperolo/GST (stated in abstract). All datasets public (THuman, RenderPeople, ZJU MoCap, HuMMan, TH21, CMU Panoptic, Human3.6M).

## 9. Leakage & limitations
- **Multi-view training required:** "the main limitation" (§6) — needs calibrated multi-view images with masks; NFL broadcast has multiple camera angles but they are unsynchronized cuts, not calibrated multi-view.
- **Single human per crop:** same 22-player problem as 0383 — no multi-person handling.
- **Blurriness on small datasets:** generalization limited by subject diversity; fixed only by TH21-scale data (2,500 scans).
- **Human3.6M failure mode:** with only 4 views and imprecise masks, the model bakes background into the human — mask quality is load-bearing.
- **THuman loss to SHERF** shows the rendering-supervision advantage isn't universal.
- **External validity to NFL/GSE:** GSE has no product that consumes per-player 3D body meshes; NGS chips supply positions for all 22 players at 10 Hz, which strictly dominates single-image mesh reconstruction for every current GSE use. The sports-medicine framing (Podium Institute) targets injury/biomechanics — a different industry, not GSE's prediction products.

## 10. GSE overlap
Read `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. Relevant: (a) **0383 DiffOpt** (this wave) — the other single-human 3D pose paper; GST is the fast feed-forward counterpart to DiffOpt's slow test-time optimization (47 fps vs. per-video optimization), making it the *deployable* one of the two — but deployable at a task GSE doesn't need; (b) **NGS 27-family taxonomy / profile deep-dive** — GSE's positional data source needs no replacement; (c) no biomechanics/injury product lane exists. Status: **no overlap, no transfer path to a current product** — strictly better than 0383 on deployability, equally irrelevant to the engine.

## 11. GSE implementation spec
No build recommended (REJECT). Banked for the future: the **multi-view-without-3D-GT training paradigm** — if GSE ever needs pose (e.g., a biomechanics/injury content lane), GST's recipe (SMPL-anchored Gaussians + rendering loss + tightness regularization, trained on multi-view images alone) is the starting point, and its 47 fps makes it the only one of the two pose papers (0383/0388) that could run at video scale. Revisit only if such a product lane opens.

## 12. Reproducible test
Not applicable — REJECT. No GSE decision consumes single-image 3D body meshes.

## 13. Acceptance / rejection gate
**Reject** — pre-registered product-input gate: adopt pose-reconstruction work only if a GSE product requires per-player 3D body data (none does) AND the method handles multi-player broadcast scenes (single-human only). Both fail. The multi-view-no-3D-GT training idea is preserved in §11 without adopting the paper.

## 14. Improvement experiment
For the vision community: **multi-person GST with identity-consistent Gaussians.** Extend the token scheme to P persons (P×(5K+1) tokens with cross-person attention), add an interpenetration penalty between persons' Gaussians, and train on multi-view multi-person data (e.g., CMU Panoptic multi-subject partitions). Test: per-person MPJPE vs. single-person GST on the same sequences + interpenetration volume. This is the missing step between GST and any team-sport application — including the NFL use case that would make 0383/0388 relevant to GSE.
