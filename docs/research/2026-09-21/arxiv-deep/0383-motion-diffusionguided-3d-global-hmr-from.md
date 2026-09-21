# [0383] Motion Diffusion-Guided 3D Global HMR from a Dynamic Camera (arXiv:2411.10582)

**Citation:** Jaewoo Heo, Kuan-Chieh Wang, Karen Liu, Serena Yeung-Levy (2024). *Motion Diffusion-Guided 3D Global HMR from a Dynamic Camera*. arXiv:2411.10582. URL: https://arxiv.org/abs/2411.10582
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1923 lines).
**Verdict:** REJECT — a single-human, test-time-optimization 3D pose pipeline (MDM motion prior + DROID-SLAM camera disentanglement) that cannot scale to 22-player NFL broadcast film and has no product input role in a prediction engine; GSE's tracking needs are already served by NGS chips.

## 1. Research question
How can accurate *global* 3D human mesh/motion (pose + root trajectory in a world frame) be recovered from a monocular video shot with a *moving* camera, where the rendered motion confounds human and camera movement? The paper introduces **DiffOpt**, which represents motion with neural motion fields (NeMo-style MLPs over time), constrains them with a motion-diffusion-model (MDM, Tevet et al. 2022) prior via score-distillation sampling (SDS), and jointly optimizes human motion plus dynamic camera parameters initialized from DROID-SLAM — beating GLAMR, SLAHMR, WHAM, and TRACE on global trajectory metrics, especially on long videos.

## 2. Dataset / schema
- **EMDB** (Electromagnetic Database of Global 3D Human Pose and Shape in the Wild, Kaufmann et al. 2023): 58 minutes / ~105,000 frames / 81 sequences of in-the-wild human motion with ground-truth global pose from electromagnetic sensors. Used two ways: (a) 7 dynamic sequences ('outdoor walk/climb/warmup', 'soccer warmup', 'outdoor run', 'indoor workout', 'outdoor parcour') cut into 100-frame segments; (b) full untrimmed sequences (avg ~1,300 frames).
- **Egobody** (Zhang et al. 2022b): test set of 17 untrimmed sequences (avg ~1,390 frames) of social interaction, with ground-truth 3D motion.
- Off-the-shelf inputs: HMR2.0 (Goel et al. 2023) per-frame articulation init, ViTPose (Xu et al. 2022) 2D keypoints, DROID-SLAM (Teed & Deng 2022) camera init. All datasets/methods public; EMDB/Egobody are research datasets.

## 3. Method / model
- **Representation:** global motion = SMPL articulation θ_{1:T} ∈ R^{24×3×T}, root orientation φ_{1:T} ∈ R^{3×T}, root translation x_{1:T} ∈ R^{3×T}, parameterized by neural motion-field MLPs {f_θ, f_φ, f_x} over a normalized phase vector τ (τ_0=0, τ_{T−1}=1) instead of direct per-frame optimization.
- **MDM-SDS prior (§3.2):** pretrained motion diffusion model (denoiser ε_φ trained per Eq. 2 on AMASS); score distillation loss (Eq. 3, DreamFusion-style): L_Diff = E_{t,ε}[w(t)‖ε_φ(α_t x + σ_t ε, t) − ε‖²]; HMR motion is differentiably transformed into MDM's input format (joint positions via FK + contact labels).
- **3-stage optimization (Table 1):** (1) warm-up: L2 fit of motion fields to HMR2.0 init (Eqs. 4–5); (2) MDM guidance: alternate (2a) human update — L_Diff + articulation warm-up term (Eq. 6) — with (2b) camera update — learnable camera rotation bias b_R ∈ R^{6×T}, translation scale s_t, translation bias b_t ∈ R^{3×T}, focal scale s_f applied to DROID-SLAM outputs (R_cam = R_SLAM + b_R, t_cam = t_SLAM·s_t + b_t, f_cam = f_SLAM·s_f), minimizing 2D reprojection loss with Geman-McClure robust error ρ (Eqs. 7–10); (3) fine-tune: joint min of L_Diff + L_warmup + L_2D (Eq. 11).
- Baselines: GLAMR (Yuan 2022), SLAHMR (Ye 2023, HuMoR prior), WHAM (Shin 2024), TRACE (Sun 2023). Metrics: MPJPE/MPVPE (camera frame) and G-MPJPE/G-MPVPE (global, mm).

## 4. Equations & assumptions
- (1) MDM forward: `q(x_t|x_0) = N(α_t x_0, σ²I)`, α_t² = 1 − σ_t².
- (2) MDM training: `min_{ε_φ} E_{x_0~D, t~U(0,1)}[‖x_0 − ε_φ(x_t, t)‖²₂]`.
- (3) SDS: `L_Diff(φ, x) = E_{t,ε}[w(t)‖ε_φ(α_t x + σ_t ε, t) − ε‖²₂]`.
- (4)–(5) Warm-up: `L_warmup = (1/T)Σ_t(‖f_θ(τ_t) − θ_init‖² + ‖f_φ(τ_t) − φ_init‖² + ‖f_x(τ_t) − x_init‖²)`.
- (6) Human update: `min_{f_θ,f_φ,f_x}(L_Diff + ‖f_θ(τ_t) − θ_init‖²)`.
- (7)–(10) Camera update: `min_{b_R,s_t,b_t,s_f} L_2D`; `L_2D = (1/T)Σ_t ρ(j_t, j̃_t)`; `j_t = P(R_cam f_3d(p_t) − t_cam)`; `p_t = W(f_m(f_θ(τ_t)) + f_x(τ_t))`; ρ = Geman-McClure, P = perspective projection, W = SMPL joint regressor.
- (11) Fine-tune: `min(L_Diff + L_warmup + L_2D)`.

Assumptions: (a) a single human subject per video (multi-person not handled); (b) SLAM provides a usable camera init even in dynamic human-centric video (found "less robust," hence the learned bias terms); (c) MDM trained on AMASS (ground-plane contact only) transfers to in-the-wild motion — distribution shift on object contact is a known failure (see §9); (d) 2D keypoints from ViTPose are reliable pseudo-ground truth; (e) motion is smooth enough for an MLP-over-time field to represent it.

## 5. Features / target
Input features: monocular RGB video frames (dynamic camera); off-the-shelf HMR2.0 articulations, ViTPose 2D keypoints, DROID-SLAM camera parameters. Target: global 3D human motion — SMPL joint angles, root orientation, and world-frame root translation per frame (plus refined camera trajectory). Horizon: N/A (offline per-video reconstruction, not forecasting).

## 6. Validation design
EMDB trimmed 100-frame segments (7 sequences, baselines at their best on short clips); EMDB full untrimmed (avg ~1,300 frames); Egobody 17 untrimmed test sequences (avg ~1,390 frames). Baselines: GLAMR, SLAHMR, WHAM, TRACE. Metrics: MPJPE/MPVPE, G-MPJPE/G-MPVPE in mm. Ablations (Table 5): neural motion field vs. learnable tensors; single-stage vs. multi-stage; bypass each stage. No training (test-time optimization only); no cross-dataset generalization beyond the two eval sets.

## 7. Numerical results / baselines
Quoted exactly:

- **Trimmed EMDB (Table 2, mean MPJPE/G-MPJPE, MPVPE/G-MPVPE in mm):** GLAMR 97.4/587.1, 125.9/588.6; SLAHMR 75.8/388.9, 95.4/402.3; WHAM 53.3/216.5, 68.9/224.4 (computed excluding 'soccer warmup', where WHAM returns NaN — complete optimization failure); TRACE 79.0/524.9, 98.4/542.2; **DiffOpt 85.4/322.6, 105.1/327.0**. DiffOpt best in 5/7 sequences on global metrics; paper claims 17% G-MPJPE / 18% G-MPVPE improvement over the third-best framework on trimmed.
- **Untrimmed EMDB (Table 3):** GLAMR 90.4/2113.5; SLAHMR 234.8/5595.8 (optimization breaks down); **DiffOpt 102.5/1776.2** — 16% better G-MPJPE than second-best (GLAMR). GLAMR wins local MPJPE (90.4 vs 102.5) but loses global badly.
- **Egobody (Table 4):** WHAM 94.1/572.7; SLAHMR NaN/NaN (fails all 17); DiffOpt 129.2/459.8 — paper claims 24.6% G-MPJPE / 26.7% G-MPVPE over WHAM; DiffOpt with TRAM masked-SLAM cameras: 117.9/502.0.
- **Ablations (Table 5, trimmed EMDB):** learnable tensors instead of motion fields: G-MPJPE +318.2; single-stage optimization: +625.1 (catastrophic — multi-stage is essential); no warm-up: +262.1; no MDM step: +145.2; no fine-tune: +205.0.

## 8. Code / data availability
None stated in the main text (no repository URL in this extract). Datasets (EMDB, Egobody) and off-the-shelf components (HMR2.0, ViTPose, DROID-SLAM, MDM) are public, but the DiffOpt implementation link is not given here.

## 9. Leakage & limitations
- **Test-time optimization per video:** DiffOpt runs a 3-stage optimization for every input video — computationally incompatible with batch-processing an NFL season's film (22 players × thousands of plays). This is a per-video MoCap tool, not a scalable inference pipeline.
- **Single human only:** NFL broadcast frames contain 22 players with heavy occlusion; the paper handles one subject. Multi-person global HMR is a different, harder problem (TRACE attempts it; this paper does not).
- **Prior distribution shift:** MDM trained on AMASS (ground-plane contact only); performance degrades on prolonged object contact ('outdoor warmup') and static leg postures (both acknowledged in §5). Tackles — the most interesting NFL motion — are exactly out-of-distribution (external forces, player–player contact).
- **No code stated** in the main text; reproducibility unverifiable from this extract.
- **External validity to NFL:** GSE's player-position data comes from NGS chips (10 Hz, all 22 players, no occlusion problem). Recovering SMPL joint angles from broadcast video would add biomechanical detail (QB mechanics, tackle form), but (a) the method can't do 22 players, (b) it's too slow for season-scale processing, (c) the failure mode (contact-heavy motion) is the NFL's core content. There is no product input in the prediction engine that needs SMPL joint angles today.

## 10. GSE overlap
Read `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. Relevant: the **2026-09-21 NGS profile deep-dive** inventoried the full 27-family tracking taxonomy — GSE already has complete player-position data from NGS chips, which is the information this paper recovers (less accurately) from video. The **2026-09-18 NGS replacement spec** is about replacing NGS *metrics* from public data, not about recovering joint angles. No repo work does video pose estimation; there is no biomechanics product lane. Status: **no overlap and no transfer path** — NGS already supplies strictly better data for everything this paper's output could feed, at season scale, for all 22 players.

## 11. GSE implementation spec
No build recommended (REJECT). For the record, the only conceivable GSE use — single-player biomechanical reconstruction from broadcast close-ups (e.g., QB throwing mechanics for an injury-risk content series) — would require: multi-person extension, NFL-scale throughput (currently per-video optimization), and contact-motion robustness, i.e., a different paper. Not worth pursuing.

## 12. Reproducible test
Not applicable — REJECT. There is no GSE decision, metric, or product input that DiffOpt's output (single-human SMPL global motion) would change; a test would need a biomechanics product lane that does not exist.

## 13. Acceptance / rejection gate
**Reject** — pre-registered structural gate: adopt only if a future GSE product requires per-player 3D body-pose reconstruction from broadcast video at season scale (no such product exists) AND the method handled 22-player scenes (it handles one). Both fail; rejection stands regardless of the paper's strong results within its own domain.

## 14. Improvement experiment
For the vision community, not GSE: **multi-person DiffOpt with collision handling.** The paper's two acknowledged limits are single-subject and contact-shift failure; the extension is a per-person neural motion field bank sharing one camera optimization, plus a player–player contact prior (e.g., a learned collision penalty from multi-person mocap like the Egobody training split) to keep tackle-like interactions plausible. The test: G-MPJPE on multi-person sequences vs. TRACE, with a contact-plausibility metric (interpenetration volume). This would be the version that could eventually matter for team sports — but it does not exist yet, and building it is not GSE's job.
