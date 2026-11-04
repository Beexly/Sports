"""Tests for the architecture verification script.

The parsing is stubbed, not the database: `_run` is monkeypatched so these run
offline. The regression that matters is the header/rule parsing — the first
implementation returned the header row and every check failed converting
'reltuples' to int.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]
_MOD = REPO / "scripts" / "ops" / "db_architecture_check.py"

_spec = importlib.util.spec_from_file_location("db_architecture_check", _MOD)
dac = importlib.util.module_from_spec(_spec)
sys.modules["db_architecture_check"] = dac
_spec.loader.exec_module(dac)  # type: ignore[union-attr]

TABLE = """INFO: Connecting to the database using embedded psql (TypeScript)...
 reltuples | count
-----------+-------
   7746213 | 9123170
(1 row)
"""


def stub(monkeypatch, out):
    monkeypatch.setattr(dac, "_run", lambda sql: out)


# --- parsing --------------------------------------------------------------

def test_scalar_returns_data_row_not_header(monkeypatch):
    """Regression: returning the header made every check raise ValueError."""
    stub(monkeypatch, TABLE)
    assert dac.scalar("SELECT 1") == ["7746213", "9123170"]


def test_scalar_skips_info_and_footer(monkeypatch):
    stub(monkeypatch, TABLE)
    cells = dac.scalar("SELECT 1")
    assert "INFO:" not in cells[0]
    assert "(1 row)" not in cells[-1]


def test_scalar_handles_single_column(monkeypatch):
    stub(monkeypatch, " count\n-------\n     0\n(1 row)\n")
    assert dac.scalar("SELECT 1") == ["0"]


def test_scalar_returns_empty_when_no_table(monkeypatch):
    stub(monkeypatch, "ERROR: relation does not exist\n")
    assert dac.scalar("SELECT 1") == []


def test_scalar_handles_empty_result_set(monkeypatch):
    stub(monkeypatch, " count\n-------\n(0 rows)\n")
    assert dac.scalar("SELECT 1") == []


# --- individual checks ----------------------------------------------------

def test_planner_drift_passes_under_20pct(monkeypatch):
    stub(monkeypatch, TABLE)  # 7.75M vs 9.12M = 15.1%
    assert dac.check_odds_planner_drift()["status"] == dac.PASS


def test_planner_drift_fails_over_20pct(monkeypatch):
    stub(monkeypatch, " reltuples | count\n-----------+-------\n   1000000 | 9000000\n(1 row)\n")
    assert dac.check_odds_planner_drift()["status"] == dac.FAIL


def test_prefix_redundant_warns_when_present(monkeypatch):
    stub(monkeypatch, " count\n-------\n     6\n(1 row)\n")
    assert dac.check_prefix_redundant_present()["status"] == dac.WARN


def test_prefix_redundant_passes_when_removed(monkeypatch):
    stub(monkeypatch, " count\n-------\n     0\n(1 row)\n")
    assert dac.check_prefix_redundant_present()["status"] == dac.PASS


def test_index_overhead_fails_at_56pct(monkeypatch):
    # 834 MB of 1499 MB
    stub(monkeypatch, " pg_relation_size | pg_indexes_size\n"
                      "------------------+-----------------\n"
                      "       1571814400 | 874512384\n(1 row)\n")
    assert dac.check_odds_index_overhead()["status"] == dac.FAIL


def test_index_overhead_passes_when_reduced(monkeypatch):
    stub(monkeypatch, " a | b\n---+---\n 1571814400 | 600000000\n(1 row)\n")
    assert dac.check_odds_index_overhead()["status"] == dac.PASS


def test_autovacuum_fails_at_zero(monkeypatch):
    stub(monkeypatch, " autovacuum_count | autoanalyze_count\n"
                      "------------------+-------------------\n"
                      "                0 |                 0\n(1 row)\n")
    assert dac.check_autovacuum_odds()["status"] == dac.FAIL


def test_autovacuum_passes_once_analyze_ran(monkeypatch):
    stub(monkeypatch, " a | b\n---+---\n 1 | 3\n(1 row)\n")
    assert dac.check_autovacuum_odds()["status"] == dac.PASS


def test_cron_fails_with_no_jobs(monkeypatch):
    stub(monkeypatch, " count\n-------\n     0\n(1 row)\n")
    assert dac.check_cron_jobs()["status"] == dac.FAIL


def test_cron_passes_with_a_job(monkeypatch):
    stub(monkeypatch, " count\n-------\n     2\n(1 row)\n")
    assert dac.check_cron_jobs()["status"] == dac.PASS


def test_picks_index_count_warns_at_ten(monkeypatch):
    stub(monkeypatch, " count\n-------\n    10\n(1 row)\n")
    assert dac.check_picks_index_count()["status"] == dac.WARN


def test_picks_index_count_passes_at_six(monkeypatch):
    stub(monkeypatch, " count\n-------\n     6\n(1 row)\n")
    assert dac.check_picks_index_count()["status"] == dac.PASS


# --- driver ---------------------------------------------------------------

def test_a_failing_check_does_not_abort_the_run(monkeypatch):
    """One bad query must not hide the other six checks."""
    calls = {"n": 0}

    def flaky(sql):
        calls["n"] += 1
        if calls["n"] == 1:
            raise RuntimeError("boom")
        return " count\n-------\n     1\n(1 row)\n"

    monkeypatch.setattr(dac, "_run", flaky)
    assert dac.main([]) == 1  # the failure still exits non-zero


def test_main_returns_0_when_all_checks_pass(monkeypatch):
    """Simulate a post-remediation database where every expectation holds."""
    def by_query(sql):
        if "reltuples" in sql:
            return " a | b\n---+---\n 9000000 | 9100000\n(1 row)\n"   # 1.1% drift
        if "pg_indexes WHERE" in sql and "odds'" not in sql:
            return " count\n-------\n     0\n(1 row)\n"            # prefix + picks
        if "pg_indexes_size" in sql:
            heap = 1499 * 1024 * 1024          # 1,499 MB
            idx = int(heap * 0.33)             # 33% overhead
            return f" a | b\n---+---\n {heap} | {idx}\n(1 row)\n"
        if "autovacuum_count" in sql:
            return " a | b\n---+---\n 2 | 5\n(1 row)\n"
        if "pg_cron" in sql or "cron.job" in sql:
            return " count\n-------\n     2\n(1 row)\n"
        return " a | b\n---+---\n 0 | 0\n(1 row)\n"

    monkeypatch.setattr(dac, "_run", by_query)
    assert dac.main([]) == 0


def test_json_output_shape(monkeypatch, capsys):
    monkeypatch.setattr(dac, "_run", lambda sql: " x\n---\n 0\n(1 row)\n")
    dac.main(["--json"])
    out = capsys.readouterr().out
    assert '"checks"' in out and '"counts"' in out and '"ok"' in out
