# [0483] Admissibility of a posterior predictive decision rule (arXiv:1507.06350v7)

**Citation:** Giri Gopalan (2015). *Admissibility of a posterior predictive decision rule*. arXiv:1507.06350v7. URL: https://arxiv.org/abs/1507.06350v7
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 16,809 chars).
**Verdict:** REJECT — a short pedagogical note proving Bayesian prediction rules are admissible; no data, no algorithm, no sports application.

## 1. Research question
Can the classic Wald/Berger statistical decision-theory results (Bayes rules, admissibility) be explicitly extended from parameter estimation to prediction problems, justifying the use of the posterior predictive distribution to make point predictions? The note's answer: yes — a Bayes prediction rule is admissible and is found by minimizing the posterior predictive risk.

## 2. Dataset / schema
No datasets. This is a 4-page decision-theory note with definitions, two theorems, and proofs. No data of any kind.

## 3. Method / model
Definitions: observed data Y_obs ∈ ℝ^M, to-predict Y_pred ∈ ℝ^N, parameter θ ∈ Θ ⊆ ℝ^k with proper prior g(θ) > 0 everywhere; posterior predictive p(y_pred | y_obs). A prediction rule Ŷ: ℝ^M → ℝ^N; loss L(Ŷ(Y_obs), Y_pred); frequentist prediction risk = average of L over (Y_obs, Y_pred) holding θ fixed; Bayes prediction risk = average over the joint (Y_pred, Y_obs, θ).
- **Theorem 1:** a Bayes prediction rule is found by minimizing the posterior predictive risk ∫ L(ŷ(y_obs), y_pred) p(y_pred | y_obs) dy_pred for arbitrary y_obs — θ integrates out as a nuisance parameter (Fubini), factoring p(y_pred, y_obs) = p(y_pred|y_obs)p(y_obs).
- **Theorem 2:** Bayes prediction rules are admissible — the standard proof: if a competing rule dominated on Θ, continuity of risk gives a set S ∋ θ* of strict improvement, and g(θ) > 0 on S yields strictly smaller Bayes risk, contradiction.
- Corollary-style remark: the posterior predictive mean is admissible and minimizes Bayes prediction risk under squared-error loss (under weak conditions), exactly as the posterior mean does in estimation.

## 4. Equations & assumptions
- Posterior predictive: **p(y_pred | y_obs)** from joint f(y_pred, y_obs | θ)g(θ).
- Posterior predictive risk (minimand, Thm. 1): **∫ L(ŷ(y_obs), y_pred) p(y_pred | y_obs) dy_pred**.
- Frequentist prediction risk of rule Ŷ at θ: **∬ L(ŷ, y_pred) f(y_pred, y_obs | θ) dy_pred dy_obs**; Bayes prediction risk: the same averaged over g(θ).
- **Assumptions:** proper prior integrating to unity, g(θ) > 0 ∀θ ∈ Θ; all variables continuous with Lebesgue-integrable densities; Fubini conditions hold; frequentist and Bayes prediction risks continuous and well-defined ∀θ, Ŷ, Y_pred.

## 5. Features / target
Not applicable — theory note. Abstract "Y_obs / Y_pred" with no concrete features or target definitions.

## 6. Validation design
Not applicable — no empirical content; validation is by proof.

## 7. Numerical results / baselines
None stated in the paper — zero numerical results. This is a conceptual/justificatory note.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
- No empirical claims, no leakage surface. Adversarial notes: the result is a straightforward port of textbook decision theory (the author admits Berger and Robert "remark upon the ease" of this and no explicit result was previously stated); admissibility is a weak optimality property (it only says no rule uniformly dominates — it does not pick among admissible rules, and many bad rules are admissible). The "weak conditions" for the posterior-predictive-mean claim are not spelled out. Requires g(θ) > 0 everywhere — excludes priors with point masses or truncated support as stated.
- **External validity to NFL:** none. A decision-theoretic justification for using posterior predictive distributions changes no GSE engineering choice; GSE's pipeline is frequentist/empirical (calibration on held-out data), not Bayesian decision-theoretic.

## 10. GSE overlap
Checked against `existing-research-map.md`: Garrett's corpus has no Bayesian decision-theory / admissibility content; the uncertainty stack is empirical (conformal, CQR, Venn-Abers, Clopper-Pearson). Companion-adjacent to 0485 (admissible predictive density estimation, the frequentist analog). Not a duplicate; out of scope.

## 11. GSE implementation spec
None — there is nothing to implement; the note justifies existing Bayesian practice rather than proposing new methodology. No build recommended.

## 12. Reproducible test
Not applicable — no empirical claim.

## 13. Acceptance / rejection gate
REJECTED: conceptual note with no actionable content for a sports prediction engine. Closed.

## 14. Improvement experiment
If a Bayesian GSE lane ever opens (e.g., posterior predictive distributions over game outcomes for Kelly-style bet sizing under uncertainty — a standing gap in the map: "Kelly criterion, zero papers read"): the honest follow-up is not this note but an empirical bake-off of Bayesian hierarchical team-strength models vs. GSE's current pipeline on 2020–2025 nflverse, scoring both on log-loss and realized betting ROI. This note would then be cited as the decision-theoretic motivation, not the method.
