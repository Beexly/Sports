"""Numbers that were measured, and the refusal to use them as weights.

A calibration map is not fitted here. use_as_pick_weight is false on every
row. pick_weight() raises. That is the calibration state, not a placeholder
0.5.
"""
from __future__ import annotations

from typing import Any

# Sources: intelligence/gates/claims.json tau_heldout;
# intelligence/gates/calibration_rows.json epa_facets correlation.
MEASURED: dict[str, dict[str, Any]] = {
    "tau_heldout_delta_pp": {
        "value": 6.7703,
        "n": 3988,
        "train": "2022-2023",
        "eval": "2024-2025",
        "use_as_pick_weight": False,
        "reason": "held-out fourth-down gate. the served table is a separate point fit",
    },
    "pass_epa_week_to_next_corr": {
        "value": 0.1425,
        "n": 2012,
        "seasons": "2022-2025",
        "use_as_pick_weight": False,
        "reason": "descriptive correlation. no map fitted",
    },
}


class NotAWeight(Exception):
    def __init__(self, signal_id: str, reason: str) -> None:
        self.signal_id = signal_id
        self.reason = reason
        super().__init__(f"{signal_id}: {reason}")


def receipt(signal_id: str) -> dict[str, Any]:
    row = MEASURED.get(signal_id)
    if row is None:
        raise NotAWeight(signal_id, "no measurement on file")
    return dict(row)


def pick_weight(signal_id: str) -> float:
    row = receipt(signal_id)
    if not row["use_as_pick_weight"]:
        raise NotAWeight(signal_id, row["reason"])
    return float(row["value"])


def calibration_applied() -> bool:
    return any(row["use_as_pick_weight"] for row in MEASURED.values())
