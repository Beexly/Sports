# [1873] Learning Representation for Anomaly Detection of Vehicle Trajectories (arXiv:2303.05000)

**Citation:** Ruochen Jiao, Juyang Bai, Xiangguo Liu, Xiaowei Yuan, Qi Zhu (Northwestern), Takami Sato, Qi Alfred Chen (UC Irvine) (2023). *Learning Representation for Anomaly Detection of Vehicle Trajectories*. arXiv:2303.05000. URL: https://arxiv.org/abs/2303.05000
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT
Its unsupervised semantic-latent-space autoencoder (disentangling intention, aggressiveness, and residual motion factors) gives GSE an interpretable player-movement embedding plus an anomaly detector for tracking-data errors and genuinely unusual plays (broken coverages, injury-risk collisions).

## 1. Research question
Adversarial/natural perturbations to history trajectories can mislead trajectory predictors ([5]: PGD attacks causing >5 m displacement errors). Can learned representations detect anomalous trajectories — both when anomaly patterns are known (supervised contrastive) and when they are not (unsupervised semantic reconstruction)?

## 2. Dataset / schema
**Argoverse 1** (30K+ scenarios, Miami/Pittsburgh) and **Argoverse 2** (six cities, longer scenarios); each scenario = road graph + vehicle trajectories; history = 20 waypoints / 2 s. Anomalies synthesized via white-box PGD attacks: random anomalies (≥5 m avg displacement error) and lateral directional anomalies (≥1.5 m lateral error), D(α,R) = (p_α − s_α)ᵀ·R(s_{α+1}, s_α).

## 3. Method / model
**Supervised contrastive:** feature extractor F (1-D conv over trajectories + map graph, cf. [2]) → 128-D features → CL encoder E → 32-D latent. Per mini-batch: N normal + M anomalous scenarios → N(N−1) positive pairs (normal–normal), MN negative pairs (normal–anomalous). NCE (M+1)-way softmax: L_ij = −log[exp(s_niᵀs_nj/τ)/(exp(s_niᵀs_nj/τ) + Σ_m exp(s_niᵀs_am/τ))]; L = 1/(N(N−1)) Σ_{i,j≠i} L_ij. SVM on 32-D latent for online detection.
**Unsupervised semantic reconstruction:** adversarial autoencoder; latent space partitioned into three semantic vectors — intention (3 classes), aggressiveness, remaining. AAE discriminators regularize each partition toward target distributions; semantic loss Loss_sem(z,g) = −Σ_{i=1}^{3} g_intent log z_intent + (g_agg − z_agg)². Decoder reconstructs trajectories with smooth-L1 (Huber) loss; anomaly score = reconstruction error vs threshold.

## 4. Equations & assumptions
- L_ij, L as above; D(α,R) directional-deviation metric.
- Loss_sem(z,g) = −Σ g_intent log z_intent + (g_agg − z_agg)²; Loss_recon = smooth-L1.
- Assumptions: anomalous trajectories are poorly compressible (reconstruction assumption); intention/aggressiveness are meaningful, learnable semantic factors; map context + agent interactions must be embedded jointly with the trajectory; PGD-synthesized anomalies approximate real-world anomaly distribution.

## 5. Features / target
Inputs: past trajectories + map graph. Supervised targets: normal/anomalous class pairs (contrastive). Unsupervised targets: reconstruction of input trajectories + semantic factor labels (intention, aggressiveness).

## 6. Validation design
- Metrics: ROC AUC, PR AUC, F1 (imbalanced-data aware).
- Supervised: vs naive SVM on acceleration series and other representations; fixed SVM head for fair comparison (Tables I/II, Fig. 4 ROC).
- Unsupervised: vs one-class SVM on trajectory space and TS2Vec (Tables III/IV).
- Components: feature-extractor vs encoder contributions (Tables V/VI); cross-pattern generalization: train on one anomaly pattern, test on the other (Fig. 5).

## 7. Numerical results / baselines
- Supervised CL method "significantly" improves anomaly detection over baselines on both Argoverse datasets (Tables I/II; ROC curves Fig. 4).
- Unsupervised semantic-AAE beats OC-SVM and TS2Vec (Tables III/IV).
- Cross-pattern generalization: lateral directional anomalies "relatively easy" to generalize from; full cross-pattern ROC in Fig. 5.
- Component study: both the GNN feature extractor and the CL/semantic encoder contribute (Tables V/VI).
- Exact AUC/F1 numbers are figure-rendered (not text-recoverable); qualitative rankings reported.

## 8. Code / data availability
No code link stated in extracted text. Data: Argoverse 1/2 (public).

## 9. Leakage & limitations
- Anomalies are PGD-synthesized, not real-world — the "unseen pattern" generalization is still within the attack family.
- Exact numeric results unrecoverable from HTML (tables rendered as images).
- Supervised method needs labeled anomalies; the unsupervised method's semantic factors (intention classes) are driving-specific and need football redefinition.
- No online latency measurement despite "online anomaly detection" framing.

## 10. GSE overlap
GSE ingests noisy 10Hz tracking with occasional sensor glitches and must distinguish data errors from genuinely unusual plays. This paper gives both: (a) an unsupervised anomaly detector for tracking-data QA (reconstruction error flags bad frames without labels); (b) a semantic latent space — intention (route assignment?) + aggressiveness (closing speed/physicality) + residual — as interpretable player-movement factors, a NEW embedding flavor vs 1862–1872's black-box representations. The adversarial-robustness angle also matters: GSE's forecasters should be stress-tested against perturbed histories (opponent game-planning is adversarial).

## 11. GSE implementation spec
1. Data: NFL 10Hz tracking; scenarios = plays with field context (yard lines, down/distance as the "map graph" analog).
2. Train semantic AAE: encoder → latent partitioned into intention (route-concept class, charted), physicality/aggressiveness (speed/accel-derived), residual; decoder reconstructs trajectories (smooth-L1); discriminators regularize partitions.
3. Deploy two heads: (a) reconstruction-error anomaly flag for data QA; (b) semantic factors as features for GSE prop models.
4. Supervised CL variant: contrast normal plays vs synthetically perturbed plays (PGD-style waypoint jitter on tracking) to harden GSE's trajectory forecaster.
5. Effort: ~2.5 engineer-weeks.

## 12. Reproducible test
Dataset: 2023–2024 NFL tracking, weeks 1–12 train, weeks 13–18 test. Test A: inject synthetic waypoint noise into held-out plays; measure anomaly-detection ROC AUC of the semantic-AAE vs a raw-acceleration baseline. Test B: semantic-factor interpretability — correlate the "intention" partition with charted route concepts (adjusted mutual information). Run target: <48h on 1 GPU.

## 13. Acceptance / rejection gate
ADOPT if: (a) anomaly-detection ROC AUC ≥ 0.85 on synthetic perturbations (vs ≤ 0.70 for the acceleration baseline), AND (b) the intention partition achieves AMI ≥ 0.30 with charted route concepts. REJECT if (a) fails.

## 14. Improvement experiment
Beyond the paper: (1) football-native anomaly synthesis — instead of PGD noise, generate anomalies by swapping a player's trajectory with a different play's same-position trajectory (context-inconsistent but realistic), testing whether the detector learns contextual rather than noise-level anomalies. (2) Adversarial training loop: harden GSE's ball-carrier forecaster by training on AAE-flagged hardest normal plays (high reconstruction error but legitimate), testing whether "legitimate hard examples" improve tail performance. Hypothesis: context-swap anomalies produce a detector that flags busted coverages, not just sensor noise.
