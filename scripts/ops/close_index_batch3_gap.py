#!/usr/bin/env python3
"""Close the INDEX-BATCH-3 gap.

The original staging counted only ### headings. The index also carries numbered
items under Lane A2 and one H4 dataset-card note, which is where the 8-record
shortfall came from. This reparses all three shapes and appends only records
that are not already staged.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = Path(r"C:\Users\Garrett\Downloads\INDEX-BATCH-3.md")
CONSOLIDATED = ROOT / "data" / "mind_staging" / "mind_2026_11_05_full_corpus.jsonl"
BASE = ROOT / "data" / "mind_staging" / "mind_batch3_batch4_gaphunt_repocatalog_am_pm_2026_11_05.jsonl"
OUT = ROOT / "data" / "research" / "index_batch3_items_2026_11_05.json"

GROUP_PREFIXES = (
    "specs / protocols", "arxiv papers", "dataset / index documentation",
    "target 1 —", "target 2 —", "target 3 —", "target 4 —",
)
ITEM_RE = re.compile(r"^###\s+(.+?)\s*$")
NUM_RE = re.compile(r"^\d+\.\s+\*\*(.+?)\*\*\s*$")
BOLD_NUM_RE = re.compile(r"^\*\*\d+\.\s+(.+?)\*\*\s*$")


def collecting(bucket: str) -> bool:
    b = bucket.lower()
    return b.startswith("verified") or b.startswith("patents") or b.startswith("datasets")


def is_group(title: str) -> bool:
    return any(title.lower().startswith(x) for x in GROUP_PREFIXES)


def field(block: str, name: str) -> str | None:
    pat = r"(?im)^\s*(?:-\s*)?\*{0,2}" + re.escape(name) + r"[^:\n]*:\*{0,2}\s*(.+)$"
    m = re.search(pat, block)
    return m.group(1).strip() if m else None


def parse() -> list[dict]:
    lines = SRC.read_text(encoding="utf-8").splitlines()
    items, lane, bucket = [], "", None

    def flush(b: dict | None, block_lines: list[str]) -> None:
        if not b:
            return
        block = "\n".join(block_lines)
        b["source_url"] = field(block, "Source")
        b["filename"] = field(block, "File") or field(block, "Filename")
        b["contents"] = field(block, "Contents")
        b["transfer"] = field(block, "TRANSFER")
        b["lane"] = lane
        items.append(b)

    cur, cur_lines = None, []
    for i, line in enumerate(lines):
        if line.startswith("# Lane") or line.startswith("## Lane"):
            flush(cur, cur_lines); cur, cur_lines, bucket = None, [], None
            lane = line.lstrip("# ").strip()
            continue
        if line.startswith("## "):
            flush(cur, cur_lines); cur, cur_lines = None, []
            bucket = line[3:].strip()
            continue
        m = ITEM_RE.match(line)
        if m and collecting(bucket):
            title = re.sub(r"^\**|\**$", "", m.group(1).strip())
            if is_group(title) or title.startswith("GAP-"):
                continue
            flush(cur, cur_lines)
            cur, cur_lines = {"title": title, "shape": "h3"}, []
            continue
        m = NUM_RE.match(line) or BOLD_NUM_RE.match(line)
        if m and collecting(bucket):
            flush(cur, cur_lines)
            cur, cur_lines = {"title": m.group(1).strip(), "shape": "numbered"}, []
            continue
        if line.startswith("#### ") and cur is not None:
            cur.setdefault("subnotes", []).append(line[5:].strip())
        if cur is not None:
            cur_lines.append(line)
    flush(cur, cur_lines)
    return items


def existing_titles(paths: list[Path]) -> set[str]:
    seen = set()
    for p in paths:
        if not p.exists():
            continue
        for ln in p.read_text(encoding="utf-8").splitlines():
            if not ln.strip():
                continue
            r = json.loads(ln)
            t = (r.get("title") or "").strip().lower()
            if t:
                seen.add(t)
    return seen


def record(idx: int, it: dict) -> dict:
    body_parts = [f"{k}: {it[k]}" for k in ("contents", "transfer") if it.get(k)]
    body = "\n".join(body_parts)
    return {
        "id": f"index-batch-3-item-{idx:03d}",
        "kind": "index_item",
        "source": "INDEX-BATCH-3.md",
        "lane": it["lane"],
        "title": it["title"],
        "filename": it.get("filename"),
        "url": it.get("source_url"),
        "text": body,
        "content_class": "short_text",
        "trainer_ready": False,
    }


def main() -> dict:
    items = parse()
    seen = existing_titles([CONSOLIDATED, BASE])
    new = [it for it in items if it["title"].strip().lower() not in seen]
    print("parsed items", len(items), "already staged", len(items) - len(new), "new", len(new))
    records = [record(i, it) for i, it in enumerate(items, 1)]
    for path in (CONSOLIDATED, BASE):
        with path.open("a", encoding="utf-8") as fh:
            for r in records:
                if r["title"].strip().lower() not in seen:
                    fh.write(json.dumps(r, ensure_ascii=False) + "\n")
    OUT.write_text(json.dumps({"schema": "index_batch_3_items_v1", "parsed": len(items),
                               "newly_staged": len(new), "items": records}, indent=2), encoding="utf-8")
    print("saved", OUT)
    return {"parsed": len(items), "new": len(new)}


if __name__ == "__main__":
    main()
