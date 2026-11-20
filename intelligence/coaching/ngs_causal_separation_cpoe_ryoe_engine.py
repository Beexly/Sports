"""
Stream 15S: Causal Next Gen Stats (NGS) Separation, YACOE, CPOE & RYOE Engine
==============================================================================

Strictly causal (`week < as_of_week` in 2026 + decayed 2025 structural prior; `week >= 1`
always enforced) Empirical-Bayes skill estimator built over cleared CC-BY-4.0 nflverse
Next Gen Stats parquets:
  - `data/nflverse/ngs_passing_2025_2026_w1_w10.parquet` (CPOE, time-to-throw, sticks)
  - `data/nflverse/ngs_receiving_2025_2026_w1_w10.parquet` (separation, YACOE, cushion)
  - `data/nflverse/ngs_rushing_2025_2026_w1_w10.parquet` (RYOE/att, efficiency, 8+ box %)

Outputs:
  1. `compute_causal_15s_ngs_profiles(as_of_week=None)`: 32-team & player-level shrunk NGS
     z-scores clamped cleanly in `[-3.0, 3.0]`.
  2. `evaluate_causal_15s_ngs_matchup(away_team, home_team, context=None, as_of_week=None)`:
     strictly swap-symmetric bounded conditioners + antisymmetric net diff.
  3. `evaluate_causal_15s_walkforward_oos(eval_weeks=range(4, 11))`: out-of-sample walk-forward
     benchmark against realized `stats_player_week_2026_w1_w10.parquet` EPA/opportunity so
     downstream simulator weights activate ONLY on OOS-validated sub-components.
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any, Dict, List, Mapping, Optional, Sequence, Tuple

import numpy as np
import pandas as pd

from intelligence.coaching.pfr_learned_trench_scheme_contact_engine import normalize_nfl_team

REPO_ROOT = Path(__file__).resolve().parents[2]
NGS_PASS_PATH = REPO_ROOT / "data" / "nflverse" / "ngs_passing_2025_2026_w1_w10.parquet"
NGS_REC_PATH = REPO_ROOT / "data" / "nflverse" / "ngs_receiving_2025_2026_w1_w10.parquet"
NGS_RUSH_PATH = REPO_ROOT / "data" / "nflverse" / "ngs_rushing_2025_2026_w1_w10.parquet"
STATS_PW_2026_PATH = REPO_ROOT / "data" / "nflverse" / "stats_player_week_2026_w1_w10.parquet"
STATS_PW_2025_PATH = REPO_ROOT / "data" / "nflverse" / "stats_player_week_2025.parquet"

_DF_CACHE: Dict[str, pd.DataFrame] = {}
_PROFILE_CACHE: Dict[Optional[int], Dict[str, Any]] = {}


def _clamp(val: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, float(val)))


def _load_ngs_frames() -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    specs = (
        ("pass", NGS_PASS_PATH, ["season", "week", "team_abbr", "player_gsis_id", "attempts", "completion_percentage_above_expectation", "avg_time_to_throw", "avg_air_yards_to_sticks"]),
        ("rec", NGS_REC_PATH, ["season", "week", "team_abbr", "player_gsis_id", "targets", "avg_separation", "avg_yac_above_expectation", "avg_cushion"]),
        ("rush", NGS_RUSH_PATH, ["season", "week", "team_abbr", "player_gsis_id", "rush_attempts", "rush_yards_over_expected_per_att", "efficiency", "percent_attempts_gte_eight_defenders"]),
    )
    for key, path, cols in specs:
        if key not in _DF_CACHE:
            if path.is_file():
                df = pd.read_parquet(path, columns=cols)
                df = df[df["week"].astype(int) >= 1].copy()
                df["team_norm"] = df["team_abbr"].map(lambda x: normalize_nfl_team(str(x or "")))
                df = df[df["team_norm"] != ""].copy()
                _DF_CACHE[key] = df
            else:
                _DF_CACHE[key] = pd.DataFrame(columns=cols + ["team_norm"])
    return _DF_CACHE["pass"], _DF_CACHE["rec"], _DF_CACHE["rush"]


def _load_stats_pw() -> Tuple[pd.DataFrame, pd.DataFrame]:
    cols = [
        "player_id",
        "position",
        "season",
        "week",
        "team",
        "attempts",
        "sacks_suffered",
        "passing_epa",
        "carries",
        "rushing_epa",
        "targets",
        "receiving_epa",
    ]
    if "pw25" not in _DF_CACHE:
        _DF_CACHE["pw25"] = pd.read_parquet(STATS_PW_2025_PATH, columns=cols) if STATS_PW_2025_PATH.is_file() else pd.DataFrame(columns=cols)
    if "pw26" not in _DF_CACHE:
        _DF_CACHE["pw26"] = pd.read_parquet(STATS_PW_2026_PATH, columns=cols) if STATS_PW_2026_PATH.is_file() else pd.DataFrame(columns=cols)
    return _DF_CACHE["pw25"], _DF_CACHE["pw26"]


def _causal_slice(df: pd.DataFrame, ref_week: int, decay_2025: float = 0.35) -> pd.DataFrame:
    if df.empty:
        return df
    is25 = df["season"].astype(int) == 2025
    is26 = (df["season"].astype(int) == 2026) & (df["week"].astype(int) < ref_week)
    sub = df[is25 | is26].copy()
    if sub.empty:
        return sub
    wk = sub["week"].astype(float)
    tw = np.where(
        sub["season"].astype(int) == 2025,
        decay_2025 * np.exp(-0.025 * np.maximum(0.0, 22.0 - wk)),
        np.exp(-0.06 * np.maximum(0.0, float(ref_week - 1) - wk)),
    )
    sub["time_weight"] = tw
    return sub


def _zmap(vals: Mapping[str, float], teams: Sequence[str]) -> Dict[str, float]:
    arr = np.array([float(vals.get(t, 0.0)) for t in teams], dtype=np.float64)
    mu = float(np.mean(arr)) if len(arr) else 0.0
    sd = max(1e-8, float(np.std(arr))) if len(arr) else 1.0
    return {t: round(_clamp((float(vals.get(t, 0.0)) - mu) / sd, -3.0, 3.0), 6) for t in teams}


def compute_causal_15s_ngs_profiles(as_of_week: Optional[int] = None) -> Dict[str, Any]:
    """Fit causal (`week < as_of_week`) Empirical-Bayes NGS Passing, Receiving & Rushing profiles."""
    if as_of_week in _PROFILE_CACHE:
        return _PROFILE_CACHE[as_of_week]

    df_p, df_r, df_ru = _load_ngs_frames()
    if df_p.empty and df_r.empty and df_ru.empty:
        return {"available": False, "as_of_week": as_of_week or 1, "team_count": 0, "teams": {}, "players": {}}

    max_wk = 10
    if not df_p.empty and (df_p["season"] == 2026).any():
        max_wk = int(df_p.loc[df_p["season"] == 2026, "week"].max())
    ref_week = (max_wk + 1) if as_of_week is None else int(as_of_week)

    sub_p = _causal_slice(df_p, ref_week)
    sub_r = _causal_slice(df_r, ref_week)
    sub_ru = _causal_slice(df_ru, ref_week)

    all_teams = sorted(
        {
            t
            for d in (df_p, df_r, df_ru)
            if not d.empty
            for t in d["team_norm"].unique().tolist()
            if len(t) in (2, 3)
        }
    )

    # 1. Passing CPOE & pocket decisiveness per player and team
    player_cpoe: Dict[str, float] = {}
    team_pass_raw: Dict[str, float] = {t: 0.0 for t in all_teams}
    if not sub_p.empty:
        sub_p["wt"] = sub_p["attempts"].fillna(0.0).astype(float) * sub_p["time_weight"]
        for pid, grp in sub_p.groupby("player_gsis_id"):
            w = grp["wt"].to_numpy(dtype=np.float64)
            ws = float(np.sum(w))
            if ws <= 0.0:
                continue
            cpoe_val = grp["completion_percentage_above_expectation"].fillna(0.0).to_numpy(dtype=np.float64)
            m_cpoe = float(np.sum(w * cpoe_val) / ws)
            player_cpoe[str(pid)] = round(m_cpoe * (ws / (ws + 180.0)), 6)
        for tm, grp in sub_p.groupby("team_norm"):
            w = grp["wt"].to_numpy(dtype=np.float64)
            ws = float(np.sum(w))
            if ws > 0.0 and str(tm) in team_pass_raw:
                c_m = float(np.sum(w * grp["completion_percentage_above_expectation"].fillna(0.0).to_numpy()) / ws)
                ttt = float(np.sum(w * grp["avg_time_to_throw"].fillna(2.75).to_numpy()) / ws)
                # Fast release slightly boosts protection; CPOE normalized on percentage scale
                raw_score = (c_m / 6.0) - 0.12 * (ttt - 2.75)
                team_pass_raw[str(tm)] = raw_score * (ws / (ws + 220.0))

    # 2. Receiving separation & YACOE per player and team
    player_sep_yacoe: Dict[str, float] = {}
    team_rec_raw: Dict[str, float] = {t: 0.0 for t in all_teams}
    if not sub_r.empty:
        sub_r["wt"] = sub_r["targets"].fillna(0.0).astype(float) * sub_r["time_weight"]
        sep_mu = float(np.average(sub_r["avg_separation"].fillna(2.9), weights=np.maximum(0.01, sub_r["wt"])))
        yac_mu = float(np.average(sub_r["avg_yac_above_expectation"].fillna(0.0), weights=np.maximum(0.01, sub_r["wt"])))
        for pid, grp in sub_r.groupby("player_gsis_id"):
            w = grp["wt"].to_numpy(dtype=np.float64)
            ws = float(np.sum(w))
            if ws <= 0.0:
                continue
            s_v = float(np.sum(w * grp["avg_separation"].fillna(sep_mu).to_numpy()) / ws) - sep_mu
            y_v = float(np.sum(w * grp["avg_yac_above_expectation"].fillna(yac_mu).to_numpy()) / ws) - yac_mu
            player_sep_yacoe[str(pid)] = round((0.60 * s_v + 0.40 * (y_v / 3.0)) * (ws / (ws + 36.0)), 6)
        for tm, grp in sub_r.groupby("team_norm"):
            w = grp["wt"].to_numpy(dtype=np.float64)
            ws = float(np.sum(w))
            if ws > 0.0 and str(tm) in team_rec_raw:
                s_v = float(np.sum(w * grp["avg_separation"].fillna(sep_mu).to_numpy()) / ws) - sep_mu
                y_v = float(np.sum(w * grp["avg_yac_above_expectation"].fillna(yac_mu).to_numpy()) / ws) - yac_mu
                team_rec_raw[str(tm)] = (0.55 * s_v + 0.45 * (y_v / 3.0)) * (ws / (ws + 120.0))

    # 3. Rushing RYOE/att & efficiency per player and team
    player_ryoe: Dict[str, float] = {}
    team_rush_raw: Dict[str, float] = {t: 0.0 for t in all_teams}
    if not sub_ru.empty:
        sub_ru["wt"] = sub_ru["rush_attempts"].fillna(0.0).astype(float) * sub_ru["time_weight"]
        ry_mu = float(np.average(sub_ru["rush_yards_over_expected_per_att"].fillna(0.0), weights=np.maximum(0.01, sub_ru["wt"])))
        eff_mu = float(np.average(sub_ru["efficiency"].fillna(4.0), weights=np.maximum(0.01, sub_ru["wt"])))
        for pid, grp in sub_ru.groupby("player_gsis_id"):
            w = grp["wt"].to_numpy(dtype=np.float64)
            ws = float(np.sum(w))
            if ws <= 0.0:
                continue
            r_v = float(np.sum(w * grp["rush_yards_over_expected_per_att"].fillna(ry_mu).to_numpy()) / ws) - ry_mu
            # Lower efficiency metric in NGS actually reflects straighter north-south running
            eff_bonus = -(float(np.sum(w * grp["efficiency"].fillna(eff_mu).to_numpy()) / ws) - eff_mu) * 0.25
            player_ryoe[str(pid)] = round((r_v + eff_bonus) * (ws / (ws + 55.0)), 6)
        for tm, grp in sub_ru.groupby("team_norm"):
            w = grp["wt"].to_numpy(dtype=np.float64)
            ws = float(np.sum(w))
            if ws > 0.0 and str(tm) in team_rush_raw:
                r_v = float(np.sum(w * grp["rush_yards_over_expected_per_att"].fillna(ry_mu).to_numpy()) / ws) - ry_mu
                eff_bonus = -(float(np.sum(w * grp["efficiency"].fillna(eff_mu).to_numpy()) / ws) - eff_mu) * 0.20
                team_rush_raw[str(tm)] = (r_v + eff_bonus) * (ws / (ws + 130.0))

    pz = _zmap(team_pass_raw, all_teams)
    rz = _zmap(team_rec_raw, all_teams)
    ruz = _zmap(team_rush_raw, all_teams)

    teams_out = {
        tm: {
            "ngs_pass_cpoe_z": pz[tm],
            "ngs_rec_sep_yacoe_z": rz[tm],
            "ngs_rush_ryoe_z": ruz[tm],
        }
        for tm in all_teams
    }

    out = {
        "schema": "stream_15s_ngs_causal_separation_cpoe_ryoe_v1",
        "available": bool(teams_out),
        "as_of_week": ref_week,
        "team_count": len(teams_out),
        "teams": teams_out,
        "players": {
            "pass_cpoe_eb": player_cpoe,
            "rec_sep_yacoe_eb": player_sep_yacoe,
            "rush_ryoe_eb": player_ryoe,
        },
    }
    _PROFILE_CACHE[as_of_week] = out
    return out


def evaluate_causal_15s_ngs_matchup(
    away_team: str,
    home_team: str,
    context: Optional[Dict[str, Any]] = None,
    as_of_week: Optional[int] = None,
) -> Dict[str, Any]:
    """Strictly swap-symmetric, bounded Stream 15S NGS matchup bundle."""
    away_u = normalize_nfl_team(away_team)
    home_u = normalize_nfl_team(home_team)
    ctx = context or {}
    is_indoor = bool(ctx.get("is_indoor", False))
    wind_mph = float(ctx.get("wind_mph", 6.5) or 6.5)
    wind_pass_damp = 1.0 if is_indoor else max(0.75, 1.0 - max(0.0, wind_mph - 12.0) * 0.015)

    prof = compute_causal_15s_ngs_profiles(as_of_week=as_of_week)
    teams = prof.get("teams") or {}
    aw = teams.get(away_u) or {}
    hm = teams.get(home_u) or {}

    if aw and hm:
        aw_p = round(_clamp(float(aw["ngs_pass_cpoe_z"]) * 0.0065 * wind_pass_damp, -0.025, 0.025), 6)
        hm_p = round(_clamp(float(hm["ngs_pass_cpoe_z"]) * 0.0065 * wind_pass_damp, -0.025, 0.025), 6)
        aw_r = round(_clamp(float(aw["ngs_rec_sep_yacoe_z"]) * 0.0055 * wind_pass_damp, -0.025, 0.025), 6)
        hm_r = round(_clamp(float(hm["ngs_rec_sep_yacoe_z"]) * 0.0055 * wind_pass_damp, -0.025, 0.025), 6)
        aw_ru = round(_clamp(float(aw["ngs_rush_ryoe_z"]) * 0.0055, -0.025, 0.025), 6)
        hm_ru = round(_clamp(float(hm["ngs_rush_ryoe_z"]) * 0.0055, -0.025, 0.025), 6)
    else:
        aw_p = hm_p = aw_r = hm_r = aw_ru = hm_ru = 0.0

    net_diff = round((aw_p + aw_r + aw_ru) - (hm_p + hm_r + hm_ru), 6)
    return {
        "schema": "stream_15s_ngs_causal_separation_cpoe_ryoe_v1",
        "available": bool(prof.get("available")),
        "as_of_week": prof.get("as_of_week"),
        "away_team": away_u,
        "home_team": home_u,
        "stream_15s_away_ngs_pass_cpoe_edge": aw_p,
        "stream_15s_home_ngs_pass_cpoe_edge": hm_p,
        "stream_15s_away_ngs_rec_sep_yacoe_edge": aw_r,
        "stream_15s_home_ngs_rec_sep_yacoe_edge": hm_r,
        "stream_15s_away_ngs_rush_ryoe_edge": aw_ru,
        "stream_15s_home_ngs_rush_ryoe_edge": hm_ru,
        "stream_15s_net_ngs_skill_diff": net_diff,
    }


def evaluate_causal_15s_walkforward_oos(
    eval_weeks: Sequence[int] = tuple(range(4, 11)),
) -> Dict[str, Any]:
    """Strictly causal OOS evaluation across 2026 Weeks 4-10 predicting next-week
    player EPA/opportunity (`passing_epa/att`, `receiving_epa/tgt`, `rushing_epa/carry`)
    using prior NGS EB skill vs causal league mean and unshrunk raw prior EPA/opp.
    """
    pw25, pw26 = _load_stats_pw()
    if pw26.empty:
        return {"available": False}

    # Family configs: (name, pos_tuple, opp_col, epa_col, ngs_key, min_opp, scale_coef)
    families = (
        ("pass_cpoe", ("QB",), "attempts", "passing_epa", "pass_cpoe_eb", 10.0, 0.012),
        ("rec_sep_yacoe", ("WR", "TE"), "targets", "receiving_epa", "rec_sep_yacoe_eb", 2.0, 0.080),
        ("rush_ryoe", ("RB", "FB"), "carries", "rushing_epa", "rush_ryoe_eb", 5.0, 0.045),
    )

    summary: Dict[str, Any] = {}
    for fname, poss, opp_c, epa_c, ngs_k, min_opp, scale_c in families:
        y_obs_l: List[float] = []
        w_l: List[float] = []
        pred_base_l: List[float] = []
        pred_raw_l: List[float] = []
        pred_15s_l: List[float] = []

        for wk in eval_weeks:
            wk_i = int(wk)
            ngs_prof = compute_causal_15s_ngs_profiles(as_of_week=wk_i)
            ngs_map = (ngs_prof.get("players") or {}).get(ngs_k) or {}

            tr26 = pw26[(pw26["week"].astype(int) < wk_i) & (pw26["position"].isin(poss))]
            tr25 = pw25[pw25["position"].isin(poss)] if not pw25.empty else pd.DataFrame()
            tr = pd.concat([tr25, tr26], ignore_index=True)
            te = pw26[(pw26["week"].astype(int) == wk_i) & (pw26["position"].isin(poss))]
            if tr.empty or te.empty:
                continue

            tr_opps = tr[opp_c].fillna(0.0).to_numpy(dtype=np.float64)
            tr_epas = tr[epa_c].fillna(0.0).to_numpy(dtype=np.float64)
            valid_tr = tr_opps >= min_opp
            if valid_tr.sum() < 10:
                continue
            mu0 = float(np.sum(tr_epas[valid_tr]) / max(1.0, float(np.sum(tr_opps[valid_tr]))))

            # Unshrunk player mean from prior 2026 only (or all prior)
            raw_pid_num: Dict[str, float] = {}
            raw_pid_den: Dict[str, float] = {}
            for pid, op, ep in zip(tr26["player_id"].astype(str), tr26[opp_c].fillna(0.0), tr26[epa_c].fillna(0.0)):
                if op > 0:
                    raw_pid_num[pid] = raw_pid_num.get(pid, 0.0) + float(ep)
                    raw_pid_den[pid] = raw_pid_den.get(pid, 0.0) + float(op)

            for pid, op, ep in zip(te["player_id"].astype(str), te[opp_c].fillna(0.0), te[epa_c].fillna(0.0)):
                if float(op) < min_opp or not math.isfinite(float(ep)):
                    continue
                y_val = float(np.clip(float(ep) / max(1.0, float(op)), -1.75, 1.75))
                raw_d = raw_pid_den.get(pid, 0.0)
                p_raw = float(np.clip(raw_pid_num[pid] / raw_d, -1.5, 1.5)) if raw_d >= min_opp else mu0
                ngs_val = float(ngs_map.get(pid, 0.0))
                # Shrink player residual modestly + add causal NGS prior
                p_shrunk_hist = mu0 + (raw_d / (raw_d + 80.0)) * (p_raw - mu0)
                p_15s = float(np.clip(p_shrunk_hist + scale_c * ngs_val, -1.5, 1.5))

                y_obs_l.append(y_val)
                w_l.append(float(op))
                pred_base_l.append(mu0)
                pred_raw_l.append(p_raw)
                pred_15s_l.append(p_15s)

        wa = np.asarray(w_l, dtype=np.float64)
        ya = np.asarray(y_obs_l, dtype=np.float64)
        pb = np.asarray(pred_base_l, dtype=np.float64)
        pr = np.asarray(pred_raw_l, dtype=np.float64)
        ps = np.asarray(pred_15s_l, dtype=np.float64)

        wmse_b = float(np.average((pb - ya) ** 2, weights=wa)) if len(wa) else 0.0
        wmse_r = float(np.average((pr - ya) ** 2, weights=wa)) if len(wa) else 0.0
        wmse_s = float(np.average((ps - ya) ** 2, weights=wa)) if len(wa) else 0.0
        corr_s = float(np.corrcoef(ps, ya)[0, 1]) if len(ya) > 3 else 0.0
        if not math.isfinite(corr_s):
            corr_s = 0.0

        summary[fname] = {
            "n_obs": len(y_obs_l),
            "wmse_baseline_mean": round(wmse_b, 6),
            "wmse_unshrunk_raw": round(wmse_r, 6),
            "wmse_stream_15s_ngs": round(wmse_s, 6),
            "oos_corr": round(corr_s, 6),
            "beats_baseline": bool(wmse_s < wmse_b),
            "beats_unshrunk_raw": bool(wmse_s < wmse_r),
        }

    return {
        "schema": "stream_15s_walkforward_oos_v1",
        "eval_weeks": [int(w) for w in eval_weeks],
        "families": summary,
        "any_family_beats_baseline": any(v.get("beats_baseline") for v in summary.values()),
    }


__all__ = [
    "compute_causal_15s_ngs_profiles",
    "evaluate_causal_15s_ngs_matchup",
    "evaluate_causal_15s_walkforward_oos",
]
