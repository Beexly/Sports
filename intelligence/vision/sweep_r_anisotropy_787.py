#!/usr/bin/env python3
"""
sweep_r_anisotropy_787 — anisotropic (r_u, r_v) pixel-covariance sweep, 787-play corpus.
=========================================================================================
Bus contract (intelligence/vision/BUS.md):
  * Owned by Hermes. Imports from validate_2026_highlights_all.py and skeletrack_v2.py.
    Does NOT write those files. Only output: sweep_r_anisotropy_787_results.json (beside
    this script).
  * Grid: r_u, r_v in {0.5, 1, 2, 4, 8}; weight 0.0 throughout; no promotion.
  * RNG parity: seed 20261014; per-play draw order replicates the validator exactly —
    identity-loop prefix (rng.normal(0, 8, 6) per ambiguous jersey), u1/v1 noise,
    u2/v2 noise (consumed for stream parity, unused here), then the confidence draw.
    Therefore the (4, 4) cell is bit-for-bit the isotropic r_pixel_base=4.0 Jacobian
    control; asserted below against the validator's own run_play_kalman_jacobian_batch.
  * Model: R_pixel = diag(r_u, r_v) / max(conf, 0.05)  [px^2]
           R_field = J(u,v) R_pixel J(u,v)^T + 1e-6 I_2
    Kalman: 4-state constant-velocity, Joseph form; 90% CI hit iff
    d_M^2 = e^T (P_{k|k}^{(xy)})^{-1} e <= chi2_{2,0.90} = 4.605170185988092.
  * Win cell: mean play RMSE <= 0.10 m AND mean 90% CI coverage in [0.85, 0.95] for
    each of Near / Mid / Far / End zones.
"""
from __future__ import annotations

import json
import math
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

import cv2
import numpy as np
import pandas as pd

REPO = Path(__file__).resolve().parents[2]
if str(REPO / "intelligence" / "vision") not in sys.path:
    sys.path.insert(0, str(REPO / "intelligence" / "vision"))

from validate_2026_highlights_all import (  # noqa: E402
    CHI2_2_90,
    build_broadcast_and_endzone_calibrations,
    run_play_kalman_jacobian_batch,
)
from skeletrack_v2 import (  # noqa: E402
    YD_TO_M,
    Homography,
    JerseyColorEmbeddingResolver,
    JerseyOCREngine,
)

VISION_DATA = REPO / "intelligence" / "vision" / "data"
COACH_DATA = REPO / "intelligence" / "coaching" / "data"
OUT_PATH = Path(__file__).resolve().parent / "sweep_r_anisotropy_787_results.json"

GRID: Tuple[float, ...] = (0.5, 1.0, 2.0, 4.0, 8.0)
ZONES: Tuple[str, ...] = ("Near", "Mid", "Far", "End")
SEED = 20261014
RMSE_MAX = 0.10
BAND_LO, BAND_HI = 0.85, 0.95


def run_play_kalman_aniso_batch(
    xm_raw: np.ndarray,
    ym_raw: np.ndarray,
    u_obs: np.ndarray,
    v_obs: np.ndarray,
    xm_gt: np.ndarray,
    ym_gt: np.ndarray,
    confs: np.ndarray,
    H_obj: Homography,
    r_u: float,
    r_v: float,
    dt: float = 0.10,
    epsilon: float = 1e-6,
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Vectorized batch evaluation of the anisotropic Jacobian Kalman across P players x T
    frames. Mirror of the validator's run_play_kalman_jacobian_batch with
    R_pixel = diag(r_u, r_v) / max(conf, 0.05); at r_u == r_v the code path is identical
    to the isotropic control (bit-for-bit). Returns (err_sq [P, T], mahal_sq [P, T]).
    """
    P_cnt, T_cnt = xm_raw.shape
    H = H_obj.H

    w = H[2, 0] * u_obs + H[2, 1] * v_obs + H[2, 2]
    xp = (H[0, 0] * u_obs + H[0, 1] * v_obs + H[0, 2]) / w
    yp = (H[1, 0] * u_obs + H[1, 1] * v_obs + H[1, 2]) / w

    J00 = (H[0, 0] - xp * H[2, 0]) / w
    J01 = (H[0, 1] - xp * H[2, 1]) / w
    J10 = (H[1, 0] - yp * H[2, 0]) / w
    J11 = (H[1, 1] - yp * H[2, 1]) / w

    if r_u == r_v:
        # isotropic control path (identical expression to the validator at r_pixel_base=r_u)
        r_pix = r_u / np.maximum(confs, 0.05)
        R00_all = r_pix * (J00 * J00 + J01 * J01) + epsilon
        R01_all = r_pix * (J00 * J10 + J01 * J11)
        R11_all = r_pix * (J10 * J10 + J11 * J11) + epsilon
    else:
        ru_eff = r_u / np.maximum(confs, 0.05)
        rv_eff = r_v / np.maximum(confs, 0.05)
        R00_all = ru_eff * (J00 * J00) + rv_eff * (J01 * J01) + epsilon
        R01_all = ru_eff * (J00 * J10) + rv_eff * (J01 * J11)
        R11_all = ru_eff * (J10 * J10) + rv_eff * (J11 * J11) + epsilon

    state = np.zeros((P_cnt, 4), dtype=np.float64)
    state[:, 0] = xm_raw[:, 0]
    state[:, 1] = ym_raw[:, 0]

    cov = np.zeros((P_cnt, 4, 4), dtype=np.float64)
    cov[:, 0, 0] = R00_all[:, 0]
    cov[:, 0, 1] = R01_all[:, 0]
    cov[:, 1, 0] = R01_all[:, 0]
    cov[:, 1, 1] = R11_all[:, 0]
    cov[:, 2, 2] = 4.0
    cov[:, 3, 3] = 4.0

    F = np.array([
        [1.0, 0.0, dt, 0.0],
        [0.0, 1.0, 0.0, dt],
        [0.0, 0.0, 1.0, 0.0],
        [0.0, 0.0, 0.0, 1.0],
    ], dtype=np.float64)
    FT = F.T
    Q = np.diag([0.01, 0.01, 0.25, 0.25]).astype(np.float64)
    I4 = np.eye(4, dtype=np.float64)[None, :, :]

    err_sq = np.empty((P_cnt, T_cnt), dtype=np.float64)
    mahal_sq_pure = np.empty((P_cnt, T_cnt), dtype=np.float64)

    ex0 = state[:, 0] - xm_gt[:, 0]
    ey0 = state[:, 1] - ym_gt[:, 0]
    err_sq[:, 0] = ex0 * ex0 + ey0 * ey0
    p00 = cov[:, 0, 0]
    p01 = cov[:, 0, 1]
    p11 = cov[:, 1, 1]
    det0 = np.maximum(1e-12, p00 * p11 - p01 * p01)
    mahal_sq_pure[:, 0] = (p11 * ex0 * ex0 - 2.0 * p01 * ex0 * ey0 + p00 * ey0 * ey0) / det0

    for t in range(1, T_cnt):
        state = state @ FT
        cov = np.einsum("ij,pjk,kl->pil", F, cov, FT) + Q[None, :, :]

        Rf = np.zeros((P_cnt, 2, 2), dtype=np.float64)
        Rf[:, 0, 0] = R00_all[:, t]
        Rf[:, 0, 1] = R01_all[:, t]
        Rf[:, 1, 0] = R01_all[:, t]
        Rf[:, 1, 1] = R11_all[:, t]

        S00 = cov[:, 0, 0] + Rf[:, 0, 0]
        S01 = cov[:, 0, 1] + Rf[:, 0, 1]
        S11 = cov[:, 1, 1] + Rf[:, 1, 1]
        detS = np.maximum(1e-12, S00 * S11 - S01 * S01)
        invS = np.empty((P_cnt, 2, 2), dtype=np.float64)
        invS[:, 0, 0] = S11 / detS
        invS[:, 0, 1] = -S01 / detS
        invS[:, 1, 0] = -S01 / detS
        invS[:, 1, 1] = S00 / detS

        K = np.einsum("pik,pkj->pij", cov[:, :, :2], invS)
        y_vec = np.stack([xm_raw[:, t] - state[:, 0], ym_raw[:, t] - state[:, 1]], axis=1)
        state = state + np.einsum("pij,pj->pi", K, y_vec)

        I_KH = np.repeat(I4, P_cnt, axis=0)
        I_KH[:, :, 0] -= K[:, :, 0]
        I_KH[:, :, 1] -= K[:, :, 1]
        cov = np.einsum("pij,pjk,plk->pil", I_KH, cov, I_KH) + np.einsum("pij,pjk,plk->pil", K, Rf, K)

        ex = state[:, 0] - xm_gt[:, t]
        ey = state[:, 1] - ym_gt[:, t]
        err_sq[:, t] = ex * ex + ey * ey

        p00 = cov[:, 0, 0]
        p01 = cov[:, 0, 1]
        p11 = cov[:, 1, 1]
        detP = np.maximum(1e-12, p00 * p11 - p01 * p01)
        mahal_sq_pure[:, t] = (p11 * ex * ex - 2.0 * p01 * ex * ey + p00 * ey * ey) / detP

    return err_sq, mahal_sq_pure


def _cell_key(r_u: float, r_v: float) -> str:
    return f"{r_u:g}|{r_v:g}"


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
    snap_f: Dict[Tuple[int, int], int] = {}
    end_f: Dict[Tuple[int, int], int] = {}
    for (gid, pid), grp in ev26_reg.groupby(["game_id", "play_id"]):
        sf = grp[grp["event"].isin(snap_events)]["frame_id"]
        ef = grp[grp["event"].isin(end_events)]["frame_id"]
        if len(sf):
            snap_f[(int(gid), int(pid))] = int(sf.min())
        if len(ef):
            end_f[(int(gid), int(pid))] = int(ef.max())

    (H_m2px_1, H_px2m_1, _H_m2px_2, _H_px2m_2, reproj_err, n_corr) = (
        build_broadcast_and_endzone_calibrations()
    )
    homography_obj = Homography(H=H_px2m_1)

    ocr_engine = JerseyOCREngine(sharpness_threshold=35.0)
    color_resolver = JerseyColorEmbeddingResolver()
    ocr_cache: Dict[str, Tuple[Any, float, float]] = {}
    for num in range(100):
        j_str = str(num)
        crop = np.full((36, 52), 35, dtype=np.uint8)
        (tw, th), _ = cv2.getTextSize(j_str, cv2.FONT_HERSHEY_DUPLEX, 0.72, 2)
        cv2.putText(crop, j_str, ((52 - tw) // 2, (36 + th) // 2), cv2.FONT_HERSHEY_DUPLEX, 0.72, 240, 2)
        ocr_cache[j_str] = ocr_engine.read_digits(crop)

    rng = np.random.default_rng(SEED)

    players_only = ht26_reg[ht26_reg["side"] != "ball"]
    play_groups = list(players_only.groupby(["game_id", "play_id"]))

    cells = [(ru, rv) for ru in GRID for rv in GRID]
    acc: Dict[str, Dict[str, Any]] = {
        _cell_key(ru, rv): {
            "r_u": ru, "r_v": rv,
            "cov": {z: [] for z in ZONES},
            "rmse": {z: [] for z in ZONES},
            "obs": {z: 0 for z in ZONES},
            "play_rmse": [],
            "play_cov": [],
        }
        for (ru, rv) in cells
    }

    eq_checked = 0
    eq_max_abs = 0.0
    valid_plays = 0
    skipped_plays = 0
    total_obs = 0

    def write_results(final: bool) -> None:
        cells_out: List[Dict[str, Any]] = []
        winners: List[Dict[str, Any]] = []
        for (ru, rv) in cells:
            a = acc[_cell_key(ru, rv)]
            zones_out: Dict[str, Any] = {}
            band_violation = 0.0
            zone_means: Dict[str, float] = {}
            for z in ZONES:
                covs = a["cov"][z]
                rmses = a["rmse"][z]
                if covs:
                    mc = float(np.mean(covs))
                    mr = float(np.mean(rmses))
                    inside = sum(1 for c in covs if BAND_LO <= c <= BAND_HI)
                    below = sum(1 for c in covs if c < BAND_LO)
                    above = sum(1 for c in covs if c > BAND_HI)
                else:
                    mc, mr, inside, below, above = None, None, 0, 0, 0
                zone_means[z] = mc if mc is not None else float("nan")
                if mc is not None:
                    band_violation += max(0.0, BAND_LO - mc) + max(0.0, mc - BAND_HI)
                zones_out[z] = {
                    "plays": len(covs),
                    "obs": int(a["obs"][z]),
                    "mean_coverage": round(mc, 4) if mc is not None else None,
                    "mean_rmse_m": round(mr, 4) if mr is not None else None,
                    "plays_inside_85_95": int(inside),
                    "plays_below_85": int(below),
                    "plays_above_95": int(above),
                }
            mean_play_rmse = float(np.mean(a["play_rmse"])) if a["play_rmse"] else None
            mean_cov_all = float(np.mean(a["play_cov"])) if a["play_cov"] else None
            if mean_play_rmse is not None:
                band_violation += max(0.0, mean_play_rmse - RMSE_MAX)
            cov_ok = all(
                zone_means[z] is not None and BAND_LO <= zone_means[z] <= BAND_HI
                for z in ZONES if not math.isnan(zone_means[z])
            ) and all(not math.isnan(zone_means[z]) for z in ZONES)
            win = bool(
                cov_ok and mean_play_rmse is not None and mean_play_rmse <= RMSE_MAX
            )
            cell_out = {
                "r_u": ru,
                "r_v": rv,
                "zones": zones_out,
                "mean_play_rmse_m": round(mean_play_rmse, 4) if mean_play_rmse is not None else None,
                "mean_ci90_coverage_all": round(mean_cov_all, 4) if mean_cov_all is not None else None,
                "band_violation": round(band_violation, 6),
                "win": win,
            }
            cells_out.append(cell_out)
            if win:
                winners.append({"r_u": ru, "r_v": rv})

        ranked = sorted(cells_out, key=lambda c: (c["band_violation"], c["mean_play_rmse_m"] or 9.9))
        best = ranked[0] if ranked else None

        payload = {
            "record_type": "sweep_r_anisotropy_787",
            "generated_utc": datetime.now(timezone.utc).isoformat(),
            "partial": not final,
            "seed": SEED,
            "grid": {"r_u": list(GRID), "r_v": list(GRID)},
            "model": "R_pixel = diag(r_u, r_v)/max(conf,0.05); R_field = J R_pixel J^T + 1e-6 I",
            "plays": {
                "total": len(play_groups),
                "valid": valid_plays,
                "skipped_invalid_reshape": skipped_plays,
                "total_obs": total_obs,
            },
            "chi2_2_90": CHI2_2_90,
            "win_rule": "mean play RMSE <= 0.10 m AND mean 90% CI coverage in [0.85, 0.95] for Near/Mid/Far/End",
            "equivalence_check_4_4": {
                "plays_checked": eq_checked,
                "max_abs_diff_vs_validator_isotropic_r4": eq_max_abs,
            },
            "homography_reproj_err_m": reproj_err,
            "homography_correspondences": n_corr,
            "cells": cells_out,
            "winners": winners,
            "best_cell": best,
            "weight": 0.0,
            "elapsed_seconds": round(time.time() - t0, 2),
        }
        OUT_PATH.write_text(json.dumps(payload, indent=1), encoding="utf-8")

    for pi, ((gid_raw, pid_raw), grp) in enumerate(play_groups):
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

        j_counts: Dict[str, int] = {}
        for r in p_unique.itertuples(index=False):
            j_str = str(int(float(r.jersey_number)))
            j_counts[j_str] = j_counts.get(j_str, 0) + 1

        # ---- identity-loop RNG prefix (replicates the validator's draw sequence) ----
        for r in p_unique.itertuples(index=False):
            tm = str(r.team_abbr).upper()
            j_str = str(int(float(r.jersey_number)))
            digits, conf, _ = ocr_cache.get(j_str, (None, 0.0, 0.0))
            if digits is not None and conf >= 0.62:
                if j_counts.get(digits, 0) != 1:
                    true_tvec = color_resolver.team_vecs.get(tm)
                    if true_tvec is not None:
                        _ = true_tvec * 255.0 + rng.normal(0.0, 8.0, size=6)
        # NOTE: the validator's resolve_shadow_with_color call is intentionally omitted here;
        # it consumes no RNG (verified) and its output feeds only identity counters.

        x_yd_flat = sub["x"].to_numpy(dtype=np.float64)
        y_yd_flat = sub["y"].to_numpy(dtype=np.float64)
        xm_gt_flat = x_yd_flat * YD_TO_M
        ym_gt_flat = y_yd_flat * YD_TO_M
        ones = np.ones_like(xm_gt_flat)
        n_obs = len(xm_gt_flat)

        pts_px_1 = H_m2px_1 @ np.vstack([xm_gt_flat, ym_gt_flat, ones])
        u1_obs = pts_px_1[0] / pts_px_1[2] + rng.normal(0.0, 0.9 / math.sqrt(2.0), size=n_obs)
        v1_obs = pts_px_1[1] / pts_px_1[2] + rng.normal(0.0, 0.9 / math.sqrt(2.0), size=n_obs)
        pts_obs_m1 = H_px2m_1 @ np.vstack([u1_obs, v1_obs, ones])
        xm_raw_1_flat = pts_obs_m1[0] / pts_obs_m1[2]
        ym_raw_1_flat = pts_obs_m1[1] / pts_obs_m1[2]

        # view-2 noise: consumed so the stream matches the validator (values unused here)
        _ = rng.normal(0.0, 0.9 / math.sqrt(2.0), size=n_obs)
        _ = rng.normal(0.0, 0.9 / math.sqrt(2.0), size=n_obs)

        confs_flat = rng.uniform(0.78, 0.96, size=n_obs)

        n_frames_play = int(sub["frame_id"].nunique())
        if not (n_obs == true_players * n_frames_play and n_frames_play > 0):
            skipped_plays += 1
            continue
        valid_plays += 1
        total_obs += n_obs

        xm_1_mat = xm_raw_1_flat.reshape(true_players, n_frames_play)
        ym_1_mat = ym_raw_1_flat.reshape(true_players, n_frames_play)
        u1_mat = u1_obs.reshape(true_players, n_frames_play)
        v1_mat = v1_obs.reshape(true_players, n_frames_play)
        xm_gt_mat = xm_gt_flat.reshape(true_players, n_frames_play)
        ym_gt_mat = ym_gt_flat.reshape(true_players, n_frames_play)
        cf_mat = confs_flat.reshape(true_players, n_frames_play)
        x_yd_mat = x_yd_flat.reshape(true_players, n_frames_play)
        y_yd_mat = y_yd_flat.reshape(true_players, n_frames_play)

        zone_masks = {
            "Near": (x_yd_mat >= 10.0) & (x_yd_mat <= 110.0) & (y_yd_mat < 17.78),
            "Mid": (x_yd_mat >= 10.0) & (x_yd_mat <= 110.0) & (y_yd_mat >= 17.78) & (y_yd_mat <= 35.55),
            "Far": (x_yd_mat >= 10.0) & (x_yd_mat <= 110.0) & (y_yd_mat > 35.55),
            "End": (x_yd_mat < 10.0) | (x_yd_mat > 110.0),
        }

        for (ru, rv) in cells:
            err_sq, mahal_sq = run_play_kalman_aniso_batch(
                xm_1_mat, ym_1_mat, u1_mat, v1_mat, xm_gt_mat, ym_gt_mat, cf_mat,
                homography_obj, ru, rv,
            )
            if ru == rv and ru == 4.0:
                err_ref, mahal_ref = run_play_kalman_jacobian_batch(
                    xm_1_mat, ym_1_mat, u1_mat, v1_mat, xm_gt_mat, ym_gt_mat, cf_mat,
                    homography_obj, r_pixel_base=4.0,
                )
                d = max(
                    float(np.max(np.abs(err_sq - err_ref))),
                    float(np.max(np.abs(mahal_sq - mahal_ref))),
                )
                eq_max_abs = max(eq_max_abs, d)
                eq_checked += 1

            hits = mahal_sq <= CHI2_2_90
            a = acc[_cell_key(ru, rv)]
            for z_name, z_mask in zone_masks.items():
                n_z = int(np.sum(z_mask))
                if n_z > 0:
                    a["cov"][z_name].append(float(np.mean(hits[z_mask])))
                    a["rmse"][z_name].append(math.sqrt(float(np.mean(err_sq[z_mask]))))
                    a["obs"][z_name] += n_z
            a["play_rmse"].append(math.sqrt(float(np.mean(err_sq))))
            a["play_cov"].append(float(np.mean(hits)))

        if (pi + 1) % 100 == 0:
            write_results(final=False)
            print(f"[sweep] play {pi + 1}/{len(play_groups)} elapsed={round(time.time() - t0, 1)}s", flush=True)

    write_results(final=True)
    payload = json.loads(OUT_PATH.read_text(encoding="utf-8"))
    print(f"[sweep] done: valid={valid_plays} skipped={skipped_plays} obs={total_obs} "
          f"eq_checked={eq_checked} eq_max_abs={eq_max_abs}")
    print(f"[sweep] winners={len(payload['winners'])}")
    best = payload["best_cell"]
    if best:
        z = best["zones"]
        print("[sweep] best cell "
              f"r_u={best['r_u']} r_v={best['r_v']} "
              f"Near={z['Near']['mean_coverage']} Mid={z['Mid']['mean_coverage']} "
              f"Far={z['Far']['mean_coverage']} End={z['End']['mean_coverage']} "
              f"rmse={best['mean_play_rmse_m']} win={best['win']}")
    print(f"[sweep] wrote {OUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
