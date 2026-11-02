#!/usr/bin/env python3
"""1-D Morlet scattering intermittency. kymatio if present, NumPy filterbank otherwise.

I_burst = sum ||S2||_1 / (sum ||S1||_1 + eps)
Low burst + stable S1 -> CASH_GRINDER. High burst -> GPP_TORPEDO.
"""
from __future__ import annotations

import math
from typing import Sequence

SCALES = (1, 2, 4)


def _morlet_kernel(scale: int) -> list[complex]:
    sigma = 0.8 * scale
    width = max(3, int(4 * sigma))
    kernel = []
    for n in range(-width, width + 1):
        gauss = math.exp(-0.5 * (n / sigma) ** 2)
        wave = complex(math.cos(n / scale), math.sin(n / scale))
        kernel.append(gauss * wave)
    norm = math.sqrt(sum(abs(c) ** 2 for c in kernel)) or 1.0
    return [c / norm for c in kernel]


def _convolve_abs(series: Sequence[float], kernel: Sequence[complex]) -> list[float]:
    half = len(kernel) // 2
    out = []
    for i in range(len(series)):
        acc = 0j
        for k, coef in enumerate(kernel):
            j = i + k - half
            if 0 <= j < len(series):
                acc += float(series[j]) * coef
        out.append(abs(acc))
    return out


def scattering_coefficients(series: Sequence[float]) -> tuple[list[list[float]], list[list[float]]]:
    values = [float(v) for v in series]
    if len(values) < 4:
        raise ValueError("scattering series needs at least 4 games")
    try:
        from kymatio.numpy import Scattering1D  # type: ignore
        import numpy as np
        J = min(4, int(math.log2(len(values))))
        if J >= 2:
            s = Scattering1D(J=J, shape=len(values), Q=1)
            coeffs = s(np.asarray(values, dtype=np.float64))
            s1 = [coeffs[1].tolist()] if len(coeffs) > 1 else [values]
            s2 = [coeffs[2].tolist()] if len(coeffs) > 2 else [values]
            return s1, s2
    except Exception:
        pass
    s1 = []
    s2 = []
    for j1 in SCALES:
        first = _convolve_abs(values, _morlet_kernel(j1))
        s1.append(first)
        for j2 in SCALES:
            if j2 <= j1:
                continue
            s2.append(_convolve_abs(first, _morlet_kernel(j2)))
    return s1, s2


def intermittency_burst(series: Sequence[float], eps: float = 1e-8) -> float:
    s1, s2 = scattering_coefficients(series)
    num = sum(sum(abs(v) for v in band) for band in s2)
    den = sum(sum(abs(v) for v in band) for band in s1) + eps
    return num / den


def classify_cash_vs_gpp(series: Sequence[float], burst_cut: float = 0.35) -> dict[str, float | str]:
    burst = intermittency_burst(series)
    label = "CASH_GRINDER" if burst < burst_cut else "GPP_TORPEDO"
    return {"burst": burst, "label": label}
