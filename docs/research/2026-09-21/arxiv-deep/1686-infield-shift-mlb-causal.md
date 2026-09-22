# 1686 Causal effect of the infield shift in the MLB (arXiv:2409.03940)

**Citation:** Sonia Markes, Linbo Wang, Jessica Gronsbell, Katherine Evans (2024). *Causal effect of the infield shift in the MLB*. arXiv:2409.03940. URL: https://arxiv.org/abs/2409.03940
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, all 6 sections + references).
**Verdict:** ADAPT — the triangulation design (matching + IPTW + IV with a preference-based instrument) is the right blueprint for evaluating any strategic intervention from observational sports data (e.g., NFL rule changes, 2-pt conversion trends), though the baseball estimand itself doesn't transfer.

## 1. Research question

Was the infield shift — banned by MLB in 2023 amid claims it was killing offense — actually effective at preventing runs when deployed? The paper estimates the effect of treatment on the treated (ETT) of shifted vs non-shifted infield alignments on change in run expectancy, using three causal methods with different identifying assumptions, stratified by batter handedness.

## 2. Method / model

- **Estimand:** ETT = E[Y^{t=1} − Y^{t=0} | T=1] (effect on plate appearances where the shift was actually used).
- **Method 1 — k:1 nearest-neighbor matching:** on linear propensity score with caliper 0.15 SD, 3:1 ratio, matching with replacement capped at 5 re-uses, exact match on game year, run separately by batter handedness; outcome modeled by linear regression + g-computation with robust SEs.
- **Method 2 — IPTW:** Horvitz–Thompson weighting-by-the-odds estimator for ETT; 10,000 bootstrap replicates for SEs and 95% CIs.
- **Method 3 — IV (2SLS):** instrument = fielding team's season-to-date shift propensity ("preference-based instrument", as in health studies); 2SLS per year, then weighted average over years by treated-PA share (Wang & Tchetgen Tchetgen 2018, allowing instrument×year interaction to relax the no-effect-modification assumption); bootstrap CIs.
- **Triangulation logic:** balancing methods assume no unmeasured confounding; IV allows unmeasured confounding but needs instrument validity — agreement across both assumption sets strengthens the conclusion.

## 3. Mathematics / equations / assumptions

- ETT (Eq. 1): E[Y^{t=1} − Y^{t=0} | T=1].
- Outcome: ΔRE = RE_final − RE_initial + Δscore (change in run expectancy from the year-specific run-expectancy matrix).
- IPTW-ETT (Eq. 4): E[Y|T=1] − (1/P(T=1))·E[(1−T)·(P(T=1|C)/P(T=0|C))·Y].
- IV identification (Hernán & Robins; Baiocchi et al.): (1) relevance Z ⟂̸ T|X; (2) effective random assignment Z ⊥ ({T^z},{Y^{z,t}})|X; (3) exclusion Y^{z,t}=Y^{z′,t}≡Y^t; (4) no IV effect modification: E[Y^{t=1}−Y^{t=0}|T=t,Z=z,X] = E[Y^{t=1}−Y^{t=0}|T=t,Z=z′,X].
- Balancing assumptions: partial exchangeability Y^{t=0} ⊥ T|π(C); positivity P(T=t|π(C)=s)>0.
- SUTVA: discussed explicitly — violated in the "multiple versions of treatment" sense (infinitely many fielder positionings satisfy "shifted"); authors assume shift is applied "reasonably similarly" each time.

## 4. Dataset / schema

- **Source:** MLB Statcast public database via Petti & Gilani (2024) scraper, 2015–2022 (8 seasons), pitch level → aggregated to plate-appearance level.
- **Treatment:** if_fielding_alignment = "shifted" (3+ infielders one side of 2B) on any pitch of the PA vs "standard"/"strategic" combined.
- **Outcome:** ΔRE summed over pitches of the PA.
- **Covariates:** batter handedness (stand), hitting tendencies (cumulative mean/SD of launch speed, launch angle, spray angle from hc_x/hc_y), skill (wOBA, BABIP, BB/K rates); pitcher handedness (p_throws), tendencies (release_speed, release_spin_rate, plate_x, plate_z cumulative means/SEs), skill (wOBA/BABIP allowed); fielding team's shift rate + SE (also the IV); game year.
- **Exclusions:** PAs missing alignment or ΔRE; missing pitches; batter/pitcher changed mid-PA; switch hitters; batters/pitchers without trajectory data or <10 PAs that season (noted as potentially missing-not-at-random, ballpark/instrument-related).
- **Access:** public (Statcast); analysis code not linked in the paper as read.

## 5. Features / target

- **Features:** batter/pitcher handedness, cumulative trajectory summaries (launch speed/angle, spray angle; release speed/spin, plate location), skill summaries (wOBA, BABIP, BB/K%), fielding-team shift propensity, game year; handedness used as effect modifier (stratified analysis).
- **Target:** plate-appearance ΔRE (change in expected runs).

## 6. Validation design

- **Design:** three estimators with distinct identifying assumptions on the same data; balance diagnostics (eCDF distances, SMD < 0.05 achieved); exact year matching; bootstrap inference throughout.
- **IV validation:** first-stage F = 1.18×10^5 (partial F = 5.74×10^4 conditional on year + pitcher measures); instrument-vs-covariate checks (launch-angle SD and year associated with instrument → year controlled via interaction); exclusion argued via pitcher BABIP not varying with instrument (Figure 9).
- No predictive validation; this is an estimation study.

## 7. Exact results and baselines (numbers)

- **All three methods:** shift is effective vs left-handed batters (95% CI upper bounds < 0 for LHB in every method); point estimates lower for LHB than RHB in all methods.
- **Right-handed batters:** only the IV estimate suggests a non-zero effect; matching and IPTW CIs are consistent with zero — evidence of effect moderation by handedness (IV CIs for RHB/LHB slightly overlap).
- **Magnitude:** most conservative estimates ≈ 10^−2 runs per targeted LHB plate appearance; LHB ≈ 35–39% of team PAs; shift used in up to 55% of those at peak → at most ≈ 10^−1 expected runs/game suppressed — "may confer a competitive advantage over a season" but imperceptible to spectators.
- **First stage:** F = 1.18×10^5 unconditioned; 5.74×10^4 conditional (year + pitcher measures); subgroup Fs of order 10^4 — very strong instrument.
- **Balance:** max |SMD| < 0.05 on all covariates in matched set (Stuart's 0.25 threshold); largest eCDF gaps: spray angle RHB (mean 0.015, max 0.029), launch speed LHB (mean 0.015, max 0.033).
- **Matching tuning:** 3:1, caliper 0.15 SD, re-use cap 5 (a 0.25-SD caliper without replacement would have dropped 29,788/149,288 ≈ 20% of treated LHB observations).

## 8. Code / data availability

Data: MLB Statcast (public) via Petti & Gilani scraper. Code: **none stated** (supplementary material referenced for balance/weight diagnostics; no repo link in the text as read).

## 9. Leakage and limitations

- **Treatment-version SUTVA violation conceded:** "shifted" lumps infinitely many positionings; teams' private continuous positioning data would give sharper estimands.
- **Missing-not-at-random:** trajectory-data exclusions tied to ballpark instruments; results apply only to PAs with capturable trajectory data.
- **2SLS linearity:** treatment and outcome models assumed linear; authors flag misspecification risk and suggest doubly robust estimators as future work.
- **ETT ≠ ATE:** estimates don't cover the rule-change's total impact (including PAs never shifted) — the policy question needs the ATE.
- **IV "no effect modification" only relaxed via year interaction;** team-level heterogeneity in shift skill remains assumed away.
- **No exact Figure-10 point estimates in text** — only CI-overlap conclusions and order-of-magnitude contextualization.

## 10. GSE overlap

GSE tracks rule changes and strategy trends but has no causal evaluation of interventions. The triangulation template (balancing + preference-based IV) is the missing methodology for questions like: did the 2023 Thursday-night flex scheduling or the kickoff rule change causally move scoring/totals? The preference-based instrument idea (team's historical tendency to do X as instrument for doing X now) ports to NFL coaching tendencies (a coach's historical 4th-down aggressiveness as an instrument for a specific go-for-it decision).

## 11. GSE implementation spec

- **Target estimand:** causal effect of the 2023+ NFL kickoff rule changes on touchback rate / starting field position / scoring — ETT on "treated" kicks.
- **Design:** (a) matching/IPTW on kickoff-level covariates (kicker, weather, score, time); (b) IV with kicker-team historical touchback propensity as preference instrument; (c) DiD across the 2023 rule boundary as a third leg.
- **Data:** nflverse pbp kickoffs 2018–2024.
- **Outcome:** expected points of ensuing drive (or starting yard line).
- **Serving:** research note + content ("the new kickoff is worth X points per game") for @GalaxySportsHQ; informs GSE totals model adjustments after rule changes.
- **Effort:** 2 weeks.

## 12. Reproducible test

- **Dataset:** nflverse kickoff plays 2020–2024; treatment = post-2023-rule kickoff (or team-level adoption intensity).
- **Metric:** ETT on drive expected points via (i) IPTW and (ii) preference-IV; report both with 95% bootstrap CIs.
- **Baseline to beat:** naïve pre/post mean comparison; the causal pipeline passes if both estimators agree in sign, |SMD| < 0.1 post-weighting, and first-stage partial F > 100 for the IV.
- **Window:** 2020–2024, with 2023 as the intervention boundary; placebo test on 2021 (no rule change → null expected).

## 13. Acceptance / rejection gate + improvement experiment

- **Gate (numeric):** ADAPT the triangulation template if the NFL kickoff replication shows sign agreement between IPTW and IV, post-weighting |SMD| < 0.1, first-stage partial F > 100, and the placebo-year ETT has 95% CI covering 0. REJECT if estimators disagree in sign or the placebo test fails (indicating violated IV assumptions).
- **Improvement experiment:** the paper's weakest link is 2SLS linearity — implement a **doubly robust / double-ML version** of the ETT (Chernozhukov et al.) with cross-fitted ML nuisance models for both the propensity and the outcome, which the authors themselves nominate as future work; compare DML-ETT to the three published estimates. Second: estimate the **ATE** (not just ETT) via the same machinery to answer the actual policy question — what the shift ban did to league-wide offense.

**Verdict:** ADAPT — the matching + IPTW + preference-IV triangulation is the correct blueprint for causal evaluation of NFL strategic/rule interventions from observational data.
