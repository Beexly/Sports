# [0655] Modeling outcomes of soccer matches (arXiv:1807.01623)

**Citation:** Alkeos Tsokos, Santhosh Narayanan, Ioannis Kosmidis, Gianluca Baio, Mihai Cucuringu, Gavin Whitaker, Franz Kiraly (2018). *Modeling outcomes of soccer matches*. arXiv:1807.01623v1 (stat.AP). URL: https://arxiv.org/abs/1807.01623
**Ledger completed:** 2026-09-21. **Read:** full text (recovered canonical PDF: `https://arxiv.org/pdf/1807.01623v1`).
**Verdict:** ADAPT — the time-varying-coefficient Bradley-Terry (feature weights that change linearly with games played) is directly portable to NFL: early-season games should weight prior-season info and form differently than late-season games. The walk-forward validation framework (temporal experiments + meta-analysis synthesis) is a template GSE should steal for model comparison. Fresh-search replacement for `1612.07543v1` (pool-reserve REJECT). Search terms: "arXiv Elo rating sports prediction time-varying team strength paper" / "dynamic Bradley-Terry model time-varying team strength sports arXiv" / "TrueSkill Glicko Bayesian skill rating sports paper arXiv".

## 1. Research question
Which Bradley-Terry extensions (with team features, time-varying coefficients, smooth time interactions) and a hierarchical Poisson log-linear model best predict soccer win/draw/loss outcomes — entry for the 2017 Machine Learning Journal "MLS challenge"?

## 2. Dataset / schema
- 52 leagues, 35 countries; >200,000 matches (nearly all leagues since 2008, some since 2000). No cross-country leagues; teams move only via promotion/relegation.
- 16 extracted features: home, newly promoted, days since previous match, form (points in last 3 / 9), matches played, points tally, goal difference, goals scored/conceded per match, points per match, previous-season points tally and goal difference, team rankings (from pairwise-comparison ranking algorithms), season, season window, calendar quarter.
- Home teams scored 304,918 goals vs away 228,293 — clear home advantage.

## 3. Method / model
BT strength specifications (log-odds of i beating j linked to λ_it − λ_jt):
- BL: λ_it = β h_it (home only baseline). (Eq. 1)
- CS: λ_it = α_i + β h_it (constant team strengths). (Eq. 2)
- LF: λ_it = Σ_k β_k x_itk (linear features, coefficients shared across teams/leagues). (Eq. 3)
- TVC: λ_it = Σ_{k∈V} γ_k(m_it) x_itk + Σ_{k∉V} β_k x_itk, with γ_k(m_it) = α_k + β_k m_it — feature weights vary linearly with matches played. Equivalent to LF + interaction features {m_it x_itk}. (Eq. 4)
- AFD: λ_it − λ_jt = Σ_{k∈V} g_k(x_itk − x_jtk, m_it) + Σ_{k∉V} f_k(x_itk − x_jtk) — smooth bivariate (thin-plate spline) time interactions, penalized ML via mgcv. (Eq. 5)
- Draws: ordinal cumulative-link (Eq. 6) or Davidson extension; Davidson slightly better.
- HPL: hierarchical Poisson log-linear for goal counts: log θ_g1 = Σ β_k z_g1k + α_hg (attack) + ξ_ag (defense) + γ_hg,season + δ_ag,season; AR(1) across seasons for attack/defense interactions; fitted with INLA (Rue et al. 2009). (Eq. 7)
- Estimation: ML (BFGS for Davidson), penalized ML (mgcv, GCV) for AFD, INLA for HPL.

## 4. Equations & assumptions
- p(y_ijt=1) = π_i/(π_i+π_j), π_i = exp(λ_i). (BT core)
- γ_k(m_it) = α_k + β_k m_it (TVC).
- Ranked probability score: RPS = (1/(r−1)) Σ_{i=1}^{r−1} Σ_{j=1}^{i} (p_j − a_j) — strictly proper scoring rule. (Eq. 8)
- Meta-analysis synthesis: S_i | U_i ~ Normal(α + U_i, σ̂_i²), U_i ~ Normal(0, τ²); α̂ = Σ w_i s_i / Σ w_i, w_i = 1/(σ̂_i² + τ̂²).
- Assumptions: strength = linear/smooth function of features; draws handled via ordinal/Davidson; training restricted to 20,000 most recent matches (computational).

## 5. Features / target
- Target: win/draw/loss (multinomial), plus goal counts in HPL.
- Inputs: the 16 features above.

## 6. Validation design
Novel context-specific temporal validation: 17 experiments (one per calendar year), train on data before Apr 1 of year Y, predict Apr 1–7 of Y (for 2017: before Mar 14, predict Mar 14–21). Uncertainty via leave-one-match-out jackknife per experiment; synthesized with DerSimonian-Laird random-effects meta-analysis. MLS challenge: 206 matches Mar 31–Apr 10, 2017.

## 7. Numerical results / baselines
Ranked probability score (validation / challenge test):
- BL 0.2242 / 0.2261; CS 0.2112 / 0.2128; LF 0.2088 / 0.2080; TVC 0.2081 / 0.2080; AFD 0.2079 / 0.2061; HPL 0.2073 / 0.2047 (best).
- Validation-test correlation 0.973 (excluding BL) — the validation framework accurately estimated unseen performance.
- TVC-Ordinal was the submitted model (†). Only goal difference and last-season points tally had time-varying coefficients significantly ≠ 0 (Wald p < 0.001).
- HPL RMSE on actual scores: 1.0011 (SE 0.0077) vs baseline 1.0331 (SE 0.0083).
- Conclusion: time-varying components best within BT class; HPL marginally better overall; suggest ensembles and hierarchical cross-league borrowing.

## 8. Code / data availability
MLS challenge data (Berrar et al. 2017, osf.io/ftuva). R packages: BradleyTerry (Firth 2005), mgcv, R-INLA. No author repo linked in the paper.

## 9. Leakage & limitations
- Feature selection was ad hoc; conclusions not generalizable beyond the specific April window.
- Meta-analysis independence assumption violated (overlapping training sets across experiments) — acknowledged as crude.
- Computational shortcuts: 20k-match training cap, CS fit league-by-league on 1-year window.
- Soccer-specific (draws, low scores); NFL adaptation needs spread/margin targets, not W/D/L.
- HPL best but league-by-league (no cross-league borrowing); AFD trained on all leagues ignoring league structure.

## 10. GSE overlap
Per ~/workspace/arxiv-sweep/existing-research-map.md: Garrett's corpus has Bradley-Terry/Elo baselines and Poisson score models, but no time-varying-coefficient BT (feature weights as functions of games played) and no walk-forward-plus-meta-analysis validation protocol. Extension, not duplicate.

## 11. GSE implementation spec
- Port TVC to NFL: λ_it = Σ_k (α_k + β_k · week_t) x_itk — i.e., let feature weights drift linearly with the week number. Prime NFL features for V (time-varying set): prior-season win total / power rating (weight should DECAY as current-season games accumulate), early-season form (weight high early, decays), rest/fatigue proxies. Fit as logistic regression on game outcomes with interaction terms {week × feature} — the paper's Eq. 4 reduces to exactly this, implementable in minutes on nflverse.
- Port the validation protocol: K temporal experiments (one per season), train before week W, predict weeks W..W+2, jackknife SEs, DerSimonian-Laird synthesis for the overall metric. This gives GSE a principled way to compare engine versions across seasons with proper uncertainty — adopt as the standard model-comparison harness.
- Port HPL's AR(1)-across-seasons attack/defense for NFL: team offensive/defensive efficiencies as latent AR(1) states across seasons, fitted with INLA or Stan — a cleaner dynamic team-strength model than rolling averages.
- Effort: low (TVC logistic), medium (INLA AR(1)).

## 12. Reproducible test
Dataset: nflverse 2010–2024. Test 1 (TVC): logistic BT with {week × feature} interactions for features {prior-season rating, current-season point differential, rest days} vs plain LF logistic, walk-forward 2018–2024 (train through week 8 of season Y, predict weeks 9–18); gate = TVC wins on mean log-loss by ≥0.005 with jackknife CI excluding zero. Test 2 (validation harness): implement the 17-experiment protocol on GSE's current engine vs Elo baseline; gate = harness reproduces the known ordering (engine > Elo) with stable meta-analytic SEs.

## 13. Acceptance / rejection gate
ADAPT if Test 1 passes — time-varying feature weights earn a permanent slot in the rating stack. The validation harness (Test 2) is worth adopting regardless as process infrastructure. REJECT only if TVC interactions are uniformly zero on NFL data (i.e., feature weights are truly stationary across the season).

## 14. Improvement experiment
NFL-specific TVC with regime interactions: γ_k(m_it) = α_k + β_k m_it + δ_k · 1{post-bye} + η_k · 1{playoff race} — test whether feature weights shift discontinuously at structural breakpoints (bye weeks, clinching scenarios), not just linearly with time. Compare against smooth (spline) TVC à la AFD on the same walk-forward protocol.
