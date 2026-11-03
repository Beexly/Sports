"""Repair title/year on locally ingested PDFs.

The first pass took the longest early line as the title and the first 4-digit
number as the year. On journal PDFs that yields headers like
"Procedia Engineering 34 ( 2012 ) 98 - 103" and years like 2080 or 2097, which
makes the record unfindable and the year meaningless.

Better heuristics, applied in order:
  title  longest line in the first page that is not a journal banner, not a
         citation line, not all-caps boilerplate, and is 20-200 chars
  year   filename match first, then a year on the first page, clamped to a
         plausible range (1950 .. current+1)

Rewrites the manifest in place, preserving every other field.
"""

from __future__ import annotations

import json
import re
import sys
from datetime import datetime
from pathlib import Path

try:
    import pymupdf
except ImportError:
    pymupdf = None

BANNER = re.compile(
    r"(procedia|journal of|vol\.?\s*\d|volume\s*\d|issn|isbn|doi:|https?://|www\.|"
    r"received|accepted|published|copyright|©|all rights reserved|"
    r"^\s*\d+\s*$|page\s*\d+)", re.I)
CITATION = re.compile(r"\(\s*(19|20)\d{2}\s*\)\s*\d+\s*[–-]\s*\d+")
YEAR = re.compile(r"\b(19[5-9]\d|20[0-4]\d)\b")


AFFIL = re.compile(r"(universit|institute|school of|department|college|faculty|"
                   r"laborator|centre for|center for|academy|hospital|inc\.|ltd)", re.I)


def title_by_font(page) -> str:
    """Pick the largest-font line on page 1 - the typographic definition of a title.

    Text heuristics kept selecting affiliations and abstract sentences, because
    those are long. Font size is what actually distinguishes a title, and PyMuPDF
    exposes it per span.
    """
    try:
        d = page.get_text("dict")
    except Exception:
        return ""
    best, best_size = "", 0.0
    for block in d.get("blocks", []):
        for line in block.get("lines", []):
            spans = line.get("spans", [])
            if not spans:
                continue
            txt = re.sub(r"\s+", " ", "".join(s.get("text", "") for s in spans)).strip()
            if len(txt) < 15 or len(txt) > 250:
                continue
            if AFFIL.search(txt) or BANNER.search(txt) or CITATION.search(txt):
                continue
            size = max(float(s.get("size", 0)) for s in spans)
            if size > best_size:
                best, best_size = txt, size
    return best[:300]


def clean_title(text: str) -> str:
    lines = [re.sub(r"\s+", " ", l).strip() for l in text.splitlines()]
    cands = []
    for l in lines[:40]:
        if len(l) < 20 or len(l) > 200:
            continue
        if BANNER.search(l) or CITATION.search(l):
            continue
        letters = sum(c.isalpha() for c in l)
        if letters < len(l) * 0.6:
            continue
        if l.isupper() and len(l) < 30:
            continue
        cands.append(l)
    if not cands:
        return ""
    # Prefer the longest early candidate; titles are usually the most substantial
    # line before the author block.
    return max(cands[:6], key=len)[:300]


def clean_year(path: Path, text: str) -> int | None:
    now = datetime.now().year
    m = re.search(r"(19[5-9]\d|20[0-4]\d)", path.name)
    if m:
        return int(m.group(1))
    for m in YEAR.finditer(text[:3000]):
        y = int(m.group(1))
        if 1950 <= y <= now + 1:
            return y
    return None


def main(argv: list[str] | None = None) -> int:
    manifest = Path(argv[0] if argv else sys.argv[1])
    if pymupdf is None:
        print("pymupdf missing")
        return 2

    recs, bad = [], 0
    for line in manifest.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            recs.append(json.loads(line))
        except json.JSONDecodeError:
            # Two writers appending at once can split a record across lines. Drop
            # the fragment and report it: a silently skipped line is how a corpus
            # quietly shrinks.
            bad += 1
    if bad:
        print(f"WARNING: {bad} unparseable line(s) dropped (concurrent-write damage)")
    fixed_title = fixed_year = 0
    for r in recs:
        if r.get("source") != "local_pdf":
            continue
        p = Path(r.get("pdf_path") or "")
        if not p.exists():
            continue
        try:
            doc = pymupdf.open(p)
            text = doc[0].get_text() if len(doc) else ""
            font_title = title_by_font(doc[0]) if len(doc) else ""
            doc.close()
        except Exception:
            continue
        new_title = font_title or clean_title(text)
        new_year = clean_year(p, text)
        if new_title and new_title != r.get("title"):
            r["title"] = new_title
            fixed_title += 1
        if new_year and new_year != r.get("year"):
            r["year"] = new_year
            fixed_year += 1

    manifest.write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in recs) + "\n",
                        encoding="utf-8")
    print(f"records: {len(recs)} | titles repaired: {fixed_title} | years repaired: {fixed_year}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
