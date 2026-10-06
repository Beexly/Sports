# [0654] Rating Evaluation of Sports Development Efficiency Using Statistical Analysis: Evidence from Russian Football (arXiv:1612.07543)

**Citation:** Ilya Solntsev, Anatoly Vorobyev, Elnura Irmatova, Nikita Osokin (2016). *Rating Evaluation of Sports Development Efficiency Using Statistical Analysis: Evidence from Russian Football*. arXiv:1612.07543v1. URL: https://arxiv.org/abs/1612.07543
**Ledger completed:** 2026-09-21. **Read:** full text (PDF fetched from https://arxiv.org/pdf/1612.07543, pdftotext extraction, 15 pages).
**Verdict:** REJECT — sports-governance efficiency rating for regional football federations; no predictive model, no transferable statistic, no GSE application. Fails the numeric gate: there is nothing to test against a baseline.
**Replacement status:** pool-reserve paper; itself REJECTed → replaced by fresh-search paper (see wave report), per program rule that a REJECT never counts.

## 1. Research question
How to design and apply an efficiency-rating model for sports entities — specifically the 83 regional football federations of the Football Union of Russia (FUR) — across five dimensions of football development, to support strategic decision-making and budget allocation by a sports governing body.

## 2. Dataset / schema
- 83 Russian regional football federations; data year 2013.
- 20 criteria in 5 groups (4 factors each): Reserve training (youth registrations, coaching staff sufficiency, registration growth rate, youth team results); Elite sport (elite-group registrations, match attendance, players delegated to FUR national teams, professional club performance); Infrastructure (stadiums, people on specialized fields, fields/stadiums per population, stadium growth rate); Grassroots (participation, player-to-population ratio, sports-for-all degree growth, degrees awarded); Development & promotion activities (federation rating: has strategy/program, accreditation, reporting, website; regional development center rating; football as regional 'basic' sport; registered-to-total-footballer ratio).
- Sources: Russian Ministry of Sport unified statistical reports "1-FK" and "5-FK" (reserve training, infrastructure, grassroots); "trustworthy sports statistics websites" (elite sport); interviews with federation representatives (development & promotion). Not public/open.
- Support factors: population density, January average temperature (climate proxy). Regions clustered by Ministry of Sport population rule (>2M; 1–2M; <1M residents).
- Access: proprietary/national statistical reports; not replicable outside Russia's system.

## 3. Method / model
Composite-index construction, not a predictive model: (1) expert panel (FUR + regional federations) selects >30 candidate factors; (2) multicollinearity screen — factors with |paired correlation| ≥ 0.7 eliminated (some kept on expert judgment when correlation was "merely statistical without logical basis"), final 20 factors; (3) equal weighting across all factors (justified via Decancq & Lugo 2013; Chowdhury & Squire 2006); (4) three-sigma scoring rule per factor → 0–10 points; (5) support-score adders for density/climate; (6) overall score → 1–5 star categories.

## 4. Equations & assumptions
- Main contingent score: R_j = Σ_{i=1}^{I} n_{ij} w_i, I = 20 factors, N = 82/83 regions, n_{ij} points for factor i in region j, w_i weight (equal). (Eq. 1)
- Overall score: REFD_j = R_j + D_j + T_j (D = density support, T = January-temperature support). (Eq. 2)
- Three-sigma point intervals (Table 2): 0 pts if A ≤ X̄−2σ; 1 if X̄−2σ < A ≤ X̄−1.5σ; 2 if X̄−1.5σ < A ≤ X̄−σ; 3 if X̄−σ < A ≤ X̄−0.5σ; 4 if X̄−0.5σ < A ≤ X̄; 5 if X̄ < A ≤ X̄+0.5σ; 6 if X̄+0.5σ < A ≤ X̄+σ; 7 if X̄+σ < A ≤ X̄+1.3σ; 8 if X̄+1.3σ < A ≤ X̄+1.7σ; 9 if X̄+1.7σ < A ≤ X̄+2σ; 10 if A > X̄+2σ. (Note: asymmetric top intervals, e.g., 1.3σ and 1.7σ cutpoints — nonstandard binning.)
- Support-score example: January T −15<T≤−10°C + 75% density → +0.2; −20<T≤−15°C, 50≤D<75 → +0.3; a region at −11°C / 60% density gets +0.5.
- Star categories (Table 4): ≥8 → 5 stars; ≥6.5 → 4; ≥4.5 → 3; ≥2.5 → 2; <2.5 → 1.
- Assumptions: factor values approximately normal (so 10 intervals give "normal or approximately normal" point distributions); equal weights valid; three-sigma cutpoints meaningful; support factors exogenous to federation performance; expert panel unbiased.

## 5. Features / target
No prediction target. 20 administrative criteria (listed in §2) scored 0–10; support factors density and climate.

## 6. Validation design
No validation. No holdout, no backtest, no baseline comparison, no sensitivity analysis on weights or cutpoints. The "results" are a single ranking of 83 regions on 2013 data.

## 7. Numerical results / baselines
- Top 10 regions: Krasnodar Krai 7.30 (4★); Altay Krai 6.75 (4★); Moscow Oblast 6.70 (4★); Republic of Mordovia 6.55 (4★); Udmurt Republic 6.15 (3★); Rostov Oblast 5.95; Tambov Oblast 5.90; Moscow (City) 5.90; Volgograd Oblast 5.75; Tver Oblast 5.20.
- No region achieved 5 stars. Of 11 World Cup 2018 host regions, 5 in top 10 (Volgograd, Moscow City, Rostov, Mordovia, Krasnodar); others ranked 13th (Tatarstan), 16th (Sverdlovsk), 24th (St. Petersburg), 26th (Samara), 37th (Nizhny Novgorod), 38th (Kaliningrad).
- Distribution: 43 regions 3★, 30 regions 2★, 5 regions 1★.
- Figure 1: modal points 4–5 per factor; 0 and 10 attained by "an insignificant few."

## 8. Code / data availability
None stated. Data from Russian Ministry of Sport reports and FUR interviews — not public.

## 9. Leakage & limitations
- No validation of any kind; a composite index with unvalidated expert-selected factors and arbitrary binning.
- The "three-sigma rule" binning is ad hoc (asymmetric intervals 1.3σ/1.7σ unexplained); normality assumption untested.
- Equal weighting asserted, not justified empirically; sensitivity to weighting choice not examined.
- Multicollinearity screen kept some r>0.7 factors by "expert judgment" — double-counting acknowledged but uncontrolled.
- Support-score table (Table 3) appears incomplete as printed (only groups 2–3 shown with fragmentary thresholds).
- External validity zero for GSE: rates sports-bureaucracy efficiency, not team/player strength, markets, or predictions.
- Data from 2013, single year, no trend analysis possible (authors explicitly note weights must stay fixed for trend validity — yet present none).

## 10. GSE overlap
Per ~/workspace/arxiv-sweep/existing-research-map.md: nothing in Garrett's corpus (or GSE's mission) touches sports-governance efficiency ratings. This is orthogonal to prediction/calibration/markets/fantasy. Not a duplicate — simply irrelevant.

## 11. GSE implementation spec
No implementation recommended (verdict REJECT). The only even remotely adjacent idea — three-sigma-binned composite scoring — is strictly worse than GSE's existing quantitative machinery and has no predictive content.

## 12. Reproducible test
Not operable: requires Russian Ministry of Sport 1-FK/5-FK data and FUR interview access; the "result" is an unvalidated ranking with no predictive claim. Numeric gate (below) fails.

## 13. Acceptance / rejection gate
ACCEPT would have required a validated, predictive, or decision-relevant statistical artifact (e.g., a rating whose out-of-sample predictions beat a baseline, or a reusable estimator). The paper offers a one-off administrative ranking with no validation, no code, no public data, and no connection to sports outcomes. Numeric gate: FAIL → REJECT. This REJECT (of the reserve paper) is replaced by a fresh-search full-paper read in the Elo/Glicko/TrueSkill territory, per program rules.

## 14. Improvement experiment
N/A under rejection. If a governing-body client ever wanted an efficiency rating, the correct modernization is DEA with bootstrapped confidence intervals or stochastic frontier analysis (both surveyed in the paper's own literature review, e.g., Barros et al. 2014; Espitia-Escuer & García-Cebrián 2014/2015) — the paper chose the weakest available method.
