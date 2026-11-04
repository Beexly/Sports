"""Retrieval quality evaluation for the research corpus.

The corpus has 357 correctness tests but no aggregate quality metric. This
harness measures MRR, NDCG@k, recall@k and precision@k over a hand-curated
query set with known-relevant documents, and compares three rankers:

  bm25   — raw BM25, no fusion, no domain prior
  fused  — RRF over BM25 + TF-IDF cosine
  prior  — fused + sport-domain prior (the production default)

Ground truth is a title substring. A retrieved record is relevant when its
title contains one of the query's substrings. This is deliberately strict:
it measures whether the retriever surfaces the *specific* document a domain
expert would name, not whether it returns something vaguely on-topic.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from intelligence.research import corpus_index as ci

MANIFEST = Path(r"C:\Users\Garrett\AppData\Local\hermes\cache\scratch\research_corpus\merged_manifest_2026-11-04.jsonl")

# (query, [title substrings that count as relevant])
EVAL_SET: list[tuple[str, list[str]]] = [
    ("NFL win probability calibration", ["iWinRNFL"]),
    ("fourth down decision making", ["Fourth Down Decision Making"]),
    ("defensive coverage disguise", ["Decoding Defensive Coverage"]),
    ("daily fantasy sports lineup optimization", ["Optimising Daily Fantasy"]),
    ("player tracking tackling", ["Fractional Tackles"]),
    ("football player tracking broadcast", ["Continuous football player tracking"]),
    ("team-aware player tracking SAM", ["Team-Aware Football Player Tracking"]),
    ("handheld multi-object tracking dataset", ["Hand Held Multi-Object"]),
    ("NFL simulation decision making", ["NFLSimulatoR"]),
    ("conformal win probability", ["Conformal Win Probability"]),
    ("sinkhorn optimal transport", ["Sinkhorn"]),
    ("tau hat solution", ["TAU HAT"]),
    ("injury overlay", ["gse injury overlay"]),
    ("AIGoat vulnerable FastAPI", ["RUN REPORT"]),
    ("MemPalace LongMemEval recall", ["TEST REPORT"]),
    ("OXR MarkItDown parser bakeoff", ["BAKEOFF REPORT"]),
    ("soccer expected goals", ["expected goals", "soccer"]),
    ("concussion head impact", ["Concussion", "concussion"]),
    ("pass rush win rate", ["pass rush", "Pass Rush"]),
    ("red zone efficiency", ["red zone", "Red Zone"]),
]


def _is_relevant(title: str, subs: list[str]) -> bool:
    t = (title or "").lower()
    return any(s.lower() in t for s in subs)


def _dcg(gains: list[float]) -> float:
    return sum(g / math.log2(i + 2) for i, g in enumerate(gains))


_INDEX_CACHE: dict | None = None
# Overridable so the pipeline can evaluate exactly the manifest that the index
# was built from. A hardcoded path here silently scored a DIFFERENT corpus than
# build_index consumed once an ingest stage was inserted upstream.
_ACTIVE_MANIFEST: Path | None = None


def _index() -> dict:
    """Build once per process. Rebuilding per ranker costs ~35s each."""
    global _INDEX_CACHE
    if _INDEX_CACHE is None:
        _INDEX_CACHE = ci.dedupe(ci.build_index(_ACTIVE_MANIFEST or MANIFEST))
    return _INDEX_CACHE


def evaluate(ranker: str, k: int = 10) -> dict:
    idx = _index()
    # Total relevant per query = every corpus record whose title matches.
    # Without this, recall and NDCG can exceed 1.0 when a query matches more
    # documents than the ground-truth list names.
    totals = {}
    for query, subs in EVAL_SET:
        totals[query] = sum(
            1 for d in idx["records"] if _is_relevant(d.get("title", ""), subs))

    per_query = []
    for query, subs in EVAL_SET:
        if ranker == "bm25":
            hits = ci.search(idx, query, k=k)
        elif ranker == "fused":
            # Neutralise the domain prior: all multipliers 1.0.
            hits = ci.search_fused(
                idx, query, k=k, same_domain_boost=1.0,
                other_domain_demote=1.0, cross_domain_demote=1.0)
        else:
            hits = ci.search_fused(idx, query, k=k)
        gains = [1.0 if _is_relevant(h.get("title", ""), subs) else 0.0 for h in hits]
        n_rel = sum(gains)
        total = max(totals[query], 1)
        first = next((i + 1 for i, g in enumerate(gains) if g), None)
        mrr = 1.0 / first if first else 0.0
        ideal = _dcg([1.0] * min(total, k))
        ndcg = _dcg(gains) / ideal if ideal else 0.0
        per_query.append({
            "query": query,
            "mrr": mrr,
            "ndcg": ndcg,
            "recall": n_rel / total,
            "precision": n_rel / k,
            "first_rank": first,
            "n_relevant_found": int(n_rel),
            "n_relevant_total": total,
        })
    n = len(per_query)
    return {
        "ranker": ranker,
        "k": k,
        "n_queries": n,
        "mrr": sum(r["mrr"] for r in per_query) / n,
        "ndcg": sum(r["ndcg"] for r in per_query) / n,
        "recall": sum(r["recall"] for r in per_query) / n,
        "precision": sum(r["precision"] for r in per_query) / n,
        "hits_at_1": sum(1 for r in per_query if r["first_rank"] == 1),
        "hits_at_3": sum(1 for r in per_query if r["first_rank"] and r["first_rank"] <= 3),
        "misses": [r["query"] for r in per_query if r["first_rank"] is None],
        "per_query": per_query,
    }


def main(argv: list[str] | None = None) -> int:
    global _ACTIVE_MANIFEST, _INDEX_CACHE
    ap = argparse.ArgumentParser(description="Retrieval eval over the research corpus")
    ap.add_argument("--manifest", type=Path, default=MANIFEST,
                    help="manifest to evaluate (default: the consolidated corpus)")
    ap.add_argument("--out", type=Path,
                    default=Path(r"C:\Users\Garrett\AppData\Local\hermes\cache\scratch\retrieval_eval_2026_11_04.json"),
                    help="where to write the JSON results")
    args = ap.parse_args(argv)
    # Reset the cache so the requested manifest is the one measured.
    _ACTIVE_MANIFEST = args.manifest
    _INDEX_CACHE = None

    results = [evaluate(r) for r in ("bm25", "fused", "prior")]
    print(f"{'ranker':<8} {'MRR':>7} {'NDCG@10':>8} {'R@10':>7} {'P@10':>7} {'H@1':>5} {'H@3':>5}")
    for r in results:
        print(f"{r['ranker']:<8} {r['mrr']:>7.4f} {r['ndcg']:>8.4f} "
              f"{r['recall']:>7.4f} {r['precision']:>7.4f} "
              f"{r['hits_at_1']:>5} {r['hits_at_3']:>5}")
    print()
    for r in results:
        if r["misses"]:
            print(f"{r['ranker']} misses ({len(r['misses'])}): {r['misses']}")
    print()
    best = max(results, key=lambda r: r["mrr"])
    print(f"best MRR: {best['ranker']} ({best['mrr']:.4f})")

    out = args.out
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(results, indent=1), encoding="utf-8")
    print(f"wrote {out}  (manifest: {args.manifest.name})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
