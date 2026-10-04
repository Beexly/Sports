# Read actual rows from the top "CANDIDATE" groups before trusting the label.

import os
import re
import sys

INBOX = os.path.dirname(os.path.abspath(__file__))
LIST = os.path.join(INBOX, "_target", "sweep-filtered.txt")
HOME = r"C:\Users\Garrett"
SEP = chr(92)
EQISH = re.compile(r"\S\s*(?:=|<=|>=|≤|≥|≈|\\leq|\\geq|\\approx)\s*\S")


def main():
    want = sys.argv[1] if len(sys.argv) > 1 else ".claude/plugins"
    nfiles = int(sys.argv[2]) if len(sys.argv) > 2 else 4
    perfile = int(sys.argv[3]) if len(sys.argv) > 3 else 6

    paths = [l.strip() for l in open(LIST, encoding="utf-8", errors="replace") if l.strip()]
    sel = [p for p in paths if p.replace(SEP, "/").startswith(want)][:nfiles]

    for p in sel:
        full = os.path.join(HOME, p.replace("/", os.sep))
        print("=" * 78)
        print("FILE:", p)
        try:
            if os.path.getsize(full) > 400_000:
                print("  (too large, skipped)")
                continue
            text = open(full, encoding="utf-8", errors="replace").read(40_000)
        except OSError as e:
            print("  (unreadable)", e)
            continue
        shown = 0
        for ln in text.splitlines():
            if shown >= perfile:
                break
            if EQISH.search(ln):
                ln = ln.strip()
                print("   %s" % (ln[:150] if ln else "<blank>"))
                shown += 1
        if shown == 0:
            print("   (no '=' lines matched)")


if __name__ == "__main__":
    main()