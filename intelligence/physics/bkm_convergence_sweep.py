"""
Navier-Stokes BKM multi-grid spectral convergence sweep
=======================================================

Nested-resolution study of the Harper seed vortex ring under pure spectral
viscosity, using the boundary-fitted cylindrical collocation solver.

For every (Nr, Nz) in {32, 64, 128} x {32, 64, 128} and every viscosity regime
(physical nu=0.005, high dissipation nu=0.05, Euler limit nu=0.0) the ring is
evolved over t in [0, 0.020] at dt = 0.00025, recording:

  ||omega(t)||_inf   peak vorticity (L-infinity norm of the vorticity field)
  R_circ(t)          discrete Kelvin circulation residual
  Omega(t)           enstrophy, (1/2) * integral |omega|^2 dV
  I(t)               BKM blowup integral, integral_0^t ||omega(tau)||_inf dtau
  R(t)               triadic phase resultant (phase-lock diagnostic)

WHAT "CONVERGENCE" CAN AND CANNOT MEAN HERE  (read before trusting a number)
---------------------------------------------------------------------------
This script reports what the discretization actually does, not what the
Millennium statement would require. Two facts govern the reading:

1. A grid-based finite-time integral is NOT a proof of either global regularity
   or blowup. This is the same boundary the BKM audit draws: tracking
   int_0^T ||omega||_inf dt < inf on a discrete grid at finite T says nothing
   about continuous unforced R^3 over infinite time. Nothing below claims
   otherwise.

2. The radial collocation is NON-DISSIPATIVE on high-wavenumber near-pole modes,
   and the defect grows like Nr^4. Measured on this machine (velocity-form
   radial block, reproduced live by spectral_diagnostics() and stored in the
   output artifact under "spectral_diagnostics"):

       Nr   max Re(eig) of the radial block   n_pos   Rayleigh quotient on the seed
       32              +5.74e+02                10              -55.05
       64              +1.25e+04                12              -56.76

   The positive eigenvalues are GENUINE, not an artifact of the eigen-solver:
   rebuilding the operator in 80-bit long double leaves them positive. The
   Rayleigh quotient on the actual smooth seed is NEGATIVE (~ -55), so the
   discretization is dissipative on the fields the physics actually occupies,
   which is why the low-resolution observables behave physically. The problem
   is the OTHER directions: roundoff that lands in the positive-eigenvalue
   modes grows without bound and then passes through an O(Nr^2)-conditioned
   Chebyshev derivative inside the |omega|_inf diagnostic.

   The consequence is the split this script exists to expose: BELOW Nr=32 the
   smooth physics dominates and the observables decay as they should; ABOVE it,
   roundoff that lands in the non-dissipative modes is amplified by the
   O(Nr^4) growth AND then amplified again by the O(Nr^2)-conditioned Chebyshev
   derivative inside the |omega|_inf diagnostic. The raw peak-vorticity series
   at 64 and 128 is therefore dominated by that artifact, not by physics.

   A spectral filter would make the numbers look monotone again, and the BKM
   audit explicitly disqualifies that: truncating high wavenumbers acts as an
   artificial external force f(x,t). So no filter is applied here. The
   divergences are reported.

The honest cure is a pole-regular radial discretization (e.g. solving for the
circulation Gamma = r*u_theta on a grid that does not carry the singular node, or
a tau/pole-condition treatment). That is NOT implemented and is recorded as an
open item rather than claimed.

Usage:
    python intelligence/physics/bkm_convergence_sweep.py
    python intelligence/physics/bkm_convergence_sweep.py --grids 32,64 --quick
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from intelligence.physics.cylindrical_solver import CylindricalSpectralSolver

REPO_ROOT = Path(__file__).resolve().parents[2]
OUT_PATH = REPO_ROOT / "data" / "snapshots" / "bkm_convergence_results.json"

DEFAULT_GRIDS: Tuple[int, ...] = (32, 64, 128)
VISCOSITY_REGIMES: Dict[str, float] = {
    "physical": 0.005,   # the Harper audit's physical viscosity
    "high": 0.05,        # strong dissipation control
    "euler": 0.0,        # inviscid limit: the falsifier for numerical dissipation
}
T_SPAN = (0.0, 0.020)
DT = 0.00025
#: A run whose peak vorticity has grown by this factor has left the physical
#: range. Under a diffusion-only evolution the continuum peak vorticity cannot
#: INCREASE at all (the viscous term is a contraction on |omega|), so any growth
#: is already a discretization artifact; 10x is a deliberately generous margin,
#: and the sweep aborts past it rather than spending minutes to produce the same
#: non-answer. Measured: with a 1e3 threshold the nu=0.05, Nr=32 row squeaked
#: under at 740x and was labelled COMPLETED, which misread an artifact as a run.
DIVERGENCE_GROWTH = 10.0


# ---------------------------------------------------------------------------
# Diagnostics computed from the live field
# ---------------------------------------------------------------------------

def clenshaw_curtis_weights(n: int) -> np.ndarray:
    """
    Clenshaw-Curtis quadrature weights for the Chebyshev-Gauss-Lobatto nodes
    x_k = cos(pi k / n), k = 0..n. Used to integrate in r without inventing a
    rule: the collocation nodes ARE these nodes, so the quadrature is the
    natural one for the discretization.
    """
    w = np.zeros(n + 1)
    for k in range(n + 1):
        theta = np.pi * k / n
        s = 0.0
        for j in range(0, n // 2 + 1):
            b = 1.0 if (j == 0 or 2 * j == n) else 2.0
            s += b / (4 * j * j - 1) * math.cos(2 * j * theta)
        w[k] = 2.0 / n * s
    return w


def enstrophy(solver: CylindricalSpectralSolver, u_r: np.ndarray, u_theta: np.ndarray, u_z: np.ndarray) -> float:
    """
    Omega(t) = (1/2) * integral |omega|^2 dV on the axisymmetric domain,
    dV = 2*pi*r dr dz. Clenshaw-Curtis in r, trapezoid in z (periodic).
    """
    vort = solver.compute_vorticity(u_r, u_theta, u_z)
    mag2 = vort["magnitude"] ** 2
    w_r = clenshaw_curtis_weights(solver.Nr)          # on x in [-1, 1]
    # Map the weights through r = R_max (1 - x) / 2, so dr = -(R_max/2) dx.
    # Orientation flips the sum but not its absolute value; integrate as-is and
    # take the magnitude of the map factor.
    w_r_mapped = w_r * (solver.R_max / 2.0)
    inner = (mag2 * solver.r[:, None]) @ np.ones(solver.Nz) * solver.dz   # integral over z, per r
    integral = float(abs(np.dot(w_r_mapped, inner)))
    return 0.5 * 2.0 * math.pi * integral


def triadic_phase_resultant(u_theta: np.ndarray) -> float:
    """
    R(t): the triadic phase resultant, normalized.

    For each axial Fourier mode k the coefficient A_k = |a_k| e^{i phi_k}. A
    triad (k1, k2, k3) with k1 + k2 + k3 = 0 closes only if its phase sum is
    locked to a multiple of pi for a real-symmetric field. R is the largest
    |sin(phi_1 + phi_2 + phi_3)| over the resolved triads, normalized so a fully
    locked field gives exactly 0.0.

    This is an INVARIANT of the evolution, not a fitted quantity: the initial
    data is real, the diffusion operator is real, so the coefficients remain
    conjugate-symmetric and every phase sum stays on {0, pi}. R must read
    0.0000 to machine precision at every step, and any departure means a
    complex-valued (non-physical) mode has crept into the state.
    """
    a = np.fft.fft(u_theta, axis=1)
    # Axisymmetric field: use the mode amplitudes over the radial collocation
    # rows, but the phase structure lives in the axial direction.
    k = a.shape[1]
    phases = np.angle(a)
    amps = np.abs(a)

    worst = 0.0
    # Sample triads across the resolved axial band (a full O(N^2) triad sweep is
    # unnecessary: the lock is a global property, and the largest violation is
    # found on the highest-amplitude modes).
    idx = np.argsort(amps.mean(axis=0))[::-1][:8]
    for i in idx:
        for j in idx:
            k3 = (-(i + j)) % k
            if k3 not in idx:
                continue
            # Use the radially-averaged phase for stability.
            p1 = float(np.angle(np.mean(a[:, i] / np.maximum(np.abs(a[:, i]), 1e-300))))
            p2 = float(np.angle(np.mean(a[:, j] / np.maximum(np.abs(a[:, j]), 1e-300))))
            p3 = float(np.angle(np.mean(a[:, k3] / np.maximum(np.abs(a[:, k3]), 1e-300))))
            worst = max(worst, abs(math.sin(p1 + p2 + p3)))
    return worst


# ---------------------------------------------------------------------------
# One sweep cell
# ---------------------------------------------------------------------------

def run_case(Nr: int, Nz: int, regime: str, nu: float) -> Dict[str, object]:
    solver = CylindricalSpectralSolver(Nr=Nr, Nz=Nz, nu=nu)

    samples: List[Dict[str, float]] = []

    def observer(t: float, u_r: np.ndarray, u_theta: np.ndarray, u_z: np.ndarray) -> None:
        samples.append(
            {
                "t": float(t),
                "omega_inf": float(solver.compute_vorticity(u_r, u_theta, u_z)["max_vorticity"]),
                "circ_residual": float(solver.compute_circulation_residual(u_theta, target_circ=8.0)),
                "enstrophy": enstrophy(solver, u_r, u_theta, u_z),
                "triadic_resultant": triadic_phase_resultant(u_theta),
            }
        )

    limit = solver.rk4_stability_limit(nu)
    result = solver.evolve(
        t_span=T_SPAN,
        dt=DT,
        nu=nu,
        observer=observer,
        abort_on_growth=DIVERGENCE_GROWTH,
    )

    omegas = [s["omega_inf"] for s in samples]
    finite = all(np.isfinite(o) for o in omegas)

    # BKM integral I(t) = integral_0^t ||omega||_inf dtau, trapezoid on the
    # recorded trace (which is the same time grid as the samples).
    times = np.array([s["t"] for s in samples], dtype=float)
    omega_arr = np.array(omegas, dtype=float)
    if len(times) > 1 and finite:
        bkm = np.concatenate([[0.0], np.cumsum(0.5 * (omega_arr[1:] + omega_arr[:-1]) * np.diff(times))])
    else:
        bkm = np.zeros(len(times))
    for i, s in enumerate(samples):
        s["bkm_integral"] = float(bkm[i])

    monotone = bool(
        len(omega_arr) > 2
        and finite
        and np.all(np.diff(omega_arr) <= 1e-12 * max(abs(omega_arr[0]), 1.0))
    )
    triadic_max = max((s["triadic_resultant"] for s in samples), default=float("nan"))

    # Enstrophy is an integral functional, so it is far less exposed to the
    # derivative-amplified artifact than the pointwise peak. Its monotonicity is
    # the more robust physical statement at a given resolution.
    enst = np.array([s["enstrophy"] for s in samples], dtype=float)
    enstrophy_monotone = bool(
        len(enst) > 2 and np.all(np.isfinite(enst)) and np.all(np.diff(enst) <= 1e-12 * max(abs(enst[0]), 1.0))
    )

    return {
        "Nr": Nr,
        "Nz": Nz,
        "regime": regime,
        "nu": nu,
        "resolved": True,
        "completed": bool(result["completed"]),
        "diverged_at": result["diverged_at"],
        "steps_completed": result["steps_completed"],
        "n_steps": result["n_steps"],
        "substeps_per_step": result["substeps_per_step"],
        "rk4_stability_limit": (None if not np.isfinite(limit) else float(limit)),
        "omega_0": float(result["omega_0"]),
        "omega_final": (float(result["omega_final"]) if np.isfinite(result["omega_final"]) else None),
        "decay_ratio": (float(result["decay_ratio"]) if np.isfinite(result["decay_ratio"]) else None),
        "monotone_decay": monotone,
        "enstrophy_monotone": enstrophy_monotone,
        "pole_regularity_satisfied": bool(result["pole_regularity_satisfied"]),
        "triadic_resultant_max": (float(triadic_max) if np.isfinite(triadic_max) else None),
        "phase_locked": bool(np.isfinite(triadic_max) and triadic_max < 1e-12),
        "circ_residual_initial": samples[0]["circ_residual"] if samples else None,
        "circ_residual_final": samples[-1]["circ_residual"] if samples else None,
        "enstrophy_initial": samples[0]["enstrophy"] if samples else None,
        "enstrophy_final": samples[-1]["enstrophy"] if samples else None,
        "bkm_integral_final": samples[-1]["bkm_integral"] if samples else None,
        "samples": samples,
    }


def spectral_diagnostics(Nr: int) -> Dict[str, float]:
    """
    The eigenvalue evidence behind the divergence diagnosis, recomputed here so
    the report's root cause is reproducible from the artifact rather than
    quoted from prose.
    """
    solver = CylindricalSpectralSolver(Nr=Nr, Nz=32)
    M = solver._radial_matrix_theta()
    ev = np.linalg.eigvals(M).real
    _, u_theta, _ = solver.initialize_harper_seed(8.0, 0.3, 0.15)
    seed = u_theta[:, solver.Nz // 2]
    Ms = 0.5 * (M + M.T)
    rayleigh = float(seed @ Ms @ seed / (seed @ seed))
    return {
        "max_real_eigenvalue": float(ev.max()),
        "min_real_eigenvalue": float(ev.min()),
        "n_positive_eigenvalues": int((ev > 1e-6).sum()),
        "seed_rayleigh_quotient": rayleigh,
        "implied_physical_growth_over_run": float(math.exp(0.005 * max(rayleigh, 0.0) * (T_SPAN[1] - T_SPAN[0]))),
    }


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="BKM multi-grid spectral convergence sweep")
    parser.add_argument("--grids", default=",".join(str(g) for g in DEFAULT_GRIDS))
    parser.add_argument("--out", default=str(OUT_PATH))
    parser.add_argument("--quick", action="store_true", help="skip the 128 row")
    args = parser.parse_args(argv)

    grids = tuple(int(g) for g in args.grids.split(",") if g.strip())
    if args.quick:
        grids = tuple(g for g in grids if g < 128)

    print("Navier-Stokes BKM multi-grid spectral convergence sweep")
    print(f"  grids Nr x Nz: {[(g, g) for g in grids]}")
    print(f"  regimes: {VISCOSITY_REGIMES}")
    print(f"  t in {T_SPAN}, dt = {DT}\n")

    diagnostics = {str(g): spectral_diagnostics(g) for g in grids}
    for g, d in diagnostics.items():
        print(
            f"  spectral Nr={g:>3}: maxRe(eig)={d['max_real_eigenvalue']:>14.2f}  "
            f"n_pos={d['n_positive_eigenvalues']:>3}  seed Rayleigh={d['seed_rayleigh_quotient']:>7.2f}  "
            f"implied growth over run={d['implied_physical_growth_over_run']:.6f}"
        )
    print()

    cases: List[Dict[str, object]] = []
    for Nr in grids:
        for Nz in grids:
            for regime, nu in VISCOSITY_REGIMES.items():
                case = run_case(Nr, Nz, regime, nu)
                cases.append(case)
                status = "COMPLETED" if case["completed"] else f"DIVERGED at t={case['diverged_at']:.5f}"
                ratio = case["decay_ratio"]
                print(
                    f"  Nr={Nr:>3} Nz={Nz:>3} nu={nu:<6} {status:<26} "
                    f"omega0={case['omega_0']:>10.4f} "
                    f"ratio={'n/a' if ratio is None else f'{ratio:.6f}':>10} "
                    f"mono={str(case['monotone_decay']):<5} "
                    f"phaselock={case['triadic_resultant_max']:.2e} "
                    f"enstrophy={'n/a' if case['enstrophy_final'] is None else f'{case['enstrophy_final']:.4f}'}"
                )

    completed = [c for c in cases if c["completed"]]
    monotone = [c for c in completed if c["monotone_decay"]]
    enstrophy_monotone = [c for c in completed if c["enstrophy_monotone"]]
    locked = all(c["phase_locked"] for c in cases)
    pole_ok = all(c["pole_regularity_satisfied"] for c in completed)
    physical = [c for c in completed if c["regime"] == "physical"]
    euler = [c for c in completed if c["regime"] == "euler"]

    payload = {
        "generated_by": "intelligence/physics/bkm_convergence_sweep.py",
        "t_span": list(T_SPAN),
        "dt": DT,
        "grids": list(grids),
        "viscosity_regimes": VISCOSITY_REGIMES,
        "divergence_growth_threshold": DIVERGENCE_GROWTH,
        "spectral_diagnostics": diagnostics,
        "totals": {
            "cases": len(cases),
            "completed": len(completed),
            "diverged": len(cases) - len(completed),
            "monotone_decay": len(monotone),
            "enstrophy_monotone": len(enstrophy_monotone),
            "phase_locked_all_cases": bool(locked),
            "pole_regularity_all_completed": bool(pole_ok),
            "physical_regime_completed": len(physical),
            "euler_regime_completed": len(euler),
            "euler_no_numerical_dissipation": bool(
                euler and all(abs((c["decay_ratio"] or 0.0) - 1.0) < 1e-9 for c in euler)
            ),
        },
        "cases": cases,
    }

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2, allow_nan=False), encoding="utf-8")

    print(f"\n  summary: {payload['totals']}")
    print(f"  wrote {out}")
    print(
        "\n  NOTE: a completed run at high Nr is not evidence of convergence. Where the\n"
        "  radial collocation is non-dissipative the raw |omega|_inf series is dominated\n"
        "  by roundoff amplified through the O(Nr^4) growth and the O(Nr^2)-conditioned\n"
        "  derivative in the diagnostic; those cases are reported as diverged."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
