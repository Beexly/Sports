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
from types import MappingProxyType
from typing import Any, Dict, Mapping

ASSAY_CUTOFFS: Mapping[str, Mapping[str, Any]] = MappingProxyType(
    {
        "istat_tbi_plasma": MappingProxyType(
            {
                "gfap": 30.0,
                "uchl1": 360.0,
                "matrix": "plasma",
                "source": "FDA 510(k) K201778 decision summary (21 CFR 866.5830)",
            }
        ),
        "banyan_bti_serum": MappingProxyType(
            {
                "gfap": 22.0,
                "uchl1": 327.0,
                "matrix": "serum",
                "source": "FDA DEN170045 (restated in K240279 decision summary, 21 CFR 866.5830)",
            }
        ),
        "vidas_tbi_serum": MappingProxyType(
            {
                "gfap": 22.0,
                "uchl1": 327.0,
                "matrix": "serum",
                "source": "FDA 510(k) K240279 decision summary (21 CFR 866.5830)",
            }
        ),
        "papa_2022_research_serum": MappingProxyType(
            {
                "gfap": 30.0,
                "uchl1": 327.0,
                "matrix": "serum",
                "source": "Papa et al. 2022 research serum pair (non-commercial research provenance)",
            }
        ),
    }
)


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


def evaluate_rule_in_signal(
    gfap_pg_ml: float,
    uchl1_pg_ml: float,
    assay: str = "istat_tbi_plasma",
) -> Dict[str, object]:
    """ADR-0003 + FDA 21 CFR 866.5830(b)(2): Biomarkers supply rule-in head-CT triage escalation alerts only.

    Never grants standalone intracranial lesion diagnosis or return-to-play clearance.
    """
    if assay not in ASSAY_CUTOFFS:
        raise ValueError(f"unknown assay {assay!r}; valid assays: {sorted(ASSAY_CUTOFFS)}")
    if gfap_pg_ml < 0 or uchl1_pg_ml < 0:
        raise ValueError("biomarker concentrations must be non-negative")
    cut = ASSAY_CUTOFFS[assay]
    gfap_alert = gfap_pg_ml >= float(cut["gfap"])
    uchl1_alert = uchl1_pg_ml >= float(cut["uchl1"])
    return {
        "rule_in_only_doctrine": True,
        "head_ct_triage_escalation_only": True,
        "standalone_lesion_diagnosis_permitted": False,
        "return_to_play_clearance_permitted": False,
        "mmp13_excluded": True,
        "regulatory_basis": "FDA 21 CFR 866.5830(b)(2)",
        "assay": assay,
        "assay_provenance": str(cut["source"]),
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
