# The corpus has TWO diseases and I only ever treated one.
#
# DISEASE 1 (what I chased all session): junk leaking in -- 'aria-live="polite"',
# 'priced=true', tracking pixels. Every fix I attempted was a FILTER.
#
# DISEASE 2 (found only by reading rows): VALUABLE CONTENT INVISIBLE TO EVERY
# PROXY. Measured on an 1,800-row stratified sample: 207 rows (11.5%) match none
# of web/shout/kebab/codey/latex/symbolic, and 98 of those are MEASUREMENTS --
# Brier scores, correlations, p-values, sample sizes. In
# corpus-intelligence-clean it is 29.0%.
#
# Those rows are exactly what an engine needs (calibration evidence, effect
# sizes) and every classifier I wrote scores them as noise because they carry no
# operator, no LaTeX and no Greek. The corruption-level filtering was also
# destroying them: the guard that ate 'sum_{i=1}^{+\infty} Pr(X=i) <= c' would
# have taken most of this class with it.

import json
import os
import random
import re
from collections import Counter

INBOX = os.path.dirname(os.path.abspath(__file__))
Q = os.path.join(INBOX, "mind-queue")
SEED = 4242
PER_POOL = 600

WEBISH = re.compile(r"(https?://|www\.|\]\(|className=|style=\{\{|var\(--|=>|\bconst \b|"
                    r"\bfunction\b|\bimport \b|\bexport \b|os\.getenv|await db\.|#\d{6})", re.I)
SHOUT = re.compile(r"\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+){1,}\b")
KEBAB = re.compile(r"\b[a-z]+-[a-z]+[a-z0-9-]*\s*=")
CODEY = re.compile(r"(=>|;\s*$|\{\s*$|\}\s*$|\(\)\s*\{)")
LATEXY = re.compile(r"\\[A-Za-z]{2,}|\\[a-zA-Z]+\{|\\\\[a-z]+")
SYMBOLIC = re.compile(r"[\u2211\u220f\u222b\u2202\u221a\u03b1-\u03c9\u0391-\u03a9]|_\{[^}]*\}|_\w|\^|[\u2264\u2265\u2248]")

MEASURE = re.compile(
    r"(?:\brho\s*=|\br\s*=|\bp\s*[=<>]|Brier|AUC|auROC|MAE|RMSE|Log ?Loss|"
    r"R\^2|R\u00b2|\bn\s*=\s*\d|\d+\.\d+%|\bCI\b|95%|standard error|\bse\s*[=(]|"
    r"SD\s*=|std\s*=|\bp-value\b)", re.I)


def eq_of(r):
    for k in ("equation", "printed_equation", "norm_a"):
        v = r.get(k)
        if v:
            return str(v)
    return ""


def pool_of(r):
    return r.get("pool", "")


def visible(e):
    return bool(WEBISH.search(e) or SHOUT.search(e) or KEBAB.search(e)
                or CODEY.search(e) or LATEXY.search(e) or SYMBOLIC.search(e))


def main():
    rng = random.Random(SEED)
    src = os.path.join(Q, "labeled-sample.jsonl")
    if not os.path.exists(src):
        raise SystemExit("run build_labeled_sample.py first")

    rows = [json.loads(l) for l in open(src, encoding="utf-8", errors="replace") if l.strip()]

    # Re-draw a wider stratified sample so the estimate is not from 540 rows.
    wide = []
    for pool in sorted({r["pool"] for r in rows}):
        path = os.path.join(Q, pool)
        if not os.path.exists(path):
            continue
        got = []
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
                    got.append((e, r.get("path") or r.get("source_path") or ""))
        rng.shuffle(got)
        wide.extend({"equation": e, "source": s, "pool": pool} for e, s in got[:PER_POOL])

    inv = [r for r in wide if not visible(r["equation"])]
    meas = [r for r in inv if MEASURE.search(r["equation"])]

    by_pool = Counter(r["pool"] for r in wide)
    inv_pool = Counter(r["pool"] for r in inv)
    meas_pool = Counter(r["pool"] for r in meas)

    print("%-34s %8s %9s %9s %8s %9s" % ("pool", "sampled", "invisible", "measured", "inv %", "meas %"))
    print("-" * 86)
    for p in sorted(by_pool):
        n = by_pool[p]
        i = inv_pool.get(p, 0)
        m = meas_pool.get(p, 0)
        print("%-34s %8d %9d %9d %7.1f%% %8.1f%%" % (
            p[:34], n, i, m, 100.0 * i / n, 100.0 * m / n))
    n = len(wide)
    print("-" * 86)
    print("%-34s %8d %9d %9d %7.1f%% %8.1f%%" % (
        "TOTAL", n, len(inv), len(meas), 100.0 * len(inv) / n, 100.0 * len(meas) / n))

    print("\n--- 14 invisible rows that ARE measurements ---")
    for r in meas[:14]:
        print("   [%s] %s" % (r["pool"][:20], r["equation"][:110].replace("\n", " ")))

    dest = os.path.join(Q, "proxy-invisible.jsonl")
    with open(dest, "w", encoding="utf-8") as fh:
        for r in inv:
            fh.write(json.dumps({
                "equation": r["equation"], "source": r["source"], "pool": r["pool"],
                "looks_like_measurement": bool(MEASURE.search(r["equation"])),
            }, ensure_ascii=False) + "\n")
    print("\nwrote %d invisible rows to %s" % (len(inv), dest))


if __name__ == "__main__":
    main()