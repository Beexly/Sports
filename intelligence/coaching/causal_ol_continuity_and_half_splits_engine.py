"""
Stream 15Z: Causal OL Snap Continuity, Sack Resilience & 1H/2H Split Engine
=========================================================================

Strictly causal (`week < as_of_week` in 2026 + decayed 2024/2025 priors) evaluation
of 5-man offensive line snap continuity, sack-rate prevention/creation, clean 1st-half
vs competitive 2nd-half efficiency, and honest null holds (`raw_halftime_swing` and
`def_expl_allowed`), built over cleared CC-BY-4.0 nflverse datasets:
  - `data/nflverse/snap_counts_2026_w1_w10.parquet` (`14,004` rows)
  - `data/nflverse/pbp_2026_w1_w10.parquet` (`season_type == 'REG'`)
  - `intelligence/coaching/data/play_by_play_2025.parquet`
  - `intelligence/coaching/data/play_by_play_2024.parquet`

Key Empirical Insights (`eval_weeks = 4..10`, `n = 166..204` Team-Games):
  1. **Promoted Signal 1 (`ol_shared_prev_wk`, `k=6`):** Week-over-week shared snap
     fraction across the 5 OL positions persists walk-forward (`base=0.014405 ->
     eb=0.013986`, `corr=+0.1776`) and beats unshrunk raw (`0.015748`). -> **PROMOTED** (`+0.20`).
  2. **Promoted Signal 2 (`off_sack_rate`, `def_sack_rate`, `b_prior=0.45`):** Dropback
     sack avoidance (`0.002311 -> 0.002160`, `corr=+0.2533`) and defensive sack creation
     (`0.002311 -> 0.002249`, `corr=+0.1519`) beat league baselines and raw. -> **PROMOTED** (`+0.30`).
  3. **Promoted Signal 3 (`off_h1_epa`, `def_h2_comp_epa`, `b_prior=0.45`):** Clean
     1st-half neutral execution (`0.059306 -> 0.056227`, `corr=+0.2151`) and competitive
     2nd-half defensive holds (`0.287870 -> 0.270085`, `corr=+0.2478`) carry clean signal
     for `1H`/`2H` derivatives. -> **PROMOTED** (`+0.25`).
  4. **Verified Null Holds (`production_weight = 0.0` strictly):**
     - `raw_halftime_swing` (`off_h2_raw - off_h1` unadjusted swing): fails OOS baseline
       (`0.096334 > 0.095087`), confirming "halftime adjustments" mostly reflect game script.
     - `def_expl_allowed` (`>=15yd` explosive rate allowed): fails OOS baseline
       (`0.001620 > 0.001617`, `corr=+0.0231`). -> **NULL HOLD (`0.0`)**.

Outputs:
  1. `compute_causal_15z_ol_half_profiles(as_of_week=None)`
  2. `evaluate_causal_15z_ol_half_matchup(away_team, home_team, context=None, as_of_week=None)`
  3. `evaluate_causal_15z_walkforward_oos(eval_weeks=range(4, 11))`
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence

import numpy as np
import pandas as pd

from intelligence.coaching.pfr_learned_trench_scheme_contact_engine import normalize_nfl_team

REPO_ROOT = Path(__file__).resolve().parents[2]
SNAPS_2026_PATH = REPO_ROOT / "data" / "nflverse" / "snap_counts_2026_w1_w10.parquet"
PBP_2026_PATH = REPO_ROOT / "data" / "nflverse" / "pbp_2026_w1_w10.parquet"
PBP_2025_PATH = REPO_ROOT / "intelligence" / "coaching" / "data" / "play_by_play_2025.parquet"
PBP_2024_PATH = REPO_ROOT / "intelligence" / "coaching" / "data" / "play_by_play_2024.parquet"

_CACHE: Dict[str, Any] = {}
_PROFILE_CACHE: Dict[Optional[int], Dict[str, Any]] = {}
_OL_POSITIONS = frozenset({"T", "G", "C", "OT", "OG", "OL"})


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


def _compute_ol_continuity(snaps_path: Path) -> pd.DataFrame:
    if not snaps_path.is_file():
        return pd.DataFrame(columns=["week", "team", "ol_shared_prev_wk"])
    cols = ["week", "team", "player", "position", "offense_pct"]
    snaps = pd.read_parquet(snaps_path, columns=cols)
    ol = snaps[snaps["position"].isin(_OL_POSITIONS)].copy()
    if ol.empty:
        return pd.DataFrame(columns=["week", "team", "ol_shared_prev_wk"])
    ol["team"] = ol["team"].astype(str).map(normalize_nfl_team)
    ol_wk = ol.groupby(["week", "team", "player"], as_index=False)["offense_pct"].mean()
    rows: List[Dict[str, Any]] = []
    for (tm, wk), g in ol_wk.groupby(["team", "week"]):
        if int(wk) <= 1:
            continue
        prev = ol_wk[(ol_wk["team"] == tm) & (ol_wk["week"] == int(wk) - 1)]
        if prev.empty:
            continue
        merged = g.merge(prev, on="player", how="outer", suffixes=("_cur", "_prev")).fillna(0.0)
        shared = float(np.minimum(merged["offense_pct_cur"], merged["offense_pct_prev"]).sum()) / 5.0
        rows.append({"week": int(wk), "team": str(tm), "ol_shared_prev_wk": _clamp(shared, 0.0, 1.0)})
    return pd.DataFrame(rows)


def _extract_pbp_team_week(pbp_path: Path) -> pd.DataFrame:
    if not pbp_path.is_file():
        return pd.DataFrame()
    cols = [
        "season_type",
        "week",
        "posteam",
        "defteam",
        "epa",
        "pass_attempt",
        "rush_attempt",
        "qb_dropback",
        "sack",
        "qtr",
        "wp",
        "yards_gained",
    ]
    pbp = pd.read_parquet(pbp_path, columns=cols)
    p = pbp[
        (pbp["season_type"] == "REG")
        & pbp["epa"].notna()
        & ((pbp["pass_attempt"] == 1) | (pbp["rush_attempt"] == 1))
    ].copy()
    if p.empty:
        return pd.DataFrame()

    p["posteam"] = p["posteam"].astype(str).map(normalize_nfl_team)
    p["defteam"] = p["defteam"].astype(str).map(normalize_nfl_team)
    p["is_comp"] = p["wp"].between(0.15, 0.85)
    p["is_h1"] = p["qtr"].isin([1, 2])
    p["is_h2"] = p["qtr"].isin([3, 4])
    p["is_expl15"] = (p["yards_gained"].fillna(0) >= 15).astype(float)

    db = p[p["qb_dropback"] == 1]
    so = (
        db.groupby(["week", "posteam"], as_index=False)
        .agg(off_sack_rate=("sack", "mean"))
        .rename(columns={"posteam": "team"})
    )
    sd = (
        db.groupby(["week", "defteam"], as_index=False)
        .agg(def_sack_rate=("sack", "mean"))
        .rename(columns={"defteam": "team"})
    )
    h1o = (
        p[p["is_h1"] & p["is_comp"]]
        .groupby(["week", "posteam"], as_index=False)
        .agg(off_h1_epa=("epa", "mean"))
        .rename(columns={"posteam": "team"})
    )
    h1o_raw = (
        p[p["is_h1"]]
        .groupby(["week", "posteam"], as_index=False)
        .agg(off_h1_raw=("epa", "mean"))
        .rename(columns={"posteam": "team"})
    )
    h2o_raw = (
        p[p["is_h2"]]
        .groupby(["week", "posteam"], as_index=False)
        .agg(off_h2_raw=("epa", "mean"))
        .rename(columns={"posteam": "team"})
    )
    dh2 = (
        p[p["is_h2"] & p["is_comp"]]
        .groupby(["week", "defteam"], as_index=False)
        .agg(def_h2_comp_epa=("epa", "mean"))
        .rename(columns={"defteam": "team"})
    )
    de = (
        p.groupby(["week", "defteam"], as_index=False)
        .agg(def_expl_allowed=("is_expl15", "mean"))
        .rename(columns={"defteam": "team"})
    )

    out = so.merge(sd, on=["week", "team"], how="outer")
    for part in (h1o, h1o_raw, h2o_raw, dh2, de):
        out = out.merge(part, on=["week", "team"], how="outer")
    out["raw_halftime_swing"] = out["off_h2_raw"] - out["off_h1_raw"]
    return out


def _load_frames() -> Dict[str, Any]:
    if "loaded" in _CACHE:
        return _CACHE

    tw24 = _extract_pbp_team_week(PBP_2024_PATH)
    tw25 = _extract_pbp_team_week(PBP_2025_PATH)
    tw26 = _extract_pbp_team_week(PBP_2026_PATH)
    ol26 = _compute_ol_continuity(SNAPS_2026_PATH)
    if not tw26.empty and not ol26.empty:
        tw26 = tw26.merge(ol26, on=["week", "team"], how="left")
    elif not tw26.empty:
        tw26["ol_shared_prev_wk"] = np.nan

    m24 = tw24.groupby("team").mean(numeric_only=True) if not tw24.empty else pd.DataFrame()
    m25 = tw25.groupby("team").mean(numeric_only=True) if not tw25.empty else pd.DataFrame()
    if not m24.empty and not m25.empty:
        prior = m25.combine(m24, lambda s25, s24: 0.65 * s25.fillna(s24) + 0.35 * s24.fillna(s25))
    elif not m25.empty:
        prior = m25
    else:
        prior = m24

    _CACHE.update(
        {
            "loaded": True,
            "tw26": tw26,
            "prior": prior,
            "ol_rows": int(len(ol26)),
        }
    )
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

    def _lg(col: str, fallback: float) -> float:
        if hist.empty or col not in hist.columns or hist[col].dropna().empty:
            return fallback
        return float(hist[col].dropna().mean())

    mu_ol = _lg("ol_shared_prev_wk", 0.895)
    mu_off_sack = _lg("off_sack_rate", 0.068)
    mu_def_sack = _lg("def_sack_rate", 0.068)
    mu_h1 = _lg("off_h1_epa", 0.0)
    mu_dh2 = _lg("def_h2_comp_epa", 0.0)

    profiles: Dict[str, Dict[str, Any]] = {}
    for tm in sorted(teams):
        if not tm:
            continue
        ol_c = _causal_eb(hist, prior, tm, "ol_shared_prev_wk", 0.0, 6.0, mu_ol)
        o_sack = _causal_eb(hist, prior, tm, "off_sack_rate", 0.45, 12.0, mu_off_sack)
        d_sack = _causal_eb(hist, prior, tm, "def_sack_rate", 0.45, 20.0, mu_def_sack)
        o_h1 = _causal_eb(hist, prior, tm, "off_h1_epa", 0.45, 12.0, mu_h1)
        d_h2 = _causal_eb(hist, prior, tm, "def_h2_comp_epa", 0.45, 6.0, mu_dh2)

        th_len = int(len(hist[hist["team"] == tm])) if not hist.empty else 0
        profiles[tm] = {
            "ol_continuity_d": round(ol_c - mu_ol, 6),
            "off_sack_avoid_d": round(mu_off_sack - o_sack, 6),
            "def_sack_pressure_d": round(d_sack - mu_def_sack, 6),
            "off_h1_epa_d": round(o_h1 - mu_h1, 6),
            "def_h2_hold_d": round(mu_dh2 - d_h2, 6),
            "n_causal_weeks": th_len,
        }

    return {
        "as_of_week": ref_week,
        "ol_rows": frames["ol_rows"],
        "teams": profiles,
    }


def compute_causal_15z_ol_half_profiles(as_of_week: Optional[int] = None) -> Dict[str, Any]:
    """Compute strictly causal 32-team Stream 15Z OL continuity + sack + half-split profiles."""
    frames = _load_frames()
    tw26: pd.DataFrame = frames["tw26"]
    max_wk = int(tw26["week"].max()) + 1 if not tw26.empty else 11
    ref_week = int(as_of_week) if as_of_week is not None else max_wk
    if ref_week in _PROFILE_CACHE:
        return _PROFILE_CACHE[ref_week]

    fitted = _fit_causal_tables(ref_week)
    out = {
        "schema": "stream_15z_causal_ol_continuity_and_half_splits_v1",
        "as_of_week": ref_week,
        "teams_count": len(fitted["teams"]),
        "ol_continuity_rows": fitted["ol_rows"],
        "teams": fitted["teams"],
    }
    _PROFILE_CACHE[ref_week] = out
    return out


def evaluate_causal_15z_ol_half_matchup(
    away_team: str,
    home_team: str,
    context: Optional[Mapping[str, Any]] = None,
    as_of_week: Optional[int] = None,
) -> Dict[str, Any]:
    """Evaluate strictly swap-symmetric Stream 15Z edges with 0.0 halftime-swing null holds."""
    _ = context
    aw = normalize_nfl_team(str(away_team or ""))
    hm = normalize_nfl_team(str(home_team or ""))
    prof = compute_causal_15z_ol_half_profiles(as_of_week=as_of_week)
    teams = prof.get("teams") or {}
    ap = teams.get(aw)
    hp = teams.get(hm)

    if ap is None or hp is None:
        return {
            "schema": "stream_15z_matchup_v1",
            "as_of_week": prof["as_of_week"],
            "stream_15z_away_ol_continuity_edge": 0.0,
            "stream_15z_home_ol_continuity_edge": 0.0,
            "stream_15z_away_sack_protection_edge": 0.0,
            "stream_15z_home_sack_protection_edge": 0.0,
            "stream_15z_away_first_half_edge": 0.0,
            "stream_15z_home_first_half_edge": 0.0,
            "stream_15z_away_halftime_swing_null_edge": 0.0,
            "stream_15z_home_halftime_swing_null_edge": 0.0,
            "stream_15z_net_ol_half_diff": 0.0,
        }

    aw_ol = _clamp(float(ap["ol_continuity_d"]), -0.15, 0.15)
    hm_ol = _clamp(float(hp["ol_continuity_d"]), -0.15, 0.15)

    # Positive when team avoids sacks well AND opponent defense rushes poorly
    aw_sack = _clamp(float(ap["off_sack_avoid_d"]) - 0.65 * float(hp["def_sack_pressure_d"]), -0.08, 0.08)
    hm_sack = _clamp(float(hp["off_sack_avoid_d"]) - 0.65 * float(ap["def_sack_pressure_d"]), -0.08, 0.08)

    aw_h1 = _clamp(0.75 * float(ap["off_h1_epa_d"]) + 0.25 * float(ap["def_h2_hold_d"]), -0.18, 0.18)
    hm_h1 = _clamp(0.75 * float(hp["off_h1_epa_d"]) + 0.25 * float(hp["def_h2_hold_d"]), -0.18, 0.18)

    # Positive favors AWAY (standardized composite across OL continuity, sack survival, clean half splits)
    net_diff = (
        0.45 * (aw_sack - hm_sack) / 0.025
        + 0.20 * (aw_ol - hm_ol) / 0.08
        + 0.35 * (aw_h1 - hm_h1) / 0.14
    ) * 0.10

    return {
        "schema": "stream_15z_matchup_v1",
        "as_of_week": prof["as_of_week"],
        "stream_15z_away_ol_continuity_edge": round(aw_ol, 6),
        "stream_15z_home_ol_continuity_edge": round(hm_ol, 6),
        "stream_15z_away_sack_protection_edge": round(aw_sack, 6),
        "stream_15z_home_sack_protection_edge": round(hm_sack, 6),
        "stream_15z_away_first_half_edge": round(aw_h1, 6),
        "stream_15z_home_first_half_edge": round(hm_h1, 6),
        "stream_15z_away_halftime_swing_null_edge": 0.0,
        "stream_15z_home_halftime_swing_null_edge": 0.0,
        "stream_15z_net_ol_half_diff": round(net_diff, 6),
    }


def evaluate_causal_15z_walkforward_oos(
    eval_weeks: Iterable[int] = range(4, 11),
) -> Dict[str, Any]:
    """Strict walk-forward OOS evaluation on 2026 Weeks 4..10 for promoted vs null Stream 15Z signals."""
    frames = _load_frames()
    tw26: pd.DataFrame = frames["tw26"]
    prior: pd.DataFrame = frames["prior"]
    if tw26.empty:
        return {
            "schema": "stream_15z_walkforward_oos_v1",
            "n_team_games": 0,
            "all_promoted_components_beat_baseline": False,
        }

    specs = (
        ("ol_shared_prev_wk", 0.0, 6.0, True),
        ("off_sack_rate", 0.45, 12.0, True),
        ("def_sack_rate", 0.45, 20.0, True),
        ("off_h1_epa", 0.45, 12.0, True),
        ("def_h2_comp_epa", 0.45, 6.0, True),
        ("raw_halftime_swing", 0.0, 12.0, False),
        ("def_expl_allowed", 0.0, 20.0, False),
    )

    records: Dict[str, Dict[str, List[float]]] = {
        col: {"y": [], "base": [], "raw": [], "eb": []} for col, _, _, _ in specs
    }

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

    components: Dict[str, Dict[str, Any]] = {}
    all_promoted_beat = True
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
        components[col] = {
            "n": len(y_arr),
            "promoted": promoted,
            "production_weight": 1.0 if (promoted and beats_base) else 0.0,
            "b_prior": b_prior,
            "k": k,
            "baseline_mse": round(base_mse, 6),
            "raw_mse": round(raw_mse, 6),
            "eb_mse": round(eb_mse, 6),
            "beats_baseline": beats_base,
            "beats_raw": beats_raw,
            "oos_corr": round(_corr(y_arr, rec["eb"]), 4),
        }

    return {
        "schema": "stream_15z_walkforward_oos_v1",
        "eval_weeks": list(eval_weeks),
        "n_team_games": int(len(records["off_sack_rate"]["y"])),
        "ol_continuity_rows": frames["ol_rows"],
        "components": components,
        "all_promoted_components_beat_baseline": all_promoted_beat,
    }
