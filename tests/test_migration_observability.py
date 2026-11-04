"""Tests for scripts/ops/migration_observability.py.

Offline: the DB layer (`_run`, imported from picks_export) is monkeypatched,
and the pure functions are tested directly. No database access.

Regression coverage for two real bugs that were fixed in the module:

1. `parse_prisma_schema` used to skip every capitalised field type as if it
   were a relation. That discarded enum-typed columns (`status GameStatus`
   is a column; `game Game` is a relation). The old parser therefore
   reported dozens of phantom "unknown" columns.

2. `fetch_table_state` used to split on '|' after .strip('|') and skip any
   row with fewer than 6 fields. psql renders a NULL trailing column as an
   empty field, so rows whose last_autoanalyze is NULL were silently
   dropped -- `never_analyzed` reported zero while `odds` sat at
   autoanalyze_count=0.

Also covered: `check_migration_drift` compares applied_at chronology
against the baseline, NOT lexicographic name order (the baseline
`20260101000000` sorts before every 2026-05..08 migration it replaced but
was applied after them).
"""

from __future__ import annotations

import importlib.util
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]
_MOD = REPO / "scripts" / "ops" / "migration_observability.py"

_spec = importlib.util.spec_from_file_location("migration_observability", _MOD)
mo = importlib.util.module_from_spec(_spec)  # type: ignore[arg-type]
sys.modules["migration_observability"] = mo
_spec.loader.exec_module(mo)  # type: ignore[union-attr]


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _mig(name, finished, rolled_back=""):
    return {
        "migration_name": name,
        "started_at": finished,
        "finished_at": finished,
        "rolled_back_at": rolled_back,
        "applied_steps_count": "1",
    }


def _result(check, status):
    return {
        "check": check,
        "observed": [],
        "display": "x",
        "threshold": "0",
        "status": status,
        "detail": "",
    }


# Prisma snippet: enum-typed field (column) vs model-typed fields (relations).
PRISMA_SNIPPET = """\
model Game {
  id String @id @default(cuid())
  status GameStatus @default(SCHEDULED)
  homeScore Int?
  game Game @relation(fields: [gameId], references: [id])
  sport Sport @relation(fields: [sportId], references: [id])
  odds Odds[]
  @@map("games")
}

model Odds {
  id String @id @default(cuid())
  gameId String
  market OddsMarket
  game Game @relation(fields: [gameId], references: [id])
  @@map("odds")
}

model Sport {
  id String @id @default(cuid())
  @@map("sports")
}

enum GameStatus {
  SCHEDULED
  LIVE
  FINAL
}

enum OddsMarket {
  H2H
  SPREADS
}
"""

# psql-style output for pg_stat_user_tables. `odds` has last_autoanalyze
# NULL, rendered as an empty trailing field ("... | 0 |" with nothing
# after the final pipe). `picks` is a short row (5 fields, no trailing
# pipe at all) to exercise the padding path. `games` has a real timestamp.
TABLE_STATE = """\
INFO: Connecting to the database using embedded psql (TypeScript)...
 relname | n_live_tup | n_dead_tup | autoanalyze_count | autovacuum_count | last_autoanalyze
---------+------------+-------------------+------------------+-------------------
 odds    |      50000 |         10 |                 0 |                0 |
 games   |      12000 |          5 |                 3 |                1 | 2026-11-01 00:00:00
 picks   |       8000 |          5 |                 0 |                2
(3 rows)
"""


# ---------------------------------------------------------------------------
# parse_prisma_enums
# ---------------------------------------------------------------------------

def test_parse_prisma_enums_returns_declared_names():
    assert mo.parse_prisma_enums(PRISMA_SNIPPET) == {"GameStatus", "OddsMarket"}


def test_parse_prisma_enums_empty_when_no_enums():
    assert mo.parse_prisma_enums("model A {\n  id String\n}\n") == set()


def test_parse_prisma_enums_real_schema_contains_game_status():
    text = mo.SCHEMA_PRISMA.read_text(encoding="utf-8")
    assert "GameStatus" in mo.parse_prisma_enums(text)


# ---------------------------------------------------------------------------
# parse_prisma_schema -- regression 1: enum vs relation
# ---------------------------------------------------------------------------

def test_parse_prisma_schema_includes_enum_typed_field():
    """Regression: old parser skipped every capitalised type, so `status`
    (GameStatus) was dropped even though it is a real column."""
    tables = mo.parse_prisma_schema(PRISMA_SNIPPET)
    assert "status" in tables["games"]
    assert "homeScore" in tables["games"]
    assert "id" in tables["games"]


def test_parse_prisma_schema_excludes_model_relations():
    """Model-typed fields are relations, not columns, and must be excluded."""
    tables = mo.parse_prisma_schema(PRISMA_SNIPPET)
    assert "game" not in tables["games"]
    assert "sport" not in tables["games"]
    assert "odds" not in tables["games"]
    # Enum-typed field on Odds is a column; its relation is not.
    assert "market" in tables["odds"]
    assert "game" not in tables["odds"]


def test_parse_prisma_schema_real_schema_games_contains_status():
    """Real schema: `games` must contain 'status' (GameStatus enum)."""
    text = mo.SCHEMA_PRISMA.read_text(encoding="utf-8")
    tables = mo.parse_prisma_schema(text)
    assert "status" in tables["games"]
    assert "sport" not in tables["games"]
    assert "odds" not in tables["games"]


def test_parse_prisma_schema_uses_mapped_table_name():
    tables = mo.parse_prisma_schema(PRISMA_SNIPPET)
    assert "games" in tables  # from @@map("games"), not model name "Game"
    assert "odds" in tables
    assert "Game" not in tables


# ---------------------------------------------------------------------------
# fetch_table_state -- regression 2: NULL trailing field
# ---------------------------------------------------------------------------

def test_fetch_table_state_keeps_row_with_null_trailing_field(monkeypatch):
    """Regression: old parser stripped '|' and required 6 fields, so a row
    with last_autoanalyze NULL (empty trailing field) was dropped."""
    monkeypatch.setattr(mo, "_run", lambda sql: TABLE_STATE)
    state = mo.fetch_table_state()
    assert "odds" in state
    assert state["odds"]["live"] == 50000
    assert state["odds"]["autoanalyze"] == 0
    assert state["odds"]["last_autoanalyze"] == ""


def test_fetch_table_state_pads_short_row(monkeypatch):
    """A trimmed 5-field row is padded to 6, not dropped."""
    monkeypatch.setattr(mo, "_run", lambda sql: TABLE_STATE)
    state = mo.fetch_table_state()
    assert "picks" in state
    assert state["picks"]["autoanalyze"] == 0
    assert state["picks"]["live"] == 8000


def test_fetch_table_state_keeps_normal_row_and_skips_header(monkeypatch):
    monkeypatch.setattr(mo, "_run", lambda sql: TABLE_STATE)
    state = mo.fetch_table_state()
    assert "relname" not in state
    assert "(3 rows)" not in state
    assert state["games"]["last_autoanalyze"] == "2026-11-01 00:00:00"
    assert state["games"]["autoanalyze"] == 3


def test_fetch_table_state_then_never_analyzed_flags_odds(monkeypatch):
    """End-to-end impact of bug 2: with the rows retained, never_analyzed
    must flag `odds` (50000 rows, autoanalyze_count=0) instead of
    reporting zero."""
    monkeypatch.setattr(mo, "_run", lambda sql: TABLE_STATE)
    state = mo.fetch_table_state()
    result = mo.check_never_analyzed(state)
    assert result["observed"] == [{"table": "odds", "rows": 50000},
                                   {"table": "picks", "rows": 8000}]
    assert result["status"] == mo.CRIT


# ---------------------------------------------------------------------------
# check_migration_drift -- chronology, not lexicographic order
# ---------------------------------------------------------------------------

BASELINE = "20260101000000_baseline"
OLD_PRE_BASELINE = "20260501000000_old_thing"        # absent, applied BEFORE baseline
NEW_POST_BASELINE = "20260924190000_pick_signal_snapshot_ngs"  # absent, applied AFTER
ON_DISK_RECENT = "20260902230000_game_merge_alias"   # present on disk, applied after


def _drift_migrations():
    return [
        _mig(OLD_PRE_BASELINE, "2026-05-01T00:00:00+00:00"),
        _mig(BASELINE, "2026-09-02T00:00:00+00:00"),
        _mig(ON_DISK_RECENT, "2026-09-02T23:00:00+00:00"),
        _mig(NEW_POST_BASELINE, "2026-09-24T19:00:00+00:00"),
    ]


def _patch_migrations_dir(monkeypatch, tmp_path):
    for name in (BASELINE, ON_DISK_RECENT):
        (tmp_path / name).mkdir()
    monkeypatch.setattr(mo, "MIGRATIONS_DIR", tmp_path)


def test_check_migration_drift_uses_chronology_not_lexicographic(monkeypatch, tmp_path):
    """Baseline sorts BEFORE the old migration lexicographically but was
    APPLIED after it. A lexicographic comparator would flag the old one;
    the chronological check must not."""
    # Fixture validity: lexicographic order really does disagree here.
    assert BASELINE < OLD_PRE_BASELINE
    _patch_migrations_dir(monkeypatch, tmp_path)
    result = mo.check_migration_drift(_drift_migrations())
    assert OLD_PRE_BASELINE not in result["observed"]


def test_check_migration_drift_flags_post_baseline_absent(monkeypatch, tmp_path):
    _patch_migrations_dir(monkeypatch, tmp_path)
    result = mo.check_migration_drift(_drift_migrations())
    assert result["observed"] == [NEW_POST_BASELINE]
    assert result["status"] == mo.CRIT


def test_check_migration_drift_ignores_on_disk(monkeypatch, tmp_path):
    _patch_migrations_dir(monkeypatch, tmp_path)
    result = mo.check_migration_drift(_drift_migrations())
    assert ON_DISK_RECENT not in result["observed"]
    assert BASELINE not in result["observed"]


def test_check_migration_drift_ok_when_no_drift(monkeypatch, tmp_path):
    _patch_migrations_dir(monkeypatch, tmp_path)
    result = mo.check_migration_drift([_mig(BASELINE, "2026-09-02T00:00:00+00:00")])
    assert result["observed"] == []
    assert result["status"] == mo.OK


# ---------------------------------------------------------------------------
# check_schema_unknown_columns
# ---------------------------------------------------------------------------

def test_check_schema_unknown_columns_reports_extra_and_ignores_underscore():
    schema = {"games": {"id", "status"}, "odds": {"id", "market"}}
    columns = {
        "games": {"id", "status", "hadNgsSignal", "_prisma_generated"},
        "odds": {"id", "market", "_should_ignore"},
    }
    result = mo.check_schema_unknown_columns(schema, columns)
    assert result["observed"] == {"games": ["hadNgsSignal"]}
    assert result["status"] == mo.CRIT


def test_check_schema_unknown_columns_ok_when_no_extra():
    schema = {"games": {"id", "status"}}
    columns = {"games": {"id", "status"}}
    result = mo.check_schema_unknown_columns(schema, columns)
    assert result["observed"] == {}
    assert result["status"] == mo.OK


def test_check_schema_unknown_columns_ignores_table_absent_from_db():
    schema = {"games": {"id"}, "odds": {"id"}}
    columns = {"games": {"id"}}
    result = mo.check_schema_unknown_columns(schema, columns)
    assert result["status"] == mo.OK


# ---------------------------------------------------------------------------
# other checks: behaviour
# ---------------------------------------------------------------------------

def test_check_failed_migrations_detects_unfinished_and_rolled():
    migrations = [
        _mig("20260101000000_baseline", "2026-09-02T00:00:00+00:00"),
        _mig("20260901000000_unfinished", ""),
        _mig("20260902000000_rolled", "2026-09-02T00:00:00+00:00",
             rolled_back="2026-09-02T01:00:00+00:00"),
    ]
    result = mo.check_failed_migrations(migrations)
    assert result["observed"] == {
        "unfinished": ["20260901000000_unfinished"],
        "rolled_back": ["20260902000000_rolled"],
    }
    assert result["status"] == mo.CRIT


def test_check_never_analyzed_ignores_small_tables():
    state = {"odds": {"live": 500, "dead": 0, "autoanalyze": 0,
                      "autovacuum": 0, "last_autoanalyze": ""}}
    result = mo.check_never_analyzed(state)
    assert result["observed"] == []
    assert result["status"] == mo.OK


def test_check_dead_tuples_warns_over_threshold():
    # Exactly 10% dead is not over a 10% threshold -> OK.
    boundary = {"odds": {"live": 9000, "dead": 1000, "autoanalyze": 1,
                         "autovacuum": 1, "last_autoanalyze": "2026-11-01"}}
    result = mo.check_dead_tuples(boundary)
    assert result["status"] == mo.OK
    assert result["observed"] == []
    # 20% dead is over -> WARN.
    bloated = {"odds": {"live": 8000, "dead": 2000, "autoanalyze": 1,
                        "autovacuum": 1, "last_autoanalyze": "2026-11-01"}}
    result2 = mo.check_dead_tuples(bloated)
    assert result2["status"] == mo.WARN
    assert result2["observed"][0]["table"] == "odds"


def test_check_cron_jobs_crit_on_zero(monkeypatch):
    monkeypatch.setattr(mo, "fetch_scalar", lambda sql: "0")
    result = mo.check_cron_jobs()
    assert result["observed"] == 0
    assert result["status"] == mo.CRIT


def test_check_cron_jobs_ok_with_job(monkeypatch):
    monkeypatch.setattr(mo, "fetch_scalar", lambda sql: "2")
    result = mo.check_cron_jobs()
    assert result["observed"] == 2
    assert result["status"] == mo.OK


def test_check_planner_error_warns_on_large_drift(monkeypatch):
    def fake(sql):
        if "reltuples" in sql:
            return "1000"
        return "3000"
    monkeypatch.setattr(mo, "fetch_scalar", fake)
    result = mo.check_planner_error()
    assert result["status"] == mo.WARN
    assert result["observed"][0]["table"] == "odds"


def test_check_planner_error_ok_when_estimates_agree(monkeypatch):
    monkeypatch.setattr(mo, "fetch_scalar", lambda sql: "1000")
    result = mo.check_planner_error()
    assert result["status"] == mo.OK
    assert result["observed"] == []


# ---------------------------------------------------------------------------
# every check returns the standard dict shape
# ---------------------------------------------------------------------------

def test_all_checks_return_standard_shape(monkeypatch, tmp_path):
    _patch_migrations_dir(monkeypatch, tmp_path)
    now = datetime.now(timezone.utc).isoformat()
    migrations = [_mig(BASELINE, now)]
    state = {"odds": {"live": 5000, "dead": 10, "autoanalyze": 1,
                      "autovacuum": 1, "last_autoanalyze": now}}
    monkeypatch.setattr(mo, "fetch_scalar", lambda sql: "1")

    results = [
        mo.check_migration_drift(migrations),
        mo.check_schema_unknown_columns({"games": {"id"}}, {"games": {"id"}}),
        mo.check_failed_migrations(migrations),
        mo.check_recency(migrations),
        mo.check_never_analyzed(state),
        mo.check_dead_tuples(state),
        mo.check_cron_jobs(),
        mo.check_planner_error(),
    ]
    expected_names = [
        "migration_drift", "schema_unknown_columns", "failed_migrations",
        "migration_recency", "never_analyzed", "dead_tuples",
        "cron_jobs", "planner_error",
    ]
    assert [r["check"] for r in results] == expected_names
    for r in results:
        assert set(r.keys()) == {"check", "observed", "display",
                                 "threshold", "status", "detail"}, r
        assert r["status"] in (mo.OK, mo.WARN, mo.CRIT)


# ---------------------------------------------------------------------------
# emit_metrics
# ---------------------------------------------------------------------------

def test_emit_metrics_one_status_line_per_check_and_aggregates():
    results = [
        _result("migration_drift", mo.OK),
        _result("never_analyzed", mo.CRIT),
        _result("dead_tuples", mo.WARN),
    ]
    text = mo.emit_metrics(results)
    assert 'gse_migration_check_status{check="migration_drift"} 0' in text
    assert 'gse_migration_check_status{check="never_analyzed"} 2' in text
    assert 'gse_migration_check_status{check="dead_tuples"} 1' in text
    status_lines = re.findall(r"^gse_migration_check_status\{", text, re.M)
    assert len(status_lines) == len(results)
    assert "gse_migration_checks_critical 1" in text
    assert "gse_migration_checks_warning 1" in text


def test_emit_metrics_counts_zero_when_all_ok():
    results = [_result("migration_drift", mo.OK), _result("cron_jobs", mo.OK)]
    text = mo.emit_metrics(results)
    assert "gse_migration_checks_critical 0" in text
    assert "gse_migration_checks_warning 0" in text
    assert "# HELP gse_migration_check_status" in text
    assert "# TYPE gse_migration_checks_critical gauge" in text
