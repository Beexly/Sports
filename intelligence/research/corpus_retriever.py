"""Retriever bridge: research corpus -> reasoning engine.

corpus_index.py builds the index and emits a mind-feed. This module is the piece
that lets the reasoning engine *ask questions* of it without loading 8.7 MB of
manifest on every analysis.

Design constraints, taken from what the engine actually accepts:

  * DataContext.corpus_hits is a list[str] of citation strings. In
    intelligence/engines/harness.py the sole example is a repo-relative markdown
    path: "coaching-tendencies/profiles/todd-monken.md". So hits are emitted as
    "research_corpus/<source>/<source_id>" -- stable, resolvable, unique.
  * DataContext.tool_backend is Callable[[str, dict], str]. A tool returns a
    string. So the corpus tool returns a rendered text block, and the caller
    records it via trace.record_tool_call.

GATE WARNING -- read before using hits in a recommendation
----------------------------------------------------------
Every record in this corpus is UNVALIDATED against GSE data. Nothing here has
been run against a graded slate. corpus_index.to_mind_feed already stamps
wired=false / gate_status=UNVALIDATED on every entry, and this module carries
that stamp through to the hit dicts and into the tool output text.

The reasoning engine does NOT enforce that stamp. There is no check anywhere in
intelligence/reasoning/ that reads gate_status. Wiring these hits into a
recommendation would therefore let unvalidated research influence a pick with
no gate stopping it. Until an enforcement check exists, use these hits for
citations and mechanism-finding only -- not as load-bearing evidence.

This module deliberately does not inject hits into any specialist's claims.
"""

from __future__ import annotations

import functools
import json
from pathlib import Path
from typing import Any

from . import corpus_index as ci

DEFAULT_MANIFEST = Path(
    r"C:\Users\Garrett\AppData\Local\hermes\cache\scratch\research_corpus\manifest.jsonl"
)
DEFAULT_FEED = Path(__file__).resolve().parents[1] / "corpus" / "corpus_mindfeed.jsonl"

GATE_STATUS = "UNVALIDATED"


@functools.lru_cache(maxsize=1)
def _load_index(manifest: str) -> dict[str, Any]:
    """Build + dedupe once per process. ~0.8 s for the 2,034-record manifest."""
    return ci.dedupe(ci.build_index(Path(manifest)))


def load_index(manifest: Path | str = DEFAULT_MANIFEST) -> dict[str, Any]:
    return _load_index(str(manifest))


def _citation(rec: dict[str, Any]) -> str:
    src = rec.get("source") or "unknown"
    return f"research_corpus/{src}/{rec.get('id')}"


def retrieve(query: str, k: int = 5, manifest: Path | str = DEFAULT_MANIFEST,
             include_retracted: bool = False) -> list[dict[str, Any]]:
    """Rank corpus records for a query. Returns hit dicts with gate stamps.

    include_retracted defaults to False: a retracted paper reads exactly like a
    valid one, so it must not surface unless explicitly requested.
    """
    idx = load_index(manifest)
    hits = ci.search(idx, query, k=k, include_retracted=include_retracted)
    for h in hits:
        h["citation"] = _citation(h)
        h["gate_status"] = GATE_STATUS
        h["wired"] = False
    return hits


def as_corpus_hits(query: str, k: int = 5, manifest: Path | str = DEFAULT_MANIFEST,
                   include_retracted: bool = False) -> list[str]:
    """Citation strings only -- the shape DataContext.corpus_hits expects."""
    return [h["citation"] for h in retrieve(query, k=k, manifest=manifest,
                                            include_retracted=include_retracted)]


def render_hits(query: str, k: int = 5, manifest: Path | str = DEFAULT_MANIFEST) -> str:
    """Human/agent-readable block. Carries the gate warning into the text so a
    model reading the tool output cannot mistake this for validated evidence."""
    hits = retrieve(query, k=k, manifest=manifest)
    if not hits:
        return f"research_corpus: no records matched {query!r}."

    lines = [
        f"research_corpus: {len(hits)} hit(s) for {query!r}",
        f"GATE: all records {GATE_STATUS} — citation/mechanism use only, "
        f"not load-bearing evidence in a recommendation.",
        "",
    ]
    for i, h in enumerate(hits, 1):
        authors = h.get("authors") or []
        if isinstance(authors, str):
            authors = [authors]
        first = authors[0] if authors else "n/a"
        lines.append(f"[{i}] {h.get('title', '(untitled)')}")
        lines.append(f"    {first} et al. ({h.get('year')}) — {h.get('venue') or 'n/a'}")
        lines.append(f"    score={h.get('score')} cited_by={h.get('cited_by')} "
                     f"full_text={h.get('has_full_text')} retracted={h.get('retracted')}")
        lines.append(f"    cite={h['citation']}")
        if h.get("doi"):
            lines.append(f"    doi={h['doi']}")
        if h.get("pdf_url"):
            lines.append(f"    pdf={h['pdf_url']}")
        abstract = (h.get("abstract") or "").strip().replace("\n", " ")
        if abstract:
            lines.append(f"    abstract: {abstract[:300]}{'...' if len(abstract) > 300 else ''}")
        lines.append("")
    return "\n".join(lines)


def tool_backend(name: str, args: dict[str, Any]) -> str:
    """Callable[[str, dict], str] matching DataContext.tool_backend.

    Register as:  ctx.tool_backend = corpus_retriever.tool_backend
    Specialists call: ctx.tool_backend("research_corpus", {"query": "...", "k": 3})
    """
    if name not in ("research_corpus", "corpus_search"):
        return f"research_corpus: unknown tool {name!r}"
    query = str(args.get("query") or "").strip()
    if not query:
        return "research_corpus: empty query"
    try:
        k = int(args.get("k", 5))
    except (TypeError, ValueError):
        k = 5
    return render_hits(query, k=max(1, min(k, 20)),
                       manifest=args.get("manifest") or DEFAULT_MANIFEST)


def _main() -> int:  # pragma: no cover - CLI convenience
    import argparse

    ap = argparse.ArgumentParser(description="Query the research corpus index.")
    ap.add_argument("query")
    ap.add_argument("-k", type=int, default=5)
    ap.add_argument("--include-retracted", action="store_true")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()

    hits = retrieve(a.query, k=a.k, include_retracted=a.include_retracted)
    if a.json:
        print(json.dumps(hits, indent=2, ensure_ascii=False))
    else:
        print(render_hits(a.query, k=a.k))
    return 0


if __name__ == "__main__":
    raise SystemExit(_main())
