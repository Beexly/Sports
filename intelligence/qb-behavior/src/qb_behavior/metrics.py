# Provenance: pure metric primitives.
# Implements: our-metric-stack.md baselines (1.867% INT/dropback, 0.640%
# fumble-lost/play, TWP 52.3% conversion); partition-01-qb.md Challenge A
# (empirical-Bayes shrinkage for pressure-to-sack toward ~18%); 1184 D/S/I
# audit (discrimination via variance decomposition); Wilson CIs per the
# Wilson-lower-bound falsification gate (AGENTS-history).
"""Pure, dependency-light metric primitives for the QB behavioral engine.

Every function here is a pure function of its inputs: no I/O, no global
state. That makes them unit-testable without data and reusable by c02's
split layer.
"""
from __future__ import annotations

import math
from typing import Iterable, Sequence


# ---------------------------------------------------------------------------
# Target concentration
# ---------------------------------------------------------------------------

def hhi(shares: Iterable[float]) -> float:
    """Herfindahl-Hirschman Index of target shares (0-1 scale).

    HHI = sum(share^2). Higher = more passes funneled to fewer receivers.
    The Rodgers trust-target-fixation template is quantified with this.
    """
    return sum(s * s for s in shares)


def target_shares(counts: dict[str, int]) -> dict[str, float]:
    """Receiver -> share of targets. Empty input -> empty dict."""
    total = sum(counts.values())
    if total <= 0:
        return {}
    return {k: v / total for k, v in counts.items()}


def top_k_share(shares: Sequence[float], k: int) -> float:
    """Sum of the k largest shares (top-1 / top-2 concentration)."""
    return sum(sorted(shares, reverse=True)[:k])


# ---------------------------------------------------------------------------
# Rates with uncertainty
# ---------------------------------------------------------------------------

def wilson_interval(k: int, n: int, z: float = 1.96) -> tuple[float, float]:
    """Wilson score interval for a binomial rate.

    Used per the Wilson-lower-bound falsification gate: a claim graduates
    only if its lower bound clears the bar, never on the point estimate.
    Returns (0.0, 0.0) for n == 0.
    """
    if n <= 0:
        return (0.0, 0.0)
    p = k / n
    denom = 1 + z * z / n
    center = p + z * z / (2 * n)
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return (max(0.0, (center - half) / denom), min(1.0, (center + half) / denom))


def eb_shrink(k: int, n: int, prior_mean: float, prior_n: float) -> float:
    """Empirical-Bayes shrinkage of a rate toward a prior.

    shrunk = (k + prior_mean * prior_n) / (n + prior_n).

    Challenge A (partition-01-qb.md): pressure-to-sack is wired ONLY in this
    shrunk form toward the ~18% league baseline. Raw single-season rates are
    never published as traits (Bryce Young 23.3%->10.5% on n=29-38/season is
    <2 sigma, consistent with noise).
    """
    if prior_n < 0:
        raise ValueError("prior_n must be >= 0")
    if n + prior_n <= 0:
        return prior_mean
    return (k + prior_mean * prior_n) / (n + prior_n)


def rate_per_100(k: int, n: int) -> float | None:
    """Rate per 100 attempts; None when there are no attempts."""
    if n <= 0:
        return None
    return 100.0 * k / n


# ---------------------------------------------------------------------------
# Baselines from the metric bible (verified by recomputation, partition-04)
# ---------------------------------------------------------------------------

INT_BASELINE_PER_DROPBACK = 0.01867   # 1.867% — recomputed 1.8666% from defense_detail_2025.csv
FUMBLE_LOST_BASELINE_PER_PLAY = 0.00640  # 0.640% — recomputed 0.6396%
TWP_FLAG_RATE = 0.030                 # ~3.0% of dropbacks flagged interception-worthy (FTN, 2025)
TWP_TO_INT_CONVERSION = 0.523         # 52.3% of flagged throws became actual INTs
P2S_LEAGUE_BASELINE = 0.18            # ~18% pressure-to-sack, flat league-wide
P2S_SHRINK_PRIOR_N = 40               # EB prior strength (80/40-style shrinkage family)


def expected_ints(dropbacks: int, twp_rate: float | None = None) -> float:
    """Expected INTs = baseline x dropbacks, or TWP-informed when available.

    Prefers the TWP path (partition-01-qb.md S3: raw INT count is the wrong
    target, TWP is the signal): expected = twp_rate * TWP_TO_INT_CONVERSION
    * dropbacks, blended with the 1.867% prior. Falls back to the pure
    baseline when no TWP data is wired (FTN charting is the S6 gap).
    """
    base = INT_BASELINE_PER_DROPBACK * dropbacks
    if twp_rate is None:
        return base
    twp_path = twp_rate * TWP_TO_INT_CONVERSION * dropbacks
    # Blend: trust the measured TWP rate, keep the baseline as a floor prior.
    return 0.7 * twp_path + 0.3 * base


def int_luck(actual_ints: int, dropbacks: int, twp_rate: float | None = None) -> float:
    """INT luck = actual - expected. Positive = unlucky (more picks than the
    process deserved); negative = lucky. Mean-reverts (INT-luck ledger:
    LAC +7.11, CHI +7.22, NYJ -10.08)."""
    return actual_ints - expected_ints(dropbacks, twp_rate)


# ---------------------------------------------------------------------------
# EPA / efficiency
# ---------------------------------------------------------------------------

def epa_mean(epa_values: Sequence[float | None]) -> float:
    """Mean EPA over a play list; None values dropped; empty -> 0.0."""
    vals = [v for v in epa_values if v is not None]
    if not vals:
        return 0.0
    return sum(vals) / len(vals)


def rolling_mean(values: Sequence[float], window: int) -> list[float | None]:
    """Trailing rolling mean; entries before the window fills are None.

    The form feature (partition-01-qb.md #1): 16-game rolling EPA/dropback.
    """
    out: list[float | None] = []
    for i in range(len(values)):
        if i + 1 < window:
            out.append(None)
        else:
            w = values[i + 1 - window:i + 1]
            out.append(sum(w) / len(w))
    return out


# ---------------------------------------------------------------------------
# Depth / aggressiveness (public proxy; NGS true aggressiveness is internal-only)
# ---------------------------------------------------------------------------

def adot(air_yards: Sequence[float | None]) -> float | None:
    """Average depth of target. None when no attempts."""
    vals = [v for v in air_yards if v is not None]
    if not vals:
        return None
    return sum(vals) / len(vals)


def deep_rate(air_yards: Sequence[float | None], threshold: float = 10.0) -> float | None:
    """Share of attempts traveling >= threshold air yards."""
    vals = [v for v in air_yards if v is not None]
    if not vals:
        return None
    return sum(1 for v in vals if v >= threshold) / len(vals)


# ---------------------------------------------------------------------------
# Stability audit (D/S/I per 1184; Minerva-style gating per 2048)
# ---------------------------------------------------------------------------

def discrimination(group_means: Sequence[float]) -> float:
    """D ~ between-group variance share: var(means) / (var(means) + mean within
    noise proxy). Simplified: normalized variance of group means. Flags D<0.5
    metrics for shrinkage/removal (1184)."""
    vals = [v for v in group_means if v is not None]
    if len(vals) < 2:
        return 0.0
    m = sum(vals) / len(vals)
    var = sum((v - m) ** 2 for v in vals) / len(vals)
    # Normalize by a unit-scale reference so D is in [0, 1)-ish.
    return var / (var + 1.0)


def small_sample_flag(n: int, threshold: int = 30) -> bool:
    """True when n < threshold: slate read, not a profile input (Challenge M).

    The pipeline's hard minimum stays 100 dropbacks; this flags the softer
    n<30 band where even directional reads are dangerous.
    """
    return n < threshold
