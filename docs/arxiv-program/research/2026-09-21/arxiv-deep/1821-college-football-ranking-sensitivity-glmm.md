# 1821 The sensitivity of college football rankings to several modeling choices (arXiv:1403.7642v1)

**Citation:** Andrew T. Karl (2014). *The Sensitivity of College Football Rankings to Several Modeling Choices*. arXiv:1403.7642v1 [stat.AP], 29 Mar 2014. Note: preprint of an article published in the *Journal of Quantitative Analysis in Sports*, Vol. 8, Issue 3 (doi:10.1515/1559-0410.1471). URL: https://arxiv.org/abs/1403.7642v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, ~32 pages: abstract, introduction, the full multiple-membership GLMM specification with all three FCS-handling variants, the Laplace/EM estimation sections, the complete four-season sensitivity analysis with all numeric tables and the extreme-σ² experiment, conclusion, references, Appendix A ranking tables, and Appendix B SAS code and data sample).
**Verdict:** ADAPT — the multiple-membership GLMM is a statistically honest blueprint for a GSE NCAA team-rating engine (with calibrated uncertainty and a documented sensitivity protocol), but the paper's win/loss-only restriction makes it a complement to, not a replacement for, margin-based GSE ratings.
**arXiv ID (normalized):** 1403.7642

## 1. Citation + explicit full-text-read statement

Andrew T. Karl (2014). *The Sensitivity of College Football Rankings to Several Modeling Choices*. arXiv:1403.7642v1 [stat.AP], 29 Mar 2014; preprint of the published JQAS Vol. 8 Issue 3 article (doi:10.1515/1559-0410.1471). I read the entire PDF: the motivation (BCS computer-ranking controversy), the multiple-membership GLMM and its three FCS treatments (Sections 2.1–2.3), the proof that Mease (2003)'s penalized likelihood is a PQL approximation to the model, the SAS GLIMMIX and EM/Laplace estimation procedures (Section 3), the full 2008–2011 sensitivity analysis across link function / integral approximation / random-effects distribution / FCS handling / ML-vs-REML (Section 4, Tables 1–3 and Appendix A top-20 tables), the conclusion, references, and Appendix B (SAS code, Table 12 data sample). Base arXiv ID normalized by stripping the trailing version: **1403.7642**. Dedup confirmed free across ledger-tracker-750.jsonl, wave4-dedup-baseids.txt, wave4b-dedup-baseids.txt, all arxiv-deep ledger headers, state/done-ids.txt, and the existing-research map.

## 2. Research question

College football (FBS) computer rankings under the BCS were restricted to win/loss outcomes (margin of victory banned to discourage running up scores), which turns ranking into a binary-response problem with a multiple-membership random-effects structure. The paper asks: how sensitive are the resulting team rankings — the EBLUP orderings that decide BCS bowl berths and the national-championship pairing — to five modeling choices: (1) probit vs. logit link, (2) integral approximation for the intractable GLMM likelihood (PQL vs. first-order Laplace vs. fully exponential Laplace), (3) the assumed distribution of random team effects (normal vs. Mease (2003)'s penalty-implied distribution), (4) how FCS opponents are handled (single consolidated "team" vs. separate population with pooled vs. separate variances), and (5) ML vs. REML estimation? Data are the 2008–2011 seasons through the conference championships (the same data that fed the final BCS rankings).

## 3. Method / model

The model is a multiple-membership GLMM for binary game outcomes: ri ∈ {0,1} is a home-win indicator; latent yi = Xiβ + Ziη + εi with ri = 1{yi > 0}; η = (η1,…,η_{p+q}) ∼ N(0, σt²I) are random team ratings; Zi is a sparse row with +1 (home team) and −1 (visitor) — a multi-membership design (Browne et al. 2001) that cannot be factored like nested random effects. ε ∼ N(0,I) gives the probit link Φ⁻¹(πi) = Xiβ + Ziη; logistic ε gives logit(πi) = Xiβ + Ziη. Three FCS variants: §2.1 separate FBS/FCS populations with pooled σt² plus a fixed "FCS effect" β (Xi = 1 for FCS-visiting-FBS); §2.2 separate variances σ1² (FBS), σ2² (FCS); §2.3 single FBS population with all FCS teams collapsed to one effect η_{p+1} (FCS–FCS games discarded). Key theoretical result (§2.3): Mease (2003)'s penalized likelihood is exactly the PQL approximation to model (6) under random effects with density f(η) ∝ Π Φ(ηj)Φ(−ηj) — i.e., Mease's model = one particular approximation of *this* GLMM. Estimation: SAS PROC GLIMMIX with the MULTIMEMBER option (doubly-iterative pseudo-likelihood = PQL), and custom R EM code (Karl 2012a) with first-order Laplace (LA) and fully exponential Laplace (FE, Tierney et al. 1989) E-steps — FE needs 3rd/4th derivatives of the complete-data likelihood for the conditional mean/variance. Notation: approximation × link × FCS = e.g. FE.P.0.

## 4. Mathematics / equations / assumptions

Key equations, quoted with the paper's numbering:
- (1)–(3) Mease (2003) likelihood: Π_{(i,j)∈S} [Φ(θi − θj)]^{nij} × Π_i Φ(θi)Φ(−θi) × Φ(θ_{p+1})Φ(−θ_{p+1}) × Π_{(i,j)∈S∗} [Φ(θi − θj)]^{nij} — game model × penalty (undefeated-proofing) × FCS handling.
- (4) L(β, σt²) = ∫⋯∫ Π_{i=1..n} [Φ((−1)^{1−ri}[Xiβ + Ziη])] f(η) dη: intractable (p+q)-dimensional probit likelihood.
- (5) The logit-likelihood analog with Π [e^{Xiβ+Ziη}/(1+e^{Xiβ+Ziη})]^{ri} [1/(1+e^{Xiβ+Ziη})]^{1−ri}.
- (6) The consolidated-FCS model likelihood L(σt²) with η ∼ N_{p+1}(0, σt²I).
- (7) L(σt²) ≈ (2π)^{n/2} e^{h(η∗)} |−∂²h/∂η∂η′|_{η=η∗}|^{−1/2}: Laplace approximation.
- (8) Quasi-likelihood L(η) ≈ Π [Φ((−1)^{1−ri} Ziη)] f(η) — PQL drops the determinant; combined with (9) f(η) ∝ Π_j Φ(ηj)Φ(−ηj) it yields Mease (2003).
- (10) The EM M-step score equation S(β̂) = Σ Xi ∫⋯∫ (−1)^{1−ri} φ((−1)^{1−ri}[Xiβ̂ + Ziη]) / Φ((−1)^{1−ri}[Xiβ̂ + Ziη]) f(η|r) dη = 0, solved by Newton–Raphson with central-difference Hessian; closed-form M-step σ̂t² = trace(ṽ + η̃η̃′)/(p+q).
- Quadrature infeasible in (p+q) ≈ 240 dimensions; PQL is biased downward for variance components (Breslow & Lin 1995); Laplace is consistent because integral dimension = #teams, fixed as n grows (Shun & McCullagh 1995).

Assumptions stated: teams' effects i.i.d. normal (or the Mease penalty distribution); FBS/FCS mean difference captured entirely by the single fixed FCS effect β; no home-field effect included (deliberate — confounded by nonrandom scheduling, e.g., power programs buying extra home games vs. weak opponents); neutral-site games get an arbitrarily designated home team; FCS games vs. lower-division opponents ignored (author notes a loss to a D-II team could inflate a successful FCS team — not modeled); β removable without harm in an all-FBS-wins season (quasi-complete separation).

## 5. Dataset / schema

- **Source:** NCAA website (NCAA 2012) game-outcome files; raw outcomes recorded per team (duplicates for intra-division games) then processed: FBS+FCS files combined, "away"-labeled rows dropped, FCS-vs-lower-division games removed, redundant neutral-site games purged, FBS-vs-FCS indicator added, all post-final-BCS-ranking games removed. Processed data available from Karl (2012b); Table 12 shows the SAS schema: (home, game date, away, home score, away score, fcs indicator, H, A, home win) — e.g., "Ball St. 8/28/2008 Northeastern 48–14, fcs=1, H=1, A=−1, home win=1."
- **Scope:** seasons 2008–2011, games through each year's conference championships only (bowl games excluded) — matching the data behind the final BCS rankings. ~240 random-effect levels (FBS + FCS teams), ≈12 games per team per season.
- **Schema for modeling:** per game: binary ri (home win), design row Zi (+1/−1 sparse vector over ~240 teams), FCS indicator Xi.

## 6. Features and target

- **Features:** none in the ML sense — the only inputs are the game-participant design matrix Z and the FCS indicator X. Team identity is the random effect; strength of schedule is implicit in the multi-membership structure.
- **Target:** the EBLUPs η̃ = E[η | r] (the team ratings) and their rank ordering; plus the variance-component estimates (σt², σ1², σ2²) and the FCS effect β. The paper's real object of study is the *sensitivity* of the rank ordering to the five modeling choices, not out-of-sample prediction of future games.

## 7. Validation design

- **No predictive validation against future games.** The design is a structured sensitivity audit: the same pre-bowl data are fit under all combinations of {PQL, LA, FE} × {probit, logit} × {FCS: consolidated / separate-pooled / separate-split} and rankings compared; ML vs. REML compared under PQL.P.1 in SAS.
- **Anchoring:** model rankings shown alongside the official final BCS rankings as a reference (not as ground truth — 2/3 of the BCS is human polls).
- **Practical-significance framing:** the paper explicitly ties rank changes to BCS bowl rules (top-2 → title game; top-16 eligibility; guaranteed berths; dollar stakes: Les Miles $200,000 BCS bonus / $5.7M raise clause; Nick Saban $400,000 title bonus).
- **Uncertainty visualization:** Figure 1 caterpillar plot of 2008 FE.P.0 ratings with 95% prediction intervals — the visual proof that rating changes from modeling choices are small relative to rating standard errors, while rank changes are practically large.
- **Extreme-value stress test (Table 1):** σt² fixed at 0.0001 (≈ rank by wins−losses; Arkansas St. reaches #11) and at 100 (≈ pure strength-of-schedule; 12 of top 15 from SEC/Big XII, including 7–5 Auburn/Texas and 6–6 Texas A&M).

## 8. Exact results and baselines with numbers

- **Integral approximation moves the national title game (2009, 2011):** 2009 — PQL.P.0/LA.P.0 pick Alabama & Texas; FE.P.0 picks Alabama & Cincinnati. 2011 — PQL.P.0/LA.P.0 rank Oklahoma St. #2; FE.P.0 ranks Alabama #2 (ratings: Alabama 1.572 vs. Oklahoma St. 1.565 under FE.P.0 — a 0.007 gap flipping the championship pairing). The author: "our answer to 'who should play in the BCS championship game' depends on 'to what order would you prefer to extend your Laplace approximation?'"
- **2008 PQL.P.0 → FE.P.0:** Texas Tech 6→4, Boise St. 5→6, Oklahoma St. 16→14, plus seven more one-position moves; FE.P.0 top-5 = Oklahoma 1.714, Utah 1.631, Texas 1.582, Texas Tech 1.494, Florida 1.465.
- **2010 PQL.P.0 → FE.P.0:** Stanford 5→4 (displacing Oklahoma), Wisconsin 8→6, Ohio St. 6→7, Arkansas 10→8, Michigan St. 7→9, Boise St. 9→10. 2011: Arkansas 8→6, Baylor 16→14, Oklahoma 14→12, Michigan 13→15, Georgia 17→16, Wisconsin 15→17.
- **Monotonicity:** for every team, the LA rank lies between (inclusive) its PQL and FE ranks across 2008–2011.
- **Variance estimates drive it:** PQL.P.0 σ̂t² ≈ 0.52–0.55 vs. FE.P.0 σ̂t² ≈ 0.71–0.82 (2008: 0.52/0.54/0.76; 2011: 0.55/0.57/0.80; FE.L.0: 2.19/2.33 — larger scale, not comparable). Mease's penalty distribution ≈ N(0, 0.815·I), which is why Mease agrees more with FE.P.0 than PQL.P.0 despite being a PQL fit.
- **Link function:** FE.P.0 vs. FE.L.0 — 2008: agree ranks 1–16, 17–20 scramble ±1–2; 2009: 13↔14, 17↔18 swaps; 2010: 7↔9 swap, 17–20 ±1; 2011: LSU #1 both, Oklahoma St./Alabama flip at #2/#3. Small rating shifts vs. large standard errors, but rank-flipping where it hurts.
- **FCS handling (2011):** FE.P.0 ranks Alabama 2; FE.P.1 (pooled) and FE.P.2 (split) pick Oklahoma St. 2. 2008: FE.P.2 ranks Florida 4, FE.P.0/FE.P.1 rank Texas Tech 4. FCS effect β̂ = 2.03 in 2011 → P(random FBS beats random FCS) = Φ(2.03) ≈ **0.979**. Table 2 variances: 2008 pooled 0.75, FBS 0.65, FCS 0.87; 2011 pooled 0.63, FBS 0.70, FCS 0.55.
- **ML vs. REML (PQL.P.1):** no top-16 differences in any year; estimates differ by ≤0.001 (2008: 0.4763/0.4768; 2009: 0.5077/0.5087; 2010: 0.4405/0.4415; 2011: 0.4206/0.4216).
- **Distribution of random effects (PQL.P.0 vs. Mease):** 2008 Texas Tech 5→4, Florida 4→5; 2009 Texas 2→3, Cincinnati 3→2; 2010 Stanford 5→4, Oklahoma 4→5.

## 9. Code / data availability

- **Code:** example SAS PROC GLIMMIX code with the MULTIMEMBER option printed in Appendix B; Mease (2003)'s model code at davemease.com/football (Mease 2012); Karl's custom R EM/Laplace code described in Karl (2012a) — SAS GLIMMIX is straightforward to replicate; the R code is referenced, not embedded.
- **Data:** raw game outcomes from the NCAA website (public); processed datasets "available from Karl (2012b)" (author's personal site). Fully re-derivable today from public sources (NCAA records, sports-reference, or nflverse-style college data providers); the Table 12 schema is documented.
- **Reproducibility:** high for the modeling pipeline (standard GLMM tooling); exact numeric replication depends on Karl's 2012 processed files, but any careful re-processing of the same seasons reproduces the sensitivity pattern.

## 10. Leakage and limitations

- **Leakage:** none in the temporal sense — only pre-bowl games feed each season's rankings, matching the information available to the BCS. The paper does *not* do out-of-sample game prediction, so there is no leakage pathway; but equally, there is no evidence the rankings predict future games better than alternatives.
- **Limitations (author-stated + observed):** (a) win/loss only — deliberately discards margin information, so ~12 binary outcomes per team is "limited information" and the author concludes it is "unreasonable to expect these models to identify the two best teams"; (b) no home-field effect (confounding concern, §2.1); (c) FCS-vs-lower-division games ignored — a loss to a D-II team goes unseen; (d) one fixed FCS effect for all FBS–FCS matchups; (e) seasons modeled independently (no carryover of team strength); (f) ML-vs-REML comparison only under PQL in SAS, not under Laplace/EM; (g) marginal likelihoods for the constrained-vs-full MβA-style Bayes factor deemed computationally infeasible in the companion reading, here the FCS-variance comparison is descriptive.

## 11. GSE overlap

- **Direct lane:** GSE's NCAA product needs team ratings; this paper is the most statistically careful treatment of *binary-outcome* college ratings with multi-membership structure, plus the only corpus-candidate quantifying how much ratings move under defensible-but-arbitrary statistical choices. It does not duplicate any existing NCAA/Elo/Bradley-Terry ledger — the contribution is the sensitivity/uncertainty apparatus, not another rating formula.
- **What it adds to GSE:** (1) the EBLUP + 95% prediction-interval machinery (Figure 1) is exactly the right way to publish NCAA ratings with honest uncertainty — "Team A is #3 ± 2.1" instead of a point rank; (2) the variance-component insight: σ̂t² controls the win-loss ↔ strength-of-schedule dial (Table 1's extremes), which is a tunable, explainable hyperparameter for GSE's own ratings; (3) the FE-vs-PQL lesson transfers to any GLMM-based GSE model (props, win probability): approximation order can flip discrete decisions, so publish the sensitivity, not just the point estimate.
- **Boundary:** GSE's ratings should remain margin-based where possible (the paper's own conclusion: binary-only models are "a rough guide"); use this as the uncertainty/sensitivity framework around a stronger margin model.

## 12. Implementation specification

1. **Fit the consolidated-FCS GLMM (FE.P.2 analog) to GSE's NCAA data:** binary home-win outcome, multi-membership design over all FBS teams + one consolidated FCS effect (or separate FCS population with pooled variance, FE.P.1), probit link, EM with fully exponential Laplace E-step — or, pragmatically, SAS/R PROC GLIMMIX MULTIMEMBER with PQL *plus* a documented bias-correction note (PQL underestimates σt² by ~30%: 0.55 vs. 0.80).
2. **Publish ratings as EBLUPs with 95% prediction intervals** (replicate Figure 1's caterpillar plot) rather than bare ranks; flag any pair of teams whose intervals overlap by >50% as "statistically tied" in the UI copy.
3. **Estimate and expose σ̂t²** as the "schedule-strength dial": report where GSE's current season estimate sits between the win-loss extreme (σt²→0) and the SoS extreme (σt²→∞), giving users an intuitive read on how much the ranking rewards tough schedules.
4. **Run the sensitivity protocol on every ratings release:** re-fit under {PQL, LA, FE} × {probit, logit} × {FCS consolidated, FCS pooled} and publish the rank-range each team spans (e.g., "Alabama: #2–#3 across all defensible specifications"); any team whose rank is invariant across all specifications is "specification-robust."
5. **Gate for margin integration:** feed the binary-model EBLUPs as a prior/regularizer into GSE's existing margin-based NCAA rating, testing whether the combination beats the margin model alone on held-out ATS performance.

## 13. Reproducible test

- **Test A (replication):** re-process the 2011 FBS season from a public source (e.g., sports-reference CFB scores) through conference championships, fit PQL.P.0 and FE.P.0 (probit); PASS if the script reproduces the paper's headline sensitivity — PQL ranks Oklahoma St. #2, FE ranks Alabama #2, with FE σ̂t² ∈ [0.70, 0.90] (paper: 0.80) and PQL σ̂t² ∈ [0.45, 0.65] (paper: 0.55).
- **Test B (monotonicity):** fit PQL.P.0, LA.P.0, FE.P.0 on the same data; PASS if ≥ 95% of teams have LA ranks within the closed interval between their PQL and FE ranks (paper: 100% across 2008–2011).
- **Test C (GSE value-add):** on the current NCAA season, compute the specification rank-range for every team and check that at least one top-10 team per week is *not* specification-robust (rank-range ≥ 2) — demonstrating the protocol surfaces real publishing risk. If every top-10 team is invariant all season, the sensitivity apparatus adds no editorial value → downgrade to documentation-only.

## 14. Numeric acceptance / rejection gate + improvement experiment

- **Gate (ADAPT stays ADAPT):** Tests A and B pass (the method and its headline numbers replicate on independent re-processing) *and* Test C shows the rank-range protocol flags ≥ 1 non-robust top-10 team in a typical week. **Reject** (downgrade to informational) if Test A fails to reproduce the PQL/FE #2 flip in 2011 (method not faithfully re-implemented) or if, on margin-based GSE ratings, the binary-model EBLUP prior adds < 0.2% to held-out ATS accuracy — i.e., the win/loss-only signal carries no incremental value over what GSE already has.
- **Improvement experiment:** the paper's own stated limitation is the win/loss-only restriction. Build the **margin-augmented** version: keep the multi-membership random-effects structure but replace the binary link with an ordered-probit over binned margins (e.g., 7 bins: loss ≥ 14, loss 8–13, loss 1–7, tie-impossible→merge, win 1–7, win 8–13, win ≥ 14) — still BCS-legal in spirit (no running-up-the-score incentive beyond the top bin) while recovering most of the information the binary model discards. Re-run the full five-way sensitivity audit on the ordered model; hypothesis: (a) rank-ranges shrink by ≥ 30% (more information → less sensitivity), and (b) the ordered model beats the binary model by ≥ 1.5% on held-out ATS accuracy. If (a) fails, the sensitivity is structural to multi-membership GLMMs, not to information scarcity — a publishable negative result for the GSE research log.

**Verdict:** ADAPT — the multiple-membership GLMM with its five-way sensitivity audit is the statistically honest way to build and publish NCAA team ratings with calibrated uncertainty, but GSE must pair it with margin information (the paper's own limitation) and verify the replication gates before treating any of its rankings as product truth.
