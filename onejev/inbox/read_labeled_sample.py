# Read the labelled sample, stratified by the lexical flags.
#
# build_labeled_sample.py's prior was CIRCULAR: it sampled from pools already
# gated to EQUATION, so 540/540 came back EQUATION and the prior just confirmed
# its own filter. This reads actual rows instead, stratified by flag, so the
# real math/junk ratio can be seen rather than assumed.

import json
import os
import random
import sys
from collections import Counter

INBOX = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(INBOX, "mind-queue", "labeled-sample.jsonl")
SEED = 4242


def bucket(r):
    f = r["flags"]
    if f["web"]:
        return "web"
    if f["shout"]:
        return "shout"
    if f["kebab"]:
        return "kebab"
    if f["codey"]:
        return "codey"
    if f["latex"] or f["symbolic"]:
        return "mathflags"
    return "neither"


def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 8
    rows = [json.loads(l) for l in open(SRC, encoding="utf-8", errors="replace") if l.strip()]
    groups = {}
    for r in rows:
        groups.setdefault(bucket(r), []).append(r)

    print("total %d\n" % len(rows))
    for b, rs in sorted(groups.items(), key=lambda kv: -len(kv[1])):
        print("=" * 74)
        print("%s  (n=%d)" % (b.upper(), len(rs)))
        rng = random.Random(SEED)
        for r in rng.sample(rs, min(n, len(rs))):
            print("   [%s] %s" % (r["pool"][:22], r["equation"][:120].replace("\n", "\\n")))

    print("\n" + "=" * 74)
    print("counts by bucket:")
    for b, rs in sorted(groups.items(), key=lambda kv: -len(kv[1])):
        print("  %-10s %4d  (%4.1f%%)" % (b, len(rs), 100.0 * len(rs) / len(rows)))


if __name__ == "__main__":
    main()