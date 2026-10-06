"""
coach_audit.py — Coach-decision audit in win-probability points.

PROVENANCE
----------
Closes c04-map gap #5 ("no coach-decision audit dataset") using the S-1
composition: 0207's prescriptive situational engine (situational_wp.py)
vs observed decisions, with 1575's tau-hat (coach_risk.py) as the
behavior-prediction layer.
Synthesis: ~/workspace/corpus-intelligence/deep/c04/syntheses.md S-1.

For each 4th-down decision: optimal action (WP-max via the shrunk engine),
observed action, WP gap = WP(a*) - WP(a_observed); tau-predicted action and
predicted-vs-actual agreement. Aggregates per (team, season).
"""

import numpy as np
import pandas as pd

from .coach_risk import TauFitter
from .situational_wp import SituationalEngine


def audit_decisions(fd, engine, fitter):
    """fd: fourth-down plays from coach_risk.load_fourths_downs (has action,
    region, wp_bin, and raw state columns). Returns per-play audit rows."""
    rows = []
    for _, r in fd.iterrows():
        ev = engine.evaluate_4th(
            float(r["yardline_100"]), float(r["ydstogo"]),
            float(r["score_differential"]), float(r["game_seconds_remaining"]),
            int(r["qtr"]))
        a_star = max(ev, key=ev.get)
        a_obs = r["action"]
        tau, fb = fitter.serve(r["posteam"], int(r["season"]), r["region"], float(r["wp"]))
        a_pred = fitter.tau_optimal_action(r, tau)
        rows.append({
            "season": int(r["season"]), "week": int(r["week"]), "game_id": r["game_id"],
            "team": r["posteam"], "qtr": int(r["qtr"]),
            "yardline_100": float(r["yardline_100"]), "ydstogo": float(r["ydstogo"]),
            "wp": float(r["wp"]), "region": r["region"],
            "observed": a_obs, "optimal": a_star, "tau_predicted": a_pred,
            "tau_hat": round(float(tau), 3), "tau_fallback": fb,
            "wp_optimal": round(ev[a_star], 4),
            "wp_observed": round(ev[a_obs], 4),
            "wp_gap": round(ev[a_star] - ev[a_obs], 4),
            "optimal_correct": a_star == a_obs,
            "tau_correct": a_pred == a_obs,
        })
    return pd.DataFrame(rows)


def aggregate_audit(audit_df):
    g = audit_df.groupby(["team", "season"])
    out = g.agg(
        n_decisions=("wp_gap", "size"),
        wp_left_on_table=("wp_gap", lambda s: round(float(s[s > 0].sum()), 3)),
        mean_gap=("wp_gap", lambda s: round(float(s.mean()), 4)),
        optimal_agreement=("optimal_correct", lambda s: round(float(s.mean()), 3)),
        tau_agreement=("tau_correct", lambda s: round(float(s.mean()), 3)),
        mean_tau_hat=("tau_hat", lambda s: round(float(s.mean()), 3)),
    ).reset_index()
    return out.sort_values("wp_left_on_table", ascending=False)


def weekly_report(audit_df, season, week, top_n=10):
    sub = audit_df[(audit_df["season"] == season) & (audit_df["week"] == week)]
    sub = sub[sub["wp_gap"] > 0.005].sort_values("wp_gap", ascending=False)
    lines = [f"Coach-decision audit — {season} week {week} "
             f"({len(sub)} suboptimal 4th-down decisions by WP):"]
    for _, r in sub.head(top_n).iterrows():
        lines.append(
            f"  {r['team']} Q{r['qtr']} 4th&{r['ydstogo']:.0f} @ {r['yardline_100']:.0f}: "
            f"went {r['observed']}, WP-optimal {r['optimal']} "
            f"(gap {r['wp_gap']:.3f} WP; tau-predicted {r['tau_predicted']}, "
            f"tau_hat={r['tau_hat']})")
    return "\n".join(lines)
