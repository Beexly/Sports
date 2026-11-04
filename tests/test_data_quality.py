"""Tests for the six-dimension data quality suite."""

from __future__ import annotations

import importlib.util
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]
_MOD = REPO / "scripts" / "ops" / "data_quality.py"

_spec = importlib.util.spec_from_file_location("data_quality", _MOD)
dq = importlib.util.module_from_spec(_spec)
sys.modules["data_quality"] = dq
_spec.loader.exec_module(dq)  # type: ignore[union-attr]


def _row(**over):
    base = {
        "source": "arxiv",
        "source_id": "2603.25901",
        "title": "Decoding Defensive Coverage Responsibilities",
        "abstract": "We model per-defender coverage assignment.",
        "year": 2026,
        "url": "https://example.org/x",
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
    }
    base.update(over)
    return base


def _statuses(results):
    return {f"{r.dimension}/{r.check}": r.status for r in results}


def _run(rows, **kw):
    return dq.evaluate(rows, **kw)


# --- dimensions exist and are independent ---------------------------------

def test_all_six_dimensions_are_evaluated():
    results = _run([_row()])
    dims = {r.dimension for r in results}
    assert dims == {"completeness", "uniqueness", "validity",
                    "consistency", "timeliness", "volume"}


def test_clean_data_passes_every_hard_check():
    results = _run([_row(source_id=f"id{i}") for i in range(5)])
    assert not [r for r in results if r.status == dq.FAIL]


def test_a_failing_dimension_does_not_suppress_the_others():
    rows = [_row(source_id="dup", title="t"), _row(source_id="dup", title="t")]
    results = _run(rows)
    dims = {r.dimension for r in results}
    assert len(dims) == 6, "all dimensions still report when one fails"


# --- completeness ---------------------------------------------------------

def test_missing_title_fails_completeness():
    rows = [_row(title=""), _row(source_id="b")]
    st = _statuses(_run(rows))
    assert st["completeness/title_present"] == dq.FAIL


def test_thin_rows_warn_but_do_not_fail():
    rows = [_row(source_id=f"i{i}", abstract="", full_text="") for i in range(4)]
    st = _statuses(_run(rows))
    assert st["completeness/has_searchable_body"] == dq.WARN


# --- uniqueness -----------------------------------------------------------

def test_duplicate_source_id_fails_uniqueness():
    rows = [_row(source_id="same"), _row(source_id="same")]
    st = _statuses(_run(rows))
    assert st["uniqueness/source_id_unique"] == dq.FAIL


def test_duplicate_titles_warn_not_fail():
    rows = [_row(source_id="a", title="Same Title"), _row(source_id="b", title="Same Title")]
    st = _statuses(_run(rows))
    assert st["uniqueness/title_not_duplicated"] == dq.WARN


# --- validity -------------------------------------------------------------

def test_contract_violation_fails_validity():
    rows = [_row(), _row(source_id="bad", title=12345)]
    st = _statuses(_run(rows))
    assert st["validity/contract_compliance"] == dq.FAIL


def test_string_years_are_checked_not_skipped():
    """Regression: counting only `int` years inspected 73% of the corpus.

    Measured 2026-11-04: the real manifest stores year as int on 4,878 rows and
    as str on 1,789. A check that only saw ints reported a clean result while
    ignoring a quarter of the data.
    """
    rows = [_row(source_id=f"i{i}", year="2026") for i in range(199)]
    rows.append(_row(source_id="ancient", year="1863"))
    results = _run(rows)
    res = next(r for r in results if r.check == "year_in_range")
    # 200 string years inspected, not 0: the old int-only path saw none of them.
    assert "/200 " in str(res.observed), f"all string years must be inspected: {res.observed}"
    # 1 of 200 is 0.5%, under the 1% hard threshold, so this is a warning.
    assert _statuses(results)["validity/year_in_range"] == dq.WARN


def test_year_out_of_range_above_one_percent_fails():
    rows = [_row(source_id=f"i{i}", year=2026) for i in range(10)]
    rows.append(_row(source_id="ancient", year=1863))  # 1/11 = 9%
    assert _statuses(_run(rows))["validity/year_in_range"] == dq.FAIL


def test_year_outside_range_is_flagged():
    res = next(r for r in _run([_row(year=1863)]) if r.check == "year_in_range")
    assert res.status in (dq.WARN, dq.FAIL)
    assert "1863" in res.samples


# --- consistency ----------------------------------------------------------

def test_contradictory_full_text_flag_fails_consistency():
    rows = [_row(has_full_text=True, full_text="")]
    st = _statuses(_run(rows))
    assert st["consistency/full_text_flag_matches_value"] == dq.FAIL


def test_mixed_year_types_warn_consistency():
    rows = [_row(source_id="a", year=2026), _row(source_id="b", year="2026")]
    st = _statuses(_run(rows))
    assert st["consistency/year_single_type"] == dq.WARN


def test_uniform_year_type_passes_consistency():
    rows = [_row(source_id=f"i{i}", year=2026) for i in range(3)]
    st = _statuses(_run(rows))
    assert st["consistency/year_single_type"] == dq.PASS


def test_unstamped_rows_warn_provenance():
    rows = [_row()]  # no _validated_at or _repaired_at
    st = _statuses(_run(rows))
    assert st["consistency/provenance_present"] == dq.WARN


def test_repaired_stamp_satisfies_provenance():
    rows = [_row(_repaired_at="2026-11-04T00:00:00+00:00")]
    st = _statuses(_run(rows))
    assert st["consistency/provenance_present"] == dq.PASS


# --- timeliness -----------------------------------------------------------

def test_stale_rows_fail_timeliness():
    old = (datetime.now(timezone.utc) - timedelta(hours=400)).isoformat()
    st = _statuses(_run([_row(retrieved_at=old)], max_age_hours=168))
    assert st["timeliness/stale_rows"] == dq.FAIL


def test_fresh_rows_pass_timeliness():
    st = _statuses(_run([_row()], max_age_hours=168))
    assert st["timeliness/stale_rows"] == dq.PASS


def test_unparseable_timestamp_is_reported_not_crashed():
    st = _statuses(_run([_row(retrieved_at="not-a-date")]))
    assert st["timeliness/retrieved_at_parseable"] == dq.WARN


# --- volume ---------------------------------------------------------------

def test_row_count_below_minimum_fails_volume():
    st = _statuses(_run([_row()], min_rows=100))
    assert st["volume/row_count_in_band"] == dq.FAIL


def test_row_count_above_maximum_fails_volume():
    rows = [_row(source_id=f"i{i}") for i in range(5)]
    st = _statuses(_run(rows, max_rows=2))
    assert st["volume/row_count_in_band"] == dq.FAIL


# --- driver ---------------------------------------------------------------

def test_cli_exit_zero_when_clean_and_one_on_failure(tmp_path):
    good = tmp_path / "good.jsonl"
    good.write_text(json.dumps(_row()) + "\n", encoding="utf-8")
    assert dq.main(["--manifest", str(good)]) == 0

    bad = tmp_path / "bad.jsonl"
    bad.write_text(json.dumps(_row(source_id="d")) + "\n"
                   + json.dumps(_row(source_id="d")) + "\n", encoding="utf-8")
    assert dq.main(["--manifest", str(bad)]) == 1


def test_cli_missing_manifest_returns_2(tmp_path):
    assert dq.main(["--manifest", str(tmp_path / "nope.jsonl")]) == 2


def test_unparseable_lines_are_surfaced(tmp_path):
    p = tmp_path / "m.jsonl"
    p.write_text("{not json\n" + json.dumps(_row()) + "\n", encoding="utf-8")
    rows, bad = dq.load(p)
    assert len(rows) == 1
    assert len(bad) == 1
    assert "line 1" in bad[0]


def test_json_output_includes_counts(tmp_path):
    p = tmp_path / "m.jsonl"
    p.write_text(json.dumps(_row()) + "\n", encoding="utf-8")
    rows, bad = dq.load(p)
    report = dq.Report(manifest=str(p), rows=len(rows))
    for r in dq.evaluate(rows):
        report.add(r)
    d = report.to_dict()
    assert set(d["counts"]) == {dq.PASS, dq.WARN, dq.FAIL}
    assert d["rows"] == 1
    assert d["ok"] is True
