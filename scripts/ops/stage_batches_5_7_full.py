#!/usr/bin/env python3
"""Stage every enumerable Batches 5-7 work, dataset and operator.

Reads the closed enumeration (data/research/batches_5_7_works_2026_11_05.json)
and appends deduped records to both mind-staging JSONL files. Records carry the
abstract as text when one was resolved; unresolved citations stay short_text and
are not marked trainer_ready.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORKS = ROOT / "data" / "research" / "batches_5_7_works_2026_11_05.json"
OPS = ROOT / "data" / "mind_staging" / "mind_batches_5_6_7_2026_11_05.jsonl"
TARGETS = [
    ROOT / "data" / "mind_staging" / "mind_2026_11_05_full_corpus.jsonl",
    ROOT / "data" / "mind_staging" / "mind_batch3_batch4_gaphunt_repocatalog_am_pm_2026_11_05.jsonl",
]


def titles(path: Path) -> set[str]:
    out = set()
    if not path.exists():
        return out
    for ln in path.read_text(encoding="utf-8").splitlines():
        if ln.strip():
            t = (json.loads(ln).get("title") or "").strip().lower()
            if t:
                out.add(t)
    return out


def main() -> dict:
    payload = json.loads(WORKS.read_text(encoding="utf-8"))
    ops = [json.loads(l) for l in OPS.read_text(encoding="utf-8").splitlines() if l.strip()]

    records: list[dict] = []
    for i, w in enumerate(payload["works"], 1):
        text = w.get("abstract") or w.get("cited_as") or ""
        records.append({
            "id": f"batch5-7-work-{i:03d}",
            "kind": "paper",
            "batch": "2026-11-05-batches-5-6-7",
            "operator": w.get("operator"),
            "title": w.get("title") or w.get("cited_as"),
            "cited_as": w.get("cited_as"),
            "authors": w.get("authors") or [],
            "year": w.get("published") or "",
            "arxiv_id": w.get("arxiv_id"),
            "openalex_id": w.get("openalex_id"),
            "url": (f"https://arxiv.org/abs/{w['arxiv_id']}" if w.get("arxiv_id")
                    else (f"https://openalex.org/{w['openalex_id']}" if w.get("openalex_id") else None)),
            "text": text,
            "content_class": "full_text" if len(text) >= 200 else "short_text",
            "trainer_ready": len(text) >= 200,
        })
    for i, e in enumerate(payload["extras"], 1):
        records.append({
            "id": f"batch5-7-extra-{i:03d}",
            "kind": "dataset_reference",
            "batch": "2026-11-05-batches-5-6-7",
            "title": e["cited_as"][:160],
            "text": e["cited_as"],
            "content_class": "dataset_reference",
            "trainer_ready": False,
        })
    for i, o in enumerate(ops, 1):
        body = f"{o.get('gseApplication','')}\n{o.get('gsiApplication','')}".strip()
        records.append({
            "id": f"batch5-7-operator-{i:03d}",
            "kind": "operator_spec",
            "batch": "2026-11-05-batches-5-6-7",
            "title": o.get("title"),
            "operatorWired": o.get("operatorWired"),
            "text": body,
            "content_class": "operator_spec",
            "trainer_ready": True,
        })

    for path in TARGETS:
        seen = titles(path)
        added = 0
        with path.open("a", encoding="utf-8") as fh:
            for r in records:
                key = (r["title"] or "").strip().lower()
                if not key or key in seen:
                    continue
                fh.write(json.dumps(r, ensure_ascii=False) + "\n")
                seen.add(key)
                added += 1
        print(path.name, "added", added)
    print("records built", len(records))
    return {"built": len(records)}


if __name__ == "__main__":
    main()
