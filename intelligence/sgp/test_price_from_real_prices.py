"""
Tests for the real-price SGP wiring.

Offline by construction: the slate comes from the REAL captured ESPN payload
in the props fixtures (BUF @ LAR, MNF 2026-10-12). What is pinned:

  * the scaled legs reproduce build_legs() exactly at the reference team
    total (drift guard between this module and the adapter);
  * the higher implied team total (LAR 29.0, from the real -3.5 / 54.5) prices
    the same canonical stack HIGHER than the lower one (BUF 25.5);
  * the unscaled control is identical across games — only the real prices
    move the scaled price;
  * the artifact is labelled DIAGNOSTIC with rvc_cleared False and carries
    price + correlation provenance;
  * incomplete / non-pre games are skipped with a stated reason, never priced
    on invented inputs.

Run:
    python -m pytest intelligence/sgp/test_price_from_real_prices.py -o pythonpath=.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pytest

from intelligence.props.real_price_feed import slate_records
from intelligence.sgp.price_from_measured_correlations import build_legs, load_measured
from intelligence.sgp.price_from_real_prices import (
    REFERENCE_TEAM_TOTAL,
    build_artifact,
    scaled_legs,
)

FIXTURE = (
    Path(__file__).resolve().parents[1]
    / "props" / "fixtures" / "espn_scoreboard_20261012_buf_lar.json"
)
CORR_PATH = Path("data/snapshots/sgp_correlations.json")


@pytest.fixture(scope="module")
def corr_and_blob():
    return load_measured(CORR_PATH)


@pytest.fixture(scope="module")
def artifact(corr_and_blob):
    corr, blob = corr_and_blob
    payload = json.loads(FIXTURE.read_text(encoding="utf-8"))
    records = slate_records(payload, fetched_at="2026-10-12T20:00:00+00:00")
    return build_artifact(records, corr, blob, "2026-10-12T20:00:00+00:00",
                          draws=20_000, seed=99)


def test_scaled_legs_reproduce_build_legs_at_reference():
    """Drift guard: at ratio 1.0 the scaler IS the adapter's canonical stack."""
    mine = scaled_legs(REFERENCE_TEAM_TOTAL)
    theirs = build_legs()
    assert len(mine) == len(theirs) == 4
    for a, b in zip(mine, theirs):
        assert a.label == b.label
        ma, mb = a.marginal, b.marginal
        assert type(ma) is type(mb)
        if hasattr(ma, "lam"):
            assert ma.lam == pytest.approx(mb.lam)
        else:
            assert ma.mean == pytest.approx(mb.mean)
            assert ma.sd == pytest.approx(mb.sd)


def test_artifact_is_labelled_diagnostic(artifact):
    assert artifact["label"] == "DIAGNOSTIC"
    assert artifact["rvc_cleared"] is False
    assert artifact["is_pick"] is False
    assert artifact["is_edge_claim"] is False
    prov = artifact["provenance"]
    assert prov["prices"]["source_id"] == "galaxy-espn-inline"
    assert prov["prices"]["provider_reported_by_espn"] == ["Draft Kings"]
    assert prov["correlations"]["n_team_games"] == 1088


def test_real_prices_move_the_price(artifact):
    game = artifact["games"][0]
    assert game["name"] == "Buffalo Bills at Los Angeles Rams"
    stacks = game["sgp_stacks"]
    assert set(stacks) == {"LAR", "BUF"}
    lar, buf = stacks["LAR"], stacks["BUF"]
    # the team totals came from the real prices, not from a table in this repo
    assert lar["team_total_implied_by_real_prices"] == 29.0
    assert buf["team_total_implied_by_real_prices"] == 25.5
    # the higher-scoring environment prices the same stack higher
    assert lar["scaled"]["fair_probability"] > buf["scaled"]["fair_probability"]
    # the unscaled control is the same number for both teams
    assert lar["unscaled_control"]["fair_probability"] == pytest.approx(
        buf["unscaled_control"]["fair_probability"]
    )
    # measured positive dependence lifts both above independence
    for stack in (lar, buf):
        s = stack["scaled"]
        assert s["fair_probability"] > s["independent_probability"]
        assert s["correlation_lift"] > 0
        assert 0.0 < s["fair_probability"] < 1.0


def test_incomplete_and_post_games_are_skipped_with_reasons(corr_and_blob):
    corr, blob = corr_and_blob
    records = [
        {"event_id": "1", "name": "Done Game", "state": "post", "complete_prices": True,
         "implied_team_totals": {"home": 24.0, "away": 20.0},
         "home_abbr": "H", "away_abbr": "A", "provider": "Draft Kings"},
        {"event_id": "2", "name": "Unpriced Game", "state": "pre", "complete_prices": False,
         "implied_team_totals": None, "home_abbr": "H", "away_abbr": "A",
         "provider": None},
    ]
    art = build_artifact(records, corr, blob, "2026-10-12T20:00:00+00:00",
                         draws=5_000, seed=1)
    assert art["games"][0]["sgp_stacks"] == {}
    assert "state is post" in art["games"][0]["skip_reason"]
    assert art["games"][1]["sgp_stacks"] == {}
    assert "incomplete" in art["games"][1]["skip_reason"]
