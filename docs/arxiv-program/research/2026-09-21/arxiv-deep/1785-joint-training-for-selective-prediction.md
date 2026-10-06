# [1785] Joint Training for Selective Prediction (arXiv:2410.24029)

**Citation:** Zhaohui Li, Rebecca J. Passonneau (Pennsylvania State University). *Joint Training for Selective Prediction*. arXiv:2410.24029. URL: https://arxiv.org/abs/2410.24029
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML — abstract, joint classifier + deferral-policy training with policy-gradient loss (Algorithm 1, line 15), five SP settings: Thresh./LR/Policy/JTSP CE/JTSP, experiments on BEETLE/SciEntsBank/Mid-PHYS/ISTUDIO with SFRN and BERT classifiers + RoBERTa deferral-policy encoder, Table 1 exact values, conclusion).
**Verdict:** ADAPT — jointly training the pick model and the gate with shared representations plus a policy-gradient term beats every post-hoc gate (threshold, logistic regression on softmax features, separately-trained policy) on all four datasets, and both modules improve; GSE should stop bolting the gate on after training and learn them together.

## 1. Research question
In selective prediction, the standard pipeline trains the classifier first and fits the deferral rule afterward on frozen representations — does *jointly* training the classifier and the deferral policy, with shared learned representations and a policy-gradient loss term, produce better selective-prediction outcomes (and better classifiers) than post-hoc approaches?

## 2. Dataset / schema
Four short-answer STEM assessment datasets: BEETLE (~6,000 undergraduate responses on electricity/electronics), SciEntsBank (SemEval-2013 Task 7), Mid-PHYS, ISTUDIO. Classifiers: SFRN (relation network over BERT encodings, SOTA on two datasets) and fine-tuned BERT (HuggingFace AutoModelForSequenceClassification). Deferral-policy encoder: RoBERTa (beat BERT as the policy encoder). Five SP settings: Thresh. (Hendrycks & Gimpel max-prob threshold tuned on validation), LR (logistic regression on predicted class + softmax probs + per-question training accuracy, from Li et al. 2023), Policy (classifier and deferral policy trained separately, each with cross-entropy), JTSP CE (joint training *without* the policy-gradient term), JTSP (full joint training with the policy-gradient loss, Algorithm 1 line 15).

## 3. Method / model
JTSP: the classifier (CL) and the deferral policy (DP) share learned representations and are trained jointly; the deferral policy's loss includes a policy-gradient term (Algorithm 1, line 15) that directly optimizes the selective-prediction objective (reward for correct keeps, penalty structure for defers/errors) rather than a proxy cross-entropy. JTSP CE ablates the policy-gradient term (joint representations only). Both modules improve vs their separately-trained versions — the classifier gets better because the deferral signal shapes its representations.

## 4. Equations & assumptions
- Deferral-policy training signal: policy-gradient loss term (Algorithm 1, line 15) on the selective-prediction reward; JTSP CE = the same joint architecture with this term removed.
- Reported metrics: DP = deferral-policy accuracy/F1; SP = overall selective accuracy/F1; DR = deferral rate (lower is better).
- Assumptions: the deferral decision is learnable from the shared representation; the policy-gradient estimator has manageable variance at the reported data scales; validation-tuned thresholds (Thresh. baseline) are the fair classical comparator.

## 5. Features / target
Student short answers → correctness labels; the deferral policy predicts whether the classifier's answer should be trusted. GSE analog: game/pick features → outcome; the policy predicts whether the pick should be posted.

## 6. Validation design
4 datasets × 2 classifier backbones × 5 SP settings; best-SP-per-dataset marked with asterisks; deferral rates reported alongside accuracy so "defer everything" can't win silently.

## 7. Numerical results / baselines
SFRN backbone (accuracy / F1, Table 1a):
- BEETLE: JTSP SP *85.33 / 79.63 (DR 8.20) vs LR 83.89 / 77.67 (8.64) vs Policy 83.39 / 76.98 (7.76) vs Thresh. 80.74 / 72.68 (2.63) vs no-deferral 79.35 / 70.73. JTSP's deferral-policy accuracy 81.02 / 61.47 also bests all policy variants.
- SciEntsBank: JTSP *80.00 / 73.78 (8.56) vs JTSP CE 79.41 / 73.60 vs Policy 76.78 / 68.94 vs LR 75.74 / 66.52.
BERT backbone (Table 1a): BEETLE JTSP 85.29 / 80.08 (10.71) vs Policy 82.92 / 77.99; SciEnts JTSP 77.37 / 69.56 vs Policy 76.53 / 67.20.
Mid-PHYS / ISTUDIO (Table 1b, SFRN): JTSP *83.33 / 82.49 (5.90) vs Policy 80.75 / 79.69; ISTUDIO JTSP *85.83 / 84.29 (1.84) vs Policy 85.03 / 82.95 — JTSP best SP on all four datasets with both backbones, and the policy-gradient term (JTSP vs JTSP CE) adds a consistent ~0.5–2.5 point gain.

## 8. Code / data availability
BEETLE/SciEntsBank via SemEval-2013 Task 7 (original link dead; authors share on request). No training code stated in the extracted text.

## 9. Leakage & limitations
- The deferral policy sees the classifier's *training* accuracy per question as a feature (LR baseline) — a mild form of train-set peeking baked into the baseline, though JTSP itself doesn't use it.
- Short-answer NLP domain; the "defer to a human grader" cost model doesn't price the deferral — GSE's abstention has a real opportunity cost (foregone edge).
- Policy-gradient variance at small data scales isn't analyzed; GSE's per-season pick counts are smaller than these datasets.
- Both-modules-improve is claimed but the classifier-only accuracy gains aren't isolated in the extracted tables.

## 10. GSE overlap
Architectural upgrade, no duplicate: GSE's entire gating stack (ledgers 1775–1780) assumes a *fixed* pick model with a post-hoc gate. Nothing in the corpus jointly trains predictor and gate. This paper says that pipeline order is the thing to fix — and its ablations (Policy vs JTSP CE vs JTSP) quantify exactly what joint training buys.

## 11. GSE implementation spec
Rebuild the pick-model training loop as **GSE-JTSP**: (a) shared feature trunk; two heads — pick head (spread/total/moneyline outcome) and deferral head (post / don't post); (b) train jointly with the paper's recipe: cross-entropy on the pick head + policy-gradient term on the deferral head optimizing posted-pick units (the selective-prediction reward in *units*, not accuracy); (c) keep the current post-hoc gate (ledger 1775) as the Policy-baseline analog and require JTSP to beat it; (d) log both heads' standalone metrics to verify the "both modules improve" claim on sports data. Effort: ~3 weeks (training-loop surgery + reward definition + ablations).

## 12. Reproducible test
Dataset: GSE feature snapshots + graded picks 2022–2025. Baselines (the paper's five, translated): Thresh. (edge threshold), LR (logistic gate on model outputs), Policy (separate gate model, = ledger 1775), JTSP CE (joint, no policy-gradient), JTSP (full). Metrics: SP = hit-rate/units on posted picks, DR = 1 − coverage; report the full table.

## 13. Acceptance / rejection gate
ADAPT accepted if JTSP beats the separate-gate Policy baseline by ≥ 2 points of posted-pick hit-rate at matched deferral rate on walk-forward seasons AND the JTSP-vs-JTSP-CE ablation shows the policy-gradient term (not just shared representations) contributes; else REJECT (keep the fixed-model + learned-gate pipeline — joint training isn't worth the loop surgery).

## 14. Improvement experiment
Make the deferral head *stake-aware*: instead of post/don't-post, have the policy output a stake fraction (0 = abstain, continuous to full Kelly) and put the policy gradient on risk-adjusted units (Sharpe of weekly P&L). The paper's deferral is binary; sports abstention is really a sizing decision, and the joint-training machinery should extend naturally — test whether the continuous-stake JTSP beats binary JTSP on risk-adjusted return.

**Verdict:** ADAPT — joint predictor-plus-gate training with a policy-gradient term is the architecturally right next step for GSE's whole gating stack and the ablations prove each ingredient earns its keep, but the training-loop surgery must be justified by beating the already-strong post-hoc gate on walk-forward sports data first.
