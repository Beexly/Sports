"""Normalise the legacy HuggingFace sports-dataset harvest to the corpus contract.

WHY THIS EXISTS

Measured 2026-11-04. Two HuggingFace harvesters wrote two different shapes:

  hf_datasets_2026-11-04.jsonl       54 rows, canonical fields
                                     (source/source_id/title/abstract/topics/...)
                                     -> wired into consolidate_final, indexed.

  hf_sports_datasets_2026_11_04.jsonl  7 rows, raw Hub API shape only
                                     (id/downloads/query/tags)
                                     -> has NO title and NO source, so it fails
                                        the data contract, and grep shows it is
                                        NOT in consolidate_final's source list.

The 7 rows were harvested and then silently dropped. They were not rejected with
an error; nothing read them at all. That is the failure mode a data contract is
supposed to make impossible: a producer and its only consumer disagreed about the
shape, and the disagreement was invisible.

This script rewrites the file into the contract shape and writes a NEW file. The
raw harvest is left untouched so the transform stays auditable and repeatable.

It does NOT wire the output into consolidate_final: that changes what the corpus
contains and requires rebuilding the index, which is a separate, deliberate act.

USAGE
    python scripts/research/normalize_hf_sports_datasets.py [--in PATH] [--out PATH]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO))

from intelligence.research.corpus_contract import audit_manifest, validate_record  # noqa: E402

DEFAULT_IN = REPO / "data" / "research" / "hf_sports_datasets_2026_11_04.jsonl"
DEFAULT_OUT = REPO / "data" / "research" / "hf_sports_datasets_normalized.jsonl"


def normalize(row: dict, index: int = 0) -> dict:
    """Map a raw Hub dataset row onto the corpus record shape.

    Fields kept deliberately: the Hub id is the retrievable handle and becomes
    the title, because that is what a reader searches for. `downloads` is kept
    as a hint of adoption, and `tags` becomes topics so the domain classifier
    can use it. `query` records which harvest produced the row.
    """
    raw_id = str(row.get("id") or row.get("source_id") or "").strip()
    tags = row.get("tags")
    if isinstance(tags, str):
        topics = [t.strip() for t in tags.split(",") if t.strip()]
    elif isinstance(tags, list):
        topics = [str(t) for t in tags]
    else:
        topics = []

    downloads = row.get("downloads")
    parts = [
        f"HuggingFace dataset {raw_id}" if raw_id else "HuggingFace dataset",
        f"tags: {', '.join(topics)}" if topics else "",
        f"downloads: {downloads}" if downloads is not None else "",
        f"harvested for query: {row['query']}" if row.get("query") else "",
    ]
    abstract = ". ".join(p for p in parts if p) + "."

    return {
        "source": "huggingface",
        "source_id": raw_id or f"hf_dataset_{index}",
        "title": raw_id or f"HuggingFace dataset {index}",
        "abstract": abstract,
        "topics": topics,
        "url": f"https://huggingface.co/datasets/{raw_id}" if raw_id else None,
        "downloads": downloads,
        "query": row.get("query"),
        # Provenance of the transform itself, so nobody mistakes this for raw.
        "normalized_from": "hf_sports_datasets_2026_11_04.jsonl",
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="src", default=str(DEFAULT_IN))
    ap.add_argument("--out", dest="dst", default=str(DEFAULT_OUT))
    args = ap.parse_args()

    src, dst = Path(args.src), Path(args.dst)
    if not src.exists():
        print(f"missing input: {src}", file=sys.stderr)
        return 2

    rows, written, rejected = [], 0, 0
    with src.open("r", encoding="utf-8") as fh:
        for i, line in enumerate(fh, 1):
            if not line.strip():
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError as exc:
                print(f"line {i}: unparseable ({exc.msg})", file=sys.stderr)
                rejected += 1

    print(f"input rows: {len(rows)}")
    before = audit_manifest(src)
    print(f"before: {before.summary()}")

    out_lines = []
    for i, row in enumerate(rows):
        if not isinstance(row, dict):
            rejected += 1
            continue
        norm = normalize(row, i)
        report = validate_record(norm, index=i)
        if not report.ok:
            rejected += 1
            print(f"  row {i} still invalid: {report.errors}", file=sys.stderr)
            continue
        out_lines.append(json.dumps(norm, ensure_ascii=False))
        written += 1

    dst.write_text("\n".join(out_lines) + ("\n" if out_lines else ""), encoding="utf-8")

    after = audit_manifest(dst)
    print(f"after:  {after.summary()}")
    print(f"wrote {written} row(s) -> {dst}  (rejected {rejected})")
    return 0 if after.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
