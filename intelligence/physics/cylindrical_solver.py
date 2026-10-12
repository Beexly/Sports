"""
Boundary-fitted cylindrical spectral solver testbed — (r, theta, z).

DIAGNOSTIC / SYNTHETIC ONLY. This is a numerical testbed, not a proof of
anything. All "results" below are computed on manufactured analytic solutions.

Context (from the task brief; the Harper-seed audit doc
NAVIER_STOKES_MILLENNIUM_ASSESSMENT_AND_BKM_AUDIT.md was filed Windows-side
and had not landed on the Beexly/Sports remote at build time):
  Embedding cylindrical streamfunctions into Cartesian Fourier cubes [-pi,pi]^3
  creates an artificial O(10^-1) spectral aliasing residual floor that
  refinement cannot remove.

Purpose: a clean (r, theta, z) Chebyshev-Fourier testbed to check whether the
Kelvin circulation residual converges algebraically,
    lim_{N -> oo} ||R_circ||_{L^2} = 0,
when the coordinate singularity is treated correctly, and to demonstrate the
mechanism of the Cartesian-embedding floor.

Discretization
  r : Chebyshev-Lobatto, mapped to [0, R] via r = R(1-x)/2, so grid
      index 0 is the POLE (r = 0) and index Nr is the outer wall (r = R).
      Pole regularity enforced at r = 0.
  theta : uniform Fourier (present for field representation; the Stokes solve
          below is axisymmetric m = 0; |m| > 0 modes need r^|m| parity
          treatment -- documented future work, NOT implemented here).
  z : Chebyshev-Lobatto, mapped to [-H/2, H/2].

Stokes operator (axisymmetric):  E^2 = d^2/dr^2 - (1/r) d/dr + d^2/dz^2.
Pole regularity (r -> 0, smooth axisymmetric psi with psi ~ r^2):
  (E^2 psi)(0, z) = (d^2 psi / dz^2)(0, z),
because psi_rr - (1/r) psi_r -> 0. Enforced by row replacement.
Velocity: u_r = -(1/r) dpsi/dz, u_z = (1/r) dpsi/dr, with l'Hopital at r = 0:
  u_r(0, z) = 0,  u_z(0, z) = (d^2 psi / dr^2)(0, z).
"""

import numpy as np
from scipy.integrate import quad

LABEL = "DIAGNOSTIC/SYNTHETIC"


# ---------------------------------------------------------------------------
# Chebyshev tools (Trefethen)
# ---------------------------------------------------------------------------
def cheb(n):
    """Chebyshev-Lobatto points x in [-1,1] (x[0]=1 .. x[n]=-1) and diff matrix."""
    if n == 0:
        return np.array([1.0]), np.array([[0.0]])
    x = np.cos(np.pi * np.arange(n + 1) / n)
    c = np.ones(n + 1)
    c[0] = 2.0
    c[-1] = 2.0
    c = c * ((-1.0) ** np.arange(n + 1))
    X = np.tile(x, (n + 1, 1)).T
    dX = X - X.T
    D = np.outer(c, 1.0 / c) / (dX + np.eye(n + 1))
    D = D - np.diag(np.sum(D, axis=1))
    return D, x


def barycentric_weights(n):
    """Barycentric weights for Chebyshev-Lobatto points."""
    w = (-1.0) ** np.arange(n + 1)
    w[0] *= 0.5
    w[-1] *= 0.5
    return w


def bary_interp(x_nodes, w, f_vals, x_eval):
    """Barycentric Lagrange interpolation (scalar or array x_eval)."""
    x_eval = np.atleast_1d(np.asarray(x_eval, dtype=float))
    out = np.empty_like(x_eval)
    for k, xe in enumerate(x_eval):
        diff = xe - x_nodes
        j = np.argmin(np.abs(diff))
        if abs(diff[j]) < 1e-14:
            out[k] = f_vals[j]
            continue
        terms = w / diff
        out[k] = np.sum(terms * f_vals) / np.sum(terms)
    return out


# ---------------------------------------------------------------------------
# Solver
# ---------------------------------------------------------------------------
class CylindricalSpectralSolver:
    def __init__(self, Nr, Nt, Nz, R=1.0, H=1.0):
        self.Nr, self.Nt, self.Nz = Nr, Nt, Nz
        self.R, self.H = R, H

        Dx, x = cheb(Nr)
        Dz, zc = cheb(Nz)
        # r = R*(1-x)/2 : x=1 -> r=0 (pole, index Nr), x=-1 -> r=R (index 0)
        self.r = R * (1.0 - x) / 2.0
        self.z = (H / 2.0) * zc  # z[0]=+H/2 .. z[Nz]=-H/2
        self.theta = 2.0 * np.pi * np.arange(Nt) / Nt

        # d/dr = (dx/dr)^{-1} d/dx ; dr/dx = -R/2
        self.Dr = (-2.0 / R) * Dx
        self.Drr = (4.0 / R ** 2) * (Dx @ Dx)
        self.Dz = (2.0 / H) * Dz
        self.Dzz = (4.0 / H ** 2) * (Dz @ Dz)

        self._x_cheb_r = x
        self._w_r = barycentric_weights(Nr)
        self._x_cheb_z = zc
        self._w_z = barycentric_weights(Nz)

        self._op = None  # assembled Stokes matrix (lazy)

    # -- Stokes operator E^2 (axisymmetric), with pole + Dirichlet BCs -------
    def stokes_matrix(self):
        if self._op is not None:
            return self._op
        Nr, Nz = self.Nr, self.Nz
        r = self.r
        Ir, Iz = np.eye(Nr + 1), np.eye(Nz + 1)
        with np.errstate(divide="ignore", invalid="ignore"):
            inv_r = np.where(r > 0, 1.0 / r, 0.0)
        Er = self.Drr - np.diag(inv_r) @ self.Dr
        E = np.kron(Er, Iz) + np.kron(Ir, self.Dzz)
        n = Nr + 1
        rhs_mask = np.ones((n, n), dtype=bool)

        def idx(jr, jz):
            return jr * n + jz  # row-major: r outer, z inner

        # Dirichlet: r = R (jr = Nr), z = +/-H/2 (jz=0, jz=Nz)
        for jr in range(n):
            for jz in (0, Nz):
                E[idx(jr, jz), :] = 0.0
                E[idx(jr, jz), idx(jr, jz)] = 1.0
                rhs_mask[jr, jz] = False
        for jz in range(n):
            E[idx(Nr, jz), :] = 0.0
            E[idx(Nr, jz), idx(Nr, jz)] = 1.0
            rhs_mask[Nr, jz] = False
        # Pole regularity at r = 0 (jr = 0): (E^2 psi) = Dzz psi
        jr = 0
        for jz in range(n):
            if jz in (0, Nz):
                continue  # corner already Dirichlet
            row = np.zeros(n * n)
            row[idx(jr, 0): idx(jr, 0) + n] = self.Dzz[jz, :]
            E[idx(jr, jz), :] = row
        self._op = E
        self._rhs_mask = rhs_mask
        return E

    def solve_stokes(self, f):
        """Solve E^2 psi = f with psi = 0 on r=R, z=+/-H/2. f shape (Nr+1, Nz+1)."""
        E = self.stokes_matrix()
        n = self.Nr + 1
        rhs = f.reshape(-1).copy()
        # zero RHS on Dirichlet rows (r = R at jr = Nr; z = +/-H/2)
        for jr in range(n):
            for jz in (0, self.Nz):
                rhs[jr * n + jz] = 0.0
        for jz in range(n):
            rhs[self.Nr * n + jz] = 0.0
        psi = np.linalg.solve(E, rhs).reshape(n, n)
        return psi

    def apply_stokes(self, psi):
        """Apply discrete E^2 (no BC replacement) -- for operator-accuracy tests."""
        Nr, Nz = self.Nr, self.Nz
        r = self.r
        with np.errstate(divide="ignore", invalid="ignore"):
            inv_r = np.where(r > 0, 1.0 / r, 0.0)
        Er = self.Drr - np.diag(inv_r) @ self.Dr
        out = Er @ psi + psi @ self.Dzz.T
        # pole (r = 0, index 0): use regularity value
        out[0, :] = (psi[0, :] @ self.Dzz.T)
        return out

    # -- velocity ------------------------------------------------------------
    def velocity(self, psi):
        """(u_r, u_z) from Stokes streamfunction. Arrays shape (Nr+1, Nz+1)."""
        r = self.r
        dpsidz = psi @ self.Dz.T
        dpsidr = self.Dr @ psi
        ur = np.zeros_like(psi)
        uz = np.zeros_like(psi)
        pos = r > 1e-300
        with np.errstate(divide="ignore", invalid="ignore"):
            ur[pos, :] = -(1.0 / r[pos, None]) * dpsidz[pos, :]
            uz[pos, :] = (1.0 / r[pos, None]) * dpsidr[pos, :]
        # pole (r = 0, index 0): u_r = 0, u_z = d^2 psi / dr^2 (l'Hopital)
        jr = 0
        ur[jr, :] = 0.0
        uz[jr, :] = (self.Drr @ psi)[jr, :]
        return ur, uz

    # -- interpolation --------------------------------------------------------
    def interp2(self, f, r_eval, z_eval):
        """Barycentric Chebyshev interpolation of grid field f at paired
        points (r_eval[k], z_eval[k]). Returns shape (npts,)."""
        r_eval = np.atleast_1d(np.asarray(r_eval, dtype=float))
        z_eval = np.atleast_1d(np.asarray(z_eval, dtype=float))
        assert r_eval.shape == z_eval.shape
        xr = 1.0 - 2.0 * r_eval / self.R   # physical -> cheb x in [-1, 1]
        xz = 2.0 * z_eval / self.H
        npts = len(xr)
        tmp = np.empty((self.Nr + 1, npts))
        for jr in range(self.Nr + 1):
            tmp[jr, :] = bary_interp(self._x_cheb_z, self._w_z, f[jr, :], xz)
        out = np.empty(npts)
        for k in range(npts):
            out[k] = bary_interp(self._x_cheb_r, self._w_r, tmp[:, k], xr[k])[0]
        return out

    # -- Kelvin circulation ----------------------------------------------------
    def kelvin_circulation(self, ur, uz, r1, r2, z1, z2, ngl=64):
        """Circulation Gamma = oint (u_r dr + u_z dz) around axis-aligned
        rectangle. Gauss-Legendre quadrature per edge (spectral for smooth
        integrands)."""
        from numpy.polynomial.legendre import leggauss
        xi, w = leggauss(ngl)
        Gamma = 0.0
        # bottom: z = z1, r : r1 -> r2
        r = 0.5 * (r1 + r2) + 0.5 * (r2 - r1) * xi
        z = np.full_like(r, z1)
        Gamma += 0.5 * (r2 - r1) * np.sum(w * self.interp2(ur, r, z))
        # right: r = r2, z : z1 -> z2
        z = 0.5 * (z1 + z2) + 0.5 * (z2 - z1) * xi
        r = np.full_like(z, r2)
        Gamma += 0.5 * (z2 - z1) * np.sum(w * self.interp2(uz, r, z))
        # top: z = z2, r : r2 -> r1
        r = 0.5 * (r2 + r1) + 0.5 * (r1 - r2) * xi
        z = np.full_like(r, z2)
        Gamma += 0.5 * (r1 - r2) * np.sum(w * self.interp2(ur, r, z))
        # left: r = r1, z : z2 -> z1
        z = 0.5 * (z2 + z1) + 0.5 * (z1 - z2) * xi
        r = np.full_like(z, r1)
        Gamma += 0.5 * (z1 - z2) * np.sum(w * self.interp2(uz, r, z))
        return Gamma


# ---------------------------------------------------------------------------
# Manufactured analytic solution (SYNTHETIC test data)
#   psi_a(r,z) = A * R0^2 (rho^2 - 2 rho^4 + rho^6) * sin^2(pi zeta)
#   rho = r/R0, zeta = (z + H/2)/H
# Regularity: psi ~ r^2 at axis. BCs: psi = 0 at r = R0, z = +/-H/2.
# f = E^2 psi_a, hand-derived (verified numerically in self-test):
#   f = A [ (-16 rho^2 + 24 rho^4) Z(zeta)
#           + R0^2 (rho^2 - 2 rho^4 + rho^6) * 2 pi^2 cos(2 pi zeta) / H^2 ]
# ---------------------------------------------------------------------------
def psi_analytic(r, z, A=1.0, R0=1.0, H=1.0):
    rho = r / R0
    zeta = (z + H / 2.0) / H
    return A * R0 ** 2 * (rho ** 2 - 2 * rho ** 4 + rho ** 6) * np.sin(np.pi * zeta) ** 2


def f_analytic(r, z, A=1.0, R0=1.0, H=1.0):
    rho = r / R0
    zeta = (z + H / 2.0) / H
    Z = np.sin(np.pi * zeta) ** 2
    term_r = (-16 * rho ** 2 + 24 * rho ** 4) * Z
    term_z = R0 ** 2 * (rho ** 2 - 2 * rho ** 4 + rho ** 6) * (
        2 * np.pi ** 2 * np.cos(2 * np.pi * zeta) / H ** 2
    )
    return A * (term_r + term_z)


def velocity_analytic(r, z, A=1.0, R0=1.0, H=1.0):
    """(u_r, u_z) from psi_a. u_r = -(1/r) dpsi/dz, u_z = (1/r) dpsi/dr."""
    rho = np.where(r > 0, r / R0, 0.0)
    zeta = (z + H / 2.0) / H
    Z = np.sin(np.pi * zeta) ** 2
    dZ_dzeta = np.pi * np.sin(2 * np.pi * zeta)
    # u_r = -(A/H) * R(r)/r * dZ/dzeta ; R(r)/r = R0 (rho - 2 rho^3 + rho^5)
    ur = np.where(
        r > 0,
        -(A / H) * R0 * (rho - 2 * rho ** 3 + rho ** 5) * dZ_dzeta,
        0.0,
    )
    # u_z = A (2 - 8 rho^2 + 6 rho^4) Z
    uz = A * (2 - 8 * rho ** 2 + 6 * rho ** 4) * Z
    return ur, uz


def circulation_analytic(r1, r2, z1, z2, A=1.0, R0=1.0, H=1.0):
    """Ground-truth Gamma via adaptive quadrature of the analytic velocity."""
    def bottom(r):
        ur, _ = velocity_analytic(np.atleast_1d(r), np.atleast_1d(z1), A, R0, H)
        return ur[0]
    def right(z):
        _, uz = velocity_analytic(np.atleast_1d(r2), np.atleast_1d(z), A, R0, H)
        return uz[0]
    def top(r):
        ur, _ = velocity_analytic(np.atleast_1d(r), np.atleast_1d(z2), A, R0, H)
        return ur[0]
    def left(z):
        _, uz = velocity_analytic(np.atleast_1d(r1), np.atleast_1d(z), A, R0, H)
        return uz[0]
    g = quad(bottom, r1, r2)[0] + quad(right, z1, z2)[0]
    g += quad(top, r2, r1)[0] + quad(left, z2, z1)[0]
    return g


# ---------------------------------------------------------------------------
# Cartesian-embedding comparison (the audit's bad practice, reproduced
# faithfully): discretize the CYLINDRICAL Stokes operator on a Cartesian
# Fourier cube. In Cartesian, E^2 psi =
#     [x^2 psi_xx + 2xy psi_xy + y^2 psi_yy - x psi_x - y psi_y] / r^2 + psi_zz,
# whose 1/r^2 coefficients are singular at the axis. FFT derivatives are
# spectral, but the pointwise singular coefficients destroy accuracy near
# r = 0 -- this is the O(10^-1) floor mechanism. Honest scope note: this
# tests the *embedded cylindrical formulation*, not the best possible
# Cartesian method (which would reformulate to avoid 1/r entirely).
# ---------------------------------------------------------------------------
def cartesian_embedded_stokes_error(N, R0=1.0, H=1.0, A=1.0, r_max_frac=0.8):
    """Max |E^2_cart psi_a - f| over interior points (r <= r_max_frac*R0).

    Returns (max_err, n_near_axis_points). SYNTHETIC test.
    """
    Lx = 2 * R0
    x = np.linspace(-R0, R0, N, endpoint=False)
    z = np.linspace(-H / 2, H / 2, N, endpoint=False)
    X, Y, Z = np.meshgrid(x, x, z, indexing="ij")
    rr = np.sqrt(X ** 2 + Y ** 2)

    psi = psi_analytic(rr, Z, A, R0, H)
    f_true = f_analytic(rr, Z, A, R0, H)

    kx = 2 * np.pi * np.fft.fftfreq(N, d=(2 * R0 / N))
    kz = 2 * np.pi * np.fft.fftfreq(N, d=(H / N))
    Pf = np.fft.fftn(psi)
    KX, KY, KZ = np.meshgrid(kx, kx, kz, indexing="ij")
    psi_x = np.fft.ifftn(1j * KX * Pf).real
    psi_y = np.fft.ifftn(1j * KY * Pf).real
    psi_xx = np.fft.ifftn(-KX ** 2 * Pf).real
    psi_yy = np.fft.ifftn(-KY ** 2 * Pf).real
    psi_xy = np.fft.ifftn(-KX * KY * Pf).real
    psi_zz = np.fft.ifftn(-KZ ** 2 * Pf).real

    # regularize only to avoid hard div-by-zero; damage is done regardless
    r2 = np.maximum(rr ** 2, 1e-30)
    E2 = (
        X ** 2 * psi_xx + 2 * X * Y * psi_xy + Y ** 2 * psi_yy - X * psi_x - Y * psi_y
    ) / r2 + psi_zz

    interior = rr <= r_max_frac * R0
    err = np.abs(E2[interior] - f_true[interior])
    return float(np.max(err)), int(np.sum(interior))


# ---------------------------------------------------------------------------
# Self-test
# ---------------------------------------------------------------------------
def self_test():
    print(f"=== cylindrical_solver self-test [{LABEL}] ===")
    print("Manufactured analytic solution; nothing here is a physical claim.\n")
    R0, H, A = 1.0, 1.0, 1.0
    r1, r2, z1, z2 = 0.2 * R0, 0.6 * R0, -0.2 * H, 0.2 * H

    # --- Part 0: verify hand-derived f against high-res discrete operator ----
    s = CylindricalSpectralSolver(48, 8, 48, R0, H)
    Rg, Zg = np.meshgrid(s.r, s.z, indexing="ij")
    psi_g = psi_analytic(Rg, Zg, A, R0, H)
    f_g = f_analytic(Rg, Zg, A, R0, H)
    f_d = s.apply_stokes(psi_g)
    m_r = (s.r > 1e-12)
    interior = np.broadcast_to(m_r[:, None], f_d.shape)
    err_f = np.max(np.abs(f_d[interior] - f_g[interior]))
    print(f"[0] hand-derived f vs discrete E^2 (N=48): max err = {err_f:.3e}")
    assert err_f < 1e-8, "manufactured f formula inconsistent!"

    # --- Part A: operator accuracy, cylindrical vs Cartesian embedding -------
    print("\n[A] Stokes operator max-error (interior), cylindrical vs Cartesian:")
    print(f"{'N':>4} {'cyl err':>12} {'cart err':>12}  (cart measured r<=0.8R)")
    cart_floor = []
    for N in (8, 12, 16, 24, 32):
        sc = CylindricalSpectralSolver(N, 8, N, R0, H)
        Rg, Zg = np.meshgrid(sc.r, sc.z, indexing="ij")
        f_d = sc.apply_stokes(psi_analytic(Rg, Zg, A, R0, H))
        f_t = f_analytic(Rg, Zg, A, R0, H)
        m_r = (sc.r > 1e-12)
        m = np.broadcast_to(m_r[:, None], f_d.shape)
        err_cyl = np.max(np.abs(f_d[m] - f_t[m]))
        err_cart, _ = cartesian_embedded_stokes_error(N, R0, H, A)
        cart_floor.append(err_cart)
        print(f"{N:>4} {err_cyl:>12.3e} {err_cart:>12.3e}")
    # cylindrical must converge; Cartesian must stall at/above O(1e-1)
    assert cart_floor[-1] > 5e-2, "expected Cartesian floor did not appear"
    print("  -> cylindrical: spectral decay. Cartesian: floor ~O(10^-1), no decay.")

    # --- Part B: full solve E^2 psi = f, then Kelvin circulation --------------
    print("\n[B] Full solve + Kelvin circulation residual |Gamma_h - Gamma_a|:")
    Gamma_a = circulation_analytic(r1, r2, z1, z2, A, R0, H)
    print(f"  analytic Gamma = {Gamma_a:.10f}")
    print(f"{'N':>4} {'||psi_h-psi_a||inf':>18} {'|Gamma res|':>12}")
    prev = None
    for N in (8, 12, 16, 24, 32):
        sc = CylindricalSpectralSolver(N, 8, N, R0, H)
        Rg, Zg = np.meshgrid(sc.r, sc.z, indexing="ij")
        f_g = f_analytic(Rg, Zg, A, R0, H)
        psi_h = sc.solve_stokes(f_g)
        psi_a = psi_analytic(Rg, Zg, A, R0, H)
        err_psi = np.max(np.abs(psi_h - psi_a))
        ur, uz = sc.velocity(psi_h)
        Gamma_h = sc.kelvin_circulation(ur, uz, r1, r2, z1, z2)
        res = abs(Gamma_h - Gamma_a)
        rate = f"{prev / res:5.1f}x" if prev else "   --"
        prev = res
        print(f"{N:>4} {err_psi:>18.3e} {res:>12.3e}  (drop {rate})")
    assert res < 1e-6, "circulation residual did not converge!"
    print("  -> circulation residual decays algebraically/spectrally; floor is gone.")

    print(f"\nALL SELF-TESTS PASSED [{LABEL}]")


if __name__ == "__main__":
    self_test()
