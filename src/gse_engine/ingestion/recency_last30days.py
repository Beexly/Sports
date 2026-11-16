"""Bitemporal 30-day recency signal decay inspired by mvanhorn/last30days-skill."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime
from typing import Literal

SignalSourceTier = Literal[
    "OFFICIAL_INJURY",
    "CHARTING_L4",
    "BEAT_REPORTER",
    "PUBLIC_MARKET",
]

_TIER_AUTHORITY: dict[SignalSourceTier, float] = {
    "OFFICIAL_INJURY": 1.0,
    "CHARTING_L4": 0.9,
    "BEAT_REPORTER": 0.75,
    "PUBLIC_MARKET": 0.5,
}


@dataclass(frozen=True, slots=True)
class TemporalTrendObservation:
    """Single timestamped signal observation evaluated over a trailing 30d window."""

    source_id: str
    source_tier: SignalSourceTier
    observed_utc: datetime
    metric_delta: float
    sample_snaps: int = 1


@dataclass(frozen=True, slots=True)
class RecencyTrendSummary:
    """Authority- and recency-weighted signal synthesis free of future leakage."""

    weighted_delta: float
    effective_observations: int
    dropped_future_or_stale: int
    dominant_tier: str


def compute_last30days_trend(
    observations: Sequence[TemporalTrendObservation],
    as_of_utc: datetime,
    half_life_days: float = 7.0,
    window_days: float = 30.0,
) -> RecencyTrendSummary:
    """Synthesizes trailing 30-day signals with exponential time decay and tier weights."""
    if half_life_days <= 0.0:
        raise ValueError("half_life_days must be positive.")
    if window_days <= 0.0:
        raise ValueError("window_days must be positive.")

    weighted_sum = 0.0
    total_weight = 0.0
    kept = 0
    dropped = 0
    tier_weights: dict[str, float] = {}

    for obs in observations:
        age_seconds = (as_of_utc - obs.observed_utc).total_seconds()
        if age_seconds < 0.0:
            dropped += 1
            continue
        age_days = age_seconds / 86400.0
        if age_days > window_days:
            dropped += 1
            continue

        decay = 0.5 ** (age_days / half_life_days)
        authority = _TIER_AUTHORITY[obs.source_tier]
        snap_scale = min(3.0, max(1.0, obs.sample_snaps / 50.0))
        weight = decay * authority * snap_scale

        weighted_sum += obs.metric_delta * weight
        total_weight += weight
        kept += 1
        tier_weights[obs.source_tier] = tier_weights.get(obs.source_tier, 0.0) + weight

    if total_weight <= 0.0 or kept == 0:
        return RecencyTrendSummary(
            weighted_delta=0.0,
            effective_observations=0,
            dropped_future_or_stale=dropped,
            dominant_tier="NONE",
        )

    dominant_tier = max(tier_weights.items(), key=lambda item: item[1])[0]
    return RecencyTrendSummary(
        weighted_delta=round(weighted_sum / total_weight, 6),
        effective_observations=kept,
        dropped_future_or_stale=dropped,
        dominant_tier=dominant_tier,
    )
