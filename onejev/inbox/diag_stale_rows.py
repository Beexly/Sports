"""Why does arxiv-clean.jsonl have 7,070 rows the gate rejects?

gate_all_pools.py reported arxiv-clean at 7,070 stale -- 22% of the pool. That
pool went through clean_arxiv_prose.py, which does NOT import eq_recover at all;
it has its own acceptable(). So the two gates were never compared.

This samples the rejected rows and classifies WHY, so I know whether the gate is
right (and the pool is stale) or the gate is wrong (and the pool is fine)."""
import json
import os
import random
import sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from eq_recover_ineq import recover  # noqa: E402

Q = os.path.join(HERE, "mind-queue")

for POOL in ("arxiv-clean.jsonl", "markdown-clean-v3.jsonl", "unverified-recoverable.jsonl"):
    stale = []
    with open(os.path.join(Q, POOL), encoding="utf-8", errors="replace") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("corpus-roots:"):
                continue
            try:
                r = json.loads(line)
            except Exception:
                continue
            eq = r.get("equation") or r.get("printed_equation") or ""
            if eq and recover(eq)["status"] != "EQUATION":
                stale.append((r, eq))

    reasons = Counter(recover(eq)["reason"] for _r, eq in stale)
    print(f"\n=== {POOL}: {len(stale)} stale ===")
    for k, v in reasons.most_common():
        print(f"   {v:>6}  {k}")

    random.seed(11)
    for r, eq in random.sample(stale, min(6, len(stale))):
        print(f"   [{recover(eq)['reason']}] {eq[:120]!r}")