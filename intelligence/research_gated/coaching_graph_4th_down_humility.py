"""Research-Gated Module 4: 4th-Down Decision Graph Humility Shrinkage (weight=0.0)."""
from __future__ import annotations

PRODUCTION_WEIGHT: float = 0.0
OOS_GATE_REQUIRED: bool = True


def compute_coaching_graph_4th_down_humility(
    *,
    go_attempts_sample: int,
    observed_go_conversion_rate: float,
    observed_go_above_expected: float,
    league_base_conversion_rate: float = 0.54,
    prior_pseudocount: float = 60.0,
) -> dict[str, float | bool | int]:
    """Shrink noisy 4th-down aggression tails back toward league conversion equilibrium (weight=0.0)."""
    n = max(0, int(go_attempts_sample))
    k0 = max(1.0, float(prior_pseudocount))
    w = n / (n + k0)
    obs_conv = min(max(float(observed_go_conversion_rate), 0.0), 1.0)
    shrunk_conv = w * obs_conv + (1.0 - w) * float(league_base_conversion_rate)
    shrunk_aggr = w * float(observed_go_above_expected)
    shadow_epa_swing = max(-0.08, min(0.08, shrunk_aggr * 0.25))
    return {
        "production_weight": PRODUCTION_WEIGHT,
        "oos_gate_required": OOS_GATE_REQUIRED,
        "shrinkage_weight": round(w, 4),
        "shadow_shrunk_conv_rate": round(shrunk_conv, 5),
        "shadow_epa_swing": round(shadow_epa_swing, 6),
        "live_applied_epa_swing": round(shadow_epa_swing * PRODUCTION_WEIGHT, 8),
    }
