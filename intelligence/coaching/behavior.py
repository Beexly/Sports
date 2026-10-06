"""
behavior.py — Behavior-conditioned live win probability hook (BS-4).

PROVENANCE
----------
Buildable system BS-4 from ~/workspace/corpus-intelligence/deep/c04/
buildable-systems.md; serves the reasoning-depth-spec's L3 causal-chain
requirement: drive-outcome probabilities conditioned on what the coach will
ACTUALLY do (tau-hat predicted action), not on WP-maximization.

Pure composition of coach_risk.TauFitter (BS-1) + situational_wp (BS-2).
No new fitting. Verification statuses per the reasoning spec: outputs are
COMPUTED (derived by engine code, reproducible); tau-hat inputs are CORPUS.

Identity guarantee (tested): when tau-hat predicts the WP-max action,
expected_wp_given_coach == engine WP of the optimal action exactly.
"""

import numpy as np
import pandas as pd

from .coach_risk import WP_BINS, WP_BIN_LABELS


def _wp_bin_label(wp):
    return WP_BIN_LABELS[int(np.clip(np.digitize(wp, WP_BINS) - 1, 0, 4))]


def expected_wp_given_coach(engine, fitter, team, season, yardline_100, ydstogo,
                            score_differential, game_seconds_remaining, qtr,
                            wp, timeouts_rem=3):
    """Expected posteam WP of the action the coach is predicted to take.

    Returns dict(action_predicted, wp_behavior, wp_optimal, wp_gap,
                 tau_hat, tau_fallback).
    """
    region = "opp" if yardline_100 <= 50 else "own"
    tau, fb = fitter.serve(team, season, region, wp)
    ev = engine.evaluate_4th(yardline_100, ydstogo, score_differential,
                             game_seconds_remaining, qtr, timeouts_rem)
    a_star = max(ev, key=ev.get)
    # tau-optimal action under the fitter's quantile rule, restricted to the
    # engine's action set: pick the tau-quantile-best action among {GO,FGA,PUNT}.
    # We approximate via the fitter's cell machinery on a synthetic row.
    import pandas as pd
    row = pd.Series({"region": region,
                     "wp_bin": _wp_bin_label(wp),
                     "dist_band": pd.cut(pd.Series([ydstogo]), [0, 1, 3, 7, 99],
                                         labels=["1", "2-3", "4-7", "8+"]).iloc[0],
                     "yard_band": pd.cut(pd.Series([yardline_100]),
                                         [0, 10, 20, 35, 50, 65, 80, 100],
                                         labels=["1-10", "11-20", "21-35", "36-50",
                                                 "51-65", "66-80", "81-99"]).iloc[0]})
    a_pred = fitter.tau_optimal_action(row, tau)
    if a_pred not in ev:
        a_pred = a_star
    return {"action_predicted": a_pred,
            "wp_behavior": float(ev[a_pred]),
            "wp_optimal": float(ev[a_star]),
            "wp_gap": float(ev[a_star] - ev[a_pred]),
            "tau_hat": float(tau),
            "tau_fallback": fb}
