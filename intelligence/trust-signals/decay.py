# Provenance: beat-desk spec Layer 3 (2026-09-13-beat-desk-prop-alignment-context-matrix-v5.3.0.md,
# line 68: "freshness decay (half-life ~24–48h; injury news decays slower, motivational
# quotes faster)"). Verified in deep/c05/verified-claims.md §1.
# Honesty: challenges.md C2 — the half-lives are hand-set SPEC defaults, not fitted
# values. All of them live in HALF_LIVES so they can be tuned without touching code.

"""Freshness decay for trust signals.

weight(t) = magnitude * 0.5 ** (age_hours / half_life_hours)

Injury news decays slowest (a starter's torn ACL matters all week); motivational
quotes decay fastest (a Tuesday quote is noise by Sunday). Everything else sits
on the spec's 24–48h baseline.
"""

from __future__ import annotations

from datetime import datetime

from .models import SignalType


def age_hours(observed_at: datetime, now: datetime) -> float:
    """Hours between two datetimes. Naive inputs are coerced to UTC; future-dated
    observations (clock skew) count as age 0, not negative."""
    if observed_at.tzinfo is None:
        from datetime import timezone
        observed_at = observed_at.replace(tzinfo=timezone.utc)
    if now.tzinfo is None:
        from datetime import timezone
        now = now.replace(tzinfo=timezone.utc)
    return max(0.0, (now - observed_at).total_seconds() / 3600.0)

# SPEC defaults. Tune from backtest, not from vibes — see challenges.md C2.
HALF_LIVES: dict[SignalType, float] = {
    SignalType.INJURY: 72.0,                 # injury decays slower than baseline
    SignalType.LINEUP: 48.0,
    SignalType.SCHEME: 48.0,
    SignalType.WEATHER: 24.0,                # weather is game-day scoped
    SignalType.OFF_FIELD: 48.0,
    SignalType.MOTIVATION: 12.0,             # motivational quotes decay fastest
    SignalType.TRUST_QUOTE: 36.0,
    SignalType.PROJECTION_DIVERGENCE: 48.0,  # sims refresh weekly
    SignalType.HISTORICAL_COMP: 168.0,       # historical comps barely decay
    # --- c06 v1.1.0 extension (SPEC defaults, not fitted — same honesty rule) ---
    SignalType.TRUST_UP: 36.0,               # quote-like trust signals
    SignalType.TRUST_DOWN: 36.0,
    SignalType.FRUSTRATION: 24.0,            # heat fades faster (INFERENCE)
    SignalType.PRAISE_UNPROMPTED: 36.0,
    SignalType.ROLE_INCREASE: 48.0,          # depth-chart news, like LINEUP
    SignalType.ROLE_DECREASE: 48.0,
    SignalType.EXPERT_DISAGREEMENT: 48.0,    # like PROJECTION_DIVERGENCE
    SignalType.NEWS_CONFLICT: 24.0,          # conflicts resolve fast
    SignalType.RETRACTION: 168.0,            # retractions are permanent record
}


def half_life(signal_type: SignalType) -> float:
    return HALF_LIVES[signal_type]


def decayed_weight(
    magnitude: float,
    signal_type: SignalType,
    observed_at: datetime,
    now: datetime,
) -> float:
    """Freshness-decayed weight. Future-dated observations (clock skew) are
    treated as age 0, not negative decay."""
    age = age_hours(observed_at, now)
    return round(magnitude * (0.5 ** (age / HALF_LIVES[signal_type])), 6)


def is_stale(
    signal_type: SignalType,
    observed_at: datetime,
    now: datetime,
    max_half_lives: float = 4.0,
) -> bool:
    """True when the signal has decayed past usefulness (default: 4 half-lives,
    i.e. <6.25% of original weight). Stale signals stay in the store — they are
    history, not garbage — but the provider sorts them to the bottom."""
    age = age_hours(observed_at, now)
    return age > max_half_lives * HALF_LIVES[signal_type]
