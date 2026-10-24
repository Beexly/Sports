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
                    # A file under a tests/ or test/ DIRECTORY is a test file
                    # regardless of its name (e.g.
                    # intelligence/trust/tests/test_trust.py). Without this,
                    # a package's own test directory counts as a production
                    # consumer and the module looks wired when it is not.
                    if any(seg in ("tests", "test", "__tests__", "__test__")
                           for seg in dp.replace("\\", "/").split("/")):
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
    #
    # COLLISION GUARD. A bare basename index makes `intelligence/trust/` and
    # `apps/web/lib/trust.ts` look like the same module, so the sweep counted
    # the trust-claims and mobile-trust importers as consumers of the
    # Python trust package. The third run of this sweep reported
    # `evidence_guard.py` as WIRED when the only "importers" were
    # `apps/web/lib/trust-claims.ts` and `apps/mobile/src/lib/trust.ts` --
    # different modules that share a word.
    #
    # The fix: an importer only counts if the resolved path is plausible --
    # same package directory, or a direct relative/alias resolution. A
    # basename match alone is NOT enough when the basename is ambiguous
    # (more than one candidate in the repo).
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
    ambiguous = {k for k, v in by_base.items() if len(v) > 1}

    # who imports whom.
    #
    # The import spec can be RELATIVE ("./foo"), a PATH ALIAS ("@/components/ui/button",
    # "@sports/prediction-engine"), or a BARE MODULE ("react"). Only the first two
    # name a file we can locate. The earlier version of this sweep matched only
    # relative specs, which MISSED every alias import and therefore over-reported
    # orphans (2,697 files claimed zero importers, which is implausible for a
    # repo with 4,290 source files). Alias specs are matched too now.
    SPEC_RE = re.compile(
        r'from\s+"([^"]+)"'        # from "..."  (TS relative or alias)
        r'|import\s+"([^"]+)"'       # import "..."
        r'|require\("([^"]+)"\)'    # require("...")
        # PYTHON module-as-import: `from . import adversary as _adv`
        r'|from\s+(\.+)\s+import\s+([\w, ]+)'
    )
    # Python: `import x.y` / `import x.y as z`
    PY_IMPORT_RE = re.compile(r'^\s*import\s+([\w.]+)', re.M)
    PY_FROM_RE = re.compile(r'^\s*from\s+([\w.]+)\s+import', re.M)
    importers = collections.defaultdict(set)
    for rel, text in files.items():
        for m in SPEC_RE.finditer(text):
            if m.group(4):  # `from . import a, b`  -> python module-as-import
                pkg = m.group(4)
                for name in (m.group(5) or "").split(","):
                    name = name.strip().split(" as ")[0].strip()
                    if not name:
                        continue
                    # resolve relative to the importing file's package
                    pkgdir = os.path.dirname(rel)
                    depth = len(pkg) - len(pkg.replace(".", ""))  # "." -> 1, ".." -> 2
                    base = pkgdir
                    for _ in range(depth - 1):
                        base = os.path.dirname(base)
                    cand_rel = os.path.normpath(os.path.join(base, name)).replace("\\", "/")
                    for ext in (".py",):
                        cand = cand_rel + ext
                        if cand in files and cand != rel:
                            importers[cand].add(rel)
                    # also the package's __init__
                    init_rel = os.path.normpath(os.path.join(base, name, "__init__.py")).replace("\\", "/")
                    if init_rel in files and init_rel != rel:
                        importers[init_rel].add(rel)
                continue
            spec = m.group(1) or m.group(2) or m.group(3) or ""
            if not spec or spec.startswith("node:"):
                continue
            # strip a query/hash, keep the last path segment
            spec = spec.split("?")[0].split("#")[0]
            base = os.path.basename(spec).rsplit(".", 1)[0]
            if not base:
                continue
            cands = by_base.get(base, [])
            for cand in cands:
                if cand == rel:
                    continue
                # skip a module importing its own test
                if cand.replace(".ts", ".test.ts") == rel or cand.replace(".py", ".test.py") == rel:
                    continue
                # COLLISION GUARD: when the basename is ambiguous (several
                # modules share it), only count a candidate that lives in the
                # importer's own package directory. Otherwise `trust-claims.ts`
                # would count as an importer of `intelligence/trust/`.
                if base in ambiguous:
                    if os.path.dirname(cand) != os.path.dirname(rel):
                        continue
                importers[cand].add(rel)

    # Python absolute imports: `from intelligence.reasoning import x` or
    # `from reasoning.engine import AnalysisEngine` (sys.path-rooted).
    for rel, text in files.items():
        if not rel.endswith(".py"):
            continue
        for rx in (PY_FROM_RE, PY_IMPORT_RE):
            for m in rx.finditer(text):
                mod = m.group(1)
                tail = mod.split(".")[-1]
                for cand in by_base.get(tail, []):
                    if cand == rel or not cand.endswith(".py"):
                        continue
                    if tail in ambiguous:
                        # a python module named `trust` is only reachable by a
                        # same-package import; `from trust import x` in
                        # intelligence/trust/tests/ is a test (excluded), and
                        # an unrelated top-level `trust` would be a
                        # different module.
                        if os.path.dirname(cand) != os.path.dirname(rel):
                            continue
                    importers[cand].add(rel)

    # PACKAGE-EXTERNAL consumption. A module imported only by a sibling in
    # its OWN package directory is not "wired" -- e.g.
    # intelligence/trust/evidence_guard.py is imported by
    # intelligence/trust/__init__.py, which is imported by nothing. Counting
    # the barrel import made a dead module look alive.
    #
    # external_importers[mod] = importers outside mod's own directory.
    external_importers = {}
    for mod, imps in importers.items():
        moddir = os.path.dirname(mod)
        ext = {i for i in imps if os.path.dirname(i) != moddir}
        external_importers[mod] = ext

    zero = sorted(rel for rel in files if not importers.get(rel))
    # package-internal only: imported, but only from within its own package
    internal_only = sorted(
        rel for rel in files
        if importers.get(rel) and not external_importers.get(rel)
    )
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
        "levels": {
            "ZERO_IMPORTER": "no source file imports it at all (not even its own package's __init__)",
            "PACKAGE_INTERNAL_ONLY": "imported only by a sibling in its OWN package directory; nothing outside the package imports it -- the module is reachable but NOT wired",
            "EXTERNALLY_CONSUMED": "imported by at least one file outside its own package directory",
        },
        "method": ("For every non-test source file, count the non-test source files that import it. "
                   "A basename match outside the module's own file counts as an importer, so the "
                   "sweep UNDER-reports orphans (the safe direction)."),
        "source_files_scanned": len(files),
        "zero_importer_files": len(real_zero),
        "package_internal_only_files": len([r for r in internal_only if r not in zero]),
        "externally_consumed_files": len([r for r in files if external_importers.get(r)]),
        "package_internal_only_list": [r for r in internal_only if r not in zero],
        "zero_importer_by_dir": dict(by_dir.most_common(25)),
        "zero_importer_files_list": real_zero,
    }
    p = os.path.join(WT, "reconciliation", "zero_importer_sweep.json")
    json.dump(out, open(p, "w", encoding="utf8"), indent=1)
    print("zero-importer files:", len(real_zero))
    print("package-internal-only (imported, but not outside their package):",
          len([r for r in internal_only if r not in zero]))
    print("externally consumed:", len([r for r in files if external_importers.get(r)]))
    print("top dirs:")
    for k, v in by_dir.most_common(18):
        print(f"  {v:4d}  {k}")
    print("wrote", p)


if __name__ == "__main__":
    main()
