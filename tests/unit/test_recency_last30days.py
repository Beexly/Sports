"""Unit tests for bitemporal 30-day recency signal decay."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from gse_engine.ingestion.recency_last30days import (
    TemporalTrendObservation,
    compute_last30days_trend,
)


def test_last30days_trend_enforces_anti_lookahead_and_decay() -> None:
    """Drops future/stale rows and weights recent high-authority signals higher."""
    as_of = datetime(2026, 11, 15, 18, 0, tzinfo=UTC)
    observations = [
        TemporalTrendObservation(
            source_id="inj-recent",
            source_tier="OFFICIAL_INJURY",
            observed_utc=as_of - timedelta(days=1),
            metric_delta=0.12,
            sample_snaps=100,
        ),
        TemporalTrendObservation(
            source_id="mkt-older",
            source_tier="PUBLIC_MARKET",
            observed_utc=as_of - timedelta(days=20),
            metric_delta=-0.10,
            sample_snaps=40,
        ),
        TemporalTrendObservation(
            source_id="stale-45d",
            source_tier="CHARTING_L4",
            observed_utc=as_of - timedelta(days=45),
            metric_delta=-0.99,
            sample_snaps=150,
        ),
        TemporalTrendObservation(
            source_id="future-leak",
            source_tier="OFFICIAL_INJURY",
            observed_utc=as_of + timedelta(hours=3),
            metric_delta=-0.99,
            sample_snaps=150,
        ),
    ]

    summary = compute_last30days_trend(observations, as_of_utc=as_of)
    assert summary.effective_observations == 2
    assert summary.dropped_future_or_stale == 2
    assert summary.dominant_tier == "OFFICIAL_INJURY"
    assert summary.weighted_delta > 0.08
