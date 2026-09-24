#!/usr/bin/env python3
"""Hybrid full-text fetch for the GSE arXiv 500-paper program.

For each entry in fetch-queue2.jsonl:
  1. Try ar5iv HTML (fast, ~40-700KB). Keep if extracted body text > 8000 chars.
  2. Else download PDF from arxiv.org and extract with pdftotext -layout.
Saves to ~/workspace/arxiv-sweep/fulltext/<safe-id>.txt.
Skips already-cached files > 5000 bytes. Failures -> fetch-hybrid-failures.jsonl.
4 workers, descriptive UA.
"""
import json, os, re, subprocess, tempfile, threading, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
from bs4 import BeautifulSoup

SWEEP = os.path.expanduser("~/workspace/arxiv-sweep")
QUEUE = os.path.join(SWEEP, "fetch-queue2.jsonl")
OUTDIR = os.path.join(SWEEP, "fulltext")
FAIL = os.path.join(SWEEP, "fetch-hybrid-failures.jsonl")
UA = "GSE-arxiv-research/1.0 (academic full-text fetch; contact: research)"
WORKERS = 4
HTML_MIN = 8000

os.makedirs(OUTDIR, exist_ok=True)
lock = threading.Lock()
stat = {"html": 0, "pdf": 0, "skip": 0, "fail": 0}

def safe_id(pid: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]", "_", pid)

def get(url: str, timeout: int) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        if r.status != 200:
            raise RuntimeError(f"HTTP {r.status}")
        return r.read()

def html_text(body: bytes) -> str:
    soup = BeautifulSoup(body, "lxml")
    for tag in soup(["script", "style", "nav", "header", "footer", "aside"]):
        tag.decompose()
    node = soup.find(id="content-inner") or soup.find(id="content") or soup.body
    if node is None:
        return ""
    return node.get_text(separator="\n", strip=True)

def pdf_text(url: str) -> str:
    body = get(url, 90)
    if len(body) < 20000:
        raise RuntimeError(f"PDF too small ({len(body)} bytes)")
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
        f.write(body)
        tmp = f.name
    try:
        out = subprocess.run(["pdftotext", "-layout", tmp, "-"],
                             capture_output=True, timeout=180)
        if out.returncode != 0:
            raise RuntimeError(f"pdftotext rc={out.returncode}")
        return out.stdout.decode("utf-8", errors="replace")
    finally:
        os.unlink(tmp)

def process(e):
    pid = e["id"]
    path = os.path.join(OUTDIR, safe_id(pid) + ".txt")
    if os.path.exists(path) and os.path.getsize(path) > 5000:
        with lock: stat["skip"] += 1
        return
    err = None
    # 1) ar5iv HTML
    try:
        body = get(f"https://ar5iv.org/html/{pid}", 45)
        text = html_text(body)
        if len(text) > HTML_MIN:
            with open(path, "w", encoding="utf-8") as f: f.write(text)
            with lock: stat["html"] += 1
            return
        err = f"ar5iv text too short ({len(text)} chars)"
    except Exception as ex:
        err = f"ar5iv: {ex}"
    # 2) PDF fallback
    for attempt in (1, 2):
        try:
            text = pdf_text(e["pdf"])
            if len(text) < 5000:
                raise RuntimeError(f"PDF text too short ({len(text)} chars)")
            with open(path, "w", encoding="utf-8") as f: f.write(text)
            with lock: stat["pdf"] += 1
            return
        except Exception as ex:
            err = f"{err} | pdf attempt{attempt}: {ex}"
            time.sleep(2)
    with lock:
        stat["fail"] += 1
        with open(FAIL, "a") as f:
            f.write(json.dumps({"id": pid, "pdf": e["pdf"], "error": err}) + "\n")

def main():
    entries = [json.loads(l) for l in open(QUEUE) if l.strip()]
    print(f"queue={len(entries)} workers={WORKERS}", flush=True)
    start = time.time()
    submitted = 0
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        futs = [ex.submit(process, e) for e in entries]
        for i, fu in enumerate(futs):
            fu.result()
            if (i + 1) % 50 == 0:
                with lock: s = dict(stat)
                print(f"[{i+1}/{len(entries)}] {s} elapsed={time.time()-start:.0f}s", flush=True)
    with lock: s = dict(stat)
    print(f"COMPLETE: {s} of {len(entries)} elapsed={time.time()-start:.0f}s", flush=True)

main()
