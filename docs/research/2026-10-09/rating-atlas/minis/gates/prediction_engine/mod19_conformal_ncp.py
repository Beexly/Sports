#!/usr/bin/env python3
"""
Module 19: 1905-07886 — conformal-ncp-intervals (calibration family)

Gate spec (GATE-SPECS.md):
  (a) Tests a normalized-nonconformity (NCP) interval option and,
      independently, a per-market path-selection protocol over
      {plain CP, NCP} x point predictor.
  (b) Needs rolling-window (never random-split) calibration on ordered NFL
      data and a 2025 holdout with per-game dispersion estimates.
  (c) Pass = "ADOPT NCP if it achieves nominal coverage within 2pp AND mean
      width <= plain-CP width on the 2025 holdout; KEEP the path-selection
      protocol regardless (it is process, not a claim); REJECT the random-split
      calibration design outright -- never use it on ordered NFL data."

Implementation: rolling-window calibration on game-level margins.
Point predictor: spread-implied margin (spread_line -> expected margin).
Plain CP: absolute residual quantiles. NCP: residual / local dispersion where
dispersion = rolling std of recent residuals (per-game dispersion estimate).
Coverage target 90%.
"""
import json, os
import numpy as np
import pandas as pd

MODULE_ID = "1905-07886"
FAMILY = "calibration"
FILE = "calibration/1905-07886-conformal-ncp-intervals.ts"
DATA_DIR = os.environ.get("GSE_PBP_DIR", os.path.expanduser(
    "~/workspace/gse-discovery/symbolic-regression/data"))
TRAIN_SEASONS = [2020, 2021, 2022, 2023, 2024]
HOLDOUT_SEASON = 2025
ALPHA = 0.10  # 90% nominal coverage
ROLL = 200    # rolling calibration window (games)


def game_margins(season):
    p = os.path.join(DATA_DIR, f"pbp_{season}.parquet")
    if not os.path.exists(p):
        return None
    df = pd.read_parquet(p, columns=["game_id", "home_team", "away_team",
                                     "spread_line", "total_line", "result",
                                     "week"])
    g = df.groupby("game_id").first().reset_index()
    g = g.dropna(subset=["spread_line", "result"]).sort_values(
        ["week"]).reset_index(drop=True)
    # result > 0 means home team won; margin = home - away points unknown from pbp summary;
    # use spread residual proxy: predicted margin = -spread_line (fav negative)
    # actual margin unavailable at game grain here -> use score_differential at game end
    return g


def final_margins(season):
    p = os.path.join(DATA_DIR, f"pbp_{season}.parquet")
    if not os.path.exists(p):
        return None
    df = pd.read_parquet(p, columns=["game_id", "spread_line",
                                     "score_differential", "qtr"])
    # last play of game per game_id
    last = df.sort_values("qtr").groupby("game_id").tail(1)
    out = last[["game_id", "spread_line", "score_differential"]].dropna()
    return out.reset_index(drop=True)


def evaluate():
    tr_frames, ho = [], None
    for s in TRAIN_SEASONS:
        m = final_margins(s)
        if m is None:
            return stamp("NOT_EVALUATED", f"missing pbp_{s}.parquet")
        tr_frames.append(m)
    tr = pd.concat(tr_frames, ignore_index=True)
    ho = final_margins(HOLDOUT_SEASON)
    if ho is None:
        return stamp("NOT_EVALUATED", "missing pbp_2025.parquet (2025 holdout)")
    # point predictor: predicted home margin = -spread_line
    for d in (tr, ho):
        d["pred"] = -d["spread_line"].to_numpy()
        d["actual"] = d["score_differential"].to_numpy()
        d["resid"] = (d["actual"] - d["pred"]).to_numpy()
    cal_resid = tr["resid"].to_numpy()
    ho_resid = ho["resid"].to_numpy()
    ho_pred = ho["pred"].to_numpy()
    ho_actual = ho["actual"].to_numpy()
    n_ho = len(ho)
    # --- plain CP: fixed quantile of |resid| over rolling window ---
    plain_lo, plain_hi, plain_cov, plain_w = [], [], 0, []
    # --- NCP: residual scaled by rolling local dispersion ---
    ncp_cov, ncp_w = 0, []
    for i in range(n_ho):
        # rolling window from calibration tail + holdout history (ordered, never shuffled)
        hist = np.concatenate([cal_resid[-ROLL:], ho_resid[:i]])
        if len(hist) < 50:
            continue
        q_plain = np.quantile(np.abs(hist), 1 - ALPHA)
        lo, hi = ho_pred[i] - q_plain, ho_pred[i] + q_plain
        plain_cov += int(lo <= ho_actual[i] <= hi)
        plain_w.append(hi - lo)
        # NCP dispersion: rolling std of recent residuals
        disp = max(hist[-50:].std(), 1.0)
        scores = np.abs(hist) / np.maximum(
            pd.Series(hist).rolling(50, min_periods=10).std().bfill().to_numpy(), 1.0)
        q_ncp = np.quantile(scores[np.isfinite(scores)], 1 - ALPHA)
        w_ncp = q_ncp * disp
        nlo, nhi = ho_pred[i] - w_ncp, ho_pred[i] + w_ncp
        ncp_cov += int(nlo <= ho_actual[i] <= nhi)
        ncp_w.append(nhi - nlo)
    m = len(plain_w)
    if m < 50:
        return stamp("NOT_EVALUATED", f"holdout too small after warmup (m={m})")
    plain_cov /= m
    ncp_cov /= m
    plain_mw, ncp_mw = float(np.mean(plain_w)), float(np.mean(ncp_w))
    cov_ok = abs(ncp_cov - (1 - ALPHA)) <= 0.02
    width_ok = ncp_mw <= plain_mw
    verdict = "PASS" if (cov_ok and width_ok) else "FAIL"
    note = (f"NCP coverage {ncp_cov:.3f} within 2pp of 0.90 and width {ncp_mw:.2f} <= plain {plain_mw:.2f}"
            if verdict == "PASS" else
            f"NCP fails gate: coverage {ncp_cov:.3f} (need 0.88-0.92), width {ncp_mw:.2f} vs plain {plain_mw:.2f}")
    return stamp(verdict, note, {
        "n_holdout": m, "alpha": ALPHA,
        "plain_cp": {"coverage": round(plain_cov, 4), "mean_width": round(plain_mw, 2)},
        "ncp": {"coverage": round(ncp_cov, 4), "mean_width": round(ncp_mw, 2)},
        "path_selection_protocol": "KEPT (process, not a claim)",
        "random_split_design": "REJECTED (never use on ordered NFL data)"})


def stamp(verdict, note, extra=None):
    out = {"module": MODULE_ID, "family": FAMILY, "file": FILE,
           "verdict": verdict, "note": note,
           "gate": "2025 holdout: NCP coverage within 2pp AND width <= plain CP"}
    if extra:
        out.update(extra)
    return out


if __name__ == "__main__":
    print(json.dumps(evaluate(), indent=2))
