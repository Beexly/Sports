# Provenance: corpus-intelligence/intake/x-intake-registry.md (registry table, priority
# tiers, monitoring spec — all verified in deep/c05/verified-claims.md §2).
# Implements buildable-systems.md System 1 (source registry + check scheduler).
# Honesty labels: @matt_barlowe is PENDING_VERIFICATION (challenges.md C5) and is
# excluded from active checks; @the_waldman follower counts etc. carry provenance gaps.

"""Monitored X sources + check scheduler.

Cadences implement the registry's monitoring spec:
- Tier 1 (daily): morning + evening during the season.
- Tier 2 (weekly): Saturday pre-slate + Monday recap.
- Tier 3 (event-driven): only when triggered (disputed call / primetime controversy).
- Tier 4 (verify): monthly; resolve the provenance gap, then promote or demote.
"""

from __future__ import annotations

from datetime import datetime, timedelta

from .models import (
    CheckCadence,
    SourceRecord,
    SourceStatus,
    TrackTag,
    TrustTier,
)

# In-season check intervals (registry: daily tier runs morning + evening).
IN_SEASON_INTERVALS: dict[CheckCadence, timedelta] = {
    CheckCadence.DAILY: timedelta(hours=12),
    CheckCadence.WEEKLY: timedelta(days=3),      # Sat pre-slate + Mon recap
    CheckCadence.EVENT_DRIVEN: timedelta.max,    # never due without a trigger
    CheckCadence.MONTHLY_VERIFY: timedelta(days=30),
}

# Off-season: news slows; daily sources drop to every 3 days, weekly to weekly.
OFF_SEASON_INTERVALS: dict[CheckCadence, timedelta] = {
    CheckCadence.DAILY: timedelta(days=3),
    CheckCadence.WEEKLY: timedelta(days=7),
    CheckCadence.EVENT_DRIVEN: timedelta.max,
    CheckCadence.MONTHLY_VERIFY: timedelta(days=30),
}


SOURCES: tuple[SourceRecord, ...] = (
    SourceRecord(
        handle="@throwthedamball",
        display_name="Judah Fortgang",
        lane="Betting analytics + OL charting (PFF; ex-SIG trader)",
        primary_track=TrackTag.OL,
        priority=1,
        trust_tier=TrustTier.T2_BEAT,
        cadence=CheckCadence.DAILY,
        notes="Guard/center 1-on-1 island-rate charting series; betting-process philosophy. "
              "Feeds Garrett's hierarchy layer 1 (OL).",
        provenance="twstalker mirror + muckrack + throwthedamball.com; follower count ~65 days old",
    ),
    SourceRecord(
        handle="@mysportsupdate",
        display_name="Ari Meirov",
        lane="NFL breaking news (transactions, injuries, signings)",
        primary_track=TrackTag.NEWS,
        priority=1,
        trust_tier=TrustTier.T2_BEAT,
        cadence=CheckCadence.DAILY,
        notes="News-wire intake: the event feed that triggers profile re-runs "
              "(new signings, injuries, depth-chart changes).",
        provenance="twstalker/xstalk/instalker mirrors; speed vs Schefter/Rapoport NOT benchmarked",
    ),
    SourceRecord(
        handle="@the_waldman",
        display_name="Daniel Waldman",
        lane="Game sims + half-PPR projections, every game",
        primary_track=TrackTag.QB_BEHAVIOR,
        priority=2,
        trust_tier=TrustTier.T3_NATIONAL,
        cadence=CheckCadence.WEEKLY,
        notes="Independent modeler; sim-vs-Vegas prop divergences are market-intelligence "
              "signals. Self-reported +11.6 units UNVERIFIED.",
        provenance="twstalker mirror 2026-10-01; exact TNF post (2105678944465027107) 403 — "
                   "content inferred, marked as inference",
    ),
    SourceRecord(
        handle="@doug_clawson",
        display_name="Doug Clawson",
        lane="Historical NFL statistical comps (CBS Sports researcher)",
        primary_track=TrackTag.QB_BEHAVIOR,
        priority=2,
        trust_tier=TrustTier.T2_BEAT,
        cadence=CheckCadence.WEEKLY,
        notes="Evergreen historical comps; check weekly for new comps on active QB storylines.",
        provenance="buzzsumo + espnfrontrow + mirrors; mirror post dates approximate",
    ),
    SourceRecord(
        handle="@shauncore",
        display_name="Shaun Newkirk",
        lane="All-22 film breakdowns (officiating/formation)",
        primary_track=TrackTag.SCHEME,
        priority=3,
        trust_tier=TrustTier.T2_BEAT,
        cadence=CheckCadence.EVENT_DRIVEN,
        notes="Check after primetime games with disputed calls. Thinnest profile — "
              "only 2023 content recovered.",
        provenance="PROVENANCE-GAP: no 2024-2026 activity verified; confirm account still active",
    ),
    SourceRecord(
        handle="@matt_barlowe",
        display_name="Matthew Barlowe",
        lane="UNCONFIRMED — sports-analytics builder (NWHL scraper)",
        primary_track=TrackTag.OTHER,
        priority=4,
        trust_tier=TrustTier.T4_AGGREGATE,
        cadence=CheckCadence.MONTHLY_VERIFY,
        status=SourceStatus.PENDING_VERIFICATION,
        notes="No football lane confirmed. Resolve via live-browser lane; promote or demote. "
              "NOT an intelligence source until verified.",
        provenance="PROVENANCE-GAP: identity from twstalker + GitHub; no football content recovered",
    ),
)


def get_source(handle: str) -> SourceRecord:
    for s in SOURCES:
        if s.handle == handle:
            return s
    raise KeyError(f"unknown source handle: {handle}")


def active_sources() -> list[SourceRecord]:
    """Sources eligible for intake checks. PENDING_VERIFICATION sources are excluded."""
    return [s for s in SOURCES if s.status == SourceStatus.ACTIVE]


def due_for_check(
    source: SourceRecord,
    now: datetime,
    last_check: datetime | None,
    in_season: bool = True,
    event_trigger: bool = False,
) -> bool:
    """True when the source should be checked now, per registry cadence.

    Event-driven sources are due only when event_trigger=True (e.g. a disputed
    call in a primetime game). PENDING_VERIFICATION sources follow their own
    monthly cadence but never feed the signal pipeline.
    """
    if source.cadence == CheckCadence.EVENT_DRIVEN:
        return event_trigger
    intervals = IN_SEASON_INTERVALS if in_season else OFF_SEASON_INTERVALS
    if last_check is None:
        return True
    return (now - last_check) >= intervals[source.cadence]
