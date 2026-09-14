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
