#!/usr/bin/env python3
"""conformal_wrappers.py -- location-locked conformal interval wrappers.

DIAGNOSTIC ONLY. These wrappers inform NO_BET. They do not clear the CRPS gate
and they never write walk_forward.json.

Locks
- Predictive center is spread_line. |mu - spread_line| < 1e-12 on every row.
- Expanding window, prior rows only, min_prior=25.
- PIT fail-closed: future or unstamped rows are not calibration and are not bets.
- Quantile rank k = ceil((n+1)*(1-alpha)). If k > n the result is NO_BET.
  The quantile is never clamped to the largest residual.
- Mondrian: a stratum with n <= 5 is NO_BET. No borrow from other strata.

Wrappers
- fixed-center split residual conformal
- locally weighted (sigma_hat = expanding prior RMSE, else 13.45)
- CQR and tail-allocation CQR (asymmetric interval, mean still spread_line)
- Mondrian by |spread| bin
- ACI and DtACI sequential alpha updates
"""
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gse_location_locked_harness as H  # noqa: E402

ALPHA = 0.10
MIN_PRIOR = 25
MONDRIAN_MIN = 5  # n <= 5 -> NO_BET
SIGMA0 = 13.45
GATE = 7.099
OUT = os.path.join(HERE, "conformal_results.json")


def locked_center(spread_line):
    """Predictive center. A mean shift is refused before any interval is built."""
    mu = float(spread_line)
    if abs(mu - float(spread_line)) >= 1e-12:
        raise RuntimeError("location lock violated before scoring")
    return mu


def pit_stamp_ok(row, row_index, decision_index):
    """Fail closed on future rows, unstamped rows, and missing fields.

    A row is usable as calibration only when it is strictly prior to the
    decision index, carries a settled stamp (or an implicit settled stamp from
    a realized margin), and is not marked future/unstamped.
    """
    stamp = row.get("pit_stamp", "settled")
    if stamp in ("future", "unstamped", None, ""):
        return False
    if row_index >= decision_index:
        return False
    if row.get("margin") is None or row.get("spread_line") is None:
        return False
    return True


def quantile_rank(n, level):
    """1-based rank for a finite-sample conformal quantile at coverage `level`.

    Returns None when the rank exceeds n. Callers must treat None as NO_BET
    and must not substitute max(scores).
    """
    if n <= 0 or not (0.0 < level < 1.0):
        return None
    k = math.ceil((n + 1) * level)
    if k > n or k < 1:
        return None
    return k


def empirical_quantile(sorted_scores, level):
    """Quantile of an already-sorted score list. None = NO_BET, no clamp."""
    k = quantile_rank(len(sorted_scores), level)
    if k is None:
        return None
    return sorted_scores[k - 1]


def spread_bin(spread):
    a = abs(spread)
    if a < 3.5:
        return 0
    if a < 7.5:
        return 1
    return 2


def uniform_crps(lo, hi, y):
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


def half_normal_quantile(sigma, coverage):
    """Closed form: P(|N(0, sigma)| <= q) = coverage."""
    p = (1.0 + coverage) / 2.0
    # Phi^{-1}(p) via binary search on erf. No scipy.
    lo, hi = -8.0, 8.0
    target = 2.0 * p - 1.0
    for _ in range(80):
        mid = 0.5 * (lo + hi)
        if math.erf(mid / math.sqrt(2.0)) < target:
            lo = mid
        else:
            hi = mid
    return sigma * (0.5 * (lo + hi))


class ExpandingScores:
    """Sorted absolute (or signed) scores, prior rows only, bisect insert."""

    def __init__(self):
        self.scores = []

    def add(self, value):
        # bisect insert without importing a second copy of the list logic
        lo, hi = 0, len(self.scores)
        while lo < hi:
            mid = (lo + hi) // 2
            if self.scores[mid] < value:
                lo = mid + 1
            else:
                hi = mid
        self.scores.insert(lo, value)

    def quantile(self, level):
        return empirical_quantile(self.scores, level)


def _decision(mu, lo, hi, reason):
    if lo is None or hi is None or hi < lo:
        return {
            "action": "NO_BET",
            "mu": mu,
            "lo": None,
            "hi": None,
            "width": None,
            "reason": reason,
        }
    if abs(mu - mu) >= 1e-12:
        raise RuntimeError("mu not finite")
    return {
        "action": "BET",
        "mu": mu,
        "lo": lo,
        "hi": hi,
        "width": hi - lo,
        "reason": reason,
    }


def fixed_center_interval(mu, abs_scores, alpha):
    q = empirical_quantile(abs_scores, 1.0 - alpha)
    if q is None:
        return _decision(mu, None, None, "quantile_rank_exceeds_n")
    return _decision(mu, mu - q, mu + q, "fixed_center")


def locally_weighted_interval(mu, norm_scores, sigma_hat, alpha):
    if sigma_hat is None or sigma_hat <= 0:
        return _decision(mu, None, None, "sigma_hat_missing")
    q = empirical_quantile(norm_scores, 1.0 - alpha)
    if q is None:
        return _decision(mu, None, None, "quantile_rank_exceeds_n")
    half = q * sigma_hat
    return _decision(mu, mu - half, mu + half, "locally_weighted")


def cqr_interval(mu, signed_sorted, alpha_lo, alpha_hi):
    """Location-locked CQR: residual quantiles added to spread_line. Mean stays mu."""
    n = len(signed_sorted)
    # lower rank is the alpha_lo quantile; upper is the (1-alpha_hi) quantile
    k_lo = math.floor((n + 1) * alpha_lo)
    k_hi = quantile_rank(n, 1.0 - alpha_hi)
    if k_lo < 1 or k_hi is None or k_lo > n:
        return _decision(mu, None, None, "cqr_rank_unavailable")
    q_lo = signed_sorted[k_lo - 1]
    q_hi = signed_sorted[k_hi - 1]
    if q_hi < q_lo:
        return _decision(mu, None, None, "cqr_crossed")
    return _decision(mu, mu + q_lo, mu + q_hi, "cqr")


def tail_weights(n_left, n, alpha):
    """Allocate alpha toward the heavier prior tail. Does not move mu."""
    if n <= 0:
        return alpha / 2.0, alpha / 2.0
    p_left = n_left / float(n)
    # keep each tail at least 10% of alpha so a one-sided collapse cannot bet
    alpha_lo = min(alpha * 0.9, max(alpha * 0.1, alpha * p_left))
    return alpha_lo, alpha - alpha_lo


class DtACI:
    """Discounted adaptive conformal experts. Gibbs & Candes style, simplified."""

    def __init__(self, alpha=ALPHA, gammas=(0.01, 0.05, 0.10), eta=0.1):
        self.alpha = alpha
        self.gammas = list(gammas)
        self.eta = eta
        self.expert_alpha = [alpha for _ in self.gammas]
        self.weights = [1.0 / len(self.gammas) for _ in self.gammas]

    def current_alpha(self):
        wsum = sum(self.weights) or 1.0
        return sum(w * a for w, a in zip(self.weights, self.expert_alpha)) / wsum

    def update(self, covered):
        err = 0.0 if covered else 1.0
        new_w = []
        for i, gamma in enumerate(self.gammas):
            a = self.expert_alpha[i]
            # pinball-style instantaneous loss vs the target alpha
            loss = a * err + (1.0 - a) * (1.0 - err) * 0.0
            loss = (err - self.alpha) * (err - a)
            new_w.append(self.weights[i] * math.exp(-self.eta * abs(err - self.alpha)))
            nxt = a + gamma * (self.alpha - err)
            self.expert_alpha[i] = min(0.5, max(0.01, nxt))
        z = sum(new_w) or 1.0
        self.weights = [w / z for w in new_w]


def score_rows(rows, alpha=ALPHA, min_prior=MIN_PRIOR):
    """Score every wrapper on `rows` in order. Prior rows only. No retune."""
    n = len(rows)
    abs_scores = []
    signed = []
    norm_scores = []
    sq = 0.0
    n_left = 0
    mondrian = {0: [], 1: [], 2: []}
    aci_alpha = alpha
    dtaci = DtACI(alpha=alpha)
    names = (
        "fixed_center",
        "locally_weighted",
        "cqr",
        "cqr_tail",
        "mondrian",
        "aci",
        "dtaci",
    )
    acc = {k: {"bet": 0, "cover": 0, "width": 0.0, "no_bet": 0, "crps_u": 0.0, "crps_n": 0} for k in names}
    base_crps = []
    max_mu_dev = 0.0

    for i, row in enumerate(rows):
        mu = locked_center(row["spread_line"])
        dev = abs(mu - row["spread_line"])
        if dev >= 1e-12:
            raise RuntimeError("location lock violated at row %d" % i)
        if dev > max_mu_dev:
            max_mu_dev = dev
        y = row["margin"]
        sigma_hat = math.sqrt(sq / i) if i >= min_prior and i > 0 else SIGMA0
        thin = i < min_prior
        stamp_ok = pit_stamp_ok(row, i, i + 1) or row.get("pit_stamp", "settled") == "settled"
        # the row being scored must itself be a settled past game, not future/unstamped
        self_ok = row.get("pit_stamp", "settled") not in ("future", "unstamped", None, "")
        self_ok = self_ok and y is not None and row.get("spread_line") is not None

        def record(name, dec):
            if not self_ok or thin:
                acc[name]["no_bet"] += 1
                return
            if dec["action"] != "BET":
                acc[name]["no_bet"] += 1
                return
            if abs(dec["mu"] - row["spread_line"]) >= 1e-12:
                raise RuntimeError("emitted mu left the lock")
            acc[name]["bet"] += 1
            acc[name]["width"] += dec["width"]
            covered = dec["lo"] <= y <= dec["hi"]
            if covered:
                acc[name]["cover"] += 1
            acc[name]["crps_u"] += uniform_crps(dec["lo"], dec["hi"], y)
            acc[name]["crps_n"] += 1
            return covered

        if not self_ok or thin:
            for name in names:
                acc[name]["no_bet"] += 1
            covered_fixed = None
        else:
            dec_f = fixed_center_interval(mu, abs_scores, alpha)
            record("fixed_center", dec_f)
            dec_l = locally_weighted_interval(mu, norm_scores, sigma_hat, alpha)
            record("locally_weighted", dec_l)
            a_lo, a_hi = alpha / 2.0, alpha / 2.0
            dec_c = cqr_interval(mu, signed, a_lo, a_hi)
            record("cqr", dec_c)
            ta_lo, ta_hi = tail_weights(n_left, i, alpha)
            dec_t = cqr_interval(mu, signed, ta_lo, ta_hi)
            record("cqr_tail", dec_t)
            b = spread_bin(row["spread_line"])
            stratum = mondrian[b]
            if len(stratum) <= MONDRIAN_MIN:
                dec_m = _decision(mu, None, None, "mondrian_n_le_5")
            else:
                dec_m = fixed_center_interval(mu, stratum, alpha)
                if dec_m["action"] != "BET":
                    dec_m["reason"] = "mondrian_no_clamp"
            record("mondrian", dec_m)
            dec_a = fixed_center_interval(mu, abs_scores, aci_alpha)
            covered_a = record("aci", dec_a)
            dec_d = fixed_center_interval(mu, abs_scores, dtaci.current_alpha())
            covered_d = record("dtaci", dec_d)
            if dec_a["action"] == "BET" and covered_a is not None:
                err = 0.0 if covered_a else 1.0
                aci_alpha = min(0.5, max(0.01, aci_alpha + 0.05 * (alpha - err)))
            if dec_d["action"] == "BET" and covered_d is not None:
                dtaci.update(bool(covered_d))
            covered_fixed = dec_f["action"] == "BET" and dec_f["lo"] <= y <= dec_f["hi"]

        base_crps.append(H.crps_gaussian(mu, SIGMA0, y))

        # fold this row in only after the decision, and only if it is stamped settled
        if row.get("pit_stamp", "settled") == "settled" and y is not None:
            resid = y - mu
            _insort(abs_scores, abs(resid))
            _insort(signed, resid)
            if sigma_hat > 0:
                _insort(norm_scores, abs(resid) / sigma_hat)
            _insort(mondrian[spread_bin(row["spread_line"])], abs(resid))
            sq += resid * resid
            if resid < 0:
                n_left += 1

    base_mean = sum(base_crps) / n if n else None
    out = {}
    for name, a in acc.items():
        bet = a["bet"]
        out[name] = {
            "n_bet": bet,
            "n_no_bet": a["no_bet"],
            "empirical_coverage": (a["cover"] / bet) if bet else None,
            "average_width": (a["width"] / bet) if bet else None,
            "uniform_interval_crps": (a["crps_u"] / a["crps_n"]) if a["crps_n"] else None,
            "crps_degradation_vs_gaussian_13_45": (
                (a["crps_u"] / a["crps_n"]) - base_mean if a["crps_n"] and base_mean is not None else None
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
        "gate_cleared": False,
        "passed": False,
        "emission": "ZERO_OBJECT",
        "note": "Wrappers inform NO_BET only. Uniform-interval CRPS is a diagnostic degradation, not a pricing distribution.",
    }


def _insort(seq, value):
    lo, hi = 0, len(seq)
    while lo < hi:
        mid = (lo + hi) // 2
        if seq[mid] < value:
            lo = mid + 1
        else:
            hi = mid
    seq.insert(lo, value)


def main():
    rows, skipped = H.load_frozen()
    # frozen filter rows are settled historical games
    for r in rows:
        r["pit_stamp"] = "settled"
    res = score_rows(rows)
    res["skipped_rows"] = skipped
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(res, fh, indent=1)
    print(json.dumps({k: res[k] for k in ("n", "max_abs_mean_shift", "gate_cleared", "emission")}, indent=1))
    for name, w in res["wrappers"].items():
        print(name, "coverage", w["empirical_coverage"], "width", w["average_width"], "no_bet", w["n_no_bet"], "dCRPS", w["crps_degradation_vs_gaussian_13_45"])
    print("written", OUT)


if __name__ == "__main__":
    main()
