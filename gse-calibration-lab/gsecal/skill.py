"""
Skill floor: does the model beat a forecaster with no predictive value at all?

THE GAP THIS CLOSES
-------------------
The eligibility gate has four floors — n, Brier, ECE, Murphy reliability. Every
one of them is a CALIBRATION or VOLUME floor. None of them measures whether the
model ranks outcomes.

That is not a theoretical concern. A forecaster that ignores every input and
always predicts the base rate is PERFECTLY CALIBRATED by construction, and
measured against the figures recorded in AGENTS.md it passes all four floors:

    n 458 · ECE 0.0003 · Brier 0.2122 · Murphy REL 0.0000  ->  gate reads GREEN

while its Murphy RES — resolution, the ranking power — is exactly 0.0000. It has
no predictive value whatsoever and the gate certifies it.

AGENTS.md already records that the Brier floor alone is clearable by such a
forecast ("uncertainty alone is 0.2139 against the 0.22 floor") and that the
Murphy reliability floor is ~4.47x looser than the ECE floor. This module
completes that thought: the floors do not merely fail INDIVIDUALLY, they fail
TOGETHER to the same trivial forecaster, because all four measure calibration
and calibration is free if you predict the base rate.

MURPHY'S OWN DECOMPOSITION SAYS WHY:  Brier = REL - RES + UNC
    REL (reliability) -> lower is better -> floored, three ways over
    RES (resolution)  -> HIGHER is better -> NOT FLOORED AT ALL
    UNC (uncertainty) -> fixed by the data, not a lever

A model is useful only when RES > 0 by a meaningful margin. Nothing in the gate
requires that.

AND IT IS WORSE THAN UNFLOORED: RES IS NOT RECORDED. AGENTS.md's production
readings list n, Brier, ECE and Murphy RELIABILITY (0.0053). Murphy RESOLUTION
appears nowhere in that record. So the deployed model's ranking power is not
merely unconstrained by the gate — it is unknown. The first action here is to
measure it, not to floor it.

WHAT THIS MODULE IS NOT
-----------------------
It does not change, weaken, or add a production floor — proposing one is ledger
work for the founder, not an autonomous edit to the honesty boundary. It
MEASURES the gap so the decision is informed. Adding a RES floor would make the
guard strictly stronger (law 9's allowed direction), but it is a gate change and
it belongs to a human.
"""

from __future__ import annotations

from dataclasses import dataclass

from gsecal.gate import DEFAULT_FLOORS
from gsecal.metrics import (
    Sample,
    brier_decomposition,
    brier_score,
    expected_calibration_error,
)

__all__ = [
    "NoSkillBaseline",
    "SkillVerdict",
    "no_skill_baseline",
    "assess_skill",
]


@dataclass(frozen=True, slots=True)
class NoSkillBaseline:
    """What a constant base-rate forecaster scores on n rows."""

    base_rate: float
    n: int
    ece: float
    brier: float
    reliability: float
    resolution: float
    uncertainty: float

    @property
    def passes_ece_floor(self) -> bool:
        return self.ece <= DEFAULT_FLOORS.ece

    @property
    def passes_brier_floor(self) -> bool:
        return self.brier <= DEFAULT_FLOORS.brier

    @property
    def passes_reliability_floor(self) -> bool:
        return self.reliability <= DEFAULT_FLOORS.murphy_reliability

    @property
    def passes_n_floor(self) -> bool:
        return self.n >= DEFAULT_FLOORS.n

    @property
    def passes_every_floor(self) -> bool:
        return (
            self.passes_n_floor
            and self.passes_ece_floor
            and self.passes_brier_floor
            and self.passes_reliability_floor
        )

    def summary(self) -> str:
        state = "PASSES EVERY FLOOR" if self.passes_every_floor else "is caught by a floor"
        return (
            f"A constant base-rate ({self.base_rate:.3f}) forecaster on n={self.n} "
            f"{state}: ECE {self.ece:.4f}, Brier {self.brier:.4f}, "
            f"REL {self.reliability:.4f} — with RES {self.resolution:.4f} "
            f"(no predictive value at all)."
        )


def no_skill_baseline(base_rate: float, n: int) -> NoSkillBaseline:
    """Construct the zero-skill reference: always forecast the base rate.

    This is NOT fabricated product data (law 8). It is an analytic reference
    distribution — the statistical null a real model must beat — carrying no
    teams, games, odds or picks, and it is never rendered as a pick or a result.
    """
    if not 0.0 <= base_rate <= 1.0:
        raise ValueError(f"base_rate {base_rate!r} outside [0,1]")
    if n <= 0:
        raise ValueError("n must be positive")

    wins = round(base_rate * n)
    samples = [Sample(p=base_rate, y=1) for _ in range(wins)]
    samples += [Sample(p=base_rate, y=0) for _ in range(n - wins)]
    d = brier_decomposition(samples, 10)
    return NoSkillBaseline(
        base_rate=base_rate,
        n=n,
        ece=expected_calibration_error(samples, 10),
        brier=brier_score(samples),
        reliability=d.reliability,
        resolution=d.resolution,
        uncertainty=d.uncertainty,
    )


@dataclass(frozen=True, slots=True)
class SkillVerdict:
    model_resolution: float
    model_brier: float
    baseline: NoSkillBaseline

    @property
    def beats_no_skill_brier(self) -> bool:
        return self.model_brier < self.baseline.brier

    @property
    def has_material_resolution(self) -> bool:
        """RES >= 0.01 — the threshold the repo's own MURPHY_RES_DEFINITION uses
        to call resolution 'material' rather than 'bins finish near base rate'."""
        return self.model_resolution >= 0.01

    def verdict(self) -> str:
        if not self.baseline.passes_every_floor:
            return (
                "Baseline is caught by a floor on this data — the floors do "
                "discriminate here."
            )
        if self.has_material_resolution and self.beats_no_skill_brier:
            return (
                f"HAS SKILL — RES {self.model_resolution:.4f} is material and Brier "
                f"{self.model_brier:.4f} beats the no-skill {self.baseline.brier:.4f}. "
                "The gate would pass it, and it deserves to pass."
            )
        return (
            f"NO DEMONSTRATED SKILL — RES {self.model_resolution:.4f}"
            + ("" if self.beats_no_skill_brier else ", and Brier does not beat no-skill")
            + f". A zero-skill forecaster also clears every floor on n={self.baseline.n}, "
            "so passing the gate here would certify calibration, not predictive value."
        )


def assess_skill(
    *, model_resolution: float, model_brier: float, base_rate: float, n: int
) -> SkillVerdict:
    """Compare a model's discrimination against the zero-skill null."""
    return SkillVerdict(
        model_resolution=model_resolution,
        model_brier=model_brier,
        baseline=no_skill_baseline(base_rate, n),
    )
