# What is actually left in the filtered sweep list?
#
# filter_sweep_list.py removed 28,696 paths by policy (Turner, already-swept
# trees, and the four measured-contaminated corpora), leaving 39,105. Reading the
# top-level breakdown, the largest groups are TOOLING, not corpus:
#
#     8282  .claude/plugins          agent/editor plugin docs
#     4616  .gemini/antigravity      CLI tool docs
#     2587  .codebuddy/skills-marketplace   vendored skills
#     2444  .codebuddy/plugins       vendored plugins
#     2196  .codex/plugins           vendored plugins
#     1992  repos/open-design       third-party design-system repo
#     1867  .gemini/antigravity-cli  CLI tool docs
#     1371  OmniRoute/docs           third-party repo docs
#     1281  hermes-agent-self-evolution/openscience
#     1210  .bun/install             npm package cache
#
# Sweeping those is how the gse-competitive-intel corpus produced 84% junk.
# This samples each group and reports the real equation yield by hand-reading,
# so the decision is made on evidence rather than on the directory name.

import os
import random
import re
import sys
from collections import Counter

INBOX = os.path.dirname(os.path.abspath(__file__))
LIST = os.path.join(INBOX, "_target", "sweep-filtered.txt")
HOME = r"C:\Users\Garrett"
SEP = chr(92)

MATH = re.compile(r"[=<>≤≥≈]\s|\^|_\{|\\[A-Za-z]{2,}|[α-ωΑ-Ω∑∏∫∂√]")
EQISH = re.compile(r"\S\s*(?:=|<=|>=|≤|≥|≈|\\leq|\\geq|\\approx)\s*\S")
WEB = re.compile(r"(https?://|www\.|\]\(|className|src=|npm |yarn |install)", re.I)


def group_of(p):
    parts = p.replace(SEP, "/").split("/")
    return "/".join(parts[:2]) if len(parts) > 1 else parts[0]


def sample_group(paths, n):
    """Read n files, count '=' lines, return per-file stats."""
    out = []
    for p in paths[:n]:
        full = os.path.join(HOME, p.replace("/", os.sep))
        try:
            if os.path.getsize(full) > 600_000:
                continue
            with open(full, encoding="utf-8", errors="replace") as fh:
                text = fh.read(60_000)
        except OSError:
            continue
        if "\ufffd" in text[:2000]:
            out.append((p, 0, 0, 0, "binary"))
            continue
        lines = text.splitlines()
        eqish = sum(1 for ln in lines if EQISH.search(ln))
        mathy = sum(1 for ln in lines if MATH.search(ln))
        webish = sum(1 for ln in lines if WEB.search(ln))
        out.append((p, len(lines), eqish, mathy, "web" if webish > len(lines) * 0.25 else "text"))
    return out


def main():
    per_group = int(sys.argv[1]) if len(sys.argv) > 1 else 6
    paths = [l.strip() for l in open(LIST, encoding="utf-8", errors="replace") if l.strip()]
    groups = {}
    for p in paths:
        groups.setdefault(group_of(p), []).append(p)

    print("%-46s %7s %8s %8s %8s" % ("group", "docs", "eq-lines", "math-lines", "verdict"))
    print("-" * 88)
    ranked = []
    for g, ps in sorted(groups.items(), key=lambda kv: -len(kv[1]))[:22]:
        rows = sample_group(ps, per_group)
        if not rows:
            continue
        n = len(rows)
        eq = sum(r[2] for r in rows) / n
        ma = sum(r[3] for r in rows) / n
        binf = sum(1 for r in rows if r[4] == "binary") / n
        webf = sum(1 for r in rows if r[4] == "web") / n
        junk = binf + webf
        # eq-lines per document that survives, in units of lines/1000
        dens = eq
        if junk > 0.5:
            verdict = "JUNK %.0f%%" % (100 * junk)
        elif dens >= 1.0:
            verdict = "CANDIDATE"
        elif dens > 0:
            verdict = "thin"
        else:
            verdict = "no math"
        ranked.append((g, len(ps), eq, ma, verdict))
        print("%-46s %7d %8.1f %8.1f %8s" % (g[:46], len(ps), eq, ma, verdict))

    print("\n(eq-lines and math-lines are AVERAGE PER FILE from %d sampled files/group)" % per_group)
    good = [r for r in ranked if r[4] == "CANDIDATE"]
    print("\nCANDIDATE groups: %d  covering %d docs" % (
        len(good), sum(r[1] for r in good)))


if __name__ == "__main__":
    main()