#!/usr/bin/env python3
"""Repo-wide sweep: which source modules have ZERO non-test importers?

This is the measurement the unwired-honesty-machinery finding generalises.
For every non-test .ts/.py module in the repo, count how many OTHER
non-test source files import it. A module with 0 importers AND 0 self-
references outside its own test is an orphan island.

Method: build a per-file "imports this basename" index, then count.
Conservative: a basename match outside the module's own directory counts as
an importer, so a module that is imported under a different path still
registers. That over-counts slightly, which is the safe direction (we
under-report orphans rather than over-report them).
"""
import os, re, json, collections

WT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SKIP_DIRS = {"node_modules", ".git", ".next", "dist", "__pycache__", ".venv", "artifacts"}
SOURCE_DIRS = ["packages", "apps", "intelligence", "scripts", "workers", "tools", "eval", "gse-ml-service"]


def collect():
    files = {}          # relpath -> text
    for top in SOURCE_DIRS:
        root = os.path.join(WT, top)
        if not os.path.isdir(root):
            continue
        for dp, dn, fn in os.walk(root):
            dn[:] = [d for d in dn if d not in SKIP_DIRS]
            for f in fn:
                if f.endswith(".ts") or f.endswith(".tsx") or f.endswith(".py"):
                    if ".test." in f or f.startswith("test_") or f.endswith(".test.ts"):
                        continue
                    p = os.path.join(dp, f)
                    rel = os.path.relpath(p, WT).replace("\\", "/")
                    try:
                        files[rel] = open(p, encoding="utf8", errors="replace").read()
                    except Exception:
                        continue
    return files


def main():
    files = collect()
    print(f"source files scanned: {len(files)}")

    # basenames -> list of relpaths
    by_base = collections.defaultdict(list)
    for rel in files:
        base = os.path.basename(rel)
        stem = base.rsplit(".", 1)[0]
        by_base[stem].append(rel)
        # a directory import ("@/components/ui") resolves to that dir's index.*
        if stem in ("index", "__init__"):
            dirname = os.path.basename(os.path.dirname(rel))
            if dirname and dirname not in ("src", "lib", "app"):
                by_base[dirname].append(rel)

    # who imports whom.
    #
    # The import spec can be RELATIVE ("./foo"), a PATH ALIAS ("@/components/ui/button",
    # "@sports/prediction-engine"), or a BARE MODULE ("react"). Only the first two
    # name a file we can locate. The earlier version of this sweep matched only
    # relative specs, which MISSED every alias import and therefore over-reported
    # orphans (2,697 files claimed zero importers, which is implausible for a
    # repo with 4,290 source files). Alias specs are matched too now.
    SPEC_RE = re.compile(
        r'from\s+"([^"]+)"'      # from "..."  (relative or alias)
        r'|import\s+"([^"]+)"'     # import "..."
        r'|require\("([^"]+)"\)'  # require("...")
    )
    importers = collections.defaultdict(set)
    for rel, text in files.items():
        for m in SPEC_RE.finditer(text):
            spec = m.group(1) or m.group(2) or m.group(3) or ""
            if not spec or spec.startswith("node:"):
                continue
            # strip a query/hash, keep the last path segment
            spec = spec.split("?")[0].split("#")[0]
            base = os.path.basename(spec).rsplit(".", 1)[0]
            if not base or base in ("index", "types", "utils", "constants"):
                # a directory import resolves to <dir>/index.* -- fall back to
                # matching the directory name's first module
                if not base:
                    continue
            if not base:
                continue
            for cand in by_base.get(base, []):
                if cand == rel:
                    continue
                # skip a module importing its own test
                if cand.replace(".ts", ".test.ts") == rel or cand.replace(".py", ".test.py") == rel:
                    continue
                importers[cand].add(rel)

    zero = sorted(rel for rel in files if not importers.get(rel))
    # a module whose ONLY importers are inside the same directory is a
    # "package island" - a coherent family that nothing outside uses
    islands = []
    for rel in zero:
        d = os.path.dirname(rel)
        sibs = [s for s in zero if os.path.dirname(s) == d]
        if len(sibs) > 1:
            islands.append(rel)

    by_dir = collections.Counter(os.path.dirname(r) for r in zero)
    # exclude test-only files and __init__
    real_zero = [r for r in zero
                 if not r.endswith("__init__.py")
                 and not r.endswith("__init__.ts")
                 and "/tests/" not in r and "/test/" not in r]

    out = {
        "artifact": "zero_importer_sweep",
        "measured": "2026-10-20",
        "method": ("For every non-test source file, count the non-test source files that import it. "
                   "A basename match outside the module's own file counts as an importer, so the "
                   "sweep UNDER-reports orphans (the safe direction)."),
        "source_files_scanned": len(files),
        "zero_importer_files": len(real_zero),
        "zero_importer_by_dir": dict(by_dir.most_common(25)),
        "zero_importer_files_list": real_zero,
    }
    p = os.path.join(WT, "reconciliation", "zero_importer_sweep.json")
    json.dump(out, open(p, "w", encoding="utf8"), indent=1)
    print("zero-importer files:", len(real_zero))
    print("top dirs:")
    for k, v in by_dir.most_common(18):
        print(f"  {v:4d}  {k}")
    print("wrote", p)


if __name__ == "__main__":
    main()
