#!/usr/bin/env python3
"""
Hand-read audit sample. Automated lexical screening was attempted three times
and abandoned: each attempt failed its control set, and each failure produced a
DIFFERENT wrong count (v1: 89 stamps; v2a: 478 BROKEN; v2b: 130 stamps / 6
real). The controls that caught it are the reason to stop trusting it rather
than picking whichever run looked plausible.

This script does NOT classify. It emits a stratified random sample with the raw
evidence needed to classify by reading the body: header claim fields, the
Mechanism, exported symbols, and the first real code lines.
"""
import os, re, random

REPO = "/tmp/wtp"
OUT = "/tmp/vlog/audit/sample-2026-09-26.txt"

PREFIXES = ("lopo-gate", "rank-fusion", "blown-lead-monitor", "swamp-dashboard",
            "katz-score", "zermelo-async", "hodge-diagnostic", "leaderboard-stability",
            "covariate-bt", "phantom-bt", "soft-target-bt", "tiered-margin-bt",
            "betaprime-shrinkage", "elo-scales", "oddsmaker-entropy-filter",
            "rookie-combine-prior", "teacher-calibration")


def split_hb(text):
    m = re.match(r"\s*/\*\*(.*?)\*/", text, re.S)
    return (m.group(1), text[m.end():]) if m else ("", text)


def grab(pat, h):
    m = re.search(pat, h, re.S)
    return re.sub(r"\s+", " ", m.group(1)).strip() if m else ""


def main():
    mods = []
    for root, dirs, files in os.walk(REPO):
        if "node_modules" in root or "/.git" in root:
            continue
        for f in files:
            if not f.endswith(".ts") or f.endswith(".test.ts"):
                continue
            b = f[:-3]
            if (re.match(r"^\d{4}-\d{4,5}(v\d+)?-", b) or re.search(r"-\d{4}$", b)
                    or b.startswith(PREFIXES)):
                mods.append(os.path.join(root, f))
    mods.sort()
    random.seed(20260926)
    sample = random.sample(mods, 24)

    out = []
    for p in sample:
        text = open(p, encoding="utf-8", errors="replace").read()
        h, b = split_hb(text)
        title = grab(r"^\s*\*\s*(.{4,160}?)\s*\n", h)
        mech = grab(r"Mechanism\s*:?\s*(.{0,400}?)(?=Improvement|ACCEPTANCE|ADDITIVE|Live data|Pure|@|\Z)", h)
        imp = grab(r"Improvement\s*\(record\)\s*:?\s*(.{0,400}?)(?=ACCEPTANCE|ADDITIVE|Live data|Pure|@|\Z)", h)
        gate = grab(r"ACCEPTANCE GATE\s*:?\s*(.{0,300}?)(?=ADDITIVE|Live data|Pure|@|\Z)", h)
        exps = sorted(set(re.findall(r"^export (?:function|const|interface) ([A-Za-z0-9_]+)", b, re.M)))
        bl = [l for l in b.split("\n")
              if l.strip() and "`" not in l
              and not l.strip().startswith(("//", "*", "/*"))
              and not re.match(r"\s*(export )?const (ACCEPTANCE_GATE|ARXIV_ID|LANE|VERDICT|ENABLED)\b", l.strip())]
        out.append("=" * 98)
        out.append("FILE     : %s" % os.path.relpath(p, REPO))
        out.append("TITLE    : %s" % (title or "(none)"))
        out.append("MECHANISM: %s" % (mech or "(none)"))
        out.append("IMPROVE  : %s" % (imp or "(none)"))
        out.append("GATE     : %s" % gate[:240])
        out.append("EXPORTS  : %s" % ", ".join(exps[:12]))
        out.append("CODE(%d lines):" % len(bl))
        for l in bl[:9]:
            out.append("   " + l[:116])
    open(OUT, "w").write("\n".join(out))
    print("population:", len(mods), " sample:", len(sample))
    print("wrote", OUT)


if __name__ == "__main__":
    main()
