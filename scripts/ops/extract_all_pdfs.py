#!/usr/bin/env python3
"""Extract text from every staged PDF, resumably.

Writes one JSON line per PDF to extraction.jsonl. Re-running skips PDFs already
present (keyed on absolute path), so an interrupted run resumes where it stopped.

Quality signal: chars_per_page. Below ~80 means the PDF is image-only (scanned)
and needs OCR rather than text extraction. Those are written to needs_ocr.jsonl.

Usage:
    python3 extract_all_pdfs.py --root <staged-dir> [--workers 6]
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import traceback
from concurrent.futures import ProcessPoolExecutor, as_completed

OUT = "extraction.jsonl"
NEEDS_OCR = "needs_ocr.jsonl"
LOW_YIELD_CHARS_PER_PAGE = 80
MAX_CHARS_PER_PDF = 4_000_000


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for block in iter(lambda: fh.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def extract_one(path: str) -> dict:
    import pymupdf  # noqa: PLC0415

    rec = {
        "path": path,
        "sha256": "",
        "bytes": 0,
        "pages": 0,
        "chars": 0,
        "chars_per_page": 0.0,
        "title": "",
        "author": "",
        "text": "",
        "error": "",
    }
    try:
        rec["bytes"] = os.path.getsize(path)
        rec["sha256"] = sha256_file(path)
        doc = pymupdf.open(path)
        rec["pages"] = doc.page_count
        meta = doc.metadata or {}
        rec["title"] = (meta.get("title") or "").strip()
        rec["author"] = (meta.get("author") or "").strip()
        parts = []
        total = 0
        for page in doc:
            t = page.get_text("text") or ""
            parts.append(t)
            total += len(t)
            if total > MAX_CHARS_PER_PDF:
                parts.append("\n[TRUNCATED AT 4M CHARS]")
                break
        doc.close()
        text = "\n".join(parts)
        rec["text"] = text
        rec["chars"] = len(text)
        rec["chars_per_page"] = round(len(text) / max(1, rec["pages"]), 1)
    except Exception as exc:  # noqa: BLE001 - one bad PDF must not stop the run
        rec["error"] = f"{type(exc).__name__}: {exc}"
    return rec


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True)
    ap.add_argument("--workers", type=int, default=6)
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()

    done = set()
    if os.path.exists(OUT):
        with open(OUT, encoding="utf-8") as fh:
            for line in fh:
                try:
                    done.add(json.loads(line)["path"])
                except Exception:  # noqa: BLE001
                    pass
    print(f"already extracted: {len(done)}")

    targets = []
    for dirpath, _dirnames, filenames in os.walk(args.root):
        for fn in filenames:
            if fn.lower().endswith(".pdf"):
                p = os.path.join(dirpath, fn).replace("\\", "/")
                if p not in done:
                    targets.append(p)
    targets.sort()
    if args.limit:
        targets = targets[: args.limit]
    print(f"to extract: {len(targets)}")

    ok = err = low = 0
    with open(OUT, "a", encoding="utf-8") as out, open(NEEDS_OCR, "a", encoding="utf-8") as ocr:
        with ProcessPoolExecutor(max_workers=args.workers) as pool:
            futures = {pool.submit(extract_one, p): p for p in targets}
            for i, fut in enumerate(as_completed(futures), 1):
                try:
                    rec = fut.result()
                except Exception:  # noqa: BLE001
                    rec = {"path": futures[fut], "error": traceback.format_exc(limit=1)}
                out.write(json.dumps(rec, ensure_ascii=False) + "\n")
                if rec.get("error"):
                    err += 1
                else:
                    ok += 1
                    if rec.get("chars_per_page", 0) < LOW_YIELD_CHARS_PER_PAGE:
                        low += 1
                        ocr.write(
                            json.dumps(
                                {
                                    "path": rec["path"],
                                    "pages": rec["pages"],
                                    "chars": rec["chars"],
                                    "chars_per_page": rec["chars_per_page"],
                                }
                            )
                            + "\n"
                        )
                if i % 50 == 0:
                    out.flush()
                    ocr.flush()
                    print(f"  {i}/{len(targets)}  ok={ok} err={err} needs_ocr={low}", flush=True)
    print(f"done. ok={ok} err={err} needs_ocr={low}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
