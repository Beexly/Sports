"""Verify the arXiv/OpenAlex corpus paper count asserted by the reasoning bridge.

Why this exists
---------------
`packages/prediction-engine/src/reasoning/arxiv-reasoning-bridge.ts` reports
`totalCorpusPapersIndexed`, and its test asserts a specific number. That number
drifted: the file's doc comments said 2,179 while the constant said 2,379, and
neither was reproducible from any committed corpus file. A count nobody can
re-derive is a count nobody can trust.

This script derives the number from the corpus files actually committed under
`docs/arxiv-program/research`, deduplicates by identifier, and compares against
the value in the bridge. It exits non-zero when they disagree, so the number can
be gated in CI instead of drifting again.

Dedupe key precedence per record: arxiv_id / arxivId / doi / openalex_id / id /
title. Records with no usable key are counted but not deduplicated, and that is
reported explicitly rather than silently.

Usage:
    python scripts/verify-corpus-count.py            # verify, exit 1 on mismatch
    python scripts/verify-corpus-count.py --json     # machine-readable detail
    python scripts/verify-corpus-count.py --print    # just print the count
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
BRIDGE = REPO / "packages" / "prediction-engine" / "src" / "reasoning" / "arxiv-reasoning-bridge.ts"
RESEARCH = REPO / "docs" / "arxiv-program" / "research"

# The five committed corpus sources. Missing files are reported, not skipped
# silently: a vanished corpus file would otherwise lower the count invisibly.
SOURCES = [
    "2026-10-17/ARXIV_OMNIBUS_SPORTS_AND_BETTING_CORPUS.json",
    "2026-10-17/OPENALEX_ACADEMIC_SPORTS_CORPUS.json",
    "2026-10-17/OPENALEX_NFL_MASTER_CORPUS.json",
    "2026-10-17/PURE_NFL_SPORTS_PAPERS_CORPUS.json",
    "2026-09-21/arxiv-program/index/corpus-index.jsonl",
]

LIST_KEYS = ("papers", "entries", "records", "results", "items", "data",
             "verified_papers", "search_results")
ID_KEYS = ("arxiv_id", "arxivId", "doi", "openalex_id", "openalexId", "id", "title")


def _records(obj):
    """Pull the record list out of a JSON document, whatever its wrapper key."""
    if isinstance(obj, list):
        return obj
    if isinstance(obj, dict):
        for k in LIST_KEYS:
            v = obj.get(k)
            if isinstance(v, list):
                return v
    return []


def _key(rec):
    if isinstance(rec, str):
        return rec.strip().lower() or None
    if isinstance(rec, dict):
        for k in ID_KEYS:
            v = rec.get(k)
            if v is not None and str(v).strip():
                return str(v).strip().lower()
    return None


def count() -> dict:
    per_file: dict[str, int] = {}
    keys: list[str] = []
    keyless = 0
    missing: list[str] = []

    for rel in SOURCES:
        p = RESEARCH / rel
        if not p.exists():
            missing.append(rel)
            continue
        n = 0
        if p.suffix == ".jsonl":
            for line in p.read_text(encoding="utf-8", errors="ignore").splitlines():
                line = line.strip()
                if not line:
                    continue
                n += 1
                try:
                    k = _key(json.loads(line))
                except json.JSONDecodeError:
                    k = line.lower()
                if k:
                    keys.append(k)
                else:
                    keyless += 1
        else:
            doc = json.loads(p.read_text(encoding="utf-8", errors="ignore"))
            for rec in _records(doc):
                n += 1
                k = _key(rec)
                if k:
                    keys.append(k)
                else:
                    keyless += 1
        per_file[rel] = n

    return {
        "per_file": per_file,
        "missing_sources": missing,
        "raw_entries": sum(per_file.values()),
        "unique_keys": len(set(keys)),
        "keyless_records": keyless,
        "bridge_value": _bridge_value(),
    }


def _bridge_value() -> int | None:
    if not BRIDGE.exists():
        return None
    m = re.search(r"totalCorpusPapersIndexed:\s*(\d+)", BRIDGE.read_text(encoding="utf-8", errors="ignore"))
    return int(m.group(1)) if m else None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", action="store_true", help="print full detail as JSON")
    ap.add_argument("--print", dest="print_only", action="store_true", help="print only the count")
    args = ap.parse_args()

    d = count()

    if args.print_only:
        print(d["unique_keys"])
        return 0

    if args.json:
        print(json.dumps(d, indent=2))
        return 0 if d["unique_keys"] == d["bridge_value"] else 1

    print("Corpus sources committed under docs/arxiv-program/research:")
    for rel, n in d["per_file"].items():
        print(f"  {n:5d}  {rel}")
    for rel in d["missing_sources"]:
        print(f"  MISSING  {rel}")
    print()
    print(f"  raw entries     : {d['raw_entries']}")
    print(f"  keyless records : {d['keyless_records']}")
    print(f"  unique keys     : {d['unique_keys']}   <- derived count")
    print(f"  bridge asserts  : {d['bridge_value']}")
    print()

    if d["bridge_value"] == d["unique_keys"]:
        print(f"MATCH — the bridge's totalCorpusPapersIndexed is reproducible ({d['unique_keys']}).")
        return 0

    print(f"MISMATCH — bridge says {d['bridge_value']}, committed corpus yields {d['unique_keys']}.")
    print("Either update the constant or fix the corpus. Do not 'fix' the test.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
