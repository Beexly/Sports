#!/usr/bin/env python3
"""Chunk every extracted PDF and embed it into lit.corpus_chunk.

Reads extraction.jsonl (one record per PDF, produced by extract_all_pdfs.py),
splits each document into overlapping character windows on paragraph
boundaries, embeds with baai/bge-m3, and upserts into lit.corpus_chunk.

Idempotent: identity is (corpus_key, chunk_index) where corpus_key is the PDF
sha256. Re-running the same window size updates in place. A different window
size marks a new `source`, so the old rows keep a distinct tag and can be
dropped explicitly.

Usage:
    python3 chunk_and_embed_corpus.py --dry-run --limit 3
    python3 chunk_and_embed_corpus.py --workers 4
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

EMBED_MODEL = "baai/bge-m3"
NEON_PROJECT = "summer-brook-99380762"
NEON_ROLE = "neondb_owner"
SQL_DIR = "C:/Users/Garrett/AppData/Local/hermes/cache/scratch/chunksql"

TARGET = 1500
OVERLAP = 200
MIN_CHUNK = 200


def load_key() -> str:
    path = os.path.expandvars(r"%LOCALAPPDATA%/hermes/.env")
    with open(path, encoding="utf-8", errors="replace") as fh:
        for line in fh:
            if line.startswith("OPENROUTER_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("OPENROUTER_API_KEY not found")


def clean(text: str) -> str:
    text = text.replace("\x00", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def split_chunks(text: str) -> list[tuple[int, int, str]]:
    """Paragraph-aware fixed windows with overlap. Returns (start, end, chunk)."""
    text = clean(text)
    if len(text) < MIN_CHUNK:
        return []
    out: list[tuple[int, int, str]] = []
    pos = 0
    n = len(text)
    while pos < n:
        end = min(n, pos + TARGET)
        if end < n:
            window = text[pos:end]
            cut = max(window.rfind("\n\n"), window.rfind(". "))
            if cut > TARGET * 0.5:
                end = pos + cut + 1
        chunk = text[pos:end].strip()
        if len(chunk) >= MIN_CHUNK:
            out.append((pos, end, chunk))
        if end >= n:
            break
        pos = max(pos + 1, end - OVERLAP)
    return out


def guess_section(chunk: str) -> str:
    m = re.match(r"\s*#{1,3}\s*(.{0,80})", chunk)
    if m:
        return m.group(1).strip()
    m = re.match(r"\s*([A-Z][A-Za-z ]{2,40})\s*$", chunk.split("\n", 1)[0])
    if m:
        return m.group(1).strip()
    return ""


def embed(key: str, texts: list[str]) -> list[list[float]]:
    payload = json.dumps({"model": EMBED_MODEL, "input": texts}).encode()
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/embeddings",
        data=payload,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    )
    last = None
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                body = json.loads(resp.read().decode())
            data = sorted(body["data"], key=lambda d: d["index"])
            return [d["embedding"] for d in data]
        except Exception as exc:  # noqa: BLE001
            last = exc
            time.sleep(min(30, 2 ** attempt))
    raise RuntimeError(f"embedding failed: {last}")


def sq(v: str) -> str:
    return (v or "").replace("'", "''")


def get_dsn() -> str:
    """Ask the neon CLI for a connection string; never print or log it."""
    res = subprocess.run(
        [
            "neon",
            "connection-string",
            "main",
            "--project-id",
            NEON_PROJECT,
            "--role-name",
            NEON_ROLE,
        ],
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
    ap.add_argument("--input", default="extraction.jsonl")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--batch", type=int, default=24)
    args = ap.parse_args()

    source = f"gse-corpus-chunk-v1-{TARGET}"
    os.makedirs(SQL_DIR, exist_ok=True)

    docs = []
    with open(args.input, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except Exception:  # noqa: BLE001
                continue
            if rec.get("error") or not rec.get("text"):
                continue
            docs.append(rec)
    if args.limit:
        docs = docs[: args.limit]
    total_chars = sum(len(d.get("text") or "") for d in docs)
    print(f"docs with text: {len(docs)}, chars: {total_chars:,}")

    plan: list[dict] = []
    for rec in docs:
        key = rec.get("sha256") or hashlib.sha256((rec.get("path") or "").encode()).hexdigest()
        title = (rec.get("title") or os.path.basename(rec.get("path") or "")).strip()
        for idx, (s, e, chunk) in enumerate(split_chunks(rec.get("text") or "")):
            plan.append(
                {
                    "corpus_key": key,
                    "chunk_index": idx,
                    "title": title,
                    "section": guess_section(chunk),
                    "text": chunk,
                    "char_start": s,
                    "char_end": e,
                    "tokens": max(1, len(chunk) // 4),
                }
            )
    print(f"chunks: {len(plan):,}")

    if args.dry_run:
        for p in plan[:3]:
            print("---")
            print("key", p["corpus_key"][:12], "idx", p["chunk_index"], "title", p["title"][:60])
            print("section", p["section"][:40], "chars", len(p["text"]), "tokens", p["tokens"])
            print(p["text"][:300].replace("\n", " "))
        return 0

    key = load_key()
    batches = [plan[i : i + args.batch] for i in range(0, len(plan), args.batch)]
    print(f"embedding {len(batches)} batches of {args.batch}")

    import psycopg2  # noqa: PLC0415
    from psycopg2.extras import execute_values  # noqa: PLC0415

    dsn = get_dsn()
    conn = psycopg2.connect(dsn, connect_timeout=30)
    conn.autocommit = False
    cur = conn.cursor()

    copy_sql = (
        "INSERT INTO lit.corpus_chunk "
        "(corpus_key, chunk_index, source, title, section, chunk_text, "
        " char_start, char_end, token_estimate, embedding, embedding_model, embedded_at) "
        "VALUES %s "
        "ON CONFLICT (corpus_key, chunk_index) DO UPDATE SET "
        "  source = EXCLUDED.source, title = EXCLUDED.title, section = EXCLUDED.section, "
        "  chunk_text = EXCLUDED.chunk_text, char_start = EXCLUDED.char_start, "
        "  char_end = EXCLUDED.char_end, token_estimate = EXCLUDED.token_estimate, "
        "  embedding = EXCLUDED.embedding, embedding_model = EXCLUDED.embedding_model, "
        "  embedded_at = now()"
    )
    tmpl = "(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::vector,%s,now())"

    errors = 0
    loaded = 0

    def do_batch(item):
        i, batch = item
        texts = [f"{b['title']}\n{b['text']}" for b in batch]
        vecs = embed(key, texts)
        return i, batch, vecs

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        for i, batch, vecs in pool.map(do_batch, enumerate(batches, 1)):
            if len(vecs) != len(batch):
                errors += 1
                print(f"  batch {i}: vector count mismatch, skipped", flush=True)
                continue
            rows = []
            for b, v in zip(batch, vecs):
                vec = "[" + ",".join(f"{x:.7f}" for x in v) + "]"
                rows.append(
                    (
                        b["corpus_key"],
                        b["chunk_index"],
                        source,
                        b["title"],
                        b["section"],
                        b["text"],
                        b["char_start"],
                        b["char_end"],
                        b["tokens"],
                        vec,
                        EMBED_MODEL,
                    )
                )
            try:
                execute_values(cur, copy_sql, rows, template=tmpl, page_size=len(rows))
                conn.commit()
                loaded += len(rows)
            except Exception as exc:  # noqa: BLE001
                conn.rollback()
                errors += 1
                print(f"  batch {i} INSERT failed: {str(exc)[:250]}", flush=True)
            if i % 25 == 0:
                print(f"  {i}/{len(batches)} batches, chunks loaded={loaded}, errors={errors}", flush=True)

    cur.close()
    conn.close()
    print(f"done. chunks loaded={loaded} errors={errors}")
    return 0 if errors == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
