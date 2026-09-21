# [1012] Theoretically Grounded Loss Functions and Algorithms for Score-Based Multi-Class Abstention (arXiv:2310.14770)

## Citation / full-text source

- arXiv:2310.14770 — full text: https://arxiv.org/pdf/2310.14770
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Anqi Mao, Mehryar Mohri, Yutao Zhong (Courant Institute / Google Research, 2023; v2). *Theoretically Grounded Loss Functions and Algorithms for Score-Based Multi-Class Abstention*. arXiv:2310.14770v2. URL: https://arxiv.org/abs/2310.14770
**Full-text source read:** local cache `/tmp/arxiv750-cache/fulltext/2310.14770.txt` (arXiv conversion; read in full — abstract, §§1–6, experiments Table 1 with exact values, references; single-stage vs two-stage theory, H-consistency bounds).
**Ledger completed:** 2026-09-21. **Read:** full text.
## Verdict

**ADAPT** — the two-stage formulation (keep the predictor fixed, learn the rejector on top with consistency guarantees) is exactly how GSE should bolt a no-bet layer onto the existing engine without retraining it.

## 1. Research question
For score-based multi-class abstention, can we design surrogate losses — in both the single-stage (joint predictor+rejector) and two-stage (fixed predictor, learned rejector) settings — with strong non-asymptotic, hypothesis-set-specific (H-)consistency guarantees, and do the two-stage algorithms beat SOTA single-stage surrogates empirically?

## 2. Dataset / schema
CIFAR-10 (ResNet-34), CIFAR-100 (WRN-28-10), SVHN (ResNet-34). SGD + Nesterov, batch 1024, weight decay 1e-4, 200 epochs, cosine LR from 0.1. Abstention cost c set near the best-in-class zero-one loss: {0.05, 0.15, 0.03} for CIFAR-10/100/SVHN. Baselines: cross-entropy score-based surrogates L_μ with μ=1.0 (Mozannar & Sontag 2020) and μ=1.7 (Cao et al. 2022). Two-stage: logistic loss in stage 1, exponential loss Φ(t)=exp(−t) in stage 2. Evaluation: abstention loss L_abs, mean±SD over 3 trials.

## 3. Method / model
Score-based abstention: scores over n classes + an abstain option. Single-stage: joint surrogate L_μ family (includes the SOTA as special cases). Two-stage: (1) learn predictor h with standard logistic loss; (2) freeze h, learn rejector r with a novel surrogate family. Theory: H-consistency bounds — the abstention-loss estimation error is upper-bounded by the surrogate estimation error; two-stage surrogates enjoy BOTH realizable H-consistency and Bayes-consistency, while the cross-entropy single-stage ones do not in general. Also addresses the open problem (Ni et al. 2019) of calibrated multi-class predictor-rejector surrogates.

## 4. Equations & assumptions
- Abstention loss L_abs with cost c; surrogate families L_μ (single-stage, generalized cross-entropy with parameter μ); two-stage surrogates with Φ(t)=exp(−t).
- H-consistency: excess abstention risk ≤ Γ(excess surrogate risk) for concave Γ (hypothesis-set-specific).
- Assumptions: none beyond standard boundedness; bounds are non-asymptotic.

## 5. Features / target
Features: images. Target: class label + abstain option with cost c.

## 6. Validation design
Abstention loss on test, 3 trials, mean±SD; c calibrated per dataset to avoid degenerate always/never-abstain.

## 7. Numerical results / baselines
Table 1 (abstention loss, exact): CIFAR-10: CE μ=1.0 → 4.48%±0.10%; CE μ=1.7 → 3.62%±0.07%; two-stage → 3.22%±0.04%. CIFAR-100: μ=1.0 → 10.40%±0.10%; μ=1.7 → 14.99%±0.01%; two-stage → 9.54%±0.07%. SVHN: μ=1.0 → 1.61%±0.06%; μ=1.7 → 2.16%±0.04%; two-stage → 0.93%±0.02%. Two-stage wins on all three datasets; the μ=1.0 vs μ=1.7 ranking FLIPS between CIFAR-10 (μ=1.7 better) and CIFAR-100/SVHN (μ=1.0 better) — surrogate choice is dataset-dependent, another argument for the two-stage approach.

## 8. Code / data availability
None stated. Data: CIFAR-10/100, SVHN (public).

## 9. Leakage
Standard train/test protocol; no leakage concerns.

## Limitations
- c is hand-set near the Bayes error — in practice c is unknown and the paper gives no selection rule.
- Only 3 trials; gains are clear but SDs are small partly by construction.
- The theory is for the 0/1+abstention loss, not for profit/ROI.

## 10. GSE overlap
The KEY architectural paper for GSE's no-bet layer: GSE already HAS a predictor (the engine) — the two-stage formulation says freeze it and learn the rejector on top, with consistency guarantees that the single-stage joint training lacks. This avoids the expensive/risky retraining of the engine that 1008's CARL would require. The "deferral" framing also matches GSE ops: abstained games = deferred to Garrett for human review (the paper explicitly casts defer-to-human as a special case of abstention). The μ-flip finding warns against over-tuning a single joint loss. Extension of gap #4, and the most deployment-friendly of the abstention papers.

## 11. GSE implementation spec
**Two-stage no-bet head on the frozen engine**: stage 1 = current engine (frozen). Stage 2: train a rejector (gradient boosting / small MLP) on historical engine outputs + game features, with labels = 1 if the engine's pick was wrong (or unprofitable), 0 otherwise, using exponential loss Φ(t)=exp(−t) per the paper, and abstention cost c tuned to a target no-bet rate. The rejector sees the engine's predicted edge, CQR width, line-move features, OOD score — i.e., it subsumes the 1006/1010/1011 scores as inputs. Effort: 2–4 days.

## 12. Reproducible test
2020–2023 train, 2024 test (time-ordered): compare (i) engine alone, (ii) engine + confidence-threshold rejector (the paper's "typically worse" baseline), (iii) engine + two-stage learned rejector; metric: abstention loss with c = average vig-adjusted cost of a wrong pick, plus profit and hit rate on published set.

## 13. Acceptance / rejection gate (numeric gate)
ADOPT if the two-stage rejector beats the confidence-threshold baseline on abstention loss by ≥15% relative (paired test p<0.05) AND beats it on profit; otherwise REJECT. The single decisive number: **abstention-loss reduction ≥ 15% vs confidence-threshold baseline**.

## 14. Improvement experiment
Multi-class extension: GSE publishes spread, total, and moneyline — train a SHARED rejector with class-specific abstention costs (spread picks cost more to get wrong than totals if the edge differs), testing whether the paper's multi-class machinery beats three independent binary rejectors.
