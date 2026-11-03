"""Queryable index over the harvested research corpus.

A downloaded PDF nobody can search is storage, not knowledge. This module turns
the harvest manifest into something the reasoning engine can ask questions of:

    build_index(manifest)          -> normalised records + inverted term index
    search(index, "coverage disguise") -> ranked passages with provenance
    to_mind_feed(index, ...)       -> JSONL entries with gate_status wired false

Ranking is BM25 over title + abstract. Titles and abstracts are short and
domain-specific, so keyword scoring is competitive with embeddings here and
needs no model weights, no network, and no GPU -- and it is auditable: you can
see exactly why a paper ranked.

Deliberate limit: this indexes *metadata*. It does not read PDF text. Full-text
search is a separate, later step (cheap to add: pymupdf to extract, reuse the
same BM25). Claiming otherwise would be the kind of overstatement that makes a
knowledge base untrustworthy.
"""

from __future__ import annotations

import json
import math
import re
from pathlib import Path
from typing import Any, Iterable

STOP = set("""a an and are as at be by for from has have in is it its of on or that
the their this to was were will with which we our using used we're not can may
also such these those there where when what how than then them they you your""".split())

TOKEN = re.compile(r"[a-z0-9]+")


def tokenize(text: str) -> list[str]:
    return [t for t in TOKEN.findall((text or "").lower())
            if len(t) > 2 and t not in STOP]


def build_index(manifest: Path | str) -> dict[str, Any]:
    """Read a manifest JSONL and build records plus an inverted index."""
    import hashlib

    manifest = Path(manifest)
    records: list[dict] = []
    postings: dict[str, set[int]] = {}
    dfs: dict[str, int] = {}

    for line in manifest.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            r = json.loads(line)
        except json.JSONDecodeError:
            continue
        rid = r.get("source_id") or hashlib.sha1(line.encode()).hexdigest()[:16]
        # Full text when the PDF was ingested; title+abstract otherwise. Metadata-only
        # records still rank, they simply carry less signal.
        text = f"{r.get('title','')} {r.get('abstract','')} {r.get('full_text','')}"
        toks = tokenize(text)
        rec = {
            "id": rid,
            "source": r.get("source"),
            "title": r.get("title", ""),
            "year": r.get("year"),
            "authors": r.get("authors", []),
            "venue": r.get("venue"),
            "doi": r.get("doi"),
            "url": r.get("url"),
            "pdf_url": r.get("pdf_url"),
            "abstract": r.get("abstract", ""),
            "topics": r.get("topics", []),
            "cited_by": r.get("cited_by"),
            "retracted": bool(r.get("retracted")),
            "has_full_text": bool(r.get("full_text")),
            "len": len(toks),
            "terms": {},
        }
        for t in toks:
            rec["terms"][t] = rec["terms"].get(t, 0) + 1
        for t in set(toks):
            postings.setdefault(t, set()).add(len(records))
            dfs[t] = dfs.get(t, 0) + 1
        records.append(rec)

    return {"records": records, "postings": postings, "df": dfs,
            "n": len(records), "avgdl": (sum(r["len"] for r in records) / len(records))
            if records else 0.0}


SOURCE_PRIORITY = {"local_pdf": 0, "arxiv": 1, "openalex": 2}


def _title_key(title: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (title or "").lower())[:90]


def dedupe(index: dict) -> dict:
    """Collapse the same paper arriving from several sources.

    OpenAlex and arXiv both index the same work, and a locally ingested PDF is the
    same paper again. Left alone, one strong result fills the whole top-10 and the
    corpus triple-counts itself. Preference: local PDF (has full text) > arXiv
    (has the preprint) > OpenAlex (metadata only). Topics are merged so no query
    lineage is lost.
    """
    keep: dict[str, int] = {}
    order: list[int] = []
    for i, rec in enumerate(index["records"]):
        key = _title_key(rec["title"])
        if not key:
            order.append(i)
            continue
        if key in keep:
            j = keep[key]
            better_new = SOURCE_PRIORITY.get(rec["source"], 9) < SOURCE_PRIORITY.get(
                index["records"][j]["source"], 9)
            if better_new:
                merged = sorted(set(index["records"][j]["topics"]) | set(rec["topics"]))
                index["records"][j] = rec
                index["records"][j]["topics"] = merged
            else:
                merged = sorted(set(index["records"][j]["topics"]) | set(rec["topics"]))
                index["records"][j]["topics"] = merged
        else:
            keep[key] = i
            order.append(i)

    # Rebuild postings against the surviving record set.
    records = [index["records"][i] for i in order]
    postings: dict[str, set[int]] = {}
    df: dict[str, int] = {}
    for new_i, rec in enumerate(records):
        for t in rec["terms"]:
            postings.setdefault(t, set()).add(new_i)
            df[t] = df.get(t, 0) + 1
    return {"records": records, "postings": postings, "df": df,
            "n": len(records),
            "avgdl": (sum(r["len"] for r in records) / len(records)) if records else 0.0}


def search(index: dict, query: str, k: int = 8, k1: float = 1.5,
           b: float = 0.75, include_retracted: bool = False) -> list[dict]:
    """BM25 ranking over title+abstract. Returns records with score and hits."""
    q = tokenize(query)
    if not q or not index["records"]:
        return []
    scores: dict[int, float] = {}
    for term in q:
        docs = index["postings"].get(term)
        if not docs:
            continue
        idf = math.log(1 + (index["n"] - index["df"][term] + 0.5) /
                       (index["df"][term] + 0.5))
        for d in docs:
            rec = index["records"][d]
            tf = rec["terms"].get(term, 0)
            dl = rec["len"] or 1
            denom = tf + k1 * (1 - b + b * dl / (index["avgdl"] or 1))
            scores[d] = scores.get(d, 0.0) + idf * tf * (k1 + 1) / denom

    if not include_retracted:
        # A retracted paper reads exactly like a valid one. If it is indexed at
        # all it must never rank by default, or the corpus launders it.
        scores = {d: s for d, s in scores.items()
                  if not index["records"][d].get("retracted")}
    ranked = sorted(scores.items(), key=lambda kv: -kv[1])[:k]
    out = []
    for d, s in ranked:
        rec = dict(index["records"][d])
        rec.pop("terms", None)
        rec["score"] = round(s, 4)
        rec["matched_terms"] = [t for t in q if t in index["records"][d]["terms"]]
        out.append(rec)
    return out


def to_mind_feed(index: dict, out_path: Path | str, topics: Iterable[str] | None = None,
                 max_records: int | None = None) -> int:
    """Emit corpus records as mind-feed entries with explicit gate state.

    wired=false and gate_status=UNVALIDATED are not decoration: nothing in this
    corpus has been run against GSE data, so nothing here may influence a pick.
    """
    topic_filter = set(topics) if topics else None
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    n = 0
    with out_path.open("a", encoding="utf-8") as fh:
        for rec in index["records"]:
            if topic_filter and not (set(rec["topics"]) & topic_filter):
                continue
            if max_records and n >= max_records:
                break
            entry = {
                "kind": "research_paper",
                "source": rec["source"],
                "source_id": rec["id"],
                "title": rec["title"],
                "year": rec["year"],
                "authors": rec["authors"],
                "doi": rec["doi"],
                "pdf_url": rec["pdf_url"],
                "abstract": rec["abstract"][:1200],
                "topics": rec["topics"],
                "provenance_status": "DIRECT_FROM_SOURCE",
                "gate_status": "UNVALIDATED",
                "wired": False,
                "note": "indexed for retrieval; not validated against GSE data",
            }
            fh.write(json.dumps(entry, ensure_ascii=False) + "\n")
            n += 1
    return n
