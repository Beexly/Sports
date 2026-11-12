#!/usr/bin/env python3
"""OCR image-only PDFs with Qwen4-Max-Preview vision, pages in parallel.

The first version called the model once per page in a serial loop: one 320-page
book would have taken close to an hour. Pages are independent, so they fan out.

Resumable at page level: completed pages are appended to a page cache keyed by
(path, page number). Killing the process and restarting loses at most the pages
in flight.

Usage:
    python3 ocr_vision_qwen.py --limit 1 --workers 8
    python3 ocr_vision_qwen.py
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import tempfile
import threading
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

import pymupdf

BASE = "https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1"
MODEL = "qwen4-max-preview"

HERE = os.path.dirname(os.path.abspath(__file__))
NEEDS = os.path.join(HERE, "needs_ocr.jsonl")
DONE = os.path.join(HERE, "ocr_done.jsonl")
OUT = os.path.join(HERE, "extraction.jsonl")
PAGECACHE = os.path.join(HERE, "vision_page_cache.jsonl")
DPI = 200
MAX_PAGES = 400
PROMPT = (
    "Transcribe all text on this page verbatim. Preserve line breaks and "
    "paragraph structure. Do not summarise, correct, or add anything. "
    "Output only the transcription."
)

_lock = threading.Lock()


def load_key() -> str:
    env = os.path.expandvars(r"%LOCALAPPDATA%/hermes/.env")
    for line in open(env, encoding="utf-8", errors="replace"):
        if line.startswith("ALIYUN_TOKENPLAN_KEY="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("ALIYUN_TOKENPLAN_KEY not found")


def transcribe(key: str, png_b64: str) -> str:
    payload = {
        "model": MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": PROMPT},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{png_b64}"}},
                ],
            }
        ],
        "max_tokens": 4000,
    }
    req = urllib.request.Request(
        f"{BASE}/chat/completions",
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    )
    last = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=300) as resp:
                d = json.loads(resp.read().decode())
            if d.get("error"):
                raise RuntimeError(d["error"])
            return d["choices"][0]["message"].get("content") or ""
        except Exception as exc:  # noqa: BLE001
            last = exc
            time.sleep(min(30, 3 * (attempt + 1)))
    raise RuntimeError(f"vision call failed: {last}")


def load_done() -> set[str]:
    seen = set()
    if os.path.exists(DONE):
        for line in open(DONE, encoding="utf-8"):
            try:
                rec = json.loads(line)
            except Exception:  # noqa: BLE001
                continue
            if not rec.get("error"):
                seen.add(rec["path"])
    return seen


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--max-pages", type=int, default=MAX_PAGES)
    ap.add_argument("--workers", type=int, default=8)
    args = ap.parse_args()

    key = load_key()
    done = load_done()
    queue, seen = [], set()
    if os.path.exists(NEEDS):
        for line in open(NEEDS, encoding="utf-8"):
            try:
                rec = json.loads(line)
            except Exception:  # noqa: BLE001
                continue
            p = rec["path"]
            if p in done or p in seen:
                continue
            seen.add(p)
            queue.append(rec)
    if args.limit:
        queue = queue[: args.limit]
    print(f"queued for vision OCR: {len(queue)} | page workers: {args.workers}")
    if not queue:
        return 0

    with open(OUT, "a", encoding="utf-8") as out, open(DONE, "a", encoding="utf-8") as donef, \
         open(PAGECACHE, "a", encoding="utf-8") as pcache:
        for i, rec in enumerate(queue, 1):
            path = rec["path"]
            err = ""
            page_text: dict[int, str] = {}
            n = 0
            t0 = time.time()
            try:
                doc = pymupdf.open(path)
                n = min(doc.page_count, args.max_pages)
                with tempfile.TemporaryDirectory() as td:
                    imgs: list[tuple[int, str]] = []
                    for pno in range(n):
                        pix = doc[pno].get_pixmap(dpi=DPI)
                        img = os.path.join(td, f"p{pno:05d}.png")
                        pix.save(img)
                        imgs.append((pno, base64.b64encode(open(img, "rb").read()).decode()))
                doc.close()

                def work(item):
                    pno, b64 = item
                    return pno, transcribe(key, b64)

                finished = 0
                with ThreadPoolExecutor(max_workers=args.workers) as pool:
                    for pno, txt in pool.map(work, imgs):
                        page_text[pno] = txt
                        finished += 1
                        with _lock:
                            pcache.write(
                                json.dumps({"path": path, "page": pno + 1, "chars": len(txt)}) + "\n"
                            )
                        if finished % 25 == 0:
                            rate = finished / max(1e-6, time.time() - t0)
                            print(
                                f"    {os.path.basename(path)[:36]} {finished}/{n} pages "
                                f"({rate:.2f} p/s)",
                                flush=True,
                            )
            except Exception as exc:  # noqa: BLE001
                err = f"{type(exc).__name__}: {exc}"

            text = "\n".join(
                f"[page {pno + 1}]\n{page_text[pno]}" for pno in sorted(page_text)
            )
            record = {
                "path": path,
                "sha256": rec.get("sha256") or "",
                "bytes": os.path.getsize(path) if os.path.exists(path) else 0,
                "pages": len(page_text) or rec.get("pages") or 0,
                "chars": len(text),
                "chars_per_page": round(len(text) / max(1, len(page_text)), 1),
                "title": "",
                "author": "",
                "text": text,
                "error": err,
                "source": f"{MODEL}-vision",
            }
            out.write(json.dumps(record, ensure_ascii=False) + "\n")
            out.flush()
            donef.write(json.dumps({"path": path, "chars": len(text), "error": err}) + "\n")
            donef.flush()
            print(
                f"  {i}/{len(queue)} pages={len(page_text)}/{n} chars={len(text)} "
                f"{os.path.basename(path)[:48]}",
                flush=True,
            )

    print("vision ocr pass complete")
    return 0


if __name__ == "__main__":
    sys.exit(main())
