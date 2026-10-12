"""
Tests for the real price feed (keyless ESPN / Galaxy path).

The fixture is a REAL captured scoreboard payload (BUF @ LAR, MNF 2026-10-12),
kept verbatim — the parser is tested against what ESPN actually served, not
against a hand-built imitation of it. The prices asserted below are the ones
in that payload: ML LAR -175 / BUF +145, spread LAR -3.5 (-102) / BUF +3.5
(-118), total 54.5 (over -118 / under -102), provider "Draft Kings".

Run:
    python -m pytest intelligence/props/test_real_price_feed.py -o pythonpath=.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from intelligence.props.real_price_feed import (
    SOURCE_ID,
    _american,
    game_record,
    parse_game,
    parse_scoreboard,
    slate_records,
)

FIXTURE = Path(__file__).parent / "fixtures" / "espn_scoreboard_20261012_buf_lar.json"


@pytest.fixture(scope="module")
def payload() -> dict:
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def game(payload):
    games = parse_scoreboard(payload)
    assert len(games) == 1
    return games[0]


def test_parses_the_real_event(game):
    assert game.event_id == "401872994"
    assert game.name == "Buffalo Bills at Los Angeles Rams"
    assert game.state == "pre"
    assert game.home_abbr == "LAR"
    assert game.away_abbr == "BUF"
    assert game.provider == "Draft Kings"


def test_prices_are_the_quoted_ones_not_inventions(game):
    assert game.moneyline == {"home": -175, "away": 145}
    assert game.spread["point_home"] == -3.5
    assert game.spread["home"] == -102
    assert game.spread["away"] == -118
    assert game.total["point"] == 54.5
    assert game.total["over"] == -118
    assert game.total["under"] == -102
    assert game.complete is True


def test_implied_team_totals_are_arithmetic(game):
    totals = game.implied_team_totals()
    assert totals == {"home": 29.0, "away": 25.5}


def test_devig_of_the_real_moneyline(game):
    rec = game_record(game, fetched_at="2026-10-12T20:00:00+00:00")
    ml = rec["devig"]["moneyline_home_away"]
    # raw implied: 175/275 = 0.6364 (home), 100/245 = 0.4082 (away)
    assert ml["prices"] == [-175, 145]
    assert ml["booksum"] == pytest.approx(0.6364 + 0.4082, abs=1e-3)
    fair_mult = ml["fair_multiplicative"]
    assert fair_mult[0] == pytest.approx(0.6093, abs=1e-3)
    assert fair_mult[1] == pytest.approx(0.3907, abs=1e-3)
    assert sum(ml["fair_shin"]) == pytest.approx(1.0, abs=1e-9)
    # Shin moves the favourite UP vs multiplicative (insider-money correction)
    assert ml["fair_shin"][0] > fair_mult[0]
    assert ml["shin_z"] > 0


def test_record_carries_provenance(game):
    rec = game_record(game, fetched_at="2026-10-12T20:00:00+00:00")
    prov = rec["provenance"]
    assert prov["source_id"] == SOURCE_ID == "galaxy-espn-inline"
    assert prov["provider_reported_by_espn"] == "Draft Kings"
    assert prov["fetched_at"] == "2026-10-12T20:00:00+00:00"
    assert prov["endpoint"].startswith("https://site.web.api.espn.com/")


def test_missing_odds_stay_missing_never_invented():
    """An event with no odds block parses with None prices and complete=False."""
    event = {
        "id": "999",
        "name": "A at B",
        "date": "2026-10-12T00:00Z",
        "status": {"type": {"state": "pre"}},
        "competitions": [
            {
                "competitors": [
                    {"homeAway": "home", "team": {"displayName": "B", "abbreviation": "B"}},
                    {"homeAway": "away", "team": {"displayName": "A", "abbreviation": "A"}},
                ]
            }
        ],
    }
    game = parse_game(event)
    assert game is not None
    assert game.complete is False
    assert game.moneyline == {"home": None, "away": None}
    assert game.implied_team_totals() is None
    rec = game_record(game, fetched_at="2026-10-12T20:00:00+00:00")
    assert rec["devig"]["moneyline_home_away"] is None
    assert rec["complete_prices"] is False


def test_slate_records_stamps_one_fetch_time(payload):
    records = slate_records(payload, fetched_at="2026-10-12T20:00:00+00:00")
    assert len(records) == 1
    assert records[0]["provenance"]["fetched_at"] == "2026-10-12T20:00:00+00:00"


# ---------------------------------------------------------------------------
# Malformed prices are rejected, never truncated into existence
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "raw,expected",
    [
        ("-175", -175),
        ("+145", 145),
        (-110, -110),
        (-175.0, -175),   # integral float: the VALUE is a clean integer
        ("105.5", None),  # non-integral string: malformed, not a price
        (105.5, None),    # non-integral number: malformed, not a price
        ("-102.5", None),
        ("abc", None),
        ("", None),
        (None, None),
        (0, None),        # zero is not an American price
        ("0", None),
    ],
)
def test_american_prices_must_be_clean_integers(raw, expected):
    """
    The bug this pins: int(float('105.5')) silently produced 105 — a price
    ESPN never quoted, one point off the real one. Non-integral input is
    rejected as None so the market reads as unquoted, per the feed's law.
    """
    assert _american(raw) == expected


def _odds_block(provider_name, ml_home, ml_away):
    """A minimal odds block in the shape ESPN relays (see the fixture)."""
    return {
        "provider": {"name": provider_name},
        "spread": -3.5,
        "overUnder": 54.5,
        "moneyline": {
            "home": {"close": {"odds": ml_home}},
            "away": {"close": {"odds": ml_away}},
        },
        "pointSpread": {
            "home": {"close": {"line": "-3.5", "odds": "-110"}},
            "away": {"close": {"line": "3.5", "odds": "-110"}},
        },
        "total": {
            "over": {"close": {"line": "54.5", "odds": "-110"}},
            "under": {"close": {"line": "54.5", "odds": "-110"}},
        },
    }


def _event(odds_blocks):
    return {
        "id": "42",
        "name": "A at B",
        "date": "2026-10-12T00:00Z",
        "status": {"type": {"state": "pre"}},
        "competitions": [
            {
                "competitors": [
                    {"homeAway": "home", "team": {"displayName": "B", "abbreviation": "B"}},
                    {"homeAway": "away", "team": {"displayName": "A", "abbreviation": "A"}},
                ],
                "odds": odds_blocks,
            }
        ],
    }


def test_a_truncated_price_would_poison_the_record_so_it_stays_missing():
    """'105.5' in a moneyline slot parses as NO price, and the game is incomplete."""
    game = parse_game(_event([_odds_block("Draft Kings", "105.5", "+145")]))
    assert game is not None
    assert game.moneyline["home"] is None
    assert game.moneyline["away"] == 145
    assert game.complete is False


# ---------------------------------------------------------------------------
# Provider selection: DraftKings preferred, provider always recorded
# ---------------------------------------------------------------------------

def test_prefers_the_draftkings_block_when_several_books_are_relayed():
    """ESPN can relay multiple books; the repo's price law is DraftKings."""
    blocks = [
        _odds_block("BetMGM", "-200", "+170"),
        _odds_block("Draft Kings", "-175", "+145"),
    ]
    game = parse_game(_event(blocks))
    assert game is not None
    assert game.provider == "Draft Kings"
    assert game.moneyline == {"home": -175, "away": 145}


def test_falls_back_to_the_first_block_and_records_its_provider():
    """No DraftKings block: take the first, and provenance says whose it is."""
    game = parse_game(_event([_odds_block("BetMGM", "-200", "+170")]))
    assert game is not None
    assert game.provider == "BetMGM"
    assert game.moneyline == {"home": -200, "away": 170}
    rec = game_record(game, fetched_at="2026-10-12T20:00:00+00:00")
    assert rec["provenance"]["provider_reported_by_espn"] == "BetMGM"
