#!/usr/bin/env python3
"""
r_pixel_base sweep for the Jacobian Kalman control experiment (Horizon 1.3 follow-on).

The 787-play Jacobian run at r_pixel_base=4.0 px^2 over-covers Mid/Far (mean 90% CI
coverage 0.9999 / 0.9985 vs the required [0.85, 0.95] band). This script re-runs ONLY
the Jacobian single-view control across all 787 REG 2026 NGS highlight plays for a
lattice of r_pixel_base values, with everything else fixed (same homography, same
noise recipe as validate_2026_highlights_all.py, same zone definitions), and prints
the stratified coverage table per value so a single value can be chosen.

Does NOT write any artifact; read-only measurement sweep. Weight 0.0 throughout.
"""
from __future__ import annotations

import json
import math
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd

REPO = Path(__file__).resolve().parents[2]
if str(REPO / "intelligence" / "vision") not in sys.path:
    sys.path.insert(0, str(REPO / "intelligence" / "vision"))

from validate_2026_highlights_all import (  # noqa: E402
    build_broadcast_and_endzone_calibrations,
    run_play_kalman_jacobian_batch,
)
from skeletrack_v2 import Homography, YD_TO_M  # noqa: E402

VISION_DATA = REPO / "intelligence" / "vision" / "data"
COACH_DATA = REPO / "intelligence" / "coaching" / "data"
CHI2_2_90 = 4.605170185988092
R_VALUES = [8.0, 4.0, 2.0, 1.0, 0.6, 0.4, 0.25, 0.15, 0.05]
ZONES = ("Near", "Mid", "Far", "End")


def main() -> int:
    t0 = time.time()
    ht26 = pd.read_parquet(VISION_DATA / "ngs_highlight_tracking_2026.parquet")
    ht26_reg = ht26[ht26["season_type"] == "REG"].copy()
    ev26 = pd.read_parquet(COACH_DATA / "ngs_highlight_events_2026.parquet")
    ev26_reg = ev26[ev26["season_type"] == "REG"].copy()

    snap_events = {"ball_snap", "snap_direct", "kickoff", "free_kick", "autoevent_ballsnap"}
    end_events = {
        "tackle", "out_of_bounds", "touchdown", "qb_sack", "qb_strip_sack",
        "pass_outcome_incomplete", "pass_outcome_touchdown", "fumble_defense_recovered",
        "fumble_offense_recovered", "safety", "touchback", "fair_catch",
        "field_goal", "extra_point", "qb_slide",
    }
    snap_f, end_f = {}, {}
    for (gid, pid), grp in ev26_reg.groupby(["game_id", "play_id"]):
        sf = grp[grp["event"].isin(snap_events)]["frame_id"]
        ef = grp[grp["event"].isin(end_events)]["frame_id"]
        if len(sf):
            snap_f[(int(gid), int(pid))] = int(sf.min())
        if len(ef):
            end_f[(int(gid), int(pid))] = int(ef.max())

    H_m2px_1, H_px2m_1, _H_m2px_2, _H_px2m_2, reproj_err, n_corr = build_broadcast_and_endzone_calibrations()
    H_obj = Homography(H=H_px2m_1)

    rng = np.random.default_rng(20261014)

    acc = {r: {z: {"covs": [], "rmses": []} for z in ZONES} for r in R_VALUES}
    players_only = ht26_reg[ht26_reg["side"] != "ball"]
    play_groups = list(players_only.groupby(["game_id", "play_id"]))

    n_plays_used = 0
    for (gid_raw, pid_raw), grp in play_groups:
        gid, pid = int(gid_raw), int(pid_raw)
        key = (gid, pid)
        f_min = snap_f.get(key, int(grp["frame_id"].min()))
        f_max = end_f.get(key, int(grp["frame_id"].max()))
        if f_max <= f_min:
            f_min, f_max = int(grp["frame_id"].min()), int(grp["frame_id"].max())
        sub = grp[(grp["frame_id"] >= f_min) & (grp["frame_id"] <= f_max)].sort_values(["gsis_id", "frame_id"])
        if sub.empty:
            sub = grp.sort_values(["gsis_id", "frame_id"])

        p_unique = sub[["gsis_id", "team_abbr", "jersey_number", "position"]].drop_duplicates()
        true_players = len(p_unique)
        n_frames_play = int(sub["frame_id"].nunique())
        n_obs = len(sub)
        if not (n_obs == true_players * n_frames_play and n_frames_play > 0):
            continue

        x_yd_mat = sub["x"].to_numpy(dtype=np.float64).reshape(true_players, n_frames_play)
        y_yd_mat = sub["y"].to_numpy(dtype=np.float64).reshape(true_players, n_frames_play)
        xm_gt_mat = x_yd_mat * YD_TO_M
        ym_gt_mat = y_yd_mat * YD_TO_M
        ones = np.ones((true_players, n_frames_play), dtype=np.float64)

        pts_px_1 = H_m2px_1 @ np.vstack([xm_gt_mat.ravel(), ym_gt_mat.ravel(), ones.ravel()])
        u1_obs = pts_px_1[0] / pts_px_1[2] + rng.normal(0.0, 0.9 / math.sqrt(2.0), size=n_obs)
        v1_obs = pts_px_1[1] / pts_px_1[2] + rng.normal(0.0, 0.9 / math.sqrt(2.0), size=n_obs)
        pts_obs_m1 = H_px2m_1 @ np.vstack([u1_obs, v1_obs, np.ones(n_obs)])
        xm_raw_mat = (pts_obs_m1[0] / pts_obs_m1[2]).reshape(true_players, n_frames_play)
        ym_raw_mat = (pts_obs_m1[1] / pts_obs_m1[2]).reshape(true_players, n_frames_play)
        u1_mat = u1_obs.reshape(true_players, n_frames_play)
        v1_mat = v1_obs.reshape(true_players, n_frames_play)
        cf_mat = rng.uniform(0.78, 0.96, size=n_obs).reshape(true_players, n_frames_play)

        zone_masks = {
            "Near": (x_yd_mat >= 10.0) & (x_yd_mat <= 110.0) & (y_yd_mat < 17.78),
            "Mid": (x_yd_mat >= 10.0) & (x_yd_mat <= 110.0) & (y_yd_mat >= 17.78) & (y_yd_mat <= 35.55),
            "Far": (x_yd_mat >= 10.0) & (x_yd_mat <= 110.0) & (y_yd_mat > 35.55),
            "End": (x_yd_mat < 10.0) | (x_yd_mat > 110.0),
        }

        n_plays_used += 1
        for r in R_VALUES:
            err_sq, mahal_sq = run_play_kalman_jacobian_batch(
                xm_raw_mat, ym_raw_mat, u1_mat, v1_mat, xm_gt_mat, ym_gt_mat, cf_mat, H_obj,
                r_pixel_base=r,
            )
            hits = mahal_sq <= CHI2_2_90
            for z_name, z_mask in zone_masks.items():
                n_z = int(np.sum(z_mask))
                if n_z > 0:
                    acc[r][z_name]["covs"].append(float(np.mean(hits[z_mask])))
                    acc[r][z_name]["rmses"].append(math.sqrt(float(np.mean(err_sq[z_mask]))))

    print(f"plays_used={n_plays_used}  elapsed_s={round(time.time()-t0,1)}  reproj_err_m={reproj_err}  n_corr={n_corr}")
    print()
    header = f"{'r_pixel':>8} | " + " | ".join(f"{z:>26}" for z in ZONES)
    print(header)
    print(f"{'':>8} | " + " | ".join(f"{'cov(mean) rmse  <85  >95':>26}" for z in ZONES))
    table = {}
    for r in R_VALUES:
        row = []
        table[str(r)] = {}
        for z in ZONES:
            covs = acc[r][z]["covs"]
            rmses = acc[r][z]["rmses"]
            if not covs:
                row.append(f"{'n/a':>26}")
                continue
            mc = float(np.mean(covs))
            mr = float(np.mean(rmses))
            n_below = sum(1 for c in covs if c < 0.85)
            n_above = sum(1 for c in covs if c > 0.95)
            n_band = sum(1 for c in covs if 0.85 <= c <= 0.95)
            table[str(r)][z] = {
                "plays": len(covs), "mean_coverage": round(mc, 4), "mean_rmse_m": round(mr, 4),
                "plays_inside": n_band, "plays_below_85": n_below, "plays_above_95": n_above,
            }
            row.append(f"{mc:8.4f} {mr:6.4f} {n_below:5d} {n_above:5d}")
        print(f"{r:>8} | " + " | ".join(f"{c:>26}" for c in row))
    print()
    print(json.dumps(table, indent=1))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
