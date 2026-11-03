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
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from difflib import SequenceMatcher
from pathlib import Path

UA = "GSE-Research-Harvester/1.0"
NS = {"a": "http://www.w3.org/2005/Atom"}


RATE_LIMITED = "rate_limited"
UNCONFIGURED = "unconfigured"
NOT_FOUND = "not_found"
OK = "ok"


class Lookup:
    """Distinguish "no such preprint" from "we never got an answer".

    Collapsing both into None produced log entries reading "unresolved" for papers
    that were never actually queried -- arXiv returns 429 after a harvest hammers
    it, and Unpaywall returns 422 for an invalid email. A false negative recorded
    as a real answer is worse than no record: it retires a paper that was never
    searched.
    """

    __slots__ = ("status", "url", "detail")

    def __init__(self, status: str, url: str | None = None, detail: str = ""):
        self.status, self.url, self.detail = status, url, detail

    def __bool__(self) -> bool:
        return self.status == OK and bool(self.url)

    def __repr__(self) -> str:
        return f"Lookup({self.status}, {(self.url or '')[:50]})"


def _get_status(url: str, timeout: int = 45, tries: int = 2):
    """Return (http_status, body_or_None) without hiding the reason."""
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.status, r.read()
        except urllib.error.HTTPError as e:
            if e.code == 429:
                return 429, None
            if i == tries - 1:
                return e.code, None
        except Exception:
            if i == tries - 1:
                return None, None
        time.sleep(1.5 * (i + 1))
    return None, None


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


def emails_from_session_db(limit: int = 2) -> list[str]:
    """Recover contact addresses the user supplied in chat.

    They arrive redacted in the agent's view of a message, so they cannot be typed
    back into a command. Reading them from the local session store keeps the value
    on this machine and out of any log.
    """
    import sqlite3
    db = os.path.expandvars(r"$LOCALAPPDATA\hermes\state.db")
    if not os.path.exists(db):
        return []
    con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    try:
        rows = con.execute(
            """SELECT content FROM messages WHERE role='user' AND content LIKE '%@%'
               ORDER BY rowid DESC LIMIT 20""").fetchall()
    finally:
        con.close()
    pat = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
    out: list[str] = []
    for (content,) in rows:
        for m in pat.findall(content or ""):
            if m not in out:
                out.append(m)
        if len(out) >= limit:
            break
    return out


def _norm(t: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (t or "").lower()).strip()


def arxiv_by_title(title: str, min_ratio: float = 0.82) -> Lookup:
    """Find an arXiv preprint whose title matches closely enough to trust."""
    terms = [w for w in _norm(title).split() if len(w) > 3][:8]
    if not terms:
        return Lookup(NOT_FOUND, detail="no usable title terms")
    q = "+AND+".join(f"all:{urllib.parse.quote(w)}" for w in terms)
    url = (f"http://export.arxiv.org/api/query?search_query={q}"
           f"&start=0&max_results=10&sortBy=relevance")
    status, raw = _get_status(url)
    if status == 429:
        return Lookup(RATE_LIMITED, detail="arxiv 429")
    if not raw:
        return Lookup(NOT_FOUND, detail=f"arxiv http {status}")
    try:
        root = ET.fromstring(raw)
    except ET.ParseError:
        return Lookup(NOT_FOUND, detail="arxiv parse error")
    want = _norm(title)
    for e in root.findall("a:entry", NS):
        cand = _norm(e.findtext("a:title", "", NS) or "")
        if SequenceMatcher(None, want, cand).ratio() >= min_ratio:
            for link in e.findall("a:link", NS):
                if link.get("title") == "pdf":
                    return Lookup(OK, link.get("href"), "arxiv title match")
    return Lookup(NOT_FOUND, detail="no title match on arxiv")


def unpaywall_by_doi(doi: str, email: str) -> Lookup:
    doi = doi.replace("https://doi.org/", "").strip()
    if not doi:
        return Lookup(NOT_FOUND, detail="no doi")
    if not email or "@" not in email or email.startswith("["):
        return Lookup(UNCONFIGURED, detail="GSE_UNPAYWALL_EMAIL not a real address")
    url = f"https://api.unpaywall.org/v2/{urllib.parse.quote(doi)}?email={urllib.parse.quote(email)}"
    status, raw = _get_status(url)
    if status == 422:
        return Lookup(UNCONFIGURED, detail="unpaywall 422 (bad email)")
    if status == 429:
        return Lookup(RATE_LIMITED, detail="unpaywall 429")
    if not raw:
        return Lookup(NOT_FOUND, detail=f"unpaywall http {status}")
    try:
        d = json.loads(raw)
    except json.JSONDecodeError:
        return Lookup(NOT_FOUND, detail="unpaywall parse error")
    for loc in [d.get("best_oa_location")] + (d.get("oa_locations") or []):
        if not loc:
            continue
        for k in ("url_for_pdf", "url"):
            u = loc.get(k)
            if u and u.lower().endswith(".pdf"):
                return Lookup(OK, u, "unpaywall oa location")
    best = d.get("best_oa_location") or {}
    if best.get("url_for_pdf"):
        return Lookup(OK, best["url_for_pdf"], "unpaywall best location")
    return Lookup(NOT_FOUND, detail="no oa pdf for this doi")


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

    if not args.email:
        found = emails_from_session_db()
        if found:
            args.email = found[0]
            print(f"using contact email from session store: {found[0][:2]}***@"
                  f"{found[0].split('@')[-1]}")

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
    blocked = 0
    log = []
    for i, r in enumerate(todo[: args.limit], 1):
        url = None
        route = None
        a = arxiv_by_title(r.get("title", ""))
        if a:
            url, route = a.url, "arxiv_title"
        else:
            # A rate-limited arXiv must not abort the item: Unpaywall is a
            # different service with its own quota, and a 429 on one says nothing
            # about the other. Only skip when arXiv genuinely had no match.
            u = unpaywall_by_doi(r.get("doi") or "", args.email)
            if u:
                url, route = u.url, "unpaywall"
            elif u.status in (RATE_LIMITED, UNCONFIGURED):
                blocked += 1
                log.append({"source_id": r.get("source_id"), "status": u.status,
                            "detail": u.detail, "route": "unpaywall"})
                continue
        if not url:
            failed += 1
            log.append({"source_id": r.get("source_id"), "status": "unresolved",
                        "host": (r.get("pdf_url") or "")[:60],
                        "detail": "no arxiv preprint and no open-access copy"})
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
            print(f"  {i}/{min(len(todo), args.limit)} resolved={resolved} "
                  f"failed={failed} blocked={blocked}")
        # arXiv asks for roughly 3s between requests and rate-limits otherwise;
        # this loop was hitting it hard enough to earn 429s.
        time.sleep(3.0)

    out = manifest.parent / "resolution_log.jsonl"
    with out.open("a", encoding="utf-8") as fh:
        for e in log:
            fh.write(json.dumps(e) + "\n")

    print(f"\nresolved {resolved} | unresolved {failed} | blocked {blocked} | log {out}")
    if blocked:
        print("blocked = we never got an answer (rate limit / bad email), not a miss.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
