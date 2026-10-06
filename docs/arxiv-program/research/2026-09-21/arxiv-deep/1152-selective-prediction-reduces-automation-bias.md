# [1152] Selective Prediction Reduces the Negative Effects of Automation Bias Overall but Increases False Negatives (arXiv:2508.07617)

**Citation:** Sarah Jabbour, David Fouhey, Nikola Banovic, Stephanie D. Shepard, Ella Kazerooni, Michael W. Sjoding, Jenna Wiens (2025/2026). *Selective Prediction Reduces the Negative Effects of Automation Bias Overall but Increases False Negatives*. arXiv:2508.07617v2 [cs.HC]. URL: https://arxiv.org/abs/2508.07617
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 24 pages, arXiv v2).
**Verdict:** ADAPT
No predictive method to borrow, but a directly actionable behavioral finding for GSE's public-pick operation: announcing abstention is not neutral; it shifts followers' error pattern toward false negatives (missed +EV plays), so abstention must be communicated (or silenced) by design.

## 1. Research question
Selective prediction is usually evaluated in simulation under the assumption that when the AI abstains and says so, the human decides exactly as if no AI were involved. Is that assumption true? The paper tests it in a multilabel clinical setting: 259 clinicians diagnosing/treating acute respiratory failure (ARF) across three conditions (pneumonia, heart failure, COPD) under Clinician Alone vs Clinician + AI vs Clinician + Selective Prediction (AI withholds a subset, explicitly says "the model defers to you").

## 2. Dataset / schema
45 real patient cases (ARF hospitalizations, Aug–Nov 2017, single academic center; ground truth by ≥4 physicians, averaged 1–4 ratings thresholded at 2.5). 259 clinicians (125 randomized to Clinician+AI, 134 to Clinician+Selective Prediction), 9 US states, median 5 years practice, 95% hospital medicine. Each clinician: 3 baseline cases (no AI) + 6 AI-assisted cases (3 from an "inaccurate subset" where the oracle mechanism withheld ≥1 prediction, 3 without). Selective-prediction mechanism: oracle (post-hoc ground truth) with controlled noise — withholds all incorrect predictions plus enough correct ones that p = 0.11 (11% of withheld predictions are correct). Inaccurate subset: 28 of 135 predictions (avg accuracy 10%); accurate subset: 107 predictions (avg 91%). Pre-registered (osf.io/m7avk); IRB-exempt vignette survey on Qualtrics; 13 suspicious fast responses excluded. No sports data; proprietary clinical cases (de-identified vignettes).

## 3. Method / model
No ML model is proposed — this is a behavioral experiment. AI model generating the predictions: ensemble of (1) EHR model (logistic regression vs 2-layer NN, chosen by validation AUROC) and (2) chest-X-ray CNN (DenseNet-121, pretrained on CheXpert + MIMIC-CXR, fine-tuned last layer); outputs 0–100, thresholded at disease-prevalence rates (pneumonia 31%, heart failure 22%, COPD 8%), shown with unlikely/likely colorbar. Analysis: mixed-effects models (patient, label, participant random effects), condition as fixed effect, outcomes = treatment accuracy / FPR / FNR on the inaccurate subset; α = 0.05; exploratory subgroup splits (APP vs physician; AI-naive vs AI-experienced) without formal significance testing (underpowered by design).

## 4. Equations & assumptions
No model equations (behavioral study). Key measurement definitions: treatment accuracy = selected treatments matching ground-truth diagnosis (antibiotics↔pneumonia, IV diuretics↔heart failure, steroids↔COPD); FPR/FNR on treatment decisions; diagnostic accuracy in Appendix H.3 (Likert 0–100 ≥ 50 = positive). Assumptions: (a) the oracle-with-noise deferral mechanism stands in for a real uncertainty-based one — effects are attributed to the *announcement* of abstention, not mechanism accuracy; (b) vignette decisions proxy real clinical decisions; (c) the "Clinician Alone" first-3-cases baseline is uncontaminated by later AI exposure.

## 5. Features / target
Features (shown to clinicians): patient case (history, exam, labs, chest X-ray) + AI 0–100 scores per condition (or "N/A — the model defers to you"). Target (measured): clinician's diagnosis (0–100 per condition) and treatment selection (antibiotics / IV diuretic / steroids / none), plus perceived difficulty (1–4 Likert).

## 6. Validation design
Between-subjects randomization to Clinician+AI vs Clinician+Selective Prediction after a common 3-case no-AI baseline (within-subject baseline). Block randomization (blocks of 90) balancing case assignment; case order randomized. Pre-registered hypotheses and analysis plan. Power: n=250 target via simulation to detect a 10% diagnostic-accuracy drop under inaccurate AI and recovery under selective prediction. Appendix analyses exclude a duplicated-case artifact (no effect).

## 7. Numerical results / baselines
Treatment accuracy on the inaccurate subset (mixed-effects estimates, 95% CI), quoted exactly:

- **Clinician Alone:** 62% (47–75). **Clinician + AI:** 50% (36–65), p < 0.001 vs Alone (automation bias hurts). **Clinician + Selective Prediction:** 55% (40–69) — partial recovery, not significant vs Alone.
- **False positive rate:** Alone 40% (18–67); +AI 55% (28–79), p < 0.05; +Selective 41% (19–68) — returns to baseline.
- **False negative rate:** Alone 31% (22–42); +AI 41% (31–53), p < 0.05; **+Selective 42% (31–53), p < 0.05** — stays elevated. Clinicians undertreat when told the AI abstains.
- **Subgroups (exploratory):** APPs (n=66): accuracy −18 pp under +AI vs −10 pp for physicians (n=191); selective recovers +13 pp (APPs) vs +2 pp (physicians). AI-naive (n=181): −12 pp under +AI, only +3 pp recovery under selective, FNR +13 pp under selective; AI-experienced (n=78): −9 pp, full +9 pp recovery, FNR only +2 pp.
- **Perceived difficulty:** 1.17 (1.11–1.23) Alone → 1.20 (1.13–1.28) +AI → 1.27 (1.20–1.35) selective — abstention makes cases feel harder.
- Diagnostic-accuracy appendix (Table 7): same pattern; selective FNR 0.44 vs Alone 0.39 (ns), FPR 0.21 vs 0.28.

## 8. Code / data availability
None stated (survey instrument and de-identified responses not linked in the paper; pre-registration at osf.io/m7avk).

## 9. Leakage & limitations
- **Vignette ≠ deployment:** no real stakes, no time pressure, no workflow integration — the undertreatment effect could shrink or grow in live use; authors flag this.
- **Oracle deferral:** a real uncertainty mechanism misfires differently (withholds some harmful, shows some harmful); the behavioral effect measured here is clean but idealized.
- **Order confound:** baseline always precedes AI exposure (no counterbalancing); learning/fatigue could contaminate the Alone vs AI comparisons.
- **Subgroup analyses underpowered** and confounded (AI-experienced = older, more male, more physicians — Table 6).
- **Comprehension gap:** despite a forced knowledge check ("the AI may or may not believe the patient has the condition"), participants may still have read deferral as a negative signal — which is itself the finding, but it conflates misunderstanding with a deeper behavioral shift.
- **External validity to sports:** clinicians treating ARF ≠ bettors tailing picks; stakes, expertise, and reversibility differ. The mechanism (announced abstention read as information) is plausibly general; the magnitudes are not.

## 10. GSE overlap
Existing-research map gap item 4 (learning-to-abstain) covers the *algorithmic* side; nothing in the repo covers the *human* side of abstention — how followers react when GSE withholds a pick. This is **new capability** (operational/UX), not a duplicate. It directly constrains the three-way publish policy designed from papers 1150/1151: the "abstain" arm is not behaviorally neutral for the audience.

## 11. GSE implementation spec
1. **Framing rule for abstention (X copy):** never present "no play" as a bare deferral. Template: "No edge today on [game] — model sees it as a coin flip, not a fade. Passing is the +EV move." This directly counters the paper's mechanism (deferral read as negative signal → undertreatment/missed bets).
2. **Silent vs announced abstention A/B:** on low-stakes slates, test silent abstention (simply don't post) vs announced "no play" framing; track follower engagement and reply sentiment, not just pick ROI.
3. **Segment the audience lesson:** the paper's AI-naive subgroup (worst affected) maps to GSE's casual followers — the copy rule matters most for them; experienced followers self-correct.
4. **Effort:** ~half a day (copy templates + posting-policy note in ops/x-copy-rules.md); the A/B is ongoing lightweight tracking.

## 12. Reproducible test
Dataset: @GalaxySportsHQ post history + reply/engagement data. Test: for 4 weeks, randomly assign "no edge" games to (a) silent (no post) vs (b) framed "no play — coin flip, not a fade" post. Metrics: follower reply sentiment (manual coding of a 200-reply sample), quote-post fade behavior ("fading the no-play" mentions), and unfollow rate. Baseline: current practice. Win iff framed abstention shows neutral-to-positive sentiment and no measurable fade-trading in replies.

## 13. Acceptance / rejection gate
ADAPT iff the paper's core mechanism (announced abstention → audience false negatives) is judged transferable to a betting audience — it is, by the availability-bias argument the authors themselves make, and the cost of the adaptation (copy framing) is near zero; REJECT any claim about effect *magnitudes* (12 pp accuracy swings do not transfer to sports bettors). The gate for the copy rule itself: keep iff the 4-week A/B shows no negative-sentiment spike on framed no-play posts.

## 14. Improvement experiment
Run the paper's design in GSE's own context: a vignette survey of ~100 followers (Google Form) presenting 6 betting slates with engine picks shown vs withheld-with-framing, measuring intended bet placement. This directly estimates the "missed +EV bet" (false negative) rate of GSE's abstention communication — the sports-betting analogue of the paper's undertreatment finding — and calibrates how aggressively to use the abstain arm.
