"""Conformal pass discipline. Location-locked conformal intervals that may
only ever say NO_BET.

Provenance: ported 2026-10-15 from dfs/walk_forward/conformal_wrappers.py
(branch grok/walk-forward-2026-10-14, Hermes walk-forward program) so the
wrappers can be consumed by the engine read path. The research module
remains the scoring source of record on the frozen n=2,462 filter; this
module is the read-path form of the same math (streaming calibrate/advise
instead of batch scoring). Constants are pinned to the frozen contract
(filter_contract_2026-10-14.json, conformal_results.json); the tests fail
if they drift.

THE LAW (verbatim from conformal_results.json):
    "Wrappers inform NO_BET only. Uniform-interval CRPS is a diagnostic
    degradation, not a pricing distribution."

What this module may do: given a Layer-1 center (spread_line, owned by the
market close and never computed here) and a calibration history of settled
games, say whether an honest conformal interval can be formed around that
center. If it cannot, the advisory verdict is NO_BET.

What it may never do:
  - Move the center. Every interval is built by adding calibration-residual
    quantiles to the center exactly as supplied. The advisory does not even
    carry the center, so nothing downstream can mistake an interval for a
    shifted mean. max_abs_mean_shift is 0.0 by construction and by test.
  - Emit or influence a pick, price, probability, or recommendation. The
    advisory's key set is fixed (see ADVISORY_KEYS) and contains no such
    field.
  - Open the emission gate. The 7.099 CRPS gate lives elsewhere; it is
    carried here only as a pinned record constant. GATE_CLEARED is False
    and no code path in this module can set it.
  - Write walk_forward.json (protected) or any other file. No file I/O.

Verdict combination (wiring decision, 2026-10-15): the advisory verdict is
NO_BET unless EVERY wrapper forms its interval. Each wrapper encodes a
distinct fail-closed condition (thin history, quantile-rank overflow, thin
Mondrian stratum, crossed CQR quantiles, missing scale). Any one failing
means the uncertainty statement is not jointly honest, and pass discipline
fails closed. Per-wrapper reasons and widths ride in the advisory so the
veto is always explainable.

Action vocabulary: the research module calls a formed interval "BET". That
word does not cross this module's boundary. Internally a decision is
{"formed": bool, ...}; the advisory verdict is "NO_BET" or "COVERED".
COVERED means only that conformal discipline raises no objection. Every
other gate still rules, and COVERED can never upgrade a withhold to a
pass: in reasoning_engine/mint_gate.py the conformal check sits after the
INVALID / DATA-GAP checks and can only turn a would-be pass into a
withhold.

PIT discipline: only settled rows may enter calibration (fold() refuses
anything else). advise() is a pure read of current state; the sequential
ACI / DtACI updates happen inside fold(), scored against the interval the
settled game would have received, exactly as the batch scorer does.
"""
from __future__ import annotations

import math
from typing import Any, Iterable, Mapping

# --- pinned to the frozen contract (filter_contract_2026-10-14.json) ---
ALPHA = 0.10
MIN_PRIOR = 25
MONDRIAN_MIN = 5  # stratum n <= 5 -> NO_BET; no borrow from other strata
SIGMA0 = 13.45
GATE = 7.099
GATE_CLEARED = False
EMISSION = "ZERO_OBJECT"
LAW = (
    "Wrappers inform NO_BET only. Uniform-interval CRPS is a diagnostic "
    "degradation, not a pricing distribution."
)

WRAPPER_NAMES = (
    "fixed_center",
    "locally_weighted",
    "cqr",
    "cqr_tail",
    "mondrian",
    "aci",
    "dtaci",
)

ADVISORY_KEYS = (
    "verdict",
    "reasons",
    "widths",
    "alpha",
    "nominal_coverage",
    "calibration_n",
    "law",
)


# ---------------------------------------------------------------- primitives
# Ported from conformal_wrappers.py. The batch module's dead checks (a
# self-comparison in _decision, a shadowed loss line in DtACI.update) are
# dropped; the effective math is unchanged.


def locked_center(spread_line: float) -> float:
    """The predictive center is the Layer-1 close, taken exactly as given.

    This module never computes, adjusts, or re-derives a center. A
    non-finite center is refused rather than carried.
    """
    mu = float(spread_line)
    if not math.isfinite(mu):
        raise ValueError("location lock: center is not finite")
    return mu


def quantile_rank(n: int, level: float) -> int | None:
    """1-based rank for a finite-sample conformal quantile at `level`.

    Returns None when the rank exceeds n. Callers must treat None as
    NO_BET and must not substitute max(scores): the quantile is never
    clamped to the largest residual.
    """
    if n <= 0 or not (0.0 < level < 1.0):
        return None
    k = math.ceil((n + 1) * level)
    if k > n or k < 1:
        return None
    return k


def empirical_quantile(sorted_scores: list[float], level: float) -> float | None:
    """Quantile of an already-sorted score list. None = NO_BET, no clamp."""
    k = quantile_rank(len(sorted_scores), level)
    if k is None:
        return None
    return sorted_scores[k - 1]


def spread_bin(spread: float) -> int:
    a = abs(spread)
    if a < 3.5:
        return 0
    if a < 7.5:
        return 1
    return 2


def _insort(seq: list[float], value: float) -> None:
    lo, hi = 0, len(seq)
    while lo < hi:
        mid = (lo + hi) // 2
        if seq[mid] < value:
            lo = mid + 1
        else:
            hi = mid
    seq.insert(lo, value)


def _decision(lo: float | None, hi: float | None, reason: str) -> dict[str, Any]:
    if lo is None or hi is None or hi < lo:
        return {"formed": False, "lo": None, "hi": None, "width": None, "reason": reason}
    return {"formed": True, "lo": lo, "hi": hi, "width": hi - lo, "reason": reason}


def fixed_center_interval(mu: float, abs_scores: list[float], alpha: float) -> dict[str, Any]:
    q = empirical_quantile(abs_scores, 1.0 - alpha)
    if q is None:
        return _decision(None, None, "quantile_rank_exceeds_n")
    return _decision(mu - q, mu + q, "fixed_center")


def locally_weighted_interval(
    mu: float, norm_scores: list[float], sigma_hat: float | None, alpha: float
) -> dict[str, Any]:
    if sigma_hat is None or sigma_hat <= 0:
        return _decision(None, None, "sigma_hat_missing")
    q = empirical_quantile(norm_scores, 1.0 - alpha)
    if q is None:
        return _decision(None, None, "quantile_rank_exceeds_n")
    half = q * sigma_hat
    return _decision(mu - half, mu + half, "locally_weighted")


def cqr_interval(
    mu: float, signed_sorted: list[float], alpha_lo: float, alpha_hi: float
) -> dict[str, Any]:
    """Location-locked CQR: residual quantiles added to the center.

    The endpoints are center + a calibration residual quantile. The center
    itself is never re-estimated.
    """
    n = len(signed_sorted)
    k_lo = math.floor((n + 1) * alpha_lo)
    k_hi = quantile_rank(n, 1.0 - alpha_hi)
    if k_lo < 1 or k_hi is None or k_lo > n:
        return _decision(None, None, "cqr_rank_unavailable")
    q_lo = signed_sorted[k_lo - 1]
    q_hi = signed_sorted[k_hi - 1]
    if q_hi < q_lo:
        return _decision(None, None, "cqr_crossed")
    return _decision(mu + q_lo, mu + q_hi, "cqr")


def tail_weights(n_left: int, n: int, alpha: float) -> tuple[float, float]:
    """Allocate alpha toward the heavier prior tail. Does not move mu."""
    if n <= 0:
        return alpha / 2.0, alpha / 2.0
    p_left = n_left / float(n)
    # keep each tail at least 10% of alpha so a one-sided collapse cannot bet
    alpha_lo = min(alpha * 0.9, max(alpha * 0.1, alpha * p_left))
    return alpha_lo, alpha - alpha_lo


def uniform_crps(lo: float, hi: float, y: float) -> float:
    """Closed-form CRPS of Uniform(lo, hi) at y. Diagnostic only."""
    if hi <= lo:
        return abs(y - lo)
    width = hi - lo
    if y < lo:
        return (lo - y) + width / 3.0
    if y > hi:
        return (y - hi) + width / 3.0
    u = (y - lo) / width
    return width * (u * u - u + 1.0 / 3.0)


def crps_gaussian(mu: float, sd: float, x: float) -> float:
    """CRPS of N(mu, sd) at observation x. Analytic. Diagnostic baseline."""
    if sd <= 0:
        raise ValueError("sd must be positive")
    z = (x - mu) / sd
    phi = math.exp(-0.5 * z * z) / math.sqrt(2.0 * math.pi)
    Phi = 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))
    return sd * (z * (2.0 * Phi - 1.0) + 2.0 * phi - 1.0 / math.sqrt(math.pi))


class DtACI:
    """Discounted adaptive conformal experts. Gibbs & Candes style, simplified."""

    def __init__(self, alpha: float = ALPHA, gammas=(0.01, 0.05, 0.10), eta: float = 0.1):
        self.alpha = alpha
        self.gammas = list(gammas)
        self.eta = eta
        self.expert_alpha = [alpha for _ in self.gammas]
        self.weights = [1.0 / len(self.gammas) for _ in self.gammas]

    def current_alpha(self) -> float:
        wsum = sum(self.weights) or 1.0
        return sum(w * a for w, a in zip(self.weights, self.expert_alpha)) / wsum

    def update(self, covered: bool) -> None:
        err = 0.0 if covered else 1.0
        new_w = []
        for i, gamma in enumerate(self.gammas):
            a = self.expert_alpha[i]
            new_w.append(self.weights[i] * math.exp(-self.eta * abs(err - self.alpha)))
            nxt = a + gamma * (self.alpha - err)
            self.expert_alpha[i] = min(0.5, max(0.01, nxt))
        z = sum(new_w) or 1.0
        self.weights = [w / z for w in new_w]


# ---------------------------------------------------------------- calibrator


class ConformalCalibrator:
    """Streaming form of the batch wrappers: fold settled games in
    chronological order, advise on the next one.

    State evolution mirrors conformal_wrappers.score_rows exactly for an
    all-settled stream: decisions are computed from prior rows only, the
    ACI / DtACI alphas update from the settled game's coverage of the
    interval it would have received, and only then does the game's
    residual enter the calibration stores.
    """

    def __init__(self, alpha: float = ALPHA, min_prior: int = MIN_PRIOR):
        self.alpha = alpha
        self.min_prior = min_prior
        self.abs_scores: list[float] = []
        self.signed: list[float] = []
        self.norm_scores: list[float] = []
        self.mondrian: dict[int, list[float]] = {0: [], 1: [], 2: []}
        self._sq = 0.0
        self._n_left = 0
        self._n = 0
        self._aci_alpha = alpha
        self._dtaci = DtACI(alpha=alpha)

    @property
    def calibration_n(self) -> int:
        return self._n

    @classmethod
    def from_rows(cls, rows: Iterable[Mapping[str, Any]], **kwargs: Any) -> "ConformalCalibrator":
        cal = cls(**kwargs)
        for row in rows:
            cal.fold(row["spread_line"], row["margin"], row.get("pit_stamp", "settled"))
        return cal

    def _sigma_hat(self) -> float:
        if self._n >= self.min_prior and self._n > 0:
            return math.sqrt(self._sq / self._n)
        return SIGMA0

    def decide(self, spread_line: float) -> dict[str, dict[str, Any]]:
        """Per-wrapper interval decisions for a game centered at spread_line.

        Pure: no state changes. With fewer than min_prior settled priors,
        every wrapper refuses with "insufficient_prior_rows" (the batch
        scorer counts those rows NO_BET for all wrappers).
        """
        mu = locked_center(spread_line)
        if self._n < self.min_prior:
            return {
                name: _decision(None, None, "insufficient_prior_rows")
                for name in WRAPPER_NAMES
            }
        sigma_hat = self._sigma_hat()
        out: dict[str, dict[str, Any]] = {}
        out["fixed_center"] = fixed_center_interval(mu, self.abs_scores, self.alpha)
        out["locally_weighted"] = locally_weighted_interval(
            mu, self.norm_scores, sigma_hat, self.alpha
        )
        out["cqr"] = cqr_interval(mu, self.signed, self.alpha / 2.0, self.alpha / 2.0)
        ta_lo, ta_hi = tail_weights(self._n_left, self._n, self.alpha)
        dec_tail = cqr_interval(mu, self.signed, ta_lo, ta_hi)
        if dec_tail["formed"]:
            dec_tail = dict(dec_tail, reason="cqr_tail")
        out["cqr_tail"] = dec_tail
        stratum = self.mondrian[spread_bin(spread_line)]
        if len(stratum) <= MONDRIAN_MIN:
            out["mondrian"] = _decision(None, None, "mondrian_n_le_5")
        else:
            dec_m = fixed_center_interval(mu, stratum, self.alpha)
            if dec_m["formed"]:
                dec_m = dict(dec_m, reason="mondrian")
            else:
                dec_m = dict(dec_m, reason="mondrian_no_clamp")
            out["mondrian"] = dec_m
        out["aci"] = fixed_center_interval(mu, self.abs_scores, self._aci_alpha)
        if out["aci"]["formed"]:
            out["aci"] = dict(out["aci"], reason="aci")
        out["dtaci"] = fixed_center_interval(
            mu, self.abs_scores, self._dtaci.current_alpha()
        )
        if out["dtaci"]["formed"]:
            out["dtaci"] = dict(out["dtaci"], reason="dtaci")
        return out

    def advise(self, spread_line: float) -> dict[str, Any]:
        """The read-path advisory. Fixed key set (ADVISORY_KEYS).

        verdict is "NO_BET" unless every wrapper forms its interval;
        "COVERED" asserts nothing beyond that. No center, no price, no
        pick, no probability is carried.
        """
        dec = self.decide(spread_line)
        reasons = [
            f"{name}: {d['reason']}" for name, d in dec.items() if not d["formed"]
        ]
        widths = {name: d["width"] for name, d in dec.items()}
        return {
            "verdict": "NO_BET" if reasons else "COVERED",
            "reasons": reasons,
            "widths": widths,
            "alpha": self.alpha,
            "nominal_coverage": 1.0 - self.alpha,
            "calibration_n": self._n,
            "law": LAW,
        }

    def fold(self, spread_line: float, margin: float, pit_stamp: str = "settled") -> None:
        """Fold one settled game into calibration. PIT fail-closed.

        Refuses future/unstamped rows and missing values outright: no
        imputation, ever. ACI / DtACI alphas update from this game's
        coverage of the interval it would have received, before its
        residual enters the stores (prior-only discipline).
        """
        if pit_stamp != "settled":
            raise ValueError(
                f"PIT fail-closed: pit_stamp={pit_stamp!r} may not enter calibration"
            )
        if margin is None or spread_line is None:
            raise ValueError("no imputation: settled row needs spread_line and margin")
        mu = locked_center(spread_line)
        y = float(margin)
        sigma_hat = self._sigma_hat()
        dec = self.decide(spread_line)
        for name in ("aci", "dtaci"):
            d = dec[name]
            if d["formed"]:
                covered = d["lo"] <= y <= d["hi"]
                if name == "aci":
                    err = 0.0 if covered else 1.0
                    self._aci_alpha = min(
                        0.5, max(0.01, self._aci_alpha + 0.05 * (self.alpha - err))
                    )
                else:
                    self._dtaci.update(bool(covered))
        resid = y - mu
        _insort(self.abs_scores, abs(resid))
        _insort(self.signed, resid)
        if sigma_hat > 0:
            _insort(self.norm_scores, abs(resid) / sigma_hat)
        _insort(self.mondrian[spread_bin(spread_line)], abs(resid))
        self._sq += resid * resid
        if resid < 0:
            self._n_left += 1
        self._n += 1


def build_advisory(
    calibration_rows: Iterable[Mapping[str, Any]], spread_line: float, **kwargs: Any
) -> dict[str, Any]:
    """Producer seam: settled history + a game's close -> advisory dict.

    This is the one call a read-path producer makes. The remaining
    production seam is feeding it (a settled-games store and the game's
    spread_line on the game request); see CONFORMAL-NOBET-WIRING-2026-10-15.md.
    """
    return ConformalCalibrator.from_rows(calibration_rows, **kwargs).advise(spread_line)


# ---------------------------------------------------------------- batch check


def score_rows(
    rows: list[Mapping[str, Any]], alpha: float = ALPHA, min_prior: int = MIN_PRIOR
) -> dict[str, Any]:
    """Batch scorer over an all-settled history, mirroring the research
    module's summary shape. Diagnostic only.

    Defined over settled streams: a row stamped future/unstamped is
    refused (ValueError via fold) rather than silently scored. PIT
    discipline for live reads lives in fold()/advise().
    """
    cal = ConformalCalibrator(alpha=alpha, min_prior=min_prior)
    acc = {
        k: {"bet": 0, "cover": 0, "width": 0.0, "no_bet": 0, "crps_u": 0.0, "crps_n": 0}
        for k in WRAPPER_NAMES
    }
    base_crps: list[float] = []
    max_mu_dev = 0.0
    for row in rows:
        spread = row["spread_line"]
        y = row["margin"]
        mu = locked_center(spread)
        dev = abs(mu - float(spread))
        if dev >= 1e-12:
            raise RuntimeError("location lock violated")
        max_mu_dev = max(max_mu_dev, dev)
        dec = cal.decide(spread)
        for name, d in dec.items():
            if not d["formed"]:
                acc[name]["no_bet"] += 1
                continue
            acc[name]["bet"] += 1
            acc[name]["width"] += d["width"]
            if d["lo"] <= y <= d["hi"]:
                acc[name]["cover"] += 1
            acc[name]["crps_u"] += uniform_crps(d["lo"], d["hi"], y)
            acc[name]["crps_n"] += 1
        base_crps.append(crps_gaussian(mu, SIGMA0, y))
        cal.fold(spread, y, row.get("pit_stamp", "settled"))
    n = len(rows)
    base_mean = sum(base_crps) / n if n else None
    out: dict[str, Any] = {}
    for name, a in acc.items():
        bet = a["bet"]
        out[name] = {
            "n_bet": bet,
            "n_no_bet": a["no_bet"],
            "empirical_coverage": (a["cover"] / bet) if bet else None,
            "average_width": (a["width"] / bet) if bet else None,
            "uniform_interval_crps": (a["crps_u"] / a["crps_n"]) if a["crps_n"] else None,
            "crps_degradation_vs_gaussian_13_45": (
                (a["crps_u"] / a["crps_n"]) - base_mean
                if a["crps_n"] and base_mean is not None
                else None
            ),
            "clears_crps_gate": False,
        }
    return {
        "n": n,
        "alpha": alpha,
        "nominal_coverage": 1.0 - alpha,
        "baseline_gaussian_crps": base_mean,
        "max_abs_mean_shift": max_mu_dev,
        "location_lock_verified": max_mu_dev < 1e-12,
        "wrappers": out,
        "gate": GATE,
        "gate_cleared": GATE_CLEARED,
        "passed": False,
        "emission": EMISSION,
        "note": LAW,
    }
