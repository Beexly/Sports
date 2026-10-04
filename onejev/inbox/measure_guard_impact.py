# Measure what the content guard would remove from the REAL pools, before wiring it.
#
# derive_content_guard.py proved the guard kills 7/7 measured leaks and keeps 9/10
# positives. This measures its effect on the pools that actually exist, so the
# decision to wire it in is made with the cost known rather than guessed.
#
# READ-ONLY. Reports only.

import json
import os
import re
import sys
from collections import Counter

INBOX = r"C:\Users\Garrett\onejev\inbox"
Q = os.path.join(INBOX, "mind-queue")
sys.path.insert(0, INBOX)

from derive_content_guard import ANY_URL, looks_like_math, rhs_of  # noqa: E402

POOLS = [
    "agree-drain.jsonl",
    "git-tree-equations.jsonl",
    "arxiv-clean.jsonl",
    "markdown-clean-v3.jsonl",
    "unverified-recoverable.jsonl",
    "corpus-intelligence-clean.jsonl",
    "downloads-research.jsonl",
]

# Junk shapes beyond the 7 measured leaks, seen in these pools.
KEBAB_EQ = re.compile(r"^\s*[a-z]+(?:[-_][a-z0-9]+)+\s*=\s*\S")
SCREAM_EQ = re.compile(r"^\s*[A-Z][A-Z0-9_]{3,}\s*=")
ATTR_EQ = re.compile(r"^\s*[a-z]+-[a-z]+=")
QUOTED_RHS = re.compile(r"=\s*[\"'][^\"']*[\"']\s*$")


def main():
    grand_drop = grand_keep = 0
    samples = []
    for name in POOLS:
        p = os.path.join(Q, name)
        if not os.path.exists(p):
            continue
        drop = keep = 0
        reasons = Counter()
        with open(p, encoding="utf-8", errors="replace") as fh:
            for line in fh:
                if not line.strip():
                    continue
                try:
                    r = json.loads(line)
                except Exception:
                    continue
                eq = str(r.get("equation") or "")
                if not eq:
                    continue
                bad = None
                if ANY_URL.search(eq):
                    bad = "url"
                elif not looks_like_math(rhs_of(eq)):
                    bad = "rhs_not_math"
                elif KEBAB_EQ.search(eq):
                    bad = "kebab_assign"
                elif SCREAM_EQ.search(eq):
                    bad = "screaming_assign"
                elif ATTR_EQ.search(eq):
                    bad = "html_attr"
                elif QUOTED_RHS.search(eq):
                    bad = "quoted_rhs"
                if bad:
                    drop += 1
                    reasons[bad] += 1
                    if len(samples) < 25 and r.get("status") == "EQUATION":
                        samples.append((bad, eq[:90]))
                else:
                    keep += 1
        grand_drop += drop
        grand_keep += keep
        print("%-34s drop %6d   keep %6d   %s" % (
            name, drop, keep, dict(reasons)))
    print("\nTOTAL would drop %d, keep %d  (%.1f%% of rows)" % (
        grand_drop, grand_keep,
        100.0 * grand_drop / max(1, grand_drop + grand_keep)))
    print("\nsample of rows the guard would DROP:")
    for why, eq in samples[:20]:
        print("   %-16s %s" % (why, eq))


if __name__ == "__main__":
    main()