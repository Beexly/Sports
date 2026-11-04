"""Ingest every file in the Downloads audit list into the research corpus.

Reads the audit file list, extracts text per extension, and writes manifest
records in the same schema as the existing corpus so they merge cleanly.

Skips: images (.png/.jpg), incomplete downloads (.crdownload), and archives
(.zip) — those are indexed by name only, not text-extracted.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import sqlite3
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path

DL = Path(r"C:\Users\Garrett\Downloads")
LIST = Path(r"C:\Users\Garrett\AppData\Local\hermes\cache\scratch\audit_filelist.txt")
OUT = Path(r"C:\Users\Garrett\AppData\Local\hermes\cache\scratch\research_corpus\downloads_audit_2026_11_04.jsonl")
MAX_CHARS = 200_000

TEXT_EXT = {".md", ".txt", ".py", ".ts", ".cu", ".log", ".json", ".csv", ".ris", ".eml"}
SKIP_EXT = {".png", ".jpg", ".jpeg", ".crdownload"}


def _sha256(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _read_text(p: Path) -> str:
    return p.read_text(encoding="utf-8", errors="replace")[:MAX_CHARS]


def _extract_docx(p: Path) -> str:
    import docx
    d = docx.Document(str(p))
    parts = [para.text for para in d.paragraphs if para.text.strip()]
    for tbl in d.tables:
        for row in tbl.rows:
            cells = [c.text.strip() for c in row.cells if c.text.strip()]
            if cells:
                parts.append(" | ".join(cells))
    return "\n".join(parts)[:MAX_CHARS]


def _extract_pdf(p: Path) -> str:
    import pymupdf
    doc = pymupdf.open(str(p))
    parts = []
    for page in doc:
        parts.append(page.get_text())
        if sum(len(x) for x in parts) > MAX_CHARS:
            break
    doc.close()
    return "\n".join(parts)[:MAX_CHARS]


def _extract_ipynb(p: Path) -> str:
    nb = json.loads(p.read_text(encoding="utf-8", errors="replace"))
    parts = []
    for cell in nb.get("cells", []):
        src = cell.get("source", [])
        if isinstance(src, list):
            src = "".join(src)
        if src.strip():
            parts.append(f"[{cell.get('cell_type','?')}] {src}")
    return "\n\n".join(parts)[:MAX_CHARS]


def _extract_html(p: Path) -> str:
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(p.read_text(encoding="utf-8", errors="replace"), "html.parser")
    for tag in soup(["script", "style"]):
        tag.decompose()
    return re.sub(r"\n{3,}", "\n\n", soup.get_text("\n"))[:MAX_CHARS]


def _extract_xlsx(p: Path) -> str:
    import openpyxl
    wb = openpyxl.load_workbook(str(p), read_only=True, data_only=True)
    parts = []
    for ws in wb.worksheets:
        parts.append(f"## sheet: {ws.title}")
        for i, row in enumerate(ws.iter_rows(values_only=True)):
            if i > 500:
                break
            cells = [str(c) for c in row if c is not None]
            if cells:
                parts.append(" | ".join(cells))
    wb.close()
    return "\n".join(parts)[:MAX_CHARS]


def _extract_db(p: Path) -> str:
    con = sqlite3.connect(f"file:{p}?mode=ro", uri=True)
    parts = []
    try:
        cur = con.cursor()
        tables = [r[0] for r in cur.execute(
            "SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
        for t in tables:
            try:
                n = cur.execute(f'SELECT COUNT(*) FROM "{t}"').fetchone()[0]
            except Exception:
                n = "?"
            cols = [r[1] for r in cur.execute(f'PRAGMA table_info("{t}")').fetchall()]
            parts.append(f"table {t} rows={n} cols={cols}")
    finally:
        con.close()
    return "\n".join(parts)[:MAX_CHARS]


def _extract_zip(p: Path) -> str:
    try:
        with zipfile.ZipFile(p) as z:
            names = z.namelist()
        return f"zip archive, {len(names)} entries:\n" + "\n".join(names[:500])
    except Exception as e:
        return f"zip unreadable: {e}"


def extract(p: Path) -> tuple[str, str]:
    """Return (text, method)."""
    ext = p.suffix.lower()
    if ext in SKIP_EXT:
        return "", "skipped"
    if ext in TEXT_EXT:
        return _read_text(p), "text"
    if ext == ".docx":
        return _extract_docx(p), "docx"
    if ext == ".pdf":
        return _extract_pdf(p), "pdf"
    if ext == ".ipynb":
        return _extract_ipynb(p), "ipynb"
    if ext in (".html", ".htm"):
        return _extract_html(p), "html"
    if ext == ".xlsx":
        return _extract_xlsx(p), "xlsx"
    if ext == ".db":
        return _extract_db(p), "sqlite"
    if ext == ".zip":
        return _extract_zip(p), "zip"
    return "", "unknown"


def main() -> int:
    names = [l.strip() for l in LIST.read_text(encoding="utf-8").splitlines() if l.strip()]
    print(f"listed: {len(names)}")

    # Skip files already in the manifest by basename.
    man = Path(r"C:\Users\Garrett\AppData\Local\hermes\cache\scratch\research_corpus\merged_manifest_2026-11-04.jsonl")
    covered = set()
    for line in man.open(encoding="utf-8", errors="replace"):
        try:
            d = json.loads(line)
        except Exception:
            continue
        for k in ("pdf_path", "path", "source_path", "file_path", "local_path"):
            v = d.get(k)
            if v:
                covered.add(os.path.basename(str(v)).lower())

    todo = [n for n in names if n.lower() not in covered]
    print(f"to ingest: {len(todo)}")

    seen_sha = set()
    rows = []
    stats = {}
    for name in todo:
        p = DL / name
        if not p.exists():
            stats["missing"] = stats.get("missing", 0) + 1
            continue
        try:
            sha = _sha256(p)
        except Exception as e:
            stats["hash_fail"] = stats.get("hash_fail", 0) + 1
            continue
        if sha in seen_sha:
            stats["dup"] = stats.get("dup", 0) + 1
            continue
        seen_sha.add(sha)
        try:
            text, method = extract(p)
        except Exception as e:
            stats[f"err_{type(e).__name__}"] = stats.get(f"err_{type(e).__name__}", 0) + 1
            text, method = "", f"error:{type(e).__name__}"
        stats[method] = stats.get(method, 0) + 1
        if not text.strip():
            continue
        title = p.stem.replace("_", " ").replace("-", " ").strip()[:200]
        rows.append({
            "source": "local_doc",
            "source_id": sha[:16],
            "sha256": sha,
            "title": title,
            "year": None,
            "authors": "[]",
            "venue": None,
            "doi": None,
            "url": None,
            "pdf_url": None,
            "abstract": text[:400].replace("\n", " "),
            "topics": f"['local_doc','{method}']",
            "query": "downloads audit ingestion 2026-11-04",
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
            "pdf_path": str(p),
            "pdf_bytes": p.stat().st_size,
            "chars_extracted": len(text),
            "full_text": text,
            "retracted": False,
            "gate_status": "UNVALIDATED",
            "wired": False,
            "_merge_source": "downloads_audit_2026_11_04",
            "_merge_prio": 2,
        })

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    print(f"wrote {len(rows)} records -> {OUT}")
    print("stats:", json.dumps(stats, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
