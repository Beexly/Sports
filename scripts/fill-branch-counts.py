#!/usr/bin/env python3
"""Fill in the Δfiles column of BRANCH-MAP.md.

git diff --name-only main...branch for 495 branches is slow one-per-process;
this batches it and caches to disk so re-runs are cheap.
"""
import os
import subprocess
import concurrent.futures as cf

REPO = "/tmp/gsx"
CACHE = "/tmp/branch-filecounts.tsv"


def count_files(ref):
    try:
        r = subprocess.run(
            ["git", "-C", REPO, "diff", "--name-only", f"origin/main...{ref}"],
            capture_output=True, text=True, timeout=120,
        )
        n = len([x for x in r.stdout.splitlines() if x.strip()])
        return ref, n
    except Exception:
        return ref, -1


def main():
    refs = subprocess.run(
        ["git", "-C", REPO, "for-each-ref", "--no-merged=origin/main",
         "--format=%(refname:short)", "refs/remotes/origin"],
        capture_output=True, text=True, timeout=300,
    ).stdout.split()
    refs = [r for r in refs if r.strip()]

    cache = {}
    if os.path.exists(CACHE):
        for line in open(CACHE):
            if "\t" in line:
                k, v = line.rstrip("\n").split("\t", 1)
                cache[k] = v

    todo = [r for r in refs if r not in cache]
    print(f"{len(refs)} branches, {len(todo)} need counting")

    if todo:
        with cf.ThreadPoolExecutor(max_workers=8) as ex:
            for ref, n in ex.map(count_files, todo):
                cache[ref] = str(n)
        with open(CACHE, "w") as f:
            for k, v in cache.items():
                f.write(f"{k}\t{v}\n")

    # rewrite the table rows with real counts
    p = os.path.join(REPO, "docs/agent-index/BRANCH-MAP.md")
    out, patched = [], 0
    for line in open(p):
        st = line.strip()
        if st.startswith("| 20") and "|" in st:
            cells = [c.strip() for c in st.strip("|").split("|")]
            if len(cells) >= 4:
                ref = cells[1].strip("`")
                full = "origin/" + ref
                if full in cache:
                    cells[2] = cache[full]
                    patched += 1
                out.append("| " + " | ".join(cells) + " |")
                continue
        out.append(line.rstrip("\n"))
    open(p, "w").write("\n".join(out) + "\n")
    print(f"patched {patched} rows")


if __name__ == "__main__":
    main()
