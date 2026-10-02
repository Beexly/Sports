"""The window loads. Nothing in it is a weight."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from research.corpus import BINDINGS, WINDOW, Withheld, cite, index, weight


def test_window_loads_and_every_weight_is_withheld():
    rows = index()
    assert len(rows) == 105
    assert rows[0]["weight"] is None
    assert rows[0]["weight_status"] == "withheld"
    ids = {row["id"] for row in rows}
    assert "1704.00197" in ids
    assert "2604.08885" in ids
    try:
        weight("1704.00197")
    except Withheld as exc:
        assert exc.paper_id == "1704.00197"
    else:
        raise AssertionError("weight() must withhold")


def test_known_papers_bind_to_code_and_do_not_license_a_claim():
    iwin = cite("1704.00197")
    assert "in_game_win_probability" in iwin["slots"]
    assert iwin["binding"]["status"] == "margin_only"
    assert iwin["binding"]["module"] == "research.iwinrnfl_ratings"
    assert iwin["weight"] is None
    kelly = cite("2604.08885")
    assert kelly["binding"]["status"] == "not_run"
    assert BINDINGS["2606.23598"]["status"] == "intervals_required"
    assert WINDOW == "2026-10-02T10:00-13:35"
