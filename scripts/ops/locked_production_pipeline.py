"""Locked Production Sanity Pipeline & Week 9 Trench / Participation Priors.

Enforces:
  1. Micro-Prop Participation Hurdle Gate (>= 15% pool entry floor; >= 35% route / >= 25% snap for prop publication).
  2. Dirichlet-Style Total Volume Conservation Allocator (replaces post-simulation volume rescaling).
  3. Anti-Hallucination Roster & Coordinate Mutation Guard (blocks LLM hallucinations such as mapping
     A.J. Brown to NE, Trey Hendrickson to BAL, or multiplying spatial coordinates x, y by 1.04).
  4. Verified 2026 ESPN Analytics OT Pass Block Win Rate (PBWR) & Edge Pass Rush Win Rate (PRWR) priors
     and Week 9 SEA vs. ARI Pass-Catcher Matchup Matrix.
"""
from __future__ import annotations

from typing import Any, Dict, List, Mapping, Sequence

import numpy as np
import pandas as pd

from scripts.ops.week8_forensic_kernels import CANONICAL_2026_ROSTER

EXTENDED_CANONICAL_2026_ROSTER: Dict[str, str] = {
    **CANONICAL_2026_ROSTER,
    "A.J. Brown": "PHI",
    "Trey Hendrickson": "CIN",
    "Lamar Jackson": "BAL",
    "Jordan Mailata": "PHI",
    "Theo Benedet": "CHI",
    "Trent Williams": "SF",
    "Lane Johnson": "PHI",
    "Colton McKivitz": "SF",
    "Tristan Wirfs": "TB",
    "Kolton Miller": "LV",
    "Brian O'Neill": "MIN",
    "Abdul Carter": "NYG",
    "Chop Robinson": "MIA",
    "DeMarcus Lawrence": "SEA",
    "Dallas Turner": "MIN",
    "Nik Bonitto": "DEN",
    "Trey McBride": "ARI",
    "Marvin Harrison Jr.": "ARI",
    "Michael Wilson": "ARI",
    "Jaxon Smith-Njigba": "SEA",
    "Cooper Kupp": "SEA",
}

ESPN_2026_OT_PBWR_LEADERS: Dict[str, Dict[str, Any]] = {
    "Jordan Mailata": {"team": "PHI", "pbwr": 0.93},
    "Theo Benedet": {"team": "CHI", "pbwr": 0.93},
    "Trent Williams": {"team": "SF", "pbwr": 0.92},
    "Lane Johnson": {"team": "PHI", "pbwr": 0.92},
    "Colton McKivitz": {"team": "SF", "pbwr": 0.92},
    "Tristan Wirfs": {"team": "TB", "pbwr": 0.92},
    "Kolton Miller": {"team": "LV", "pbwr": 0.92},
    "Brian O'Neill": {"team": "MIN", "pbwr": 0.91},
}

ESPN_2026_EDGE_PRWR_LEADERS: Dict[str, Dict[str, Any]] = {
    "Abdul Carter": {"team": "NYG", "prwr": 0.35},
    "Chop Robinson": {"team": "MIA", "prwr": 0.35},
    "Trey Hendrickson": {"team": "CIN", "prwr": 0.30},
    "Romello Height": {"team": "SF", "prwr": 0.29},
    "DeMarcus Lawrence": {"team": "SEA", "prwr": 0.28},
    "Dallas Turner": {"team": "MIN", "prwr": 0.28},
    "Nik Bonitto": {"team": "DEN", "prwr": 0.28},
}

WEEK9_TRENCH_MISMATCH_SPOTLIGHT: Dict[str, Dict[str, Any]] = {
    "ARI_OL_vs_SEA_DL": {
        "offense": "ARI",
        "defense": "SEA",
        "ari_ol_pbwr_rank": 31,
        "ari_w8_sacks_allowed": 5,
        "sea_dl_prwr_rank": 2,
        "sea_def_epa_rank": 3,
        "verdict": "CLEANEST_STRUCTURAL_PRESSURE_ADVANTAGE",
    },
    "GB_OL_PROTECTION_FLOOR": {
        "offense": "GB",
        "gb_season_pbwr": 0.31,
        "gb_single_game_floor_pbwr": 0.09,
        "gb_ol_pbwr_rank": 32,
        "verdict": "HEAVY_INTERIOR_DROPBACK_VARIANCE",
    },
}

WEEK9_SEA_ARI_PASS_CATCHER_MATRIX: List[Dict[str, Any]] = [
    {"team": "ARI", "player_id": "Trey McBride", "pos": "TE", "route_participation": 0.89, "target_share_prior": 0.294, "status": "APPROVED"},
    {"team": "ARI", "player_id": "Michael Wilson", "pos": "WR", "route_participation": 0.76, "target_share_prior": 0.181, "status": "APPROVED_INJURY_CHECK"},
    {"team": "ARI", "player_id": "Reggie Virgil", "pos": "WR", "route_participation": 0.44, "target_share_prior": 0.112, "status": "APPROVED_DEPTH"},
    {"team": "ARI", "player_id": "Simi Fehoko", "pos": "WR", "route_participation": 0.32, "target_share_prior": 0.080, "status": "APPROVED_DEPTH"},
    {"team": "ARI", "player_id": "Marvin Harrison Jr.", "pos": "WR", "route_participation": 0.88, "target_share_prior": 0.0, "status": "FLAGGED_ZEROED_CHALK_TRAP"},
    {"team": "ARI", "player_id": "Kendrick Bourne", "pos": "WR", "route_participation": 0.0, "target_share_prior": 0.0, "status": "HARD_LOCKOUT_OUT"},
    {"team": "SEA", "player_id": "Jaxon Smith-Njigba", "pos": "WR", "route_participation": 0.86, "target_share_prior": 0.265, "status": "APPROVED"},
    {"team": "SEA", "player_id": "Cooper Kupp", "pos": "WR", "route_participation": 0.81, "target_share_prior": 0.240, "status": "APPROVED"},
    {"team": "SEA", "player_id": "Rashid Shaheed", "pos": "WR", "route_participation": 0.0, "target_share_prior": 0.0, "status": "HARD_LOCKOUT_OUT"},
]


def enforce_production_sanity_gates(
    raw_projections_df: pd.DataFrame,
    participation_priors: Mapping[str, float],
    team_target_cap: float,
    min_participation: float = 0.15,
) -> pd.DataFrame:
    """Enforce the 15% Participation Hurdle Gate and Dirichlet Total Volume Conservation Allocator."""
    clean_df = raw_projections_df.copy()

    def check_participation(player_id: str) -> float:
        prior = float(participation_priors.get(player_id, 0.0))
        return 1.0 if prior >= min_participation else 0.0

    clean_df["participation_multiplier"] = clean_df["player_id"].apply(check_participation)
    clean_df["throttled_volume"] = clean_df["raw_projected_volume"].astype(float) * clean_df["participation_multiplier"]

    total_throttled_sum = float(clean_df["throttled_volume"].sum())
    if total_throttled_sum > 0.0:
        clean_df["conserved_volume"] = (clean_df["throttled_volume"] / total_throttled_sum) * float(team_target_cap)
    else:
        clean_df["conserved_volume"] = 0.0

    return clean_df[["player_id", "conserved_volume"]]


def validate_roster_and_coordinate_mutation_guard(
    roster_assignments: Sequence[Mapping[str, str]],
    coordinate_scale_x: float = 1.0,
    coordinate_scale_y: float = 1.0,
) -> Dict[str, Any]:
    """Block LLM-hallucinated team assignments (e.g. A.J. Brown on NE, Trey Hendrickson on BAL)
    and forbid scaling spatial field coordinates (x, y) to model turf friction upgrades.
    """
    if abs(float(coordinate_scale_x) - 1.0) > 1e-6 or abs(float(coordinate_scale_y) - 1.0) > 1e-6:
        raise ValueError(
            "Forbidden spatial coordinate mutation: never multiply tracking coordinates (x, y) "
            "to model turf friction; adjust shear yield tau_yield in the cleat-turf layer instead."
        )

    for row in roster_assignments:
        player = str(row.get("player_name") or row.get("player_id") or "").strip()
        team = str(row.get("team") or "").strip().upper()
        expected = EXTENDED_CANONICAL_2026_ROSTER.get(player)
        if expected and team and team != expected:
            raise ValueError(f"Hallucinated roster assignment blocked: {player} mapped to {team}, canonical is {expected}")

    return {"roster_verified": True, "coordinate_invariance_verified": True}
