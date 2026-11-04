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
import tempfile
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


def _should_keep(record: dict, threshold: int | None) -> bool:
    """True if a manifest record survives a --min-priority filter.

    Semantics: _merge_prio is an inverted priority -- 1 is best (targeted/
    tooling) and 9 is worst (v1 contamination). A record is kept only when
    ``_merge_prio < threshold``. So ``--min-priority 9`` drops every record
    with _merge_prio >= 9 and keeps 1-8.

    Records with no _merge_prio (or a non-integer one) are kept: the field
    is absent from older manifests and silently dropping unlabelled
    records would lose data the filter was never meant to touch.
    """
    if threshold is None:
        return True
    prio = record.get("_merge_prio")
    if prio is None:
        return True
    try:
        prio_int = int(prio)
    except (TypeError, ValueError):
        return True
    return prio_int < threshold


def write_filtered_manifest(src: Path, threshold: int | None,
                            dest: Path) -> tuple[int, int]:
    """Copy *src* to *dest*, dropping records that fail the priority filter.

    Returns ``(kept, dropped)`` raw line counts. Blank lines are skipped;
    unparseable lines are passed through unchanged (``build_index`` already
    skips them) so counts here match the raw manifest size.
    """
    kept = dropped = 0
    with Path(src).open(encoding="utf-8") as fin, \
            Path(dest).open("w", encoding="utf-8") as fout:
        for line in fin:
            stripped = line.strip()
            if not stripped:
                continue
            try:
                record = json.loads(stripped)
            except json.JSONDecodeError:
                fout.write(line if line.endswith("\n") else line + "\n")
                kept += 1
                continue
            if _should_keep(record, threshold):
                fout.write(line if line.endswith("\n") else line + "\n")
                kept += 1
            else:
                dropped += 1
    return kept, dropped


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    ap.add_argument("--max-records", type=int, default=None,
                    help="cap mind-feed entries (default: no cap)")
    ap.add_argument("--topics", nargs="*", default=None,
                    help="restrict mind-feed to these topic tags")
    ap.add_argument("--min-priority", type=int, default=None, dest="min_priority",
                    help="exclude records with _merge_prio >= this value before indexing. "
                         "Lower _merge_prio = higher priority (1 is best, 9 is worst). "
                         "Example: --min-priority 9 keeps _merge_prio 1-8 and drops "
                         "the _merge_prio >= 9 v1 contamination. Default: no filtering.")
    args = ap.parse_args(argv)

    if not args.manifest.exists():
        print(f"FATAL manifest not found: {args.manifest}", file=sys.stderr)
        return 2

    args.out.mkdir(parents=True, exist_ok=True)
    size_mb = args.manifest.stat().st_size / 1e6

    manifest_to_index = args.manifest
    temp_filtered: Path | None = None
    filtered_kept = 0
    filtered_dropped = 0
    try:
        if args.min_priority is not None:
            with tempfile.NamedTemporaryFile(
                mode="w", suffix=".jsonl", prefix="corpus_filtered_",
                delete=False, encoding="utf-8",
            ) as tf:
                temp_filtered = Path(tf.name)
            filtered_kept, filtered_dropped = write_filtered_manifest(
                args.manifest, args.min_priority, temp_filtered)
            manifest_to_index = temp_filtered

        t0 = time.time()
        raw = ci.build_index(manifest_to_index)
        t_build = time.time() - t0
    finally:
        if temp_filtered is not None and temp_filtered.exists():
            temp_filtered.unlink()

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
        "min_priority": args.min_priority,
        "records_excluded_by_priority": filtered_dropped,
        "records_after_priority_filter_raw_kept": filtered_kept if args.min_priority is not None else n_raw,
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
