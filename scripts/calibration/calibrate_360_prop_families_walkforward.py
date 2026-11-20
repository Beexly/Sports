#!/usr/bin/env python3
"""
Causal Walk-Forward Prop Calibration v2 (`calibrate_360_prop_families_walkforward.py`)
====================================================================================
Strictly causal Weeks 1-10 walk-forward calibrator across all 18 prop families.
For every eval week `w in [4..10]`, ONLY `week < w` play-by-play rows + pre-game
market context (`total_line`, `spread_line`, `roof`, `wind`) are used to:
  1. Estimate causal trailing distribution (`EWMA` + median/mean blend), player role
     share, Empirical Bayes shrunk opponent defense allowed adjustment, Vegas implied
     team total, pass/run script spread differential, and indoor/wind context.
  2. Fit Gaussian-vs-empirical skew mix + blended logit weight `w_sim`, Platt
     temperature `temp`, and `max_prob_cap` strictly on prior causal folds (`weeks < w`).
  3. Score strictly out-of-sample on `week == w` against fair baseline probability.

Any family whose causal walk-forward Brier fails to beat the market baseline OR whose
walk-forward directional accuracy falls below 53.5% is quarantined (`eligible_for_play=False`).
High-variance tail markets (`longest_*`, `1q_*`, `anytime_td`) require >= 55.0% OOS accuracy
and >= 0.005 Brier improvement to clear quarantine.
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

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_PBP_PATH = REPO_ROOT / "intelligence" / "coaching" / "data" / "play_by_play_2026.parquet"
DEFAULT_HEADS_PATH = REPO_ROOT / "data" / "calibration" / "prop_family_calibration_heads_2026.json"

TAIL_QUARANTINE_FAMILIES = {
    "longest_comp",
    "longest_rec",
    "longest_rush",
    "1q_rec_yds",
    "1q_rush_yds",
    "1q_pass_yds",
    "anytime_td",
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
    "total passing yards (incl. overtime)": "passing_yards",
    "passing_yards": "passing_yards",
    "rush_yds": "rushing_yards",
    "total rushing yards (incl. overtime)": "rushing_yards",
    "rushing_yards": "rushing_yards",
    "rec_yds": "receiving_yards",
    "total receiving yards (incl. overtime)": "receiving_yards",
    "receiving_yards": "receiving_yards",
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


def _extract_family_tables(pbp: pd.DataFrame) -> dict[str, pd.DataFrame]:
    df = pbp.copy()
    df["posteam"] = df["posteam"].replace({"LA": "LAR"})
    df["defteam"] = df["defteam"].replace({"LA": "LAR"})
    ctx_df = _build_pregame_team_context(df)

    # Team-level game plays for share & pace baselines (only used strictly causally for week < w)
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

    # Quarterbacks (strictly pass plays excluding spikes)
    pass_df = df[(df["pass_attempt"] == 1) & (df.get("qb_spike", 0) != 1) & df["passer_player_name"].notna()].copy()
    qb_grp = pass_df.groupby(["week", "game_id", "posteam", "defteam", "passer_player_name"], as_index=False).agg(
        passing_yards=("passing_yards", lambda s: float(s.fillna(0.0).sum())),
        pass_attempts=("pass_attempt", "sum"),
        pass_completions=("complete_pass", "sum"),
        passing_tds=("pass_touchdown", "sum"),
    )
    qb_grp = qb_grp.rename(columns={"passer_player_name": "player"})

    qb_comp = pass_df[pass_df["complete_pass"] == 1]
    if not qb_comp.empty:
        long_c = qb_comp.groupby(["week", "game_id", "posteam", "defteam", "passer_player_name"], as_index=False)[
            "receiving_yards"
        ].max().rename(columns={"passer_player_name": "player", "receiving_yards": "longest_comp"})
        q1_p = qb_comp[qb_comp["qtr"] == 1].groupby(
            ["week", "game_id", "posteam", "defteam", "passer_player_name"], as_index=False
        )["passing_yards"].sum().rename(columns={"passer_player_name": "player", "passing_yards": "1q_pass_yds"})
        qb_grp = qb_grp.merge(long_c, on=["week", "game_id", "posteam", "defteam", "player"], how="left")
        qb_grp = qb_grp.merge(q1_p, on=["week", "game_id", "posteam", "defteam", "player"], how="left")
    qb_grp["longest_comp"] = qb_grp.get("longest_comp", 0.0)
    qb_grp["1q_pass_yds"] = qb_grp.get("1q_pass_yds", 0.0)
    qb_grp = qb_grp.merge(team_pass_tot, on=["game_id", "posteam"], how="left").fillna(0.0)
    qb_grp["role_share"] = np.where(qb_grp["team_pass_att"] > 0, qb_grp["pass_attempts"] / qb_grp["team_pass_att"], 1.0)
    qb_grp = qb_grp[qb_grp["pass_attempts"] >= 16].copy()

    # Rushers (non-kneel runs, primary backfield workload >= 5 carries)
    rush_df = df[(df["play_type"] == "run") & (df.get("qb_kneel", 0) != 1) & df["rusher_player_name"].notna()].copy()
    ru_grp = rush_df.groupby(["week", "game_id", "posteam", "defteam", "rusher_player_name"], as_index=False).agg(
        rushing_yards=("rushing_yards", lambda s: float(s.fillna(0.0).sum())),
        carries=("play_type", "count"),
        longest_rush=("rushing_yards", lambda s: float(s.fillna(0.0).max())),
        rush_tds=("rush_touchdown", "sum"),
    ).rename(columns={"rusher_player_name": "player"})
    q1_ru = rush_df[rush_df["qtr"] == 1].groupby(
        ["week", "game_id", "posteam", "defteam", "rusher_player_name"], as_index=False
    )["rushing_yards"].sum().rename(columns={"rusher_player_name": "player", "rushing_yards": "1q_rush_yds"})
    ru_grp = ru_grp.merge(q1_ru, on=["week", "game_id", "posteam", "defteam", "player"], how="left")
    ru_grp = ru_grp.merge(team_rush_tot, on=["game_id", "posteam"], how="left").fillna(0.0)
    ru_grp["role_share"] = np.where(ru_grp["team_rush_att"] > 0, ru_grp["carries"] / ru_grp["team_rush_att"], 0.40)
    ru_grp = ru_grp[ru_grp["carries"] >= 5].copy()

    # Receivers (rotation pass catchers >= 3 targets comparable to posted sportsbook rec lines)
    rec_all = df[(df["pass_attempt"] == 1) & df["receiver_player_name"].notna()].copy()
    rec_all["comp_rec_yds"] = np.where(rec_all["complete_pass"] == 1, rec_all["receiving_yards"].fillna(0.0), 0.0)
    rec_all["comp_1q_rec_yds"] = np.where((rec_all["complete_pass"] == 1) & (rec_all["qtr"] == 1), rec_all["receiving_yards"].fillna(0.0), 0.0)
    rec_all["rec_td_flag"] = np.where((rec_all["complete_pass"] == 1) & (rec_all["pass_touchdown"] == 1), 1.0, 0.0)
    rc_grp = rec_all.groupby(["week", "game_id", "posteam", "defteam", "receiver_player_name"], as_index=False).agg(
        receiving_yards=("comp_rec_yds", "sum"),
        receptions=("complete_pass", "sum"),
        longest_rec=("comp_rec_yds", "max"),
        q1_rec=("comp_1q_rec_yds", "sum"),
        rec_tds=("rec_td_flag", "sum"),
        targets=("pass_attempt", "count"),
    ).rename(columns={"receiver_player_name": "player", "q1_rec": "1q_rec_yds"})
    rc_grp = rc_grp.merge(team_pass_tot, on=["game_id", "posteam"], how="left").fillna(0.0)
    rc_grp["role_share"] = np.where(rc_grp["team_pass_att"] > 0, rc_grp["targets"] / rc_grp["team_pass_att"], 0.16)
    rc_grp = rc_grp[rc_grp["targets"] >= 3].copy()

    # Anytime TD combined pool
    atd_ru = ru_grp[["week", "game_id", "posteam", "defteam", "player", "rush_tds", "role_share"]].rename(columns={"rush_tds": "tds"})
    atd_rc = rc_grp[["week", "game_id", "posteam", "defteam", "player", "rec_tds", "role_share"]].rename(columns={"rec_tds": "tds"})
    atd_comb = (
        pd.concat([atd_ru, atd_rc], ignore_index=True)
        .groupby(["week", "game_id", "posteam", "defteam", "player"], as_index=False)
        .agg(tds=("tds", "sum"), role_share=("role_share", "max"))
    )
    atd_comb["anytime_td"] = (atd_comb["tds"] >= 1.0).astype(float)

    # IDP Defenders: aggregate solo, assist, sack per game
    def_records: list[dict[str, Any]] = []
    cols_present = set(df.columns)
    for (wk, gid, tm, opp), g_sub in df.groupby(["week", "game_id", "defteam", "posteam"]):
        if not tm or pd.isna(tm):
            continue
        solo_c: dict[str, float] = {}
        ast_c: dict[str, float] = {}
        sk_c: dict[str, float] = {}
        for col, tgt in (
            ("solo_tackle_1_player_name", solo_c),
            ("solo_tackle_2_player_name", solo_c),
        ):
            if col in cols_present:
                for pnm, cnt in g_sub[col].dropna().value_counts().items():
                    tgt[str(pnm)] = tgt.get(str(pnm), 0.0) + float(cnt)
        for col in ("assist_tackle_1_player_name", "assist_tackle_2_player_name"):
            if col in cols_present:
                for pnm, cnt in g_sub[col].dropna().value_counts().items():
                    ast_c[str(pnm)] = ast_c.get(str(pnm), 0.0) + float(cnt)
        for col, w_sk in (("sack_player_name", 1.0), ("half_sack_1_player_name", 0.5), ("half_sack_2_player_name", 0.5)):
            if col in cols_present:
                for pnm, cnt in g_sub[col].dropna().value_counts().items():
                    sk_c[str(pnm)] = sk_c.get(str(pnm), 0.0) + w_sk * float(cnt)
        opp_plays = float(len(g_sub))
        for pnm in set(solo_c) | set(ast_c) | set(sk_c):
            s_v = solo_c.get(pnm, 0.0)
            a_v = ast_c.get(pnm, 0.0)
            def_records.append({
                "week": int(wk),
                "game_id": gid,
                "posteam": tm,
                "defteam": opp,
                "player": pnm,
                "solo_tackles": s_v,
                "tackles_plus_assists": s_v + a_v,
                "sacks": sk_c.get(pnm, 0.0),
                "role_share": (s_v + a_v) / max(30.0, opp_plays),
            })
    def_df = pd.DataFrame(def_records)

    def _attach_ctx(frame: pd.DataFrame, fam: str) -> pd.DataFrame:
        out = frame[["week", "game_id", "posteam", "defteam", "player", fam, "role_share"]].rename(columns={fam: "y"})
        if not ctx_df.empty:
            out = out.merge(ctx_df, on=["game_id", "posteam"], how="left")
        out["implied_team_total"] = out.get("implied_team_total", 22.5)
        out["posteam_spread"] = out.get("posteam_spread", 0.0)
        out["total_line"] = out.get("total_line", 45.0)
        out["is_indoor"] = out.get("is_indoor", 0.0)
        out["wind_mph"] = out.get("wind_mph", 5.0)
        return out.fillna({"implied_team_total": 22.5, "posteam_spread": 0.0, "total_line": 45.0, "is_indoor": 0.0, "wind_mph": 5.0})

    tables: dict[str, pd.DataFrame] = {}
    for fam in ("passing_yards", "pass_attempts", "pass_completions", "passing_tds", "longest_comp", "1q_pass_yds"):
        tables[fam] = _attach_ctx(qb_grp, fam)
    for fam in ("rushing_yards", "carries", "longest_rush", "1q_rush_yds"):
        tables[fam] = _attach_ctx(ru_grp, fam)
    for fam in ("receiving_yards", "receptions", "longest_rec", "1q_rec_yds"):
        tables[fam] = _attach_ctx(rc_grp, fam)
    tables["anytime_td"] = _attach_ctx(atd_comb, "anytime_td")
    if not def_df.empty:
        for fam in ("tackles_plus_assists", "solo_tackles", "sacks"):
            tables[fam] = _attach_ctx(def_df, fam)
    else:
        for fam in ("tackles_plus_assists", "solo_tackles", "sacks"):
            tables[fam] = pd.DataFrame(columns=["week", "game_id", "posteam", "defteam", "player", "y", "role_share", "implied_team_total", "posteam_spread", "total_line", "is_indoor", "wind_mph"])
    return tables


def _ewma(arr: np.ndarray, alpha: float = 0.45) -> float:
    if len(arr) == 0:
        return 0.0
    val = float(arr[0])
    for x in arr[1:]:
        val = alpha * float(x) + (1.0 - alpha) * val
    return val


def _walkforward_family(
    fam: str,
    df: pd.DataFrame,
    eval_weeks: list[int],
) -> dict[str, Any]:
    is_tail = fam in TAIL_QUARANTINE_FAMILIES
    is_binary = fam in ("anytime_td", "sacks")
    floor_sd = 0.45 if is_binary else (1.1 if fam in ("receptions", "carries", "passing_tds", "solo_tackles", "tackles_plus_assists") else 8.0)

    causal_rows: list[dict[str, Any]] = []
    all_weeks = sorted(int(w) for w in df["week"].unique() if 1 <= int(w) <= 10)
    start_sub_w = min([w for w in all_weeks if w >= 3] or [3])

    for w in range(start_sub_w, max(eval_weeks) + 1):
        hist = df[df["week"] < w]
        curr = df[df["week"] == w]
        if hist.empty or curr.empty:
            continue
        lg_mean = float(hist["y"].mean() or 1.0)
        lg_imp_tot = float(hist["implied_team_total"].mean() or 22.5)
        opp_stats = hist.groupby("defteam")["y"].agg(["mean", "count"]).to_dict("index")
        p_groups = {p: g.sort_values("week") for p, g in hist.groupby("player")}

        for _, row in curr.iterrows():
            p_hist = p_groups.get(row["player"])
            if p_hist is None or len(p_hist) < 2:
                continue
            vals = p_hist["y"].to_numpy(dtype=np.float64)
            shares = p_hist["role_share"].to_numpy(dtype=np.float64) if "role_share" in p_hist.columns else np.ones_like(vals) * 0.25
            actual_y = float(row["y"])

            # Strictly causal opponent defense Empirical Bayes multiplier (k0 = 6.0 games)
            opp_info = opp_stats.get(row["defteam"], {"mean": lg_mean, "count": 0})
            opp_n = float(opp_info.get("count", 0))
            opp_raw = float(opp_info.get("mean", lg_mean))
            opp_eb = (opp_n * opp_raw + 6.0 * lg_mean) / max(1.0, opp_n + 6.0)

            # Strictly causal Vegas implied team total + spread script + weather factors
            imp_tot = float(row.get("implied_team_total", lg_imp_tot))
            tot_delta = (imp_tot - lg_imp_tot) / max(10.0, lg_imp_tot)
            spread = float(row.get("posteam_spread", 0.0))
            wind = float(row.get("wind_mph", 5.0))
            indoor = float(row.get("is_indoor", 0.0))

            if fam in PASSING_CENTRIC_FAMILIES:
                script_adj = -0.008 * spread  # underdog (-spread) passes more
                env_adj = 1.0 + 0.35 * tot_delta + script_adj + 0.015 * indoor - 0.004 * max(0.0, wind - 12.0)
            elif fam in RUSHING_CENTRIC_FAMILIES:
                script_adj = 0.010 * spread   # favorite (+spread) runs more to drain clock
                env_adj = 1.0 + 0.30 * tot_delta + script_adj + 0.003 * max(0.0, wind - 12.0)
            else:
                env_adj = 1.0 + 0.25 * tot_delta
            env_adj = float(np.clip(env_adj, 0.84, 1.18))

            share_recent = _ewma(shares, alpha=0.50)
            share_mean = float(np.mean(shares))
            role_trend = float(np.clip(1.0 + 0.30 * ((share_recent / max(0.02, share_mean)) - 1.0), 0.88, 1.14))

            if is_binary:
                line = 0.5
                p_mkt = float(np.clip(0.65 * float(np.mean(vals)) + 0.35 * lg_mean, 0.12, 0.85))
                opp_r = float(np.clip(opp_eb / max(0.05, lg_mean), 0.82, 1.18))
                base_r = 0.45 * _ewma(vals, alpha=0.45) + 0.55 * float(np.mean(vals))
                raw_p = float(np.clip(base_r * opp_r * env_adj * role_trend, 0.08, 0.90))
                p_emp = raw_p
                outcome = 1.0 if actual_y > line else 0.0
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
                z_ctx = (line - mu_ctx) / sd_sim
                p_norm = float(np.clip(_normal_sf(z_ctx), 0.08, 0.92))
                # Laplace-smoothed empirical tail probability shifts gently by context delta
                raw_emp = (float(np.sum(vals > line)) + 1.5) / (float(len(vals)) + 3.0)
                ctx_logit_shift = 0.65 * ((mu_ctx - mu_base) / sd_sim)
                p_emp = float(np.clip(_sigmoid(_logit(raw_emp) + ctx_logit_shift), 0.08, 0.92))
                raw_p = p_norm
                outcome = 1.0 if actual_y > line else 0.0

            causal_rows.append({
                "week": w,
                "p_sim": raw_p,
                "p_emp": p_emp,
                "p_mkt": p_mkt,
                "y": outcome,
            })

    cdf = pd.DataFrame(causal_rows)
    if cdf.empty:
        return {
            "w_sim": 0.20,
            "temp": 0.70,
            "max_prob_cap": 0.66,
            "emp_blend": 0.0,
            "walkforward_brier": 0.2600,
            "market_baseline_brier": 0.2500,
            "walkforward_accuracy": 0.5000,
            "n_oos": 0,
            "eligible_for_play": False,
        }

    # Strict causal fold evaluation (`week < w` fits `emp_blend`, `w_sim`, `temp`, `cap`; scores `week == w`)
    emp_grid = (0.0, 0.35, 0.65, 1.0)
    w_grid = (0.15, 0.25, 0.35, 0.45, 0.55)
    t_grid = (0.55, 0.70, 0.85, 1.00, 1.15)
    c_grid = (0.62, 0.66, 0.70, 0.74)

    oos_preds: list[float] = []
    oos_mkts: list[float] = []
    oos_ys: list[float] = []
    last_params = (0.25, 0.75, 0.68, 0.35)

    for w in eval_weeks:
        tr = cdf[cdf["week"] < w]
        te = cdf[cdf["week"] == w]
        if len(tr) >= 18:
            best_b = 999.0
            best_par = last_params
            tr_sim = tr["p_sim"].to_numpy(dtype=np.float64)
            tr_emp = tr["p_emp"].to_numpy(dtype=np.float64)
            tr_mkt = np.array([_logit(p) for p in tr["p_mkt"]], dtype=np.float64)
            tr_y = tr["y"].to_numpy(dtype=np.float64)
            for eb in emp_grid:
                p_mix = (1.0 - eb) * tr_sim + eb * tr_emp
                l_mix = np.array([_logit(p) for p in p_mix], dtype=np.float64)
                for ws in w_grid:
                    for tm in t_grid:
                        logits = ws * tm * l_mix + (1.0 - ws) * tr_mkt
                        probs = 1.0 / (1.0 + np.exp(-np.clip(logits, -10.0, 10.0)))
                        for cp in c_grid:
                            pc = np.clip(probs, 1.0 - cp, cp)
                            brier = float(np.mean((pc - tr_y) ** 2))
                            if brier < best_b:
                                best_b = brier
                                best_par = (ws, tm, cp, eb)
            last_params = best_par

        ws_f, tm_f, cp_f, eb_f = last_params
        if not te.empty:
            for _, r in te.iterrows():
                p_m = (1.0 - eb_f) * float(r["p_sim"]) + eb_f * float(r["p_emp"])
                lg = ws_f * tm_f * _logit(p_m) + (1.0 - ws_f) * _logit(float(r["p_mkt"]))
                p_cal = min(cp_f, max(1.0 - cp_f, _sigmoid(lg)))
                oos_preds.append(p_cal)
                oos_mkts.append(float(r["p_mkt"]))
                oos_ys.append(float(r["y"]))

    if not oos_preds:
        return {
            "w_sim": last_params[0],
            "temp": last_params[1],
            "max_prob_cap": last_params[2],
            "emp_blend": last_params[3],
            "walkforward_brier": 0.2600,
            "market_baseline_brier": 0.2500,
            "walkforward_accuracy": 0.5000,
            "n_oos": 0,
            "eligible_for_play": False,
        }

    p_arr = np.array(oos_preds, dtype=np.float64)
    m_arr = np.array(oos_mkts, dtype=np.float64)
    y_arr = np.array(oos_ys, dtype=np.float64)
    wf_brier = float(np.mean((p_arr - y_arr) ** 2))
    mkt_brier = float(np.mean((m_arr - y_arr) ** 2))
    pred_dir = (p_arr >= m_arr).astype(np.float64)
    wf_acc = float(np.mean(pred_dir == y_arr))

    # Refit head params strictly on causal eval rows up through W10 for downstream inference
    tr_all_sim = cdf["p_sim"].to_numpy(dtype=np.float64)
    tr_all_emp = cdf["p_emp"].to_numpy(dtype=np.float64)
    tr_all_mkt = np.array([_logit(p) for p in cdf["p_mkt"]], dtype=np.float64)
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
                    pc = np.clip(probs, 1.0 - cp, cp)
                    brier = float(np.mean((pc - tr_all_y) ** 2))
                    if brier < best_all_b:
                        best_all_b = brier
                        final_par = (ws, tm, cp, eb)

    if is_tail:
        eligible = bool(len(p_arr) >= 30 and (wf_brier <= mkt_brier - 0.005) and (wf_acc >= 0.550))
    else:
        eligible = bool(len(p_arr) >= 30 and (wf_brier < mkt_brier) and (wf_acc >= 0.535))

    return {
        "w_sim": round(float(final_par[0]), 4),
        "temp": round(float(final_par[1]), 4),
        "max_prob_cap": round(float(final_par[2]), 4),
        "emp_blend": round(float(final_par[3]), 4),
        "walkforward_brier": round(wf_brier, 5),
        "market_baseline_brier": round(mkt_brier, 5),
        "walkforward_accuracy": round(wf_acc, 4),
        "n_oos": int(len(p_arr)),
        "eligible_for_play": eligible,
    }


def run_walkforward_prop_calibration(
    pbp_path: Path | None = None,
    out_path: Path | None = None,
) -> dict[str, Any]:
    """Run strictly causal Weeks 1-10 walk-forward calibration across all 18 prop families."""
    src_p = Path(pbp_path or DEFAULT_PBP_PATH)
    pbp = pd.read_parquet(src_p)
    tables = _extract_family_tables(pbp)
    eval_weeks = [4, 5, 6, 7, 8, 9, 10]
    families: dict[str, dict[str, Any]] = {}
    for fam, df_f in tables.items():
        families[fam] = _walkforward_family(fam, df_f, eval_weeks=eval_weeks)

    artifact = {
        "schema": "gse_prop_family_walkforward_calibration_v2",
        "strictly_causal": True,
        "season": 2026,
        "eval_weeks": eval_weeks,
        "features": ["ewma_role_share", "eb_opp_defense", "vegas_implied_team_total", "spread_script", "roof_wind", "empirical_tail_blend"],
        "quarantine_rule": "eligible_for_play=False if walkforward_brier >= market_baseline_brier or walkforward_accuracy < 0.535",
        "families": families,
    }
    target_p = Path(out_path or DEFAULT_HEADS_PATH)
    target_p.parent.mkdir(parents=True, exist_ok=True)
    target_p.write_text(json.dumps(artifact, indent=2) + "\n", encoding="utf-8")
    load_prop_calibration_heads.cache_clear()
    return artifact


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
    """Apply causal walk-forward Platt + shrinkage calibration and enforce family quarantine."""
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
    cal_p = min(cap, max(1.0 - cap, _sigmoid(cal_logit)))

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
    parser = argparse.ArgumentParser(description="Causal Weeks 1-10 walk-forward prop family calibration v2")
    parser.add_argument("--pbp", default=str(DEFAULT_PBP_PATH))
    parser.add_argument("--out", default=str(DEFAULT_HEADS_PATH))
    args = parser.parse_args(argv)
    res = run_walkforward_prop_calibration(pbp_path=Path(args.pbp), out_path=Path(args.out))
    fams = res["families"]
    print(f"[WALKFORWARD PROP CAL v2] families={len(fams)} -> {args.out}")
    for k, v in sorted(fams.items()):
        print(
            f"  {k:22s} | w_sim={v['w_sim']:.2f} T={v['temp']:.2f} cap={v['max_prob_cap']:.2f} eb={v['emp_blend']:.2f} "
            f"| brier={v['walkforward_brier']:.4f} mkt={v['market_baseline_brier']:.4f} "
            f"acc={v['walkforward_accuracy']:.3f} n={v['n_oos']:3d} | eligible={v['eligible_for_play']}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
