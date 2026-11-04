"""Tests for the reproducible picks export.

The DB is stubbed via monkeypatch on `_run` so these run offline and stay fast.
The one property that matters most: a truncated export must FAIL, not silently
produce a smaller sample. That is exactly how the original evidence CSV went
wrong (2,662 of 4,262, biased 80.3% / 92.4% / 77.7% across markets).
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]
_MOD = REPO / "scripts" / "ops" / "picks_export.py"

_spec = importlib.util.spec_from_file_location("picks_export", _MOD)
pe = importlib.util.module_from_spec(_spec)
sys.modules["picks_export"] = pe
_spec.loader.exec_module(pe)  # type: ignore[union-attr]

HEADER = "id,pick_type,p,y,model_version,generated_at,lock_price,close_price\n"


def row(i, market="SPREAD", p="0.65", y="1"):
    return f"id{i},{market},{p},{y},v5.2.7,2026-10-01 00:00:00,,\n"


# --- scrape_count: parsing the embedded client's boxed table --------------

BOXED = """INFO: Connecting to the database using embedded psql (TypeScript)...
 count
-------
  3143
(1 row)
"""


def test_scrape_count_reads_boxed_table():
    assert pe.scrape_count(BOXED) == 3143


def test_scrape_count_ignores_info_and_footer_lines():
    assert pe.scrape_count(BOXED) == 3143  # no ('1' or 'INFO') leakage


def test_scrape_count_raises_on_garbage():
    with pytest.raises(RuntimeError):
        pe.scrape_count("ERROR: relation \"picks\" does not exist")


def test_scrape_count_handles_zero():
    assert pe.scrape_count(" count\n-------\n     0\n(1 row)\n") == 0


# --- export must refuse to write a truncated file ------------------------

def test_export_rejects_empty_output(monkeypatch, tmp_path):
    """COPY emits a header even with no rows. A header alone is a failure."""
    monkeypatch.setattr(pe, "_run", lambda sql: HEADER)
    with pytest.raises(RuntimeError, match="no data rows"):
        pe.export(tmp_path / "e.csv")


def test_export_writes_rows_and_metadata(monkeypatch, tmp_path):
    body = HEADER + "".join(row(i) for i in range(5))
    monkeypatch.setattr(pe, "_run", lambda sql: body)
    out = tmp_path / "e.csv"
    meta = pe.export(out)
    assert meta["rows"] == 5
    assert out.exists()
    assert meta["columns"] == ["id", "pick_type", "p", "y", "model_version",
                               "generated_at", "lock_price", "close_price"]
    assert len(meta["sha256"]) == 16


# --- verify: the guard that would have caught the original snapshot ------

def _write(tmp_path, lines):
    p = tmp_path / "e.csv"
    p.write_text(HEADER + "".join(lines), encoding="utf-8")
    return p


def test_verify_detects_row_count_mismatch(monkeypatch, tmp_path):
    """THE regression: file has 3 rows, DB has 100 -> not complete."""
    p = _write(tmp_path, [row(i) for i in range(3)])
    monkeypatch.setattr(pe, "_run", lambda sql: BOXED.replace("3143", "100"))
    v = pe.verify(p)
    assert v["file_rows"] == 3 and v["db_rows"] == 100
    assert v["match"] is False and v["complete"] is False


def test_verify_passes_when_counts_agree(monkeypatch, tmp_path):
    p = _write(tmp_path, [row(i) for i in range(3)])
    monkeypatch.setattr(pe, "_run", lambda sql: BOXED.replace("3143", "3"))
    v = pe.verify(p)
    assert v["match"] is True and v["complete"] is True


def test_verify_flags_out_of_range_p(monkeypatch, tmp_path):
    p = _write(tmp_path, [row(1, p="1.5"), row(2, p="0.5")])
    monkeypatch.setattr(pe, "_run", lambda sql: BOXED.replace("3143", "2"))
    v = pe.verify(p)
    assert v["p_out_of_range"] == 1
    assert v["complete"] is False


def test_verify_flags_non_binary_y(monkeypatch, tmp_path):
    """y must be 0 or 1; a stray PUSH/VOID leaking in as 2 means the WHERE
    clause broke and the population is no longer win/loss."""
    p = _write(tmp_path, [row(1, y="2")])
    monkeypatch.setattr(pe, "_run", lambda sql: BOXED.replace("3143", "1"))
    v = pe.verify(p)
    assert v["y_not_binary"] == 1
    assert v["complete"] is False


def test_verify_reports_markets_present(monkeypatch, tmp_path):
    p = _write(tmp_path, [row(1, "MONEYLINE"), row(2, "SPREAD"), row(3, "TOTAL")])
    monkeypatch.setattr(pe, "_run", lambda sql: BOXED.replace("3143", "3"))
    assert pe.verify(p)["markets"] == ["MONEYLINE", "SPREAD", "TOTAL"]


# --- SQL contract --------------------------------------------------------

def test_export_sql_excludes_non_outcomes_and_quotes_identifiers():
    sql = pe.EXPORT_SQL
    assert "IN ('WIN','LOSS')" in sql
    for col in ('"pickType"', '"isPublished"', '"modelVersion"', '"clvLockPrice"'):
        assert col in sql, f"camelCase identifier must be quoted: {col}"
    assert "COPY" in sql and "FORMAT csv" in sql


def test_count_sql_targets_the_same_population_as_the_export():
    """A COUNT on a different WHERE clause would verify nothing."""
    where = pe.POPULATION
    assert where in pe.EXPORT_SQL
    assert where in pe.COUNT_SQL


# --- CLI ----------------------------------------------------------------

def test_main_missing_file_returns_2(tmp_path):
    assert pe.main(["--out", str(tmp_path / "nope.csv"), "--verify-only"]) == 2


def test_main_reports_db_failure_as_2(monkeypatch, tmp_path):
    def boom(sql):
        raise RuntimeError("connection refused")
    monkeypatch.setattr(pe, "_run", boom)
    assert pe.main(["--out", str(tmp_path / "e.csv")]) == 2


def test_main_returns_1_on_incomplete_verify(monkeypatch, tmp_path):
    body = HEADER + row(1)
    monkeypatch.setattr(pe, "_run",
                        lambda sql: body if "COPY" in sql else BOXED.replace("3143", "999"))
    assert pe.main(["--out", str(tmp_path / "e.csv")]) == 1


def test_main_returns_0_on_clean_export(monkeypatch, tmp_path):
    body = HEADER + row(1) + row(2)
    monkeypatch.setattr(pe, "_run",
                        lambda sql: body if "COPY" in sql else BOXED.replace("3143", "2"))
    assert pe.main(["--out", str(tmp_path / "e.csv")]) == 0
    assert (tmp_path / "e.csv.manifest.json").exists()
