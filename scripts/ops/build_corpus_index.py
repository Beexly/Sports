"""Wire the harvested research corpus into the reasoning engine.

Pipeline: build_index(manifest) -> dedupe(index) -> to_mind_feed(index, out)

This is the missing driver. corpus_index.py existed with tests but was never run
against the real 8.7 MB manifest, so nothing downstream had a corpus to read.

Emits:
  <out>/corpus_mindfeed.jsonl   mind-feed entries (wired=false, UNVALIDATED)
  <out>/corpus_index_stats.json build/dedupe statistics for audit

Usage:
  python scripts/ops/build_corpus_index.py \
      --manifest C:/Users/.../research_corpus/manifest.jsonl \
      --out intelligence/corpus
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
if str(REPO) not in sys.path:
    sys.path.insert(0, str(REPO))

from intelligence.research import corpus_index as ci  # noqa: E402

DEFAULT_MANIFEST = Path(
    r"C:\Users\Garrett\AppData\Local\hermes\cache\scratch\research_corpus\manifest.jsonl"
)
DEFAULT_OUT = REPO / "intelligence" / "corpus"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    ap.add_argument("--max-records", type=int, default=None,
                    help="cap mind-feed entries (default: no cap)")
    ap.add_argument("--topics", nargs="*", default=None,
                    help="restrict mind-feed to these topic tags")
    args = ap.parse_args(argv)

    if not args.manifest.exists():
        print(f"FATAL manifest not found: {args.manifest}", file=sys.stderr)
        return 2

    args.out.mkdir(parents=True, exist_ok=True)
    size_mb = args.manifest.stat().st_size / 1e6

    t0 = time.time()
    raw = ci.build_index(args.manifest)
    t_build = time.time() - t0

    n_raw = raw["n"]
    with_text_raw = sum(1 for r in raw["records"] if r["has_full_text"])
    retracted_raw = sum(1 for r in raw["records"] if r["retracted"])

    t0 = time.time()
    idx = ci.dedupe(raw)
    t_dedupe = time.time() - t0

    n_dedup = idx["n"]
    with_text = sum(1 for r in idx["records"] if r["has_full_text"])
    retracted = sum(1 for r in idx["records"] if r["retracted"])

    feed_path = args.out / "corpus_mindfeed.jsonl"
    # Rebuild from scratch: appending would duplicate every record on a re-run.
    if feed_path.exists():
        feed_path.unlink()
    n_feed = ci.to_mind_feed(idx, feed_path, topics=args.topics,
                             max_records=args.max_records)

    topic_counts: dict[str, int] = {}
    for r in idx["records"]:
        for t in r.get("topics") or []:
            topic_counts[t] = topic_counts.get(t, 0) + 1

    stats = {
        "manifest": str(args.manifest),
        "manifest_size_mb": round(size_mb, 2),
        "built_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "raw_records": n_raw,
        "deduped_records": n_dedup,
        "duplicates_collapsed": n_raw - n_dedup,
        "full_text_records_raw": with_text_raw,
        "full_text_records_deduped": with_text,
        "retracted_raw": retracted_raw,
        "retracted_deduped": retracted,
        "avg_doc_len": round(idx["avgdl"], 2),
        "unique_terms": len(idx["postings"]),
        "mind_feed_entries": n_feed,
        "mind_feed_path": str(feed_path),
        "build_seconds": round(t_build, 2),
        "dedupe_seconds": round(t_dedupe, 2),
        "topic_counts": dict(sorted(topic_counts.items(), key=lambda kv: -kv[1])),
    }
    stats_path = args.out / "corpus_index_stats.json"
    stats_path.write_text(json.dumps(stats, indent=2), encoding="utf-8")

    print(json.dumps(stats, indent=2))

    # Sanity probe: the index must actually answer a domain query. A build that
    # "succeeds" but ranks nothing is a silent failure.
    print("\n--- probe: 'coverage disguise trajectory' ---")
    for h in ci.search(idx, "coverage disguise trajectory", k=5):
        print(f"  {h['score']:>7.3f}  {str(h['year']):>4}  {h['title'][:72]}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
