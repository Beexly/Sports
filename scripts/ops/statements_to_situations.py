#!/usr/bin/env python3
"""Turn the sports-tagged book statements into situation -> lesson triples.

lit.corpus_statement holds 72,852 harvested statements, of which 2,053 carry the
'sports' domain tag. Those are real football passages from the 1890s-1920s books
and modern sports science, but they are stored as raw statements. This pass
converts them into the same shape as lit.situation so the engine can query one
table for football knowledge.

The evidence quote is the statement itself, so provenance is exact by
construction: the row points at the book, page and md5 it came from.

Usage:
    python3 statements_to_situations.py --dry-run --limit 5
    python3 statements_to_situations.py
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import threading
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

import psycopg2
from psycopg2.extras import execute_values

MODEL = "deepseek/deepseek-v4.1-flash"
NEON_PROJECT = "summer-brook-99380762"
NEON_ROLE = "neondb_owner"
SOURCE_TAG = "statement-to-situation-v1"
TRACKER = r"C:/Users/Garrett/AppData/Local/hermes/cache/scratch/sitsql/statement_processed.txt"

DOMAINS = ["offense", "defense", "special_teams", "situational", "analytics",
           "personnel", "training", "medical", "other"]

PROMPT = """You are given a passage from a football or sports-science book.
Convert it into coaching knowledge as strict JSON.

- situation: the concrete circumstance the passage describes (down and distance,
  formation, coverage, clock, field zone, personnel, training state, etc).
- decision: what the passage says to do, or what the actors do.
- lesson: the transferable principle, one sentence.
- domain: one of offense, defense, special_teams, situational, analytics,
  personnel, training, medical, other.

Rules:
- Only state what the passage supports. Do not add outside football knowledge.
- If the passage carries no actionable football or sports-performance content
  (a table of contents, a citation list, pure theory with no application),
  return [].
- Output ONLY a JSON array, no prose, no code fence.

Schema:
[{"domain":"offense","situation":"...","decision":"...","lesson":"..."}]

Passage:
{statement}
"""


def get_dsn() -> str:
    res = subprocess.run(
        ["neon", "connection-string", "main", "--project-id", NEON_PROJECT, "--role-name", NEON_ROLE],
        capture_output=True, text=True, shell=True,
    )
    for line in (res.stdout or "").splitlines():
        line = line.strip()
        if line.startswith("postgresql://"):
            return line
    raise SystemExit("could not obtain a connection string from the neon CLI")


def load_key() -> str:
    env = os.path.expandvars(r"%LOCALAPPDATA%/hermes/.env")
    for line in open(env, encoding="utf-8", errors="replace"):
        if line.startswith("OPENROUTER_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("OPENROUTER_API_KEY not found")


def call(key: str, prompt: str) -> str:
    payload = json.dumps({
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0,
        "max_tokens": 900,
    }).encode()
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=payload,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    )
    last = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                d = json.loads(resp.read().decode())
            if d.get("error"):
                raise RuntimeError(d["error"])
            return d["choices"][0]["message"].get("content") or ""
        except Exception as exc:  # noqa: BLE001
            last = exc
            time.sleep(min(30, 2 ** attempt))
    raise RuntimeError(f"model call failed: {last}")


def parse(raw: str) -> list[dict]:
    raw = re.sub(r"^```(?:json)?\s*", "", raw.strip())
    raw = re.sub(r"\s*```$", "", raw)
    a, b = raw.find("["), raw.rfind("]")
    if a == -1 or b == -1:
        return []
    try:
        data = json.loads(raw[a : b + 1])
    except json.JSONDecodeError:
        return []
    return [d for d in data if isinstance(d, dict)]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--workers", type=int, default=16)
    args = ap.parse_args()

    processed = set()
    if os.path.exists(TRACKER):
        processed = {l.strip() for l in open(TRACKER, encoding="utf-8") if l.strip()}

    conn = psycopg2.connect(get_dsn(), connect_timeout=30)
    cur = conn.cursor()
    cur.execute(
        "SELECT id::text, book, page, md5, statement FROM lit.corpus_statement "
        "WHERE domain_tags @> ARRAY['sports'] ORDER BY book, page"
    )
    rows = [r for r in cur.fetchall() if r[0] not in processed]
    if args.limit:
        rows = rows[: args.limit]
    print(f"sports statements to convert: {len(rows)}")
    if not rows:
        cur.close(); conn.close()
        return 0

    key = load_key()
    lock = threading.Lock()
    stats = {"records": 0, "empty": 0, "errors": 0, "done": 0}

    def work(row):
        sid, book, page, md5, statement = row
        try:
            raw = call(key, PROMPT.replace("{statement}", statement[:3500]))
        except Exception:  # noqa: BLE001
            with lock:
                stats["errors"] += 1
            return sid, []
        recs = parse(raw)
        out = []
        for r in recs:
            sit = (r.get("situation") or "").strip()
            if not sit:
                continue
            dom = (r.get("domain") or "other").strip().lower()
            if dom not in DOMAINS:
                dom = "other"
            out.append({
                "corpus_key": md5 or sid,
                "chunk_index": page if isinstance(page, int) else 0,
                "domain": dom,
                "situation": sit[:800],
                "decision": (r.get("decision") or "").strip()[:800],
                "lesson": (r.get("lesson") or "").strip()[:800],
                "evidence_quote": statement[:1200],
            })
        return sid, out

    sit_sql = (
        "INSERT INTO lit.situation "
        "(corpus_key, chunk_index, source, domain, situation, decision, lesson, evidence_quote, model) "
        "VALUES %s ON CONFLICT (corpus_key, chunk_index, situation) DO NOTHING"
    )
    tmpl = "(%s,%s,%s,%s,%s,%s,%s,%s,%s)"

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        for i, (sid, recs) in enumerate(pool.map(work, rows), 1):
            stats["done"] += 1
            if not recs:
                stats["empty"] += 1
            else:
                stats["records"] += len(recs)
                if args.dry_run:
                    for r in recs[:2]:
                        print(" ", r["domain"], "|", r["situation"][:70], "|", r["lesson"][:60])
                else:
                    vals = [(r["corpus_key"], r["chunk_index"], SOURCE_TAG, r["domain"],
                             r["situation"], r["decision"], r["lesson"], r["evidence_quote"], MODEL)
                            for r in recs]
                    try:
                        execute_values(cur, sit_sql, vals, template=tmpl, page_size=len(vals))
                        conn.commit()
                    except Exception as exc:  # noqa: BLE001
                        conn.rollback()
                        stats["errors"] += 1
                        print("  insert failed:", str(exc)[:160], flush=True)
            with lock:
                with open(TRACKER, "a", encoding="utf-8") as fh:
                    fh.write(sid + "\n")
            if i % 100 == 0:
                print(f"  {i}/{len(rows)} | records={stats['records']} empty={stats['empty']} "
                      f"errors={stats['errors']}", flush=True)

    cur.close(); conn.close()
    print("done:", json.dumps(stats))
    return 0


if __name__ == "__main__":
    sys.exit(main())
