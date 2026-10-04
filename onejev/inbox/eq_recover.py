"""Recover a printed equation from a dirty row. Do not rewrite it.

The 4-word gate was wrong. auROC = ... is an equation even when English
sits beside it. theta_i^Bayes = ... is an equation, not a link.

Reject:
- type aliases and status flags
- a truncated left side (L_ij = with no right-hand expression)
- a dangling derivative or an ellipsis that ate the rest
- unbalanced braces

Do not append brain/mind.jsonl. Drain rows are a side file.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

OPS = set("=+-*/^<>≤≥≠≈∑∏∫")
EQ_SPAN = re.compile(
    r"[A-Za-zθμτσα-ωΑ-Ωκ][A-Za-z0-9_θμτσ∂^{},\\\\−\-\(\)]*"
    r"\s*=\s*"
    r"[^\n]+"
)
JSX = re.compile(
    r"(className=|entityId=|style=\{\{|pick=\{|</|/>|--[a-z]|var\(--)",
    re.I,
)
JUNK = re.compile(
    r"^(type\s+\w+\s*=\s*\{|canonicalHistoryStatus\s*=|Add the ternary)",
    re.I,
)
TRUNC_LEFT = re.compile(r"^[A-Za-z_\\]+\s*=\s*$")
DANGLING = re.compile(r"(∂|\\partial)[A-Za-z_\\/]*$|\.\.\.$")


def _balanced(text: str) -> bool:
    return text.count("{") == text.count("}") and text.count("(") == text.count(")")


def recover(raw: str) -> dict:
    text = str(raw or "").strip()
    if not text or JUNK.match(text) or JSX.search(text):
        return {"status": "JUNK", "equation": None, "reason": "alias_heading_or_jsx"}
    if TRUNC_LEFT.match(text) or (text.endswith("=") and not _balanced(text)):
        return {"status": "TRUNCATED", "equation": None, "reason": "empty_rhs"}
    if text.startswith("...") or text.startswith("…"):
        return {"status": "TRUNCATED", "equation": None, "reason": "leading_ellipsis"}
    if DANGLING.search(text) and text.count("=") == 0:
        return {"status": "TRUNCATED", "equation": None, "reason": "dangling"}
    span = EQ_SPAN.search(text)
    if not span:
        return {"status": "JUNK", "equation": None, "reason": "no_equation"}
    equation = span.group(0).strip().rstrip(",")
    if not _balanced(equation) or equation.endswith("...") or equation.endswith("∂"):
        return {"status": "TRUNCATED", "equation": None, "reason": "unbalanced_or_cut"}
    if not any(ch in OPS for ch in equation):
        return {"status": "JUNK", "equation": None, "reason": "no_operator"}
    return {"status": "EQUATION", "equation": equation, "reason": "verbatim_span"}


def drain_row(row: dict) -> dict | None:
    """Side-file shape. Not mind.jsonl. Not a trainer retarget."""
    printed = row.get("printed_equation") or row.get("equation") or ""
    got = recover(printed)
    if got["status"] != "EQUATION":
        return None
    if not row.get("path") and not row.get("source_path"):
        return None
    return {
        "equation": got["equation"],
        "path": row.get("path") or row.get("source_path"),
        "page": row.get("page"),
        "status": "AGREE_RECOVERED",
        "verbatim": got["equation"] in printed,
    }


def write_drain(rows: list[dict], dest: Path) -> dict:
    kept, junk, truncated = [], 0, 0
    seen = set()
    for row in rows:
        got = recover(row.get("printed_equation") or row.get("equation") or "")
        if got["status"] == "JUNK":
            junk += 1
            continue
        if got["status"] == "TRUNCATED":
            truncated += 1
            continue
        item = drain_row(row)
        if not item:
            junk += 1
            continue
        key = (item["path"], item["equation"])
        if key in seen:
            continue
        seen.add(key)
        kept.append(item)
    dest.write_text("".join(json.dumps(r) + "\n" for r in kept), encoding="utf-8")
    return {"kept": len(kept), "junk": junk, "truncated": truncated}


if __name__ == "__main__":
    cases = [
        ("θ_i^Bayes = μ + τ²/(τ²+σ_1i²)", "EQUATION"),
        ("auROC = (1/(n⁻n⁺)) Σᵢ yᵢ sᵢ⁻, with sᵢ⁻ = s", "EQUATION"),
        ("type BrainAnswer = {", "JUNK"),
        ("canonicalHistoryStatus=GREEN", "JUNK"),
        ("L_ij =", "TRUNCATED"),
        ("...∂L_ij/∂θ", "TRUNCATED"),
        ("Add the ternary/proportional-odds head for markets with draws", "JUNK"),
        ("Q(s)=b_{h,L}(s)P(M<s)+b_{v,L}(s)P(M>s)", "EQUATION"),
        ("className=\"bg-[var(--eclipse)] border\" />", "JUNK"),
        ("entityId=&asOf=", "JUNK"),
        ("pick={pick} />", "JUNK"),
        ("style={{ backgroundColor: '#11161F' }} />", "JUNK"),
        ("Q(s)=" + "b_{h,L}(s)+" * 80, "EQUATION"),
    ]
    fail = 0
    for raw, want in cases:
        got = recover(raw)["status"]
        print(("PASS" if got == want else "FAIL"), want, got, raw[:48])
        fail += got != want
    print("fails", fail)
