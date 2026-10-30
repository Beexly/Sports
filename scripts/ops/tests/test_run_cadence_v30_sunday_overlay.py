"""TDD suite for run_cadence_v30_sunday_overlay.py (cadence v3.0).

Invariants under test:
  1. Weather overlay emits boolean flags at the documented thresholds and NEVER a
     numeric points adjustment (a flat mph->points conversion would be fabricated
     precision; the doctrine forbids it).
  2. The disposition rule can flag an overlay as adverse but can never re-price:
     a spread side is flagged only at <= -1.5 points, and a total's sign follows
     the UNDER/OVER direction before the same threshold is applied.
  3. Role mapping is the v2.5 mapping (QB1/WR1..WR3/TE1/RB1 plus LT/CB1/EDGE1),
     and roster statuses (Injured Reserve / Suspension) are never promoted into a
     game designation.
  4. The ticket merkle is deterministic over the same ticket list and changes when
     any single field changes.
"""

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT / "scripts" / "ops"))

import run_cadence_v30_sunday_overlay as cadence  # noqa: E402


# --------------------------------------------------------------------------- #
# 1. weather flags
# --------------------------------------------------------------------------- #

def test_weather_flags_thresholds_and_no_points_adjustment():
    calm = cadence.weather_flags(9.0, 12.0, 5.0, 70.0)
    assert calm["flags"] == []
    assert calm["points_adjustment"] == 0.0

    windy = cadence.weather_flags(15.0, 20.0, 0.0, 60.0)
    assert windy["flags"] == ["WIND"]

    gusty = cadence.weather_flags(10.0, 25.0, 0.0, 60.0)
    assert gusty["flags"] == ["GUSTS"]

    wet = cadence.weather_flags(1.0, 2.0, 40.0, 60.0)
    assert wet["flags"] == ["PRECIP"]

    cold = cadence.weather_flags(1.0, 2.0, 0.0, 35.0)
    assert cold["flags"] == ["COLD"]

    everything = cadence.weather_flags(30.0, 40.0, 90.0, 10.0)
    assert everything["flags"] == ["WIND", "GUSTS", "PRECIP", "COLD"]
    assert everything["points_adjustment"] == 0.0


def test_weather_flags_tolerate_missing_values():
    out = cadence.weather_flags(None, None, None, None)
    assert out["flags"] == []
    assert out["points_adjustment"] == 0.0


# --------------------------------------------------------------------------- #
# 2. disposition rule
# --------------------------------------------------------------------------- #

def test_side_disposition_flags_only_past_the_adverse_threshold():
    at_threshold, _ = cadence.disposition(-1.5, 0.0, "side")
    assert at_threshold == "OVERLAY_ADVERSE"

    inside, _ = cadence.disposition(-1.49, 0.0, "side")
    assert inside == "SEALED_HOLDS"

    helped, _ = cadence.disposition(+2.4, 0.0, "side")
    assert helped == "SEALED_HOLDS"


def test_total_disposition_is_direction_aware_and_never_adverse():
    # The caller passes the already-signed total delta, so a total never flags
    # adverse today: the overlay has no re-price authority.
    under_hurt, _ = cadence.disposition(0.0, +2.0, "total")
    assert under_hurt == "SEALED_HOLDS"
    under_helped, _ = cadence.disposition(0.0, -2.0, "total")
    assert under_helped == "SEALED_HOLDS"


# --------------------------------------------------------------------------- #
# 3. role mapping + designation extraction
# --------------------------------------------------------------------------- #

def test_role_mapping_matches_v25_semantics():
    assert cadence.role_for_position("QB", 1) == "QB1"
    assert cadence.role_for_position("QB", 2) == "QB_QUESTIONABLE"
    assert cadence.role_for_position("WR", 1) == "WR1"
    assert cadence.role_for_position("WR", 2) == "WR2"
    assert cadence.role_for_position("WR", 3) == "WR3"
    assert cadence.role_for_position("RB", 1) == "RB1"
    assert cadence.role_for_position("RB", 2) == ""
    assert cadence.role_for_position("TE", 1) == "TE1"
    # Unreachable keys are still emitted as-is (v2.5 gap is reported, not repaired).
    assert cadence.role_for_position("G", 1) == "LT"
    assert cadence.role_for_position("CB", 1) == "CB1"
    assert cadence.role_for_position("LB", 1) == "EDGE1"


def test_espn_designations_split_game_status_from_roster_status():
    block = {
        "injuries": [
            {"athlete": {"displayName": "A Receiver", "position": {"abbreviation": "WR"}},
             "status": "Out"},
            {"athlete": {"displayName": "B Receiver", "position": {"abbreviation": "WR"}},
             "status": "Questionable"},
            {"athlete": {"displayName": "C Corner", "position": {"abbreviation": "CB"}},
             "status": "Injured Reserve"},
            {"athlete": {"displayName": "D Safety", "position": {"abbreviation": "S"}},
             "status": "Suspension"},
        ]
    }
    out = cadence.designations_from_espn(block)
    assert [d["player"] for d in out["applied"]] == ["A Receiver", "B Receiver"]
    assert [d["role_key"] for d in out["applied"]] == ["WR1", "WR2"]
    assert [d["status"] for d in out["not_applied"]] == ["Injured Reserve", "Suspension"]


def test_espn_designations_practice_only_block_yields_nothing():
    # A block whose entries carry no game status must not promote practice state.
    block = {"injuries": [{"athlete": {"displayName": "E Lineman",
                                       "position": {"abbreviation": "G"}},
                           "status": "Practice Limited"}]}
    out = cadence.designations_from_espn(block)
    assert out["applied"] == []
    assert out["not_applied"][0]["player"] == "E Lineman"


# --------------------------------------------------------------------------- #
# 4. ticket merkle
# --------------------------------------------------------------------------- #

def test_ticket_merkle_is_deterministic_and_field_sensitive():
    tickets = [
        {"ticket_id": "TICK-2026-W8-1-SIDE", "selection": "Team A -3", "overlay_points_delta": -0.25},
        {"ticket_id": "TICK-2026-W8-1-TOTAL", "selection": "UNDER 45", "overlay_points_delta": 0.1},
    ]
    assert cadence.ticket_merkle(tickets) == cadence.ticket_merkle(list(tickets))

    mutated = [dict(tickets[0]), dict(tickets[1])]
    mutated[0]["overlay_points_delta"] = -0.26
    assert cadence.ticket_merkle(tickets) != cadence.ticket_merkle(mutated)


def test_team_delta_for_prop_refuses_to_guess():
    overlays = {"AAA": {"points_delta": -0.4}, "BBB": {"points_delta": 0.2}}
    blocks = {
        "AAA": {"applied": [{"player": "Known Player"}], "not_applied": []},
        "BBB": {"applied": [], "not_applied": [{"player": "Reserve Player"}]},
    }
    assert cadence.team_delta_for_prop("Known Player", overlays, blocks) == -0.4
    assert cadence.team_delta_for_prop("Reserve Player", overlays, blocks) == 0.2
    assert cadence.team_delta_for_prop("Unlisted Player", overlays, blocks) is None
