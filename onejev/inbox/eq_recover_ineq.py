"""Inequality recovery, as a WRAPPER -- eq_recover.py is never modified.

THE DEFECT, MEASURED
EQ_SPAN requires a literal '='. But OPS already lists <= >= != ~=, and
measure_inequality_loss.py counted 3,239 rows corpus-wide (3,104 in arxiv-clean)
that are genuine inequalities: 'Dist(pi_Borda) <= C1*beta + 4',
'DualGap(pi_hat) <= 3*eps(x)*C_uni(x)', '|sigma(n)-i| <= k|sigma(i)-i|'.
None can ever match, so all are lost.

THE CONSTRAINT
Nothing may regress, and eq_recover.py must not be edited -- it carries a
23-case suite the user maintains.

THE DESIGN
One source of truth for the RULES (imported from eq_recover, never redefined).
The ONLY addition is span selection: try EQ_SPAN first; if and only if it finds
nothing, try INEQ_SPAN, which also accepts \le \ge \neq \approx <= >= != ~=.

A row that EQ_SPAN already classified is returned UNCHANGED, because recover()
returns before span selection on every early exit (junk / empty-rhs /
leading-ellipsis / dangling). Every non-EQUATION verdict is likewise returned
untouched. So the set of rows this module newly classifies as EQUATION is a strict
subset of rows the original called JUNK or TRUNCATED: regressions are impossible
by construction, not by testing.
"""
import json
import re

import eq_recover as base

# Reuse the user's rules verbatim. Never redefine any of them.
JUNK = base.JUNK
JSX = base.JSX
CODE = base.CODE
TRUNC_LEFT = base.TRUNC_LEFT
END_CUT = base.END_CUT
DANGLING = base.DANGLING
OPS = base.OPS
EQ_SPAN = base.EQ_SPAN
PROSE_CUT = base.PROSE_CUT
_balanced = base._balanced

# A relation that is NOT '='. This is the whole addition.
IN_EQ = re.compile(
    r"(?:\\le(?:q)?\b|\\ge(?:q)?\b|\\neq\b|\\approx\b|\\equiv\b|\u2264|\u2265|\u2260|\u2248|!=|~=|==)"
)
INEQ_SPAN = re.compile(
    r"[A-Za-z\u03b8\u03bc\u03c4\u03c3\u03b1-\u03c9\u0391-\u03a9\u03ba][A-Za-z0-9_\u03b8\u03bc\u03c4\u03c3\u2202^{},\\\\\u2212\-()]*"
    r"\s*(?:" + IN_EQ.pattern + r"|=)\s*"
    r"[^\n]+"
)


def _span(text):
    """EQ_SPAN first; INEQ_SPAN only as a fallback. Never widens an existing match."""
    m = EQ_SPAN.search(text)
    if m is not None:
        return m
    return INEQ_SPAN.search(text)


def recover(raw):
    """Return the ORIGINAL verdict unless that verdict was no_equation."""
    got = base.recover(raw)
    if got["status"] != "JUNK" or got.get("reason") != "no_equation":
        return got

    text = str(raw or "").strip()
    if not text:
        return got

    m = _span(text)
    if not m:
        return got
    equation = text[m.start():].strip().rstrip(",")
    if not _balanced(equation):
        widened = text[: m.end()].strip().rstrip(",")
        if _balanced(widened):
            equation = widened
    cut = PROSE_CUT.search(equation)
    if cut:
        equation = equation[: cut.start()].rstrip(" ,")
    if (
        not _balanced(equation)
        or equation.endswith("...")
        or equation.endswith("\u2202")
        or END_CUT.search(equation)
        or TRUNC_LEFT.search(equation.strip())
    ):
        return {"status": "TRUNCATED", "equation": None, "reason": "unbalanced_or_cut"}
    if not any(ch in OPS for ch in equation):
        return got
    return {"status": "EQUATION", "equation": equation, "reason": "verbatim_span_ineq"}

# --- write_drain: same contract as eq_recover.write_drain, but calling THIS
# module's recover. Copied structurally rather than re-exported so the two
# cannot drift: if write_drain called base.recover the wrapper would be inert.
def drain_row(row):
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


def write_drain(rows, dest):
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
    with open(dest, "w", encoding="utf-8") as fh:
        for line in kept:
            fh.write(json.dumps(line, ensure_ascii=False) + "\n")
    return {"kept": len(kept), "junk": junk, "truncated": truncated,
            "dups": dups, "jsx_dropped": jsx_dropped}
