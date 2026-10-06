# [1013] Predictor-Rejector Multi-Class Abstention: Theoretical Analysis and Algorithms (arXiv:2310.14772)

## Citation / full-text source

- arXiv:2310.14772 — full text: https://arxiv.org/pdf/2310.14772
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Anqi Mao, Mehryar Mohri, Yutao Zhong (Courant Institute / Google Research, 2023; v2). *Predictor-Rejector Multi-Class Abstention: Theoretical Analysis and Algorithms*. arXiv:2310.14772v2. URL: https://arxiv.org/abs/2310.14772
**Full-text source read:** local cache `/tmp/arxiv750-cache/fulltext/2310.14772.txt` (arXiv conversion; read in full — abstract, §§1–6, experiments Tables 1–2 with exact values, Appendix F lemmas; single-stage vs two-stage predictor-rejector theory).
**Ledger completed:** 2026-09-21. **Read:** full text.
## Verdict

**ADAPT** — companion to 1012 in the predictor-rejector (h,r) formulation; its two-stage variant is the best-performing method in the paper and the formulation where predictor and rejector use DIFFERENT feature families fits GSE exactly (game features vs market/OOD features).

## 1. Research question
In the predictor-rejector formulation of multi-class abstention (learn h and r from possibly different function families, explicit abstention cost c), can we define Bayes-consistent surrogate losses — resolving the Ni et al. 2019 open question — for both single-stage (joint) and two-stage (fixed predictor) settings, and do the resulting algorithms beat SOTA score-based methods?

## 2. Dataset / schema
SVHN, CIFAR-10, CIFAR-100 (same protocol as 1012: ResNet-34 / WRN-28-10, SGD+Nesterov, 200 epochs, c = {0.03, 0.05, 0.15}). Baselines: Mozannar & Sontag 2020 (μ=1.0), Cao et al. 2022 (μ=1.7) score-based surrogates; single-stage predictor-rejector with ℓ_mae. Evaluation: abstention loss, misclassification error on accepted data, rejection ratio; means±SD over trials.

## 3. Method / model
Predictor-rejector formulation: learn (h, r) with h∈H, r∈R (R "regular for abstention": for each x some f∈R accepts and some g∈R rejects — Definition 19). New surrogate-loss families for both stages with H-consistency bounds (abstention excess risk ≤ Γ(surrogate excess risk)); resolves the open question positively. Key structural advantage argued over score-based: the rejector can be a DIFFERENT function family using DIFFERENT features than the predictor. Calibration-gap lemma (Lemma 20): C*_Labs(H,R,x) = 1 − max{max_{y∈H(x)} p(x,y), 1−c}.

## 4. Equations & assumptions
- Abstention loss with cost c; surrogate families for (h,r); H-consistency bounds via calibration gaps and minimizability gaps.
- Conditional risk: C_L(h,r,x) = Σ_y p(x,y) L(h,r,x,y).
- Assumptions: R regular for abstention; standard boundedness.

## 5. Features / target
Features: images. Target: class label with abstention option at cost c.

## 6. Validation design
Same as 1012 plus Table 2's three-metric breakdown (abstention loss / accepted-set error / rejection ratio) on CIFAR-10.

## 7. Numerical results / baselines
Table 1 (abstention loss, exact): SVHN — Mozannar 1.61%±0.06%, Cao 2.16%±0.04%, single-stage P-R 2.22%±0.01%, two-stage P-R 0.94%±0.02%. CIFAR-10 — 4.48%±0.10%, 3.62%±0.07%, 3.64%±0.05%, 3.31%±0.02%. CIFAR-100 — 10.40%±0.10%, 14.99%±0.01%, 14.99%±0.01%, 9.23%±0.03%. Two-stage P-R wins everywhere and beats 1012's two-stage score-based on CIFAR-100 (9.23% vs 9.54%). Table 2 (CIFAR-10, abstention loss / accepted misclassification error / rejection ratio — exact): Mozannar 4.48%±0.10% / 4.30%±0.14% / 25.99%±0.41%; Cao 3.62%±0.07% / 3.08%±0.10% / 28.27%±0.18%; single-stage P-R 3.64%±0.05% / 3.54%±0.05% / 17.21%±0.22%; two-stage P-R 3.31%±0.02% / 2.69%±0.05% / 22.83%±0.21%. Note the two-stage P-R achieves the lowest accepted-set error (2.69%) at a LOWER rejection ratio (22.83%) than Cao (28.27%) — better selection, not just more abstention.

## 8. Code / data availability
None stated. Data: public benchmarks.

## 9. Leakage
Standard protocol; no concerns.

## Limitations
- Same c-selection caveat as 1012 (hand-set near Bayes error).
- Single-stage P-R (ℓ_mae) is no better than the baselines — the gains are entirely in the two-stage variant.
- Deferral-to-human experiments mentioned in the framing but the extracted tables focus on abstention loss.

## 10. GSE overlap
Refines 1012's implementation spec decisively: use the PREDICTOR-REJECTOR formulation (not score-based), because GSE's rejector needs different inputs than the predictor — the predictor consumes game/team features; the rejector should consume market features (line moves, steam), uncertainty features (CQR width, ensemble disagreement), and OOD scores. The paper's argument that P-R is "more natural" when h and r differ is exactly GSE's situation. Table 2's "lower error at lower rejection ratio" is the efficiency property GSE wants: fewer no-bets, better published set. Extension of gap #4.

## 11. GSE implementation spec
**Predictor-rejector no-bet head (P-R, two-stage)**: freeze engine h. Train rejector r on a DIFFERENT feature set: line-move magnitude/timing, reverse-line-movement flags, CQR interval width, ensemble disagreement (1009's p*), OOD distance (1011's score_B), news-volume anomaly. Surrogate: exponential loss on the rejector per the paper's two-stage family; abstention cost c mapped from the sportsbook vig (a wrong pick costs ~1.1 units of a 1-unit bet; abstention costs 0). Tune the accept/reject threshold to a target no-bet rate. Effort: 2–4 days (shared with 1012's build — implement the P-R variant).

## 12. Reproducible test
Same protocol as 1012 (2020–2023 train, 2024 time-ordered test), but compare two-stage SCORE-BASED (1012) vs two-stage PREDICTOR-REJECTOR (this paper) vs confidence threshold; metrics: abstention loss at vig-derived c, accepted-set hit rate, rejection ratio, profit.

## 13. Acceptance / rejection gate (numeric gate)
ADOPT if two-stage P-R beats two-stage score-based on abstention loss by ≥5% relative (paired p<0.05) OR beats the confidence baseline by ≥15% relative with rejection ratio ≤ 30%; otherwise REJECT. The single decisive number: **abstention-loss reduction ≥ 5% vs two-stage score-based (or ≥15% vs confidence baseline) at rejection ratio ≤ 0.30**.

## 14. Improvement experiment
Deferral cascade: instead of binary abstain, use the rejector's score to route into THREE tiers — publish (engine confident), human review (Garrett, the "defer to human" special case the paper's framing explicitly supports), and hard no-bet. Measure whether the human-review tier earns its labor cost in recovered edge vs the binary version.
