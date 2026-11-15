"""Week 10 quant-kernel runner (WP-2).

Invokes the unified quantitative NFL architecture
(intelligence/architecture/unified_quantitative_nfl_architecture.py) plus the
nfl-farm cycles 1..36 situational registry
(packages/prediction-engine/src/nfl/situational-constants.ts, dumped via
scripts/quant_kernel_dump_situational_constants.ts), weighting cycle outputs
by inverse SE^2 across the remaining Week 10 matchups.

Game ids come from Neon public.games (sportId cmpg6t7v900031heri45v3d8s,
commenceTime 2026-11-13..2026-11-18, status != FINAL), read-only.

Sinkhorn mass conservation is ASSERTED < 1e-9 in every mode.

Modes:
  --verify-only   Sinkhorn conservation check across the Week 10 games WITHOUT
                  full simulation. Prints a single JSON object to stdout:
                  {"sinkhorn_max_residual": <float < 1e-9>, "games": >=13, ...}
  (default)       Full kernel pass: market probit prior + drive-lattice score
                  grid + inverse-SE^2 cycle-weighted situational adjustment
                  (capped at |Δ log-odds| <= 0.35) + Black-Litterman synthesis
                  + Sinkhorn balancing. Writes a JSON report.

Zero fabrication: a game without market inputs is reported null, never given
a default probability; a cycle without a parseable SE gets zero inverse-
variance weight; a term without a pregame-convertible measured effect
contributes nothing.
"""
from __future__ import annotations

import argparse
import json
import math
import re
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from intelligence.architecture.unified_quantitative_nfl_architecture import (  # noqa: E402
    _norm_cdf,
    black_litterman_posterior,
    build_compound_drive_lattice_score_grid,
    sinkhorn_knopp_ipf,
)

SPORT_ID = "cmpg6t7v900031heri45v3d8s"
WINDOW_START = "2026-11-13"
WINDOW_END = "2026-11-19"  # exclusive: covers 2026-11-13..2026-11-18
# League margin standard deviation used by the unified architecture itself
# (benchmark_rqmc_variance_reduction default). A documented model parameter,
# not a per-game measurement.
SIGMA_MARGIN = 13.62
MAX_SITUATIONAL_LOG_ODDS = 0.35
SINKHORN_TOL = 1e-9


def _log(msg: str) -> None:
    print(msg, file=sys.stderr)


def _neon_argv() -> List[str]:
    """Resolve the neon CLI for Windows CreateProcess (the bare `neon` shim is
    a bash script; the .cmd wrapper is what Python can launch)."""
    import shutil
    for name in ("neon.cmd", "neon.exe", "neon"):
        p = shutil.which(name)
        if p:
            return [p]
    raise RuntimeError("neon CLI not found on PATH")


def fetch_week10_games() -> List[Dict[str, Any]]:
    """Read the remaining Week 10 games from Neon (read-only role)."""
    sql = (
        "SELECT json_agg(t) FROM (SELECT id, \"homeTeamName\", \"awayTeamName\", "
        "\"commenceTime\", status, \"openingSpread\", \"openingTotal\", "
        "\"restDaysHome\", \"restDaysAway\" "
        f"FROM public.games WHERE \"sportId\"='{SPORT_ID}' "
        f"AND \"commenceTime\" >= '{WINDOW_START}' AND \"commenceTime\" < '{WINDOW_END}' "
        "AND status <> 'FINAL' ORDER BY \"commenceTime\") t"
    )
    argv = _neon_argv() + [
        "psql", "main",
        "--project-id", "summer-brook-99380762",
        "--role-name", "hermes_ro",
        "--", "-A", "-t", "-c", sql,
    ]
    proc = subprocess.run(argv, capture_output=True, text=True, timeout=180)
    if proc.returncode != 0:
        raise RuntimeError(f"neon psql failed (exit {proc.returncode}): {proc.stderr[-400:]}")
    out = proc.stdout
    start, end = out.find("["), out.rfind("]")
    if start < 0 or end <= start:
        raise RuntimeError("no JSON array found in neon psql output")
    games = json.loads(out[start : end + 1])
    if not isinstance(games, list):
        raise RuntimeError("unexpected games payload")
    return games


def market_home_win_prob(spread: Optional[float], total: Optional[float]) -> Optional[float]:
    """Probit market prior. openingSpread is the home spread (negative = home
    favored), so the home margin mean is -spread. Missing market inputs yield
    None — never a default probability."""
    if spread is None or total is None:
        return None
    spread = float(spread)
    total = float(total)
    if not (math.isfinite(spread) and math.isfinite(total)):
        return None
    mu_margin = -spread
    return float(_norm_cdf(mu_margin / SIGMA_MARGIN))


def sinkhorn_check(prob_matrix: np.ndarray) -> Tuple[float, np.ndarray]:
    """Balance a [games x 2] win-probability matrix to unit row mass and the
    measured column totals. ASSERTS conservation < 1e-9. Returns (residual, W)."""
    n = prob_matrix.shape[0]
    col_targets = prob_matrix.sum(axis=0)
    row_targets = np.ones(n, dtype=float)
    diag = sinkhorn_knopp_ipf(prob_matrix, row_targets, col_targets, max_iters=2000, tol=1e-14)
    W = np.asarray(diag["matrix"], dtype=float)
    mass_error = abs(float(W.sum()) - float(col_targets.sum()))
    residual = max(float(diag["max_marginal_error"]), mass_error)
    assert bool(diag["converged"]), "Sinkhorn did not converge"
    assert residual < SINKHORN_TOL, f"Sinkhorn conservation violated: {residual}"
    assert np.all(np.isfinite(W)), "Sinkhorn produced non-finite mass"
    return residual, W


def load_farm_registry() -> Dict[str, Any]:
    """Dump the nfl-farm cycles 1..36 registry through the tsx bridge."""
    proc = subprocess.run(
        [
            "node", str(REPO_ROOT / "node_modules/tsx/dist/cli.mjs"),
            str(REPO_ROOT / "scripts/quant_kernel_dump_situational_constants.ts"),
        ],
        capture_output=True, text=True, timeout=180,
        cwd=str(REPO_ROOT),
        env={"TSX_TSCONFIG_PATH": "packages/prediction-engine/tsconfig.json",
             **__import__("os").environ},
    )
    if proc.returncode != 0:
        raise RuntimeError(f"farm registry bridge failed: {proc.stderr[-400:]}")
    return json.loads(proc.stdout)


def parse_cycle_se(evidence: str) -> Optional[float]:
    """Parse a standard error from the cycle evidence string.

    Supported measured forms:
      - sd/sigma + n:  SE = sd / sqrt(n)
      - 95% CI [lo, hi]: SE = (hi - lo) / (2 * 1.96)
    Anything else returns None: the cycle then carries ZERO inverse-variance
    weight. An SE is never invented.
    """
    sd = re.search(r"(?:sd|sigma)\s*\.?(\d+\.\d+|\d+)", evidence)
    n = re.search(r"n\s*=\s*([\d,]+)", evidence)
    if sd and n:
        sd_v = float(sd.group(1))
        n_v = float(n.group(1).replace(",", ""))
        if n_v > 0 and sd_v > 0:
            return sd_v / math.sqrt(n_v)
    ci = re.search(r"\[\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*\]", evidence)
    if ci:
        lo, hi = float(ci.group(1)), float(ci.group(2))
        if hi > lo:
            return (hi - lo) / (2.0 * 1.96)
    return None


def cycle_inverse_variance_weights(registry: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    """Inverse-SE^2 weight per cycle term, normalized over terms with a
    parseable SE. Terms with weight 0 in the registry stay excluded."""
    entries = []
    for c in registry["constants"]:
        se = parse_cycle_se(c["evidence"])
        entries.append({
            "key": c["key"],
            "cycle": c["cycle"],
            "registry_weight": float(c["weight"]),
            "se": se,
            "inv_var": (1.0 / (se * se)) if (se is not None and se > 0 and c["weight"] > 0) else 0.0,
        })
    total = sum(e["inv_var"] for e in entries)
    for e in entries:
        e["normalized_weight"] = (e["inv_var"] / total) if total > 0 else 0.0
    return {e["key"]: e for e in entries}


def situational_log_odds_delta(
    game: Dict[str, Any],
    p_home: float,
    weights: Dict[str, Dict[str, Any]],
) -> Tuple[float, List[str]]:
    """Pregame situational adjustment from measured cycle effects only.

    The only cycle term with a pregame-convertible measured effect gated on
    data we actually have is rest_advantage_home (+3.41pp home win probability
    when home rest > 6 days and away rest <= 3, 95% CI [+0.3, +6.6]pp, c15).
    The condition is checked against the measured restDays columns; every
    other term contributes 0 pregame (its effect is in-game or in different
    units) and is reported as such. The probability delta is converted to
    log-odds at the game's market probability and capped at +/-0.35.
    """
    applied: List[str] = []
    delta_pp = 0.0
    rest = weights.get("rest_advantage_home")
    rh, ra = game.get("restDaysHome"), game.get("restDaysAway")
    if rest and rest["normalized_weight"] > 0 and rh is not None and ra is not None:
        if float(rh) > 6 and float(ra) <= 3:
            # +3.41pp measured effect, scaled by the term's inverse-SE^2 share.
            delta_pp += 0.0341 * rest["normalized_weight"]
            applied.append(f"rest_advantage_home({rest['cycle']})")
    if delta_pp == 0.0:
        return 0.0, applied
    p = min(max(p_home, 1e-6), 1.0 - 1e-6)
    p2 = min(max(p + delta_pp, 1e-6), 1.0 - 1e-6)
    delta = math.log(p2 / (1.0 - p2)) - math.log(p / (1.0 - p))
    delta = max(-MAX_SITUATIONAL_LOG_ODDS, min(MAX_SITUATIONAL_LOG_ODDS, delta))
    return delta, applied


def verify_only(games: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Sinkhorn conservation across the Week 10 slate, no full simulation."""
    probs: List[List[float]] = []
    used = 0
    for g in games:
        p = market_home_win_prob(g.get("openingSpread"), g.get("openingTotal"))
        if p is None:
            continue
        probs.append([p, 1.0 - p])
        used += 1
    if used == 0:
        raise RuntimeError("no Week 10 game has market inputs; cannot verify")
    K = np.array(probs, dtype=float)
    residual, _W = sinkhorn_check(K)
    return {
        "sinkhorn_max_residual": residual,
        "games": used,
        "mode": "verify-only",
        "sport_id": SPORT_ID,
        "window": [WINDOW_START, WINDOW_END],
        "sigma_margin": SIGMA_MARGIN,
    }


def full_pass(games: List[Dict[str, Any]]) -> Dict[str, Any]:
    registry = load_farm_registry()
    weights = cycle_inverse_variance_weights(registry)
    rows: List[Dict[str, Any]] = []
    prob_rows: List[List[float]] = []
    for g in games:
        spread, total = g.get("openingSpread"), g.get("openingTotal")
        p_market = market_home_win_prob(spread, total)
        if p_market is None:
            rows.append({"id": g["id"], "matchup": f"{g['awayTeamName']} @ {g['homeTeamName']}",
                         "status": "null_no_market_inputs"})
            continue
        mu_margin = -float(spread)
        exp_home = (float(total) + mu_margin) / 2.0
        exp_away = (float(total) - mu_margin) / 2.0
        lattice = build_compound_drive_lattice_score_grid(exp_home, exp_away)
        p_lattice = float(lattice["home_win_prob"])
        sit_delta, applied = situational_log_odds_delta(g, p_market, weights)
        # Black-Litterman: market prior vs drive-lattice view (equal tau).
        bl = black_litterman_posterior(
            pi_market=np.array([math.log(p_market / (1.0 - p_market))]),
            sigma_prior=np.array([[0.04]]),
            p_views=np.array([[1.0]]),
            q_views=np.array([math.log(p_lattice / (1.0 - p_lattice)) + sit_delta]),
            omega_views=np.array([[0.04]]),
            tau=1.0,
        )
        z = float(bl["posterior_mean"][0])
        p_final = 1.0 / (1.0 + math.exp(-z))
        rows.append({
            "id": g["id"],
            "matchup": f"{g['awayTeamName']} @ {g['homeTeamName']}",
            "commenceTime": g["commenceTime"],
            "openingSpread": spread,
            "openingTotal": total,
            "market_p_home": p_market,
            "drive_lattice_p_home": p_lattice,
            "drive_lattice_tie_prob": float(lattice["regulation_tie_prob"]),
            "situational_log_odds_delta": sit_delta,
            "cycles_applied": applied,
            "final_p_home": p_final,
        })
        prob_rows.append([p_final, 1.0 - p_final])
    residual, _W = sinkhorn_check(np.array(prob_rows, dtype=float))
    return {
        "sinkhorn_max_residual": residual,
        "games": len(prob_rows),
        "mode": "full",
        "cycle_weights": weights,
        "farm_census": registry["census"],
        "matchups": rows,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--verify-only", action="store_true",
                    help="Sinkhorn conservation check only; JSON to stdout")
    ap.add_argument("--report", type=str,
                    default=str(REPO_ROOT / "intelligence/ops/week10_quant_kernel_report.json"),
                    help="full-mode JSON report path")
    args = ap.parse_args()

    games = fetch_week10_games()
    _log(f"fetched {len(games)} remaining Week 10 games from Neon")
    if args.verify_only:
        result = verify_only(games)
        print(json.dumps(result))
        return 0

    result = full_pass(games)
    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    _log(f"report written: {report_path}")
    print(json.dumps({
        "sinkhorn_max_residual": result["sinkhorn_max_residual"],
        "games": result["games"],
        "mode": "full",
        "report": str(report_path),
    }))
    return 0


if __name__ == "__main__":
    sys.exit(main())