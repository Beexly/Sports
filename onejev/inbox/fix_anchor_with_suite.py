# Anchor repair, measured against the REAL pipeline (imported, not reimplemented).
#
# LESSON FROM THE LAST TWO ATTEMPTS
# Attempt 1 reimplemented the guards as regexes and scored 50% -- RESIDUAL is
# actually a tuple of literal junk strings matched against the RAW INPUT, and my
# 'equivalent' regex rejected every valid equation. Attempt 2 compared a bare
# gate against a guarded one and got 44 vs 47 for the same reason: not the same
# pipeline. So this imports the working module and measures THAT.

import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import eq_recover  # noqa: E402
import eq_recover_ineq as W  # noqa: E402
import score_against_flash_suite as S  # noqa: E402

SUITE = S.SUITE


def pipeline(inp):
    """The decision path of score_against_flash_suite.main(), verbatim."""
    got_raw = S.recover(inp)
    got = "DIE" if got_raw["status"] != "EQUATION" else "LIVE"
    if got == "LIVE":
        if any(t in inp for t in S.RESIDUAL):
            got = "DIE"
        elif S.NAN.search(inp):
            got = "DIE"
        elif S.DANGLING.search(inp):
            got = "DIE"
    return got


def score(label):
    rows = [json.loads(l) for l in open(SUITE, encoding="utf-8", errors="replace") if l.strip()]
    ok = die_ok = live_ok = die_tot = live_tot = 0
    misses = []
    for r in rows:
        got = pipeline(r["input"])
        want = r["verdict"]
        if want == "DIE":
            die_tot += 1
            die_ok += got == "DIE"
        else:
            live_tot += 1
            live_ok += got == "LIVE"
        if got != want:
            misses.append((r["id"], want, got, r["input"][:56]))
    n = len(rows)
    print("%-20s %2d/%d %3d%%   DIE %d/%d   LIVE %d/%d"
          % (label, ok, n, round(100 * ok / n), die_ok, die_tot, live_ok, live_tot))
    return misses


def main():
    print("=" * 80)
    print("ANCHOR REPAIR -- measured on the REAL pipeline vs flash's 50-row suite")
    print("=" * 80)
    m_base = score("PIPELINE baseline")
    print("\nbaseline misses (%d):" % len(m_base))
    for mid, want, got, txt in m_base:
        print("   #%-3s want=%-4s got=%-4s %s" % (mid, want, got, txt))

    orig = eq_recover.EQ_SPAN.pattern
    owi = W.INEQ_SPAN.pattern
    widened = orig.replace("[A-Za-z", r"[\[(*A-Za-z", 1)
    wwide = owi.replace("[A-Za-z", r"[\[(*A-Za-z", 1)
    eq_recover.EQ_SPAN = re.compile(widened)
    W.INEQ_SPAN = re.compile(wwide)
    try:
        print()
        m_fix = score("PIPELINE fixed")
        print("\nfixed misses (%d):" % len(m_fix))
        for mid, want, got, txt in m_fix:
            print("   #%-3s want=%-4s got=%-4s %s" % (mid, want, got, txt))
    finally:
        eq_recover.EQ_SPAN = re.compile(orig)
        W.INEQ_SPAN = re.compile(owi)

    print("\n" + "=" * 80)
    print("delta: %d -> %d misses" % (len(m_base), len(m_fix)))
    print("VERDICT:", "ADOPT" if len(m_fix) < len(m_base) else "NO CHANGE")
    print("=" * 80)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())