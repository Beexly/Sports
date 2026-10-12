"""
Real price feed for the props / SGP stack — keyless ESPN (the Galaxy path).

WHY THIS EXISTS
---------------
Until now every price-shaped input in this stack was either illustrative or a
line with no juice on it:

  * `intelligence/sgp/price_from_measured_correlations.py` prices the measured
    correlation matrix against ILLUSTRATIVE marginals and no book price at all.
  * `intelligence/props/prop_discrepancy_engine.py` implements multiplicative
    and Shin (1993) de-vigging, complete and unit-tested — and unexercised on
    real data, because its input sheets carry line values and no prices, and
    the sheets themselves are not on this branch.

The repo already has a keyless price path on the TypeScript side:
`packages/data-ingestion/src/espn-odds-client.ts` reads the DraftKings block
ESPN relays inline in its public scoreboard JSON (registry id
``galaxy-espn-inline``, ledger F-35) and refuses to invent a quote it was not
given. This module is the Python mirror of that path, so the Python engines
consume the same real prices under the same law:

  * keyless — no vendor key, no Odds API, no spend;
  * never invent a price — a market ESPN does not quote stays ``None`` and the
    game is flagged incomplete rather than completed by assumption;
  * provenance is part of the data — every record carries the source id, the
    endpoint, the provider ESPN reports, and the fetch timestamp.

WHAT IT RETURNS
---------------
One record per game: the two-way American prices exactly as quoted (moneyline,
spread, total), the de-vigged fair probabilities from the props engine's own
`devig_two_way` (Shin by default, multiplicative beside it), the booksum and
Shin z per market, and the implied team totals — the last being pure arithmetic
on the quoted total and spread:  home = (total - spread_home) / 2.

The parser is a pure function of the payload; only `fetch_scoreboard` touches
the network, so everything downstream is testable offline against a captured
fixture (see `fixtures/`).

Usage
-----
    python -m intelligence.props.real_price_feed            # live, prints JSON
    python -m intelligence.props.real_price_feed --dates 20261012
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from intelligence.props.prop_discrepancy_engine import devig_two_way  # noqa: E402

#: Registry id of the keyless ESPN path, identical to the TS client's
#: GALAXY_ESPN_INLINE_SOURCE_ID — one source, one name, two runtimes.
SOURCE_ID = "galaxy-espn-inline"

#: The endpoint the TS client prefers first (site.web.api); the core APIs are
#: Akamai-blocked from some hosts and are not needed — the inline odds block
#: rides in this payload.
SCOREBOARD_URL = (
    "https://site.web.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"
)

FETCH_TIMEOUT_S = 10.0
_USER_AGENT = "gse-real-price-feed/1.0 (keyless public ESPN JSON; low volume)"


# ---------------------------------------------------------------------------
# Fetch (the only network in the module)
# ---------------------------------------------------------------------------

def fetch_scoreboard(dates: Optional[str] = None, timeout: float = FETCH_TIMEOUT_S) -> dict:
    """
    GET the keyless ESPN NFL scoreboard. ``dates`` is ESPN's YYYYMMDD filter;
    None takes ESPN's default board (today's slate, including tonight's game).
    """
    url = SCOREBOARD_URL if dates is None else f"{SCOREBOARD_URL}?dates={dates}"
    req = urllib.request.Request(url, headers={"User-Agent": _USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# ---------------------------------------------------------------------------
# Parsing (pure)
# ---------------------------------------------------------------------------

def _american(value: object) -> Optional[int]:
    """
    Parse an American price ('-175', '+145', -110) — None when absent/invalid.

    Strictly integral. An American price is a whole number, so a non-integral
    value ('105.5', 105.5) is malformed data and is REJECTED (None), never
    rounded: the previous int(float(text)) silently truncated 105.5 to 105,
    manufacturing a price ESPN never quoted. Integral floats (-175.0) are
    accepted — the value is a clean integer even if the encoding is not.
    """
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        f = float(value)
    else:
        text = str(value).strip().replace("+", "")
        if not text:
            return None
        try:
            f = float(text)
        except ValueError:
            return None
    if not f.is_integer():
        return None
    n = int(f)
    return n if n != 0 else None


def _line_float(value: object) -> Optional[float]:
    """Parse a line ('-3.5', 'o54.5', 'u54.5', 54.5) — None when absent/invalid."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().lower().lstrip("ou")
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


@dataclass
class GamePrices:
    """One game's real two-way prices, exactly as quoted — nothing filled in."""

    event_id: str
    name: str
    commence_time: Optional[str]
    state: str  # ESPN status: pre / in / post
    home_team: str
    away_team: str
    home_abbr: str
    away_abbr: str
    provider: Optional[str]
    moneyline: Dict[str, Optional[int]]  # {"home": -175, "away": 145}
    spread: Dict[str, Optional[float]]  # {"point_home": -3.5, "home": -102, "away": -118}
    total: Dict[str, Optional[float]]  # {"point": 54.5, "over": -118, "under": -102}

    @property
    def complete(self) -> bool:
        """True only when all three markets carry BOTH sides' real prices."""
        return (
            self.moneyline["home"] is not None
            and self.moneyline["away"] is not None
            and self.spread["point_home"] is not None
            and self.spread["home"] is not None
            and self.spread["away"] is not None
            and self.total["point"] is not None
            and self.total["over"] is not None
            and self.total["under"] is not None
        )

    def implied_team_totals(self) -> Optional[Dict[str, float]]:
        """
        Pure arithmetic on the quoted total and home spread:
        home = (total - spread_home) / 2, away = (total + spread_home) / 2.
        None when either input is missing — never estimated.
        """
        total = self.total["point"]
        spread_home = self.spread["point_home"]
        if total is None or spread_home is None:
            return None
        return {"home": (total - spread_home) / 2.0, "away": (total + spread_home) / 2.0}


def _close(block: dict, side: str) -> dict:
    side_block = block.get(side) or {}
    return side_block.get("close") or {}


def _select_odds_block(odds_blocks: List[dict]) -> dict:
    """
    Pick the odds block to parse when ESPN relays several books.

    The repo's price law is DraftKings — the TS client reads the DraftKings
    block — so prefer the block whose provider is DraftKings (ESPN spells it
    "Draft Kings"; match case/space-insensitively) and fall back to the first
    block when no DraftKings block is present. Either way the chosen block's
    provider is what lands in the record's provenance.
    """
    for block in odds_blocks:
        provider = block.get("provider") or {}
        raw = provider.get("name") or provider.get("displayName") or ""
        if "".join(str(raw).lower().split()) == "draftkings":
            return block
    return odds_blocks[0] if odds_blocks else {}


def parse_game(event: dict) -> Optional[GamePrices]:
    """Parse one ESPN scoreboard event into GamePrices (None when malformed)."""
    competitions = event.get("competitions") or []
    if not competitions:
        return None
    comp = competitions[0]
    competitors = comp.get("competitors") or []
    home = next((c for c in competitors if c.get("homeAway") == "home"), None)
    away = next((c for c in competitors if c.get("homeAway") == "away"), None)
    if home is None or away is None:
        return None

    odds_blocks = comp.get("odds") or []
    odds = _select_odds_block(odds_blocks)

    ml = odds.get("moneyline") or {}
    ps = odds.get("pointSpread") or {}
    tot = odds.get("total") or {}

    spread_point = _line_float(_close(ps, "home").get("line"))
    if spread_point is None:
        spread_point = _line_float(odds.get("spread"))
    total_point = _line_float(_close(tot, "over").get("line"))
    if total_point is None:
        total_point = _line_float(odds.get("overUnder"))

    provider = (odds.get("provider") or {}).get("name")
    status = ((event.get("status") or {}).get("type") or {}).get("state") or "unknown"

    return GamePrices(
        event_id=str(event.get("id", "")),
        name=event.get("name", ""),
        commence_time=event.get("date"),
        state=status,
        home_team=(home.get("team") or {}).get("displayName", ""),
        away_team=(away.get("team") or {}).get("displayName", ""),
        home_abbr=(home.get("team") or {}).get("abbreviation", ""),
        away_abbr=(away.get("team") or {}).get("abbreviation", ""),
        provider=provider,
        moneyline={
            "home": _american(_close(ml, "home").get("odds")),
            "away": _american(_close(ml, "away").get("odds")),
        },
        spread={
            "point_home": spread_point,
            "home": _american(_close(ps, "home").get("odds")),
            "away": _american(_close(ps, "away").get("odds")),
        },
        total={
            "point": total_point,
            "over": _american(_close(tot, "over").get("odds")),
            "under": _american(_close(tot, "under").get("odds")),
        },
    )


def parse_scoreboard(payload: dict) -> List[GamePrices]:
    games = []
    for event in payload.get("events") or []:
        game = parse_game(event)
        if game is not None:
            games.append(game)
    return games


# ---------------------------------------------------------------------------
# De-vig + records
# ---------------------------------------------------------------------------

def _devig_pair(price_a: Optional[int], price_b: Optional[int]) -> Optional[Dict[str, object]]:
    """De-vig one two-way market with the props engine; None when unpriced."""
    if price_a is None or price_b is None:
        return None
    shin = devig_two_way(price_a, price_b, method="shin")
    mult = devig_two_way(price_a, price_b, method="multiplicative")
    return {
        "prices": [price_a, price_b],
        "booksum": shin["booksum"],
        "fair_shin": shin["fair"],
        "fair_multiplicative": mult["fair"],
        "shin_z": shin["z"],
    }


def game_record(game: GamePrices, fetched_at: str) -> dict:
    """JSON-ready record: quoted prices, de-vigged fairs, provenance."""
    totals = game.implied_team_totals()
    return {
        "event_id": game.event_id,
        "name": game.name,
        "commence_time": game.commence_time,
        "state": game.state,
        "home_team": game.home_team,
        "away_team": game.away_team,
        "home_abbr": game.home_abbr,
        "away_abbr": game.away_abbr,
        "provider": game.provider,
        "complete_prices": game.complete,
        "prices": {
            "moneyline": game.moneyline,
            "spread": game.spread,
            "total": game.total,
        },
        "devig": {
            # Pair order is exactly what each key says: fair_shin[0] is the
            # first-named side's fair probability, [1] the second's.
            "moneyline_home_away": _devig_pair(game.moneyline["home"], game.moneyline["away"]),
            "spread_home_away": _devig_pair(game.spread["home"], game.spread["away"]),
            "total_over_under": _devig_pair(game.total["over"], game.total["under"]),
        },
        "implied_team_totals": totals,
        "provenance": {
            "source_id": SOURCE_ID,
            "endpoint": SCOREBOARD_URL,
            "provider_reported_by_espn": game.provider,
            "fetched_at": fetched_at,
        },
    }


def slate_records(payload: dict, fetched_at: Optional[str] = None) -> List[dict]:
    """Full pipeline: scoreboard payload -> provenance-stamped game records."""
    stamp = fetched_at or utc_now_iso()
    return [game_record(g, stamp) for g in parse_scoreboard(payload)]


def main(argv: Optional[List[str]] = None) -> int:
    p = argparse.ArgumentParser(description="Fetch the real keyless ESPN slate prices")
    p.add_argument("--dates", default=None, help="ESPN YYYYMMDD filter (default: today's board)")
    args = p.parse_args(argv)
    payload = fetch_scoreboard(args.dates)
    records = slate_records(payload)
    print(json.dumps(records, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
