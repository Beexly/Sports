"""Close the PDF coverage gap left by publisher bot walls.

The first harvest recorded a pdf_url for 1,018 unique works but only produced 530
files. The failures were not random: 112 links went through doi.org, which
redirects to ScienceDirect, Nature, Springer and ACM - all of which return 403 to
a plain urllib client and always will. Retrying those URLs is a waste of time.

This resolver tries the routes that actually work for a machine:

  1. arXiv by title    most ML/sports-analytics papers have a preprint; the
                       publisher copy is the paywalled one
  2. Unpaywall         free API, keyed by DOI, returns every legal OA location
                       including repository copies that are not bot-walled
  3. Nothing           record the miss explicitly instead of silently omitting it

A work that still cannot be fetched is written with `pdf_status` = "unresolved"
and the host that blocked it, so the gap is visible and retryable rather than
invisible. That distinction matters: an absent file and an unknown file look
identical in a directory listing.

Unpaywall requires an email address in the query string; set GSE_UNPAYWALL_EMAIL
to a real one before relying on that route.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from difflib import SequenceMatcher
from pathlib import Path

UA = "GSE-Research-Harvester/1.0"
NS = {"a": "http://www.w3.org/2005/Atom"}


def _get(url: str, timeout: int = 45, tries: int = 2) -> bytes | None:
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except Exception:
            if i == tries - 1:
                return None
            time.sleep(1.0 + i)
    return None


def _norm(t: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (t or "").lower()).strip()


def arxiv_by_title(title: str, min_ratio: float = 0.82) -> str | None:
    """Find an arXiv preprint whose title matches closely enough to trust."""
    terms = [w for w in _norm(title).split() if len(w) > 3][:8]
    if not terms:
        return None
    q = "+AND+".join(f"all:{urllib.parse.quote(w)}" for w in terms)
    url = (f"http://export.arxiv.org/api/query?search_query={q}"
           f"&start=0&max_results=10&sortBy=relevance")
    raw = _get(url)
    if not raw:
        return None
    try:
        root = ET.fromstring(raw)
    except ET.ParseError:
        return None
    want = _norm(title)
    for e in root.findall("a:entry", NS):
        cand = _norm(e.findtext("a:title", "", NS) or "")
        if SequenceMatcher(None, want, cand).ratio() >= min_ratio:
            for link in e.findall("a:link", NS):
                if link.get("title") == "pdf":
                    return link.get("href")
    return None


def unpaywall_by_doi(doi: str, email: str) -> str | None:
    doi = doi.replace("https://doi.org/", "").strip()
    if not doi or not email:
        return None
    url = f"https://api.unpaywall.org/v2/{urllib.parse.quote(doi)}?email={urllib.parse.quote(email)}"
    raw = _get(url)
    if not raw:
        return None
    try:
        d = json.loads(raw)
    except json.JSONDecodeError:
        return None
    for loc in [d.get("best_oa_location")] + (d.get("oa_locations") or []):
        if not loc:
            continue
        for k in ("url_for_pdf", "url"):
            u = loc.get(k)
            if u and u.lower().endswith(".pdf"):
                return u
    best = d.get("best_oa_location") or {}
    return best.get("url_for_pdf")


def download(url: str, dest: Path) -> bool:
    raw = _get(url, timeout=90)
    if not raw or not raw.startswith(b"%PDF") or len(raw) < 20_000:
        return False
    dest.write_bytes(raw)
    return True


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--pdfdir", required=True)
    ap.add_argument("--limit", type=int, default=200)
    ap.add_argument("--email", default=os.environ.get("GSE_UNPAYWALL_EMAIL", ""))
    args = ap.parse_args(argv)

    manifest = Path(args.manifest)
    pdfdir = Path(args.pdfdir)
    pdfdir.mkdir(parents=True, exist_ok=True)

    recs = [json.loads(l) for l in manifest.read_text(encoding="utf-8").splitlines() if l.strip()]
    keyf = lambda t: re.sub(r"[^a-z0-9]+", "", (t or "").lower())[:90]

    # Anything already carrying a local pdf_path or full_text is done.
    have = {r.get("source_id") for r in recs if r.get("pdf_path") or r.get("full_text")}
    have_titles = {keyf(r.get("title")) for r in recs if r.get("pdf_path") or r.get("full_text")}

    todo = []
    seen = set()
    for r in recs:
        k = keyf(r.get("title"))
        if not k or k in seen or k in have_titles or r.get("retracted"):
            continue
        seen.add(k)
        if r.get("pdf_url") or r.get("doi"):
            todo.append(r)

    print(f"candidates lacking a local PDF: {len(todo)} (limit {args.limit})")
    if not args.email:
        print("! GSE_UNPAYWALL_EMAIL not set - Unpaywall route disabled")

    resolved = failed = 0
    log = []
    for i, r in enumerate(todo[: args.limit], 1):
        url = None
        route = None
        a = arxiv_by_title(r.get("title", ""))
        if a:
            url, route = a, "arxiv_title"
        elif r.get("doi") and args.email:
            u = unpaywall_by_doi(r["doi"], args.email)
            if u:
                url, route = u, "unpaywall"
        if not url:
            failed += 1
            log.append({"source_id": r.get("source_id"), "status": "unresolved",
                        "host": (r.get("pdf_url") or "")[:60], "route": None})
            continue

        dest = pdfdir / f"{re.sub(r'[^A-Za-z0-9._-]+', '_', str(r.get('source_id')))[:80]}.pdf"
        if download(url, dest):
            resolved += 1
            log.append({"source_id": r.get("source_id"), "status": "resolved",
                        "route": route, "pdf_path": str(dest), "pdf_url": url})
        else:
            failed += 1
            log.append({"source_id": r.get("source_id"), "status": "download_failed",
                        "route": route, "pdf_url": url})
        if i % 10 == 0:
            print(f"  {i}/{min(len(todo), args.limit)} resolved={resolved} failed={failed}")
        time.sleep(0.4)

    out = manifest.parent / "resolution_log.jsonl"
    with out.open("a", encoding="utf-8") as fh:
        for e in log:
            fh.write(json.dumps(e) + "\n")

    print(f"\nresolved {resolved} | failed {failed} | log {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
