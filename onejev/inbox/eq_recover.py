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
# Leading class must cover every script the corpus actually uses:
#   A-Za-z              ASCII identifiers
#   α-ω Α-Ω κ           Greek + the kappa already used
#   \u0100-\u017F       Latin Extended-A: Ĉ L̂ Ŵ Ś Ž  (accents compose onto math)
#   \u1D400-\u1D7FF     Mathematical Alphanumeric Symbols: 𝐪 𝜃 𝐗 𝔼
#   \u0370-\u03FF       Greek Extended
#   Ā-ſ               Latin Extended-B
# Without these the span anchors mid-string, the opener is dropped, and a
# complete equation is misfiled as TRUNCATED.
EQ_SPAN = re.compile(
    r"[A-Za-z\u0100-\u017F\u0370-\u03ff\u1d400-\u1d7ffθμτσκ]"
    r"[A-Za-z0-9_\u0100-\u017f\u0370-\u03ff\u1d400-\u1d7ffθμτσ∂^{},\\\\−\-\(\)\u0300-\u036f]*"
    r"\s*=\s*"
    r"[^\n]+"
)
PROSE_CUT = re.compile(r",?\s+\b(?:with|where|for|if|when|which|that)\b", re.I)
JSX = re.compile(
    r"(className=|entityId=|style=\{\{|pick=\{|</|/>|--[a-z]|var\(--|href=|=>)",
    re.I,
)
CODE = re.compile(r"^\s*(?:const|function|import|export|return|class)\b", re.I)
JUNK = re.compile(
    r"^(type\s+\w+\s*=\s*\{|canonicalHistoryStatus\s*=|Add the ternary)",
    re.I,
)
TRUNC_LEFT = re.compile(r"^[A-Za-z_\\]+\s*=\s*$")
DANGLING = re.compile(r"(∂|\\partial)[A-Za-z_\\/]*$|\.\.\.$")


SIZING = re.compile(
    r"\\(?:left|right|bigl|bigr|Bigl|Bigr|biggl|biggr|Biggl|Biggr|big|Big|bigg|Bigg)"
    r"(?:\\[{}]|\\langle|\\rangle|\\lvert|\\rvert|\\vert|\.|[()[\]|<>])"
)


def _balanced(text: str) -> bool:
    """Ignore LaTeX sizing delimiters. \\left\\{ ... \\right. is a matched pair."""
    cleaned = SIZING.sub("", text)
    return (
        cleaned.count("{") == cleaned.count("}")
        and cleaned.count("(") == cleaned.count(")")
        and cleaned.count("[") == cleaned.count("]")
    )


# The original narrow pattern, kept so a widened match can never REGRESS a row
# that used to classify correctly.
EQ_SPAN_NARROW = re.compile(
    r"[A-Za-zθμτσα-ωΑ-Ωκ][A-Za-z0-9_θμτσ∂^{},\\\\−\-\(\)]*"
    r"\s*=\s*"
    r"[^\n]+"
)


def _pick_span(text: str):
    """Prefer the narrow match when it is balanced; else take the widened one.

    Measured on the 32,778 AGREE rows: widening alone gave +1,820 and +1,758
    gains but -358 regressions. Narrow-first makes the losses impossible while
    keeping every gain.
    """
    narrow = EQ_SPAN_NARROW.search(text)
    if narrow:
        candidate = narrow.group(0).strip().rstrip(",")
        cut = PROSE_CUT.search(candidate)
        if cut:
            candidate = candidate[: cut.start()].rstrip(" ,")
        if candidate and _balanced(candidate):
            return narrow
    wide = EQ_SPAN.search(text)
    return wide


def recover(raw: str) -> dict:
    text = str(raw or "").strip()
    if not text or JUNK.match(text) or JSX.search(text) or CODE.match(text):
        return {"status": "JUNK", "equation": None, "reason": "alias_heading_or_jsx"}
    if TRUNC_LEFT.match(text) or (text.endswith("=") and not _balanced(text)):
        return {"status": "TRUNCATED", "equation": None, "reason": "empty_rhs"}
    if text.startswith("...") or text.startswith("…"):
        return {"status": "TRUNCATED", "equation": None, "reason": "leading_ellipsis"}
    if DANGLING.search(text) and text.count("=") == 0:
        return {"status": "TRUNCATED", "equation": None, "reason": "dangling"}
    span = _pick_span(text)
    if not span:
        return {"status": "JUNK", "equation": None, "reason": "no_equation"}
    equation = span.group(0).strip().rstrip(",")
    cut = PROSE_CUT.search(equation)
    if cut:
        equation = equation[: cut.start()].rstrip(" ,")
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
    kept, junk, truncated, dups, jsx_dropped = [], 0, 0, 0, 0
    seen = set()
    for row in rows:
        printed = row.get("printed_equation") or row.get("equation") or ""
        if JSX.search(str(printed)) or CODE.match(str(printed).strip()):
            jsx_dropped += 1
            continue
        got = recover(printed)
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
            dups += 1
            continue
        seen.add(key)
        kept.append(item)
    dest.write_text("".join(json.dumps(r) + "\n" for r in kept), encoding="utf-8")
    return {"kept": len(kept), "junk": junk, "truncated": truncated, "dups": dups, "jsx_dropped": jsx_dropped}


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
        ("const Q = 1", "JUNK"),
        ("let x = 1", "EQUATION"),
        ("Q(s)=" + "b_{h,L}(s)+" * 80, "EQUATION"),
        (r"\hat{C}(p)=\sigma\left(a\cdot logit(p)+b\right)", "EQUATION"),
        (r"\ell(\beta)=\sum_{i<j}\left[y_{ij}\log p_{ij}+(1-y_{ij})\log(1-p_{ij})\right]", "EQUATION"),
        (r"P=\left\{x \mid x>0 \right.", "EQUATION"),
        ("f(x)=(a+b", "TRUNCATED"),
    ]
    fail = 0
    for raw, want in cases:
        got = recover(raw)["status"]
        print(("PASS" if got == want else "FAIL"), want, got, raw[:48])
        fail += got != want
    print("fails", fail)
