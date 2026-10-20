#!/usr/bin/env python3
"""Census the DARK_NO_PIT evaluators in signal-registry-extensions.ts.

For each: its id, family, the dataDependencies it declares, and the env keys
it reads (which is the actual missing feed), plus whether a producer for that
key exists in the repo.
"""
import json, os, re

WT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(WT, "packages/ingestion-pipeline/src/signal-registry-extensions.ts")
text = open(SRC, encoding="utf8").read()

# Each SignalDefinition literal
blocks = []
for m in re.finditer(r"export const (\w+): SignalDefinition = \{(.*?)\n\};", text, re.S):
    blocks.append((m.group(1), m.group(2)))

rows = []
for name, body in blocks:
    if "DARK" not in body:
        continue
    sid = re.search(r'\bid:\s*"([^"]+)"', body)
    label = re.search(r'label:\s*"([^"]+)"', body)
    fam = re.search(r'\bfamily:\s*"([^"]+)"', body)
    cat = re.search(r'\bcategory:\s*"([^"]+)"', body)
    status = re.search(r'activationStatus:\s*"([^"]+)"', body)
    reason = re.search(r'blockedReason:\s*(\w+)', body)
    deps = re.search(r'dataDependencies:\s*\[([^\]]*)\]', body)
    dep_list = re.findall(r'"([^"]+)"', deps.group(1)) if deps else []
    env_keys = sorted(
        set(re.findall(r'num\(ctx\.env,\s*"([^"]+)"\)', body))
        | set(re.findall(r'bool\(ctx\.env,\s*"([^"]+)"\)', body))
        | set(re.findall(r'str\(ctx\.env,\s*"([^"]+)"\)', body))
        | set(re.findall(r'ctx\.env\["([^"]+)"\]', body))
    )
    rows.append({
        "const_name": name,
        "signal_id": sid.group(1) if sid else None,
        "label": label.group(1) if label else None,
        "family": fam.group(1) if fam else None,
        "category": cat.group(1) if cat else None,
        "activationStatus": status.group(1) if status else None,
        "blocked_reason_const": reason.group(1) if reason else None,
        "data_dependencies": dep_list,
        "env_keys_read": env_keys,
    })

by_fam = {}
for r in rows:
    by_fam.setdefault(r["family"] or "?", []).append(r)

# Which env keys are actually produced anywhere in the repo?
producers = {}
for key in sorted({k for r in rows for k in r["env_keys_read"]}):
    hits = []
    for root in ["packages/ingestion-pipeline/src", "apps/web/app/api/cron", "apps/web/lib",
                 "intelligence", "scripts", "packages/data-ingestion/src", "packages/feature-store/src"]:
        rp = os.path.join(WT, root)
        if not os.path.isdir(rp):
            continue
        for dp, dn, fn in os.walk(rp):
            dn[:] = [x for x in dn if x not in ("node_modules", ".next", "dist", "__pycache__")]
            for f in fn:
                if not (f.endswith(".ts") or f.endswith(".tsx") or f.endswith(".py")):
                    continue
                if ".test." in f or f.startswith("test_"):
                    continue
                p = os.path.join(dp, f)
                try:
                    body = open(p, encoding="utf8", errors="replace").read()
                except Exception:
                    continue
                # The DARK file itself READS these keys; it is not a producer.
                if "signal-registry-extensions" in p.replace("\\", "/"):
                    continue
                if key not in body:
                    continue
                rel = os.path.relpath(p, WT).replace("\\", "/")
                # A producer must WRITE the key: assign into an env object, or
                # name it in a producer's own declaration. A mere mention --
                # especially a `num(ctx.env, KEY)` read -- is not a producer.
                for i, line in enumerate(body.split("\n"), 1):
                    if key not in line:
                        continue
                    stripped = line.strip()
                    # a write looks like `KEY: value`, `env[KEY] =`, `env.KEY =`,
                    # or the key on the LHS of an assignment.
                    if re.match(rf"['\"]?{re.escape(key)}['\"]?\s*[:=]", stripped) and not stripped.startswith("//"):
                        hits.append(f"{rel}:{i}")
                        break
                    if re.search(rf"(env|Env|ENV|process\.env)\s*\[\s*['\"]{re.escape(key)}['\"]\s*\]\s*=", stripped):
                        hits.append(f"{rel}:{i}")
                        break
                    if re.search(rf"process\.env\.{re.escape(key)}\s*=", stripped):
                        hits.append(f"{rel}:{i}")
                        break
    producers[key] = sorted(set(hits))[:4]

for r in rows:
    r["producer_evidence"] = {k: producers.get(k, []) for k in r["env_keys_read"]}
    r["verdict"] = ("PRODUCER-EXISTS-AND-UNWIRED"
                    if any(producers.get(k) for k in r["env_keys_read"])
                    else "PRODUCER-MISSING")

out = {
    "artifact": "dark_sources_census",
    "source_file": "packages/ingestion-pipeline/src/signal-registry-extensions.ts",
    "measured": "2026-10-20",
    "d ark_constant": "DARK_NO_PIT = 'DARK: no point-in-time producer on the mint path. Env keys are not a feed.'",
    "dark_evaluator_count": len(rows),
    "count_by_family": {k: len(v) for k, v in sorted(by_fam.items())},
    "count_by_verdict": {
        "PRODUCER-EXISTS-AND-UNWIRED": sum(1 for r in rows if r["verdict"] == "PRODUCER-EXISTS-AND-UNWIRED"),
        "PRODUCER-MISSING": sum(1 for r in rows if r["verdict"] == "PRODUCER-MISSING"),
    },
    "evaluators": rows,
}
p = os.path.join(WT, "reconciliation", "dark_sources_census.json")
json.dump(out, open(p, "w", encoding="utf8"), indent=1)
print("wrote", p)
print("dark evaluators:", len(rows))
print("by family:", json.dumps(out["count_by_family"]))
print("by verdict:", json.dumps(out["count_by_verdict"]))
print()
for r in rows:
    print(f"  {r['signal_id']:38s} {r['family'] or '-':16s} {r['verdict']}")
    print(f"      deps: {', '.join(r['data_dependencies'])}")
    print(f"      env keys: {', '.join(r['env_keys_read']) or '(none)'}")
