#!/usr/bin/env python3
"""Load the 603-paper OCR corpus into lit.corpus_item.

Design notes:
- One row per paper. lit.corpus_item holds a single vector per item, so the
  embedded text is title + a bounded lead (intro/abstract region). It is not a
  chunk-level index; chunk retrieval needs its own table.
- corpus_key is the paper's sha256, so re-running is idempotent and cannot
  duplicate.
- The `abstract` column receives the OCR lead text, not a real abstract. The
  source column carries the provenance so no reader mistakes it for one.
- Rollback: DELETE FROM lit.corpus_item WHERE source = 'gse-ocr-2026-11-11';

Usage:
    python3 scripts/ops/load_ocr_corpus_to_neon.py --dry-run --limit 5
    python3 scripts/ops/load_ocr_corpus_to_neon.py
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time
import urllib.request

SOURCE = "gse-ocr-2026-11-11"
EMBED_MODEL = "baai/bge-m3"
NEON_PROJECT = "summer-brook-99380762"
NEON_ROLE = "neondb_owner"
CORPUS = r"C:/Users/Garrett/jev-pipeline/ocr_by_paper.jsonl"
SQL_FILE = r"C:/Users/Garrett/Sports/scripts/ops/load_ocr_corpus_to_neon.sql"
LEAD_CHARS = 8000
BATCH = 16


def load_api_key() -> str:
    env_path = os.path.expandvars(r"%LOCALAPPDATA%/hermes/.env")
    with open(env_path, encoding="utf-8", errors="replace") as fh:
        for line in fh:
            if line.startswith("OPENROUTER_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("OPENROUTER_API_KEY not found")


def normalise(text: str) -> str:
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def embed_batch(key: str, texts: list[str]) -> list[list[float]]:
    payload = json.dumps({"model": EMBED_MODEL, "input": texts}).encode()
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/embeddings",
        data=payload,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    )
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                body = json.loads(resp.read().decode())
            data = sorted(body["data"], key=lambda d: d["index"])
            vecs = [d["embedding"] for d in data]
            if len(vecs) != len(texts):
                raise ValueError(f"expected {len(texts)} vectors, got {len(vecs)}")
            return vecs
        except Exception as exc:  # noqa: BLE001 - retried below
            if attempt == 3:
                raise SystemExit(f"embedding failed after 4 attempts: {exc}")
            time.sleep(2 ** attempt)
    raise SystemExit("unreachable")


def sq(value: str) -> str:
    return (value or "").replace("'", "''")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()

    papers = []
    with open(CORPUS, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                papers.append(json.loads(line))
    if args.limit:
        papers = papers[: args.limit]
    print(f"papers: {len(papers)}")

    key = load_api_key()
    rows = []
    done = 0
    for start in range(0, len(papers), BATCH):
        chunk = papers[start : start + BATCH]
        texts = []
        for p in chunk:
            title = normalise(p.get("title") or "")
            lead = normalise(p.get("text") or "")[:LEAD_CHARS]
            texts.append(f"{title}\n\n{lead}".strip())
        vecs = embed_batch(key, texts)
        for p, text, vec in zip(chunk, texts, vecs):
            lead = normalise(p.get("text") or "")[:LEAD_CHARS]
            rows.append(
                {
                    "corpus_key": p.get("sha256") or "",
                    "title": normalise(p.get("title") or ""),
                    "lead": lead,
                    "url": p.get("file_path") or "",
                    "chars": len(p.get("text") or ""),
                    "embedding": vec,
                    "embedded_chars": len(text),
                }
            )
        done += len(chunk)
        print(f"  embedded {done}/{len(papers)}", flush=True)

    dims = {len(r["embedding"]) for r in rows}
    print(f"vectors: {len(rows)}, dims: {sorted(dims)}")
    if len(dims) != 1:
        raise SystemExit("inconsistent embedding dimensions")

    values = []
    for r in rows:
        vec = "[" + ",".join(f"{x:.7f}" for x in r["embedding"]) + "]"
        values.append(
            "('{key}', '{src}', '{title}', '{lead}', '{url}', '{vec}', '{model}', now())".format(
                key=sq(r["corpus_key"]),
                src=SOURCE,
                title=sq(r["title"]),
                lead=sq(r["lead"]),
                url=sq(r["url"]),
                vec=vec,
                model=EMBED_MODEL,
            )
        )

    sql = (
        "INSERT INTO lit.corpus_item\n"
        "  (corpus_key, source, title, abstract, url, embedding, embedding_model, structured_at)\n"
        "VALUES\n  "
        + ",\n  ".join(values)
        + "\nON CONFLICT (corpus_key) DO UPDATE SET\n"
        '  title = EXCLUDED.title,\n'
        '  abstract = EXCLUDED.abstract,\n'
        '  url = EXCLUDED.url,\n'
        '  embedding = EXCLUDED.embedding,\n'
        '  embedding_model = EXCLUDED.embedding_model,\n'
        '  structured_at = now()\n'
        f"WHERE lit.corpus_item.source = '{SOURCE}';\n"
    )

    if args.dry_run:
        print("\n--- DRY RUN: first statement head ---")
        print(sql[:1200])
        print(f"...\n--- {len(values)} value tuples, {len(sql):,} bytes ---")
        sample = rows[0]
        print(f"sample corpus_key: {sample['corpus_key'][:16]}...")
        print(f"sample title: {sample['title'][:90]}")
        print(f"sample lead chars: {len(sample['lead'])}, embedded chars: {sample['embedded_chars']}")
        return 0

    with open(SQL_FILE, "w", encoding="utf-8") as fh:
        fh.write(sql)
    print(f"wrote {SQL_FILE} ({len(sql):,} bytes)")

    cmd = (
        f"neon psql main --project-id {NEON_PROJECT} --role-name {NEON_ROLE} "
        f'-- -f "{SQL_FILE}"'
    )
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    combined = (result.stdout or "") + (result.stderr or "")
    if result.returncode != 0 or "ERROR:" in combined:
        print("FAILED:")
        print(combined[-4000:])
        return 1
    print(f"ok: {result.stdout.strip()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
