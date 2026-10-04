"""Apply the CURRENT gate to every pool, so no artifact disagrees with any other.

THE PROBLEM THIS SOLVES
Four pools (arxiv-clean, markdown-clean-v3, unverified-recoverable, corpus-
intelligence-clean) were produced BEFORE eq_recover gained its inequality path,
so they still hold rows the current gate rejects. agree-drain and
git-tree-equations were rebuilt after, so they do not. Six pools, two different
gate versions, one directory. Nothing enforced consistency.

THE RULE
Every row must be EQUATION under the gate that build_drain currently uses
(eq_recover_ineq). Rows that are not are moved aside into <pool>.stale.jsonl,
never deleted -- the earlier 357-row incident was caused by deleting rows that
were correct under the rule in force when they were written.

  python gate_all_pools.py            # report only
  python gate_all_pools.py --apply    # write the filtered pools + .stale files
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
Q = os.path.join(HERE, "mind-queue")
sys.path.insert(0, HERE)

# The gate in force, resolved from the writer rather than hardcoded.
from eq_recover_ineq import recover  # noqa: E402

POOLS = [
    "agree-drain.jsonl",
    "git-tree-equations.jsonl",
    "arxiv-clean.jsonl",
    "markdown-clean-v3.jsonl",
    "unverified-recoverable.jsonl",
    "corpus-intelligence-clean.jsonl",
    "downloads-research.jsonl",
]


def eq_of(row):
    for k in ("equation", "printed_equation"):
        v = row.get(k)
        if v:
            return v
    return ""


def main(apply_changes):
    total_in = total_kept = total_stale = 0
    print(f"gate: {recover.__module__}")
    print(f"{'pool':<34}{'in':>9}{'kept':>9}{'stale':>8}")
    for name in POOLS:
        path = os.path.join(Q, name)
        if not os.path.exists(path):
            print(f"{name:<34}  MISSING")
            continue
        kept, stale = [], []
        n = 0
        with open(path, encoding="utf-8", errors="replace") as fh:
            for line in fh:
                line = line.strip()
                if not line or line.startswith("corpus-roots:"):
                    continue
                try:
                    r = json.loads(line)
                except Exception:
                    stale.append({"_raw": line[:200]})
                    n += 1
                    continue
                n += 1
                eq = eq_of(r)
                if eq and recover(eq)["status"] == "EQUATION":
                    kept.append(line)
                else:
                    stale.append(r)
        total_in += n
        total_kept += len(kept)
        total_stale += len(stale)
        print(f"{name:<34}{n:>9}{len(kept):>9}{len(stale):>8}")
        if apply_changes and stale:
            with open(path + ".stale.jsonl", "w", encoding="utf-8") as out:
                for r in stale:
                    out.write(json.dumps(r, ensure_ascii=False) + "\n")
            with open(path, "w", encoding="utf-8") as out:
                for line in kept:
                    out.write(line + "\n")
    print(f"{'TOTAL':<34}{total_in:>9}{total_kept:>9}{total_stale:>8}")
    if not apply_changes:
        print("\nreport only -- rerun with --apply to write")
    return 0


if __name__ == "__main__":
    raise SystemExit(main("--apply" in sys.argv))