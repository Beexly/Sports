"""
Deterministic bootstrap confidence intervals.

Seeded and reproducible: the same rows and the same seed always produce the
same interval. An interval that moves when you re-run it is not evidence, and
AGENTS.md requires every reported number to trace to output someone actually
saw and can see again.

Why intervals matter here specifically: AGENTS.md records per-sport ECEs at
n=28 (NFL) and n=65 (NCAAF), and notes that an earlier draft read a DIRECTION
off the n=28 figure — a conclusion that sample cannot support. Spreading n=28
across ten bins leaves ~3 rows per bin. This module makes that fragility a
number instead of a caveat.
"""

from __future__ import annotations

import random
import statistics
from dataclasses import dataclass
from typing import Callable, Sequence

from gsecal.metrics import Sample, expected_calibration_error

__all__ = ["Interval", "bootstrap_metric", "bootstrap_ece", "bins_occupancy_warning"]

DEFAULT_RESAMPLES = 2000
DEFAULT_SEED = 20260909


@dataclass(frozen=True, slots=True)
class Interval:
    point: float
    low: float
    high: float
    level: float
    resamples: int
    seed: int
    n: int

    @property
    def width(self) -> float:
        return self.high - self.low

    def straddles(self, threshold: float) -> bool:
        """True when the interval contains the threshold — i.e. the data cannot
        say which side of it the truth lies on."""
        return self.low <= threshold <= self.high

    def verdict(self, floor: float) -> str:
        if self.high <= floor:
            return f"CLEARS {floor} across the whole interval"
        if self.low > floor:
            return f"FAILS {floor} across the whole interval"
        return (
            f"INCONCLUSIVE against {floor} — the {self.level:.0%} interval "
            f"[{self.low:.4f}, {self.high:.4f}] straddles it"
        )

    def __str__(self) -> str:
        return f"{self.point:.4f} [{self.low:.4f}, {self.high:.4f}] ({self.level:.0%}, n={self.n})"


def bootstrap_metric(
    samples: Sequence[Sample],
    metric: Callable[[Sequence[Sample]], float],
    *,
    resamples: int = DEFAULT_RESAMPLES,
    level: float = 0.95,
    seed: int = DEFAULT_SEED,
) -> Interval:
    """Percentile bootstrap for any metric over settled samples."""
    n = len(samples)
    if n == 0:
        raise ValueError("cannot bootstrap an empty sample")
    if not 0.0 < level < 1.0:
        raise ValueError("level must be in (0,1)")

    point = metric(samples)
    rng = random.Random(seed)
    draws: list[float] = []
    for _ in range(resamples):
        resample = [samples[rng.randrange(n)] for _ in range(n)]
        draws.append(metric(resample))
    draws.sort()

    alpha = (1.0 - level) / 2.0
    lo_idx = max(0, min(resamples - 1, int(alpha * resamples)))
    hi_idx = max(0, min(resamples - 1, int((1.0 - alpha) * resamples) - 1))
    return Interval(
        point=point,
        low=draws[lo_idx],
        high=draws[hi_idx],
        level=level,
        resamples=resamples,
        seed=seed,
        n=n,
    )


def bootstrap_ece(
    samples: Sequence[Sample],
    *,
    bins: int = 10,
    resamples: int = DEFAULT_RESAMPLES,
    level: float = 0.95,
    seed: int = DEFAULT_SEED,
) -> Interval:
    return bootstrap_metric(
        samples,
        lambda s: expected_calibration_error(s, bins),
        resamples=resamples,
        level=level,
        seed=seed,
    )


def bins_occupancy_warning(samples: Sequence[Sample], bins: int = 10) -> str | None:
    """Flag the n=28-across-10-bins problem before anyone reads a direction off it.

    Returns None when occupancy is healthy, otherwise a plain-language warning.
    """
    n = len(samples)
    if n == 0:
        return "No samples."
    from gsecal.metrics import confidence_buckets

    occupied = [b for b in confidence_buckets(samples, bins) if b.count > 0]
    if not occupied:
        return "No occupied bins."
    per_bin = n / len(occupied)
    thinnest = min(b.count for b in occupied)
    if per_bin < 5 or thinnest < 3:
        return (
            f"THIN: n={n} across {len(occupied)} occupied bins "
            f"(~{per_bin:.1f}/bin, thinnest {thinnest}). Both the magnitude AND the "
            f"sign of this ECE are dominated by sampling noise. Do not read a "
            f"direction off it."
        )
    if per_bin < 15:
        return (
            f"MODEST: n={n} across {len(occupied)} occupied bins (~{per_bin:.1f}/bin). "
            f"Treat as indicative, not conclusive."
        )
    return None
