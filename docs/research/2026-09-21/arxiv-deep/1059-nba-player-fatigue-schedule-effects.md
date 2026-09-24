# 1059 — Tired of Misattribution, Modeling Player Fatigue in the NBA

## Citation / full-text source

- arXiv:2112.14649v1 — full text: https://arxiv.org/pdf/2112.14649
- (Section added during wave-2 reconciliation; citation details also appear in the ledger front matter/title above.)

- **arXiv ID**: 2112.14649v1
- **Full-text URL**: https://arxiv.org/pdf/2112.14649v1
- **Authors**: Austin Stephen, Matthew Yep, Grace Fain
- **Lane**: calibration_uncertainty
- **Verdict**: **ADAPT**
- **Replacement chain**: fresh-search replacement for 1405.0352v2 ("Asymptotic Theory for Random Forests") — the assigned paper was already in `done-ids.txt` (assigned duplicate, not a REJECT verdict).
- **Fresh-search record**: On 2026-09-21 I ran 25 fresh arXiv queries over sports scheduling, tournament design, and fixture congestion (surviving verbatim records include `arxiv fixture congestion football prediction modeling paper`). From the deduped candidate pool, 2112.14649v1 was selected because (a) it is the only candidate directly estimating schedule-fatigue effects on game outcomes with reported coefficients, (b) its null-heavy results are an honest prior against overfitting fatigue narratives, and (c) it is clear of `done-ids.txt` (verified 2026-09-21, version-stripped ID `2112.14649` = 0 hits). Full query/candidate/dedup audit is in the wave report.
- **Read depth**: FULL READ of the complete v1 PDF text via pdftotext: 11 pages — abstract, three analyses (workload/fatigue proxies, Kawhi Leonard load-management case study, structural schedule-fatigue regressions), Second Spectrum distance data, nbastatR/airball/NBAr tooling, results tables, discussion of confounders, and full references.
- **Wave**: wave2-reader-19
- **GSE overlap**: None found in phase-one tracker, existing-research-map, or wave-one reports.

## Research question

Do schedule-based fatigue proxies — rest differentials, travel distance/direction, back-to-backs and 3-in-4s — actually predict NBA game outcomes, or are most fatigue narratives misattribution?

## Summary

This is a deliberately skeptical paper: most "fatigue" narratives in the NBA don't survive contact with data. Across three observational analyses — workload proxies, a Kawhi Leonard load-management case study, and structural schedule-fatigue regressions — the authors find mostly negligible or ambiguous relationships. The significant schedule effects: **rest difference +0.35 game net rating per additional rest day**, **three-hour westward travel −1.740**, and **third game in four days −1.290** — but the structural model explains **under 0.1% of residual variance**.

GSE's adaptation is two-sided: (1) the three significant coefficients are usable fatigue-feature priors for NBA game models; (2) the paper's null results are a **discipline device** — fatigue features must earn their place via rolling-origin predictive tests, because the headline R² is essentially zero. The paper's weaknesses (below) mean GSE re-estimates rather than inherits.

## Method

- Workload analysis: Second Spectrum player distance data vs performance.

- Case study: Kawhi Leonard load-management games vs played games.

- Reported coefficients: rest diff +0.35 net rating/rest-day; 3hr westward travel −1.740; 3rd-in-4-days −1.290; model R² < 0.001.

## Equations / assumptions

The regression specification is stated verbally in the paper; no explicit equation is given (copied verbatim from the Method section):

- OLS regressions of game net rating on fatigue proxies: rest differential, travel distance/direction, back-to-back and 3-in-4 indicators.

## Features / target

Inputs: rest differential; travel distance/direction; back-to-back and 3-in-4 indicators; Second Spectrum player distance (workload analysis).

Target: game net rating.

## Validation

Three observational analyses: workload/fatigue proxies, the Kawhi Leonard load-management case study, and structural schedule-fatigue regressions.

Data via nbastatR; Second Spectrum tracking distance; airball and NBAr R packages.

Caveat (flagged in the ledger): the paper's use of end-of-season net rating as a regressor leaks future information — GSE re-estimates on pre-game ratings only.

## Exact results / baselines

Significant schedule effects: rest difference +0.35 game net rating per additional rest day; three-hour westward travel −1.740; third game in four days −1.290.

The structural model explains under 0.1% of residual variance (R² < 0.001) — schedule fatigue is real but tiny at game level.

Baselines: the null — most fatigue proxies show negligible or ambiguous relationships (the paper's headline discipline result).

## Code / data

Not stated in the paper. Analysis tooling named in the paper: nbastatR, airball, and NBAr R packages; Second Spectrum tracking data.

## Dataset / schema

- NBA seasons via nbastatR; Second Spectrum tracking distance; `airball` and `NBAr` R packages.

## Implementation (GSE adaptation)

1. **Fatigue-feature priors with a short leash**: **Implementation**: add rest-differential, westward-travel-hours, and 3-in-4 indicators to the NBA game model with the paper's coefficients as Bayesian priors — but gate them behind a rolling-origin predictive test. Given R² < 0.1%, the prior variance should be wide and the features must improve out-of-sample log-loss to stay.
2. **Null-result benchmarking**: the paper's headline null is itself valuable — it sets the evidentiary bar. Any future fatigue claim in GSE's pipeline (including tracking-based load metrics) must beat the "schedule explains <0.1%" baseline.
3. **Do not inherit the target**: the paper's use of end-of-season net rating leaks future information — GSE re-estimates on pre-game ratings only.

**Implementation difficulty** (folded in from the original standalone section):

Low. Three engineered features plus a rolling-origin test harness.

## Leakage

- **End-of-season net rating as a regressor leaks future information** into "predictions" of earlier games — the paper's central methodological flaw for GSE's purposes.
- Observational regressions throughout: rest and travel correlate with team quality and scheduling intent (confounding, no causal identification).

## Limitations

- Leaking target variable (above); simple OLS with no causal identification.
- Confounding: good teams rest players in winnable games; bad teams travel the same miles.
- Noisy distance proxy (Second Spectrum); single-player case study (Kawhi) doesn't generalize.
- R² under 0.1% — schedule fatigue is real but tiny at game level.

## GSE overlap

None in the tracked corpus. The map inventories rest/bye (NFL edge vanished post-2011 CBA) and travel/altitude with **no verified coefficient** — this paper supplies the first verified NBA schedule-fatigue coefficients (+0.35/rest-day, −1.740/3hr-west, −1.290/3-in-4). The null-result framing is absent from the corpus, which otherwise treats fatigue anecdotally. Novel and disciplining.

## Reproducible test

- Rebuild the structural regression on NBA 2015–2024 with *pre-game* ratings (fixing the leakage): verify rest-differential, westward-travel, and 3-in-4 coefficients are directionally consistent with +0.35/−1.740/−1.290 and that R² remains tiny.

## Numeric gate

**ADAPT iff the re-estimated (leakage-free) fatigue features improve GSE's NBA game model: adding the three features must reduce rolling-origin log-loss or Brier score on at least two held-out seasons;** if they don't move out-of-sample prediction, keep only the null prior as documentation.

## Improvement experiment

(1) Replace OLS with a hierarchical model that partial-pools fatigue effects by team (some teams manage rest better); (2) interact rest with opponent rest (the paper's rest *differential* is the right primitive — extend it); (3) test tracking-load features (minutes × distance) against the schedule-only baseline to see if physiological load beats schedule proxies. Success criterion: any fatigue specification clears the rolling-origin gate where the paper's OLS could not.

## Verdict

**ADAPT** — Weak paper, useful discipline: the significant schedule coefficients (+0.35/rest-day, −1.740 westward, −1.290 3-in-4) become wide-prior fatigue features, and the <0.1% R² null becomes the evidentiary bar every fatigue claim must clear. GSE re-estimates leakage-free and keeps only what survives rolling-origin validation.
