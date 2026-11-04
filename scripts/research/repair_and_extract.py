"""Repair manifest pdf_path values and extract text for records that lack it.

Two defects this fixes, both found in the overnight run:

1. **MSYS path corruption.** Some records carry `pdf_path` as
   ``\\c\\Users\\Garrett\\...`` (a bash-style path captured on Windows) which
   `Path()` cannot open. Normalised back to ``C:\\Users\\Garrett\\...``.

2. **Filename-scheme drift.** The earlier harvester wrote plain
   ``<arxiv-id>.pdf`` / ``<openalex-id>.pdf`` names, while the overnight
   harvester writes ``<source>_<id>.pdf``. A record whose stored path is absent
   is re-linked by matching the file stem against the record's ``source_id``
   (with and without source prefix, with and without arXiv version suffix).

Then it extracts full text for every record that has a resolvable file and no
`full_text`, and reports exactly what it could and could not link.

Read-only on the PDFs; rewrites the manifest atomically.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import time
from pathlib import Path

MAX_CHARS = 120_000


def norm(p: str | None) -> str | None:
    """Fix MSYS-style leading \\c\\ into C:\\ ."""
    if not p:
        return None
    s = p
    if s.startswith("\\c\\"):
        s = "C:\\" + s[3:]
    s = s.replace("/", "\\")
    return s


def extract(path: Path) -> tuple[str, str | None]:
    try:
        import pymupdf
    except ImportError:  # pragma: no cover
        import fitz as pymupdf  # type: ignore
    try:
        doc = pymupdf.open(str(path))
    except Exception as e:
        return "", f"open_failed:{type(e).__name__}"
    try:
        out, size = [], 0
        for page in doc:
            t = page.get_text() or ""
            if t:
                out.append(t)
                size += len(t)
                if size >= MAX_CHARS:
                    break
        text = "\n".join(out)[:MAX_CHARS]
        return (text, None) if text.strip() else ("", "no_text_layer")
    finally:
        try:
            doc.close()
        except Exception:
            pass


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--pdf-dir", required=True)
    ap.add_argument("--max-seconds", type=int, default=300)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args(argv)

    mf = Path(args.manifest)
    pdf_dir = Path(args.pdf_dir)
    started = time.time()

    records = []
    for line in mf.read_text(encoding="utf-8").splitlines():
        if line.strip():
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError:
                pass

    # index local files by lowercased stem
    files: dict[str, Path] = {}
    for f in pdf_dir.glob("*.pdf"):
        files[f.stem.lower()] = f

    def resolve(rec: dict) -> Path | None:
        p = norm(rec.get("pdf_path"))
        if p:
            cand = Path(p)
            if cand.exists():
                return cand
        sid = str(rec.get("source_id") or "").strip()
        if not sid:
            return None
        src = str(rec.get("source") or "")
        sids = [sid]
        # arXiv ids carry a version suffix in some records, strip it
        m = re.match(r"^(.*?)v\d+$", sid)
        if m:
            sids.append(m.group(1))
        for s in sids:
            for key in (f"{src}_{s}", s, f"{src.lower()}_{s.lower()}", s.lower()):
                f = files.get(key.lower())
                if f:
                    return f
        return None

    fixed_paths = 0
    linked = 0
    extracted = 0
    failed = 0
    unlinked = 0
    errs: dict[str, int] = {}

    for r in records:
        old = r.get("pdf_path")
        newp = norm(old)
        if old and newp != old:
            r["pdf_path"] = newp
            fixed_paths += 1

        if r.get("full_text"):
            continue
        if (time.time() - started) >= args.max_seconds:
            break

        f = resolve(r)
        if f is None:
            if r.get("pdf_path") and not Path(r["pdf_path"]).exists():
                unlinked += 1
            continue
        if str(f) != r.get("pdf_path"):
            r["pdf_path"] = str(f)
            linked += 1
        text, err = extract(f)
        if err:
            r["full_text_error"] = err
            failed += 1
            errs[err.split(":")[0]] = errs.get(err.split(":")[0], 0) + 1
        else:
            r["full_text"] = text
            r["full_text_chars"] = len(text)
            r.pop("full_text_error", None)
            extracted += 1

    if not args.dry_run:
        tmp = mf.with_suffix(".jsonl.tmp2")
        with tmp.open("w", encoding="utf-8", newline="") as fh:
            for r in records:
                fh.write(json.dumps(r, ensure_ascii=False) + "\n")
        os.replace(tmp, mf)

    stats = {
        "records": len(records),
        "local_pdfs": len(files),
        "paths_normalised": fixed_paths,
        "newly_linked_by_stem": linked,
        "text_extracted": extracted,
        "extract_failed": failed,
        "error_breakdown": errs,
        "records_still_unlinked": unlinked,
        "with_full_text_total": sum(1 for r in records if r.get("full_text")),
        "without_full_text_total": sum(1 for r in records if not r.get("full_text")),
        "elapsed_s": round(time.time() - started, 1),
        "dry_run": args.dry_run,
    }
    print(json.dumps(stats, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
