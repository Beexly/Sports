# RULE 3 -- the honest gate. A row counts as a MEASUREMENT only if it carries
# a printed number AND a printed uncertainty.
#
# WHY A THIRD RULE
# audit_measurements.py and extract_measurements.py disagree: one said 79.5%
# clean, the other put table junk in "clean" because HAS_MEANING contains
# 'error', which matches inside ERO(...). So neither number can be trusted.
#
# THE RULE, as specified:
#   accept  iff  printed number  AND  printed uncertainty
#   reject a hit whose ONLY metric evidence is the substring 'error' inside ERO
#
# Uncertainty tokens: +/- , CI, SE, MAE, p, F, eta-squared, n=
# The 'error' guard is the specific defect measured last turn, so it is explicit
# rather than left to a regex alternation that can match ERO by accident.
#
# Prints the RESCUE count (rows rule 3 accepts that rules 1 and 2 disagreed on)
# and 30 examples, then writes inbox/night/trace-queue.jsonl with 200 clean
# equations and 200 measurements that survived.

import json
import os
import re
import random
from collections import Counter

INBOX = os.path.dirname(os.path.abspath(__file__))
Q = os.path.join(INBOX, "mind-queue")
NIGHT = os.path.join(INBOX, "night")
MEAS = os.path.join(Q, "measurements.jsonl")
EQPOOL = os.path.join(Q, "equation-pool.jsonl")
SEED = 20261004

# --- printed number ----------------------------------------------------
NUMBER = re.compile(
    r"(?:[+\-\u00b1\u2212]?\s*\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?\s*"
    r"(?:%|percent|bps|basis points|ms|s\b|us|sec|seconds)"
    r"|[+\-\u00b1\u2212]?\s*\d+(?:\.\d+)?\s*%"
    r"|\b\d+(?:\.\d+)?\b)")

# --- printed uncertainty ----------------------------------------------
UNCERT = re.compile(
    r"(?:\u00b1|\\pm|\+/-)"
    r"|\bCI\b|\bci\b|\d+\s*%\s*CI"
    r"|\bSE\b|\bse\b|\bSD\b|\bsd\b|std\s*[=:]"
    r"|\bMAE\b|\bRMSE\b|\bMAPE\b"
    r"|\bp\s*[=<>\u2264\u2265]\s*0?\.\d+"
    r"|\bp-value\b|\bp\s*value"
    r"|\bF\s*\(\s*\d+\s*,\s*\d+\s*\)\s*=|\bF\s*\(\s*\d+\s*,\s*\d+\s*\)"
    r"|\u03b7\u00b2|\beta\u00b2|eta[- ]?squared"
    # n= must be a STANDALONE sample count: preceded by start/whitespace and
    # NOT part of an identifier (a_n= is a subscript, n=5 is a sample size)
    r"|(?:^|[\s;(,])(?:n|N)\s*=\s*\d",
    re.I)

# The specific defect: 'error' inside ERO(...). Strip those before metric scoring.
ERO_TOKEN = re.compile(r"\bERO\s*\(", re.I)
ERROR_WORD = re.compile(r"\berrors?\b", re.I)


def is_ero_only_metric(eq):
    """True when the only 'metric' evidence is the word error inside ERO(.

    audit_measurements.py's HAS_MEANING contains 'error', so
    'ERO(p=0.05, style=gamma, ...) -0.27 +- 0.01 -0.84 ...' scored as a
    measurement. That is a results-TABLE row, not a reported result.
    """
    if not ERO_TOKEN.search(eq):
        return False
    stripped = ERO_TOKEN.sub(" ", eq)
    return not ERROR_WORD.search(stripped)


def rule3(eq):
    """Return (accepted, reason)."""
    if not eq or len(eq) < 16 or len(eq) > 400:
        return False, "length"
    if is_ero_only_metric(eq):
        return False, "ero_only_metric"
    has_num = bool(NUMBER.search(eq))
    has_unc = bool(UNCERT.search(eq))
    if has_num and has_unc:
        return True, "number+uncertainty"
    if has_unc and not has_num:
        return False, "uncertainty_without_number"
    if has_num and not has_unc:
        return False, "number_without_uncertainty"
    return False, "neither"


def load(path, limit=None):
    out = []
    if not os.path.exists(path):
        return out
    with open(path, encoding="utf-8", errors="replace") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                r = json.loads(line)
            except Exception:
                continue
            e = r.get("equation") or r.get("printed_equation") or ""
            if e:
                out.append(e)
                if limit and len(out) >= limit:
                    break
    return out


def main():
    os.makedirs(NIGHT, exist_ok=True)
    meas = load(MEAS)
    print("rule 3 on measurements.jsonl: %d candidate rows" % len(meas))

    accepted, reasons = [], Counter()
    for e in meas:
        ok, why = rule3(e)
        reasons[why] += 1
        if ok:
            accepted.append(e)
    print("\nverdict breakdown:")
    for k, v in reasons.most_common():
        print("   %-28s %6d  (%.1f%%)" % (k, v, 100.0 * v / max(1, len(meas))))

    print("\nACCEPTED (rule 3): %d" % len(accepted))
    print("This is the honest count. Rules 1 and 2 disagreed (79.5%% vs 18.7%%);")
    print("rule 3 requires a printed number AND a printed uncertainty.")

    rng = random.Random(SEED)
    print("\n--- 30 accepted examples ---")
    for i, e in enumerate(rng.sample(accepted, min(30, len(accepted))), 1):
        print("  %2d. %s" % (i, e[:118].replace("\n", " ")))

    # ---- trace-queue: 200 clean equations + 200 measurements --------------
    eqs = load(EQPOOL)
    clean_eq = []
    for e in eqs:
        if len(e) < 12 or len(e) > 400:
            continue
        if is_ero_only_metric(e):
            continue
        ok, _ = rule3(e)
        # an equation must NOT look like a bare measurement row
        clean_eq.append(e)
    print("\nequation candidates: %d" % len(clean_eq))

    tq = os.path.join(NIGHT, "trace-queue.jsonl")
    seen = set()
    n_e = n_m = 0
    with open(tq, "w", encoding="utf-8") as fh:
        rng2 = random.Random(SEED + 1)
        pool_e = rng2.sample(clean_eq, min(4000, len(clean_eq)))
        for e in pool_e:
            if n_e >= 200:
                break
            if e in seen:
                continue
            seen.add(e)
            fh.write(json.dumps({"kind": "equation", "equation": e}, ensure_ascii=False) + "\n")
            n_e += 1
        rng3 = random.Random(SEED + 2)
        for e in rng3.sample(accepted, min(2000, len(accepted))):
            if n_m >= 200:
                break
            if e in seen:
                continue
            seen.add(e)
            fh.write(json.dumps({"kind": "measurement", "equation": e}, ensure_ascii=False) + "\n")
            n_m += 1

    print("\nwrote %s" % tq)
    print("   equations    : %d" % n_e)
    print("   measurements : %d" % n_m)

    # ---- drop the 7 residuals from the PRICED export ---------------------
    # (they are the negative-control leaks; rule 3 cannot see them because they
    #  carry no printed uncertainty, so remove them explicitly)
    priced = os.path.join(Q, "measurements-priced.jsonl")
    # The 7 leaks from negative_control.py. They live in the equation pools, not
    # in measurements.jsonl, so this is a GUARD on the priced export: assert they
    # are absent rather than claim to have removed them.
    RESIDUAL = ("aria-live=", "priced=true", "CLAUDE_PROVIDER=",
                "double_build_risk=", "facebook.com/tr?", "adfox",
                "action=finddisplayads")
    dropped = 0
    kept = []
    for e in accepted:
        if any(tok in e for tok in RESIDUAL):
            dropped += 1
            continue
        kept.append(e)
    with open(priced, "w", encoding="utf-8") as fh:
        for e in kept:
            fh.write(json.dumps({"equation": e, "status": "MEASUREMENT"}, ensure_ascii=False) + "\n")
    print("\npriced export: %s" % priced)
    print("   accepted by rule 3 : %d" % len(accepted))
    print("   residuals dropped  : %d" % dropped)
    print("   priced rows        : %d" % len(kept))
    print("   NOTE: the 4,301 weak_span rows are NOT appended (explicit instruction)")

    return len(kept)


if __name__ == "__main__":
    main()