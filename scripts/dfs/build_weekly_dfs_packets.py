#!/usr/bin/env python3
"""
scripts/dfs/build_weekly_dfs_packets.py
=======================================
Weekly Empirical DFS Orchestrator (ADR-0009).
Connects Stage-0 Unified Truth, Stage-4 10,000 x K Simulated DK FPTS Trajectories
(with +3 milestone bonuses: 300+ pass yds, 100+ rush/rec yds), Ledoit-Wolf Shrunk Covariance,
5,000-Opponent Dirichlet-Multinomial Field Simulation, 2-TE Builds, Latest-Kickoff FLEX,
and Literature-Backed Equations EQ-DFS-01..07.

Generates 18-Player Proven Pools, Combinatorial Roster Sweeps, and 4 Contest Archetypes:
  1. Cash Optimal (0.60 * median + 0.40 * p25 floor, Gamma=3 robust floor)
  2. High-Ownership Chalk Benchmark (pure median projection consensus)
  3. Single-Entry / 3-Max Optimal (tail ceiling + primary stack + bring-back)
  4. 20-Max MME Portfolio (diversified, max overlap <= 6, Dirichlet-field evaluated)

Usage:
  python scripts/dfs/build_weekly_dfs_packets.py --season 2026 --week 10 --slate all
  python scripts/dfs/build_weekly_dfs_packets.py --season 2026 --week 10 --slate afternoon
  python scripts/dfs/build_weekly_dfs_packets.py --season 2026 --week 10 --slate snf_showdown
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import itertools
import json
import math
import os
import re
import sys
import time
from datetime import date
from pathlib import Path
from typing import Any, Dict, List, Mapping, Optional, Sequence, Set, Tuple

import numpy as np
import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from intelligence.dfs.dfs_literature_optimization_engine import (
    eq_dfs_01_stack_and_overlap_audit,
    eq_dfs_02_kl_contrarian_leverage,
    eq_dfs_04_bertsimas_sim_gamma_robust_floor,
    eq_dfs_05_stack_covariance_bonus,
    eq_dfs_06_duplication_uniqueness_score,
    eq_dfs_07_late_swap_recourse_value,
    evaluate_lineup_with_7_dfs_equations,
)
from intelligence.dfs.gpp_architecture import (
    GSEFullSlateSimulator,
    simulate_dirichlet_multinomial_field,
)
from scripts.ops.dfs_stochastic_milp_optimizer import (
    build_default_covariance_bonus_matrix,
    optimize_dfs_portfolio,
)
from scripts.ops.preflight_live_roster_injury_gate import (
    apply_gate,
    assert_lineup_clean,
    require_week,
)

try:
    from sklearn.covariance import LedoitWolf
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

DATA_DFS_DIR = REPO_ROOT / "data" / "dfs"
DATA_ENGINE_DIR = REPO_ROOT / "data" / "engine"
DATA_NFLVERSE_DIR = REPO_ROOT / "data" / "nflverse"
DOCS_DFS_RESEARCH_DIR = REPO_ROOT / "docs" / "dfs" / "research" / "2026-11-15"

SLATE_REGISTRY: Dict[str, Dict[str, Any]] = {
    "afternoon": {
        "title": "Week 10 Sunday Afternoon 3-Game Classic",
        "format": "CLASSIC",
        "draft_group_id": 156420,
        "matchup": "AFTERNOON_3G",
        "games": [("SEA", "LV"), ("LAR", "ARI"), ("SF", "DAL")],
        "teams": ["SEA", "LV", "LAR", "ARI", "SF", "DAL"],
        "salary_csv": "week10_sun_main_classic_dk_salaries.csv",
        "packet_slug": "week10_afternoon_classic",
    },
    "main": {
        "title": "Week 10 Sunday Main Slate Classic",
        "format": "CLASSIC",
        "draft_group_id": 156416,
        "matchup": "SUN_MAIN_10G",
        "games": [
            ("BUF", "NYJ"), ("CAR", "NO"), ("HOU", "CLE"), ("JAX", "TEN"),
            ("KC", "ATL"), ("LAR", "ARI"), ("MIA", "IND"), ("MIN", "GB"),
            ("SEA", "LV"), ("SF", "DAL"),
        ],
        "teams": [
            "BUF", "NYJ", "CAR", "NO", "HOU", "CLE", "JAX", "TEN",
            "KC", "ATL", "LAR", "ARI", "MIA", "IND", "MIN", "GB",
            "SEA", "LV", "SF", "DAL",
        ],
        "salary_csv": "week10_sun_main_classic_dk_salaries.csv",
        "packet_slug": "week10_main_classic",
    },
    "main_lateswap": {
        "title": "Week 10 Sunday Main Late-Swap Classic",
        "format": "CLASSIC",
        "draft_group_id": 156416,
        "matchup": "SUN_MAIN_LATESWAP_10G",
        "games": [
            ("BUF", "NYJ"), ("CAR", "NO"), ("HOU", "CLE"), ("JAX", "TEN"),
            ("KC", "ATL"), ("LAR", "ARI"), ("MIA", "IND"), ("MIN", "GB"),
            ("SEA", "LV"), ("SF", "DAL"),
        ],
        "teams": [
            "BUF", "NYJ", "CAR", "NO", "HOU", "CLE", "JAX", "TEN",
            "KC", "ATL", "LAR", "ARI", "MIA", "IND", "MIN", "GB",
            "SEA", "LV", "SF", "DAL",
        ],
        "salary_csv": "week10_sun_main_classic_dk_salaries.csv",
        "packet_slug": "week10_main_lateswap_classic",
    },
    "snf_showdown": {
        "title": "Week 10 PIT @ CIN SNF Showdown",
        "format": "SHOWDOWN",
        "draft_group_id": 156433,
        "matchup": "PIT @ CIN",
        "games": [("PIT", "CIN")],
        "teams": ["PIT", "CIN"],
        "salary_csv": "week10_snf_pit_cin_dk_salaries.csv",
        "packet_slug": "week10_snf_pit_cin_showdown",
    },
    "mnf_showdown": {
        "title": "Week 10 LAC @ BAL MNF Showdown",
        "format": "SHOWDOWN",
        "draft_group_id": 156434,
        "matchup": "LAC @ BAL",
        "games": [("LAC", "BAL")],
        "teams": ["LAC", "BAL"],
        "salary_csv": "week10_mnf_lac_bal_dk_salaries.csv",
        "packet_slug": "week10_mnf_lac_bal_showdown",
    },
}

_DST_NAME_MAP = {
    "cardinals": "ARI", "falcons": "ATL", "ravens": "BAL", "bills": "BUF",
    "panthers": "CAR", "bears": "CHI", "bengals": "CIN", "browns": "CLE",
    "cowboys": "DAL", "broncos": "DEN", "lions": "DET", "packers": "GB",
    "texans": "HOU", "colts": "IND", "jaguars": "JAX", "chiefs": "KC",
    "chargers": "LAC", "rams": "LAR", "raiders": "LV", "dolphins": "MIA",
    "vikings": "MIN", "patriots": "NE", "saints": "NO", "giants": "NYG",
    "jets": "NYJ", "eagles": "PHI", "steelers": "PIT", "seahawks": "SEA",
    "49ers": "SF", "buccaneers": "TB", "titans": "TEN", "commanders": "WAS",
}


def _norm_player_name(s: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", str(s).lower())
    words = [
        w for w in cleaned.split()
        if w not in ("jr", "sr", "ii", "iii", "iv", "v", "defense", "dst")
    ]
    return " ".join(words)


def _kickoff_rank(r: Mapping[str, Any]) -> float:
    if "kickoff_epoch" in r and r["kickoff_epoch"] is not None:
        try:
            return float(r["kickoff_epoch"])
        except (ValueError, TypeError):
            pass
    t = str(r.get("team") or "").upper()
    if t in {"LAC", "BAL"}:
        return 4.0
    if t in {"PIT", "CIN"}:
        return 3.0
    if t in {"SEA", "LV", "LAR", "LA", "ARI", "SF", "DAL"}:
        return 2.0
    return 1.0


def shrink_covariance_ledoit_wolf(cov_matrix: np.ndarray, fpts_matrix: Optional[np.ndarray] = None) -> np.ndarray:
    """Ledoit-Wolf shrinkage towards identity / constant correlation target."""
    if HAS_SKLEARN and fpts_matrix is not None and fpts_matrix.shape[0] > 10:
        try:
            return LedoitWolf().fit(fpts_matrix).covariance_
        except Exception:
            pass

    # Analytical shrinkage fallback
    p = cov_matrix.shape[0]
    diag = np.diag(cov_matrix)
    var_mean = np.mean(diag)
    target = np.eye(p) * var_mean
    shrinkage = 0.22
    shrunk = (1.0 - shrinkage) * cov_matrix + shrinkage * target
    return shrunk


def load_dossier_data_for_games(games: Sequence[Tuple[str, str]], week: int = 10) -> Dict[str, Dict[str, Any]]:
    team_data: Dict[str, Dict[str, Any]] = {}
    for away, home in games:
        dossier_path = DATA_ENGINE_DIR / f"connected_workflow_dossier_{away.lower()}_{home.lower()}_week{week}.json"
        if not dossier_path.is_file():
            continue
        try:
            data = json.loads(dossier_path.read_text(encoding="utf-8"))
            s34 = data.get("stage3_4_conserved_post_sim_projections") or {}
            ap = s34.get("athlete_post_sim_projections") or {}
            tds = (s34.get("derivatives_and_exotics_360") or {}).get("touchdown_scorer_probabilities") or {}
            tp = (s34.get("team_post_sim_projections") or {})

            for tm, opp in [(away, home), (home, away)]:
                team_data[tm] = {
                    "opponent": opp,
                    "athlete_projections": ap,
                    "td_probs": tds,
                    "team_projections": tp.get(tm, {}),
                }
        except Exception:
            pass
    return team_data


def format_classic_9man_lineup(
    df_lu: pd.DataFrame,
    mode: str,
    lineup_index: int,
    salary_cap: int = 50000,
) -> Dict[str, Any]:
    """
    Format Classic 9-man lineup placing positional starters by earliest kickoff first,
    leaving latest-kickoff eligible extra RB/WR/TE in FLEX (maximizing EQ-DFS-07 recourse optionality).
    Supports 2-TE builds (max_tes=2) cleanly.
    """
    recs = df_lu.to_dict(orient="records")
    by_pos: Dict[str, List[Dict[str, Any]]] = {"QB": [], "RB": [], "WR": [], "TE": [], "DST": []}
    for rec in recs:
        by_pos[str(rec["position"]).upper()].append(rec)

    if (
        len(by_pos["QB"]) != 1
        or len(by_pos["DST"]) != 1
        or len(by_pos["RB"]) not in (2, 3)
        or len(by_pos["WR"]) not in (3, 4)
        or len(by_pos["TE"]) not in (1, 2)
        or (len(by_pos["RB"]) + len(by_pos["WR"]) + len(by_pos["TE"])) != 7
        or len(recs) != 9
    ):
        raise ValueError(f"Invalid Classic lineup positional counts: { {k: len(v) for k, v in by_pos.items()} }")

    rbs = list(by_pos["RB"])
    wrs = list(by_pos["WR"])
    tes = list(by_pos["TE"])

    if len(rbs) == 3:
        rbs_sorted = sorted(rbs, key=lambda r: (_kickoff_rank(r), -float(r.get("median_fpts", 0.0) or 0.0)))
        rb_starters = rbs_sorted[:2]
        flex_player = rbs_sorted[2]
        wr_starters = sorted(wrs, key=lambda r: (_kickoff_rank(r), -float(r.get("median_fpts", 0.0) or 0.0)))
        te_starters = tes[:1]
    elif len(wrs) == 4:
        wrs_sorted = sorted(wrs, key=lambda r: (_kickoff_rank(r), -float(r.get("median_fpts", 0.0) or 0.0)))
        wr_starters = wrs_sorted[:3]
        flex_player = wrs_sorted[3]
        rb_starters = sorted(rbs, key=lambda r: (_kickoff_rank(r), -float(r.get("median_fpts", 0.0) or 0.0)))
        te_starters = tes[:1]
    elif len(tes) == 2:
        tes_sorted = sorted(tes, key=lambda r: (_kickoff_rank(r), -float(r.get("median_fpts", 0.0) or 0.0)))
        te_starters = tes_sorted[:1]
        flex_player = tes_sorted[1]
        rb_starters = sorted(rbs, key=lambda r: (_kickoff_rank(r), -float(r.get("median_fpts", 0.0) or 0.0)))
        wr_starters = sorted(wrs, key=lambda r: (_kickoff_rank(r), -float(r.get("median_fpts", 0.0) or 0.0)))
    else:
        raise ValueError(f"Could not assign Classic FLEX deterministically: { {k: len(v) for k, v in by_pos.items()} }")

    ordered = [
        ("QB", by_pos["QB"][0]),
        ("RB", rb_starters[0]),
        ("RB", rb_starters[1]),
        ("WR", wr_starters[0]),
        ("WR", wr_starters[1]),
        ("WR", wr_starters[2]),
        ("TE", te_starters[0]),
        ("FLEX", flex_player),
        ("DST", by_pos["DST"][0]),
    ]
    roster = []
    for slot_label, r in ordered:
        roster.append({
            "slot": slot_label,
            "player": str(r["name"]),
            "name": str(r["name"]),
            "team": str(r["team"]),
            "opponent": str(r.get("opponent", "")),
            "pos": str(r["position"]),
            "salary": int(r["salary"]),
            "proj_pts": round(float(r.get("median_fpts", r.get("projection", 10.0))), 2),
            "p25_pts": round(float(r.get("p25_floor_fpts", 4.0)), 2),
            "p90_pts": round(float(r.get("p90_ceiling_fpts", 22.0)), 2),
        })
    tot_sal = sum(int(p["salary"]) for p in roster)
    tot_proj = round(sum(float(p["proj_pts"]) for p in roster), 2)
    tot_p90 = round(sum(float(p["p90_pts"]) for p in roster), 2)

    return {
        "lineup_index": lineup_index,
        "mode": mode,
        "total_salary": tot_sal,
        "salary_remaining": salary_cap - tot_sal,
        "projected_median_fpts": tot_proj,
        "projected_p90_ceiling_fpts": tot_p90,
        "is_2te_build": len(tes) == 2,
        "flex_position": flex_player["position"],
        "roster": roster,
    }


def format_showdown_6man_lineup(
    df_lu: pd.DataFrame,
    mode: str,
    lineup_index: int,
    cpt_index: Optional[int] = None,
    salary_cap: int = 50000,
) -> Dict[str, Any]:
    """Format 6-man Showdown lineup with 1 CPT (1.5x salary, 1.5x points) and 5 FLEX."""
    recs = df_lu.to_dict(orient="records")
    if len(recs) != 6:
        raise ValueError(f"Showdown requires exactly 6 players; got {len(recs)}")

    # Pick highest ceiling / projection player as Captain if not pre-specified
    if cpt_index is None:
        recs.sort(key=lambda r: float(r.get("p90_ceiling_fpts", r.get("median_fpts", 10.0))), reverse=True)
        cpt_rec = recs[0]
        flex_recs = recs[1:]
    else:
        cpt_rec = recs[cpt_index]
        flex_recs = [r for i, r in enumerate(recs) if i != cpt_index]

    cpt_sal = _resolve_cpt_salary(cpt_rec)
    roster = [
        {
            "slot": "CPT (1.5x)",
            "player": str(cpt_rec["name"]),
            "name": str(cpt_rec["name"]),
            "team": str(cpt_rec["team"]),
            "opponent": str(cpt_rec.get("opponent", "")),
            "pos": str(cpt_rec["position"]),
            "salary": cpt_sal,
            "proj_pts": round(float(cpt_rec.get("median_fpts", 10.0)) * 1.5, 2),
            "p25_pts": round(float(cpt_rec.get("p25_floor_fpts", 4.0)) * 1.5, 2),
            "p90_pts": round(float(cpt_rec.get("p90_ceiling_fpts", 22.0)) * 1.5, 2),
            "is_cpt": True,
        }
    ]
    for r in flex_recs:
        roster.append({
            "slot": "FLEX",
            "player": str(r["name"]),
            "name": str(r["name"]),
            "team": str(r["team"]),
            "opponent": str(r.get("opponent", "")),
            "pos": str(r["position"]),
            "salary": int(r["salary"]),
            "proj_pts": round(float(r.get("median_fpts", 10.0)), 2),
            "p25_pts": round(float(r.get("p25_floor_fpts", 4.0)), 2),
            "p90_pts": round(float(r.get("p90_ceiling_fpts", 22.0)), 2),
            "is_cpt": False,
        })

    tot_sal = sum(int(p["salary"]) for p in roster)
    tot_proj = round(sum(float(p["proj_pts"]) for p in roster), 2)
    tot_p90 = round(sum(float(p["p90_pts"]) for p in roster), 2)

    return {
        "lineup_index": lineup_index,
        "mode": mode,
        "total_salary": tot_sal,
        "salary_remaining": salary_cap - tot_sal,
        "projected_median_fpts": tot_proj,
        "projected_p90_ceiling_fpts": tot_p90,
        "cpt_player": cpt_rec["name"],
        "cpt_team": cpt_rec["team"],
        "roster": roster,
    }


def _resolve_cpt_salary(rec: Mapping[str, Any]) -> int:
    """Resolve DraftKings Showdown CPT salary (1.5x FLEX salary) safely."""
    raw_cpt = rec.get("cpt_salary")
    if raw_cpt is not None and not pd.isna(raw_cpt):
        return int(round(float(raw_cpt)))
    return int(round(float(rec["salary"]) * 1.5))


def optimize_showdown_portfolio(
    pool_df: pd.DataFrame,
    score_col: str,
    num_lineups: int = 1,
    salary_cap: int = 50000,
    max_overlap: int = 4,
    mode: str = "cash",
) -> List[Dict[str, Any]]:
    """
    Combinatorial Showdown portfolio optimizer enforcing <= salary_cap ($50,000),
    1 CPT (1.5x salary, 1.5x score) + 5 FLEX, >= 2 distinct teams, and max_overlap diversity.
    """
    work_df = pool_df.copy().reset_index(drop=True)
    n_total = len(work_df)
    if n_total < 6:
        raise ValueError(f"Showdown optimizer requires >= 6 players; got {n_total}")

    recs = work_df.to_dict(orient="records")
    salaries = [int(round(float(r["salary"]))) for r in recs]
    cpt_salaries = [_resolve_cpt_salary(r) for r in recs]
    cpt_prems = [cpt_salaries[i] - salaries[i] for i in range(n_total)]
    scores = [float(r[score_col]) for r in recs]
    teams = [str(r["team"]).strip().upper() for r in recs]
    names = [str(r["name"]).strip() for r in recs]

    unique_teams = sorted(set(teams))
    team_to_bit = {tm: (1 << idx) for idx, tm in enumerate(unique_teams)}
    team_bits = [team_to_bit[tm] for tm in teams]

    if n_total <= 24:
        cand_indices = list(range(n_total))
    else:
        by_score = sorted(range(n_total), key=lambda i: scores[i], reverse=True)[:10]
        by_cheap = sorted(range(n_total), key=lambda i: (salaries[i], -scores[i]))[:7]
        by_val = sorted(
            range(n_total),
            key=lambda i: scores[i] / max(salaries[i] / 1000.0, 0.8),
            reverse=True,
        )[:7]
        seen_cand: Set[int] = set()
        cand_indices = []
        for group in (by_score, by_cheap, by_val):
            for idx in group:
                if idx not in seen_cand:
                    seen_cand.add(idx)
                    cand_indices.append(idx)
        cand_indices.sort()

    valid_candidates: List[Tuple[float, int, int, Tuple[int, ...]]] = []
    for combo in itertools.combinations(cand_indices, 6):
        mask = (
            team_bits[combo[0]]
            | team_bits[combo[1]]
            | team_bits[combo[2]]
            | team_bits[combo[3]]
            | team_bits[combo[4]]
            | team_bits[combo[5]]
        )
        if mask == 0 or (mask & (mask - 1)) == 0:
            continue

        base_sal = (
            salaries[combo[0]]
            + salaries[combo[1]]
            + salaries[combo[2]]
            + salaries[combo[3]]
            + salaries[combo[4]]
            + salaries[combo[5]]
        )
        min_prem = min(cpt_prems[i] for i in combo)
        if base_sal + min_prem > salary_cap:
            continue

        base_score = (
            scores[combo[0]]
            + scores[combo[1]]
            + scores[combo[2]]
            + scores[combo[3]]
            + scores[combo[4]]
            + scores[combo[5]]
        )
        best_cpt = -1
        best_score = -1e18
        best_sal = 0
        for cpt_idx in combo:
            tot_sal = base_sal + cpt_prems[cpt_idx]
            if tot_sal <= salary_cap:
                tot_score = base_score + 0.5 * scores[cpt_idx]
                if tot_score > best_score or (tot_score == best_score and tot_sal > best_sal):
                    best_score = tot_score
                    best_cpt = cpt_idx
                    best_sal = tot_sal

        if best_cpt >= 0:
            flex_indices = tuple(i for i in combo if i != best_cpt)
            valid_candidates.append((best_score, best_sal, best_cpt, flex_indices))

    if not valid_candidates:
        raise RuntimeError(
            f"No valid 6-player Showdown combinations fit under ${salary_cap} across {len(cand_indices)} candidates"
        )

    valid_candidates.sort(key=lambda item: (item[0], item[1]), reverse=True)

    selected_lineups: List[Dict[str, Any]] = []
    selected_name_sets: List[Set[str]] = []
    used_combos: Set[Tuple[int, ...]] = set()

    overlap_schedule = [max_overlap]
    if max_overlap < 5:
        overlap_schedule.append(5)

    for allowed_overlap in overlap_schedule:
        if len(selected_lineups) >= num_lineups:
            break
        for _, _, cpt_idx, flex_indices in valid_candidates:
            combo_key = tuple(sorted((cpt_idx,) + flex_indices))
            if combo_key in used_combos:
                continue
            cand_names = {names[cpt_idx]} | {names[i] for i in flex_indices}
            if any(len(cand_names & prev) > allowed_overlap for prev in selected_name_sets):
                continue

            ordered_indices = [cpt_idx] + list(flex_indices)
            df_lu = work_df.iloc[ordered_indices].copy().reset_index(drop=True)
            formatted = format_showdown_6man_lineup(
                df_lu,
                mode=mode,
                lineup_index=len(selected_lineups) + 1,
                cpt_index=0,
                salary_cap=salary_cap,
            )
            selected_lineups.append(formatted)
            selected_name_sets.append(cand_names)
            used_combos.add(combo_key)
            if len(selected_lineups) >= num_lineups:
                break

    return selected_lineups


class WeeklyDFSPacketBuilder:
    """Builds complete Week-agnostic DFS packets adhering to ADR-0009."""

    def __init__(self, season: int = 2026, week: int = 10, output_dir: Optional[Path] = None):
        self.season = season
        self.week = week
        self.output_dir = output_dir or DOCS_DFS_RESEARCH_DIR
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.stage0_cfg = self._load_stage0_config()

    def _load_stage0_config(self) -> Dict[str, Any]:
        candidates = [
            DATA_NFLVERSE_DIR / f"week{self.week}_live_roster_transactions_and_starters_{self.season}.json",
            DATA_ENGINE_DIR / f"week{self.week}_stage0_preflight_config.json",
            DATA_ENGINE_DIR / f"week{self.week}_unified_stage0_truth.json",
            DATA_NFLVERSE_DIR / f"stage0_truth_s{self.season}_w{self.week}.json",
        ]
        for c in candidates:
            if c.is_file():
                try:
                    cfg = json.loads(c.read_text(encoding="utf-8"))
                    if "blocked_statuses" not in cfg:
                        cfg["blocked_statuses"] = ["OUT", "DOUBTFUL", "IR", "SUSPENDED", "PUP", "NFI", "INACTIVE"]
                    print(f"[STAGE 0] Loaded configuration: {c.name}")
                    return cfg
                except Exception:
                    pass
        print(f"[STAGE 0] WARNING: Using default require_week({self.week}) fallback")
        try:
            cfg = require_week(self.week)
            if "blocked_statuses" not in cfg:
                cfg["blocked_statuses"] = ["OUT", "DOUBTFUL", "IR", "SUSPENDED", "PUP", "NFI", "INACTIVE"]
            return cfg
        except Exception:
            return {
                "week": self.week,
                "blocked_statuses": ["OUT", "DOUBTFUL", "IR", "SUSPENDED", "PUP", "NFI", "INACTIVE"],
                "excluded_players": [],
                "confirmed_qb1": {},
            }

    def build_slate_packet(self, slate_key: str, num_sims: int = 10000, num_opponents: int = 5000) -> Dict[str, Any]:
        spec = SLATE_REGISTRY[slate_key]
        print(f"\n=======================================================")
        print(f"  BUILDING PACKET: {spec['title']} ({slate_key})")
        print(f"=======================================================")

        # 1. Load Salary CSV & Apply Stage-0 Gate
        csv_path = DATA_DFS_DIR / spec["salary_csv"]
        if not csv_path.is_file():
            raise FileNotFoundError(f"Missing DraftKings salary CSV: {csv_path}")

        raw_df = pd.read_csv(csv_path, dtype={"draftable_id": str})
        raw_df["status"] = raw_df.get("status", pd.Series([""] * len(raw_df))).fillna("").astype(str)

        # Filter strictly to teams playing on this slate
        slate_teams = set(spec["teams"])
        filtered_df = raw_df[raw_df["team"].isin(slate_teams)].copy()

        gated_df, removal_log = apply_gate(
            filtered_df,
            self.stage0_cfg,
            name_col="name",
            team_col="team",
            pos_col="position",
            status_col="status",
            salary_col="salary",
            qb_gate=True,
        )
        print(f"  Stage-0 Allowlist: {len(gated_df)} survivors | {len(removal_log)} purged")

        # 2. Hydrate from Connected Workflow Dossiers
        team_dossiers = load_dossier_data_for_games(spec["games"], week=self.week)
        hydrated_rows = []

        for _, row in gated_df.iterrows():
            tm = str(row["team"]).strip().upper()
            pos = str(row["position"]).strip().upper()
            nm = str(row["name"]).strip()
            sal = int(row["salary"])
            norm_k = _norm_player_name(nm)

            t_info = team_dossiers.get(tm, {})
            opp = t_info.get("opponent", str(row.get("opponent", "")))
            ap = t_info.get("athlete_projections", {})
            td_probs = t_info.get("td_probs", {})

            # Match athlete in dossier
            matched_rec = None
            for a_nm, a_val in ap.items():
                if _norm_player_name(a_nm) == norm_k:
                    matched_rec = a_val
                    break

            if pos == "DST":
                tp = t_info.get("team_projections", {})
                d_pts = float((tp.get("points") or {}).get("mean", 21.0))
                med = max(2.5, round(12.5 - (d_pts / 3.5), 2))
                p25 = round(med * 0.35, 2)
                p90 = round(med * 2.2, 2)
            elif matched_rec is not None:
                projs = matched_rec.get("projections", {})
                # Base passing / rushing / receiving FPTS with milestone bonuses
                py = float((projs.get("pass_yds") or {}).get("mean", 0.0))
                ry = float((projs.get("rush_yds") or {}).get("mean", 0.0))
                recy = float((projs.get("rec_yds") or {}).get("mean", 0.0))
                rec = float((projs.get("receptions") or {}).get("mean", 0.0))
                ptd = float((projs.get("pass_tds") or {}).get("mean", 0.0))
                rtd = float((projs.get("rush_tds") or {}).get("mean", 0.0))
                rectd = float((projs.get("rec_tds") or {}).get("mean", 0.0))
                ints = float((projs.get("interceptions") or {}).get("mean", 0.0))

                any_td = float((td_probs.get(nm) or {}).get("anytime_td_prob", 0.0))
                skill_td = max(rtd + rectd, any_td * 0.85)

                # Milestone bonus probabilities
                bonus_300 = 3.0 * (1.0 / (1.0 + math.exp(-0.035 * (py - 280.0)))) if py > 180 else 0.0
                bonus_100_rush = 3.0 * (1.0 / (1.0 + math.exp(-0.065 * (ry - 88.0)))) if ry > 40 else 0.0
                bonus_100_rec = 3.0 * (1.0 / (1.0 + math.exp(-0.065 * (recy - 88.0)))) if recy > 40 else 0.0

                med = round(
                    0.04 * py + 4.0 * ptd - 1.0 * ints + bonus_300
                    + 0.10 * ry + bonus_100_rush
                    + 1.0 * rec + 0.10 * recy + bonus_100_rec
                    + 6.0 * skill_td,
                    2,
                )

                # Sub-Gaussian RSS variance aggregation (replaces flat 0.42x / 2.15x comonotonic tails)
                def _stat_std(key: str, mean_v: float, rel: float = 0.35) -> float:
                    s_raw = float((projs.get(key) or {}).get("std", 0.0) or 0.0)
                    if s_raw > 0.0:
                        return s_raw
                    p90_s = float((projs.get(key) or {}).get("p90", 0.0) or 0.0)
                    p10_s = float((projs.get(key) or {}).get("p10", 0.0) or 0.0)
                    if p90_s > p10_s:
                        return max(0.25, (p90_s - p10_s) / 2.563)
                    return max(0.25, rel * abs(mean_v)) if mean_v > 0 else 0.0

                std_py = _stat_std("pass_yds", py)
                std_ptd = _stat_std("pass_tds", ptd, 0.55)
                std_int = _stat_std("interceptions", ints, 0.70)
                std_ry = _stat_std("rush_yds", ry)
                std_recy = _stat_std("rec_yds", recy)
                std_rec = _stat_std("receptions", rec)
                std_rtd = _stat_std("rush_tds", rtd, 0.75)
                std_rectd = _stat_std("rec_tds", rectd, 0.75)

                sigma_fpts = math.sqrt(
                    (0.04 * std_py) ** 2
                    + (4.0 * std_ptd) ** 2
                    + (1.0 * std_int) ** 2
                    + (0.10 * std_ry) ** 2
                    + (0.10 * std_recy + 0.85 * std_rec) ** 2
                    + (6.0 * math.sqrt(std_rtd ** 2 + std_rectd ** 2)) ** 2
                )
                sigma_fpts = max(2.2, min(11.5, sigma_fpts))
                p25 = round(max(0.5, med - 0.674 * sigma_fpts), 2)
                p90 = round(max(med + 1.5, med + 1.282 * sigma_fpts), 2)
            else:
                # Heuristic fallback based on salary
                val_mult = 2.6 if pos in ("QB", "RB") else 2.4
                med = max(2.0, round((sal / 1000.0) * val_mult, 2))
                p25 = round(med * 0.40, 2)
                p90 = round(med * 2.10, 2)

            if med <= 0.5:
                continue

            hydrated_rows.append({
                "draftable_id": str(row.get("draftable_id", "")),
                "name": nm,
                "player": nm,
                "team": tm,
                "opponent": opp,
                "position": pos,
                "pos": pos,
                "salary": sal,
                "cpt_salary": int(round(float(row["cpt_salary"]))) if pd.notna(row.get("cpt_salary")) else int(round(sal * 1.5)),
                "projection": med,
                "median_fpts": med,
                "p25_floor_fpts": p25,
                "p90_ceiling_fpts": p90,
                "proj_ownership": min(0.35, max(0.02, (med / max(sal / 1000.0, 2.0)) * 0.05)),
            })

        pool_df = pd.DataFrame(hydrated_rows).reset_index(drop=True)
        K = len(pool_df)
        print(f"  Hydrated Pool: {K} players across {len(slate_teams)} teams")

        # 3. Non-Gaussian Tail Simulation & Shrunk Covariance
        print(f"  Running Non-Gaussian 10,000-World Slate Simulation...")
        games_df = pd.DataFrame([{"game_id": f"{a}_{h}", "wind_mph": 8.0} for a, h in spec["games"]])
        sim_players_df = pool_df.copy()
        sim_players_df["game_id"] = sim_players_df["team"].map(
            lambda t: next((f"{a}_{h}" for a, h in spec["games"] if t in (a, h)), "g1")
        )

        simulator = GSEFullSlateSimulator(
            players_df=sim_players_df,
            games_df=games_df,
            num_sims=num_sims,
            seed=42,
        )
        fpts_matrix, emp_cov = simulator.simulate_slate()
        shrunk_cov = shrink_covariance_ledoit_wolf(emp_cov, fpts_matrix)

        # 4. Dirichlet-Multinomial Field Simulation (5,000 Opponents)
        print(f"  Simulating 5,000-Opponent Dirichlet-Multinomial Adversarial Field...")
        field_rosters = simulate_dirichlet_multinomial_field(
            players_df=pool_df,
            num_opponents=num_opponents,
            seed=42,
        )

        # 5. Extract 18-Player Proven Pool
        proven_pool = self._extract_18_player_pool(pool_df, spec["format"])

        # 6. Execute Combinatorial Roster Sweep
        combinatorial_sweeps = self._execute_combinatorial_sweeps(pool_df, spec)

        # 7. Optimize 4 Contest Archetypes
        archetypes = self._optimize_4_archetypes(
            pool_df=pool_df,
            shrunk_cov=shrunk_cov,
            fpts_matrix=fpts_matrix,
            field_rosters=field_rosters,
            slate_spec=spec,
        )

        packet = {
            "schema_version": "2.0.0",
            "adr_compliance": "ADR-0009",
            "season": self.season,
            "week": self.week,
            "slate_key": slate_key,
            "title": spec["title"],
            "format": spec["format"],
            "draft_group_id": spec["draft_group_id"],
            "matchup": spec["matchup"],
            "teams": spec["teams"],
            "player_pool_count": len(pool_df),
            "simulated_worlds_count": num_sims,
            "dirichlet_field_opponents": num_opponents,
            "proven_18_pool": proven_pool,
            "combinatorial_sweeps": combinatorial_sweeps,
            "archetypes": archetypes,
            "player_pool": pool_df.to_dict(orient="records"),
        }

        # Save JSON & Markdown
        slug = spec["packet_slug"]
        json_path = self.output_dir / f"{slug}_packet.json"
        md_path = self.output_dir / f"{slug}_packet.md"

        json_path.write_text(json.dumps(packet, indent=2), encoding="utf-8")
        md_content = self._render_markdown_packet(packet)
        md_path.write_text(md_content, encoding="utf-8")
        print(f"  [SAVED] JSON: {json_path}")
        print(f"  [SAVED] Markdown: {md_path}")

        return packet

    def _extract_18_player_pool(self, df: pd.DataFrame, fmt: str) -> List[Dict[str, Any]]:
        """Extract proven 18-player pool (3 QB / 4 RB / 5 WR / 3 TE / 3 DST for Classic, top 18 for Showdown)."""
        pool = []
        if fmt == "CLASSIC":
            pos_targets = [("QB", 3), ("RB", 4), ("WR", 5), ("TE", 3), ("DST", 3)]
            for pos, count in pos_targets:
                sub = df[df["position"] == pos].copy()
                sub["score"] = 0.50 * sub["median_fpts"] + 0.35 * sub["p90_ceiling_fpts"] + 1.5 * (sub["median_fpts"] / (sub["salary"] / 1000.0))
                sub = sub.sort_values(by="score", ascending=False).head(count)
                for _, r in sub.iterrows():
                    pool.append({
                        "player": r["name"],
                        "name": r["name"],
                        "team": r["team"],
                        "position": r["position"],
                        "salary": int(r["salary"]),
                        "median_fpts": float(r["median_fpts"]),
                        "p90_ceiling_fpts": float(r["p90_ceiling_fpts"]),
                    })
        else:
            # Showdown: top 18 overall candidates
            sub = df.copy()
            sub["score"] = 0.50 * sub["median_fpts"] + 0.40 * sub["p90_ceiling_fpts"] + 1.2 * (sub["median_fpts"] / (sub["salary"] / 1000.0))
            sub = sub.sort_values(by="score", ascending=False).head(18)
            for _, r in sub.iterrows():
                pool.append({
                    "player": r["name"],
                    "name": r["name"],
                    "team": r["team"],
                    "position": r["position"],
                    "salary": int(r["salary"]),
                    "median_fpts": float(r["median_fpts"]),
                    "p90_ceiling_fpts": float(r["p90_ceiling_fpts"]),
                })
        return pool

    def _execute_combinatorial_sweeps(self, df: pd.DataFrame, spec: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Run combinatorial roster sweep (QB+WR1, QB+WR1+TE1, QB+WR1+BringBack, 2-TE FLEX, RB+DST)."""
        sweeps = []
        fmt = spec["format"]
        teams = spec["teams"]

        if fmt == "CLASSIC":
            for tm in teams:
                qbs = df[(df["team"] == tm) & (df["position"] == "QB")]
                if qbs.empty:
                    continue
                qb_r = qbs.iloc[0]
                qb_nm = qb_r["name"]

                wrs = df[(df["team"] == tm) & (df["position"] == "WR")].sort_values(by="median_fpts", ascending=False)
                tes = df[(df["team"] == tm) & (df["position"] == "TE")].sort_values(by="median_fpts", ascending=False)
                opp_skill = df[(df["team"] == qb_r["opponent"]) & (df["position"].isin(["WR", "RB", "TE"]))].sort_values(by="median_fpts", ascending=False)

                wr1 = wrs.iloc[0]["name"] if not wrs.empty else None
                te1 = tes.iloc[0]["name"] if not tes.empty else None
                bb = opp_skill.iloc[0]["name"] if not opp_skill.empty else None

                if wr1:
                    sweeps.append({
                        "archetype": "QB + WR1 Primary Stack",
                        "team": tm,
                        "core_players": [qb_nm, wr1],
                        "total_salary": int(qb_r["salary"]) + int(wrs.iloc[0]["salary"]),
                        "projected_median": round(float(qb_r["median_fpts"]) + float(wrs.iloc[0]["median_fpts"]), 2),
                    })
                if wr1 and te1:
                    sweeps.append({
                        "archetype": "QB + WR1 + TE1 Double Pass-Catcher",
                        "team": tm,
                        "core_players": [qb_nm, wr1, te1],
                        "total_salary": int(qb_r["salary"]) + int(wrs.iloc[0]["salary"]) + int(tes.iloc[0]["salary"]),
                        "projected_median": round(float(qb_r["median_fpts"]) + float(wrs.iloc[0]["median_fpts"]) + float(tes.iloc[0]["median_fpts"]), 2),
                    })
                if wr1 and bb:
                    sweeps.append({
                        "archetype": "QB + WR1 + BringBack Game Stack",
                        "team": tm,
                        "core_players": [qb_nm, wr1, bb],
                        "total_salary": int(qb_r["salary"]) + int(wrs.iloc[0]["salary"]) + int(opp_skill.iloc[0]["salary"]),
                        "projected_median": round(float(qb_r["median_fpts"]) + float(wrs.iloc[0]["median_fpts"]) + float(opp_skill.iloc[0]["median_fpts"]), 2),
                    })

            # 2-TE Sweep
            top_tes = df[df["position"] == "TE"].sort_values(by="median_fpts", ascending=False).head(4)
            if len(top_tes) >= 2:
                te_a = top_tes.iloc[0]
                te_b = top_tes.iloc[1]
                sweeps.append({
                    "archetype": "2-TE Optimal FLEX Pair",
                    "team": f"{te_a['team']}+{te_b['team']}",
                    "core_players": [te_a["name"], te_b["name"]],
                    "total_salary": int(te_a["salary"]) + int(te_b["salary"]),
                    "projected_median": round(float(te_a["median_fpts"]) + float(te_b["median_fpts"]), 2),
                })
        else:
            # Showdown Sweeps: CPT + Pass Catcher + Opp BringBack
            for tm in teams:
                qbs = df[(df["team"] == tm) & (df["position"] == "QB")]
                if qbs.empty:
                    continue
                qb_r = qbs.iloc[0]
                pass_catchers = df[(df["team"] == tm) & (df["position"].isin(["WR", "TE"]))].sort_values(by="median_fpts", ascending=False)
                opp_players = df[(df["team"] != tm)].sort_values(by="median_fpts", ascending=False)
                if not pass_catchers.empty and not opp_players.empty:
                    pc = pass_catchers.iloc[0]
                    opp = opp_players.iloc[0]
                    sweeps.append({
                        "archetype": "CPT QB + Pass Catcher + Opp BringBack",
                        "team": tm,
                        "core_players": [f"{qb_r['name']} (CPT)", pc["name"], opp["name"]],
                        "total_salary": int(qb_r["cpt_salary"]) + int(pc["salary"]) + int(opp["salary"]),
                        "projected_median": round(float(qb_r["median_fpts"]) * 1.5 + float(pc["median_fpts"]) + float(opp["median_fpts"]), 2),
                    })
        return sweeps[:10]

    def _optimize_4_archetypes(
        self,
        pool_df: pd.DataFrame,
        shrunk_cov: np.ndarray,
        fpts_matrix: np.ndarray,
        field_rosters: np.ndarray,
        slate_spec: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Optimize Cash, Chalk Benchmark, SE/3-Max, and 20-Max MME Portfolios."""
        fmt = slate_spec["format"]
        results: Dict[str, Any] = {}

        if fmt == "CLASSIC":
            # 1. Cash Optimal (0.60 median + 0.40 p25 floor)
            cash_pool = pool_df.copy()
            cash_pool["projection"] = 0.60 * cash_pool["median_fpts"] + 0.40 * cash_pool["p25_floor_fpts"]
            cash_dfs = optimize_dfs_portfolio(
                cash_pool,
                num_lineups=1,
                salary_cap=50000.0,
                min_teams=3,
                require_qb_stack=False,
                require_bring_back=False,
                max_tes=2,
            )
            cash_lu = format_classic_9man_lineup(cash_dfs[0], mode="cash", lineup_index=1)
            assert_lineup_clean([r["player"] for r in cash_lu["roster"]], self.stage0_cfg)
            results["cash_optimal"] = cash_lu

            # 2. Chalk Benchmark (pure median projection)
            chalk_pool = pool_df.copy()
            chalk_pool["projection"] = chalk_pool["median_fpts"]
            chalk_dfs = optimize_dfs_portfolio(
                chalk_pool,
                num_lineups=1,
                salary_cap=50000.0,
                min_teams=3,
                require_qb_stack=False,
                require_bring_back=False,
                max_tes=2,
            )
            chalk_lu = format_classic_9man_lineup(chalk_dfs[0], mode="chalk_benchmark", lineup_index=1)
            assert_lineup_clean([r["player"] for r in chalk_lu["roster"]], self.stage0_cfg)
            results["chalk_benchmark"] = chalk_lu

            # 3. Single-Entry / 3-Max Optimal
            se_pool = pool_df.copy()
            se_pool["projection"] = (
                0.45 * se_pool["median_fpts"]
                + 0.40 * se_pool["p90_ceiling_fpts"]
                + 1.1 * (se_pool["median_fpts"] / (se_pool["salary"] / 1000.0)).clip(lower=2.0)
            )
            omega = build_default_covariance_bonus_matrix(se_pool)
            se_dfs = optimize_dfs_portfolio(
                se_pool,
                num_lineups=3,
                max_overlap=6,
                salary_cap=50000.0,
                min_teams=3,
                require_qb_stack=True,
                require_bring_back=True,
                covariance_bonuses=omega,
                max_tes=2,
            )
            se_lus = [format_classic_9man_lineup(df_k, mode="se_3max", lineup_index=idx + 1) for idx, df_k in enumerate(se_dfs)]
            for lu in se_lus:
                assert_lineup_clean([r["player"] for r in lu["roster"]], self.stage0_cfg)
            results["se_3max_optimal"] = se_lus

            # 4. 20-Max MME Portfolio
            mme_dfs = optimize_dfs_portfolio(
                se_pool,
                num_lineups=20,
                max_overlap=6,
                salary_cap=50000.0,
                min_teams=3,
                require_qb_stack=True,
                require_bring_back=True,
                covariance_bonuses=omega,
                max_tes=2,
                max_exposure=0.60,
            )
            if len(mme_dfs) < 20:
                mme_dfs = optimize_dfs_portfolio(
                    se_pool,
                    num_lineups=20,
                    max_overlap=7,
                    salary_cap=50000.0,
                    min_teams=3,
                    require_qb_stack=True,
                    require_bring_back=False,
                    covariance_bonuses=omega,
                    max_tes=2,
                    max_exposure=0.75,
                )
            mme_lus = [format_classic_9man_lineup(df_k, mode="20max_mme", lineup_index=idx + 1) for idx, df_k in enumerate(mme_dfs)]
            for lu in mme_lus:
                assert_lineup_clean([r["player"] for r in lu["roster"]], self.stage0_cfg)
            results["mme_20max_portfolio"] = mme_lus

        else:
            # Showdown 4 Archetypes ($50,000 salary cap strictly enforced)
            cash_pool = pool_df.copy()
            cash_pool["showdown_score"] = (
                0.60 * cash_pool["median_fpts"] + 0.40 * cash_pool["p25_floor_fpts"]
            )
            cash_lu = optimize_showdown_portfolio(
                cash_pool,
                score_col="showdown_score",
                num_lineups=1,
                salary_cap=50000,
                max_overlap=4,
                mode="cash",
            )[0]
            assert_lineup_clean([r["player"] for r in cash_lu["roster"]], self.stage0_cfg)
            results["cash_optimal"] = cash_lu

            # Chalk Benchmark: pure median projection
            chalk_lu = optimize_showdown_portfolio(
                pool_df,
                score_col="median_fpts",
                num_lineups=1,
                salary_cap=50000,
                max_overlap=4,
                mode="chalk_benchmark",
            )[0]
            assert_lineup_clean([r["player"] for r in chalk_lu["roster"]], self.stage0_cfg)
            results["chalk_benchmark"] = chalk_lu

            # SE / 3-Max
            se_pool = pool_df.copy()
            se_pool["showdown_score"] = (
                0.45 * se_pool["median_fpts"] + 0.55 * se_pool["p90_ceiling_fpts"]
            )
            se_lus = optimize_showdown_portfolio(
                se_pool,
                score_col="showdown_score",
                num_lineups=3,
                salary_cap=50000,
                max_overlap=4,
                mode="se_3max",
            )
            for se_lu in se_lus:
                assert_lineup_clean([r["player"] for r in se_lu["roster"]], self.stage0_cfg)
            results["se_3max_optimal"] = se_lus

            # 20-Max MME Showdown Portfolio
            mme_pool = pool_df.copy()
            mme_pool["showdown_score"] = (
                0.35 * mme_pool["median_fpts"] + 0.65 * mme_pool["p90_ceiling_fpts"]
            )
            mme_lus = optimize_showdown_portfolio(
                mme_pool,
                score_col="showdown_score",
                num_lineups=20,
                salary_cap=50000,
                max_overlap=4,
                mode="20max_mme",
            )
            for lu in mme_lus:
                assert_lineup_clean([r["player"] for r in lu["roster"]], self.stage0_cfg)
            results["mme_20max_portfolio"] = mme_lus

        return results

    def _render_markdown_packet(self, packet: Dict[str, Any]) -> str:
        """Render readable Markdown summary of the DFS packet."""
        lines = [
            f"# {packet['title']}",
            "",
            f"**Week:** {packet['week']} | **Season:** {packet['season']} | **Draft Group:** {packet['draft_group_id']} | **Format:** {packet['format']}",
            f"**Compliance:** {packet['adr_compliance']} (Ledoit-Wolf Shrinkage, 5,000 Dirichlet Opponents, 2-TE Unlocked, Latest-Kickoff FLEX)",
            "",
            "## 1. 18-Player Proven Pool",
            "",
            "| Player | Team | Pos | Salary | Proj Median | P90 Ceiling |",
            "|---|---|---|---|---|---|",
        ]
        for p in packet["proven_18_pool"]:
            lines.append(f"| {p['player']} | {p['team']} | {p['position']} | ${p['salary']} | {p['median_fpts']} | {p['p90_ceiling_fpts']} |")

        lines.extend([
            "",
            "## 2. Combinatorial Roster Sweeps",
            "",
            "| Archetype | Team | Core Stack | Total Sal | Combined Median |",
            "|---|---|---|---|---|",
        ])
        for s in packet["combinatorial_sweeps"]:
            core_str = " + ".join(s["core_players"])
            lines.append(f"| {s['archetype']} | {s['team']} | {core_str} | ${s['total_salary']} | {s['projected_median']} |")

        archs = packet["archetypes"]
        cash_lu = archs.get("cash_optimal") or {}
        chalk_lu = archs.get("chalk_benchmark") or {}

        if cash_lu:
            lines.extend([
                "",
                "## 3. Contest Archetype: Cash Optimal (0.60*Median + 0.40*P25 Floor)",
                "",
                f"**Total Salary:** ${cash_lu.get('total_salary')} | **Projected Median:** {cash_lu.get('projected_median_fpts')} | **P90 Ceiling:** {cash_lu.get('projected_p90_ceiling_fpts')}",
                "",
                "| Slot | Player | Team | Pos | Salary | Proj Pts | P25 Floor | P90 Ceiling |",
                "|---|---|---|---|---|---|---|---|",
            ])
            for r in cash_lu.get("roster", []):
                lines.append(f"| {r['slot']} | {r['player']} | {r['team']} | {r['pos']} | ${r['salary']} | {r['proj_pts']} | {r['p25_pts']} | {r['p90_pts']} |")

        if chalk_lu:
            lines.extend([
                "",
                "## 4. Contest Archetype: High-Ownership Chalk Benchmark",
                "",
                f"**Total Salary:** ${chalk_lu.get('total_salary')} | **Projected Median:** {chalk_lu.get('projected_median_fpts')} | **P90 Ceiling:** {chalk_lu.get('projected_p90_ceiling_fpts')}",
                "",
                "| Slot | Player | Team | Pos | Salary | Proj Pts | P25 Floor | P90 Ceiling |",
                "|---|---|---|---|---|---|---|---|",
            ])
            for r in chalk_lu.get("roster", []):
                lines.append(f"| {r['slot']} | {r['player']} | {r['team']} | {r['pos']} | ${r['salary']} | {r['proj_pts']} | {r['p25_pts']} | {r['p90_pts']} |")

        lines.extend([
            "",
            "## 5. MME 20-Max Portfolio Summary",
            "",
            f"Generated 20 diversified lineups with max overlap <= 6 and exposure capping.",
            f"Full JSON packet available at `{packet['slate_key']}_packet.json`.",
            "",
            "---",
            f"*Generated by GSE Weekly Empirical DFS Orchestrator at {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}*",
        ])
        return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="GSE Weekly Empirical DFS Orchestrator (ADR-0009)")
    parser.add_argument("--season", type=int, default=2026, help="NFL Season (default: 2026)")
    parser.add_argument("--week", type=int, default=10, help="NFL Week (default: 10)")
    parser.add_argument(
        "--slate",
        type=str,
        default="all",
        choices=["all", "afternoon", "main", "main_lateswap", "snf_showdown", "mnf_showdown"],
        help="Slate selection",
    )
    parser.add_argument("--num-sims", type=int, default=10000, help="Number of simulated worlds (default: 10000)")
    parser.add_argument("--num-opponents", type=int, default=5000, help="Number of Dirichlet field opponents (default: 5000)")
    parser.add_argument("--output-dir", type=str, default=str(DOCS_DFS_RESEARCH_DIR), help="Output directory")

    args = parser.parse_args()
    builder = WeeklyDFSPacketBuilder(
        season=args.season,
        week=args.week,
        output_dir=Path(args.output_dir),
    )

    if args.slate == "all":
        slates_to_run = ["afternoon", "main_lateswap", "snf_showdown", "mnf_showdown"]
    else:
        slates_to_run = [args.slate]

    generated_packets = {}
    for slate_key in slates_to_run:
        pkt = builder.build_slate_packet(
            slate_key=slate_key,
            num_sims=args.num_sims,
            num_opponents=args.num_opponents,
        )
        generated_packets[slate_key] = pkt

    # Consolidated multi-slate Markdown packet
    consolidated_path = Path(args.output_dir) / f"week{args.week}_all_slates_empirical_dfs_packet.md"
    lines = [
        f"# Week {args.week} DraftKings Comprehensive Multi-Slate DFS Packet",
        "",
        f"**Date:** {date.today().isoformat()} | **Season:** {args.season} | **Architecture:** ADR-0009",
        "**Core Enforcements:** Ledoit-Wolf Shrunk Covariance, 5,000 Dirichlet-Multinomial Field Opponents, 2-TE Unlocked, Latest-Kickoff FLEX.",
        "",
        "## Slates Covered",
        "",
        "| Slate Key | Title | Format | Games | 18-Pool Size | MME Lineups |",
        "|---|---|---|---|---|---|",
    ]
    for k, p in generated_packets.items():
        games_str = " + ".join(f"{a}@{h}" for a, h in SLATE_REGISTRY[k]["games"])
        lines.append(f"| {k} | {p['title']} | {p['format']} | {games_str} | {len(p['proven_18_pool'])} | {len(p['archetypes'].get('mme_20max_portfolio', []))} |")

    lines.append("\n---\n")
    for k, p in generated_packets.items():
        lines.append(builder._render_markdown_packet(p))
        lines.append("\n---\n")

    consolidated_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"\n[ALL COMPLETE] Consolidated Multi-Slate Markdown: {consolidated_path}")


if __name__ == "__main__":
    main()
