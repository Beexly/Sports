"""
Calibration metrics — a line-for-line port of the GSE production TypeScript.

Every function here mirrors a specific production source file. The port is not
asserted, it is PROVEN: `parity/gen_vectors.mjs` transpiles the real TypeScript
with the repo's own esbuild and dumps its outputs to `parity/vectors.json`, and
`tests/test_metrics_parity.py` asserts this module reproduces them exactly.

If you change anything in this file, regenerate the vectors and re-run the
parity test. A metric that disagrees with production is worse than no metric,
because it produces a number an operator will believe.

Sources mirrored:
  apps/web/lib/calibration/brier.ts             -> brier_score
  apps/web/lib/calibration/ece.ts               -> confidence_buckets,
                                                   expected_calibration_error,
                                                   maximum_calibration_error
  packages/prediction-engine/src/
      probability-calibration.ts                -> brier_decomposition

Stdlib only, deliberately. This runs anywhere Python 3.10+ runs, with no
install step, so it can never be blocked by a dependency lock.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Iterable, Sequence

__all__ = [
    "Sample",
    "Bucket",
    "BrierDecomposition",
    "brier_score",
    "confidence_buckets",
    "expected_calibration_error",
    "maximum_calibration_error",
    "brier_decomposition",
    "bin_index",
    "base_rate",
]


@dataclass(frozen=True, slots=True)
class Sample:
    """A settled forecast. `p` is a probability in [0,1]; `y` is 1 win / 0 loss.

    PUSH and VOID are excluded upstream, in the loader, not here — this type
    only ever holds decided outcomes.
    """

    p: float
    y: int


@dataclass(frozen=True, slots=True)
class Bucket:
    """Mirrors `CalibrationBucket` in apps/web/lib/calibration/ece.ts."""

    lower: float
    upper: float
    count: int
    avg_confidence: float
    accuracy: float
    gap: float

    @property
    def signed_gap(self) -> float:
        """avg_confidence - accuracy, WITHOUT the absolute value.

        Production stores only `gap` (absolute). The sign is what makes the
        stratified decomposition possible, so it is derived here and never
        substituted for `gap` in any parity-checked calculation.
        """
        return self.avg_confidence - self.accuracy


@dataclass(frozen=True, slots=True)
class BrierDecomposition:
    """Mirrors `BrierDecomposition` in probability-calibration.ts (4dp rounded)."""

    brier: float
    reliability: float
    resolution: float
    uncertainty: float
    base_rate: float
    sample_size: int

    @property
    def binned_reconstruction(self) -> float:
        """REL - RES + UNC. Equals `brier` only when p is constant inside bins."""
        return self.reliability - self.resolution + self.uncertainty

    @property
    def within_bin_gap(self) -> float:
        return self.brier - self.binned_reconstruction


def _clamp01(value: float) -> float:
    return 0.0 if value < 0.0 else 1.0 if value > 1.0 else value


def _round(value: float, digits: int = 4) -> float:
    """JavaScript `Math.round(v * 10**d) / 10**d`.

    Python's built-in round() is banker's rounding and disagrees with JS on
    exact .5 ties, which is precisely the kind of silent 1-ulp drift that makes
    a parity test flap. math.floor(x + 0.5) reproduces Math.round for the
    non-negative metrics this is applied to.
    """
    scale = 10**digits
    scaled = value * scale
    return math.floor(scaled + 0.5) / scale if scaled >= 0 else -(math.floor(-scaled + 0.5) / scale)


def bin_index(p: float, bins: int) -> int:
    """Mirrors `binIndex` in probability-calibration.ts. p == 1 lands in the last bin."""
    i = math.floor(_clamp01(p) * bins)
    return bins - 1 if i == bins else i


def base_rate(samples: Sequence[Sample]) -> float:
    if not samples:
        return 0.0
    return sum(s.y for s in samples) / len(samples)


def brier_score(samples: Sequence[Sample]) -> float:
    """Mirrors `brierScore` in brier.ts. Unrounded; returns 0.0 on empty input."""
    if not samples:
        return 0.0
    return sum((s.p - s.y) ** 2 for s in samples) / len(samples)


def confidence_buckets(samples: Sequence[Sample], bucket_count: int = 10) -> list[Bucket]:
    """Mirrors `confidenceBuckets` in ece.ts.

    Note the asymmetry, which is production behaviour and is reproduced
    deliberately: every bucket is [lower, upper) EXCEPT the last, which is
    [lower, upper] so that p == 1.0 is counted rather than dropped.

    An empty bucket reports avg_confidence 0, accuracy 0 and gap 0 — it then
    contributes nothing to ECE because its weight is 0.
    """
    buckets: list[Bucket] = []
    for i in range(bucket_count):
        lower = i / bucket_count
        upper = (i + 1) / bucket_count
        is_last = i == bucket_count - 1
        members = [
            s for s in samples if s.p >= lower and (s.p <= upper if is_last else s.p < upper)
        ]
        count = len(members)
        avg_conf = sum(s.p for s in members) / count if count else 0.0
        accuracy = sum(s.y for s in members) / count if count else 0.0
        buckets.append(
            Bucket(
                lower=lower,
                upper=upper,
                count=count,
                avg_confidence=avg_conf,
                accuracy=accuracy,
                gap=abs(avg_conf - accuracy),
            )
        )
    return buckets


def expected_calibration_error(samples: Sequence[Sample], bucket_count: int = 10) -> float:
    """Mirrors `expectedCalibrationError` in ece.ts.

    ECE = SUM_k (n_k / N) * |mean_p_k - obs_k|

    The absolute value is taken PER BIN, before aggregation. That is the whole
    reason `decomposition.py` exists: absolute per-bin gaps mean a pooled ECE
    can be strictly lower than every stratum it is built from, and this metric
    alone cannot tell you whether that happened.
    """
    buckets = confidence_buckets(samples, bucket_count)
    denom = max(len(samples), 1)
    return sum((b.count / denom) * b.gap for b in buckets)


def maximum_calibration_error(samples: Sequence[Sample], bucket_count: int = 10) -> float:
    """Mirrors `maximumCalibrationError` in ece.ts (floored at 0)."""
    gaps = [b.gap for b in confidence_buckets(samples, bucket_count)]
    return max([0.0, *gaps])


def brier_decomposition(samples: Sequence[Sample], bins: int = 10) -> BrierDecomposition:
    """Mirrors `brierDecomposition` in probability-calibration.ts.

    Murphy decomposition:  Brier ~= REL - RES + UNC
      REL (reliability, lower better) = SUM_k (n_k/N) (mean_p_k - obs_k)^2
      RES (resolution,  higher better) = SUM_k (n_k/N) (obs_k - base_rate)^2
      UNC (uncertainty)                = base_rate * (1 - base_rate)

    Production rounds every returned term to 4 decimal places. That rounding is
    reproduced here because the eligibility gate compares the ROUNDED value
    against its floor, so an unrounded port could pass a gate production fails.
    """
    n = len(samples)
    if n == 0:
        return BrierDecomposition(0.0, 0.0, 0.0, 0.0, 0.0, 0)

    br = sum(s.y for s in samples) / n
    raw = sum((s.p - s.y) ** 2 for s in samples) / n

    bin_count = [0] * bins
    bin_forecast_sum = [0.0] * bins
    bin_outcome_sum = [0.0] * bins
    for s in samples:
        b = bin_index(s.p, bins)
        bin_count[b] += 1
        bin_forecast_sum[b] += s.p
        bin_outcome_sum[b] += s.y

    reliability = 0.0
    resolution = 0.0
    for b in range(bins):
        nk = bin_count[b]
        if nk == 0:
            continue
        fk = bin_forecast_sum[b] / nk
        ok = bin_outcome_sum[b] / nk
        reliability += nk * (fk - ok) ** 2
        resolution += nk * (ok - br) ** 2
    reliability /= n
    resolution /= n

    return BrierDecomposition(
        brier=_round(raw),
        reliability=_round(reliability),
        resolution=_round(resolution),
        uncertainty=_round(br * (1 - br)),
        base_rate=_round(br),
        sample_size=n,
    )
