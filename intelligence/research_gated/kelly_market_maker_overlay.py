"""Research-Gated Module 1: Portfolio Kelly & Market-Maker Execution Overlay (weight=0.0)."""
from __future__ import annotations

import math
from typing import Sequence

PRODUCTION_WEIGHT: float = 0.0
OOS_GATE_REQUIRED: bool = True


def compute_kelly_market_maker_overlay(
    model_probs: Sequence[float],
    decimal_odds: Sequence[float],
    *,
    fractional_kelly: float = 0.25,
    slippage_bps: float = 45.0,
    max_single_stake: float = 0.03,
) -> dict[str, object]:
    """Compute OOS-gated portfolio Kelly stake vector (always zero-weighted live)."""
    if len(model_probs) != len(decimal_odds):
        raise ValueError("model_probs and decimal_odds must have equal length")

    raw_stakes: list[float] = []
    for p_raw, dec in zip(model_probs, decimal_odds, strict=True):
        p = min(max(float(p_raw), 1e-4), 1.0 - 1e-4)
        b = max(0.01, float(dec) - 1.0)
        eff_b = b * (1.0 - slippage_bps / 10000.0)
        q = 1.0 - p
        f_star = max(0.0, (p * eff_b - q) / eff_b)
        raw_stakes.append(min(max_single_stake, f_star * fractional_kelly))

    tot = sum(raw_stakes)
    if tot > 0.12 and tot > 0.0:
        scale = 0.12 / tot
        raw_stakes = [s * scale for s in raw_stakes]

    live_applied = [round(s * PRODUCTION_WEIGHT, 8) for s in raw_stakes]
    return {
        "production_weight": PRODUCTION_WEIGHT,
        "oos_gate_required": OOS_GATE_REQUIRED,
        "shadow_kelly_stakes": [round(s, 6) for s in raw_stakes],
        "live_applied_stakes": live_applied,
        "total_shadow_exposure": round(sum(raw_stakes), 6),
    }
