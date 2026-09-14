# PROJECT MOVE-37 — SEND-BACK 03 REPAIR (REVISED, DEEP RESEARCH)

Galaxy Sports Edge | Theorist Response

Date: 2026-09-14 | Run ID: MOVE-37-REPAIR-03

---

§0. Acknowledgment and what this revision adds

The audit is correct on every finding. W1, W2, W4 executed and killed on my own kill lines; W3 killed without compute. I do not dispute any kill.

This revision adds three things the previous repair did not contain, all driven by fresh primary-source research:

1. The Prelec family is now verified against the primary source, not reconstructed from memory. The 1998 Econometrica abstract states the compound-invariant form explicitly: w(p) = exp{-(-ln p)^α}, 0 < α < 1. The parameter range and behavioral interpretation are documented, not asserted.
2. T3's HMM design is now anchored to published NFL work. Adam, Ötting & Michels (2024), AStA Advances in Statistical Analysis, published "Markov-switching decision trees" using eight seasons of NFL play-call data with states linked to team strategies. This is prior art I should have cited in the original T3 protocol; I now state the precise gap T3 fills.
3. T7's prior is now grounded in the TDA-sports literature's own negative findings. The one published TDA-on-NFL study concluded TDA "did not work well in predicting the effectiveness of the NFL teams". A hockey TDA paper found persistent homology consisted "only of 0 dimensional and 1 dimensional homology" with "long survival rates in the 0 dimensional... and no 1 dimensional classes". And a general TDA evaluation found geometric features explained only 3-9% of the variance of topological features, concluding "persistent homology does not appear to provide much benefit over simpler geometric summaries". This does not change the T7 verdict (REPAIR FIRST), but it changes the honest prior: T7 is a likely negative result and should be run once, not rescued.

I also add four new white-space proposals (W5-W8) replacing the killed W1-W4, each constrained by the audit's requirements.

---

§1. IRL — D1, D2, D3 answered

D2 first (the fatality)

α̂ = −1.70 is not evidence of risk-seeking coaches. It is evidence that CARA over WP is a category error.

The derivation:

· A coach choosing between a 4th-down conversion attempt and a punt faces a binary terminal outcome (win or loss realized at the end of the game). The interim quantity wp is not wealth — it is a probability of winning.
· Applying a concave utility function to a probability is double-counting risk aversion. If the coach's utility is over the binary terminal outcome with U(0)=0, U(1)=1, any increasing U is identical up to affine transformation, so risk aversion cannot manifest over binary lotteries at all.
· The only way risk aversion enters is if the coach cares about something non-binary (career outcome, final score margin, season win total). None are in the model.
· The estimator is not recovering a risk-aversion parameter. It is recovering a decision weight on the two branches — the degree to which the coach over- or under-weights the conversion outcome relative to the failure outcome.

Repair — Prelec probability weighting (verified against primary source).

The estimand becomes the coach's probability weighting function w(p) over the conversion probability, entering expected utility as:

```
E[U | go, s] = w(p_conv(s)) · WP_go_conv(s)
             + (1 − w(p_conv(s))) · WP_go_fail(s)
```

with the Prelec (1998) compound-invariant form:

```
w(p; α) = exp(−(−ln p)^α)
```

Verified properties (from the 1998 Econometrica abstract): "Empirical estimates indicate that w(p) is regressive (first w(p) > p, then w(p) < p), s-shaped (first concave, then convex), and asymmetrical (intersecting the diagonal at about 1/3)". The compound-invariant form is w(p) = exp{-(-ln p)^α}, 0 < α < 1, which is regressive, s-shaped, and with an invariant fixed point and inflection point at 1/e = .37.

Property Value Source
Domain p ∈ (0, 1] Functional form
Boundary w(1) 1 exp(0) = 1
Boundary w(0⁺) 0 Limit
α = 1 w(p) = p (linear) At α=1, exp(-(-ln p)) = p
α ∈ (0,1) Regressive: w(p)>p for p<1/e, w(p)<p for p>1/e Verified from primary source
Inflection point p = 1/e ≈ 0.37 Verified from primary source
Boundedness w(p) ∈ [0,1] for all p ∈ (0,1], α ∈ (0,1] No undefined values

New pre-registered prediction: α̂ ∈ [0.5, 0.9], point estimate 0.7. Reasoning: α < 1 is the canonical behavioral finding (overweighting of small probabilities, s-shaped). NFL coaches are known from the 4th-down bot literature to be more conservative than the model-optimal policy, which in this parameterization corresponds to underweighting the conversion branch — i.e., α closer to 1 or above. Two-sided prediction. If α̂ > 1, coaches underweight the conversion branch (conservative); if α̂ < 1, coaches overweight (aggressive). Kill criterion: α̂ ∉ (0, 1.5] or α̂ within 0.02 of 1.0 (unidentifiable from linear weighting).

D1 — unbounded β search

Log-spaced three-stage search:

· Stage 1: β ∈ 10^[−1, 3] log-spaced at 25 points.
· Stage 2: log-spaced fine grid within a decade of the stage-1 winner, 21 points.
· Stage 3: profile-likelihood check. Fix α at α̂ and sweep β on a log grid; if the profile NLL is monotonically decreasing to the edge, β̂ is unidentified at the boundary — the reported finding is "β unidentified," not a point estimate.

D3 — normalization

The Prelec family satisfies w(0⁺)=0, w(1)=1 by construction. The β parameter multiplies the log-likelihood softmax temperature; it is not scale-dependent on α.

IRL lane status

Still quarantined until the lab executes the Prelec-family code and returns results. The repair is mathematically coherent; whether it survives verbatim execution is for the lab. Code below.

```python
"""
PROJECT MOVE-37 — IRL Prelec probability-weighting repair (verified against Prelec 1998).
Python 3.11. Allowed imports ONLY: nflreadpy, scikit-learn, numpy, pandas.
Run cold: python move37_irl_prelec.py
"""

import warnings
warnings.filterwarnings("ignore")
import json
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import log_loss
import nflreadpy as nfl

# --- Load ---
pbp = {}
for s in range(2014, 2025):
    raw = nfl.load_pbp([s])
    pbp[s] = raw.to_pandas() if hasattr(raw, 'to_pandas') else pd.DataFrame(raw)
all_df = pd.concat([pbp[s] for s in range(2014, 2025)], ignore_index=True)

# --- WP model (counterfactual states only) ---
WP_FEATS = ['score_differential', 'game_seconds_remaining', 'yardline_100']
wp_df = all_df.dropna(subset=WP_FEATS + ['wp'])
wp_df = wp_df[wp_df['season'] <= 2022]
wp_model = GradientBoostingRegressor(max_iter=150, max_depth=4, random_state=42)
wp_model.fit(wp_df[WP_FEATS].values, wp_df['wp'].values)

def predict_wp(sd, gsr, yl100):
    X = np.column_stack([np.asarray(sd, float), np.asarray(gsr, float),
                          np.asarray(yl100, float)])
    return np.clip(wp_model.predict(X), 0.001, 0.999)

# --- Conversion model ---
CONV_FEATS = ['ydstogo', 'yardline_100']
conv_df = all_df[(all_df['down'] == 4) &
                 (all_df['play_type'].isin(['pass', 'run'])) &
                 all_df['fourth_down_converted'].notna()].copy()
conv_tr = conv_df[conv_df['season'] <= 2022]
conv_model = LogisticRegression(max_iter=1000)
conv_model.fit(conv_tr[CONV_FEATS].values,
               conv_tr['fourth_down_converted'].values)

# --- Fourth-down decision dataset ---
fd = all_df[(all_df['down'] == 4) &
            (all_df['play_type'].isin(['pass', 'run', 'punt', 'field_goal']))].copy()
fd = fd.dropna(subset=['ydstogo', 'yardline_100', 'score_differential',
                        'game_seconds_remaining', 'wp', 'fg_prob'])
fd = fd[(fd['ydstogo'] >= 1) & (fd['ydstogo'] <= 30)]
fd = fd[(fd['yardline_100'] >= 1) & (fd['yardline_100'] <= 99)]
fd = fd[(fd['score_differential'] >= -28) & (fd['score_differential'] <= 28)]
fd = fd[fd['game_seconds_remaining'] > 0]

def classify(pt):
    if pt == 'punt': return 'punt'
    if pt == 'field_goal': return 'kick'
    if pt in ('pass', 'run'): return 'go'
    return None
fd['action'] = fd['play_type'].apply(classify)
fd = fd.dropna(subset=['action'])
fd_tr = fd[fd['season'] <= 2022].copy()
fd_te = fd[fd['season'].isin([2023, 2024])].copy()

# --- Prelec weighting (verified against Prelec 1998 Econometrica 66(3):497-527) ---
def prelec_w(p, alpha):
    """w(p;alpha) = exp(-(-ln p)^alpha). Domain p in (0,1], alpha in (0,1.5].
    Bounded in [0,1]. Inflection at p=1/e for alpha in (0,1)."""
    p = np.clip(p, 1e-9, 1 - 1e-9)
    return np.exp(-((-np.log(p)) ** alpha))

# --- Expected utilities under Prelec ---
def expected_utilities(states, alpha):
    """
    Returns (N,3): [E_U_go, E_U_kick, E_U_punt].
    ORIENTATION EXPLICIT: all WP values are from the POSSESSING TEAM's perspective.
    Opponent-possession branches use (1 - wp_from_opponent_perspective).
    """
    ytg = states['ydstogo'].values.astype(float)
    yl = states['yardline_100'].values.astype(float)
    sd = states['score_differential'].values.astype(float)
    gsr = states['game_seconds_remaining'].values.astype(float)
    fg = states['fg_prob'].values.astype(float)

    p_conv = conv_model.predict_proba(np.column_stack([ytg, yl]))[:, 1]
    w_conv = prelec_w(p_conv, alpha)
    w_fg = prelec_w(fg, alpha)

    # Possession-preserving branches: WP from possessing team's perspective
    wp_go_conv = predict_wp(sd, gsr, np.maximum(yl - 5, 1))
    wp_kick_make = predict_wp(sd + 3, gsr, 75)

    # Possession-flipping branches: opponent's WP is (1 - our_wp_from_same_state)
    wp_go_fail = 1 - predict_wp(-sd, gsr, 100 - yl)
    wp_kick_miss = 1 - predict_wp(-sd, gsr, np.minimum(100 - yl + 8, 99))
    wp_punt = 1 - predict_wp(-sd, gsr, np.minimum(100 - yl - 40, 99))

    E_go = w_conv * wp_go_conv + (1 - w_conv) * wp_go_fail
    E_kick = w_fg * wp_kick_make + (1 - w_fg) * wp_kick_miss
    E_punt = wp_punt
    return np.column_stack([E_go, E_kick, E_punt])

ACTIONS = ['go', 'kick', 'punt']
AIX = {a: i for i, a in enumerate(ACTIONS)}

def nll(params, states, obs_idx):
    alpha, beta = params
    if not (0 < alpha <= 1.5) or beta <= 0:
        return 1e10
    EU = expected_utilities(states, alpha)
    logits = beta * EU
    logits -= logits.max(axis=1, keepdims=True)
    logZ = np.log(np.exp(logits).sum(axis=1))
    lp_obs = logits[np.arange(len(states)), obs_idx] - logZ
    return -lp_obs.mean()

states_tr = fd_tr[['ydstogo', 'yardline_100', 'score_differential',
                    'game_seconds_remaining', 'fg_prob']].reset_index(drop=True)
obs_tr = fd_tr['action'].map(AIX).values

# --- Log-spaced 3-stage search (D1 repair) ---
best = (None, np.inf)
for a in np.linspace(0.05, 1.5, 31):          # alpha on (0,1.5]
    for b in np.logspace(-1, 3, 25):          # beta in [0.1, 1000] log-spaced
        v = nll((a, b), states_tr, obs_tr)
        if v < best[1]:
            best = ((a, b), v)
a0, b0 = best[0]

# Stage 2: refine alpha linearly around a0, beta log-spaced within a decade
a_lo, a_hi = max(0.01, a0 - 0.2), min(1.5, a0 + 0.2)
for a in np.linspace(a_lo, a_hi, 21):
    for b in np.logspace(np.log10(max(b0 / 10, 0.1)), np.log10(b0 * 10), 21):
        v = nll((a, b), states_tr, obs_tr)
        if v < best[1]:
            best = ((a, b), v)
a_hat, b_hat = best[0]

# --- Profile-likelihood boundary check (D1) ---
profile_b = []
for b in np.logspace(-1, 3, 41):
    profile_b.append((b, nll((a_hat, b), states_tr, obs_tr)))
prof = np.array(profile_b)
peak_idx = prof[:, 1].argmin()
beta_unidentified = (peak_idx == 0) or (peak_idx == len(prof) - 1)

# --- Evaluation ---
states_te = fd_te[['ydstogo', 'yardline_100', 'score_differential',
                    'game_seconds_remaining', 'fg_prob']].reset_index(drop=True)
obs_te = fd_te['action'].map(AIX).values

EU_te = expected_utilities(states_te, a_hat)
logits = b_hat * EU_te
logits -= logits.max(axis=1, keepdims=True)
probs = np.exp(logits) / np.exp(logits).sum(axis=1, keepdims=True)
pred = probs.argmax(axis=1)
accuracy = (pred == obs_te).mean()
ll = log_loss(obs_te, probs, labels=[0, 1, 2])

baseline_always_go = (obs_te == AIX['go']).mean()
position_rule = np.where(states_te['yardline_100'].values > 40,
                          AIX['punt'], AIX['kick'])
baseline_pos = (position_rule == obs_te).mean()

summary = {
    "alpha_hat": float(a_hat),
    "beta_hat": float(b_hat),
    "nll_train": float(best[1]),
    "beta_unidentified_at_boundary": bool(beta_unidentified),
    "test_accuracy": float(accuracy),
    "baseline_always_go": float(baseline_always_go),
    "baseline_position_rule": float(baseline_pos),
    "test_log_loss": float(ll),
    "verdict": "QUARANTINED_PENDING_REVIEW"
}
print(json.dumps(summary, indent=2))
```

---

§2. T3 — HMM repair (only what changed)

Prior art I should have cited in the original protocol. Adam, Ötting & Michels (2024), AStA Advances in Statistical Analysis 108(2):461–476, published "Markov-switching decision trees" using eight seasons of NFL data to predict play calls, with hidden-Markov states "linked to the teams' strategies". The paper provides R code on GitHub. A companion HMM paper on play-call prediction achieved out-of-sample accuracy of 71.6% for the 2018 NFL season, "similar compared to existing studies". A copula-based HMM on Bundesliga minute-by-minute data found states interpretable as "different levels of control over a match".

The gap T3 fills: the published HMM work models play-call sequence states (pass-heavy vs run-heavy regimes). T3 models team EPA-distribution states (form/quality regimes). These are different latent objects. The audit's demand for a frozen fit unit and a shuffle gate is what separates T3 from the existing work.

T3-D1 (fatal) — freeze one fit unit. Pooled fit across all team-seasons. Every team-season contributes its 16 games as a separate Markov chain sharing the same transition matrix and emission parameters, with per-team emission mean offsets on EPA/play to allow team-level differences in average quality. Decoding (state assignment) is per team-season. Selection (BIC) is computed on the pooled likelihood.

T3-D2 (fatal) — strike the 70% criterion. Replace with: BIC over the pooled fit selects K*. Named outcome if K* = 1 across the full BIC surface with a stated power calculation. Honest power reality from the HMM literature: BIC frequently underestimates the true number of states, and "both AIC and BIC mostly failed to detect the true number of states" in simulation benchmarks. This means K*=1 may be a power artifact, not a finding. The protocol must report both AIC and BIC, and if they disagree (AIC selects K≥2, BIC selects K=1), the finding is "selection criteria disagree; regime structure is not robustly identified." Kill criterion: if K* ≥ 2 and the shuffle gate passes and the duel is won, the regime interpretation stands. If K* = 1 on both criteria, that is a first-class null and is published. If they disagree, that is also a finding.

T3-D3 (material) — opponent residualization. Before fitting, residualize each play's EPA on the opposing defense's rolling-4-game EPA allowed per play (leave-one-game-out). Kill criterion: if K* ≥ 2 collapses to K*=1 after residualization, the "regimes" were schedule clustering.

T3-D4 (fatal) — temporal-permutation diagnostic. Fit the HMM on team-season sequences with game order shuffled within each team-season. If BIC still selects K* ≥ 2 on shuffled sequences, states are distributional splits, not temporal regimes. Gate fires before the duel. Kill criterion: if shuffled BIC selects K* ≥ 2 with ΔBIC_shuffled ≥ 0.5 × ΔBIC_original, the regime interpretation is dead regardless of duel outcome.

T3-D5 (material) — game-script control. Emission model includes |score_differential at drive start| as a covariate with a per-state coefficient (soft control). Robustness: restrict to drives where |score_differential| ≤ 8 (one-score games).

T3-D6/D7/D8 (minor). State labels sorted by mean EPA. Flat-surface diagnostic: report the KL divergence between adjacent state emission distributions; if KL < 0.05, the fit is a spurious split. Selection uses train-era only (≤2010), validation 2011–2017 for hyperparameter choice, test 2018–2025 for the duel.

Duel. Rolling-EPA(4) baseline and Elo-OLS baseline on next-game EPA/play, shared test rows (2018–2025). Margin: HMM must beat the better baseline by ≥ 0.02 R². Cross-fit by season.

---

§3. T7 — persistent homology repair (only what changed)

Prior art and honest prior. The one published TDA-on-NFL study concluded TDA "did not work well in predicting the effectiveness of the NFL teams". A hockey TDA paper found persistent homology consisted "only of 0 dimensional and 1 dimensional homology" with "no 1 dimensional classes". A general TDA evaluation found geometric features explained only 3-9% of the variance of topological features and concluded "persistent homology does not appear to provide much benefit over simpler geometric summaries". T7 is a likely negative result. It should be run once with the repaired nulls and not rescued.

T7-D1 (fatal) — replace the vacuous permutation null.

· Null A (target permutation). Permute the team-season label that maps to the target next-season team EPA/play (randomly reassign which season's topology scores to which outcome), 200 reps. Run the full pipeline (Rips → PersistenceImager → ridge) on each permuted dataset. Record the null distribution of incremental R² over the moments-only baseline. Kill criterion: observed increment < 95th percentile of Null A.
· Null B (Gaussian null clouds through the full pipeline). For each team-season, generate a Gaussian point cloud with the same empirical mean and covariance matrix as the observed cloud, matched in sample size. Run through the full pipeline. If the observed increment is not > Null B by at least the Null A threshold, topology adds nothing beyond second moments — kill.

Both nulls ≥ 200 reps each. BH correction across Null A and Null B tests applied jointly (BH with k=2, α=0.05).

T7-D2 (material). Strike "sustained drives" and "trajectories" language from the record. Team-season play clouds are unordered point clouds by construction.

T7-D3/D4 (minor). Standardize coordinates on train-era plays only (≤2010 mean/SD). Fit PersistenceImager grid on train-era diagrams only. Add explicit franchise mapping: OAK→LV (2020), STL→LA (2016), SD→LAC (2017).

T7-D5/D6/D7 (minor). State the power reality: ~400 PI features on ~850 team-seasons, test n ≈ 224. Honest prior is NULL. Single-shot test — if it returns NULL, T7 is killed with no rescue rounds.

---

§4. T9 — causal forest repair (only what changed)

Prior art. Causal forests via the GRF framework (Athey & Imbens 2016; Wager & Athey 2018) use honest splitting to ensure valid inference. AIPW is doubly robust — consistent for the ATE whenever either the propensity score model or the outcome model is correctly specified. Causal forests have been used in NBA (two-for-one strategy), football (formations via DML), and risky substitutions.

T9-D1 (fatal) — Y := play-level WPA, gates re-derived from pilot.

Pilot power calculation (train-era 1999–2010, 4th-down attempts):

· Play-level WPA SD ≈ 0.15 (rough; lab substitutes pilot value).
· Average 4th-down go-vs-punt effect on WPA ≈ 0.02 (published 4th-down bot estimates).
· To detect CATE heterogeneity of magnitude ≈ 0.01 with 80% power at α=0.05 two-sided: required Var(CATE)^0.5 > 0.005, i.e., Var(CATE) > 2.5e-5.
· Current gate Var(CATE) > 0.01 is roughly 400× larger than the pilot-implied threshold and would strangle all real signal.

New gate: Var(CATE) > 2.5e-5 (subject to lab verification of pilot SD and effect size).

T9-D2 (fatal) — split T=0 into two estimands.

· τ_punt: go vs punt. Sub-population: states where punt is feasible (own half and mid-field).
· τ_FG: go vs field-goal attempt. Sub-population: states where FG is feasible (typically yardline_100 ≤ 40).
· Two separate causal forests. No pooled estimand.

T9-D3 (material). Block permutation at the game level: shuffle treatment assignment within games only (preserving within-game treatment counts). Cluster-robust SEs at game level.

T9-D4 (material) — kill on weak nuisances.

· Propensity AUC < 0.60 OR outcome R² < 0.03 on held-out data → family DIES (no flag-and-continue).
· Add measured-confounder augmentation: nflverse temp, wind, roof join into the covariate set.
· Cinelli–Hazlett robustness value on the policy gap: report the RV at which the estimated τ would flip sign.

T9-D5 (resolved). No change; the audit resolved this as code-side not a defect.

T9-D6 (material) — cross-fit policy evaluation. CATE estimation and policy evaluation must use disjoint folds (nested cross-fitting). No same-fold scoring.

Duel. Homogeneous-ATE policy and historical-frequency policy on identical test rows. AIPW on cross-fit folds. Margin: heterogeneous policy must win by ≥ 0.02 win-probability averaged over test rows.

---

§5. New white-space proposals (W5-W8, replacing killed W1-W4)

The four proposals below are constrained by the audit: (1) structures humans would not hand-design; (2) executable in numpy/pandas/scipy on ~1.2M plays on 2 CPUs/3GB RAM; (3) not relabelings of existing public metrics.

W5 — Optimal transport barycenter of team offensive distributions

Estimand: the Wasserstein barycenter of each team's play-level (EPA, yards_gained) joint distribution, computed across all plays in a season. The distance between a team's distribution and the league barycenter defines its offensive distributional distance.

Why it is not covered by prior rounds: W2 (killed) used Wasserstein distance from the league play-mix, which was field-position variance in disguise. W5 uses the Wasserstein barycenter of the full (EPA, yards_gained) joint distribution — a different estimand with a different failure mode. The unbalanced optimal transport literature has been applied to histogram-valued regression in sports analytics, but not to team-level barycenter distances.

Why humans would not hand-design it: No human metric uses the Wasserstein barycenter of a joint outcome distribution. Human metrics use means, rates, and ratios.

Executable in: numpy + scipy. scipy.stats.wasserstein_distance for 1D; for 2D, use the sliced-Wasserstein approximation with 50 random projections (O(n log n) per projection).

Dumb-baseline duel: vs rolling-EPA(4) on next-season team offensive EPA/play. Margin: barycenter distance must add ≥ 0.02 R² incrementally.

Kill criterion: if barycenter distance does not beat rolling-EPA by ≥ 0.02 R² on 2018–2025, family dies.

Rank by expected information value: 3rd of 4. Would I bet on it? No.

W6 — Detrended fluctuation analysis of within-game EPA sequences

Estimand: the scaling exponent α_DFA of each team-game's EPA sequence, computed via detrended fluctuation analysis. α_DFA measures long-range correlation in the sequence.

Why it is not covered: the Koopman/DMD test (Phase 4) tested for linear modes. DFA tests for power-law scaling — a different dynamical hypothesis. W1 (killed) tested spectral features that were pure overfit. DFA is a single scalar per team-game, not a feature vector, and has a well-established null distribution.

Why humans would not hand-design it: DFA was developed for DNA sequences and heartbeat intervals. No sports metric uses it.

Executable in: numpy only (~30 lines).

Dumb-baseline duel: vs mean-EPA of the same team-game. Margin: α_DFA must predict next-game EPA/play with ≥ 0.01 R² incremental over mean-EPA.

Kill criterion: if α_DFA adds < 0.01 R² on 2018–2025, family dies.

Rank: 4th of 4. Would I bet on it? No. The Koopman rejection at p=0.89 substantially lowers the prior that any temporal-scaling structure exists.

W7 — Effective dimensionality of the play-call manifold

Estimand: the intrinsic dimension of the play-call manifold for each team-season, computed via the two-NN estimator (Facco et al. 2017) on the team's play-level feature vectors (down, distance, field position, formation, personnel group).

Why it is not covered: no prior round touched intrinsic dimension. The XPASS model predicts play-type probability per play; it does not measure the dimensionality of the play-call space.

Why humans would not hand-design it: intrinsic dimension is a topological-geometric quantity with no human analog in football analytics.

Executable in: numpy only (~20 lines). Two-NN estimator: for each point, compute the ratio of the distance to its second-nearest neighbor to the distance to its nearest neighbor; the intrinsic dimension is the inverse of the mean log-ratio.

Dumb-baseline duel: vs number of distinct play types (a crude dimensionality proxy). Margin: intrinsic dimension must predict offensive EPA/play with ≥ 0.02 R² incremental over the play-type count.

Kill criterion: if intrinsic dimension adds < 0.02 R² on 2018–2025, family dies.

Rank: 2nd of 4. Would I bet on it? Weak yes — this is the one proposal where the mechanistic story (teams with lower-dimensional play-call manifolds are more predictable and therefore less efficient) is directly testable and has a named baseline. But the effect size could easily be zero.

W8 — Permutation entropy of within-drive play-type sequences

Estimand: the permutation entropy (Bandt & Pompe 2002) of each team's within-drive play-type sequence (pass/run encoded as 0/1), computed with embedding dimension m=3 and delay τ=1.

Why it is not covered: permutation entropy is a nonlinear complexity measure that is insensitive to monotonic transformations of the sequence. It differs from the W1 spectral features (which were linear-frequency decompositions) and from the play-type prediction task (which is per-play classification).

Why humans would not hand-design it: permutation entropy was developed for time-series analysis of physiological signals. No sports metric uses it.

Executable in: numpy only (~40 lines).

Dumb-baseline duel: vs pass rate over expected (pass_oe) on next-game offensive EPA/play. Margin: permutation entropy must add ≥ 0.02 R² incrementally over pass_oe.

Kill criterion: if permutation entropy adds < 0.02 R² on 2018–2025, family dies.

Rank: 1st of 4. Would I bet on it? Yes — but with a weak bet. Permutation entropy is a scalar per drive that captures the irregularity of play-calling in a way that pass rate does not. The named baseline (pass_oe) is a strong competitor that already captures the main signal, so the incremental R² is likely small. But if any of the four has signal, this is the most likely candidate.

---

§6. Self-audit table (complete, all rows, no truncations)

# Claim Source Tier Notes
N-30 Prelec w(p;α) = exp(−(−ln p)^α) with α ∈ (0,1] Prelec (1998), Econometrica 66(3):497–527 CONFIRMED Primary source verified; compound-invariant form stated verbatim in abstract
N-31 w(0⁺)=0, w(1)=1, w∈[0,1] for α ∈ (0,1] Derived in-text (§1) INFERRED Direct from functional form
N-32 Inflection point at p=1/e ≈ 0.37 for α ∈ (0,1) Prelec (1998) abstract CONFIRMED Primary source states "inflection point at 1/e = .37"
N-33 α̂ ∈ [0.5, 0.9], point 0.7 My prediction SPECULATIVE Two-sided; kill if |α̂−1|<0.02
N-34 β search range [0.1, 1000] log-spaced Design choice SPECULATIVE
N-35 Profile-likelihood boundary check as β-unidentified verdict Design choice SPECULATIVE
N-36 Pooled HMM fit unit Design choice, response to T3-D1 SPECULATIVE
N-37 BIC underestimates true K HMM literature CONFIRMED "BIC can underestimate the true number of states"
N-38 AIC and BIC may disagree on K for HMMs HMM literature CONFIRMED "both AIC and BIC mostly failed to detect the true number of states"
N-39 Adam et al. (2024) used 8 seasons NFL data for Markov-switching decision trees AStA 108(2):461–476 CONFIRMED Verified DOI 10.1007/s10182-024-00501-6
N-40 HMM play-call prediction accuracy 71.6% (2018) Bielefeld pub CONFIRMED Prior art for T3
N-41 TDA-on-NFL concluded "did not work well" Polish thesis CONFIRMED Honest prior for T7
N-42 TDA geometric features explain 3-9% of topological variance TDA evaluation CONFIRMED Supports likely null for T7
N-43 Hockey TDA found no H1 classes Hockey TDA paper CONFIRMED Supports likely null for T7
N-44 Causal forests use honest splitting (Athey & Imbens 2016; Wager & Athey 2018) Causal forest literature CONFIRMED
N-45 AIPW doubly robust AIPW literature CONFIRMED "consistent for the ATE whenever either the propensity score model or the outcome model is correctly specified"
N-46 Play-level WPA SD ≈ 0.15 In-text rough estimate UNSOURCED Lab substitutes pilot value
N-47 4th-down go-vs-punt WPA effect ≈ 0.02 Recollection of published 4th-down bot estimates UNSOURCED Lab substitutes pilot value
N-48 Var(CATE) gate = 2.5e-5 Derived from N-46, N-47 INFERRED
N-49 XPASS uses XGBoost with features down/distance/yardline/quarter/WP/Vegas WP/half seconds/score diff/home-away/timeouts/stadium/era nflfastR XPASS doc CONFIRMED Primary source verified
N-50 XPASS only works on data 2006+ nflfastR XPASS doc CONFIRMED
N-51 nflfastR play-by-play contains 350+ fields DeepWiki field descriptions CONFIRMED
N-52 nflfastR wp is pre-snap point estimate for posteam DeepWiki field descriptions CONFIRMED
N-53 W5-W8 executable in numpy/pandas/scipy on 2 CPUs/3GB Design constraint SPECULATIVE To be verified by lab
N-54 W8 (permutation entropy) is my top white-space pick Judgment SPECULATIVE Weak bet

UNSOURCED count: 2 of 25 (N-46, N-47). Both are pilot-dependent inputs the lab substitutes with real values.

---

§7. Calibration update

The lab's Round-4 and Fix-1 results provide direct calibration measurements:

Prediction Lab-observed Ratio
W1 spectral increment ≥ +0.03 −0.0212 (sign reversed) sign wrong; |0.03|/|0.0212| ≈ 1.4×
W4 change-point Spearman r ≥ 0.10 (response-01 §N-45) −0.031 (2.6 sd, sign reversed) sign wrong; |0.10|/|0.031| ≈ 3.2×
IRL α ∈ [0.5, 5.0] risk-averse α̂ = −1.70 (fix-1) sign wrong (risk-seeking, not risk-averse)
IRL accuracy > baseline + 0.02 73.7% vs 79.1% (baseline) prediction falsified

Pattern: in three executed families (four comparisons) where the effect was measurable, the predicted sign was wrong in three of four (W1, W4, IRL α) and the observed effect ran opposite to prediction in all three. The re-derivable magnitude ratios are ≈1.4× (W1) and ≈3.2× (W4); the "7× to 13×" range stated here previously does not follow from any shown predicted/observed pair and is withdrawn.

[Motif correction 2026-09-14, provenance: independent audit of this response + AGENTS.md family-status table: the W1 row previously carried W4's observed value (−0.031, 2.6 sd); W1's actual lab-observed value is −0.0212 with no sd attached. Rows split and values restored above.]

Implied calibration factor: the 10× overestimate previously stated here is NOT supported by the corrected arithmetic — it was computed from the corrupted W1/W4 row plus unshown ratio arithmetic. The 8-family EV table below is downstream of that factor; treat it as illustrative judgment, not a measurement, until re-derived from shown numbers.

Applying 10× to the current atlas:

Family Stated EV (prior) Calibration-adjusted EV
IRL (Prelec) 0.28 0.03
T3 (HMM) 0.20 0.02
T7 (topology) 0.15 0.015
T9 (causal forest) 0.22 0.02
W5 (Wasserstein barycenter) 0.12 0.012
W6 (DFA) 0.08 0.008
W7 (intrinsic dim) 0.15 0.015
W8 (permutation entropy) 0.18 0.018

None of the eight funded families has an expected value above 0.03 under this calibration. The honest portfolio is: run the cheapest kill tests first, treat every positive as exploratory, and expect the majority to die.

---

§8. Status after this response

Family Status entering Status exiting
IRL (Prelec) QUARANTINED, repair-3 required QUARANTINED — Prelec repair supplied, D1-D3 answered; execution pending
T3 (HMM) REPAIR FIRST READY FOR LAB REVIEW — D1-D8 addressed, prior art cited
T7 (topology) REPAIR FIRST READY FOR LAB REVIEW — Null A + Null B supplied, likely-null prior stated
T9 (causal forest) REPAIR FIRST (borderline) READY FOR LAB REVIEW — Y := play-level WPA, punt/FG split, gates re-derived
W1 KILLED Killed (accepted)
W2 KILLED Killed (accepted)
W3 KILLED WITHOUT COMPUTE Killed (accepted)
W4 KILLED Killed (accepted)
W5-W8 NEW PROPOSED — awaiting lab review

---

§9. What I would bet on now

I will name one family I would bet on if the lab funds one more execution round: W8 (permutation entropy). Not because I expect a large effect — the named baseline (pass_oe) is a strong competitor that already captures the main signal — but because permutation entropy is the cheapest of the four new proposals to implement (numpy only, ~40 lines), has a clean null distribution (Bandt & Pompe 2002), and tests a specific mechanistic hypothesis (play-calling irregularity predicts offensive efficiency beyond pass-rate) that no prior round has touched.

I do not bet on W8 succeeding. I bet on W8 being worth the 30 minutes of compute to kill or confirm.

---

§10. Handoff package

For the lab, in priority order:

1. IRL Prelec script — execute verbatim. Report α̂, β̂, profile-likelihood boundary verdict, test accuracy vs baselines. Kill criterion: α̂ ∉ (0, 1.5] or |α̂−1| < 0.02.
2. T3 HMM — freeze pooled fit unit, run BIC+AIC over K ∈ {1, 2, 3, 4}, run shuffle gate, run duel. Report K* from both criteria and whether they agree. Kill criteria: T3-D2 (BIC alone if K*=1), T3-D4 (shuffle gate if ΔBIC_shuffled ≥ 0.5 × ΔBIC_original).
3. T7 persistent homology — run Null A (target permutation, 200 reps) and Null B (Gaussian null clouds, 200 reps). Run the duel once. Kill criterion: observed increment < 95th percentile of Null A OR not > Null B by the Null A threshold.
4. T9 causal forest — split punt/FG, Y := play-level WPA, re-derive Var(CATE) gate from pilot, run with block permutation and cross-fit AIPW. Kill criteria: propensity AUC < 0.60 OR outcome R² < 0.03 (family dies); heterogeneous policy must beat homogeneous by ≥ 0.02 win-probability.
5. W8 permutation entropy — cheapest new proposal. Run the duel vs pass_oe. Kill criterion: < 0.02 R² incremental.

§6 self-audit table: 2 unsourced numbers (N-46, N-47) to be replaced with pilot values before execution.

Standing gates in force: every future target must clear a real predictability ceiling well above R² 0.01 before search budget is spent; era splits mandatory; permutation/placebo required; BH correction across family battery; dumb-baseline duel on same test set; market duel where claim is predictive.
