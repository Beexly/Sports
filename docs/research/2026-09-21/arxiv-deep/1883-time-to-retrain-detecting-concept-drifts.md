# [1883] Time to Retrain? Detecting Concept Drifts in Machine Learning Systems (arXiv:2410.09190)

**Citation:** Tri Minh Triet Pham, Karthikeyan Premkumar, Mohamed Naili, Jinqiu Yang (2024). *Time to Retrain? Detecting Concept Drifts in Machine Learning Systems*. arXiv:2410.09190v2. URL: https://arxiv.org/abs/2410.09190
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — model-agnostic inspector-disagreement drift monitor that works on GSE's existing models without architecture changes; the semi-supervised labeling machinery is overkill for NFL (labels are free), but the inspector protocol ports directly to pre-game early-warning monitoring.

## 1. Research question
Deployed ML models rot under concept drift, and retraining schedules are guesswork. SOTA semi-supervised drift detectors need too many labels (up to 100%), request them unpredictably, and only work with specific model architectures. The paper asks: can a model- and distribution-agnostic, label-frugal detector match supervised performance? Answer: CDSeer, an "inspector model" framework evaluated on 8 datasets (synthetic, real, proprietary telecom) and two neural-net architectures.

## 2. Dataset / schema
RQ1/RQ2: ROUTER (proprietary telecom congestion prediction, 46,694×32, 2 concept drifts, <4.1% positive class after 10:1 downsampling), Sine (16,000×2, 2 drifts), SEA (16,000×2, 2 drifts), ELEC (45,312×9, 22 drifts — electricity pricing), NOAA (18,159×8, 3 drifts — rain prediction), GCT (Google cluster job failure, 263,509×19, 28 drifts). RQ3: FM fashion-MNIST (70,000×784, 1 drift), LMR text sentiment (50,000×250, 1 drift). Public except ROUTER. Metrics averaged over 5 random seeds. Where GT drift labels are unavailable, drifts detected by supervised PHT on the non-retrained online model serve as reference (paper's choice).

## 3. Method / model
**CDSeer (Algorithm 1):** an *inspector model* (random forest in all experiments) runs in parallel with the deployed online model, emitting pseudo-labels ŷ_insp per streaming point. Per-point error error_i = 0 if ŷ = ŷ_insp else 1 (Eq. 1); a standard supervised CDD (Page–Hinkley test or DDM) monitors the disagreement-rate stream and raises alarms. Meanwhile: the window W of the last w unlabeled points is clustered — DBSCAN with ε from knee detection on NN-distance curves and minPts = w/100 (Eq. 2), falling back to K-means with k = w/100 when DBSCAN degenerates (Eq. 3). Stratified sampling from clusters selects ≤1% of points for expert labeling; labels go into a fixed-size queue memory M (default 15, flushed FIFO). sklearn `LabelSpreading` (graph-based) propagates M's true labels across W; the inspector is retrained on the now-labeled window (W, TrueLabels). Intuition: after drift, M holds mixed old/new concepts, the inspector becomes a mixed-concept model, its disagreement with the online model spikes, and the CDD fires. Online model retrained on recent true-labeled data upon alarm.
Defaults: window = 1,000, memory = 15 (memory = 20 in RQ3); inspector trained offline on a sample of the online model's training data, then auto-retrained online.

## 4. Equations & assumptions
- error_i = 0 if ŷ = ŷ_{insp,i}, else 1, ∀i ∈ D. (Eq. 1 — paper's disagreement signal; note the ar5iv pseudocode rendering flips the assignment, Eq. 1 is authoritative.)
- clusters = DBSCAN(W, Euclidean, ε, w/100). (Eq. 2); clusters = KMeans(W, Euclidean, w/100). (Eq. 3)
- Data drift: P_training(X) ≠ P_testing(X), P(y|X) equal; concept drift: P(y|X) changes.
- Metric definitions: MAcc = classification accuracy; Precision = TP/(detected); Recall = TP/(GT drifts); Lbl = % of points manually labeled.
Assumptions: clusters share labels (label-spreading assumption); ≤1% labeling budget; a handful of true labels suffice for the graph to propagate; image inputs need grayscale ≤28×28 reduction to cluster on pixels.

## 5. Features / target
Inputs: streaming feature vectors X (tabular, image pixels, or text token vectors depending on dataset); outputs of online model and inspector. Target of the detector: binary drift-alarm points in the stream. Underlying tasks are binary classification (congestion, rain, job failure, sine/sea/elec/noaa) or multi-class (FM clothing, LMR sentiment).

## 6. Validation design
Three RQs: RQ1 benchmarks SOTA (PHT supervised with 100% labels; ECHO semi-supervised, official Java impl, warm-up −S 1000) on 6 datasets; RQ2 runs CDSeer with default and varied (window 500/1000 × memory 10/15) configs, PHT as the integrated CDD, RF online models trained on first 1,000 points; RQ3 tests model-agnosticism on two Keras sequential nets (FM 60k-train 3-layer, LMR 25k-train 5-layer) with a RF inspector trained on the last 1,000 training points, window 1000/memory 20, 5 runs averaged. Baselines: no-CDD online model, PHT (100% labels), ECHO.

## 7. Numerical results / baselines
Table II, CDSeer (MAcc / Precision / Recall / Labels%):
- ROUTER: 96.76 / 71.4 / 100.0 / **0.6** vs PHT 97.88 / 100.0 / 50.0 / 100 vs ECHO 94.60 / 14.3 / 100.0 / 48.1
- SEA: 95.55 / 61.5 / 80.0 / **0.6** vs PHT 95.93 / 100 / 100 / 100 vs ECHO 86.44 / 50 / 50 / 100
- Sine: 75.97 / 48.1 / 80.0 / **0.6** vs PHT 73.63 / 100 / 50 / 100 vs ECHO 62.25 / 100 / 50 / 0.03
- ELEC: 77.30 / 30.4 / 72.7 / **0.6** vs PHT 74.19 / 58.3 / 63.6 / 100 vs ECHO 71.50 / 10.9 / 81.8 / 48.73
- NOAA: 77.51 / 15.0 / 80.0 / **0.6** vs PHT 77.37 / 66.6 / 66.6 / 100 vs ECHO 77.70 / 6.5 / 100 / 100
- GCT: 97.33 / 17.6 / 35.7 / **0.8** vs PHT 97.37 / 69.2 / 53.8 / 100 vs ECHO 96.74 / 1.3 / 75.0 / 91.7
Key claims (paper): CDSeer improves online-model accuracy on 5 of 6 datasets vs no-CDD; beats SOTA semi-supervised ECHO on precision *and* recall; beats supervised PHT on recall, trails on precision; needs 0.6–0.8% labels (vs ECHO's 48–100% except Sine's 0.03% anomaly). Labeling *requests*: on ROUTER (800 points/hour over a month), ECHO made 22,459 requests vs CDSeer's **80**. Sensitivity (Table III): larger memory trades recall for precision; default config already beats SOTA.
Industrial deployment: **57.1% precision improvement while using 99% fewer labels** than the SOTA detector; performance comparable to supervised PHT (100% labels).
RQ3 (model-agnostic): FM neural net — precision 62.5%, recall 100%, 0.99% labels; LMR text net — precision 80%, recall 80%, 0.98% labels; RF inspector trains an order of magnitude faster than the online model.

## 8. Code / data availability
No code link stated for CDSeer (only ECHO's official Java implementation, github.com/ahhaque/ECHO, is cited as a baseline). Public datasets from prior drift-detection work; ROUTER proprietary.

## 9. Leakage & limitations
- Precision is the weak spot: 15–48% on ELEC/NOAA/GCT — on NFL this means potentially 1-in-2 to 1-in-6 alarms are false, which argues for using alarms as review flags, not auto-retrain triggers.
- Where GT drifts are unavailable the paper evaluates against PHT's own detections — circular reference-standard; treat those precision/recall numbers as optimistic.
- GCT recall is only 35.7%: on a 28-drift stream it misses most events; the memory=15 default with FIFO flushing can forget brief drifts (paper admits memory should scale with drift duration).
- LabelSpreading's cluster-purity assumption is fragile on high-dimensional noisy tabular data; the NFL feature space (EPA splits, QB metrics) is moderately dimensional but the graph construction is O(n²) per window.
- The paper's core selling point (label frugality) is nearly irrelevant for NFL — game outcomes are free, automatic labels. What survives for us is the *model-agnostic inspector* architecture, not the sampling machinery.
- External validity: one proprietary dataset, two neural architectures; performance on other model families untested (paper's own threat note).

## 10. GSE overlap
Per the existing-research map, online/continuous learning was a commissioned-but-unfilled topic — no duplication. The AGENTS.md benchmark inventory has no drift monitor. Nearest neighbors: the calibration lane (which fixes probability quality) and the weekly win-probability model. CDSeer adds the missing *operations* piece: when is the deployed model stale? Unlike PUDD (1882), which needs resolved labels, CDSeer's inspector can run on *unlabeled* upcoming slates.

## 11. GSE implementation spec
- **Adapt the inspector protocol, drop the labeling machinery** (labels are free in NFL): train a lightweight inspector — logistic regression or small RF — on the most recent labeled weeks (e.g., trailing 8 weeks of resolved games) using the same feature set as the main win-prob model; run it in parallel over the upcoming slate each week.
- **Disagreement monitor:** per game, disagreement d_i = 1 if main model and inspector disagree on the predicted winner else 0; feed the stream into a Page–Hinkley test (or DDM). Alarm ⇒ flag the week for analyst review and candidate refit of the main model.
- **Pre-game value:** because the inspector needs no labels, this is the *only* drift signal in the lane that fires *before* kickoff — a regime-change early warning for the upcoming slate, complementing PUDD's post-resolution signal (1882).
- **Trigger policy:** on alarm, refit the main model on post-cutoff weeks only (mirrors the paper's retrain-on-alarm), but keep the old model as challenger for 2 weeks (hedges the paper's weak precision).
- **Serving:** sklearn RF inspector + PHT in the existing weekly pipeline; trains in seconds. Effort: ~1 day, plus threshold tuning on 2015–2025 nflverse.

## 12. Reproducible test
Dataset: nflverse 2015–2025, game-level features, home-win target. Protocol: freeze the main win-prob model at end of 2019 season; from 2020, each week train the inspector on the trailing 8 resolved weeks, predict the upcoming slate with both models, log disagreements, run PHT on the disagreement stream. Regime-change episodes labeled as in 1882 (COVID 2020, 2022 QB carousels, 2024–25 coaching churn). Metric: fraction of episodes where the PHT alarm precedes the first 3-week Brier-degradation window by ≥1 week. Baseline to beat: no-monitor (fixed retrain schedule, e.g., refit every 4 weeks) — the inspector must catch ≥50% of episodes with ≤2 false alarms/season; and the refit-on-alarm policy must not degrade Brier by >0.002 vs the frozen baseline on non-alarm weeks.

## 13. Acceptance / rejection gate
ADOPT the inspector monitor if on 2020–2025 nflverse: (i) PHT disagreement alarms precede ≥50% of labeled regime-change episodes by ≥1 week, (ii) ≤2 false alarms per season, (iii) refit-on-alarm does not degrade Brier by more than 0.002 vs frozen baseline on non-alarm weeks, and (iv) the pipeline runs end-to-end in the weekly cron in <5 minutes. REJECT if (i) or (ii) fails; the labeling/sampling machinery (DBSCAN, LabelSpreading) is rejected regardless — not needed for NFL.

## 14. Improvement experiment
Combine 1882 (PUDD, post-game, label-dependent) and this paper (inspector, pre-game, label-free) into a two-stage detector: stage 1 inspector-disagreement PHT on the upcoming slate (early, noisy), stage 2 PUDD chi-square on resolved PU-index (late, reliable). Evaluate whether the staged combo reduces false alarms by ≥30% vs PUDD alone while keeping ≥90% of PUDD's detection rate — hypothesis: the pre-game stage acts as a cheap filter that tells PUDD which weeks deserve a stricter α, trading the paper's weak precision for the combination's specificity.
