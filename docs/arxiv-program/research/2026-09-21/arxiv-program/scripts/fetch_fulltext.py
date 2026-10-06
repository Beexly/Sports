#!/usr/bin/env python3
"""Fetch full texts for the arXiv 500-paper program from the VM.

Reads ~/workspace/arxiv-sweep/fetch-queue.jsonl (fields: id, ar5iv, pdf).
For each entry: GET the ar5iv HTML page, save to ~/workspace/arxiv-sweep/fulltext/<safe-id>.html.
Failures recorded to ~/workspace/arxiv-sweep/fetch-failures.jsonl for a later PDF fallback.
Polite: ~1 request/second, descriptive UA. Resumable: skips already-cached files.
"""
import json, os, re, sys, time, urllib.request

SWEEP = os.path.expanduser("~/workspace/arxiv-sweep")
QUEUE = os.path.join(SWEEP, "fetch-queue.jsonl")
OUTDIR = os.path.join(SWEEP, "fulltext")
FAIL = os.path.join(SWEEP, "fetch-failures.jsonl")
UA = "GSE-arxiv-research/1.0 (academic full-text fetch; contact: research)"

os.makedirs(OUTDIR, exist_ok=True)

def safe_id(pid: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]", "_", pid)

def fetch(url: str) -> tuple[int, bytes]:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.status, r.read()

entries = [json.loads(l) for l in open(QUEUE) if l.strip()]
done, failed, skipped = 0, 0, 0
for i, e in enumerate(entries):
    pid, url = e["id"], e["ar5iv"]
    path = os.path.join(OUTDIR, safe_id(pid) + ".html")
    if os.path.exists(path) and os.path.getsize(path) > 5000:
        skipped += 1
        continue
    try:
        status, body = fetch(url)
        if status == 200 and len(body) > 5000:
            open(path, "wb").write(body)
            done += 1
        else:
            raise RuntimeError(f"status={status} size={len(body)}")
    except Exception as ex:
        failed += 1
        with open(FAIL, "a") as f:
            f.write(json.dumps({"id": pid, "url": url, "pdf": e.get("pdf"), "error": str(ex)}) + "\n")
    if i % 25 == 0:
        print(f"[{i}/{len(entries)}] done={done} skipped={skipped} failed={failed}", flush=True)
    time.sleep(1.0)

print(f"COMPLETE: fetched={done} skipped={skipped} failed={failed} of {len(entries)}")
