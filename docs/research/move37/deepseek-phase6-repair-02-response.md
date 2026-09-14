# PROJECT MOVE-37 — SEND-BACK 03 REPAIR

Galaxy Sports Edge | Theorist Response

Date: 2026-09-14 | Run ID: MOVE-37-REPAIR-02

---

§0. Acknowledgment of the audit and its verdicts

The audit is correct on every finding. W1, W2, W4 executed and killed on my own kill lines; W3 killed without compute; T3, T7, T9 repaired as requested below. I do not dispute any kill.

Before the repairs, one honest accounting that shapes everything below: W1 was my "I would bet on this" pick and it died with the sign reversed. W4 died with its story's sign reversed on 2.6-sd data support. That is direct evidence that my mechanistic stories about football have zero out-of-sample predictive value, and my theoretical confidence is not calibrated. I have adjusted how I present the IRL and T-family repairs accordingly — the repairs are conditional and the kill criteria are tighter, not looser.

---

§1. IRL — answer D1, D2, D3

D2 first (the fatality the audit correctly identified)

α̂ = −1.70 is not evidence of risk-seeking coaches. It is evidence that CARA over WP is a category error.

The derivation I should have done before shipping the family:

· A coach choosing between a 4th-down conversion attempt and a punt faces a binary terminal outcome for the play (win or loss of the game, realized at the end of the game). The interim quantity wp is not wealth — it is a probability of winning.
· Applying a concave utility function to a probability is double-counting risk aversion. If the coach's utility is over the terminal win/loss (binary), any increasing U with U(0)=0, U(1)=1 is identical up to affine transformation, so risk aversion cannot manifest over binary lotteries at all.
· The only way risk aversion enters is if the coach cares about something non-binary: e.g., career outcome, final score margin, or season win total. None of those are in the model.
· Consequently the estimator is not recovering a "risk-aversion parameter." It is recovering a decision weight on the two branches — the degree to which the coach over- or under-weights the conversion outcome relative to the failure outcome, given their beliefs. This weight can be < or > 1 for reasons unrelated to risk preference.

Repair — replace CARA with a Prelec probability-weighting family.

The estimand becomes: the coach's probability weighting function w(p) over the conversion probability p, entering expected utility as:

```
E[U | go, s] = w(p_conv(s)) · WP_go_conv(s)
             + (1 − w(p_conv(s))) · WP_go_fail(s)
```

with the Prelec (1998) weighting function:

```
w(p; γ) = exp(−(−ln p)^γ),    γ ∈ (0, 2]
```

Properties (by construction):

Property Value Note
Domain p ∈ (0, 1] p=0 handled as limit w(0⁺)=0
Boundary w(1) 1 Natural normalization
Boundary w(0⁺) 0
Monotone w'(p) > 0 for γ ∈ (0,2]
γ = 1 w(p) = p (linear, risk-neutral in probability space)
γ < 1 w(p) > p for small p (overweights small probabilities, i.e., aggressive)
γ > 1 w(p) < p for small p (underweights, conservative)
Boundedness w(p) ∈ [0,1] for all p ∈ (0,1], γ ∈ (0,2] No undefined values

The Prelec family is the canonical behavioral-economics parameterization for exactly this problem (Kahneman & Tversky's original formulation, refined by Prelec 1998). It has been used for fourth-down-style binary decision analyses in other domains. I have not independently re-verified the Prelec derivation this round; I am asserting the functional form from memory and the audit should treat the citation as PROVISIONAL until a document check (see §7 self-audit).

This repair has the properties the audit required:

· Normalization: w(1)=1, w(0⁺)=0. No separate normalization needed.
· Finiteness: w(p;γ) ∈ [0,1] for all γ in the pre-registered range. Likelihood finite everywhere.
· Interpretation: γ<1 is a standard behavioral finding (overweighting of small probabilities), so a γ̂ < 1 result has a substantive interpretation that isn't "risk-seeking coaches" — it's "coaches overweight the conversion branch relative to the WP-neutral weight," which is a claim about behavior, not risk preferences.
· α̂ < 0 disappears because the parameter space is now (γ, β) with γ>0.

New pre-registered prediction: γ̂ ∈ [0.6, 1.2], point estimate 0.85. Reasoning: NFL coaches are known (via the 4th-down bot literature) to underweight the go-it branch on 4th-and-short — implying γ̂ > 1 in the current parameterization would be conservative. If instead the "aggression literature" is right that coaches are too conservative overall, the weighting would show γ̂ < 1. I'm going to say γ̂ ∈ [0.6, 1.2] with a fat prior toward the behavioral finding of γ ≈ 0.85, and explicitly note this is a two-sided prediction. Kill criterion: γ̂ ∉ (0, 2] or γ̂ within 0.02 of 1.0 (unidentifiable from linear weighting).

D1 — unbounded β search

Replace the two-stage grid with a log-spaced three-stage search:

· Stage 1: β ∈ 10^[−1, 3] log-spaced at 25 points (β ∈ [0.1, 1000]).
· Stage 2: log-spaced fine grid within a decade of the stage-1 winner, 21 points.
· Stage 3: profile-likelihood check. Fix γ at γ̂ and sweep β on a log grid; if the profile NLL is monotonically decreasing to the edge, β̂ is unidentified at the boundary — this is the reported finding, not a point estimate.

The estimator no longer returns a boundary value; the boundary is a verdict ("β unidentified"). The Prelec parameterization is not linear in β, so the rationality parameter has a well-defined interior optimum when the model is identified.

D3 — normalization

The Prelec family satisfies U(0⁺)=0, U(1)=1 by construction. No separate normalization is required. The β parameter multiplies the log-likelihood softmax temperature; it is not scale-dependent on γ.

IRL lane status after this repair

Still quarantined until the lab executes the Prelec-family code below and returns results. I do not claim identification on the basis of the repair. I claim the repair is mathematically coherent and its kill criteria are stated. Whether it survives verbatim execution is for the lab.

IRL Prelec-family code

```python
"""
PROJECT MOVE-37 — IRL Prelec probability-weighting repair.
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

# --- WP model (counterfactuals) ---
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

# --- Prelec weighting ---
def prelec_w(p, gamma):
    """w(p;gamma) = exp(-(-ln p)^gamma). Finite, in [0,1] for p in (0,1], gamma in (0,2]."""
    p = np.clip(p, 1e-9, 1 - 1e-9)
    return np.exp(-((-np.log(p)) ** gamma))

# --- Expected utilities under Prelec ---
def expected_utilities(states, gamma):
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
    w_conv = prelec_w(p_conv, gamma)
    w_fg = prelec_w(fg, gamma)

    # Possession-preserving branches: WP from possessing team's perspective
    wp_go_conv = predict_wp(sd, gsr, np.maximum(yl - 5, 1))
    wp_kick_make = predict_wp(sd + 3, gsr, 75)

    # Possession-flipping branches: opponent's WP is (1 - our_wp_from_same_state)
    # We model our_wp_from_opponent_perspective = predict_wp(-sd, gsr, yl_opp)
    # then our_wp = 1 - that.
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
    gamma, beta = params
    if not (0 < gamma <= 2) or beta <= 0:
        return 1e10
    EU = expected_utilities(states, gamma)
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
for g in np.linspace(0.05, 2.0, 21):          # gamma on (0,2]
    for b in np.logspace(-1, 3, 25):          # beta in [0.1, 1000] log-spaced
        v = nll((g, b), states_tr, obs_tr)
        if v < best[1]:
            best = ((g, b), v)
g0, b0 = best[0]

# Stage 2: refine gamma linearly around g0, beta log-spaced within a decade
g_lo, g_hi = max(0.01, g0 - 0.2), min(2.0, g0 + 0.2)
for g in np.linspace(g_lo, g_hi, 21):
    for b in np.logspace(np.log10(max(b0 / 10, 0.1)), np.log10(b0 * 10), 21):
        v = nll((g, b), states_tr, obs_tr)
        if v < best[1]:
            best = ((g, b), v)
g_hat, b_hat = best[0]

# --- Profile-likelihood boundary check (D1) ---
profile_b = []
for b in np.logspace(-1, 3, 41):
    profile_b.append((b, nll((g_hat, b), states_tr, obs_tr)))
prof = np.array(profile_b)
peak_idx = prof[:, 1].argmin()
beta_unidentified = (peak_idx == 0) or (peak_idx == len(prof) - 1)

# --- Evaluation ---
states_te = fd_te[['ydstogo', 'yardline_100', 'score_differential',
                    'game_seconds_remaining', 'fg_prob']].reset_index(drop=True)
obs_te = fd_te['action'].map(AIX).values

EU_te = expected_utilities(states_te, g_hat)
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
    "gamma_hat": float(g_hat),
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

T3-D1 (fatal) — freeze one fit unit. Pooled fit across all team-seasons. Every team-season contributes its 16 games as a separate Markov chain sharing the same transition matrix and emission parameters, with per-team emission mean offsets on EPA/play to allow team-level differences in average quality. Decoding (state assignment) is done per team-season. Selection (BIC) is computed on the pooled likelihood. This gives ~16 × 32 × N_seasons observations per state (thousands per state at K=2–3), avoiding the per-team small-n problem.

T3-D2 (fatal) — strike the 70% criterion. Replace with: BIC over the pooled fit selects K*. Named outcome if K* = 1 across the full BIC surface with a stated power calculation. Power calculation: at pooled n ≈ 32 × 22 × 16 ≈ 11,000 team-games, a two-state model with ΔBIC > 10 requires a per-state emission difference of roughly ΔEPA/play ≈ 0.05 at the pooled level (rough calculation assuming Gaussian emissions with pooled SD ≈ 0.4). If the true effect is smaller than 0.05, K*=1 is the reported finding — not a failure. Kill criterion: if K* ≥ 2 and the shuffle gate (below) passes and the duel is won, the regime interpretation stands. If K* = 1, that is a first-class null and is published.

T3-D3 (material) — opponent residualization. Before fitting, residualize each play's EPA on the opposing defense's rolling-4-game EPA allowed per play (leave-one-game-out). The residualized EPA is the emission. Kill criterion: if K* ≥ 2 collapses to K*=1 after residualization, the "regimes" were schedule clustering.

T3-D4 (fatal) — temporal-permutation diagnostic. Fit the HMM on team-season sequences with game order shuffled within each team-season. If BIC still selects K* ≥ 2 on shuffled sequences, states are distributional splits, not temporal regimes. Gate fires before the duel. Kill criterion: if shuffled BIC selects K* ≥ 2 with ΔBIC_shuffled ≥ 0.5 × ΔBIC_original, the regime interpretation is dead regardless of duel outcome.

T3-D5 (material) — game-script control. Emission model includes |score_differential at drive start| as a covariate with a per-state coefficient (soft control). Alternative harder version: restrict to drives where |score_differential| ≤ 8 (one-score games). Both are specified; the lab runs the soft control as primary, the restriction as robustness.

T3-D6/D7/D8 (minor). State labels sorted by mean EPA (state 1 = highest EPA). Flat-surface diagnostic: report the KL divergence between adjacent state emission distributions; if KL < 0.05, the fit is a spurious split. Selection uses train-era only (≤2010), validation 2011–2017 for hyperparameter (e.g., K choice if BIC is flat), test 2018–2025 for the duel.

Duel. Rolling-EPA(4) baseline and Elo-OLS baseline on next-game EPA/play, shared test rows (2018–2025). Margin: HMM must beat the better baseline by ≥ 0.02 R². Cross-fit or K-fold by season.

---

§3. T7 — persistent homology repair (only what changed)

T7-D1 (fatal) — replace the vacuous permutation null.

· Null A (target permutation). Permute the team-season label that maps to the target next-season team EPA/play (i.e., randomly reassign which season's topology scores to which outcome), 200 reps. Run the full pipeline (Rips → PersistenceImager → ridge) on each permuted dataset. Record the null distribution of incremental R² over the moments-only baseline (mean, covariance, second moments). Kill criterion: observed increment < 95th percentile of Null A.
· Null B (Gaussian null clouds through the full pipeline). For each team-season, generate a Gaussian point cloud with the same empirical mean and covariance matrix as the observed cloud, matched in sample size. Run through the full pipeline (Rips → PI → ridge). If the observed increment is not > Null B by at least the Null A threshold, topology adds nothing beyond second moments — kill. Null B is the true test of "topology beyond moments."

Both nulls ≥ 200 reps each. BH correction across Null A and Null B tests applied jointly (BH with k=2).

T7-D2 (material). Strike "sustained drives" and "trajectories" language from the record. Team-season play clouds are unordered point clouds by construction. If the lab wants to test drives-as-curves, that is a separate protocol (T7-alt) requiring a different filtration (e.g., time-ordered Rips or a path-space construction). Not this round.

T7-D3/D4 (minor). Standardize coordinates on train-era plays only (≤2010 mean/SD). Fit PersistenceImager grid on train-era diagrams only. Add explicit franchise mapping: OAK→LV (2020), STL→LA (2016), SD→LAC (2017), WAS→WAS (no change), and any other relocations in 1999–2025 (TEN from HOU 1999 is pre-snapshot for 1999, verify).

T7-D5/D6/D7 (minor). State the power reality: ~400 PI features on ~850 team-seasons, test n ≈ 224. Honest prior is NULL. This is a single-shot test — if it returns NULL, T7 is killed with no rescue rounds.

---

§4. T9 — causal forest repair (only what changed)

T9-D1 (fatal) — Y := play-level WPA, gates re-derived from pilot.

Pilot power calculation (train-era 1999–2010, 4th-down attempts):

· Play-level WPA SD ≈ 0.15 (rough; the lab should compute the exact pilot value and re-derive).
· Average 4th-down go-vs-punt effect on WPA ≈ 0.02 (published 4th-down bot estimates).
· To detect CATE heterogeneity of magnitude ≈ 0.01 with 80% power at α=0.05 in a two-sided test: required Var(CATE)^0.5 > 0.005, i.e., Var(CATE) > 2.5e-5.
· Current gate Var(CATE) > 0.01 is roughly 400× larger than the pilot-implied threshold and would strangle all real signal.

New gate: Var(CATE) > 2.5e-5 (subject to lab verification of the pilot SD and effect size; the lab substitutes real pilot numbers if they differ).

T9-D2 (fatal) — split T=0 into two estimands.

· τ_punt: go vs punt. Sub-population: states where punt is feasible (own half and mid-field).
· τ_FG: go vs field-goal attempt. Sub-population: states where FG is feasible (typically yardline_100 ≤ 40).
· Two separate causal forests. No pooled estimand.

T9-D3 (material). Block permutation at the game level: shuffle treatment assignment within games only (preserving within-game treatment counts). Cluster-robust SEs at game level. Report both naive SEs and cluster-robust SEs; the latter is the reported number.

T9-D4 (material) — kill on weak nuisances.

· Propensity AUC < 0.60 OR outcome R² < 0.03 on held-out data → family DIES (no flag-and-continue). This addresses the audit's concern that estimation noise can clear the variance gate disguised as heterogeneity.
· Add measured-confounder augmentation: nflverse temp, wind, roof join into the covariate set.
· Cinelli–Hazlett robustness value on the policy gap: report the RV at which the estimated τ would flip sign.

T9-D5 (resolved). No change; the audit resolved this as code-side not a defect.

T9-D6 (material) — cross-fit policy evaluation. CATE estimation and policy evaluation must use disjoint folds (or nested cross-fitting). No same-fold scoring.

Duel. Homogeneous-ATE policy and historical-frequency policy on identical test rows. AIPW on cross-fit folds. Margin: heterogeneous policy must win by ≥ 0.02 win-probability averaged over test rows.

---

§5. W3 — acknowledgment

Killed without compute. Accepted.

The d_FR statistic survives as a descriptive side-statistic only. I will not cite it as a discovery family. Re-admission requires a genuinely new predictive estimand with a dumb-baseline duel — the current formulation has no decision-relevant estimand, so it cannot be admitted under §4.6.

---

§6. W1, W2, W4 — acknowledgment

W1, W2, W4 executed and killed on my own kill lines. Accepted without rescue.

The W1 result is the most informative for my prior calibration: my top-ranked white-space proposal was killed with the sign reversed on test. The 11-feature spectral rhythm signature was pure overfit (train +0.0317 → test −0.0212) with a shuffle p-value of 0.388–0.478. The "coach skill at coordinated sequencing" story has zero out-of-sample support, and the fact that I assigned it the highest EV of the four proposals is a direct measurement of my storytelling bias.

W4's 2.6-sd negative result with sign reversed is the second such case. Combined with the IRL α̂ = −1.70 (fix-1) and the earlier GLI-0.1 30× miscalibration, my priors have been wrong on the sign in two of the three executed families and wrong on the magnitude by 7–30× in the third. I have updated §8 below accordingly.

---

§7. Self-audit table for new numbers

# Claim Source Tier Notes
N-30 Prelec w(p;γ) = exp(−(−ln p)^γ) with γ ∈ (0,2] Reconstructed from memory of Prelec (1998), Econometrica 66(3):497–527 UNSOURCED Not re-verified this round. Lab should document-check before citing.
N-31 w(0⁺)=0, w(1)=1, w∈[0,1] for γ ∈ (0,2] Derived in-text (§1) INFERRED Direct from functional form
N-32 γ̂ ∈ [0.6, 1.2], point 0.85 My prediction SPECULATIVE Two-sided; kill if |γ̂−1|<0.02
N-33 β search range [0.1, 1000] log-spaced Design choice SPECULATIVE
N-34 Profile-likelihood boundary check as β-unidentified verdict Design choice SPECULATIVE
N-35 Pooled HMM fit unit (freeze) Design choice, response to T3-D1 SPECULATIVE
N-36 Power calc: pooled n ≈ 11,000, ΔBIC > 10 requires ΔEPA/play ≈ 0.05 In-text rough derivation, assumes Gaussian emissions, pooled SD ≈ 0.4 UNSOURCED Rough; lab should recompute with real data
N-37 KL < 0.05 = flat surface flag for HMM Design choice SPECULATIVE
N-38 HMM duel margin ≥ 0.02 R² vs rolling-EPA(4) or Elo-OLS Preserved from original protocol SPECULATIVE
N-39 Null A: 200 reps of target permutation Design choice, §3 SPECULATIVE
N-40 Null B: Gaussian null clouds matched in mean and covariance Design choice, §3 SPECULATIVE
N-41 T7 power reality: ~400 PI features, ~850 team-seasons, test n ≈ 224 In-text rough count UNSOURCED Lab should recompute exact
N-42 Play-level WPA SD ≈ 0.15 In-text rough estimate UNSOURCED Lab substitutes pilot value
N-43 4th-down go-vs-punt WPA effect ≈ 0.02 Recollection of published 4th-down bot estimates UNSOURCED Lab substitutes pilot value
N-44 Var(CATE) gate = 2.5e-5 (400× lower than original 0.01) Derived in-text from N-42, N-43 INFERRED Depends on unsourced N-42, N-43
N-45 Propensity AUC < 0.60 kills family Design choice, response to T9-D4 SPECULATIVE
N-46 Outcome R² < 0.03 kills family Design choice, response to T9-D4 SPECULATIVE
N-47 T9 duel margin ≥ 0.02 win-probability Preserved from original SPECULATIVE

UNSOURCED count for this round: 5 of 18 new numbers (N-30, N-36, N-41, N-42, N-43). These are flagged for the lab to substitute real pilot values before execution. The Prelec citation (N-30) is the highest-risk item — I should have verified it and did not.

---

§8. Prior calibration update

Post-fix-1 lab results have provided three more direct calibration measurements of my priors:

Prediction I made Lab-observed Ratio
W1 spectral increment ≥ +0.03 −0.0212 (test), sign reversed sign wrong
W2 Wasserstein r ≥ 0.15 0.0112 (test) 13× overestimate, sign-adjacent
W4 adaptive-coaching improves WPA −0.031 (2.6 sd, sign reversed) sign wrong
IRL α ∈ [0.5, 5.0] risk-averse α̂ = −1.70 (fix-1) risk-seeking (sign wrong)
IRL accuracy > baseline + 0.02 73.7% vs 79.1% (baseline) prediction falsified

Pattern: in the three executed families where the effect was measurable, my predicted sign was wrong in two (W1, W4) and my predicted magnitude was wrong in all three by 7× to 13×. The IRL α̂ < 0 was the fourth sign error.

Implied calibration factor for future EV claims: the median |predicted|/|observed| magnitude ratio across W1, W2, IRL is ≈ 10× overestimate. Applying this to the current atlas:

Family Stated EV Calibration-adjusted EV
T3 (HMM) 0.20 (prior) 0.02
T7 (topology) 0.15 (prior) 0.015
T9 (causal forest) 0.22 (prior) 0.02
IRL (Prelec repair) 0.28 (prior) 0.03

None of the four funded families has an expected value above 0.03 under this calibration. The honest portfolio is: run the cheapest kill tests first, treat every positive as exploratory, and expect the majority to die. That is the correct prior entering Phase-7.

I do not defend the earlier EV numbers. They were stated with confidence I had not earned.

---

§9. Status of the four families after this response

Family Status entering this response Status exiting
IRL QUARANTINED, repair-3 required QUARANTINED — Prelec repair supplied, D1/D2/D3 answered in kill-criterion format; execution pending
T3 (HMM) REPAIR FIRST READY FOR LAB REVIEW — D1–D8 addressed, one fit unit frozen, kill criteria in §1.5 format
T7 (topology) REPAIR FIRST READY FOR LAB REVIEW — Null A + Null B supplied, D2–D7 addressed
T9 (causal forest) REPAIR FIRST (borderline) READY FOR LAB REVIEW — Y := play-level WPA, punt/FG split, gates re-derived, kill nuisances
W1 KILLED Killed (accepted)
W2 KILLED Killed (accepted)
W3 KILLED WITHOUT COMPUTE Killed (accepted)
W4 KILLED Killed (accepted)

---

§10. What I would bet on now (given the calibration update)

I will name one family I would bet on if the lab funds one more execution round: T7's Null B. Not T7 itself — Null B. The Gaussian-null-clouds-through-the-full-pipeline test is the first time the program will have a clean measurement of whether topological features carry information beyond second moments on any sports dataset. Whether the answer is yes or no, the result is a permanent reference point for future topology-in-sports work. The other three families' returns depend on whether a real effect exists; Null B's return is guaranteed information.

I do not bet on T7 succeeding. I bet on Null B being worth running.

---

Handoff complete. Lab can execute the IRL Prelec script verbatim; T3, T7, T9 are supplied with repaired sections and kill criteria in the requested format. The §7 self-audit table lists 5 unsourced numbers that should be replaced with pilot values before execution.
