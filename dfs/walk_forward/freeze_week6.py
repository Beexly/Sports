#!/usr/bin/env python3
"""freeze_week6.py -- freeze exactly one outcome. No partial freeze.

If hybrid_result.json shows gate_cleared true (CRPS <= 7.099 on n >= 150 AND
the reproduction requirement met), freeze the model parameters.
Otherwise freeze the 0-object emission parameters and leave passed false.
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
RESULT = os.path.join(HERE, "hybrid_result.json")
OUT = os.path.join(HERE, "week6_freeze.json")


def main():
    with open(RESULT) as f:
        r = json.load(f)

    cleared = (r.get("gate_cleared") is True
               and r.get("reproduced_within_1e-4") is True
               and r.get("leak") is False)

    if cleared:
        payload = {
            "mode": "SHADOW_MODEL",
            "frozen_at": "2026-10-14",
            "note": "DIAGNOSTIC shadow only. This file does not open the emission gate.",
            "hybrid_crps_on_frozen_filter": r["hybrid_crps"],
            "gaussian_crps_on_frozen_filter": r["gaussian_crps"],
            "n": r["n"],
            "beta_last": r["beta_last"],
            "fallback_levels": r["fallback_levels"],
            "mu": "spread_line",
            "sigma_base": 13.45,
            "atoms": "residual-relative +-3, +-7",
            "passed": False,
            "emission": "0 picks / 0 parlays / 0 DFS",
        }
    else:
        payload = {
            "mode": "ZERO_OBJECT",
            "frozen_at": "2026-10-14",
            "note": "Gate not cleared. Emission stays the 0-object. passed remains false.",
            "hybrid_crps_on_frozen_filter": r.get("hybrid_crps"),
            "gaussian_crps_on_frozen_filter": r.get("gaussian_crps"),
            "reproduction_target": r.get("reproduction_target"),
            "reproduced_within_1e-4": r.get("reproduced_within_1e-4"),
            "n": r.get("n"),
            "gate": 7.099,
            "passed": False,
            "emission": "0 picks / 0 parlays / 0 DFS",
        }

    with open(OUT, "w") as f:
        json.dump(payload, f, indent=1)
    print(json.dumps(payload, indent=1))


if __name__ == "__main__":
    main()
