# Provenance: x-intake-registry.md monitoring spec — "What to check: each account's recent
# posts (last N since previous check) via the X API or a mirror fallback chain
# (twstalker → xstalk → instalker). X direct fetch is blocked from this environment."
# Verified in deep/c05/verified-claims.md §2.
# Honesty: challenges.md C4 — no working X client ships. The seam is the deliverable:
# production needs an X-accessible environment (X API key or Garrett's session).

"""Source fetch seam.

Production fetching needs an X-accessible environment (X API key, Garrett's browser
session, or a working mirror). This module defines the seam — SourceFetcher ABC —
plus FixtureFetcher for tests and offline development. MirrorFetcher documents the
fallback chain; it is a stub until mirror access is verified from the runtime env.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime

from .models import RawItem, SourceRecord


class SourceFetcher(ABC):
    """Fetch raw items for a source since a timestamp."""

    @abstractmethod
    def fetch_since(self, source: SourceRecord, since: datetime) -> list[RawItem]:
        ...


class FixtureFetcher(SourceFetcher):
    """In-memory fetcher for tests / offline runs."""

    def __init__(self, items: list[RawItem] | None = None):
        self._items = items or []

    def add(self, item: RawItem) -> None:
        self._items.append(item)

    def fetch_since(self, source: SourceRecord, since: datetime) -> list[RawItem]:
        return [
            i for i in self._items
            if i.source_handle == source.handle and i.observed_at >= since
        ]


class MirrorFetcher(SourceFetcher):
    """STUB: twstalker → xstalk → instalker fallback chain.

    The intake subagent (2026-10-01) recovered profile/post content through these
    mirrors because X direct fetch is blocked from this environment. A production
    implementation tries each mirror in order, marks items fetched from mirrors
    as SINGLE_SOURCE, and logs PROVENANCE-GAP + moves on when all fail (registry
    rule). Not implemented here: mirror HTML parsing needs verification against
    the live mirrors from the runtime environment.
    """

    MIRRORS = ("twstalker", "xstalk", "instalker")

    def fetch_since(self, source: SourceRecord, since: datetime) -> list[RawItem]:
        raise NotImplementedError(
            "MirrorFetcher is a stub: verify mirror access from the runtime "
            "environment, then implement per-mirror parsing. Until then, items "
            "enter through FixtureFetcher or a future X API client."
        )
