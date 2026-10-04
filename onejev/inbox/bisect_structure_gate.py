# Why does the strict structure gate reject real mathematics?
#
# sweep_dedup_corpus.py went from 1,117 rows (all junk) to 0 rows (including real
# sports-model math like 'Clark-West gate: n >= 30, t > 1.64'). Both extremes are
# wrong. This bisects: for each candidate row it records WHICH clause of the
# structure test fired, so the rule can be cut where the evidence says.

import json
import os
import re
import sys

INBOX = r"C:\Users\Garrett\onejev\inbox"
sys.path.insert(0, INBOX)
from eq_recover_ineq import recover

HOME = r"C:\Users\Garrett"
SWEEP_LIST = os.path.join(os.environ["LOCALAPPDATA"], "Temp", "corpus_probe", "sweep_list.txt")
TEXT_EXT = (".md", ".txt", ".rst", ".tex", ".org")

MATH = re.compile(
    r"[0-9α-ωΑ-Ω∑∏∫∂√≈≤≥±]|\^|_\{|\\[A-Za-z]{2,}|−|⋅|·", re.I)
BOTH_SIDES = re.compile(
    r"[A-Za-z0-9α-ωΑ-Ω\\)\]\}0-9.+-]"
    r"\s*(?:=|\\leq|\\geq|\\le\b|\\ge\b|\\approx|\\neq|\\equiv|≈|≤|≥|≠|<=|>=|~=|:=|≈)"
    r"\s*[A-Za-z0-9α-ωΑ-Ω\\(\[\{0-9.+-]")
PROSE = re.compile(r"[A-Za-z]{4,}")


def verdict(line):
    got = recover(line)
    if got["status"] != "EQUATION":
        return "gate_" + got["status"].lower(), got.get("reason", "")
    eq = got["equation"]
    why = []
    if not MATH.search(eq):
        why.append("no_math")
    if not BOTH_SIDES.search(eq):
        why.append("no_both_sides")
    nw = len(PROSE.findall(eq))
    if nw > 8:
        why.append("prose_%d" % nw)
    if re.search(r'=\s*[\"\'a-zA-Z_][\w\-\.]*[\"\'\s]*$', eq) and '"' in eq:
        why.append("attr_assign")
    return ("PASS" if not why else "fail:" + ",".join(why)), eq


def main():
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 1500
    paths = []
    with open(SWEEP_LIST, encoding="utf-8", errors="replace") as fh:
        for line in fh:
            p = line.strip()
            if p:
                paths.append(os.path.join(HOME, p.replace("/", os.sep)))
            if len(paths) >= limit:
                break

    tally = {}
    passed = []
    for p in paths:
        if not p.lower().endswith(TEXT_EXT):
            continue
        try:
            if os.path.getsize(p) > 2_000_000:
                continue
            with open(p, encoding="utf-8", errors="replace") as fh:
                text = fh.read()
        except OSError:
            continue
        if "\ufffd" in text[:3000]:
            continue
        for line in text.splitlines():
            line = line.strip()
            if not line or len(line) > 600 or "=" not in line:
                continue
            v, detail = verdict(line)
            key = v if v == "PASS" else v.split(":")[0] + (
                ":" + v.split(":")[1] if ":" in v else "")
            tally[key] = tally.get(key, 0) + 1
            if v == "PASS":
                passed.append((detail[:120], os.path.basename(p)[:40]))

    print("outcome tally:")
    for k, n in sorted(tally.items(), key=lambda kv: -kv[1]):
        print("   %6d  %s" % (n, k))
    print("\nPASSING rows (%d) -- judge these by eye:" % len(passed))
    for eq, src in passed[:20]:
        print("   %-78s | %s" % (eq, src))


if __name__ == "__main__":
    main()