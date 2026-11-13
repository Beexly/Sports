#!/usr/bin/env python3
"""Load equation JSONL into lit.equation.

Sources are the canonical master and any extension runs. Identity is
(arxiv_id, md5 of whitespace-normalised LaTeX), so re-loading is idempotent and
a restated equation collapses to one row.

Usage:
    python3 load_equations_to_neon.py --dry-run
    python3 load_equations_to_neon.py
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys

import psycopg2
from psycopg2.extras import execute_values

NEON_PROJECT = "summer-brook-99380762"
NEON_ROLE = "neondb_owner"

SOURCES = [
    (r"C:/Users/Garrett/jev-pipeline/equations-from-catalog.jsonl", "canonical-2026-11-11"),
    (r"C:/Users/Garrett/AppData/Local/hermes/cache/scratch/equations/equations.jsonl", "extension-2026-11-12"),
]


def get_dsn() -> str:
    res = subprocess.run(
        ["neon", "connection-string", "main", "--project-id", NEON_PROJECT, "--role-name", NEON_ROLE],
        capture_output=True,
        text=True,
        shell=True,
    )
    for line in (res.stdout or "").splitlines():
        line = line.strip()
        if line.startswith("postgresql://"):
            return line
    raise SystemExit("could not obtain a connection string from the neon CLI")


def eq_hash(eq: str) -> str:
    norm = re.sub(r"\s+", " ", (eq or "")).strip()
    return hashlib.md5(norm.encode("utf-8")).hexdigest()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--batch", type=int, default=2000)
    args = ap.parse_args()

    rows = []
    seen = set()
    per_source = {}
    for path, tag in SOURCES:
        if not os.path.exists(path):
            print(f"skip (missing): {path}")
            continue
        n = 0
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    d = json.loads(line)
                except Exception:  # noqa: BLE001
                    continue
                eq = (d.get("equation") or "").replace("\x00", "")
                aid = (d.get("arxiv_id") or "").replace("\x00", "")
                if not eq or not aid:
                    continue
                h = eq_hash(eq)
                key = (aid, h)
                if key in seen:
                    continue
                seen.add(key)
                rows.append(
                    (
                        aid,
                        (d.get("paper_title") or "")[:500],
                        (d.get("file_path") or "")[:1000],
                        d.get("sha256") or "",
                        eq,
                        h,
                        d.get("kind") or "display",
                        tag,
                    )
                )
                n += 1
        per_source[tag] = n
        print(f"{tag}: {n:,} unique equations from {path}")

    print(f"total unique: {len(rows):,}")
    if args.dry_run:
        for r in rows[:3]:
            print("---")
            print("arxiv:", r[0], "| kind:", r[6], "| hash:", r[5][:10])
            print("eq:", r[4][:160].replace("\n", " "))
        return 0

    conn = psycopg2.connect(get_dsn(), connect_timeout=30)
    cur = conn.cursor()
    sql = (
        "INSERT INTO lit.equation "
        "(arxiv_id, paper_title, file_path, sha256, equation, equation_hash, kind, source) "
        "VALUES %s ON CONFLICT (arxiv_id, equation_hash) DO NOTHING"
    )
    tmpl = "(%s,%s,%s,%s,%s,%s,%s,%s)"
    loaded = 0
    for i in range(0, len(rows), args.batch):
        chunk = rows[i : i + args.batch]
        try:
            execute_values(cur, sql, chunk, template=tmpl, page_size=len(chunk))
            conn.commit()
            loaded += len(chunk)
        except Exception as exc:  # noqa: BLE001
            conn.rollback()
            print(f"  batch at {i} failed: {str(exc)[:200]}")
        if (i // args.batch) % 5 == 0:
            print(f"  {min(i + args.batch, len(rows)):,}/{len(rows):,}", flush=True)
    cur.close()
    conn.close()
    print(f"done. attempted {loaded:,}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
