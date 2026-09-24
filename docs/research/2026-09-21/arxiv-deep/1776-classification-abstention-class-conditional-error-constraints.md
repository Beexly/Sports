# [1776] Classification with Abstention under Class-Conditional Error Constraints (arXiv:2609.22632)

**Citation:** (authors as listed on arXiv) *Classification with Abstention under Class-Conditional Error Constraints*. arXiv:2609.22632. URL: https://arxiv.org/abs/2609.22632
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML — abstract, theory sections (VC upper bound, matching minimax lower bound, deterministic vs randomized feasibility), experiments on Vertebral/MAGIC/BCI/Phoneme/Sensorless/synthetic with exact table values, conclusion).
**Verdict:** ADAPT — per-class error caps with ambiguity minimization is exactly the multi-market version of GSE's gating problem (cap the loss rate on spreads, totals, and moneylines *separately* while minimizing how often the card goes quiet); the product-vs-additive ambiguity finding and the randomized-feasibility fix port directly, but the implementation must be rebuilt on sports data.

## 1. Research question
In classification with abstention, can we constrain the error rate *separately for each class* (rather than a single pooled error budget) while minimizing abstention/ambiguity, what are the statistical rates for doing so, and does a deterministic learner always suffice — or can strict per-class feasibility force a pathological abstention rate that only randomization fixes?

## 2. Dataset / schema
Real datasets: Vertebral, MAGIC (gamma telescope), BCI, Phoneme, Sensorless (sensorless drive diagnosis); plus a synthetic dataset. Comparisons: the proposed product-ambiguity and additive-ambiguity learners vs Lei (2014)-style baseline. Metrics: ambiguity (abstention) risk and per-class errors R0, R1 against a 0.05 per-class target.

## 3. Method / model
A selective classifier minimizing an ambiguity (abstention) objective subject to separate class-conditional error constraints (R0 ≤ 0.05, R1 ≤ 0.05). Two ambiguity formulations: *product* ambiguity (joint, multiplicative over the two class-conditional terms) and *additive* ambiguity (sum). Theory: excess-risk upper bound scaling roughly as √((d_H log n + log(1/δ))/n) with the hypothesis class VC dimension d_H, and a matching minimax lower bound up to logarithmic factors. Key structural result: a deterministic learner under *strict* feasibility can be forced into excess ambiguity risk of 1 (abstain on everything), while a randomized learner removes the slack and attains the bound.

## 4. Equations & assumptions
- Upper rate: excess risk O(√((d_H log n + log(1/δ))/n)) for hypothesis class with VC dimension d_H, sample size n, confidence 1−δ.
- Matching minimax lower bound up to log factors (rate-optimal).
- Feasibility pathology: under strict deterministic feasibility, excess ambiguity risk can be forced to 1; randomized prediction restores feasibility without the slack.
- Constraints: class-conditional errors R0 ≤ α0, R1 ≤ α1 (experiments use 0.05/0.05); objective: minimize product or additive ambiguity.
- Assumptions: i.i.d. sampling; bounded hypothesis complexity (finite VC dimension); the abstention option with per-class error caps.

## 5. Features / target
Standard UCI-style tabular features per dataset (e.g., Vertebral biomechanical features, MAGIC image moments, BCI signal features). Target: binary class label; the learner outputs a class or abstains.

## 6. Validation design
Empirical comparison of product vs additive ambiguity learners vs the Lei baseline on the five real datasets + synthetic, reporting ambiguity risk and realized per-class errors R0/R1 against the 0.05 targets. Theory validated by the matching upper/lower rate pair.

## 7. Numerical results / baselines
- Vertebral: product ambiguity 0.2591 vs additive 0.3086 vs Lei 0.3505 (product best).
- MAGIC: product 0.4332 vs additive 0.5107; both hold errors below 0.05.
- BCI: product (linear hinge) ambiguity 0.0077 with errors R0 = 0.0505, R1 = 0.0450 vs Lei ambiguity 0.2293 (product wins by ~30×).
- Phoneme: additive 0.5292 vs Lei 0.5606; product 0.4482 but violates with R0 = 0.0551 (over the 0.05 cap — product infeasible here).
- Sensorless: product 0.0166, additive 0.0644, Lei 0.2833.
- Synthetic: additive 0.5056 vs Lei 0.6038; product 0.4415 with errors 0.0512/0.0479 (again slightly over cap).
- Pattern: product ambiguity usually abstains less but can violate the per-class cap; additive is the safer, usually-feasible choice.

## 8. Code / data availability
None stated in the extracted text.

## 9. Leakage & limitations
- Binary classification only; GSE's markets are multi-outcome and the "classes" would be market types, an extra modeling step.
- Product ambiguity's cap violations (Phoneme R0 = 0.0551, synthetic 0.0512/0.0479) show the better-looking objective is the less reliable one — the paper doesn't give a selection rule between the two.
- VC-dimension bounds are worst-case and loose for the model classes GSE actually uses.
- No cost asymmetry: all errors within a class cost the same; sports losses are in units, not counts.

## 10. GSE overlap
Extension, not duplicate: nothing in the corpus constrains error *per market type*. GSE's natural "classes" are spread / total / moneyline (or bet tier); today's gating uses one global threshold. The existing-research map's abstention gap covers exactly this — separate risk budgets per market are new capability.

## 11. GSE implementation spec
Build **per-market gated selection**: (a) define classes as market types (spread, total, moneyline); (b) learn one gate per class with separate error caps (e.g., spread loss-rate ≤ 45%, total ≤ 45% — caps set from bankroll tolerance, not 0.05); (c) minimize additive ambiguity (abstention rate) subject to the caps, per the paper's safer formulation; (d) implement the paper's randomized tie-breaking at the gate boundary so strict feasibility doesn't force degenerate all-abstain weeks; (e) log realized per-class error weekly and re-fit caps quarterly. Effort: ~2 weeks (three gate models + randomization + monitoring).

## 12. Reproducible test
Dataset: GSE graded picks 2022–2025 split by market type. Baseline: single global gate (today's approach). Candidate: per-class gates with additive ambiguity. Metrics: per-market loss rate vs cap, overall abstention rate, units. The candidate must hold every class under its cap while abstaining less than the global gate.

## 13. Acceptance / rejection gate
ADAPT accepted if per-class gating holds all market types under their caps with ≥ 15% lower abstention than the global gate on walk-forward seasons; else REJECT. Hard fail: if any market type's realized error exceeds its cap in >1 of 4 test seasons (the Phoneme-style infeasibility), fall back to additive-only and re-test before any ship decision.

## 14. Improvement experiment
Make the caps *adaptive to bankroll state*: tighten per-class error caps after drawdown weeks and relax them when the bankroll is above water — a dynamic version of the paper's fixed caps. Test whether adaptive caps improve risk-adjusted return (Sharpe of weekly units) vs fixed caps; the paper's theory assumes fixed constraints, so this probes whether the feasibility machinery survives time-varying targets.

**Verdict:** ADAPT — per-class error caps with ambiguity minimization is the right formalization of multi-market gating and the randomized-feasibility fix is a real trap avoided, but the binary-class, count-loss formulation must be rebuilt for market types and unit losses.
