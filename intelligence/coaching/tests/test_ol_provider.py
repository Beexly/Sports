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
    """Week 6 is now published (upstream refreshed), so the unpublished-week
    fallback contract is tested on Week 7: unpublished weeks fall back to the
    most recent published week WITH the fallback labeled in data_gap."""
    p = NflverseOLProvider()
    state = p.get_ol_state("CLE", 7, 2026)  # week 7 not yet published in parquet
    assert state.week in (4, 5, 6)  # most recent published week
    dg = state.data_gap or ""
    assert "requested week 7 not yet published" in dg
    assert "floor on continuity" in dg
    assert "not the chart as of this week" in dg


def test_beyond_all_published_weeks_falls_back_labeled():
    p = NflverseOLProvider()
    state = p.get_ol_state("CLE", 12, 2026)  # far beyond published weeks
    assert state.week in (5, 6)  # most recent published
    assert "requested week 12 not yet published" in (state.data_gap or "")


def test_cle_week4_does_not_call_a_non_starter_out():
    p = NflverseOLProvider()
    state = p.get_ol_state("CLE", 4, 2026)
    assert state.team == "CLE"
    joined = " ".join(state.starters_out)
    assert "Teven Jenkins" not in joined
    assert state.continuity_index in (0.8, 1.0)
    assert "not the chart as of this week" in (state.data_gap or "")
    assert state.pressure_rate_allowed is None
