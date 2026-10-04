# Audit measurements.jsonl -- is the 6,019 real, and how much is table junk?

import json
import os
import random
import re
from collections import Counter

INBOX = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(INBOX, "mind-queue", "measurements.jsonl")
SEED = 31337

# A results-table row: many "+-"/pm markers, or a run of bare decimals.
TABLE = re.compile(r"(?:\u00b1|\\pm|\+/-)")
BARE_DEC = re.compile(r"(?:[+\-]\s*\d+\.\d+)(?:\s+[+\-]\s*\d+\.\d+){4,}")

# A clean measurement: prose or a label with numbers that mean something.
HAS_MEANING = re.compile(
    r"(?:Brier|AUC|auROC|MAE|RMSE|Log\s*Loss|accuracy|precision|recall|F1|ROI|"
    r"Sharpe|PSI|ECE|MCE|CRPS|coverage|calibration|win\s*rate|profit|return|"
    r"drawdown|latency|throughput|pred|obs|base\s*rate|vs\.?|compared|baseline|"
    r"holdout|OOS|out[- ]of[- ]sample|n\s*=\s*\d|\bn\s\d|pred\s+\d|obs\s+\d|"
    r"confidence|CI|95%|p\s*[=<>]\s*0?\.\d)", re.I)


def main():
    rows = [json.loads(l) for l in open(SRC, encoding="utf-8", errors="replace") if l.strip()]
    n = len(rows)
    print("rows: %d\n" % n)

    buckets = Counter()
    for r in rows:
        e = r["equation"]
        pm = len(TABLE.findall(e))
        bare = bool(BARE_DEC.search(e))
        mean = bool(HAS_MEANING.search(e))
        if (pm >= 3 and not mean) or (bare and not mean):
            buckets["table_junk"] += 1
        elif mean and (pm >= 1 or "%" in e or re.search(r"\bn\s*=\s*\d", e)):
            buckets["clean_measurement"] += 1
        elif mean:
            buckets["measurement_no_pm"] += 1
        else:
            buckets["ambiguous"] += 1

    print("%-26s %8s %7s" % ("bucket", "rows", "pct"))
    print("-" * 44)
    for k, v in buckets.most_common():
        print("%-26s %8d %6.1f%%" % (k, v, 100.0 * v / n))
    print("-" * 44)
    print("%-26s %8d %6.1f%%" % ("TOTAL", n, 100.0))

    rng = random.Random(SEED)
    for bucket in ("clean_measurement", "table_junk", "ambiguous", "measurement_no_pm"):
        sel = [r for r in rows if (
            (bucket == "table_junk" and (len(TABLE.findall(r["equation"])) >= 3 or BARE_DEC.search(r["equation"])) and not HAS_MEANING.search(r["equation"]))
            or (bucket == "clean_measurement" and HAS_MEANING.search(r["equation"]) and (len(TABLE.findall(r["equation"])) >= 1 or "%" in r["equation"] or re.search(r"\bn\s*=\s*\d", r["equation"])))
            or (bucket == "ambiguous" and not HAS_MEANING.search(r["equation"]) and len(TABLE.findall(r["equation"])) < 3 and not BARE_DEC.search(r["equation"]))
            or (bucket == "measurement_no_pm" and HAS_MEANING.search(r["equation"]) and len(TABLE.findall(r["equation"])) < 1 and "%" not in r["equation"] and not re.search(r"\bn\s*=\s*\d", r["equation"]))
        )]
        if not sel:
            continue
        print("\n--- %s (n=%d) ---" % (bucket, len(sel)))
        for r in rng.sample(sel, min(6, len(sel))):
            print("   %s" % r["equation"][:118].replace("\n", " "))


if __name__ == "__main__":
    main()