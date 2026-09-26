#!/usr/bin/env python3
"""
NORMALIZER — written down 2026-09-26 so the census is reproducible and the
several numbers that have been floating around can be reconciled.

Census is run over ONE checkout, stated explicitly:

    checkout : /tmp/wtp
    branch   : hermes/wire-papers-2026-09-26
    commit   : aa094062c
    base     : origin/main @ d667351f9

The 7d891ec71 figures quoted alongside this are from a DIFFERENT commit
([hermes-V3] lane). The trees differ, so counts are not expected to match
exactly. Any residual difference must be explained, not averaged away.

--------------------------------------------------------------------------
THE NORMALIZER, exactly, in order
--------------------------------------------------------------------------

RAW HASH (hash 1)
    Input : the entire file, verbatim bytes as read. No transformation.

ALGORITHM HASH (hash 2)   <- the only hash used for bucketing
    Apply to the file text, in this order:
      a. Remove the LEADING BLOCK COMMENT (first /** ... */ span) if present.
         The header carries the arXiv id, the improvement record and the
         acceptance gate. It is metadata, not evidence of what the code does.
      b. Drop lines whose first non-space characters are: nothing (blank),
         "//", "*", or "/*".
      c. Drop every line containing a BACKTICK. These are the ledger template's
         restated acceptance-gate string literals and template strings.
      d. Drop every line matching
             ^(export )?const (ARXIV_ID|LANE|VERDICT|ENABLED|ACCEPTANCE_GATE|DOCTRINE)\b
         These are the per-module attribution constants. They are the ONLY
         thing that differs between members of a stamped group.
      e. Collapse internal whitespace runs to one space; strip each line.
      f. Join with "\n"; md5.

ASSERTION HASH (hash 3)   <- used only for test files
    As hash 2, then additionally:
      g. Keep ONLY lines bearing an assertion: expect(...), assert.*, toBe*,
         toEqual*, toBeCloseTo*, toBeGreaterThan*, toBeLessThan*,
         toHaveLength*, toThrow. Drop describe/it wrappers, imports, mocks,
         setup and fixtures.

Why hash 2 and not hash 1: the 31 tracklet members have 31 distinct RAW
hashes, because each carries its own arXiv id in ARXIV_ID. They have ONE
hash-2 body. Saying "byte-identical" without disclosing that the ids were
removed first overstates the finding. That correction is in the checkpoint.

Why hash 3 exists: a test file's raw bytes differ per paper while its
ASSERTIONS may be identical. A test whose assertions are copied from a sibling
paper's test does NOT meet the bar "a repo test exercises the paper's claim".
Hash 3 is what makes that visible, and it is why the adjudication criterion
was tightened.
"""
import hashlib
import os
import re
import sys

META_CONST = re.compile(r"^(export )?const (ARXIV_ID|LANE|VERDICT|ENABLED|ACCEPTANCE_GATE|DOCTRINE)\b")
LEAD_BLOCK = re.compile(r"\s*/\*\*(.*?)\*/", re.S)

ASSERT_KEEP = re.compile(
    r"\b(expect\s*\(|assert\.|toBe|toEqual|toBeCloseTo|toBeGreaterThan|toBeLessThan|toHaveLength|toThrow)"
)


def raw_hash(path):
    with open(path, "rb") as f:
        return hashlib.md5(f.read()).hexdigest()


def _body_lines(path):
    with open(path, encoding="utf-8", errors="replace") as f:
        t = f.read()
    m = LEAD_BLOCK.match(t)
    return (t[m.end():] if m else t).split("\n")


def _code_lines(path):
    out = []
    for line in _body_lines(path):
        s = line.strip()
        if not s or s.startswith(("//", "*", "/*")):
            continue
        if "`" in s:
            continue
        if META_CONST.match(s):
            continue
        out.append(s)
    return out


def algorithm_hash(path):
    """hash 2 -- steps a-f."""
    body = "\n".join(re.sub(r"\s+", " ", s) for s in _code_lines(path))
    return hashlib.md5(body.encode()).hexdigest()


def assertion_hash(path):
    """hash 3 -- hash 2, then assertion-bearing lines only (step g)."""
    keep = [s for s in _code_lines(path) if ASSERT_KEEP.search(s)]
    body = "\n".join(re.sub(r"\s+", " ", s) for s in keep)
    return hashlib.md5(body.encode()).hexdigest()


if __name__ == "__main__":
    for p in sys.argv[1:]:
        print(os.path.basename(p), raw_hash(p)[:12], algorithm_hash(p)[:12], assertion_hash(p)[:12])
