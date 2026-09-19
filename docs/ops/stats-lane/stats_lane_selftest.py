#!/usr/bin/env python3
"""Self-test: honest refuse + valid JSON. Fail loud if Infinity leaks."""

from __future__ import annotations

import json
import math
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from stats_json import dumps_report, sanitize  # noqa: E402
from books_mondrian import qhat, MIN_N  # noqa: E402


def test_sanitize_inf():
    s = dumps_report({"qhat": float("inf"), "nested": [1.0, float("-inf")]})
    data = json.loads(s)  # must parse
    assert data["qhat"] is None
    assert data["nested"][1] is None


def test_qhat_refuse_thin():
    thin = [0.5] * (MIN_N - 1)
    assert math.isinf(qhat(thin))
    ok = [0.1] * MIN_N
    assert math.isfinite(qhat(ok))


def test_runners_emit_valid_json_on_missing_export():
    with tempfile.TemporaryDirectory() as td:
        missing = Path(td) / "board-export.jsonl"
        for mod, name in [
            ("books_mondrian.py", "b.json"),
            ("ordering_duel.py", "o.json"),
            ("jackknife_plus_margins.py", "j.json"),
            ("ncaaf_zero_book_eval.py", "n.json"),
        ]:
            out = Path(td) / name
            p = subprocess.run(
                [sys.executable, str(HERE / mod), "--input", str(missing), "--out", str(out)],
                capture_output=True,
                text=True,
            )
            assert out.exists(), mod
            json.loads(out.read_text(encoding="utf-8"))  # valid JSON
            assert "Infinity" not in out.read_text(encoding="utf-8")


if __name__ == "__main__":
    test_sanitize_inf()
    test_qhat_refuse_thin()
    test_runners_emit_valid_json_on_missing_export()
    print("stats_lane_selftest PASS")
