"""Migration observability for gse-postgres — drift, staleness, silent failure.

WHY THIS EXISTS

This repo has a forward-only Prisma chain and no instrumentation around it. The
only record of what actually reached production is `_prisma_migrations`, and
nobody compares it to the repo. On 2026-11-04 that comparison found real damage:

  * TWO migrations are applied in production and absent from every branch that
    merges to HEAD (`20260924190000_pick_signal_snapshot_ngs`,
    `20260924191000_research_artifact_source_kind`, from the unmerged branch
    `hermes/gse-signal-wiring-20260924`).

  * The artifacts they created exist in production: the `hadNgsSignal` column on
    `pick_signal_snapshots`, the `RESEARCH_ARTIFACT` enum value, and the
    `source_snapshots_provider_sourceKind_externalId_key` index.

  * `packages/db/prisma/schema.prisma` does NOT know about any of them.

So production is running a schema that the repository cannot rebuild AND that the
Prisma schema actively contradicts. Because `package.json` exposes `db:push`
(`prisma db push`), a single `db:push` against production would generate the
dropping side of that difference and remove the column.

That is the failure class this module watches for. It reports; it never repairs.

WHAT IT CHECKS

  1. migration_drift          applied in DB, absent from disk (post-baseline)
  2. schema_unknown_columns   columns in DB that schema.prisma does not declare
  3. failed_migrations        unfinished or rolled-back rows in _prisma_migrations
  4. migration_recency        age of the most recent applied migration
  5. never_analyzed           tables with rows but autoanalyze_count = 0
  6. dead_tuples              bloat ratio per table
  7. cron_jobs                scheduled maintenance (was 0)
  8. planner_error            reltuples vs count(*) divergence

CHRONOLOGY, not lexicographic order. The baseline is named `20260101000000`
(low) but was APPLIED after the 2026-05..2026-08 migrations it squashed. String
comparison therefore reports 54 false "drift" items. Drift is defined here by
applied_at ordering against the baseline's own applied_at.

USAGE
    python scripts/ops/migration_observability.py            # human check
    python scripts/ops/migration_observability.py --json
    python scripts/ops/migration_observability.py --metrics  # Prometheus text

Exit: 0 all pass, 1 any CRIT, 2 cannot run.
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from picks_export import _run  # noqa: E402  (Neon CLI runner: .cmd shim + -f quoting)

REPO = Path(__file__).resolve().parents[2]
MIGRATIONS_DIR = REPO / "packages" / "db" / "prisma" / "migrations"
SCHEMA_PRISMA = REPO / "packages" / "db" / "prisma" / "schema.prisma"

OK, WARN, CRIT = "OK", "WARN", "CRIT"

# Tables worth watching. Kept small on purpose: a check that scans 120 tables
# reports a wall of numbers nobody reads.
WATCH_TABLES = ["odds", "odds_line_snapshots", "signals", "picks",
                "ingestion_runs", "games", "player_game_stats"]


# --------------------------------------------------------------------------
# Prisma schema parsing
# --------------------------------------------------------------------------

_MODEL_RE = re.compile(r"^\s*model\s+(\w+)\s*\{", re.M)
_ENUM_RE = re.compile(r"^\s*enum\s+(\w+)\s*\{", re.M)
_MAP_RE = re.compile(r'@@map\("([^"]+)"\)')
_FIELD_RE = re.compile(r"^\s{2,}(\w+)\s+(\w+)")

# Prisma scalar types. Any other capitalised type name is either an enum (a real
# column) or a model (a relation, not a column).
SCALARS = {"String", "Int", "Boolean", "DateTime", "Float",
           "Decimal", "Json", "Bytes", "BigInt"}


def parse_prisma_enums(text: str) -> set[str]:
    """Names of every `enum` declared in the schema.

    Needed because an enum-typed field is indistinguishable from a relation to a
    naive parser: `status GameStatus` and `game Game` both look like
    `<word> <Word>`. The first is a COLUMN, the second is not. Skipping every
    capitalised type silently discarded real columns and made the drift check
    report 84 phantom "unknown" columns across 40 tables.
    """
    return {m.group(1) for m in _ENUM_RE.finditer(text)}


def parse_prisma_schema(text: str, enums: set[str] | None = None) -> dict[str, set[str]]:
    """Map database table name -> declared column names.

    Handles `@@map("table")` (the DB name differs from the model name in most of
    this schema), skips `@@` block attributes, and ignores `//` comments. Does
    not attempt to model relations or composite types; only declared scalar
    fields, which is what column drift needs.
    """
    enum_names = enums if enums is not None else parse_prisma_enums(text)
    model_names = set(_MODEL_RE.findall(text))
    tables: dict[str, set[str]] = {}
    pos = 0
    while True:
        m = _MODEL_RE.search(text, pos)
        if not m:
            break
        model = m.group(1)
        end = text.find("\n}", m.end())
        body = text[m.end(): end if end != -1 else len(text)]
        pos = m.end()

        columns: set[str] = set()
        mapped = None
        for raw in body.splitlines():
            line = raw.split("//")[0].rstrip()
            if not line.strip():
                continue
            map_m = _MAP_RE.search(line)
            if map_m:
                mapped = map_m.group(1)
                continue
            if line.strip().startswith("@@"):
                continue
            fm = _FIELD_RE.match(line)
            if fm:
                field, ftype = fm.group(1), fm.group(2)
                if ftype[0].isupper():
                    # Enum types are columns; model types are relations. An
                    # unrecognised capitalised name is treated as a relation so
                    # the check stays quiet rather than inventing a column.
                    if ftype not in SCALARS and ftype not in enum_names and ftype in model_names:
                        continue
                # A field-level @map renames the column: `updatedAt` is stored as
                # `updated_at`. Ignoring it reports every mapped field as an
                # unknown column -- the exact mirror of the enum bug above.
                fm_map = re.search(r'@map\("([^"]+)"\)', line)
                columns.add(fm_map.group(1) if fm_map else field)

        tables[mapped or model] = columns
    return tables


# --------------------------------------------------------------------------
# DB reads
# --------------------------------------------------------------------------

def fetch_migrations() -> list[dict]:
    sql = ('COPY (SELECT migration_name, started_at, finished_at, rolled_back_at, '
           'applied_steps_count FROM _prisma_migrations ORDER BY started_at) '
           'TO STDOUT WITH (FORMAT csv, HEADER);')
    raw = _run(sql)
    rows = list(csv.DictReader(io.StringIO(raw)))
    if not rows:
        raise RuntimeError("_prisma_migrations returned no rows")
    return rows


def fetch_columns() -> dict[str, set[str]]:
    sql = ("SELECT table_name || '|' || column_name FROM information_schema.columns "
           "WHERE table_schema='public';")
    out: dict[str, set[str]] = {}
    for line in _run(sql).splitlines():
        line = line.strip()
        if "|" not in line or line.startswith(("INFO", "table_name")):
            continue
        table, col = line.split("|", 1)
        out.setdefault(table.strip(), set()).add(col.strip())
    if not out:
        raise RuntimeError("could not read information_schema.columns")
    return out


def fetch_table_state() -> dict[str, dict]:
    sql = ("SELECT relname, n_live_tup, n_dead_tup, autoanalyze_count, "
           "autovacuum_count, last_autoanalyze FROM pg_stat_user_tables;")
    state: dict[str, dict] = {}
    for line in _run(sql).splitlines():
        s = line.strip()
        if not s or s.startswith(("INFO", "relname", "(")) or set(s) <= set("-+| "):
            continue
        parts = [p.strip() for p in s.split("|")]
        # psql renders a NULL trailing column as an empty field, so a trimmed
        # line can yield 5 fields where 6 were selected. Padding keeps `odds`
        # (last_autoanalyze NULL) in the result; dropping the row made
        # never_analyzed report zero while odds sat at autoanalyze_count = 0.
        if len(parts) < 5:
            continue
        parts += [""] * (6 - len(parts))
        try:
            state[parts[0]] = {
                "live": int(parts[1]),
                "dead": int(parts[2]),
                "autoanalyze": int(parts[3]),
                "autovacuum": int(parts[4]),
                "last_autoanalyze": parts[5],
            }
        except ValueError:
            continue
    return state


def fetch_scalar(sql: str) -> str:
    for line in _run(sql).splitlines():
        s = line.strip()
        if not s or s.startswith(("INFO", "(")) or set(s) <= set("-+| "):
            continue
        parts = [p.strip() for p in s.strip("|").split("|")]
        if parts and parts[0].replace(".", "").isdigit():
            return parts[0]
    return ""


# --------------------------------------------------------------------------
# Checks
# --------------------------------------------------------------------------

def _parse_ts(value: str) -> datetime | None:
    if not value:
        return None
    v = value.replace("+00", "+00:00")
    try:
        return datetime.fromisoformat(v)
    except ValueError:
        return None


def check_migration_drift(migrations: list[dict]) -> dict:
    """Applied in DB, absent from disk, and applied AFTER the baseline.

    Comparing names lexicographically is wrong: `20260101000000_baseline` sorts
    below every 2026-05..08 migration it replaced, yet was applied later. Drift
    is defined by applied_at against the baseline's applied_at.
    """
    on_disk = {p.name for p in MIGRATIONS_DIR.iterdir() if p.is_dir()}
    base = next((m for m in migrations if m["migration_name"].endswith("_baseline")), None)
    base_at = _parse_ts(base["finished_at"]) if base else None

    drifted = []
    for m in migrations:
        name = m["migration_name"]
        if name in on_disk:
            continue
        at = _parse_ts(m["finished_at"])
        if base_at and at and at > base_at:
            drifted.append(name)

    return {
        "check": "migration_drift",
        "observed": drifted,
        "display": f"{len(drifted)} applied migration(s) absent from disk",
        "threshold": "0",
        "status": CRIT if drifted else OK,
        "detail": ("Applied to production from a branch that is not in HEAD. "
                   "A fresh database cannot be rebuilt from the repo.") if drifted else "",
    }


def check_schema_unknown_columns(schema: dict[str, set[str]], columns: dict[str, set[str]]) -> dict:
    """Columns present in the DB that schema.prisma does not declare.

    This is the dangerous direction: `prisma db push` would drop them. The
    reverse (declared but absent) is just an unapplied migration.
    """
    unknown: dict[str, list[str]] = {}
    for table, declared in schema.items():
        actual = columns.get(table)
        if not actual:
            continue
        extra = sorted(actual - declared)
        # Prisma's own bookkeeping and generated columns are not schema drift.
        extra = [c for c in extra if not c.startswith("_")]
        if extra:
            unknown[table] = extra

    tables = len(unknown)
    cols = sum(len(v) for v in unknown.values())
    return {
        "check": "schema_unknown_columns",
        "observed": unknown,
        "display": f"{cols} column(s) across {tables} table(s) not in schema.prisma",
        "threshold": "0",
        "status": CRIT if unknown else OK,
        "detail": ("`db:push` (prisma db push) would generate DROP COLUMN for these."
                   if unknown else ""),
    }


def check_schema_declared_missing_in_db(schema: dict[str, set[str]],
                                       columns: dict[str, set[str]]) -> dict:
    """Columns declared in schema.prisma that the database does not have.

    The mirror of check_schema_unknown_columns, and the direction that throws
    rather than corrupts: the generated client emits SELECTs for a column that
    is not there, so every query touching the model fails at runtime. The other
    direction drops data silently.

    Checking only one direction is what let the 11-column drift survive: the
    schema was missing columns the database had, and nothing asked whether the
    schema also claimed columns the database lacked.
    """
    missing: dict[str, list[str]] = {}
    for table, declared in schema.items():
        actual = columns.get(table)
        if not actual:
            continue
        absent = sorted(declared - actual)
        if absent:
            missing[table] = absent
    tables = len(missing)
    cols = sum(len(v) for v in missing.values())
    return {
        "check": "schema_declared_missing_in_db",
        "observed": missing,
        "display": f"{cols} column(s) across {tables} table(s) declared but absent from the DB",
        "threshold": "0",
        "status": CRIT if missing else OK,
        "detail": "prisma migrate deploy would create these; the current client would fail on them."
                  if missing else "",
    }


def check_failed_migrations(migrations: list[dict]) -> dict:
    unfinished = [m["migration_name"] for m in migrations
                  if not m["finished_at"] and not m["rolled_back_at"]]
    rolled = [m["migration_name"] for m in migrations if m["rolled_back_at"]]
    bad = unfinished + rolled
    return {
        "check": "failed_migrations",
        "observed": {"unfinished": unfinished, "rolled_back": rolled},
        "display": f"{len(unfinished)} unfinished, {len(rolled)} rolled back",
        "threshold": "0",
        "status": CRIT if bad else OK,
        "detail": "",
    }


def check_recency(migrations: list[dict], max_days: int = 45) -> dict:
    latest = max((_parse_ts(m["finished_at"]) for m in migrations
                  if _parse_ts(m["finished_at"])), default=None)
    if latest is None:
        return {"check": "migration_recency", "observed": None,
                "display": "no applied migrations", "threshold": f"<= {max_days}d",
                "status": CRIT, "detail": ""}
    age = (datetime.now(timezone.utc) - latest).days
    return {
        "check": "migration_recency",
        "observed": {"last_applied": latest.isoformat(), "age_days": age},
        "display": f"last applied {age}d ago",
        "threshold": f"<= {max_days}d",
        "status": OK if age <= max_days else WARN,
        "detail": "informational: a quiet schema is normal, a dead one is not",
    }


def check_never_analyzed(state: dict[str, dict], min_rows: int = 1000) -> dict:
    bad = []
    for t in WATCH_TABLES:
        s = state.get(t)
        if not s:
            continue
        if s["live"] >= min_rows and s["autoanalyze"] == 0:
            bad.append({"table": t, "rows": s["live"]})
    return {
        "check": "never_analyzed",
        "observed": bad,
        "display": f"{len(bad)} table(s) with rows but autoanalyze_count = 0",
        "threshold": "0",
        "status": CRIT if bad else OK,
        "detail": "planner histograms are absent or from an unknown older snapshot",
    }


def check_dead_tuples(state: dict[str, dict], max_pct: float = 10.0) -> dict:
    bad = []
    for t in WATCH_TABLES:
        s = state.get(t)
        if not s:
            continue
        total = s["live"] + s["dead"]
        if total <= 0:
            continue
        pct = 100.0 * s["dead"] / total
        if pct > max_pct:
            bad.append({"table": t, "dead_pct": round(pct, 1), "dead": s["dead"]})
    return {
        "check": "dead_tuples",
        "observed": bad,
        "display": f"{len(bad)} table(s) over {max_pct:.0f}% dead tuples",
        "threshold": f"<= {max_pct:.0f}%",
        "status": WARN if bad else OK,
        "detail": "",
    }


def check_cron_jobs() -> dict:
    n = fetch_scalar("SELECT count(*) FROM cron.job;")
    try:
        count = int(n)
    except ValueError:
        return {"check": "cron_jobs", "observed": n, "display": "unreadable",
                "threshold": ">= 1", "status": CRIT, "detail": "cron schema not readable"}
    return {
        "check": "cron_jobs",
        "observed": count,
        "display": f"{count} pg_cron job(s)",
        "threshold": ">= 1",
        "status": OK if count >= 1 else CRIT,
        "detail": "" if count else "no scheduled maintenance exists anywhere",
    }


def check_planner_error(tables: list[str] | None = None, max_drift: float = 0.20) -> dict:
    bad = []
    for t in (tables or ["odds"]):
        try:
            est = fetch_scalar(f"SELECT reltuples::bigint FROM pg_class WHERE relname='{t}';")
            actual = fetch_scalar(f"SELECT count(*) FROM {t};")
            e, a = int(est), int(actual)
        except (ValueError, RuntimeError):
            continue
        if a == 0:
            continue
        drift = abs(e - a) / a
        if drift > max_drift:
            bad.append({"table": t, "estimate": e, "actual": a, "drift": round(drift, 3)})
    return {
        "check": "planner_error",
        "observed": bad,
        "display": f"{len(bad)} table(s) with planner error over {max_drift:.0%}",
        "threshold": f"<= {max_drift:.0%}",
        "status": WARN if bad else OK,
        "detail": "",
    }


# --------------------------------------------------------------------------
# Runners
# --------------------------------------------------------------------------

def gather() -> list[dict]:
    migrations = fetch_migrations()
    columns = fetch_columns()
    state = fetch_table_state()
    schema = (parse_prisma_schema(SCHEMA_PRISMA.read_text(encoding="utf-8"))
              if SCHEMA_PRISMA.exists() else {})

    results = [
        check_migration_drift(migrations),
        check_schema_unknown_columns(schema, columns),
        check_schema_declared_missing_in_db(schema, columns),
        check_failed_migrations(migrations),
        check_recency(migrations),
        check_never_analyzed(state),
        check_dead_tuples(state),
        check_cron_jobs(),
        check_planner_error(),
    ]
    return results


def emit_metrics(results: list[dict]) -> str:
    """Prometheus text exposition. Counters here are gauges-of-state, which is
    honest: these are sampled conditions, not monotonic event counts."""
    lines = [
        "# HELP gse_migration_check_status 0=OK 1=WARN 2=CRIT",
        "# TYPE gse_migration_check_status gauge",
    ]
    sev = {OK: 0, WARN: 1, CRIT: 2}
    for r in results:
        lines.append(f'gse_migration_check_status{{check="{r["check"]}"}} {sev[r["status"]]}')
    crit = sum(1 for r in results if r["status"] == CRIT)
    warn = sum(1 for r in results if r["status"] == WARN)
    lines += [
        "# HELP gse_migration_checks_critical Number of CRIT checks",
        "# TYPE gse_migration_checks_critical gauge",
        f"gse_migration_checks_critical {crit}",
        "# HELP gse_migration_checks_warning Number of WARN checks",
        "# TYPE gse_migration_checks_warning gauge",
        f"gse_migration_checks_warning {warn}",
    ]
    return "\n".join(lines) + "\n"


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Migration observability for gse-postgres")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--metrics", action="store_true", help="Prometheus text exposition")
    args = ap.parse_args(argv)

    try:
        results = gather()
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    counts = {s: sum(1 for r in results if r["status"] == s) for s in (OK, WARN, CRIT)}

    if args.metrics:
        sys.stdout.write(emit_metrics(results))
        return 1 if counts[CRIT] else 0

    if args.json:
        print(json.dumps({"checks": results, "counts": counts,
                          "ok": counts[CRIT] == 0}, indent=2))
        return 1 if counts[CRIT] else 0

    for r in results:
        print(f"[{r['status']}] {r['check']}: {r['display']}  (threshold {r['threshold']})")
        if r["detail"]:
            print(f"        {r['detail']}")
        obs = r["observed"]
        if r["status"] != OK and isinstance(obs, list) and obs:
            for item in obs[:6]:
                print(f"        - {item}")
        elif r["status"] != OK and isinstance(obs, dict) and obs:
            for k, v in list(obs.items())[:6]:
                print(f"        - {k}: {v}")

    print()
    print(f"{counts[OK]} ok, {counts[WARN]} warn, {counts[CRIT]} crit")
    return 1 if counts[CRIT] else 0


if __name__ == "__main__":
    raise SystemExit(main())
