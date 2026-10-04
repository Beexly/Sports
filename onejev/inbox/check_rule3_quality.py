# Does rule 3 still let BARE EQUATIONS into the measurement bucket?
#
# The n= uncertainty token used to match SUBSCRIPTS (t_n, f*=b/sigma^2), so
# 'P_ruin(M) = Sum ... (1-eta_j)' was accepted as a measurement. Fixed by
# requiring n= to be a standalone count. This verifies the fix.

import json
import re

TQ = r"C:\Users\Garrett\onejev\inbox\night\trace-queue.jsonl"
PRICED = r"C:\Users\Garrett\onejev\inbox\mind-queue\measurements-priced.jsonl"

RESULT = re.compile(
    r"(p\s*[=<>]\s*0?\.|\bCI\b|\bSE\b|\bSD\b|\bMAE\b|\bRMSE\b|\d+\s*%\s*CI|"
    r"\u00b1|\\pm|\bn\s*=\s*\d|\u03b7\u00b2|coverage|ROI|Brier|AUC|MAE|"
    r"statistic|replications|simulation|holdout|walk-forward|"
    r"correlation|p-value|two-tailed|significant|confidence)", re.I)
EROW = re.compile(r"\bERO\s*\(", re.I)
ERRW = re.compile(r"\berrors?\b", re.I)


def main():
    rows = [json.loads(l) for l in open(TQ, encoding="utf-8", errors="replace") if l.strip()]
    meas = [r for r in rows if r.get("kind") == "measurement"]
    eqs = [r for r in rows if r.get("kind") == "equation"]

    bare = [r for r in meas if not RESULT.search(r["equation"])]
    ero = [r for r in meas if EROW.search(r["equation"]) and not ERRW.search(r["equation"])]

    print("trace-queue rows      : %d  (equation %d / measurement %d)"
          % (len(rows), len(eqs), len(meas)))
    print("measurements with no result token : %d" % len(bare))
    print("measurements that are ERO-only   : %d" % len(ero))
    for r in bare[:8]:
        print("   BARE? %s" % r["equation"][:100].replace("\n", " "))

    priced = [json.loads(l) for l in open(PRICED, encoding="utf-8", errors="replace") if l.strip()]
    pb = [r for r in priced if not RESULT.search(r["equation"])]
    pe = [r for r in priced if EROW.search(r["equation"]) and not ERRW.search(r["equation"])]
    print("\npriced export rows    : %d" % len(priced))
    print("  no result token     : %d" % len(pb))
    print("  ERO-only            : %d" % len(pe))
    for r in pb[:6]:
        print("   ? %s" % r["equation"][:100].replace("\n", " "))

    ok = not bare and not ero and not pe
    print("\nVERDICT: %s" % ("CLEAN" if ok else "REVIEW NEEDED"))


if __name__ == "__main__":
    main()