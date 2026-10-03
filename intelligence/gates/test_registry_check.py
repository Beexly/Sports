"""Focused coverage for registry_check.check — the shape gate, not a survey."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from registry_check import EXPECTED_TOTAL, check  # noqa: E402


def good_signal(sid: str = "nfl_x") -> dict:
    return {
        "id": sid,
        **{dim: {"verdict": "no", "evidence": "honest negative"} for dim in
           ("wired", "weighted", "tested", "traced", "gate", "license")},
    }


def good_doc(n: int = EXPECTED_TOTAL) -> dict:
    return {
        "provenance": {"note": "survey", "commit": "abc123"},
        "signals": [good_signal(f"nfl_{i}") for i in range(n)],
    }


def test_clean_registry_passes():
    assert check(good_doc()) == []


def test_missing_dimension_fails():
    doc = good_doc()
    del doc["signals"][0]["traced"]
    errors = check(doc)
    assert any("traced" in e and "nfl_0" in e for e in errors)


def test_empty_verdict_fails():
    doc = good_doc()
    doc["signals"][3]["weighted"]["verdict"] = ""
    errors = check(doc)
    assert any("nfl_3" in e and "weighted" in e for e in errors)


def test_negative_verdicts_are_valid():
    doc = good_doc()
    for s in doc["signals"]:
        s["traced"]["verdict"] = "no — no committed pick trace shows it firing"
    assert check(doc) == []


def test_wrong_total_fails():
    errors = check(good_doc(EXPECTED_TOTAL - 1))
    assert any("expected 47" in e for e in errors)


def test_duplicate_id_fails():
    doc = good_doc()
    doc["signals"][1]["id"] = doc["signals"][0]["id"]
    assert any("duplicate" in e for e in check(doc))


def test_bad_top_level_shape_fails():
    errors = check({"signals": []})
    assert any("top-level" in e for e in errors)


def test_bad_provenance_fails():
    doc = good_doc(3)
    doc["provenance"]["commit"] = ""
    assert any("provenance.commit" in e for e in check(doc))


def test_non_object_signal_fails():
    doc = good_doc(2)
    doc["signals"][1] = "garbage"
    assert any("must be an object" in e for e in check(doc))
