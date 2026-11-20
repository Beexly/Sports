#!/usr/bin/env python3
"""
Causal Walk-Forward Prop Calibration (`calibrate_360_prop_families_walkforward.py`)
=================================================================================
Strictly causal Weeks 1-10 walk-forward calibrator across all 18 prop families.
For every eval week `w in [4..10]`, only `week < w` play-by-play rows are used to:
  1. Estimate causal trailing distribution + opponent defensive adjustment
  2. Fit blended logit weight `w_sim`, Platt temperature `temp`, and `max_prob_cap`
     on prior out-of-sample sub-folds (`weeks < w`)
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


def _extract_family_tables(pbp: pd.DataFrame) -> dict[str, pd.DataFrame]:
    df = pbp.copy()
    df["posteam"] = df["posteam"].replace({"LA": "LAR"})
    df["defteam"] = df["defteam"].replace({"LA": "LAR"})

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
    qb_grp = qb_grp.fillna(0.0)
    # Keep genuine QB1 starter workloads (>= 16 attempts) comparable to posted sportsbook QB lines
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
    ru_grp = ru_grp.merge(q1_ru, on=["week", "game_id", "posteam", "defteam", "player"], how="left").fillna(0.0)
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
    ).rename(columns={"receiver_player_name": "player", "q1_rec": "1q_rec_yds"}).fillna(0.0)
    rc_grp = rc_grp[rc_grp["targets"] >= 3].copy()

    # Anytime TD combined pool
    atd_ru = ru_grp[["week", "game_id", "posteam", "defteam", "player", "rush_tds"]].rename(columns={"rush_tds": "tds"})
    atd_rc = rc_grp[["week", "game_id", "posteam", "defteam", "player", "rec_tds"]].rename(columns={"rec_tds": "tds"})
    atd_comb = (
        pd.concat([atd_ru, atd_rc], ignore_index=True)
        .groupby(["week", "game_id", "posteam", "defteam", "player"], as_index=False)["tds"]
        .sum()
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
            })
    def_df = pd.DataFrame(def_records)

    tables: dict[str, pd.DataFrame] = {}
    for fam in ("passing_yards", "pass_attempts", "pass_completions", "passing_tds", "longest_comp", "1q_pass_yds"):
        tables[fam] = qb_grp[["week", "game_id", "posteam", "defteam", "player", fam]].rename(columns={fam: "y"})
    for fam in ("rushing_yards", "carries", "longest_rush", "1q_rush_yds"):
        tables[fam] = ru_grp[["week", "game_id", "posteam", "defteam", "player", fam]].rename(columns={fam: "y"})
    for fam in ("receiving_yards", "receptions", "longest_rec", "1q_rec_yds"):
        tables[fam] = rc_grp[["week", "game_id", "posteam", "defteam", "player", fam]].rename(columns={fam: "y"})
    tables["anytime_td"] = atd_comb[["week", "game_id", "posteam", "defteam", "player", "anytime_td"]].rename(columns={"anytime_td": "y"})
    if not def_df.empty:
        for fam in ("tackles_plus_assists", "solo_tackles", "sacks"):
            tables[fam] = def_df[["week", "game_id", "posteam", "defteam", "player", fam]].rename(columns={fam: "y"})
    else:
        for fam in ("tackles_plus_assists", "solo_tackles", "sacks"):
            tables[fam] = pd.DataFrame(columns=["week", "game_id", "posteam", "defteam", "player", "y"])
    return tables


def _walkforward_family(
    fam: str,
    df: pd.DataFrame,
    eval_weeks: list[int],
) -> dict[str, Any]:
    is_tail = fam in TAIL_QUARANTINE_FAMILIES
    is_binary = fam in ("anytime_td", "sacks")
    floor_sd = 0.45 if is_binary else (1.1 if fam in ("receptions", "carries", "passing_tds", "solo_tackles", "tackles_plus_assists") else 8.0)

    # Precompute causal weekly prediction records
    causal_rows: list[dict[str, Any]] = []
    all_weeks = sorted(int(w) for w in df["week"].unique() if 1 <= int(w) <= 10)
    start_sub_w = min([w for w in all_weeks if w >= 3] or [3])

    for w in range(start_sub_w, max(eval_weeks) + 1):
        hist = df[df["week"] < w]
        curr = df[df["week"] == w]
        if hist.empty or curr.empty:
            continue
        lg_mean = float(hist["y"].mean() or 1.0)
        opp_means = hist.groupby("defteam")["y"].mean().to_dict()
        p_groups = {p: g.sort_values("week") for p, g in hist.groupby("player")}
        for _, row in curr.iterrows():
            p_hist = p_groups.get(row["player"])
            if p_hist is None or len(p_hist) < 2:
                continue
            vals = p_hist["y"].to_numpy(dtype=np.float64)
            actual_y = float(row["y"])
            if is_binary:
                line = 0.5
                p_mkt = float(np.clip(0.65 * float(np.mean(vals)) + 0.35 * lg_mean, 0.12, 0.85))
                opp_r = float(np.clip(opp_means.get(row["defteam"], lg_mean) / max(0.05, lg_mean), 0.85, 1.15))
                raw_p = float(np.clip((0.5 * float(np.mean(vals[-3:])) + 0.5 * float(np.mean(vals))) * opp_r, 0.08, 0.90))
                outcome = 1.0 if actual_y > line else 0.0
            else:
                med_v = float(np.median(vals))
                mean_v = float(np.mean(vals))
                # Market proxy line anchored symmetrically between trailing median & mean
                raw_l = 0.5 * med_v + 0.5 * mean_v
                if abs(actual_y - raw_l) < 1e-6:
                    raw_l += 0.5
                line = math.floor(raw_l) + 0.5
                p_mkt = 0.50
                opp_r = float(np.clip(opp_means.get(row["defteam"], lg_mean) / max(1.0, lg_mean), 0.82, 1.18))
                recent = float(np.mean(vals[-3:]))
                mu_sim = (0.60 * recent + 0.40 * mean_v) * (1.0 + 0.45 * (opp_r - 1.0))
                sd_sim = max(floor_sd, float(np.std(vals, ddof=1)) if len(vals) >= 3 else floor_sd * 1.4)
                z = (line - mu_sim) / sd_sim
                raw_p = float(np.clip(_normal_sf(z), 0.08, 0.92))
                outcome = 1.0 if actual_y > line else 0.0
            causal_rows.append({
                "week": w,
                "p_sim": raw_p,
                "p_mkt": p_mkt,
                "y": outcome,
            })

    cdf = pd.DataFrame(causal_rows)
    if cdf.empty:
        return {
            "w_sim": 0.20,
            "temp": 0.70,
            "max_prob_cap": 0.66,
            "walkforward_brier": 0.2600,
            "market_baseline_brier": 0.2500,
            "walkforward_accuracy": 0.5000,
            "n_oos": 0,
            "eligible_for_play": False,
        }

    # Strict causal fold evaluation for week in eval_weeks (params fit strictly on causal_week < w)
    w_grid = (0.15, 0.25, 0.35, 0.45, 0.55)
    t_grid = (0.55, 0.70, 0.85, 1.00, 1.15)
    c_grid = (0.62, 0.66, 0.70, 0.74)

    oos_preds: list[float] = []
    oos_mkts: list[float] = []
    oos_ys: list[float] = []
    last_params = (0.25, 0.75, 0.68)

    for w in eval_weeks:
        tr = cdf[cdf["week"] < w]
        te = cdf[cdf["week"] == w]
        if len(tr) >= 18:
            best_b = 999.0
            best_par = (0.25, 0.75, 0.68)
            tr_sim = np.array([_logit(p) for p in tr["p_sim"]], dtype=np.float64)
            tr_mkt = np.array([_logit(p) for p in tr["p_mkt"]], dtype=np.float64)
            tr_y = tr["y"].to_numpy(dtype=np.float64)
            for ws in w_grid:
                for tm in t_grid:
                    logits = ws * tm * tr_sim + (1.0 - ws) * tr_mkt
                    probs = 1.0 / (1.0 + np.exp(-np.clip(logits, -10.0, 10.0)))
                    for cp in c_grid:
                        pc = np.clip(probs, 1.0 - cp, cp)
                        brier = float(np.mean((pc - tr_y) ** 2))
                        if brier < best_b:
                            best_b = brier
                            best_par = (ws, tm, cp)
            last_params = best_par

        ws_f, tm_f, cp_f = last_params
        if not te.empty:
            for _, r in te.iterrows():
                lg = ws_f * tm_f * _logit(float(r["p_sim"])) + (1.0 - ws_f) * _logit(float(r["p_mkt"]))
                p_cal = min(cp_f, max(1.0 - cp_f, _sigmoid(lg)))
                oos_preds.append(p_cal)
                oos_mkts.append(float(r["p_mkt"]))
                oos_ys.append(float(r["y"]))

    if not oos_preds:
        return {
            "w_sim": last_params[0],
            "temp": last_params[1],
            "max_prob_cap": last_params[2],
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
    tr_all_sim = np.array([_logit(p) for p in cdf["p_sim"]], dtype=np.float64)
    tr_all_mkt = np.array([_logit(p) for p in cdf["p_mkt"]], dtype=np.float64)
    tr_all_y = cdf["y"].to_numpy(dtype=np.float64)
    best_all_b = 999.0
    final_par = last_params
    for ws in w_grid:
        for tm in t_grid:
            logits = ws * tm * tr_all_sim + (1.0 - ws) * tr_all_mkt
            probs = 1.0 / (1.0 + np.exp(-np.clip(logits, -10.0, 10.0)))
            for cp in c_grid:
                pc = np.clip(probs, 1.0 - cp, cp)
                brier = float(np.mean((pc - tr_all_y) ** 2))
                if brier < best_all_b:
                    best_all_b = brier
                    final_par = (ws, tm, cp)

    if is_tail:
        eligible = bool(len(p_arr) >= 30 and (wf_brier <= mkt_brier - 0.005) and (wf_acc >= 0.550))
    else:
        eligible = bool(len(p_arr) >= 30 and (wf_brier < mkt_brier) and (wf_acc >= 0.535))

    return {
        "w_sim": round(float(final_par[0]), 4),
        "temp": round(float(final_par[1]), 4),
        "max_prob_cap": round(float(final_par[2]), 4),
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
        "schema": "gse_prop_family_walkforward_calibration_v1",
        "strictly_causal": True,
        "season": 2026,
        "eval_weeks": eval_weeks,
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

    # Guarantee modest minimum blend weight when sim & market are evaluated under non-quarantined regime
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
    parser = argparse.ArgumentParser(description="Causal Weeks 1-10 walk-forward prop family calibration")
    parser.add_argument("--pbp", default=str(DEFAULT_PBP_PATH))
    parser.add_argument("--out", default=str(DEFAULT_HEADS_PATH))
    args = parser.parse_args(argv)
    res = run_walkforward_prop_calibration(pbp_path=Path(args.pbp), out_path=Path(args.out))
    fams = res["families"]
    print(f"[WALKFORWARD PROP CAL] families={len(fams)} -> {args.out}")
    for k, v in sorted(fams.items()):
        print(
            f"  {k:22s} | w_sim={v['w_sim']:.2f} T={v['temp']:.2f} cap={v['max_prob_cap']:.2f} "
            f"| brier={v['walkforward_brier']:.4f} mkt={v['market_baseline_brier']:.4f} "
            f"acc={v['walkforward_accuracy']:.3f} n={v['n_oos']:3d} | eligible={v['eligible_for_play']}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
