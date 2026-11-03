#!/usr/bin/env python3
"""Build master manifest for the 2026-11-03 Downloads corpus ingestion.

sha256 + size + ext + mtime for every listed file; dedupe by content hash
(canonical = first path sorted; aliases = the rest). Never fabricates: a file
that cannot be read is recorded with status=READ_ERROR and the OS error text.
Writes scratch/manifest_2026_11_03.json and prints a summary.
"""
import hashlib, json, os, sys, time
from datetime import datetime, timezone

SCRATCH = r"C:\Users\Garrett\AppData\Local\hermes\cache\scratch"

def load_paths():
    paths = json.load(open(os.path.join(SCRATCH, "master_manifest.json"), encoding="utf-8"))
    # drop the 5 parser-fragment artifacts of one unquoted spaced filename
    frags = {r"C:\Users\Garrett\Downloads\Adversarial", r"C:\Users\Garrett\Downloads\Review",
             r"C:\Users\Garrett\Downloads\of", r"C:\Users\Garrett\Downloads\the",
             r"C:\Users\Garrett\Downloads\Gemini.docx"}
    paths = [p for p in paths if p not in frags]
    real = r"C:\Users\Garrett\Downloads\Adversarial Review of the Gemini.docx"
    if real not in paths:
        paths.append(real)
    return sorted(set(paths))

def sha256_of(path, bufsize=1 << 20):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            b = f.read(bufsize)
            if not b:
                break
            h.update(b)
    return h.hexdigest()

def main():
    paths = load_paths()
    print(f"manifest: {len(paths)} unique listed paths", flush=True)
    records, by_hash = [], {}
    t0 = time.time()
    for i, p in enumerate(paths):
        rec = {"path": p, "ext": os.path.splitext(p)[1].lower()}
        try:
            st = os.stat(p)
            rec["size"] = st.st_size
            rec["mtime"] = datetime.fromtimestamp(st.st_mtime, tz=timezone.utc).isoformat()
            rec["sha256"] = sha256_of(p)
            rec["status"] = "OK"
        except OSError as e:
            rec["status"] = "READ_ERROR"
            rec["error"] = str(e)
        records.append(rec)
        if rec["status"] == "OK":
            by_hash.setdefault(rec["sha256"], []).append(p)
        if (i + 1) % 50 == 0:
            print(f"  hashed {i+1}/{len(paths)} ({time.time()-t0:.0f}s)", flush=True)

    dup_groups = {h: ps for h, ps in by_hash.items() if len(ps) > 1}
    canon = set()
    aliases = {}
    for h, ps in dup_groups.items():
        ps_sorted = sorted(ps)
        canon.add(ps_sorted[0])
        for a in ps_sorted[1:]:
            aliases[a] = ps_sorted[0]

    out = {
        "built_utc": datetime.now(timezone.utc).isoformat(),
        "listed_paths": len(paths),
        "ok": sum(1 for r in records if r["status"] == "OK"),
        "read_errors": [r["path"] for r in records if r["status"] != "OK"],
        "unique_content_hashes": len(by_hash),
        "duplicate_groups": len(dup_groups),
        "alias_to_canonical": aliases,
        "records": records,
    }
    dest = os.path.join(SCRATCH, "manifest_2026_11_03.json")
    with open(dest, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1)
    total = sum(r.get("size", 0) for r in records)
    print(f"DONE in {time.time()-t0:.0f}s: {out['ok']} OK, {len(out['read_errors'])} errors, "
          f"{out['unique_content_hashes']} unique contents, {len(dup_groups)} dup groups, "
          f"{total/1e9:.2f} GB -> {dest}", flush=True)

if __name__ == "__main__":
    main()
