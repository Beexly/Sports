# [0024] Time-Archival Camera Virtualization for Sports and Visual Performances (arXiv:2602.15181v1)

**Citation:** Yunxiao Zhang, William Stone, Suryansh Kumar (2026). *Time-Archival Camera Virtualization for Sports and Visual Performances*. arXiv:2602.15181v1. Texas A&M University. URL: https://arxiv.org/abs/2602.15181v1
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF; ar5iv HTML unavailable — fetch failed).
**Verdict:** REJECT — computer-vision/neural-rendering paper on novel-view synthesis for sports broadcast; no predictive modeling, no betting relevance; flagged for replacement.

## 1. Research question
Can photorealistic novel-view synthesis of fast, multi-subject dynamic sports scenes be achieved with exact "time-archival" (rewind to any past moment and render from any viewpoint) by dropping 3D Gaussian Splatting's dependence on per-frame SfM point clouds, and instead learning independent per-timestep implicit neural radiance fields constrained by synchronized multiview geometry? (Paper: Abstract, §1.)

## 2. Dataset / schema
- **New synthetic multiview dynamic-scene dataset** (introduced in this paper, Blender 4.0 renders from public internet 3D assets; "Code and dataset will be available at link" — link not given in text): (i) Dancing-Walking-Standing: 65 time instances × 100 calibrated cameras (hemisphere Fibonacci sampling, R radius), 95 train / 1 val / 4 test cameras → 6,175 train / 65 val / 260 test images, 1920×1080; (ii) Soccer Penalty Kick: 109 instances × 60 cameras → 5,995 train / 109 val / 436 test; (iii) Soccer Multiplayer: 83 instances × 60 cameras → 4,565 train / 83 val / 332 test. Intrinsics: fx=fy=2666.67, (cx,cy)=(960,540), zero distortion.
- **CMU Panoptic Studio** (public, [103]): Baseball Bat (Sports1, 100 frames, 31 HD cameras → 29 train / 2 test, 2,900 train / 200 test images) and Hand Gesture (Hands2, 201 frames, 5,829 train / 402 test); foreground isolated via YOLOv8 + SAM-HQ, RGBA.
- Schema: synchronized multiview RGB frames + known intrinsics/extrinsics; no tabular/sports-stat schema at all.

## 3. Method / model
- **Per-timestep implicit radiance field:** at each discrete time t, N synchronized cameras give images I_t = {I_t^(1)…I_t^(N)} with known K_i, (R_i, t_i). Scene encoded as F_t: (x, d) → (c, σ), x ∈ ℝ³, d ∈ S² viewing direction; implemented as F_t(x,d; Θ_t) = MLP(γ(x), γ(d); Θ_t) (eq. 4) with Instant-NGP-style multiresolution hash encoding γ(·) and a shallow MLP (2–3 hidden layers). Each timestep has its own parameter set Θ_t — no temporal coupling (deliberate: sports motion violates smooth-motion assumptions).
- **Volume rendering:** Ĉ(r,t) = ∫ T_t(s) σ_t(r(s)) c_t(r(s),d) ds, T_t(s) = exp(−∫ σ_t du) (eq. 6, standard NeRF integral); discretized into M samples (eq. 7).
- **Training loss:** L(Θ_t) = Σ_i Σ_{r∈R_i} ‖Ĉ(r;Θ_t) − C(r)‖² + κ‖Θ_{t+1} − Θ_t‖² (eq. 8) — photometric MSE plus optional temporal weight regularization; in experiments the temporal term is dropped (fully independent per-step optimization).
- **Baselines:** D-NeRF, D-3DGS, 4DGS, ST-GS, Tensor4D, HexPlane, K-Planes, StreamRF. Impl: PyTorch 2.5.1, CUDA 11.8, NVIDIA A40 (50 GB) and H100; ~12.7M params per timestep (~48.8 MB), rendering 4–5 FPS.

## 4. Equations & assumptions
- Plenoptic function: Φ(x, Ω_θ, Ω_φ, λ, t) (eq. 1), x ∈ ℝ³, Ω_θ ∈ [0,π], Ω_φ ∈ [0,2π); λ assumed constant (RGB only). (Notation cleaned; subscript extraction was noisy — flagged as reconstruction-uncertain.)
- Multiview capture: I_t = {I_t^(i)}, I_t^(i) ∈ ℝ^{H×W×3} (eq. 2).
- Radiance field: F_t: (x, d) → (c, σ); F_t(x,d; Θ_t) = MLP(γ(x), γ(d); Θ_t) (eqs. 3–4).
- Rendering integral and discretization (eqs. 6–7) — standard NeRF volume rendering; exact discrete form garbled in extraction (sums over T_t(j)(1−e^{−σ_j δ_j})c_j).
- Loss: L(Θ_t) = Σ_{i=1}^{N} Σ_{r∈R_i} ‖Ĉ(r;Θ_t) − C(r)‖² + κ‖Θ_{t+1} − Θ_t‖² (eq. 8; temporal term optional/unused in practice).
- **Assumptions:** (i) N synchronized static calibrated cameras with known/estimable K_i, R_i, t_i; (ii) at a fixed t, the dynamic scene is "already strongly constrained by geometry" — subjects across views related by rigid transforms, so no temporal coupling or point-cloud init needed; (iii) independent per-timestep optimization is valid (sports motion too abrupt for temporal smoothness); (iv) photometric loss suffices (no depth supervision); (v) evaluation cameras held out from training.

## 5. Features / target
- **Input features:** multiview synchronized RGB images + camera calibration (not a feature vector).
- **Target:** rendered RGB pixel colors from novel (held-out) viewpoints at current or past timesteps.
- No prediction horizon; this is 3D reconstruction/rendering, not forecasting.

## 6. Validation design
- Held-out **camera** splits (not time splits): test cameras never seen in training, all timesteps evaluated. Metrics: PSNR↑, LPIPS↓ (perceptual), FPS (rendering speed), plus memory footprint and training time.
- Baselines: D-NeRF, D-3DGS, 4DGS, ST-GS (Table 1), plus Tensor4D/HexPlane/K-Planes/StreamRF (Table 6).
- Ablations: random vs. GT 3D-point initialization for 3DGS methods; single-timestep 3DGS vs. implicit MLP; warm-start chaining sensitivity in per-timestep 3DGS (15-frame soccer sequence, GT-init vs. noisy-init); FPS-vs-PSNR tradeoff (Figure 6).
- Splits are not time-ordered (time is not the generalization axis — viewpoint is).

## 7. Numerical results / baselines
(Quoted exactly from Tables 1–6; paper claims:)
- Synthetic (Table 1), PSNR↑ / LPIPS↓ — DWS: D-NeRF 6.44/0.572, D-3DGS 18.45/0.139, 4DGS 28.17/0.08, ST-GS 20.03/0.112, **Ours 34.28/0.027**; Soccer Penalty Kick: D-NeRF 10.64/0.407, D-3DGS 26.45/0.071, 4DGS 26.25/0.045, ST-GS 25.99/0.077, **Ours 33.81/0.028**; Soccer Multiplayer: D-NeRF 6.15/0.533, D-3DGS 26.43/0.087, 4DGS 26.20/0.061, ST-GS 25.92/0.104, **Ours 31.85/0.039**.
- CMU Panoptic (Table 2): Baseball Bat — D-NeRF 6.35/0.605, **Ours 29.43/0.066** (D-3DGS/4DGS/ST-GS failed — ♣); Hand Gesture — D-NeRF 12.99/0.135, **Ours 29.19/0.050**.
- Memory per timestep (Table 4, DWS): 3DGS w/ GT points 36.47 PSNR / 77 MB model + ~6.2 GB point-cloud folder; 3DGS random init 16.33 / 91 MB; **Ours 34.28 / 48.8 MB, no point cloud**. Per-timestep 3DGS for time archival: "1–5 million Gaussians per scene … 200–300MB per time step … 100 frames: 20–30 GB" vs. their "12.7M parameters (approx. 25-50MB)" per step.
- Training (Table 5): 4DGS ~0.30–3.0 h sequential, ST-GS ~0.46–0.71 h, D-3DGS ~1.40 h, **Ours ~5.65–8.90 h per sequence on a single A6000 but fully parallelizable across time**; PSNR 31.9–34.3, LPIPS 0.027–0.039 (best).
- Warm-start chaining (15-frame soccer): GT-init PSNR 28.94/SSIM 0.851 vs. noisy-init 26.20/0.812 — "∼2.74 dB PSNR gap persisted consistently across frames 1–15."
- Rendering speed: "our current implementation provides 4-5 FPS, i.e., near realtime performance, a limitation nonetheless."
- All numbers are paper claims on author-generated synthetic data + CMU Panoptic; no CIs reported.

## 8. Code / data availability
"Code and dataset will be available at link." (§4) — **no actual link or URL given in the text**. Effectively: none stated.

## 9. Leakage & limitations
- **Synthetic-data home advantage:** the three main datasets are Blender renders from public assets with perfect synchronization and calibration — the exact regime where "geometry is well-constrained" holds; real broadcast camera arrays have calibration drift, rolling shutter, and unsynchronized feeds.
- Baselines handicapped: 4DGS/ST-GS were run with random 3D-point initialization (their failure mode) on the real dataset; D-3DGS needs depth data "not present in our experimental setting" — the comparisons measure robustness to missing priors, not peak capability.
- No temporal test split: time-archival quality at *unseen* timesteps is never evaluated (only unseen viewpoints); the "archival" claim is architectural, not empirically validated.
- 4–5 FPS rendering and 5.65–8.90 h/sequence single-GPU training: near-real-time claims depend on "tens or hundreds of GPUs" — cost not quantified.
- Small foreground objects (grass, bottles) and mixed lighting produce artifacts (§6); foreground–background separation delegated to SAM-HQ.
- **External validity to NFL analytics: zero.** This is a graphics/broadcast-production paper. The only conceivable GSE touchpoint — generating novel-view replay content for @GalaxySportsHQ — is foreclosed by (a) no multi-camera arrays in Garrett's pipeline, (b) no code released, (c) the standing video rule requiring real footage.

## 10. GSE overlap
None on methods. The existing-research map covers NGS tracking-data taxonomy, STRAIN, and real-footage video operations — nothing in neural rendering, NeRF, 3DGS, or view synthesis. No duplication; the paper is out of the program's predictive-analytics scope (lane = "experimental" sweep artifact).

## 11. GSE implementation spec
None applicable. No predictive model, no features, no calibration, no market application. If GSE ever wanted novel-view replay generation, the honest spec would start with "acquire a synchronized multi-camera array and wait for the authors' code release" — not a real plan. No effort estimate warranted.

## 12. Reproducible test
Not testable with GSE data — no multiview video corpus, no rendering task, no code released. No baseline in the GSE stack to beat.

## 13. Acceptance / rejection gate
REJECT (verdict determined): out-of-scope domain (neural rendering), no public code/dataset link, no predictive content. Acceptance would require a sports-analytics replication target, which does not exist.

## 14. Improvement experiment
None for GSE. Within its domain, the authors' own stated next steps: explicit illumination modeling and foreground–background separation for fine-grained objects and mixed lighting (§6).

---
*Flags: (a) ar5iv HTML failed; full text from arXiv PDF. (b) Equation subscripts garbled by PDF extraction — forms above are cleaned reconstructions, flagged uncertain; verify against PDF before citing. (c) Code/dataset link promised but not provided. (d) Candidate for replacement in the 500-paper count: REJECT verdict, no GSE relevance.*
