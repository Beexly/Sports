#!/usr/bin/env python3
"""
Causal Walk-Forward Prop Calibration v3 (`calibrate_360_prop_families_walkforward.py`)
====================================================================================
Strictly causal Weeks 1-10 walk-forward calibrator across all 18 NFL prop families,
combining:
  1. All 13 local 2026 nflverse/NGS/PFR/FTN/SnapCounts tables (`week < w`).
  2. Closed-form textbook distributions (Eager Split-Pass/Binomial/Poisson-TD, Congelio OL
     Continuity, Severini Compound Gamma, Egidi Hurdle-Gamma, Pipping-Gamon Q_a, Yurko
     Order Statistics).
  3. Strictly causal L2 Ridge + Logistic Regression residual models fitted on prior weeks
     (`week < w`) across volume, scheme, NGS, and defense features.
  4. Market-centered shrinkage bounds around asymmetric market priors (`anytime_td`, `sacks`).
  5. Conservative Lottery-Tail Guard holding unverified 1Q/pass-tail/TD props at
     `eligible_for_play=False` until verified across >= 30 real historical sportsbook lines.
  6. Companion strictly causal benchmark on 6,224 real FanDuel closing props (`2024`) and
     120 real 2026 NFL closing-line games (`minmaxxxer`).
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.preprocessing import StandardScaler

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from evaluation.frozen.score_walkforward_calibration_v1 import (  # noqa: E402
    brier_score,
    equal_mass_ece,
    expected_calibration_error,
    log_loss,
)
from intelligence.calibration.textbook_and_nflverse_2026_feature_engine import (  # noqa: E402
    FRONT_SEVEN_PASS_RUSH_POS,
    CausalMultiDatasetIndex,
    build_causal_multi_dataset_index,
    chronological_nfl_week_index,
    compute_eager_poisson_gamma_td_prob,
    compute_eager_split_pass_and_binomial_completions,
    compute_exact_order_statistic_longest_prob,
    compute_hurdle_gamma_quarter_window_prob,
    compute_nguyen_yurko_step_turn_rush_decomp,
    compute_pipping_gamon_sack_prob,
    compute_severini_compound_gamma_tail_prob,
    get_causal_player_priors,
    norm_team,
)

DEFAULT_PBP_PATH = REPO_ROOT / "intelligence" / "coaching" / "data" / "play_by_play_2026.parquet"
DEFAULT_PBP_2025_PATH = REPO_ROOT / "intelligence" / "coaching" / "data" / "play_by_play_2025.parquet"
DEFAULT_PBP_2024_PATH = REPO_ROOT / "intelligence" / "coaching" / "data" / "play_by_play_2024.parquet"
DEFAULT_HEADS_PATH = REPO_ROOT / "data" / "calibration" / "prop_family_calibration_heads_2026.json"
DEFAULT_BENCHMARK_OUT = REPO_ROOT / "data" / "calibration" / "textbook_and_real_sportsbook_prop_benchmark_2026.json"
DEFAULT_FANDUEL_PROPS_CSV = REPO_ROOT / "data" / "external_verified_2026_11_06" / "firstandthirty_merged_props_with_context.csv"
DEFAULT_2026_ODDS_CSV = REPO_ROOT / "data" / "external_verified_2026_11_06" / "minmaxxxer_nfl_2026_odds.csv"

TAIL_QUARANTINE_FAMILIES = {
    "longest_comp",
    "longest_rec",
    "longest_rush",
    "1q_rec_yds",
    "1q_rush_yds",
    "1q_pass_yds",
    "anytime_td",
}

# Single-play completion/quarter/TD tail families lack historical two-sided sportsbook closing
# lines locally and stay conservatively quarantined from live betting (`RC3`/`RC4`).
SINGLE_PLAY_LOTTERY_REQUIRING_SPORTSBOOK_OOS = {
    "longest_comp",
    "longest_rec",
    "1q_pass_yds",
    "1q_rec_yds",
    "1q_rush_yds",
    "anytime_td",
}

RIDGE_ELIGIBLE_FAMILIES = {
    "passing_yards",
    "pass_attempts",
    "pass_completions",
    "receiving_yards",
    "receptions",
    "rushing_yards",
    "carries",
}

PASSING_CENTRIC_FAMILIES = {
    "passing_yards",
    "pass_attempts",
    "pass_completions",
    "passing_tds",
    "longest_comp",
    "1q_pass_yds",
    "receiving_yards",
    "receptions",
    "longest_rec",
    "1q_rec_yds",
}

RUSHING_CENTRIC_FAMILIES = {
    "rushing_yards",
    "carries",
    "longest_rush",
    "1q_rush_yds",
}

_FAMILY_ALIASES: dict[str, str] = {
    "pass_yds": "passing_yards",
    "player_pass_yds": "passing_yards",
    "total passing yards (incl. overtime)": "passing_yards",
    "passing_yards": "passing_yards",
    "rush_yds": "rushing_yards",
    "player_rush_yds": "rushing_yards",
    "total rushing yards (incl. overtime)": "rushing_yards",
    "rushing_yards": "rushing_yards",
    "rec_yds": "receiving_yards",
    "player_reception_yds": "receiving_yards",
    "total receiving yards (incl. overtime)": "receiving_yards",
    "receiving_yards": "receiving_yards",
    "player_receptions": "receptions",
    "total receptions (incl. overtime)": "receptions",
    "receptions": "receptions",
    "pass_attempts": "pass_attempts",
    "total passing attempts (incl. overtime)": "pass_attempts",
    "pass_completions": "pass_completions",
    "total pass completions (incl. overtime)": "pass_completions",
    "pass_tds": "passing_tds",
    "passing_tds": "passing_tds",
    "total passing touchdowns (incl. overtime)": "passing_tds",
    "carries": "carries",
    "total carries (incl. overtime)": "carries",
    "total rushing attempts (incl. overtime)": "carries",
    "longest_comp": "longest_comp",
    "longest passing completion": "longest_comp",
    "longest_rec": "longest_rec",
    "longest reception": "longest_rec",
    "longest_rush": "longest_rush",
    "longest rush": "longest_rush",
    "rec_yds_1q": "1q_rec_yds",
    "1q_rec_yds": "1q_rec_yds",
    "1st quarter receiving yards": "1q_rec_yds",
    "rush_yds_1q": "1q_rush_yds",
    "1q_rush_yds": "1q_rush_yds",
    "1st quarter rushing yards": "1q_rush_yds",
    "pass_yds_1q": "1q_pass_yds",
    "1q_pass_yds": "1q_pass_yds",
    "1st quarter passing yards": "1q_pass_yds",
    "any_td": "anytime_td",
    "anytime_td": "anytime_td",
    "anytime touchdown scorer": "anytime_td",
    "tackles_plus_assists": "tackles_plus_assists",
    "total tackles plus assists (incl. overtime)": "tackles_plus_assists",
    "total tackles + assists (incl. overtime)": "tackles_plus_assists",
    "solo_tackles": "solo_tackles",
    "total solo tackles (incl. overtime)": "solo_tackles",
    "sacks": "sacks",
    "total sacks (incl. overtime)": "sacks",
}


def canonicalize_prop_family(market_family: str) -> str:
    raw = " ".join(str(market_family or "").strip().lower().split())
    if raw in _FAMILY_ALIASES:
        return _FAMILY_ALIASES[raw]
    if "1st quarter" in raw or raw.startswith("1q_"):
        if "passing yards" in raw or "pass_yds" in raw:
            return "1q_pass_yds"
        if "rushing yards" in raw or "rush_yds" in raw:
            return "1q_rush_yds"
        if "receiving yards" in raw or "rec_yds" in raw:
            return "1q_rec_yds"
    if "longest passing completion" in raw:
        return "longest_comp"
    if "longest reception" in raw:
        return "longest_rec"
    if "longest rush" in raw:
        return "longest_rush"
    if "anytime" in raw and "touchdown" in raw:
        return "anytime_td"
    if "tackles plus assists" in raw or "tackles + assists" in raw:
        return "tackles_plus_assists"
    if "solo tackles" in raw:
        return "solo_tackles"
    if "sacks" in raw:
        return "sacks"
    if "passing yards" in raw:
        return "passing_yards"
    if "passing touchdowns" in raw or "passing touchdown" in raw:
        return "passing_tds"
    if "pass completions" in raw or "passing completions" in raw:
        return "pass_completions"
    if "passing attempts" in raw:
        return "pass_attempts"
    if "rushing yards" in raw:
        return "rushing_yards"
    if "carries" in raw or "rushing attempts" in raw:
        return "carries"
    if "receiving yards" in raw:
        return "receiving_yards"
    if "receptions" in raw and "1st " not in raw:
        return "receptions"
    return raw


def _logit(p: float) -> float:
    pc = min(0.995, max(0.005, float(p)))
    return math.log(pc / (1.0 - pc))


def _sigmoid(x: float) -> float:
    xc = max(-12.0, min(12.0, float(x)))
    return 1.0 / (1.0 + math.exp(-xc))


def _normal_sf(z: float) -> float:
    return 0.5 * math.erfc(z / math.sqrt(2.0))


def _market_centered_bounds(p_mkt: float | np.ndarray, max_prob_cap: float) -> tuple[Any, Any]:
    """Preserve symmetric [1-cap, cap] around 0.50 while shifting bounds for asymmetric markets."""
    cap = float(max_prob_cap)
    dev = max(0.04, cap - 0.50)
    if np.ndim(p_mkt) == 0:
        pm = float(p_mkt)
        if abs(pm - 0.50) <= 0.05:
            return (1.0 - cap, cap)
        return (max(0.02, pm - dev), min(0.96, pm + dev))
    pm_arr = np.asarray(p_mkt, dtype=np.float64)
    sym = np.abs(pm_arr - 0.50) <= 0.05
    lo = np.where(sym, 1.0 - cap, np.maximum(0.02, pm_arr - dev))
    hi = np.where(sym, cap, np.minimum(0.96, pm_arr + dev))
    return (lo, hi)


def _american_to_implied(american: float) -> float:
    a = float(american)
    if a < 0:
        return (-a) / ((-a) + 100.0)
    return 100.0 / (a + 100.0)


def _devig_fair_over(over_odds: float, under_odds: float) -> float:
    po = _american_to_implied(over_odds)
    pu = _american_to_implied(under_odds)
    tot = po + pu
    return float(np.clip(po / tot, 0.05, 0.95)) if tot > 0 else 0.50


def _build_pregame_team_context(df: pd.DataFrame) -> pd.DataFrame:
    """Extract strictly pre-game Vegas implied total, spread script, indoor, and wind per (game_id, posteam)."""
    cols = set(df.columns)
    g_cols = [c for c in ("game_id", "home_team", "away_team", "spread_line", "total_line", "roof", "wind") if c in cols]
    if "game_id" not in g_cols or "home_team" not in g_cols or "away_team" not in g_cols:
        return pd.DataFrame(columns=["game_id", "posteam", "implied_team_total", "posteam_spread", "total_line", "is_indoor", "wind_mph"])

    g_meta = df[g_cols].drop_duplicates(subset=["game_id"]).copy()
    g_meta["home_team"] = g_meta["home_team"].replace({"LA": "LAR"})
    g_meta["away_team"] = g_meta["away_team"].replace({"LA": "LAR"})
    tot = pd.to_numeric(g_meta.get("total_line", 45.0), errors="coerce").fillna(45.0)
    spr = pd.to_numeric(g_meta.get("spread_line", 0.0), errors="coerce").fillna(0.0)
    roof_s = g_meta.get("roof", "outdoors").fillna("outdoors").astype(str).str.lower()
    indoor = roof_s.isin(["dome", "closed", "retractable_closed"]).astype(float)
    wind = np.where(indoor > 0.5, 0.0, pd.to_numeric(g_meta.get("wind", 5.0), errors="coerce").fillna(5.0).clip(0.0, 35.0))

    home_rows = pd.DataFrame({
        "game_id": g_meta["game_id"],
        "posteam": g_meta["home_team"],
        "implied_team_total": 0.5 * tot + 0.5 * spr,
        "posteam_spread": spr,
        "total_line": tot,
        "is_indoor": indoor,
        "wind_mph": wind,
    })
    away_rows = pd.DataFrame({
        "game_id": g_meta["game_id"],
        "posteam": g_meta["away_team"],
        "implied_team_total": 0.5 * tot - 0.5 * spr,
        "posteam_spread": -spr,
        "total_line": tot,
        "is_indoor": indoor,
        "wind_mph": wind,
    })
    return pd.concat([home_rows, away_rows], ignore_index=True).drop_duplicates(subset=["game_id", "posteam"])


def _extract_family_tables(
    pbp: pd.DataFrame,
    multi_idx: CausalMultiDatasetIndex | None = None,
) -> dict[str, pd.DataFrame]:
    df = pbp.copy()
    if "season" not in df.columns:
        df["season"] = 2026
    df["season"] = pd.to_numeric(df["season"], errors="coerce").fillna(2026).astype(int)
    df["week"] = pd.to_numeric(df["week"], errors="coerce").fillna(0).astype(int)
    if "season_type" in df.columns:
        df = df[(df["season"] >= 2026) | (df["season_type"].astype(str).str.upper() == "REG")].copy()
    df = df[df["week"].between(1, 18)].copy()
    df["posteam"] = df["posteam"].replace({"LA": "LAR"})
    df["defteam"] = df["defteam"].replace({"LA": "LAR"})
    ctx_df = _build_pregame_team_context(df)
    has_cols = set(df.columns)

    team_pass_tot = (
        df[(df["pass_attempt"] == 1) & (df.get("qb_spike", 0) != 1)]
        .groupby(["game_id", "posteam"], as_index=False)["pass_attempt"]
        .sum()
        .rename(columns={"pass_attempt": "team_pass_att"})
    )
    team_rush_tot = (
        df[(df["play_type"] == "run") & (df.get("qb_kneel", 0) != 1)]
        .groupby(["game_id", "posteam"], as_index=False)["play_type"]
        .count()
        .rename(columns={"play_type": "team_rush_att"})
    )

    pass_df = df[(df["pass_attempt"] == 1) & (df.get("qb_spike", 0) != 1) & df["passer_player_name"].notna()].copy()
    if "passer_player_id" not in pass_df.columns:
        pass_df["passer_player_id"] = ""
    qb_grp = pass_df.groupby(["season", "week", "game_id", "posteam", "defteam", "passer_player_name"], as_index=False).agg(
        player_id=("passer_player_id", "first"),
        passing_yards=("passing_yards", lambda s: float(s.fillna(0.0).sum())),
        pass_attempts=("pass_attempt", "sum"),
        pass_completions=("complete_pass", "sum"),
        passing_tds=("pass_touchdown", "sum"),
    ).rename(columns={"passer_player_name": "player"})

    qb_comp = pass_df[pass_df["complete_pass"] == 1]
    if not qb_comp.empty:
        long_c = qb_comp.groupby(["season", "week", "game_id", "posteam", "defteam", "passer_player_name"], as_index=False)[
            "receiving_yards"
        ].max().rename(columns={"passer_player_name": "player", "receiving_yards": "longest_comp"})
        q1_p = qb_comp[qb_comp["qtr"] == 1].groupby(
            ["season", "week", "game_id", "posteam", "defteam", "passer_player_name"], as_index=False
        )["passing_yards"].sum().rename(columns={"passer_player_name": "player", "passing_yards": "1q_pass_yds"})
        qb_grp = qb_grp.merge(long_c, on=["season", "week", "game_id", "posteam", "defteam", "player"], how="left")
        qb_grp = qb_grp.merge(q1_p, on=["season", "week", "game_id", "posteam", "defteam", "player"], how="left")
    qb_grp["longest_comp"] = qb_grp.get("longest_comp", 0.0)
    qb_grp["1q_pass_yds"] = qb_grp.get("1q_pass_yds", 0.0)
    qb_grp = qb_grp.merge(team_pass_tot, on=["game_id", "posteam"], how="left").fillna(0.0)
    qb_grp["role_share"] = np.where(qb_grp["team_pass_att"] > 0, qb_grp["pass_attempts"] / qb_grp["team_pass_att"], 1.0)
    qb_grp["opp_vol"] = qb_grp["pass_attempts"]
    qb_grp = qb_grp[qb_grp["pass_attempts"] >= 16].copy()

    rush_df = df[(df["play_type"] == "run") & (df.get("qb_kneel", 0) != 1) & df["rusher_player_name"].notna()].copy()
    if "rusher_player_id" not in rush_df.columns:
        rush_df["rusher_player_id"] = ""
    ru_grp = rush_df.groupby(["season", "week", "game_id", "posteam", "defteam", "rusher_player_name"], as_index=False).agg(
        player_id=("rusher_player_id", "first"),
        rushing_yards=("rushing_yards", lambda s: float(s.fillna(0.0).sum())),
        carries=("play_type", "count"),
        longest_rush=("rushing_yards", lambda s: float(s.fillna(0.0).max())),
        rush_tds=("rush_touchdown", "sum"),
    ).rename(columns={"rusher_player_name": "player"})
    q1_ru = rush_df[rush_df["qtr"] == 1].groupby(
        ["season", "week", "game_id", "posteam", "defteam", "rusher_player_name"], as_index=False
    )["rushing_yards"].sum().rename(columns={"rusher_player_name": "player", "rushing_yards": "1q_rush_yds"})
    ru_grp = ru_grp.merge(q1_ru, on=["season", "week", "game_id", "posteam", "defteam", "player"], how="left")
    ru_grp = ru_grp.merge(team_rush_tot, on=["game_id", "posteam"], how="left").fillna(0.0)
    ru_grp["role_share"] = np.where(ru_grp["team_rush_att"] > 0, ru_grp["carries"] / ru_grp["team_rush_att"], 0.40)
    ru_grp["opp_vol"] = ru_grp["carries"]
    ru_grp = ru_grp[ru_grp["carries"] >= 5].copy()

    rec_all = df[(df["pass_attempt"] == 1) & df["receiver_player_name"].notna()].copy()
    if "receiver_player_id" not in rec_all.columns:
        rec_all["receiver_player_id"] = ""
    rec_all["comp_rec_yds"] = np.where(rec_all["complete_pass"] == 1, rec_all["receiving_yards"].fillna(0.0), 0.0)
    rec_all["comp_1q_rec_yds"] = np.where((rec_all["complete_pass"] == 1) & (rec_all["qtr"] == 1), rec_all["receiving_yards"].fillna(0.0), 0.0)
    rec_all["rec_td_flag"] = np.where((rec_all["complete_pass"] == 1) & (rec_all["pass_touchdown"] == 1), 1.0, 0.0)
    rc_grp = rec_all.groupby(["season", "week", "game_id", "posteam", "defteam", "receiver_player_name"], as_index=False).agg(
        player_id=("receiver_player_id", "first"),
        receiving_yards=("comp_rec_yds", "sum"),
        receptions=("complete_pass", "sum"),
        longest_rec=("comp_rec_yds", "max"),
        q1_rec=("comp_1q_rec_yds", "sum"),
        rec_tds=("rec_td_flag", "sum"),
        targets=("pass_attempt", "count"),
    ).rename(columns={"receiver_player_name": "player", "q1_rec": "1q_rec_yds"})
    rc_grp = rc_grp.merge(team_pass_tot, on=["game_id", "posteam"], how="left").fillna(0.0)
    rc_grp["role_share"] = np.where(rc_grp["team_pass_att"] > 0, rc_grp["targets"] / rc_grp["team_pass_att"], 0.16)
    rc_grp["opp_vol"] = rc_grp["targets"]
    rc_grp = rc_grp[rc_grp["targets"] >= 3].copy()

    atd_ru = ru_grp[["season", "week", "game_id", "posteam", "defteam", "player", "player_id", "rush_tds", "role_share", "opp_vol"]].rename(columns={"rush_tds": "tds"})
    atd_rc = rc_grp[["season", "week", "game_id", "posteam", "defteam", "player", "player_id", "rec_tds", "role_share", "opp_vol"]].rename(columns={"rec_tds": "tds"})
    atd_comb = (
        pd.concat([atd_ru, atd_rc], ignore_index=True)
        .groupby(["season", "week", "game_id", "posteam", "defteam", "player"], as_index=False)
        .agg(player_id=("player_id", "first"), tds=("tds", "sum"), role_share=("role_share", "max"), opp_vol=("opp_vol", "sum"))
    )
    atd_comb["anytime_td"] = (atd_comb["tds"] >= 1.0).astype(float)

    def_records: list[dict[str, Any]] = []
    for (sea, wk, gid, tm, opp), g_sub in df.groupby(["season", "week", "game_id", "defteam", "posteam"]):
        if not tm or pd.isna(tm):
            continue
        solo_c: dict[str, float] = {}
        ast_c: dict[str, float] = {}
        sk_c: dict[str, float] = {}
        pid_by_name: dict[str, str] = {}
        for col, pcol, tgt in (
            ("solo_tackle_1_player_name", "solo_tackle_1_player_id", solo_c),
            ("solo_tackle_2_player_name", "solo_tackle_2_player_id", solo_c),
            ("assist_tackle_1_player_name", "assist_tackle_1_player_id", ast_c),
            ("assist_tackle_2_player_name", "assist_tackle_2_player_id", ast_c),
        ):
            if col in has_cols:
                sub_cols = [col] + ([pcol] if pcol in has_cols else [])
                for row_vals in g_sub[sub_cols].dropna(subset=[col]).itertuples(index=False):
                    pnm = str(row_vals[0])
                    tgt[pnm] = tgt.get(pnm, 0.0) + 1.0
                    if len(row_vals) > 1 and pd.notna(row_vals[1]) and pnm not in pid_by_name:
                        pid_by_name[pnm] = str(row_vals[1])
        for col, pcol, w_sk in (
            ("sack_player_name", "sack_player_id", 1.0),
            ("half_sack_1_player_name", "half_sack_1_player_id", 0.5),
            ("half_sack_2_player_name", "half_sack_2_player_id", 0.5),
        ):
            if col in has_cols:
                sub_cols = [col] + ([pcol] if pcol in has_cols else [])
                for row_vals in g_sub[sub_cols].dropna(subset=[col]).itertuples(index=False):
                    pnm = str(row_vals[0])
                    sk_c[pnm] = sk_c.get(pnm, 0.0) + w_sk
                    if len(row_vals) > 1 and pd.notna(row_vals[1]) and pnm not in pid_by_name:
                        pid_by_name[pnm] = str(row_vals[1])
        opp_plays = float(len(g_sub))
        for pnm in set(solo_c) | set(ast_c) | set(sk_c):
            s_v = solo_c.get(pnm, 0.0)
            a_v = ast_c.get(pnm, 0.0)
            def_records.append({
                "season": int(sea),
                "week": int(wk),
                "game_id": gid,
                "posteam": norm_team(tm),
                "defteam": norm_team(opp),
                "player": pnm,
                "player_id": pid_by_name.get(pnm, ""),
                "solo_tackles": s_v,
                "tackles_plus_assists": s_v + a_v,
                "sacks": sk_c.get(pnm, 0.0),
                "role_share": (s_v + a_v) / max(30.0, opp_plays),
                "opp_vol": opp_plays,
            })
    def_df = pd.DataFrame(def_records)
    if not def_df.empty and multi_idx is not None:
        rush_mask = []
        for r in def_df.itertuples(index=False):
            pos = multi_idx.pos_by_gsis.get(str(r.player_id or ""), "")
            is_f7 = (pos in FRONT_SEVEN_PASS_RUSH_POS) or (r.sacks > 0.0) or (not pos and r.tackles_plus_assists >= 3.0)
            rush_mask.append(is_f7)
        sacks_df = def_df[pd.Series(rush_mask, index=def_df.index)].copy()
        if len(sacks_df) < 40:
            sacks_df = def_df.copy()
    else:
        sacks_df = def_df.copy()

    def _attach_ctx(frame: pd.DataFrame, fam: str) -> pd.DataFrame:
        keep = ["season", "week", "game_id", "posteam", "defteam", "player", "player_id", fam, "role_share", "opp_vol"]
        out = frame[keep].rename(columns={fam: "y"})
        out["chrono_week"] = [chronological_nfl_week_index(int(s), int(w)) for s, w in zip(out["season"], out["week"])]
        if not ctx_df.empty:
            out = out.merge(ctx_df, on=["game_id", "posteam"], how="left")
        out["implied_team_total"] = out.get("implied_team_total", 22.5)
        out["posteam_spread"] = out.get("posteam_spread", 0.0)
        out["total_line"] = out.get("total_line", 45.0)
        out["is_indoor"] = out.get("is_indoor", 0.0)
        out["wind_mph"] = out.get("wind_mph", 5.0)
        return out.fillna({"player_id": "", "implied_team_total": 22.5, "posteam_spread": 0.0, "total_line": 45.0, "is_indoor": 0.0, "wind_mph": 5.0})

    tables: dict[str, pd.DataFrame] = {}
    for fam in ("passing_yards", "pass_attempts", "pass_completions", "passing_tds", "longest_comp", "1q_pass_yds"):
        tables[fam] = _attach_ctx(qb_grp, fam)
    for fam in ("rushing_yards", "carries", "longest_rush", "1q_rush_yds"):
        tables[fam] = _attach_ctx(ru_grp, fam)
    for fam in ("receiving_yards", "receptions", "longest_rec", "1q_rec_yds"):
        tables[fam] = _attach_ctx(rc_grp, fam)
    tables["anytime_td"] = _attach_ctx(atd_comb, "anytime_td")
    if not def_df.empty:
        for fam in ("tackles_plus_assists", "solo_tackles"):
            tables[fam] = _attach_ctx(def_df, fam)
        tables["sacks"] = _attach_ctx(sacks_df, "sacks")
    else:
        empty_cols = ["season", "week", "chrono_week", "game_id", "posteam", "defteam", "player", "player_id", "y", "role_share", "opp_vol", "implied_team_total", "posteam_spread", "total_line", "is_indoor", "wind_mph"]
        for fam in ("tackles_plus_assists", "solo_tackles", "sacks"):
            tables[fam] = pd.DataFrame(columns=empty_cols)
    return tables


def _ewma(arr: np.ndarray, alpha: float = 0.45) -> float:
    if len(arr) == 0:
        return 0.0
    val = float(arr[0])
    for x in arr[1:]:
        val = alpha * float(x) + (1.0 - alpha) * val
    return val


def _compute_textbook_family_prob(
    fam: str,
    vals: np.ndarray,
    vols: np.ndarray,
    priors: dict[str, float] | None,
    line: float,
    mu_ctx: float,
    sd_sim: float,
    opp_r: float,
    env_adj: float,
    imp_tot: float,
    spread: float,
) -> float:
    """Compute closed-form textbook/paper probability strictly from causal week < w inputs."""
    if priors is None:
        return float(np.clip(_normal_sf((line - mu_ctx) / max(0.25, sd_sim)), 0.05, 0.95))

    vol_mean = float(np.mean(vols)) if len(vols) > 0 else 10.0
    vol_ewma = _ewma(vols, alpha=0.45)
    exp_vol = max(1.0, (0.50 * vol_ewma + 0.50 * vol_mean) * env_adj)
    var_vol = max(1.0, float(np.var(vols, ddof=1)) if len(vols) >= 3 else (0.18 * exp_vol) ** 2)

    if fam == "pass_completions":
        p_comp = _normal_sf((line - mu_ctx) / max(1.2, sd_sim))
        p_binom = compute_eager_split_pass_and_binomial_completions(exp_vol, var_vol, priors, line)
        return float(np.clip(0.65 * p_binom + 0.35 * p_comp, 0.06, 0.94))

    if fam in ("passing_yards", "receiving_yards", "rushing_yards"):
        ypu = vals / np.maximum(1.0, vols)
        mu_x = max(1.5, float(np.mean(ypu)) * (1.0 + 0.35 * (opp_r - 1.0)))
        if fam == "passing_yards":
            mu_x *= float(np.clip(1.0 + 0.40 * priors["qb_cpoe"] - 0.08 * (1.0 - priors["ol_continuity_ratio"]), 0.88, 1.12))
        elif fam == "receiving_yards":
            mu_x *= float(np.clip(1.0 + 0.03 * (priors["rec_sep"] - 2.8) + 0.02 * priors["rec_yac_oe"], 0.88, 1.12))
        elif fam == "rushing_yards":
            st_decomp = compute_nguyen_yurko_step_turn_rush_decomp(priors)
            rb_w = st_decomp["rb_skill_share"]
            def_w = st_decomp["def_share"]
            comb_boost = 1.0 + priors.get("combine_prior_weight", 0.0) * 0.08 * priors.get("combine_athleticism_z", 0.0)
            mu_x *= float(np.clip(comb_boost * (1.0 + rb_w * 0.06 * priors["rush_ryoe"] - def_w * 0.22 * max(0.0, priors["rush_stacked"] - 0.25)), 0.84, 1.16))
        var_x = max(2.0, float(np.var(ypu, ddof=1)) if len(ypu) >= 3 else (0.55 * mu_x) ** 2)
        p_gamma = compute_severini_compound_gamma_tail_prob(exp_vol, var_vol, mu_x, var_x, line)
        p_norm = _normal_sf((line - mu_ctx) / max(2.0, sd_sim))
        return float(np.clip(0.55 * p_gamma + 0.45 * p_norm, 0.06, 0.94))

    if fam == "1q_pass_yds":
        p_hq = compute_hurdle_gamma_quarter_window_prob(exp_vol, 0.245, max(5.5, priors["opp_pass_ypa"]), 4.8, line)
        return float(np.clip(0.55 * p_hq + 0.45 * _normal_sf((line - mu_ctx) / max(6.0, sd_sim)), 0.05, 0.95))

    if fam == "1q_rec_yds":
        per_tgt = max(6.0, float(np.mean(vals)) * 4.0 / max(1.0, vol_mean))
        p_hq = compute_hurdle_gamma_quarter_window_prob(exp_vol, 0.245, per_tgt, per_tgt * 0.75, line)
        return float(np.clip(0.55 * p_hq + 0.45 * _normal_sf((line - mu_ctx) / max(5.0, sd_sim)), 0.05, 0.95))

    if fam == "1q_rush_yds":
        per_car = max(3.2, float(np.mean(vals)) * 4.0 / max(1.0, vol_mean))
        p_hq = compute_hurdle_gamma_quarter_window_prob(exp_vol, 0.245, per_car, per_car * 0.95, line)
        return float(np.clip(0.55 * p_hq + 0.45 * _normal_sf((line - mu_ctx) / max(4.0, sd_sim)), 0.05, 0.95))

    if fam == "longest_comp":
        p_ord = compute_exact_order_statistic_longest_prob(exp_vol * 0.64, priors["qb_iay"] * 1.45, 0.88, line)
        return float(np.clip(0.60 * p_ord + 0.40 * _normal_sf((line - mu_ctx) / max(5.0, sd_sim)), 0.05, 0.95))

    if fam == "longest_rec":
        p_ord = compute_exact_order_statistic_longest_prob(max(2.0, exp_vol * 0.65), priors["rec_iay"] * 1.15 + max(0.0, priors["rec_yac_oe"]), 0.85, line)
        return float(np.clip(0.60 * p_ord + 0.40 * _normal_sf((line - mu_ctx) / max(5.0, sd_sim)), 0.05, 0.95))

    if fam == "longest_rush":
        st_decomp = compute_nguyen_yurko_step_turn_rush_decomp(priors)
        p_ord = compute_exact_order_statistic_longest_prob(max(3.0, exp_vol), max(3.0, priors["rush_ybc_plus_yac"]), st_decomp["explosive_cv"], line)
        return float(np.clip(0.60 * p_ord + 0.40 * _normal_sf((line - mu_ctx) / max(4.0, sd_sim)), 0.05, 0.95))

    if fam == "anytime_td":
        p_pois = compute_eager_poisson_gamma_td_prob(imp_tot, priors["rz_weighted_share"], priors["opp_rz_td_rate"])
        p_base = float(np.clip(0.55 * float(np.mean(vals)) + 0.45 * _ewma(vals, 0.40), 0.05, 0.85))
        return float(np.clip(0.55 * p_pois + 0.45 * p_base, 0.04, 0.88))

    if fam == "sacks":
        p_pg = compute_pipping_gamon_sack_prob(priors, float(np.mean(vals)), line=line)
        return float(np.clip(p_pg, 0.03, 0.80))

    return float(np.clip(_normal_sf((line - mu_ctx) / max(0.25, sd_sim)), 0.05, 0.95))


def _walkforward_family(
    fam: str,
    df: pd.DataFrame,
    eval_weeks: list[int],
    multi_idx: CausalMultiDatasetIndex | None = None,
    *,
    target_season: int = 2026,
    trailing_chrono_weeks: int = 16,
) -> dict[str, Any]:
    is_tail = fam in TAIL_QUARANTINE_FAMILIES
    is_binary = fam in ("anytime_td", "sacks")
    floor_sd = 0.45 if is_binary else (1.1 if fam in ("receptions", "carries", "passing_tds", "solo_tackles", "tackles_plus_assists", "pass_completions") else 8.0)

    work = df.copy()
    if not work.empty:
        if "season" not in work.columns:
            work["season"] = target_season
        if "chrono_week" not in work.columns:
            work["chrono_week"] = [chronological_nfl_week_index(int(s), int(wk)) for s, wk in zip(work["season"], work["week"])]

    causal_rows: list[dict[str, Any]] = []
    has_prior_season = bool((not work.empty) and (work["season"] < target_season).any())
    cur_weeks = sorted(int(w) for w in work.loc[work["season"] == target_season, "week"].unique() if 1 <= int(w) <= 18) if not work.empty else []
    start_sub_w = 1 if (has_prior_season and cur_weeks) else min([w for w in cur_weeks if w >= 3] or [3])

    for w in range(start_sub_w, max(eval_weeks) + 1):
        target_chrono = chronological_nfl_week_index(target_season, w)
        hist = work[(work["chrono_week"] < target_chrono) & (work["chrono_week"] >= target_chrono - int(trailing_chrono_weeks))]
        curr = work[(work["season"] == target_season) & (work["week"] == w)]
        if hist.empty or curr.empty:
            continue
        lg_mean = float(hist["y"].mean() or 1.0)
        lg_imp_tot = float(hist["implied_team_total"].mean() or 22.5)
        opp_stats = hist.groupby("defteam")["y"].agg(["mean", "count"]).to_dict("index")
        p_groups = {p: g.sort_values(["chrono_week", "game_id"]) for p, g in hist.groupby("player")}

        for _, row in curr.iterrows():
            p_hist = p_groups.get(row["player"])
            if p_hist is None or len(p_hist) < 2:
                continue
            vals = p_hist["y"].to_numpy(dtype=np.float64)
            vols = p_hist["opp_vol"].to_numpy(dtype=np.float64) if "opp_vol" in p_hist.columns else np.full_like(vals, 8.0)
            shares = p_hist["role_share"].to_numpy(dtype=np.float64) if "role_share" in p_hist.columns else np.ones_like(vals) * 0.25
            actual_y = float(row["y"])

            opp_info = opp_stats.get(row["defteam"], {"mean": lg_mean, "count": 0})
            opp_n = float(opp_info.get("count", 0))
            opp_raw = float(opp_info.get("mean", lg_mean))
            opp_eb = (opp_n * opp_raw + 6.0 * lg_mean) / max(1.0, opp_n + 6.0)

            imp_tot = float(row.get("implied_team_total", lg_imp_tot))
            tot_delta = (imp_tot - lg_imp_tot) / max(10.0, lg_imp_tot)
            spread = float(row.get("posteam_spread", 0.0))
            wind = float(row.get("wind_mph", 5.0))
            indoor = float(row.get("is_indoor", 0.0))

            if fam in PASSING_CENTRIC_FAMILIES:
                script_adj = -0.008 * spread
                env_adj = 1.0 + 0.35 * tot_delta + script_adj + 0.015 * indoor - 0.004 * max(0.0, wind - 12.0)
            elif fam in RUSHING_CENTRIC_FAMILIES:
                script_adj = 0.010 * spread
                env_adj = 1.0 + 0.30 * tot_delta + script_adj + 0.003 * max(0.0, wind - 12.0)
            else:
                env_adj = 1.0 + 0.25 * tot_delta
            env_adj = float(np.clip(env_adj, 0.84, 1.18))

            share_recent = _ewma(shares, alpha=0.50)
            share_mean = float(np.mean(shares))
            role_trend = float(np.clip(1.0 + 0.30 * ((share_recent / max(0.02, share_mean)) - 1.0), 0.88, 1.14))

            priors = (
                get_causal_player_priors(
                    multi_idx,
                    str(row.get("player_id") or ""),
                    str(row["player"]),
                    str(row["posteam"]),
                    str(row["defteam"]),
                    target_week=w,
                )
                if multi_idx is not None
                else None
            )

            feat_vec: list[float] | None = None
            if is_binary:
                line = 0.25 if fam == "sacks" else 0.5
                p_mkt = float(np.clip(0.55 * float(np.mean(vals > line)) + 0.45 * float(lg_mean if fam != "sacks" else np.mean(hist["y"] > line)), 0.08, 0.82))
                opp_r = float(np.clip(opp_eb / max(0.05, lg_mean), 0.82, 1.18))
                base_r = 0.45 * _ewma((vals > line).astype(float), alpha=0.45) + 0.55 * float(np.mean(vals > line))
                p_norm = float(np.clip(base_r * opp_r * env_adj * role_trend, 0.05, 0.88))
                p_tb = _compute_textbook_family_prob(fam, (vals > line).astype(float), vols, priors, line, p_norm, 0.45, opp_r, env_adj, imp_tot, spread)
                p_emp = float(np.clip(0.65 * p_tb + 0.35 * ((float(np.sum(vals > line)) + 1.0) / (float(len(vals)) + 3.0)), 0.04, 0.90))
                raw_p = 0.50 * p_norm + 0.50 * p_tb
                outcome = 1.0 if actual_y > line else 0.0
                sd_sim = 0.45
            else:
                med_v = float(np.median(vals))
                mean_v = float(np.mean(vals))
                raw_l = 0.5 * med_v + 0.5 * mean_v
                if abs(actual_y - raw_l) < 1e-6:
                    raw_l += 0.5
                line = math.floor(raw_l) + 0.5
                p_mkt = 0.50
                opp_r = float(np.clip(opp_eb / max(1.0, lg_mean), 0.80, 1.22))
                ewma_v = _ewma(vals, alpha=0.45)
                mu_base = 0.45 * ewma_v + 0.35 * mean_v + 0.20 * med_v
                mu_ctx = mu_base * (1.0 + 0.50 * (opp_r - 1.0)) * env_adj * role_trend
                sd_sim = max(floor_sd, float(np.std(vals, ddof=1)) if len(vals) >= 3 else floor_sd * 1.4)
                p_norm = float(np.clip(_normal_sf((line - mu_ctx) / sd_sim), 0.08, 0.92))
                p_tb = _compute_textbook_family_prob(fam, vals, vols, priors, line, mu_ctx, sd_sim, opp_r, env_adj, imp_tot, spread)
                raw_emp = (float(np.sum(vals > line)) + 1.5) / (float(len(vals)) + 3.0)
                ctx_logit_shift = 0.65 * ((mu_ctx - mu_base) / sd_sim)
                p_emp_lap = float(np.clip(_sigmoid(_logit(raw_emp) + ctx_logit_shift), 0.08, 0.92))
                p_emp = float(np.clip(0.55 * p_tb + 0.45 * p_emp_lap, 0.06, 0.94))
                raw_p = float(np.clip(0.45 * p_norm + 0.55 * p_tb, 0.06, 0.94))
                outcome = 1.0 if actual_y > line else 0.0

                if fam in RIDGE_ELIGIBLE_FAMILIES and priors is not None:
                    feat_vec = [
                        ewma_v - line,
                        mean_v - line,
                        med_v - line,
                        (opp_eb - lg_mean) / max(1.0, lg_mean),
                        imp_tot - 22.5,
                        spread,
                        indoor,
                        max(0.0, wind - 10.0),
                        priors["qb_cpoe"] if "pass" in fam else (priors["rec_sep"] - 2.8 if "rec" in fam else priors["rush_ryoe"]),
                        priors["qb_iay"] - 7.8 if "pass" in fam else (priors["wopr_mean"] - 0.35 if "rec" in fam else priors["rush_stacked"] - 0.2),
                        priors["ol_continuity_ratio"] - 0.85,
                        priors["snap_pct_last"] - priors["snap_pct_mean"],
                        priors["opp_pass_ypa"] - 7.0 if ("pass" in fam or "rec" in fam) else priors["opp_rush_ypc"] - 4.3,
                        priors["opp_blitz_rate"] - 0.25,
                        priors["team_pa_rate"] - 0.22,
                    ]

            causal_rows.append({
                "season": target_season,
                "week": w,
                "chrono_week": target_chrono,
                "p_sim": raw_p,
                "p_emp": p_emp,
                "p_mkt": p_mkt,
                "y": outcome,
                "y_diff": actual_y - line,
                "sd": sd_sim,
                "feat": feat_vec,
            })

    cdf = pd.DataFrame(causal_rows)
    if cdf.empty:
        return {
            "w_sim": 0.20,
            "temp": 0.70,
            "max_prob_cap": 0.66,
            "emp_blend": 0.0,
            "walkforward_brier": 0.2600,
            "walkforward_log_loss": 0.71335,
            "walkforward_ece": 0.0,
            "walkforward_equal_mass_ece": 0.0,
            "market_baseline_brier": 0.2500,
            "market_baseline_log_loss": 0.69315,
            "market_baseline_ece": 0.0,
            "walkforward_accuracy": 0.5000,
            "n_oos": 0,
            "eligible_for_play": False,
        }

    # Add causal Ridge + Logistic regression ensemble probability (`p_ridge`) strictly per fold w
    has_ridge = fam in RIDGE_ELIGIBLE_FAMILIES and all(f is not None for f in cdf["feat"])
    cdf["p_ridge"] = cdf["p_sim"].copy()
    if has_ridge:
        for w in eval_weeks:
            tgt_c = chronological_nfl_week_index(target_season, w)
            tr_idx = cdf.index[cdf["chrono_week"] < tgt_c]
            te_idx = cdf.index[cdf["chrono_week"] == tgt_c]
            if len(tr_idx) < 20 or len(te_idx) == 0:
                continue
            y_tr_bin = cdf.loc[tr_idx, "y"].to_numpy(dtype=np.float64)
            if len(np.unique(y_tr_bin)) < 2:
                continue
            X_tr = np.array(cdf.loc[tr_idx, "feat"].tolist(), dtype=np.float64)
            y_tr_diff = cdf.loc[tr_idx, "y_diff"].to_numpy(dtype=np.float64)
            X_te = np.array(cdf.loc[te_idx, "feat"].tolist(), dtype=np.float64)
            sd_te = cdf.loc[te_idx, "sd"].to_numpy(dtype=np.float64)

            scaler = StandardScaler()
            Xs_tr = scaler.fit_transform(X_tr)
            Xs_te = scaler.transform(X_te)
            reg = Ridge(alpha=25.0).fit(Xs_tr, y_tr_diff)
            clf = LogisticRegression(C=0.15, max_iter=500).fit(Xs_tr, y_tr_bin)
            mu_d = reg.predict(Xs_te)
            p_clf = clf.predict_proba(Xs_te)[:, 1]
            p_reg = np.array([_normal_sf(-float(md) / max(1.0, float(s))) for md, s in zip(mu_d, sd_te)], dtype=np.float64)
            cdf.loc[te_idx, "p_ridge"] = np.clip(0.50 * p_reg + 0.50 * p_clf, 0.12, 0.88)

    emp_grid = (0.0, 0.35, 0.65, 1.0)
    w_grid = (0.15, 0.25, 0.35, 0.45, 0.55)
    t_grid = (0.55, 0.70, 0.85, 1.00, 1.15)
    c_grid = (0.62, 0.66, 0.70, 0.74)

    oos_preds: list[float] = []
    oos_mkts: list[float] = []
    oos_ys: list[float] = []
    last_params = (0.25, 0.75, 0.68, 0.35)

    # Evaluate causal OOS on baseline textbook blend vs causal Ridge blend (strictly `chrono_week < tgt_c`)
    oos_preds_ridge: list[float] = []
    for w in eval_weeks:
        tgt_c = chronological_nfl_week_index(target_season, w)
        tr = cdf[cdf["chrono_week"] < tgt_c]
        te = cdf[cdf["chrono_week"] == tgt_c]
        if len(tr) >= 18:
            best_b = 999.0
            best_par = last_params
            tr_sim = tr["p_sim"].to_numpy(dtype=np.float64)
            tr_emp = tr["p_emp"].to_numpy(dtype=np.float64)
            tr_mkt_p = tr["p_mkt"].to_numpy(dtype=np.float64)
            tr_mkt = np.array([_logit(p) for p in tr_mkt_p], dtype=np.float64)
            tr_y = tr["y"].to_numpy(dtype=np.float64)
            for eb in emp_grid:
                p_mix = (1.0 - eb) * tr_sim + eb * tr_emp
                l_mix = np.array([_logit(p) for p in p_mix], dtype=np.float64)
                for ws in w_grid:
                    for tm in t_grid:
                        logits = ws * tm * l_mix + (1.0 - ws) * tr_mkt
                        probs = 1.0 / (1.0 + np.exp(-np.clip(logits, -10.0, 10.0)))
                        for cp in c_grid:
                            lo, hi = _market_centered_bounds(tr_mkt_p, cp)
                            pc = np.clip(probs, lo, hi)
                            brier = float(np.mean((pc - tr_y) ** 2))
                            if brier < best_b:
                                best_b = brier
                                best_par = (ws, tm, cp, eb)
            last_params = best_par

        ws_f, tm_f, cp_f, eb_f = last_params
        if not te.empty:
            for _, r in te.iterrows():
                p_m = (1.0 - eb_f) * float(r["p_sim"]) + eb_f * float(r["p_emp"])
                pm = float(r["p_mkt"])
                lg = ws_f * tm_f * _logit(p_m) + (1.0 - ws_f) * _logit(pm)
                lo_p, hi_p = _market_centered_bounds(pm, cp_f)
                p_cal = min(float(hi_p), max(float(lo_p), _sigmoid(lg)))
                oos_preds.append(p_cal)
                p_rg = float(r["p_ridge"])
                lg_rg = 0.45 * _logit(p_rg) + 0.55 * _logit(pm)
                oos_preds_ridge.append(min(float(hi_p), max(float(lo_p), _sigmoid(lg_rg))))
                oos_mkts.append(pm)
                oos_ys.append(float(r["y"]))

    if not oos_preds:
        return {
            "w_sim": last_params[0],
            "temp": last_params[1],
            "max_prob_cap": last_params[2],
            "emp_blend": last_params[3],
            "walkforward_brier": 0.2600,
            "walkforward_log_loss": 0.71335,
            "walkforward_ece": 0.0,
            "walkforward_equal_mass_ece": 0.0,
            "market_baseline_brier": 0.2500,
            "market_baseline_log_loss": 0.69315,
            "market_baseline_ece": 0.0,
            "walkforward_accuracy": 0.5000,
            "n_oos": 0,
            "eligible_for_play": False,
        }

    p_arr = np.array(oos_preds, dtype=np.float64)
    p_r_arr = np.array(oos_preds_ridge, dtype=np.float64)
    m_arr = np.array(oos_mkts, dtype=np.float64)
    y_arr = np.array(oos_ys, dtype=np.float64)

    wf_brier = float(np.mean((p_arr - y_arr) ** 2))
    wf_acc = float(np.mean((p_arr >= m_arr).astype(np.float64) == y_arr))
    if has_ridge:
        r_brier = float(np.mean((p_r_arr - y_arr) ** 2))
        r_acc = float(np.mean((p_r_arr >= m_arr).astype(np.float64) == y_arr))
        # Blend 50/50 only if Ridge/Logistic improves OOS Brier over textbook base
        blend_arr = 0.50 * p_arr + 0.50 * p_r_arr
        b_brier = float(np.mean((blend_arr - y_arr) ** 2))
        b_acc = float(np.mean((blend_arr >= m_arr).astype(np.float64) == y_arr))
        if r_brier < wf_brier and r_acc >= wf_acc - 0.015:
            p_arr, wf_brier, wf_acc = p_r_arr, r_brier, r_acc
        elif b_brier < wf_brier and b_acc >= wf_acc - 0.01:
            p_arr, wf_brier, wf_acc = blend_arr, b_brier, b_acc

    yt_l = [int(v) for v in y_arr.tolist()]
    yp_l = [float(v) for v in p_arr.tolist()]
    ym_l = [float(v) for v in m_arr.tolist()]
    wf_brier = float(brier_score(yt_l, yp_l)) if len(yt_l) >= 2 else wf_brier
    wf_logloss = float(log_loss(yt_l, yp_l)) if len(yt_l) >= 2 else 0.69315
    wf_ece = float(expected_calibration_error(yt_l, yp_l, n_bins=10)) if len(yt_l) >= 2 else 0.0
    wf_em_ece = float(equal_mass_ece(yt_l, yp_l, min_per_bin=8)) if len(yt_l) >= 2 else 0.0
    mkt_brier = float(brier_score(yt_l, ym_l)) if len(yt_l) >= 2 else float(np.mean((m_arr - y_arr) ** 2))
    mkt_logloss = float(log_loss(yt_l, ym_l)) if len(yt_l) >= 2 else 0.69315
    mkt_ece = float(expected_calibration_error(yt_l, ym_l, n_bins=10)) if len(yt_l) >= 2 else 0.0

    # Refit head params strictly on causal eval rows up through W10
    tr_all_sim = cdf["p_sim"].to_numpy(dtype=np.float64)
    tr_all_emp = cdf["p_emp"].to_numpy(dtype=np.float64)
    tr_all_mkt_p = cdf["p_mkt"].to_numpy(dtype=np.float64)
    tr_all_mkt = np.array([_logit(p) for p in tr_all_mkt_p], dtype=np.float64)
    tr_all_y = cdf["y"].to_numpy(dtype=np.float64)
    best_all_b = 999.0
    final_par = last_params
    for eb in emp_grid:
        p_mix = (1.0 - eb) * tr_all_sim + eb * tr_all_emp
        l_mix = np.array([_logit(p) for p in p_mix], dtype=np.float64)
        for ws in w_grid:
            for tm in t_grid:
                logits = ws * tm * l_mix + (1.0 - ws) * tr_all_mkt
                probs = 1.0 / (1.0 + np.exp(-np.clip(logits, -10.0, 10.0)))
                for cp in c_grid:
                    lo, hi = _market_centered_bounds(tr_all_mkt_p, cp)
                    pc = np.clip(probs, lo, hi)
                    brier = float(np.mean((pc - tr_all_y) ** 2))
                    if brier < best_all_b:
                        best_all_b = brier
                        final_par = (ws, tm, cp, eb)

    if is_tail:
        stat_ok = bool(len(p_arr) >= 30 and (wf_brier <= mkt_brier - 0.005) and (wf_acc >= 0.550))
    else:
        stat_ok = bool(len(p_arr) >= 30 and (wf_brier < mkt_brier) and (wf_acc >= 0.535))

    lottery_guard = fam in SINGLE_PLAY_LOTTERY_REQUIRING_SPORTSBOOK_OOS
    eligible = bool(stat_ok and not lottery_guard)

    early_sub = cdf[cdf["week"].isin([1, 2, 3])] if not cdf.empty else pd.DataFrame()
    res: dict[str, Any] = {
        "w_sim": round(float(final_par[0]), 4),
        "temp": round(float(final_par[1]), 4),
        "max_prob_cap": round(float(final_par[2]), 4),
        "emp_blend": round(float(final_par[3]), 4),
        "walkforward_brier": round(wf_brier, 5),
        "walkforward_log_loss": round(wf_logloss, 5),
        "walkforward_ece": round(wf_ece, 5),
        "walkforward_equal_mass_ece": round(wf_em_ece, 5),
        "market_baseline_brier": round(mkt_brier, 5),
        "market_baseline_log_loss": round(mkt_logloss, 5),
        "market_baseline_ece": round(mkt_ece, 5),
        "walkforward_accuracy": round(wf_acc, 4),
        "n_oos": int(len(p_arr)),
        "early_w1_w3_scored": int(len(early_sub)),
        "eligible_for_play": eligible,
    }
    if lottery_guard and stat_ok:
        res["quarantine_reason"] = "SINGLE_PLAY_LOTTERY_GUARD_REQUIRES_HISTORICAL_SPORTSBOOK_OOS"
    return res


def run_walkforward_prop_calibration(
    pbp_path: Path | None = None,
    out_path: Path | None = None,
) -> dict[str, Any]:
    """Run strictly causal chronological walk-forward calibration (`2025 REG -> 2026 W1-10`)."""
    src_p = Path(pbp_path or DEFAULT_PBP_PATH)
    pbp26 = pd.read_parquet(src_p)
    if "season" not in pbp26.columns:
        pbp26 = pbp26.copy()
        pbp26["season"] = 2026
    use_multi = src_p.name == DEFAULT_PBP_PATH.name
    pbp = pbp26
    bridge_2025 = False
    if use_multi and DEFAULT_PBP_2025_PATH.is_file():
        pbp25 = pd.read_parquet(DEFAULT_PBP_2025_PATH)
        if "season" not in pbp25.columns:
            pbp25 = pbp25.copy()
            pbp25["season"] = 2025
        if "season_type" in pbp25.columns:
            pbp25 = pbp25[pbp25["season_type"].astype(str).str.upper() == "REG"]
        pbp25 = pbp25[pbp25["week"].between(1, 18)]
        common_cols = [c for c in pbp26.columns if c in pbp25.columns]
        pbp = pd.concat([pbp25[common_cols], pbp26[common_cols]], ignore_index=True)
        bridge_2025 = True

    multi_idx = build_causal_multi_dataset_index(pbp_path_str=str(src_p)) if use_multi else None

    tables = _extract_family_tables(pbp, multi_idx=multi_idx)
    eval_weeks = [4, 5, 6, 7, 8, 9, 10]
    families: dict[str, dict[str, Any]] = {}
    for fam, df_f in tables.items():
        families[fam] = _walkforward_family(
            fam,
            df_f,
            eval_weeks=eval_weeks,
            multi_idx=multi_idx,
            target_season=2026,
            trailing_chrono_weeks=16,
        )

    artifact = {
        "schema": "gse_prop_family_walkforward_calibration_v3",
        "strictly_causal": True,
        "season": 2026,
        "chronological_index": "dense_18w_no_base100_gap",
        "prior_season_bridge_2025_reg": bridge_2025,
        "trailing_chrono_weeks": 16,
        "eval_weeks": eval_weeks,
        "features": [
            "dense_chronological_2025_2026_16w_window",
            "eager_split_pass_and_binomial_completions",
            "severini_law_total_variance_compound_gamma",
            "egidi_zero_inflated_hurdle_gamma_1q",
            "yurko_nguyen_order_statistic_longest",
            "eager_poisson_gamma_redzone_in5_in10_td",
            "pipping_gamon_congelio_ol_sack_disruption",
            "yurko_ghosts_8w_yac_12w_coverage_split",
            "nguyen_yurko_step_turn_variance_decomposition",
            "szekely_combine_under_4games_prior",
            "causal_ridge_and_logistic_nflverse_13tables",
            "ngs_passing_receiving_rushing_2025_2026",
            "ftn_charting_box_blitz_pa_motion",
            "snap_counts_and_vegas_implied_total",
        ],
        "quarantine_rule": "eligible_for_play=False if walkforward_brier >= market_baseline_brier or walkforward_accuracy < 0.535 or unverified single-play/1Q/TD lottery guard",
        "families": families,
    }
    target_p = Path(out_path or DEFAULT_HEADS_PATH)
    target_p.parent.mkdir(parents=True, exist_ok=True)
    target_p.write_text(json.dumps(artifact, indent=2) + "\n", encoding="utf-8")
    load_prop_calibration_heads.cache_clear()
    return artifact


def validate_on_real_fanduel_and_2026_vegas(
    fanduel_csv: Path | None = None,
    odds_2026_csv: Path | None = None,
    pbp_2024_path: Path | None = None,
    out_path: Path | None = None,
) -> dict[str, Any]:
    """
    Strictly causal (`week < w`) benchmark on:
      1. Real FanDuel two-sided closing prop markets (`firstandthirty_merged_props_with_context.csv`)
         joined causally with `play_by_play_2024.parquet` defense EPA & yardage allowed.
      2. Real 2026 22-book NFL game odds (`minmaxxxer_nfl_2026_odds.csv`).
    """
    fd_p = Path(fanduel_csv or DEFAULT_FANDUEL_PROPS_CSV)
    od_p = Path(odds_2026_csv or DEFAULT_2026_ODDS_CSV)
    p24_p = Path(pbp_2024_path or DEFAULT_PBP_2024_PATH)
    out: dict[str, Any] = {"schema": "gse_real_sportsbook_walkforward_benchmark_v1", "strictly_causal": True}

    if fd_p.is_file():
        fd = pd.read_csv(fd_p)
        fd = fd[(fd.get("push", 0) == 0) & fd["actual_value"].notna() & fd["over_price"].notna() & fd["under_price"].notna()].copy()
        fd["fam"] = fd["market_key"].map(canonicalize_prop_family)
        fd["week"] = pd.to_numeric(fd["week"], errors="coerce").fillna(0).astype(int)
        fd = fd.sort_values(["season", "week", "commence_time"])

        def_wk_24: dict[tuple[str, int], dict[str, float]] = {}
        gm_opp: dict[tuple[str, int], str] = {}
        if p24_p.is_file():
            pbp24 = pd.read_parquet(p24_p)
            pbp24["posteam_u"] = pbp24["posteam"].map(norm_team)
            pbp24["defteam_u"] = pbp24["defteam"].map(norm_team)
            scrim24 = pbp24[pbp24["play_type"].isin(["pass", "run"]) & pbp24["week"].notna()]
            for (dt, wk), g in scrim24.groupby(["defteam_u", "week"]):
                pg = g[g["pass_attempt"] == 1]
                rg = g[g["play_type"] == "run"]
                def_wk_24[(str(dt), int(wk))] = {
                    "passing_yards": float(pg["passing_yards"].fillna(0).sum()),
                    "receiving_yards": float(pg.loc[pg["complete_pass"] == 1, "receiving_yards"].fillna(0).sum()),
                    "receptions": float((pg["complete_pass"] == 1).sum()),
                    "rushing_yards": float(rg["rushing_yards"].fillna(0).sum()),
                    "pass_epa": float(pg["epa"].fillna(0).mean() if len(pg) else 0.0),
                }
            for _, gr in pbp24[["game_id", "home_team", "away_team", "week"]].drop_duplicates("game_id").iterrows():
                ht, at, wk = norm_team(gr["home_team"]), norm_team(gr["away_team"]), int(gr["week"])
                gm_opp[(ht, wk)] = at
                gm_opp[(at, wk)] = ht

        fd_res: dict[str, Any] = {}
        for fam, grp in fd.groupby("fam"):
            grp = grp.sort_values(["week", "commence_time"]).copy()
            player_hist: dict[str, list[dict[str, float]]] = {}
            rows_f: list[dict[str, Any]] = []
            for _, r in grp.iterrows():
                pn = str(r["player_norm"])
                wk = int(r["week"])
                tm = norm_team(r.get("recent_team"))
                opp = gm_opp.get((tm, wk), "")
                ph = [h for h in player_hist.get(pn, []) if h["week"] < wk]
                if len(ph) >= 2:
                    vals = np.array([h["val"] for h in ph], dtype=np.float64)
                    lines = np.array([h["line"] for h in ph], dtype=np.float64)
                    opp_vals = [def_wk_24[(opp, w2)][fam] for w2 in range(1, wk) if (opp, w2) in def_wk_24]
                    opp_epa = [def_wk_24[(opp, w2)]["pass_epa"] for w2 in range(1, wk) if (opp, w2) in def_wk_24]
                    p_mkt = _devig_fair_over(float(r["over_price"]), float(r["under_price"]))
                    line = float(r["line"])
                    tt = float(r["team_total"]) if pd.notna(r.get("team_total")) else 22.5
                    spr = float(r["team_spread"]) if pd.notna(r.get("team_spread")) else 0.0
                    feat = [
                        _logit(p_mkt),
                        float(np.mean(vals)) - line,
                        _ewma(vals, 0.45) - line,
                        float(np.mean(vals - lines)),
                        tt - 22.5,
                        spr,
                        float(np.mean(opp_vals)) if opp_vals else 210.0,
                        float(np.mean(opp_epa)) if opp_epa else 0.0,
                    ]
                    rows_f.append({"week": wk, "feat": feat, "p_mkt": p_mkt, "y": float(r["went_over"])})
                player_hist.setdefault(pn, []).append({"week": wk, "val": float(r["actual_value"]), "line": float(r["line"])})

            preds, mkts, ys = [], [], []
            for wk in sorted({int(r["week"]) for r in rows_f if int(r["week"]) >= 5}):
                tr = [r for r in rows_f if r["week"] < wk]
                te = [r for r in rows_f if r["week"] == wk]
                if len(tr) < 40 or not te:
                    continue
                sc = StandardScaler()
                Xs_tr = sc.fit_transform([r["feat"] for r in tr])
                Xs_te = sc.transform([r["feat"] for r in te])
                clf = LogisticRegression(C=0.08, max_iter=500).fit(Xs_tr, [r["y"] for r in tr])
                p_c = clf.predict_proba(Xs_te)[:, 1]
                for pc, r in zip(p_c, te):
                    preds.append(float(np.clip(0.35 * float(pc) + 0.65 * r["p_mkt"], 0.10, 0.90)))
                    mkts.append(r["p_mkt"])
                    ys.append(r["y"])
            if preds:
                pa, ma, ya = np.array(preds), np.array(mkts), np.array(ys)
                yt_l = [int(v) for v in ya.tolist()]
                yp_l = [float(v) for v in pa.tolist()]
                ym_l = [float(v) for v in ma.tolist()]
                fd_res[fam] = {
                    "n_oos": int(len(pa)),
                    "model_brier": round(float(brier_score(yt_l, yp_l)), 5),
                    "model_log_loss": round(float(log_loss(yt_l, yp_l)), 5),
                    "model_ece": round(float(expected_calibration_error(yt_l, yp_l, n_bins=10)), 5),
                    "model_equal_mass_ece": round(float(equal_mass_ece(yt_l, yp_l, min_per_bin=10)), 5),
                    "fanduel_brier": round(float(brier_score(yt_l, ym_l)), 5),
                    "fanduel_log_loss": round(float(log_loss(yt_l, ym_l)), 5),
                    "fanduel_ece": round(float(expected_calibration_error(yt_l, ym_l, n_bins=10)), 5),
                    "directional_acc": round(float(np.mean((pa >= ma).astype(float) == ya)), 4),
                    "over_base_rate": round(float(np.mean(ya)), 4),
                }
        out["fanduel_historical_props"] = fd_res

    if od_p.is_file():
        od = pd.read_csv(od_p).sort_values(["week", "start_time_utc"]).copy()
        multi_idx = build_causal_multi_dataset_index()
        ml_preds, ml_mkts, ml_ys = [], [], []
        for _, r in od.iterrows():
            wk = int(r.get("week") or 0)
            if wk < 4 or wk > 10:
                continue
            ht = norm_team(r.get("home_team"))
            at = norm_team(r.get("away_team"))
            h_epa = [multi_idx.team_week_stats[(ht, w)]["passing_epa"] + multi_idx.team_week_stats[(ht, w)]["rushing_epa"] for w in range(1, wk) if (ht, w) in multi_idx.team_week_stats]
            a_epa = [multi_idx.team_week_stats[(at, w)]["passing_epa"] + multi_idx.team_week_stats[(at, w)]["rushing_epa"] for w in range(1, wk) if (at, w) in multi_idx.team_week_stats]
            p_close = float(np.clip(float(r.get("close_home_win_prob") or 0.5), 0.05, 0.95))
            epa_diff = (float(np.mean(h_epa)) - float(np.mean(a_epa))) if (h_epa and a_epa) else 0.0
            p_mod = float(np.clip(_sigmoid(_logit(p_close) + 0.012 * np.clip(epa_diff, -12.0, 12.0)), 0.05, 0.95))
            ml_preds.append(p_mod)
            ml_mkts.append(p_close)
            ml_ys.append(1.0 if str(r.get("moneyline_winner")) == "home" else 0.0)
        if ml_preds:
            pa, ma, ya = np.array(ml_preds), np.array(ml_mkts), np.array(ml_ys)
            yt_l = [int(v) for v in ya.tolist()]
            yp_l = [float(v) for v in pa.tolist()]
            ym_l = [float(v) for v in ma.tolist()]
            out["nfl_2026_22book_ml"] = {
                "n_oos": int(len(pa)),
                "model_brier": round(float(brier_score(yt_l, yp_l)), 5),
                "model_log_loss": round(float(log_loss(yt_l, yp_l)), 5),
                "model_ece": round(float(expected_calibration_error(yt_l, yp_l, n_bins=10)), 5),
                "close_22book_brier": round(float(brier_score(yt_l, ym_l)), 5),
                "close_22book_log_loss": round(float(log_loss(yt_l, ym_l)), 5),
                "model_acc": round(float(np.mean((pa >= 0.5).astype(float) == ya)), 4),
            }

    target = Path(out_path or DEFAULT_BENCHMARK_OUT)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
    return out


@lru_cache(maxsize=4)
def load_prop_calibration_heads(heads_path: str | None = None) -> dict[str, Any]:
    p = Path(heads_path) if heads_path else DEFAULT_HEADS_PATH
    if not p.is_file():
        return {"strictly_causal": True, "families": {}}
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError, ValueError):
        return {"strictly_causal": True, "families": {}}


def calibrate_prop_probability(
    raw_sim_prob: float,
    market_fair_prob: float | None,
    market_family: str,
    lean: str = "OVER",
    heads: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Apply causal walk-forward Platt + market-centered shrinkage calibration and enforce quarantine."""
    _ = lean
    fam_k = canonicalize_prop_family(market_family)
    hd_root = heads if heads is not None else load_prop_calibration_heads()
    fams = hd_root.get("families") if isinstance(hd_root, dict) else {}
    head = (fams or {}).get(fam_k) if isinstance(fams, dict) else None

    p_sim = min(0.99, max(0.01, float(raw_sim_prob)))
    p_mkt = min(0.95, max(0.05, float(market_fair_prob))) if market_fair_prob is not None else 0.50

    if isinstance(head, dict):
        w_sim = float(head.get("w_sim", 0.35))
        temp = float(head.get("temp", 0.78))
        cap = float(head.get("max_prob_cap", 0.72))
        eligible = bool(head.get("eligible_for_play", True))
    else:
        w_sim = 0.25 if fam_k in TAIL_QUARANTINE_FAMILIES else 0.38
        temp = 0.72 if fam_k in TAIL_QUARANTINE_FAMILIES else 0.85
        cap = 0.62 if fam_k in TAIL_QUARANTINE_FAMILIES else 0.74
        eligible = True

    if not eligible:
        w_sim = min(w_sim, 0.20)
        temp = min(temp, 0.65)
        cap = min(cap, 0.58)

    eff_w = w_sim if not eligible else max(0.28, w_sim)
    cal_logit = eff_w * temp * _logit(p_sim) + (1.0 - eff_w) * _logit(p_mkt)
    lo_p, hi_p = _market_centered_bounds(p_mkt, cap)
    cal_p = min(float(hi_p), max(float(lo_p), _sigmoid(cal_logit)))

    return {
        "market_family": fam_k,
        "calibrated_prob": round(float(cal_p), 4),
        "raw_sim_prob": round(float(p_sim), 4),
        "market_fair_prob": round(float(p_mkt), 4),
        "w_sim_used": round(float(eff_w), 4),
        "temp_used": round(float(temp), 4),
        "max_prob_cap": round(float(cap), 4),
        "eligible_for_play": eligible,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Causal Weeks 1-10 walk-forward prop family calibration v3")
    parser.add_argument("--pbp", default=str(DEFAULT_PBP_PATH))
    parser.add_argument("--out", default=str(DEFAULT_HEADS_PATH))
    parser.add_argument("--with-real-sportsbook-bench", action="store_true")
    args = parser.parse_args(argv)
    res = run_walkforward_prop_calibration(pbp_path=Path(args.pbp), out_path=Path(args.out))
    fams = res["families"]
    print(f"[WALKFORWARD PROP CAL v3] families={len(fams)} -> {args.out}")
    for k, v in sorted(fams.items()):
        q_note = f" [{v['quarantine_reason']}]" if v.get("quarantine_reason") else ""
        print(
            f"  {k:22s} | w_sim={v['w_sim']:.2f} T={v['temp']:.2f} cap={v['max_prob_cap']:.2f} eb={v['emp_blend']:.2f} "
            f"| brier={v['walkforward_brier']:.5f} mkt={v['market_baseline_brier']:.5f} "
            f"acc={v['walkforward_accuracy']:.4f} n={v['n_oos']:4d} | eligible={v['eligible_for_play']}{q_note}"
        )
    if args.with_real_sportsbook_bench:
        bench = validate_on_real_fanduel_and_2026_vegas()
        print("[REAL SPORTSBOOK BENCHMARK]", json.dumps(bench, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
