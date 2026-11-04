"""Reproducible export of the settled-picks calibration population from Neon.

WHY THIS EXISTS. The first calibration analysis (2026-11-04) ran against
`apps/web/__tests__/calibration-audit/evidence/prod-settled-sample-full.csv`, a
hand-carried snapshot. It covered 2,662 of 4,262 published picks and -- crucially
-- it under-sampled SPREAD (80.3%) and TOTAL (77.7%) relative to MONEYLINE
(92.4%). Those are exactly the two markets where the model misbehaves, so the
snapshot was biased in the direction that flatters the conclusion.

This script replaces the snapshot with a query against the live database, and
verifies its own output row count against an independent COUNT(*) so a truncated
export fails loudly instead of quietly producing a smaller sample.

ACCESS NOTES (see skill `neon-db-access`):
  * `--project-id` takes the ID (summer-brook-99380762), not the name.
  * Identifiers are camelCase and MUST be double-quoted.
  * The embedded psql does not honour shell redirection into the client, but
    COPY ... TO STDOUT does come back on stdout, so a plain `>` capture works.
  * `hermes_ro` is read-only by convention only; this script issues SELECT/COPY
    exclusively.

DEFINITIONS
  * Population: isPublished = true AND result IN ('WIN','LOSS')
  * p = confidence / 100   (an integer 0-100 on the row)
  * y = 1 for WIN, 0 for LOSS
  * PUSH, VOID and PENDING are EXCLUDED -- they are not win/loss outcomes.
    Measured 2026-11-04, published rows reconcile exactly:

        WIN + LOSS        3,143   <- the exported population
        PENDING             611
        VOID                488
        PUSH                 20
        ----------------------------
        total published   4,262

    Silently folding the excluded 1,119 into y=0 would deflate the realized
    rate and manufacture a calibration gap that is not there.

    python scripts/ops/picks_export.py --out <path.csv>
    python scripts/ops/picks_export.py --out <path.csv> --verify-only
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

PROJECT_ID = "summer-brook-99380762"
ROLE = "hermes_ro"
BRANCH = "main"

POPULATION = """FROM picks
WHERE "isPublished"
  AND result IN ('WIN','LOSS')"""

EXPORT_SQL = f"""COPY (SELECT
  id,
  "pickType"::text                        AS pick_type,
  confidence / 100.0                      AS p,
  CASE result WHEN 'WIN' THEN 1 ELSE 0 END AS y,
  "modelVersion"                          AS model_version,
  "generatedAt"                           AS generated_at,
  "clvLockPrice"                          AS lock_price,
  "closingPrice"                          AS close_price
{POPULATION}) TO STDOUT WITH (FORMAT csv, HEADER);"""

COUNT_SQL = f"SELECT count(*) {POPULATION};"

# Full published composition, so excluded rows are accounted for rather than
# silently dropped. Verified 2026-11-04 against the live database.
COMPOSITION_SQL = """SELECT "pickType"::text AS market, result::text AS result,
       count(*) AS n
FROM picks WHERE "isPublished" GROUP BY 1,2 ORDER BY 1,2;"""


def _neon_argv() -> list[str]:
    """Resolve the CLI to something CreateProcess can actually launch.

    On Windows `neon` is an npm shim: a bash-readable extensionless file plus
    `neon.cmd` and `neon.ps1`. subprocess with a plain ["neon", ...] list raises
    FileNotFoundError [WinError 2] because CreateProcess will not execute a
    .cmd directly, and bash's resolution does not carry over. Route through
    cmd.exe when we land on the shim.
    """
    found = shutil.which("neon")
    if not found:
        raise RuntimeError("neon CLI not found on PATH")
    if found.lower().endswith((".cmd", ".bat")):
        return ["cmd.exe", "/c", found]
    return [found]


def _run(sql: str) -> str:
    """Run one statement through the Neon CLI and return raw stdout.

    The SQL goes in a temp FILE passed with -f, never on the command line. The
    statements carry single quotes (enum literals) and double quotes (camelCase
    identifiers); pushing that through cmd.exe invites quoting bugs that fail as
    confusing SQL errors rather than as shell errors.
    """
    argv = _neon_argv()
    fd, path = tempfile.mkstemp(suffix=".sql", text=True)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(sql + "\n")
        proc = subprocess.run(
            [*argv, "psql", BRANCH, "--project-id", PROJECT_ID,
             "--role-name", ROLE, "--", "-f", path],
            capture_output=True, text=True, timeout=180,
        )
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass

    if proc.returncode != 0:
        raise RuntimeError(f"neon psql failed ({proc.returncode}): "
                           f"{proc.stderr.strip()[:500]}")
    return proc.stdout


def scrape_count(stdout: str) -> int:
    """Pull the integer out of the embedded client's boxed table output.

    The embedded TypeScript psql prints a bordered table, not bare scalars, so
    `SELECT 3143` arrives as `... | 3143 | ...` plus a `(1 row)` footer.
    """
    for line in stdout.splitlines():
        s = line.strip()
        if not s or s.startswith(("INFO:", "count", "---", "(")):
            continue
        parts = [p.strip() for p in s.strip("|").split("|")]
        for p in parts:
            if p.isdigit():
                return int(p)
    raise RuntimeError(f"could not find a row count in output: {stdout[:300]!r}")


def export(out: Path) -> dict:
    raw = _run(EXPORT_SQL)
    # COPY writes the header even for zero rows; anything less than 2 lines is a
    # failed export, not an empty one.
    if raw.count("\n") < 2:
        raise RuntimeError("export produced no data rows")

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(raw, encoding="utf-8", newline="")

    with out.open("r", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        rows = list(reader)
        headers = reader.fieldnames or []

    return {
        "path": str(out),
        "rows": len(rows),
        "columns": headers,
        "bytes": out.stat().st_size,
        "sha256": hashlib.sha256(out.read_bytes()).hexdigest()[:16],
        "sql_sha256": hashlib.sha256(EXPORT_SQL.encode()).hexdigest()[:16],
    }


def verify(out: Path) -> dict:
    """Confirm the file's row count against an independent COUNT(*) on the DB."""
    with out.open("r", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        rows = list(reader)
        headers = reader.fieldnames or []

    db_count = scrape_count(_run(COUNT_SQL))

    bad_p = sum(1 for r in rows if not (0.0 <= float(r["p"]) <= 1.0))
    bad_y = sum(1 for r in rows if r["y"] not in ("0", "1"))
    markets = sorted({r["pick_type"] for r in rows})

    return {
        "file_rows": len(rows),
        "db_rows": db_count,
        "match": len(rows) == db_count,
        "p_out_of_range": bad_p,
        "y_not_binary": bad_y,
        "markets": markets,
        "complete": len(rows) == db_count and bad_p == 0 and bad_y == 0,
    }


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", type=Path,
                    default=Path("data/engine/picks_settled_export.csv"))
    ap.add_argument("--verify-only", action="store_true",
                    help="re-check an existing export against the live DB")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args(argv)

    try:
        if args.verify_only:
            if not args.out.exists():
                print(f"no export at {args.out}", file=sys.stderr)
                return 2
            info = {"verify": verify(args.out)}
            rc = 0 if info["verify"]["complete"] else 1
        else:
            meta = export(args.out)
            info = {"export": meta, "verify": verify(args.out)}
            rc = 0 if info["verify"]["complete"] else 1
            (args.out.with_suffix(args.out.suffix + ".manifest.json")).write_text(
                json.dumps(info, indent=2), encoding="utf-8")
    except (RuntimeError, subprocess.TimeoutExpired) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    if args.json:
        print(json.dumps(info, indent=2))
    else:
        v = info["verify"]
        if "export" in info:
            e = info["export"]
            print(f"exported {e['rows']} rows -> {e['path']} ({e['bytes']} bytes)")
            print(f"  sha256 {e['sha256']}  sql {e['sql_sha256']}")
        print(f"verify: file={v['file_rows']} db={v['db_rows']} "
              f"match={'YES' if v['match'] else 'NO'}")
        print(f"  markets={','.join(v['markets'])} "
              f"bad_p={v['p_out_of_range']} bad_y={v['y_not_binary']}")
        print(f"  complete={'YES' if v['complete'] else 'NO'}")
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
