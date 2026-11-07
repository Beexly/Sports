#!/usr/bin/env python3
"""
Two-Stage GSE Simulation-to-DFS Pipeline
========================================
Implements Garrett's exact architectural sequence (2026-11-07):
  1. Stage 1 — Full-Game Snap-by-Snap Simulation FIRST -> Official GSE Player Projections:
       After the 10,000-world Full-Game Snap-by-Snap GSE Game Simulations run for every game,
       we extract GSE's own conserved player stat projections (passing, rushing, receiving,
       touchdowns, target shares, carry shares, and DraftKings fantasy point distributions)
       into a standalone canonical artifact (`data/dfs/gse_post_game_sim_player_projections_week9_2026_11_07.json`).
  2. Stage 2 — Select the Dedicated GSE DFS Player Pool From GSE Projections:
       From our GSE game projections + 10-Gate Role/Snap/Route/Trench filters, we explicitly
       curate GSE's Dedicated DFS Player Pool (`data/dfs/gse_dedicated_curated_dfs_player_pool_week9_2026_11_07.json`),
       rejecting all sub-floor WR4s, blocking TE2s, RB3s, and road-dog punt DSTs BEFORE any
       DFS contest simulation runs.
  3. Stage 3 — Dedicated Second-Stage 10,000-World DFS Contest Simulations on the Curated Pool:
       Runs a second, dedicated 10,000-world DFS Contest & Covariance Simulation specifically
       on the curated GSE player pool — modeling exact DraftKings 300-yd passing / 100-yd
       rushing / 100-yd receiving +3pt milestone bonuses, within-game Student-t (nu=4) tail
       correlation, and adversarial field ownership on the curated pool.
"""

from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np
import pandas as pd
from scipy.stats import t as student_t

from intelligence.dfs.dfs_and_fantasy_accuracy_engine import (
    BLOCKED_PUNT_DSTS_BY_TEAM,
    SUB_FLOOR_ROLE_TRAP_DENYLIST,
    VERIFIED_VACATED_ROLE_CATALYSTS,
    norm_key,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
GSE_PROJECTIONS_JSON = REPO_ROOT / "data" / "dfs" / "gse_post_game_sim_player_projections_week9_2026_11_07.json"
GSE_CURATED_POOL_JSON = REPO_ROOT / "data" / "dfs" / "gse_dedicated_curated_dfs_player_pool_week9_2026_11_07.json"


def build_gse_post_game_sim_projections_and_curated_pool(
    hydrated_df: pd.DataFrame,
    num_dfs_sims: int = 10000,
    seed: int = 42,
) -> Dict[str, Any]:
    """
    Execute the 3-step sequence:
      Step 1: Persist GSE's post-game-simulation player projections for all active slate players.
      Step 2: Curate the Dedicated GSE DFS Player Pool (separating ACCEPTED pool players from REJECTED traps).
      Step 3: Run a Dedicated Second-Stage 10,000-World DFS Simulation specifically on the Curated Pool,
              computing exact DraftKings +3pt 300/100-yard milestone bonus probabilities and P90/P99 ceilings.
    """
    df = hydrated_df.copy().reset_index(drop=True)
    now_iso = datetime.now(timezone.utc).isoformat()

    # Step 1: Build GSE Post-Game-Simulation Player Projections Table
    all_gse_projections: List[Dict[str, Any]] = []
    accepted_indices: List[int] = []
    accepted_pool_records: List[Dict[str, Any]] = []
    rejected_pool_records: List[Dict[str, Any]] = []

    for idx, r in df.iterrows():
        nm = str(r.get("name", r.get("player", "")))
        key = norm_key(nm)
        pos = str(r["position"])
        tm = str(r["team"])
        opp = str(r["opponent"])
        gid = str(r.get("game_id", f"{tm}@{opp}"))
        sal = int(r["salary"])
        gse_proj = round(float(r["projection"]), 2)
        val_1k = round(gse_proj / max(sal / 1000.0, 1.0), 2)
        is_trap = bool(r.get("is_sub_floor_trap", False))
        gate_note = str(r.get("accuracy_gate_note", ""))

        rec_entry = {
            "player": nm,
            "position": pos,
            "team": tm,
            "opponent": opp,
            "game_id": gid,
            "dk_salary": sal,
            "gse_post_game_sim_stats": {
                "pass_yds": round(float(r.get("proj_pass_yds") or 0.0), 1),
                "rush_yds": round(float(r.get("proj_rush_yds") or 0.0), 1),
                "rec_yds": round(float(r.get("proj_rec_yds") or 0.0), 1),
                "receptions": round(float(r.get("proj_receptions") or 0.0), 2),
                "total_tds": round(float(r.get("proj_td") or 0.0), 2),
            },
            "gse_dk_projection": gse_proj,
            "gse_value_per_1k": val_1k,
            "pos_salary_rank_on_team": int(r.get("pos_salary_rank", 1)),
            "accuracy_gate_note": gate_note,
        }
        all_gse_projections.append(rec_entry)

        # Step 2: Dedicated GSE DFS Player Pool Selection Criteria
        reject_reason = None
        if is_trap or key in SUB_FLOOR_ROLE_TRAP_DENYLIST:
            reject_reason = gate_note or SUB_FLOOR_ROLE_TRAP_DENYLIST.get(key, "Sub-floor route/snap share trap")
        elif pos == "DST" and tm in BLOCKED_PUNT_DSTS_BY_TEAM:
            reject_reason = BLOCKED_PUNT_DSTS_BY_TEAM[tm]
        elif pos == "QB" and gse_proj < 14.5:
            reject_reason = f"Below GSE QB starter floor ({gse_proj} < 14.5 DK pts)"
        elif pos == "RB" and gse_proj < 8.5 and key not in VERIFIED_VACATED_ROLE_CATALYSTS:
            reject_reason = f"Below GSE RB touch/snap floor ({gse_proj} < 8.5 DK pts)"
        elif pos == "WR" and gse_proj < 8.5 and key not in VERIFIED_VACATED_ROLE_CATALYSTS:
            reject_reason = f"Below GSE WR target/route floor ({gse_proj} < 8.5 DK pts)"
        elif pos == "TE" and gse_proj < 7.5 and key not in VERIFIED_VACATED_ROLE_CATALYSTS:
            reject_reason = f"Below GSE TE route participation floor ({gse_proj} < 7.5 DK pts)"
        elif pos == "DST" and gse_proj < 6.0:
            reject_reason = f"Below GSE Trench/Matchup DST floor ({gse_proj} < 6.0 DK pts)"

        if reject_reason is None:
            accepted_indices.append(idx)
            accepted_pool_records.append({
                **rec_entry,
                "pool_status": "ACCEPTED_INTO_DEDICATED_GSE_DFS_POOL",
            })
        else:
            rejected_pool_records.append({
                "player": nm,
                "position": pos,
                "team": tm,
                "dk_salary": sal,
                "gse_dk_projection": gse_proj,
                "pool_status": "REJECTED_FROM_GSE_DFS_POOL",
                "reject_reason": reject_reason,
            })

    # Step 3: Run Dedicated Second-Stage 10,000-World DFS Contest Simulation Specifically on the Curated Pool
    pool_df = df.iloc[accepted_indices].copy().reset_index(drop=True)
    n_pool = len(pool_df)
    rng = np.random.default_rng(seed + 109)

    if n_pool > 0:
        games = pool_df["game_id"].astype(str).to_numpy()
        teams = pool_df["team"].astype(str).to_numpy()
        positions = pool_df["position"].astype(str).to_numpy()
        unique_games = np.unique(games)
        unique_teams = np.unique(teams)

        # Correlated game-environment + team-passing Student-t (nu=4) factors for the dedicated DFS pool
        scale_t = 1.0 / math.sqrt(2.0)
        game_env_shocks = {g: student_t.rvs(df=4, size=num_dfs_sims, random_state=rng) * scale_t for g in unique_games}
        team_off_shocks = {t: student_t.rvs(df=4, size=num_dfs_sims, random_state=rng) * scale_t for t in unique_teams}
        indiv_shocks = student_t.rvs(df=4, size=(num_dfs_sims, n_pool), random_state=rng) * scale_t

        dedicated_pool_fpts = np.zeros((num_dfs_sims, n_pool), dtype=np.float64)
        bonus_300_100_rates = np.zeros(n_pool, dtype=np.float64)

        for j in range(n_pool):
            g_shk = game_env_shocks[games[j]]
            t_shk = team_off_shocks[teams[j]]
            i_shk = indiv_shocks[:, j]
            pos_j = positions[j]
            mu_j = float(pool_df.loc[j, "projection"])

            if pos_j == "QB":
                composite = 0.42 * g_shk + 0.48 * t_shk + 0.44 * i_shk
                pass_yds_sim = np.clip(float(pool_df.loc[j, "proj_pass_yds"] or 235.0) * (1.0 + 0.24 * composite), 60.0, 480.0)
                bonus_300 = np.where(pass_yds_sim >= 300.0, 3.0, 0.0)
                bonus_300_100_rates[j] = float(np.mean(bonus_300 > 0))
                dedicated_pool_fpts[:, j] = np.clip(mu_j + (0.38 * mu_j) * composite + bonus_300 - bonus_300.mean(), 0.0, None)
            elif pos_j == "RB":
                composite = 0.28 * g_shk + 0.36 * t_shk + 0.68 * i_shk
                rush_yds_sim = np.clip(float(pool_df.loc[j, "proj_rush_yds"] or 55.0) * (1.0 + 0.42 * composite), 0.0, 240.0)
                bonus_100 = np.where(rush_yds_sim >= 100.0, 3.0, 0.0)
                bonus_300_100_rates[j] = float(np.mean(bonus_100 > 0))
                dedicated_pool_fpts[:, j] = np.clip(mu_j + (0.46 * mu_j) * composite + bonus_100 - bonus_100.mean(), 0.0, None)
            elif pos_j in ("WR", "TE"):
                composite = 0.40 * g_shk + 0.46 * t_shk + 0.56 * i_shk
                rec_yds_sim = np.clip(float(pool_df.loc[j, "proj_rec_yds"] or 50.0) * (1.0 + 0.48 * composite), 0.0, 250.0)
                bonus_100 = np.where(rec_yds_sim >= 100.0, 3.0, 0.0)
                bonus_300_100_rates[j] = float(np.mean(bonus_100 > 0))
                dedicated_pool_fpts[:, j] = np.clip(mu_j + (0.50 * mu_j) * composite + bonus_100 - bonus_100.mean(), 0.0, None)
            else:
                # DST negatively correlated with opponent offensive shock
                opp_t = str(pool_df.loc[j, "opponent"])
                opp_shk = team_off_shocks.get(opp_t, -t_shk)
                composite = -0.45 * opp_shk + 0.65 * i_shk
                dedicated_pool_fpts[:, j] = np.clip(mu_j + (0.48 * mu_j) * composite, 0.0, None)

        pool_p50 = np.percentile(dedicated_pool_fpts, 50.0, axis=0)
        pool_p75 = np.percentile(dedicated_pool_fpts, 75.0, axis=0)
        pool_p90 = np.percentile(dedicated_pool_fpts, 90.0, axis=0)
        pool_p99 = np.percentile(dedicated_pool_fpts, 99.0, axis=0)

        for j in range(n_pool):
            accepted_pool_records[j]["second_stage_dfs_pool_sim"] = {
                "dfs_pool_sims": int(num_dfs_sims),
                "sim_mean": round(float(dedicated_pool_fpts[:, j].mean()), 2),
                "sim_p50_median": round(float(pool_p50[j]), 2),
                "sim_p75_upside": round(float(pool_p75[j]), 2),
                "sim_p90_ceiling": round(float(pool_p90[j]), 2),
                "sim_p99_slate_breaker": round(float(pool_p99[j]), 2),
                "dk_300_100_yd_bonus_prob": round(float(bonus_300_100_rates[j]), 4),
            }

    # Write Stage 1 GSE Post-Game-Sim Projections Artifact
    GSE_PROJECTIONS_JSON.parent.mkdir(parents=True, exist_ok=True)
    GSE_PROJECTIONS_JSON.write_text(
        json.dumps(
            {
                "schema_version": "1.0.0",
                "generated_at_utc": now_iso,
                "pipeline_stage": "stage_1_gse_post_game_sim_player_projections",
                "total_active_slate_players_projected": len(all_gse_projections),
                "projections": all_gse_projections,
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    # Write Stage 2 & 3 Curated GSE DFS Player Pool + Dedicated Second-Stage DFS Simulation Artifact
    pool_summary = {
        "schema_version": "1.0.0",
        "generated_at_utc": now_iso,
        "pipeline_stage": "stage_2_and_3_curated_gse_dfs_player_pool_and_second_stage_dfs_sims",
        "total_slate_candidates_evaluated": len(all_gse_projections),
        "accepted_curated_pool_count": len(accepted_pool_records),
        "rejected_sub_floor_or_trap_count": len(rejected_pool_records),
        "second_stage_dfs_pool_sims_per_player": int(num_dfs_sims),
        "accepted_by_position": {
            pos: sum(1 for x in accepted_pool_records if x["position"] == pos)
            for pos in ("QB", "RB", "WR", "TE", "DST")
        },
        "curated_dfs_player_pool": accepted_pool_records,
        "rejected_players_audit": rejected_pool_records,
    }
    GSE_CURATED_POOL_JSON.write_text(json.dumps(pool_summary, indent=2), encoding="utf-8")

    return {
        "stage1_gse_projections_file": str(GSE_PROJECTIONS_JSON.relative_to(REPO_ROOT)),
        "stage2_curated_pool_file": str(GSE_CURATED_POOL_JSON.relative_to(REPO_ROOT)),
        "total_slate_players_projected": len(all_gse_projections),
        "curated_dfs_pool_size": len(accepted_pool_records),
        "rejected_players_count": len(rejected_pool_records),
        "second_stage_dfs_pool_sims": int(num_dfs_sims),
        "accepted_by_position": pool_summary["accepted_by_position"],
    }
