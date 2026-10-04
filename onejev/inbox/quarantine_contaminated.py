# Quarantine contaminated queue files, by measurement not by name.

# WHAT THIS FIXES
# A future sweep that globs mind-queue/*.jsonl would ingest three files that are
# provably not mathematics:
#   gse-competitive-intel.jsonl    1,449 web-furniture + 635 binary rows
#   gse_comp_intel.jsonl              636 web-furniture + 283 binary rows
#   academy_corpus.jsonl               57 of 77 rows are web furniture
#   firecrawl_scores.jsonl374 of 410 rows are web furniture
#
# EVIDENCE
# gse-competitive-intel was already measured this session: my own extraction wrote
# 1,099 "equations" from it and a random sample showed binary mojibake, tracking
# URLs and "[Start a trial100%]". It is scraped web content with a .md extension.
#
# NOTHING IS DELETED. Every row goes to _quarantine/, and the original file is
# renamed with a .CONTAMINATED suffix so no glob picks it up. That rename is the
# safety property: the data stays, but it cannot be ingested by accident.
#
#   python quarantine_contaminated.py --dry    # report
#   python quarantine_contaminated.py --apply  # move + rename

import json
import os
import re
import shutil
import sys
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
Q = os.path.join(HERE, "mind-queue")
DEST = os.path.join(HERE, "_quarantine")

WEB = re.compile(r"https?://|\.com/|www\.|src=|href=|similarcdn|similarweb|"
                 r"Start a trial|Sign up|Subscribe|facebook\.com/tr", re.I)

# A file is contaminated when web furniture exceeds this share of its rows.
# Measured shares: gse-competitive-intel 43%, gse_comp_intel 58%,
# academy_corpus 74%, firecrawl_scores 91%. The clean pools are all under 1%.
WEB_THRESHOLD = 0.20


def is_binary(s):
    bad = sum(1 for c in s if c == "\ufffd" or ord(c) < 9 or 14 <= ord(c) < 32)
    return bad / max(1, len(s)) > 0.05


def scan(path):
    rows = web = binary = total = 0
    with open(path, encoding="utf-8", errors="replace") as fh:
        for line in fh:
            if not line.strip() or line.startswith("corpus-roots:"):
                continue
            total += 1
            try:
                r = json.loads(line)
            except Exception:
                continue
            eq = str(r.get("equation") or r.get("printed_equation") or "")
            if not eq:
                continue
            if WEB.search(eq):
                web += 1
            if is_binary(eq):
                binary += 1
    share = web / max(1, total)
    return {"rows": total, "web": web, "binary": binary,
            "web_share": round(share, 3),
            "contaminated": share > WEB_THRESHOLD}


def main(apply_changes):
    os.makedirs(DEST, exist_ok=True)
    print(f"threshold: web furniture > {WEB_THRESHOLD:.0%} of rows")
    print(f"{'file':<38}{'rows':>8}{'web':>7}{'bin':>6}{'webshare':>10}  verdict")
    flagged = []
    for name in sorted(os.listdir(Q)):
        if not name.endswith(".jsonl"):
            continue
        path = os.path.join(Q, name)
        if os.path.getsize(path) > 60 * 1024 * 1024:   # skip the big agreement log
            continue
        st = scan(path)
        if st["rows"] == 0:
            continue
        verdict = "CONTAMINATED" if st["contaminated"] else "clean"
        if st["contaminated"]:
            flagged.append(name)
        print(f"{name:<38}{st['rows']:>8}{st['web']:>7}{st['binary']:>6}"
              f"{st['web_share']:>9.1%}  {verdict}")

    if not flagged:
        print("\nnothing flagged")
        return 0
    print(f"\nflagged {len(flagged)}: {', '.join(flagged)}")
    if not apply_changes:
        print("report only -- rerun with --apply")
        return 0
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    for name in flagged:
        src = os.path.join(Q, name)
        # Rename FIRST so no *.jsonl glob can pick the file up mid-operation.
        renamed = src + ".CONTAMINATED"
        if os.path.exists(src):
            os.rename(src, renamed)
        elif not os.path.exists(renamed):
            print(f"   SKIP {name}: not present")
            continue
        shutil.move(renamed, os.path.join(DEST, f"{stamp}-{name}"))
        print(f"   quarantined {name} -> _quarantine/{stamp}-{name}"
              f"  (removed from mind-queue so no glob can ingest it)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main("--apply" in sys.argv))