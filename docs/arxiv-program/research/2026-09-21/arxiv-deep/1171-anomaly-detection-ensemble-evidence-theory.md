# 1171 Anomaly Detection using Ensemble Classification and Evidence Theory (arXiv:2212.12092)

**Citation:** Fernando Arevalo, Tahasanul Ibrahim, Christian Alison M. Piolo, Andreas Schwung (2022). *Anomaly Detection using Ensemble Classification and Evidence Theory*. arXiv:2212.12092v1. URL: https://arxiv.org/abs/2212.12092
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, v1, ~20 pp + references, via arxiv.org/pdf; body, references, and author biographies read to EOF).
**Verdict:** ADAPT

Adapt the conflict-based anomaly mechanism for GSE's pick-selection/abstention lane: fuse the component-model forecast distributions with Dempster–Shafer/Yager-style combination, and when combined conflict/uncertainty crosses calibrated thresholds, flag the game as a "regime anomaly" — abstain or shrink the stake instead of trusting the ensemble point forecast. Also adapt the four-criterion pool selection (performance + class specialization + diversity + pre-cut) for ensemble construction. Do NOT copy the chemical-fault classification setup itself; the transfer is the uncertainty-as-anomaly signal.

## 1. Research question
Can ensemble classification fused with evidence theory (Dempster–Shafer / Yager) simultaneously deliver (a) binary and multiclass classification of known conditions and (b) detection of unknown/anomalous conditions, using fusion conflict as the anomaly signal? Tested on the Tennessee Eastman (TE) chemical-process benchmark: 21 fault cases + normal condition, separating "easy", "medium", "hard" fault sets.

## 2. Dataset / schema
Tennessee Eastman simulation benchmark (Downs & Vogel, via Chen 2019 dataset): 52 input variables; 21 fault cases + normal condition (case 0). 480 training samples per case; 960 testing samples per fault case (160 normal + 800 faulty). Hard faults: 3, 9, 15, 21. Train/validation split: 70/30. Data split into a "training approach" (individual classifiers trained, performance + uncertainty recorded) and an "inference approach" (selected ensemble classifiers evaluated on known + injected unknown/anomaly fault cases).

## 3. Method / model
ECET (Ensemble Classification using Evidence Theory), two phases:
- Training phase: train a pool of 10 classifiers — ML-based (decision tree, SVM, KNN, Naive Bayes, AdaBoost) and NN-based (AlexNet, LeNet, VGG, MLP, custom DNN). For each classifier, record validation performance AND per-sample uncertainty.
- Evidence representation: each classifier's prediction is converted to an evidence mass vector m = [p_1·w_1, …, p_n·w_n, U] with total uncertainty U = 1 − p·w (weights w from a data-driven weighting combining each classifier's F1 performance, expert-class specialization, and diversity; optional pre-cut removes poor classifiers before fusion).
- Pool selection: a "combined expert-diversity" strategy selects a subset of classifiers per ensemble (binary or multiclass, ML/NN/hybrid mixes), systematically reducing the number of possible combinations while keeping diverse ensembles.
- Inference: Dempster's rule of combination (DSET) fuses the evidence at decision level into the ensemble prediction; anomaly detection runs in parallel — an anomaly is emitted when BOTH Dempster–Shafer and Yager uncertainties exceed their maximum thresholds.
- Uncertainty measures: product-of-complements UQ_P = Π_i(1−P_i); Dempster–Shafer conflict UQ_DS = b_k (conflict mass on the empty set); Yager conflict UQ_Y = q(φ) (conflict assigned to the universal frame). During training, UQ assesses each classifier's learning capability (low UQ + high performance = reliable, e.g. SVM; high UQ + low performance = unreliable); during inference, UQ tracks uncertainty changes as test data flows in — rising conflict = likely unknown condition.

## 4. Equations & assumptions
- Evidence mass: m = [p_1 w_1, …, p_n w_n, U], U = 1 − p·w (probabilities p from the classifier, weights w from F1 + specialization + diversity; masses sum to 1).
- Uncertainties: UQ_P = Π_i(1−P_i); UQ_DS = b_k (DS conflict); UQ_Y = q(φ) (Yager conflict).
- Anomaly rule: anomaly ⟺ (UQ_DS > τ_DS^max) AND (UQ_Y > τ_Y^max) — a hybrid strategy using DSET conflict for classifier combination and both DSET + Yager uncertainty for anomaly tracking.
- Assumptions: classifiers trained once (static behavior); mutual exclusion between faults (single-condition labels; combinations of faults are a stated constraint); ensemble members' outputs are commensurable probability vectors; anomaly = "unknown condition" injected at test time.

## 5. Features / target
52 TE process variables (features); targets: normal vs each fault (binary ECs, e.g. (0,1), (0,3)) or normal + fault subsets (multiclass ECs, e.g. (0,1,2,6,12), (1,2,6,12)). For anomaly detection the "target" is the injected unknown fault case (e.g. fault 7 injected into ECs trained on (0,1), (0,1,2,6,12), (0,3)).

## 6. Validation design
Full pipeline: (1) train 10 classifiers on each fault-case subset, 70/30 train/val; (2) rank by F1, uncertainty, specialization, diversity; pre-cut option; (3) build candidate ECs (binary + multiclass; easy/medium/hard case sets; ensemble sizes 2–10); (4) evaluate classification (F1) and anomaly detection (F1/FDR) on held-out test sets with injected unknown faults; (5) compare against literature (SVM, MPLS, MLP, ACGAN-MLP, MDAC for classification; Top-K DCCA, DPCA-DR, PCA, AE, AAE, MOD-PLS for anomaly detection); (6) report inference-time relative cost.

## 7. Numerical results / baselines
- Individual vs ensemble (easy cases): best individual classifiers ~0.94–0.95 F1; selected ensembles reach 0.97 (multiclass). Easy binary ECs: 0.98–0.99.
- Hard cases: hard multiclass ECs performed badly — ~0.22–0.23 F1 vs 0.50–0.58 for individuals (poor training + conflicting evidence); hard binary ECs: ~0.62–0.63 vs 0.50–0.58 for individuals (ensemble helps).
- Cost/performance: EC M5 (binary, trained (0,1)) vs H5-2 (multiclass (0,1,2,6,12)): comparable avg F1 (0.62 vs 0.63) with relative inference times 1.9% vs 92.9% — the small binary ensemble is nearly as good at ~1/50th the cost.
- vs literature — classification: binary FDR — H5-1 83.57% vs SVM 81.49% vs MPLS 83.93% (comparable, mixed on medium/hard faults); multiclass on hard faults (1,2,6,12) F1 — M2/M5/H5-3 = 98/99/99% vs MLP 70%, ACGAN-MLP 83.25%, MDAC 88.25% (H5-3: 99%/98% on faults 1/12 vs MDAC 83%/71%).
- vs literature — anomaly detection: on hard faults (3,9,15,21), binary M5 60.21% / H6-2 55.93% F1 vs Top-K DCCA 50.04%; multiclass H5-2/H6-2/H7-2 = 63.69/63.17/63.45% vs DCCA; across all faults FDR — M3 87.97% vs DPCA-DR 83.51%, PCA 76.68%, AE 76.56%, AAE 78.55%, MOD-PLS 83.83%; M3 on hard faults: 91.88/90.75/91.25/94.13% vs best literature (AAE 34.88/33.62%, DPCA-DR 38.5%, MOD-PLS 72.66%).
- Mechanism confirmed: EC M5's DSET uncertainty stays near zero except during injected anomaly (conflicting evidence rises); anomaly detection of M5 catches most anomalous samples; ECs trained on (0,3) with poor classification (0.20–0.30 F1) also have poor anomaly detection (0.03–0.24 F1) — poor classifiers add noise during fusion.

## 8. Code / data availability
No code stated; TE dataset public (Chen 2019, IEEE DataPort). Methods fully specified in text (evidence formulas, pool-selection criteria, threshold rule).

## 9. Leakage & limitations
- Ensemble classifiers' static behavior: classifiers trained once on specific input-space data; reliability = how representative training data is of the input space (direct quote of the authors' constraint).
- Primary assumption: mutual exclusion between faults — a combination of faults is common in real applications (acknowledged limitation).
- Anomaly detection relies on ensemble classification performance; poor classifiers add fusion noise (visible in the (0,3) EC results).
- Anomaly thresholds are maximum thresholds without a stated calibration procedure; the comparison against unsupervised anomaly methods mixes supervised-trained ECs with unsupervised baselines.

## 10. GSE overlap
Direct complement to GSE's pick-selection/abstention lane: GSE has no principled "this game looks strange, don't bet it" trigger. This paper's conflict-based anomaly signal maps cleanly: each component model emits a probability distribution; disagreement among models (DS/Yager conflict) measures how "out-of-distribution" the game is relative to what the ensemble has learned. Connects to 1169's Σw_i D_G(p*∥p_i) "disagreement dividend" — both use aggregation disagreement as a diagnostic — but here the output is a binary anomaly decision with a dual-threshold rule rather than a continuous weight adjustment. Pool selection (performance + specialization + diversity) also strengthens 1162/1169-style ensemble construction.

## 11. GSE implementation spec
1. Per-game ensemble conflict monitor (~1 day): for each game's component-model probability vectors, compute (a) UQ_P = Π_i(1−p_i(win)) and (b) Dempster–Shafer conflict mass b_k from pairwise evidence combination (evidence m_i = [p_i·w_i, (1−p_i)·w_i, 1−w_i] with w_i = trailing-season log-loss skill weight). High combined conflict = models disagree on the outcome in a structured way.
2. Abstention rule (~1 day): calibrate thresholds τ_DS, τ_Y on trailing seasons so that games flagged as anomalies are those where the unflagged ensemble has historically negative CLV; on flagged games, abstain (no pick) or cap stake at a fraction. Expectation: flagged games are where the ensemble's Brier is worst — verify before wiring to sizing.
3. Pool selection audit (~1 day): score each component model on trailing-season F1-equivalent (Brier/log-loss improvement over baseline), class specialization (home-favorite vs underdog vs divisional games), and pairwise diversity (correlation of predicted log-odds); pre-cut models that are dominated on all three before fusion.

## 12. Reproducible test
Dataset: 2024–2025 NFL seasons, component-model probabilities per game + realized outcomes. (a) Conflict calibration: compute per-game DS/Yager conflict on 2024, choose thresholds to flag the top ~10% conflict games; verify on 2025 that flagged games have worse ensemble Brier than unflagged (paired test) and that abstaining on them improves full-season log-loss vs always-pick. (b) Pool audit: compare 2025 Brier of the diversity-selected sub-ensemble vs the full pool and vs best-single-model; expectation: sub-ensemble ≥ full pool at lower inference cost (paper's M5-vs-H5-2 cost lesson). Time-ordered: thresholds and selection from trailing seasons only.

## 13. Acceptance / rejection gate
ADAPT the anomaly-abstention rule if, on 2025 data, games flagged by the dual-threshold conflict rule have statistically significantly worse ensemble Brier than unflagged games AND abstaining on them improves full-season log-loss. REJECT the raw anomaly thresholds if the flagged/unflagged Brier gap is insignificant — conflict without predictive consequence is noise. REJECT the full DSET/Yager machinery in favor of the simpler 1169 disagreement dividend if the dual-threshold rule adds nothing over Σw_i D_G(p*∥p_i).

## 14. Improvement experiment
Beyond the paper: the authors' anomaly thresholds are static maxima; GSE should make them regime-adaptive — calibrate τ_DS, τ_Y per market-regime context (early-season vs late-season, high vs low model–market disagreement) so the abstention rate stays roughly constant across the season. Also lift the mutual-exclusion limitation: sports "conditions" combine (injury + weather + rest), so extend the evidence frame to a power set of regime labels and assign Yager conflict to the universal set as the "compound anomaly" signal. If regime-adaptive thresholds keep the Brier gap stable across season halves where static thresholds decay, the adaptation is validated.
