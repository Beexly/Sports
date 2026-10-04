"""Fail-closed corpus gate. A row count is not a quality measure.

Hermes measure_git_tree_contamination.py called a row weak_math if it
contained '='. That is how 99% clean and 56% real math were the same file.
This gate keeps only a recovered equation that is not web furniture,
not binary, and not under the Turner quarantine.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from eq_recover import recover

QUARANTINE = "03_quarantine_DO_NOT_INGEST"
NOISE = re.compile(
    r"(https?://|www\.|\.com/|src=|href=|class=|similarcdn|similarweb|"
    r"Start a trial|Sign up|Subscribe|facebook\.com/tr)",
    re.I,
)
SPAN_CAP = 220


def looks_binary(text: str) -> bool:
    if not text:
        return True
    bad = sum(1 for c in text if c == "\ufffd" or ord(c) < 9 or 14 <= ord(c) < 32)
    return bad / len(text) > 0.05


def classify(equation: str, path: str = "") -> str:
    if QUARANTINE in path.replace("\\", "/"):
        return "quarantine"
    if looks_binary(equation):
        return "binary_mojibake"
    if NOISE.search(equation):
        return "web_furniture"
    got = recover(equation)
    if got["status"] == "EQUATION":
        return "real_math"
    if got["status"] == "TRUNCATED":
        return "truncated"
    return "junk"


def span_cut(text: str, cap: int = SPAN_CAP) -> str:
    """The defect arxiv_extract.py had. Kept only so the test can show it."""
    return text[:cap]


def rebuild(rows: list[dict]) -> dict:
    kept = []
    seen = set()
    counts: dict[str, int] = {}
    for row in rows:
        equation = str(row.get("equation") or row.get("printed_equation") or "")
        path = str(row.get("path") or "")
        label = classify(equation, path)
        counts[label] = counts.get(label, 0) + 1
        if label != "real_math":
            continue
        got = recover(equation)
        item = got["equation"]
        if len(item) > SPAN_CAP:
            counts["over_cap_kept"] = counts.get("over_cap_kept", 0) + 1
        key = (path, item)
        if key in seen:
            counts["dups"] = counts.get("dups", 0) + 1
            continue
        seen.add(key)
        kept.append({"equation": item, "path": path, "page": row.get("page"), "status": "EQUATION"})
    return {"kept": kept, "counts": counts}


def write_pool(rows: list[dict], dest: Path) -> dict:
    built = rebuild(rows)
    dest.write_text("".join(json.dumps(r) + "\n" for r in built["kept"]), encoding="utf-8")
    return {"rows": len(built["kept"]), "counts": built["counts"], "path": str(dest)}
