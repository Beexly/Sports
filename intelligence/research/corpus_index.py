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
            "sport_domain": sport_domain_of(
                r.get("title", ""), r.get("abstract", ""), r.get("full_text", "")
            ),
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


# Lower wins. Anything carrying full text must outrank metadata-only records, or
# dedupe throws the text away and keeps the abstract. web_pdf was missing from this
# map, defaulted to lowest, and lost its full text to an OpenAlex stub.
SOURCE_PRIORITY = {"local_pdf": 0, "local_doc": 0, "web_pdf": 1, "arxiv": 2,
                   "openalex": 3}


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
            prev = index["records"][j]
            # Retraction is a property of the WORK, not of the copy. If any
            # duplicate is retracted, the survivor must stay quarantined -
            # otherwise dedupe launders a retracted paper by merging it with a
            # clean metadata record of the same title.
            was_retracted = bool(prev.get("retracted")) or bool(rec.get("retracted"))
            better_new = SOURCE_PRIORITY.get(rec["source"], 9) < SOURCE_PRIORITY.get(
                prev["source"], 9)
            # A record carrying full text beats a title-only stub of the same
            # work, whatever its source. Otherwise a high-priority metadata
            # record evicts the text and the corpus loses the content it just
            # spent a backfill run acquiring.
            if not better_new and not prev.get("has_full_text") and rec.get("has_full_text"):
                better_new = True
            merged = sorted(set(prev["topics"]) | set(rec["topics"]))
            if better_new:
                index["records"][j] = rec
            index["records"][j]["topics"] = merged
            index["records"][j]["retracted"] = was_retracted
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


# ---------------------------------------------------------------------------
# Sport-domain disambiguation
# ---------------------------------------------------------------------------
# The corpus spans two different sports that both call themselves "football".
# An ambiguous query ("pose estimation football") must not hand the top slot to
# soccer literature just because soccer papers say "football" more often. GSE
# is an American-football shop, so ambiguous queries default to gridiron and
# cross-domain documents are DEMOTED rather than dropped: a computer-vision
# paper that happens to be soccer-flavoured can still be the right mechanism
# reference, it just must not outrank the gridiron match.

AMERICAN_FOOTBALL = "american_football"
SOCCER = "soccer"
OTHER_DOMAIN = "other"

_AF_TOKENS = frozenset({
    "nfl", "ncaa", "xfl", "quarterback", "qb", "gridiron", "touchdown",
    "endzone", "blitz", "sack", "punt", "huddle", "all22", "yac",
})
_SOCCER_TOKENS = frozenset({
    "soccer", "uefa", "fifa", "bundesliga", "goalkeeper", "striker",
    "midfielder", "offside", "epl", "laliga", "seriea",
    "xg", "goalkeeping", "penalties", "shootout",
})
_AF_PHRASES = (
    "american football", "offensive line", "pass rush", "defensive back",
    "wide receiver", "running back", "tight end", "play action",
    "man coverage", "zone coverage", "first down", "down and distance",
    "field goal", "yard line", "route running", "college football",
    "pass coverage", "run game", "play clock", "two minute drill",
)
_SOCCER_PHRASES = (
    "association football", "premier league", "la liga", "serie a",
    "free kick", "corner kick", "penalty kick", "match official",
    "football club", "goal celebration", "soccer match", "world cup",
    "expected goals", "penalty shootout", "football match", "xg model",
    "set piece", "goal scoring", "shot metrics",
)


def _domain_scores(text: str) -> tuple[int, int]:
    """(american_football hits, soccer hits) for one blob of text."""
    low = (text or "").lower()
    af = sum(1 for p in _AF_PHRASES if p in low)
    sc = sum(1 for p in _SOCCER_PHRASES if p in low)
    toks = set(TOKEN.findall(low))
    af += len(toks & _AF_TOKENS)
    sc += len(toks & _SOCCER_TOKENS)
    return af, sc


def sport_domain_of(*parts: str) -> str:
    """Classify a document's sport from its own words. No metadata required.

    The harvest manifest carries no sport_domain field, so the classifier reads
    title/abstract/topics. Absent evidence stays 'other' rather than guessing.
    """
    af, sc = _domain_scores(" ".join(p for p in parts if p))
    if af and not sc:
        return AMERICAN_FOOTBALL
    if sc and not af:
        return SOCCER
    if af and sc:
        return AMERICAN_FOOTBALL if af > sc else SOCCER if sc > af else OTHER_DOMAIN
    return OTHER_DOMAIN


def query_domain(query: str, default: str = AMERICAN_FOOTBALL) -> str:
    """Domain intent of a query. Ambiguous queries inherit the corpus prior."""
    dom = sport_domain_of(query)
    return default if dom == OTHER_DOMAIN else dom


# ---------------------------------------------------------------------------
# Second ranking signal: TF-IDF cosine
# ---------------------------------------------------------------------------
# BM25 saturates term frequency and normalises by document length; cosine over
# L2-normalised tf-idf does neither. Fusing the two rank orders is what RRF is
# for, and neither needs model weights, network, or GPU -- both stay auditable.


def _idf(index: dict, term: str) -> float:
    n = index["n"] or 1
    df = index["df"].get(term, 0)
    return math.log(1 + (n - df + 0.5) / (df + 0.5))


def _doc_norms(index: dict) -> list[float]:
    cached = index.get("_norms")
    if cached is not None and len(cached) == index["n"]:
        return cached
    norms = []
    for rec in index["records"]:
        s = 0.0
        for t, tf in rec["terms"].items():
            w = tf * _idf(index, t)
            s += w * w
        norms.append(math.sqrt(s) or 1.0)
    index["_norms"] = norms
    return norms


def cosine_rank(index: dict, query: str, k: int = 8,
                include_retracted: bool = False) -> list[dict]:
    """Rank by cosine similarity of tf-idf vectors. Independent of BM25 order."""
    from collections import Counter

    q = tokenize(query)
    if not q or not index["records"]:
        return []
    qw = {t: tf * _idf(index, t) for t, tf in Counter(q).items()
          if t in index["df"]}
    if not qw:
        return []
    qnorm = math.sqrt(sum(w * w for w in qw.values())) or 1.0
    norms = _doc_norms(index)
    cand: set[int] = set()
    for t in qw:
        cand |= index["postings"].get(t, set())
    scored: list[tuple[int, float]] = []
    for d in cand:
        rec = index["records"][d]
        if not include_retracted and rec.get("retracted"):
            continue
        terms = rec["terms"]
        dot = 0.0
        for t, w in qw.items():
            tf = terms.get(t)
            if not tf:
                continue
            dot += w * (tf * _idf(index, t))
        if dot <= 0:
            continue
        scored.append((d, dot / (qnorm * norms[d])))
    scored.sort(key=lambda kv: -kv[1])
    out = []
    for d, s in scored[:k]:
        rec = dict(index["records"][d])
        rec.pop("terms", None)
        rec["score"] = round(s, 6)
        rec["rank_signal"] = "cosine"
        out.append(rec)
    return out


# ---------------------------------------------------------------------------
# Reciprocal Rank Fusion (RRF)
# ---------------------------------------------------------------------------
# score(d) = sum over rankers r of weight_r / (k_rrf + rank_r(d)). RRF needs no
# score normalisation across rankers, which is exactly why it is safe here:
# BM25 scores and cosine similarities live on incomparable scales.
#
# Domain demotion multiplies the fused score when a document's sport differs
# from the query's intended sport. It is a demotion, not a filter, so a strong
# cross-domain mechanism paper still surfaces lower in the list.

RRF_K = 60
RRF_ALPHA = 0.55  # weight on the lexical (BM25) rank order

# Sport-domain prior multipliers. Applied to the fused score, never as a
# filter, so a strong cross-domain mechanism paper still surfaces -- just
# below the same-sport hit.
#
# SAME_DOMAIN_BOOST and OTHER_DOMAIN_DEMOTE were MEASURED on the live
# 2,226-record manifest, not guessed. The previous version exempted "other"
# from demotion entirely (`dom not in (OTHER_DOMAIN, q_dom)`), so a generic
# computer-vision paper kept full fused score while a real gridiron paper next
# to it got nothing. Measured consequence: "American football player pose
# estimation" returned [other, other, other] in its top three even though 19
# american_football candidates were sitting in the candidate pool. At 1.6 /
# 0.90 that same query returns [american_football, american_football,
# american_football] with no ordering change on the coverage / pass-rush /
# aerodynamic / soccer probes. 1.35 was tested and was NOT enough to clear the
# third slot.
SAME_DOMAIN_BOOST = 1.6
OTHER_DOMAIN_DEMOTE = 0.90
CROSS_DOMAIN_DEMOTE = 0.25


def domain_prior(dom: str, q_dom: str,
                 same_domain_boost: float = SAME_DOMAIN_BOOST,
                 other_domain_demote: float = OTHER_DOMAIN_DEMOTE,
                 cross_domain_demote: float = CROSS_DOMAIN_DEMOTE) -> float:
    """Multiplier for a document's fused score given the query's sport intent.

    Neutral when the query carries no sport intent, so a sport-neutral query
    keeps its pure lexical ranking. Otherwise a same-sport document is boosted,
    a sport-neutral ("other") document is mildly demoted, and a different-sport
    document is demoted hard.

    The "other" demotion is the fix for the bug where generic computer-vision
    papers kept full score and outranked gridiron papers on gridiron queries.
    It is deliberately mild: "other" is the home of pure math/mechanism
    references that are often the right answer for a methods question, so it
    gets a 10% haircut rather than the 75% cross-sport cut.
    """
    if q_dom == OTHER_DOMAIN:
        return 1.0
    if dom == q_dom:
        return same_domain_boost
    if dom == OTHER_DOMAIN:
        return other_domain_demote
    return cross_domain_demote


def search_fused(index: dict, query: str, k: int = 8, k_rrf: int = RRF_K,
                 alpha: float = RRF_ALPHA, pool: int = 50,
                 include_retracted: bool = False,
                 same_domain_boost: float = SAME_DOMAIN_BOOST,
                 other_domain_demote: float = OTHER_DOMAIN_DEMOTE,
                 cross_domain_demote: float = CROSS_DOMAIN_DEMOTE) -> list[dict]:
    """BM25 + TF-IDF cosine fused by RRF, with sport-domain disambiguation.

    pool bounds each ranker's candidate list so fusion stays cheap on the
    2,000+ record manifest. Returned records carry the same keys as search()
    plus sport_domain and the per-ranker ranks that produced the score, so a
    ranking decision can be audited after the fact.
    """
    q_dom = query_domain(query)
    lexical = search(index, query, k=pool, include_retracted=include_retracted)
    semantic = cosine_rank(index, query, k=pool, include_retracted=include_retracted)
    if not lexical and not semantic:
        return []

    fused: dict[str, float] = {}
    ranks: dict[str, dict[str, int]] = {}
    by_id: dict[str, dict] = {}
    for hits, weight, signal in ((lexical, alpha, "bm25"),
                                 (semantic, 1.0 - alpha, "cosine")):
        for rank, rec in enumerate(hits, 1):
            rid = rec["id"]
            fused[rid] = fused.get(rid, 0.0) + weight / (k_rrf + rank)
            ranks.setdefault(rid, {})[signal] = rank
            by_id.setdefault(rid, rec)

    out = []
    for rid, score in fused.items():
        rec = dict(by_id[rid])
        dom = sport_domain_of(rec.get("title", ""), rec.get("abstract", ""),
                              " ".join(rec.get("topics") or []))
        prior = domain_prior(dom, q_dom, same_domain_boost,
                             other_domain_demote, cross_domain_demote)
        score *= prior
        rec["score"] = round(score, 6)
        rec["sport_domain"] = dom
        rec["query_domain"] = q_dom
        rec["domain_prior"] = prior
        rec["rank_signal"] = "rrf"
        rec["rrf_ranks"] = ranks.get(rid, {})
        out.append(rec)
    out.sort(key=lambda r: -r["score"])
    return out[:k]
