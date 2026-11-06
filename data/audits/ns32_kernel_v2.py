#!/usr/bin/env python3
"""
NS 32-seed continuation — memory-safe pseudo-spectral kernel audit harness. (v2, unit-box corrected; see grid comment)

Protocol (Garrett, 2026-11-06): reconciled draws from bkm_100_final.json,
seed = 101 + draw_idx, draw_idx in 0..99, at 32^3, nu=0.01, Re=100,
Hou-Li 36th-order smooth spectral filter rho(k_j) = exp[-36*(2|k_j|/N)^36].

HOST NOTE: bkm_100_final.json was NOT found on this host (Motif VM) after
targeted search — the two-host rule applies. This harness therefore runs the
FULL 100-draw candidate sweep and re-derives the audit-clean rising subset
with the filters implemented in code below, then reconciles the subset
against Garrett's specification (32 draws, restored seeds 155 and 188
included). Whatever the reconciliation shows is what gets reported.

FFT convention (pinned): uh = np.fft.fftn(u_physical); u = ifftn(uh).
All energies/enstrophy/dissipation are computed as physical-space means,
so no Parseval factor can drift.

Memory-safety patterns (substituting for /antigravity-skills:memory-safety-patterns,
not installed on this host):
  M1 single-seed residency — one velocity field alive at a time; per-seed
     arrays deleted + gc.collect() before the next seed loads.
  M2 shared immutable grids — wavenumber/filter arrays built once, read-only.
  M3 streaming output — results appended to JSONL one seed at a time; the
     full trajectory is never held, only running reductions.
  M4 bounded horizon — fixed step count, fixed grid; no adaptive allocation.
  M5 RSS telemetry — peak RSS logged per seed (resource.getrusage); a seed
     whose peak RSS exceeds RSS_CAP_MB is flagged audit-dirty.
  M6 fail-closed audit — NaN/Inf or CFL violation marks the draw audit-dirty
     and excludes it; nothing is silently repaired.

Diagnostics (7-tuple), definitions pinned here because the brief names the
tuple but not each symbol's definition:
  w_inf        = max over trajectory of ||omega||_inf   (BKM quantity)
  w_inf_int    = integral_0^T ||omega||_inf dtau        (trapezoid; BKM integral)
  E_tail       = kinetic energy in the top-third wavenumber shell |k| > N/3
                 at final time, as a fraction of total energy (scale-free
                 spectral ratio, so the FFT convention cancels)
  R            = enstrophy growth ratio Omega(T)/Omega(0); rising iff R > 1
                 AND ||omega||_inf(T) > ||omega||_inf(0)
  grad_xi_inf  = ||grad xi||_inf at final time, xi = omega/|omega|
                 (vorticity-direction field; BKM geometric depletion diagnostic)
  D            = time-integrated dissipation int_0^T nu * mean(|grad u|^2) dtau
  dGamma       = Gamma(T) - Gamma(0), Kelvin circulation around the fixed
                 square loop in the z = L/2 plane centred on the domain
                 (Eulerian proxy for the material loop; viscous decay expected)

Initial condition (BKM-type smooth random draw): divergence-free field from
random Fourier phases with amplitude spectrum a(k) ~ (1+|k|^2)^-2.25, seeded
per draw; normalised to mean kinetic energy 0.5 (u_rms ~ 1, so Re = U*L/nu
= 1/0.01 = 100 as specified). This is a diagnostic continuation harness, NOT
a blowup claim: at nu=0.01, 32^3, T=1.0 most draws decay viscously; the
rising subset is the minority whose vorticity still grows over the window.
"""
import gc
import json
import math
import resource
import sys
import time

import numpy as np

N = 32
NU = 0.01
RE = 100.0
T_END = 1.0
NSTEPS = 100
DT = T_END / NSTEPS
RSS_CAP_MB = 1024.0
OUT_PATH = sys.argv[1] if len(sys.argv) > 1 else "ns100_draws.jsonl"
DRAW_LO = int(sys.argv[2]) if len(sys.argv) > 2 else 0
DRAW_HI = int(sys.argv[3]) if len(sys.argv) > 3 else 100

# ---- M2: shared grids, built once -------------------------------------------
# v2 CORRECTION (challenge pass, 2026-11-06): v1 used integer wavenumbers as
# the derivative operator, which silently puts the flow on a 2*pi box and
# makes Re = U*L/nu = 2*pi/0.01 ~ 628, contradicting the specified Re=100.
# v2 uses the UNIT box: physical wavenumber = 2*pi * integer mode, so with
# U_rms ~ 1, L = 1, nu = 0.01 the specified Re = 100 holds exactly, dx = 1/N
# is exact, and the CFL and circulation arithmetic in v1 becomes correct.
# The Hou-Li filter is defined on the integer MODE index (2|k_j|/N), so it
# is built from the integer grids before scaling.
k1 = np.fft.fftfreq(N, d=1.0 / N)  # integer modes
KXI, KYI, KZI = np.meshgrid(k1, k1, k1, indexing="ij")


def _hou_li_axis(kj):
    return np.exp(-36.0 * (2.0 * np.abs(kj) / N) ** 36)


RHO = _hou_li_axis(KXI) * _hou_li_axis(KYI) * _hou_li_axis(KZI)
KMAG = np.sqrt(KXI**2 + KYI**2 + KZI**2)
TAIL_MASK = KMAG > (N / 3.0)
TWO_PI = 2.0 * np.pi
KX, KY, KZ = TWO_PI * KXI, TWO_PI * KYI, TWO_PI * KZI
K2 = KX**2 + KY**2 + KZ**2
K2_safe = np.where(K2 == 0, 1.0, K2)
for a in (KXI, KYI, KZI, KX, KY, KZ, K2, K2_safe, RHO, KMAG, TAIL_MASK):
    a.flags.writeable = False


def initial_field(seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    amp = (1.0 + K2) ** -2.25
    amp[0, 0, 0] = 0.0
    uh = np.empty((3, N, N, N), dtype=np.complex128)
    for c in range(3):
        phases = rng.uniform(0.0, 2.0 * np.pi, size=(N, N, N))
        uh[c] = amp * np.exp(1j * phases)
    kdotu = (KX * uh[0] + KY * uh[1] + KZ * uh[2]) / K2_safe
    uh[0] -= KX * kdotu
    uh[1] -= KY * kdotu
    uh[2] -= KZ * kdotu
    uh[:, 0, 0, 0] = 0.0
    uh *= RHO
    u = np.stack([np.fft.ifftn(uh[c]).real for c in range(3)])
    e = 0.5 * float(np.mean(np.sum(u**2, axis=0)))
    uh *= math.sqrt(0.5 / e)
    del u
    return uh


def vorticity_field(uh: np.ndarray) -> np.ndarray:
    wx = np.fft.ifftn(1j * (KY * uh[2] - KZ * uh[1])).real
    wy = np.fft.ifftn(1j * (KZ * uh[0] - KX * uh[2])).real
    wz = np.fft.ifftn(1j * (KX * uh[1] - KY * uh[0])).real
    return np.stack([wx, wy, wz])


def grad_xi_inf(uh: np.ndarray) -> float:
    w = vorticity_field(uh)
    mag = np.sqrt(np.sum(w**2, axis=0))
    xi = w / np.maximum(mag, 1e-12)
    acc = np.zeros((N, N, N))
    for c in range(3):
        xh = np.fft.fftn(xi[c])
        for kcomp in (KX, KY, KZ):
            g = np.fft.ifftn(1j * kcomp * xh).real
            acc += g**2
    return float(np.sqrt(acc).max())


def circulation(uh: np.ndarray) -> float:
    u = np.stack([np.fft.ifftn(uh[c]).real for c in range(3)])
    z, c, h = N // 2, N // 2, N // 4
    dx = 1.0 / N
    idx = range(c - h, c + h)
    gamma = (sum(u[0, x, c - h, z] for x in idx)
             - sum(u[0, x, c + h, z] for x in idx)
             + sum(u[1, c + h, y, z] for y in idx)
             - sum(u[1, c - h, y, z] for y in idx)) * dx
    return float(gamma)


def rhs(uh: np.ndarray) -> np.ndarray:
    u = np.stack([np.fft.ifftn(uh[c]).real for c in range(3)])
    grad = np.empty((3, 3, N, N, N))
    for c in range(3):
        for j, kcomp in enumerate((KX, KY, KZ)):
            grad[c, j] = np.fft.ifftn(1j * kcomp * uh[c]).real
    adv = np.empty_like(uh)
    for c in range(3):
        conv = u[0] * grad[c, 0] + u[1] * grad[c, 1] + u[2] * grad[c, 2]
        adv[c] = np.fft.fftn(conv)
    kdot = (KX * adv[0] + KY * adv[1] + KZ * adv[2]) / K2_safe
    for c, kcomp in enumerate((KX, KY, KZ)):
        adv[c] -= kcomp * kdot
    adv[:, 0, 0, 0] = 0.0
    return (-adv - NU * K2 * uh) * RHO


def run_draw(draw_idx: int) -> dict:
    seed = 101 + draw_idx
    t0 = time.time()
    uh = initial_field(seed)
    u0 = np.stack([np.fft.ifftn(uh[c]).real for c in range(3)])
    umax = float(np.sqrt(np.sum(u0**2, axis=0)).max())
    cfl = umax * DT * N  # u*dt/dx, dx = 1/N
    w0f = vorticity_field(uh)
    w_inf_0 = float(np.sqrt(np.sum(w0f**2, axis=0)).max())
    ens_0 = 0.5 * float(np.mean(np.sum(w0f**2, axis=0)))
    gamma_0 = circulation(uh)
    w_inf_max = w_inf_0
    w_series = [w_inf_0]
    diss_int = 0.0
    audit_dirty = []
    if cfl > 1.0:
        audit_dirty.append(f"CFL={cfl:.3f}>1")
    del u0, w0f
    for step in range(NSTEPS):
        k1_ = rhs(uh)
        k2_ = rhs(uh + 0.5 * DT * k1_)
        k3_ = rhs(uh + 0.5 * DT * k2_)
        k4_ = rhs(uh + DT * k3_)
        uh = uh + (DT / 6.0) * (k1_ + 2 * k2_ + 2 * k3_ + k4_)
        uh *= RHO
        uh[:, 0, 0, 0] = 0.0
        del k1_, k2_, k3_, k4_
        if not np.all(np.isfinite(uh)):
            audit_dirty.append(f"non-finite at step {step}")
            break
        wf = vorticity_field(uh)
        w_now = float(np.sqrt(np.sum(wf**2, axis=0)).max())
        w_series.append(w_now)
        w_inf_max = max(w_inf_max, w_now)
        # dissipation nu * mean(|grad u|^2) via vorticity+strain identity:
        # for incompressible periodic flow mean(|grad u|^2) = mean(|omega|^2)
        diss_int += NU * float(np.mean(np.sum(wf**2, axis=0))) * DT
        del wf
    w_inf_T = w_series[-1]
    w_inf_int = float(np.trapz(np.array(w_series), dx=DT))
    wfT = vorticity_field(uh)
    ens_T = 0.5 * float(np.mean(np.sum(wfT**2, axis=0)))
    del wfT
    spec = np.sum(np.abs(uh) ** 2, axis=0)
    e_tail = float(spec[TAIL_MASK].sum() / spec.sum()) if spec.sum() > 0 else 0.0
    R_ratio = ens_T / ens_0 if ens_0 > 0 else 0.0
    gxi = grad_xi_inf(uh)
    d_gamma = circulation(uh) - gamma_0
    rising = bool(R_ratio > 1.0 and w_inf_T > w_inf_0)
    rss_mb = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024.0
    if rss_mb > RSS_CAP_MB:
        audit_dirty.append(f"RSS {rss_mb:.0f}MB > cap {RSS_CAP_MB:.0f}MB")
    rec = {
        "draw_idx": draw_idx,
        "seed": seed,
        "seven_tuple": {
            "w_inf": w_inf_max,
            "w_inf_int": w_inf_int,
            "E_tail": e_tail,
            "R": float(R_ratio),
            "grad_xi_inf": float(gxi),
            "D": float(diss_int),
            "dGamma_Kelvin": float(d_gamma),
        },
        "w_inf_0": w_inf_0,
        "w_inf_T": w_inf_T,
        "enstrophy_0": ens_0,
        "enstrophy_T": ens_T,
        "cfl_initial": cfl,
        "rising": rising,
        "audit_clean": len(audit_dirty) == 0,
        "audit_flags": audit_dirty,
        "peak_rss_mb": rss_mb,
        "wall_s": round(time.time() - t0, 2),
    }
    del uh
    gc.collect()  # M1
    return rec


def main():
    with open(OUT_PATH, "a") as fh:
        for draw_idx in range(DRAW_LO, DRAW_HI):
            rec = run_draw(draw_idx)
            fh.write(json.dumps(rec) + "\n")  # M3 streaming
            fh.flush()
            print(f"draw {draw_idx} seed {rec['seed']} rising={rec['rising']} "
                  f"clean={rec['audit_clean']} R={rec['seven_tuple']['R']:.4f} "
                  f"w_inf={rec['seven_tuple']['w_inf']:.3f} rss={rec['peak_rss_mb']:.0f}MB",
                  flush=True)


if __name__ == "__main__":
    main()
