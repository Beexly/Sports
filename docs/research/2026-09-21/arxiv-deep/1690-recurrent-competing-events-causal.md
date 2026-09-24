# 1690 Causal inference with recurrent and competing events (arXiv:2202.08500)

**Citation:** Matias Janvin, Jessica G. Young, Pål C. Ryalen, Mats J. Stensrud (2022; updated 2026-08-08). *Causal inference with recurrent and competing events*. arXiv:2202.08500. URL: https://arxiv.org/abs/2202.08500
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, sections 1–9 + appendices referenced).
**Verdict:** ADAPT — the estimand taxonomy (total vs controlled-direct vs separable effects) is the correct formal framework for GSE's injury/workload questions (recurrent soft-tissue injuries with competing events like season-ending IR or retirement); the SDE estimator is heavy machinery for a later stage.

## 1. Research question

For outcomes that can recur in the same individual (the abstract names **sports injuries in athletes** explicitly, alongside hospitalizations), what does a "treatment effect" even mean when a competing event (death / season-ending injury) can truncate recurrence? The paper formalizes the causal interpretation of recurrent-event estimands, gives identification conditions, derives estimators, and demonstrates on SPRINT trial data.

## 2. Method / model

- **Framework:** counterfactual causal models (Robins; Pearl; Richardson & Robins SWIGs); discrete-time formulation with continuous-time limits mapped to classical counting-process estimands.
- **Estimands defined:** (1) **total effect** E[Y^{a=1}_k] vs E[Y^{a=0}_k] — all pathways incl. via survival; (2) **controlled direct effect** E[Y^{a=1,\bar d=0}_k] vs E[Y^{a=0,\bar d=0}_k] — under hypothetical elimination of the competing event; (3) **separable effects** — decompose treatment into components AY (acts on recurrent outcome via mediator MY) and AD (acts on competing event via MD), contrasting E[Y^{aY=1,aD}_k] vs E[Y^{aY=0,aD}_k]; plus composite/"while alive" estimands and restricted-mean ratios.
- **Censoring:** generalized definition (Young et al. 2020) — an event is censoring iff it blocks knowledge of the counterfactual of interest; competing events are censoring for the controlled direct effect but NOT for the total effect.
- **Identification (Sec. 6):** exchangeability/positivity/consistency for total effect; plus dismissible-component conditions for separable effects; SWIG-based reasoning; correspondence with classical independent-censoring in event-history analysis.
- **Estimation (Sec. 7):** unified stochastic differential equation (Eq. 47): (Ŷt, Ŝt, D̂t)ᵀ = (0,1,0)ᵀ + ∫₀ᵗ diag(Ŝs−, −Ŝs−, Ŝs−) d(B̂s^Y, B̂s^D, B̂s^{D,w}) — solved recursively (for loop); integrators instantiated as **risk-set estimators** (Eq. 48), **Horvitz–Thompson/Hájek IPW estimators** (Eq. 49), with weight processes from additive hazard models; convergence theorem (App. E); implemented in R packages transform.hazards and ahw.
- **Demonstration:** SPRINT trial, n=1,312 standard + 1,311 intensive (age >75), recurrent acute kidney injury over 1,000 days; weights truncated to [0.2, 5]; 500 bootstrap CIs.

## 3. Mathematics / equations / assumptions

- Total effect (Eq. 1): E[Y^{a=1}_k] vs E[Y^{a=0}_k]; competing-event total (Eq. 2): E[D^{a=1}_k] vs E[D^{a=0}_k].
- Controlled direct effect (Eq. 3): E[Y^{a=1,\bar d=0}_k] vs E[Y^{a=0,\bar d=0}_k].
- Separable-effect isolation conditions (Eq. 4): M_Y^{aY=a,aD} = M_Y^a ∀aD; M_D^{aY,aD=a} = M_D^a ∀aY.
- IV-style assumptions adapted; dismissible component conditions (Eqs. 27–28).
- Estimator SDE (Eq. 47) with risk-set (48) and HT/Hájek (49) integrators; H_t = (1/n)Σ R̄^j_t I(Aj=a) (Hájek) or 1 (HT).
- Assumptions: baseline randomization (in SPRINT example) + measured (L0, Lk) sufficient for time-varying exchangeability; no unmeasured common causes of competing event and recurrent outcome (UDY); positivity; consistency.

## 4. Dataset / schema

- **Demonstration data:** SPRINT trial (Systolic Blood Pressure Intervention Trial), subgroup age >75 with complete baseline covariates: 1,312 standard + 1,311 intensive; 73 vs 52 deaths by day 1,000; 668 lost to follow-up; AKI event counts (Table 5: e.g., A=0: 1,273/36/1/2 for 0/1/2/3 events).
- **Covariates:** baseline L0 (smoking, CVD history, CKD, statin use, sex); time-varying Lk (mean arterial pressure).
- **Access:** SPRINT data via NHLBI BioLINCC (controlled access); simulated appendix example + R code in supplementary material.

## 5. Features / target

- **Features:** treatment A, baseline/time-varying confounders (L0, Lk), at-risk indicators.
- **Target:** counterfactual mean frequency function E[Y^a_k] (expected cumulative recurrent-event count by time k) under each estimand.

## 6. Validation design

- **Design:** theoretical paper — validation is via (a) formal identification proofs (App. C), (b) convergence theorem for the SDE estimator (App. E), (c) SPRINT empirical demonstration with bootstrap CIs, (d) simulated hypothetical-trial example (App. A).
- **Robustness:** smoothing parameter b ∈ {100, 200, 500} gives similar results; weight truncation [0.2, 5].

## 7. Exact results and baselines (numbers)

- **SPRINT (1,000 days):** total effect 0.017 [−0.001, 0.037]; controlled direct effect 0.017 [−0.003, 0.037]; separable direct effect (aD=1) 0.011 [−0.005, 0.034] — all 95% bootstrap CIs; borderline increased AKI under intensive treatment, no evidence the separable (kidney-specific) component explains it.
- **No sports-data application** in the paper — the sports-injury mention is motivational only.

## 8. Code / data availability

**Stated:** R packages transform.hazards and ahw at github.com/palryalen/; analysis code in online supplementary material; simulated example with R code (App. A).

## 9. Leakage and limitations

- **Separable effects need strong, untestable "modified treatment" assumptions** — the authors are admirably explicit that this transparency is a feature, but for GSE it means any separable claim (e.g., "load management's effect on hamstrings separate from its effect on season-ending injury") rests on positing hypothetical treatment components.
- **Controlled direct effect requires conceptualizing elimination of the competing event** (e.g., "eliminate season-ending injuries") — often infeasible/ambiguous.
- **No sports application** — the recurrent-injury mapping is ours, not theirs; sports competing events (IR, trade, retirement) have different structure than death.
- **Estimator complexity:** the SDE machinery with additive-hazard weight processes is heavy; simpler discrete-time g-formula/IPW may suffice for GSE use.

## 10. GSE overlap

GSE's injury/workload lane has predictive models (injury forecasting) but no causal framework for *recurrent* injuries. This is the missing formalism for questions like: "does load management reduce hamstring re-injury?" — where a season-ending ACL tear is a competing event that truncates hamstring recurrence, and naïve analyses either censor it (biasing toward the controlled direct effect with an ill-defined intervention) or ignore it (total effect confounded by survival pathways). No existing GSE doc distinguishes these estimands.

## 11. GSE implementation spec

- **Target estimand:** total vs controlled-direct effect of "high acute:chronic workload weeks" on recurrent soft-tissue injury counts per player-season, with season-ending IR as the competing event.
- **Data:** NFL injury reports + NGS workload proxies (or public snap counts as workload) 2015–2024; recurrent events = soft-tissue injuries (hamstring, calf, groin); competing event = season-ending IR designation.
- **Phase 1 (lightweight):** discrete-time g-formula/IPW for the total effect of high-workload exposure on cumulative injury count; report alongside a naïve analysis that censors at IR to show the estimand gap.
- **Phase 2:** separable-effects framing for load-management interventions (component acting on soft-tissue risk vs component acting on catastrophic-injury risk).
- **Serving:** research note establishing GSE's injury-causal methodology; informs workload-management content and player-availability adjustments in the engine.
- **Effort:** 2–3 weeks for Phase 1.

## 12. Reproducible test

- **Dataset:** public NFL injury data 2018–2024 (e.g., Pro Football Reference injury logs or nflverse injuries table); player-weeks with snap-count-derived workload; recurrent = hamstring/calf/groin injuries; competing = IR designation ending season.
- **Metric:** discrete-time IPW estimate of the total effect of "high-workload month" (top-quartile snaps over trailing 4 weeks) on expected soft-tissue injury count over the next 8 weeks; 95% bootstrap CI.
- **Baseline to beat:** naïve Cox/recurrent-event model censoring at IR (the field's default); the causal analysis passes if it (a) produces an estimate differing from the naïve by ≥ 20% (demonstrating the competing-event bias is material) with (b) bootstrap CI half-width < 50% of the point estimate.
- **Window:** 2018–2024 seasons.

## 13. Acceptance / rejection gate + improvement experiment

- **Gate (numeric):** ADAPT the estimand taxonomy if the NFL replication shows the naïve censor-at-IR estimate and the IPW total effect differ by ≥ 20% (proving the competing-event distinction matters empirically) with identified positivity (no weight truncation beyond [0.1, 10] needed for >95% of player-weeks). REJECT the full machinery if the difference is < 10% (competing events are rare enough that the distinction is academic) — keep only the taxonomy as a reporting standard.
- **Improvement experiment:** the paper's SDE estimator assumes continuous-time additive hazards — implement a **discrete-time doubly robust learner** for E[Y^a_k] with cross-fitted ML for the outcome and weight models at each week, which is more natural for weekly NFL data and gives valid inference under weaker parametric assumptions. Second: apply the separable-effects lens to **turf vs grass** — decompose the surface effect on soft-tissue recurrence into (AY) the direct surface-mechanics component vs (AD) the component operating through season-ending injuries, the exact mechanistic question the NFLPA debate needs.

**Verdict:** ADAPT — the total/controlled-direct/separable estimand taxonomy is the right formal foundation for GSE's recurrent-injury causal work; start with the lightweight discrete-time version.
