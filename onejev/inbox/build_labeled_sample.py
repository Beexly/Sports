# Build a HAND-LABELLED sample, then fit and validate a filter on it.
#
# Every classifier this session is a LEXICAL PROXY and every one failed on real
# data: '='-density ranked 21,274 docs of JavaScript as top-yield; rhs_not_math
# ate a real tail sum; kebab_assign flagged q_hat. Proxies are not the fix.
#
# THIS FILE BUILDS THE LABELLED SET a real filter can be fitted and validated
# against. Stage 1 emits a DRAFT plus the STRONGEST prior signal available --
# an LLM verdict from eq_recover, which was trained on these documents. That
# signal is a LABEL PRIOR, not ground truth: the file exists so a human (or a
# stronger judge) can correct it, and so precision/recall can be measured
# against something that is not self-referential.
#
# Writes mind-queue/labeled-sample.jsonl with 600 rows and a CSV sidecar for
# review. Read-only with respect to every pool.

import json
import os
import random
import re
import sys
from collections import Counter

INBOX = os.path.dirname(os.path.abspath(__file__))
Q = os.path.join(INBOX, "mind-queue")
SEED = 20261004
N_PER_POOL = 90

POOLS = [
    "agree-drain.jsonl",
    "git-tree-equations.jsonl",
    "arxiv-clean.jsonl",
    "markdown-clean-v3.jsonl",
    "unverified-recoverable.jsonl",
    "corpus-intelligence-clean.jsonl",
]

# Signals that a row is a statement rather than mathematics.
WEBISH = re.compile(
    r"(https?://|www\.|\]\(|\]\(|className=|style=\{\{|var\(--|=>|\bconst \b|"
    r"\bfunction\b|\bimport \b|\bexport \b|\breturn\b|os\.getenv|await db\.|"
    r"#\d{6}|\bprocess\.env\b)", re.I)
SHOUT = re.compile(r"\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+){1,}\b")
KEBAB = re.compile(r"\b[a-z]+-[a-z]+[a-z0-9-]*\s*=")
CODEY = re.compile(r"(=>|;\s*$|\{\s*$|\}\s*$|\(\)\s*\{|^\s*(?:if|for|while|def|class)\b)")
LATEXY = re.compile(r"\\[A-Za-z]{2,}|\\[a-zA-Z]+\{|\\\\[a-z]+")
SYMBOLIC = re.compile(r"[∑∏∫∂√α-ωΑ-Ω]|_\{[^}]*\}|_\w|\^|[≤≥≈]")


def eq_of(row):
    for k in ("equation", "printed_equation", "norm_a"):
        v = row.get(k)
        if v:
            return str(v)
    return ""


def path_of(row):
    for k in ("source_path", "path", "file"):
        v = row.get(k)
        if v:
            return str(v)
    return ""


def prior(eq):
    """Strongest non-lexical signal available: the gate's own verdict."""
    try:
        sys.path.insert(0, INBOX)
        from eq_recover_ineq import recover
        return recover(eq).get("status", "UNKNOWN")
    except Exception:
        return "UNKNOWN"


def main():
    rng = random.Random(SEED)
    out = []
    stats = Counter()

    for pool in POOLS:
        path = os.path.join(Q, pool)
        if not os.path.exists(path):
            stats["missing_pool"] += 1
            continue
        rows = []
        with open(path, encoding="utf-8", errors="replace") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    r = json.loads(line)
                except Exception:
                    continue
                e = eq_of(r)
                if e:
                    rows.append((e, path_of(r)))
        rng.shuffle(rows)
        take = rows[:N_PER_POOL]
        for eq, src in take:
            v = prior(eq)
            flags = {
                "web": bool(WEBISH.search(eq)),
                "shout": bool(SHOUT.search(eq)),
                "kebab": bool(KEBAB.search(eq)),
                "codey": bool(CODEY.search(eq)),
                "latex": bool(LATEXY.search(eq)),
                "symbolic": bool(SYMBOLIC.search(eq)),
            }
            out.append({
                "pool": pool,
                "equation": eq,
                "source": src,
                "prior": v,
                "flags": flags,
                # empty = needs a human label; fill "MATH" or "JUNK"
                "label": "",
            })
            stats["prior_" + v] += 1
        stats["pool_" + pool] = len(take)

    dest = os.path.join(Q, "labeled-sample.jsonl")
    with open(dest, "w", encoding="utf-8") as fh:
        for r in out:
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")

    csv = os.path.join(INBOX, "_target", "labeled-review.csv")
    os.makedirs(os.path.dirname(csv), exist_ok=True)
    with open(csv, "w", encoding="utf-8", newline="") as fh:
        import csv as _csv
        w = _csv.writer(fh)
        w.writerow(["idx", "pool", "prior", "flags", "equation", "label_MATH_or_JUNK"])
        for i, r in enumerate(out):
            w.writerow([i, r["pool"], r["prior"],
                        "".join(k[0].upper() for k, v in r["flags"].items() if v),
                        r["equation"][:300], ""])

    print("wrote %d rows" % len(out))
    print("  jsonl: %s" % dest)
    print("  csv  : %s" % csv)
    print("\nprior distribution:")
    for k, v in stats.most_common():
        if k.startswith("prior_"):
            print("  %-16s %d" % (k[6:], v))
    print("\nper pool:")
    for k, v in stats.most_common():
        if k.startswith("pool_"):
            print("  %-34s %d" % (k[5:], v))

    # Agreement between the prior and the flag soup -- tells us how much the
    # prior is just re-expressing the lexical proxies.
    agree = Counter()
    for r in out:
        junkish = r["flags"]["web"] or r["flags"]["shout"] or r["flags"]["kebab"]
        mathish = r["flags"]["latex"] or r["flags"]["symbolic"]
        agree[(r["prior"], "junkflags" if junkish else ("mathflags" if mathish else "neither"))] += 1
    print("\nprior vs lexical flags (are they independent?):")
    for k, v in agree.most_common():
        print("  %-22s %d" % (str(k), v))


if __name__ == "__main__":
    main()