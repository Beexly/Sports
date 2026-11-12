#!/usr/bin/env python3
"""Load the lane statement harvest into lit.corpus_statement.

Source: SITUATIONAL-MASTER-2026-11-10.jsonl.gz (102,082 rows, 84 books).

This is a raw harvest, not curated football knowledge. Measured composition:
domain_tags show probability 2,297, sports 2,221, mathematics 1,610,
information-theory 1,324, networks-graphs 1,084, machine-learning 1,065 and so
on. Only about 2% is sports. It is loaded so it can be filtered and searched,
not because it is football.

Rows whose statement is a table-of-contents fragment are dropped: they carry a
heading, a page number, then another heading, which is a contents listing rather
than a claim.

Usage:
    python3 load_statements_to_neon.py --dry-run
    python3 load_statements_to_neon.py
"""
from __future__ import annotations

import argparse
import gzip
import json
import re
import subprocess
import sys

import psycopg2
from psycopg2.extras import execute_values

NEON_PROJECT = "summer-brook-99380762"
NEON_ROLE = "neondb_owner"
SRC = r"C:/Users/Garrett/AppData/Local/hermes/cache/scratch/masters/sit.jsonl.gz"
SOURCE_TAG = "situational-master-2026-11-10"

TOC_MULTI = re.compile(r"\d+\.\d+(\.\d+)?")
PAGE_NUM = re.compile(r"\s\d{1,4}(?=\s|$)")


def is_toc(s: str) -> bool:
    """A contents listing carries several section numbers and page numbers.

    A real theorem statement has at most one section number (its own label).
    """
    return len(TOC_MULTI.findall(s)) >= 2 and len(PAGE_NUM.findall(s)) >= 2


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


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--batch", type=int, default=2000)
    args = ap.parse_args()

    rows = []
    dropped_toc = dropped_short = 0
    seen = set()
    with gzip.open(SRC, "rt", encoding="utf-8", errors="replace") as fh:
        for line in fh:
            try:
                d = json.loads(line)
            except Exception:  # noqa: BLE001
                continue
            s = (d.get("statement") or "").replace("\x00", "").strip()
            if len(s) < 40:
                dropped_short += 1
                continue
            if TOC_MULTI.search(s):
                dropped_toc += 1
                continue
            md5 = d.get("md5") or ""
            page = d.get("page")
            key = (md5, page, s)
            if key in seen:
                continue
            seen.add(key)
            tags = d.get("domain_tags") or []
            if not isinstance(tags, list):
                tags = [str(tags)]
            rows.append(
                (
                    (d.get("book") or "")[:300],
                    (d.get("author") or "")[:300],
                    d.get("year") if isinstance(d.get("year"), int) else None,
                    (d.get("file") or "")[:500],
                    md5,
                    page if isinstance(page, int) else None,
                    s,
                    (d.get("kind") or "")[:60],
                    (d.get("situation") or "")[:500],
                    [str(t)[:60] for t in tags],
                    (d.get("lane") or "")[:80],
                    SOURCE_TAG,
                )
            )

    print(f"kept: {len(rows):,}  dropped_toc: {dropped_toc:,}  dropped_short: {dropped_short:,}")
    if args.dry_run:
        for r in rows[:3]:
            print("---")
            print("book:", r[0], "| page:", r[5], "| kind:", r[7], "| tags:", r[9])
            print("stmt:", r[6][:180].replace("\n", " "))
        return 0

    conn = psycopg2.connect(get_dsn(), connect_timeout=30)
    cur = conn.cursor()
    sql = (
        "INSERT INTO lit.corpus_statement "
        "(book, author, year, file, md5, page, statement, kind, situation, domain_tags, lane, source) "
        "VALUES %s ON CONFLICT (md5, page, statement) DO NOTHING"
    )
    tmpl = "(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)"
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
        if (i // args.batch) % 10 == 0:
            print(f"  {min(i + args.batch, len(rows)):,}/{len(rows):,}", flush=True)
    cur.close()
    conn.close()
    print(f"done. attempted {loaded:,}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
