"""Run the research-mindset feature pipeline on real NFL tracking data.

Source: nfl-football-ops/Big-Data-Bowl tracking_gameId_2017090700.csv
(31.6 MB, per-frame x/y for all 22 players, one game).

For each pass play:
  * pre-snap positions  = frame at `ball_snap`
  * post-snap positions = frame at `pass_forward`
  * trajectories        = per-player path from snap to pass_forward

Features:
  - disguise_collapse_hazard(pre, post, calibration)
  - trajectory_irreversibility (mean over players)
  - qb_cognitive_load (MOT load at pass_forward)
  - route_em_clusters (cluster count over receiver paths)

Outcome: pass_outcome_caught (1) vs pass_outcome_incomplete (0).
Gate: Welch t-test per feature, BH-FDR across features at q=0.10.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from intelligence.vision import research_mindset_features as rmf

TRACKING = Path(r"C:\Users\Garrett\AppData\Local\hermes\cache\scratch\tracking_gameId_2017090700.csv")


def _frame_positions(play: pd.DataFrame, frame_id: int) -> np.ndarray:
    f = play[play["frame.id"] == frame_id]
    f = f[f["team"].isin(["home", "away"])]
    return f[["x", "y"]].to_numpy(dtype=float)


def _trajectory(play: pd.DataFrame, nfl_id: int, f0: int, f1: int) -> np.ndarray:
    p = play[(play["nflId"] == nfl_id) & (play["frame.id"] >= f0) & (play["frame.id"] <= f1)]
    p = p.sort_values("frame.id")
    return p[["x", "y"]].to_numpy(dtype=float)


def extract_play(play: pd.DataFrame, cal: np.ndarray) -> dict | None:
    snap = play[play["event"] == "ball_snap"]["frame.id"]
    fwd = play[play["event"] == "pass_forward"]["frame.id"]
    if snap.empty or fwd.empty:
        return None
    f_snap, f_fwd = int(snap.min()), int(fwd.min())
    if f_fwd <= f_snap:
        return None

    pre = _frame_positions(play, f_snap)
    post = _frame_positions(play, f_fwd)
    if len(pre) < 6 or len(post) < 6:
        return None
    # Match by player so pre/post are the same rows.
    pre_df = play[(play["frame.id"] == f_snap) & play["team"].isin(["home", "away"])]
    post_df = play[(play["frame.id"] == f_fwd) & play["team"].isin(["home", "away"])]
    common = sorted(set(pre_df["nflId"]) & set(post_df["nflId"]))
    if len(common) < 6:
        return None
    pre = pre_df.set_index("nflId").loc[common, ["x", "y"]].to_numpy(dtype=float)
    post = post_df.set_index("nflId").loc[common, ["x", "y"]].to_numpy(dtype=float)

    haz = rmf.disguise_collapse_hazard(pre, post, cal)

    trajs = [_trajectory(play, pid, f_snap, f_fwd) for pid in common]
    trajs = [t for t in trajs if len(t) >= 3]
    irr = float(np.mean([rmf.trajectory_irreversibility(t) for t in trajs])) if trajs else 0.0

    # QB = the player with the ball at the snap frame.
    ball = play[(play["frame.id"] == f_snap) & (play["team"] == "ball")]
    if len(ball):
        bx, by = float(ball["x"].iloc[0]), float(ball["y"].iloc[0])
        d = np.linalg.norm(post - np.array([bx, by]), axis=1)
        qb_idx = int(np.argmin(d))
        load = rmf.qb_cognitive_load(post[qb_idx], post)
    else:
        load = {"mot_load": 0.0, "defenders_in_scan": 0, "nearest_defender_px": None}

    return {
        "hazard": haz["composite_hazard_score"],
        "irreversibility": irr,
        "mot_load": load["mot_load"],
        "n_players": len(common),
        "n_traj": len(trajs),
    }


def main() -> int:
    if not TRACKING.exists():
        print(f"FATAL: {TRACKING} not found")
        return 2
    df = pd.read_csv(TRACKING)
    print(f"tracking rows: {len(df):,}  plays: {df['playId'].nunique()}")

    # Outcome per play.
    outcomes = {}
    for pid, g in df.groupby("playId"):
        ev = set(g["event"].dropna())
        if "pass_outcome_caught" in ev:
            outcomes[pid] = 1
        elif "pass_outcome_incomplete" in ev:
            outcomes[pid] = 0

    rng = np.random.default_rng(20261104)
    cal = rng.normal(0.0, 1.0, 200)

    rows = []
    for pid, g in df.groupby("playId"):
        if pid not in outcomes:
            continue
        try:
            r = extract_play(g, cal)
        except Exception as e:
            print(f"  play {pid} ERR {type(e).__name__}: {str(e)[:60]}")
            continue
        if r is None:
            continue
        r["label"] = outcomes[pid]
        r["playId"] = int(pid)
        rows.append(r)

    print(f"pass plays with features: {len(rows)}")
    if len(rows) < 10:
        print("too few plays for a gate; stopping")
        return 1
    y = np.array([r["label"] for r in rows])
    print(f"caught: {int(y.sum())}  incomplete: {int((1 - y).sum())}")
    print()

    names = ["hazard", "irreversibility", "mot_load"]
    X = np.array([[r[n] for n in names] for r in rows])
    gate = rmf.falsify_feature_matrix(X, y, names, q=0.10)
    print(f"{'feature':<20} {'t':>8} {'p':>10} {'adj_p':>10} {'survives':>9}")
    for i, n in enumerate(names):
        print(f"{n:<20} {gate['t_stat'][i]:>8.3f} {gate['p_value'][i]:>10.4f} "
              f"{gate['adjusted_p'][i]:>10.4f} {str(gate['reject'][i]):>9}")
    print()
    print(f"features surviving BH-FDR q={gate['q']}: {gate['n_reject']}/{len(names)}")

    out = Path(r"C:\Users\Garrett\AppData\Local\hermes\cache\scratch\tracking_features_2026_11_04.json")
    out.write_text(json.dumps({"gate": gate, "n_plays": len(rows),
                               "n_caught": int(y.sum()), "rows": rows}, indent=1),
                   encoding="utf-8")
    print(f"wrote {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
