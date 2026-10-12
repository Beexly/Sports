"""
Tests for the Pinnacle player-prop price feed.

Fixtures are field-trimmed captures of the LIVE guest API responses for
Bills @ Rams (2026-10-12): the league-889 matchups list and the parent
game's related/straight markets bundle. Expected values below are read
off that capture, not invented.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from intelligence.props.pinnacle_prop_feed import (  # noqa: E402
    board_to_csv,
    build_artifact,
    parse_prop_board,
)

FIXTURES = Path(__file__).resolve().parent / "fixtures"
GAME_ID = 1637432964  # Los Angeles Rams vs Buffalo Bills, 2026-10-13T00:15Z


def _fixtures():
    matchups = json.loads((FIXTURES / "pinnacle_matchups_buf_lar.json").read_text())["matchups"]
    markets = json.loads((FIXTURES / "pinnacle_related_buf_lar.json").read_text())["markets"]
    return matchups, markets


def _board():
    matchups, markets = _fixtures()
    return parse_prop_board(matchups, markets, GAME_ID)


def test_board_is_full_and_real():
    board = _board()
    # The live capture carried 66 priced player-prop markets for this game
    # (the bundle's other specials are Game Props, excluded by design).
    assert len(board["records"]) == 66
    assert board["specials_seen"] == 66
    assert board["skipped"] == 0


def test_known_prop_matches_capture_exactly():
    board = _board()
    kyren = [r for r in board["records"]
             if r["player"] == "Kyren Williams" and r["stat"] == "rush_yards"]
    assert len(kyren) == 1
    rec = kyren[0]
    assert rec["line"] == 69.5
    assert rec["over_price"] == -111
    assert rec["under_price"] == -109
    assert rec["book"] == "pinnacle"
    assert rec["prop_matchup_id"] == 1637834632


def test_stafford_and_allen_lines_match_the_other_books_line():
    # ESPN's (DK-relayed) prop lines for the same game, captured the same
    # afternoon: Stafford pass yards 283.5, Allen pass yards 244.5.
    # Pinnacle's sharp lines should sit within a field goal of those.
    board = _board()
    by = {(r["player"], r["stat"]): r for r in board["records"]}
    assert abs(by[("Matthew Stafford", "pass_yards")]["line"] - 283.5) <= 3.0
    assert by[("Josh Allen", "pass_yards")]["line"] == 244.5
    assert by[("Josh Allen", "pass_attempts")]["line"] == 32.5


def test_devig_engages_and_sums_to_one():
    board = _board()
    rec = [r for r in board["records"]
           if r["player"] == "Kyren Williams" and r["stat"] == "rush_yards"][0]
    d = rec["devig"]
    # -111 / -109: implied 111/211 + 109/209 = 1.0476...
    assert abs(d["booksum"] - 1.0476) < 0.001
    assert abs(d["shin"]["fair_over"] + d["shin"]["fair_under"] - 1.0) < 1e-9
    assert 0.49 < d["shin"]["fair_over"] < 0.53
    assert abs(d["multiplicative"]["fair_over"] + d["multiplicative"]["fair_under"] - 1.0) < 1e-9


def test_participant_mapping_is_by_id_not_position():
    # Shuffle the prices array: the Over price must follow participantId.
    matchups, markets = _fixtures()
    target = [m for m in markets if m.get("matchupId") == 1637834632][0]
    target["prices"] = list(reversed(target["prices"]))
    board = parse_prop_board(matchups, markets, GAME_ID)
    rec = [r for r in board["records"] if r["prop_matchup_id"] == 1637834632][0]
    assert rec["over_price"] == -111
    assert rec["under_price"] == -109


def test_one_sided_market_is_skipped_never_completed():
    matchups, markets = _fixtures()
    target = [m for m in markets if m.get("matchupId") == 1637834632][0]
    target["prices"] = target["prices"][:1]  # drop the Under price
    board = parse_prop_board(matchups, markets, GAME_ID)
    assert all(r["prop_matchup_id"] != 1637834632 for r in board["records"])
    assert board["skipped"] == 1
    assert len(board["records"]) == 65


def test_game_markets_never_become_props():
    board = _board()
    # Every record belongs to a special prop matchup, not the game itself.
    assert all(r["prop_matchup_id"] != GAME_ID for r in board["records"])
    assert all(r["stat"] for r in board["records"])


def test_artifact_is_stamped_diagnostic_with_provenance():
    board = _board()
    artifact = build_artifact([{"game_matchup_id": GAME_ID, **board}],
                              "2026-10-12T20:55:00+00:00")
    assert artifact["label"] == "DIAGNOSTIC"
    assert artifact["rvc_cleared"] is False
    assert artifact["is_pick"] is False
    assert artifact["source"]["source_id"] == "pinnacle-guest-arcadia"
    assert artifact["prop_records"] == 66


def test_csv_shape_matches_engine_sheet_conventions():
    board = _board()
    text = board_to_csv(board["records"], "2026-10-12T20:55:00+00:00")
    lines = text.strip().splitlines()
    assert lines[0].startswith("game_matchup_id,player,stat,line,over_price,under_price,book,")
    assert len(lines) == 67  # header + 66 props
    kyren = [ln for ln in lines if "Kyren Williams" in ln and "rush_yards" in ln]
    assert len(kyren) == 1
    assert ",69.5,-111,-109,pinnacle," in kyren[0]
