"""OOS-Gated Research Modules (`intelligence/research_gated/`) — Zero Live Weight.

All modules under `intelligence/research_gated` are STRICTLY quarantined at
`PRODUCTION_WEIGHT = 0.0` with `OOS_GATE_REQUIRED = True`. No live pick,
spread, total, prop, or SGP gate may apply non-zero production weight from
these modules until explicitly promoted by an out-of-sample walk-forward
calibration pass in `tests/verify_out_of_sample_calibration.py`.
"""
from __future__ import annotations

from typing import Any

from intelligence.research_gated import (
    coaching_graph_4th_down_humility,
    kelly_market_maker_overlay,
    rapm_spatial_ep_overlay,
    weather_load_circadian_overlay,
)

PRODUCTION_WEIGHT: float = 0.0
OOS_GATE_REQUIRED: bool = True

RESEARCH_GATED_MODULES = (
    kelly_market_maker_overlay,
    weather_load_circadian_overlay,
    rapm_spatial_ep_overlay,
    coaching_graph_4th_down_humility,
)


def verify_zero_live_weight_invariant() -> dict[str, Any]:
    """Assert every research-gated overlay remains locked at weight=0.0."""
    statuses: dict[str, dict[str, Any]] = {}
    for mod in RESEARCH_GATED_MODULES:
        w = float(getattr(mod, "PRODUCTION_WEIGHT", -1.0))
        req = bool(getattr(mod, "OOS_GATE_REQUIRED", False))
        if abs(w) > 1e-12 or not req:
            raise RuntimeError(
                f"OOS gate violation in {mod.__name__}: PRODUCTION_WEIGHT={w}, OOS_GATE_REQUIRED={req}"
            )
        statuses[mod.__name__.rsplit(".", 1)[-1]] = {
            "production_weight": w,
            "oos_gate_required": req,
            "locked": True,
        }
    return {
        "quarantined_module_count": len(RESEARCH_GATED_MODULES),
        "all_zero_weight": True,
        "oos_gate_required": True,
        "modules": statuses,
    }


__all__ = [
    "OOS_GATE_REQUIRED",
    "PRODUCTION_WEIGHT",
    "RESEARCH_GATED_MODULES",
    "coaching_graph_4th_down_humility",
    "kelly_market_maker_overlay",
    "rapm_spatial_ep_overlay",
    "verify_zero_live_weight_invariant",
    "weather_load_circadian_overlay",
]
