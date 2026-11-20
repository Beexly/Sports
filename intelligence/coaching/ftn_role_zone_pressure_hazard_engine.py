"""
Stream 15Q: Causal FTN x PBP Non-QB-Fault Pressure Survival Hazard,
Motion/Play-Action Interaction & Empirical-Bayes Snap Continuity Engine
========================================================================

Strictly causal (`week < as_of_week`) over cleared CC-BY-4.0 nflverse parquets:
  - `data/nflverse/pbp_2026_w1_w10.parquet`
  - `data/nflverse/ftn_charting_2026_w1_w10.parquet` (`nflverse_game_id == game_id`, `nflverse_play_id == play_id`)
  - `data/nflverse/snap_counts_2026_w1_w10.parquet`

Provides:
  1. Regularized logistic IRLS decomposition of true Non-QB-Fault OL pressure hazard
     (`(sack == 1 | qb_hit == 1) & ~is_qb_fault_sack`) across 32 offensive protections,
     32 defensive pass rushes, and FTN scheme covariates (blitz, 5+ rushers, play-action,
     motion, screen pass, blitz x PA interaction) with catalytic shrinkage.
  2. Opponent-matched Motion & Play-Action scheme vulnerability interaction (shrunk EPA lifts
     paired against opposing defense motion/PA EPA allowed).
  3. Empirical-Bayes recent-3-week starter snap continuity from `snap_counts_2026_w1_w10.parquet`.
  4. Strict play-level walk-forward OOS benchmark (Brier, Log-Loss, ECE, Paired EB-LCB) across
     2026 Weeks 4-10 to gate downstream simulator weights honestly.
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any, Dict, List, Mapping, Optional, Sequence, Tuple

import numpy as np
import pandas as pd

from evaluation.frozen.score_walkforward_calibration_v1 import (
    expected_calibration_error,
    paired_brier_empirical_bernstein_lcb,
)
from intelligence.coaching.pfr_learned_trench_scheme_contact_engine import normalize_nfl_team

REPO_ROOT = Path(__file__).resolve().parents[2]
PBP_2026_PATH = REPO_ROOT / "data" / "nflverse" / "pbp_2026_w1_w10.parquet"
FTN_2026_PATH = REPO_ROOT / "data" / "nflverse" / "ftn_charting_2026_w1_w10.parquet"
SNAP_2026_PATH = REPO_ROOT / "data" / "nflverse" / "snap_counts_2026_w1_w10.parquet"

LAMBDA_PRESS_TEAM = 75.0
LAMBDA_PRESS_COV = 25.0
K0_PRESS_PLAYS = 90.0
K0_SCHEME_PLAYS = 55.0

_FRAME_CACHE: Dict[str, pd.DataFrame] = {}
_PROFILE_CACHE: Dict[Optional[int], Dict[str, Any]] = {}


def _clamp(val: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, float(val)))


def _sigmoid(z: np.ndarray) -> np.ndarray:
    zc = np.clip(z, -12.0, 12.0)
    return 1.0 / (1.0 + np.exp(-zc))


def _load_merged_pbp_ftn() -> Tuple[pd.DataFrame, pd.DataFrame]:
    if "merged" not in _FRAME_CACHE:
        if PBP_2026_PATH.is_file() and FTN_2026_PATH.is_file():
            pbp = pd.read_parquet(
                PBP_2026_PATH,
                columns=[
                    "game_id",
                    "play_id",
                    "week",
                    "posteam",
                    "defteam",
                    "pass_attempt",
                    "rush_attempt",
                    "sack",
                    "qb_hit",
                    "epa",
                ],
            )
            ftn = pd.read_parquet(
                FTN_2026_PATH,
                columns=[
                    "nflverse_game_id",
                    "nflverse_play_id",
                    "n_defense_box",
                    "is_motion",
                    "is_play_action",
                    "is_screen_pass",
                    "n_blitzers",
                    "n_pass_rushers",
                    "is_qb_fault_sack",
                ],
            )
            merged = pbp.merge(
                ftn,
                left_on=["game_id", "play_id"],
                right_on=["nflverse_game_id", "nflverse_play_id"],
                how="inner",
            )
            merged["off_norm"] = merged["posteam"].map(lambda x: normalize_nfl_team(str(x or "")))
            merged["def_norm"] = merged["defteam"].map(lambda x: normalize_nfl_team(str(x or "")))
            merged = merged[(merged["off_norm"] != "") & (merged["def_norm"] != "")].copy()
            merged["is_blitz"] = (merged["n_blitzers"].fillna(0.0).astype(float) >= 1.0).astype(np.float64)
            merged["heavy_rush"] = (merged["n_pass_rushers"].fillna(4.0).astype(float) >= 5.0).astype(np.float64)
            merged["pa_f"] = merged["is_play_action"].fillna(False).astype(bool).astype(np.float64)
            merged["motion_f"] = merged["is_motion"].fillna(False).astype(bool).astype(np.float64)
            merged["screen_f"] = merged["is_screen_pass"].fillna(False).astype(bool).astype(np.float64)
            merged["blitz_pa"] = merged["is_blitz"] * merged["pa_f"]
            merged["ol_press"] = (
                ((merged["sack"].fillna(0.0) == 1) | (merged["qb_hit"].fillna(0.0) == 1))
                & (~merged["is_qb_fault_sack"].fillna(False).astype(bool))
            ).astype(np.float64)
            _FRAME_CACHE["merged"] = merged
        else:
            _FRAME_CACHE["merged"] = pd.DataFrame()

    if "snap" not in _FRAME_CACHE:
        if SNAP_2026_PATH.is_file():
            snap = pd.read_parquet(
                SNAP_2026_PATH,
                columns=["week", "player", "position", "team", "offense_pct", "defense_pct"],
            )
            snap["team_norm"] = snap["team"].map(lambda x: normalize_nfl_team(str(x or "")))
            snap = snap[snap["team_norm"] != ""].copy()
            _FRAME_CACHE["snap"] = snap
        else:
            _FRAME_CACHE["snap"] = pd.DataFrame()

    return _FRAME_CACHE["merged"], _FRAME_CACHE["snap"]


def _build_pressure_design(
    pass_df: pd.DataFrame,
    teams: Sequence[str],
    team_to_idx: Mapping[str, int],
) -> Tuple[np.ndarray, np.ndarray]:
    n = len(pass_df)
    t_cnt = len(teams)
    n_cov = 6  # is_blitz, heavy_rush, pa_f, motion_f, screen_f, blitz_pa
    X = np.zeros((n, 2 * t_cnt + n_cov), dtype=np.float64)

    offs = pass_df["off_norm"].to_numpy()
    defs = pass_df["def_norm"].to_numpy()
    for i, (ot, dt) in enumerate(zip(offs, defs)):
        oi = team_to_idx.get(str(ot))
        di = team_to_idx.get(str(dt))
        if oi is not None:
            X[i, oi] = 1.0
        if di is not None:
            X[i, t_cnt + di] = 1.0

    X[:, 2 * t_cnt + 0] = pass_df["is_blitz"].to_numpy(dtype=np.float64)
    X[:, 2 * t_cnt + 1] = pass_df["heavy_rush"].to_numpy(dtype=np.float64)
    X[:, 2 * t_cnt + 2] = pass_df["pa_f"].to_numpy(dtype=np.float64)
    X[:, 2 * t_cnt + 3] = pass_df["motion_f"].to_numpy(dtype=np.float64)
    X[:, 2 * t_cnt + 4] = pass_df["screen_f"].to_numpy(dtype=np.float64)
    X[:, 2 * t_cnt + 5] = pass_df["blitz_pa"].to_numpy(dtype=np.float64)
    y = pass_df["ol_press"].to_numpy(dtype=np.float64)
    return X, y


def _fit_irls_pressure_hazard(
    pass_df: pd.DataFrame,
    teams: Sequence[str],
    ref_week: int,
) -> Dict[str, Any]:
    t_cnt = len(teams)
    team_to_idx = {tm: i for i, tm in enumerate(teams)}
    if len(pass_df) < 50:
        return {
            "intercept": -1.73,
            "base_rate": 0.15,
            "cov_beta": np.zeros(6, dtype=np.float64),
            "off_prot_z": {t: 0.0 for t in teams},
            "def_press_z": {t: 0.0 for t in teams},
            "off_vuln_raw": {t: 0.0 for t in teams},
            "def_press_raw": {t: 0.0 for t in teams},
            "team_to_idx": team_to_idx,
            "cov_names": ("is_blitz", "heavy_rush", "pa_f", "motion_f", "screen_f", "blitz_pa"),
        }

    X, y = _build_pressure_design(pass_df, teams, team_to_idx)
    wks = pass_df["week"].to_numpy(dtype=np.float64)
    tw = np.exp(-0.06 * np.maximum(0.0, float(ref_week - 1) - wks))
    base_rate = float(np.clip(np.average(y, weights=tw), 0.02, 0.85))
    intercept = math.log(base_rate / (1.0 - base_rate))

    p_cols = X.shape[1]
    pen = np.empty(p_cols, dtype=np.float64)
    pen[: 2 * t_cnt] = LAMBDA_PRESS_TEAM
    pen[2 * t_cnt :] = LAMBDA_PRESS_COV

    beta = np.zeros(p_cols, dtype=np.float64)
    # 4 IRLS Newton-Raphson updates with ridge regularization
    for _ in range(4):
        eta = intercept + X @ beta
        mu = _sigmoid(eta)
        wt = np.maximum(1e-4, tw * mu * (1.0 - mu))
        z_resp = (y - mu) / np.maximum(1e-4, mu * (1.0 - mu))
        XtW = X.T * wt[None, :]
        gram = XtW @ X + np.diag(pen)
        rhs = XtW @ z_resp - pen * beta
        step = np.linalg.solve(gram, rhs)
        beta += step
        # Re-center weighted average log-odds around intercept
        intercept += float(np.average(y - _sigmoid(intercept + X @ beta), weights=tw)) * 0.25

    off_counts = {t: float((pass_df["off_norm"] == t).sum()) for t in teams}
    def_counts = {t: float((pass_df["def_norm"] == t).sum()) for t in teams}

    off_vuln_raw: Dict[str, float] = {}
    def_press_raw: Dict[str, float] = {}
    for tm in teams:
        idx = team_to_idx[tm]
        no = off_counts[tm]
        nd = def_counts[tm]
        off_vuln_raw[tm] = float(beta[idx]) * (no / (no + K0_PRESS_PLAYS))
        def_press_raw[tm] = float(beta[t_cnt + idx]) * (nd / (nd + K0_PRESS_PLAYS))

    # Positive off_prot_z means OL concedes LESS non-QB-fault pressure (better protection)
    off_arr = np.array([-off_vuln_raw[t] for t in teams], dtype=np.float64)
    off_m, off_s = float(np.mean(off_arr)), max(1e-8, float(np.std(off_arr)))
    off_prot_z = {
        tm: round(_clamp((-off_vuln_raw[tm] - off_m) / off_s, -3.0, 3.0), 6) for tm in teams
    }

    def_arr = np.array([def_press_raw[t] for t in teams], dtype=np.float64)
    def_m, def_s = float(np.mean(def_arr)), max(1e-8, float(np.std(def_arr)))
    def_press_z = {
        tm: round(_clamp((def_press_raw[tm] - def_m) / def_s, -3.0, 3.0), 6) for tm in teams
    }

    return {
        "intercept": float(intercept),
        "base_rate": float(base_rate),
        "cov_beta": beta[2 * t_cnt :].copy(),
        "off_prot_z": off_prot_z,
        "def_press_z": def_press_z,
        "off_vuln_raw": off_vuln_raw,
        "def_press_raw": def_press_raw,
        "team_to_idx": team_to_idx,
        "cov_names": ("is_blitz", "heavy_rush", "pa_f", "motion_f", "screen_f", "blitz_pa"),
    }


def _compute_motion_pa_and_eb_snap(
    pass_df: pd.DataFrame,
    snap_df: pd.DataFrame,
    teams: Sequence[str],
    ref_week: int,
) -> Dict[str, Dict[str, float]]:
    if pass_df.empty:
        return {
            t: {
                "off_motion_rate": 0.5,
                "off_pa_rate": 0.22,
                "off_scheme_lift_z": 0.0,
                "def_scheme_vuln_z": 0.0,
                "eb_snap_continuity_z": 0.0,
            }
            for t in teams
        }

    df = pass_df.copy()
    df["epa_clean"] = df["epa"].fillna(0.0).clip(-4.5, 4.5)
    off_raw_lift: Dict[str, float] = {}
    def_raw_vuln: Dict[str, float] = {}
    off_rates: Dict[str, Tuple[float, float]] = {}

    for tm in teams:
        od = df[df["off_norm"] == tm]
        dd = df[df["def_norm"] == tm]

        if len(od) >= 10:
            m_mask = od["motion_f"] > 0.5
            pa_mask = od["pa_f"] > 0.5
            m_rate = float(m_mask.mean())
            pa_rate = float(pa_mask.mean())
            m_lift = (
                float(od.loc[m_mask, "epa_clean"].mean() - od.loc[~m_mask, "epa_clean"].mean())
                if (m_mask.sum() >= 5 and (~m_mask).sum() >= 5)
                else 0.0
            )
            pa_lift = (
                float(od.loc[pa_mask, "epa_clean"].mean() - od.loc[~pa_mask, "epa_clean"].mean())
                if (pa_mask.sum() >= 5 and (~pa_mask).sum() >= 5)
                else 0.0
            )
            n_o = float(len(od))
            shrink_o = n_o / (n_o + K0_SCHEME_PLAYS)
            off_raw_lift[tm] = shrink_o * (0.55 * m_lift + 0.45 * pa_lift)
            off_rates[tm] = (m_rate, pa_rate)
        else:
            off_raw_lift[tm] = 0.0
            off_rates[tm] = (0.5, 0.22)

        if len(dd) >= 10:
            m_mask_d = dd["motion_f"] > 0.5
            pa_mask_d = dd["pa_f"] > 0.5
            dm_vuln = (
                float(dd.loc[m_mask_d, "epa_clean"].mean() - dd.loc[~m_mask_d, "epa_clean"].mean())
                if (m_mask_d.sum() >= 5 and (~m_mask_d).sum() >= 5)
                else 0.0
            )
            dpa_vuln = (
                float(dd.loc[pa_mask_d, "epa_clean"].mean() - dd.loc[~pa_mask_d, "epa_clean"].mean())
                if (pa_mask_d.sum() >= 5 and (~pa_mask_d).sum() >= 5)
                else 0.0
            )
            n_d = float(len(dd))
            shrink_d = n_d / (n_d + K0_SCHEME_PLAYS)
            def_raw_vuln[tm] = shrink_d * (0.55 * dm_vuln + 0.45 * dpa_vuln)
        else:
            def_raw_vuln[tm] = 0.0

    # Empirical-Bayes recent-3-week starter snap continuity vs earlier weeks
    raw_cont: Dict[str, float] = {t: 0.0 for t in teams}
    if not snap_df.empty and ref_week >= 3:
        rec_lo = max(1, ref_week - 3)
        sub_s = snap_df[snap_df["week"].astype(int) < ref_week].copy()
        if not sub_s.empty:
            sub_s["max_pct"] = np.maximum(
                sub_s["offense_pct"].fillna(0.0).astype(float),
                sub_s["defense_pct"].fillna(0.0).astype(float),
            )
            for tm in teams:
                ts = sub_s[sub_s["team_norm"] == tm]
                if ts.empty:
                    continue
                prior_ts = ts[ts["week"].astype(int) < rec_lo]
                recent_ts = ts[ts["week"].astype(int) >= rec_lo]
                if prior_ts.empty or recent_ts.empty:
                    continue
                prior_by_p = prior_ts.groupby("player")["max_pct"].mean()
                starters = prior_by_p[prior_by_p >= 0.45]
                if starters.empty:
                    continue
                recent_by_p = recent_ts.groupby("player")["max_pct"].mean()
                ratios: List[float] = []
                for pl, base_pct in starters.items():
                    rec_pct = float(recent_by_p.get(pl, 0.0))
                    ratios.append(_clamp(rec_pct / max(0.25, float(base_pct)), 0.0, 1.35))
                n_st = float(len(ratios))
                raw_ratio = sum(ratios) / n_st if n_st > 0 else 1.0
                # Shrink toward 0.88 typical retention across NFL rosters
                eb_ratio = (n_st / (n_st + 8.0)) * raw_ratio + (8.0 / (n_st + 8.0)) * 0.88
                raw_cont[tm] = eb_ratio - 0.88

    def _zmap(d: Dict[str, float]) -> Dict[str, float]:
        arr = np.array([d[t] for t in teams], dtype=np.float64)
        mu = float(np.mean(arr))
        sd = max(1e-8, float(np.std(arr)))
        return {t: round(_clamp((d[t] - mu) / sd, -3.0, 3.0), 6) for t in teams}

    off_z = _zmap(off_raw_lift)
    def_z = _zmap(def_raw_vuln)
    cont_z = _zmap(raw_cont)

    return {
        t: {
            "off_motion_rate": round(off_rates[t][0], 4),
            "off_pa_rate": round(off_rates[t][1], 4),
            "off_scheme_lift_z": off_z[t],
            "def_scheme_vuln_z": def_z[t],
            "eb_snap_continuity_z": cont_z[t],
        }
        for t in teams
    }


def compute_causal_15q_profiles(as_of_week: Optional[int] = None) -> Dict[str, Any]:
    """Compute strictly causal (`week < as_of_week`) 32-team Stream 15Q profiles."""
    if as_of_week in _PROFILE_CACHE:
        return _PROFILE_CACHE[as_of_week]

    merged, snap = _load_merged_pbp_ftn()
    if merged.empty:
        return {"available": False, "as_of_week": as_of_week or 1, "team_count": 0, "teams": {}}

    max_wk = int(merged["week"].max())
    ref_week = (max_wk + 1) if as_of_week is None else int(as_of_week)

    sub = merged[(merged["week"].astype(int) < ref_week) & (merged["pass_attempt"] == 1)].copy()
    all_teams = sorted({t for t in merged["off_norm"].unique().tolist() if len(t) in (2, 3)})
    if len(sub) < 50:
        return {
            "available": False,
            "as_of_week": ref_week,
            "team_count": len(all_teams),
            "teams": {},
        }

    press_fit = _fit_irls_pressure_hazard(sub, all_teams, ref_week)
    scheme_fit = _compute_motion_pa_and_eb_snap(sub, snap, all_teams, ref_week)

    teams_out: Dict[str, Dict[str, Any]] = {}
    for tm in all_teams:
        teams_out[tm] = {
            "off_ol_protection_z": press_fit["off_prot_z"][tm],
            "def_dl_pressure_z": press_fit["def_press_z"][tm],
            "off_ol_vuln_raw_logit": round(press_fit["off_vuln_raw"][tm], 6),
            "def_dl_press_raw_logit": round(press_fit["def_press_raw"][tm], 6),
            **scheme_fit[tm],
        }

    out = {
        "schema": "stream_15q_ftn_pressure_survival_and_motion_v1",
        "available": bool(teams_out),
        "as_of_week": ref_week,
        "train_pass_plays": len(sub),
        "team_count": len(teams_out),
        "pressure_intercept": round(press_fit["intercept"], 6),
        "pressure_base_rate": round(press_fit["base_rate"], 6),
        "pressure_cov_betas": {
            nm: round(float(b), 6) for nm, b in zip(press_fit["cov_names"], press_fit["cov_beta"])
        },
        "teams": teams_out,
    }
    _PROFILE_CACHE[as_of_week] = out
    return out


def _score_side(
    off_prof: Mapping[str, Any],
    opp_prof: Mapping[str, Any],
    context: Optional[Mapping[str, Any]] = None,
) -> Tuple[float, float, float]:
    ctx = context or {}
    is_indoor = bool(ctx.get("is_indoor", False))
    wind_mph = float(ctx.get("wind_mph", 0.0) or 0.0)
    wind_pass_damp = 1.0 if is_indoor else max(0.75, 1.0 - max(0.0, wind_mph - 12.0) * 0.015)

    # Higher off_ol_protection_z and lower opp def_dl_pressure_z => positive OL survival edge
    press_edge = _clamp(
        (float(off_prof.get("off_ol_protection_z", 0.0)) - float(opp_prof.get("def_dl_pressure_z", 0.0)))
        * 0.0065
        * wind_pass_damp,
        -0.025,
        0.025,
    )
    motion_pa_edge = _clamp(
        (
            0.55 * float(off_prof.get("off_scheme_lift_z", 0.0))
            + 0.45 * float(opp_prof.get("def_scheme_vuln_z", 0.0))
        )
        * 0.0060
        * wind_pass_damp,
        -0.025,
        0.025,
    )
    cont_edge = _clamp(
        (
            float(off_prof.get("eb_snap_continuity_z", 0.0))
            - float(opp_prof.get("eb_snap_continuity_z", 0.0))
        )
        * 0.0040,
        -0.020,
        0.020,
    )
    return round(press_edge, 6), round(motion_pa_edge, 6), round(cont_edge, 6)


def evaluate_causal_15q_matchup(
    away_team: str,
    home_team: str,
    context: Optional[Dict[str, Any]] = None,
    as_of_week: Optional[int] = None,
) -> Dict[str, Any]:
    """Symmetric, bounded Stream 15Q matchup bundle."""
    away_u = normalize_nfl_team(away_team)
    home_u = normalize_nfl_team(home_team)
    prof = compute_causal_15q_profiles(as_of_week=as_of_week)
    teams = prof.get("teams") or {}

    aw_prof = teams.get(away_u) or {}
    hm_prof = teams.get(home_u) or {}

    if aw_prof and hm_prof:
        aw_p, aw_m, aw_c = _score_side(aw_prof, hm_prof, context)
        hm_p, hm_m, hm_c = _score_side(hm_prof, aw_prof, context)
    else:
        aw_p = aw_m = aw_c = 0.0
        hm_p = hm_m = hm_c = 0.0

    # Continuity diff is exact mirror; net sum diff is strictly antisymmetric
    net_diff = round((aw_p + aw_m + aw_c) - (hm_p + hm_m + hm_c), 6)

    return {
        "schema": "stream_15q_ftn_pressure_survival_and_motion_v1",
        "available": bool(prof.get("available")),
        "as_of_week": prof.get("as_of_week"),
        "away_team": away_u,
        "home_team": home_u,
        "stream_15q_away_pressure_survival_edge": aw_p,
        "stream_15q_home_pressure_survival_edge": hm_p,
        "stream_15q_away_motion_pa_edge": aw_m,
        "stream_15q_home_motion_pa_edge": hm_m,
        "stream_15q_away_eb_continuity_edge": aw_c,
        "stream_15q_home_eb_continuity_edge": hm_c,
        "stream_15q_net_scheme_hazard_diff": net_diff,
        "away_profile": aw_prof,
        "home_profile": hm_prof,
    }


def evaluate_causal_15q_walkforward_oos(
    eval_weeks: Sequence[int] = tuple(range(4, 11)),
) -> Dict[str, Any]:
    """Strictly causal play-level walk-forward OOS test across 2026 `eval_weeks`:
    Tests IRLS FTN x PBP pressure survival model (`week < w` -> `week == w`) against:
      1. Causal league historical pressure base rate
      2. Raw unadjusted OL + DL sum pressure rate
    """
    merged, _ = _load_merged_pbp_ftn()
    if merged.empty:
        return {"available": False, "n_pass_plays": 0, "beats_baseline": False}

    y_all: List[int] = []
    p_base_all: List[float] = []
    p_raw_all: List[float] = []
    p_15q_all: List[float] = []
    per_week: Dict[int, Dict[str, Any]] = {}

    for wk in eval_weeks:
        wk_i = int(wk)
        train_p = merged[(merged["week"].astype(int) < wk_i) & (merged["pass_attempt"] == 1)]
        test_p = merged[(merged["week"].astype(int) == wk_i) & (merged["pass_attempt"] == 1)]
        if train_p.empty or test_p.empty:
            continue

        teams = sorted({t for t in merged["off_norm"].unique().tolist() if len(t) in (2, 3)})
        press_fit = _fit_irls_pressure_hazard(train_p, teams, wk_i)

        # Baseline 1: causal league rate; Baseline 2: naive raw unshrunk OL + DL sum
        mu0 = float(train_p["ol_press"].mean())
        raw_off = train_p.groupby("off_norm")["ol_press"].mean().to_dict()
        raw_def = train_p.groupby("def_norm")["ol_press"].mean().to_dict()

        X_test, y_test = _build_pressure_design(test_p, teams, press_fit["team_to_idx"])
        t_cnt = len(teams)
        beta_full = np.zeros(X_test.shape[1], dtype=np.float64)
        for tm, idx in press_fit["team_to_idx"].items():
            beta_full[idx] = press_fit["off_vuln_raw"][tm]
            beta_full[t_cnt + idx] = press_fit["def_press_raw"][tm]
        beta_full[2 * t_cnt :] = press_fit["cov_beta"]

        pred_15q = np.clip(_sigmoid(press_fit["intercept"] + X_test @ beta_full), 0.01, 0.99)
        offs = test_p["off_norm"].to_numpy()
        defs = test_p["def_norm"].to_numpy()

        wk_y = [int(v) for v in y_test]
        wk_base = [mu0] * len(wk_y)
        wk_raw = [
            float(np.clip(raw_off.get(str(o), mu0) + raw_def.get(str(d), mu0) - mu0, 0.02, 0.95))
            for o, d in zip(offs, defs)
        ]
        wk_15q = [float(p) for p in pred_15q]

        y_all.extend(wk_y)
        p_base_all.extend(wk_base)
        p_raw_all.extend(wk_raw)
        p_15q_all.extend(wk_15q)

        per_week[wk_i] = {
            "n_pass_plays": len(wk_y),
            "brier_base": round(float(np.mean((np.array(wk_base) - np.array(wk_y)) ** 2)), 6),
            "brier_raw_team": round(float(np.mean((np.array(wk_raw) - np.array(wk_y)) ** 2)), 6),
            "brier_15q_irls": round(float(np.mean((np.array(wk_15q) - np.array(wk_y)) ** 2)), 6),
        }

    yt = np.asarray(y_all, dtype=np.float64)
    pb = np.asarray(p_base_all, dtype=np.float64)
    pr = np.asarray(p_raw_all, dtype=np.float64)
    pq = np.clip(np.asarray(p_15q_all, dtype=np.float64), 1e-6, 1.0 - 1e-6)

    def _brier(p: np.ndarray) -> float:
        return float(np.mean((p - yt) ** 2))

    def _ll(p: np.ndarray) -> float:
        pc = np.clip(p, 1e-6, 1.0 - 1e-6)
        return float(-np.mean(yt * np.log(pc) + (1.0 - yt) * np.log(1.0 - pc)))

    b_base, b_raw, b_15q = _brier(pb), _brier(pr), _brier(pq)
    l_base, l_raw, l_15q = _ll(pb), _ll(pr), _ll(pq)
    ece_base = expected_calibration_error(y_all, p_base_all)
    ece_15q = expected_calibration_error(y_all, p_15q_all)
    eb_vs_base = paired_brier_empirical_bernstein_lcb(y_all, p_base_all, p_15q_all)
    eb_vs_raw = paired_brier_empirical_bernstein_lcb(y_all, p_raw_all, p_15q_all)

    # Secondary walk-forward OOS test on team-game pass EPA residuals for motion/PA & EB continuity
    _, snap = _load_merged_pbp_ftn()
    se_epa_base: List[float] = []
    se_epa_motion_pa: List[float] = []
    se_epa_eb_cont: List[float] = []
    teams_all = sorted({t for t in merged["off_norm"].unique().tolist() if len(t) in (2, 3)})
    for wk in eval_weeks:
        wk_i = int(wk)
        tr_p = merged[(merged["week"].astype(int) < wk_i) & (merged["pass_attempt"] == 1)]
        te_p = merged[(merged["week"].astype(int) == wk_i) & (merged["pass_attempt"] == 1)]
        if tr_p.empty or te_p.empty:
            continue
        mu_epa = float(tr_p["epa"].fillna(0.0).clip(-4.5, 4.5).mean())
        sch = _compute_motion_pa_and_eb_snap(tr_p, snap, teams_all, wk_i)
        grp = te_p.groupby(["off_norm", "def_norm"])["epa"].mean()
        for (ot, dt), obs_epa in grp.items():
            op = sch.get(str(ot)) or {}
            dp = sch.get(str(dt)) or {}
            # Small linear OOS delta around mu_epa from z-scores
            d_mpa = 0.020 * (0.55 * float(op.get("off_scheme_lift_z", 0.0)) + 0.45 * float(dp.get("def_scheme_vuln_z", 0.0)))
            d_eb = 0.015 * (float(op.get("eb_snap_continuity_z", 0.0)) - float(dp.get("eb_snap_continuity_z", 0.0)))
            y_e = float(obs_epa)
            se_epa_base.append((y_e - mu_epa) ** 2)
            se_epa_motion_pa.append((y_e - (mu_epa + d_mpa)) ** 2)
            se_epa_eb_cont.append((y_e - (mu_epa + d_eb)) ** 2)

    mse_epa_b = float(np.mean(se_epa_base)) if se_epa_base else 0.0
    mse_epa_mpa = float(np.mean(se_epa_motion_pa)) if se_epa_motion_pa else 0.0
    mse_epa_eb = float(np.mean(se_epa_eb_cont)) if se_epa_eb_cont else 0.0

    return {
        "schema": "stream_15q_walkforward_oos_v1",
        "eval_weeks": [int(w) for w in eval_weeks],
        "n_pass_plays": len(y_all),
        "n_team_offense_games": len(se_epa_base),
        "brier_baseline_mean": round(b_base, 6),
        "brier_raw_unadjusted_team": round(b_raw, 6),
        "brier_stream_15q_irls": round(b_15q, 6),
        "log_loss_baseline_mean": round(l_base, 6),
        "log_loss_raw_unadjusted_team": round(l_raw, 6),
        "log_loss_stream_15q_irls": round(l_15q, 6),
        "ece_baseline_mean": round(ece_base, 6),
        "ece_stream_15q_irls": round(ece_15q, 6),
        "eb_lcb_vs_baseline": eb_vs_base["lcb"],
        "eb_lcb_vs_raw_team": eb_vs_raw["lcb"],
        "pressure_hazard_beats_baseline": bool(b_15q < b_base and l_15q < l_base),
        "pressure_hazard_beats_raw_team": bool(b_15q < b_raw and l_15q < l_raw),
        "pass_epa_mse_baseline": round(mse_epa_b, 6),
        "pass_epa_mse_motion_pa": round(mse_epa_mpa, 6),
        "pass_epa_mse_eb_continuity": round(mse_epa_eb, 6),
        "motion_pa_beats_baseline": bool(mse_epa_mpa < mse_epa_b),
        "eb_continuity_beats_baseline": bool(mse_epa_eb < mse_epa_b),
        "per_week": per_week,
    }


__all__ = [
    "compute_causal_15q_profiles",
    "evaluate_causal_15q_matchup",
    "evaluate_causal_15q_walkforward_oos",
]
