#!/usr/bin/env python3
"""Extract text from the 2026-11-03 Downloads corpus into a trainer-feed JSONL.

Reads scratch/manifest_2026_11_03.json (sha256-deduped). One record per
canonical content hash. Honest status per record:
  EXTRACTED        text pulled and non-empty
  EMPTY_TEXT       extractor ran but produced no text (scanned PDF etc.)
  EXTRACT_ERROR    extractor raised; error text kept
  BINARY_RECORDED  no text by design (zip/png/db/xlsx-binary); sha + size only
Never writes a fabricated text value. Refuses (exit 2) if a text-type file
yields zero records overall, so a silent empty dump cannot pass.
"""
import json, os, sys, time, zipfile
from datetime import datetime, timezone

SCRATCH = r"C:\Users\Garrett\AppData\Local\hermes\cache\scratch"
FEED_DIR = r"C:\Users\Garrett\Sports\brain\feeds\2026-11-03"
FEED = os.path.join(FEED_DIR, "trainer_feed.jsonl")
TEXT_EXT = {".md", ".txt", ".csv", ".json", ".py", ".ts", ".ris", ".log", ".html", ".eml", ".ipynb"}

def read_text(p):
    with open(p, "r", encoding="utf-8", errors="replace") as f:
        return f.read()

def pdf_text(p):
    import pymupdf
    doc = pymupdf.open(p)
    try:
        return "\n".join(pg.get_text() for pg in doc)
    finally:
        doc.close()

def docx_text(p):
    import docx
    d = docx.Document(p)
    parts = [para.text for para in d.paragraphs]
    for t in d.tables:
        for row in t.rows:
            parts.append(" | ".join(c.text for c in row.cells))
    return "\n".join(parts)

def zip_listing(p):
    with zipfile.ZipFile(p) as z:
        names = z.namelist()
    return "ZIP CONTENTS (" + str(len(names)) + " entries):\n" + "\n".join(names[:2000])

def extract(p, ext):
    if ext == ".pdf":
        return pdf_text(p), "PDF"
    if ext == ".docx":
        return docx_text(p), "DOCX"
    if ext in TEXT_EXT:
        return read_text(p), ext.lstrip(".").upper()
    if ext == ".zip":
        return zip_listing(p), "ZIP_LISTING"
    return None, "BINARY"

def main():
    man = json.load(open(os.path.join(SCRATCH, "manifest_2026_11_03.json"), encoding="utf-8"))
    alias = man["alias_to_canonical"]
    ok_recs = [r for r in man["records"] if r["status"] == "OK" and r["path"] not in alias]
    print(f"canonical files to extract: {len(ok_recs)}", flush=True)
    os.makedirs(FEED_DIR, exist_ok=True)
    now = datetime.now(timezone.utc).isoformat()
    counts = {}
    text_files = 0
    text_extracted = 0
    t0 = time.time()
    with open(FEED, "w", encoding="utf-8") as out:
        for i, r in enumerate(ok_recs):
            p, ext = r["path"], r["ext"]
            rec = {"source": os.path.basename(p), "category": "downloads_corpus_2026_11_03",
                   "path": p, "sha256": r["sha256"], "size": r["size"],
                   "appended_utc": now, "appended_by": "extract_corpus.py",
                   "verification_status": "EXTRACTED_UNVERIFIED_CONTENT",
                   "source_fidelity": "RAW_FILE_TEXT"}
            try:
                text, kind = extract(p, ext)
                rec["kind"] = kind
                if text is None:
                    rec["status"] = "BINARY_RECORDED"
                    rec["text"] = ""
                elif text.strip():
                    rec["status"] = "EXTRACTED"
                    rec["text"] = text
                    text_extracted += 1
                else:
                    rec["status"] = "EMPTY_TEXT"
                    rec["text"] = ""
            except Exception as e:  # keep the real error, never invent text
                rec["kind"] = ext
                rec["status"] = "EXTRACT_ERROR"
                rec["error"] = f"{type(e).__name__}: {e}"
                rec["text"] = ""
            if ext in TEXT_EXT or ext in (".pdf", ".docx"):
                text_files += 1
            counts[rec["status"]] = counts.get(rec["status"], 0) + 1
            out.write(json.dumps(rec, ensure_ascii=False) + "\n")
            if (i + 1) % 25 == 0:
                print(f"  {i+1}/{len(ok_recs)} ({time.time()-t0:.0f}s) {counts}", flush=True)
    print(f"DONE {time.time()-t0:.0f}s status_counts={counts}", flush=True)
    print(f"text-type files={text_files} extracted_with_text={text_extracted}", flush=True)
    if text_files and text_extracted == 0:
        print("REFUSED: zero text extracted from text-type files", flush=True)
        sys.exit(2)

if __name__ == "__main__":
    main()
