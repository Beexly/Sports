"""Extract full text from harvested PDFs and fold it into the manifest.

Without this step the corpus is filenames: the index ranks on title+abstract only
(17% full-text coverage before tonight). This walks every manifest record that has
a local `pdf_path` but no `full_text`, extracts with PyMuPDF, and rewrites the
manifest atomically.

Rules that matter:
  * Resumable. A re-run skips records that already carry full_text.
  * A PDF that fails to parse is recorded as `full_text_error` and left without
    text -- never silently dropped, never filled with a guess.
  * Writes to a temp file then renames, so an interruption cannot truncate the
    manifest mid-line.
  * Caps extracted characters (default 120k) to keep the manifest sane; the JSONL
    is read whole by the index builder.

Usage:
  python scripts/research/extract_corpus_text.py \
      --manifest <...>/manifest.jsonl --max-seconds 300
"""

from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path

MAX_CHARS = 120_000


def extract_one(path: Path) -> tuple[str, str | None]:
    try:
        import pymupdf  # noqa: WPS433
    except ImportError:  # pragma: no cover
        import fitz as pymupdf  # type: ignore
    try:
        doc = pymupdf.open(str(path))
    except Exception as e:  # corrupt / encrypted / not really a pdf
        return "", f"open_failed:{type(e).__name__}"
    try:
        chunks: list[str] = []
        size = 0
        for page in doc:
            t = page.get_text() or ""
            if not t:
                continue
            chunks.append(t)
            size += len(t)
            if size >= MAX_CHARS:
                break
        text = "\n".join(chunks)[:MAX_CHARS]
        if not text.strip():
            return "", "no_text_layer"  # scanned image-only PDF
        return text, None
    finally:
        try:
            doc.close()
        except Exception:
            pass


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--max-seconds", type=int, default=300)
    ap.add_argument("--limit", type=int, default=0, help="0 = no cap")
    args = ap.parse_args(argv)

    mf = Path(args.manifest)
    started = time.time()
    records: list[dict] = []
    bad_lines = 0
    for line in mf.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            records.append(json.loads(line))
        except json.JSONDecodeError:
            bad_lines += 1

    todo = [r for r in records
            if r.get("pdf_path") and not r.get("full_text")]
    if args.limit:
        todo = todo[:args.limit]

    done = 0
    ok = 0
    failed = 0
    scanned = 0
    errors: dict[str, int] = {}

    for r in todo:
        if (time.time() - started) >= args.max_seconds:
            break
        p = Path(r["pdf_path"])
        if not p.exists():
            r["full_text_error"] = "missing_file"
            failed += 1
            errors["missing_file"] = errors.get("missing_file", 0) + 1
            done += 1
            continue
        text, err = extract_one(p)
        done += 1
        if err:
            r["full_text_error"] = err
            failed += 1
            scanned += 1 if err == "no_text_layer" else 0
            errors[err.split(":")[0]] = errors.get(err.split(":")[0], 0) + 1
        else:
            r["full_text"] = text
            r["full_text_chars"] = len(text)
            r.pop("full_text_error", None)
            ok += 1

    tmp = mf.with_suffix(".jsonl.tmp")
    with tmp.open("w", encoding="utf-8", newline="") as fh:
        for r in records:
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")
    os.replace(tmp, mf)

    remaining = sum(1 for r in records if r.get("pdf_path") and not r.get("full_text"))
    stats = {
        "records": len(records),
        "unparseable_manifest_lines": bad_lines,
        "attempted_this_run": done,
        "extracted_ok": ok,
        "failed": failed,
        "image_only_pdfs": scanned,
        "error_breakdown": errors,
        "remaining_without_text": remaining,
        "with_full_text_total": sum(1 for r in records if r.get("full_text")),
        "elapsed_s": round(time.time() - started, 1),
        "complete": remaining == 0,
    }
    print(json.dumps(stats, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
