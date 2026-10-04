# Independent check: does any sensitive token survive in the sweep list?

import os
import re
from collections import Counter

INBOX = os.path.dirname(os.path.abspath(__file__))
SW = os.path.join(INBOX, "_target", "sweep-filtered.txt")

TOKENS = ("turner", "attorney", "counsel", "baxley", "corina", "pruzansky",
          "rob wiley", "wiley wheeler", "settlement letter", "retention notice",
          "athletic dept", "law office")


def main():
    paths = [l.strip() for l in open(SW, encoding="utf-8", errors="replace") if l.strip()]
    hits = [p for p in paths if any(t in p.replace(chr(92), "/").lower() for t in TOKENS)]
    print("sweep list rows      : %d" % len(paths))
    print("sensitive-token hits : %d" % len(hits))
    for p in hits[:15]:
        print("   LEAK %s" % p)

    # Also: what is left under Documents/Codex, the biggest remaining group?
    codex = [p for p in paths if p.replace(chr(92), "/").startswith("Documents/Codex")]
    print("\nDocuments/Codex remaining: %d" % len(codex))
    c = Counter()
    for p in codex:
        parts = p.replace(chr(92), "/").split("/")
        c["/".join(parts[1:4])] += 1
    for k, v in c.most_common(12):
        print("   %6d  %s" % (v, k))

    ok = not hits
    print("\nVERDICT: %s" % ("CLEAN -- no sensitive token in sweep list" if ok
                             else "LEAKS PRESENT"))


if __name__ == "__main__":
    main()