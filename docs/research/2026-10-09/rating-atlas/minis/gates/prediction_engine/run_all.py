#!/usr/bin/env python3
"""Run all module 17-20 gate evals and emit a combined stamp."""
import json, subprocess, sys, os

MODS = ["mod17_hierarchical_live_probit.py", "mod18_doubly_self_exciting.py",
        "mod19_conformal_ncp.py", "mod20_notears_dag.py"]
HERE = os.path.dirname(os.path.abspath(__file__))

results = []
for m in MODS:
    try:
        r = subprocess.run([sys.executable, os.path.join(HERE, m)],
                           capture_output=True, text=True, timeout=590)
        results.append(json.loads(r.stdout))
    except Exception as e:
        results.append({"module": m, "verdict": "NOT_EVALUATED",
                        "note": f"runner error: {e}"})

print(json.dumps({"evaluated_at": "2026-10-11",
                  "modules": results}, indent=2))
