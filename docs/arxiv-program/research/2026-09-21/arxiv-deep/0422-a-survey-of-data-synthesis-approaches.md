# [0422] A Survey of Data Synthesis Approaches (arXiv:2407.03672v1)

**Citation:** Chang et al. (2024). *A Survey of Data Synthesis Approaches*. arXiv:2407.03672v1. URL: https://arxiv.org/abs/2407.03672v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 979 lines).
**Verdict:** ADAPT — adopt the survey's taxonomy as the design checklist for constrained synthetic augmentation of rare NFL game states (diversity, balancing, domain shift, edge cases), but only with its label-consistency and distribution filters, and never blended into final untouched test windows.

## 1. Research question
This is a survey, not an empirical paper: it asks how the field of data synthesis for machine learning is organized — what objectives synthetic data serves, what generation eras/methods exist, how synthetic data is filtered for quality, and where the field is heading. There is no single hypothesis tested and no original experiment.

## 2. Dataset / schema
No original dataset. The survey organizes the literature; it references a companion code/literature list at https://github.com/MiuLab/SynData-Survey. No schema applies.

## 3. Method / model
Taxonomy (the paper's contribution): Four augmentation objectives — (1) diversity (broaden coverage of the input space), (2) balancing (correct class imbalance), (3) domain shift (bridge train/test distribution gaps), (4) edge cases (cover rare but important scenarios). Four generation eras — (1) expert-knowledge/rule-based synthesis, (2) direct training of generative models on real data, (3) pretrain-then-fine-tune generators, (4) foundation models used without fine-tuning (prompted generation). Three filtering objectives — (1) basic quality (fluency/validity), (2) label consistency (the synthetic example's label is actually correct), (3) data distribution (the synthetic set matches the target distribution, avoiding drift). Future priorities: quality over quantity, standardized evaluation of synthetic data, and multimodal augmentation.

## 4. Equations & assumptions
No equations stated. The paper is a conceptual taxonomy; it formalizes nothing mathematically. Assumptions implicit in the surveyed literature: that synthetic examples can be labeled reliably (label consistency), and that filtered synthetic data does not distort the target distribution.

## 5. Features / target
Not applicable — survey. The "features" of the taxonomy are the objective × era × filtering dimensions described in §3.

## 6. Validation design
Not applicable — no experiments. The survey's evaluative content is its synthesis of how the literature validates synthetic data: downstream task performance, human evaluation, and distributional similarity metrics.

## 7. Numerical results / baselines
No original numerical results. The survey reports no tables of its own experiments; all numbers cited are from the surveyed papers and are not reproduced here as claims of this paper.

## 8. Code / data availability
Companion repository: https://github.com/MiuLab/SynData-Survey (literature/code list). No dataset of its own.

## 9. Leakage & limitations
Adversarial, applied to GSE's potential use: (a) The survey's own warning — synthetic data can silently distort the training distribution (its "data distribution" filtering objective exists because this failure is common). (b) Label consistency is the binding constraint for sports: a synthetic "rare game state" play must have a trustworthy outcome label, but rare NFL states (e.g., 4th-and-15 from own 10, down 8, 1:40 left) have almost no real outcomes to anchor the label. (c) Foundation-model generation without fine-tuning (era 4) risks confident fabrication of play sequences that violate football's structural constraints (down/distance logic, clock rules). (d) If synthetic rows leak into the final evaluation window, all performance claims are void — the survey's taxonomy does not itself enforce evaluation hygiene. External validity to NFL: the framework is domain-general; the risk profile is domain-specific and severe for low-sample regimes like props.

## 10. GSE overlap
New capability with a caution flag. The existing-research-map contains no synthetic-data or augmentation research for GSE models — the only "synthesis" hits are prediction-market tooling names (unrelated). The map's gaps do not name augmentation explicitly, but the props program's chronic problem (rare game states, thin prop samples) is exactly the survey's "edge cases" and "balancing" objectives. Nothing in `docs/research/2026-09-18-props-reverse-engineering/` or the NGS taxonomy covers synthetic augmentation. This is a methods import, not a duplication.

## 11. GSE implementation spec
Constrained augmentation pilot, not a data pipeline: (1) Scope: rare game-state augmentation for the 4th-down/WP model and rare prop angles (e.g., defensive TD props) — era 1 (expert/rule-based) only: perturb real plays within football-legal bounds (down/distance ±1, yard line ±3, score ±3, clock ±30s) and recompute the label deterministically from the play's actual outcome where the perturbation preserves the outcome, else discard. (2) Filtering per the survey: basic quality (down/distance/clock legality check), label consistency (only keep perturbations where the outcome label is invariant or recomputable), distribution (cap synthetic rows at ≤10% of any training batch; match marginal distributions of score state and field position). (3) Never generate with an LLM (era 4 rejected for this use). Effort: 1–2 days for the perturbation engine + filters.

## 12. Reproducible test
Dataset: nflverse 2020–2024. Three-way comparison on identical model code: (A) no augmentation, (B) class weighting only, (C) constrained synthetic augmentation per §11. Target: 4th-down decision model (go-for-it success probability) evaluated on a strictly chronological holdout — the full 2025 season (Weeks 1–3 available; use 2024 as primary test if 2025 sample is thin), with the test window containing zero synthetic rows. Metric: Brier score and calibration slope on 4th-down conversion probability; secondary: decision-value (expected points) of the model's recommendations.

## 13. Acceptance / rejection gate
ADOPT constrained augmentation only if arm (C) beats BOTH (A) and (B) by ≥ 0.003 Brier on the untouched chronological test window AND the calibration slope stays within [0.9, 1.1] (no miscalibration introduced). REJECT if (C) fails to beat class weighting (B) — the survey's "quality over quantity" moral says a fancier generator that cannot beat a one-line weighting change is not worth the complexity — or if any synthetic row is found in the test window on audit.

## 14. Improvement experiment
Go beyond the survey's static filtering: implement a "label-consistency critic" — a separately trained discriminator that predicts whether a synthetic play's assigned label matches what a held-out outcome model would assign, and route only high-critic-confidence synthetics into training (active filtering). Then test whether critic-filtered augmentation beats the survey's rule-based filtering on the §12 gate. This turns the survey's "label consistency" objective from a checklist item into a learned, measurable component — the experiment the survey describes as future work but never constructs.
