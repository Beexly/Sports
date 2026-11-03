"""Ingest arXiv papers by ID: download the PDF, extract text, append to manifest.

Used when the arXiv *API* is rate-limited but the PDF host is not. Titles come
from the search pages that produced the IDs; abstracts and full text come from the
PDF itself, so records stand on their own without re-querying the API.

Retraction and withdrawal are checked in the extracted text and in the title, and
quarantined the same way as the local-PDF ingester.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

try:
    import pymupdf
except ImportError:  # pragma: no cover
    pymupdf = None

UA = "GSE-Research-Harvester/1.0"
RETRACT = re.compile(r"\b(retracted|withdrawn)\b", re.I)


def extract_text(path: Path, max_chars: int = 40_000) -> str:
    doc = pymupdf.open(path)
    buf, total = [], 0
    for page in doc:
        t = page.get_text()
        buf.append(t)
        total += len(t)
        if total >= max_chars:
            break
    doc.close()
    return re.sub(r"[ \t]+", " ", "\n".join(buf))[:max_chars]


def derive_abstract(text: str) -> str:
    m = re.search(r"abstract[\s:—-]*(.{120,2200}?)(?=\n\s*(?:1[\.\s]|introduction|"
                  r"index terms|keywords|ccs concepts|©))", text, re.I | re.DOTALL)
    if m:
        return re.sub(r"\s+", " ", m.group(1)).strip()[:4000]
    return re.sub(r"\s+", " ", text[:800]).strip()


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ids", required=True, help="JSON from arxiv_relevant.json")
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--pdfdir", required=True)
    ap.add_argument("--groups", default="football,sport")
    ap.add_argument("--delay", type=float, default=1.5)
    args = ap.parse_args(argv)

    if pymupdf is None:
        print("pymupdf missing")
        return 2

    src = json.loads(Path(args.ids).read_text(encoding="utf-8"))
    items = []
    for g in args.groups.split(","):
        items.extend(src.get(g.strip(), []))
    print(f"candidates: {len(items)}")

    manifest = Path(args.manifest)
    pdfdir = Path(args.pdfdir)
    pdfdir.mkdir(parents=True, exist_ok=True)

    seen = set()
    if manifest.exists():
        for line in manifest.read_text(encoding="utf-8").splitlines():
            try:
                r = json.loads(line)
                if r.get("source") == "arxiv":
                    seen.add(r.get("source_id"))
            except Exception:
                pass

    added = skipped = failed = retracted = 0
    with manifest.open("a", encoding="utf-8") as fh:
        for i, it in enumerate(items, 1):
            aid, title = it["id"], it.get("title", "")
            if aid in seen:
                skipped += 1
                continue
            dest = pdfdir / f"{aid.replace('/', '_')}.pdf"
            if not (dest.exists() and dest.stat().st_size > 20_000):
                url = f"https://arxiv.org/pdf/{aid}"
                try:
                    req = urllib.request.Request(url, headers={"User-Agent": UA})
                    with urllib.request.urlopen(req, timeout=90) as r:
                        raw = r.read()
                except urllib.error.HTTPError as e:
                    print(f"  {aid}: HTTP {e.code}")
                    failed += 1
                    time.sleep(args.delay)
                    continue
                except Exception as e:
                    print(f"  {aid}: {type(e).__name__}")
                    failed += 1
                    time.sleep(args.delay)
                    continue
                if not raw.startswith(b"%PDF"):
                    failed += 1
                    time.sleep(args.delay)
                    continue
                dest.write_bytes(raw)

            try:
                text = extract_text(dest)
            except Exception as e:
                print(f"  {aid}: extract {type(e).__name__}")
                failed += 1
                continue

            is_retracted = bool(RETRACT.search(title)) or bool(RETRACT.search(text[:3000]))
            rec = {
                "source": "arxiv",
                "source_id": aid,
                "sha256": hashlib.sha256(dest.read_bytes()).hexdigest(),
                "title": title,
                "year": int(aid[:2]) + 2000 if re.match(r"\d{2}", aid) else None,
                "authors": [],
                "venue": "arXiv",
                "doi": None,
                "url": f"https://arxiv.org/abs/{aid}",
                "pdf_url": f"https://arxiv.org/pdf/{aid}",
                "abstract": derive_abstract(text),
                "topics": [it.get("label", "arxiv_search")],
                "query": f"arxiv search page: {it.get('label', '')}",
                "retrieved_at": datetime.now(timezone.utc).isoformat(),
                "pdf_path": str(dest),
                "pdf_bytes": dest.stat().st_size,
                "chars_extracted": len(text),
                "full_text": text[:20_000],
                "retracted": is_retracted,
                "gate_status": "QUARANTINED" if is_retracted else "UNVALIDATED",
                "wired": False,
            }
            fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
            fh.flush()
            seen.add(aid)
            added += 1
            if is_retracted:
                retracted += 1
            if i % 15 == 0:
                print(f"  {i}/{len(items)} added={added} failed={failed}")
            time.sleep(args.delay)

    print(f"\nadded {added} | skipped {skipped} | failed {failed} | retracted {retracted}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
