#!/usr/bin/env python3
"""T-04 — lit.situation verbatim substring quote integrity (WP-7, fail-closed).

Every non-null evidence_quote in lit.situation must be a VERBATIM substring of
its source chunk text (lit.corpus_chunk joined on corpus_key + chunk_index),
and >= 20 characters. No paraphrase presented as a quote. Requires >= 1000
quoted situations to exist (the corpus claims 3151 triples).
"""
from __future__ import annotations

import os
import subprocess
import sys

import psycopg2
import psycopg2.extras


def main() -> int:
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        url = subprocess.run(
            ["neonctl", "connection-string", "main", "--project-id", "summer-brook-99380762", "--role-name", "hermes_ro"],
            capture_output=True, text=True, check=True,
        ).stdout.strip().splitlines()[-1]
    conn = psycopg2.connect(url)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        SELECT s.id, s.corpus_key, s.chunk_index, s.evidence_quote, c.chunk_text
        FROM lit.situation s
        LEFT JOIN lit.corpus_chunk c
          ON c.corpus_key = s.corpus_key AND c.chunk_index = s.chunk_index
        WHERE s.evidence_quote IS NOT NULL AND length(s.evidence_quote) > 0
    """)
    rows = cur.fetchall()
    total = len(rows)
    short = missing_chunk = not_verbatim = 0
    bad_examples = []
    for r in rows:
        q = r["evidence_quote"]
        if len(q.strip()) < 20:
            short += 1
            if len(bad_examples) < 3:
                bad_examples.append(f"short quote id={r['id']}")
            continue
        if r["chunk_text"] is None:
            missing_chunk += 1
            if len(bad_examples) < 3:
                bad_examples.append(f"no source chunk id={r['id']} key={r['corpus_key'][:12]}")
            continue
        if q not in r["chunk_text"]:
            not_verbatim += 1
            if len(bad_examples) < 3:
                bad_examples.append(f"non-verbatim id={r['id']}: {q[:60]!r}")
    conn.close()

    print(f"  quoted situations={total} short={short} missing_chunk={missing_chunk} non_verbatim={not_verbatim}")
    failures = []
    if total < 1000:
        failures.append(f"only {total} quoted situations (<1000)")
    if short or missing_chunk or not_verbatim:
        failures.append(f"quote integrity violations: short={short} missing={missing_chunk} non_verbatim={not_verbatim}")
        for b in bad_examples:
            print(f"    e.g. {b}")
    if failures:
        print("T-04 FAIL: " + "; ".join(failures))
        return 1
    print("T-04 PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())