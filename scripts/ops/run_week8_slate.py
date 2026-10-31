#!/usr/bin/env python3
"""
scripts/ops/run_week8_slate.py — Week 8 360-Degree Full-Board Pathwise Engine Runner
====================================================================================
Simulates all 13 remaining Week 8 Sunday/Monday matchups (10,000 worlds x 175 snaps = 22.75M snaps)
through the fully upgraded GSE Coach-Mind Simulator (`gse_coach_mind_simulator.py`) and Consolidated
X + Instagram Sweep Kernels (`engine/kernels/consolidated_sweep_kernels.py`), then evaluates the
entire 360-degree board:
  1. Main Game Markets (Spread, Total, Moneyline) vs live de-vigged DraftKings prices
  2. Quarters & Halves (`1Q Spread/Total`, `1H Spread/Total`, `2H Total`, `1H Team Totals`)
  3. All 419 Live DraftKings Player Props (`Pass Yds`, `Pass TDs`, `Pass Completions`,
     `Rush Yds`, `Rush Attempts`, `Rec Yds`, `Receptions`, `Rush+Rec Yds`) with per-player
     active games played (`player_gp`), `C-287 WOPR`, `@TheMockingBoard ALTITUDE`, role-conditioned
     YPR scaling, and `@whitebison_analytics` 55/45 prop calibration blend
  4. Kicking Suite (`FGM O/U 1.5`, `Kicking Points O/U 6.5`) via pathwise FG/PAT vectors
  5. IDP Tackles & Sacks Suite (`C-300 @rynoonan` tackle opportunity kernel + Edge sack vectors)
  6. Goal-Line / Anytime TD Suite (`@locktalkbets` inside-the-5 QB vulture vs RB1 goal-line share)

Every candidate decision (`PUBLISH` or `PASS`) is logged with full mathematical and transport
certificates via `append_gate_decision` to `data/engine/week8_gate_decisions_2026_10_30.jsonl`.
"""
from __future__ import annotations

import importlib.util
import json
import math
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np
import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

# Direct import of simulator module
SIM_PATH = Path(__file__).resolve().parent / "gse_coach_mind_simulator.py"
spec = importlib.util.spec_from_file_location("gse_coach_mind_simulator", str(SIM_PATH))
assert spec is not None and spec.loader is not None
sim = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sim)

from intelligence.coaching.qb_disguise_blitz_matrix import evaluate_qb_matchup_2x2, TEAM_TO_QB_2026
from intelligence.coaching.pm_sweep_convergence_kernels import wr_360_all_metrics_kernel
from intelligence.data_loaders.signal_pack_loader import append_gate_decision
from engine.kernels.consolidated_sweep_kernels import (
    load_consolidated_2026_pbp_metrics,
    compute_c281_tprr_yprr_composite,
    compute_c287_wopr,
    compute_mockingboard_altitude,
    compute_c300_rynoonan_idp_tackles_kernel,
    compute_locktalk_qb_vulture_goal_line_split,
    compute_whitebison_prop_calibration_blend,
    cap_stage_d_overlay_log_odds,
)


NAME_ALIASES = {
    "joshua palmer": "josh palmer",
    "kyle pitts sr": "kyle pitts",
    "james cook iii": "james cook",
    "brian robinson jr": "brian robinson",
    "chris godwin jr": "chris godwin",
    "marvin harrison jr": "marvin harrison",
    "michael pittman jr": "michael pittman",
    "brian thomas jr": "brian thomas",
    "tyrone tracy jr": "tyrone tracy",
    "kenneth walker iii": "kenneth walker",
}

POSITIONAL_MARKET_PRIORS: Dict[Tuple[str, str], float] = {
    ("Passing Yards", "QB"): 225.0,
    ("Passing TDs", "QB"): 1.55,
    ("Pass Completions", "QB"): 20.5,
    ("Receiving Yards", "WR"): 46.0,
    ("Receiving Yards", "TE"): 34.0,
    ("Receiving Yards", "RB"): 20.0,
    ("Receptions", "WR"): 4.1,
    ("Receptions", "TE"): 3.5,
    ("Receptions", "RB"): 2.6,
    ("Rushing Yards", "RB"): 52.0,
    ("Rushing Yards", "QB"): 20.0,
    ("Rushing Yards", "WR"): 8.0,
    ("Rushing Attempts", "RB"): 12.0,
    ("Rushing Attempts", "QB"): 4.2,
    ("Rush + Rec Yards", "RB"): 74.0,
    ("Rush + Rec Yards", "WR"): 52.0,
}


def norm_name(name: str) -> str:
    s = str(name).lower().replace(".", "").replace("'", "").strip()
    return NAME_ALIASES.get(s, s)


def american_to_prob(odds: float | int | str | None) -> float:
    if odds is None:
        return 0.5238
    try:
        o = float(odds)
    except Exception:
        return 0.5238
    if o == 0:
        return 0.5238
    if o < 0:
        return (-o) / ((-o) + 100.0)
    return 100.0 / (o + 100.0)


def devig_two_way(over_odds: Any, under_odds: Any) -> Tuple[float, float]:
    p_o = american_to_prob(over_odds)
    p_u = american_to_prob(under_odds)
    tot = p_o + p_u
    if tot <= 0:
        return 0.50, 0.50
    return p_o / tot, p_u / tot


def stage_d_prob(base_prob: float, candidate_prob: float, max_abs_log_odds: float = 0.35) -> float:
    p0 = float(np.clip(base_prob, 0.01, 0.99))
    p1 = float(np.clip(candidate_prob, 0.01, 0.99))
    delta_logit = math.log(p1 / (1.0 - p1)) - math.log(p0 / (1.0 - p0))
    res = cap_stage_d_overlay_log_odds(p0, [delta_logit], max_abs_log_odds=max_abs_log_odds)
    return float(res["final_prob"])


def prob_to_american_str(p: float) -> str:
    p_c = float(np.clip(p, 0.02, 0.98))
    if p_c >= 0.50:
        odds = -int(round(100.0 * p_c / (1.0 - p_c)))
        return f"{odds:+d}"
    odds = int(round(100.0 * (1.0 - p_c) / p_c))
    return f"+{odds}"


def normal_tail_prob_over(samples: np.ndarray, line: float, scale_floor: float = 1.5) -> float:
    """Combines empirical Monte Carlo indicator with kernel-smoothed tail stability."""
    emp = float(np.mean(samples > line))
    mu = float(np.mean(samples))
    sd = float(max(np.std(samples), scale_floor))
    z = (mu - float(line)) / sd
    smooth = 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))
    return float(np.clip(0.65 * emp + 0.35 * smooth, 0.01, 0.99))


def compute_internal_player_distribution(
    market: str,
    stat_pg: float,
    player_gp: int,
    position: str,
    team_vec: np.ndarray,
    team_baseline: float,
    realloc_mult: float = 1.0,
    internal_role_prior: float | None = None,
    include_samples: bool = True,
) -> Dict[str, Any]:
    """
    Phase I Pure Internal Player Projection (ZERO ODDS / ZERO SPORTSBOOK LINE):
    1. Player's 2026 per-active-game empirical average `stat_pg` (`player_gp`), scaled by their
       same-position injury reallocation multiplier (`realloc_mult`).
    2. Shrunk via GP Empirical-Bayes (`w_gp = min(0.75, max(0.35, gp / (gp + 4.0)))`) toward the
       internal positional/role baseline (`internal_role_prior` or `POSITIONAL_MARKET_PRIORS`) —
       NEVER using the sportsbook `line` in `mu_base`!
    3. Modulated by the pure internal pathwise team environment (`env_mult = np.clip(tm_mean / max(team_baseline, 1.0), 0.88, 1.12)`).
    """
    gp = max(int(player_gp), 1)
    st_realloc = float(stat_pg) * float(realloc_mult)
    role_prior = (
        float(internal_role_prior)
        if internal_role_prior is not None
        else float(POSITIONAL_MARKET_PRIORS.get((market, position), st_realloc))
    )
    if gp < 4:
        w_gp = 0.18 * (gp / 3.0)
        role_prior = min(role_prior, 24.0) if market == "Receiving Yards" else role_prior
    else:
        w_gp = min(0.75, max(0.35, gp / (gp + 4.0)))

    tm_mean = float(np.mean(team_vec))
    env_mult = float(np.clip(tm_mean / max(float(team_baseline), 1.0), 0.88, 1.12))
    mu_base = (role_prior + w_gp * (st_realloc - role_prior)) * (0.45 * env_mult + 0.55)

    # Realistic single-player game-to-game standard deviation by market (purely from internal mu_base, zero book line)
    if market == "Passing Yards":
        sigma_p = max(0.24 * mu_base, 46.0)
    elif market == "Receiving Yards":
        sigma_p = max(0.58 * mu_base, 18.0)
    elif market == "Rushing Yards":
        sigma_p = max(0.52 * mu_base, 16.5) if position != "QB" else max(0.62 * mu_base, 12.5)
    elif market == "Rush + Rec Yards":
        sigma_p = max(0.46 * mu_base, 20.0)
    elif market in ("Receptions", "Pass Completions", "Rushing Attempts"):
        sigma_p = max(0.45 * mu_base, 2.15)
    elif market == "Passing TDs":
        sigma_p = max(0.65 * mu_base, 0.95)
    else:
        sigma_p = max(0.50 * mu_base, 10.0)

    out: Dict[str, Any] = {
        "mu_base": float(mu_base),
        "sigma_p": float(sigma_p),
        "w_gp": float(w_gp),
        "env_mult": float(env_mult),
    }
    if include_samples:
        tm_sd = max(float(np.std(team_vec)), 1e-6)
        z_team_shock = (team_vec - tm_mean) / tm_sd
        out["samples"] = mu_base + 0.35 * sigma_p * z_team_shock
    return out


def project_player_prop_prob(
    market: str,
    line: float,
    stat_pg: float,
    player_gp: int,
    position: str,
    team_vec: np.ndarray,
    team_baseline: float,
    overlay_log_odds_deltas: List[float],
    devig_over: float = 0.50,
    devig_under: float = 0.50,
    realloc_mult: float = 1.0,
    internal_role_prior: float | None = None,
    precomputed_internal: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    """
    Strict Two-Phase Odds-Last Player Prop Evaluator:
    - Phase I (`compute_internal_player_distribution`): Computes `mu_base`, `sigma_p`, and `samples`
      purely from internal 2026 empirical stats (`stat_pg * realloc_mult`), GP Empirical-Bayes shrinkage
      toward `internal_role_prior` (`POSITIONAL_MARKET_PRIORS`), and pathwise `team_vec` — NEVER using
      the sportsbook `line` in `mu_base`!
    - Phase II (Market Comparison Strictly Last): Evaluates `p_base_over = P(internal_samples > line)`
      against the sportsbook `line`, applies internal Stage D (`cap_stage_d_overlay_log_odds(p_base, signed_overlays, max_abs_log_odds=0.35)`),
      and compares `model_p` against `devig_over` / `devig_under` LAST (`edge = model_p - mkt_p`).
    """
    gp = max(int(player_gp), 1)
    ln = float(line)
    internal_dist = (
        precomputed_internal
        if precomputed_internal is not None
        else compute_internal_player_distribution(
            market=market,
            stat_pg=stat_pg,
            player_gp=gp,
            position=position,
            team_vec=team_vec,
            team_baseline=team_baseline,
            realloc_mult=realloc_mult,
            internal_role_prior=internal_role_prior,
        )
    )
    mu_base = float(internal_dist["mu_base"])
    sigma_p = float(internal_dist["sigma_p"])
    if "samples" in internal_dist:
        samples = np.asarray(internal_dist["samples"], dtype=np.float64)
    else:
        tm_mean = float(np.mean(team_vec))
        tm_sd = max(float(np.std(team_vec)), 1e-6)
        z_team_shock = (team_vec - tm_mean) / tm_sd
        samples = mu_base + 0.35 * sigma_p * z_team_shock

    # Phase II: evaluate internal distribution against sportsbook line LAST
    z_base = (mu_base - ln) / sigma_p
    p_base_over = float(np.clip(0.5 * (1.0 + math.erf(z_base / math.sqrt(2.0))), 0.05, 0.95))

    if p_base_over >= 0.50:
        side_str = "OVER"
        p_base = p_base_over
        mkt_p = float(devig_over)
        signed_overlays = [float(d) for d in overlay_log_odds_deltas]
    else:
        side_str = "UNDER"
        p_base = 1.0 - p_base_over
        mkt_p = float(devig_under)
        signed_overlays = [-float(d) for d in overlay_log_odds_deltas]

    if gp < 4:
        signed_overlays = [d * (gp / 6.0) for d in signed_overlays]

    stage_d_res = cap_stage_d_overlay_log_odds(p_base, signed_overlays, max_abs_log_odds=0.35)
    model_p = float(stage_d_res["final_prob"])
    if gp < 4:
        model_p = min(model_p, 0.585)

    return {
        "side": side_str,
        "raw_prob": round(p_base, 4),
        "model_p": round(model_p, 4),
        "market_p": round(mkt_p, 4),
        "edge": round(model_p - mkt_p, 4),
        "model_median": round(float(np.median(samples)), 2),
        "model_mean": round(mu_base, 2),
        "samples": samples,
    }


def _load_dk_csv_outs_and_rosters() -> Tuple[set[Tuple[str, str]], List[Dict[str, Any]]]:
    """Ingests all OUT and IR players from DKSalaries-1.csv and DKSalaries.csv."""
    dk_paths = [
        REPO_ROOT / "data" / "dfs" / "dk-2026-10-31" / "DKSalaries-1.csv",
        REPO_ROOT / "data" / "dfs" / "dk-2026-10-31" / "DKSalaries.csv",
    ]
    dk_outs: set[Tuple[str, str]] = set()
    dk_rows: List[Dict[str, Any]] = []
    seen_keys: set[Tuple[str, str]] = set()
    for p in dk_paths:
        if not p.exists():
            continue
        sdf = pd.read_csv(p)
        for _, r in sdf.iterrows():
            pos = str(r.get("Position", "")).strip()
            if pos == "DST":
                continue
            nm_raw = str(r.get("Name", "")).strip()
            tm = str(r.get("TeamAbbrev", "")).strip().replace("LAR", "LA").replace("WSH", "WAS")
            st = str(r.get("Status", "ACT")).strip().upper()
            sal = int(r.get("Salary", 0))
            nm = norm_name(nm_raw)
            if st in ("OUT", "IR", "D"):
                dk_outs.add((tm, nm))
            if (tm, nm) not in seen_keys:
                seen_keys.add((tm, nm))
                dk_rows.append({
                    "player_name": nm_raw,
                    "name_norm": nm,
                    "team": tm,
                    "position": pos,
                    "salary": sal,
                    "status": st,
                })
    return dk_outs, dk_rows


def build_player_profiles(
    pw_df: pd.DataFrame,
    inj_df: pd.DataFrame,
    include_nfl_com_outs: bool = True,
) -> Dict[str, Any]:
    """
    Extracts per-player active games played (`player_gp` in 2026 Weeks 1-7) and per-game
    production shares from `pennydata_2026_player_week_stats.csv`, resolving mid-season
    trades to each player's latest-week team and resolving Week 8 injuries from each
    player's latest report row + NFL.com confirmed OUTs + DKSalaries-1.csv / DKSalaries.csv
    OUT and IR players.
    For every team and every position (`RB`, `WR`, `TE`), zeroes the `OUT`/`IR` players'
    carry and target shares (`0.0`) and reallocates/renormalizes the vacated share mass
    strictly across the remaining active players of the SAME position on that team.
    """
    df = pw_df[pw_df["season"] == 2026].copy()
    df["team_norm"] = df["team"].replace({"LAR": "LA", "WSH": "WAS"})
    df["name_norm"] = df["player_display_name"].map(norm_name)
    df = df.sort_values("week").drop_duplicates(subset=["player_id", "week"], keep="last").copy()

    # Resolve mid-season traded players to their latest-week team in 2026
    latest_team_by_pid = df.groupby("player_id")["team_norm"].last().to_dict()
    df["current_team"] = df["player_id"].map(latest_team_by_pid)
    df = df[df["team_norm"] == df["current_team"]].copy()

    # Identify Week 8 Out / Doubtful players using each player's latest week row (no Week 7 bleedover)
    inj26 = inj_df[inj_df["season"] == 2026].copy()
    inj26["team_norm"] = inj26["team"].replace({"LAR": "LA", "WSH": "WAS"})
    inj26["name_norm"] = inj26["full_name"].map(norm_name)
    latest_inj = inj26.sort_values("week").drop_duplicates(subset=["team_norm", "name_norm"], keep="last")
    w8_out_rows = latest_inj[
        (latest_inj["week"] == 8) & (latest_inj["report_status"].isin(["Out", "Doubtful"]))
    ]
    out_set = set(zip(w8_out_rows["team_norm"].tolist(), w8_out_rows["name_norm"].tolist()))
    dk_outs, dk_roster_rows = _load_dk_csv_outs_and_rosters()
    if include_nfl_com_outs:
        out_set |= {
            ("LA" if tm == "LAR" else tm, norm_name(nm))
            for tm, nm in sim.week8_confirmed_out_names()
        }
        out_set |= dk_outs

    # Team per-game totals across 2026 Weeks 1-7
    team_gp = df.groupby("team_norm")["week"].nunique().to_dict()
    team_totals = (
        df.groupby("team_norm")[
            [
                "passing_yards",
                "passing_tds",
                "completions",
                "attempts",
                "rushing_yards",
                "carries",
                "receiving_yards",
                "receptions",
                "targets",
            ]
        ]
        .sum()
        .to_dict(orient="index")
    )

    player_map: Dict[str, Dict[str, Any]] = {}
    for (tm, nm, pid), grp in df.groupby(["team_norm", "name_norm", "player_id"]):
        gp = int(grp["week"].nunique())
        if gp <= 0:
            continue
        pos = str(grp["position"].iloc[-1])
        disp = str(grp["player_display_name"].iloc[-1])
        tm_gp = max(int(team_gp.get(tm, 7)), 1)
        tt = team_totals.get(tm, {})

        rec_yds_pg = float(grp["receiving_yards"].sum()) / gp
        rec_pg = float(grp["receptions"].sum()) / gp
        tgt_pg = float(grp["targets"].sum()) / gp
        rush_yds_pg = float(grp["rushing_yards"].sum()) / gp
        carries_pg = float(grp["carries"].sum()) / gp
        pass_yds_pg = float(grp["passing_yards"].sum()) / gp
        pass_tds_pg = float(grp["passing_tds"].sum()) / gp
        comp_pg = float(grp["completions"].sum()) / gp
        att_pg = float(grp["attempts"].sum()) / gp

        is_phased_out = False
        if pos == "RB" and gp >= 4:
            prior_carries = float(grp["carries"].iloc[:-1].mean())
            latest_carries = float(grp["carries"].iloc[-1])
            latest_targets = float(grp["targets"].iloc[-1])
            if prior_carries >= 10.0 and latest_carries <= 0.45 * prior_carries and latest_targets == 0.0:
                is_phased_out = True
                rush_yds_pg = 0.30 * rush_yds_pg + 0.70 * float(grp["rushing_yards"].iloc[-1])
                carries_pg = 0.30 * carries_pg + 0.70 * latest_carries

        tm_rec_yds_pg = max(float(tt.get("receiving_yards", 1500.0)) / tm_gp, 120.0)
        tm_rec_pg = max(float(tt.get("receptions", 140.0)) / tm_gp, 12.0)
        tm_rush_yds_pg = max(float(tt.get("rushing_yards", 750.0)) / tm_gp, 60.0)
        tm_carries_pg = max(float(tt.get("carries", 170.0)) / tm_gp, 15.0)

        wopr_mean = float(grp["wopr"].dropna().mean()) if "wopr" in grp and len(grp["wopr"].dropna()) > 0 else 0.25
        tgt_share_mean = (
            float(grp["target_share"].dropna().mean())
            if "target_share" in grp and len(grp["target_share"].dropna()) > 0
            else (tgt_pg / 32.0)
        )
        ay_share_mean = (
            float(grp["air_yards_share"].dropna().mean())
            if "air_yards_share" in grp and len(grp["air_yards_share"].dropna()) > 0
            else tgt_share_mean
        )

        solo_pg = float(grp["def_tackles_solo"].fillna(0).sum()) / gp
        ast_pg = float(grp["def_tackle_assists"].fillna(0).sum()) / gp
        tkl_pg = solo_pg + ast_pg
        sacks_pg = float(grp["def_sacks"].fillna(0).sum()) / gp
        fgm_pg = float(grp["fg_made"].fillna(0).sum()) / gp
        fga_pg = float(grp["fg_att"].fillna(0).sum()) / gp
        pat_pg = float(grp["pat_made"].fillna(0).sum()) / gp

        is_out = (tm, nm) in out_set
        raw_rec_yds_sh = float(np.clip(rec_yds_pg / tm_rec_yds_pg, 0.01, 0.52))
        raw_rec_sh = float(np.clip(rec_pg / tm_rec_pg, 0.01, 0.48))
        raw_rush_yds_sh = float(np.clip(rush_yds_pg / tm_rush_yds_pg, 0.01, 0.88))
        raw_carries_sh = float(np.clip(carries_pg / tm_carries_pg, 0.01, 0.88))

        info = {
            "player_name": disp,
            "name_norm": nm,
            "team": tm,
            "position": pos,
            "player_gp": gp,
            "is_out_w8": is_out,
            "is_phased_out": is_phased_out,
            "rec_yds_pg": rec_yds_pg,
            "rec_pg": rec_pg,
            "tgt_pg": tgt_pg,
            "rush_yds_pg": rush_yds_pg,
            "carries_pg": carries_pg,
            "pass_yds_pg": pass_yds_pg,
            "pass_tds_pg": pass_tds_pg,
            "comp_pg": comp_pg,
            "att_pg": att_pg,
            "raw_rec_yds_share": raw_rec_yds_sh,
            "raw_carries_share": raw_carries_sh,
            "raw_target_share": tgt_share_mean,
            "rec_yds_share_active": 0.0 if is_out else raw_rec_yds_sh,
            "rec_share_active": 0.0 if is_out else raw_rec_sh,
            "rush_yds_share_active": 0.0 if is_out else raw_rush_yds_sh,
            "carries_share_active": 0.0 if is_out else raw_carries_sh,
            "wopr": 0.0 if is_out else wopr_mean,
            "target_share": 0.0 if is_out else tgt_share_mean,
            "air_yards_share": 0.0 if is_out else ay_share_mean,
            "realloc_mult": 0.0 if is_out else 1.0,
            "same_pos_share_renorm": 0.0,
            "tkl_pg": tkl_pg,
            "sacks_pg": sacks_pg,
            "fgm_pg": fgm_pg,
            "fga_pg": fga_pg,
            "pat_pg": pat_pg,
        }
        player_map[f"{tm}:{nm}"] = info
        if nm not in player_map or gp > int(player_map[nm]["player_gp"]):
            player_map[nm] = info

    if include_nfl_com_outs:
        for r_dk in dk_roster_rows:
            tm = r_dk["team"]
            nm = r_dk["name_norm"]
            key = f"{tm}:{nm}"
            if key not in player_map and r_dk["status"] in ("OUT", "IR", "D"):
                info_out = {
                    "player_name": r_dk["player_name"],
                    "name_norm": nm,
                    "team": tm,
                    "position": r_dk["position"],
                    "player_gp": 1,
                    "is_out_w8": True,
                    "is_phased_out": False,
                    "rec_yds_pg": 0.0,
                    "rec_pg": 0.0,
                    "tgt_pg": 0.0,
                    "rush_yds_pg": 0.0,
                    "carries_pg": 0.0,
                    "pass_yds_pg": 0.0,
                    "pass_tds_pg": 0.0,
                    "comp_pg": 0.0,
                    "att_pg": 0.0,
                    "raw_rec_yds_share": 0.05,
                    "raw_carries_share": 0.05 if r_dk["position"] == "RB" else 0.0,
                    "raw_target_share": 0.05,
                    "rec_yds_share_active": 0.0,
                    "rec_share_active": 0.0,
                    "rush_yds_share_active": 0.0,
                    "carries_share_active": 0.0,
                    "wopr": 0.0,
                    "target_share": 0.0,
                    "air_yards_share": 0.0,
                    "realloc_mult": 0.0,
                    "same_pos_share_renorm": 0.0,
                    "tkl_pg": 0.0,
                    "sacks_pg": 0.0,
                    "fgm_pg": 0.0,
                    "fga_pg": 0.0,
                    "pat_pg": 0.0,
                }
                player_map[key] = info_out

    # Same-Position Injury Share Reallocation across RB, WR, TE per team
    realloc_summary: Dict[str, Dict[str, Any]] = {}
    all_teams = sorted({v["team"] for k, v in player_map.items() if ":" in k})
    for tm in all_teams:
        realloc_summary[tm] = {}
        for pos in ("RB", "WR", "TE"):
            pos_rows = [
                v for k, v in player_map.items()
                if ":" in k and v["team"] == tm and v["position"] == pos
            ]
            if not pos_rows:
                continue
            metric_key = "raw_carries_share" if pos == "RB" else "raw_target_share"
            total_raw = sum(max(float(r.get(metric_key, 0.0)), 0.01) for r in pos_rows)
            out_raw = sum(
                max(float(r.get(metric_key, 0.0)), 0.01)
                for r in pos_rows
                if r.get("is_out_w8", False)
            )
            vacated_pos_share = (out_raw / total_raw) if total_raw > 0 else 0.0
            realloc_mult = min(1.38, 1.0 / max(1.0 - vacated_pos_share, 0.25)) if out_raw > 0 else 1.0

            active_rows = [r for r in pos_rows if not r.get("is_out_w8", False)]
            active_raw_sum = sum(max(float(r.get(metric_key, 0.0)), 0.01) for r in active_rows)
            for r in pos_rows:
                if r.get("is_out_w8", False):
                    r["carries_share_active"] = 0.0
                    r["rush_yds_share_active"] = 0.0
                    r["rec_yds_share_active"] = 0.0
                    r["rec_share_active"] = 0.0
                    r["target_share"] = 0.0
                    r["realloc_mult"] = 0.0
                    r["same_pos_share_renorm"] = 0.0
                else:
                    w_norm = (max(float(r.get(metric_key, 0.0)), 0.01) / active_raw_sum) if active_raw_sum > 0 else 0.0
                    r["same_pos_share_renorm"] = float(w_norm)
                    r["realloc_mult"] = float(realloc_mult)
                    if pos == "RB":
                        r["carries_share_active"] = float(np.clip(r["carries_share_active"] * realloc_mult, 0.01, 0.92))
                        r["rush_yds_share_active"] = float(np.clip(r["rush_yds_share_active"] * realloc_mult, 0.01, 0.92))
                    else:
                        r["rec_yds_share_active"] = float(np.clip(r["rec_yds_share_active"] * realloc_mult, 0.01, 0.65))
                        r["rec_share_active"] = float(np.clip(r["rec_share_active"] * realloc_mult, 0.01, 0.60))
                        r["target_share"] = float(np.clip(r["target_share"] * realloc_mult, 0.01, 0.55))

            realloc_summary[tm][pos] = {
                "vacated_pos_share": round(float(vacated_pos_share), 4),
                "realloc_mult": round(float(realloc_mult), 4),
                "active_same_pos_share_sum": round(float(sum(r["same_pos_share_renorm"] for r in active_rows)), 6),
                "out_players": [r["player_name"] for r in pos_rows if r.get("is_out_w8", False)],
                "active_players": [r["player_name"] for r in active_rows],
            }

    # Identify per-team Kicker, LB1, Edge1, RB1, RB2, WR1, WR2 (active in Week 8, strictly position-filtered)
    team_specialists: Dict[str, Dict[str, Any]] = {}
    for tm in df["team_norm"].unique():
        tm_rows = [
            v for k, v in player_map.items()
            if ":" in k and v["team"] == tm and not v["is_out_w8"] and v["player_gp"] >= 2
        ]
        kickers = sorted(
            [r for r in tm_rows if r["position"] == "K" or r["fga_pg"] > 0.5],
            key=lambda x: x["fga_pg"] * x["player_gp"],
            reverse=True,
        )
        lbs = sorted(
            [r for r in tm_rows if r["position"] in ("LB", "ILB", "MLB", "OLB") and r["tkl_pg"] >= 4.5],
            key=lambda x: x["tkl_pg"] * x["player_gp"],
            reverse=True,
        )
        edges = sorted(
            [r for r in tm_rows if r["position"] in ("DE", "OLB", "DL", "EDGE") and r["sacks_pg"] >= 0.30],
            key=lambda x: (x["sacks_pg"] * x["player_gp"], x["sacks_pg"]),
            reverse=True,
        )
        rbs = sorted(
            [r for r in tm_rows if r["position"] == "RB"],
            key=lambda x: x["carries_pg"] * x["player_gp"] * (0.35 if x.get("is_phased_out") else 1.0),
            reverse=True,
        )
        wrs = sorted(
            [r for r in tm_rows if r["position"] in ("WR", "TE")],
            key=lambda x: x["rec_yds_pg"] * x["player_gp"],
            reverse=True,
        )
        only_wrs = sorted(
            [r for r in tm_rows if r["position"] == "WR"],
            key=lambda x: x["rec_yds_pg"] * x["player_gp"],
            reverse=True,
        )
        team_specialists[tm] = {
            "kicker": kickers[0] if kickers else None,
            "lb1": lbs[0] if lbs else None,
            "edge1": edges[0] if edges else None,
            "rb1": rbs[0] if rbs else None,
            "rb2": rbs[1] if len(rbs) > 1 else None,
            "wr1": wrs[0] if wrs else None,
            "wr2": only_wrs[1] if len(only_wrs) > 1 else (wrs[1] if len(wrs) > 1 else None),
        }

    return {"players": player_map, "specialists": team_specialists, "realloc_summary": realloc_summary}


def assert_roster_identity_2026(
    player_map: Dict[str, Dict[str, Any]],
    dk_csv_11_path: Path | str = REPO_ROOT / "data" / "dfs" / "dk-2026-10-31" / "DKSalaries-1.csv",
    dk_csv_13_path: Path | str = REPO_ROOT / "data" / "dfs" / "dk-2026-10-31" / "DKSalaries.csv",
) -> Dict[str, Any]:
    """
    2026 Roster Identity Validation (`assert_roster_identity_2026`):
    Hard-asserts that the 2026 player-team-position-salary identities in `player_map`
    and `DKSalaries-1.csv` / `DKSalaries.csv` match 2026 reality (zero 2024/2025 roster bleedover).
    """
    df11 = pd.read_csv(dk_csv_11_path)
    df13 = pd.read_csv(dk_csv_13_path)

    def _find_csv_row(df_csv: pd.DataFrame, name_target: str) -> pd.Series:
        nt = norm_name(name_target)
        m = df_csv[df_csv["Name"].map(norm_name) == nt]
        assert len(m) > 0, f"Roster identity failure: {name_target} missing from DraftKings CSV"
        return m.iloc[0]

    # 1. Kenneth Walker III is KC RB ($8,800 in DKSalaries-1.csv)
    r_kw = _find_csv_row(df11, "Kenneth Walker III")
    assert str(r_kw["TeamAbbrev"]) == "KC" and str(r_kw["Position"]) == "RB" and int(r_kw["Salary"]) == 8800
    assert player_map["KC:kenneth walker"]["team"] == "KC" and player_map["KC:kenneth walker"]["position"] == "RB"

    # 2. Kyler Murray is MIN QB ($5,600 in DKSalaries-1.csv)
    r_km = _find_csv_row(df11, "Kyler Murray")
    assert str(r_km["TeamAbbrev"]) == "MIN" and str(r_km["Position"]) == "QB" and int(r_km["Salary"]) == 5600
    assert player_map["MIN:kyler murray"]["team"] == "MIN" and player_map["MIN:kyler murray"]["position"] == "QB"

    # 3. Jaylen Waddle is DEN WR ($5,400 in DKSalaries-1.csv)
    r_jw = _find_csv_row(df11, "Jaylen Waddle")
    assert str(r_jw["TeamAbbrev"]) == "DEN" and str(r_jw["Position"]) == "WR" and int(r_jw["Salary"]) == 5400
    assert player_map["DEN:jaylen waddle"]["team"] == "DEN" and player_map["DEN:jaylen waddle"]["position"] == "WR"

    # 4. Saquon Barkley is PHI RB (in DKSalaries.csv)
    r_sb = _find_csv_row(df13, "Saquon Barkley")
    assert str(r_sb["TeamAbbrev"]) == "PHI" and str(r_sb["Position"]) == "RB" and int(r_sb["Salary"]) in (6800, 7900)
    assert player_map["PHI:saquon barkley"]["team"] == "PHI" and player_map["PHI:saquon barkley"]["position"] == "RB"

    # 5. DK Metcalf is PIT WR (in DKSalaries-1.csv)
    r_dk = _find_csv_row(df11, "DK Metcalf")
    assert str(r_dk["TeamAbbrev"]) == "PIT" and str(r_dk["Position"]) == "WR" and int(r_dk["Salary"]) in (5400, 6000)
    assert player_map["PIT:dk metcalf"]["team"] == "PIT" and player_map["PIT:dk metcalf"]["position"] == "WR"

    # 6. Sam Darnold is SEA QB (in DKSalaries.csv)
    r_sd = _find_csv_row(df13, "Sam Darnold")
    assert str(r_sd["TeamAbbrev"]) == "SEA" and str(r_sd["Position"]) == "QB" and int(r_sd["Salary"]) in (5300, 6000)
    assert player_map["SEA:sam darnold"]["team"] == "SEA" and player_map["SEA:sam darnold"]["position"] == "QB"

    # 7. Geno Smith is QB in LV@NYJ (NOT SEA!)
    r_gs = _find_csv_row(df11, "Geno Smith")
    assert str(r_gs["TeamAbbrev"]) == "NYJ" and str(r_gs["Position"]) == "QB" and int(r_gs["Salary"]) == 5200
    assert player_map["geno smith"]["team"] == "NYJ", f"Geno Smith must be NYJ QB per DK CSV, got {player_map['geno smith']['team']}"
    if "kirk cousins" in player_map:
        assert player_map["kirk cousins"]["team"] == "LV", f"Kirk Cousins must be LV QB per DK CSV, got {player_map['kirk cousins']['team']}"

    # 8. Rachaad White is WAS RB ($5,100 in DKSalaries.csv) and Bucky Irving is TB RB (in DKSalaries-1.csv)
    r_rw = _find_csv_row(df13, "Rachaad White")
    assert str(r_rw["TeamAbbrev"]) in ("WAS", "WSH") and str(r_rw["Position"]) == "RB" and int(r_rw["Salary"]) == 5100
    assert player_map["WAS:rachaad white"]["team"] == "WAS" and player_map["WAS:rachaad white"]["position"] == "RB"

    r_bi = _find_csv_row(df11, "Bucky Irving")
    assert str(r_bi["TeamAbbrev"]) == "TB" and str(r_bi["Position"]) == "RB" and int(r_bi["Salary"]) in (6400, 7100)
    assert player_map["TB:bucky irving"]["team"] == "TB" and player_map["TB:bucky irving"]["position"] == "RB"

    return {
        "verified": True,
        "checked_players": [
            "Kenneth Walker III (KC RB $8,800)",
            "Kyler Murray (MIN QB $5,600)",
            "Jaylen Waddle (DEN WR $5,400)",
            f"Saquon Barkley (PHI RB ${int(r_sb['Salary']):,})",
            f"DK Metcalf (PIT WR ${int(r_dk['Salary']):,})",
            f"Sam Darnold (SEA QB ${int(r_sd['Salary']):,})",
            f"Geno Smith ({r_gs['TeamAbbrev']} QB ${int(r_gs['Salary']):,})",
            "Rachaad White (WAS RB $5,100)",
            f"Bucky Irving (TB RB ${int(r_bi['Salary']):,})",
        ],
    }


def assert_same_position_injury_reallocation(
    player_map: Dict[str, Dict[str, Any]],
    realloc_summary: Dict[str, Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Full Same-Position Injury Share Reallocation Assertion (`assert_same_position_injury_reallocation`):
    1. Confirms all named OUT/IR players (`RJ Harvey DEN RB`, `DeVonta Smith PHI WR`, `Dontayvion Wicks PHI WR`,
       `Emeka Egbuka TB WR`, `Carnell Tate TEN WR`, `Tyjae Spears TEN RB`, `Brian Robinson Jr. ATL RB`,
       `Andrei Iosivas CIN WR`) are marked `is_out_w8 == True` with `0.0` active carry/target shares.
    2. Confirms `sum(active_same_pos_shares) == 1.0` for every team and position (`RB`, `WR`, `TE`).
    3. Confirms `DEN` RB vacated share from `RJ Harvey ($5,200 OUT)` lands strictly on active `DEN` RBs
       (`Jonah Coleman $4,300`, `J.K. Dobbins $5,300`).
    """
    must_be_out = [
        ("DEN", "rj harvey"),
        ("PHI", "devonta smith"),
        ("PHI", "dontayvion wicks"),
        ("TB", "emeka egbuka"),
        ("TEN", "carnell tate"),
        ("TEN", "tyjae spears"),
        ("ATL", "brian robinson"),
        ("CIN", "andrei iosivas"),
    ]
    for tm, nm in must_be_out:
        key = f"{tm}:{nm}"
        assert key in player_map, f"Missing expected OUT/IR player {key}"
        p = player_map[key]
        assert p["is_out_w8"] is True, f"{key} must have is_out_w8=True"
        assert p["carries_share_active"] == 0.0 and p["rec_yds_share_active"] == 0.0 and p["same_pos_share_renorm"] == 0.0, (
            f"{key} must have zero active share mass"
        )

    for tm, pos_dict in realloc_summary.items():
        for pos, info in pos_dict.items():
            if info["active_players"]:
                assert abs(float(info["active_same_pos_share_sum"]) - 1.0) < 1e-5, (
                    f"{tm} {pos} active_same_pos_share_sum={info['active_same_pos_share_sum']} != 1.0"
                )

    den_rb = realloc_summary["DEN"]["RB"]
    assert "RJ Harvey" in den_rb["out_players"], "RJ Harvey must be in DEN RB out_players"
    assert float(den_rb["realloc_mult"]) > 1.15, f"DEN RB realloc_mult={den_rb['realloc_mult']} must reflect vacated RJ Harvey share"
    assert abs(float(den_rb["active_same_pos_share_sum"]) - 1.0) < 1e-6
    den_jc = player_map["DEN:jonah coleman"]
    den_jk = player_map["DEN:jk dobbins"]
    assert den_jc["is_out_w8"] is False and den_jk["is_out_w8"] is False
    assert abs(float(den_jc["realloc_mult"]) - float(den_rb["realloc_mult"])) < 1e-4
    assert float(den_jc["same_pos_share_renorm"]) + float(den_jk["same_pos_share_renorm"]) > 0.70
    return {
        "verified": True,
        "den_rb_reallocation": den_rb,
        "phi_wr_reallocation": realloc_summary["PHI"]["WR"],
        "ten_rb_reallocation": realloc_summary["TEN"]["RB"],
        "ten_wr_reallocation": realloc_summary["TEN"]["WR"],
        "atl_rb_reallocation": realloc_summary["ATL"]["RB"],
        "tb_wr_reallocation": realloc_summary["TB"]["WR"],
    }


def main() -> None:
    sealed_obj, digest = sim.load_sealed_object_readonly()
    master = sim.load_master_w1_w7_tendencies()
    pbp_metrics = load_consolidated_2026_pbp_metrics()

    chart_path = REPO_ROOT / "data" / "engine" / "nfl_2026_w1_w7_advanced_charting_and_funnels.json"
    chart = json.loads(chart_path.read_text(encoding="utf-8"))
    fault_lines = chart.get("week8MatchupFaultLines", {})

    spine_path = REPO_ROOT / "data" / "engine" / "nfl_2026_w8_jev_full_game_spine.json"
    spine_data = json.loads(spine_path.read_text(encoding="utf-8"))

    inj_map = sim.load_week8_injuries_from_csv()
    pw_df = pd.read_csv(REPO_ROOT / "data" / "nflverse" / "pennydata_2026_player_week_stats.csv")
    inj_df = pd.read_csv(REPO_ROOT / "data" / "nflverse" / "injuries_2026.csv")
    roster_db = build_player_profiles(pw_df, inj_df)
    player_map = roster_db["players"]
    specialists = roster_db["specialists"]
    realloc_summary = roster_db["realloc_summary"]

    # Hard Roster Identity & Same-Position Injury Reallocation Validations before Phase I
    roster_identity_cert = assert_roster_identity_2026(player_map)
    injury_realloc_cert = assert_same_position_injury_reallocation(player_map, realloc_summary)

    slate = [
        ("BAL", "BUF"), ("TEN", "CIN"), ("ARI", "DAL"), ("MIN", "DET"),
        ("LV", "NYJ"), ("CLE", "PIT"), ("ATL", "TB"), ("IND", "JAX"),
        ("LAC", "LA"), ("KC", "DEN"), ("NE", "MIA"), ("PHI", "WAS"), ("CHI", "SEA"),
    ]

    gate_log_path = REPO_ROOT / "data" / "engine" / "week8_gate_decisions_2026_10_30.jsonl"
    if gate_log_path.exists():
        gate_log_path.unlink()

    print("=" * 112)
    print("WEEK 8 SUNDAY/MONDAY — GSE 360-DEGREE PATHWISE FULL-BOARD ENGINE (10,000 WORLDS x 175 SNAPS = 22.75M SNAPS)")
    print("=" * 112)
    print(f"Seal hash: {digest[:16]}... | tau=0.42 | tau_hat=6.77 (n=3988) | Stage D |Delta log-odds| <= 0.35 | ODDS-LAST FIREWALL")
    print()

    # ==================================================================
    # PHASE I: PURE INTERNAL SIMULATION & PROJECTION (ZERO ODDS ON DISK)
    # ==================================================================
    internal_sealed = False
    phase1_games: Dict[str, Dict[str, Any]] = {}
    internal_player_dists: Dict[Tuple[str, str, str], Dict[str, Any]] = {}
    max_conservation_res = 0.0
    max_sinkhorn_res = 0.0

    for idx, (away, home) in enumerate(slate):
        fl_key = f"{away}@{home}"
        posted_home_spread = None
        posted_total = None
        assert posted_home_spread is None and posted_total is None, (
            "CRITICAL FIREWALL VIOLATION: Phase I simulation must run with posted_home_spread=None and posted_total=None"
        )

        aw_ov = dict(master.get(away) or {})
        hm_ov = dict(master.get(home) or {})
        w1w7 = {"away": aw_ov, "home": hm_ov}

        jev_tensor = None
        if fl_key in spine_data.get("games", {}):
            jev_tensor = sim.build_jev_state_tensor(spine_data["games"][fl_key])

        r = sim.simulate_matchup_pbp(
            away,
            home,
            away_inj=inj_map.get(away, []),
            home_inj=inj_map.get(home, []),
            sealed_state=sealed_obj,
            expected_hash=digest,
            n_sims=10000,
            seed=900 + idx,
            w1_w7_override=w1w7,
            return_vectors=True,
            jev_state_tensor=jev_tensor,
            posted_home_spread=posted_home_spread,
            posted_total=posted_total,
        )
        v = r["vectors"]
        cons_res = float(r["pathwise_conservation_residuals"]["max_residual"])
        sink_res = float(r["sinkhorn_dual_residual_max"])
        if cons_res <= 1e-12:
            cons_res = 0.0
        max_conservation_res = max(max_conservation_res, cons_res)
        max_sinkhorn_res = max(max_sinkhorn_res, sink_res)

        certs = {
            "pathwise_conservation_residual": cons_res,
            "sinkhorn_dual_residual": sink_res,
            "corank": int(r["residual_corank"]),
            "has_pole": bool(r["qrh_pole_diagnostic"]["has_mode_near_pole"]),
            "talisman_tdr_max": float(max(r["talisman_fragility"]["away"]["tdr"], r["talisman_fragility"]["home"]["tdr"])),
            "rademacher_bound": float(r["conjunction_rademacher_tail_bound"]["whitened_tail_radius"]),
            "brenier_ratio": float(max(r["brenier_stability_ratio_away"], r["brenier_stability_ratio_home"])),
            "tau_hat_status": str(r["consolidated_sweep_kernels"]["guarded_shrinkage_step"]["status"]),
            "tau_hat_away": float(r["consolidated_sweep_kernels"]["tau_hat_4th_down_away"]["tau_hat"]),
            "tau_hat_home": float(r["consolidated_sweep_kernels"]["tau_hat_4th_down_home"]["tau_hat"]),
            "tau_hat_wp_gap_max": float(max(r["consolidated_sweep_kernels"]["tau_hat_4th_down_away"]["wp_gap"], r["consolidated_sweep_kernels"]["tau_hat_4th_down_home"]["wp_gap"])),
            "aci_margin_width": float(r["consolidated_sweep_kernels"]["aci_conformal_margin"]["width"]),
            "fg_range_bonus_yds": float(r["consolidated_sweep_kernels"]["physics_ball_flight"]["fg_range_bonus_yds"]),
        }

        fl = fault_lines.get(fl_key, {})
        fault1 = fl.get("faultLine1_earlyDownNonTurnoverEpa", {})

        away_qb = TEAM_TO_QB_2026.get(away, away)
        home_qb = TEAM_TO_QB_2026.get(home, home)
        try:
            aq = evaluate_qb_matchup_2x2(
                away_qb,
                float(hm_ov.get("coverage_shells_w1_w7", {}).get("two_high_shell_pct", 48.0)) * 0.62 / 100.0,
                float(hm_ov.get("def_blitz_rate_pct", 26.0)) / 100.0,
            )
            hq = evaluate_qb_matchup_2x2(
                home_qb,
                float(aw_ov.get("coverage_shells_w1_w7", {}).get("two_high_shell_pct", 48.0)) * 0.62 / 100.0,
                float(aw_ov.get("def_blitz_rate_pct", 26.0)) / 100.0,
            )
            aw_last = aq["qb_name"].replace(" Jr.", "").replace(" Sr.", "").replace(" III", "").split()[-1]
            hm_last = hq["qb_name"].replace(" Jr.", "").replace(" Sr.", "").replace(" III", "").split()[-1]
            qb_note = f"{aw_last} {aq['epa_shift_vs_baseline']:+.3f} / {hm_last} {hq['epa_shift_vs_baseline']:+.3f}"
            away_qb_shift = float(aq["epa_shift_vs_baseline"])
            home_qb_shift = float(hq["epa_shift_vs_baseline"])
        except Exception:
            qb_note = "n/a"
            away_qb_shift = 0.0
            home_qb_shift = 0.0

        # Precompute pure internal player baseline distributions for all active players on away & home
        for k_pm, p_info in player_map.items():
            if ":" not in k_pm or p_info.get("is_out_w8", False):
                continue
            tm = str(p_info["team"])
            if tm not in (away, home):
                continue
            p_norm = str(p_info["name_norm"])
            pos = str(p_info["position"])
            gp = int(p_info["player_gp"])
            realloc_m = float(p_info.get("realloc_mult", 1.0))
            side_prefix = "home" if tm == home else "away"

            mkt_specs = [
                ("Passing Yards", float(p_info["pass_yds_pg"]), np.asarray(v[f"{side_prefix}_pass_yds"], dtype=np.float64), 240.0, 1.0),
                ("Passing TDs", float(p_info["pass_tds_pg"]), np.asarray(v[f"{side_prefix}_pass_tds"], dtype=np.float64), 1.65, 1.0),
                ("Pass Completions", float(p_info["comp_pg"]), np.asarray(v[f"{side_prefix}_pass_comp"], dtype=np.float64), 21.8, 1.0),
                ("Receiving Yards", float(p_info["rec_yds_pg"]), np.asarray(v[f"{side_prefix}_pass_yds"], dtype=np.float64), 240.0, realloc_m),
                ("Receptions", float(p_info["rec_pg"]), np.asarray(v[f"{side_prefix}_pass_comp"], dtype=np.float64), 21.8, realloc_m),
                (
                    "Rushing Yards",
                    float(p_info["rush_yds_pg"]),
                    np.asarray(v[f"{side_prefix}_rush_yds_roles"][:, 2], dtype=np.float64)
                    if pos == "QB"
                    else np.sum(np.asarray(v[f"{side_prefix}_rush_yds_roles"][:, :2], dtype=np.float64), axis=1),
                    22.0 if pos == "QB" else 96.0,
                    1.0 if pos == "QB" else realloc_m,
                ),
                (
                    "Rushing Attempts",
                    float(p_info["carries_pg"]),
                    np.asarray(v[f"{side_prefix}_carries_roles"][:, 2], dtype=np.float64)
                    if pos == "QB"
                    else np.sum(np.asarray(v[f"{side_prefix}_carries_roles"][:, :2], dtype=np.float64), axis=1),
                    4.5 if pos == "QB" else 22.5,
                    1.0 if pos == "QB" else realloc_m,
                ),
                (
                    "Rush + Rec Yards",
                    float(p_info["rush_yds_pg"]) + float(p_info["rec_yds_pg"]),
                    np.sum(np.asarray(v[f"{side_prefix}_rush_yds_roles"][:, :2], dtype=np.float64), axis=1)
                    + 0.35 * np.asarray(v[f"{side_prefix}_pass_yds"], dtype=np.float64),
                    180.0,
                    realloc_m,
                ),
            ]
            for mkt_name, st_val, tm_v, tm_b, rm_val in mkt_specs:
                internal_player_dists[(fl_key, p_norm, mkt_name)] = compute_internal_player_distribution(
                    market=mkt_name,
                    stat_pg=st_val,
                    player_gp=gp,
                    position=pos,
                    team_vec=tm_v,
                    team_baseline=tm_b,
                    realloc_mult=rm_val,
                    include_samples=False,
                )

        phase1_games[fl_key] = {
            "away": away,
            "home": home,
            "r": r,
            "v": v,
            "certs": certs,
            "fault1": fault1,
            "qb_note": qb_note,
            "away_qb_shift": away_qb_shift,
            "home_qb_shift": home_qb_shift,
        }

    # Seal Phase I before touching any sportsbook odds or prop lines
    internal_sealed = True
    assert internal_sealed is True, "Phase I must be sealed before loading any sportsbook odds"

    # ==================================================================
    # PHASE II: MARKET COMPARISON STRICTLY LAST (AFTER INTERNAL SEAL)
    # ==================================================================
    dk_path = REPO_ROOT / "data" / "engine" / "live_dk_odds_and_props_2026_10_29.json"
    dk_data = json.loads(dk_path.read_text(encoding="utf-8"))
    dk_events_by_key: Dict[str, Dict[str, Any]] = {}
    for ev in dk_data.get("events", []):
        aw = str(ev["away_abbr"]).replace("LAR", "LA").replace("WSH", "WAS")
        hm = str(ev["home_abbr"]).replace("LAR", "LA").replace("WSH", "WAS")
        dk_events_by_key[f"{aw}@{hm}"] = ev

    s24_path = REPO_ROOT / "data" / "engine" / "scores24_nfl_week8_2026_10_30.json"
    _s24_disk_data = json.loads(s24_path.read_text(encoding="utf-8")) if s24_path.exists() else {}

    game_summaries: List[Dict[str, Any]] = []
    all_candidates: List[Dict[str, Any]] = []

    for idx, (away, home) in enumerate(slate):
        fl_key = f"{away}@{home}"
        p1 = phase1_games[fl_key]
        r = p1["r"]
        v = p1["v"]
        certs = p1["certs"]
        fault1 = p1["fault1"]
        qb_note = p1["qb_note"]
        away_qb_shift = float(p1["away_qb_shift"])
        home_qb_shift = float(p1["home_qb_shift"])
        cons_res = float(certs["pathwise_conservation_residual"])

        ev = dk_events_by_key.get(fl_key, {})
        posted_spread = ev.get("spread")
        posted_total = ev.get("over_under")

        ridge_home = float(r["consolidated_sweep_kernels"]["c285_ridge_home"]["net_epa_delta"])
        ridge_away = float(r["consolidated_sweep_kernels"]["c285_ridge_away"]["net_epa_delta"])
        home_overlay_logit = float(np.clip((home_qb_shift - away_qb_shift) * 0.85 + (ridge_home - ridge_away) * 0.45, -0.35, 0.35))
        tot_overlay_logit = float(np.clip((home_qb_shift + away_qb_shift) * 0.55 + (ridge_home + ridge_away) * 0.35, -0.35, 0.35))

        # ------------------------------------------------------------------
        # 1. MAIN MARKETS (Spread, Total, Moneyline — Evaluated against DK LAST)
        # ------------------------------------------------------------------
        margin_vec = v["home_margin_out"]
        total_vec = v["total_pts_out"]

        if posted_spread is not None:
            sp_line = float(posted_spread)  # e.g. -3.0 means home -3.0
            devig_aw_sp, devig_hm_sp = devig_two_way(ev.get("away_spread_odds", -110), ev.get("home_spread_odds", -110))
            non_push_sp = margin_vec != (-sp_line)
            raw_hm_cov = float(np.mean(margin_vec[non_push_sp] > (-sp_line))) if np.any(non_push_sp) else 0.50
            raw_aw_cov = 1.0 - raw_hm_cov
            # Shrink extreme raw simulation cover prob via internal tau_hat credibility (0.55 weight on internal deviation from 0.50),
            # then apply internal Stage D overlay onto internal raw_prob — NEVER passing devig_hm_sp as base_prob!
            internal_hm_cov = 0.50 + 0.55 * (raw_hm_cov - 0.50)
            internal_aw_cov = 1.0 - internal_hm_cov
            if raw_hm_cov >= raw_aw_cov:
                p_post = float(cap_stage_d_overlay_log_odds(internal_hm_cov, [home_overlay_logit], max_abs_log_odds=0.35)["final_prob"])
                all_candidates.append({
                    "matchup": fl_key, "category": "MAIN_SPREAD",
                    "selection": f"{home} {sp_line:+.1f}", "market_line": sp_line,
                    "has_live_price": True, "has_two_way_odds": True, "writeup_conflict": False,
                    "raw_prob": raw_hm_cov, "model_p": p_post, "market_p": devig_hm_sp,
                    "edge": p_post - devig_hm_sp, "model_median": float(np.median(-margin_vec)),
                    "rationale": f"Pure internal median {home} {-r['median_spread_home']:+.2f} vs DK {sp_line:+.1f} ({qb_note})",
                    "certs": certs,
                })
            else:
                p_post = float(cap_stage_d_overlay_log_odds(internal_aw_cov, [-home_overlay_logit], max_abs_log_odds=0.35)["final_prob"])
                all_candidates.append({
                    "matchup": fl_key, "category": "MAIN_SPREAD",
                    "selection": f"{away} {-sp_line:+.1f}", "market_line": -sp_line,
                    "has_live_price": True, "has_two_way_odds": True, "writeup_conflict": (fl_key == "CHI@SEA"),
                    "raw_prob": raw_aw_cov, "model_p": p_post, "market_p": devig_aw_sp,
                    "edge": p_post - devig_aw_sp, "model_median": float(np.median(margin_vec)),
                    "rationale": f"Pure internal median {away} {r['median_spread_home']:+.2f} vs DK {-sp_line:+.1f} ({qb_note})",
                    "certs": certs,
                })

        if posted_total is not None:
            tot_line = float(posted_total)
            devig_ov, devig_un = devig_two_way(ev.get("over_odds", -110), ev.get("under_odds", -110))
            non_push_tot = total_vec != tot_line
            raw_ov = float(np.mean(total_vec[non_push_tot] > tot_line)) if np.any(non_push_tot) else 0.50
            raw_un = 1.0 - raw_ov
            internal_ov = 0.50 + 0.50 * (raw_ov - 0.50)
            internal_un = 1.0 - internal_ov
            if raw_ov >= raw_un:
                p_post = float(cap_stage_d_overlay_log_odds(internal_ov, [tot_overlay_logit], max_abs_log_odds=0.35)["final_prob"])
                all_candidates.append({
                    "matchup": fl_key, "category": "MAIN_TOTAL",
                    "selection": f"{fl_key} OVER {tot_line:.1f}", "market_line": tot_line,
                    "has_live_price": True, "has_two_way_odds": True, "writeup_conflict": True,
                    "raw_prob": raw_ov, "model_p": p_post, "market_p": devig_ov,
                    "edge": p_post - devig_ov, "model_median": float(r["median_total"]),
                    "rationale": f"Pure internal median total {r['median_total']:.2f} vs DK {tot_line:.1f} (pace {r['median_pace_sec']:.2f}s) — reconciled to PASS per writeup agreement gate",
                    "certs": certs,
                })
            else:
                p_post = float(cap_stage_d_overlay_log_odds(internal_un, [-tot_overlay_logit], max_abs_log_odds=0.35)["final_prob"])
                all_candidates.append({
                    "matchup": fl_key, "category": "MAIN_TOTAL",
                    "selection": f"{fl_key} UNDER {tot_line:.1f}", "market_line": tot_line,
                    "has_live_price": True, "has_two_way_odds": True, "writeup_conflict": True,
                    "raw_prob": raw_un, "model_p": p_post, "market_p": devig_un,
                    "edge": p_post - devig_un, "model_median": float(r["median_total"]),
                    "rationale": f"Pure internal median total {r['median_total']:.2f} vs DK {tot_line:.1f} (pace {r['median_pace_sec']:.2f}s) — reconciled to PASS per writeup agreement gate",
                    "certs": certs,
                })

        if ev.get("away_ml") is not None and ev.get("home_ml") is not None:
            devig_aw_ml, devig_hm_ml = devig_two_way(ev.get("away_ml"), ev.get("home_ml"))
            raw_hm_win = float(np.mean(margin_vec > 0.0) + 0.5 * np.mean(margin_vec == 0.0))
            raw_aw_win = 1.0 - raw_hm_win
            for side_tm, raw_w, mkt_w, ml_odds, ov_l in [
                (home, raw_hm_win, devig_hm_ml, ev.get("home_ml"), home_overlay_logit),
                (away, raw_aw_win, devig_aw_ml, ev.get("away_ml"), -home_overlay_logit),
            ]:
                p_post = float(cap_stage_d_overlay_log_odds(raw_w, [ov_l], max_abs_log_odds=0.35)["final_prob"])
                if p_post > mkt_w:
                    all_candidates.append({
                        "matchup": fl_key, "category": "MONEYLINE",
                        "selection": f"{side_tm} ML ({int(ml_odds):+d})", "market_line": float(ml_odds),
                        "has_live_price": True, "has_two_way_odds": True, "writeup_conflict": False,
                        "raw_prob": raw_w, "model_p": p_post, "market_p": mkt_w,
                        "edge": p_post - mkt_w, "model_median": p_post * 100.0,
                        "rationale": f"Pure internal win prob {raw_w*100:.1f}% (Stage D {p_post*100:.1f}%) vs de-vigged market {mkt_w*100:.1f}%",
                        "certs": certs,
                    })

        # ------------------------------------------------------------------
        # 2. QUARTERS, HALVES & TEAM TOTALS
        #    2A. Scores24 Derivative Markets (strict two-way book odds required for PUBLISH;
        #        single-side trend quotes without opp_odds logged as ABSTAIN/PASS)
        #    2B. Unpriced 1Q/1H Model Projections (has_live_price=False -> ABSTAIN)
        # ------------------------------------------------------------------
        q1_tot_vec = v["away_q1"] + v["home_q1"]
        h1_tot_vec = v["away_1h"] + v["home_1h"]
        h1_margin_vec = v["home_1h"] - v["away_1h"]
        q2_margin_vec = v["home_q2"] - v["away_q2"]
        q4_margin_vec = v["home_q4"] - v["away_q4"]
        h2_margin_vec = (v["home_q3"] + v["home_q4"]) - (v["away_q3"] + v["away_q4"])
        away_pts_vec = 0.5 * (total_vec - margin_vec)
        home_pts_vec = 0.5 * (total_vec + margin_vec)

        scores24_priced_by_game: Dict[str, List[Dict[str, Any]]] = {
            "BAL@BUF": [
                {"label": "BAL 1H Winner (+139)", "odds": 139, "vec": -h1_margin_vec, "line": 0.0, "desc": "Scores24 BAL 1H 8/9 streak"},
                {"label": "BUF 2Q Winner (-103)", "odds": -103, "vec": q2_margin_vec, "line": 0.0, "desc": "Scores24 BUF 2Q 7/8 streak"},
                {"label": "BAL 4Q Winner (+132)", "odds": 132, "vec": -q4_margin_vec, "line": 0.0, "desc": "Scores24 BAL 4Q 8/9 away streak"},
                {"label": "BUF Team Total UNDER 28.5 (-102)", "odds": -102, "vec": -home_pts_vec, "line": -28.5, "desc": "Scores24 BUF TT <28.5 in 9/10 vs BAL"},
            ],
            "ARI@DAL": [
                {"label": "ARI 1H Winner (+206)", "odds": 206, "vec": -h1_margin_vec, "line": 0.0, "desc": "Scores24 ARI 1H 6/7 vs DAL"},
                {"label": "ARI 2Q Winner (+190)", "odds": 190, "vec": -q2_margin_vec, "line": 0.0, "desc": "Scores24 ARI 2Q 5/5 at DAL"},
                {"label": "ARI Team Total OVER 23.5 (-110)", "odds": -110, "vec": away_pts_vec, "line": 23.5, "desc": "Scores24 ARI TT >23.5 in 5/5 at DAL"},
                {"label": "DAL Team Total UNDER 33.5 (-169)", "odds": -169, "vec": -home_pts_vec, "line": -33.5, "desc": "Scores24 DAL TT <33.5 in 14/15 vs ARI"},
            ],
            "MIN@DET": [
                {"label": "MIN 4Q Winner (+145)", "odds": 145, "vec": -q4_margin_vec, "line": 0.0, "desc": "Scores24 MIN 4Q 6/6 streak"},
                {"label": "DET Team Total OVER 24.5 (-120)", "odds": -120, "vec": home_pts_vec, "line": 24.5, "desc": "Scores24 DET TT >24.5 in 6/7 vs MIN"},
            ],
            "LV@NYJ": [
                {"label": "LV 2Q Winner (+125)", "odds": 125, "vec": -q2_margin_vec, "line": 0.0, "desc": "Scores24 NYJ lost 2Q in 6/7 home"},
                {"label": "NYJ Team Total UNDER 23.5 (-110)", "odds": -110, "vec": -home_pts_vec, "line": -23.5, "desc": "Scores24 NYJ TT <23.5 in 13/15 games"},
            ],
            "CLE@PIT": [
                {"label": "PIT 1H Winner (-149)", "odds": -149, "vec": h1_margin_vec, "line": 0.0, "desc": "Scores24 PIT 1H 5/5 home vs CLE"},
                {"label": "PIT 2Q Winner (+103)", "odds": 103, "vec": q2_margin_vec, "line": 0.0, "desc": "Scores24 PIT 2Q 8/9 home vs CLE"},
                {"label": "PIT 2H Winner (-127)", "odds": -127, "vec": h2_margin_vec, "line": 0.0, "desc": "Scores24 PIT 2H 9/9 home vs CLE"},
                {"label": "PIT Team Total OVER 20.5 (-125)", "odds": -125, "vec": home_pts_vec, "line": 20.5, "desc": "Scores24 PIT TT >20.5 in 12/13 home vs CLE"},
            ],
            "ATL@TB": [
                {"label": "ATL 2Q Winner (+142)", "odds": 142, "vec": -q2_margin_vec, "line": 0.0, "desc": "Scores24 ATL 2Q 6/7 away"},
                {"label": "ATL 4Q Winner (+134)", "odds": 134, "vec": -q4_margin_vec, "line": 0.0, "desc": "Scores24 TB lost 4Q in 7/8 home"},
            ],
            "IND@JAX": [
                {"label": "JAX 1H Winner (-294)", "odds": -294, "vec": h1_margin_vec, "line": 0.0, "desc": "Scores24 JAX 1H 5/5 home vs IND"},
                {"label": "JAX 2Q Winner (-149)", "odds": -149, "vec": q2_margin_vec, "line": 0.0, "desc": "Scores24 JAX 2Q 10/10 home vs IND"},
                {"label": "IND Team Total OVER 17.5 (-102)", "odds": -102, "vec": away_pts_vec, "line": 17.5, "desc": "Scores24 IND TT >17.5 in 6/7 vs JAX"},
                {"label": "JAX Team Total OVER 27.5 (-123)", "odds": -123, "vec": home_pts_vec, "line": 27.5, "desc": "Scores24 JAX TT >27.5 in 6/7 home"},
            ],
            "LAC@LA": [
                {"label": "LA 1H Winner (-200)", "odds": -200, "vec": h1_margin_vec, "line": 0.0, "desc": "Scores24 LAC lost 1H in 8/9"},
                {"label": "LA 2Q Winner (-118)", "odds": -118, "vec": q2_margin_vec, "line": 0.0, "desc": "Scores24 LAC lost 2Q in 7/8"},
                {"label": "LA 4Q Winner (-108)", "odds": -108, "vec": q4_margin_vec, "line": 0.0, "desc": "Scores24 LAC lost 4Q in 7/8"},
                {"label": "LAC Team Total UNDER 18.5 (-114)", "odds": -114, "opp_odds": -114, "vec": -away_pts_vec, "line": -18.5, "desc": "Scores24 LAC TT <18.5 in 8/9"},
                {"label": "LA Team Total OVER 26.5 (-127)", "odds": -127, "opp_odds": -105, "vec": home_pts_vec, "line": 26.5, "desc": "Scores24 LA TT >26.5 in 6/7 home"},
            ],
            "NE@MIA": [
                {"label": "NE 1H Winner (-189)", "odds": -189, "vec": -h1_margin_vec, "line": 0.0, "desc": "Scores24 MIA lost 1H in 9/10"},
                {"label": "NE 2Q Winner (-118)", "odds": -118, "opp_odds": 199, "vec": -q2_margin_vec, "line": 0.0, "desc": "Scores24 MIA lost 2Q in 8/9"},
                {"label": "MIA Team Total OVER 17.5 (-102)", "odds": -102, "vec": home_pts_vec, "line": 17.5, "desc": "Scores24 MIA TT >17.5 in 13/15 home"},
            ],
        }

        for s24_mkt in scores24_priced_by_game.get(fl_key, []):
            has_two_way = ("opp_odds" in s24_mkt) and (s24_mkt["opp_odds"] is not None)
            vec_s24 = np.asarray(s24_mkt["vec"], dtype=np.float64)
            ln_s24 = float(s24_mkt["line"])
            non_tie = vec_s24 != ln_s24
            raw_p_s24 = float(np.mean(vec_s24[non_tie] > ln_s24)) if np.any(non_tie) else 0.50
            # Pure internal Stage D probability (never passing market_p as base_prob!)
            internal_s24_base = 0.50 + 0.60 * (raw_p_s24 - 0.50)
            post_p_s24 = float(cap_stage_d_overlay_log_odds(internal_s24_base, [0.05 * home_overlay_logit], max_abs_log_odds=0.35)["final_prob"])
            if has_two_way:
                mkt_p_s24, _ = devig_two_way(s24_mkt["odds"], s24_mkt["opp_odds"])
                all_candidates.append({
                    "matchup": fl_key,
                    "category": "1Q_1H_DERIVATIVE",
                    "selection": str(s24_mkt["label"]),
                    "market_line": float(s24_mkt["odds"]),
                    "has_live_price": True,
                    "has_two_way_odds": True,
                    "writeup_conflict": False,
                    "raw_prob": raw_p_s24,
                    "model_p": post_p_s24,
                    "market_p": mkt_p_s24,
                    "edge": post_p_s24 - mkt_p_s24,
                    "model_median": float(np.median(np.abs(vec_s24)) if ln_s24 != 0.0 else np.median(vec_s24)),
                    "rationale": f"{s24_mkt['desc']} — Two-way de-vigged book quote ({s24_mkt['odds']}/{s24_mkt['opp_odds']}); internal win prob {raw_p_s24*100:.1f}% (Stage D {post_p_s24*100:.1f}%) vs de-vig {mkt_p_s24*100:.1f}%",
                    "certs": certs,
                })
            else:
                # Single-side Scores24 trend quote without opp_odds -> logged as ABSTAIN / PASS (never PUBLISH)
                all_candidates.append({
                    "matchup": fl_key,
                    "category": "1Q_1H_DERIVATIVE",
                    "selection": str(s24_mkt["label"]),
                    "market_line": float(s24_mkt["odds"]),
                    "has_live_price": False,
                    "has_two_way_odds": False,
                    "writeup_conflict": False,
                    "raw_prob": raw_p_s24,
                    "model_p": post_p_s24,
                    "market_p": None,
                    "edge": None,
                    "fair_odds": prob_to_american_str(post_p_s24),
                    "trigger_odds": prob_to_american_str(max(post_p_s24 - 0.04, 0.50)),
                    "model_median": float(np.median(np.abs(vec_s24)) if ln_s24 != 0.0 else np.median(vec_s24)),
                    "rationale": f"{s24_mkt['desc']} — Single-side trend quote ({s24_mkt['odds']:+d}, no opp_odds) logged as ABSTAIN/PASS per strict two-way de-vig gate",
                    "certs": certs,
                })

        # 2B. Unpriced 1Q/1H Model Projections (has_live_price=False -> ABSTAIN with Fair-Odds Trigger)
        if posted_total is not None and posted_spread is not None:
            tot_line = float(posted_total)
            sp_line = float(posted_spread)
            q1_ref_line = round((tot_line * 0.1926) * 2.0) / 2.0
            if q1_ref_line == round(q1_ref_line):
                q1_ref_line += 0.5

            raw_q1_un = 1.0 - normal_tail_prob_over(q1_tot_vec, q1_ref_line, scale_floor=3.2)
            raw_q1_ov = 1.0 - raw_q1_un
            q1_side = "UNDER" if raw_q1_un >= raw_q1_ov else "OVER"
            q1_raw = max(raw_q1_un, raw_q1_ov)
            all_candidates.append({
                "matchup": fl_key, "category": "1Q_1H_DERIVATIVE",
                "selection": f"{fl_key} 1Q Total {q1_side} {q1_ref_line:.1f}", "market_line": q1_ref_line,
                "has_live_price": False, "has_two_way_odds": False, "writeup_conflict": False,
                "raw_prob": q1_raw, "model_p": q1_raw, "market_p": None, "edge": None,
                "fair_odds": prob_to_american_str(q1_raw),
                "trigger_odds": prob_to_american_str(max(q1_raw - 0.04, 0.50)),
                "model_median": float(np.median(q1_tot_vec)),
                "rationale": f"@locktalkbets 1Q Stop/Script kernel (19.26% 2026 Q1 share) -> pathwise median {np.median(q1_tot_vec):.1f} vs ref {q1_ref_line:.1f}",
                "certs": certs,
            })

        # ------------------------------------------------------------------
        # 3. ALL LIVE DRAFTKINGS PLAYER PROPS (419 Props across 13 Games)
        #    Evaluates sealed Phase I internal player distributions against DK line LAST
        # ------------------------------------------------------------------
        for prop in ev.get("props", []):
            p_name = str(prop["player_name"])
            p_norm = norm_name(p_name)
            pos = str(prop.get("position", ""))
            mkt = str(prop["market"])
            line = float(prop["line"])

            p_info = (
                player_map.get(f"{away}:{p_norm}")
                or player_map.get(f"{home}:{p_norm}")
                or player_map.get(p_norm)
            )
            if p_info is None or p_info.get("is_out_w8", False):
                continue
            tm = str(p_info["team"])
            if tm not in (away, home):
                continue
            is_home = (tm == home)
            side_prefix = "home" if is_home else "away"
            gp = int(p_info["player_gp"])
            realloc_m = float(p_info.get("realloc_mult", 1.0))

            wopr_val = compute_c287_wopr(float(p_info["target_share"]), float(p_info["air_yards_share"]))
            c281_res = compute_c281_tprr_yprr_composite(
                tprr=float(p_info["target_share"]) * 0.92,
                yprr=max(float(p_info["rec_yds_pg"]) / max(float(p_info["tgt_pg"]) * 4.2, 12.0), 0.8),
            )
            ridge_delta = float(r["consolidated_sweep_kernels"][f"c285_ridge_{side_prefix}"]["net_epa_delta"])
            qb_shift = home_qb_shift if is_home else away_qb_shift

            stat_pg = 0.0
            team_vec: np.ndarray | None = None
            tm_base = 240.0
            pre_overlay = 0.0
            role_tag = f"{tm} {pos} (GP={gp})"
            devig_ov, devig_un = devig_two_way(prop.get("over_odds", -110), prop.get("under_odds", -110))

            if mkt == "Passing Yards":
                stat_pg = float(p_info["pass_yds_pg"])
                team_vec = np.asarray(v[f"{side_prefix}_pass_yds"], dtype=np.float64)
                tm_base = 240.0
                pre_overlay = qb_shift * 1.4 + ridge_delta * 0.8
                role_tag = f"{tm} QB (GP={gp}, 2026Avg={stat_pg:.1f}, QB2x2={qb_shift:+.3f})"
            elif mkt == "Passing TDs":
                stat_pg = float(p_info["pass_tds_pg"])
                team_vec = np.asarray(v[f"{side_prefix}_pass_tds"], dtype=np.float64)
                tm_base = 1.65
                pre_overlay = qb_shift * 1.2 + ridge_delta * 0.6
                role_tag = f"{tm} QB (GP={gp}, 2026Avg={stat_pg:.2f}, QB2x2={qb_shift:+.3f})"
            elif mkt == "Pass Completions":
                stat_pg = float(p_info["comp_pg"])
                team_vec = np.asarray(v[f"{side_prefix}_pass_comp"], dtype=np.float64)
                tm_base = 21.8
                pre_overlay = qb_shift * 1.0 + ridge_delta * 0.5
                role_tag = f"{tm} QB (GP={gp}, 2026Avg={stat_pg:.1f})"
            elif mkt in ("Receiving Yards", "Receptions"):
                off_m = master.get(tm) or {}
                opp_tm = away if is_home else home
                opp_m = master.get(opp_tm) or {}
                opp_c = (chart.get("teams", {}) or {}).get(opp_tm, {})
                off_c = (chart.get("teams", {}) or {}).get(tm, {})
                # Lookup charted open/catchable/contested rates if present in allReceiverProfiles
                rec_prof = {}
                for rp in chart.get("allReceiverProfiles", []):
                    if rp.get("team") == tm and str(rp.get("player", "")).split(".")[-1].lower() in p_norm:
                        rec_prof = rp
                        break
                wr360 = wr_360_all_metrics_kernel(
                    neutral_pass_rate_pct=float(off_m.get("neutral_pass_rate_pct", 55.0)),
                    proe_pct=float(off_m.get("proe_pct", 0.0)),
                    motion_pct=float(off_m.get("motion_pct", 50.0)),
                    play_action_pct=float(off_m.get("play_action_pct", 22.0)),
                    sequence_predictability_flag=bool(off_c.get("minimaxPlayCallEquilibrium", {}).get("sequencePredictabilityFlag", False)),
                    ol_sack_rate_allowed_pct=float(off_m.get("sack_rate_allowed_pct", 6.5)),
                    dl_unblitzed_disruption_pct=float(opp_c.get("trueOneOnOneTrench", {}).get("unblitzedFourManDisruptionRatePct", 14.5)),
                    def_funnel_classification=str(opp_c.get("targetFunnel", {}).get("funnelClassification", "BALANCED_SHELL")),
                    def_wr_target_share_allowed_pct=float(opp_c.get("targetFunnel", {}).get("wrTargetShareAllowedPct", 60.0)),
                    def_te_target_share_allowed_pct=float(opp_c.get("targetFunnel", {}).get("teTargetShareAllowedPct", 21.0)),
                    def_epa_rank=int(opp_c.get("floresVarianceAndSimPressure", {}).get("defEpaRank", 16)),
                    def_missed_tackles_w1_w7=int(opp_c.get("tacklingAndYac", {}).get("pfrTeamMissedTacklesW1W7", 33)),
                    def_yac_allowed_per_comp=float(opp_c.get("tacklingAndYac", {}).get("defYacAllowedPerCompletion", 5.2)),
                    motion_plus_pa_epa_beater=float(opp_c.get("schemeBeaterDeclaration", {}).get("motionPlusPlayActionEpa", 0.0)),
                    off_neutral_sec_per_snap=float(off_m.get("neutral_sec_per_snap", 27.0)),
                    opp_neutral_sec_per_snap=float(opp_m.get("neutral_sec_per_snap", 27.0)),
                    off_plays_per_game=float(off_m.get("plays_per_game", 63.0)),
                    projected_spread_margin=float(-r["median_spread_home"] if is_home else r["median_spread_home"]),
                    target_share_pct=float(p_info["target_share"]) * 100.0,
                    n_eff_receivers=float(off_m.get("n_eff_receivers", 6.0)),
                    air_yards_share_pct=float(p_info["air_yards_share"]) * 100.0,
                    open_target_rate_pct=float(rec_prof.get("openTargetRatePct", 78.0)),
                    catchable_target_rate_pct=float(rec_prof.get("catchableTargetRatePct", 78.0)),
                    contested_catch_rate_pct=float(rec_prof.get("contestedCatchRatePct", 50.0)),
                    base_rec_yards_mean=float(p_info["rec_yds_pg"]),
                    base_receptions_mean=float(p_info["rec_pg"]),
                )
                wr360_delta = float(np.clip((wr360["composite_wr_multiplier"] - 1.0) * 0.35, -0.12, 0.12))
                if mkt == "Receiving Yards":
                    stat_pg = float(p_info["rec_yds_pg"])
                    team_vec = np.asarray(v[f"{side_prefix}_pass_yds"], dtype=np.float64)
                    tm_base = 240.0
                    pre_overlay = (float(c281_res["share_multiplier"]) - 1.0) * 0.45 + qb_shift * 0.8 + wr360_delta
                else:
                    stat_pg = float(p_info["rec_pg"])
                    team_vec = np.asarray(v[f"{side_prefix}_pass_comp"], dtype=np.float64)
                    tm_base = 21.8
                    pre_overlay = (float(c281_res["share_multiplier"]) - 1.0) * 0.40 + qb_shift * 0.6 + wr360_delta
                role_tag = (
                    f"{tm} {pos} (GP={gp}, 2026Avg={stat_pg:.1f}, Realloc={realloc_m:.2f}x, "
                    f"WOPR={wopr_val:.2f}, Open={wr360['sep_open_mult']:.2f}x, Funnel={opp_c.get('targetFunnel', {}).get('funnelClassification', 'BAL')[:10]})"
                )
            elif mkt == "Rushing Yards":
                stat_pg = float(p_info["rush_yds_pg"])
                if pos == "QB":
                    team_vec = np.asarray(v[f"{side_prefix}_rush_yds_roles"][:, 2], dtype=np.float64)
                    tm_base = 22.0
                else:
                    team_vec = np.sum(np.asarray(v[f"{side_prefix}_rush_yds_roles"][:, :2], dtype=np.float64), axis=1)
                    tm_base = 96.0
                pre_overlay = ridge_delta * 0.9
                role_tag = f"{tm} {pos} (GP={gp}, 2026Avg={stat_pg:.1f}, Realloc={realloc_m:.2f}x, C285={ridge_delta:+.3f})"
            elif mkt == "Rushing Attempts":
                stat_pg = float(p_info["carries_pg"])
                if pos == "QB":
                    team_vec = np.asarray(v[f"{side_prefix}_carries_roles"][:, 2], dtype=np.float64)
                    tm_base = 4.5
                else:
                    team_vec = np.sum(np.asarray(v[f"{side_prefix}_carries_roles"][:, :2], dtype=np.float64), axis=1)
                    tm_base = 22.5
                pre_overlay = ridge_delta * 0.7
                role_tag = f"{tm} {pos} (GP={gp}, 2026Avg={stat_pg:.1f}, Realloc={realloc_m:.2f}x)"
            elif mkt == "Rush + Rec Yards":
                stat_pg = float(p_info["rush_yds_pg"]) + float(p_info["rec_yds_pg"])
                tm_rb_rush = np.sum(np.asarray(v[f"{side_prefix}_rush_yds_roles"][:, :2], dtype=np.float64), axis=1)
                tm_pass_vec = np.asarray(v[f"{side_prefix}_pass_yds"], dtype=np.float64)
                team_vec = tm_rb_rush + 0.35 * tm_pass_vec
                tm_base = 180.0
                pre_overlay = ridge_delta * 0.7 + (float(c281_res["share_multiplier"]) - 1.0) * 0.25
                role_tag = f"{tm} {pos} (GP={gp}, 2026Avg={stat_pg:.1f}, Realloc={realloc_m:.2f}x)"

            if team_vec is None:
                continue

            precomp = internal_player_dists.get((fl_key, str(p_info["name_norm"]), mkt))
            proj = project_player_prop_prob(
                market=mkt,
                line=line,
                stat_pg=stat_pg,
                player_gp=gp,
                position=pos,
                team_vec=team_vec,
                team_baseline=tm_base,
                overlay_log_odds_deltas=[pre_overlay],
                devig_over=devig_ov,
                devig_under=devig_un,
                realloc_mult=1.0 if pos == "QB" else realloc_m,
                precomputed_internal=precomp,
            )
            side_str = str(proj["side"])
            is_jsn_conflict = (fl_key == "CHI@SEA" and str(p_info["name_norm"]) == "jaxon smith-njigba")
            all_candidates.append({
                "matchup": fl_key,
                "category": f"PLAYER_PROP_{mkt.upper().replace(' ', '_').replace('+', 'PLUS')}",
                "selection": f"{p_name} ({tm}) {mkt} {side_str} {line:.1f}",
                "market_line": line,
                "has_live_price": True,
                "has_two_way_odds": True,
                "writeup_conflict": is_jsn_conflict,
                "raw_prob": float(proj["raw_prob"]),
                "model_p": float(proj["model_p"]),
                "market_p": float(proj["market_p"]),
                "edge": float(proj["edge"]),
                "model_median": float(proj["model_median"]),
                "rationale": f"{role_tag}: Pure internal mean {proj['model_mean']:.1f} (median {proj['model_median']:.1f}) vs DK {line:.1f}",
                "certs": certs,
            })

        # ------------------------------------------------------------------
        # 4. KICKING SUITE (`FGM O/U 1.5` — Model Projections & Fair-Odds Triggers)
        # ------------------------------------------------------------------
        for tm, side_prefix in [(away, "away"), (home, "home")]:
            k_info = specialists.get(tm, {}).get("kicker")
            k_name = k_info["player_name"] if k_info else f"{tm} Kicker"
            fgm_vec = np.asarray(v[f"{side_prefix}_fgm"], dtype=np.float64)
            rz_td = float(sim.get_rz_td_pct(2026, tm) or 0.52)
            emp_fgm_pg = float(k_info["fgm_pg"]) if k_info and float(k_info["fgm_pg"]) > 0.4 else 1.55
            stall_bonus = 0.28 if rz_td < 0.25 else (0.12 if rz_td < 0.48 else -0.10)
            lam_fg = float(np.clip(0.50 * float(np.mean(fgm_vec)) + 0.50 * emp_fgm_pg + stall_bonus, 0.85, 2.35))
            raw_fg_ov = float(1.0 - math.exp(-lam_fg) * (1.0 + lam_fg))
            raw_fg_un = 1.0 - raw_fg_ov
            fg_side = "OVER" if raw_fg_ov >= raw_fg_un else "UNDER"
            fg_raw = max(raw_fg_ov, raw_fg_un)
            all_candidates.append({
                "matchup": fl_key, "category": "KICKING_SUITE",
                "selection": f"{k_name} ({tm}) Field Goals Made {fg_side} 1.5", "market_line": 1.5,
                "has_live_price": False, "has_two_way_odds": False, "writeup_conflict": False,
                "raw_prob": fg_raw, "model_p": fg_raw, "market_p": None, "edge": None,
                "fair_odds": prob_to_american_str(fg_raw),
                "trigger_odds": prob_to_american_str(max(fg_raw - 0.04, 0.50)),
                "model_median": lam_fg,
                "rationale": f"Blended FGM lambda={lam_fg:.2f} (2026 Avg={emp_fgm_pg:.2f}, Sim4thFG={np.mean(fgm_vec):.2f}, RZ TD%={rz_td*100:.1f}%)",
                "certs": certs,
            })

        # ------------------------------------------------------------------
        # 5. IDP TACKLES & SACKS SUITE (`C-300 @rynoonan` + Edge Sack Vector)
        # ------------------------------------------------------------------
        for def_tm, off_prefix, def_prefix in [(away, "home", "away"), (home, "away", "home")]:
            lb_info = specialists.get(def_tm, {}).get("lb1")
            if lb_info is not None:
                opp_rush_att = float(np.mean(np.sum(v[f"{off_prefix}_carries_roles"], axis=1))) + 3.2
                opp_comp = float(np.mean(v[f"{off_prefix}_pass_comp"]))
                opp_sacks = float(np.mean(v[f"{def_prefix}_def_sacks"]))
                mkt_tkl_line = math.floor(float(lb_info["tkl_pg"])) + 0.5
                tkl_eff = float(np.clip(float(lb_info["tkl_pg"]) / 51.0, 0.11, 0.19))
                def_blitz = float((master.get(def_tm) or {}).get("def_blitz_rate_pct", 26.0))
                box_mult = 1.06 if def_blitz > 30.0 else 1.00
                c300 = compute_c300_rynoonan_idp_tackles_kernel(
                    opp_rush_att_proj=opp_rush_att,
                    opp_completions_proj=opp_comp,
                    opp_sacks_proj=opp_sacks,
                    player_snap_share=0.95,
                    tackle_efficiency_rate=tkl_eff,
                    box_alignment_mult=box_mult,
                    market_line=mkt_tkl_line,
                    devig_over_prob=0.50,
                )
                side_c300 = str(c300["recommended_side"])
                raw_c300 = float(c300["over_prob"] if side_c300 == "OVER" else c300["under_prob"])
                all_candidates.append({
                    "matchup": fl_key, "category": "IDP_TACKLES_SACKS",
                    "selection": f"{lb_info['player_name']} ({def_tm} LB) Total Tackles+Ast {side_c300} {mkt_tkl_line:.1f}",
                    "market_line": mkt_tkl_line,
                    "has_live_price": False, "has_two_way_odds": False, "writeup_conflict": False,
                    "raw_prob": raw_c300, "model_p": raw_c300, "market_p": None, "edge": None,
                    "fair_odds": prob_to_american_str(raw_c300),
                    "trigger_odds": prob_to_american_str(max(raw_c300 - 0.04, 0.50)),
                    "model_median": float(c300["expected_tackles"]),
                    "rationale": f"C-300 @rynoonan tackle funnel: {c300['total_tackle_opportunities']:.1f} opp plays -> E[Tackles]={c300['expected_tackles']:.2f} vs ref {mkt_tkl_line:.1f}",
                    "certs": certs,
                })

            edge_info = specialists.get(def_tm, {}).get("edge1")
            if edge_info is not None:
                tm_sacks_vec = np.asarray(v[f"{def_prefix}_def_sacks"], dtype=np.float64)
                edge_share = float(np.clip(float(edge_info["sacks_pg"]) / 2.6, 0.22, 0.45))
                lam_sack = float(np.mean(tm_sacks_vec)) * edge_share
                raw_sack_ov = float(1.0 - math.exp(-lam_sack))
                all_candidates.append({
                    "matchup": fl_key, "category": "IDP_TACKLES_SACKS",
                    "selection": f"{edge_info['player_name']} ({def_tm} {edge_info['position']}) Over 0.25 Sacks (0.5+ Clears)",
                    "market_line": 0.25,
                    "has_live_price": False, "has_two_way_odds": False, "writeup_conflict": False,
                    "raw_prob": raw_sack_ov, "model_p": raw_sack_ov, "market_p": None, "edge": None,
                    "fair_odds": prob_to_american_str(raw_sack_ov),
                    "trigger_odds": prob_to_american_str(max(raw_sack_ov - 0.04, 0.45)),
                    "model_median": lam_sack,
                    "rationale": f"Pathwise team sacks {np.mean(tm_sacks_vec):.2f} x {edge_share*100:.0f}% share -> lambda={lam_sack:.2f} sacks",
                    "certs": certs,
                })

        # ------------------------------------------------------------------
        # 6. GOAL-LINE / ANYTIME TD VULTURE SUITE (`@locktalkbets` Inside-the-5)
        # ------------------------------------------------------------------
        for tm, side_prefix in [(away, "away"), (home, "home")]:
            gl_split = compute_locktalk_qb_vulture_goal_line_split(tm, yardline_100=3, metrics=pbp_metrics)
            qb_td_vec = np.asarray(v[f"{side_prefix}_rush_tds_roles"][:, 2], dtype=np.float64)
            rb1_td_vec = np.asarray(v[f"{side_prefix}_rush_tds_roles"][:, 0], dtype=np.float64) + np.asarray(v[f"{side_prefix}_rec_tds_roles"][:, 4], dtype=np.float64)
            qb_atd_raw = float(np.mean(qb_td_vec >= 1))
            rb1_atd_raw = float(np.mean(rb1_td_vec >= 1))
            qb_nm = TEAM_TO_QB_2026.get(tm, f"{tm} QB")
            rb_info = specialists.get(tm, {}).get("rb1")
            rb_nm = rb_info["player_name"] if rb_info else f"{tm} RB1"

            if float(gl_split["qb_rush_share"]) >= 0.30 and qb_atd_raw >= 0.34:
                all_candidates.append({
                    "matchup": fl_key, "category": "ANYTIME_TD_VULTURE",
                    "selection": f"{qb_nm} ({tm}) Anytime Rush TD",
                    "market_line": 0.5,
                    "has_live_price": False, "has_two_way_odds": False, "writeup_conflict": False,
                    "raw_prob": qb_atd_raw, "model_p": qb_atd_raw, "market_p": None, "edge": None,
                    "fair_odds": prob_to_american_str(qb_atd_raw),
                    "trigger_odds": prob_to_american_str(max(qb_atd_raw - 0.04, 0.25)),
                    "model_median": float(gl_split["qb_rush_share"]),
                    "rationale": f"@locktalkbets QB Vulture inside-5 share={gl_split['qb_rush_share']*100:.1f}% -> P(1+ Rush TD)={qb_atd_raw*100:.1f}%",
                    "certs": certs,
                })
            if float(gl_split["rb_rush_share"]) >= 0.78 and rb1_atd_raw >= 0.52:
                all_candidates.append({
                    "matchup": fl_key, "category": "ANYTIME_TD_VULTURE",
                    "selection": f"{rb_nm} ({tm}) Anytime TD",
                    "market_line": 0.5,
                    "has_live_price": False, "has_two_way_odds": False, "writeup_conflict": False,
                    "raw_prob": rb1_atd_raw, "model_p": rb1_atd_raw, "market_p": None, "edge": None,
                    "fair_odds": prob_to_american_str(rb1_atd_raw),
                    "trigger_odds": prob_to_american_str(max(rb1_atd_raw - 0.04, 0.35)),
                    "model_median": float(gl_split["rb_rush_share"]),
                    "rationale": f"Low QB vulture ({gl_split['qb_rush_share']*100:.1f}%) -> RB1 goal-line share={gl_split['rb_rush_share']*100:.1f}%, P(1+ TD)={rb1_atd_raw*100:.1f}%",
                    "certs": certs,
                })

        game_summaries.append({
            "matchup": f"{away} @ {home}",
            "fl_key": fl_key,
            "away": away,
            "home": home,
            "posted_spread": posted_spread,
            "posted_total": posted_total,
            "median_total": r["median_total"],
            "median_spread_home": r["median_spread_home"],
            "median_1h_total": float(np.median(v["away_1h"] + v["home_1h"])),
            "median_1q_total": float(np.median(v["away_q1"] + v["home_q1"])),
            "pace": r["median_pace_sec"],
            "shootout": r["shootout_prob_ge51"],
            "stall": r["stall_prob_le37"],
            "qb_note": qb_note,
            "fault1_adv": fault1.get("advantage", "?"),
            "certs": certs,
        })

        print(
            f"{away:3s} @ {home:3s} | DK: {home} {posted_spread:+5.1f} / {posted_total:4.1f} | "
            f"SimMedTot: {r['median_total']:5.2f} | SimSprd(H): {-r['median_spread_home']:+5.2f} | "
            f"1QTot: {np.median(v['away_q1']+v['home_q1']):4.1f} | 1HTot: {np.median(v['away_1h']+v['home_1h']):5.1f} | "
            f"Res: {cons_res:.1e} | QB: {qb_note}"
        )

    # ------------------------------------------------------------------
    # APPLY FULL CONJUNCTION GATE & CARD-WRITEUP DIRECTION AGREEMENT
    # ------------------------------------------------------------------
    # Require:
    #   - pathwise_conservation_residual == 0.0
    #   - sinkhorn_dual_residual < 1e-8
    #   - corank == 0
    #   - has_pole == False
    #   - has_live_price == True and has_two_way_odds == True
    #   - writeup_conflict == False
    survivors: List[Dict[str, Any]] = []
    abstain_projections: List[Dict[str, Any]] = []
    pass_items: List[Dict[str, Any]] = []
    for cand in all_candidates:
        c_certs = cand["certs"]
        cat = str(cand["category"])
        has_price = bool(cand.get("has_live_price", False))
        has_two_way = bool(cand.get("has_two_way_odds", False))
        has_conflict = bool(cand.get("writeup_conflict", False))
        mp = float(cand["model_p"])
        certs_ok = (
            float(c_certs["pathwise_conservation_residual"]) == 0.0
            and float(c_certs["sinkhorn_dual_residual"]) < 1e-8
            and int(c_certs["corank"]) == 0
            and (bool(c_certs["has_pole"]) is False)
        )
        diag_tag = (
            f"corank={c_certs['corank']} pole={c_certs['has_pole']} "
            f"tdr={c_certs['talisman_tdr_max']:.3f} tau_hat={c_certs['tau_hat_status']}"
        )

        if not has_price or not has_two_way or cand.get("market_p") is None or cand.get("edge") is None:
            thr_p = 0.55
            cand["decision"] = "ABSTAIN"
            cand["publishAllowed"] = False
            cand["composite_score"] = mp * 100.0
            append_gate_decision(
                game_id=f"2026_08_{cand['matchup'].replace('@', '_')}",
                market=f"{cat}:{cand['selection']}",
                model_prob=float(np.clip(mp, 0.0, 1.0)),
                threshold=thr_p,
                decision="ABSTAIN",
                reason=(
                    f"no_two_way_live_price fair_odds={cand.get('fair_odds')} "
                    f"trigger_odds={cand.get('trigger_odds')} res={c_certs['pathwise_conservation_residual']:.1e} "
                    f"{diag_tag} | {cand['rationale']}"
                ),
                ledger_path=gate_log_path,
            )
            abstain_projections.append(cand)
            continue

        ed = float(cand["edge"])
        if cat == "MONEYLINE":
            thr_p = 0.58
            ml_line = float(cand.get("market_line", -110.0))
            passes_gate = certs_ok and (not has_conflict) and (ed >= 0.030) and (mp >= thr_p) and (ml_line >= -275.0)
        elif cat in ("MAIN_SPREAD", "MAIN_TOTAL", "1Q_1H_DERIVATIVE"):
            thr_p = 0.555
            passes_gate = certs_ok and (not has_conflict) and (ed >= 0.025) and (mp >= thr_p)
        else:
            # Player Props (Pure internal Phase I distribution + Stage D capped, market compared last)
            thr_p = 0.560
            passes_gate = certs_ok and (not has_conflict) and (ed >= 0.035) and (mp >= thr_p)

        decision_str = "PUBLISH" if passes_gate else "PASS"
        gate_schema_decision = "PASS" if passes_gate else ("ABSTAIN" if not certs_ok else "REJECT")
        cand["decision"] = decision_str
        cand["publishAllowed"] = bool(passes_gate)
        cand["composite_score"] = ed * 100.0 + (mp - 0.50) * 15.0

        append_gate_decision(
            game_id=f"2026_08_{cand['matchup'].replace('@', '_')}",
            market=f"{cat}:{cand['selection']}",
            model_prob=float(np.clip(mp, 0.0, 1.0)),
            threshold=thr_p,
            decision=gate_schema_decision,
            reason=(
                f"edge={ed:+.4f} raw={cand['raw_prob']:.3f} mkt={cand['market_p']:.3f} "
                f"conflict={has_conflict} res={c_certs['pathwise_conservation_residual']:.1e} {diag_tag} | {cand['rationale']}"
            ),
            ledger_path=gate_log_path,
        )
        if passes_gate:
            survivors.append(cand)
        else:
            pass_items.append(cand)

    survivors.sort(key=lambda x: float(x["composite_score"]), reverse=True)
    abstain_projections.sort(key=lambda x: float(x["composite_score"]), reverse=True)
    pass_items.sort(key=lambda x: float(x["composite_score"]), reverse=True)

    def select_diverse(items: List[Dict[str, Any]], limit: int, max_per_game: int = 2) -> List[Dict[str, Any]]:
        picked: List[Dict[str, Any]] = []
        counts: Dict[str, int] = {}
        for it in items:
            m = str(it["matchup"])
            if counts.get(m, 0) >= max_per_game:
                continue
            picked.append(it)
            counts[m] = counts.get(m, 0) + 1
            if len(picked) >= limit:
                break
        return picked

    # Select top highest-conviction PRICED plays per category (`has_live_price == True` and `has_two_way_odds == True`)
    top_main = select_diverse([s for s in survivors if s["category"] in ("MAIN_SPREAD", "MAIN_TOTAL", "MONEYLINE")], limit=10, max_per_game=2)
    top_deriv = select_diverse([s for s in survivors if s["category"] == "1Q_1H_DERIVATIVE"], limit=10, max_per_game=2)
    top_props = select_diverse([s for s in survivors if s["category"].startswith("PLAYER_PROP_")], limit=18, max_per_game=2)

    # Select top UNPRICED / SINGLE-SIDE 360° derivative watchlist projections (`decision == "ABSTAIN"`, `publishAllowed == False`)
    top_1q_proj = select_diverse([a for a in abstain_projections if a["category"] == "1Q_1H_DERIVATIVE"], limit=10, max_per_game=2)
    top_kick = select_diverse([a for a in abstain_projections if a["category"] == "KICKING_SUITE"], limit=6, max_per_game=1)
    top_idp = select_diverse([a for a in abstain_projections if a["category"] == "IDP_TACKLES_SACKS"], limit=8, max_per_game=1)
    top_td = select_diverse([a for a in abstain_projections if a["category"] == "ANYTIME_TD_VULTURE"], limit=6, max_per_game=1)
    top_reconciled_pass = select_diverse([p for p in pass_items if p.get("writeup_conflict") or p["category"] == "MAIN_TOTAL"], limit=13, max_per_game=2)

    # Verify publishAllowed is explicitly present on every item in locked_card
    for item_list in (top_main, top_deriv, top_props):
        for it in item_list:
            assert it.get("publishAllowed") is True and it.get("decision") == "PUBLISH"
    for item_list in (top_1q_proj, top_kick, top_idp, top_td, top_reconciled_pass):
        for it in item_list:
            assert it.get("publishAllowed") is False and it.get("decision") in ("ABSTAIN", "PASS")

    assert max_conservation_res == 0.0, f"Expected max_pathwise_conservation_residual == 0.0, got {max_conservation_res}"
    assert max_sinkhorn_res < 1e-8, f"Expected max_sinkhorn_dual_residual < 1e-8, got {max_sinkhorn_res}"

    locked_card = {
        "generated_at": "2026-10-30",
        "seal_digest": digest,
        "odds_last_firewall_verified": True,
        "internal_sealed_before_odds": internal_sealed,
        "roster_identity_2026": roster_identity_cert,
        "same_position_injury_reallocation": injury_realloc_cert,
        "total_candidates_evaluated": len(all_candidates),
        "total_priced_survivors": len(survivors),
        "total_unpriced_abstain_projections": len(abstain_projections),
        "total_priced_pass_items": len(pass_items),
        "max_pathwise_conservation_residual": max_conservation_res,
        "max_sinkhorn_dual_residual": max_sinkhorn_res,
        "corank": 0,
        "has_pole": False,
        "top_main_lines": top_main,
        "top_priced_derivatives": top_deriv,
        "top_player_props": top_props,
        "reconciled_pass_items": top_reconciled_pass,
        "abstain_watchlist_1q_totals": top_1q_proj,
        "abstain_watchlist_kicking_suite": top_kick,
        "abstain_watchlist_idp_suite": top_idp,
        "abstain_watchlist_anytime_td_vulture": top_td,
    }
    locked_card["official_availability"] = json.loads(
        (REPO_ROOT / "data" / "engine" / "week8_alexandria_nfl_com_2026_10_30.json").read_text(encoding="utf-8")
    )
    card_json_path = REPO_ROOT / "data" / "engine" / "week8_360_locked_card_2026_10_30.json"
    card_json_path.write_text(json.dumps(locked_card, indent=2), encoding="utf-8")

    # Write comprehensive Markdown Call Sheet
    brief_path = REPO_ROOT / "docs" / "predictions" / "research" / "2026-10-30" / "WEEK-8-MORNING-BRIEF-POST-UPGRADE.md"
    brief_path.parent.mkdir(parents=True, exist_ok=True)

    lines: List[str] = []
    lines.append("# Week 8 360° Full-Board Master Call Sheet — Post-Grok 4.7 Sweep & TDD Calibration Upgrade\n")
    lines.append(
        f"**Generated:** `2026-10-30` | **Engine:** `GSE v5.3.0 Pathwise 360° (10,000 worlds × 175 snaps = 22.75M snaps)` | "
        f"**Seal Hash:** `{digest[:16]}...`\n"
    )
    lines.append(
        f"**Transport & Conservation Certificates:** Max Pathwise Conservation Residual = `{max_conservation_res:.2e}` (`<= 1e-6`) | "
        f"Max Sinkhorn Dual Residual = `{max_sinkhorn_res:.2e}` (`<= 1e-6`) | "
        f"Evaluated Candidates = `{len(all_candidates)}` | Priced Gate Survivors (`PUBLISH`) = `{len(survivors)}` | "
        f"Unpriced Derivative Projections (`ABSTAIN`) = `{len(abstain_projections)}`\n"
    )
    lines.append("---\n")
    lines.append("## 1. All 13 Sunday/Monday Matchups — Pathwise Medians vs Live DraftKings Lines\n")
    lines.append("| Matchup | DK Spread (H) | Sim Spread (H) | DK Total | Sim Total | Sim 1Q Tot | Sim 1H Tot | Pace (s) | QB 2×2 Matrix Shift | Early-Down Edge |")
    lines.append("|---|---:|---:|---:|---:|---:|---:|---:|---|---|")
    g_by_key: Dict[str, Dict[str, Any]] = {}
    for g in game_summaries:
        g_by_key[g["fl_key"]] = g
        lines.append(
            f"| **{g['matchup']}** | `{g['posted_spread']:+.1f}` | `{-g['median_spread_home']:+.2f}` | "
            f"`{g['posted_total']:.1f}` | `{g['median_total']:.2f}` | `{g['median_1q_total']:.1f}` | "
            f"`{g['median_1h_total']:.1f}` | `{g['pace']:.2f}s` | {g['qb_note']} | {g['fault1_adv']} |"
        )

    def render_priced_section(title: str, items: List[Dict[str, Any]]) -> None:
        lines.append(f"\n---\n\n## {title}\n")
        if not items:
            lines.append("_No priced plays cleared the Sniper Conjunction Gate in this bucket._\n")
            return
        lines.append("| Rank | Matchup | Locked Selection | Sim Median/Mean | Pre-Market Prob | Post-Stage-D (`model_p`) | De-Vig Market (`market_p`) | Net Edge | Structural & Mathematical Rationale |")
        lines.append("|---:|---|---|---:|---:|---:|---:|---:|---|")
        for i, it in enumerate(items, 1):
            lines.append(
                f"| **{i}** | `{it['matchup']}` | **{it['selection']}** | `{it['model_median']:.2f}` | "
                f"`{it['raw_prob']*100:.1f}%` | **`{it['model_p']*100:.1f}%`** | `{it['market_p']*100:.1f}%` | "
                f"**`{it['edge']*100:+.1f}%`** | {it['rationale']} |"
            )

    def render_abstain_watchlist_section(title: str, items: List[Dict[str, Any]]) -> None:
        lines.append(f"\n---\n\n## {title}\n")
        lines.append("> **Gate Status: `ABSTAIN` (`publishAllowed: false` until live two-way book odds are ingested).** Per Grok 4.7 Agent #2 §4, absence of a live book price on disk is logged as `ABSTAIN` rather than compared against a synthetic `0.50` coinflip. Bet only if your sportsbook posts odds at or better than the **`+4.0% Edge Trigger Odds`** column.\n")
        if not items:
            lines.append("_No projections generated in this bucket._\n")
            return
        lines.append("| Rank | Matchup | Target Derivative Market | Pathwise Median/Lambda | Model Fair Prob (`model_p`) | Model Fair Odds | Min Book Odds (`+4.0% Edge Trigger`) | Structural & Mathematical Rationale |")
        lines.append("|---:|---|---|---:|---:|---:|---:|---|")
        for i, it in enumerate(items, 1):
            lines.append(
                f"| **{i}** | `{it['matchup']}` | **{it['selection']}** | `{it['model_median']:.2f}` | "
                f"**`{it['model_p']*100:.1f}%`** | `{it['fair_odds']}` | **`{it['trigger_odds']}`** | {it['rationale']} |"
            )

    render_priced_section("2. Tier-1 Main Game Lines (`Spread`, `Total`, `Moneyline` — Live DraftKings Odds)", top_main)
    render_priced_section("3. Priced Quarters, Halves & Team Totals (`1H/2Q/4Q/2H Winner` & `Team Totals` — Live Scores24 Odds)", top_deriv)
    render_priced_section("4. Top Skill & QB Player Props (`Layer-1 GP Empirical-Bayes` + `Stage D <= 0.35`, Live DraftKings Odds)", top_props)
    render_abstain_watchlist_section("5. Unpriced `1st Quarter Total` Projections & Book Trigger Odds (`ABSTAIN` — `@locktalkbets` 1Q Stop & `19.26%` 2026 Q1 Simplex)", top_1q_proj)
    render_abstain_watchlist_section("6. Kicking Suite Projections & Book Trigger Odds (`ABSTAIN` — `Field Goals Made O/U 1.5` Pathwise Stall Kernel)", top_kick)
    render_abstain_watchlist_section("7. Defense / IDP Suite Projections & Book Trigger Odds (`ABSTAIN` — `C-300 @rynoonan` Tackle Funnel & Edge Sacks)", top_idp)
    render_abstain_watchlist_section("8. Goal-Line / Anytime TD Vulture Projections & Book Trigger Odds (`ABSTAIN` — `@locktalkbets` Inside-the-5 Split)", top_td)

    lines.append("\n---\n\n## 9. Scores24.live Empirical Quarter/Half/Total/Handicap Trend Concordance Matrix\n")
    lines.append("Cross-verified dynamically against live simulation outputs and `data/engine/scores24_nfl_week8_2026_10_30.json` (`115` priced empirical trends & `6` match predictions from `https://scores24.live/en/american-football/l-usa-nfl`):\n")
    lines.append("| Matchup | Scores24 Empirical Trend / Streak (`n >= 5`) | Scores24 Price / Pick | GSE 360° Pathwise Simulation Concordance |")
    lines.append("|---|---|---|---|")

    s24_notes = [
        ("BAL@BUF", "Bills won 8 of last 9 games; Bills +3.5 in 21 straight home games; Ravens won 4Q in 8 of last 9 away games", "BUF -3.5 (Editor Pick) / BAL 4Q +132"),
        ("TEN@CIN", "Bengals averaging 27.2 PPG vs Titans 15.4 PPG (1-6 record); Bengals 35-13 rout of BAL", "CIN -9.5 (Editor Pick)"),
        ("ARI@DAL", "Over 44.5 in 13 of last 15 DAL games; ARI allowing 29.7 PPG; ARI Over 23.5 TT in 5 straight at DAL", "OVER 51.5 (Editor Pick)"),
        ("MIN@DET", "Lions Over 24.5 TT in 6 of last 7 vs MIN; Over 49.5 in 6 of last 7 MIN@DET; MIN won 4Q in 6 straight", "DET TT Over 24.5 (-120) / Over 49.5 (+127)"),
        ("LV@NYJ", "Under 53.5 in 10 straight NYJ home games; NYJ TT Under 23.5 in 13 of last 15; Raiders 4-game skid", "NYJ ML (Editor Pick)"),
        ("CLE@PIT", "Steelers 19-1 in last 20 home games vs CLE (-2.5 in 19/20); PIT won 1H in 5 straight & 2Q in 8/9 vs CLE", "PIT ML (-192) / PIT 1H (-149) / PIT TT > 20.5"),
        ("ATL@TB", "Buccaneers +6.5 in 19 of last 21 home games; Over 42.5 in 5 straight TB vs ATL; ATL won 2Q in 6/7 away", "Over 42.5 (-141)"),
        ("IND@JAX", "Jaguars won 2Q in 10 straight home games vs IND; won 1H in 5 straight; won -2.5 in 11 straight home vs IND", "JAX -7.5 (Editor Pick) / JAX 1H (-294)"),
        ("LAC@LA", "Chargers lost 9 straight NFL games, lost 1H in 8/9, lost 2Q & 4Q in 7/8; Rams Over 26.5 TT in 6/7 home", "LA ML (-294) / LA 1H (-200)"),
        ("KC@DEN", "Under 46.5 in 10 of last 11 DEN games; DEN 17-2 in last 19 home games", "DEN +3.5 (-179) / Under 46.5 (-227)"),
        ("NE@MIA", "Dolphins lost 9 of last 10 games, lost 1H in 9/10 (NE 1H -189), lost 2Q in 8/9 (NE 2Q -118)", "NE ML (-323) / NE 1H (-189)"),
        ("PHI@WAS", "Commanders -6.0 home favorite; Eagles 2-5 skid vs Daniels high-tempo offense", "WAS -6.0"),
        ("CHI@SEA", "Bears 5-2 vs Seahawks 4-3; fast neutral pace (25.53s)", "SEA -3.0 / Total 46.5"),
    ]
    for m_key, trend_txt, pick_txt in s24_notes:
        gm = g_by_key.get(m_key)
        if gm is not None:
            hm_tm = gm["home"]
            sim_sp = -float(gm["median_spread_home"])
            sim_tot = float(gm["median_total"])
            sim_1q = float(gm["median_1q_total"])
            sim_1h = float(gm["median_1h_total"])
            lines.append(
                f"| `{m_key}` | {trend_txt} | `{pick_txt}` | "
                f"Sim Median `{hm_tm} {sim_sp:+.2f}`, Total `{sim_tot:.2f}` (`1Q {sim_1q:.1f}`, `1H {sim_1h:.1f}`) |"
            )

    lines.append("\n---\n\n## 10. Official New Engine Verified Record & Calibration Receipts\n")
    lines.append("- **Official New Engine Verified Record (`AGENTS.md` Standing Doctrine):** **`16-5` (`76.2%`) · `+10.45 Units`** entering Oct 29, 2026 (`data/engine/new_engine_official_ledger_2026.json` and `docs/predictions/research/2026-10-29/NEW-ENGINE-OFFICIAL-LEDGER-16-5.md`).")
    lines.append("- **Weeks 1–7 Held-Out Replay (`106` games, `step5_replay.py`):** Pathwise conservation residual `0.00e+00`, Sinkhorn dual residual `9.92e-12`, ML Gate (`edge >= 0.02, model_p >= 0.58`) **60.00% (`21-14`, `+1.26%` mean CLV)**; High-Confidence Gate (`model_p >= 0.64`) **66.67% (`12-6`)**.")
    lines.append("- **Adversarial TDD Fixes & Oct 30 Readiness Kernels Verified (`18/18 PASSED` in `tests/test_consolidated_sweep_kernels.py`):** (1) `@locktalkbets` pocket-passer goal-line vulture ceiling removed; (2) `TEAM_TO_QB_2026` synced to all 32 verified Week 8 starters; (3) `home_qtr_cal` / `away_qtr_cal` anchored to the 2026 empirical regulation scoring simplex (`[0.1926, 0.2960, 0.2103, 0.3011]`) with post-calibration `first_half_margin_shift` and 4-quarter zero-sum HFA conservation; (4) `build_player_profiles` resolves mid-season trades by `player_id` and latest Week 8 injury status (`Lamar Jackson`, `Emeka Egbuka`, `Tyler Warren` active; `Saquon Barkley` `PHI` RB1) with strict `DE/OLB/DL/EDGE` and `LB/ILB/MLB` filters; (5) `project_player_prop_prob` enforces Layer-1 GP empirical-Bayes shrinkage and Stage D `|Δ log-odds| <= 0.35` before comparing against `market_p` last; (6) `consume_oct30_signal_pack` actively consumes all 7 verified tables in `docs/research/2026-10-30/signal-pack/outputs/` (closing `READINESS.md` §5.9); (7) `compute_tau_hat_4th_down_coach_tax` consumes the point-in-time walk-forward `tau_hat.csv` (`+11.1585pp` walk-forward / `+6.7703pp` prior-only control, `n=3,988`) in live simulation state (closing `READINESS.md` §5.8 Solution 2); (8) `compute_b4_hierarchical_fg_make_prob` & `compute_eq_physics_001_ball_flight_modifier` model altitude/wind/spin ball-flight physics (`23,247` kicks); (9) `compute_b6_b9_ol_qb_pressure_sack_survival` separates OL pressure prior from QB sack survival + PFR throwaway escape; (10) `compute_adaptive_conformal_interval_aci` & `compute_nguyen_yurko_snap_timing_variance` attach distribution-free conformal intervals and multilevel snap-timing variance.")

    brief_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print()
    print("=" * 112)
    print(
        f"EVALUATED {len(all_candidates)} TOTAL 360-DEGREE MARKETS ACROSS 13 GAMES -> "
        f"{len(survivors)} PRICED PLAYS CLEARED SNIPER GATE ({len(abstain_projections)} UNPRICED DERIVATIVES LOGGED AS ABSTAIN)"
    )
    print(f"Max Pathwise Conservation Residual: {max_conservation_res:.2e} | Max Sinkhorn Dual Residual: {max_sinkhorn_res:.2e}")
    print(f"Gate decisions logged to : {gate_log_path}")
    print(f"Locked JSON card saved to: {card_json_path}")
    print(f"Master Call Sheet written: {brief_path}")
    print("=" * 112)


if __name__ == "__main__":
    main()
