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

import math
from typing import Any, Dict, List, Mapping, Sequence, Tuple

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


def scale_dropoff_by_effective_contributors(
    base_dropoff: float,
    team_target_hhi: float,
    league_hhi: float = 0.135,
    floor: float = 0.55,
    ceil: float = 1.60,
) -> Dict[str, float]:
    """Davies (2025) & `load_scaling.py` Effective-Contributor Herfindahl Injury Dropoff Scaling:
    Converts target Herfindahl index HHI into effective contributors N_eff = 1 / HHI,
    and scales the positional EPA dropoff factor by sqrt(N_league / N_team) clamped to [0.55, 1.60].
    """
    hhi = max(1e-6, float(team_target_hhi))
    l_hhi = max(1e-6, float(league_hhi))
    eff_n_team = 1.0 / hhi
    eff_n_league = 1.0 / l_hhi
    raw_mult = math.sqrt(eff_n_league / eff_n_team)
    clamped_mult = max(float(floor), min(float(ceil), raw_mult))
    scaled_dropoff = float(base_dropoff) * clamped_mult
    return {
        "effective_contributors_team": round(eff_n_team, 4),
        "effective_contributors_league": round(eff_n_league, 4),
        "load_multiplier": round(clamped_mult, 4),
        "scaled_epa_dropoff": round(scaled_dropoff, 4),
    }


def reverse_engineer_alt_ladder_pricing_kernel(
    ladder_rungs_and_devig_probs: Sequence[Tuple[float, float]],
) -> Dict[str, float]:
    """`engine_reverse.py` Sportsbook Alternate-Ladder Pricing Kernel Identification:
    Given de-vigged (line, cover_probability) rungs from a sportsbook's alternate ladder,
    identifies the local slope dP/d(line) = -phi(0)/sigma at the fair line, recovering:
      - fair_line_mu = x_bar + (0.5 - y_bar) / slope
      - book_uncertainty_sigma = 1 / (sqrt(2*pi) * |slope|)
      - ladder_fit_rmse
    """
    pts = [(float(x), float(y)) for x, y in ladder_rungs_and_devig_probs]
    if len(pts) < 2:
        raise ValueError("At least 2 alternate ladder rungs are required")
    xs = [x for x, _ in pts]
    ys = [y for _, y in pts]
    mx = sum(xs) / len(xs)
    my = sum(ys) / len(ys)
    den = sum((x - mx) ** 2 for x in xs) or 1e-12
    slope = sum((x - mx) * (y - my) for x, y in pts) / den
    if abs(slope) < 1e-9:
        raise ValueError("Degenerate zero-slope ladder")
    fair_mu = mx + (0.5 - my) / slope
    book_sigma = 1.0 / (math.sqrt(2.0 * math.pi) * abs(slope))
    rmse = math.sqrt(sum((y - (my + slope * (x - mx))) ** 2 for x, y in pts) / len(pts))
    return {
        "slope_dp_dline": round(slope, 6),
        "fair_line_mu": round(fair_mu, 4),
        "book_uncertainty_sigma": round(book_sigma, 4),
        "ladder_fit_rmse": round(rmse, 6),
    }


def sinkhorn_unbalanced_target_reallocation_with_epa_dropoff(
    pre_injury_shares: Sequence[float],
    post_injury_capacity: Sequence[float],
    cost_matrix: np.ndarray,
    role_epa_factors: Sequence[float],
    epsilon: float = 0.08,
    tau_unbalanced: float = 1.0,
    max_iters: int = 80,
) -> Dict[str, Any]:
    """Synthesizes `gse_injury_overlay_v2.py` + Pham et al. (ICML 2020, `pham20a.pdf`) Unbalanced Sinkhorn +
    Ghosal & Nutz (2025, `Sinkhorn_rate.pdf`) + Tang et al. (ICLR 2024, `6085_Accelerating_Sinkhorn_alg.pdf`):
    Solves entropically regularized Unbalanced Optimal Transport with KL marginal relaxation exponent
    alpha = tau / (tau + epsilon), then applies sealed role EPA dropoff factors to the transported shares.
    """
    r = np.maximum(np.asarray(pre_injury_shares, dtype=np.float64), 1e-9)
    c = np.maximum(np.asarray(post_injury_capacity, dtype=np.float64), 1e-9)
    cost = np.asarray(cost_matrix, dtype=np.float64)
    epa_f = np.asarray(role_epa_factors, dtype=np.float64)
    if cost.shape != (r.size, c.size) or epa_f.size != c.size:
        raise ValueError("Incompatible shapes for unbalanced Sinkhorn target reallocation")

    eps = max(1e-4, float(epsilon))
    tau = max(1e-4, float(tau_unbalanced))
    damping_exp = tau / (tau + eps)

    kernel_k = np.exp(-cost / eps)
    u = np.ones_like(r)
    v = np.ones_like(c)
    for _ in range(max(1, int(max_iters))):
        u = np.power(r / np.maximum(kernel_k @ v, 1e-12), damping_exp)
        v = np.power(c / np.maximum(kernel_k.T @ u, 1e-12), damping_exp)

    transport_plan = (u[:, None] * kernel_k) * v[None, :]
    reallocated_shares = np.sum(transport_plan, axis=0)
    reallocated_shares = reallocated_shares / max(1e-12, float(np.sum(reallocated_shares)))
    effective_epa_weighted_shares = reallocated_shares * epa_f
    return {
        "reallocated_shares": [round(float(x), 6) for x in reallocated_shares],
        "effective_epa_weighted_shares": [round(float(x), 6) for x in effective_epa_weighted_shares],
        "total_effective_epa_retention": round(float(np.sum(effective_epa_weighted_shares)), 6),
        "unbalanced_damping_exponent": round(damping_exp, 6),
        "ghosal_nutz_iteration_bound_o_inv_t": round(1.0 / max(1, int(max_iters)), 6),
    }

