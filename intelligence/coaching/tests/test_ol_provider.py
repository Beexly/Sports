"""OL provider against the committed 2026 nflverse files. Not a fixture."""
import os
import sys

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from integration.providers import DataGapError
from coaching.ol_provider import NflverseOLProvider


def test_unpublished_week_falls_back_labeled():
    """Week 5 is now published (upstream refreshed 2026-10-14), so the old
    refuse-on-5 contract changed: unpublished weeks fall back to the most
    recent published week WITH the fallback labeled in data_gap. The label is
    the contract — stale-but-labeled beats silence, and week 4 for a week-5
    request must still name the fallback."""
    p = NflverseOLProvider()
    state = p.get_ol_state("CLE", 6, 2026)  # week 6 not yet published
    assert state.week in (4, 5)  # most recent published week
    dg = state.data_gap or ""
    assert "requested week 6 not yet published" in dg
    assert "floor on continuity" in dg
    assert "not the chart as of this week" in dg


def test_beyond_all_published_weeks_falls_back_labeled():
    p = NflverseOLProvider()
    state = p.get_ol_state("CLE", 12, 2026)  # far beyond published weeks
    assert state.week == 5  # most recent published
    assert "requested week 12 not yet published" in (state.data_gap or "")


def test_cle_week4_does_not_call_a_non_starter_out():
    p = NflverseOLProvider()
    state = p.get_ol_state("CLE", 4, 2026)
    assert state.team == "CLE"
    joined = " ".join(state.starters_out)
    assert "Elgton Jenkins" not in joined
    assert "Teven Jenkins" not in joined
    assert state.continuity_index == 1.0
    assert "not the chart as of this week" in (state.data_gap or "")
    assert state.pressure_rate_allowed is None
