"""Split the stale rows into TRULY stale vs falsely rejected, before writing.

gate_all_pools.py says 13,846 rows disagree with the current gate. Reading the
samples shows at least three distinct causes, and they need opposite treatment:

  A. GENUINELY STALE  - cut mid-expression ('\\sum\\limits_{i=1}^{n}\\frac{x_{i}'),
     unbalanced, ends on an operator. These pools were written before the cap
     fix and should be set aside.
  B. FALSE REJECTION - the equation is complete but eq_recover cannot anchor it,
     because EQ_SPAN's leading class is [A-Za-z...\\u03b1-\\u03c9...]. A span
     starting '\\bigl(', '\\left[', '\\eta_{j}' or a Greek letter outside that
     range never matches. 'bigr(C_\\lambda(R),...\\bigr)' is COMPLETE.

Count B separately. If B is large, the fix is EQ_SPAN's character class (which
also cost the drain ~3.2k rows earlier), not deleting rows.
"""
import json
import os
import re
import sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from eq_recover_ineq import recover  # noqa: E402

Q = os.path.join(HERE, "mind-queue")
POOLS = ["arxiv-clean.jsonl", "markdown-clean-v3.jsonl",
         "unverified-recoverable.jsonl", "corpus-intelligence-clean.jsonl",
         "downloads-research.jsonl", "git-tree-equations.jsonl"]

BAL = lambda s: (s.count("{") == s.count("}") and s.count("(") == s.count(")")
              and s.count("[") == s.count("]"))

# Does the row already LOOK like a complete equation, independent of EQ_SPAN?
REL = re.compile(r"(?<![<>!=])=(?![=><])")
OPAQUE_START = re.compile(r"^\s*(?:\\\\(?:bigl|Bigl|bigl|bigg|Bigg|left|right|displaystyle|sum|prod|lim|mathbb|eta|hat|bar|mathbf)\b)")


def looks_complete(eq):
    t = eq.strip()
    if len(t) < 12 or len(t) > 4000:
        return False
    if not REL.search(t) and not re.search(r"[\u2264\u2265\u2260\u2248\u2192\u21d2]", t):
        return False
    if not BAL(t):
        # \bigl( ... \bigr) is balanced in LaTeX but not in raw brackets
        if t.count(r"\bigl(") != t.count(r"\bigr)") or t.count(r"\Bigl(") != t.count(r"\Bigr)"):
            return False
    if re.search(r"[=<>,\\]$", t):
        return False
    if len(re.findall(r"[A-Za-z]{4,}", t)) > 6:
        return False
    return True


tot = Counter()
examples = {"complete_but_rejected": [], "genuinely_stale": []}
for pool in POOLS:
    path = os.path.join(Q, pool)
    if not os.path.exists(path):
        continue
    c = Counter()
    with open(path, encoding="utf-8", errors="replace") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("corpus-roots:"):
                continue
            try:
                r = json.loads(line)
            except Exception:
                c["unparseable"] += 1
                continue
            eq = r.get("equation") or r.get("printed_equation") or ""
            if not eq or recover(eq)["status"] == "EQUATION":
                continue
            if looks_complete(eq):
                c["complete_but_rejected"] += 1
                if len(examples["complete_but_rejected"]) < 8:
                    examples["complete_but_rejected"].append(eq[:110])
            else:
                c["genuinely_stale"] += 1
                if len(examples["genuinely_stale"]) < 6:
                    examples["genuinely_stale"].append(eq[:110])
    print(f"{pool:<34}{c['complete_but_rejected']:>8}{c['genuinely_stale']:>9}{c['unparseable']:>6}")
    tot.update(c)

print(f"\n{'TOTAL':<34}{tot['complete_but_rejected']:>8}{tot['genuinely_stale']:>9}{tot['unparseable']:>6}")
print("\n--- COMPLETE but rejected (EQ_SPAN cannot anchor) ---")
for e in examples["complete_but_rejected"]:
    print("  ", repr(e))
print("\n--- genuinely stale ---")
for e in examples["genuinely_stale"]:
    print("  ", repr(e))