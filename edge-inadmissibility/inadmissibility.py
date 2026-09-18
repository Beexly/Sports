#!/usr/bin/env python3
"""
EDGE-INADMISSIBILITY CERTIFICATE  (N1)
=======================================
A proof-carrying HOLD for pre-kickoff markets.

WHY THIS EXISTS
---------------
GSE's holds are threshold-based ("not enough sportsbooks are pricing this game
yet"). A threshold is a heuristic: it can be wrong in both directions and it
cannot be audited. AGENTS.md already says "a held row is not a blank - it is the
finding". The strongest form of that sentence is a hold you can PROVE.

THE STRUCTURE BORROWED (and what is honestly borrowed)
-----------------------------------------------------
The Navier-Stokes blowup paper (OpenAI, 2026-09-08) is a *conditional* result:
it does not describe what happens in general, it gives a criterion under which a
singularity MUST occur. Its technical core is a self-similar rescaling
(X = r/sqrt(tau), eta = z/tau^d) in which the structure is scale-free.

That shape - a scale-free criterion that PROVES an outcome rather than
estimating it - is the transferable idea. It is a METHOD, not physics.

WHAT IS *NOT* CLAIMED (retiring an earlier note of mine)
-------------------------------------------------------
An earlier session of mine sketched "odds vorticity" and "pressure gradients in
the betting market" as an application of Navier-Stokes. That was a metaphor, not
a mechanism, and it should not be built on. Fluid PDEs do not govern prices.
This module claims no such thing.

THE CRITERION
-------------
On an internally consistent two-way market the offered price always includes the
vig, so the *raw* price advantage is non-positive by construction:

    rawEdge = p_A - o_A = p_A - p_A*S = -p_A*(S-1)   <= 0

(GSE's own v5.3.0 calibration doc states exactly this.) So a pick earns nothing
from rawEdge alone; it earns from the line MOVING toward fair value after you
take it - i.e. from CLV. Which means the admissibility question is not
"is the price good?" but:

    is the price good by MORE than the amount the line will randomly move
    before kickoff, plus the vig you already paid?

Define, for the picked side A with opponent B and remaining time tau:
    o_A, o_B   with-vig implied probabilities
    p_A, p_B   de-vigged (proportional) implied probabilities
    vig_half   = (o_A + o_B - 1) / 2          half the market's take
    sigma_move(tau)  = s * tau^alpha          sd of the de-vigged fair prob
                                              over the remaining window to kickoff

INADMISSIBLE if   |p_A - o_A|  <=  vig_half + z * sigma_move(tau)

i.e. the entire price advantage is inside the noise band of pre-kickoff
movement: no realised edge is reachable, whatever the model believes.

SCALE INVARIANCE
----------------
sigma_move is written in similarity variables (s * tau^alpha) rather than in
absolute probability units, so ONE calibrated pair (s, alpha) sets the tolerance
for every sport, market and window. That is the only place the paper's
similarity rescaling genuinely earns its keep.

HONEST SCOPE
------------
The statistical content is a noise-band / signal-to-cost test; that idea is
standard. What is new here is (a) turning it into an auditable certificate that
attaches to a hold, (b) making its threshold scale-free so it is calibrated
rather than assumed, and (c) requiring the calibration constant to come from the
observed line archive, never from a chosen number.
"""

from __future__ import annotations
from dataclasses import dataclass, asdict
from typing import Iterable, Sequence
import math


# ---------------------------------------------------------------- primitives
def american_to_implied(price: float) -> float:
    """American price -> with-vig implied probability.
    GSE stores prices as American (e.g. -110, +145)."""
    if price == 0:
        raise ValueError("American price cannot be 0")
    if price > 0:
        return 100.0 / (price + 100.0)
    return abs(price) / (abs(price) + 100.0)


def devig_proportional(o_a: float, o_b: float) -> tuple[float, float]:
    """Two-way proportional de-vig. Returns (p_a, p_b) summing to 1."""
    if o_a <= 0 or o_b <= 0:
        raise ValueError("implied probabilities must be positive")
    s = o_a + o_b
    if s <= 0:
        raise ValueError("degenerate market")
    return o_a / s, o_b / s


def half_vig(o_a: float, o_b: float) -> float:
    """Per-side market take. 0 for a perfectly fair market."""
    return (o_a + o_b - 1.0) / 2.0


def similarity_sigma(tau: float, s: float, alpha: float) -> float:
    """sd of the de-vigged fair probability over the remaining window tau.

    Similarity form: sigma(tau) = s * tau^alpha.
    alpha ~ 0.5 is diffusive; alpha != 0.5 means the line is not a simple
    random walk and the criterion must use the measured value.
    """
    if tau < 0:
        raise ValueError("tau must be non-negative")
    if tau == 0:
        return 0.0
    return s * (tau ** alpha)


def fit_similarity(taus: Sequence[float], sigmas: Sequence[float]) -> tuple[float, float]:
    """Estimate (s, alpha) by OLS on log sigma = log s + alpha * log tau.

    Callers MUST supply sigmas measured from the line archive. Never substitute
    an assumed alpha: an assumed exponent is exactly the "chosen constant" this
    design exists to avoid.
    """
    xs, ys = [], []
    for t, sg in zip(taus, sigmas):
        if t > 0 and sg > 0:
            xs.append(math.log(t)); ys.append(math.log(sg))
    if len(xs) < 2:
        raise ValueError("need at least 2 usable (tau, sigma) pairs")
    n = len(xs)
    mx, my = sum(xs) / n, sum(ys) / n
    num = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    den = sum((x - mx) ** 2 for x in xs)
    if den == 0:
        raise ValueError("all tau identical; alpha not identifiable")
    alpha = num / den
    s = math.exp(my - alpha * mx)
    return s, alpha


# ---------------------------------------------------------------- certificate
@dataclass(frozen=True)
class Certificate:
    admissible: bool
    reason: str
    price_advantage: float     # |p_A - o_A|, the whole price edge
    vig_half: float
    noise_band: float          # z * sigma_move(tau)
    threshold: float           # vig_half + noise_band
    margin: float              # price_advantage - threshold (>0 => admissible)
    alpha_used: float
    tau_hours: float


def certificate_side(
    o_a: float, o_b: float, side: str, tau_hours: float,
    s: float, alpha: float, z: float = 1.645,
) -> Certificate:
    """Issue the certificate for one side of a two-way pre-kickoff market.

    side: 'A' or 'B'. z=1.645 is the one-sided 95% band.
    """
    if side not in ("A", "B"):
        raise ValueError("side must be 'A' or 'B'")
    p_a, p_b = devig_proportional(o_a, o_b)
    p, o = (p_a, o_a) if side == "A" else (p_b, o_b)
    adv = abs(p - o)
    vh = half_vig(o_a, o_b)
    nb = z * similarity_sigma(tau_hours, s, alpha)
    thr = vh + nb
    adm = adv > thr
    if adm:
        reason = ("price advantage exceeds half-vig plus the pre-kickoff "
                  "movement band; an edge is reachable in principle")
    else:
        reason = ("price advantage lies inside half-vig plus the pre-kickoff "
                  "movement band; NO realised edge is reachable on this market")
    return Certificate(
        admissible=adm, reason=reason, price_advantage=adv, vig_half=vh,
        noise_band=nb, threshold=thr, margin=adv - thr,
        alpha_used=alpha, tau_hours=tau_hours,
    )


def certificate_to_json(c: Certificate) -> dict:
    return asdict(c)
