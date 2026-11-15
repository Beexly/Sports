#!/usr/bin/env python3
"""Extend the equation catalog to the full PDF corpus.

Equations are only taken from arXiv e-print LaTeX source. The existing pipeline
records reconstructing math from PDF text as a verified corruption path, and
that rule holds here: a paper with no e-print source is reported as pdf_only,
never guessed at.

Pipeline, resumable at every stage:
  1. Build a catalog from extraction.jsonl (path, sha256, title).
  2. Match each title to an arXiv ID via the API, 1 request / 3s.
     - clear winner  -> matches file
     - close call    -> review file (never auto-accepted)
     - no match      -> pdf_only file
  3. Download the e-print for each match and extract display + inline math.

Usage:
    python3 extend_equation_catalog.py catalog
    python3 extend_equation_catalog.py match
    python3 extend_equation_catalog.py extract
    python3 extend_equation_catalog.py status
"""
from __future__ import annotations

import difflib
import gzip
import io
import json
import os
import re
import sys
import tarfile
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

WORK = Path(r"C:/Users/Garrett/AppData/Local/hermes/cache/scratch/equations")
WORK.mkdir(parents=True, exist_ok=True)

CATALOG = WORK / "catalog.jsonl"
MATCHES = WORK / "matches.jsonl"
REVIEW = WORK / "review.jsonl"
PDF_ONLY = WORK / "pdf_only.jsonl"
EQS = WORK / "equations.jsonl"
NOTES = WORK / "notes.jsonl"
MATCH_DONE = WORK / "matched_paths.txt"
EXTRACT_DONE = WORK / "extracted_ids.txt"
CACHE = WORK / "eprint_cache"
EXTRACTION_SRC = Path(r"C:/Users/Garrett/AppData/Local/hermes/cache/scratch/extract/extraction.jsonl")

API = "https://export.arxiv.org/api/query"
NS = {"a": "http://www.w3.org/2005/Atom"}
SLEEP = 3.0
ACCEPT = 0.82
REVIEW_FLOOR = 0.60

DISPLAY_ENVS = [
    "equation", "equation*", "align", "align*", "gather", "gather*",
    "multline", "multline*", "eqnarray", "eqnarray*", "displaymath",
    "alignat", "alignat*", "flalign", "flalign*", "split", "cases",
]


def norm(s: str) -> str:
    s = (s or "").lower()
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def sq(v: str) -> str:
    return (v or "").replace("'", "''")


def cmd_catalog() -> int:
    seen = set()
    if CATALOG.exists():
        for line in CATALOG.open(encoding="utf-8"):
            try:
                seen.add(json.loads(line)["path"])
            except Exception:  # noqa: BLE001
                pass
    out = CATALOG.open("a", encoding="utf-8")
    added = 0
    for line in EXTRACTION_SRC.open(encoding="utf-8"):
        line = line.strip()
        if not line:
            continue
        try:
            rec = json.loads(line)
        except Exception:  # noqa: BLE001
            continue
        if rec.get("error"):
            continue
        p = rec.get("path")
        if not p or p in seen:
            continue
        title = (rec.get("title") or "").strip()
        # A PDF's metadata title is often the authoring file name (mitPaper.dvi,
        # untitled.tex) or a banner. Prefer the file name when the metadata is
        # short, has no spaces, or ends in a source-file extension.
        bad = (
            not title
            or len(title) < 12
            or " " not in title
            or re.search(r"\.(dvi|tex|docx?|pdf|indd|qxd)$", title, re.I)
            or title.lower() in {"untitled", "microsoft word", "document1"}
        )
        if bad:
            stem = os.path.basename(p).rsplit(".", 1)[0]
            stem = re.sub(r"^openalex_W\d+$", "", stem)
            stem = re.sub(r"[_]+", " ", stem)
            stem = re.sub(r"\s+", " ", stem).strip(" -")
            if len(stem) >= 8:
                title = stem
        out.write(
            json.dumps(
                {
                    "path": p,
                    "sha256": rec.get("sha256") or "",
                    "title": title,
                    "pages": rec.get("pages") or 0,
                    "chars": rec.get("chars") or 0,
                },
                ensure_ascii=False,
            )
            + "\n"
        )
        seen.add(p)
        added += 1
    out.close()
    print(f"catalog: added {added}, total {len(seen)}")
    return 0


def arxiv_lookup(title: str) -> tuple[str, float, str]:
    """Return (arxiv_id, score, matched_title). Empty id means no candidate."""
    q = urllib.parse.quote(f'ti:"{title[:180]}"')
    url = f"{API}?search_query={q}&start=0&max_results=3"
    req = urllib.request.Request(url, headers={"User-Agent": "gse-corpus/1.0"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=45) as resp:
                body = resp.read()
            break
        except Exception:  # noqa: BLE001
            if attempt == 2:
                return "", 0.0, ""
            time.sleep(5 * (attempt + 1))
    root = ET.fromstring(body)
    best_id, best_score, best_title = "", 0.0, ""
    target = norm(title)
    for entry in root.findall("a:entry", NS):
        t = entry.findtext("a:title", default="", namespaces=NS) or ""
        idurl = entry.findtext("a:id", default="", namespaces=NS) or ""
        m = re.search(r"abs/([^/]+)$", idurl)
        if not m:
            continue
        aid = m.group(1)
        score = difflib.SequenceMatcher(None, target, norm(t)).ratio()
        if score > best_score:
            best_id, best_score, best_title = aid, score, t.strip()
    return best_id, best_score, best_title


def cmd_match(limit: int = 0) -> int:
    done = set()
    if MATCH_DONE.exists():
        done = set(MATCH_DONE.read_text(encoding="utf-8").splitlines())
    rows = []
    for line in CATALOG.open(encoding="utf-8"):
        try:
            r = json.loads(line)
        except Exception:  # noqa: BLE001
            continue
        if r["path"] not in done:
            rows.append(r)
    if limit:
        rows = rows[:limit]
    print(f"to match: {len(rows)}")

    with MATCHES.open("a", encoding="utf-8") as mf, REVIEW.open("a", encoding="utf-8") as rf, \
         PDF_ONLY.open("a", encoding="utf-8") as pf, MATCH_DONE.open("a", encoding="utf-8") as df:
        for i, r in enumerate(rows, 1):
            aid, score, mtitle = arxiv_lookup(r["title"])
            rec = {
                "path": r["path"],
                "sha256": r["sha256"],
                "pdf_title": r["title"],
                "arxiv_id": aid,
                "arxiv_title": mtitle,
                "score": round(score, 4),
            }
            if aid and score >= ACCEPT:
                mf.write(json.dumps(rec, ensure_ascii=False) + "\n")
            elif aid and score >= REVIEW_FLOOR:
                rf.write(json.dumps(rec, ensure_ascii=False) + "\n")
            else:
                pf.write(json.dumps({"path": r["path"], "sha256": r["sha256"], "title": r["title"]},
                                    ensure_ascii=False) + "\n")
            df.write(r["path"] + "\n")
            if i % 25 == 0:
                mf.flush(); rf.flush(); pf.flush(); df.flush()
                print(f"  matched {i}/{len(rows)}", flush=True)
            time.sleep(SLEEP)
    print("match pass complete")
    return 0


def strip_comments(tex: str) -> str:
    return re.sub(r"(?<!\\)%.*", "", tex)


def extract_from_tex(tex: str) -> list[tuple[str, str]]:
    tex = strip_comments(tex)
    out: list[tuple[str, str]] = []
    for env in DISPLAY_ENVS:
        pat = re.compile(r"\\begin\{" + re.escape(env) + r"\}(.*?)\\end\{" + re.escape(env) + r"\}", re.S)
        for m in pat.finditer(tex):
            body = m.group(1).strip()
            if body:
                out.append((body, "display"))
    for m in re.finditer(r"\\\[(.*?)\\\]", tex, re.S):
        body = m.group(1).strip()
        if body:
            out.append((body, "display"))
    for m in re.finditer(r"\$\$(.*?)\$\$", tex, re.S):
        body = m.group(1).strip()
        if body:
            out.append((body, "display"))
    for m in re.finditer(r"(?<!\$)\$([^$\n]{3,300})\$(?!\$)", tex):
        body = m.group(1).strip()
        if body:
            out.append((body, "inline"))
    return out


def fetch_eprint(aid: str) -> bytes | None:
    CACHE.mkdir(exist_ok=True)
    safe = aid.replace("/", "_")
    cache_file = CACHE / f"{safe}.tar.gz"
    if cache_file.exists() and cache_file.stat().st_size > 0:
        return cache_file.read_bytes()
    url = f"https://export.arxiv.org/e-print/{aid}"
    req = urllib.request.Request(url, headers={"User-Agent": "gse-corpus/1.0"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = resp.read()
            cache_file.write_bytes(data)
            return data
        except Exception:  # noqa: BLE001
            time.sleep(5 * (attempt + 1))
    return None


def read_tex_from_eprint(data: bytes) -> str:
    if data[:2] == b"\x1f\x8b":
        try:
            data = gzip.decompress(data)
        except Exception:  # noqa: BLE001
            return ""
    texts = []
    try:
        with tarfile.open(fileobj=io.BytesIO(data)) as tf:
            for member in tf.getmembers():
                if member.name.lower().endswith((".tex", ".bbl", ".ltx")):
                    fh = tf.extractfile(member)
                    if fh:
                        texts.append(fh.read().decode("utf-8", errors="replace"))
    except tarfile.TarError:
        texts.append(data.decode("utf-8", errors="replace"))
    return "\n".join(texts)


def cmd_extract(limit: int = 0) -> int:
    done = set()
    if EXTRACT_DONE.exists():
        done = set(EXTRACT_DONE.read_text(encoding="utf-8").splitlines())
    rows = []
    seen_ids = set()
    for line in MATCHES.open(encoding="utf-8"):
        try:
            r = json.loads(line)
        except Exception:  # noqa: BLE001
            continue
        aid = r.get("arxiv_id")
        if not aid or r["path"] in done or aid in seen_ids:
            continue
        seen_ids.add(aid)
        rows.append(r)
    if limit:
        rows = rows[:limit]
    print(f"to extract: {len(rows)} e-prints")

    n_eq = 0
    with EQS.open("a", encoding="utf-8") as ef, NOTES.open("a", encoding="utf-8") as nf, \
         EXTRACT_DONE.open("a", encoding="utf-8") as df:
        for i, r in enumerate(rows, 1):
            data = fetch_eprint(r["arxiv_id"])
            if data is None:
                nf.write(json.dumps({"arxiv_id": r["arxiv_id"], "note": "fetch_failed"}, ensure_ascii=False) + "\n")
            else:
                tex = read_tex_from_eprint(data)
                eqs = extract_from_tex(tex) if tex else []
                if not eqs:
                    nf.write(json.dumps({"arxiv_id": r["arxiv_id"], "note": "no_math_in_source"},
                                        ensure_ascii=False) + "\n")
                for body, kind in eqs:
                    ef.write(
                        json.dumps(
                            {
                                "arxiv_id": r["arxiv_id"],
                                "paper_title": r.get("arxiv_title") or r.get("pdf_title") or "",
                                "file_path": r["path"],
                                "sha256": r.get("sha256") or "",
                                "equation": body,
                                "kind": kind,
                            },
                            ensure_ascii=False,
                        )
                        + "\n"
                    )
                    n_eq += 1
            df.write(r["path"] + "\n")
            if i % 20 == 0:
                ef.flush(); nf.flush(); df.flush()
                print(f"  {i}/{len(rows)} papers, {n_eq:,} equations", flush=True)
            time.sleep(1.0)
    print(f"extract pass complete: {n_eq:,} equations")
    return 0


def cmd_status() -> int:
    def count(p: Path) -> int:
        return sum(1 for _ in p.open(encoding="utf-8")) if p.exists() else 0

    print("catalog   ", count(CATALOG))
    print("matches   ", count(MATCHES))
    print("review    ", count(REVIEW))
    print("pdf_only  ", count(PDF_ONLY))
    print("equations ", count(EQS))
    print("notes     ", count(NOTES))
    return 0


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    action = sys.argv[1]
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    if action == "catalog":
        return cmd_catalog()
    if action == "match":
        return cmd_match(limit)
    if action == "extract":
        return cmd_extract(limit)
    if action == "status":
        return cmd_status()
    print(f"unknown action {action}")
    return 2


if __name__ == "__main__":
    sys.exit(main())
