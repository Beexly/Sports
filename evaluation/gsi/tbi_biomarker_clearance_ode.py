"""
GSI ADR-0003 Rule-In-Only Neuro-Biomarker Clearance Kinetic Benchmark
=====================================================================

Mirrored from `OpenResearch/gse-gsi/benchmarks/eval_gsi_tbi_ode.py` inside the
isolated `evaluation/gsi/` benchmark directory (never imported by NFL prediction
or betting simulation modules). Enforces ADR-0003: GFAP and UCH-L1 biomarker
kinetics provide rule-in-only prognostic alerts and NEVER automated return-to-play
clearance (`return_to_play_clearance_permitted` is strictly `False`).
"""

from __future__ import annotations

import json
import math
from typing import Dict


def simulate_biphasic_biomarker_clearance(
    peak_pg_ml: float,
    t_hours: float,
    fast_half_life_h: float = 3.5,
    slow_half_life_h: float = 28.0,
    fast_fraction: float = 0.65,
) -> float:
    """Two-compartment IVIVC pharmacokinetic decay curve (GFAP/UCH-L1 kinetic envelope)."""
    if peak_pg_ml < 0 or t_hours < 0:
        raise ValueError("peak_pg_ml and t_hours must be non-negative")
    if fast_half_life_h <= 0 or slow_half_life_h <= 0:
        raise ValueError("half-lives must be positive")
    if not (0.0 <= fast_fraction <= 1.0):
        raise ValueError("fast_fraction must lie in [0, 1]")

    k_fast = math.log(2.0) / fast_half_life_h
    k_slow = math.log(2.0) / slow_half_life_h
    val = peak_pg_ml * (
        fast_fraction * math.exp(-k_fast * t_hours) + (1.0 - fast_fraction) * math.exp(-k_slow * t_hours)
    )
    return round(val, 4)


def evaluate_rule_in_signal(gfap_pg_ml: float, uchl1_pg_ml: float) -> Dict[str, object]:
    """ADR-0003: Biomarkers supply strictly rule-in alert flags, NEVER clearance/negative exclusion."""
    if gfap_pg_ml < 0 or uchl1_pg_ml < 0:
        raise ValueError("biomarker concentrations must be non-negative")
    gfap_alert = gfap_pg_ml >= 30.0
    uchl1_alert = uchl1_pg_ml >= 327.0
    return {
        "rule_in_only_doctrine": True,
        "return_to_play_clearance_permitted": False,
        "alert_triggered": gfap_alert or uchl1_alert,
        "gfap_pg_ml": gfap_pg_ml,
        "uchl1_pg_ml": uchl1_pg_ml,
    }


def run_benchmark() -> Dict[str, object]:
    t24_gfap = simulate_biphasic_biomarker_clearance(180.0, 24.0)
    t48_gfap = simulate_biphasic_biomarker_clearance(180.0, 48.0)
    gate = evaluate_rule_in_signal(t24_gfap, 150.0)
    return {
        "benchmark": "gsi_adr0003_tbi_ode_v1",
        "t24_gfap_pg_ml": t24_gfap,
        "t48_gfap_pg_ml": t48_gfap,
        "monotonic_decay": t48_gfap < t24_gfap < 180.0,
        "rule_in_doctrine_preserved": gate["return_to_play_clearance_permitted"] is False,
        "gate_sample": gate,
    }


if __name__ == "__main__":
    print(json.dumps(run_benchmark(), indent=2))
