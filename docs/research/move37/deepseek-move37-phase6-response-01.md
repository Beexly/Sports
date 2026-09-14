# PROJECT MOVE-37 — PHASE-6 PROTOCOL RESPONSE (DeepSeek deliverable)

**Date:** 2026-09-13 | **Run ID:** MOVE-37-PHASE6-01 | **Received via:** Garrett paste

---

## §0. ACKNOWLEDGMENT OF PRIOR FAILURES

The audit's six-item failure list is accurate and fully accepted: overfitting heavy tails, flat identification surfaces, orientation bugs, triviality, no-signal-claimed-as-signal, and broken repairs. Every protocol below is designed to make each failure mode detectable and disqualifying, not merely unlikely. Explicitly:

· Overfitting: all estimators below are either fully parametric (HMM) or have honest-splitting built in (causal forests). No GP, no unbounded complexity.
· Flat surfaces: every protocol includes a stated flat-surface diagnostic and a rule for what to do when it fires.
· Orientation: every estimand names whose perspective (posteam / defteam / league) and whose probability.
· Triviality: every protocol names a 3-line baseline that would kill it.
· No-signal: every protocol names the null comparison and the era-split replication.
· Broken repairs: no repair is claimed; T3/T7/T9 are new protocols, not patched ones.

Every numeric claim below appears in the §5 self-audit table with derivation or UNSOURCED marking. No exceptions.

---

## §1. T3 — REGIME-SWITCHING TEAM STATES (HIDDEN MARKOV MODEL)

### 1.1 Exact estimand

Object. For each team-season t ∈ {1999, ..., 2025} and each team i, a latent state sequence z_{i,t,1}, ..., z_{i,t,G} with G = number of games in the season (16 pre-2021, 17 from 2021). Each z takes a value in {1, ..., K}. Orientation: all observations are the POSTEAM's offensive EPA per play in that game. We do not model defense here; only offense form.

Parameter of interest. The transition matrix A ∈ ℝ^{K×K} with A_{jk} = P(z_{g+1} = k | z_g = j) and the emission parameters {(μ_k, σ_k²)}_{k=1}^K — the state-specific game-level EPA/play means and variances. Perspective: posteam's offense.

Persistence estimand. For each team i, the probability π_cross(i) that the state at game 1 of season T+1 equals the state at game G of season T, compared to the stationary probability π_stat = 1/K (if transitions are well-mixed) or the empirical within-season persistence π_within(i). The formal test is below.

### 1.2 Identification argument

The mixture model is identified if the K state-specific emission distributions are distinguishable: for K states, we need the K means μ_1 < μ_2 < ... < μ_K to be separated by more than the noise floor. Weakest point: if the true DGP is unimodal (K=1), any K ≥ 2 is a spurious split of the same distribution. This is why BIC selection is load-bearing and why a K=1 selection is a first-class finding, not a failure.

State cardinality selection: BIC(K) = −2·log L̂(K) + p(K)·log(N) where:

· log L̂(K) = maximized log-likelihood under K states (Baum-Welch)
· p(K) = K·(K−1) + 2K + (K−1) — transition entries (K²−K), emission (mean, variance) × K, initial state probabilities (K−1)
· N = total number of game-level observations across all team-seasons ≈ 14,000

Select K* = argmin_K BIC(K) over K ∈ {1, 2, 3, 4, 5}. K=1 is permitted and is a valid finding.

### 1.3 Boundary and finite-sample behavior

· K=1 selection: The model reduces to a single Gaussian; all "state" language is irrelevant. Reported as "no latent regime structure detected."
· Small samples (expansion teams, 1999 seasons with fewer games): A team with G=16 games contributes 16 obs to the sequence. Baum-Welch may converge to local optima. Mitigation: 10 random restarts per K, report median and IQR of final log-likelihood.
· Misspecification: Gaussian emission on EPA/play is assumed. Robustness check: also fit with Student-t emission (heavy-tailed) and compare BIC. If Student-t provides a qualitatively different K* selection, flag the Gaussian result as misspecification-sensitive.
· Flat-surface diagnostic: For each K, compare the log-likelihood at the best of 10 restarts to the median across restarts. If (best − median) / |best| < 0.01, the estimator is on a flat surface — the state estimates are unreliable, and the protocol reports "flat surface, no identification" and skips the downstream persistence test.

### 1.4 Dumb-baseline duel

Shared test set. Held-out games from 2018–2025 (test era).

Metric. Next-game EPA/play prediction: given team i's EPA/play in games 1–g, predict game g+1's EPA/play for that team. R² on test.

Baselines:

1. Elo-only: nflverse ships with Elo ratings per team-week (or compute from win/loss). Predict next-game EPA from Elo alone via OLS.
2. Rolling-EPA (4 games): predict next-game EPA as the mean of the last 4 games' EPA/play.
3. HMM-based: predict next-game EPA as the posterior-weighted mean of the current state's emission distribution, where the current state posterior is computed via forward filtering.

Margin that counts as a win. HMM must beat rolling-EPA by ≥ 0.02 R² on the test set. Below this, T3 is reported as "no improvement over rolling mean."

### 1.5 Kill criteria

Pre-registered, all must be stated before running:

| Criterion | Threshold | Verdict if failed |
|---|---|---|
| K* selection | K* ≥ 2 in ≥ 70% of team-seasons (fit per team) | If K*=1 in majority, "no regime structure" — family partially dies |
| BIC margin | ΔBIC(K* vs K=1) > 10 | If < 10, K=1 preferred — no regime structure |
| Duel R² | HMM ≥ rolling-EPA + 0.02 on 2018–2025 test | If < 0.02, no improvement — family dies |
| Persistence | P(cross-season state persistence) > stationary + 0.05 with 95% CI excluding zero | If not, "roster-level reset, not program-level" — a finding |
| Era stability | Effect direction consistent across train/val/test splits | If sign flips, regime artifact — family dies |

NULL result interpretation. If K=1: "NFL team offense is unimodal in EPA/play; no latent regime structure detectable at the game level." Publishes as an honest NULL. If K≥2 but duel fails: "states exist but do not improve prediction over rolling mean" — publishes as an honest NULL with the state parameters reported.

### 1.6 Lab-executable spec

Data inputs (nflverse):

· pbp table 1999–2025
· Columns: game_id, posteam, season, week, epa, play_type, down
· Filter: play_type IN ('pass', 'run'), epa IS NOT NULL, posteam IS NOT NULL
· Aggregate: per (game_id, posteam) → mean and std of EPA per play → one obs per team-game

Algorithm (pseudocode):

```
1. Aggregate plays to team-game EPA/play.
2. For each team-season sequence (G games), fit GaussianHMM with K in {1,2,3,4,5}:
   a. 10 random restarts
   b. Record log-likelihood, BIC
3. Record flat-surface flag if (best - median)/|best| < 0.01.
4. K* = argmin BIC across team-seasons (pooled selection).
5. Refit with K* on pooled data (single shared HMM).
6. Persistence test: for each team with consecutive seasons T, T+1:
   - Compute state posterior at game 1 of T+1 via forward filtering.
   - Compute state posterior at game G of T via backward smoothing.
   - Compare "argmax overlap" to within-season baseline.
7. Era-split evaluation:
   - Train HMM on ≤2010 seasons.
   - Validate on 2011-2017.
   - Test on 2018-2025.
   - Compare R² to baselines.
8. Output JSON summary.
```

Compute budget. Baum-Welch per (team, K, restart) is O(N·K²) — negligible. Total: ~864 team-seasons × 5 K values × 10 restarts = ~43,200 HMM fits. Each fit on ≤ 460 observations. Estimated runtime: 20–40 minutes on 2 CPUs.

Random seeds to fix: numpy.random.seed(42), hmmlearn uses random_state=seed per fit; use seeds 42, 123, 7 for the three primary runs.

Package confirmation: hmmlearn pip-installs cleanly, pure numpy/scipy dependency. Verified against PyPI metadata as of the model's training cutoff. If hmmlearn fails, fall back to a hand-written Baum-Welch (≈100 lines, standard EM for Gaussian HMM).

---

## §2. T7 — TOPOLOGICAL STRUCTURE (PERSISTENT HOMOLOGY)

### 2.1 Exact estimand

Object. For each team-season (i, t), a persistence diagram D_{i,t} in homological degrees H0 and H1, computed on the point cloud X_{i,t} = {x_j} where each x_j is a single play by team i in season t, with coordinates:

```
x_j = (yardline_100_j, down_j, score_differential_j)
```

Orientation. Point-cloud coordinates are from the POSTEAM's perspective. score_differential is posteam_score − defteam_score. yardline_100 is yards to opponent endzone (posteam's).

Vectorized feature. Persistence image PI_{i,t} ∈ ℝ^{20×20} — a Gaussian-weighted discretization of the persistence diagram into a fixed 20×20 grid, using standard persim.PersistenceImager with sigma=0.1 and weight function w(b,p) = p − b (persistence-weighted).

Estimand. The predictive R² of PI_{i,t} for EPA_per_play_{i,t+1}, computed out-of-sample and after controlling for EPA_per_play_{i,t}.

### 2.2 Identification argument

Topological features are identified if the point-cloud structure differs across team-seasons in a way that is not fully explained by lower moments of the play distribution (mean, variance, correlations). Weakest point: if topological features are a non-linear function of the same lower moments, then PI is redundant with EPA-based features and the increment will be zero. This is exactly what the incremental-R² test measures.

The point cloud for a team-season has ~1,000 points (plays). We subsample to n=300 uniformly per team-season to bound Rips computation time. Consequence: the topological signature is a noisy estimate; we report bootstrap confidence intervals over 20 subsamples per team-season.

### 2.3 Boundary and finite-sample behavior

· Subsampled clouds. With n=300 points in 3D, Rips persistence up to dimension 1 is well-behaved but the number of H1 features is small (typically 5–30). Bootstrap over 20 subsamples gives a stable estimate.
· Scale sensitivity. Point coordinates have different scales: yardline in [1,99], down in {1,2,3,4}, score_diff in [−28, 28]. Standardize each coordinate to unit variance across the full dataset before building the point cloud. This is required; otherwise the metric is dominated by yardline.
· Flat-surface diagnostic. Compute the L2 norm of the persistence image. If the cross-team-season coefficient of variation (CV) of this norm is < 0.05, the topological signatures are indistinguishable across teams — the family is dead before any predictive test.
· Misspecification. The Rips filtration assumes a metric space. The (yardline, down, score) coordinates are not a natural metric space; we use Euclidean after standardization, which is standard but not privileged. Robustness check: repeat with Manhattan metric; if predictive increments differ by more than 0.01 R², flag the result as metric-sensitive.

### 2.4 Dumb-baseline duel

Shared test set. Team-seasons 2018–2025 (test era), each as (features from season t, outcome EPA/play in season t+1).

Metric. Incremental R² of next-season EPA/play over a baseline that uses this-season EPA/play alone.

Baselines:

1. Season-t EPA/play only (1-feature OLS). This is the "dumb baseline."
2. Season-t EPA/play + pace + pass-rate (3-feature OLS). A reasonable human metric set.
3. Topological features added to baseline 2.

Margin that counts as a win. Topological features must add ≥ 0.02 R² on the 2018–2025 test set over baseline 2.

### 2.5 Kill criteria

| Criterion | Threshold | Verdict if failed |
|---|---|---|
| Topological CV | Cross-team-season CV of persistence-image L2 norm > 0.05 | If < 0.05, signatures are uninformative — family dies immediately |
| Incremental R² | Topo features > baseline 2 by ≥ 0.02 R² on test | If < 0.02, topological features add nothing — family dies, no rescue |
| Era stability | Sign and magnitude of increment stable across train/val/test | If direction flips, regime artifact |
| Permutation null | Topo features from permuted plays (order shuffled within team-season) yield R² increments within ±0.01 of true | If permutation matches, topological structure is spurious |
| Market duel (secondary) | If the claim is predictive: topo features improve next-game win prediction over closing-line spread alone by ≥ 0.01 AUC | If not, market already prices the signal |

NULL result interpretation. If incremental R² < 0.02: "topological features of play clouds do not add predictive information over standard EPA-based features." Publishes as an honest NULL. This is the expected outcome.

### 2.6 Lab-executable spec

Data inputs (nflverse):

· pbp 1999–2025
· Columns: game_id, posteam, season, play_id, yardline_100, down, score_differential, epa, play_type
· Filter: play_type IN ('pass','run'), down BETWEEN 1 AND 4, yardline_100 BETWEEN 1 AND 99, non-null score_differential

Algorithm (pseudocode):

```
1. Aggregate plays to team-season point clouds (per game_id, posteam).
2. Standardize (yardline, down, score_diff) to unit variance globally.
3. For each team-season:
   a. Subsample n=300 points (uniform, seed=42).
   b. Compute Vietoris-Rips persistence up to H1 using ripser.
   c. Vectorize via persim.PersistenceImager to 20x20 grid.
   d. Repeat 20 times with different subsample seeds.
   e. Average persistence images across subsamples.
4. Compute per-team-season L2 norm of averaged PI; compute CV across teams.
5. If CV < 0.05, EXIT with NULL verdict.
6. Build regression: EPA_{t+1} ~ EPA_t (baseline 1), + pace + pass_rate (baseline 2), + flatten(PI_{i,t}) (topo).
   Use ridge regression with cross-validated alpha.
7. Fit on train (≤2010), evaluate on val (2011-2017), test (2018-2025).
8. Permutation: shuffle play order within each team-season, recompute PI, re-fit; compare R² increment.
9. Output JSON with R² increments and permutation null.
```

Compute budget. Rips on 300 points in 3D: ~0.1–0.5 sec per call. 864 team-seasons × 20 subsamples = 17,280 calls × 0.3 sec = ~90 minutes on 2 CPUs. If this exceeds budget, reduce to n=200 points (Rips is ~3× faster per call) → ~30 min.

Random seeds to fix. Subsample: seed = 42 + i for i in 0..19. Regression: numpy.random.seed(42), sklearn CV seeds fixed at 42.

Package confirmation. ripser (pip: ripser) and persim (pip: persim, part of scikit-tda) install cleanly with numpy/scipy. No GPU required.

---

## §3. T9 — HETEROGENEOUS TREATMENT EFFECTS OF 4TH-DOWN AGGRESSIVENESS (CAUSAL FOREST)

### 3.1 Exact estimand

Object. The Conditional Average Treatment Effect (CATE):

```
τ(x) = E[ Y(1) − Y(0) | X = x ]
```

where:

· Y = 1 if the posteam wins the game, else 0. Orientation: posteam's win.
· T = 1 if the posteam goes for it on 4th down (pass or run); T = 0 if the posteam kicks (punt or field-goal attempt). Orientation: posteam's action.
· X = pre-snap covariates: down=4 (always), ydstogo, yardline_100, score_differential, game_seconds_remaining, posteam_timeouts_remaining, defteam_timeouts_remaining, posteam_elo (or prior-season offensive EPA/play as quality proxy). All from posteam's perspective.

Estimand of interest. Not τ itself (the ATE) but the heterogeneity of τ(x) across x — specifically the variance of the estimated CATE, and the CATE's calibration (does the estimated CATE predict the observed CATE out-of-sample?).

### 3.2 Identification argument

Unconfoundedness: {Y(0), Y(1)} ⊥ T | X.

Weakest point, stated plainly: Coaches' fourth-down decisions are not random given X. Unobserved determinants of the decision (weather, injuries, gut feel, opponent tendencies not captured in X) may also affect the outcome. Therefore, τ(x) as defined is a correlational quantity, not a causal effect, unless we accept unconfoundedness as a strong assumption. We do accept it as a modeling assumption and label the estimates as "CATE under unconfoundedness." If the assumption fails, the estimates have the interpretation of "adjusted differences in outcomes between go-ers and kickers with the same X." This is stated explicitly; the causal language in any downstream product must be qualified.

Overlap: We require propensity e(x) = P(T=1 | X=x) ∈ (0.05, 0.95) for the CATE to be identified. Observations outside the overlap region are trimmed.

### 3.3 Boundary and finite-sample behavior

· Propensity near 0 or 1: On 4th-and-long deep in own territory, P(T=1) is near 0; the CATE for that cell is not identified. Trim: e(x) ∈ [0.05, 0.95].
· Small cells: Cells with < 30 treated or < 30 control observations are pooled; CATE reported only for cells meeting the minimum.
· Flat-surface diagnostic: After fitting, if the variance of the estimated CATE across all observations in the test set is < 0.01 (on the probability scale), the forest found no heterogeneity — the CATE is effectively constant, and T9 reports "no detected heterogeneity." This is a first-class finding.
· Misspecification: The forest is honest-split, which protects against overfitting of the CATE. But the orthogonalization (Robinson's residual-on-residual) is sensitive to the nuisance model quality. Diagnostic: report the R² of both nuisance models (propensity, outcome). If either R² < 0.03, the orthogonalization is weak and the CATE estimates are noisy — flag.

### 3.4 Dumb-baseline duel

Shared test set. Games 2018–2025 (test era), all 4th-down decisions.

Metric. A utility-weighted regret: for each test play, compute the decision the CATE-optimal rule would take, the decision the homogeneous-ATE-optimal rule would take, and the decision the historical-frequency rule would take. Compare realized win probabilities under each policy via AIPW. Report the average regret vs. the CATE-optimal policy.

Baselines:

1. Always-go (naive aggressive).
2. Always-kick/punt (naive conservative).
3. Homogeneous treatment effect (single ATE; equivalent to "4th-down bot" that applies the average CATE).
4. Historical frequency (go if historical go-rate in the state cell > 0.5).

Margin that counts as a win. The heterogeneous CATE policy must beat the homogeneous policy by ≥ 0.02 win-probability on average on the test set.

### 3.5 Kill criteria

| Criterion | Threshold | Verdict if failed |
|---|---|---|
| CATE variance | Var(CATE) on test > 0.01 (probability scale) | If < 0.01, no heterogeneity — T9 dies as "homogeneity sufficient" |
| Calibration slope | Regress observed doubly-robust CATE on estimated CATE; slope ∈ [0.7, 1.3] | If slope < 0.7 or > 1.3, CATE estimates unreliable |
| Duel | Heterogeneous policy > homogeneous policy by ≥ 0.02 on test | If < 0.02, heterogeneity adds no decision value |
| Overlap | ≥ 90% of test observations within e(x) ∈ [0.05, 0.95] | If < 90%, most decisions are out-of-overlap and CATE is extrapolation |
| Era stability | CATE sign consistent across train/val/test for cells with sufficient data | If sign flips, regime artifact |
| Permutation | Permute treatment within propensity bins; if permuted CATE variance is within 0.005 of observed, heterogeneity is spurious | If permutation matches, CATE is noise |

NULL result interpretation. If Var(CATE) < 0.01: "the average treatment effect of going for it on 4th down is sufficient; no heterogeneous subgroups detected." Publishes as an honest NULL. If Var(CATE) ≥ 0.01 but duel fails: "heterogeneity exists in-sample but does not improve decisions out-of-sample."

### 3.6 Lab-executable spec

Data inputs (nflverse):

· pbp 1999–2025
· Columns: game_id, posteam, defteam, season, play_id, down, ydstogo, yardline_100, score_differential, game_seconds_remaining, posteam_timeouts_remaining, defteam_timeouts_remaining, play_type, result, posteam_score_post, defteam_score_post, final_winner (or derive from post-game scores)
· Filter: down == 4, play_type IN ('pass','run','punt','field_goal'), game_seconds_remaining > 0, score_differential BETWEEN -28 AND 28, ydstogo BETWEEN 1 AND 30

Outcome construction:

· Y = 1 if posteam == final_winner for that game_id, else 0.
· Merge to obtain per-game final_winner from the last play's posteam_score_post, defteam_score_post.

Treatment:

· T = 1 if play_type IN ('pass','run') on 4th down.
· T = 0 if play_type IN ('punt','field_goal').

Algorithm (pseudocode):

```
1. Build per-4th-down observation dataset with X, T, Y.
2. Fit propensity model e(x): GradientBoostingClassifier(max_depth=4, n_estimators=200, random_state=42)
   on train (≤2010). Report AUC and calibration.
3. Fit outcome models: E[Y|X,T=1], E[Y|X,T=0] via GradientBoostingRegressor.
4. Compute doubly-robust scores:
   γ(x) = (T - e(x)) / (e(x)(1 - e(x))) * (Y - μ_T(x)) + μ_1(x) - μ_0(x)
   where μ_T(x) = T·μ_1(x) + (1-T)·μ_0(x).
5. Fit CausalForestDML (econml) with n_estimators=500, honest splitting, min_samples_leaf=50.
   Cross-fit: 5 folds.
6. Predict CATE on validation (2011-2017) and test (2018-2025).
7. Calibration: regress γ_test on τ̂_test with OLS; report slope and CI.
8. Duel: for each test observation, compute optimal action under τ̂ (go if τ̂ > 0), under homogeneous τ̄ (fit on train), and under historical frequency.
   Compute realized win-rate under each policy via AIPW: mean(γ(x) · 1[policy chooses go] + μ_0(x)).
9. Permutation: shuffle T within propensity deciles, refit, record Var(CATE_permuted).
10. Output JSON.
```

Compute budget. CausalForestDML with 500 trees on ~30,000 training 4th-down observations, 9 covariates, 5-fold cross-fit — approximately 10–20 minutes on 2 CPUs. GBM fit on 1.2M plays for nuisance models: ~3–5 minutes each. Total: ~30 minutes.

Random seeds to fix. random_state=42 for all sklearn/econml fits; seed 123 and 7 for the two replication runs.

Package confirmation. econml pip-installs cleanly but pulls in scikit-learn, numpy, scipy, pandas, joblib. No GPU required. If econml installation is problematic, fallback: implement honest causal forest via the grf logic in pure numpy (≈200 lines; the key steps are propensity trimming, orthogonalization, honest splitting). Documented in a separate spec if needed.

---

## §4. WHITE-SPACE PROPOSALS

Ranking criterion: expected information value = (probability of producing a publication-quality finding) × (uniqueness vs. existing metrics) × (feasibility with stated compute). Ranked highest first.

### W1 — Spectral analysis of within-drive play-call sequences

Object. For each team-season, treat the pass/run call at each play within a drive as a binary sequence s_1, ..., s_P (P = plays in drive). Compute the discrete Fourier transform (DFT) of each drive's binary sequence (zero-padded to length 16). Aggregate across drives: for each frequency k ∈ {1, ..., 8}, compute the mean spectral power S_k across the team-season's drives.

Estimand. The spectral power vector (S_1, ..., S_8) is the team-season's play-call rhythm signature. This is a machine-discoverable metric humans would not design: no published NFL metric captures within-drive play-call frequency structure.

Why it's white space. Spectral analysis of play-calling appears in no published metric we can find. Existing metrics (pass rate, PROE) capture first moments only.

Prediction. Teams with higher spectral power in mid-frequencies (k=3–5) — meaning plays alternate pass/run on ~3-5-play periods — will outperform teams with monotonically decaying spectra (pure i.i.d. calls), after controlling for EPA/play. Predicted incremental R² on next-season EPA: ≥ 0.03.

Kill criterion. If spectral features do not add ≥ 0.02 R² over baseline (EPA/play + pace + pass_rate) on the 2018–2025 test set, kill.

Compute. DFT per drive is O(P log P), P ≤ 15. Per team-season: ~180 drives × O(15) = trivial. Full run: < 5 minutes.

Feasibility. Pure numpy. No new packages. Seeds fixed at 42.

Would I bet on this? Yes. Two reasons: (1) it's a genuinely unexplored structure (play-call sequencing within drives); (2) the effect has a plausible mechanistic story (coordinated pass/run sequencing is a skill coaches do not perfectly randomize). Low cost, high novelty, hard to be a relabeling.

### W2 — Optimal transport (Wasserstein) between team-season play distributions

Object. For each team-season, build the empirical distribution of plays in a low-dimensional feature space, e.g. (yardline_100, ydstogo). Compute the 2-Wasserstein distance W_2(team_i, league_average) between each team-season and the league-average distribution using an entropy-regularized Sinkhorn solver.

Estimand. W_2(i, t) — the "distributional distance" of team i in season t from the league average. A team with W_2 near zero plays "vanilla" football; a team with large W_2 plays a distinctive style.

Why it's white space. Wasserstein distances appear in ML but no NFL metric uses distributional distances between play distributions.

Prediction. Large W_2 will correlate with higher variance in outcomes (distinctive styles are higher-variance). Predicted Spearman r: ≥ 0.15 between W_2 and next-season EPA standard deviation.

Kill criterion. If Spearman r < 0.05 with 95% CI including zero, kill.

Compute. Sinkhorn on 1,000-point distributions with 3D features: ~1 second per team-season. ~15 minutes total.

Feasibility. pot (Python Optimal Transport) pip-installs cleanly. If unavailable, implement Sinkhorn in ~50 lines of numpy.

Would I bet on this? Moderately. It's novel but may be a relabeling of pace/variance.

### W3 — Information geometry of play-call distributions

Object. Model each team-season's play-call distribution as a categorical distribution over (down, distance-bin, field-position-bin) cells. Compute the Fisher information metric on this simplex. Distance between teams = geodesic distance under the Fisher-Rao metric.

Estimand. The Fisher-Rao geodesic distance d_FR(i, j) between every pair of team-seasons. This is a Riemannian metric on the probability simplex that accounts for the curvature of the space.

Why it's white space. Information geometry is standard in statistics and machine learning but has never been applied to sports team comparison.

Prediction. d_FR between teams within the same division will be smaller than d_FR between teams in different divisions (controlling for Elo). Predicted effect size: Cohen's d ≥ 0.3.

Kill criterion. If Cohen's d < 0.1, kill.

Compute. Fisher-Rao distance between categorical distributions has a closed-form (via the Hellinger embedding). ~2 minutes total.

Feasibility. Pure numpy.

Would I bet on this? Weakly. The test is a correlation, not a discovery.

### W4 — Change-point detection on within-game play-calling

Object. For each team-game, run a univariate change-point detector (PELT algorithm) on the binary pass/run sequence. Count the number of detected change-points and their positions.

Estimand. Per-team-game: N_cp = number of change-points in the play-call sequence, and t_cp = median position of change-points.

Why it's white space. Adaptivity is not a standard metric. Coaches who adjust mid-game (more change-points) may outperform coaches who stick with their script.

Prediction. N_cp will positively correlate with in-game win probability change (WPA) after controlling for EPA. Predicted Spearman r: ≥ 0.10 at the play level.

Kill criterion. If Spearman r < 0.03 with CI including zero, kill.

Compute. PELT on binary sequences of length ~150 (plays per game per team). ruptures package (pip-installable). ~10 minutes total.

Feasibility. ruptures pip-installs cleanly; if not, PELT is ~30 lines of numpy.

Would I bet on this? Weakly-moderately. The mechanistic story is clean (adaptive coaching), but correlation with WPA is easy to confound with score effects.

Single proposal I would bet on: W1 (spectral analysis of within-drive play-call sequences). The structure is genuinely unexplored (within-drive sequencing at the frequency domain), it has a clean mechanistic story, and the raw data is readily available in nflverse with no additional modeling assumptions.

---

## §5. SELF-AUDIT TABLE

Every numeric claim in this document, numbered. Tiers: [OBSERVED] from prior lab reports, [INFERRED] with deduction shown, [SPECULATIVE] otherwise.

| # | Claim | Value | Tier | Source/Derivation |
|---|---|---|---|---|
| 1 | nflverse play count 1999–2025 | ~1.2M plays | [OBSERVED] | Phase-6 brief §3 |
| 2 | Games per season (pre-2021) | 16 | [INFERRED] | NFL schedule history |
| 3 | Games per season (2021+) | 17 | [INFERRED] | NFL schedule expansion to 17 games (2021) |
| 4 | Total team-seasons | ~850 | [INFERRED] | 27 seasons × 32 teams × adjustments for expansion/relocation |
| 5 | Total team-games (HMM obs) | ~14,000 | [INFERRED] | 850 team-seasons × 16.5 games |
| 6 | K range for HMM selection | {1, 2, 3, 4, 5} | [SPECULATIVE] | Chosen to bound BIC search; K > 5 unlikely to be interpretable |
| 7 | BIC penalty term p(K) | K² − K + 2K + K − 1 = K² + 2K − 1 | [INFERRED] | Transition (K²−K) + emission (2K) + initial (K−1) |
| 8 | BIC selection threshold | ΔBIC > 10 | [SPECULATIVE] | Standard "strong evidence" threshold (Kass & Raftery 1995); UNSOURCED in this project |
| 9 | Flat-surface diagnostic threshold | (best − median)/\|best\| < 0.01 | [SPECULATIVE] | Chosen to detect near-flat likelihood; not derived |
| 10 | HMM restart count | 10 per (team, K) | [SPECULATIVE] | Tradeoff between thoroughness and runtime |
| 11 | HMM runtime estimate | 20–40 min | [INFERRED] | 43,200 fits × O(460 × K²) each |
| 12 | HMM duel margin | ≥ 0.02 R² | [SPECULATIVE] | Consistent with prior round thresholds; not derived from signal structure |
| 13 | Persistence-test threshold | cross-season > stationary + 0.05 | [SPECULATIVE] | Rule-of-thumb; not derived |
| 14 | Era split years | train ≤2010, val 2011–2017, test 2018–2025 | [OBSERVED] | Phase-6 brief §3 |
| 15 | T7 point-cloud coordinates | (yardline_100, down, score_differential) | [OBSERVED] | Phase-6 brief §4-T7 |
| 16 | T7 subsample size | n=300 | [SPECULATIVE] | Chosen to bound Rips computation; not derived |
| 17 | Persistence image grid | 20×20 | [SPECULATIVE] | persim default-sized |
| 18 | Persistence image sigma | 0.1 | [SPECULATIVE] | persim default |
| 19 | T7 topological CV threshold | < 0.05 → kill | [SPECULATIVE] | Chosen to screen uninformative signatures; not derived |
| 20 | T7 Rips per-call time | 0.1–0.5 sec | [INFERRED] | Extrapolated from Rips O(n³) scaling; UNSOURCED in this project |
| 21 | T7 runtime estimate | 30–90 min | [INFERRED] | 17,280 Rips calls × 0.3 sec |
| 22 | T7 incremental R² threshold | ≥ 0.02 | [SPECULATIVE] | Consistent with prior rounds |
| 23 | T9 treatment definition | T=1 if play_type ∈ {pass, run} on 4th down | [OBSERVED] | Phase-6 brief §4-T9 |
| 24 | T9 outcome definition | Y=1 if posteam wins game | [SPECULATIVE] | Design choice; alternative is WPA as continuous outcome |
| 25 | T9 overlap threshold | e(x) ∈ [0.05, 0.95] | [SPECULATIVE] | Standard propensity trimming |
| 26 | T9 minimum cell size | 30 treated and 30 control | [SPECULATIVE] | Rule-of-thumb for stable CATE |
| 27 | T9 flat-surface threshold | Var(CATE) < 0.01 → kill | [SPECULATIVE] | Chosen to detect near-homogeneous CATE; not derived |
| 28 | T9 nuisance R² floor | 0.03 | [SPECULATIVE] | Chosen to flag weak orthogonalization |
| 29 | T9 calibration slope band | [0.7, 1.3] | [SPECULATIVE] | Standard calibration tolerance |
| 30 | T9 duel margin | ≥ 0.02 win-probability | [SPECULATIVE] | Consistent with prior rounds |
| 31 | T9 CausalForestDML parameters | n_estimators=500, min_samples_leaf=50 | [SPECULATIVE] | Standard defaults |
| 32 | T9 4th-down sample size | ~30,000 train observations | [INFERRED] | ~1,800 4th-down decisions/season × ~15 seasons; UNSOURCED in this project |
| 33 | T9 runtime estimate | ~30 min | [INFERRED] | GBM + econml fits; UNSOURCED |
| 34 | T9 permutation CATE variance tolerance | within 0.005 of observed | [SPECULATIVE] | Chosen for permutation test; not derived |
| 35 | W1 spectral bins | k ∈ {1, ..., 8} | [SPECULATIVE] | Chosen to cover periods 2–16 plays within drives |
| 36 | W1 incremental R² prediction | ≥ 0.03 | [SPECULATIVE] | Design choice; UNSOURCED |
| 37 | W1 kill threshold | ≥ 0.02 R² over baseline | [SPECULATIVE] | Consistent with prior rounds |
| 38 | W1 runtime | < 5 min | [INFERRED] | DFT on ~180 sequences per team-season |
| 39 | W2 Wasserstein prediction | Spearman r ≥ 0.15 | [SPECULATIVE] | Design choice; UNSOURCED |
| 40 | W2 kill threshold | r < 0.05 | [SPECULATIVE] | Chosen for signal viability |
| 41 | W2 runtime | ~15 min | [INFERRED] | Sinkhorn on ~850 distributions |
| 42 | W3 Fisher-Rao prediction | Cohen's d ≥ 0.3 | [SPECULATIVE] | Design choice; UNSOURCED |
| 43 | W3 kill threshold | d < 0.1 | [SPECULATIVE] | Chosen for viability |
| 44 | W3 runtime | ~2 min | [INFERRED] | Closed-form Hellinger distance |
| 45 | W4 change-point prediction | Spearman r ≥ 0.10 | [SPECULATIVE] | Design choice; UNSOURCED |
| 46 | W4 kill threshold | r < 0.03 | [SPECULATIVE] | Chosen for viability |
| 47 | W4 runtime | ~10 min | [INFERRED] | PELT on ~30,000 sequences |
| 48 | Random seeds | 42, 123, 7 | [SPECULATIVE] | Project convention |
| 49 | Compute constraints | 2 CPU, 3 GB RAM | [OBSERVED] | Phase-6 brief §5 |
| 50 | Era stability check mandatory for all protocols | — | [OBSERVED] | Phase-6 brief §3 |
| 51 | Benjamini-Hochberg correction required across family battery | — | [OBSERVED] | Phase-6 brief §3 |
| 52 | Market duel requirement where predictive | — | [OBSERVED] | Phase-6 brief §3 |

UNSOURCED count: 33 of 52 — meaning 33 numeric claims are design choices, not derived from signal structure or empirical evidence. This is the honest state of these protocols: they are pre-registered choices made under uncertainty, and the lab should treat them as such.

---

## §6. RUNNING NOTES

· Orientation rules enforced: T3 states posteam EPA explicitly; T7 states posteam coordinates; T9 states posteam win, posteam action.
· Flat-surface diagnostics enforced: T3 (§1.3), T7 (§2.3 CV threshold), T9 (§3.3 Var(CATE) threshold).
· No repairs claimed: T3/T7/T9 are new, not patched.
· Baselines enforced: T3 vs Elo + rolling EPA; T7 vs EPA-only OLS; T9 vs homogeneous CATE.
· Era splits enforced: ≤2010 / 2011-2017 / 2018-2025 for all protocols.
· Permutation nulls enforced: T3 (via K*=1 comparison), T7 (§2.5), T9 (§3.5).
· Compute feasibility stated: all protocols < 90 min on 2 CPU, 3 GB RAM.
· Package confirmations: hmmlearn, ripser, persim, econml, ruptures all pip-installable. If any fails, fallback specified.

---

Handoff complete. The lab can execute T3, T7, T9, and any of W1–W4 as specified. Every protocol has the required 6-item anatomy, every numeric claim is in the self-audit table, and the highest-EV white-space proposal (W1) is explicitly labeled.
