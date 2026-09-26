#!/usr/bin/env python3
"""Verify the agent index is truthful before we rely on it.

Checks:
  1. every relative link in PAPER-CATALOG.md resolves to a real tracked file
  2. the file count claimed in the catalog matches reality
  3. every branch in BRANCH-MAP.md still exists on origin
  4. positive control: a link we KNOW is bad must be reported missing
"""
import os
import re
import subprocess
import sys

REPO = "/tmp/gsx"
os.chdir(REPO)

fails = []


def git(*a):
    return subprocess.run(["git", *a], capture_output=True, text=True,
                          timeout=300).stdout


tracked = set(git("ls-files").splitlines())

# ---- 1 + 2: catalog links (links are relative to docs/research/) ----
cat = open("docs/agent-index/PAPER-CATALOG.md", encoding="utf-8").read()
links = re.findall(r"^- \[[^]]*\]\(([^)#]+)\)", cat, re.M)
resolved = ["docs/research/" + l for l in links]
missing = [l for l in resolved if l not in tracked]
print(f"catalog links: {len(links)}  broken: {len(missing)}")
for m in missing[:5]:
    print("   BROKEN:", m)
if missing:
    fails.append(f"{len(missing)} broken catalog links")

claimed = int(re.search(r"\*\*Total tracked files under `docs/research/`: (\d+)\*\*", cat).group(1))
actual = len([t for t in tracked if t.startswith("docs/research/")])
print(f"claimed total: {claimed}  actual: {actual}  {'OK' if claimed == actual else 'MISMATCH'}")
if claimed != actual:
    fails.append("catalog total mismatch")

# ---- positive control ----
ctl = "docs/research/THIS_PATH_DOES_NOT_EXIST.md"
ctl_missing = ctl not in tracked
print(f"positive control (known-bad path detected as missing): {ctl_missing}")
if not ctl_missing:
    fails.append("METHOD BROKEN - control not detected")

# ---- 3: branch map ----
bm = open("docs/agent-index/BRANCH-MAP.md", encoding="utf-8").read()
rows = [l for l in bm.splitlines() if l.strip().startswith("| 20")]
refs = set(git("for-each-ref", "--format=%(refname:short)", "refs/remotes/origin").splitlines())
bad = [r for r in rows
       if "origin/" + r.strip().strip("|").split("|")[1].strip().strip("`") not in refs]
print(f"branch rows: {len(rows)}  not-on-origin: {len(bad)}")
if bad:
    fails.append(f"{len(bad)} branch rows point at nonexistent refs")

# ---- 4: rescued files present ----
rescued = [t for t in tracked if t.startswith("docs/research/2026-09-14/")]
print(f"rescued gse-discovery files tracked: {len(rescued)}")
if len(rescued) != 22:
    fails.append(f"expected 22 rescued files, got {len(rescued)}")

print()
if fails:
    print("FAILED:")
    for f in fails:
        print("  -", f)
    sys.exit(1)
print("ALL CHECKS PASSED")
