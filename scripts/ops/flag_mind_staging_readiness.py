#!/usr/bin/env python3
"""Set honest readiness flags on the mind-staging JSONL.

A PDF pointer is a route, not training text. A metadata-only OpenAlex row and a
context-grade Appendix-B stub are inventory, not content. This pass adds a
content_class to every record and sets trainer_ready only where a consumer
actually gets text or a structured operator spec.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FILES = [
    ROOT / "data" / "mind_staging" / "mind_2026_11_05_full_corpus.jsonl",
    ROOT / "data" / "mind_staging" / "mind_batch3_batch4_gaphunt_repocatalog_am_pm_2026_11_05.jsonl",
]
MANIFESTS = [
    ROOT / "data" / "mind_staging" / "mind_2026_11_05_manifest.json",
    ROOT / "data" / "mind_staging" / "mind_batch4_5_7_manifest.json",
]


def classify(r: dict) -> str:
    kind = r.get("kind", "")
    text = r.get("text") or ""
    if kind == "pdf_pointer":
        return "pointer"
    if kind == "appendix_context_item" or text.startswith("Context-grade feed item"):
        return "context_stub"
    if text.startswith("[metadata only"):
        return "metadata_only"
    if "operatorWired" in r or kind == "operator_spec":
        return "operator_spec"
    if kind == "dataset_reference":
        return "dataset_reference"
    if len(text) >= 200:
        return "full_text"
    return "short_text"


def main() -> dict:
    summary = {}
    for path in FILES:
        rows = []
        for ln in path.read_text(encoding="utf-8").splitlines():
            if not ln.strip():
                continue
            r = json.loads(ln)
            cls = classify(r)
            r["content_class"] = cls
            r["trainer_ready"] = cls in {"full_text", "operator_spec"}
            rows.append(r)
        with path.open("w", encoding="utf-8") as fh:
            for r in rows:
                fh.write(json.dumps(r, ensure_ascii=False) + "\n")
        counts = {}
        ready = 0
        for r in rows:
            counts[r["content_class"]] = counts.get(r["content_class"], 0) + 1
            ready += 1 if r["trainer_ready"] else 0
        summary[path.name] = {"records": len(rows), "trainer_ready": ready, "classes": counts}
        print(path.name, summary[path.name])

    for mp in MANIFESTS:
        if not mp.exists():
            continue
        m = json.loads(mp.read_text(encoding="utf-8"))
        m["readiness"] = summary
        m["readiness_note"] = (
            "trainer_ready is true only for full_text (>=200 chars of source text) and operator_spec records. "
            "PDF pointers, context stubs, metadata-only OpenAlex rows, dataset references and short_text are staged but not trainer-ready."
        )
        mp.write_text(json.dumps(m, indent=2), encoding="utf-8")
    return summary


if __name__ == "__main__":
    main()
