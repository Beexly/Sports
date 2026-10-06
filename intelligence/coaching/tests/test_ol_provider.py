"""OL provider against the committed 2026 nflverse files. Not a fixture."""
import os
import sys

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from integration.providers import DataGapError
from coaching.ol_provider import NflverseOLProvider


def test_unpublished_week_is_a_gap():
    p = NflverseOLProvider()
    with pytest.raises(DataGapError) as exc:
        p.get_ol_state("CLE", 5, 2026)
    assert "week 5" in str(exc.value)
    assert "0.5" not in str(exc.value)


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
