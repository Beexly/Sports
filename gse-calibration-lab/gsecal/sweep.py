"""
Counterfactual link sweep — what a temperature/shift WOULD do, if anyone applied it.

Two uses, one mechanism:

1. Calibration maps. A logit-space temperature T and shift b is the simplest
   post-hoc recalibration family (Platt scaling). Sweeping it says how much of
   the ECE gap is reachable by re-labelling confidence alone.

2. The gse-ml-service ETKF link. That service's README states the link is NOT
   calibrated and that `logistic_scale` (latent units per logit) and
   `home_advantage` are REQUEST INPUTS defaulting to bare convention — i.e.
   nobody has fitted them. logistic_scale is exactly a logit temperature and
   home_advantage is exactly a logit shift, so this sweep is the offline
   evidence for choosing them.

HARD LIMITS
-----------
Nothing here writes, deploys, or promotes anything. It cannot move a gate: the
whole point of the AGENTS.md Murphy note is that maps cut REL (reliability) and
leave RES (resolution) untouched, so a temperature that flatters ECE adds no
predictive skill whatsoever. `SweepResult.resolution_delta` is reported next to
every ECE improvement precisely so that trade is visible rather than implied.

Applying any of this to production is gated on CALIBRATION_ADJUSTMENTS_ENABLED
and a deliberate MODEL_VERSION bump, neither of which this module touches.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Sequence

from gsecal.metrics import (
    Sample,
    brier_decomposition,
    brier_score,
    expected_calibration_error,
)

__all__ = ["SweepPoint", "SweepResult", "apply_link", "sweep_link", "logit", "sigmoid"]

# Keeps logit finite at p in {0, 1}. Matches the usual epsilon-clipping practice.
EPS = 1e-9


def logit(p: float) -> float:
    q = min(1.0 - EPS, max(EPS, p))
    return math.log(q / (1.0 - q))


def sigmoid(z: float) -> float:
    if z >= 0:
        ez = math.exp(-z)
        return 1.0 / (1.0 + ez)
    ez = math.exp(z)
    return ez / (1.0 + ez)


def apply_link(samples: Sequence[Sample], temperature: float, shift: float) -> list[Sample]:
    """p' = sigmoid(logit(p)/T + b). T>1 softens, T<1 sharpens, b tilts."""
    if temperature <= 0:
        raise ValueError("temperature must be > 0")
    return [Sample(p=sigmoid(logit(s.p) / temperature + shift), y=s.y) for s in samples]


@dataclass(frozen=True, slots=True)
class SweepPoint:
    temperature: float
    shift: float
    ece: float
    brier: float
    reliability: float
    resolution: float

    def as_row(self) -> list:
        return [
            round(self.temperature, 3),
            round(self.shift, 3),
            round(self.ece, 4),
            round(self.brier, 4),
            round(self.reliability, 4),
            round(self.resolution, 4),
        ]


@dataclass(frozen=True, slots=True)
class SweepResult:
    baseline: SweepPoint
    best_ece: SweepPoint
    points: tuple[SweepPoint, ...]
    bins: int

    @property
    def ece_improvement(self) -> float:
        return self.baseline.ece - self.best_ece.ece

    @property
    def resolution_delta(self) -> float:
        """Change in RES. Expected ~0: monotone links do not add ranking power."""
        return self.best_ece.resolution - self.baseline.resolution

    @property
    def is_identity(self) -> bool:
        return (
            abs(self.best_ece.temperature - 1.0) < 1e-9 and abs(self.best_ece.shift) < 1e-9
        )

    def honest_summary(self) -> str:
        lines = [
            f"Baseline  T=1.000 b=+0.000  ECE {self.baseline.ece:.4f}  "
            f"REL {self.baseline.reliability:.4f}  RES {self.baseline.resolution:.4f}",
            f"Best ECE  T={self.best_ece.temperature:.3f} b={self.best_ece.shift:+.3f}  "
            f"ECE {self.best_ece.ece:.4f}  REL {self.best_ece.reliability:.4f}  "
            f"RES {self.best_ece.resolution:.4f}",
            f"ECE improvement: {self.ece_improvement:.4f}",
            f"RES change:      {self.resolution_delta:+.4f}",
        ]
        if abs(self.resolution_delta) < 5e-4:
            lines.append(
                "RES is essentially unchanged, as expected. This link re-labels "
                "confidence; it adds no predictive skill. Fitting it on the same rows "
                "it is scored against also overstates the gain — hold out before "
                "believing any of it."
            )
        return "\n".join(lines)


def sweep_link(
    samples: Sequence[Sample],
    *,
    temperatures: Sequence[float] | None = None,
    shifts: Sequence[float] | None = None,
    bins: int = 10,
) -> SweepResult:
    """Grid sweep of (temperature, shift), reporting ECE alongside REL and RES."""
    if not samples:
        raise ValueError("cannot sweep an empty sample")
    temperatures = list(temperatures) if temperatures else [0.6 + 0.1 * i for i in range(16)]
    shifts = list(shifts) if shifts else [-0.6 + 0.1 * i for i in range(13)]

    def measure(rows: Sequence[Sample], t: float, b: float) -> SweepPoint:
        d = brier_decomposition(rows, bins)
        return SweepPoint(
            temperature=t,
            shift=b,
            ece=expected_calibration_error(rows, bins),
            brier=brier_score(rows),
            reliability=d.reliability,
            resolution=d.resolution,
        )

    baseline = measure(samples, 1.0, 0.0)
    points: list[SweepPoint] = []
    for t in temperatures:
        for b in shifts:
            points.append(measure(apply_link(samples, t, b), t, b))

    best = min(points, key=lambda pt: (pt.ece, abs(pt.temperature - 1.0), abs(pt.shift)))
    if baseline.ece <= best.ece:
        best = baseline
    return SweepResult(baseline=baseline, best_ece=best, points=tuple(points), bins=bins)
