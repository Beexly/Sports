#!/usr/bin/env python3
"""OCR the PDFs that yielded almost no text, using Tesseract.

extract_all_pdfs.py flags anything under 80 chars/page. Those are scans or
image-only exports. This renders each page with pymupdf and runs Tesseract
locally, then appends a normal extraction record so downstream chunking treats
the result exactly like a text-native PDF.

Tesseract lives at "C:/Program Files/Tesseract-OCR/tesseract.exe" on this box.
PaddleOCR 3.7 in ocr-venv is NOT usable here: its CPU path raises
`ConvertPirAttribute2RuntimeAttribute not support [pir::ArrayAttribute<Double>]`
under oneDNN, with and without enable_mkldnn.

Run with the hermes venv interpreter (pymupdf + pytesseract live there).

Usage:
    python3 ocr_scanned_tesseract.py --limit 5
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile

import pymupdf
import pytesseract
from PIL import Image

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

HERE = os.path.dirname(os.path.abspath(__file__))
NEEDS = os.path.join(HERE, "needs_ocr.jsonl")
DONE = os.path.join(HERE, "ocr_done.jsonl")
OUT = os.path.join(HERE, "extraction.jsonl")
DPI = 250
MAX_PAGES = 400


def already_done() -> set[str]:
    seen = set()
    if os.path.exists(DONE):
        with open(DONE, encoding="utf-8") as fh:
            for line in fh:
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
    args = ap.parse_args()

    queue = []
    if os.path.exists(NEEDS):
        done = already_done()
        with open(NEEDS, encoding="utf-8") as fh:
            seen_paths = set()
            for line in fh:
                try:
                    rec = json.loads(line)
                except Exception:  # noqa: BLE001
                    continue
                p = rec["path"]
                if p in done or p in seen_paths:
                    continue
                seen_paths.add(p)
                queue.append(rec)
    if args.limit:
        queue = queue[: args.limit]
    print(f"queued for OCR: {len(queue)}")
    if not queue:
        return 0

    with open(OUT, "a", encoding="utf-8") as out, open(DONE, "a", encoding="utf-8") as donef:
        for i, rec in enumerate(queue, 1):
            path = rec["path"]
            page_texts: list[str] = []
            err = ""
            try:
                doc = pymupdf.open(path)
                n = min(doc.page_count, MAX_PAGES)
                with tempfile.TemporaryDirectory() as td:
                    for pno in range(n):
                        pix = doc[pno].get_pixmap(dpi=DPI)
                        img_path = os.path.join(td, f"p{pno:04d}.png")
                        pix.save(img_path)
                        with Image.open(img_path) as im:
                            txt = pytesseract.image_to_string(im, lang="eng")
                        page_texts.append(f"[page {pno + 1}]\n{txt}")
                doc.close()
            except Exception as exc:  # noqa: BLE001
                err = f"{type(exc).__name__}: {exc}"

            text = "\n".join(page_texts)
            record = {
                "path": path,
                "sha256": rec.get("sha256") or "",
                "bytes": os.path.getsize(path) if os.path.exists(path) else 0,
                "pages": len(page_texts) or rec.get("pages") or 0,
                "chars": len(text),
                "chars_per_page": round(len(text) / max(1, len(page_texts)), 1),
                "title": "",
                "author": "",
                "text": text,
                "error": err,
                "source": "tesseract",
            }
            out.write(json.dumps(record, ensure_ascii=False) + "\n")
            out.flush()
            donef.write(json.dumps({"path": path, "chars": len(text), "error": err}) + "\n")
            donef.flush()
            print(
                f"  {i}/{len(queue)} pages={len(page_texts)} chars={len(text)} "
                f"{os.path.basename(path)[:50]}",
                flush=True,
            )

    print("ocr pass complete")
    return 0


if __name__ == "__main__":
    sys.exit(main())
