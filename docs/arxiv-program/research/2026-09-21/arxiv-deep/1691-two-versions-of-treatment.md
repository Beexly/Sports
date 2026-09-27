# 1691 Causal inference with two versions of treatment (arXiv:1705.03918)

**Citation:** Raiden B. Hasegawa, Sameer K. Deshpande, Dylan S. Small, Paul R. Rosenbaum (2018). *Causal inference with two versions of treatment*. arXiv:1705.03918. URL: https://arxiv.org/abs/1705.03918
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, all sections through appendix).
**Verdict:** ADAPT — the dual-interval trick (report the primary interval at full power AND a versions-robust interval with zero multiplicity penalty) is directly usable for GSE causal claims where the treatment has versions (e.g., "rest advantage" = 3 vs 7+ days; "dome" = fixed vs retractable roof); the football-study application is on-point for the lane.

## 1. Research question

Causal effects are defined as contrasts of potential outcomes under well-defined treatment and control — but real-world treatments come in versions (branded vs generic Advil). The paper asks: how do you test for a constant additive treatment effect while also probing whether versions matter, without splitting the sample, losing power, or paying a Bonferroni penalty? Illustrated with a study of whether high school football causes early-onset cognitive decline, where the *control* has two versions: "played no sport" vs "played a non-collision sport" (e.g., baseball).

## 2. Method / model

- **Setup:** matched observational study with full matching; randomization inference within matched sets for an additive treatment effect τ.
- **Two versions:** control versions a ("no sport") and b ("other sport"); potential outcomes Yij(0,a), Yij(0,b); version-specific effects τ^a, τ^b; τmin = min(τ^a,τ^b), τmax = max(τ^a,τ^b).
- **Dual intervals:** report (i) Ic — the usual 1−α CI for τ from the primary analysis of *everyone* (inverting randomization p-values Pτ0), and (ii) Iv — the shortest interval containing {τ0 : Pτ0>α or P^aτ0>α or P^bτ0>α} (in practice: the union of the three conventional intervals, or its convex hull).
- **Proposition 1:** (i) if there's really one version, Pr(Iv ⊇ Ic ⊇ τ) ≥ 1−α; (ii) in any case, Pr(Iv ⊇ τmin) ≥ 1−α — both statements hold jointly with NO multiplicity correction and NO power loss on the primary interval. The trick: it's a multiple-*assumptions* problem, not a multiple-*hypotheses* problem; Iv ⊇ Ic by construction.
- **Sensitivity analysis:** Rosenbaum Γ bounds for unmeasured confounding, shown for Γ=1 (random assignment) and Γ>1.
- **Comparisons:** vs Bonferroni (treats all comparisons equally, dilutes the primary) and vs omnibus F-test; simulation (Appendix) shows their method beats the F-test on power when versions differ by < ~30–40% in magnitude with the same sign.

## 3. Mathematics / equations / assumptions

- Potential outcomes under versions: Yij(0,a), Yij(0,b); δ^a_ij = Yij(1) − Yij(0,a), δ^b_ij = Yij(1) − Yij(0,b).
- Nulls: H^aτ0 : δ^a_ij = τ0 ∀i,j; H^bτ0; Hτ0 = H^aτ0 ∧ H^bτ0.
- One-sided p-values Pτ0, P^aτ0, P^bτ0; Ic^− = smallest [τ̃,∞) containing {τ0 : Pτ0 > α}; Iv^− = smallest [τ̃,∞) containing {τ0 : Pτ0>α or P^aτ0>α or P^bτ0>α}.
- Two-sided: intersect two one-sided 1−α/2 intervals; Ic = Ic^− ∩ Ic^+, Iv = Iv^− ∩ Iv^+.
- Assumptions: additive constant effect within the no-versions model; matched sets render treatment "as-if" random (Γ=1) with sensitivity analysis for hidden bias; versions are observable in the data.

## 4. Dataset / schema

- **Football study:** matched sets of high-school football players vs controls (two control versions: no-sport, other-sport); outcome = delayed word recall score in later life (cognitive decline measure).
- **Schema:** matched set id, football indicator, control-version indicator, delayed word recall score, covariates used for matching.
- **Access:** not stated (no public dataset named).

## 5. Features / target

- **Features:** treatment (played HS football), control version (no sport vs other sport), matched-set structure.
- **Target:** additive effect τ on delayed word recall score (words recalled).

## 6. Validation design

- **Design:** methodological paper — validation via (a) formal proof (Proposition 1), (b) sensitivity analysis over Γ, (c) simulation study vs omnibus F-test and Bonferroni (Appendix).
- **Benchmark anchor:** average delayed word recall declined by half a word (0.5) from age 65 to 72 — a substantive effect-size yardstick.

## 7. Exact results and baselines (numbers)

- **Football study (Γ=1):** Ic = [−0.308, 0.099]; Iv = [−0.357, 0.219] — both compatible with no effect; both incompatible with ±0.5 words (the full 65→72 age-related decline), i.e., a large harmful effect is ruled out.
- **Simulation:** their dual-interval method has better power than the omnibus F-test to reject Fisher's sharp null when versions differ by < ~30–40% in magnitude and have the same sign.
- **No multiplicity cost:** Ic is exactly the conventional "all controls" interval — considering versions cost zero power on the primary analysis.

## 8. Code / data availability

**Stated:** none (no code or data-availability statement in the paper).

## 9. Leakage and limitations

- **Constant additive effect** assumption within the no-versions model — restrictive; heterogeneous effects are folded into the versions analysis only coarsely.
- **Versions must be observable** in the data — doesn't handle latent versions (e.g., unknown differences in "rest" quality).
- **Matched-study design** — the machinery is randomization-inference on matched sets; GSE's observational data would need careful matching first.
- **No public code** — must reimplement the interval construction (though it's simple: invert tests, take unions).
- Football-study data not public.

## 10. GSE overlap

GSE makes causal-flavored claims about factors with natural versions: "rest advantage" (3 days vs 7+ days vs bye), "dome" (fixed vs retractable), "backup QB" (veteran vs rookie), "west-coast team traveling east" (1 vs 2 vs 3 time zones), "short week" (Thursday vs Monday→Sunday). Current practice either ignores versions or splits samples (losing power). No existing GSE doc implements a simultaneous primary + versions-robust interval.

## 11. GSE implementation spec

- **Target:** upgrade GSE's situational-factor causal write-ups (rest, travel, surface, dome) to report Ic + Iv pairs.
- **Data:** GSE's existing game database 2015–2024 with situational tags; matched pairs (same-team similar-spread games differing in the factor).
- **Method:** (1) match games on spread/total/Elo to create as-if-random sets; (2) randomization inference for the additive ATS/spread-residual effect; (3) report Ic (all games) and Iv (union over version splits, e.g., rest = [3–4 days] vs [7+ days]); (4) Rosenbaum Γ sensitivity analysis for hidden bias.
- **Serving:** research content ("we can rule out effects larger than X") and internal calibration of situational adjustments in the engine.
- **Effort:** 1–2 weeks.

## 12. Reproducible test

- **Dataset:** NFL games 2015–2024 with rest-day differentials; ATS margin (actual − spread) as outcome.
- **Metric:** dual intervals for the effect of "≥3 extra rest days" on ATS margin: version a = 3–4 extra days, version b = 7+ extra days (bye/mini-bye); matched on spread bucket and home/away.
- **Baseline to beat:** conventional single interval on all games; the method passes if (a) Ic reproduces the conventional interval exactly (sanity: zero power cost), (b) Iv is ≤ 40% wider than Ic (versions don't blow up uncertainty), and (c) the Γ sensitivity value at which Iv first includes 0 is ≥ 1.3 (the finding survives moderate hidden bias).
- **Window:** 2015–2024, ≥ 200 matched sets.

## 13. Acceptance / rejection gate + improvement experiment

- **Gate (numeric):** ADAPT if on the rest-advantage replication: Iv width ≤ 1.4× Ic width AND the Γ-value tipping Iv to include 0 is ≥ 1.3. REJECT if versions blow Iv to > 2× Ic (the versions-robust interval is too wide to be informative) or the primary finding tips at Γ < 1.1 (too fragile for hidden bias to matter).
- **Improvement experiment:** the paper assumes constant additive effects — extend to **heterogeneous versions via causal forests**: estimate τ^a(x), τ^b(x) as functions of covariates (team quality, weather), then report the dual intervals on the *average* while using the forest to identify where versions diverge. Second: apply the dual-interval reporting to **engine-model comparisons** — treat "model version" (v5.2.6 vs v5.2.7) as versions of the "treatment" of a modeling change, reporting the performance delta with versions-robust uncertainty.

**Verdict:** ADAPT — the zero-cost dual-interval construction is a practical upgrade for every causal claim GSE publishes about situational factors with versions.
