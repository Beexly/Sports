# [1576] Counterfactual Explanation-Based Badminton Motion Guidance Generation Using Wearable Sensors (arXiv:2405.11802)

**Citation:** Minwoo Seong, Gwangbin Kim, Yumin Kang, Junhyuk Jang, Joseph DelPreto (MIT CSAIL), SeungJun Kim (GIST, corresponding, 2024). *Counterfactual Explanation-Based Badminton Motion Guidance Generation Using Wearable Sensors*. arXiv:2405.11802. URL: https://arxiv.org/abs/2405.11802
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

LatentCF: latent-space counterfactual optimization that computes the minimal personalized joint-motion edit flipping a stroke-quality classifier to expert level; a genuine causal-explanation method for motion data, complementary to 1572's temporal counterfactuals (this one edits motion morphology, not timing), portable to NGS tracking for "what should the player have done differently" analysis.

## 1. Research question
Novices can't infer how to adjust fast racket-sport movements from watching experts. Can counterfactual explanations — minimal edits to a player's own motion that would have achieved expert-level stroke quality — generate personalized, visualizable joint-level guidance from wearable sensor data without a coach?

## 2. Dataset / schema
MultiSenseBadminton (Seong et al., Scientific Data 2024): 7,763 swings from 25 players (12 beginners, 8 intermediate, 5 experts), 2 stroke types (forehand high clear, backhand drive); multimodal wearables (eye tracking, EMG, foot pressure, joint data); annotations per swing: ball landing location, hit point, stroke quality. This paper uses joint global positions as input, stroke quality as target.

## 3. Method / model
Three components: (1) stroke-quality classifier on joint positions — Transformer selected over Conv1D/ConvLSTM/LSTM via 5-fold CV; (2) LatentCF explainer (Algorithm 1): encode motion x→z with pretrained autoencoder, then Adam-optimize z to minimize CrossEntropy(C(AE-Decode(z)), y′) until predicted target-class probability ≥ τ or max_iter, decode to counterfactual motion x′; (3) Unity visualizer overlaying CF motion as ghost avatar. Baselines: 1NN counterfactuals (nearest target-class neighbor by L1/L2/DTW).

## 4. Equations & assumptions
- Algorithm 1: z ← AE-Encode(x); loop: y_pred ← C(AE-Decode(z)); loss ← CE(y_pred, y′); z ← Adam(z, loss, α) until y_pred ≥ τ.
- Assumptions: autoencoder latent space is smooth enough that gradient steps stay plausible; classifier's decision boundary approximates true quality differences; minimal latent edit ≈ minimal biomechanical edit; stroke quality labels are consistent across annotators.

## 5. Features / target
Features: joint global position time series per swing. Target: stroke-quality class (classifier); for LatentCF, the target is the desired quality class y′ and the output is the counterfactual trajectory x′.

## 6. Validation design
Classifier: 5-fold CV, accuracy/balanced accuracy/F1, majority-class baseline. CF quality: 100 random instances per stroke type, metrics averaged; standard CF metrics — validity (fraction achieving target class), proximity (L1/L2/L∞), plausibility (LOF, Isolation Forest, OCSVM) — plus motion-specific: DTW closeness, Fréchet Pose Distance (FPD), Fréchet Motion Distance (FMD). No user study (deferred to future work); no test that following guidance improves real strokes.

## 7. Numerical results / baselines
Classifier (5-fold): forehand — Transformer acc 85.12 (1.62), BalAcc 85.67 (1.57), F1 85.22 (1.60) vs LSTM 84.29/84.84/84.40, ConvLSTM 80.83/78.41/79.74, Conv1D 79.97/76.82/78.94, baseline 59.17/50.00/44.01; backhand — Transformer 87.89 (0.89)/88.93 (0.76)/88.22 (0.87). LatentCF vs 1NN (forehand): validity 1.0 (all); L1 3.41 vs 5.43–5.54; L2 0.58 vs 0.91–0.92; L∞ 0.23 vs 0.34–0.35; LOF 0.36 vs 0.62–0.63; IF 0.91 vs 0.97–0.98; OCSVM 0.55 vs 0.68–0.69; DTW 3.39 vs 5.36–5.42; FPD 0.33 vs 0.69–0.71; FMD 1.02 vs 2.09–2.16. Backhand shows the same pattern (e.g., DTW 3.02 vs 3.87–3.92, FMD 0.85 vs 1.28–1.33). LatentCF wins on every proximity/plausibility/motion metric.

## 8. Code / data availability
MultiSenseBadminton dataset public (Scientific Data); demo video https://youtu.be/o7bDM5yRbtw. No training-code link in the paper.

## 9. Leakage & limitations
Only 5 experts in the dataset — the "expert" manifold is thin. Validity = 1.0 for all methods (including 1NN) suggests the classifier is easy to satisfy, weakening validity as a discriminator. No evidence that athletes can or do follow the ghost-avatar guidance to real improvement (no user study). Badminton-specific; joint-position input assumed available. Augmentation details for classifier training not fully specified.

## 10. GSE overlap
Causal-lane method with no corpus precedent: 1572 (VTCS) does temporal counterfactuals (when to initiate); this does morphological counterfactuals (how to move) via latent optimization — the two compose into a full "what-if" toolkit for tracking data. No existing GSE work generates counterfactual motion explanations.

## 11. GSE implementation spec
Build `gse_latentcf.py`: (1) train a Transformer classifier on NGS tracking to predict play success (e.g., route → target & catch, or ball-carrier → broken tackle) from joint/position trajectories; (2) train a trajectory autoencoder on the same data; (3) for failed plays, run Algorithm 1 to generate the minimal counterfactual trajectory that flips the prediction to success; (4) two outputs: (a) @GalaxySportsHQ film-room content — ghost-overlay "the 20 cm wider stem that makes this a completion"; (b) a counterfactual-gap feature per player (mean latent distance between actual and successful-counterfactual routes) fed into GSE's reception/prop models as a route-running quality signal orthogonal to raw athleticism.

## 12. Reproducible test
Reproduce Table II on MultiSenseBadminton (public): LatentCF must beat 1NN-DTW on DTW-closeness and FMD by ≥25% relative. Then port to NGS: train the success classifier on 2024 routes (gate: 5-fold BalAcc ≥ 0.70), generate counterfactuals for 200 failed routes, and gate on plausibility — mean LOF/OCSVM of CF trajectories within 1 SD of real successful routes. If CF trajectories are implausible (outside the real manifold), the explainer is unusable for content — stop.

## 13. Acceptance / rejection gate
Accepted: genuine counterfactual (causal-explanation) method with decisive quantitative wins over baselines on all 9 proximity/plausibility/motion metrics, public dataset, and a concrete two-output NGS port (content + model feature) that complements 1572. Thin expert pool and missing user study limit the paper's own coaching claims but not the method's portability.

## 14. Improvement experiment
Close the paper's open loop with the user study they defer: test whether athletes shown LatentCF ghost guidance improve stroke quality faster than a 1NN-guidance control group (pre-registered, blinded rating). For GSE, the analogue A/B is content-side: test whether film-room posts built on LatentCF counterfactuals outperform standard chart posts on engagement — validating that minimal-edit counterfactuals are the more compelling explanatory format.
