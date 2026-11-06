#!/usr/bin/env python3
"""
Challenge-pass validation for ns32_kernel_v2 (unit-box spectral NS kernel).
Four independent tests with known answers — the kernel must pass all four
before its 100-draw output is trusted:

  T1 Diffusion exactness: shear mode u=(0, sin(2*pi*x), 0) has zero nonlinear
     self-advection, so amplitude decays exactly as exp(-nu*(2*pi)^2 * T).
  T2 Divergence preservation: max |div u| stays at round-off for a random draw.
  T3 Hou-Li filter values: rho(0)=1; single-axis Nyquist rho = exp(-36).
  T4 Taylor-Green sanity: energy strictly decreases over T=0.5, all finite.
"""
import math
import sys

import numpy as np

sys.path.insert(0, ".")
import ns32_kernel_v2 as ns

N, NU, DT = ns.N, ns.NU, ns.DT
results = []


def check(name, ok, detail):
    results.append(ok)
    print(f"[{'PASS' if ok else 'FAIL'}] {name}: {detail}")


# T3 — filter values (cheapest first)
rho0 = float(ns.RHO[0, 0, 0])
# integer mode -16 (Nyquist) lives at index 16 in fftfreq ordering
rho_nyq = float(ns.RHO[16, 0, 0])
expect = math.exp(-36.0)
check("T3 Hou-Li filter", abs(rho0 - 1.0) < 1e-15 and abs(rho_nyq - expect) / expect < 1e-9,
      f"rho(0)={rho0}, rho(Nyquist axis)={rho_nyq:.4e} vs exp(-36)={expect:.4e}")

# T1 — diffusion exactness
x = np.linspace(0.0, 1.0, N, endpoint=False)
X, Y, Z = np.meshgrid(x, x, x, indexing="ij")
u_phys = np.zeros((3, N, N, N))
u_phys[1] = np.sin(2 * np.pi * X)
uh = np.stack([np.fft.fftn(u_phys[c]) for c in range(3)])
a0 = float(np.abs(u_phys[1]).max())
for _ in range(ns.NSTEPS):
    k1_ = ns.rhs(uh)
    k2_ = ns.rhs(uh + 0.5 * DT * k1_)
    k3_ = ns.rhs(uh + 0.5 * DT * k2_)
    k4_ = ns.rhs(uh + DT * k3_)
    uh = uh + (DT / 6.0) * (k1_ + 2 * k2_ + 2 * k3_ + k4_)
    uh *= ns.RHO
    uh[:, 0, 0, 0] = 0.0
uT = np.fft.ifftn(uh[1]).real
ratio = float(np.abs(uT).max()) / a0
exact = math.exp(-NU * (2 * np.pi) ** 2 * ns.T_END)
check("T1 diffusion exactness", abs(ratio - exact) < 2e-3,
      f"amplitude ratio {ratio:.6f} vs exact exp(-nu(2pi)^2 T) = {exact:.6f} (diff {abs(ratio-exact):.2e})")

# T2 — divergence preservation on a random draw
uh2 = ns.initial_field(101)
div0 = float(np.abs(ns.KX * uh2[0] + ns.KY * uh2[1] + ns.KZ * uh2[2]).max())
for _ in range(10):
    k1_ = ns.rhs(uh2)
    uh2 = uh2 + DT * k1_
    uh2 *= ns.RHO
div1 = float(np.abs(ns.KX * uh2[0] + ns.KY * uh2[1] + ns.KZ * uh2[2]).max())
# spectral div measure scales with |uh|; normalise by max|uh|
scale = float(np.abs(uh2).max())
check("T2 divergence preservation", div0 / scale < 1e-8 and div1 / scale < 1e-8,
      f"|k.u|/|u| initial {div0/scale:.2e}, after 10 Euler steps {div1/scale:.2e}")

# T4 — Taylor-Green
u_tg = np.zeros((3, N, N, N))
u_tg[0] = np.sin(2 * np.pi * X) * np.cos(2 * np.pi * Y) * np.cos(2 * np.pi * Z)
u_tg[1] = -np.cos(2 * np.pi * X) * np.sin(2 * np.pi * Y) * np.cos(2 * np.pi * Z)
uh3 = np.stack([np.fft.fftn(u_tg[c]) for c in range(3)])
def energy(uh_):
    u_ = np.stack([np.fft.ifftn(uh_[c]).real for c in range(3)])
    return 0.5 * float(np.mean(np.sum(u_**2, axis=0)))
es = [energy(uh3)]
for s in range(50):
    k1_ = ns.rhs(uh3)
    k2_ = ns.rhs(uh3 + 0.5 * DT * k1_)
    k3_ = ns.rhs(uh3 + 0.5 * DT * k2_)
    k4_ = ns.rhs(uh3 + DT * k3_)
    uh3 = uh3 + (DT / 6.0) * (k1_ + 2 * k2_ + 2 * k3_ + k4_)
    uh3 *= ns.RHO
    uh3[:, 0, 0, 0] = 0.0
    if s % 10 == 9:
        es.append(energy(uh3))
mono = all(es[i + 1] < es[i] for i in range(len(es) - 1))
check("T4 Taylor-Green energy decay", mono and all(math.isfinite(e) for e in es),
      f"E samples {[round(e,5) for e in es]} (monotone decreasing: {mono})")

print(f"\n{sum(results)}/4 kernel validation tests pass")
sys.exit(0 if all(results) else 1)
