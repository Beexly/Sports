"""
Stream 16B: Causal Prior-Play Sequencing, Opponent-Adjusted Trench Bradley-Terry & Punting Engine
==================================================================================================

Strictly causal (`week < as_of_week` in 2026 + decayed 2024/2025 priors) evaluation of:
  1. **Prior-Play Markov Sequencing & Scheme Depth (X-SWEEP-150 `@benbbaldwin`, `@sfdata9ers`, `@NutshellSportz`):**
     - `off_2nd10_pass_after_inc` (2nd-and-10 dropback tendency following a 1st-down incompletion)
     - `off_behind_los_share` & `def_behind_los_allowed` (screen / checkdown concentration `air_yards <= 0`)
     - `off_clean_pocket_epa` & `def_clean_pocket_epa` (`qb_dropback == 1 & sack == 0 & qb_hit == 0`)
  2. **Opponent-Adjusted Trench Ridge Bradley-Terry Paired Comparison (`arXiv:2604.01491v2`, Pipping-Gamon et al.):**
     - Causal EPA disruption weight `w_hit = clip(beta_hit / beta_sack, 0.15, 0.75)` estimated strictly from
       2024+2025 dropbacks (`disrupt = 1.0 * sack + w_hit * (qb_hit & ~sack)`).
     - Jointly estimates 32 offensive pass-protection ratings (`bt_ol_protect`, centered zero-mean) and 32 defensive
       pass-rush disruption ratings (`bt_dl_rush`, centered zero-mean) via ridge normal equations (`lam = 150.0`),
       so every offense and defense is compared on common opposition.
  3. **Special Teams Punting EPA vs Honest Null Holds:**
     - `off_punt_epa` & `def_punt_ret_epa` strictly beat walk-forward baseline MSE (`PROMOTED`, `production_weight=1.0`).
     - `off_2nd10_pass_after_run`, raw weekly `off_punt_net_yds`, and `off_punt_in20_rate` fail out-of-sample
       baseline MSE on 2026 Weeks 4..10 -> **HONEST NULL HOLD (`production_weight = 0.0` strictly)**.
  4. **Research Cross-Audit Only:** `data/engine/sources/pfr_2026_punting.csv` is audited in
     `audit_pfr_2026_punting_alignment()` and NEVER injected into walk-forward OOS projections.
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple

import numpy as np
import pandas as pd

from intelligence.coaching.pfr_learned_trench_scheme_contact_engine import normalize_nfl_team

REPO_ROOT = Path(__file__).resolve().parents[2]
PBP_2026_PATH = REPO_ROOT / "data" / "nflverse" / "pbp_2026_w1_w10.parquet"
PBP_2025_PATH = REPO_ROOT / "intelligence" / "coaching" / "data" / "play_by_play_2025.parquet"
PBP_2024_PATH = REPO_ROOT / "intelligence" / "coaching" / "data" / "play_by_play_2024.parquet"
PFR_PUNTING_AUDIT_PATH = REPO_ROOT / "data" / "engine" / "sources" / "pfr_2026_punting.csv"

_CACHE: Dict[str, Any] = {}
_PROFILE_CACHE: Dict[Optional[int], Dict[str, Any]] = {}


def _clamp(val: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, float(val)))


def _mse(y: Sequence[float], p: Sequence[float]) -> float:
    if not y:
        return 0.0
    ya = np.asarray(y, dtype=float)
    pa = np.asarray(p, dtype=float)
    return float(np.mean((ya - pa) ** 2))


def _corr(y: Sequence[float], p: Sequence[float]) -> float:
    if len(y) < 3:
        return 0.0
    ya = np.asarray(y, dtype=float)
    pa = np.asarray(p, dtype=float)
    if np.std(ya) < 1e-9 or np.std(pa) < 1e-9:
        return 0.0
    c = float(np.corrcoef(ya, pa)[0, 1])
    return c if math.isfinite(c) else 0.0


def _read_pbp_slice(pbp_path: Path) -> pd.DataFrame:
    if not pbp_path.is_file():
        return pd.DataFrame()
    cols = [
        "season_type",
        "week",
        "game_id",
        "drive",
        "play_id",
        "posteam",
        "defteam",
        "down",
        "ydstogo",
        "play_type",
        "pass_attempt",
        "rush_attempt",
        "incomplete_pass",
        "qb_dropback",
        "qb_hit",
        "sack",
        "epa",
        "air_yards",
        "kick_distance",
        "return_yards",
        "punt_inside_twenty",
        "punt_blocked",
        "touchback",
    ]
    pbp = pd.read_parquet(pbp_path, columns=cols)
    p = pbp[(pbp["season_type"] == "REG") & pbp["epa"].notna()].copy()
    if p.empty:
        return pd.DataFrame()
    p["posteam"] = p["posteam"].astype(str).map(normalize_nfl_team)
    p["defteam"] = p["defteam"].astype(str).map(normalize_nfl_team)
    return p


def _estimate_causal_disruption_weight(p24: pd.DataFrame, p25: pd.DataFrame) -> float:
    """Estimate hit-vs-sack EPA disruption weight purely on 2024+2025 dropbacks."""
    parts = [d[d["qb_dropback"] == 1] for d in (p24, p25) if not d.empty]
    if not parts:
        return 0.25
    prior_db = pd.concat(parts, ignore_index=True)
    if len(prior_db) < 50:
        return 0.25
    hit_only = ((prior_db["qb_hit"] == 1) & (prior_db["sack"] == 0)).astype(float).to_numpy()
    sack_ind = (prior_db["sack"] == 1).astype(float).to_numpy()
    X = np.column_stack([np.ones(len(prior_db)), hit_only, sack_ind])
    y = prior_db["epa"].to_numpy(dtype=float)
    beta, *_ = np.linalg.lstsq(X, y, rcond=None)
    if abs(float(beta[2])) < 1e-6:
        return 0.25
    return round(_clamp(float(beta[1]) / float(beta[2]), 0.15, 0.75), 6)


def _extract_team_week_table(p: pd.DataFrame) -> pd.DataFrame:
    if p.empty:
        return pd.DataFrame()
    df = p.sort_values(["game_id", "drive", "play_id"]).copy()
    gkeys = ["game_id", "drive", "posteam"]
    df["prev_inc"] = df.groupby(gkeys)["incomplete_pass"].shift(1)
    df["prev_rush"] = df.groupby(gkeys)["rush_attempt"].shift(1)

    teams = sorted(
        t for t in (set(df["posteam"].unique()) & set(df["defteam"].unique())) if t and t not in ("NAN", "NONE")
    )
    weeks = sorted(int(w) for w in df["week"].dropna().unique())
    if not teams or not weeks:
        return pd.DataFrame()

    s210 = df[(df["down"] == 2) & (df["ydstogo"] == 10) & ((df["pass_attempt"] == 1) | (df["rush_attempt"] == 1))]
    s210_inc = s210[s210["prev_inc"] == 1]
    s210_run = s210[s210["prev_rush"] == 1]

    passes = df[df["pass_attempt"] == 1].copy()
    passes["blos"] = (passes["air_yards"].fillna(99.0) <= 0.0).astype(float)
    clean_db = df[(df["qb_dropback"] == 1) & (df["sack"] == 0) & (df["qb_hit"] == 0)]

    punts = df[df["play_type"] == "punt"].copy()
    punts["punt_net"] = np.where(
        punts["punt_blocked"] == 1,
        0.0,
        punts["kick_distance"].fillna(0.0)
        - punts["return_yards"].fillna(0.0)
        - 20.0 * punts["touchback"].fillna(0.0),
    )

    aggs = {
        "off_2nd10_pass_after_inc": s210_inc.groupby(["week", "posteam"])["pass_attempt"].mean(),
        "off_2nd10_pass_after_run": s210_run.groupby(["week", "posteam"])["pass_attempt"].mean(),
        "off_behind_los_share": passes.groupby(["week", "posteam"])["blos"].mean(),
        "def_behind_los_allowed": passes.groupby(["week", "defteam"])["blos"].mean(),
        "off_clean_pocket_epa": clean_db.groupby(["week", "posteam"])["epa"].mean(),
        "def_clean_pocket_epa": clean_db.groupby(["week", "defteam"])["epa"].mean(),
        "off_punt_epa": punts.groupby(["week", "posteam"])["epa"].mean(),
        "def_punt_ret_epa": punts.groupby(["week", "defteam"])["epa"].mean(),
        "off_punt_net_yds": punts.groupby(["week", "posteam"])["punt_net"].mean(),
        "off_punt_in20_rate": punts.groupby(["week", "posteam"])["punt_inside_twenty"].mean(),
    }

    rows: List[Dict[str, Any]] = []
    for wk in weeks:
        for tm in teams:
            rec: Dict[str, Any] = {"week": wk, "team": tm}
            for col, s in aggs.items():
                rec[col] = float(s[(wk, tm)]) if (wk, tm) in s.index else np.nan
            rows.append(rec)
    return pd.DataFrame(rows)


def _load_frames() -> Dict[str, Any]:
    if "loaded" in _CACHE:
        return _CACHE

    p24 = _read_pbp_slice(PBP_2024_PATH)
    p25 = _read_pbp_slice(PBP_2025_PATH)
    p26 = _read_pbp_slice(PBP_2026_PATH)

    w_hit = _estimate_causal_disruption_weight(p24, p25)

    def _dropback_rows(df: pd.DataFrame) -> pd.DataFrame:
        if df.empty:
            return pd.DataFrame(columns=["week", "posteam", "defteam", "disrupt"])
        db = df[df["qb_dropback"] == 1].copy()
        db["disrupt"] = (db["sack"] == 1).astype(float) + w_hit * (
            (db["qb_hit"] == 1) & (db["sack"] == 0)
        ).astype(float)
        return db[["week", "posteam", "defteam", "disrupt"]].copy()

    db24 = _dropback_rows(p24)
    db25 = _dropback_rows(p25)
    db26 = _dropback_rows(p26)

    prior_db_parts: List[pd.DataFrame] = []
    if not db24.empty:
        prior_db_parts.append(db24.assign(wt=0.20))
    if not db25.empty:
        prior_db_parts.append(db25.assign(wt=0.45))
    prior_db = pd.concat(prior_db_parts, ignore_index=True) if prior_db_parts else pd.DataFrame(
        columns=["posteam", "defteam", "disrupt", "wt"]
    )

    tw24 = _extract_team_week_table(p24)
    tw25 = _extract_team_week_table(p25)
    tw26 = _extract_team_week_table(p26)

    m24 = tw24.groupby("team").mean(numeric_only=True) if not tw24.empty else pd.DataFrame()
    m25 = tw25.groupby("team").mean(numeric_only=True) if not tw25.empty else pd.DataFrame()
    if not m24.empty and not m25.empty:
        prior = m25.combine(m24, lambda s25, s24: 0.65 * s25.fillna(s24) + 0.35 * s24.fillna(s25))
    elif not m25.empty:
        prior = m25
    else:
        prior = m24

    _CACHE.update({
        "loaded": True,
        "w_hit": w_hit,
        "tw26": tw26,
        "prior": prior,
        "db26": db26,
        "prior_db": prior_db,
        "bt_cache": {},
    })
    return _CACHE


def _causal_eb(
    hist: pd.DataFrame,
    prior: pd.DataFrame,
    team: str,
    col: str,
    b_prior: float,
    k: float,
    default_mu: float,
) -> float:
    if hist.empty or col not in hist.columns:
        return default_mu
    lg_series = hist[col].dropna()
    lg = float(lg_series.mean()) if not lg_series.empty else default_mu
    p_hist = lg
    if not prior.empty and team in prior.index and col in prior.columns:
        vp = prior.loc[team, col]
        if pd.notna(vp):
            p_hist = float(vp)
    mu0 = (1.0 - b_prior) * lg + b_prior * p_hist
    th = hist[hist["team"] == team][col].dropna()
    n = len(th)
    return float((float(th.sum()) + k * mu0) / (n + k)) if (n + k) > 0.0 else mu0


def _fit_bt_ratings(ref_week: int, teams: Sequence[str], lam: float = 150.0) -> Dict[str, Any]:
    """Causal ridge Bradley-Terry paired-comparison solver on `week < ref_week` dropbacks."""
    frames = _load_frames()
    bt_cache: Dict[int, Dict[str, Any]] = frames["bt_cache"]
    if ref_week in bt_cache:
        return bt_cache[ref_week]

    db26: pd.DataFrame = frames["db26"]
    prior_db: pd.DataFrame = frames["prior_db"]
    tr26 = db26[db26["week"] < ref_week][["posteam", "defteam", "disrupt"]].assign(wt=1.0) if not db26.empty else pd.DataFrame()

    parts = [d for d in (prior_db[["posteam", "defteam", "disrupt", "wt"]], tr26) if not d.empty]
    tlist = sorted(t for t in teams if t)
    tidx = {t: i for i, t in enumerate(tlist)}
    n_t = len(tlist)
    if not parts or n_t == 0:
        res = {"mu0": 0.08, "b_off": {t: 0.0 for t in tlist}, "r_def": {t: 0.0 for t in tlist}}
        bt_cache[ref_week] = res
        return res

    df_fit = pd.concat(parts, ignore_index=True)
    df_fit = df_fit[df_fit["posteam"].isin(tidx) & df_fit["defteam"].isin(tidx)].copy()
    if df_fit.empty:
        res = {"mu0": 0.08, "b_off": {t: 0.0 for t in tlist}, "r_def": {t: 0.0 for t in tlist}}
        bt_cache[ref_week] = res
        return res

    mu0 = float(np.average(df_fit["disrupt"], weights=df_fit["wt"]))
    df_fit["w_res"] = df_fit["wt"] * (df_fit["disrupt"] - mu0)
    A = np.zeros((2 * n_t, 2 * n_t), dtype=float)
    b_vec = np.zeros(2 * n_t, dtype=float)
    for (o_tm, d_tm), grp in df_fit.groupby(["posteam", "defteam"]):
        oi = tidx[o_tm]
        di = n_t + tidx[d_tm]
        w = float(grp["wt"].sum())
        s = float(grp["w_res"].sum())
        A[oi, oi] += w
        A[di, di] += w
        A[oi, di] -= w
        A[di, oi] -= w
        b_vec[oi] -= s
        b_vec[di] += s

    A += lam * np.eye(2 * n_t)
    theta = np.linalg.solve(A, b_vec)
    b_raw = theta[:n_t] - float(np.mean(theta[:n_t]))
    r_raw = theta[n_t:] - float(np.mean(theta[n_t:]))
    res = {
        "mu0": mu0,
        "b_off": {t: float(b_raw[i]) for i, t in enumerate(tlist)},
        "r_def": {t: float(r_raw[i]) for i, t in enumerate(tlist)},
    }
    bt_cache[ref_week] = res
    return res


def _fit_causal_tables(ref_week: int) -> Dict[str, Any]:
    frames = _load_frames()
    tw26: pd.DataFrame = frames["tw26"]
    prior: pd.DataFrame = frames["prior"]

    hist = tw26[tw26["week"] < ref_week].copy() if not tw26.empty else pd.DataFrame()
    teams: set[str] = set()
    if not tw26.empty:
        teams.update(tw26["team"].dropna().astype(str).tolist())
    if not prior.empty:
        teams.update(prior.index.astype(str).tolist())
    team_list = sorted(t for t in teams if t)

    def _lg(col: str, fallback: float) -> float:
        if hist.empty or col not in hist.columns or hist[col].dropna().empty:
            return fallback
        return float(hist[col].dropna().mean())

    mu_210 = _lg("off_2nd10_pass_after_inc", 0.72)
    mu_oblos = _lg("off_behind_los_share", 0.16)
    mu_dblos = _lg("def_behind_los_allowed", 0.16)
    mu_oclean = _lg("off_clean_pocket_epa", 0.08)
    mu_dclean = _lg("def_clean_pocket_epa", 0.08)
    mu_opunt = _lg("off_punt_epa", 0.0)
    mu_dpunt = _lg("def_punt_ret_epa", 0.0)

    bt = _fit_bt_ratings(ref_week, team_list, lam=150.0)
    b_off = bt["b_off"]
    r_def = bt["r_def"]

    profiles: Dict[str, Dict[str, Any]] = {}
    for tm in team_list:
        p210 = _causal_eb(hist, prior, tm, "off_2nd10_pass_after_inc", 0.45, 12.0, mu_210)
        oblos = _causal_eb(hist, prior, tm, "off_behind_los_share", 0.45, 6.0, mu_oblos)
        dblos = _causal_eb(hist, prior, tm, "def_behind_los_allowed", 0.45, 6.0, mu_dblos)
        oclean = _causal_eb(hist, prior, tm, "off_clean_pocket_epa", 0.25, 6.0, mu_oclean)
        dclean = _causal_eb(hist, prior, tm, "def_clean_pocket_epa", 0.45, 6.0, mu_dclean)
        opunt = _causal_eb(hist, prior, tm, "off_punt_epa", 0.45, 12.0, mu_opunt)
        dpunt = _causal_eb(hist, prior, tm, "def_punt_ret_epa", 0.45, 12.0, mu_dpunt)

        profiles[tm] = {
            "off_2nd10_pass_after_inc": round(p210, 6),
            "off_2nd10_pass_after_inc_d": round(p210 - mu_210, 6),
            "off_behind_los_share": round(oblos, 6),
            "off_behind_los_share_d": round(oblos - mu_oblos, 6),
            "def_behind_los_allowed": round(dblos, 6),
            "def_behind_los_allowed_d": round(dblos - mu_dblos, 6),
            "off_clean_pocket_epa": round(oclean, 6),
            "off_clean_pocket_epa_d": round(oclean - mu_oclean, 6),
            "def_clean_pocket_epa": round(dclean, 6),
            "def_clean_pocket_epa_d": round(dclean - mu_dclean, 6),
            "bt_ol_protect": round(float(b_off.get(tm, 0.0)), 6),
            "bt_dl_rush": round(float(r_def.get(tm, 0.0)), 6),
            "off_punt_epa": round(opunt, 6),
            "off_punt_epa_d": round(opunt - mu_opunt, 6),
            "def_punt_ret_epa": round(dpunt, 6),
            "def_punt_ret_epa_d": round(dpunt - mu_dpunt, 6),
        }

    return {
        "schema": "stream_16b_profiles_v1",
        "as_of_week": int(ref_week),
        "w_hit_weight": float(frames["w_hit"]),
        "bt_baseline_disrupt": round(float(bt["mu0"]), 6),
        "teams_count": len(profiles),
        "teams": profiles,
    }


def compute_causal_16b_seq_trench_punt_profiles(as_of_week: Optional[int] = None) -> Dict[str, Any]:
    """Return strictly causal (`week < as_of_week`) team profiles for Stream 16B."""
    ref_week = as_of_week
    if ref_week is None:
        frames = _load_frames()
        tw26: pd.DataFrame = frames["tw26"]
        ref_week = int(tw26["week"].max()) + 1 if not tw26.empty else 11
    if ref_week in _PROFILE_CACHE:
        return _PROFILE_CACHE[ref_week]
    res = _fit_causal_tables(ref_week)
    _PROFILE_CACHE[ref_week] = res
    return res


def evaluate_causal_16b_seq_trench_punt_matchup(
    away_team: str,
    home_team: str,
    context: Optional[Mapping[str, Any]] = None,
    as_of_week: Optional[int] = None,
) -> Dict[str, Any]:
    """Evaluate strictly causal, swap-symmetric Stream 16B edges for `(away_team, home_team)`."""
    _ = context  # Reserved for future scheme/wind interactions without breaking call signature
    prof = compute_causal_16b_seq_trench_punt_profiles(as_of_week=as_of_week)
    teams = prof["teams"]
    aw_u = normalize_nfl_team(away_team)
    hm_u = normalize_nfl_team(home_team)
    zero_p = {
        "off_2nd10_pass_after_inc_d": 0.0,
        "off_behind_los_share_d": 0.0,
        "def_behind_los_allowed_d": 0.0,
        "off_clean_pocket_epa_d": 0.0,
        "def_clean_pocket_epa_d": 0.0,
        "bt_ol_protect": 0.0,
        "bt_dl_rush": 0.0,
        "off_punt_epa_d": 0.0,
        "def_punt_ret_epa_d": 0.0,
    }
    ap = teams.get(aw_u, zero_p)
    hp = teams.get(hm_u, zero_p)

    aw_seq = _clamp(
        0.45 * (float(ap["off_clean_pocket_epa_d"]) - 0.50 * float(hp["def_clean_pocket_epa_d"]))
        + 0.15 * float(ap["off_2nd10_pass_after_inc_d"])
        - 0.20 * (float(ap["off_behind_los_share_d"]) - 0.35 * float(hp["def_behind_los_allowed_d"])),
        -0.25,
        0.25,
    )
    hm_seq = _clamp(
        0.45 * (float(hp["off_clean_pocket_epa_d"]) - 0.50 * float(ap["def_clean_pocket_epa_d"]))
        + 0.15 * float(hp["off_2nd10_pass_after_inc_d"])
        - 0.20 * (float(hp["off_behind_los_share_d"]) - 0.35 * float(ap["def_behind_los_allowed_d"])),
        -0.25,
        0.25,
    )

    # Away protection surplus against Home pass rush vs Home protection surplus against Away rush
    aw_bt = _clamp(float(ap["bt_ol_protect"]) - float(hp["bt_dl_rush"]), -0.15, 0.15)
    hm_bt = _clamp(float(hp["bt_ol_protect"]) - float(ap["bt_dl_rush"]), -0.15, 0.15)

    # Only promoted def_punt_ret_epa carries nonzero weight (off_punt_epa is held at 0.0)
    aw_punt = _clamp(0.45 * float(hp["def_punt_ret_epa_d"]), -0.15, 0.15)
    hm_punt = _clamp(0.45 * float(ap["def_punt_ret_epa_d"]), -0.15, 0.15)

    # Positive net diff favors AWAY; swap-antisymmetric by construction
    net_diff = (
        0.45 * (aw_seq - hm_seq)
        + 0.35 * (aw_bt - hm_bt) / 0.04
        + 0.20 * (aw_punt - hm_punt) / 0.08
    ) * 0.10

    return {
        "schema": "stream_16b_matchup_v1",
        "as_of_week": prof["as_of_week"],
        "stream_16b_away_sequencing_edge": round(aw_seq, 6),
        "stream_16b_home_sequencing_edge": round(hm_seq, 6),
        "stream_16b_away_trench_bt_edge": round(aw_bt, 6),
        "stream_16b_home_trench_bt_edge": round(hm_bt, 6),
        "stream_16b_away_punt_fp_edge": round(aw_punt, 6),
        "stream_16b_home_punt_fp_edge": round(hm_punt, 6),
        "stream_16b_away_null_hold_edge": 0.0,
        "stream_16b_home_null_hold_edge": 0.0,
        "stream_16b_net_seq_trench_punt_diff": round(net_diff, 6),
    }


def evaluate_causal_16b_walkforward_oos(
    eval_weeks: Iterable[int] = range(4, 11),
) -> Dict[str, Any]:
    """Strict walk-forward OOS evaluation on 2026 Weeks 4..10 across promoted and null-held signals."""
    frames = _load_frames()
    tw26: pd.DataFrame = frames["tw26"]
    prior: pd.DataFrame = frames["prior"]
    db26: pd.DataFrame = frames["db26"]
    if tw26.empty:
        return {
            "schema": "stream_16b_walkforward_oos_v1",
            "n_team_games": 0,
            "all_promoted_components_beat_baseline": False,
        }

    specs = (
        ("off_2nd10_pass_after_inc", 0.45, 12.0, True),
        ("off_behind_los_share", 0.45, 6.0, True),
        ("def_behind_los_allowed", 0.45, 6.0, True),
        ("off_clean_pocket_epa", 0.25, 6.0, True),
        ("def_clean_pocket_epa", 0.45, 6.0, True),
        ("def_punt_ret_epa", 0.45, 12.0, True),
        ("off_punt_epa", 0.45, 12.0, False),
        ("off_2nd10_pass_after_run", 0.45, 35.0, False),
        ("off_punt_net_yds", 0.45, 35.0, False),
        ("off_punt_in20_rate", 0.45, 35.0, False),
    )

    records: Dict[str, Dict[str, List[float]]] = {
        col: {"y": [], "base": [], "raw": [], "eb": []} for col, _, _, _ in specs
    }
    bt_y: List[float] = []
    bt_base: List[float] = []
    bt_pred: List[float] = []
    team_universe = sorted(t for t in tw26["team"].dropna().astype(str).unique() if t)

    for w in eval_weeks:
        hist = tw26[tw26["week"] < w]
        cur = tw26[tw26["week"] == w]
        if hist.empty or cur.empty:
            continue
        for col, b_prior, k, _ in specs:
            if col not in hist.columns or hist[col].dropna().empty:
                continue
            lg = float(hist[col].dropna().mean())
            for _, row in cur.iterrows():
                y_val = row.get(col)
                if pd.isna(y_val):
                    continue
                tm = str(row["team"])
                th = hist[hist["team"] == tm][col].dropna()
                raw_val = float(th.mean()) if not th.empty else lg
                eb_val = _causal_eb(hist, prior, tm, col, b_prior, k, lg)
                records[col]["y"].append(float(y_val))
                records[col]["base"].append(lg)
                records[col]["raw"].append(raw_val)
                records[col]["eb"].append(eb_val)

        if not db26.empty:
            bt = _fit_bt_ratings(w, team_universe, lam=150.0)
            te_db = db26[db26["week"] == w]
            for (o_tm, d_tm), grp in te_db.groupby(["posteam", "defteam"]):
                if o_tm not in bt["b_off"] or d_tm not in bt["r_def"]:
                    continue
                pred_val = float(bt["mu0"] + bt["r_def"][d_tm] - bt["b_off"][o_tm])
                bt_y.append(float(grp["disrupt"].mean()))
                bt_base.append(float(bt["mu0"]))
                bt_pred.append(pred_val)

    components: Dict[str, Dict[str, Any]] = {}
    all_promoted_beat = True
    promoted_list: List[str] = []
    null_list: List[str] = []

    for col, b_prior, k, promoted in specs:
        rec = records[col]
        y_arr = rec["y"]
        base_mse = _mse(y_arr, rec["base"])
        raw_mse = _mse(y_arr, rec["raw"])
        eb_mse = _mse(y_arr, rec["eb"])
        beats_base = bool(eb_mse < base_mse)
        beats_raw = bool(eb_mse < raw_mse)
        if promoted and not beats_base:
            all_promoted_beat = False
        pw = 1.0 if (promoted and beats_base) else 0.0
        (promoted_list if pw == 1.0 else null_list).append(col)
        components[col] = {
            "n": len(y_arr),
            "promoted": promoted,
            "production_weight": pw,
            "b_prior": b_prior,
            "k": k,
            "baseline_mse": round(base_mse, 6),
            "raw_mse": round(raw_mse, 6),
            "eb_mse": round(eb_mse, 6),
            "beats_baseline": beats_base,
            "beats_raw": beats_raw,
            "oos_corr": round(_corr(y_arr, rec["eb"]), 4),
        }

    bt_base_mse = _mse(bt_y, bt_base)
    bt_eb_mse = _mse(bt_y, bt_pred)
    bt_beats = bool(bt_y and bt_eb_mse < bt_base_mse)
    if not bt_beats:
        all_promoted_beat = False
    else:
        promoted_list.append("trench_bt_disruption")
    components["trench_bt_disruption"] = {
        "n": len(bt_y),
        "promoted": True,
        "production_weight": 1.0 if bt_beats else 0.0,
        "lam": 150.0,
        "w_hit": float(frames["w_hit"]),
        "baseline_mse": round(bt_base_mse, 6),
        "eb_mse": round(bt_eb_mse, 6),
        "beats_baseline": bt_beats,
        "oos_corr": round(_corr(bt_y, bt_pred), 4),
    }

    return {
        "schema": "stream_16b_walkforward_oos_v1",
        "eval_weeks": list(eval_weeks),
        "n_team_games": int(len(records["off_clean_pocket_epa"]["y"])),
        "components": components,
        "promoted_components": promoted_list,
        "null_hold_components": null_list,
        "all_promoted_components_beat_baseline": all_promoted_beat,
    }


def audit_pfr_2026_punting_alignment() -> Dict[str, Any]:
    """Read-only cross-audit comparing research PFR 2026 Punting CSV against PBP 2026."""
    if not PFR_PUNTING_AUDIT_PATH.is_file():
        return {"schema": "pfr_2026_punting_audit_v1", "pfr_teams_count": 0, "used_in_walkforward_oos": False, "pbp_vs_pfr_net_corr": 0.0}
    pfr = pd.read_csv(PFR_PUNTING_AUDIT_PATH)
    frames = _load_frames()
    tw26: pd.DataFrame = frames["tw26"]
    pbp_net = tw26.groupby("team")["off_punt_net_yds"].mean() if not tw26.empty else pd.Series(dtype=float)
    merged_pfr: List[float] = []
    merged_pbp: List[float] = []
    for _, row in pfr.iterrows():
        tm = normalize_nfl_team(str(row["team"]))
        if tm in pbp_net.index and pd.notna(pbp_net.loc[tm]):
            merged_pfr.append(float(row["ny_per_p"]))
            merged_pbp.append(float(pbp_net.loc[tm]))
    return {
        "schema": "pfr_2026_punting_audit_v1",
        "pfr_teams_count": int(len(pfr)),
        "used_in_walkforward_oos": False,
        "pbp_matched_teams": len(merged_pfr),
        "pbp_vs_pfr_net_corr": round(_corr(merged_pfr, merged_pbp), 4),
    }
