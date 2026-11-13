"""Unit tests for the ticket-exposure caps (antigravity review item 4)."""
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.ops.ticket_exposure_guard import (
    enforce_ticket_exposure,
    validate_ticket_exposure,
)


def test_clean_tickets_pass():
    tickets = [
        {"id": "t1", "game_id": "g1", "kind": "ANCHOR", "legs": [{"team": "DET", "market": "spread", "line": -3.5}]},
        {"id": "t2", "game_id": "g2", "kind": "SGP", "legs": [
            {"team": "BUF", "market": "moneyline"},
            {"athlete": "J. Allen", "market": "passing yards", "line": 245.5},
        ]},
    ]
    assert validate_ticket_exposure(tickets) == []
    kept, refused = enforce_ticket_exposure(tickets)
    assert len(kept) == 2 and not refused


def test_max_one_anchor_and_sgp_per_leg():
    tickets = [
        {"id": "a1", "game_id": "g1", "kind": "ANCHOR"},
        {"id": "a2", "game_id": "g1", "kind": "ANCHOR"},
        {"id": "s1", "game_id": "g1", "kind": "SGP", "legs": [{}, {}]},
        {"id": "s2", "game_id": "g1", "kind": "SGP", "legs": [{}, {}]},
    ]
    v = validate_ticket_exposure(tickets)
    caps = {x["cap"] for x in v}
    assert "max_1_anchor_per_leg" in caps and "max_1_sgp_per_leg" in caps
    kept, refused = enforce_ticket_exposure(tickets)
    assert not kept and len(refused) == 4


def test_ml_plus_alt_spread_double_stake_banned_near_pickem():
    t = {"id": "dbl", "game_id": "g1", "kind": "SGP", "spread": -2.0, "legs": [
        {"team": "CHI", "market": "moneyline", "selection": "CHI ML"},
        {"team": "CHI", "market": "spread", "selection": "CHI -1.5"},
    ]}
    v = validate_ticket_exposure([t])
    assert any(x["cap"] == "ban_ml_plus_alt_spread_double_stake" for x in v)
    # Outside the band the same construction is allowed.
    t2 = {**t, "spread": -4.5}
    assert not any(x["cap"] == "ban_ml_plus_alt_spread_double_stake" for x in validate_ticket_exposure([t2]))


def test_sub_20_5_yard_prop_in_parlay_refused():
    t = {"id": "micro", "game_id": "g1", "kind": "SGP", "legs": [
        {"athlete": "WR5", "market": "receiving yards", "line": 14.5},
        {"athlete": "QB1", "market": "passing yards", "line": 230.5},
    ]}
    v = validate_ticket_exposure([t])
    assert any(x["cap"] == "no_sub_20_5_yard_props_in_parlays" for x in v)
    kept, refused = enforce_ticket_exposure([t])
    assert not kept and refused[0]["refused_reasons"]


def test_single_yard_prop_not_parlay_is_not_cap3():
    t = {"id": "single", "game_id": "g1", "kind": "ANCHOR",
         "legs": [{"athlete": "WR5", "market": "receiving yards", "line": 14.5}]}
    # Single-anchor micro-lines are the Sniper Gate's job, not cap 3.
    assert not any(x["cap"] == "no_sub_20_5_yard_props_in_parlays" for x in validate_ticket_exposure([t]))