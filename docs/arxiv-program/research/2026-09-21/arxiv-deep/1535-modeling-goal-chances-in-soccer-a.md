# [1535] Modeling goal chances in soccer: a Bayesian inference approach (arXiv:1802.08664)

**Citation:** Gavin A. Whitaker, Ricardo Silva, Daniel Edwards (2018). *Modeling goal chances in soccer: a Bayesian inference approach*. arXiv:1802.08664. URL: https://arxiv.org/abs/1802.08664
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — the block-structured Poisson chance-creation model with game-state/red-card/home-effect covariates is a clean, implementable template for NFL scoring-opportunity (drive/scoring-chance) modeling with online Bayesian updating.

## 1. Research question
How many scoring chances does a soccer team create in a given section of a match, and what is the composite nature of each chance — which players are involved (assister, chance-taker) and where on the pitch the assist and chance occur? The paper builds an interpretable Bayesian model of chance counts plus chance composition, applied to the 2016/17 English Premier League to infer team chance-creation abilities and visualize player attacking styles.

## 2. Dataset / schema
Stratagem Technologies "Analyst" event data, 2016/2017 English Premier League (380 fixtures): ~32,000 events total (~85 per fixture). Each event: fixture id, date, team, time (minutes), event type (goal, yellow/red card, chance), player(s), and for goals/chances the (x,y) location of both the assist and the chance. Goals and chances are merged into one "chance" concept. Coordinate system: attacking-team perspective, x ∈ [−136,136] (width), y ∈ [0,420] (length), (0,0) = center of defended goal. Derived: game state (goal difference at block start) and red-card state (player-count difference). Access: proprietary Stratagem data — not public, no replication link stated.

## 3. Method / model
Two independent components. (A) Chance counts: each fixture split into 6 × 15-minute blocks; N^j_{t_r,k} (team j's chances in block t_r of fixture k) ~ Poisson(λ^j_{t_r,k}) with log-linear predictor combining team chance-creation ability θ, opposition ability, block-specific home effect γ, game-state coefficient α, red-card coefficient β (sum-to-zero constraint on θ). (B) Chance composition: per chance, assist player A and chance player C drawn from Multinoulli (categorical) distributions with block-specific probabilities φ^a_{t_r}, φ^c_{t_r} (Dirichlet priors — "topic-model" style); assist locations (x^a,y^a) and assist→chance displacement (Δx,Δy) each modeled by a Gaussian mixture with M=8 components whose means are fixed at k-means centroids and whose covariances and Dirichlet weights are inferred. Joint posterior (Eq. 10) fit by blocked Gibbs sampling in PyMC3 (Python), 2000 iterations + 100 burn-in; parameters updatable per block as the season progresses (demonstrated: fit to 1/1/2017, then monthly updates).

## 4. Equations & assumptions
- N^j_{t_r,k} ~ Pois(λ^j_{t_r,k}) (1); λ^j_{t_r,k} = exp{θ^j_{t_r} − θ^{T_k\j}_{t_r} + δ_{T_k^H,j}·γ_{t_r} + α·G^j_{t_r,k} + β·R^j_{t_r,k}} (2), with Σ_i θ^i_{t_r} = 0 (sum-to-zero identifiability). Rationale stated: if one team creates chances the other cannot (attacking-events-only data).
- Likelihood L_N = Π_r Π_k Π_{j∈T_k} (λ^j_{t_r,k})^{N^j_{t_r,k}} exp(−λ^j_{t_r,k}) / N^j_{t_r,k}! (3).
- Z^{a}_{s,i,t_r} ~ Multinoulli(φ^a_{t_r}) (4); π(Z^a|φ^a) = Π_r Π_s π(Z^a_{s,i,t_r}|φ^a_{t_r}) (5); same for chance player (6–7).
- Assist-location GMM: L_a = Π_r Π_{i∈P} Π_l Σ_{m=1..M} κ^a_{i,t_r,m} · N((x^a,y^a); μ^a_m, Σ^a_m) (8); displacement GMM L_Δ analogous (9). M=8 fixed; μ from k-means on all observed locations (e.g., assist centroids: (0,240) "own half" long ball; (±115,·) corners/crosses; box cutbacks).
- Joint posterior (10): π(θ,α,β,τ,φ^a,φ^c,κ^a,κ^Δ,Σ^a,Σ^Δ | N,Z^a,Z^c,x^a,y^a,Δx,Δy) ∝ π(α)π(β)π(γ)π(τ)π(θ|τ)π(N|θ,α,β,γ) × π(φ^a)π(Z^a|φ^a)π(φ^c)π(Z^c|φ^c) × π(κ^a)π(Σ^a)π(x^a,y^a|κ^a,μ^a,Σ^a,φ^a) × π(κ^Δ)π(Σ^Δ)π(Δx,Δy|κ^Δ,μ^Δ,Σ^Δ,φ^c).
- Priors (11): α,β,γ ~ N(0,10²); θ|τ ~ N(0,τ); τ ~ Gamma(1,0.01); φ^a,φ^c ~ Dirichlet(1_P); κ^a,κ^Δ ~ Dirichlet(1_M); Σ^a,Σ^Δ ~ W^{−1}(I_2,2) (inverse-Wishart).
Assumptions: chances conditionally independent given rates; a player can't assist/take a chance for the opposition (rare events ignored); transferred players treated as new players; no A–C dependence modeled (flagged as limitation); block widths (15 min) arbitrary; mixture means fixed rather than inferred.

## 5. Features / target
Inputs: team identity, home/away, block (1–6), game state at block start, red-card state, player identities, assist/chance (x,y) locations. Targets: (A) count of chances per team-block (Poisson); (B) per-chance assist player, chance player (categorical), assist location, assist→chance displacement (GMM). Horizon: within-match blocks; sequential monthly refits demonstrate the online-updating use case rather than a fixed forecast horizon.

## 6. Validation design
No formal train/test split or predictive-accuracy metric reported — validation is qualitative/face-validity: posterior θ table vs known season outcomes (top-4 vs relegated), trace-plot mixing check, and a pre-match case study (LIV vs CRY, 23/4/17: model fit on pre-match data predicted CRY would create 1 chance in each of blocks t_3 and t_5 vs actual 2 in each; player-location probabilities computed by integrating over posteriors). Alternative goal-based setups (Dixon–Coles style) were tried; "little or no difference in sum-of-squares, bias or empirical predictive distributions," so the simpler model was kept. No baselines beaten numerically; no Brier/log-loss.

## 7. Numerical results / baselines
Paper's reported numbers (quoted): posterior-mean θ (chance-creation ability) per block, Table 4 — e.g., MCI: t_1 0.201, t_2 0.401, t_6 0.465 (highest in t_1, t_2, t_6); LIV t_3 0.414; CHE t_6 0.384; relegated SUN t_6 −0.531, t_1 −0.296; HUL t_3 −0.304. Home effect γ_{t_r}: positive in all 6 blocks with near-identical 95% CI widths, rising in t_3 (end of first half) and t_6 (end of match). LIV–CRY case: P(Benteke chance at LIV's weak left-box location in t_3) = 0.166; P(McArthur assist in t_3) = 0.134; P(Cabaye or Puncheon assist in t_5) = 0.121. Eriksen created the most chances in the league (2016/17); Kane scored most goals, Agüero had most chances. No predictive-accuracy numbers vs baselines stated.

## 8. Code / data availability
None stated — no code repository; data proprietary to Stratagem Technologies.

## 9. Leakage & limitations
Adversarial notes: (1) No out-of-sample predictive scoring at all — the "validation" is narrative face-validity, so the chance-count model's forecasting skill is unproven. (2) θ estimated on full-season data including the matches being "explained" — descriptive, not predictive, in the main application. (3) The independence assumption between teams' chance creation is acknowledged as "limiting by construction." (4) No assist-taker dependence (A–C correlation) — flagged by authors. (5) Mixture means fixed by k-means on the full dataset = data-dependent empirical Bayes shortcut. (6) Block granularity arbitrary; no smoothing over time for φ/κ (flagged). (7) Proprietary data — not replicable as-is; GSE would need NGS or charting equivalents. (8) Soccer chances ≠ NFL scoring: the composition half (assist/chance players, pitch geometry) has no NFL analogue.

## 10. GSE overlap
Existing map: Poisson/Dixon-Coles/Skellam goal models inventoried in team_ratings; NGS profile deep-dive covers tracking; no "chance-creation" or block-structured Poisson rate model with game-state covariates exists in the corpus. GSE's engine predicts game outcomes, not within-game scoring-opportunity rates. This is an extension: the portable piece is (A) the Poisson rate model with block structure + game-state/red-card/home-effect covariates + sum-to-zero identifiability + Gibbs/PyMC3 inference, which maps cleanly onto NFL drive-level scoring-opportunity modeling.

## 11. GSE implementation spec
1. Data: nflverse play-by-play 2015–2025; define a "scoring chance" = drive reaching the opponent's 35-yard line (or EPA-based: drive with max EPA play > threshold). Split games into 8 × ~7.5-minute blocks (or by quarter/half).
2. Model: N^j_{t_r,k} ~ Poisson(λ), log λ = θ^j_{t_r} − θ^{opp}_{t_r} + home·γ_{t_r} + α·(score differential at block start) + β·(turnover/penalty state proxy); Σθ = 0; priors per (11) with PyMC.
3. Fit weekly-expanding; posterior θ = team's "chance-creation ability" — use as a feature in the engine's totals model and as a matchup input (offense chance-creation vs defense chance-suppression).
4. The GMM composition half: adapt to NFL by modeling the (yard line, down, distance) distribution of scoring chances via mixtures — useful for totals calibration.
5. Effort: ~1 week for the Poisson half in the gse-lab; the spatial half is optional phase 2.

## 12. Reproducible test
Dataset: nflverse 2020–2025, weekly expanding fits. Metric: out-of-sample Poisson log-likelihood (or Dawid-Sebastiani score) on held-out 2025 team-block chance counts vs a baseline constant-rate Poisson and vs a Dixon-Coles-style goal model adapted to chances. Gate: the covariate model (game state + home + red-card proxy) must beat the intercept-only model on held-out log-likelihood; then test whether posterior θ adds signal to GSE's totals picks (Brier on over/under) beyond v5.2.7.

## 13. Acceptance / rejection gate
ADOPT the block-Poisson chance-rate layer if, on 2025 held-out games, it improves the Dawid-Sebastiani score for team scoring-chance counts over the constant-rate baseline by ≥5% AND the posterior θ feature improves totals-pick Brier by ≥0.001 vs v5.2.7; REJECT if neither gate clears (the paper itself provides no predictive-accuracy evidence, so the burden of proof is entirely on our replication).

## 14. Improvement experiment
Beyond the paper: replace fixed 15-minute blocks with a continuous-time log-Gaussian Cox process for chance arrivals (intensity varying smoothly with game state and clock), and add the missing A–C dependence via a player-pair interaction term (assist-player × chance-player random effect) — the paper's own flagged gap — then test whether the Cox formulation beats the block-Poisson on held-out log-likelihood.
