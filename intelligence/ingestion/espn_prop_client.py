"""ESPN core-API prop intake — keyless DraftKings player-prop lines.

The per-play priced margin the VISION-CONTRACT falsifier needs. Discovered
live this cycle: the ESPN core API carries a DraftKings prop board per game
(1,375 lines for game 401872995), including open->current line movement and
athlete references. No key, no paid feed, no rights gate beyond the site's
public terms (same class as the scoreboard/pickcenter data already ingested).

What this client does:
  - fetch the full prop board for one event (paginated)
  - resolve athlete refs -> names/teams (cached)
  - emit normalized PropLineRecord-shaped dicts (line, open_line, market,
    athlete id/name, asOf) compatible with the propline-intake contract

What it does NOT do:
  - no over/under prices (the core API exposes line targets only) — the
    falsifier comparison therefore runs location-vs-location with market sd
    from realized errors, the same construction as the totals harness.
  - no persistence into game_signals/scoring — research artifacts only.
"""
from __future__ import annotations

import json
import time
import urllib.request
from pathlib import Path

CORE = "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl"
UA = {"User-Agent": "Mozilla/5.0"}


def _get(url: str, timeout: int = 30) -> dict:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def prop_board(event_id: str, max_pages: int = 80, sleep: float = 0.2) -> list[dict]:
    """Full DK prop board for one ESPN event id."""
    base = (f"{CORE}/events/{event_id}/competitions/{event_id}"
            f"/odds/100/propBets?lang=en&region=us")
    items, page = [], 1
    while page <= max_pages:
        sep = "&" if "?" in base else "?"
        try:
            d = _get(f"{base}{sep}page={page}")
        except Exception:
            break
        chunk = d.get("items", [])
        if not chunk:
            break
        items.extend(chunk)
        if page >= (d.get("pageCount") or 1):
            break
        page += 1
        time.sleep(sleep)
    return items


def athlete_name(season: int, athlete_id: str, cache: dict | None = None) -> str | None:
    c = cache or {}
    key = f"{season}:{athlete_id}"
    if key in c:
        return c[key]
    try:
        a = _get(f"{CORE}/seasons/{season}/athletes/{athlete_id}?lang=en&region=us")
        name = a.get("displayName")
    except Exception:
        name = None
    c[key] = name
    return name


def normalize(items: list[dict], season: int = 2026,
              cache: dict | None = None) -> list[dict]:
    """PropLineRecord-shaped rows (line + open line + asOf), one per (athlete,
    market, target). Milestone rows carry threshold targets — flagged."""
    out = []
    for p in items:
        t = p.get("type", {})
        cur = (p.get("current") or {}).get("target") or {}
        op = (p.get("open") or {}).get("target") or {}
        ath_ref = (p.get("athlete") or {}).get("$ref", "")
        ath_id = ath_ref.split("/athletes/")[-1].split("?")[0] if ath_ref else None
        out.append({
            "eventId": p.get("competition", {}).get("$ref", "").split("/events/")[-1].split("?")[0],
            "playerId": ath_id,
            "playerName": athlete_name(season, ath_id, cache) if ath_id else None,
            "propMarket": t.get("name"),
            "line": cur.get("value"),
            "openLine": op.get("value"),
            "lineMoved": (cur.get("value") != op.get("value")),
            "asOf": p.get("lastUpdated"),
            "source": "espn_core_dk",
        })
    return out


def fetch_event_props(event_id: str, season: int = 2026) -> dict:
    items = prop_board(event_id)
    cache: dict = {}
    rows = normalize(items, season, cache)
    return {"eventId": event_id, "count": len(rows), "lines": rows}
