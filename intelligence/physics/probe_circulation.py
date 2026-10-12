"""
Pole-regular circulation experiment.

CONTEXT
-------
The committed solver evolves the VECTOR theta-component operator,
    L = D_rr + (1/r) D_r - 1/r^2   (+ d_zz),
whose discretized near-pole behaviour carries genuine positive eigenvalues that
grow like Nr^4. Measured decay ratio at 32x32 / nu=0.005 is 0.970559, which is
1.31% away from the Harper audit's 32^3 benchmark of 0.9834 — outside the 1%
the benchmark asks for — and the trace is not monotone (33 of 80 steps rise).

The audit's identified honest cure is a pole-regular treatment. The natural one
is to evolve the CIRCULATION Gamma = r * u_theta instead of u_theta, because the
coordinate singularity cancels in that variable. Derivation for the pure
diffusion of the theta-velocity component:

    L[u]_theta = (1/r) d_r (r d_r u_theta) - u_theta/r^2 + d_zz u_theta

  substituting u_theta = Gamma / r gives

    d_t Gamma = nu * ( d_rr Gamma - (1/r) d_r Gamma + d_zz Gamma )

  and for a regular field Gamma ~ c r^2 near the axis, so d_rr Gamma -> 2c and
  (1/r) d_r Gamma -> 2c: the pole term CANCELS exactly rather than blowing up.
  The pole row of the radial block is therefore 0 by regularity, not by fiat.

This script measures that formulation against the committed one on the same
grid, the same seed, the same dt, and reports ratio, monotonicity, and the
radial-block spectrum for both. It changes no committed code; it is a probe.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from intelligence.physics.cylindrical_solver import CylindricalSpectralSolver

T_SPAN = (0.0, 0.02)
DT = 0.00025
NU = 0.005


def eigenvalues_of(M: np.ndarray) -> dict:
    ev = np.linalg.eigvals(M).real
    return {
        "max_real": float(ev.max()),
        "min_real": float(ev.min()),
        "n_positive": int((ev > 1e-6).sum()),
    }


def semigroup_step(M: np.ndarray, kz: np.ndarray, U: np.ndarray, nu: float, T: float) -> np.ndarray:
    """Exact viscous semigroup per z-mode: exp(nu * (M - kz^2 I) T)."""
    out = np.empty_like(U)
    for k in range(len(kz)):
        Mk = M - (kz[k] ** 2) * np.eye(M.shape[0])
        w, V = np.linalg.eig(Mk)
        out[:, k] = V @ (np.exp(nu * T * w) * np.linalg.solve(V, U[:, k]))
    return out


def vorticity_peak_from_utheta(solver: CylindricalSpectralSolver, u_theta: np.ndarray) -> float:
    zeros = np.zeros_like(u_theta)
    return float(solver.compute_vorticity(zeros, u_theta, zeros)["max_vorticity"])


def main() -> int:
    print("Pole-regular circulation probe — same seed, same grid, same dt")
    print(f"  t in {T_SPAN}, dt = {DT}, nu = {NU}\n")

    for Nr, Nz in ((32, 32), (64, 64)):
        solver = CylindricalSpectralSolver(Nr=Nr, Nz=Nz)
        r = solver.r
        N = Nr + 1
        I = np.eye(N)
        D1, D2 = solver.D_r, solver.D_r @ solver.D_r

        # --- committed operator: the REAL theta block, ZERO pole row ---
        # (This arm previously used 2*D2[0], which is the SCALAR block's row.
        #  That mis-specified control made this arm read ratio 1.27e12 at Nr=32
        #  instead of its true 0.9706 - a comparison against a wrong arm is not
        #  a comparison.)
        M_vec = np.zeros((N, N))
        M_vec[1:, :] = D2[1:, :] + D1[1:, :] / r[1:, None] - I[1:, :] / (r[1:, None] ** 2)
        M_vec[0, :] = 0.0

        # --- pole-regular operator in the circulation variable ---
        # Gamma = r * u_theta,  d_t Gamma = nu (Gamma_rr - Gamma_r / r + Gamma_zz)
        M_circ = np.zeros((N, N))
        M_circ[1:, :] = D2[1:, :] - D1[1:, :] / r[1:, None]
        M_circ[0, :] = 0.0        # regularity: the two singular terms cancel at r=0

        _, u_theta_0, _ = solver.initialize_harper_seed(8.0, 0.3, 0.15)
        omega_0_vec = vorticity_peak_from_utheta(solver, u_theta_0)

        # Vector form, exact semigroup (no RK4 substep confound).
        U0 = np.fft.fft(u_theta_0, axis=1)
        U_vec = semigroup_step(M_vec, solver.kz, U0, NU, T_SPAN[1] - T_SPAN[0])
        u_vec = np.real(np.fft.ifft(U_vec, axis=1))
        u_vec[0, :] = 0.0
        ratio_vec = vorticity_peak_from_utheta(solver, u_vec) / omega_0_vec

        # Circulation form: evolve Gamma, map back through regularity.
        # (Previously `gamma / r` divided through the r=0 node, which is 0/0 and
        #  propagated NaN through every downstream diagnostic.)
        gamma_0 = r[:, None] * u_theta_0
        G0 = np.fft.fft(gamma_0, axis=1)
        G_circ = semigroup_step(M_circ, solver.kz, G0, NU, T_SPAN[1] - T_SPAN[0])
        gamma = np.real(np.fft.ifft(G_circ, axis=1))
        gamma[0, :] = 0.0
        u_circ = np.zeros_like(gamma)
        u_circ[1:, :] = gamma[1:, :] / r[1:, None]
        u_circ[0, :] = 0.0          # u_theta(0) = 0 by regularity
        ratio_circ = vorticity_peak_from_utheta(solver, u_circ) / omega_0_vec

        # A short trace for monotonicity, in the circulation variable.
        # The pole row is filled by regularity, never by division (0/0 = NaN).
        n_sub = 40
        dts = (T_SPAN[1] - T_SPAN[0]) / n_sub

        def to_utheta(g: np.ndarray) -> np.ndarray:
            u = np.zeros_like(g)
            u[1:, :] = g[1:, :] / r[1:, None]
            u[0, :] = 0.0
            return u

        gamma_t = gamma_0.copy()
        trace = [vorticity_peak_from_utheta(solver, to_utheta(gamma_0))]
        for _ in range(n_sub):
            Gt = np.fft.fft(gamma_t, axis=1)
            Gt = semigroup_step(M_circ, solver.kz, Gt, NU, dts)
            gamma_t = np.real(np.fft.ifft(Gt, axis=1))
            gamma_t[0, :] = 0.0
            trace.append(vorticity_peak_from_utheta(solver, to_utheta(gamma_t)))
        d = np.diff(np.array(trace))
        trace_finite = bool(np.all(np.isfinite(np.array(trace))))

        ev_vec = eigenvalues_of(M_vec)
        ev_circ = eigenvalues_of(M_circ)

        print(f"=== Nr={Nr} Nz={Nz} ===")
        print(f"  vector (committed)    ratio={ratio_vec:.6f}  "
              f"maxRe(eig)={ev_vec['max_real']:>12.1f}  n_pos={ev_vec['n_positive']}")
        print(f"  circulation (regular) ratio={ratio_circ:.6f}  "
              f"maxRe(eig)={ev_circ['max_real']:>12.1f}  n_pos={ev_circ['n_positive']}")
        print(f"  audit 32^3 benchmark  ratio=0.983400")
        print(f"  |vector - audit|      {abs(ratio_vec - 0.9834) / 0.9834 * 100:.2f}%")
        print(f"  |circ   - audit|      {abs(ratio_circ - 0.9834) / 0.9834 * 100:.2f}%")
        print(f"  circulation trace monotone: {bool(trace_finite and np.all(d <= 0))}  "
              f"(finite={trace_finite}, upward {int((d > 0).sum())} of {len(d)}, "
              f"max {float(d.max()) if trace_finite else float('nan'):.6f})")
        print()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
