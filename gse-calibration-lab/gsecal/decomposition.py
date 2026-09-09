"""
Stratified ECE decomposition — measuring signed-error cancellation.

THE QUESTION THIS ANSWERS
-------------------------
The repo's own AGENTS.md records that the pooled ECE (0.0524) sits BELOW every
model-version stratum it is built from (v5.2.7 0.1089, v5.2.6 0.0587,
v5.1.0 0.0729, v5.0.0 0.1531), and states plainly:

    "`expectedCalibrationError` stores weighted ABSOLUTE per-bin gaps, so these
     numbers do not by themselves demonstrate that signed errors cancelled
     across strata; that is a plausible mechanism, not an observed one, and
     proving it needs an aligned per-bin decomposition nobody has run."

This module is that decomposition. It converts a plausible mechanism into a
measured quantity.

THE IDENTITY
------------
Production bins are FIXED equal-width intervals ([0,0.1), [0.1,0.2), ...), so
bin k denotes the same interval for every stratum. That alignment makes the
following an EXACT algebraic identity, not an approximation.

Write, for stratum s and bin k:
    n_s,k  = count            w_s,k = n_s,k / n_k       (share of bin k from s)
    d_s,k  = mean_p_s,k - obs_s,k                        (SIGNED gap)

Pooled bin k has mean forecast SUM_s w_s,k * mean_p_s,k and observed rate
SUM_s w_s,k * obs_s,k, so its signed gap is exactly SUM_s w_s,k * d_s,k, and:

    ECE_pooled       = SUM_k (n_k/N) * |SUM_s w_s,k * d_s,k|
    SUM_s w_s*ECE_s  = SUM_k (n_k/N) *  SUM_s w_s,k * |d_s,k|

Subtracting, term by term:

    SUM_s w_s*ECE_s - ECE_pooled
        = SUM_k (n_k/N) * [ SUM_s w_s,k|d_s,k| - |SUM_s w_s,k d_s,k| ]
        =: CANCELLATION

By the triangle inequality every bracketed term is >= 0, so CANCELLATION >= 0
always, and it is zero only when, within every bin, every stratum errs in the
same direction. It is therefore not a modelling assumption: it is the precise,
non-negative amount by which pooling flatters the calibration number.

WHAT THIS IS NOT
----------------
Not a fix, not a map, not a threshold change. It changes no gate, writes
nothing, and cannot make a red gate green. It tells an operator whether the
number the gate reads is load-bearing or flattered. Under AGENTS.md law 9 that
distinction is the whole point: a guard must never be weakened, but it must be
UNDERSTOOD.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Mapping, Sequence

from gsecal.metrics import Sample, confidence_buckets, expected_calibration_error

__all__ = [
    "StratumSummary",
    "BinCancellation",
    "StratifiedECEReport",
    "decompose_stratified_ece",
    "cancellation_from_summaries",
]

# Floating-point slack for the identity check. The identity is exact in real
# arithmetic; this is IEEE-754 accumulation noise only.
IDENTITY_TOLERANCE = 1e-9


@dataclass(frozen=True, slots=True)
class StratumSummary:
    """One stratum's headline numbers (a model version, a sport, a book...)."""

    name: str
    n: int
    ece: float
    weight: float

    @property
    def pct(self) -> float:
        return 100.0 * self.weight


@dataclass(frozen=True, slots=True)
class BinContribution:
    stratum: str
    count: int
    share_of_bin: float
    signed_gap: float


@dataclass(frozen=True, slots=True)
class BinCancellation:
    """Per-bin cancellation. `cancellation` is >= 0 by the triangle inequality."""

    index: int
    lower: float
    upper: float
    pooled_count: int
    pooled_mass: float
    pooled_signed_gap: float
    aligned_abs_gap: float
    contributors: tuple[BinContribution, ...] = field(default=())

    @property
    def pooled_abs_gap(self) -> float:
        return abs(self.pooled_signed_gap)

    @property
    def cancellation(self) -> float:
        """SUM_s w_s,k|d_s,k| - |SUM_s w_s,k d_s,k|, floored at 0 for fp noise."""
        return max(0.0, self.aligned_abs_gap - self.pooled_abs_gap)

    @property
    def weighted_cancellation(self) -> float:
        """This bin's contribution to total ECE cancellation."""
        return self.pooled_mass * self.cancellation

    @property
    def is_mixed_sign(self) -> bool:
        """True when strata in this bin disagree on the direction of the error."""
        signs = {1 if c.signed_gap > 0 else -1 if c.signed_gap < 0 else 0 for c in self.contributors if c.count}
        return len([s for s in signs if s != 0]) > 1


@dataclass(frozen=True, slots=True)
class StratifiedECEReport:
    bins: int
    total_n: int
    pooled_ece: float
    weighted_stratum_mean_ece: float
    strata: tuple[StratumSummary, ...]
    bin_detail: tuple[BinCancellation, ...]
    identity_residual: float

    @property
    def total_cancellation(self) -> float:
        """How much lower pooling makes ECE look. Always >= 0."""
        return max(0.0, self.weighted_stratum_mean_ece - self.pooled_ece)

    @property
    def cancellation_share(self) -> float:
        """Cancellation as a fraction of the honest (stratum-mean) figure."""
        if self.weighted_stratum_mean_ece <= 0:
            return 0.0
        return self.total_cancellation / self.weighted_stratum_mean_ece

    @property
    def identity_holds(self) -> bool:
        return abs(self.identity_residual) <= IDENTITY_TOLERANCE

    @property
    def worst_strata(self) -> tuple[StratumSummary, ...]:
        return tuple(sorted(self.strata, key=lambda s: s.ece, reverse=True))

    def pooled_below_every_stratum(self) -> bool:
        """The condition AGENTS.md flags: pooled lower than all of its parts."""
        return bool(self.strata) and all(s.ece > self.pooled_ece for s in self.strata)

    def floor_verdict(self, floor: float) -> str:
        """Plain statement of what the floor is really being cleared by."""
        pooled_passes = self.pooled_ece <= floor
        mean_passes = self.weighted_stratum_mean_ece <= floor
        if pooled_passes and not mean_passes:
            return (
                f"FLATTERED — pooled {self.pooled_ece:.4f} clears the {floor} floor but the "
                f"weighted stratum mean {self.weighted_stratum_mean_ece:.4f} does not. "
                f"{self.total_cancellation:.4f} of the margin is cross-stratum cancellation."
            )
        if pooled_passes and mean_passes:
            return (
                f"ROBUST — pooled {self.pooled_ece:.4f} and stratum mean "
                f"{self.weighted_stratum_mean_ece:.4f} both clear the {floor} floor."
            )
        return (
            f"FAILING — pooled {self.pooled_ece:.4f} does not clear the {floor} floor "
            f"(stratum mean {self.weighted_stratum_mean_ece:.4f})."
        )


def decompose_stratified_ece(
    strata: Mapping[str, Sequence[Sample]],
    bins: int = 10,
) -> StratifiedECEReport:
    """Full per-bin decomposition from raw settled rows, grouped by stratum.

    `strata` maps a stratum label (model version, sport, book, month) to that
    stratum's decided samples. Strata must be disjoint — each settled row
    belongs to exactly one — or the weights do not sum to 1 and the identity
    is meaningless.
    """
    labels = [k for k in strata if len(strata[k]) > 0]
    pooled: list[Sample] = [s for k in labels for s in strata[k]]
    total_n = len(pooled)

    if total_n == 0:
        return StratifiedECEReport(bins, 0, 0.0, 0.0, (), (), 0.0)

    pooled_ece = expected_calibration_error(pooled, bins)

    summaries = tuple(
        StratumSummary(
            name=label,
            n=len(strata[label]),
            ece=expected_calibration_error(strata[label], bins),
            weight=len(strata[label]) / total_n,
        )
        for label in labels
    )
    weighted_mean = sum(s.weight * s.ece for s in summaries)

    pooled_buckets = confidence_buckets(pooled, bins)
    per_stratum_buckets = {label: confidence_buckets(strata[label], bins) for label in labels}

    bin_detail: list[BinCancellation] = []
    for k, pooled_bucket in enumerate(pooled_buckets):
        n_k = pooled_bucket.count
        if n_k == 0:
            bin_detail.append(
                BinCancellation(
                    index=k,
                    lower=pooled_bucket.lower,
                    upper=pooled_bucket.upper,
                    pooled_count=0,
                    pooled_mass=0.0,
                    pooled_signed_gap=0.0,
                    aligned_abs_gap=0.0,
                    contributors=(),
                )
            )
            continue

        contributors: list[BinContribution] = []
        aligned = 0.0
        signed = 0.0
        for label in labels:
            sb = per_stratum_buckets[label][k]
            if sb.count == 0:
                continue
            share = sb.count / n_k
            d = sb.signed_gap
            aligned += share * abs(d)
            signed += share * d
            contributors.append(
                BinContribution(stratum=label, count=sb.count, share_of_bin=share, signed_gap=d)
            )

        bin_detail.append(
            BinCancellation(
                index=k,
                lower=pooled_bucket.lower,
                upper=pooled_bucket.upper,
                pooled_count=n_k,
                pooled_mass=n_k / total_n,
                pooled_signed_gap=signed,
                aligned_abs_gap=aligned,
                contributors=tuple(contributors),
            )
        )

    reconstructed = sum(b.weighted_cancellation for b in bin_detail)
    residual = (weighted_mean - pooled_ece) - reconstructed

    return StratifiedECEReport(
        bins=bins,
        total_n=total_n,
        pooled_ece=pooled_ece,
        weighted_stratum_mean_ece=weighted_mean,
        strata=summaries,
        bin_detail=tuple(bin_detail),
        identity_residual=residual,
    )


def cancellation_from_summaries(
    summaries: Sequence[tuple[str, int, float]],
    pooled_ece: float,
    bins: int = 10,
) -> StratifiedECEReport:
    """Total cancellation from headline figures alone: (label, n, ece) per stratum.

    Use when per-row data is not to hand but the per-stratum ECEs are recorded —
    for example the four model-version figures written down in AGENTS.md.

    The TOTAL is still exact (it is the same identity), but there is no per-bin
    attribution, so `bin_detail` is empty. Nothing here is estimated or modelled:
    weighted mean minus pooled IS the cancellation, given fixed shared bins and
    disjoint strata.
    """
    total_n = sum(n for _, n, _ in summaries)
    if total_n == 0:
        return StratifiedECEReport(bins, 0, pooled_ece, 0.0, (), (), 0.0)

    strata = tuple(
        StratumSummary(name=label, n=n, ece=ece, weight=n / total_n)
        for label, n, ece in summaries
    )
    weighted_mean = sum(s.weight * s.ece for s in strata)
    return StratifiedECEReport(
        bins=bins,
        total_n=total_n,
        pooled_ece=pooled_ece,
        weighted_stratum_mean_ece=weighted_mean,
        strata=strata,
        bin_detail=(),
        identity_residual=0.0,
    )
