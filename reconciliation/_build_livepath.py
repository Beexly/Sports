#!/usr/bin/env python3
"""Third pass: which prediction-engine modules are on the LIVE publish path?

Live paths (what actually ships numbers):
  A) paid-odds cron path : apps/web/app/api/cron/refresh-odds -> processSport
                           -> process-sport.ts -> scoreGames -> scoring.ts
  B) board-fill cron path : board-fill.ts -> generate-signal-slate.ts  (EMISSION-GATED, closed)
  C) week-6 manual path   : scripts/publish_late_sun_mon_live_free.py -> scripts/sync_week6_db.py
                           (Python; bypasses the whole TS engine)

Walk A and B into the PE package; list the PE modules each path actually reaches.
"""
import os, re, json, collections

WT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PE = os.path.join(WT, "packages", "prediction-engine", "src")
IP = os.path.join(WT, "packages", "ingestion-pipeline", "src")

pe_files, ip_files = {}, {}
for root, store in ((PE, pe_files), (IP, ip_files)):
    for dp, dn, fn in os.walk(root):
        dn[:] = [x for x in dn if x not in ("node_modules", ".git", "dist")]
        for f in fn:
            if f.endswith(".ts") and not f.endswith(".test.ts"):
                rel = os.path.relpath(os.path.join(dp, f), root).replace("\\", "/")
                store[rel[:-3]] = os.path.join(dp, f)

pe_sym = collections.defaultdict(set)   # exported symbol -> PE modules
for m, p in pe_files.items():
    txt = open(p, encoding="utf8", errors="replace").read()
    for name in re.findall(r'export\s+(?:async\s+)?(?:function|const|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)', txt):
        pe_sym[name].add(m)
    for blk in re.findall(r'export\s*\{([^}]*)\}', txt):
        for part in blk.split(","):
            n = part.strip().split(" as ")[0].strip()
            n = re.sub(r'^type\s+', '', n)
            if re.match(r'^[A-Za-z_$][\w$]*$', n):
                pe_sym[n].add(m)


def pe_deps(mod, seen=None):
    """Local deps inside PE + PE modules reached via barrel symbol imports."""
    if seen is None:
        seen = set()
    if mod in seen:
        return seen
    seen.add(mod)
    try:
        txt = open(pe_files[mod], encoding="utf8", errors="replace").read()
    except Exception:
        return seen
    for m in re.findall(r'from\s+"(\.[^"]+)"', txt):
        t = m[2:]
        if t.endswith(".js"):
            t = t[:-3]
        if t in pe_files:
            pe_deps(t, seen)
        elif t + "/index" in pe_files:
            pe_deps(t + "/index", seen)
    for blk in re.findall(r'import\s*\{([^}]*)\}\s*from\s*"(\.[^"]+)"', txt, re.S):
        names, src = blk
        t = src[2:]
        if t.endswith(".js"):
            t = t[:-3]
        if t in pe_files or t + "/index" in pe_files:
            continue
        for part in names.split(","):
            n = part.strip().split(" as ")[0].strip()
            n = re.sub(r'^type\s+', '', n)
            for pm in pe_sym.get(n, ()):
                pe_deps(pm, seen)
    return seen


def ip_entry_reach(entry):
    """Walk ingestion-pipeline from entry, collecting PE modules touched."""
    touched = set()
    seen_ip = set()
    stack = [entry]
    while stack:
        m = stack.pop()
        if m in seen_ip or m not in ip_files:
            continue
        seen_ip.add(m)
        txt = open(ip_files[m], encoding="utf8", errors="replace").read()
        # local
        for x in re.findall(r'from\s+"(\.[^"]+)"', txt):
            t = x[2:]
            if t.endswith(".js"):
                t = t[:-3]
            if t in ip_files:
                stack.append(t)
            elif t + "/index" in ip_files:
                stack.append(t + "/index")
        # PE barrel imports
        for blk in re.findall(r'import\s*\{([^}]*)\}\s*from\s*"@sports/prediction-engine"', txt, re.S):
            for part in blk.split(","):
                n = part.strip().split(" as ")[0].strip()
                n = re.sub(r'^type\s+', '', n)
                for pm in pe_sym.get(n, ()):
                    pe_deps(pm)
                    touched.add(pm)
        # deep PE imports
        for x in re.findall(r'from\s+"@sports/prediction-engine/src/([^"]+)"', txt):
            t = x[:-3] if x.endswith(".js") else x
            if t in pe_files:
                pe_deps(t)
                touched.add(t)
    return touched, seen_ip


pathA, ipA = ip_entry_reach("process-sport")
pathB, ipB = ip_entry_reach("generate-signal-slate")
pathB2, ipB2 = ip_entry_reach("board-fill")

# scripts consumers
script_pe = set()
for dp, dn, fn in os.walk(os.path.join(WT, "scripts")):
    dn[:] = [x for x in dn if x not in ("node_modules", ".git")]
    for f in fn:
        if not f.endswith(".ts") or f.endswith(".test.ts"):
            continue
        txt = open(os.path.join(dp, f), encoding="utf8", errors="replace").read()
        for blk in re.findall(r'import\s*\{([^}]*)\}\s*from\s*"@sports/prediction-engine"', txt, re.S):
            for part in blk.split(","):
                n = part.strip().split(" as ")[0].strip()
                n = re.sub(r'^type\s+', '', n)
                for pm in pe_sym.get(n, ()):
                    pe_deps(pm)
                    script_pe.add(pm)

out = {
    "path_A_paid_odds_cron": {
        "entry": "packages/ingestion-pipeline/src/process-sport.ts (reached from apps/web/app/api/cron/refresh-odds/route.ts)",
        "pe_modules_touched": len(pathA),
        "pe_modules": sorted(pathA),
        "ingestion_modules_touched": len(ipA),
    },
    "path_B_board_fill_cron": {
        "entry": "packages/ingestion-pipeline/src/board-fill.ts -> generate-signal-slate.ts",
        "note": "EMISSION GATE CLOSED: walk-forward-gate.json passed=false -> generate-signal-slate.ts:265 returns 0 picks",
        "pe_modules_touched": len(pathB | pathB2),
        "pe_modules": sorted(pathB | pathB2),
    },
    "scripts_consumers": {"pe_modules_touched": len(script_pe), "pe_modules": sorted(script_pe)},
    "python_week6_manual_path": {
        "entry": "scripts/publish_late_sun_mon_live_free.py -> scripts/sync_week6_db.py",
        "pe_modules_touched": 0,
        "note": "Pure-Python re-implementation. Imports nothing from packages/prediction-engine. "
                "Bypasses the TS engine, all TS honesty gates, and the walk-forward emission gate.",
    },
}

out["union_of_live_ts_paths"] = sorted(pathA | pathB | pathB2 | script_pe)
out["union_size"] = len(out["union_of_live_ts_paths"])

p = os.path.join(WT, "reconciliation", "live-path.json")
with open(p, "w", encoding="utf8") as f:
    json.dump(out, f, indent=1)
print("wrote", p)
print("A (paid odds cron) PE modules:", len(pathA))
print("B (board-fill cron) PE modules:", len(pathB | pathB2))
print("scripts PE modules:", len(script_pe))
print("UNION of live TS paths:", len(out["union_of_live_ts_paths"]))
print("C (week6 manual python) PE modules: 0")
