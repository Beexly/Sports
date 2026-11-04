"""Re-runnable verification of the gse-postgres architecture assessment.

The assessment in docs/engine/architecture/DB-ARCHITECTURE-ASSESSMENT-2026-11-04.md
is a measurement, not an opinion. This script re-measures it so the findings can
be re-checked before and after remediation, and so a regression (someone
re-adding a redundant index, autovacuum silently stopping again) is visible
rather than remembered.

Each check reports the OBSERVED value against a documented expectation. Exit 1
if any check fails, 0 if all pass, 2 if the database cannot be reached.

    python scripts/ops/db_architecture_check.py
    python scripts/ops/db_architecture_check.py --json
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

# Reuse the Neon CLI runner from the export script: it already handles the
# Windows .cmd shim and the -f quoting problem.
from picks_export import _run  # noqa: E402

# Indexes that are a strict leading-column prefix of a longer index on the same
# table. Measured present 2026-11-04; expected absent after remediation.
PREFIX_REDUNDANT = [
    "odds_gameId_idx",
    "jarvis_memory_events_scope_idx",
    "signals_entityType_entityId_idx",
    "ingestion_runs_status_idx",
    "player_game_stats_playerId_idx",
    "source_snapshots_provider_sourceKind_idx",
]

PASS, WARN, FAIL = "PASS", "WARN", "FAIL"


def scalar(sql: str) -> list[str]:
    """Run a query and return the first row's cells as strings.

    The embedded psql prints a bordered table:

        reltuples | count
        ----------+------
          7746213 | 9123098
        (1 row)

    so the data row is the first content line AFTER the dashes rule. Returning
    the header instead was a real bug: every check failed with
    "invalid literal for int() with base 10: 'reltuples'".
    """
    out = _run(sql)
    seen_rule = False
    for line in out.splitlines():
        s = line.strip()
        if not s or s.startswith("INFO:"):
            continue
        if set(s) <= set("-+| "):
            seen_rule = True
            continue
        if not seen_rule or s.startswith("("):
            continue
        cells = [c.strip() for c in s.strip("|").split("|")]
        if any(cells):
            return cells
    return []


def check_odds_planner_drift() -> dict:
    cells = scalar(
        "SELECT c.reltuples::bigint, (SELECT count(*) FROM odds) "
        "FROM pg_class c WHERE c.relname='odds';"
    )
    est, actual = int(cells[0]), int(cells[1])
    drift = abs(est - actual) / max(actual, 1)
    return {
        "check": "odds: planner estimate vs actual row count",
        "observed": f"est={est:,} actual={actual:,} drift={drift:.1%}",
        "expected": "< 20% after ANALYZE",
        "status": PASS if drift < 0.20 else FAIL,
    }


def check_prefix_redundant_present() -> dict:
    names = ",".join(f"'{n}'" for n in PREFIX_REDUNDANT)
    cells = scalar(
        f"SELECT count(*) FROM pg_indexes WHERE schemaname='public' "
        f"AND indexname IN ({names});"
    )
    n = int(cells[0])
    return {
        "check": "prefix-redundant indexes still present",
        "observed": f"{n} of {len(PREFIX_REDUNDANT)}",
        "expected": "0 after remediation (WARN if present)",
        "status": WARN if n else PASS,
    }


def check_odds_index_overhead() -> dict:
    cells = scalar(
        "SELECT pg_relation_size('odds'), pg_indexes_size('odds');"
    )
    heap, idx = int(cells[0]), int(cells[1])
    ratio = idx / max(heap, 1)
    return {
        "check": "odds: index bytes as share of heap",
        "observed": f"{ratio:.0%} ({idx/1024/1024:.0f} MB idx / {heap/1024/1024:.0f} MB heap)",
        "expected": "< 45% (was 56%)",
        "status": PASS if ratio < 0.45 else FAIL,
    }


def check_autovacuum_odds() -> dict:
    cells = scalar(
        "SELECT autovacuum_count, autoanalyze_count FROM pg_stat_user_tables "
        "WHERE relname='odds';"
    )
    av, an = int(cells[0]), int(cells[1])
    return {
        "check": "odds: autovacuum/autoanalyze ever fired",
        "observed": f"vacuum={av} analyze={an}",
        "expected": "both > 0 after P0",
        "status": FAIL if an == 0 else PASS,
    }


def check_unused_index_bytes() -> dict:
    cells = scalar(
        "SELECT count(*), coalesce(sum(pg_relation_size(indexrelid)),0) "
        "FROM pg_stat_user_indexes WHERE schemaname='public' AND idx_scan=0;"
    )
    n, b = int(cells[0]), int(cells[1])
    return {
        "check": "zero-scan index inventory (directional only)",
        "observed": f"{n} indexes, {b/1024/1024:.0f} MB",
        "expected": "informational — counters were reset, not proof of disuse",
        "status": WARN if b > 500 * 1024 * 1024 else PASS,
    }


def check_cron_jobs() -> dict:
    cells = scalar("SELECT count(*) FROM cron.job;")
    n = int(cells[0])
    return {
        "check": "scheduled maintenance jobs",
        "observed": f"{n} pg_cron jobs",
        "expected": ">= 1 after P0",
        "status": FAIL if n == 0 else PASS,
    }


def check_picks_index_count() -> dict:
    cells = scalar(
        "SELECT count(*) FROM pg_indexes WHERE schemaname='public' "
        "AND tablename='picks';"
    )
    n = int(cells[0])
    return {
        "check": "indexes on picks (5,130 rows)",
        "observed": f"{n}",
        "expected": "<= 6 after P1b (was 10)",
        "status": PASS if n <= 6 else WARN,
    }


CHECKS = [
    check_odds_planner_drift,
    check_prefix_redundant_present,
    check_odds_index_overhead,
    check_autovacuum_odds,
    check_unused_index_bytes,
    check_cron_jobs,
    check_picks_index_count,
]


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Verify the DB architecture assessment")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args(argv)

    results = []
    for fn in CHECKS:
        try:
            results.append(fn())
        except Exception as exc:  # noqa: BLE001 - one failing check must not hide the rest
            results.append({
                "check": fn.__name__, "observed": f"ERROR: {exc}",
                "expected": "check ran", "status": FAIL,
            })

    counts = {s: sum(1 for r in results if r["status"] == s) for s in (PASS, WARN, FAIL)}
    payload = {"checks": results, "counts": counts,
               "ok": counts[FAIL] == 0}

    if args.json:
        print(json.dumps(payload, indent=2))
    else:
        for r in results:
            print(f"[{r['status']}] {r['check']}")
            print(f"       observed: {r['observed']}")
            print(f"       expected: {r['expected']}")
        print()
        print(f"{counts[PASS]} pass, {counts[WARN]} warn, {counts[FAIL]} fail")

    return 0 if counts[FAIL] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
