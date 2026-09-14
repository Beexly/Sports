"""
PROJECT MOVE-37 — ROUND 05 REPAIRED WP-1 (LAB EXECUTION COPY)
IRL coaching utility recovery with CARA utility on WP domain.
Python 3.11. Allowed imports ONLY: nflreadpy, scikit-learn, numpy, pandas.
NO scipy. Optimization via two-stage grid search.
Run cold: python move37_irl_cara.py
Outputs machine-readable JSON summary to stdout.

================================================================================
LAB FIXES vs. theorist verbatim (MOVE-37-REPAIR-01 §1.5) — documented, not silent
================================================================================
FIX 1 — wp_kick_miss sign error. Verbatim: 100 - yl + 8. The spot of the kick is
  ~8 yards BEHIND the line of scrimmage toward the kicking team's OWN goal.
  Coordinates: x = yards from kicking team's goal (0..100). LOS at x = 100 - yl.
  Kick spot at x = (100 - yl) - 8. Defense takes over attacking x = 0, so their
  yardline_100 = (100 - yl) - 8 = 100 - yl - 8. Verbatim had +8 (16-yard error,
  placing the defense 16 yards too close to the end zone they now attack).
  Corrected: np.clip(100 - yl - 8, 1, 99).

FIX 2 — wp_punt sign error. Verbatim: 100 - yl - 40. A punt travels ~40 net yards
  AWAY from the kicking team's goal, toward the opponent's end zone: ball moves
  from x = 100 - yl to x = 100 - yl + 40. Defense takes over attacking x = 0, so
  their yardline_100 = 100 - yl + 40. Verbatim had -40, which for yl > 60 yields
  NEGATIVE yardlines (e.g. yl=70 -> -10) fed into the WP model — invalid.
  Corrected with touchback handling: landing = 100 - yl + 40; if landing > 100
  the punt reaches the end zone -> touchback, defense at their own 25 ->
  yardline_100 = 75; else clip to [1, 99].

FIX 3 — empirical conversion gain. Protocol §1.2 says the ~5-yard gain on
  successful conversions is "to be verified on the training sample before the
  run"; the verbatim code hard-codes 5. The lab computes the empirical mean
  yards_gained on successful 4th-down conversions (train seasons) and uses it
  (falls back to 5.0 if uncomputable). Both values are printed.

FIX 4 — wrong sklearn estimator API. Verbatim: GradientBoostingRegressor(
  max_iter=150, max_depth=4, random_state=42). GradientBoostingRegressor has NO
  max_iter parameter (it uses n_estimators) — the verbatim call raises
  TypeError on every sklearn version. max_iter is the HistGradientBoosting-
  Regressor API, which is unambiguously what the protocol meant (150 boosting
  iterations). Corrected to HistGradientBoostingRegressor(max_iter=150,
  max_depth=4, random_state=42). Same intended model, correct API.

MEMORY NOTE — the sandbox SIGKills the full 300-column concat (~3.5 GB and
  climbing); pruning each season to the 15 used columns before concat keeps
  peak RAM ~1.5 GB with identical rows/values. No science change.

FIX 5 — scalar/array shape crash in expected_utilities. Verbatim:
  wp_kick_make = predict_wp(sd + 3, gsr, 75). predict_wp column_stacks its three
  arguments; the scalar 75 becomes size-1 against size-N sd/gsr -> ValueError
  on the first grid evaluation. Intent is unambiguous (post-made-FG kickoff,
  receiving team at their own 25 -> yardline_100 = 75 for every row).
  Corrected: predict_wp(sd + 3, gsr, np.full_like(sd, 75, dtype=float)).

MINOR — verbatim had `U_punt = U_punt = U(wp_punt, alpha)` (double assignment,
  harmless); cleaned to a single assignment. No behavioral change.

FIX 6 — LAB DIAGNOSTIC ONLY (orientation mechanical fix, per audit #2/#3).
  The audit found 4 of 5 utility branches score the OPPONENT's WP (never
  flipped to 1-wp) and the kick_make differential passes sd+3 instead of
  -(sd+3). This copy applies ONLY those two mechanical changes — same grid,
  same features, same split — to test whether orientation alone changes the
  estimation. Nothing else touched.
  harmless); cleaned to a single assignment. No behavioral change.

NOTE — the protocol also says net punt ~40 is "to be re-estimated from the
  training sample". nflreadpy exposes no direct net-punt column; re-estimation
  is left as a flagged follow-up. 40 is used as the stated empirical average.

NOTE — the WP model uses only (score_differential, game_seconds_remaining,
  yardline_100): no down/distance features. Counterfactuals such as "new
  1st-and-10" therefore get average-down WP, biasing all counterfactuals toward
  the mean down state. This is a modeling limitation, not a crash bug; the
  pre-registered criteria are the judge.
================================================================================
"""

import warnings
warnings.filterwarnings("ignore")
import json
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import log_loss
import os
import polars as pl
import nflreadpy as nfl
import gc

# ============================================================================
# 1. LOAD DATA (2014-2024)
# ============================================================================
# Memory optimization (lab-side, no science change): the raw pbp frames carry
# 300+ columns; the analysis uses 15. Prune per season BEFORE concat to keep
# peak RAM ~20x lower (the sandbox SIGKills the full-frame concat).
KEEP_COLS = ['game_id', 'play_id', 'season', 'down', 'ydstogo',
             'yardline_100', 'score_differential', 'game_seconds_remaining',
             'wp', 'fg_prob', 'play_type', 'posteam', 'defteam',
             'fourth_down_converted', 'yards_gained']
pbp = {}
# LAB FIX 7 (memory, no science change): seasons 2014-2023 are read from the
# frozen snapshot data_snapshot_20260913/pbp_{YYYY}.parquet (built 2026-09-13
# with nflreadpy itself, one season at a time). Verified 2026-09-14: snapshot
# parquet is BIT-IDENTICAL to nflreadpy.load_pbp output (full-frame
# polars .equals() True; 15-col pandas .equals() True, 2023 season).
# Only the 15 used columns are read from disk. 2024 (absent from the snapshot)
# falls back to nflreadpy, one season only. Identical rows/values; the
# orientation diagnostic (FIX 6) is untouched.
SNAP_DIR = os.path.expanduser("~/workspace/gse-discovery/data_snapshot_20260913")
for s in range(2014, 2025):
    pq = os.path.join(SNAP_DIR, f"pbp_{s}.parquet")
    if os.path.exists(pq):
        schema_cols = pl.scan_parquet(pq).collect_schema().names()
        cols = [c for c in KEEP_COLS if c in schema_cols]
        df_s = pl.read_parquet(pq, columns=cols).to_pandas()
    else:
        raw = nfl.load_pbp([s])
        if hasattr(raw, 'select') and hasattr(raw, 'columns'):
            cols = [c for c in KEEP_COLS if c in raw.columns]
            df_s = raw.select(cols).to_pandas()
        else:
            df_s = raw.to_pandas() if hasattr(raw, 'to_pandas') else pd.DataFrame(raw)
            cols = [c for c in KEEP_COLS if c in df_s.columns]
            df_s = df_s[cols]
        del raw
        gc.collect()
    pbp[s] = df_s
    del df_s
    gc.collect()
    print(f"  season {s}: {len(pbp[s])} plays", flush=True)
all_df = pd.concat([pbp[s] for s in range(2014, 2025)], ignore_index=True)
del pbp
gc.collect()
print(f"Loaded {len(all_df)} total plays (2014-2024)")

# ============================================================================
# 2. FEATURE / COLUMN VERIFICATION (per §3 standing rule)
# ============================================================================
REQUIRED = ['game_id', 'play_id', 'season', 'down', 'ydstogo',
            'yardline_100', 'score_differential', 'game_seconds_remaining',
            'wp', 'fg_prob', 'play_type', 'posteam', 'defteam']
missing = [c for c in REQUIRED if c not in all_df.columns]
assert not missing, f"Missing columns: {missing}"

# Value-range predictions (per §3 rule)
assert all_df['down'].dropna().between(1, 4).all(), "down out of range"
assert all_df['yardline_100'].dropna().between(1, 99).all(), "yardline_100 out of range"
assert all_df['game_seconds_remaining'].dropna().between(0, 3600).all(), "game_seconds out of range"
assert all_df['score_differential'].dropna().between(-60, 60).all(), "score diff out of range"
print("Column verification passed.")

# ============================================================================
# 3. FIT WP MODEL (for counterfactual states)
# ============================================================================
WP_FEATS = ['score_differential', 'game_seconds_remaining', 'yardline_100']
wp_train = all_df.dropna(subset=WP_FEATS + ['wp']).copy()
wp_train = wp_train[wp_train['season'] <= 2022]
wp_model = HistGradientBoostingRegressor(max_iter=150, max_depth=4, random_state=42)
wp_model.fit(wp_train[WP_FEATS].values, wp_train['wp'].values)
print(f"WP model fit on {len(wp_train)} plays (2014-2022)")

def predict_wp(sd, gsr, yl100):
    X = np.column_stack([np.asarray(sd), np.asarray(gsr), np.asarray(yl100)])
    return np.clip(wp_model.predict(X), 0.001, 0.999)

# ============================================================================
# 4. FIT CONVERSION MODEL (p_conv on 4th down)
# ============================================================================
CONV_FEATS = ['ydstogo', 'yardline_100']
conv_df = all_df[(all_df['down'] == 4) &
                 (all_df['play_type'].isin(['pass', 'run'])) &
                 all_df['fourth_down_converted'].notna()].copy()
conv_train = conv_df[conv_df['season'] <= 2022]
conv_model = LogisticRegression(max_iter=1000)
conv_model.fit(conv_train[CONV_FEATS].values, conv_train['fourth_down_converted'].values)
print(f"Conversion model fit on {len(conv_train)} fourth-down attempts")

# --- LAB FIX 3: empirical mean gain on successful 4th-down conversions (train) ---
try:
    succ = conv_train[(conv_train['fourth_down_converted'] == 1) &
                      conv_train['yards_gained'].notna()]
    emp_gain = float(succ['yards_gained'].mean())
    print(f"Empirical mean yards gained on successful 4th-down conversions "
          f"(train): {emp_gain:.2f} (n={len(succ)})")
    if not np.isfinite(emp_gain) or emp_gain <= 0:
        emp_gain = 5.0
        print("WARNING: empirical gain invalid, falling back to 5.0")
except Exception as e:
    emp_gain = 5.0
    print(f"WARNING: could not compute empirical gain ({e}), using 5.0")

# ============================================================================
# 5. BUILD FOURTH-DOWN DECISION DATASET
# ============================================================================
fd = all_df[(all_df['down'] == 4) &
            (all_df['play_type'].isin(['pass', 'run', 'punt', 'field_goal']))].copy()
fd = fd.dropna(subset=['ydstogo', 'yardline_100', 'score_differential',
                        'game_seconds_remaining', 'wp', 'fg_prob'])
fd = fd[(fd['ydstogo'] >= 1) & (fd['ydstogo'] <= 30)]
fd = fd[(fd['yardline_100'] >= 1) & (fd['yardline_100'] <= 99)]
fd = fd[(fd['score_differential'] >= -28) & (fd['score_differential'] <= 28)]
fd = fd[fd['game_seconds_remaining'] > 0]

def classify_action(pt):
    if pt == 'punt':
        return 'punt'
    if pt == 'field_goal':
        return 'kick'
    if pt in ('pass', 'run'):
        return 'go'
    return None

fd['action'] = fd['play_type'].apply(classify_action)
fd = fd.dropna(subset=['action'])
fd_train = fd[fd['season'] <= 2022].copy()
fd_test = fd[fd['season'].isin([2023, 2024])].copy()
print(f"Fourth-down decisions: train {len(fd_train)}, test {len(fd_test)}")
print("Train action mix:")
print(fd_train['action'].value_counts(normalize=True).round(4).to_dict())
print("Test action mix:")
print(fd_test['action'].value_counts(normalize=True).round(4).to_dict())

# ============================================================================
# 6. UTILITY FAMILY (CARA on WP domain, finite for all alpha)
# ============================================================================
def U(x, alpha):
    x = np.asarray(x, dtype=float)
    if abs(alpha) < 1e-8:
        return x
    return -np.exp(-alpha * x) / alpha

# ============================================================================
# 7. EXPECTED UTILITY FOR EACH ACTION
# ============================================================================
# LAB PERF (no science change): p_conv, p_fg and all five counterfactual WP
# values do not depend on (alpha, beta). The original code recomputed all six
# model predictions inside every one of the 513 grid evaluations. They are now
# computed ONCE per dataset (precompute_terms) and reused; the arithmetic that
# maps (terms, alpha, beta) -> NLL is untouched, so NLL at every grid point is
# bit-identical to the un-hoisted path. Same grid, same features, same split.
def precompute_terms(states):
    """(alpha,beta)-independent terms for a states DataFrame."""
    ytg = states['ydstogo'].values.astype(float)
    yl = states['yardline_100'].values.astype(float)
    sd = states['score_differential'].values.astype(float)
    gsr = states['game_seconds_remaining'].values.astype(float)

    p_conv = conv_model.predict_proba(np.column_stack([ytg, yl]))[:, 1]
    p_fg = states['fg_prob'].values.astype(float)

    # Counterfactual WP values (LAB FIX 1 & 2: corrected yardline geometry)
    wp_go_conv = predict_wp(sd, gsr, np.maximum(yl - emp_gain, 1))
    wp_go_fail = predict_wp(-sd, gsr, 100 - yl)
    wp_kick_make = predict_wp(-(sd + 3), gsr, np.full_like(sd, 75, dtype=float))
    # FIX 1: spot of kick is 8 yards BEHIND the LOS (toward kicking team's goal)
    wp_kick_miss = predict_wp(-sd, gsr, np.clip(100 - yl - 8, 1, 99))
    # FIX 2: punt travels 40 net yards AWAY from kicking team's goal; touchback -> 75
    punt_land = 100 - yl + 40
    punt_yl = np.where(punt_land > 100, 75, np.minimum(punt_land, 99))
    wp_punt = predict_wp(-sd, gsr, np.clip(punt_yl, 1, 99))
    # FIX 6 (orientation): opponent-possession WP -> kicking team's perspective.
    # predict_wp returns the POSSESSION team's WP; the decision-maker is K's
    # coach, so every opponent-possession branch enters utilities as 1 - wp.
    wp_go_fail = 1.0 - wp_go_fail
    wp_kick_make = 1.0 - wp_kick_make
    wp_kick_miss = 1.0 - wp_kick_miss
    wp_punt = 1.0 - wp_punt

    return dict(p_conv=p_conv, p_fg=p_fg, wp_go_conv=wp_go_conv,
                wp_go_fail=wp_go_fail, wp_kick_make=wp_kick_make,
                wp_kick_miss=wp_kick_miss, wp_punt=wp_punt)

def expected_utilities_from_terms(terms, alpha):
    """Expected utilities from precomputed terms. Arithmetic identical to the
    original per-evaluation path; returns (N, 3) [E_U_go, E_U_kick, E_U_punt]."""
    U_go_conv = U(terms['wp_go_conv'], alpha)
    U_go_fail = U(terms['wp_go_fail'], alpha)
    U_kick_make = U(terms['wp_kick_make'], alpha)
    U_kick_miss = U(terms['wp_kick_miss'], alpha)
    U_punt = U(terms['wp_punt'], alpha)

    E_go = terms['p_conv'] * U_go_conv + (1 - terms['p_conv']) * U_go_fail
    E_kick = terms['p_fg'] * U_kick_make + (1 - terms['p_fg']) * U_kick_miss
    E_punt = U_punt
    return np.column_stack([E_go, E_kick, E_punt])

def expected_utilities(states, alpha):
    """Original call signature (kept); thin wrapper over the hoisted path."""
    return expected_utilities_from_terms(precompute_terms(states), alpha)

# ============================================================================
# 8. NEGATIVE LOG-LIKELIHOOD
# ============================================================================
ACTIONS = ['go', 'kick', 'punt']
ACTION_IDX = {a: i for i, a in enumerate(ACTIONS)}

def neg_log_likelihood(params, terms, observed_idx):
    alpha, beta = params
    if beta <= 0:
        return 1e10
    EU = expected_utilities_from_terms(terms, alpha)  # (N, 3)
    logits = beta * EU                               # (N, 3)
    logits -= logits.max(axis=1, keepdims=True)
    log_Z = np.log(np.exp(logits).sum(axis=1))
    log_p_obs = logits[np.arange(logits.shape[0]), observed_idx] - log_Z
    return -log_p_obs.mean()

# ============================================================================
# 9. TWO-STAGE GRID SEARCH
# ============================================================================
states_train = fd_train[['ydstogo', 'yardline_100', 'score_differential',
                          'game_seconds_remaining', 'fg_prob']].reset_index(drop=True)
obs_idx_train = fd_train['action'].map(ACTION_IDX).values
terms_train = precompute_terms(states_train)   # (alpha,beta)-independent; once

# Stage 1: coarse grid
alphas_coarse = np.array([-5, -2, -1, -0.5, -0.1, 0.0,
                          0.1, 0.5, 1.0, 2.0, 5.0, 10.0])
betas_coarse = np.array([0.5, 1.0, 2.0, 5.0, 10.0, 20.0])

best = (None, np.inf)
for a in alphas_coarse:
    for b in betas_coarse:
        nll = neg_log_likelihood((a, b), terms_train, obs_idx_train)
        if nll < best[1]:
            best = ((a, b), nll)
print(f"Stage 1 best: alpha={best[0][0]}, beta={best[0][1]}, NLL={best[1]:.4f}", flush=True)

# Stage 2: fine grid around stage-1 winner
a0, b0 = best[0]
alphas_fine = np.linspace(a0 - 1.0, a0 + 1.0, 21)
betas_fine = np.linspace(max(b0 - 2.0, 0.1), b0 + 2.0, 21)

for a in alphas_fine:
    for b in betas_fine:
        nll = neg_log_likelihood((a, b), terms_train, obs_idx_train)
        if nll < best[1]:
            best = ((a, b), nll)

alpha_hat, beta_hat = best[0]
print(f"Final MLE: alpha={alpha_hat:.4f}, beta={beta_hat:.4f}, NLL={best[1]:.4f}", flush=True)

# ============================================================================
# 10. EVALUATION ON TEST SET
# ============================================================================
states_test = fd_test[['ydstogo', 'yardline_100', 'score_differential',
                        'game_seconds_remaining', 'fg_prob']].reset_index(drop=True)
obs_idx_test = fd_test['action'].map(ACTION_IDX).values

terms_test = precompute_terms(states_test)
EU_test = expected_utilities_from_terms(terms_test, alpha_hat)
logits_test = beta_hat * EU_test
logits_test -= logits_test.max(axis=1, keepdims=True)
probs_test = np.exp(logits_test) / np.exp(logits_test).sum(axis=1, keepdims=True)
pred_idx = probs_test.argmax(axis=1)

accuracy = (pred_idx == obs_idx_test).mean()
ll = log_loss(obs_idx_test, probs_test, labels=[0, 1, 2])

# Baselines
always_go_acc = (obs_idx_test == ACTION_IDX['go']).mean()
hist_punt_kick = np.where(states_test['yardline_100'].values > 40,
                           ACTION_IDX['punt'], ACTION_IDX['kick'])
hist_acc = (hist_punt_kick == obs_idx_test).mean()

print(f"Test accuracy (IRL): {accuracy:.4f}")
print(f"Baseline always-go:  {always_go_acc:.4f}")
print(f"Baseline position:   {hist_acc:.4f}")
print(f"Test log-loss:       {ll:.4f}")

# ============================================================================
# 11. PRE-REGISTERED CRITERIA CHECK
# ============================================================================
c1 = accuracy > hist_acc + 0.02
c2 = 0.5 <= alpha_hat <= 5.0
c3 = 0.1 <= alpha_hat <= 20.0 and alpha_hat > 0
c4 = beta_hat >= 1.0

summary = {
    "alpha_hat": float(alpha_hat),
    "beta_hat": float(beta_hat),
    "nll_train": float(best[1]),
    "empirical_conversion_gain": float(emp_gain),
    "accuracy": float(accuracy),
    "baseline_always_go": float(always_go_acc),
    "baseline_position_rule": float(hist_acc),
    "log_loss": float(ll),
    "c1_accuracy_beats_baseline": bool(c1),
    "c2_alpha_in_preregistered_range": bool(c2),
    "c3_alpha_in_wide_range_and_positive": bool(c3),
    "c4_beta_sane": bool(c4),
    "lab_fixes": ["kick_miss yardline sign: 100-yl+8 -> 100-yl-8",
                  "punt yardline sign: 100-yl-40 -> 100-yl+40 with touchback->75",
                  "empirical conversion gain replaces hard-coded 5"],
    "verdict": "PROVISIONAL_PASS" if (c1 and c3 and c4) else "NULL"
}
print(json.dumps(summary, indent=2))
