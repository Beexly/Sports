"""Ops mirror for `intelligence.coaching.trench_pocket_physics` plus Bayesian P2S & shock helpers."""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict, Sequence

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from intelligence.coaching.trench_pocket_physics import (  # noqa: E402
    PASS_RUSHER_STRAIN_VARYING_INTERCEPTS,
    analyze_qb_escape_vectors,
    compute_cox_weibull_pocket_survival,
    compute_fourth_down_uncertainty_gate,
    compute_ibrahim_voronoi_pocket_survival,
    compute_nguyen_yurko_matthews_strain_multilevel,
    compute_nikolaou_pelechrinis_team_collapse_pgm,
    compute_pipping_adjusted_ol_efficiency,
    compute_ruscio_pressure_win_probability,
    compute_sharp_pass_rush_protection_adjustment,
    compute_strain_rate,
    compute_weak_link_ol_efficiency,
    cox_weibull_block_survival,
    weak_link_am_gm_clean_pocket_prob,
)
from scripts.ops.gse_coach_mind_simulator import trench_survival_drop  # noqa: E402


def bayesian_shrink_p2s(
    observed_p2s: float,
    pressures: int,
    prior_p2s: float = 0.185,
    k_pressures: float = 35.0,
) -> float:
    """Empirical Bayes shrinkage for QB Pressure-to-Sack (P2S) stability."""
    n_p = max(0.0, float(pressures))
    w = n_p / (n_p + max(1.0, float(k_pressures)))
    shrunk = w * float(observed_p2s) + (1.0 - w) * float(prior_p2s)
    return float(max(0.05, min(0.45, shrunk)))


def apply_trench_pocket_shock(
    base_sack_prob: float,
    ol_grades: Sequence[float],
    dl_pass_rush_threat: float = 0.45,
    chip_help: float = 0.15,
    qb_p2s: float = 0.185,
) -> Dict[str, Any]:
    """Combine weak-link AM-GM pocket survival, Pipping help, and QB P2S into adjusted sack probability."""
    weak = compute_weak_link_ol_efficiency(list(ol_grades))
    pip = compute_pipping_adjusted_ol_efficiency(
        list(ol_grades),
        opponent_pass_rush=float(dl_pass_rush_threat),
        chip_help=float(chip_help),
    )
    am_gm_gap = max(0.0, float(weak["arithmetic_mean"]) - float(weak["efficiency"]))
    survival = float(pip["pipping_survival"])
    p2s_mult = float(qb_p2s) / 0.185
    shock_mult = (1.0 + 1.25 * am_gm_gap + 0.35 * (1.0 - survival)) * (0.65 + 0.35 * p2s_mult)
    adj_sack_prob = float(max(0.025, min(0.180, float(base_sack_prob) * shock_mult)))
    return {
        "base_sack_prob": round(float(base_sack_prob), 4),
        "adjusted_sack_prob": round(adj_sack_prob, 4),
        "weak_link_efficiency": round(float(weak["efficiency"]), 4),
        "arithmetic_mean": round(float(weak["arithmetic_mean"]), 4),
        "am_gm_gap": round(am_gm_gap, 4),
        "pipping_survival": round(survival, 4),
        "qb_p2s": round(float(qb_p2s), 4),
    }


__all__ = [
    "PASS_RUSHER_STRAIN_VARYING_INTERCEPTS",
    "analyze_qb_escape_vectors",
    "apply_trench_pocket_shock",
    "bayesian_shrink_p2s",
    "compute_cox_weibull_pocket_survival",
    "compute_fourth_down_uncertainty_gate",
    "compute_ibrahim_voronoi_pocket_survival",
    "compute_nguyen_yurko_matthews_strain_multilevel",
    "compute_nikolaou_pelechrinis_team_collapse_pgm",
    "compute_pipping_adjusted_ol_efficiency",
    "compute_ruscio_pressure_win_probability",
    "compute_sharp_pass_rush_protection_adjustment",
    "compute_strain_rate",
    "compute_weak_link_ol_efficiency",
    "cox_weibull_block_survival",
    "trench_survival_drop",
    "weak_link_am_gm_clean_pocket_prob",
]
