"""Three kernels. A missing producer stays a gap. It is not a league rate.

01. Market strength is not in this repo. Do not join opportunity to a prior
    that was not measured.
02. Pass EPA, rush EPA, and turnover EPA are different facts. Do not add
    them into one form number and carry that forward.
03. Opponent shell mix needs a charting feed. Do not fill it with a league
    shell.
"""
from __future__ import annotations

from typing import Any


class KernelGap(Exception):
    def __init__(self, kernel: str, reason: str) -> None:
        self.kernel = kernel
        self.reason = reason
        super().__init__(f"{kernel}: {reason}")


def kernel_01_market_strength(market_strength: float | None, opportunity: dict[str, Any] | None) -> dict[str, Any]:
    if market_strength is None:
        raise KernelGap(
            "01",
            "no market-strength producer. player opportunity is not joined to a game-level prior",
        )
    if opportunity is None:
        raise KernelGap("01", "opportunity is missing. a market number alone is not a prop")
    return {
        "joined": False,
        "reason": "a market number was passed in, but this kernel does not publish a prop",
        "weight": None,
    }


def kernel_02_form(facets: dict[str, Any]) -> dict[str, Any]:
    """Refuse a mixed season EPA. Return the split, unweighted."""
    required = ("pass_epa", "rush_epa", "turnover_epa")
    missing = [key for key in required if facets.get(key) is None and facets.get("plays", 0) != 0]
    if facets.get("plays", 0) == 0:
        raise KernelGap("02", "no offensive plays. form is not zero")
    if missing:
        raise KernelGap("02", f"facet split incomplete: {missing}")
    return {
        "form": None,
        "reason": "pass, rush, and turnover stay separate. their sum is not form",
        "pass_epa": facets["pass_epa"],
        "rush_epa": facets["rush_epa"],
        "turnover_epa": facets["turnover_epa"],
        "weight": None,
        "weight_status": "withheld",
    }


def kernel_03_shell(shell_mix: dict[str, float] | None, opportunity: dict[str, Any] | None) -> dict[str, Any]:
    if not shell_mix:
        raise KernelGap(
            "03",
            "charting feed absent. shell mix is not filled with a league rate",
        )
    if opportunity is None:
        raise KernelGap("03", "opportunity is missing. a shell chart is not a target share")
    return {
        "conditioned": False,
        "reason": "shell mix was passed in, but this kernel does not publish a target share",
        "weight": None,
    }
