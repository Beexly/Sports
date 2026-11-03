"""Ingest on-disk PDFs into the research corpus with full text.

The API harvest gives metadata and abstracts. The PDFs already on disk give the
thing a reasoning engine actually needs: the text. This reads each PDF, extracts
title/abstract/full text, and appends a manifest record so the same BM25 index
serves both.

Two integrity rules, both learned the hard way in this repo:

1. RETRACTED PAPERS ARE QUARANTINED. Four files in the source pile carry
   "Retracted" in their own titles (Computational and Mathematical Methods in
   Medicine, 2022). They get `retracted: true` and `gate_status: QUARANTINED`, and
   search excludes them by default. A retracted paper that reads fluently is
   exactly the kind of source that silently poisons a knowledge base.

2. PII AND CREDENTIAL FILES ARE REFUSED BY NAME. Downloads contains passport and
   SSN scans and a live service-account key. Ingesting them into a corpus that is
   uploaded to Drive would be a data breach, and a text index makes the leak
   searchable. They are skipped before any read.

Nothing is deleted; ingestion only adds records.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

try:
    import pymupdf
except ImportError:  # pragma: no cover
    pymupdf = None

FORBIDDEN = ("ssn", "passport", "statement", "gbaxleyid", "gbpassport",
             "galaxysportsedge", "credential", ".json")

RETRACT_PAT = re.compile(r"\bretract(ed|ion)\b", re.IGNORECASE)


def is_forbidden(path: Path) -> bool:
    low = path.name.lower()
    return any(f in low for f in FORBIDDEN)


def extract(path: Path, max_chars: int = 60_000) -> dict:
    """Pull text from a PDF and derive title/abstract/year."""
    doc = pymupdf.open(path)
    pages = []
    total = 0
    for p in doc:
        t = p.get_text()
        pages.append(t)
        total += len(t)
        if total >= max_chars:
            break
    doc.close()
    text = "\n".join(pages)[:max_chars]
    flat = re.sub(r"[ \t]+", " ", text)

    # Title: the longest early line that is not a header boilerplate fragment.
    lines = [l.strip() for l in flat.splitlines() if len(l.strip()) > 12]
    title = ""
    for l in lines[:12]:
        if re.match(r"^(arxiv|doi|http|www\.|received|accepted|©|copyright)", l, re.I):
            continue
        if len(l) > len(title):
            title = l
        if len(title) > 40:
            break

    # Abstract: text between "abstract" and the first section heading.
    m = re.search(r"abstract[\s:—-]*(.{80,2000}?)(?=\n\s*(?:1[\.\s]|introduction|keywords|©))",
                  flat, re.IGNORECASE | re.DOTALL)
    abstract = re.sub(r"\s+", " ", m.group(1)).strip() if m else ""
    if not abstract:
        abstract = re.sub(r"\s+", " ", flat[:600]).strip()

    year = None
    ym = re.search(r"(19|20)\d{2}", path.name)
    if ym:
        year = int(ym.group(0))
    else:
        ym = re.search(r"\b(19|20)\d{2}\b", flat[:2000])
        if ym:
            year = int(ym.group(0))

    retracted = bool(RETRACT_PAT.search(path.name)) or bool(
        RETRACT_PAT.search(flat[:4000]))

    return {
        "text": flat,
        "title": title[:300],
        "abstract": abstract[:4000],
        "year": year,
        "retracted": retracted,
        "chars": len(flat),
    }


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default=r"C:\Users\Garrett\Downloads")
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--max", type=int, default=500)
    args = ap.parse_args(argv)

    if pymupdf is None:
        print("pymupdf not installed")
        return 2

    manifest = Path(args.manifest)
    seen: set[str] = set()
    if manifest.exists():
        for line in manifest.read_text(encoding="utf-8").splitlines():
            try:
                r = json.loads(line)
                if r.get("sha256"):
                    seen.add(r["sha256"])
            except Exception:
                pass

    pdfs = sorted(Path(args.dir).glob("*.pdf"))
    added = skipped_pii = retracted = errors = 0
    with manifest.open("a", encoding="utf-8") as fh:
        for p in pdfs[: args.max]:
            if is_forbidden(p):
                skipped_pii += 1
                continue
            try:
                raw = p.read_bytes()
                sha = hashlib.sha256(raw).hexdigest()
                if sha in seen:
                    continue
                info = extract(p)
            except Exception as e:
                errors += 1
                print(f"  ! {p.name[:50]}: {type(e).__name__}")
                continue

            rec = {
                "source": "local_pdf",
                "source_id": sha[:16],
                "sha256": sha,
                "title": info["title"] or p.stem,
                "year": info["year"],
                "authors": [],
                "venue": None,
                "doi": None,
                "url": None,
                "pdf_url": None,
                "abstract": info["abstract"],
                "topics": ["local_pdf"],
                "query": "on-disk PDF ingestion",
                "retrieved_at": datetime.now(timezone.utc).isoformat(),
                "pdf_path": str(p),
                "pdf_bytes": len(raw),
                "chars_extracted": info["chars"],
                "full_text": info["text"][:20_000],
                "retracted": info["retracted"],
                "gate_status": "QUARANTINED" if info["retracted"] else "UNVALIDATED",
                "wired": False,
            }
            fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
            seen.add(sha)
            added += 1
            if info["retracted"]:
                retracted += 1
                print(f"  RETRACTED: {p.name[:60]}")

    print(f"\nadded {added} | skipped PII/credential {skipped_pii} | "
          f"retracted {retracted} | errors {errors}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
