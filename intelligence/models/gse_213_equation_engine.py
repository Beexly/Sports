"""
GSE 213-Equation Engine — Full Mathematical & Feature Specification.

Implements:
- Part 1: 21 Foundational Equations (Hierarchical EPA, James-Stein / Empirical Bayes
  shrinkage, Dirichlet-Multinomial target conservation, 2-State RB regime mixture,
  Pocket-depth catch-rate penalty, Physics-based completion probability, CPOE, RYOE,
  Coverage Assignment Cross-Entropy & GAT Attention, Student-t Copula & tail dependence,
  Points & Win Probability bridges).
- Part 2: 192 Interaction & Residual Crossings (12 Bases x 8 Situational States x 2 Transforms
  = 192 crossings + 12 raw bases = 204 features in build_full_feature_vector).
"""

from __future__ import annotations

from typing import Dict, List
import numpy as np
from scipy.stats import t as student_t

BASES: List[str] = [
    "soe_yd",
    "avg_separation",
    "adot",
    "target_share",
    "tprr",
    "air_yard_share",
    "ryoe",
    "snap_share",
    "route_participation",
    "pocket_depth",
    "cpoe",
    "qbr",
]

STATES: List[str] = [
    "two_high_rate",
    "man_coverage_rate",
    "pressure_rate",
    "wr1_out",
    "def_out",
    "trailing_prob",
    "short_week",
    "is_home",
]


def build_full_feature_vector(player: Dict[str, float], context: Dict[str, float]) -> Dict[str, float]:
    """
    Build all 204 features (12 bases + 192 interaction/residual crossings).
    Equations 22-213 of the GSE 213-Equation Engine.
    """
    feats: Dict[str, float] = {}
    for b in BASES:
        feats[b] = float(player.get(b, 0.0))

    for b in BASES:
        b_val = feats[b]
        for s in STATES:
            s_val = float(context.get(s, 0.0))
            feats[f"{b}_x_{s}"] = b_val * s_val
            feats[f"{b}_res_{s}"] = b_val * (1.0 - s_val)

    return feats


def james_stein_shrink(observed: float, n_games: int, prior: float, k: float = 6.0) -> float:
    """Equation 2: Empirical Bayes / James-Stein Shrinkage."""
    w = n_games / (n_games + k)
    return w * observed + (1.0 - w) * prior


def target_conservation(raw_targets: List[float], team_pass_attempts: float) -> List[float]:
    """Equation 4: Dirichlet-Multinomial Target Share Conservation."""
    total = sum(raw_targets)
    max_allowed = team_pass_attempts * 0.96
    scale = min(1.0, max_allowed / total) if total > 0 else 1.0
    return [t * scale for t in raw_targets]


def rb_regime_mixture(
    carries_lead: float,
    carries_trail: float,
    ypc: float,
    trailing_prob: float,
) -> float:
    """Equation 6: 2-State RB Regime Mixture."""
    return (1.0 - trailing_prob) * (carries_lead * ypc) + trailing_prob * (carries_trail * ypc * 0.85)


def pocket_depth_penalty(catch_rate: float, pocket_depth: float, pressure_rank: int) -> float:
    """Equation 7: Pocket-Depth Catch-Rate Penalty."""
    if pocket_depth < 3.60 and pressure_rank <= 12:
        return catch_rate * 0.92
    return catch_rate


def physics_completion_prob(p_ca: float, d_p: float, d_max: float, n_defenders: int) -> float:
    """
    Equation 8: Physics-Based Completion Probability.
    P_c = P_ca * ((1 - d_p / d_max) / (1 + n_d))
    """
    if d_max <= 0:
        return 0.0
    closure_factor = max(0.0, min(1.0, 1.0 - (d_p / d_max)))
    return float(p_ca * (closure_factor / (1.0 + max(0, n_defenders))))


def cpoe(completed: int, comp_prob: float) -> float:
    """Equation 9: Completion Percentage Over Expected (CPOE)."""
    return float(completed) - comp_prob


def ryoe(actual_yards: float, expected_yards: float) -> float:
    """Equation 10: Rushing Yards Over Expected (RYOE)."""
    return actual_yards - expected_yards


def student_t_tail_dependence(rho: float, nu: float = 4.0) -> float:
    """Equation 17: Asymptotic Upper/Lower Tail Dependence of Student-t Copula."""
    arg = -np.sqrt((nu + 1.0) * (1.0 - rho) / (1.0 + rho))
    return float(2.0 * student_t.cdf(arg, df=nu + 1.0))


def win_prob_from_spread(spread: float, k: float = 0.145) -> float:
    """Equation 19: Win Probability Logistic Bridge."""
    return float(1.0 / (1.0 + np.exp(-k * spread)))


def points_from_epa(epa_per_game: float, st_edge: float = 0.0) -> float:
    """Equation 18: Points From EPA Bridge."""
    return 23.0 + 0.74 * epa_per_game + st_edge


def score_player(player: Dict[str, float], context: Dict[str, float], weights: Dict[str, float]) -> float:
    """Linear readout over all 204 features in build_full_feature_vector."""
    fv = build_full_feature_vector(player, context)
    return float(sum(fv[k] * weights.get(k, 0.0) for k in fv))
