#!/usr/bin/env python3
"""Second-pass: distinguish BARREL-EXPORTED from PRODUCTION-CONSUMED.

Tier 0  PROD    : transitively imported from packages/prediction-engine/src/scoring.ts
                  (the live scoring closure) or imported by a live shipping consumer
Tier 1  BARREL  : exported from src/index.ts but imported by no production consumer
Tier 2  ORPHAN  : not exported from the barrel, not imported by any production consumer
"""
import os, re, json, collections

WT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PE = os.path.join(WT, "packages", "prediction-engine", "src")

files = {}
for dp, dn, fn in os.walk(PE):
    dn[:] = [x for x in dn if x not in ("node_modules", ".git", "dist")]
    for f in fn:
        if f.endswith(".ts") and not f.endswith(".test.ts"):
            rel = os.path.relpath(os.path.join(dp, f), PE).replace("\\", "/")
            files[rel[:-3]] = os.path.join(dp, f)


def local_deps(mod):
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


def reach(entries):
    seen, st = set(), list(entries)
    while st:
        m = st.pop()
        if m in seen or m not in files:
            continue
        seen.add(m)
        st.extend(local_deps(m))
    return seen


# Tier 0a: the live scoring closure
scoring_closure = reach(["scoring"])

# Tier 0b: production consumers OUTSIDE prediction-engine.
# A "production consumer" = a file that is itself part of a shipped path:
#   packages/ingestion-pipeline/src (non-test), apps/web (non-test),
#   packages/feature-store/src, packages/verifier/src, packages/ops/src,
#   scripts/ (non-test), intelligence/ (non-test), workers/
CONSUMER_ROOTS = [
    ("packages/ingestion-pipeline/src", "ingestion-pipeline"),
    ("apps/web", "apps-web"),
    ("packages/feature-store/src", "feature-store"),
    ("packages/verifier/src", "verifier"),
    ("packages/ops/src", "ops"),
    ("scripts", "scripts"),
    ("intelligence", "intelligence"),
    ("workers", "workers"),
]

# Which PE modules does each consumer import, and HOW?
pe_imports = collections.defaultdict(set)   # pe_module -> set(consumer roots)
by_basename = collections.defaultdict(list)
for m in files:
    by_basename[os.path.basename(m)].append(m)

rel_by_mod = {m: m + ".js" for m in files}


def resolve(spec, consumer_root):
    """Resolve a @sports/prediction-engine import spec to PE module keys."""
    out = set()
    if spec.startswith("@sports/prediction-engine/src/"):
        rel = spec.split("@sports/prediction-engine/src/", 1)[1]
        rel = rel[:-3] if rel.endswith(".js") else rel
        if rel in files:
            out.add(rel)
        return out
    if spec in ("@sports/prediction-engine", "@sports/prediction-engine/src"):
        return set()
    # bare package: any PE module whose exported symbol matches -> handled by caller
    return out


symbol_to_mods = collections.defaultdict(set)
for m, p in files.items():
    txt = open(p, encoding="utf8", errors="replace").read()
    for name in re.findall(r'export\s+(?:async\s+)?(?:function|const|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)', txt):
        symbol_to_mods[name].add(m)
    for name in re.findall(r'export\s*\{([^}]*)\}', txt):
        for part in name.split(","):
            n = part.strip().split(" as ")[0].strip()
            n = re.sub(r'^type\s+', '', n)
            if re.match(r'^[A-Za-z_$][\w$]*$', n):
                symbol_to_mods[n].add(m)

for root, label in CONSUMER_ROOTS:
    rp = os.path.join(WT, root)
    if not os.path.isdir(rp):
        continue
    for dp, dn, fn in os.walk(rp):
        dn[:] = [x for x in dn if x not in ("node_modules", ".git", ".next", "dist", "__pycache__")]
        for f in fn:
            if not (f.endswith(".ts") or f.endswith(".tsx")) or f.endswith(".test.ts"):
                continue
            p = os.path.join(dp, f)
            txt = open(p, encoding="utf8", errors="replace").read()
            for m in re.findall(r'from\s+"(@sports/prediction-engine[^"]*)"', txt):
                for mod in resolve(m, label):
                    pe_imports[mod].add(label)
            # named symbol imports from the barrel
            for blk in re.findall(r'import\s*\{([^}]*)\}\s*from\s*"@sports/prediction-engine"', txt, re.S):
                for part in blk.split(","):
                    n = part.strip().split(" as ")[0].strip()
                    n = re.sub(r'^type\s+', '', n)
                    if n and re.match(r'^[A-Za-z_$][\w$]*$', n):
                        for mod in symbol_to_mods.get(n, ()):
                            pe_imports[mod].add(label)

# barrel exports
barrel = open(os.path.join(PE, "index.ts"), encoding="utf8", errors="replace").read()
barrel_mods = set()
for m in re.findall(r'from\s+"\./([^"]+)"', barrel):
    t = m[:-3] if m.endswith(".js") else m
    if t in files:
        barrel_mods.add(t)
    elif t + "/index" in files:
        barrel_mods.add(t + "/index")
for blk in re.findall(r'export\s*\{([^}]*)\}', barrel):
    for part in blk.split(","):
        n = part.strip().split(" as ")[0].strip()
        n = re.sub(r'^type\s+', '', n)
        if n and re.match(r'^[A-Za-z_$][\w$]*$', n):
            barrel_mods |= symbol_to_mods.get(n, set())

prod = set(scoring_closure) | set(pe_imports.keys())

tiers = {"PROD": [], "BARREL_ONLY": [], "ORPHAN": []}
for m in sorted(files):
    if m in scoring_closure:
        tiers["PROD"].append({"module": m, "via": "scoring-closure" if m not in pe_imports else "scoring-closure+consumer",
                              "consumers": sorted(pe_imports.get(m, []))})
    elif m in pe_imports:
        tiers["PROD"].append({"module": m, "via": "consumer-import", "consumers": sorted(pe_imports[m])})
    elif m in barrel_mods:
        tiers["BARREL_ONLY"].append({"module": m})
    else:
        tiers["ORPHAN"].append({"module": m})


def is_arxiv(m):
    return bool(re.search(r'(^|/)\d{4}-\d{5}', m))


out = {
    "method": ("Tier 0 PROD = transitively imported from packages/prediction-engine/src/scoring.ts "
               "OR imported by a production consumer (packages/ingestion-pipeline, apps/web, "
               "packages/feature-store, packages/verifier, packages/ops, scripts, intelligence, workers) "
               "resolving @sports/prediction-engine barrel symbol imports back to their defining module. "
               "Tier 1 BARREL_ONLY = exported from src/index.ts, imported by no production consumer. "
               "Tier 2 ORPHAN = neither."),
    "totals": {
        "total_non_test_modules": len(files),
        "PROD": len(tiers["PROD"]),
        "BARREL_ONLY": len(tiers["BARREL_ONLY"]),
        "ORPHAN": len(tiers["ORPHAN"]),
        "PROD_arxiv_derived": sum(1 for t in tiers["PROD"] if is_arxiv(t["module"])),
        "BARREL_ONLY_arxiv_derived": sum(1 for t in tiers["BARREL_ONLY"] if is_arxiv(t["module"])),
        "ORPHAN_arxiv_derived": sum(1 for t in tiers["ORPHAN"] if is_arxiv(t["module"])),
    },
    "scoring_closure": sorted(scoring_closure),
    "scoring_closure_size": len(scoring_closure),
    "tiers": tiers,
    "pe_modules_with_production_consumers": {
        "count": len(pe_imports),
        "by_consumer_root": dict(collections.Counter(
            c for v in pe_imports.values() for c in v).most_common()),
    },
}

p = os.path.join(WT, "reconciliation", "tiers.json")
with open(p, "w", encoding="utf8") as f:
    json.dump(out, f, indent=1)
print("wrote", p, os.path.getsize(p))
print(json.dumps(out["totals"], indent=1))
print("scoring closure:", sorted(scoring_closure))
print("PE modules with a production consumer:", len(pe_imports))
print("consumer roots:", out["pe_modules_with_production_consumers"]["by_consumer_root"])
