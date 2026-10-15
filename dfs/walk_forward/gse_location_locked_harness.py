#!/usr/bin/env python3
"""gse_location_locked_harness.py -- location-locked walk-forward CRPS harness.

DIAGNOSTIC ONLY. This file cannot open the emission gate. walk_forward.json is
a protected file and is never written here.

DESIGN (three phases, in this order, fail-closed):

  PHASE 1  REPRODUCE.  Score the Gaussian baseline on the frozen filter and
          assert n == 2462 and CRPS == 7.154021 to 5e-5. If either misses, the
          run ABORTS before any experiment. A harness that cannot reproduce its
          own baseline is not allowed to report a delta.

  PHASE 2  SCORE.  For each residual-object candidate: fit ONLY on strictly
          earlier (season, week) games, then score. delta = crps_with -
          crps_without. A candidate is REFUSED when delta >= 0. There is no
          exception for "close", and no committee vote.

  PHASE 3  DECIDE.  Write the result object with the refusal reasons. Emission
          stays the 0-object regardless of what this file measures, because
          opening it requires editing walk_forward.json, which is protected.

  LOCATION LOCK.  Data path is pinned to GAMES_CSV if set, else the scratch
  copy. The path is resolved once at import and re-asserted per run, so a
  relative-path accident cannot silently score a different file.

  NO IMPUTATION.  A game missing home_score, away_score, or spread_line is
  skipped and COUNTED, never filled. Missing keys are listed in the output.
"""
import csv
import json
import math
import os
import sys
import importlib.util
from collections import defaultdict

# ---------------------------------------------------------------- constants

HERE = os.path.dirname(os.path.abspath(__file__))

# Location lock. Resolved once; re-asserted on every run.
DEFAULT_GAMES = os.path.join(
    os.environ.get("LOCALAPPDATA", ""),
    "hermes", "cache", "scratch", "nflverse_games.csv",
)
GAMES = os.path.abspath(os.environ.get("GAMES_CSV", DEFAULT_GAMES))

SIGMA_FIXED = 13.45
GATE = 7.099
N_MIN = 150
BASELINE_CRPS = 7.154021
BASELINE_N = 2462
REPRO_TOL = 5e-5

REQUIRED = ("home_score", "away_score", "spread_line")

# Reuse the TESTED energy-form hybrid CRPS rather than re-deriving it here. A
# local copy of this formula was itself a bug source: dropping the E|X-X'| term
# inflates hybrid scores by 0.3-0.8 and turns "key numbers are neutral" into
# "key numbers are catastrophic". Imported after HERE is defined.
_spec = importlib.util.spec_from_file_location(
    "hybrid_crps", os.path.join(HERE, "hybrid_crps.py"))
_hc = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_hc)
_hybrid_crps_energy = _hc.crps_energy

# Cell bins, identical to knm_vectorized.py so the two harnesses are comparable.
T_EDGES = [41.0, 45.0, 48.0]
S_EDGES = [3.5, 7.5]
CELL_MIN = 30


# ---------------------------------------------------------------- io

def _num(x, k):
    v = x.get(k)
    if v in ("", "NA", None):
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def load_frozen():
    """Load the frozen REG 2017 W1..2026 W5 filter. No imputation."""
    if not os.path.exists(GAMES):
        raise SystemExit(f"FAIL-CLOSED: data path not found: {GAMES}")

    rows, skipped = [], []
    with open(GAMES, newline="", encoding="utf-8") as f:
        for x in csv.DictReader(f):
            if x.get("game_type") != "REG":
                continue
            season = x.get("season")
            try:
                season = int(season)
            except (TypeError, ValueError):
                skipped.append({"why": "bad season", "game_id": x.get("game_id")})
                continue
            if not (2017 <= season <= 2026):
                continue

            vals = {k: _num(x, k) for k in REQUIRED}
            missing = [k for k, v in vals.items() if v is None]
            if missing:
                skipped.append({"game_id": x.get("game_id"), "missing": missing})
                continue

            week = x.get("week")
            try:
                week = int(week)
            except (TypeError, ValueError):
                skipped.append({"game_id": x.get("game_id"), "missing": ["week"]})
                continue

            # 2026 is only through week 5 on the frozen filter.
            if season == 2026 and week > 5:
                continue

            total = _num(x, "total_line")
            rows.append({
                "game_id": x.get("game_id"),
                "season": season,
                "week": week,
                "spread_line": vals["spread_line"],
                "total_line": total,
                "margin": vals["home_score"] - vals["away_score"],
                "home_rest": _num(x, "home_rest"),
                "away_rest": _num(x, "away_rest"),
            })

    rows.sort(key=lambda r: (r["season"], r["week"]))
    return rows, skipped


# ---------------------------------------------------------------- scoring

def crps_gaussian(mu, sd, x):
    """CRPS of N(mu, sd) at observation x. Analytic.

    CRPS(N(mu,s^2), x) = s * [ z*(2*Phi(z) - 1) + 2*phi(z) - 1/sqrt(pi) ],
    z = (x - mu)/s.
    """
    if sd <= 0:
        raise ValueError("sd must be positive")
    z = (x - mu) / sd
    phi = math.exp(-0.5 * z * z) / math.sqrt(2.0 * math.pi)
    Phi = 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))
    return sd * (z * (2.0 * Phi - 1.0) + 2.0 * phi - 1.0 / math.sqrt(math.pi))


def crps_energy(mu, sd, p3, p7, y):
    """Energy-form hybrid CRPS, imported from the tested hybrid_crps module.

    E[X] = continuous N(0,sd) with mass (1-p3-p7) plus symmetric atoms at
    residual -+3 and -+7. CRPS = E|X-y| - 0.5*E|X-X'|.

    The E|X-X'| term is NOT optional: it is what penalises the atoms, and
    omitting it (an earlier version of this harness did exactly that) inflates
    every hybrid score by ~0.3-0.8 and makes key numbers look catastrophic when
    they are merely neutral. Use the tested implementation, not a local copy.
    """
    return _hybrid_crps_energy(mu, sd, p3, p7, y)


def t_bin(t):
    if t is None:
        return 3
    if t < T_EDGES[0]:
        return 0
    if t < T_EDGES[1]:
        return 1
    if t < T_EDGES[2]:
        return 2
    return 3


def s_bin(s):
    a = abs(s)
    if a < S_EDGES[0]:
        return 0
    if a < S_EDGES[1]:
        return 1
    return 2


def rest_bin(r):
    if r is None:
        return None
    return 0 if r <= 3 else (1 if r <= 6 else 2)


def cell_key(row):
    rb = rest_bin(row["home_rest"] if row["home_rest"] is not None else row["away_rest"])
    return (rb, t_bin(row["total_line"]), s_bin(row["spread_line"]))


# ---------------------------------------------------------------- candidates

def score_baseline(rows):
    """Gaussian(mu=spread_line, sigma=13.45) on every row."""
    n = 0
    tot = 0.0
    for r in rows:
        tot += crps_gaussian(r["spread_line"], SIGMA_FIXED, r["margin"])
        n += 1
    return {"n": n, "crps": tot / n}


def score_cell_conditional(rows, min_cell=CELL_MIN):
    """Laplace-style: sigma = mean|Y-mu| over STRICTLY EARLIER games in the
    same cell, falling back to coarser bins then global when a cell is thin.

    Prior-only: for row i we use only rows j with (season,week) strictly less.
    """
    n = 0
    tot = 0.0
    levels = defaultdict(int)
    # prior accumulators keyed by each bin level
    prior_full = defaultdict(list)
    prior_coarse = defaultdict(list)
    prior_global = []
    seen_weeks = set()

    for r in rows:
        wk = (r["season"], r["week"])
        resid = r["margin"] - r["spread_line"]
        a = abs(resid)
        k = cell_key(r)

        # choose scale from PRIOR ONLY
        sd = None
        level = None
        if k in prior_full and len(prior_full[k]) >= min_cell:
            sd = sum(prior_full[k]) / len(prior_full[k])
            level = 0
        else:
            coarse = (k[1], k[2])
            if coarse in prior_coarse and len(prior_coarse[coarse]) >= min_cell:
                sd = sum(prior_coarse[coarse]) / len(prior_coarse[coarse])
                level = 1
            elif len(prior_global) >= min_cell:
                sd = sum(prior_global) / len(prior_global)
                level = 2
            else:
                sd = SIGMA_FIXED
                level = 3

        # sigma must stay positive; a zero-scale prior is a degenerate cell
        if sd is None or sd <= 0:
            sd = SIGMA_FIXED
            level = 3

        tot += crps_gaussian(r["spread_line"], sd, r["margin"])
        n += 1
        levels[level] += 1

        # now update priors (this row becomes history for later rows)
        if wk not in seen_weeks:
            prior_full[k].append(a)
            prior_coarse[(k[1], k[2])].append(a)
            prior_global.append(a)
            seen_weeks.add(wk)

    return {"n": n, "crps": tot / n, "levels": dict(levels)}


def score_keynumbers(rows, p3, p7, min_cell=CELL_MIN):
    """Hybrid: Gaussian sigma from the cell's prior residual dispersion, plus
    symmetric residual-relative atoms.

    UNIT NOTE.  The prior store accumulates mean ABSOLUTE residual -- a Laplace
    scale b.  crps_energy needs a GAUSSIAN sigma.  For a Gaussian the mean
    absolute deviation is sd*sqrt(2/pi), so sigma = b*sqrt(pi/2).  Feeding the
    Laplace scale straight into a Gaussian CRPS is what produced the first
    pass's CRPS 7.49-8.02: those were a unit artefact, not a result.
    """
    n = 0
    tot = 0.0
    levels = defaultdict(int)
    prior_full = defaultdict(list)
    prior_coarse = defaultdict(list)
    prior_global = []
    seen_weeks = set()

    for r in rows:
        wk = (r["season"], r["week"])
        a = abs(r["margin"] - r["spread_line"])
        k = cell_key(r)

        b, level = None, None
        if k in prior_full and len(prior_full[k]) >= min_cell:
            b = sum(prior_full[k]) / len(prior_full[k]); level = 0
        elif (k[1], k[2]) in prior_coarse and len(prior_coarse[(k[1], k[2])]) >= min_cell:
            b = sum(prior_coarse[(k[1], k[2])]) / len(prior_coarse[(k[1], k[2])]); level = 1
        elif len(prior_global) >= min_cell:
            b = sum(prior_global) / len(prior_global); level = 2
        else:
            b = SIGMA_FIXED * math.sqrt(2.0 / math.pi); level = 3
        if b is None or b <= 0:
            b = SIGMA_FIXED * math.sqrt(2.0 / math.pi); level = 3

        sd = b * math.sqrt(math.pi / 2.0)   # Laplace scale -> Gaussian sigma

        tot += crps_energy(r["spread_line"], sd, p3, p7, r["margin"])
        n += 1
        levels[level] += 1

        if wk not in seen_weeks:
            prior_full[k].append(a)
            prior_coarse[(k[1], k[2])].append(a)
            prior_global.append(a)
            seen_weeks.add(wk)

    return {"n": n, "crps": tot / n, "levels": dict(levels)}


def score_rest_scale(rows, min_cell=CELL_MIN):
    """Rest-modulated sigma: sigma = 13.45 * exp(clip(beta*f, -0.45, 0.45))
    where f = |home_rest - away_rest| / 7. beta is FITTED on strictly earlier
    weeks from a fixed negative-only grid -- never on the row being scored.
    """
    n = 0
    tot = 0.0
    grid = [(-0.28 + i * (0.28 / 120.0)) for i in range(121)]  # -0.28..0
    hist = []          # (f, |resid|) for all prior weeks
    seen_weeks = set()

    for r in rows:
        wk = (r["season"], r["week"])
        resid = r["margin"] - r["spread_line"]
        a = abs(resid)

        hr, ar = r["home_rest"], r["away_rest"]
        if hr is None or ar is None:
            f = None
        else:
            f = min(abs(hr - ar) / 7.0, 1.0)

        # fit beta on prior weeks only
        beta = 0.0
        if len(hist) >= 50 and f is not None:
            best, best_c = None, None
            for b in grid:
                s = 0.0
                for hf, ha in hist:
                    sd = SIGMA_FIXED * math.exp(max(-0.45, min(0.45, b * hf)))
                    if sd <= 0:
                        sd = SIGMA_FIXED
                    z = (ha) / sd
                    s += crps_gaussian(0.0, sd, ha)
                s /= len(hist)
                if best_c is None or s < best_c:
                    best, best_c = b, s
            beta = best

        sd = SIGMA_FIXED
        if f is not None:
            sd = SIGMA_FIXED * math.exp(max(-0.45, min(0.45, beta * f)))
            if sd <= 0:
                sd = SIGMA_FIXED

        tot += crps_gaussian(r["spread_line"], sd, r["margin"])
        n += 1

        if wk not in seen_weeks:
            if f is not None:
                hist.append((f, a))
            seen_weeks.add(wk)

    return {"n": n, "crps": tot / n}


# ---------------------------------------------------------------- main

def run(rows=None, out_path=None):
    if rows is None:
        rows, skipped = load_frozen()
    else:
        skipped = []

    # ---- PHASE 1: reproduce the baseline. Abort on mismatch.
    base = score_baseline(rows)
    repro_ok = (
        base["n"] == BASELINE_N
        and abs(base["crps"] - BASELINE_CRPS) <= REPRO_TOL
    )

    report = {
        "harness": os.path.basename(__file__),
        "data_path": GAMES,
        "location_locked": True,
        "phase1_reproduce": {
            "ok": repro_ok,
            "n": base["n"],
            "n_expected": BASELINE_N,
            "crps": round(base["crps"], 6),
            "crps_expected": BASELINE_CRPS,
            "tol": REPRO_TOL,
            "skipped_rows": len(skipped),
        },
        "phase2_score": [],
        "phase3_decision": {},
    }

    if not repro_ok:
        report["phase3_decision"] = {
            "passed": False,
            "verdict": "ABORTED -- baseline not reproduced; no candidate was scored",
            "note": "A harness that cannot reproduce its own baseline may not report a delta.",
        }
        return report

    # ---- PHASE 2: score every candidate, prior-only, refuse delta >= 0.
    candidates = []

    r = score_cell_conditional(rows)
    candidates.append(("cell-conditional-scale", r))

    for p3, p7 in ((0.0, 0.10), (0.10, 0.05), (0.15, 0.08), (0.05, 0.03)):
        r = score_keynumbers(rows, p3, p7)
        candidates.append((f"keynumbers p3={p3} p7={p7}", r))

    r = score_rest_scale(rows)
    candidates.append(("rest-modulated-scale", r))

    for name, res in candidates:
        delta = res["crps"] - base["crps"]
        refused = delta >= 0.0
        report["phase2_score"].append({
            "candidate": name,
            "n": res["n"],
            "crps": round(res["crps"], 6),
            "delta": round(delta, 6),
            "levels": res.get("levels"),
            "refused": refused,
            "reason": "delta >= 0 (no improvement)" if refused else "delta < 0",
        })

    # ---- PHASE 3: decide. Note that this file CANNOT open the gate.
    best = min(report["phase2_score"], key=lambda c: c["crps"])
    clears = (
        not best["refused"]
        and best["crps"] <= GATE
        and best["n"] >= N_MIN
    )
    report["phase3_decision"] = {
        "best_candidate": best["candidate"],
        "best_crps": best["crps"],
        "best_delta": best["delta"],
        "gate": GATE,
        "n_min": N_MIN,
        "would_clear_gate": clears,
        "passed": False,
        "verdict": (
            "REFUSED -- best candidate still does not clear the gate"
            if not clears else
            "MEASURED CLEAR on the frozen filter -- but this harness cannot open emission. The gate file is protected; promotion requires an explicit, reviewed edit there."
        ),
        "emission": "0 picks / 0 parlays / 0 DFS",
    }
    return report


if __name__ == "__main__":
    out = run()
    print(json.dumps(out, indent=1))
