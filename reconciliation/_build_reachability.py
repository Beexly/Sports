#!/usr/bin/env python3
"""Build reconciliation/reachability.json — import-graph reachability of research modules.

Method: static ESM import-graph walk from production entry points inside
packages/prediction-engine/src, plus a cross-package scan of @sports/prediction-engine
symbol imports from packages/ingestion-pipeline and apps/web.
"""
import os, re, json, collections

WT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PE = os.path.join(WT, "packages/prediction-engine", "src")


def load(pkgroot):
    root = os.path.join(WT, pkgroot)
    files = {}
    if not os.path.isdir(root):
        return files
    for dp, dn, fn in os.walk(root):
        dn[:] = [x for x in dn if x not in ("node_modules", ".git", "dist")]
        for f in fn:
            if f.endswith(".ts") and not f.endswith(".test.ts"):
                rel = os.path.relpath(os.path.join(dp, f), root).replace("\\", "/")
                files[rel[:-3]] = os.path.join(dp, f)
    return files


def build_deps(files):
    def deps(mod):
        try:
            txt = open(files[mod], encoding="utf8", errors="replace").read()
        except Exception:
            return []
        out = set()
        for m in re.findall(r'from\s+"(\.[^"]+)"', txt):
            t = m[2:]
            if t.endswith(".js"):
                t = t[:-3]
            if t in files:
                out.add(t)
            elif t + "/index" in files:
                out.add(t + "/index")
        return list(out)
    return deps


def reach(files, deps, entries):
    seen, st = set(), list(entries)
    while st:
        m = st.pop()
        if m in seen or m not in files:
            continue
        seen.add(m)
        st.extend(deps(m))
    return seen


pe_files = load("packages/prediction-engine/src")
pe_deps = build_deps(pe_files)

PROD_ENTRIES = ["scoring", "edge-engine", "game-context", "index", "settlement",
                "ranking-prob", "historical-replay", "readiness", "calibration-apply",
                "published-line", "proof-of-record", "pick-proof-receipt"]
prod = reach(pe_files, pe_deps, PROD_ENTRIES)
scoring_only = reach(pe_files, pe_deps, ["scoring"])


def fam(m):
    return m.split("/")[0] if "/" in m else "(top-level)"


def is_arxiv(m):
    return bool(re.search(r'(^|/)\d{4}-\d{5}', m))


unreach = [m for m in pe_files if m not in prod]
arx_reach = sorted(m for m in prod if is_arxiv(m))
arx_unreach = sorted(m for m in unreach if is_arxiv(m))
named_unreach = sorted(m for m in unreach if not is_arxiv(m))

out = {
    "method": ("Static ESM import-graph walk over packages/prediction-engine/src "
               "(non-test .ts). A module is REACHABLE if it is transitively imported "
               "from a production entry point. Barrel exports through src/index.ts count "
               "as reachable-but-unused (exported, never consumed by a live path)."),
    "prediction_engine_src": {
        "total_non_test_modules": len(pe_files),
        "reachable_from_prod_entries": len(prod),
        "reachable_from_scoring_ts_alone": len(scoring_only),
        "scoring_ts_closure": sorted(scoring_only),
        "unreachable_total": len(unreach),
        "unreachable_with_sibling_test": sum(
            1 for m in unreach if os.path.exists(pe_files[m].replace(".ts", ".test.ts"))),
        "arxiv_derived_reachable_via_barrel": len(arx_reach),
        "arxiv_derived_unreachable": len(arx_unreach),
        "named_unreachable": len(named_unreach),
        "unreachable_by_dir": dict(collections.Counter(fam(m) for m in unreach).most_common()),
        "arxiv_unreachable_list": arx_unreach,
        "named_unreachable_list": named_unreach,
        "arxiv_reachable_list": arx_reach,
    },
}

# cross-package: which PE symbols does ingestion-pipeline / apps/web actually import?
def imported_symbols(pkgroot):
    root = os.path.join(WT, pkgroot)
    syms = set()
    files = []
    for dp, dn, fn in os.walk(root):
        dn[:] = [x for x in dn if x not in ("node_modules", ".git", ".next", "dist")]
        for f in fn:
            if f.endswith(".ts") and not f.endswith(".test.ts"):
                files.append(os.path.join(dp, f))
    for p in files:
        txt = open(p, encoding="utf8", errors="replace").read()
        for m in re.findall(r'import\s*\{([^}]*)\}\s*from\s*"@sports/prediction-engine"', txt, re.S):
            for name in m.split(","):
                n = name.strip().split(" as ")[0].strip()
                n = re.sub(r'^type\s+', '', n)
                if n and re.match(r'^[A-Za-z_$][\w$]*$', n):
                    syms.add(n)
    return syms


ip_syms = imported_symbols("packages/ingestion-pipeline/src")
web_syms = imported_symbols("apps/web")
out["cross_package_pe_symbol_imports"] = {
    "ingestion_pipeline_distinct_pe_symbols": len(ip_syms),
    "apps_web_distinct_pe_symbols": len(web_syms),
    "apps_web_pe_symbols_sample": sorted(web_syms)[:60],
}

# Where is the Sovereign Signal Plane actually invoked from?
def grep_repo(pattern, exts=(".ts", ".tsx", ".py")):
    hits = []
    for dp, dn, fn in os.walk(WT):
        dn[:] = [x for x in dn if x not in ("node_modules", ".git", ".next", "dist", "artifacts")]
        for f in fn:
            if f.endswith(exts):
                p = os.path.join(dp, f)
                try:
                    for i, line in enumerate(open(p, encoding="utf8", errors="replace"), 1):
                        if re.search(pattern, line):
                            hits.append(f"{os.path.relpath(p, WT).replace(chr(92), '/')}:{i}: {line.strip()[:150]}")
                except Exception:
                    pass
    return hits


out["signal_plane_invocation_sites"] = grep_repo(r"computeSovereignSignalPlaneContribution")
out["trueprob_equation_sites"] = grep_repo(r"trueProb\s*=|true_prob\s*=")
out["corpus_adjustment_sites"] = grep_repo(r"corpusAdjustment|corpusWeight|corpusSituationalShift")

p = os.path.join(WT, "reconciliation", "reachability.json")
with open(p, "w", encoding="utf8") as f:
    json.dump(out, f, indent=1)
print("wrote", p, os.path.getsize(p))
pe = out["prediction_engine_src"]
print("PE non-test modules:", pe["total_non_test_modules"])
print("  reachable (prod entries):", pe["reachable_from_prod_entries"])
print("  reachable (scoring.ts alone):", pe["reachable_from_scoring_ts_alone"])
print("  unreachable:", pe["unreachable_total"], "(with tests:", pe["unreachable_with_sibling_test"], ")")
print("  arxiv reachable:", pe["arxiv_derived_reachable_via_barrel"], " arxiv unreachable:", pe["arxiv_derived_unreachable"])
print("ingestion-pipeline PE symbols:", out["cross_package_pe_symbol_imports"]["ingestion_pipeline_distinct_pe_symbols"])
print("apps/web PE symbols:", out["cross_package_pe_symbol_imports"]["apps_web_distinct_pe_symbols"])
print("signal plane sites:", len(out["signal_plane_invocation_sites"]))
