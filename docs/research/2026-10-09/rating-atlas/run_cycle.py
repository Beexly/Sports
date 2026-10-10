#!/usr/bin/env python3
"""Research cycle runner for the rating-atlas packet.

Runs the research self-checks that live beside this file and exits non-zero
on any failure. Stdlib only. Research files only — touches no production
package, no Stripe, no MODEL_VERSION.

    python3 run_cycle.py
"""

import os
import subprocess
import sys

CYCLE = [
    "glicko2.py",
    "engine_math.py",
    "props_optimizer.py",
    "verify_claims.py",
]


def main():
    # Keep __pycache__ out of the research tree (bytecode from imported
    # siblings once swept a .pyc into a commit).
    env = dict(os.environ)
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    failures = []
    for script in CYCLE:
        print("== %s" % script)
        proc = subprocess.run(
            [sys.executable, script],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            env=env,
        )
        sys.stdout.write(proc.stdout)
        if proc.stdout and not proc.stdout.endswith("\n"):
            print()
        if proc.returncode != 0:
            failures.append((script, proc.returncode))
            print("!! %s exited %d" % (script, proc.returncode))
    if failures:
        print("run_cycle FAILED: %s" % ", ".join("%s (%d)" % f for f in failures))
        return 1

    # Regression gate: the delivery rewrite must stay fixed. These strings are
    # killed claims; if they reappear, the rewrite regressed.
    delivery = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                            "FULL_STACK_DELIVERY.md")
    if os.path.exists(delivery):
        text = open(delivery, encoding="utf-8").read()
        banned = [
            "matches Glickman's published example exactly",
            "def ci(",
            "tighten to 13.4",
            "hfa=1.56 [1.54,1.59]",
            "sigma=13.36 [13.34,13.37]",
            "13.36 [13.34, 13.37]",
        ]
        hits = [b for b in banned if b in text]
        if hits:
            print("run_cycle FAILED: delivery regression gate hit: %s" % hits)
            return 1
        print("delivery regression gate ok")

    print("run_cycle ok: %s" % ", ".join(CYCLE))
    return 0


if __name__ == "__main__":
    sys.exit(main())
