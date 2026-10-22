"""Refuse a live injury pull before Friday 18:00 ET. Reading a committed file is not a pull."""
from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

ET = ZoneInfo("America/New_York")


class InjuryNotPublished(Exception):
    def __init__(self, week: int, reason: str):
        self.week = week
        super().__init__(reason)


def require_injury_published(week: int, now: datetime, friday: datetime) -> None:
    """Raise if `now` is before `friday` 18:00 ET.

    The caller supplies the Friday for that NFL week. This function does not
    guess the calendar.
    """
    if now.tzinfo is None or friday.tzinfo is None:
        raise ValueError("now and friday must be timezone-aware")
    cutoff = friday.astimezone(ET).replace(hour=18, minute=0, second=0, microsecond=0)
    if now.astimezone(ET) < cutoff:
        raise InjuryNotPublished(
            week,
            f"week {week} injury report is not published before Friday 18:00 ET ({cutoff.isoformat()}). Do not pull.",
        )
