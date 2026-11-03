import json, io, zipfile, os, hashlib
from datetime import datetime, timezone
import docx

FEED = r"C:\Users\Garrett\Sports\brain\feeds\2026-11-03\trainer_feed.jsonl"
DL = r"C:\Users\Garrett\Downloads"
recs = [json.loads(l) for l in open(FEED, encoding="utf-8")]
now = datetime.now(timezone.utc).isoformat()
fixed, still = 0, 0
for r in recs:
    if r["status"] != "EXTRACT_ERROR" or not r["path"].lower().endswith(".docx"):
        continue
    zp, _, name = r["path"].partition("::")
    try:
        with zipfile.ZipFile(zp) as zf:
            data = zf.read(name)
        d = docx.Document(io.BytesIO(data))
        text = "\n".join(p.text for p in d.paragraphs)
        for t in d.tables:
            for row in t.rows:
                text += "\n" + " | ".join(c.text for c in row.cells)
        r["status"] = "EXTRACTED" if text.strip() else "EMPTY_TEXT"
        r["kind"] = "DOCX"
        r["text"] = text
        r["sha256"] = hashlib.sha256(data).hexdigest()
        r["appended_by"] = "fix_zip_docx"
        r["appended_utc"] = now
        fixed += 1
    except Exception as e:
        r["kind"] = f"DOCX({type(e).__name__}: {e})"
        still += 1
with open(FEED, "w", encoding="utf-8") as f:
    for r in recs:
        f.write(json.dumps(r, ensure_ascii=False) + "\n")
# verify by re-reading from disk
back = [json.loads(l) for l in open(FEED, encoding="utf-8")]
from collections import Counter
print("fixed:", fixed, "still_error:", still)
print("feed total:", len(back), "unique paths:", len({b['path'] for b in back}))
print("statuses:", Counter(b["status"] for b in back))
print("EXTRACTED empty:", sum(1 for b in back if b["status"]=="EXTRACTED" and not b["text"].strip()))
