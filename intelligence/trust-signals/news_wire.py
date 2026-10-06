# Provenance: x-intake-registry.md @mysportsupdate profile — "the event feed that should
# trigger re-runs of QB/coaching/OL profiles (new signings, injuries, depth-chart
# changes)"; TNF program Track 3 (trust-signal intake); reasoning-depth-spec §5
# (live signals feed the checklist). Verified in deep/c05/verified-claims.md §§2–3.
# Honesty: challenges.md C8 — materiality tiers are SPEC defaults, not research.
# Implements buildable-systems.md System 4.

"""News-wire intake: classify events, score materiality, emit profile re-run triggers.

Downstream pipelines (qb-behavioral, coaching-tendencies, OL) subscribe to triggers;
they never poll the intake. A trigger names WHAT to re-run, WHY, and HOW urgently.
"""

from __future__ import annotations

import hashlib
import re

from .classify import classify as _classify_text
from .classify import keyword_hits
from .entities import resolve_player, resolve_teams
from .models import (
    EventType,
    Materiality,
    NewsEvent,
    ProfileTrigger,
    RawItem,
    SignalType,
    Verification,
    utcnow,
)

# Materiality rules (SPEC defaults — challenges.md C8).
# Order matters: first match wins.
_HIGH = (
    "out for season", "season-ending", "torn acl", "ruptured",
    "starting qb", "starting quarterback", "head coach fired", "coach fired",
    "traded", "trade",  # major transactions move profiles
)
_MEDIUM = (
    "activated", "depth chart", "named the starter", "benched", "sign", "signed",
    "signing", "release", "released", "waive", "waived", "promoted", "ir",
    "injured reserve", "questionable", "doubtful", "limited practice",
    "did not practice",
)


def classify_event(text: str) -> tuple[EventType, Materiality]:
    """Event type + materiality for a wire item. Deterministic rules, INFERENCE."""
    sig = _classify_text(text)

    if sig == SignalType.INJURY:
        event_type = EventType.INJURY
    elif keyword_hits(text, ("sign", "signed", "signing", "trade", "traded",
                             "release", "released", "waive", "waived")) > 0:
        event_type = EventType.TRANSACTION
    elif keyword_hits(text, ("depth chart", "named the starter", "benched",
                             "activated", "promoted")) > 0:
        event_type = EventType.DEPTH_CHART
    elif sig == SignalType.SCHEME:
        event_type = EventType.SCHEME_QUOTE
    else:
        event_type = EventType.NARRATIVE

    if keyword_hits(text, _HIGH) > 0:
        materiality = Materiality.HIGH
    elif keyword_hits(text, _MEDIUM) > 0:
        materiality = Materiality.MEDIUM
    else:
        materiality = Materiality.LOW
    return event_type, materiality


def make_event(item: RawItem, roster: dict[str, str] | None = None) -> NewsEvent:
    """Build a NewsEvent from a raw wire item."""
    event_type, materiality = classify_event(item.raw_text)
    teams = tuple(resolve_teams(item.raw_text))
    players: tuple[str, ...] = ()
    if roster:
        pid, _name = resolve_player(item.raw_text, roster)
        players = (pid,) if pid else ()
    day = item.observed_at.strftime("%Y-%m-%d")
    event_id = hashlib.sha1(
        f"event|{item.source_handle}|{day}|{item.raw_text[:200]}".encode()
    ).hexdigest()[:16]
    verification = (
        Verification.SINGLE_SOURCE if item.url
        else Verification.INFERENCE
    )
    return NewsEvent(
        event_id=event_id,
        event_type=event_type,
        teams=teams,
        players=players,
        summary=item.raw_text[:280],
        source_url=item.url,
        observed_at=item.observed_at,
        materiality=materiality,
        verification=verification,
    )


# event_type → which profiles must re-run. The trigger target is filled per event.
_TRIGGER_MAP: dict[EventType, tuple[str, ...]] = {
    EventType.INJURY: ("qb_profile", "ol_state", "checklist_refresh"),
    EventType.TRANSACTION: ("qb_profile", "coaching_profile", "ol_state", "checklist_refresh"),
    EventType.DEPTH_CHART: ("qb_profile", "ol_state", "checklist_refresh"),
    EventType.SCHEME_QUOTE: ("coaching_profile", "checklist_refresh"),
    EventType.NARRATIVE: ("checklist_refresh",),
}


def _is_qb(pid: str, roster: dict[str, str] | None) -> bool:
    # The roster maps name → player_id; QB-ness comes from the caller's roster
    # metadata. Convention: player_ids ending in ":QB" are quarterbacks.
    return pid.endswith(":QB")


def _is_ol(pid: str) -> bool:
    return pid.endswith(":OL")


def triggers_for(
    event: NewsEvent,
    game: tuple[str, str] | None = None,
    roster: dict[str, str] | None = None,
) -> list[ProfileTrigger]:
    """Typed re-run triggers for a news event.

    game: optional (away, home) codes to scope checklist_refresh triggers.
    Only MEDIUM+ materiality emits profile triggers; LOW emits checklist_refresh
    only when it names a team (otherwise nothing — noise stays noise).
    """
    triggers: list[ProfileTrigger] = []
    now = utcnow()

    def add(t: str, target: str, reason: str) -> None:
        triggers.append(ProfileTrigger(
            trigger_type=t, target=target, reason=reason,
            event_id=event.event_id, materiality=event.materiality, created_at=now,
        ))

    if event.materiality == Materiality.LOW and not event.teams:
        return triggers  # pure noise: no team, no trigger

    for trigger_type in _TRIGGER_MAP[event.event_type]:
        if trigger_type == "qb_profile":
            # QB injuries/transactions re-run the QB profile; non-QB players
            # don't justify a full QB re-run — they refresh the checklist instead.
            qb_targets = [p for p in event.players if _is_qb(p, roster)]
            if qb_targets:
                for p in qb_targets:
                    add("qb_profile", p, f"{event.event_type.value}: {event.summary[:80]}")
            elif event.teams and event.materiality == Materiality.HIGH:
                for team in event.teams:
                    add("checklist_refresh", team, f"high-materiality {event.event_type.value}")
        elif trigger_type == "ol_state":
            ol_targets = [p for p in event.players if _is_ol(p)]
            if ol_targets or (event.teams and event.event_type == EventType.INJURY):
                for team in (event.teams or ("UNK",)):
                    add("ol_state", team, f"{event.event_type.value}: {event.summary[:80]}")
        elif trigger_type == "coaching_profile":
            for team in (event.teams or ("UNK",)):
                add("coaching_profile", team, f"{event.event_type.value}: {event.summary[:80]}")
        elif trigger_type == "checklist_refresh":
            if game:
                add("checklist_refresh", f"GAME:{game[0]}@{game[1]}",
                    f"{event.event_type.value}: {event.summary[:80]}")
            else:
                for team in (event.teams or ("UNK",)):
                    add("checklist_refresh", team, f"{event.event_type.value}: {event.summary[:80]}")
    return triggers
