"""
Tests for the live props board (Pinnacle prices x engine model side).

Fixtures are the same field-trimmed LIVE captures the feed tests use
(Bills @ Rams, 2026-10-12). The registry used here is the REAL recovered
registry — loaded from the engine's prior board artifact — so the join
expectations below are statements about real data, read off the capture:

  * the capture carries 66 priced props;
  * the registry's only pair on either roster is James Cook, and only for
    rush_rec_yards — a combined market the capture does NOT post for him;
  * therefore the honest join on this capture is 0 model rows / 66 priced-
    only, and these tests pin that instead of wishing it otherwise.

The model-side math itself is exercised on a synthetic record that DOES
match a registry pair (James Cook rush_rec_yards), with expectations
recomputed independently from the engine's own distributions.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from intelligence.props.pinnacle_prop_feed import parse_prop_board  # noqa: E402
from intelligence.props.prop_discrepancy_engine import (  # noqa: E402
    NormalFit,
    devig_two_way,
    fit_for_stat,
)
from intelligence.props.props_live_board import (  # noqa: E402
    NO_MODEL_NOTE,
    build_artifact,
    build_board_rows,
    decimal_odds,
    ev_at_price,
    load_model_registry,
)

FIXTURES = Path(__file__).resolve().parent / "fixtures"
GAME_ID = 1637432964  # Los Angeles Rams vs Buffalo Bills, 2026-10-13T00:15Z
FETCHED_AT = "2026-10-12T21:05:00+00:00"
PRIOR_BOARD = REPO_ROOT / "outbox" / "props_ev_board_latest.json"


def _capture_records():
    matchups = json.loads((FIXTURES / "pinnacle_matchups_buf_lar.json").read_text())["matchups"]
    markets = json.loads((FIXTURES / "pinnacle_related_buf_lar.json").read_text())["markets"]
    return parse_prop_board(matchups, markets, GAME_ID)["records"]


def _registry():
    return load_model_registry(PRIOR_BOARD)


def _cook_record():
    """A feed-shaped record for the one registry pair on tonight's rosters."""
    shin = devig_two_way(-110, -110, method="shin")
    mult = devig_two_way(-110, -110, method="multiplicative")
    return {
        "game_matchup_id": GAME_ID,
        "prop_matchup_id": 999000111,
        "player": "James Cook",
        "stat": "rush_rec_yards",
        "stat_raw": "Rushing + Receiving Yards",
        "line": 93.5,
        "over_price": -110,
        "under_price": -110,
        "book": "pinnacle",
        "status": "open",
        "cutoff_at": "2026-10-13T00:15:00Z",
        "devig": {
            "booksum": shin["booksum"],
            "shin": {"fair_over": shin["fair"][0], "fair_under": shin["fair"][1], "z": shin["z"]},
            "multiplicative": {"fair_over": mult["fair"][0], "fair_under": mult["fair"][1]},
        },
    }


# ---------------------------------------------------------------------------
# Registry recovery
# ---------------------------------------------------------------------------

def test_registry_recovers_the_sheets_parameters_from_the_prior_board():
    registry = _registry()
    assert len(registry) == 21
    cook = registry[("james cook", "rush_rec_yards")]
    assert cook["mu"] == 93.38
    assert cook["sigma"] == 46.26
    assert cook["sheet_game"] == "BUF@LAR"


def test_missing_model_board_is_an_empty_registry_not_an_error(tmp_path):
    assert load_model_registry(tmp_path / "does_not_exist.json") == {}


# ---------------------------------------------------------------------------
# The join, on the real capture: honest emptiness
# ---------------------------------------------------------------------------

def test_capture_join_is_empty_and_every_row_says_why():
    with_model, priced_only = build_board_rows(_capture_records(), _registry(), FETCHED_AT)
    # Pinnacle does not post Cook rush+rec tonight; nothing else on either
    # roster has an in-repo distribution. Zero is the correct join size.
    assert with_model == []
    assert len(priced_only) == 66
    for row in priced_only:
        assert row["model"] is None
        assert row["comparison"] is None
        assert row["model_note"] == NO_MODEL_NOTE


def test_priced_rows_carry_real_fair_probabilities_and_provenance():
    _, priced_only = build_board_rows(_capture_records(), _registry(), FETCHED_AT)
    kyren = [r for r in priced_only
             if r["player"] == "Kyren Williams" and r["stat"] == "rush_yards"][0]
    assert kyren["line"] == 69.5
    assert kyren["over_price"] == -111
    assert kyren["under_price"] == -109
    assert abs(kyren["fair_over"] + kyren["fair_under"] - 1.0) < 1e-9
    assert abs(kyren["booksum"] - 1.0476) < 0.001
    assert 0.0 < kyren["shin_z"] < 0.2  # solved insider share, in (0, 1)
    prov = kyren["provenance"]
    assert prov["book"] == "pinnacle"
    assert prov["source_id"] == "pinnacle-guest-arcadia"
    assert prov["fetched_at"] == FETCHED_AT
    assert prov["game_matchup_id"] == GAME_ID


# ---------------------------------------------------------------------------
# The join, on a matching pair: model side and comparison math
# ---------------------------------------------------------------------------

def test_matching_pair_gets_a_model_side_and_a_real_comparison():
    registry = _registry()
    with_model, priced_only = build_board_rows([_cook_record()], registry, FETCHED_AT)
    assert priced_only == []
    assert len(with_model) == 1
    row = with_model[0]
    assert row["ev_rank"] == 1

    model = row["model"]
    params = registry[("james cook", "rush_rec_yards")]
    assert model["mu"] == params["mu"]
    assert model["sigma"] == params["sigma"]
    assert model["sheet_game"] == "BUF@LAR"
    assert "props_ev_board_latest.json" in model["params_source"]

    # Independent recomputation from the engine's own distributions.
    fit = fit_for_stat("rush_rec_yards", params["mu"], params["sigma"])
    normal = NormalFit(params["mu"], params["sigma"])
    assert model["family"] == fit.family
    assert model["p_over"] == pytest.approx(float(fit.p_over(93.5)), abs=1e-12)
    assert model["p_over_normal_basis"] == pytest.approx(float(normal.p_over(93.5)), abs=1e-12)

    comp = row["comparison"]
    assert comp["fair_over_shin"] == pytest.approx(0.5, abs=1e-9)  # -110/-110
    assert comp["model_minus_fair_over"] == pytest.approx(model["p_over"] - 0.5, abs=1e-9)
    ev_over = ev_at_price(model["p_over"], -110)
    ev_under = ev_at_price(model["p_under"], -110)
    assert comp["ev_pct_family_basis"] == pytest.approx(max(ev_over, ev_under) * 100.0, abs=1e-9)
    assert comp["side_by_family_ev"] == ("OVER" if ev_over >= ev_under else "UNDER")
    assert comp["edge_survives_normal"] == (comp["ev_pct_normal_basis"] > 0)


def test_ev_at_price_uses_the_quoted_price_not_a_breakeven_table():
    assert decimal_odds(-110) == pytest.approx(1.0 + 100.0 / 110.0)
    assert decimal_odds(150) == pytest.approx(2.5)
    # A fair coin at -110 loses the margin; at +110 it gains it.
    assert ev_at_price(0.5, -110) < 0
    assert ev_at_price(0.5, 110) > 0


def test_unfittable_registry_stat_degrades_to_priced_only_with_a_note():
    rec = _cook_record()
    rec["stat"] = "pass_attempts"  # the engine has no family for this stat
    registry = {("james cook", "pass_attempts"): {"mu": 30.0, "sigma": 5.0, "sheet_game": "BUF@LAR"}}
    with_model, priced_only = build_board_rows([rec], registry, FETCHED_AT)
    assert with_model == []
    assert len(priced_only) == 1
    assert priced_only[0]["model"] is None
    assert "cannot fit" in priced_only[0]["model_note"]


# ---------------------------------------------------------------------------
# Stamps from birth
# ---------------------------------------------------------------------------

def _artifact():
    records = _capture_records()
    game_board = {
        "game_matchup_id": GAME_ID,
        "teams": ["Los Angeles Rams", "Buffalo Bills"],
        "start_time": "2026-10-13T00:15:00Z",
        "specials_seen": 66,
        "skipped": 0,
        "records": records,
    }
    return build_artifact([game_board], _registry(), FETCHED_AT, PRIOR_BOARD)


def test_artifact_carries_the_sgp_stamp_schema():
    artifact = _artifact()
    assert artifact["label"] == "DIAGNOSTIC"
    assert artifact["is_pick"] is False
    assert artifact["is_edge_claim"] is False
    assert artifact["rvc_cleared"] is False
    assert "residual-versus-close has NOT cleared" in artifact["caveat"]
    assert artifact["counts"] == {
        "priced_rows": 66, "rows_with_model": 0, "priced_only_rows": 66,
    }
    game = artifact["games"][0]
    assert game["n_priced_rows"] == 66
    assert game["rows_with_model"] == []
    assert len(game["priced_only_rows"]) == 66


def _walk_keys(node):
    if isinstance(node, dict):
        for k, v in node.items():
            yield k
            yield from _walk_keys(v)
    elif isinstance(node, list):
        for item in node:
            yield from _walk_keys(item)


def test_no_stake_sizing_anywhere_while_rvc_is_uncleared():
    artifact = _artifact()
    # A model row too, so the ban is checked on the EV-carrying shape.
    game_board = {
        "game_matchup_id": GAME_ID, "teams": ["Los Angeles Rams", "Buffalo Bills"],
        "start_time": "2026-10-13T00:15:00Z", "specials_seen": 1, "skipped": 0,
        "records": [_cook_record()],
    }
    artifact_with_model = build_artifact([game_board], _registry(), FETCHED_AT, PRIOR_BOARD)
    for art in (artifact, artifact_with_model):
        assert art["rvc_cleared"] is False
        for key in _walk_keys(art):
            assert "kelly" not in key.lower()
            assert "stake" not in key.lower()
    # And the serialized form carries no stake numbers either.
    assert "kelly" not in json.dumps(artifact_with_model).lower()
