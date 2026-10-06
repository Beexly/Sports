# [0504] Velocity Disambiguation for Video Frame Interpolation (arXiv:2311.08007v4)

**Citation:** Zhihang Zhong, Yiming Zhang, Wei Wang, Xiao Sun, Yu Qiao, Gurunandan Krishnan, Sizhuo Ma, and Jian Wang (2023). *Velocity Disambiguation for Video Frame Interpolation*. arXiv:2311.08007v4. URL: https://arxiv.org/abs/2311.08007v4
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 4,821 lines).
**Verdict:** REJECT — frame interpolation is a generative-video technique with no path into GSE's prediction models, and Garrett's standing rule (2026-09-15) forbids substituting generated/interpolated footage for real game footage in content.

*Title note: the assignment lists "Velocity Disambiguation for Video Frame Interpolation"; the cached v4 header reads "Disambiguation for Video Frame Interpolation". Same work and authors — not a wrong-paper block.*

## 1. Research question
How can video frame interpolation (VFI) resolve velocity ambiguity — the problem that a single pair of frames admits multiple plausible intermediate motions — to synthesize sharper, more accurate in-between frames? The paper introduces a distance-map formulation plus iterative reference-based estimation and a multi-frame refiner.

## 2. Dataset / schema
- Training: Vimeo90K septuplets — 91,701 seven-frame sequences at 448×256 resolution, drawn from 39,000 source clips.
- Evaluation: Vimeo90K test split, Adobe240, and X4K1000FPS.
- Base VFI models tested: RIFE, IFRNet, AMT-S, EMA-VFI.
- Metrics: PSNR, SSIM, LPIPS, NIQE; plus a user study with 30 anonymous participants (exact ranking percentages not printed in text).
- Project/code page (as stated): https://zzh-tech.github.io/InterpAny-Clearer/

## 3. Method / model
Core contribution — the distance map, which parameterizes where along the motion trajectory an intermediate frame lies:
- Iterative reference-based estimation: repeatedly refine the distance map using reference frames.
- CPFlow continuous motion maps for dense correspondence.
- Multi-frame refiner: uses several input frames plus the estimated distance map to synthesize the target frame.
- Evaluated as a drop-in addition to existing VFI backbones (RIFE, IFRNet, AMT-S, EMA-VFI).

## 4. Equations & assumptions
Distance map (faithful to paper):
D_t(x,y) = ||V_{0→t}(x,y)|| · cos θ / ||V_{0→1}(x,y)||
where V_{0→t} is the motion field from frame 0 to intermediate time t, V_{0→1} the full inter-frame motion, and θ the angle between them.

Assumptions: (a) motion between frames is well described by dense optical-flow fields; (b) the scalar distance ratio resolves the directional ambiguity; (c) CPFlow maps are sufficiently accurate references for iteration; (d) PSNR/SSIM/LPIPS/NIQE improvements correspond to perceptually better interpolation (partially checked by the 30-person user study).

## 5. Features / target
- Inputs: pairs (or short sequences) of video frames.
- Target: pixel values of the interpolated intermediate frame(s). Horizon: sub-frame temporal upsampling (e.g., 30fps → 240fps equivalent).

## 6. Validation design
- Train on Vimeo90K; test on Vimeo90K test, Adobe240, X4K1000FPS.
- Ablations: base model vs +distance map vs +distance map +reference-based estimation vs +multi-frame refiner vs ground-truth-map refiner (upper bound).
- Metrics: PSNR, SSIM, LPIPS, NIQE; human preference study (n=30, exact numbers not printed).

## 7. Numerical results / baselines
RIFE on Vimeo90K (uniform map), LPIPS / NIQE:
- Base: 0.105 / 6.663.
- +Distance map: 0.092 / 6.344.
- +Distance + reference-based estimation: 0.086 / 6.220.

Multi-frame RIFE (PSNR / SSIM / LPIPS / NIQE):
- Base: 28.22 / 0.912 / 0.105 / 6.663.
- Estimated-map refiner: 28.34 / 0.928 / 0.089 / 6.173.
- Ground-truth-map refiner (upper bound): 31.63 / 0.952 / 0.062 / 5.990.

Cost on A100 at 448×256:
- RIFE + distance: 0.03 s, 10.21 MB.
- Multi-frame: 0.06 s, 20.46 MB.
- Estimated-map multi-frame: 0.10 s, 30.68 MB.

## 8. Code / data availability
Project page: https://zzh-tech.github.io/InterpAny-Clearer/ (as stated). Vimeo90K is public.

## 9. Leakage & limitations
- Gains are on synthetic interpolation benchmarks; no test on sports broadcast footage, which has fast nonrigid motion, occlusions, and compression artifacts that break optical-flow assumptions.
- The ground-truth-map upper bound (PSNR 31.63) shows how far the estimated map still is from ideal — real-world gains are roughly half the headline ablation delta.
- User study (n=30) is small and its exact numbers are not printed.
- 448×256 evaluation resolution is far below broadcast 1080p; cost/quality at full resolution not reported.
- External validity to GSE: none for prediction. For content, interpolation *creates* footage that was never filmed — the opposite of the real-clips requirement.

## 10. GSE overlap
Per the existing-research map (2026-09-21) and standing rules: GSE has no video-generation lane, and Garrett's HARD rule (AGENTS.md, 2026-09-15) states: never substitute AI-generated/interpolated footage for real game footage; sports clips must be real, short (2–4s), transformative, commentary-led. This paper's entire output class — synthesized intermediate frames — is prohibited material for GSE content. There is no prediction-modeling application: VFI features do not feed win/spread/total models. **No overlap; no transfer path.**

## 11. GSE implementation spec
None — verdict is REJECT. No build plan; building this would violate the standing video rule.

## 12. Reproducible test
Not applicable — REJECT. There is no GSE prediction task this could be tested against.

## 13. Acceptance / rejection gate
REJECT. Criteria: (a) zero applicability to win/spread/total/prop modeling; (b) the only conceivable use (smoother highlight clips) is explicitly prohibited by Garrett's 2026-09-15 standing rule against generated/interpolated footage standing in for real game footage. Both conditions are dispositive.

## 14. Improvement experiment
None for GSE. Within its own field, the natural follow-up is evaluating the distance-map refiner on sports broadcast footage at 1080p with flow-failure diagnostics — but that work belongs to video researchers, not to GSE.
