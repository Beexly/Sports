"""A sealed trace cites the window and still has no pick."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from calibration.receipts import NotAWeight, calibration_applied, pick_weight
from reasoning_engine.seal import seal_trace
from trust.trace_row import to_trace_row, validate_trace_row


def test_seal_strips_an_unreceipted_probability_and_records_the_window():
    sealed = seal_trace({
        "game_id": "PIT-at-CLE-2026-w4",
        "bet_type": None,
        "pick": "CLE -3",
        "probability_after_calibration": 0.61,
        "confidence": 0.8,
        "facts": [],
        "gaps": [],
    })
    assert sealed["pick"] is None
    assert sealed["probability_after_calibration"] is None
    assert sealed["confidence"] is None
    assert sealed["paper_index"]["n"] == 105
    assert sealed["paper_index"]["weight"] is None
    assert sealed["calibration_applied"] is False
    assert calibration_applied() is False
    row = to_trace_row(sealed)
    assert validate_trace_row(row) == []
    assert row["abstention_level"] == "L1"
    try:
        pick_weight("pass_epa_week_to_next_corr")
    except NotAWeight as exc:
        assert exc.signal_id == "pass_epa_week_to_next_corr"
    else:
        raise AssertionError("descriptive correlation is not a pick weight")
