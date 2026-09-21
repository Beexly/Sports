# 0266 Is checking for sequential positivity violations getting you down? Try sPoRT! (arXiv:2412.10245v3)

**Citation:** Arthur Chatton et al. (2024). *Is checking for sequential positivity violations getting you down? Try sPoRT!* (current title in text: *Regression trees for nonparametric diagnostics of sequential positivity violations in longitudinal causal inference*). arXiv:2412.10245v3. URL: https://arxiv.org/abs/2412.10245v3
**Ledger completed:** 2026-09-21. **Read:** full text (local extract, 1,965 lines, including appendices).
**Verdict:** ADAPT — sPoRT is a practical pre-analysis diagnostic for sequential positivity violations that GSE should run before any longitudinal causal analysis (e.g., the causal-injury-impact lane); it is a diagnostic tool, not an estimator, and must not be mistaken for one.

## 1. Research question

In longitudinal causal inference (treatments and confounders measured repeatedly over time), the sequential positivity assumption — that every treatment trajectory of interest has nonzero probability within every covariate stratum at every time point — is routinely assumed and rarely checked. The paper asks: can regression trees be used to *diagnose* sequential positivity violations nonparametrically, identifying the specific covariate-defined subgroups and time points where support for a treatment rule breaks down? It proposes sPoRT (sequential Positivity Regression Trees) and demonstrates it on a real HIV-treatment cohort.

## 2. Dataset / schema

- **Application cohort:** 2,352 HIV-positive children aged 12–59 months from South Africa, Malawi, and Zimbabwe.
- **Longitudinal structure:** observations at 0, 1, 3, 6, 9, and 12 months; 1,893 children remained under follow-up at 9 months.
- **Treatment:** antiretroviral therapy (ART) initiation; once initiated, ART stays on.
- **Outcome:** height-for-age z-score (HAZ).
- **Time-varying covariates:** CD4 count, CD4 percentage, weight-for-age z-score (WAZ). Baseline covariates: sex, age, year of ART initiation, baseline HAZ.
- **Treatment rules evaluated:** (1) always ART; (2) never ART; (3) start ART when CD4 < 750 or CD4% < 25%; (4) start ART when CD4 < 350 or CD4% < 15%.
- **Access:** clinical cohort data, not public. The method itself is software (see §8).

## 3. Method / model

sPoRT procedure:
1. For each treatment rule of interest and each follow-up time, define the subgroup still following the rule.
2. Repeatedly fit regression trees (the paper's implementation) predicting rule-adherence from the covariate history, partitioning the covariate space into subgroups.
3. Flag subgroups whose estimated probability of following the rule falls below a positivity threshold β as positivity violations; subgroups smaller than proportion α of the sample are not flagged (minimum-size guard).
4. Hyperparameters: α = minimum subgroup proportion (defaults explored: 0, 0.05, 0.1); β = positivity threshold (defaults: 0.01, 0.05, or the adaptive 5/(√n·ln n)); γ = maximum number of variables allowed per tree (defaults: 2, 3, or all).
5. Main application run: α = 0.05, β = 5/(√n_t·ln n_t) with n_t the rule-following sample size at time t, γ = 2.
6. Report violations per rule per time point, and optionally pool over time.

## 4. Equations & assumptions

Paper's mathematics, quoted faithfully:

- Positivity threshold rule: a covariate-defined subgroup is flagged when its estimated probability of following the treatment rule < β, with β ∈ {0.01, 0.05, 5/(√n·ln n)} and n the relevant sample size.
- Minimum subgroup proportion: subgroups with relative size < α (α ∈ {0, 0.05, 0.1}) are excluded from flagging.
- Tree complexity cap: at most γ variables per tree (γ ∈ {2, 3, all}).
- Sequential positivity assumption being diagnosed: at each time t, P(follow rule at t | covariate history, followed rule so far) > 0 for all covariate strata — i.e., the standard sequential positivity condition for longitudinal causal estimands (g-formula / MSM / TMLE).

Assumptions of the diagnostic itself: the regression trees adequately approximate the true adherence probabilities (misspecification yields false positives/negatives); the (α, β, γ) defaults are reasonable for the sample size; flagging is diagnostic — it does not *fix* violations (that requires redefining the rule, trimming, or alternative estimands).

## 5. Features / target

**Features:** time-varying CD4 count, CD4%, WAZ; baseline sex, age, initiation year, HAZ. **Treatment rules:** the four ART rules above. **Diagnostic target:** per-subgroup, per-time-point estimated probability of rule adherence, thresholded at β. **Outcome (of the underlying causal analysis):** HAZ — but sPoRT itself does not estimate effects.

## 6. Validation design

No train/test split — this is a methods/diagnostics paper. Validation consists of: (1) the real-data application showing the diagnostic finds plausible violations (rules 3 and 4, the CD4-threshold rules, show violations at 6 and 9 months where clinical practice genuinely diverges from the rule); (2) sensitivity of findings to (α, β, γ) settings; (3) the negative control that pooling over time finds no violations, illustrating how temporal aggregation can mask sequential violations. No simulation study with known ground-truth violations is described in the extract.

## 7. Numerical results / baselines

All numbers are the paper's:

- **Cohort:** 2,352 children; 1,893 in follow-up at 9 months; visits at 0, 1, 3, 6, 9, 12 months.
- **Main run (α = 0.05, β = 5/(√n_t·ln n_t), γ = 2):** Rule 3 (CD4 < 750 or CD4% < 25%) — 2 violations at 6 months, 13 at 9 months. Rule 4 (CD4 < 350 or CD4% < 15%) — 1 violation at 6 months, 7 at 9 months. No violations detected when pooling over time.
- **Adaptive threshold examples:** Rule 3: n1 = 2060 → β = .014; n2 = 1346 → β = .019; n3 = 794 → β = .027; n4 = 565 → β = .033. Rule 4 treatment support: n1 = 1164 → β = .021; n2 = 720 → β = .028; n3 = 354 → β = .045; n4 = 226 → β = .061.
- **Authors' interpretation:** the CD4-threshold rules genuinely lack support in some covariate strata at later times (clinicians deviate from rigid thresholds), while the always/never rules are well-supported; time-pooling hides the problem. No effect estimates are reported — sPoRT is explicitly not an estimator.

## 8. Code / data availability

Paper states: R package `PoRT` and a companion notebook at `github.com/ArthurChatton/sPoRT-notebook`. Clinical data not shared. The method is therefore re-runnable on GSE data via the authors' package (verify the package exists on CRAN/GitHub before depending on it).

## 9. Leakage & limitations

- **Diagnostic, not estimator.** sPoRT tells you support is thin; it does not estimate effects under violations, choose the remedy (redefine rule vs trim vs change estimand), or quantify resulting bias. Teams that run it and proceed anyway gain nothing.
- **Tree instability.** Regression trees are high-variance; the flagged subgroups can change with seeds and small data perturbations. The paper caps complexity (γ = 2) to tame this, but no stability analysis (e.g., flag-frequency over bootstrap refits) is reported.
- **Threshold arbitrariness.** β = 5/(√n·ln n) is a sensible adaptive choice but still a convention; violations near the threshold are judgment calls, and α = 0.05 silently discards small-but-real subgroups.
- **No simulation validation in the extract.** The diagnostic is demonstrated, not benchmarked against known violations — false-positive/negative rates are unknown.
- **Clinical→sports transfer:** the HIV application has monotone treatment (once on ART, always on) and protocol-driven rules; sports "treatments" (injuries, scheme changes) are messier, with time-varying confounding that is harder to enumerate.
- **Computational note:** refitting trees per rule per time point is cheap, but on play-level NFL data (hundreds of thousands of rows × many candidate rules) the combinatorial surface needs scoping.

## 10. GSE overlap

**New capability (diagnostic).** The existing-research map covers causal-inference topics (Yam & Lopez 2019, fourth-down selection-bias literature, FineCausal, the ML brief's causal-inference area) and the companion paper in this wave (0265) supplies an estimand-first protocol — but **nothing in the corpus addresses sequential positivity checking**, and gap #9 (causal injury impact) is precisely a longitudinal causal problem (a player's absence unfolds over weeks with time-varying confounders like opponent strength and game script). sPoRT slots in as the missing pre-flight check before any such analysis. It complements rather than duplicates the 0265 protocol: 0265 tells you *what* to estimate, sPoRT tells you whether the data *supports* estimating it over time.

## 11. GSE implementation spec

1. **Install and verify** the authors' `PoRT` R package (or reimplement the tree-diagnostic loop in Python if the package is unavailable) — half a day.
2. **Gate every longitudinal causal analysis:** before estimating any multi-week effect (injury impact over a season, scheme-change effects, rookie-development curves), run sPoRT over the candidate treatment rules × time points with α = 0.05, β = 5/(√n_t·ln n_t), γ = 2–3.
3. **NFL instantiation:** treatment rule example — "team plays without its starting QB for weeks t..t+k"; time-varying covariates — opponent strength, home/away, rest, game script; check support at each week. If violations cluster (e.g., no comparable healthy-team-weeks against strong opponents late in the season), redefine the rule or restrict the estimand *before* estimating.
4. **Report the diagnostic** alongside every causal estimate: rules checked, (α, β, γ) used, violations found, and the remedy chosen. This becomes part of the causal SOP from 0265.
5. **Effort:** 1–2 days to operationalize; negligible compute.

## 12. Reproducible test

Port the diagnostic to a GSE longitudinal question: "effect of losing the starting left tackle for the remainder of the season" on offensive EPA/play, weeks 1–18, 2016–2024 nflverse. Define 2–3 treatment rules (e.g., "LT out from week t onward"), run sPoRT per week with the paper's main-run hyperparameters, and record flagged subgroups. Metric: the diagnostic runs end-to-end and its flags are *actionable* — i.e., each flagged subgroup maps to an identifiable data-support gap (e.g., "no LT-out weeks vs top-5 defenses after week 12"), not tree noise. Baseline: the current practice of not checking at all. Success = at least one non-obvious support gap found that changes the analysis plan (rule redefinition or estimand restriction).

## 13. Acceptance / rejection gate

ADAPT sPoRT as a mandatory pre-analysis gate for longitudinal causal work if the LT test (§12) runs cleanly and surfaces at least one actionable support gap — the bar is low because the cost is negligible and the failure mode it guards against (estimating effects where no comparable units exist) is severe. REJECT it as a standalone deliverable: never publish "sPoRT found no violations" as a result in itself, and if the R package proves unmaintained, reimplement the 30-line core (tree → subgroup adherence probability → β threshold) rather than depending on it.

## 14. Improvement experiment

Go beyond the paper by making the diagnostic **stability-aware and remedy-linked.** (1) Bootstrap the tree fitting (e.g., 50 refits) and report each subgroup's *flag frequency* rather than a single binary flag — turning the diagnostic from a point claim into a distribution over support gaps, which directly addresses the tree-instability limitation. (2) Link each stable flag to an automatic remedy suggestion: redefine the rule (narrow the treatment definition), trim the subgroup, or switch to a stochastic intervention estimand — the paper stops at diagnosis, but a diagnostic that proposes the fix is what an analyst actually needs. For GSE, the concrete output would be a "causal readiness report" per question: estimand (from 0265's protocol) + support map (from stabilized sPoRT) + recommended remedy, generated before any effect is estimated.
