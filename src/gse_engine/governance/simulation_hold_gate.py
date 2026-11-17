"""Operator Simulation Hold Gate enforcing explicit week approval before week >= 11 runs.

Keeps MIND-FIRST / WIRE-FIRST intelligence accumulation prioritized over running
forward weekly simulations before explicit operator authorization via
``GSE_OPERATOR_APPROVED_SIM_WEEKS``.
"""

from __future__ import annotations

import os
import re
from typing import Any

MIN_OPERATOR_GATED_WEEK = 11
APPROVAL_ENV_VAR = "GSE_OPERATOR_APPROVED_SIM_WEEKS"


class OperatorSimulationHoldError(RuntimeError):
    """Raised when a gated future-week simulation runs without operator approval."""


def _parse_approved_tokens(raw_value: str) -> set[str]:
    """Parse comma- or whitespace-separated approved week tokens."""
    tokens: set[str] = set()
    for part in re.split(r"[\s,;]+", raw_value.strip()):
        cleaned = part.strip().upper()
        if cleaned:
            tokens.add(cleaned)
    return tokens


def is_simulation_week_approved(
    week: int,
    *,
    env_override: str | None = None,
) -> bool:
    """Return True if simulations for ``week`` are permitted to execute."""
    week_int = int(week)
    if week_int < MIN_OPERATOR_GATED_WEEK:
        return True
    raw_env = env_override if env_override is not None else os.environ.get(APPROVAL_ENV_VAR, "")
    approved = _parse_approved_tokens(raw_env)
    return str(week_int) in approved or "ALL" in approved


def assert_operator_simulation_week_approved(
    week: int,
    *,
    caller: str = "simulation",
    env_override: str | None = None,
) -> dict[str, Any]:
    """Fail closed unless ``week`` is historical (< 11) or explicitly approved."""
    week_int = int(week)
    if not is_simulation_week_approved(week_int, env_override=env_override):
        raise OperatorSimulationHoldError(
            f"OPERATOR_SIM_HOLD: Simulation for week={week_int} halted in {caller}. "
            f"Per MIND-FIRST / WIRE-FIRST doctrine, week >= {MIN_OPERATOR_GATED_WEEK} "
            f"simulations require explicit operator approval via {APPROVAL_ENV_VAR}={week_int}."
        )
    return {
        "week": week_int,
        "approved": True,
        "caller": caller,
        "gated": week_int >= MIN_OPERATOR_GATED_WEEK,
    }
