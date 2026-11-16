"""Stage-5 Class B de-vig, anti-cannibalization, and CAGE policy gates."""

from __future__ import annotations

from gse_engine.gates.cage_policy import evaluate_cage_slate_policy
from gse_engine.gates.conjunction import evaluate_prop_board

__all__ = ["evaluate_cage_slate_policy", "evaluate_prop_board"]
