"""
PROVEN readiness projection, and the false-GREEN risk in the current gate.

TWO QUESTIONS THIS ANSWERS
--------------------------

1. "Can the gate go GREEN on a model that is not calibrated?"

   The production eligibility gate reads a POOLED ECE across all model
   versions. decomposition.py measures that pooling can sit strictly below the
   weighted stratum mean — 0.0414 below, on the figures recorded in AGENTS.md.
   Therefore a reachable state exists where:

       pooled ECE  <=  0.05  <  deployed version's own ECE

   In that state the gate reads GREEN and the product publishes a calibration
   claim about a model whose own rows fail the floor. That is a FALSE PROVEN.
   It is not hypothetical: the cancellation that produces it is measured.

   false_green_risk() detects exactly that state.

2. "How many more settled rows until the deployed model can honestly pass?"

   rows_needed_for_floor() answers it, and — importantly — returns None when
   the answer is "never at this rate", instead of a reassuring large number.

A NOTE ON THE PROJECTION'S DIRECTION OF ERROR
---------------------------------------------
ECE does NOT average over samples: pooled ECE is not the weighted mean of the
parts (that is the whole cancellation finding). So these projections use the
weighted stratum mean, which by the identity in decomposition.py is always
>= the pooled value.

That makes every projection here CONSERVATIVE. If the projected weighted mean
clears the floor, the pooled value the gate reads necessarily clears it too.
The reverse does not hold. Erring pessimistically is the only acceptable
direction for a tool that informs a published claim.

Nothing here changes a gate, a floor, or the engine. It is measurement.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Sequence

from gsecal.gate import DEFAULT_FLOORS

__all__ = [
    "VersionStratum",
    "FalseGreenReport",
    "ProjectionResult",
    "false_green_risk",
    "rows_needed_for_floor",
    "project_pooled_after",
    "convergence_path",
]


@dataclass(frozen=True, slots=True)
class VersionStratum:
    label: str
    n: int
    ece: float
    deployed: bool = False


@dataclass(frozen=True, slots=True)
class FalseGreenReport:
    pooled_ece: float
    weighted_mean_ece: float
    deployed_label: str | None
    deployed_ece: float | None
    deployed_n: int
    floor: float

    @property
    def gate_would_pass(self) -> bool:
        """What the CURRENT gate concludes from the pooled figure."""
        return self.pooled_ece <= self.floor

    @property
    def deployed_would_pass(self) -> bool:
        """What the deployed model's OWN rows say."""
        return self.deployed_ece is not None and self.deployed_ece <= self.floor

    @property
    def at_risk(self) -> bool:
        """Gate says GREEN, the deployed model's own rows say otherwise."""
        return self.gate_would_pass and self.deployed_ece is not None and not self.deployed_would_pass

    @property
    def margin_to_false_green(self) -> float:
        """How far the pooled figure is from crossing into a false GREEN.

        Positive means the pooled figure is still above the floor (safe today,
        for the wrong reason). Zero or negative with a failing deployed model
        means the false-GREEN state is live.
        """
        return self.pooled_ece - self.floor

    def verdict(self) -> str:
        if self.deployed_ece is None:
            return (
                "UNKNOWN — no deployed version identified. The gate reads a pooled "
                "figure and cannot tell you which model it describes."
            )
        if self.at_risk:
            return (
                f"FALSE GREEN — the gate would PASS on pooled {self.pooled_ece:.4f}, "
                f"but the deployed {self.deployed_label} measures {self.deployed_ece:.4f} "
                f"on its own {self.deployed_n} rows, which FAILS the {self.floor} floor. "
                "Publishing here would claim calibration for a model that is not calibrated."
            )
        if not self.gate_would_pass and not self.deployed_would_pass:
            return (
                f"HONESTLY RED — pooled {self.pooled_ece:.4f} and deployed "
                f"{self.deployed_label} {self.deployed_ece:.4f} both fail the "
                f"{self.floor} floor. The gate and the truth agree."
            )
        if self.gate_would_pass and self.deployed_would_pass:
            return (
                f"HONESTLY GREEN — pooled {self.pooled_ece:.4f} and deployed "
                f"{self.deployed_label} {self.deployed_ece:.4f} both clear the floor."
            )
        return (
            f"CONSERVATIVE RED — the deployed {self.deployed_label} clears the floor "
            f"({self.deployed_ece:.4f}) but the pooled figure {self.pooled_ece:.4f} does "
            "not. The gate is being held back by retired versions' rows. Not a safety "
            "problem — the gate errs safe here — but it is measuring the wrong thing."
        )


def false_green_risk(
    strata: Sequence[VersionStratum],
    pooled_ece: float,
    floor: float = DEFAULT_FLOORS.ece,
) -> FalseGreenReport:
    """Detect whether the pooled gate can pass while the deployed model fails."""
    total_n = sum(s.n for s in strata)
    weighted_mean = (
        sum(s.n * s.ece for s in strata) / total_n if total_n else 0.0
    )
    deployed = next((s for s in strata if s.deployed), None)
    return FalseGreenReport(
        pooled_ece=pooled_ece,
        weighted_mean_ece=weighted_mean,
        deployed_label=deployed.label if deployed else None,
        deployed_ece=deployed.ece if deployed else None,
        deployed_n=deployed.n if deployed else 0,
        floor=floor,
    )


@dataclass(frozen=True, slots=True)
class ProjectionResult:
    rows_needed: int | None
    reachable: bool
    reason: str
    assumed_future_ece: float
    floor: float

    def __str__(self) -> str:
        if not self.reachable:
            return f"UNREACHABLE — {self.reason}"
        return (
            f"{self.rows_needed} more rows at ECE {self.assumed_future_ece:.4f} "
            f"to reach the {self.floor} floor"
        )


def rows_needed_for_floor(
    *,
    current_n: int,
    current_ece: float,
    assumed_future_ece: float,
    floor: float = DEFAULT_FLOORS.ece,
) -> ProjectionResult:
    """How many additional rows, at an assumed future ECE, reach the floor.

    Solves  (n*e_now + m*e_future) / (n + m)  <=  floor  for m.

    Returns reachable=False when e_future >= floor — because then no finite
    number of rows suffices, and reporting a large number instead of "never"
    would be the reassuring lie this tool exists to prevent.
    """
    if current_n <= 0:
        return ProjectionResult(None, False, "no current rows to project from",
                                assumed_future_ece, floor)
    if current_ece <= floor:
        return ProjectionResult(0, True, "already at or below the floor",
                                assumed_future_ece, floor)
    if assumed_future_ece >= floor:
        return ProjectionResult(
            None,
            False,
            f"assumed future ECE {assumed_future_ece:.4f} is not below the floor "
            f"{floor} — no number of additional rows at this quality ever reaches it. "
            "More data is not the lever; a better-calibrated model is.",
            assumed_future_ece,
            floor,
        )
    m = current_n * (current_ece - floor) / (floor - assumed_future_ece)
    return ProjectionResult(math.ceil(m), True, "reachable", assumed_future_ece, floor)


def project_pooled_after(
    strata: Sequence[VersionStratum],
    *,
    new_label: str,
    new_n: int,
    new_ece: float,
) -> float:
    """Conservative projected figure after adding new_n rows at new_ece.

    Returns the WEIGHTED MEAN, which bounds the pooled value from above. Use it
    to answer 'would we clear the floor' safely: if this clears, pooled clears.
    """
    total_n = sum(s.n for s in strata) + new_n
    if total_n <= 0:
        return 0.0
    total = sum(s.n * s.ece for s in strata) + new_n * new_ece
    return total / total_n


def convergence_path(
    strata: Sequence[VersionStratum],
    *,
    deployed_label: str,
    steps: Sequence[int],
) -> list[tuple[int, float]]:
    """Where the honest figure goes as the DEPLOYED version accumulates rows.

    This is the numerical form of the point that waiting does not help: if the
    deployed version's own ECE is worse than the current weighted mean, adding
    its rows drags the figure UP, not down.

    Returns [(additional_rows, projected_weighted_mean), ...].
    """
    deployed = next((s for s in strata if s.label == deployed_label), None)
    if deployed is None:
        raise ValueError(f"{deployed_label!r} not among strata")
    out: list[tuple[int, float]] = []
    for extra in steps:
        out.append(
            (
                extra,
                project_pooled_after(
                    strata, new_label=deployed_label, new_n=extra, new_ece=deployed.ece
                ),
            )
        )
    return out
