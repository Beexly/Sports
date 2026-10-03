# [0391] Miss It Like Messi: Extracting Value from Off-Target Shots in Soccer (arXiv:2308.01523v2)

**Citation:** Ethan Baron, Nathan Sandholtz, Devin Pleuler, Timothy C. Y. Chan (2023). *Miss It Like Messi: Extracting Value from Off-Target Shots in Soccer*. arXiv:2308.01523v2. URL: https://arxiv.org/abs/2308.01523v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2013 lines).
**Verdict:** ADAPT — the generative execution-error framework (hierarchical mixture of truncated bivariate Gaussians over end-point coordinates, Rao-Blackwellized scoring) transfers to NFL accuracy modeling (QB throw placement, kicker FG dispersion, punt placement); adopt the *method* with football-geometry likelihoods, not the soccer shot model.

## 1. Research question
Soccer's standard shooting metrics (goals above expectation GAX, expected goals added EGA, post-shot xG) assign zero value to off-target shots — 57–65% of all shots — discarding most of the available data. Is there non-negligible shooting-skill signal in off-target shot trajectories (near misses vs wild misses), and can a player-specific generative model of shot trajectories produce shooting-skill metrics that are more stable over time and more predictive of future performance than the state of the art? (Abstract, §1)

## 2. Dataset / schema
- **77,315 shots**, StatsBomb event data via academic partnership with Toronto FC (proprietary — cannot be shared publicly). Six international leagues, 15 seasons: Eredivisie 2018-19–2020-21 (rank 7), MLS 2018–2020 (14), Argentine Primera 2019-20 (18), 2. Bundesliga 2018-19–2020-21 (20), Ligue 2 2018-19–2020-21 (26), USL 2019–2020 (31). Rankings per [2] as of 2022-01-23; none are elite leagues. Mean PreXg per league-season has SD ≈ 0.0015 (Table 1).
- Per-shot features: player, outcome (Saved/Goal/Off Target/Blocked/Post), shot start (x, y) and end (x, y, z) coordinates, body part (Right/Left Foot, Header, Other), StatsBomb PreXg and PostXg estimates.
- Preprocessing: (a) corrected a data-collection bias near the goal frame (post-click amplification; Appendix A.1); (b) projected saved/blocked shot trajectories forward to estimated goal-line crossing (y, z) — linear horizontal projection for y, raw save z as proxy for projected z (§2.1); (c) excluded shots from <6 yards (force/luck dominate accuracy); (d) reflected y-coordinates of left-footed shots about goal center.
- **Execution-error prior data:** 8,466 penalty shots from 21 semi-professional players aimed at high (1.75 yd) or low (0.14 yd) targets [Hunter et al. 2018, [11]] — used to inform the covariance specification of the generative model (Appendix A.2). Fitted covariances: S_(0.14yd) = [[0.704, 0.157],[0.157, 0.297]]; S_(1.75yd) = [[0.782, 0.442],[0.442, 0.742]] (yards²). Execution-error shape assumed to change linearly with intended height, constant laterally.

## 3. Method / model
- **Generative model (§3):** player-specific hierarchical mixture of truncated bivariate Gaussians over shot end coordinates (y, z) at the goal-line plane, z truncated at 0: f(y_i^(p), z_i^(p)) = Σ_k θ^(p)_k · TruncNorm(y, z | μ_k, Σ_k) (Eq. 1), with θ^(p) ~ Dirichlet_K(α·β) (Eq. 2), β = global component weights, α = shrinkage hyperprior.
- **Two-stage fitting (§3.1–3.2):** (1) saturate with a dense grid of fixed components: n_y × n_z means (11×6 = 66 locations) × L = 2 covariance scales (λ_1 = 1.0, λ_2 = 3.8) = 132 components; fit only global weights β with symmetric Dirichlet(1/2) prior (Jeffreys; encourages sparsity); prune components with β̂ < 0.01 → trimmed set C (K = |C|). (2) Estimate player-specific θ^(p) over C via variational inference in RStan (MCMC too slow), with α = 30 chosen by mean log-likelihood per shot.
- **PostXg(y, z) (§4.3):** coordinate-only post-shot xG via logistic regression: log(PostXg/(1−PostXg)) = β_0 + β_1 y + β_2 y² + β_3 y³ + β_4 z + β_5 z² + β_6 z³ (Eq. 14); zero outside the goal frame. AUC = 0.70 vs 0.86 for StatsBomb's proprietary PostXg (which adds shot speed, goalkeeper location).
- **RBPostXg (§4.1):** Rao-Blackwellized PostXg — E[X^(p)|θ^(p)] = Σ_k θ^(p)_k · v_k (Eqs. 7–11), where v_k = ∫∫ PostXg(y,z)·TruncNorm(m_k, S_k) dy dz estimated by Monte Carlo integration with rejection sampling. Predicted probability an arbitrary shot from player p scores, conditioning on the player's generative parameters rather than realized outcomes.
- **GenPostXg (§4.2):** shot-specific metric — posterior component responsibilities p̂_k(y,z) = β̂_k·TruncNorm(y,z|m_k,S_k)/Σ_j β̂_j·TruncNorm(...) (Eq. 12, using *global* weights); GenPostXg(y,z) = Σ_k v̂_k·p̂_k(y,z) (Eq. 13). Attaches non-zero value to every shot, including off-target ones; a player's metric = mean over their shots.
- **Player diagnostics (§5.2):** per-player component weights reveal shooting habits (e.g., Giovinco 2018: ~0.24 weight on the top-left-corner component; Ibrahimović 2019: overweight on the high-variance bottom-left component → less accurate than average aiming there).

## 4. Equations & assumptions
- (1) f(y_i^(p), z_i^(p)) = Σ_{k=1}^K θ^(p)_k · TruncNorm(y_i^(p), z_i^(p) | μ_k, Σ_k).
- (2) θ^(p) ~ Dirichlet_K(α·β).
- (3) Saturated global model: f = Σ_j Σ_ℓ β_{jℓ} · TruncNorm(m_j, λ_ℓ S_j); (4) β ~ Symmetric-Dirichlet_{J×L}(α = 1/2).
- (5) Trimmed hierarchical likelihood with K = |C| components.
- (6) X^(p)|(y,z) ~ Bernoulli(PostXg(y, z)); (7–10) derivation of E[X^(p)|θ^(p)] = Σ_k θ^(p)_k v_k; (10) v_k := ∫∫ PostXg(y,z)·TruncNorm(m_k, S_k) dy dz; (11) RBPostXg(p) := Σ_k θ̂^(p)_k · v̂_k.
- (12) p̂_k(y,z) responsibility formula; (13) GenPostXg(y,z) = Σ_k v̂_k · p̂_k(y,z).
- (14) Polynomial logistic PostXg(y, z) (cubic in y and z).
- Appendix covariances quoted in §2 above.
Stated assumptions: shot trajectories are i.i.d. draws from the player's generative process; execution-error shape from semi-pro penalty experiments transfers to pro match play; goal probability given end coordinates = PostXg(y, z) (ignores keeper position, shot speed); shots <6 yards excluded as accuracy-irrelevant; left/right-foot symmetry via reflection; the pruned component set C captures the relevant shot space.

## 5. Features / target
- Input features: shot end (y, z) coordinates at the goal-line plane (projected for saved/blocked shots), player identity, body part; the PostXg model uses only (y, z) polynomial terms.
- Targets: RBPostXg(p) — per-player scoring probability of an arbitrary shot; GenPostXg(y, z) — per-shot expected scoring value including off-target shots; component-mean expected values v_k.

## 6. Validation design
- **Stability:** inter-half-season correlation of each metric (first half vs second half of the same season) — all players (Table 2), restricted to ≥40-shot player-seasons (Table 3), and as a function of sample-size threshold with 90% bootstrap CIs (Figure 5).
- **Predictive power:** cross-metric prediction — whether first-half RBPostXg/GenPostXg predicts second-half GAX/EGA better than first-half GAX/EGA themselves (Tables 2–3, bolded best predictors).
- **Robustness:** sensitivity analysis over 9 preprocessing combinations (distance thresholds × left-foot reflection on/off; Appendix A.3, Figure 9).
- Baselines: GAX (goals above expectation), EGA (expected goals added). Note: validation is split-half within season, not across seasons (limited consecutive seasons in the data).

## 7. Numerical results / baselines
- **Stability, all players (Table 2):** same-metric first-half→second-half correlation: GAX 0.035, EGA 0.056, **RBPostXg 0.136, GenPostXg 0.162**. GenPostXg also best predicts second-half GAX (0.074) and EGA (0.072) — better than GAX/EGA predict themselves.
- **Stability, ≥40 shots/season (Table 3):** GAX −0.025, EGA −0.033 (benchmarks lose all stability), **RBPostXg 0.219, GenPostXg 0.232**; RBPostXg and GenPostXg tie at 0.219–0.226 for predicting each other; both best-predict second-half benchmarks (e.g., first-half GenPostXg → second-half EGA 0.020 vs first-half EGA → second-half EGA −0.033).
- **Sample-size curve (Figure 5):** proposed metrics reach inter-season correlation ≈ 0.3 at ≥40-shot thresholds; GAX/EGA stay near zero at all thresholds.
- **PostXg model:** AUC 0.70 vs 0.86 for StatsBomb's proprietary version (their gap: shot speed + goalkeeper location).
- **Hyperparameters:** final saturated set n_y = 11, n_z = 6, L = 2, λ = (1.0, 3.8) → 132 components; 30 hyperparameter combos tested, results "relatively small impact" except n_y, n_z improvements up to n_z = 6; pruning threshold β̂ < 0.01; hierarchical α = 30; variational inference in RStan.
- **Player illustration (§5.2):** the smaller-variance bottom-left component offers 28% higher value than the larger-variance one at the same location; Giovinco 2018 ~0.24 weight on top-left-corner component.

## 8. Code / data availability
Code open-source: https://github.com/baronet2/shotmissr. Data proprietary (StatsBomb via Toronto FC academic partnership) — explicitly cannot be shared publicly.

## 9. Leakage & limitations
- **Validation is split-half within season, not across seasons** — the stability claim rests on first-half→second-half correlations; true year-over-year stability is untested, and within-season halves share team/coach/opponent context that could inflate stability.
- PostXg(y, z) ignores goalkeeper position and shot speed (AUC 0.70 vs 0.86) — all v_k and both metrics inherit this misspecification; shots at the same coordinates against different keepers get identical value.
- Projected z-coordinate for saved/blocked shots uses the raw save z as proxy (no physics model) — a crude imputation the authors chose for convenience.
- Execution-error covariances come from semi-pro penalty kicks, not pro match play — the paper flags this ("may be different than those of professional players in real match situations").
- i.i.d. shots assumption ignores game state (score, pressure), shot context beyond coordinates, and within-player adaptation; truncated-Gaussian mixtures with fixed covariances are a strong parametric choice (sensitivity tested only over grid hyperparameters, not over the Gaussian family itself).
- Data is from non-elite leagues (ranks 7–31) — transferability to elite finishing is assumed, not shown.
- External validity to NFL: soccer shots ≠ football throws; the *idea* (model execution error as a generative spatial process; Rao-Blackwellize over the latent process; don't discard misses) transfers, but nothing here is football-ready.

## 10. GSE overlap
Extension — new method, adjacent to existing work. The map lists xG player/position-adjusted (2301.13052, Drive dossier) and CPOE as "Bernoulli residual + shrinkage" with UNVERIFIED nflfastR feature list. GSE's accuracy-side inventory is about *outcomes* (CPOE, completion probability, kicker metrics) — no generative execution-error model of *placement* exists in the corpus. The transferable assets: (a) hierarchical shrinkage of per-player latent parameters toward global components (Dirichlet(α·β)) — directly applicable to QB placement or kicker dispersion with small samples; (b) Rao-Blackwellization over the latent generative process instead of realized binary outcomes — the analog of RB-FG% for QBs/kickers; (c) the core lesson that discarding misses (57–65% of soccer shots; analog: throwaways, drops, blocked kicks) discards most of the signal. Not duplicate: nothing in the map models spatial execution error generatively.

## 11. GSE implementation spec
Three concrete NFL adaptations, in priority order:
1. **Kicker FG dispersion model:** model each FG attempt's miss vector (lateral/vertical miss distance from the uprights' center) as a player-specific hierarchical mixture over a coarse spatial grid (the paper's saturate-then-prune recipe), with a coordinate-based make-probability surface (logistic in miss vector, the analog of PostXg(y,z)). Metric: RB-FG% — a kicker's true make probability marginalized over their dispersion process, shrunk toward global components. Data: play-by-play kick data (nflverse has kick distances/outcomes; miss-vector data needs charting — check FTN/SIS). Effort: 2–3 weeks.
2. **QB throw-placement surface:** NGS/tracking gives ball arrival coordinates vs receiver position; model per-QB placement error as a hierarchical mixture (intended target = receiver location at catch point), with catch-probability-as-function-of-placement as the PostXg analog. Yields a placement-skill metric that separates QB accuracy from receiver/route context — a generative upgrade over CPOE's Bernoulli residual. Effort: 4–6 weeks (depends on tracking-data access for arrival coordinates).
3. **Punt placement model:** same machinery over landing coordinates with a field-position-value surface (the analog of PostXg contour). Effort: 2 weeks.
Common recipe per the paper: saturate fixed components (grid × covariance scales), Jeffreys Dirichlet(1/2) global weights, prune β̂ < 0.01, hierarchical player weights via variational inference (α tuned by held-out log-likelihood), Monte Carlo integration for component values.

## 12. Reproducible test
- **Mechanism check (soccer):** clone https://github.com/baronet2/shotmissr and rerun the pipeline on the authors' data if obtainable, or on any public shot-coordinate dataset (e.g., StatsBomb open data, which includes shot end coordinates for several competitions). Success: reproduce the ordering — GenPostXg and RBPostXg inter-half-season correlations ≥2× the EGA/GAX baselines on the same data (e.g., with ≥40-shot player-seasons, RBPostXg ≥ 0.15 vs EGA ≤ 0.05).
- **NFL transfer test:** build the kicker RB-FG% model (adaptation 1) on 2020–2023 FG attempts; evaluate year-over-year stability (2023 RB-FG% vs 2024 actual FG%) against the baseline of raw FG% and distance-adjusted FG%. Window: 2020–2024 seasons. Baseline to beat: raw prior-season FG% correlation with next-season FG% — the paper's claim analog is that the generative metric is ≥2× more stable.

## 13. Acceptance / rejection gate
ADAPT into GSE's accuracy metrics only if: (a) the mechanism check reproduces ≥2× stability improvement of the generative metrics over the outcome-only baselines on public soccer data (confirms the method, not just the paper's private data); AND (b) on NFL kicking data, year-over-year correlation of RB-FG% with next-season actual FG% beats prior-season raw FG% by ≥0.10 in absolute correlation (e.g., 0.25 vs 0.15) over the 2020–2024 window; AND (c) the miss-vector data source is charted reliably (no hand-labeled one-off data). If (b) fails — i.e., misses carry no more signal than makes in football — reject the transfer and keep CPOE-style outcome residuals; the paper remains a methodological reference for small-sample skill estimation.

## 14. Improvement experiment
Two extensions beyond the paper: (1) **Context-conditional components** — the paper's components are purely spatial; make mixture weights depend on game context (score differential, pressure/down, weather for kickers) via a hierarchical regression on θ^(p), so the generative process captures *situational* accuracy rather than marginal accuracy. Test: does context-conditional RB-FG% predict clutch kicks better than marginal RB-FG%? (2) **Replace fixed covariances with learned per-player covariance** — the paper fixes S_j from semi-pro experiments for tractability; with modern variational inference, learn player-specific covariance scaling (the analog of their λ_ℓ) hierarchically, which would capture the "some kickers are consistently wild, others consistently tight" axis directly. Test on QB placement data: does learned dispersion beat fixed-grid dispersion on held-out log-likelihood?
