import math
from typing import List, Tuple

def cusum_detect(xs: List[float], k: float, h: float) -> List[int]:
    """
    Two-sided Page's CUSUM changepoint detector; returns alarm indices.
    """
    alarms = []
    w = max(5, min(50, len(xs) // 4))
    if w == 0:
        return alarms
    m = sum(xs[:w]) / w
    gPos = 0.0
    gNeg = 0.0
    for i, x in enumerate(xs):
        gPos = max(0.0, gPos + x - m - k)
        gNeg = max(0.0, gNeg + m - k - x)
        if gPos > h or gNeg > h:
            alarms.append(i)
            gPos = 0.0
            gNeg = 0.0
    return alarms

def student_t_pdf(x: float, mu: float, sig2: float, nu: float) -> float:
    sig2 = max(1e-12, sig2)
    z = (x - mu) / math.sqrt(sig2)
    return math.exp(-0.5 * z * z) / math.sqrt(2 * math.pi * sig2)

def bocpd_lite(
    xs: List[float],
    hazard: float,
    mu0: float,
    kappa0: float,
    alpha0: float,
    beta0: float,
) -> List[float]:
    """
    Bayesian Online Changepoint Detection.
    """
    R = {0: 1.0}
    muT = [mu0]
    kaT = [kappa0]
    alT = [alpha0]
    beT = [beta0]
    cpProb = []

    for x in xs:
        Rnext = {}
        total = 0.0

        for r, pr in R.items():
            mu = muT[r] if r < len(muT) else mu0
            ka = kaT[r] if r < len(kaT) else kappa0
            al = alT[r] if r < len(alT) else alpha0
            be = beT[r] if r < len(beT) else beta0

            pred = student_t_pdf(x, mu, (be * (ka + 1)) / (al * ka), 2 * al)
            w = pr * (1 - hazard) * pred
            Rnext[r + 1] = Rnext.get(r + 1, 0.0) + w
            total += w

        priorPred = student_t_pdf(x, mu0, (beta0 * (kappa0 + 1)) / (alpha0 * kappa0), 2 * alpha0)
        cpMass = sum(R.values())
        cpW = cpMass * hazard * priorPred
        Rnext[0] = cpW
        total += cpW

        norm = max(1e-300, total)
        for r, w in Rnext.items():
            Rnext[r] = w / norm

        cpProb.append(Rnext.get(0, 0.0))

        maxR = max(Rnext.keys())
        nmu = [mu0] * (maxR + 1)
        nka = [kappa0] * (maxR + 1)
        nal = [alpha0] * (maxR + 1)
        nbe = [beta0] * (maxR + 1)

        for r in Rnext.keys():
            if r == 0:
                continue
            pr_idx = r - 1
            mu = muT[pr_idx] if pr_idx < len(muT) else mu0
            ka = kaT[pr_idx] if pr_idx < len(kaT) else kappa0
            al = alT[pr_idx] if pr_idx < len(alT) else alpha0
            be = beT[pr_idx] if pr_idx < len(beT) else beta0

            nmu[r] = (ka * mu + x) / (ka + 1)
            nka[r] = ka + 1
            nal[r] = al + 0.5
            nbe[r] = be + (ka * (x - mu) * (x - mu)) / (2 * (ka + 1))

        muT = nmu
        kaT = nka
        alT = nal
        beT = nbe
        R = Rnext

    return cpProb
