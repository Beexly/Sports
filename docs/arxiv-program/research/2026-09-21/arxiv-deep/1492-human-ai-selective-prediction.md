# [1492] Role of Human-AI Interaction in Selective Prediction (arXiv:2112.06751v2)

**Citation:** Elizabeth Bondi, Raphael Koster, Hannah Sheahan, Martin Chadwick, Yoram Bachrach, Taylan Cemgil, Ulrich Paquet, Krishnamurthy Dvijotham (DeepMind/Google Brain/Harvard, 2022). *Role of Human-AI Interaction in Selective Prediction*. AAAI 2022. arXiv:2112.06751v2. URL: https://arxiv.org/abs/2112.06751
**Ledger completed:** 2026-09-21. **Read:** full text (PDF — abstract, intro, related work, background, dataset, deferral mechanism, experiment design, results 3 sections, discussion, ethics, references, appendix incl. deferral-model details and full ANOVA tables).
**Lane:** abstention.
**Verdict:** ADAPT
adapt the deferral-budget thresholding rule and the deferral-status-only messaging design for GSE's pick-abstention/human-review workflow; the anchoring result is directly actionable.

## 1. Research question
Does communicating the deferral decision and/or the AI's prediction to the human change human accuracy in a selective-prediction (learn-to-defer) system? Prior work assumes human behavior is unchanged when humans know they are part of a human-AI team; this paper tests that assumption with human subjects.

## 2. Dataset / schema
Snapshot Serengeti camera-trap images (binary task: animal present or not; ground truth from multi-rater consensus, mean Cohen's kappa 0.886, individual-vs-consensus accuracy 0.961/0.973). AI: ensemble model filtering blank images (AI-only accuracy 0.972 at chosen operating point). Deferral model tuned on balanced subsample of empty images. Human experiment: 198 Prolific participants (UK/US), 80 model-deferred images each (20 per messaging condition, balanced true/false positive/negative model classifications; no image repeated per participant; four seeded allocation orders). Aggregated data at https://github.com/deepmind/HAI selective prediction/.

## 3. Method / model
Selective prediction system sp(x;θ): binary ensemble score m(x)∈[0,1]; deferral rule defer(x)=1 if m(x)∈[θ1,θ2] else 0; sp returns human label h(x) if deferred, else model prediction. Thresholds chosen by brute-force grid over [0,1]² solving max Accuracy(D;θ) subject to DeferralRate(D;θ) ≤ r. Four selective-prediction messaging (SPM) conditions in a 2×2×2 within-subject design: Neither Message (NM), Deferral-status Only (DO), Prediction Only (PO), Both Messages (BM); ANOVA factors: deferral status shown/not, prediction shown/not, model correct/incorrect. "Conformity" metric: per-image increase in rater-model agreement from NM to PO. Likert confidence collected per label.

## 4. Equations & assumptions
sp(x;θ) = h(x) if defer(x;θ) else m̂(x); defer(x;θ) = 1[m(x)∈[θ1,θ2]]. Objective: max_θ Accuracy(D;θ) s.t. DeferralRate(D;θ) ≤ r (r = acceptable human-effort budget). Deferral objective weighted 0.5·sensitivity + 0.5·specificity; penalty for withholding swept from −0.5 to −0.1 to trace the accuracy–deferral curve. Assumptions: (1) deferred-region model scores are worse than human accuracy there; (2) human labels h(x) are stable across conditions except for messaging effects; (3) consensus labels are ground truth; (4) Prolific participants' behavior generalizes to the deployment population (authors flag this as uncertain; domain-expert check showed deferral-status help replicated but interactions differed).

## 5. Features / target
Features: ensemble score m(x) (image pixels). Target: binary animal/no-animal label; human accuracy under each SPM condition is the experimental outcome.

## 6. Validation design
Accuracy–deferral tradeoff curve (Figure 3) vs AI-only (0.972), human-only (0.961), oracle deferral (0.994) on the tuning set. Human experiment: within-subject repeated-measures ANOVA (2×2×2), 198 participants, 95% CIs on means, t-tests for pairwise contrasts. No ML baseline comparison beyond the three reference accuracies.

## 7. Numerical results / baselines
Chosen deferral model: r=1% deferral rate (1,297 of ~150k test images deferred: 603 with animals, 694 empty; model accuracy 0.978 on non-deferred, 0.577 on deferred — genuine complementarity). Operational math: 20 SD cards/month × 50 deferred ≈ 1,000 human-reviewed images vs 109k total; ~3 human-hours vs 302. Human experiment on deferred images (model alone = 50% by construction): DO 61.9% vs NM 58.4% (p<0.001) and vs model-alone 50% (p<0.001). Deferral-status shown (DO+BM) 60.4% vs not shown (PO+NM) 57.4% (p<0.001). Prediction shown 57.8% vs not shown 60.2% (p=0.003). Conformity (model-prediction influence): +0.08 overall (p<0.0001); 0.116 low-confidence vs 0.045 high-confidence (p=0.014). On images the model got wrong: PO condition human accuracy 41.9% (significantly below chance) vs 50.6% in other conditions (p<0.001) — showing wrong predictions makes humans 8.7% worse than no message; on model-correct images showing predictions gains only 5.1%. Human–model agreement: 69.6% where model correct vs 44.9% where model incorrect (p=0.007) — correlated errors; human Likert scores correlate with model scores r=0.27 (p=0.021).

## 8. Code / data availability
Aggregated experiment data at https://github.com/deepmind/HAI (selective prediction path). No model-training code stated. Ethics: DeepMind HuBREC 21 008 approval; £7 flat pay for 20–30 min.

## 9. Leakage & limitations
Stated by authors: results (deferral-status helps, prediction hurts) "not likely to be robust across datasets, different human-AI use scenarios, or participant expertise levels"; only two deferral-status levels tested (finer-grained uncertainty might help); no timing data to explain why deferral-status helped; participants did not know all images were deferred (only SPM conditions varied); domain-expert interactions differed. Added: binary image task with lay participants — distant from sports-pick review; no ablation of whether DO's benefit is pure effort-priming ("this is hard, concentrate"); conformity measured only NM→PO (not BM).

## 10. GSE overlap
The existing-research map has no abstention/selective-prediction machinery documented for GSE (the abstention lane is one of wave-3's thin lanes to fill). No duplication. GSE's posted-card workflow does have a human-review step (analyst reviews engine output before posting), which is exactly where SPM applies.

## 11. GSE implementation spec
Adapt two components for the daily pick-abstention workflow:
1. Deferral-budget thresholding (the algorithm): implement the paper's rule for the engine's abstention policy — choose score thresholds θ1,θ2 (or a single confidence floor) solving max historical accuracy subject to deferral rate ≤ r, where r is the daily-card budget (e.g. max share of matchups withheld from the posted card). Grid-search θ on backtested engine scores; report the accuracy–deferral curve (paper's Figure 3 analogue) so the abstention budget is an explicit parameter, not a vibes-based cutoff. Note the paper's complementarity check: verify engine accuracy on non-deferred picks ≫ accuracy on deferred picks, or the deferral region is mis-specified.
2. Deferral-status-only messaging (the human finding): in the daily review interface, surface abstained matchups as "ENGINE ABSTAINS — low confidence" (DO-style) WITHOUT showing the engine's lean or probability. The paper's result: showing the uncertain prediction anchors the human and, when the model is wrong (which correlates with human-difficult cases — agreement 44.9% on model-wrong images), drags the reviewer below chance. The human should re-handicap abstained games blind, then compare.
3. Correlated-errors guardrail: because human and model errors covary, treat any reviewer override on an abstained pick as requiring written justification (the override happens exactly where both are weakest).

## 12. Reproducible test
Backtest on GSE's picks table: grid-search abstention thresholds on engine probability scores to trace the accuracy-vs-deferral-rate curve; verify deferred-region accuracy < non-deferred-region accuracy (complementarity). Then a small internal experiment: have the analyst review 40 abstained matchups under DO-style (status only) vs BM-style (status + engine lean) messaging across two weeks, blinded to which; compare against final outcomes. Pass criterion: DO-style review accuracy ≥ BM-style, replicating the paper's direction, before the messaging rule becomes standing policy.

## 13. Acceptance / rejection gate
ADAPT: the deferral-budget optimization is a ready abstention policy (with an explicit, auditable r parameter), and the SPM experiment gives an evidence-backed messaging rule for GSE's human-review step. Not ADOPT: the anchoring magnitudes come from lay image-labelers, not sports analysts, and will need the internal replication in section 12 before becoming standing doctrine.

## 14. Improvement experiment
Beyond the paper: run the same DO/BM messaging experiment on *sports analysts* instead of lay image labelers, and add a third arm that reveals the model's calibrated confidence alongside deferral status. The paper varies only whether the uncertain prediction is shown; it never tests whether confidence numbers restore the blind-DO advantage or reintroduce the anchoring it avoids. If confidence-armed review matches or beats blind review on deferred NFL matchups (accuracy within ±2%), GSE can surface uncertainty without the anchoring penalty — and the three-arm result settles a design question the paper leaves open.
