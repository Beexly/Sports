#!/usr/bin/env python3
"""Extract situation -> decision -> lesson records from corpus chunks.

Only chunks that plausibly discuss football/analytics situations are sent to the
model; a keyword gate keeps the bill proportional to the useful corpus rather
than the whole corpus.

Every record must carry a verbatim evidence quote drawn from the chunk it came
from. Records whose quote cannot be found in the source text are dropped rather
than stored, so lit.situation cannot accumulate plausible inventions.

Usage:
    python3 extract_situations.py --dry-run --limit 5
    python3 extract_situations.py --limit 200
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import subprocess
import threading
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

MODEL = "deepseek/deepseek-v4.1-flash"
NEON_PROJECT = "summer-brook-99380762"
NEON_ROLE = "neondb_owner"
SQL_DIR = "C:/Users/Garrett/AppData/Local/hermes/cache/scratch/sitsql"
SOURCE_TAG = "sit-extract-v1"

DOMAINS = [
    "offense", "defense", "special_teams", "situational",
    "analytics", "personnel", "training", "medical", "other",
]

GATE = re.compile(
    r"\b("
    r"third[- ]down|fourth[- ]down|red[- ]zone|two[- ]minute|goal[- ]line|"
    r"play[- ]action|blitz|coverage|man[- ]to[- ]man|zone (?:defense|coverage)|"
    r"cover ?[0-3]|quarters|tampa ?2|nickel|dime|front (?:seven|four)|"
    r"offensive line|pass rush|screen|play ?fake|bootleg|rpo|"
    r"audibl|huddle|no[- ]huddle|tempo|clock|timeout|spike|kneel|"
    r"punt|kickoff|field goal|onside|return (?:team|unit)|"
    r"route (?:tree|running)|separation|catch point|contested catch|"
    r"tackl|block(?:ing)? (?:scheme|assignment)|gap (?:scheme|control)|"
    r"leverage|anticipat|tendenc|scheme|personnel group|"
    r"win rate|expected points|epa|success rate|play[- ]call"
    r")\b",
    re.I,
)

PROMPT = """You are reading a chunk from a sports research corpus. Extract every
concrete coaching situation it states, as strict JSON.

A situation is a recognisable football/analytics circumstance (down and distance,
coverage shell, personnel grouping, clock state, field zone, formation, etc).
A decision is what the source says to do in it. A lesson is the transferable
principle, stated in one sentence.

Rules:
- Extract every situation the text actually supports. When the text discusses
  play design, scheme, coverage, decision-making, preparation, evaluation or
  player management, expect 2-4 records.
- Do not invent. If a point is not stated in this text, leave it out. A record
  with a quote you cannot copy verbatim will be discarded, so inventing costs
  you nothing but gains nothing.
- evidence_quote MUST be copied verbatim from the chunk, 20-300 characters.
- domain must be one of: offense, defense, special_teams, situational, analytics,
  personnel, training, medical, other.
- Return only [] when the chunk genuinely contains no football or sports-
  performance content (a statistics proof, a table of contents, a reference
  list, pure marketing copy).
- Output ONLY a JSON array. No prose, no code fence.

Schema:
[{"domain":"defense","situation":"...","decision":"...","lesson":"...","evidence_quote":"..."}]

Chunk title: {title}
Chunk text:
{text}
"""


def load_key() -> str:
    path = os.path.expandvars(r"%LOCALAPPDATA%/hermes/.env")
    with open(path, encoding="utf-8", errors="replace") as fh:
        for line in fh:
            if line.startswith("OPENROUTER_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("OPENROUTER_API_KEY not found")


def call_model(key: str, prompt: str) -> str:
    payload = json.dumps(
        {
            "model": MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0,
            "max_tokens": 1200,
        }
    ).encode()
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=payload,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    )
    last = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                body = json.loads(resp.read().decode())
            if "error" in body:
                raise RuntimeError(body["error"])
            return body["choices"][0]["message"]["content"] or ""
        except Exception as exc:  # noqa: BLE001
            last = exc
            time.sleep(min(30, 2 ** attempt))
    raise RuntimeError(f"model call failed: {last}")


def parse_json_array(raw: str) -> list[dict]:
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    start = raw.find("[")
    end = raw.rfind("]")
    if start == -1 or end == -1:
        return []
    try:
        data = json.loads(raw[start : end + 1])
    except json.JSONDecodeError:
        return []
    return [d for d in data if isinstance(d, dict)]


def normalise(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "")).strip().lower()


def sq(v: str) -> str:
    return (v or "").replace("'", "''")


def get_dsn() -> str:
    """Ask the neon CLI for a connection string; never print or log it."""
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


def fetch_chunks(limit: int, only_gated: bool) -> list[dict]:
    """Pull chunks out of Neon as dicts over a direct connection."""
    import psycopg2  # noqa: PLC0415

    conn = psycopg2.connect(get_dsn(), connect_timeout=30)
    try:
        cur = conn.cursor()
        sql = (
            "SELECT corpus_key, chunk_index, title, chunk_text FROM lit.corpus_chunk"
            " ORDER BY corpus_key, chunk_index"
            + (f" LIMIT {limit}" if limit else "")
        )
        cur.execute(sql)
        rows = [
            {"corpus_key": r[0], "chunk_index": r[1], "title": r[2] or "", "chunk_text": r[3] or ""}
            for r in cur.fetchall()
        ]
        cur.close()
    finally:
        conn.close()
    return rows


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--max-chunks", type=int, default=0)
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--batch", type=int, default=20)
    args = ap.parse_args()

    os.makedirs(SQL_DIR, exist_ok=True)
    chunks = fetch_chunks(args.limit, True)
    print(f"chunks fetched: {len(chunks)}")
    gated = [c for c in chunks if GATE.search(c.get("chunk_text") or "")]
    print(f"passing the football gate: {len(gated)} ({100.0 * len(gated) / max(1, len(chunks)):.1f}%)")
    if args.max_chunks:
        gated = gated[: args.max_chunks]
    if not gated:
        print("nothing to extract")
        return 0

    key = load_key()
    lock = threading.Lock()
    stats = {"records": 0, "rejected_quote": 0, "empty": 0, "errors": 0, "chunks": 0}
    pending: list[str] = []

    def work(chunk: dict):
        prompt = PROMPT.replace("{title}", (chunk.get("title") or "")[:200]).replace(
            "{text}", (chunk.get("chunk_text") or "")[:4000]
        )
        try:
            raw = call_model(key, prompt)
        except Exception as exc:  # noqa: BLE001
            with lock:
                stats["errors"] += 1
            return None, str(exc)
        recs = parse_json_array(raw)
        src = normalise(chunk.get("chunk_text") or "")
        kept = []
        for r in recs:
            quote = (r.get("evidence_quote") or "").strip()
            situation = (r.get("situation") or "").strip()
            if not situation:
                continue
            if len(quote) < 20 or normalise(quote) not in src:
                with lock:
                    stats["rejected_quote"] += 1
                continue
            domain = (r.get("domain") or "other").strip().lower()
            if domain not in DOMAINS:
                domain = "other"
            kept.append(
                {
                    "corpus_key": chunk["corpus_key"],
                    "chunk_index": int(chunk["chunk_index"]),
                    "domain": domain,
                    "situation": situation[:800],
                    "decision": (r.get("decision") or "").strip()[:800],
                    "lesson": (r.get("lesson") or "").strip()[:800],
                    "evidence_quote": quote[:1200],
                }
            )
        return kept, None

    batches = [gated[i : i + args.batch] for i in range(0, len(gated), args.batch)]
    print(f"processing {len(batches)} batches of {args.batch}")

    import psycopg2  # noqa: PLC0415
    from psycopg2.extras import execute_values  # noqa: PLC0415

    conn = None if args.dry_run else psycopg2.connect(get_dsn(), connect_timeout=30)
    cur = None if args.dry_run else conn.cursor()
    sit_sql = (
        "INSERT INTO lit.situation "
        "(corpus_key, chunk_index, source, domain, situation, decision, lesson, evidence_quote, model) "
        "VALUES %s ON CONFLICT (corpus_key, chunk_index, situation) DO NOTHING"
    )
    sit_tmpl = "(%s,%s,%s,%s,%s,%s,%s,%s,%s)"

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        for bi, results in enumerate(pool.map(lambda b: [work(c) for c in b], batches), 1):
            rows = []
            for kept, err in results:
                stats["chunks"] += 1
                if err:
                    continue
                if not kept:
                    stats["empty"] += 1
                    continue
                stats["records"] += len(kept)
                for r in kept:
                    rows.append(
                        (
                            r["corpus_key"],
                            r["chunk_index"],
                            SOURCE_TAG,
                            r["domain"],
                            r["situation"],
                            r["decision"],
                            r["lesson"],
                            r["evidence_quote"],
                            MODEL,
                        )
                    )
            if rows:
                if args.dry_run:
                    print("\n--- DRY RUN: %d rows ---" % len(rows))
                    for r in rows[:3]:
                        print(" ", r[3], "|", r[4][:80], "| quote:", r[7][:60])
                    cur = None
                else:
                    try:
                        execute_values(cur, sit_sql, rows, template=sit_tmpl, page_size=len(rows))
                        conn.commit()
                    except Exception as exc:  # noqa: BLE001
                        conn.rollback()
                        stats["errors"] += 1
                        print(f"  batch {bi} insert failed: {str(exc)[:200]}", flush=True)
            if bi % 10 == 0:
                print(
                    f"  {bi}/{len(batches)} batches | chunks={stats['chunks']} "
                    f"records={stats['records']} rejected_quote={stats['rejected_quote']} "
                    f"empty={stats['empty']} errors={stats['errors']}",
                    flush=True,
                )

    if conn is not None:
        cur.close()
        conn.close()
    print("done:", json.dumps(stats))
    return 0


if __name__ == "__main__":
    sys.exit(main())
