#!/usr/bin/env python3
"""Bulk PDF fetch for the GSE arXiv 500-paper program (ar5iv is unreachable from this VM).

Reads ~/workspace/arxiv-sweep/fetch-queue2.jsonl (fields: id, pdf).
For each entry: download PDF from arxiv.org, extract text via pdftotext -layout,
save to ~/workspace/arxiv-sweep/fulltext/<safe-id>.txt.
Failures (after one retry) recorded to fetch-pdf-failures.jsonl.
Polite: 4 concurrent workers, descriptive UA. Resumable: skips already-cached files > 5000 bytes.
"""
import json, os, re, subprocess, tempfile, threading, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

SWEEP = os.path.expanduser("~/workspace/arxiv-sweep")
QUEUE = os.path.join(SWEEP, "fetch-queue2.jsonl")
OUTDIR = os.path.join(SWEEP, "fulltext")
FAIL = os.path.join(SWEEP, "fetch-pdf-failures.jsonl")
UA = "GSE-arxiv-research/1.0 (academic full-text fetch; contact: research)"
WORKERS = 4

os.makedirs(OUTDIR, exist_ok=True)
lock = threading.Lock()
done = failed = skipped = 0

def safe_id(pid: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]", "_", pid)

def download(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=90) as r:
        if r.status != 200:
            raise RuntimeError(f"HTTP {r.status}")
        return r.read()

def pdftotext_bytes(pdf: bytes) -> str:
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
        f.write(pdf)
        tmp = f.name
    try:
        out = subprocess.run(["pdftotext", "-layout", tmp, "-"],
                             capture_output=True, timeout=120)
        if out.returncode != 0:
            raise RuntimeError(f"pdftotext rc={out.returncode}")
        return out.stdout.decode("utf-8", errors="replace")
    finally:
        os.unlink(tmp)

def process(e):
    global done, failed, skipped
    pid, pdf = e["id"], e["pdf"]
    path = os.path.join(OUTDIR, safe_id(pid) + ".txt")
    if os.path.exists(path) and os.path.getsize(path) > 5000:
        with lock: skipped += 1
        return
    err = None
    for attempt in (1, 2):
        try:
            body = download(pdf)
            if len(body) < 20000:
                raise RuntimeError(f"PDF too small ({len(body)} bytes)")
            text = pdftotext_bytes(body)
            if len(text) < 5000:
                raise RuntimeError(f"extracted text too short ({len(text)} chars)")
            with open(path, "w", encoding="utf-8") as f:
                f.write(text)
            with lock: done += 1
            return
        except Exception as ex:
            err = str(ex)
            time.sleep(2)
    with lock:
        failed += 1
        with open(FAIL, "a") as f:
            f.write(json.dumps({"id": pid, "pdf": pdf, "error": err}) + "\n")

def main():
    entries = [json.loads(l) for l in open(QUEUE) if l.strip()]
    print(f"queue={len(entries)} workers={WORKERS}", flush=True)
    start = time.time()
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        for i, e in enumerate(entries):
            ex.submit(process, e)
            if i % 50 == 0 and i:
                with lock:
                    print(f"[{i}/{len(entries)}] done={done} skipped={skipped} failed={failed} "
                          f"elapsed={time.time()-start:.0f}s", flush=True)
    print(f"COMPLETE: done={done} skipped={skipped} failed={failed} of {len(entries)} "
          f"elapsed={time.time()-start:.0f}s", flush=True)

main()
