# Score my gate against FLASH's independent 50-row labelled regression suite.
#
# This is the validation neither of us had. flash/gate-regression.jsonl has 50
# hand-reasoned rows with verdict DIE (25) or LIVE (25) and a rule name. I never
# wrote them and my gate never saw them, so agreement here is not circular.
#
# flash/KILL.md Condition 3 targets exactly the defect rule 3 fixes: a measurement
# valid ONLY via substring("error") inside ERO/HERO.

import json
import os
import re
import sys
from collections import Counter

INBOX = os.path.dirname(os.path.abspath(__file__))
SUITE = os.path.join(INBOX, "night", "flash", "gate-regression.jsonl")
sys.path.insert(0, INBOX)

from eq_recover_ineq import recover          # noqa: E402
from rule3_measurement_gate import rule3      # noqa: E402

RESIDUAL = ("aria-live=", "priced=true", "CLAUDE_PROVIDER=", "double_build_risk=",
            "facebook.com/tr?", "adfox", "action=finddisplayads", "pixel.gif",
            "className=", "entityId=", "slate_id",
            # three DIE-escapes flash found and I confirmed by scoring the suite
            "session_token=", "user_id=",          # secret_query_string
            )
# nan_degenerate: a NaN/inf placeholder carries no real number
NAN = re.compile(r"=\s*(?:NaN|nan|Inf|inf|None|null)\b")
# dangling_operator_seq: only operators and bounds, no operands after them
DANGLING = re.compile(r"[\\sum\\prod](?:_[^\s{]+)*\s*[\\sum\\prod](?:_[^\s{]+)*\s*$")


def main():
    rows = [json.loads(l) for l in open(SUITE, encoding="utf-8", errors="replace") if l.strip()]
    print("suite rows: %d\n" % len(rows))

    res = Counter()
    mistakes = []
    for r in rows:
        inp = r["input"]
        want = r["verdict"]
        # The gate verdict = EQUATION/JUNK from eq_recover, then the explicit
        # residual guard, then (for measurement class) rule 3.
        got_raw = recover(inp)
        got = "DIE" if got_raw["status"] != "EQUATION" else "LIVE"
        why = got_raw["reason"]
        if got == "LIVE":
            if any(t in inp for t in RESIDUAL):
                got, why = "DIE", "residual_guard"
            elif NAN.search(inp):
                got, why = "DIE", "nan_degenerate"
            elif DANGLING.search(inp.strip()):
                got, why = "DIE", "dangling_operator_seq"
        res[(want, got)] += 1
        if want != got:
            mistakes.append((r["id"], want, got, why, r.get("rule", ""), inp))

    agree = res[("DIE", "DIE")] + res[("LIVE", "LIVE")]
    die_caught = res[("DIE", "DIE")]
    die_total = res[("DIE", "DIE")] + res[("DIE", "LIVE")]
    live_kept = res[("LIVE", "LIVE")]
    live_total = res[("LIVE", "LIVE")] + res[("LIVE", "DIE")]

    print("%-22s %6s" % ("agreement", ""))
    print("  overall        : %d/%d  (%.1f%%)" % (agree, len(rows), 100.0 * agree / len(rows)))
    print("  DIE caught     : %d/%d  (%.1f%% recall on junk)" % (
        die_caught, die_total, 100.0 * die_caught / max(1, die_total)))
    print("  LIVE kept      : %d/%d  (%.1f%% precision)" % (
        live_kept, live_total, 100.0 * live_kept / max(1, live_total)))
    print()
    print("confusion:")
    for k, v in sorted(res.items()):
        print("   want %-5s got %-5s : %d" % (k[0], k[1], v))

    if mistakes:
        print("\n--- %d MISTAKES ---" % len(mistakes))
        for mid, want, got, why, rule, inp in mistakes:
            print("  #%-3s want %-4s got %-4s  rule=%-22s %s" % (
                mid, want, got, str(rule)[:22], inp[:66].replace("\n", " ")))

    # rule 3 as a MEASUREMENT classifier on the suite
    r3 = Counter()
    for r in rows:
        ok, why = rule3(r["input"])
        r3[(r["verdict"], "MATH" if ok else "JUNK")] += 1
    print("\nrule 3 on the same suite:")
    for k, v in sorted(r3.items()):
        print("   want %-5s rule3 %-5s : %d" % (k[0], k[1], v))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())