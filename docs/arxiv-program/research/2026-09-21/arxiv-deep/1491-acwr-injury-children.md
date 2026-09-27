# [1491] Injury risk increases minimally over a large range of changes in activity level in children (arXiv:2010.02952v2)

**Citation:** Chinchin Wang, Tyrel Stokes, Jorge Trejo Vargas, Russell Steele, Niels Wedderkopp, Ian Shrier (2020). *Injury risk increases minimally over a large range of changes in activity level in children*. arXiv:2010.02952v2. URL: https://arxiv.org/abs/2010.02952
**Ledger completed:** 2026-09-21. **Read:** full text (PDF v2 — abstract, intro, methods, results, discussion, limitations, conclusion, 41 references, Tables 1–2, Figure legends 1–3, full appendix: model-selection note, Table S1 EWMA AICs, flow diagram S3, Figures S1–S6 legends, randomized-trial sample-size calculations).
**Verdict:** REJECT
pediatric cohort (ages 6–17), parent-reported pain as the "injury" outcome, and session-count load data have no transfer path to NFL player availability modeling; the paper's own conclusion is that children differ markedly from adults.

## 1. Research question
How well do different variations of the acute:chronic workload ratio (ACWR) predict injury in children, and which modeling approach (GLM vs GAM, with vs without random effects for repeated measures) best captures the relationship?

## 2. Dataset / schema
CHAMPS-DK (Childhood Health, Activity, and Motor Performance School Study Denmark): prospective cohort, 1,660 Danish schoolchildren aged 6–17, followed mean 3.8 years (Nov 2008–Jun 2014), 286,536 child-weeks, 11,458 (4%) with injury. Load = weekly count of leisure-time + school activity sessions (via weekly parent SMS). Outcome = parent-reported musculoskeletal pain in the index week (not physician-diagnosed, not time-loss). Not publicly available (available from CHAMPS Steering Committee on request). Mean 1.6 (SD 1.1) leisure sessions/week; 91% of participants reported pain at some point.

## 3. Method / model
ACWR = acute load (index-week activity frequency) / chronic load (mean of prior weeks). Variants: coupled 4-week (numerator in denominator), uncoupled 4-week, uncoupled 5-week; EWMA variants tried and dropped (much poorer fit). Relationship modeled with GLM / GLMM / GAM / GAMM (logit link, thin-plate splines k=7, random intercept for individuals), compared by AIC on common index weeks; gender added as fixed effect in the winning model; sensitivity analyses excluding ACWR=0 and ACWR=1 weeks.

## 4. Equations & assumptions
ACWR definitions (coupled 4-wk = wk₀/mean(wk₀…wk₋₃); uncoupled 4-wk = wk₀/mean(wk₋₁…wk₋₃); uncoupled 5-wk = wk₀/mean(wk₋₁…wk₋₄)). GAMM: logit(P(injury)) = s(ACWR) + b_individual, s = thin-plate spline. AICs (Table 2, uncoupled 5-wk): GLM 80,931; GLMM 77,956; GAM 80,891; GAMM 77,927 (best). Assumptions: (1) session counts proxy tissue load; (2) parent SMS reports are valid injury/pain measures; (3) missing weeks imputable by resampling-with-matching; (4) prognostic (not causal) interpretation.

## 5. Features / target
Features: ACWR variants (continuous), gender. Target: binary musculoskeletal pain in index week.

## 6. Validation design
No held-out validation — model selection by AIC on the full data (time-ordered cohort, but no out-of-sample test). No baselines beyond the model-class comparison.

## 7. Numerical results / baselines
Best model: uncoupled 5-week GAMM. Predicted injury risk ~3% for ACWR 0.8–1.5; minimum 1.5% at ACWR=0 (RR vs ACWR=1: 0.5); maximum 6% at ACWR=5 (RR vs ACWR=1: 2.2) — "only doubled despite a quintupling of activity". GLMM (for contrast) predicted exponential rise to 24% at ACWR 9.3 with unrealistically narrow CIs. Girls at significantly higher risk than boys at ACWR>2 (gender p=0.047). Trial sample-size calc: 11,000 participants (5,500/group) to detect doubling-activity effect in a simple RCT. Paper's headline: "Increases in physical activity in children are associated with much lower injury risks compared to previous results in adults."

## 8. Code / data availability
Analyses in R 3.6.0 (lme4, mgcv, gamm4). No code link stated. Data not public (CHAMPS committee request only).

## 9. Leakage & limitations
Stated by authors: very few weeks at high ACWRs (wide CIs above ACWR 3); load definition lumps heterogeneous sports/durations; pain ≠ diagnosed/time-loss injury; "findings may not be generalizable to specific sporting contexts"; ACWR has "serious limitations for assessing causality". Added: no out-of-sample validation (AIC-only selection); the cohort is children 6–17 — physiologically and contextually unlike NFL athletes.

## 10. GSE overlap
GSE has no player-availability/injury sub-model in the repo corpus (the existing-research map's injury-adjacent entries are referee crews and weather for totals, not workload-injury). But this paper cannot seed one: GSE has no practice/training-load data for NFL players (no session counts, no GPS), and the paper's pediatric pain outcome does not map to NFL time-loss injury. No overlap to exploit — nothing to build on.

## 11. GSE implementation spec
Not applicable — REJECT. No implementable component transfers: the population (children), outcome (parent-reported pain), and exposure (PE/leisure session counts) have no NFL analogue in GSE's data.

## 12. Reproducible test
Not applicable — REJECT.

## 13. Acceptance / rejection gate
REJECT: fails the lane test — no path from Danish schoolchildren's activity-pain data to NFL prediction, fantasy, or calibration value. The paper's central empirical claim (children tolerate 5× activity spikes with only 2× injury risk) is explicitly non-transferable to adults ("much lower injury risks compared to previous results in adults").

## 14. Improvement experiment
Not applicable — REJECT. (Replacement read in the same lane under ledger 1510.)
