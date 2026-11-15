#!/usr/bin/env python3
"""Python feature bridge for the pregame run.

    python scripts/ops/pregame_python_features.py --in bundle.json --out features.json

Reads a GameEvidenceBundle JSON, runs the parts of the quantitative
architecture that live in Python, and writes a schema-validated feature object.

What it computes
----------------
1. Six-method de-vig cross-check on the moneyline. The six methods are
   Multiplicative, Additive, Cheung odds-ratio, Probit, Power and Shin. If the
   methods disagree by more than `MAX_METHOD_SPREAD`, the market is not a clean
   two-way price and the cross-check reports `agreement: false`. That is a gate
   input, not a number to average away.
2. Weather ballistics: air density from temperature and elevation, then a
   field-goal range delta. Wind is used as a scalar because the NWS reading
   carries no direction; the bridge says so rather than inventing an azimuth.

What it does NOT do
-------------------
It does not produce a probability. It produces features. The posterior is
formed in TypeScript from the market prior plus fitted coefficients, and no
coefficient is fitted yet.

Every output field carries `status`: REAL when computed from a present input,
MISSING when an input was absent. A MISSING field is never a zero.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "intelligence" / "architecture"))

try:
    from unified_quantitative_nfl_architecture import (  # type: ignore
        american_to_raw_implied_prob,
        devig_all_six_methods,
        humid_air_density_kg_m3,
    )
except Exception as exc:  # pragma: no cover
    print(f"FATAL: cannot import the quantitative architecture: {exc}", file=sys.stderr)
    raise SystemExit(1)

SCHEMA = "gse.pregame.python-features.v1"
MAX_METHOD_SPREAD = 0.02


def present(ev: Any) -> Optional[float]:
    """Read an Evidence<number> value, or None when it is MISSING."""
    if not isinstance(ev, dict):
        return None
    if ev.get("status") not in ("REAL", "DERIVED"):
        return None
    v = ev.get("value")
    return float(v) if isinstance(v, (int, float)) else None


def devig_cross_check(home_ml: Optional[float], away_ml: Optional[float]) -> Dict[str, Any]:
    if home_ml is None or away_ml is None:
        return {
            "status": "MISSING",
            "reason": "homeMoneyline or awayMoneyline absent",
            "methods": {},
            "agreement": None,
            "spread": None,
        }
    raw = [american_to_raw_implied_prob(home_ml), american_to_raw_implied_prob(away_ml)]
    methods = devig_all_six_methods(raw)
    home_probs: List[float] = []
    for name, probs in methods.items():
        if len(probs) >= 1:
            home_probs.append(float(probs[0]))
    if not home_probs:
        return {
            "status": "MISSING",
            "reason": "no de-vig method returned a probability",
            "methods": {},
            "agreement": None,
            "spread": None,
        }
    spread = max(home_probs) - min(home_probs)
    return {
        "status": "REAL",
        "rawImpliedHome": round(raw[0], 6),
        "rawImpliedAway": round(raw[1], 6),
        "holdPct": round((raw[0] + raw[1] - 1.0) * 100.0, 4),
        "methods": {k: [round(float(x), 6) for x in v] for k, v in methods.items()},
        "homeProbMin": round(min(home_probs), 6),
        "homeProbMax": round(max(home_probs), 6),
        "spread": round(spread, 6),
        "agreement": spread <= MAX_METHOD_SPREAD,
        "threshold": MAX_METHOD_SPREAD,
    }


def weather_ballistics(weather: Any) -> Dict[str, Any]:
    if not isinstance(weather, dict) or weather.get("status") not in ("REAL", "DERIVED"):
        return {"status": "MISSING", "reason": "weather absent"}
    w = weather.get("value") or {}
    temp_f = w.get("temperatureF")
    wind = w.get("windMph")
    if not isinstance(temp_f, (int, float)):
        return {"status": "MISSING", "reason": "temperatureF absent"}
    temp_c = (float(temp_f) - 32.0) * 5.0 / 9.0
    # Signature is (temp_c, relative_humidity_0_1, elevation_m). The venue
    # elevation is not in the bundle, so this is sea level and the output says
    # so. Humidity is not in the bundle either; 0.5 is a stated assumption, not
    # a measurement, and it moves density by well under 1%.
    rho = humid_air_density_kg_m3(temp_c, 0.5, 0.0)
    # A 1 mph headwind costs roughly 0.35 yards of field-goal range at 50 yards.
    # This is a documented rule of thumb, not a fitted coefficient, so it is
    # reported as a diagnostic and carries no weight.
    wind_delta = -0.35 * float(wind) if isinstance(wind, (int, float)) else None
    return {
        "status": "REAL",
        "temperatureC": round(temp_c, 3),
        "airDensityKgM3": round(rho, 5),
        "windMph": wind if isinstance(wind, (int, float)) else None,
        "windDirectionDeg": w.get("windDirectionDeg"),
        "fgRangeDeltaYards": None if wind_delta is None else round(wind_delta, 3),
        "note": (
            "air density at standard sea-level pressure; venue elevation is not in "
            "the bundle. Wind is scalar because the NWS reading carries no direction."
        ),
        "emissionWeight": 0,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", required=True)
    ap.add_argument("--out", dest="out", required=True)
    args = ap.parse_args()

    bundle = json.loads(Path(args.inp).read_text(encoding="utf-8"))
    market = bundle.get("market") or {}

    features = {
        "schema": SCHEMA,
        "gameId": (bundle.get("identity") or {}).get("gameId"),
        "codeVersion": bundle.get("codeVersion"),
        "devigCrossCheck": devig_cross_check(
            present(market.get("homeMoneyline")), present(market.get("awayMoneyline"))
        ),
        "weatherBallistics": weather_ballistics(bundle.get("weather")),
        "emissionWeight": 0,
        "note": (
            "Features only. No probability is produced here. The de-vig cross-check "
            "is a gate input; the ballistics are a diagnostic with weight zero."
        ),
    }

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(features, indent=2, sort_keys=True), encoding="utf-8")

    dc = features["devigCrossCheck"]
    print(f"devig status {dc['status']}  agreement {dc.get('agreement')}  spread {dc.get('spread')}")
    print(f"weather status {features['weatherBallistics']['status']}")
    print(f"wrote {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
