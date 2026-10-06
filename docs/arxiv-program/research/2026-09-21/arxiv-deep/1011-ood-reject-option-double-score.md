# [1011] Reject Option Models Comprising Out-of-Distribution Detection (arXiv:2307.05199)

## Citation / full-text source

- arXiv:2307.05199 — full text: https://arxiv.org/pdf/2307.05199
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Vojtech Franc, Daniel Prusa, Jakub Paplham (Czech Technical University in Prague, 2023; v1). *Reject Option Models Comprising Out-of-Distribution Detection*. arXiv:2307.05199v1. URL: https://arxiv.org/abs/2307.05199
**Full-text source read:** local cache `/tmp/arxiv750-cache/fulltext/2307.05199.txt` (arXiv conversion; read in full — abstract, §§1–5, Table 2 with exact values, references; optimal-strategy statement, double-score method, metric critique).
**Ledger completed:** 2026-09-21. **Read:** full text.
## Verdict

**ADAPT** — the optimal OOD selective function (linear combination of conditional risk and ID/OOD likelihood ratio) plus the double-score trick gives GSE a principled two-headed no-bet score: "is this game weird?" × "would we be wrong anyway?".

## 1. Research question
What is the optimal prediction strategy for OOD setups (test = mixture of ID and OOD), and can a simple method combining two uncertainty scores beat SOTA single-score OOD detectors?

## 2. Dataset / schema
OpenOOD benchmark [21]. ID: MNIST and CIFAR-10; three OOD datasets each (unrealistically high OOD fraction π>0.5, so π-independent metrics used). Methods: MSP [10], MLS [9], ODIN [11], REACT [17], KNN [19], VIM [20] single-score; two double-score instances: KNN+MSP and VIM+MSP (MSP = asymptotically best misclassification detector; KNN/VIM = best OOD/ID discriminators by AUROC). 0/1 loss; target TPR fixed at 0.8; FPR set per-database to the max attained by any method.

## 3. Method / model
Three OOD reject models: (i) Cost-based, (ii) Bounded TPR-FPR, (iii) Bounded Precision-Recall. Main theorem: despite different formulations, all share the same class of optimal strategies — a Bayes ID classifier plus a selective function that is a LINEAR COMBINATION of the conditional risk and the likelihood ratio p_O(x)/p_I(x) of OOD vs ID. This trades off OOD/ID discrimination against misclassification detection. Practical consequence: the double-score method — combine one score good at OOD/ID discrimination with one score good at misclassification detection. Also proposes new metrics (selective risk at guaranteed TPR/FPR) and shows AUROC and OSCR often rank methods in REVERSE order (inconsistent evaluation).

## 4. Equations & assumptions
- Test mixture: p(x,ȳ) = p_O(x)·π for ȳ=∅ (OOD), p_I(x,ȳ)·(1−π) for ȳ∈Y (Eq. 1).
- Optimal selective function: linear combination of conditional risk r(x) and likelihood ratio p_O(x)/p_I(x).
- Assumptions: ID/OOD share input space; analysis is of the optimal strategy given known distributions (learning the strategy is not addressed).

## 5. Features / target
Features: image inputs. Target: ID class label; OOD samples carry the special label ∅ (reject target).

## 6. Validation design
OpenOOD evaluation; metrics: AUROC, OSCR, and proposed selective risk (classification error on accepted ID samples) at target TPR=0.8 with per-database FPR.

## 7. Numerical results / baselines
Table 2 (CIFAR-10 as ID, three OOD datasets; per column: selective risk / AUROC / OSCR — exact): MSP: 0.00984/0.861/0.973, 0.00984/0.885/0.971, 0.00984/0.905/0.971. KNN: 0.00665/0.896/0.974, 0.00665/0.914/0.972, 0.00665/0.916/0.973. VIM: 0.01232/0.872/0.972, 0.01232/0.888/0.971, 0.01236/0.873/0.974. KNN+MSP: 0.00652/0.896/0.977, 0.00652/0.914/0.976, 0.00652/0.916/0.976. VIM+MSP: 0.00676/0.879/0.977, 0.00676/0.894/0.976, 0.00676/0.900/0.976. Double-score (KNN+MSP, VIM+MSP) consistently best in ALL metrics; single-score leaders differ by metric (AUROC vs OSCR rankings reversed). MNIST table shows the same pattern (top table, partially extracted).

## 8. Code / data availability
Evaluation data and OODD implementations from OpenOOD benchmark [21] (public). No new code URL stated.

## 9. Leakage
None apparent; standard benchmark protocol.

## Limitations
- Theory assumes known p_I, p_O — learning the selective function is explicitly out of scope.
- Benchmark OOD fractions (π>0.5) are unrealistic; authors compensate with π-independent metrics but the regime is still artificial.
- Double-score gains are consistent but small in absolute terms (e.g., selective risk 0.00665→0.00652).

## 10. GSE overlap
Directly extends the 1008 (CARL) OOD angle with the OPTIMAL FORM: no-bet score = a·P(engine wrong | x) + b·OOD-score(x). GSE's OOD games are concrete: rookie-QB first starts, extreme weather games, international/travel games, mid-week coaching changes, games with anomalous line movement. The paper's metric critique also transfers: evaluating the no-bet layer on hit-rate alone vs coverage alone can reverse rankings — evaluate the joint (selective risk at guaranteed coverage), matching the numeric gates in 1006/1010. Extension of gap #4.

## 11. GSE implementation spec
**Double-score no-bet**: score_A = misclassification detector — calibrated P(engine's pick is wrong | features) from a meta-model on past engine errors; score_B = OOD discriminator — distance of the game's feature vector from the training distribution (e.g., Mahalanobis / kNN distance in feature space, or an isolation-forest score). No-bet rule: skip if a·score_A + b·score_B > τ, with (a, b, τ) tuned on 2024. This is exactly the paper's linear-combination optimal form. Effort: 2–3 days.

## 12. Reproducible test
2024 season, time-ordered: compare (i) no gate, (ii) score_A only, (iii) score_B only, (iv) double-score; metrics: selective risk (error on published) at matched coverage levels, plus AUROC-style ranking of each score; verify the paper's signature: single scores disagree on ranking, double-score dominates.

## 13. Acceptance / rejection gate (numeric gate)
ADOPT if the double-score gate cuts selective risk by ≥25% relative to the better of the two single-score gates at the SAME coverage (±2 pp), on 2024 time-ordered data; otherwise REJECT. The single decisive number: **selective-risk reduction ≥ 25% vs best single score at matched coverage**.

## 14. Improvement experiment
Learn the (a,b) weights by direct optimization of selective risk at target coverage (the paper's proposed metric) rather than hand-tuning — i.e., fit the linear combination as a 2-parameter logistic model on past engine outcomes, and test whether the learned weights beat fixed a=b. Also test adding the 1010 variance σ̂²(x) as a third score (triple-score).
