# Deep Research Ledger — 0069

- **file_index:** 0069
- **arxiv_id:** 2311.13707v1
- **title:** Bayes-xG: Player and Position Correction on Expected Goals (xG) using Bayesian Hierarchical Approach
- **authors:** Alexander Scholtes, Oktay Karakuş (Cardiff University, School of Computer Science and Informatics)
- **venue:** arXiv preprint v1 (2023-11)
- **date read:** 2026-09-21
- **reading path:** Full text read via arXiv PDF (1,262 extracted lines, all read). ar5iv not attempted (PDF rendered cleanly).
- **verdict:** ADAPT

---

## 1. Problem statement and claimed contribution

Mainstream xG models assign the same goal probability to identical shots regardless of who takes them (the paper's motivating example: Messi vs. an English 5th-tier player taking the same shot). This paper asks whether **position-level** and **player-level** effects on xG exist, using **Bayesian hierarchical logistic regression** (bambi/PyMC): group-specific intercepts/slopes for position groups and individual players, with informative skew-normal priors. Three models: BayesxG1 (baseline features + position), BayesxG2 (extended features + position), BayesxG3 (extended features + player). Claims: (a) positional effects exist in a sparse model but vanish with richer features; (b) player effects persist even with rich features; (c) priors matter for sampling efficiency — a full prior-sensitivity analysis is included; (d) results replicate across EPL, La Liga, Bundesliga.

**Overlap note:** The related-works section cites Hewitt & Karakuş (2023) — arXiv 2301.13052 — which found the same positional/player adjustments with a non-Bayesian approach. Per the existing-research map, 2301.13052 was **already absorbed** into GSE's corpus. This paper's marginal contribution over it is the Bayesian hierarchical machinery, the prior design/sensitivity analysis, and the cross-league validation — not the adjustment concept itself.

## 2. Method details (architecture, features, training)

- **Data:** StatsBomb open event data via StatsBombPy; **63,309 open-play shots** (set pieces excluded), 42 columns; men only. Engineered features: distance to goal (Euclidean to goal center, pitch-normalized 120×80), shot angle (cosine rule to both posts), GK distance to goal, GK in shot triangle, players in shot triangle, opponents within 1 m, body part (preferred/other foot via pass-foot analysis), first-time shot, one-on-one, open goal, technique, under pressure; plus mode general position (ST/AM/M/D) and player identity.
- **Reference models (§3.3):** frequentist logistic regressions. Baseline (Eq. 8): distance + angle + interaction. Extended (Eq. 9): + GK distance, players in triangle, body part, first-time, GK in triangle, one-on-one, open goal, technique, under pressure (16 parameters, 33 after one-hot).
- **BayesxG models (§3.4):** Bernoulli likelihood; bambi MCMC with **1500 draws, 250 burn-in, 4 chains (6000 samples)**, 95% target acceptance. Group-specific intercepts β_0k and slopes β_jk for K groups (Eq. 10).
  - BayesxG1: baseline features + position grouping.
  - BayesxG2: extended features + position grouping.
  - BayesxG3: extended features + player grouping (selected players + "other").
- **Priors (Table 3):** skew-normal (SN) with directional α where the effect sign is predictable: distance SN(μ=−1,σ=5,α=−1); angle SN(μ=1,σ=5,α=1); players in triangle α={5,4,…,−5} by count; opponents in radius α={1,0,…,−2}; GK in triangle α=−2; one-on-one α=2; open goal α=4; under pressure α=−2; position α={ST:2, AM:1, M:0, D:−2} with σ∼HN(γ=5); player α∈{2,0} by reputation (2 = good finisher). Neutral coefficients N(μ=0,σ=5).
- **Validation of sampler:** Bayes' theorem adjustment P(goal|position_i) = P(position_i|goal)·P(goal)/P(position_i) (Eq. 11) reproduces the hierarchical adjustments (Table 5).

## 3. Math / equations (quote exactly; flag reconstructions)

- **Eq. 1 (logistic):** logit(p_i) = log(p_i/(1−p_i)) = β_0 + Σ_j β_j X_ji. (Extraction interleaves the fraction; standard form intended. **Minor garble, reconstructable.**)
- **Eqs. 2–5:** Y_i ∈ {0,1}; p_i = P(goal); Y_i ∼ Bernoulli(p_i). Clean.
- **Eq. 7 (hierarchical):** logit(p_ij) = β_0 + Σ_j β_j·X_ji + β_{N+1}·X_{N+1,i}. Clean enough; the "grouping effect" underbrace is noted.
- **Eq. 8 (baseline):** logit(p_i) = β_0 + β_1·distance_i + β_2·angle_i + β_3·(distance_i·angle_i). Clean.
- **Eq. 9 (extended):** adds β_4·GK distance + β_5·players in triangle + β_6·body part + β_7·first-time + β_8·GK in triangle + β_9·one-on-one + β_10·open goal + β_11·technique + β_12·under pressure. Clean.
- **Eq. 10 (BayesxG):** logit(p_ik) = β_0k + Σ_j β_jk·X_ji + β_{N+1,k}·X_{N+1,i} — group-specific intercepts and slopes. Clean.
- **Eq. 11 (Bayes validation):** P(goal|position_i) = P(position_i|goal)·P(goal)/P(position_i). Clean.
- No uncertain reconstructions beyond Eq. 1's layout.

## 4. Data and experimental setup

- **EPL:** ~10,000+ shots; **La Liga:** ~19,000 shots (Barcelona/Messi-heavy — authors note the bias risk, which is why modeling is per-league); **Bundesliga:** ~7,500 shots. Goals: 6,559 / 56,750 no-goal.
- **BayesxG3 player selection:** by conversion rate, min 50 shots. EPL: Pirès 56/14 (25.0%), Agüero 112/20 (17.9%), Vardy 111/19 (17.1%), Coutinho 105/8 (7.6%), Barkley 82/6 (7.3%), Shelvey 51/0 (0%). La Liga: Bale 89/20 (22.5%), Messi 1862/375 (20.1%), Eto'o 295/62 (21%), Bebé 74/2 (2.7%), Márquez 53/2 (3.8%), Iniesta 362/25 (6.9%). Bundesliga: Hernández 63/16 (25.4%), Aubameyang 107/22 (20.6%), Lewandowski 147/28 (19%), Groß 56/1 (1.8%), Çalhanoğlu 51/1 (2%), Werner 64/6 (9.4%).
- **Prior sensitivity (§4.5):** refit extended single-level model with (1) paper priors, (2) wide uniform, (3) tight uniform, (4) wide normal, (5) tight normal, (6) deliberately ill-suited (narrow, flipped skews).

## 5. Results (exact numbers, with table/section cites)

- **Table 4 (frequentist, 63k shots):** Baseline — RMSE 0.095, MAE 0.058, R² 0.428, Brier 0.086. Extended — RMSE 0.055, MAE 0.029, R² 0.826, Brier **0.076** vs. StatsBomb benchmark **0.075** ("nearly identical," comparable to industry-leading xG).
- **BayesxG1 positional adjustments (Table 5, mean model vs. theoretical):** ST 0.009/0.010, AM 0.019/0.020, M −0.006/−0.005, D −0.042/−0.044. Surprise: attacking midfielders get *larger* positive adjustments than strikers (authors' explanation: strikers already take high-xG shots; AMs convert low-xG chances near goal at above-average rates).
- **BayesxG2:** positional adjustments collapse — "few adjustments now exceed 0.01"; the extra predictors (one-on-ones etc.) absorb what looked like position effects. Defenders sit just below 0, AMs just above, ST/M ≈ 0 across all angles/distances (Fig. 7).
- **BayesxG3 player effects persist with the extended model:** Pirès adjustments up to **+0.3** above baseline; Agüero consistently positive (narrow spread); Vardy/Coutinho/Barkley ≈ minimal; Shelvey substantially negative. Adjusted xG totals track actual goals far better than baseline xG (Fig. 10). Aubameyang anomaly: high conversion (20.6%) but negative adjustments — his goals come from already-high-xG chances.
- **Cross-league (§4.4):** BayesxG1 ordering (AM > ST > M > D) and magnitudes replicate in La Liga and Bundesliga; BayesxG2 shrinkage replicates; player effects replicate (Bale/Messi/Eto'o positive; Bebé/Márquez negative; Werner negative).
- **Prior sensitivity (§4.5):** paper's priors win — prediction distribution closest to baseline/benchmark. Wide normal ≈ comparable (slightly more overpredicted outliers). Wide uniform: poor spread (non-convergence at fixed sample budget). Tight uniform/normal: systematically underestimate (mass concentrated ≤0.8). Ill-suited: narrow, few predictions >0.5. MSD boxplots confirm the ranking.

## 6. Limitations and risks (as stated + reviewer view)

- **Stated:** team effects confound player effects (Vardy/Agüero discussion — Leicester's direct style vs. City facing packed defenses); the La Liga set is Messi/Barcelona-heavy; priors "could be refined to enhance sampling efficiency."
- **Reviewer view:**
  - **Core concept already in GSE's corpus** via 2301.13052 — do not double-count this as a new finding.
  - **Player priors use reputation (α=2 for "good finishers")** — subjective, not data-driven; a production version should use empirical-Bayes or cross-validated priors.
  - **BayesxG3 player selection is post-hoc** (chosen by observed conversion rate, then "adjusted" xG is shown to match goals) — circularity risk in the showcase; the hierarchical shrinkage is still the right machinery, but the demo is selected.
  - **Soccer-only;** no NFL application demonstrated. The transferable asset is the hierarchical methodology + prior-sensitivity protocol.
  - MCMC cost noted qualitatively but not quantified (no wall-clock times) — relevant for GSE scale-up.

## 7. Reproducibility and artifacts

- **Code:** bambi (open-source) specified; no repo link given in the paper. **Data:** StatsBomb open data via StatsBombPy (public). **Priors:** fully tabulated (Table 3, Table 9). **MCMC settings:** fully stated. Reproducible in principle.

## 8. GSE application

- **Direct methodological transfer to NFL player/unit adjustments:** GSE already computes CPOE (noted in the map as "Bernoulli residual + shrinkage") and QB-aggressiveness metrics. Bayes-xG's hierarchical logistic regression is the principled Bayesian upgrade to ad-hoc shrinkage:
  1. **Hierarchical CPOE:** QB-level (or receiver-level) random effects on completion probability given the nflfastR-style feature set — partial pooling handles small-sample QBs exactly as the paper handles small-sample shooters.
  2. **Position-group adjustments for EPA models:** TE/RB/WR group effects on EPA/play or success rate, mirroring the ST/AM/M/D analysis — and the paper's key caution transfers directly: apparent "position effects" may vanish once situational features (coverage, pressure) are included (BayesxG1→BayesxG2 lesson).
  3. **Prior-sensitivity protocol (§4.5)** as a template for any GSE Bayesian model: fit wide/tight/ill-suited variants and compare MSD — cheap insurance against prior-driven conclusions.
- **Do not adopt the soccer xG model itself** — the application duplicates 2301.13052, already absorbed.

## 9. Implementation spec for GSE

1. Reimplement the BayesxG2/BayesxG3 pattern in bambi (or PyMC): Bernoulli-logit hierarchical model with group-specific intercepts; start with the paper's prior table as a template (directional skew-normal priors where effect sign is known, e.g., pressure → negative).
2. Pilot on an NFL analog: hierarchical completion-probability model — features = nflfastR cp_model-style predictors; groups = QB (player) and position (for receiver models). Compare pooled vs. unpooled vs. hierarchical via LOO-CV.
3. Run the §4.5 prior-sensitivity battery (wide/tight normal, wide/tight uniform, ill-suited) and require the chosen prior to dominate on MSD before trusting any player-effect ranking.
4. Replace reputation-based player priors (α=2) with empirical-Bayes priors estimated from prior-season data.

## 10. Test protocol

- **Reproduction gate:** rebuild BayesxG1 on StatsBomb EPL open data; recover Table 5 adjustments within ±0.005.
- **GSE gate:** hierarchical CPOE model vs. current shrinkage CPOE on 2024–2025 passes, time-ordered; metric = log-loss on held-out completions. **Adopt if hierarchical wins by a clear margin on QBs with <200 attempts (the small-sample regime where partial pooling should dominate);** adapt (keep as research prior) if it only matches.
- **Prior gate:** chosen priors must beat wide-normal and ill-suited variants on the §4.5-style MSD comparison.

## 11. Improvement paths

- Empirical-Bayes / cross-validated player priors instead of reputation α.
- Team-level crossed random effects (the paper's own stated confound: Vardy/Leicester vs. Agüero/City) — directly relevant to NFL (QB vs. scheme vs. supporting cast).
- Extend from binary outcomes to ordered EPA buckets (hierarchical ordered logit).
- Quantify MCMC wall-clock cost at NFL scale (millions of plays) and evaluate variational inference as the production path.

## 12b. Acceptance gate

1. **Reproduction criterion:** rebuild BayesxG1 on StatsBomb EPL open data and recover the Table 5 positional adjustments within ±0.005 (paper: ST 0.009, AM 0.019, M −0.006, D −0.042), per §10.
2. **Comparison to run:** head-to-head on 2024–2025 passes, time-ordered: hierarchical CPOE (QB/player random effects with directional skew-normal priors per Table 3) vs. GSE's current shrinkage CPOE — metric = log-loss on held-out completions, focused on QBs with <200 attempts (the small-sample regime where partial pooling should dominate); plus the §4.5 prior battery (chosen priors must rank first on MSD vs. wide/tight/uniform/ill-suited variants, as the paper's own priors did).
3. **Decision rule:** ADOPT only if the reproduction gate holds, the prior battery ranks the chosen priors first, AND hierarchical wins held-out log-loss on small-sample QBs; ADAPT (research prior) if it only matches; otherwise REJECT.

## 12. Verdict

**ADAPT** — The soccer xG application duplicates 2301.13052, already absorbed into GSE's corpus, so there is no new finding to adopt. What is worth adapting is the *method*: Bayesian hierarchical logistic regression with directional priors and a full prior-sensitivity battery, which is the principled upgrade to GSE's current shrinkage-based player adjustments (CPOE et al.). Port the machinery to NFL completion/EPA models, not the xG model.

## 13. Related work / overlap

- **Existing GSE corpus:** 2301.13052 (Hewitt & Karakuş, xG player/position-adjusted) already absorbed — this paper is its Bayesian follow-up by the same co-author; treat as one lane, already counted.
- **GSE stack:** CPOE-as-Bernoulli-residual + shrinkage (map §127–128) is the direct insertion point; dynamic Elo / nested AR(1) / Gaussian processes are complementary, not overlapping.
- **This batch:** 0068 (GLMF) is the other hierarchical-modeling paper — GLMF for sparse matchup imputation, Bayes-xG for group-effect adjustment; complementary methods, no duplication.

## 14. Extraction notes

- PDF extraction is clean; all tables and numbers verified. Eq. 1's layout interleaves the logit fraction but is reconstructable (flagged minor). Table 9's prior listings are partially column-interleaved in extraction but the six prior regimes and their qualitative results are fully captured in the text (§4.5).
