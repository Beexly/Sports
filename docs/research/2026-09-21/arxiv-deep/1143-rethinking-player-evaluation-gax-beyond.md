# [1143] Rethinking Player Evaluation in Sports: Goals Above Expectation and Beyond (arXiv:2509.20083)

**Citation:** Bajons, R.; Kook, L. (2025). *Rethinking Player Evaluation in Sports: Goals Above Expectation and Beyond*. arXiv:2509.20083. URL: https://arxiv.org/abs/2509.20083
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, arXiv:2509.20083v2 [stat.AP], ~17 pages incl. appendices).
**Verdict:** ADAPT

The residualized (double-machine-learning) framework converts observed-minus-expected metrics into player-effect estimates with valid frequentist inference — and the paper ships a worked NFL application (residualized completion percentage above expectation, rCPAE, 2022/23 season) that GSE can re-run on current nflfastR data with valid confidence intervals.

## 1. Research question
Can observed-minus-expected player metrics (goals above expectation, GAX) be given a rigorous statistical footing — as player-strength estimates in a semiparametric model — that fixes the selection bias and missing-uncertainty problems of the raw metric, and does the fix generalize to other sports and response types (basketball shooting, NFL passing, injury time-to-event)?

## 2. Dataset / schema
- **Soccer (main):** StatsBomb event-stream data for the top five European leagues, 2015/16 season: 45,197 shots, 4,308 goals. Shot-level covariates Z: location, technique/body part, pass characteristics, play pattern, defensive context, defensive team strength (Appendix C); offensive team strength deliberately omitted as a "bad control." Players with ≥20 shots and ≥1 goal: 728 shooters.
- **Goalkeepers:** 13,269 shots on target; 147 keepers facing ≥20 shots. Defensive team strength omitted from Z for the keeper model (bad control).
- **NBA (App. B.1):** 2022/23 season play-by-play via hoopR; 150 players with ≥300 shots (incl. postseason); covariates: (x,y) coordinates, shot type, time played, score differential.
- **NFL (App. B.2):** 2022/23 season play-by-play via nflfastR; all QBs with ≥300 pass attempts; nflfastR's pass-completion-probability model as h(Z).
- **Injury (App. B.3):** Liverpool F.C. 2017/18–2018/19 via injurytools: 28 players, 42 player-season rows, 33 injury events, 9 right-censored; covariates: age, height, cards, position, season.

## 3. Method / model
Standard "goals above expectation" is GAX_p = Σ_j (Y_j − ĥ(Z_j)) X_jp (observed minus xG). The authors show GAX is the unscaled score statistic for a player-strength parameter β_p in a parametric logistic model logit P(Y|X,Z) = Xβ + h(Z), and propose instead a residualized metric from a partially linear logistic model: rGAX_p = Σ_j (Y_j − ĥ(Z_j)) (X_jp − f̂_p(Z_j)), where f̂_p(Z) = P(X_jp=1|Z) models the propensity of player p to take the shot under context Z. This is the Generalised Covariance Measure (GCM; Shah & Peters 2020) / double-machine-learning (Chernozhukov et al. 2017) statistic. Implementation: xgboost for the xG model ĥ, out-of-bag-tuned ranger random forest for the propensity f̂_p, p-values/CIs via the **comets** R package. Robustness variants tested: untuned RF and tuned xgboost for the propensity regression (App. A).

## 4. Equations & assumptions
- Traditional: GAX_p := Σ_j (Y_j − ĥ(Z_j)) X_jp (eq. 1); rGAX_p := Σ_j (Y_j − ĥ(Z_j)) (X_jp − f̂_p(Z_j)) (eq. 5).
- Semiparametric working model: logit P(Y_j=1|X_jp, Z_j) = X_jp β + g(Z_j), g arbitrary measurable; null H_0: Y ⟂ X_p | Z.
- **Proposition 1 (double robustness):** β = 0 iff E[Cov(Y, X_p | Z)] = 0, and sign(β) = sign(E[Cov(Y, X_p | Z)]) — so the test is consistent for the direction of a player's effect even if one nuisance regression is misspecified.
- Product-rate condition: the product of the average squared estimation errors of ĥ and f̂_p must be oP(N^-1) (both can converge slower than √N, e.g. N^-1/4 each); cross-fitting removes own-observation bias.
- Extension to survival responses (App. B.3): martingale residuals δ_j − Λ̂(Y_j, Z_j) residualized against the propensity; rIAX_p = Σ_j (δ_j − Λ̂(Y_j,Z_j))(X_jp − f̂_p(Z_j)) corresponds to the TRAM-GCM test (Kook et al. 2025), and to testing β = 0 in the partially linear Cox model log Λ(y,x,z) = log Λ₀(y) + xβ + g(z).
- Practical assumptions discussed: shots independent conditional on rich Z (rebound dependence is the main threat); effective sample sizes matter (filters: ≥20 shots); multiplicity correction needed for decision use (Bonferroni-Holm FWER, Benjamini-Hochberg FDR, Benjamini-Yekutieli under arbitrary dependence); non-nil nulls allowed (H_0: GAX > GAX_0); good/bad control selection per application (Cinelli et al. 2024).

## 5. Features / target
Targets: shot outcome (goal/no-goal), shots-on-target outcome (goalkeeper), basketball make (binary) or score value (0/2/3), NFL pass completion (1/0), injury event time. Propensity features Z: shot/pass-specific circumstances (location, distance/angle, body part, pass type, coverage/pressure, score/time context) plus appropriately-chosen team strengths; for NFL, whatever features feed nflfastR's CP model.

## 6. Validation design
- Empirical: correlation of rGAX with GAX on the same data; one-sided 95% CIs and p-values per player.
- Sensitivity: re-fit the xG model on (a) all data vs 2015/16 only vs a "low-frequency players" downweighted set; report the regression slope of the all-data metric on the restricted-data metric as a robustness measure. Propensity-model sensitivity: untuned RF, tuned RF (main), tuned xgboost.
- Applications are demonstration-scale (one season each); no out-of-season holdout in the paper itself.

## 7. Numerical results / baselines
- **Soccer shooting:** corr(GAX, rGAX) = 0.998; all ten top rGAX players had one-sided 95% CIs excluding zero. Messi and Ronaldo ranked in the top 60 by rGAX in 2015/16 but were NOT significant at conventional levels that season (small-sample honesty the raw metric hides).
- **Robustness slopes** (all-data metric regressed on restricted-data metric): rGAX all-data vs 2015/16-only: β = 0.936 (SE 0.005); GAX equivalent: 0.757 (0.005). rGAX all-data vs low-frequency model: 0.879 (0.005); GAX: 0.612 (0.007) — residualization is substantially more robust to xG-model misspecification (the "certain players overrepresented" criticism of Davis & Robberechts 2024).
- **Goalkeeping:** corr(GSAX, rGSAX) = 0.999; the top 8 keepers by rGSAX had significant negative effects on scoring likelihood (genuine shot-stopping effects).
- **NBA:** 150 players ≥300 shots; corr(qSI, rqSI) = 0.984 (binary outcome), 0.964 (score value); corr between the two rqSI variants = 0.937, GCM test statistics 0.929 — outcome choice doesn't change conclusions.
- **NFL rCPAE** (2022/23, QBs ≥300 attempts): corr(CPAE, rCPAE) = 0.997. Top 15 (CPAE rank | rCPAE rank): Geno Smith (1|1), Patrick Mahomes (2|2), Joe Burrow (3|3), Justin Herbert (4|4), Kirk Cousins (6|5), Jalen Hurts (5|6), Dak Prescott (7|7), Andy Dalton (8|8), Kyler Murray (11|9), Josh Allen (12|10), Jacoby Brissett (13|11), Tua Tagovailoa (9|12), Trevor Lawrence (10|13), Aaron Rodgers (15|14), Matthew Stafford (14|15).
- **Injury:** corr(IAX, rIAX) = 0.98 on Liverpool data (n=42); no player showed substantial evidence of elevated injury proneness (correctly null result on a tiny dataset).

## 8. Code / data availability
Code: https://github.com/Rob2208/rGAX_and_beyond (paper states full code + feature lists). Inference via the **comets** R package (GCM tests). Data: StatsBomb (open via StatsBombR), nflfastR (open), hoopR (open), injurytools (CRAN, open). All applications reproducible from public data.

## 9. Leakage & limitations
- **One-season analyses** in every application — no out-of-season validation of "skill" persistence; the paper flags stability as future work and only offers CIs/p-values as the stability lens.
- **Independence conditional on Z** is the load-bearing assumption; sequential effects (rebounds in soccer; play sequencing in NFL) are hand-waved rather than tested.
- **CIs are not multiplicity-corrected** in the figures; the authors correctly prescribe Bonferroni-Holm / BH / BY when p-values drive decisions (transfers, bets).
- **Effectively a reweighting:** when f̂_p is poorly estimated (untuned RF underfits → rGAX shrunk toward 0; tuned xgboost overfits → outliers), the point estimates shift even though inference stays valid — so the "valid inference" claim outruns the "accurate point estimate" claim for small-sample players.
- **Correlation ≈ 1 with the raw metric** in all applications is a double-edged sword: it validates GAX but also means rGAX rarely changes conclusions — its marginal value is the uncertainty quantification, not new rankings.

## 10. GSE overlap
GSE's corpus has CP-over-expected (Next Gen Stats CPOE is in the metric glossary) and QB evaluation material, but nothing with **valid frequentist inference on QB skill**: published CPOE leaderboards come with no CIs, no p-values, no selection-bias correction (elite QBs face different pass difficulty distributions — exactly the propensity issue f̂_p addresses). The conformal/calibration lanes give prediction intervals for outcomes, not inference on player effects — complementary, not duplicative. Directly extends the GSE benchmark lane: any "QB X is elite by CPOE" claim can now be tested rather than asserted.

## 11. GSE implementation spec
Build an **rCPAE leaderboard with valid CIs** for the current NFL season, refreshed weekly:
1. Data: nflfastR play-by-play 2019–2026; nflfastR's CP model as ĥ(Z) (or fit our own xgboost CP model on pass features: air yards, receiver separation at throw — via NGS where available, down/distance, field position, pressure).
2. Propensity f̂_p(Z): per-QB probability of being the passer under context Z — fit a multinomial or one-vs-rest ranger RF on (Z → QB indicator) for QBs with ≥300 attempts; this corrects the selection bias (e.g., a QB who only throws in favorable script situations).
3. Compute rCPAE_p = Σ(Y−ĥ)(X−f̂_p), standardized GCM statistic via the comets-equivalent (implement in Python: the statistic is a simple weighted sum; p-values from its asymptotic normal null — or port comets logic).
4. Report: rCPAE with one-sided 95% CIs, BH-corrected q-values across the ~32 qualifying QBs, plus a "robustness slope" diagnostic vs the raw CPAE leaderboard.
5. Extend to receiving/rushing: residualized yards-above-expectation per route/run with the same machinery (propensity = target/carry share under context).
Effort: ~1.5–2 weeks (CP model + propensity fits + leaderboard page).

## 12. Reproducible test
Dataset: nflfastR 2022 and 2023 seasons. Reproduce the paper's Figure 11 pipeline: QBs with ≥300 attempts, nflfastR CP model as ĥ, ranger RF propensity, comets GCM inference. Success: corr(CPAE, rCPAE) ≥ 0.99, top-5 QB ordering matches the paper's (Geno Smith, Mahomes, Burrow, Herbert, Cousins/Hurts cluster), and at least 8 of the paper's top 15 have one-sided 95% CIs excluding zero. Then run the same pipeline on 2024–2025 to check season-to-season stability of significant effects (do significant rCPAE QBs repeat?).

## 13. Acceptance / rejection gate
ADOPT the rCPAE leaderboard as a GSE QB-evaluation product only if: (a) the reproduction matches the paper's ordering within the top 10 (±2 rank tolerance), (b) ≥5 QBs show BH-significant positive effects per season (there is real signal to sell, not just noise with CIs), and (c) the robustness slope of rCPAE vs CPAE across CP-model variants is ≥0.9 (the residualization actually buys stability). Otherwise keep as a methodology note for "how to put error bars on above-expectation metrics."

## 14. Improvement experiment
Condition the propensity model on **team context excluded from h(Z)**: fit ĥ (CP model) without QB identity and f̂_p with full context including game script, then decompose a QB's rCPAE into (i) pure accuracy effect and (ii) situational-selection effect (the f̂_p term). Hypothesis: QBs like Geno Smith 2022 had a meaningful selection component (scheme-generated easy throws); separating the two gives a "scheme-adjusted accuracy" metric that predicts next-season CPOE better than raw CPOE — test by correlating each component with following-season CPAE on 2019–2024 data.

---

**Notes for tracker:** arXiv:2509.20083v2 [stat.AP]. Primary ledger #1143 in reader-05 wave-3 set. Full text read; all numerical claims above are from the paper's text/figures.
