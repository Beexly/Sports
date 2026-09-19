"""Resolve sport keys when export stores Prisma sport ids (CUID) instead of NFL/NCAAF."""

from __future__ import annotations

import re
from typing import Any

ESPN_SPORT = {
    "nfl": "NFL",
    "ncaaf": "NCAAF",
    "college-football": "NCAAF",
    "mlb": "MLB",
    "nba": "NBA",
    "ncaab": "NCAAB",
    "nhl": "NHL",
    "mls": "MLS",
    "soccer": "MLS",
    "wnba": "WNBA",
}

KNOWN = {"NFL", "NCAAF", "MLB", "NBA", "NCAAB", "NHL", "MLS", "WNBA", "CFB", "EPL"}

CUID_RE = re.compile(r"^[A-Za-z0-9]{20,}$")


def looks_like_cuid(s: str) -> bool:
    return bool(CUID_RE.match(s or ""))


def resolve_sport(raw_sport: Any, espn_event_id: Any = None, selection: Any = None) -> str:
    s = (str(raw_sport) if raw_sport is not None else "").strip().upper()
    if s in KNOWN:
        return "NCAAF" if s == "CFB" else s
    if espn_event_id:
        e = str(espn_event_id).lower()
        # espn:ncaaf:401... or espn nfl
        m = re.search(r"espn:([a-z0-9-]+):", e)
        if m:
            key = ESPN_SPORT.get(m.group(1))
            if key:
                return key
        for k, v in ESPN_SPORT.items():
            if f":{k}:" in e or e.endswith(k):
                return v
    # selection heuristics only as last resort — labeled by caller if needed
    return s if s and not looks_like_cuid(s) else "UNKNOWN"
