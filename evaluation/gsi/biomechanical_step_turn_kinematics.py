"""
GSI ADR-0003 Rule-In-Only Bilateral Cut-Kinematics Step-and-Turn Benchmark
=========================================================================

Isolated inside `evaluation/gsi/` (strictly never imported by NFL betting modules).
Applies circular von Mises directional concentration (`kappa`) and bilateral stride
limb-symmetry index (LSI) to flag mechanical asymmetry risk strictly as a rule-in
warning signal. Under ADR-0003, `return_to_play_clearance_permitted` is ALWAYS `False`.
"""

from __future__ import annotations

import json
import math
from typing import Dict


def evaluate_bilateral_cut_kinematics(
    left_kappa: float,
    right_kappa: float,
    left_stride_m: float,
    right_stride_m: float,
) -> Dict[str, object]:
    """ADR-0003: Bilateral step-and-turn kinematics trigger rule-in alerts only, never RTP clearance."""
    vals = (left_kappa, right_kappa, left_stride_m, right_stride_m)
    if not all(isinstance(v, (int, float)) and math.isfinite(float(v)) and float(v) > 0.0 for v in vals):
        raise ValueError("left_kappa, right_kappa, left_stride_m, right_stride_m must be finite and strictly positive")

    kappa_ratio = max(float(left_kappa), float(right_kappa)) / min(float(left_kappa), float(right_kappa))
    stride_lsi = min(float(left_stride_m), float(right_stride_m)) / max(float(left_stride_m), float(right_stride_m))
    alert_triggered = bool(kappa_ratio >= 1.35 or stride_lsi < 0.90)

    return {
        "rule_in_only_doctrine": True,
        "return_to_play_clearance_permitted": False,
        "alert_triggered": alert_triggered,
        "kappa_asymmetry_ratio": round(kappa_ratio, 4),
        "stride_lsi": round(stride_lsi, 4),
    }


def run_benchmark() -> Dict[str, object]:
    sym = evaluate_bilateral_cut_kinematics(8.0, 7.9, 1.18, 1.19)
    asym = evaluate_bilateral_cut_kinematics(10.5, 6.2, 1.22, 1.01)
    return {
        "benchmark": "gsi_adr0003_step_turn_kinematics_v1",
        "symmetric_sample": sym,
        "asymmetric_sample": asym,
        "rule_in_doctrine_preserved": (
            sym["return_to_play_clearance_permitted"] is False
            and asym["return_to_play_clearance_permitted"] is False
            and asym["alert_triggered"] is True
        ),
    }


if __name__ == "__main__":
    print(json.dumps(run_benchmark(), indent=2))
