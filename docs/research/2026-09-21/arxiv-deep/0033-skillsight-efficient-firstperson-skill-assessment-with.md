# [0033] SkillSight: Efficient First-Person Skill Assessment with Gaze (arXiv:2511.19629v2)

**Citation:** Chi Hsuan Wu, Kumar Ashutosh, and Kristen Grauman (2025). *SkillSight: Efficient First-Person Skill Assessment with Gaze*. arXiv:2511.19629v2. URL: https://arxiv.org/abs/2511.19629v2
**Ledger completed:** 2026-09-21. **Read:** full local text (2,449-line extract: abstract, §§1–5, Tables 1–4, Appendices A–E, references). All quotes and numbers below are taken verbatim from the local text.
**Verdict:** REJECT — strong computer-vision paper, but it is egocentric smart-glasses skill assessment (video+gaze → skill labels); GSE has no first-person video or gaze data and no skill-assessment lane, so nothing transfers.

## 1. Research question
Automatic skill assessment from first-person (egocentric) data is a bottleneck for AI-supported skill learning on smart glasses. The paper's hypothesis: skill level is evident not only in how a person performs an activity (video) but also in how they direct attention (gaze). It asks whether a two-stage framework — jointly modeling gaze + egocentric video in a teacher, then distilling to a gaze-only student — can match video-based skill assessment accuracy while eliminating continuous video processing (power + privacy win). (Abstract; §1)

## 2. Dataset / schema
Three datasets spanning cooking, music, and sports (§3.4): **Ego-Exo4D** (5,048 videos, 740 participants; scenarios soccer, basketball, rock climbing, dance, music, cooking; labels novice / early expert / intermediate expert / late expert; 10% of official training set held out for validation, official validation set used for testing); **Multisense Badminton (MSB)** (7,763 badminton forehand/backhand swings from 25 players; labels beginner / intermediate / expert; official cross-validation split); **Expert-Novice Soccer** (288 recordings from 8 subjects performing 9 soccer movements — kicks, dribbling, juggling; labels expert / novice; official cross-validation; no video modality). No subject overlap between train/test splits. All are public research datasets; skill labels were provided by expert annotators (domain coaches/teachers). Ego-Exo4D and Expert-Novice Soccer include 3D gaze; MSB provides 2D gaze. No access URLs given in the paper text.

## 3. Method / model
Two-stage multimodal framework:
- **SkillSight-T (teacher):** integrates egocentric video and gaze through three components — (1) gaze↔action interaction via a gaze-induced attention map in the first spatial encoder of the visual encoder (eqs. 1–3); (2) attended-object sequence: gaze-cropped image regions encoded by pretrained image encoder fI then temporal encoder fT (eq. 4); (3) gaze dynamics: 3D gaze trajectory (fixation points, direction, depth, glass rotation/translation, normalized relative to the first frame) encoded by transformer encoder fg (eq. 5). Fused by 3-layer MLP fm into `Ŝ = F_v(V,G) = f_m([e_v, e_c, e_g])` (eq. 6).
- **SkillSight-S (student):** gaze-only input (camera off at inference); transformer encoder fs with distillation token t_dis (aligns student features to teacher via eq. 8) and action-recognition token t_act (subtask classification, e.g., dribbling vs. penalty kick) — `ê_s, Ŝ, â = f_s([t_cls, t_dis, t_act, G])` (eq. 7).
- Architecture: both teacher and student process **16-frame clips at 2 FPS**; **TimeSformer pretrained on EgoVLPv2** as the video encoder fV; **DINOv2** as the image encoder fI; fs and fg are **4-layer transformer encoders with 768-dimensional hidden size**; fm is a **3-layer MLP**; long videos are split into 10 equally spaced clips with segment predictions averaged.
- Training: SkillSight-T for **15 epochs using SGD (learning rate 5×10⁻³, batch size 8)**; SkillSight-S for **10 epochs using AdamW (learning rate 1×10⁻⁴, batch size 32)**; all on **8 NVIDIA Quadro RTX 6000 GPUs**. SkillSight-S inference: **1.6 ms per sample** on a single GPU.

## 4. Equations & assumptions
- Gaze-induced attention map (eq. 1): `A_g^t[m,n] = exp(−d_{c^t}(m,n)/(2σ²)) / Σ_{m′,n′} exp(−d_{c^t}(m′,n′)/(2σ²))`, with `d_{c^t}(m,n) = ||(m,n) − c^t||²`, `c^t = ⌊g_{2d}^t / L⌋` (Gaussian centered on the gaze patch in the first spatial encoder of the visual encoder).
- Modified attention (eq. 2): `A_m^t = σ(A_v^t + λ_c A_g^t)` (σ = softmax; λ_c a learnable per-scenario parameter).
- Video embedding (eq. 3): `e_v = f_V(V, g_{2d})`.
- Gaze-crop encoding (eq. 4): `e_c = f_T([f_I(v_c^1), …, f_I(v_c^T)])`.
- Gaze-dynamics embedding (eq. 5): `e_g = f_g(G)`.
- Teacher prediction (eq. 6): `Ŝ = F_v(V,G) = f_m([e_v, e_c, e_g])`, trained with standard cross-entropy `L_CE`.
- Student forward (eq. 7): `ê_s, Ŝ, â = f_s([t_cls, t_dis, t_act, G])`.
- Distillation loss (eq. 8): `L_dis = ||f_p(ê_s) − f_t([e_v, e_c, e_g])||_1` (f_p aligns student features, f_t projects teacher features to mitigate modality-specific signals).
- Student loss (eq. 9): `L_student = L_CE + λ_dis L_dis + λ_act L_act`; λ_dis and λ_act are set with validation data (values not given).
- Power model (eq. 10): `P = αN/T + βB/T + Σ_m γ_m δ_m`, with α = 4.6 pJ/MAC, β = 80 pJ/byte, γ_rgb = 35 mW, γ_IMU = 1.2 mW, γ_audio = 0.3 mW, γ_eye = 7.8 mW (all values from smart-glasses hardware measurements cited by the paper).
- **Assumptions (stated):** gaze behavior correlates with skill level (citing cognitive-science literature: volleyball experts fixate earlier on ball contact; skilled soccer players allocate more gaze to surroundings; the "quiet eye" final fixation marks experts across sports, surgery, driving, music); eye-tracking cameras consume far less power than RGB cameras and mitigate privacy concerns; distillation is feasible because "people exhibit consistent gaze patterns when observing certain objects or performing specific actions"; gaze signals normalized relative to the first frame to avoid facing-direction bias.

## 5. Features / target
Inputs: egocentric RGB video clips (teacher only), gaze signals (3D fixation points, 3D gaze direction, 2D gaze projection g_2d ∈ R², gaze depth, glass translation/quaternion rotation), gaze-cropped image regions, body motion (teacher on Expert-Novice Soccer only). Target: **skill/proficiency level** (4 classes on Ego-Exo4D: novice / early expert / intermediate expert / late expert; 3 classes on MSB: beginner / intermediate / expert; binary expert/novice on Expert-Novice Soccer). Horizon: per-clip (16 frames @ 2 FPS ≈ 8 s), averaged over 10 clips for long videos.

## 6. Validation design
Standard accuracy (%) plus estimated power consumption (mW) as the efficiency metric (§4, Appendix D). Baselines: video-based skill/action models adapted to skill assessment (TimeSformer, Skillformer, E2GoMotion, EgoExoLearn, Beholder, majority vote), power-efficient methods (X3D-XS, EgoDistill, EgoTrigger), plus gaze-only and motion-only transformer baselines on Expert-Novice Soccer. Appendix B ablations: teacher component ablation (Table 3) — each of the three components adds a clear gain, full model 50.1% vs. 47.2% with gaze attention only, 37.0% with trajectory encoder alone; student loss ablation (Table 4) — Gaze-only baseline 37.0%, full SkillSight-S 44.4%, w/o distillation 40.0%, w/o action recognition 40.7%. Paper text claims "SkillSight-T outperforms a naive end-to-end model by 8%".

## 7. Numerical results / baselines
Quoted exactly from Table 1 (accuracy %, power mW):
- Ego-Exo4D overall: **SkillSight-T (V+G) 50.1** @ 943 mW vs. TimeSformer (V) 45.5 @ 697.5, Skillformer 42.4, EgoExoLearn (V+G) 42.3, Beholder 34.1, E2GoMotion 34.9, majority vote 32.3. Per-scenario T: soccer 81.4, basketball 55.2, bouldering 28.9, music 50.0, dance 56.7, cooking 58.5 — best in all seven. MSB badminton: **SkillSight-T 53.1** vs. TimeSformer 50.5, Skillformer 44.0.
- Paper text: "SkillSight-T outperforms all baselines across seven scenarios in both datasets, achieving an average relative gain of 10% over the strongest baseline" (abstract: "outperforms previous video-based methods by 5% (10% relative)").
- **SkillSight-S (G) 44.4** @ 9.5 mW overall (per-scenario: soccer 79.1, basketball 42.0, bouldering 34.6, music 52.8, dance 44.1, cooking 47.2, badminton 47.0) — "surpasses all power-efficient methods in overall accuracy (44.4%) as well as 5 of the 7 individual scenarios"; "still ranks second in overall accuracy" even against power-hungry baselines, "while using 14× to 73× less power."
- Efficiency: SkillSight-S vs. TimeSformer — **73× lower energy cost with only a 1.1% drop in accuracy** (45.5 → 44.4); reduces power vs. the best power-efficient baseline (EgoDistill, 16.5 mW) by 43%.
- Table 2 (Expert-Novice Soccer): **SkillSight-S (G) 72.6** vs. Motion+Gaze 73.3, Motion-only 71.2, Gaze-only 66.0, majority vote 50.0; "outperforms both the gaze-only and motion-only baselines, showing the effectiveness of our distillation technique."
- Project page: https://vision.cs.utexas.edu/projects/skillsight/ (paper footnote).

## 8. Code / data availability
Project page listed (URL above). No code link stated in the local text; the local text has a supplementary video and appendices (A–E) but no stated code release. Datasets are public benchmarks (Ego-Exo4D, MSB, Expert-Novice Soccer).

## 9. Leakage & limitations
- **No NFL applicability:** requires egocentric video + eye-tracking gaze from the performer — data that does not exist for NFL players and cannot be collected at scale. Broadcast All-22 is third-person; gaze is unobservable.
- **Label subjectivity:** "skill level" labels are coarse proficiency bins (novice→expert), not calibrated performance measures; transfer to fine-grained athletic skill is untested.
- **Power numbers are estimates** from a model (eq. 10, Appendix D), not on-device measurements on smart glasses; no subject overlap between splits is the main leakage control.
- **External validity:** sports covered are soccer (expert/novice binary), badminton, basketball — no American football; the gaze→skill link in a fast team sport with helmets occluding eyes is speculative.

## 10. GSE overlap
None. GSE's corpus has no egocentric-vision, gaze, or skill-assessment work; the multimodal-fusion area of the ML brief (area 13) concerns text/news features, not video. The knowledge-distillation pattern (teacher→student across modalities) is a generic ML technique already well known. No duplicate, no extension, no new capability for GSE's prediction lanes.

## 11. GSE implementation spec
None warranted (REJECT). The only abstract transplant — distilling a tracking-data-rich teacher into a box-score-only student — is already GSE's standing practice in spirit (NGS-replacement spec: reproduce tracking metrics from public data), and this paper adds no method for it beyond standard distillation.

## 12. Reproducible test
Not applicable to GSE's data. The paper's own result is reproducible from public datasets + project page if ever needed.

## 13. Acceptance / rejection gate
**Rejected:** no path from egocentric gaze/video skill classification to NFL game, prop, or DFS prediction with GSE's data sources (nflverse, charting, odds). No test to run.

## 14. Improvement experiment
None for GSE. Within its own lane, the natural follow-up is testing whether the gaze-only student transfers across activities (train on soccer, test on basketball) to see if gaze→skill patterns are sport-general — the paper's "first time" claim across cooking/music/sports invites exactly this generalization test; Appendix E's behavior-level interpretations (gaze-depth differences in soccer/bouldering, hand-fixation differences in music) provide testable behavioral hypotheses.
