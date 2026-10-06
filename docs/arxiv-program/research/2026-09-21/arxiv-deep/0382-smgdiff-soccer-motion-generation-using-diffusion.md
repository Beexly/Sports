# [0382] SMGDiff: Soccer Motion Generation using diffusion probabilistic models (arXiv:2411.16216)

**Citation:** Hongdi Yang, Chengyang Li, Zhenxuan Wu, Gaozheng Li, Jingya Wang, Jingyi Yu, Zhuo Su, Lan Xu (2024). *SMGDiff: Soccer Motion Generation using diffusion probabilistic models*. arXiv:2411.16216. URL: https://arxiv.org/abs/2411.16216
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2109 lines).
**Verdict:** REJECT — a character-animation system for real-time game/VR soccer avatars (keyboard-controlled motion synthesis from a lab mocap dataset); GSE builds prediction and betting products, not animated characters, and has neither the mocap data pipeline nor the visual-fidelity objective this paper optimizes, so there is no transfer path to the engine.

## 1. Research question
How can realistic, diverse, user-controllable soccer motions (dribbling, tricks, shooting, celebrating, off-the-ball movement) be generated in real time for games and VR/AR, given the complex human–ball interactions that break example-based motion matching? The paper introduces SMGDiff, a two-stage framework: (1) a single-step diffusion trajectory generator turning coarse user controls (speed, direction, skill label) into diverse global trajectories, and (2) a transformer-based autoregressive diffusion model generating skeletal human motion + rigid ball motion + contact labels conditioned on the trajectory, with a contact-guidance module at inference to fix ball–foot contact. It also releases Soccer-X, a 1.08M-frame mocap soccer dataset.

## 2. Dataset / schema
- **Soccer-X (new, announced for release):** 16 OptiTrack Prime x13 cameras in a 6 m × 7.5 m × 2.5 m capture volume, 240 fps, 30 skilled soccer players; >10 hours, 1.08 million frames, 2,398 sequences, downsampled to 30 fps. Human motion in SMPL format (24 joints); ball with translation + rotation. Organized into 6 categories: Dribble, Stand, Off-the-ball Move, Trick (5 specific dribbling maneuvers), Shoot (ball flight reconstructed post-hoc in Unity physics due to indoor space limits), Celebrate. Train/test 9:1.
- No public URL is given in the main text ("our data and model will be disseminated to the community" — availability not yet effective at write time).
- Representation per frame: xⁱ = {h, b, c}: human state h ∈ R^{3+24×6} (root position + 24 joints in 6-DOF rotation), ball state b ∈ R^7 (relative ball position 3, global ball velocity 3, ball control weight 1), contact label c = {c_g (foot–ground), c_b (foot–ball)} binary.

## 3. Method / model
- **Stage 1 — trajectory generation:** lightweight single-step transformer-encoder diffusion (total diffusion timestep = 1) mapping (skill label S, target trajectory point G, past trajectory T^P) + Gaussian noise ε ~ N(0,I) → future trajectory T^F (root position + orientation projected on ground). Trained with reconstruction + velocity losses. At runtime, Heuristic Future Trajectory Extension (HFTE) from CAMDM blends the new trajectory with the previous output for smoothness under changing user input.
- **Stage 2 — soccer motion diffusion:** transformer-based autoregressive diffusion (CAMDM-style) predicting x̂_0^F itself (Ramesh et al. 2022 style), conditioned on C = {S, X^P, T^F}; only 8 denoising steps (trained directly at 8 steps, which beat training at 1000 + DDIM sampling). Loss (Eq. 9): L = L_simple + λ_pos L_pos + λ_vel L_vel + λ_foot L_foot, with joint-position, velocity, and foot-contact auxiliaries (Eqs. 6–8; FK = forward kinematics, foot joints only in L_foot).
- **Contact guidance (inference only, last 2 of 8 steps):** detect ball–foot contact events via ball acceleration threshold (τ_a = 2 m/s², Eq. 10); identify the contacting foot joint prioritizing the lifted foot (penalty w_d = 2, Eq. 11); contact loss L = Σ_i dⁱ·I(dⁱ>τ_d)·ĉ_bⁱ/(I(dⁱ>τ_d)+δ) with τ_d = 0.1 m (Eq. 12); DSG-style loss guidance with guidance rate w_r = 0.5 (Eqs. 13–15).
- Runtime: 30 Hz, P=10 past frames, F=45 future frames; Unity ↔ Python over TCP; i7-10700K + RTX 3080 Ti; 12 ms inference at 8 steps (Table 3: 2/4/8/16/32 steps → 3/6/12/25/52 ms).

## 4. Equations & assumptions
- (1) Ball control weight: `w_b = 1 − ‖b_p^{xy} − h_p^{xy}‖/r`, r = 2 m.
- (2) Relative ball position: `b_p' = w_b·(b_p − h_p)`.
- (3) Single-step trajectory diffusion: `p_θ(z_{0:1}) = ε p_θ(z_0|z_1)`, `p_θ(z_0|z_1) = N(z_0; μ_θ(z_1,1), Σ_θ(z_1,1))`.
- (4) Forward: `q(X_t^F|X_0^F) = N(√ᾱ_t X_0^F, (1−ᾱ_t)I)`.
- (5) `L_simple = E[‖X_0^F − X̂_φ^F(X_t^F, t, C)‖²₂]`.
- (6)–(8) `L_pos = (1/F)Σ‖FK(x_0^i) − FK(x̂_0^i)‖²`; `L_vel = (1/(F−1))Σ‖(x_0^{i+1}−x_0^i) − (x̂_0^{i+1}−x̂_0^i)‖²`; `L_foot = (1/(F−1))Σ‖(FK(x̂_0^{i+1}) − FK(x̂_0^i))·c_g^i‖²` (foot joints only).
- (9) `L = L_simple + λ_pos L_pos + λ_vel L_vel + λ_foot L_foot`.
- (10) `ĉ_b = I(‖b_a‖ > τ_a)`, τ_a = 2 m/s².
- (11) `d = min_{j∈foot joints}((f_p^j − b_p)·(1 + (w_d−1)·c_g^j))`, w_d = 2.
- (12) `L = Σ_i d^i·I(d^i>τ_d)·ĉ_b^i/(I(d^i>τ_d)+δ)`, τ_d = 0.1 m.
- (13)–(15) DSG guidance: `D* = −√n σ_t ∇L/‖∇L‖₂`; `D = D_t + w_r(D* − D_t)`, w_r = 0.5; `X_{t−1}^F = μ_t + √n σ_t D/‖D‖`.

Assumptions: (a) user control is coarse (direction/speed/skill) and a generated trajectory is sufficient conditioning for full-body motion; (b) ball acceleration > 2 m/s² reliably indicates foot contact (friction-only acceleration is small and constant); (c) lifted foot is the contacting foot (w_d = 2 penalty); (d) single-player motion — no inter-player interaction modeled; (e) no physics during training/inference (pure kinematics; ball flight for Shoot was reconstructed offline).

## 5. Features / target
Input features (conditions): skill label S ∈ {dribble, trick, shoot, stand, celebrate, off-the-ball move}, target trajectory point G (from keyboard), past trajectory T^P, past motion X^P = {h, b, c}. Target: future soccer motion X^F — per frame: SMPL root + 24 joint rotations, ball position/velocity/control weight, binary foot–ground and foot–ball contact labels. Horizon: 45 future frames at 30 Hz (1.5 s) per rollout, autoregressive. Task: generative synthesis, not classification or forecasting of real game data.

## 6. Validation design
Train/test 9:1 split of Soccer-X (no time- or player-disjoint protocol stated). Baselines: LMP (Starke et al. 2020b), MANN-DP (Zhang 2018 + DeepPhase), CM (Starke 2024) — all real-time character controllers, evaluated with identical trajectory conditioning (paper's own trajectory generator bypassed for fairness). Metrics: FID (motion-distribution distance), foot-sliding distance (m), mean per-joint acceleration (cm/s), diversity (joint-position variance under identical controls), trajectory error (degrees), orientation error (degrees), skill accuracy (% via a pre-trained classifier). Ablations: w/o trajectory generation model, w/o contact guidance; runtime sweep over denoise steps (2–32) and guidance insertion schedules (Start/End 1–2).

## 7. Numerical results / baselines
Quoted exactly (Table 1, §5.1):

| Method | FID ↓ | Ft.Slid. ↓ | Accel. ↓ | Div. ↑ | Traj.Err. ↓ | Orient.Err. ↓ | Skill Acc. ↑ |
|---|---|---|---|---|---|---|---|
| LMP | 0.3541 | 1.0678 | 1.6070 | 0.3980 | 4.1156 | 6.4932 | 73.3% |
| MANN-DP | 0.3593 | 1.3507 | 1.5652 | 0.4753 | 4.0690 | 5.2985 | 69.1% |
| CM | 0.2494 | 1.6498 | 1.1752 | 0.3520 | 3.1034 | 5.0663 | 52.9% |
| Ours | 0.1813 | 0.8543 | 1.1999 | 0.6177 | 2.4132 | 4.9393 | 93.3% |

Ablations (Table 2): w/o TGM: FID 0.3646, Div. 2.4331; w/o CGM: FID 0.3704; full: FID 0.3580, Div. 2.6925 (note: this table's FID scale differs from Table 1's — different evaluation slices; the directional claim is that both modules help). Runtime (Table 3): 8 steps → 12 ms inference, FID 0.3704 (vs 0.3379 at 32 steps / 52 ms); guidance schedule (Table 4): End-2 (last 2 steps) best FID 0.3580. Paper's claims: SOTA on all motion-quality and condition-alignment metrics; CM has slightly lower acceleration but much worse foot sliding and skill accuracy (52.9%).

## 8. Code / data availability
"Our data and model will be disseminated to the community" — no URL, repo, or checkpoint stated in the main text. None stated (as of this text extract).

## 9. Leakage & limitations
- **Train/test protocol weak:** 9:1 split with no player- or session-disjointness stated; the same 30 players likely appear in both splits, so FID/skill-accuracy may reflect memorized performer styles.
- **FID scale inconsistency** between Table 1 (0.18–0.36) and Tables 2–4 (0.34–0.40) is unexplained — different evaluation slices or conditioning regimes; comparisons across tables are invalid.
- **No physics:** pure kinematics; foot contact is a learned binary label, not a physical constraint; Shoot ball flights were reconstructed offline in Unity, not generated.
- **Single player only** — no multi-agent interaction, which is the entire content of real sports tracking (acknowledged in §5.4 as future work).
- **Objective mismatch with GSE:** metrics (FID, foot sliding, skill accuracy of synthetic avatars) measure visual plausibility for games, not predictive accuracy of anything real.
- **External validity to NFL:** none on the data side — GSE has no mocap pipeline and no product that renders animated players. The method family (diffusion for motion) is already covered in this program by papers 0380 and 2503.18589, which operate on real tracking data.

## 10. GSE overlap
Read `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. The map shows **diffusion trajectory modeling (2503.18589) already absorbed** and this wave's own **0380** (tactic-conditioned trajectory diffusion on real tracking data) — both are the analytics-relevant members of this method family. No repo work involves motion synthesis, mocap, or character animation. The one portable idea — the two-stage trajectory-then-motion conditioning and the contact-event loss — is subsumed by 0380's trajectory-diffusion work, which uses real NGS-relevant data. Status: **duplicate-of-family / no new capability** for GSE's prediction products.

## 11. GSE implementation spec
No build recommended (REJECT). If a future GSE product ever needs synthetic tracking augmentation (e.g., generating rare-event receiver trajectories to train a contested-catch classifier), the relevant template is 0380 (diffusion on real tracking data), not this paper's mocap-to-avatar pipeline. Effort estimate: not applicable.

## 12. Reproducible test
Not applicable — REJECT. The paper's own benchmark (Soccer-X) is not yet released per the main text, and its metrics (FID of synthetic avatar motion) have no analog in GSE's prediction stack. No runnable test is proposed because there is no GSE decision this paper informs.

## 13. Acceptance / rejection gate
**Reject** — pre-registered gate: this paper would only be adopted if (a) its dataset and code were actually released (not stated), AND (b) a GSE product required synthetic human-motion rendering (no such product exists). Neither condition holds; the rejection is structural, not a matter of the paper's quality.

## 14. Improvement experiment
One concrete follow-up, framed for whoever does care about sports motion synthesis: **multi-player SMGDiff with ball-possession handoff.** The paper's stated limitation (§5.4) is single-player motion; the natural extension is a two-player (1v1) diffusion where the ball state is shared and contact labels include player–player contact, trained on the existing Soccer-X capture rig with two performers. Technically: extend the representation to x = {h₁, h₂, b, c₁₂}, condition on both players' skill labels, and add a possession-consistency loss (exactly one player has ball control at any frame). This would test whether the contact-guidance machinery generalizes from ball–foot to player–player contact — the missing piece for real game animation. (Noted as out of scope for GSE.)
