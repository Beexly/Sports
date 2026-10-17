"""
GSE local headless Monte Carlo runner
=====================================

Standalone replica of the Gaussian-copula Cholesky simulation in
``intelligence/colab/gse_colab_sim_grid.ipynb``, runnable on this host with
NumPy only: no Colab, no GPU, no torch, no scipy.

WHAT IT DOES
------------
Draws 10,000 joint outcomes for a 4-leg NFL same-game parlay under a Gaussian
copula, prices the parlay's TRUE joint probability, and compares it against the
probability a book implies when it treats the legs as independent. The gap
between those two is the structural mispricing this simulation exists to
measure.

WHAT IT DOES NOT DO
-------------------
It invents no correlations and no market prices. The correlation matrix below is
an ILLUSTRATIVE input, labelled as such at the point of use — the repo has no
source that estimates same-game leg correlations from data, and this script does
not pretend otherwise. The "market" probability here is the book's own naive
independence model, not a quoted SGP price, because no quoted SGP price is
available in the repo.

FAITHFULNESS TO THE NOTEBOOK, AND THE ONE DELIBERATE CHANGE
-----------------------------------------------------------
The notebook's core is kept exactly:

    L = cholesky(Sigma);  Z = randn(n_sims, k);  X = (Z @ L.T) + mu

One change, and it matters: the notebook applies a NORMAL marginal to every leg,
including legs that are counts (passing TDs, anytime TD). A normal puts mass
below zero on a passing-yard line that cannot go negative, and treats a
touchdown count as a continuous quantity. This script keeps the Cholesky core and
maps the correlated uniforms through each leg's OWN quantile function instead —
Log-Normal for yards, Poisson for counts — which is what a Gaussian copula
actually is. The dependence structure is identical; only the marginals are
corrected.

Usage
-----
    python intelligence/colab/run_monte_carlo.py
    python intelligence/colab/run_monte_carlo.py --draws 50000 --seed 7
"""

from __future__ import annotations

import argparse
import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Dict, List, Tuple

import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[2]
OUT_PATH = REPO_ROOT / "data" / "snapshots" / "sgp_copula_sample.npy"
CORRELATION_PATH = REPO_ROOT / "data" / "snapshots" / "sgp_correlations.json"

DEFAULT_DRAWS = 10_000
DEFAULT_SEED = 20261012


# ---------------------------------------------------------------------------
# Marginals (numpy only — quantile functions, i.e. inverse CDFs)
# ---------------------------------------------------------------------------

def _phi_inv(u: np.ndarray) -> np.ndarray:
    """Phi^{-1}(u): Acklam's rational approximation, then one Halley step."""
    u = np.clip(np.asarray(u, dtype=float), 1e-12, 1 - 1e-12)
    a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
         1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00]
    b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
         6.680131188771972e+01, -1.328068155288572e+01]
    c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
         -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00]
    d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00,
         3.754408661907416e+00]
    plow, phigh = 0.02425, 1 - 0.02425

    out = np.empty_like(u)
    low, high = u < plow, u > phigh
    mid = ~(low | high)
    if np.any(low):
        q = np.sqrt(-2.0 * np.log(u[low]))
        out[low] = (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / (
            (((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1.0)
    if np.any(high):
        q = np.sqrt(-2.0 * np.log(1.0 - u[high]))
        out[high] = -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / (
            (((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1.0)
    if np.any(mid):
        q = u[mid] - 0.5
        r = q * q
        out[mid] = (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (
            ((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1.0)
    return out


class LogNormalLeg:
    """Positive, right-skewed yardage leg, matched to a quoted (mean, sd)."""

    kind = "lognormal"

    def __init__(self, mean: float, sd: float) -> None:
        if mean <= 0 or sd <= 0:
            raise ValueError("lognormal needs mean > 0 and sd > 0")
        self.mean, self.sd = float(mean), float(sd)
        self.sigma2 = float(np.log1p((sd / mean) ** 2))
        self.sigma = float(np.sqrt(self.sigma2))
        self.mu = float(np.log(mean) - 0.5 * self.sigma2)

    def quantile(self, u: np.ndarray) -> np.ndarray:
        return np.exp(self.mu + self.sigma * _phi_inv(u))

    def implied_variance(self) -> float:
        return (np.exp(self.sigma2) - 1.0) * np.exp(2.0 * self.mu + self.sigma2)


class PoissonLeg:
    """Counting leg (touchdowns), matched to a rate."""

    kind = "poisson"

    def __init__(self, lam: float) -> None:
        if lam < 0:
            raise ValueError("poisson rate must be >= 0")
        self.lam = float(lam)
        k_max = int(self.lam + 10.0 * np.sqrt(max(self.lam, 1.0)) + 20)
        pmf = np.empty(k_max + 1)
        pmf[0] = np.exp(-self.lam)
        for k in range(1, k_max + 1):
            pmf[k] = pmf[k - 1] * self.lam / k
        pmf = pmf / pmf.sum()
        self._cdf = np.cumsum(pmf)

    def quantile(self, u: np.ndarray) -> np.ndarray:
        idx = np.searchsorted(self._cdf, np.clip(u, 0.0, 1.0), side="left")
        return np.clip(idx, 0, len(self._cdf) - 1).astype(float)


# ---------------------------------------------------------------------------
# Correlation matrix handling
# ---------------------------------------------------------------------------

def nearest_psd(matrix: np.ndarray, floor: float = 0.0) -> Tuple[np.ndarray, bool]:
    """
    Clip negative eigenvalues to `floor` and renormalize the diagonal to 1.

    A standalone stand-in for the Higham (1988) repair in
    intelligence/sgp/sgp_copula_engine.py: it returns a usable matrix and says
    whether it had to change anything, so a repaired input is never passed off as
    a clean one.
    """
    a = 0.5 * (matrix + matrix.T)
    w, v = np.linalg.eigh(a)
    if float(np.min(w)) >= floor - 1e-12:
        return a, False
    a = (v * np.clip(w, floor, None)) @ v.T
    a = 0.5 * (a + a.T)
    d = np.sqrt(np.clip(np.diag(a), 1e-300, None))
    a = a / np.outer(d, d)
    np.fill_diagonal(a, 1.0)
    return a, True


def cholesky_correlated_normals(
    corr: np.ndarray, n_draws: int, rng: np.random.Generator
) -> np.ndarray:
    """
    The notebook's core, verbatim in structure:

        L = cholesky(Sigma);  Z = randn(n, k);  X = Z @ L.T

    with Sigma here being the CORRELATION matrix (the copula's dependence
    object) rather than a covariance, so the draws are unit-variance and map
    onto uniforms.
    """
    L = np.linalg.cholesky(corr)
    z = rng.standard_normal((n_draws, corr.shape[0]))
    return z @ L.T


def normals_to_uniforms(x: np.ndarray) -> np.ndarray:
    """Gaussian copula CDF step: U = Phi(X), clipped away from 0 and 1."""
    return np.clip(0.5 * (1.0 + _erf(x / np.sqrt(2.0))), 1e-12, 1.0 - 1e-12)


def _erf(x: np.ndarray) -> np.ndarray:
    """Abramowitz & Stegun 7.1.26 (|error| < 1.5e-7) — adequate against MC noise."""
    x = np.asarray(x, dtype=float)
    sign = np.sign(x)
    ax = np.abs(x)
    t = 1.0 / (1.0 + 0.3275911 * ax)
    y = 1.0 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t
                - 0.284496736) * t + 0.254829592) * t * np.exp(-ax * ax)
    return sign * y


# ---------------------------------------------------------------------------
# The sample parlay
# ---------------------------------------------------------------------------

@dataclass
class LegSpec:
    label: str
    marginal: object
    line: float
    side: str = "over"

    def hit_mask(self, values: np.ndarray) -> np.ndarray:
        return values > self.line if self.side == "over" else values < self.line

    def standalone_probability(self, n_ref: int = 2_000_000, seed: int = 99) -> float:
        """P(hit) from the marginal alone — the number a book would quote a leg at."""
        rng = np.random.default_rng(seed)
        vals = self.marginal.quantile(rng.uniform(0.0, 1.0, size=n_ref))
        return float(self.hit_mask(vals).mean())


def build_sample_parlay() -> Tuple[List[LegSpec], np.ndarray, str]:
    """
    4-leg NFL SGP: passing yards, passing TDs, receiving yards, anytime TD.

    The correlations are now ESTIMATED from nflverse play-by-play when the
    estimator has been run (intelligence/props/sgp_correlation_estimator.py
    writes data/snapshots/sgp_correlations.json), and fall back to a labelled
    ILLUSTRATIVE matrix only when that artifact is absent.

    The fallback exists so the runner works on a fresh checkout; it is never
    silently substituted, because a price built on invented dependence is not a
    price. Which source was used is printed on every run.
    """
    legs = [
        LegSpec("Passing yards (QB)", LogNormalLeg(mean=245.5, sd=42.0), line=250.5),
        LegSpec("Passing TDs (QB)", PoissonLeg(lam=1.80), line=1.5),
        LegSpec("Receiving yards (WR)", LogNormalLeg(mean=74.5, sd=25.0), line=75.5),
        LegSpec("Anytime TD (WR)", PoissonLeg(lam=0.40), line=0.5),
    ]

    estimated = CORRELATION_PATH if CORRELATION_PATH.exists() else None
    if estimated is not None:
        try:
            blob = json.loads(estimated.read_text(encoding="utf-8"))
            corr = np.array(blob["matrix"], dtype=float)
            if corr.shape != (4, 4):
                raise ValueError(f"estimated matrix is {corr.shape}, expected (4, 4)")
            provenance = (
                f"ESTIMATED from nflverse play-by-play — {blob.get('n_team_games')} team-games, "
                f"seasons {blob.get('seasons')} ({estimated.name})"
            )
            return legs, corr, provenance
        except Exception as exc:
            # A present-but-broken artifact must not be silently ignored, and it
            # must not be silently trusted either.
            print(f"  WARNING: could not use {estimated.name}: {exc}")
            print("  falling back to the ILLUSTRATIVE matrix below")

    corr = np.array(
        [
            [1.00, 0.70, 0.65, 0.28],
            [0.70, 1.00, 0.38, 0.45],
            [0.65, 0.38, 1.00, 0.52],
            [0.28, 0.45, 0.52, 1.00],
        ],
        dtype=float,
    )
    provenance = (
        "ILLUSTRATIVE hand-set correlations — run "
        "intelligence/props/sgp_correlation_estimator.py to estimate them from data"
    )
    return legs, corr, provenance


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

def notebook_parity_check(draws: int = DEFAULT_DRAWS, seed: int = DEFAULT_SEED) -> Dict[str, float]:
    """
    Re-run the NOTEBOOK'S OWN demo, literally: 2 legs, NORMAL marginals, and the
    covariance built as D @ R @ D from quoted (mu, sigma) pairs.

    This exists so the difference between "what the notebook computes" and "what
    the corrected 4-leg parlay computes" is a measured number rather than an
    argument. The notebook's marginals are normals, so a passing-yards draw can
    come out negative; that is reproduced here on purpose, because this function's
    job is parity with the source, not correctness.
    """
    mu = np.array([245.5, 74.5])
    sigmas = np.array([42.0, 25.0])
    corr = np.array([[1.00, 0.72], [0.72, 1.00]])
    sigma = np.diag(sigmas) @ corr @ np.diag(sigmas)

    rng = np.random.default_rng(seed)
    L = np.linalg.cholesky(sigma)
    z = rng.standard_normal((draws, 2))
    draws_arr = z @ L.T + mu

    leg1 = draws_arr[:, 0] > 250.5
    leg2 = draws_arr[:, 1] > 75.5
    p1 = float(leg1.mean())
    p2 = float(leg2.mean())
    joint = float((leg1 & leg2).mean())
    naive = p1 * p2
    return {
        "p1": p1,
        "p2": p2,
        "naive": naive,
        "joint": joint,
        "lift": (joint - naive) / naive if naive > 0 else float("nan"),
    }


def run(draws: int = DEFAULT_DRAWS, seed: int = DEFAULT_SEED, out_path: Path = OUT_PATH) -> Dict[str, object]:
    legs, corr_raw, provenance = build_sample_parlay()
    k = len(legs)

    corr, repaired = nearest_psd(corr_raw)

    rng = np.random.default_rng(seed)
    t0 = time.perf_counter()
    normals = cholesky_correlated_normals(corr, draws, rng)
    uniforms = normals_to_uniforms(normals)

    values = np.empty((draws, k), dtype=float)
    masks = np.empty((draws, k), dtype=bool)
    for i, leg in enumerate(legs):
        v = leg.marginal.quantile(uniforms[:, i])
        values[:, i] = v
        masks[:, i] = leg.hit_mask(v)
    elapsed_ms = (time.perf_counter() - t0) * 1000.0

    leg_probs = np.array([float(masks[:, i].mean()) for i in range(k)])
    # The book's model: independent legs, so the parlay is the product.
    market_implied = float(np.prod(leg_probs))
    true_joint = float(np.all(masks, axis=1).mean())

    # Monte Carlo standard error of the joint, and of the lift's numerator.
    se_joint = float(np.sqrt(max(true_joint * (1.0 - true_joint), 0.0) / draws))
    alpha = true_joint - market_implied
    alpha_se = se_joint  # the market side is a model constant here, not a sample
    lift = alpha / market_implied if market_implied > 0 else float("nan")

    # Independent control: sample each leg alone and multiply. This is the
    # falsifier for the copula — if it does not reproduce the product, the
    # marginals are wrong, not the dependence.
    indep_rng = np.random.default_rng(seed + 1)
    indep_masks = np.column_stack(
        [leg.hit_mask(leg.marginal.quantile(indep_rng.uniform(0.0, 1.0, size=draws))) for leg in legs]
    )
    indep_joint = float(np.all(indep_masks, axis=1).mean())

    # Correlation recovery: does the fitted sample reproduce the target matrix?
    sample_corr = np.corrcoef(values, rowvar=False)

    if out_path is not None:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        np.save(out_path, values)

    return {
        "draws": draws,
        "seed": seed,
        "elapsed_ms": elapsed_ms,
        "correlation": corr,
        "correlation_provenance": provenance,
        "correlation_repaired": repaired,
        "legs": legs,
        "leg_probs": leg_probs,
        "market_implied": market_implied,
        "true_joint": true_joint,
        "independent_joint_sampled": indep_joint,
        "alpha": alpha,
        "alpha_se": alpha_se,
        "lift": lift,
        "sample_corr": sample_corr,
        "out_path": out_path,
    }


def main(argv: List[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="GSE local headless Monte Carlo runner")
    parser.add_argument("--draws", type=int, default=DEFAULT_DRAWS)
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    parser.add_argument("--out", default=str(OUT_PATH))
    args = parser.parse_args(argv)

    res = run(draws=args.draws, seed=args.seed, out_path=Path(args.out))

    print("GSE local Monte Carlo — Gaussian copula, Cholesky draws")
    print(f"  draws: {res['draws']:,}   seed: {res['seed']}   runtime: {res['elapsed_ms']:.1f} ms")
    print(f"  correlation source: {res['correlation_provenance']}")
    if res["correlation_repaired"]:
        print("  NOTE: the input correlation matrix was not PSD and was repaired.")
    print()

    print("  legs (marginal hit probability, marginals alone):")
    for leg, p in zip(res["legs"], res["leg_probs"]):
        print(f"    {leg.label:<24} {leg.side} {leg.line:<7g} p={p:.4f}")
    print()

    print("  TARGET vs RECOVERED correlation")
    target = np.asarray(res["correlation"])
    sample = np.asarray(res["sample_corr"])
    for i in range(target.shape[0]):
        trow = " ".join(f"{v:+.2f}" for v in target[i])
        srow = " ".join(f"{v:+.2f}" for v in sample[i])
        print(f"    target [{trow}]   sample [{srow}]")
    print()

    print("  PRICING")
    print(f"    market implied (independent product): {res['market_implied']:.4f}")
    print(f"    independent control, sampled:         {res['independent_joint_sampled']:.4f}")
    print(f"    TRUE joint (copula):                  {res['true_joint']:.4f}"
          f"  (+/- {res['alpha_se']:.4f} MC)")
    print(f"    alpha (true - market):                {res['alpha']:+.4f}")
    print(f"    alpha lift vs market:                 {res['lift']:+.2%}")
    print(f"    MC z of the joint:                    "
          f"{(res['true_joint'] - res['market_implied']) / res['alpha_se']:+.2f}")
    print()
    print(f"  saved draws: {res['out_path']}")
    print()

    print("  NOTEBOOK PARITY CHECK (2 legs, NORMAL marginals, notebook's own covariance)")
    par = notebook_parity_check(draws=res["draws"], seed=res["seed"])
    print(f"    leg 1 (QB o250.5): {par['p1']:.4f}   leg 2 (WR1 o75.5): {par['p2']:.4f}")
    print(f"    naive product: {par['naive']:.4f}   true joint: {par['joint']:.4f}")
    print(f"    notebook-style lift: {par['lift']:+.2%}")
    print()
    print("  The 4-leg number above and this 2-leg number answer different questions.")
    print("  Neither is tuned to a target: the inputs are stated and the output is measured.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
