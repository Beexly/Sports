#!/usr/bin/env python3
"""
Verify a local MVE corpus mirror is row-exact against the read-only prod source.

Produced for the H-F5 MVE independent audit (see
docs/ops/hermes/hf5-mve/EXECUTION-AFFIDAVIT-2026-08-26.md). Computes an
identical md5 content digest on both sides over exactly the columns
scripts/edge-lab/run-mve.ts consumes. Timestamps are digested as epoch seconds
so client-side formatting cannot mask a difference.

Read-only on both sides. Never invents or prints credentials.

Usage:
  NEON_HTTP_SQL_URL='https://<endpoint-host>/sql' \
  NEON_CONNECTION_STRING='postgresql://<read-only-role>:...@<host>/<db>?sslmode=require' \
  LOCAL_MIRROR_PSQL='postgresql://<user>:...@localhost:5432/<db>' \
  python3 scripts/edge-lab/verify-mirror-digest.py

Exit 0 = digests match (mirror row-exact). Exit 1 = mismatch. Exit 2 = misuse.
"""
import json
import os
import subprocess
import sys
import urllib.request

EP = os.environ.get("NEON_HTTP_SQL_URL", "").strip()
CS = os.environ.get("NEON_CONNECTION_STRING", "").strip()
LOCAL = os.environ.get("LOCAL_MIRROR_PSQL", "").strip()
if not EP or not CS or not LOCAL:
    print(
        "verify-mirror-digest: set NEON_HTTP_SQL_URL, NEON_CONNECTION_STRING "
        "and LOCAL_MIRROR_PSQL (no secrets are read from the repo)",
        file=sys.stderr,
    )
    raise SystemExit(2)

# The frozen runner's cohort rule, verbatim (run-mve.ts CORPUS_FROM/CORPUS_TO).
CORPUS = (
    'SELECT g.id FROM games g JOIN sports s ON s.id = g."sportId" '
    "WHERE s.key = 'baseball_mlb' AND g.status = 'FINAL' "
    'AND g."homeScore" IS NOT NULL AND g."awayScore" IS NOT NULL '
    "AND g.\"commenceTime\" >= '2026-05-22' AND g.\"commenceTime\" < '2026-08-21'"
)

GAMES_DIGEST = """SELECT count(*)::text || ':' || md5(string_agg(
  id || '|' || "homeTeamName" || '|' || "awayTeamName" || '|' ||
  extract(epoch from "commenceTime")::bigint || '|' ||
  "homeScore" || '|' || "awayScore", ',' ORDER BY id)) AS d
FROM games WHERE id IN ({corpus})"""

ODDS_DIGEST = """SELECT count(*)::text || ':' || md5(string_agg(
  id || '|' || "gameId" || '|' || bookmaker || '|' ||
  coalesce(total::text,'~') || '|' || coalesce("overPrice"::text,'~') || '|' ||
  coalesce("underPrice"::text,'~') || '|' ||
  extract(epoch from "fetchedAt")::bigint, ',' ORDER BY id)) AS d
FROM odds WHERE market = 'TOTALS' AND "gameId" IN ({corpus})"""


def source_digest(sql: str) -> str:
    body = json.dumps({"query": sql, "params": []}).encode()
    req = urllib.request.Request(
        EP,
        data=body,
        headers={"Neon-Connection-String": CS, "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=180) as resp:
        return json.load(resp)["rows"][0]["d"]


def mirror_digest(sql: str) -> str:
    proc = subprocess.run(
        ["psql", LOCAL, "-t", "-A", "-c", sql],
        capture_output=True,
        text=True,
        timeout=300,
    )
    if proc.returncode != 0:
        print(f"local query failed: {proc.stderr[:400]}", file=sys.stderr)
        raise SystemExit(2)
    return proc.stdout.strip()


all_match = True
for name, template in (("games", GAMES_DIGEST), ("odds(TOTALS)", ODDS_DIGEST)):
    sql = template.format(corpus=CORPUS)
    src, mir = source_digest(sql), mirror_digest(sql)
    matched = src == mir
    all_match = all_match and matched
    print(f"{name}:\n  source {src}\n  mirror {mir}\n  -> {'MATCH' if matched else 'MISMATCH'}")

print()
print("VERDICT:", "row-exact mirror CONFIRMED" if all_match else "MIRROR NOT ROW-EXACT")
raise SystemExit(0 if all_match else 1)
