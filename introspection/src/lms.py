"""S1 primary metric: line-move skill (LMS), SPEC-C §2.

Score: ranked probability score for 3 ordered categories,
    RPS(q, o) = 1/2 * sum_{j=1}^{2} (Q_j - O_j)^2
where Q and O are the cumulative forecast and outcome vectors over the
first two categories (AWAY, FLAT, HOME).

Statistic: LMS = 1 - sum RPS(q_g) / sum RPS(R_g) over all included games.
MISSING games (no T0 forecast) are scored as the reference: they contribute
RPS(R) to both sums, i.e. exactly zero skill — skipping a game can never
help (§2.4). Games whose outcome is not yet resolvable are PENDING and are
excluded from the sums but counted.

Uncertainty: paired week-block bootstrap (§2.2, using the SPEC-A machinery's
resample-the-blocks discipline with B = 10,000 by default): whole weeks are
resampled with replacement and LMS is recomputed per replicate; the
interval is the 2.5/97.5 percentile band. With fewer than two distinct
weeks of resolved games the interval is not estimable and is reported as
such — never fabricated.
"""

from __future__ import annotations

import random

CATEGORIES = ("AWAY", "FLAT", "HOME")


def rps(q, outcome: str) -> float:
    if outcome not in CATEGORIES:
        raise ValueError(f"unknown outcome category: {outcome!r}")
    if len(q) != 3:
        raise ValueError("q must be a 3-vector")
    o_idx = CATEGORIES.index(outcome)
    total = 0.0
    q_cum = 0.0
    for j in range(2):
        q_cum += float(q[j])
        o_cum = 1.0 if o_idx <= j else 0.0
        total += (q_cum - o_cum) ** 2
    return 0.5 * total


def _score_rows(rows: list, reference) -> dict:
    """rows: [{game_id, week, q (3-vector or None for MISSING), outcome or None}].

    reference: the frozen reference 3-vector for these games (R0 frequencies
    or R1 output). Returns sums and counts.
    """
    sum_q = 0.0
    sum_r = 0.0
    resolved = 0
    missing = 0
    pending = 0
    for row in rows:
        if row.get("outcome") is None:
            pending += 1
            continue
        resolved += 1
        ref = reference
        sum_r += rps(ref, row["outcome"])
        if row.get("q") is None:
            missing += 1
            sum_q += rps(ref, row["outcome"])  # MISSING scores as the reference
        else:
            sum_q += rps(row["q"], row["outcome"])
    return {"sum_q": sum_q, "sum_r": sum_r, "resolved": resolved, "missing": missing, "pending": pending}


def lms(rows: list, reference) -> dict:
    s = _score_rows(rows, reference)
    if s["resolved"] == 0:
        return {"lms": None, "status": "NO_RESOLVED_GAMES", **s}
    if s["sum_r"] == 0.0:
        return {"lms": None, "status": "REFERENCE_SCORE_ZERO", **s}
    return {"lms": 1.0 - s["sum_q"] / s["sum_r"], "status": "OK", **s}


def week_block_bootstrap(rows: list, reference, b: int = 10000, seed: int = 20261015) -> dict:
    resolved = [r for r in rows if r.get("outcome") is not None]
    weeks = sorted({r["week"] for r in resolved})
    if len(weeks) < 2:
        return {"interval": None, "status": "INSUFFICIENT_WEEKS", "weeks": len(weeks), "b": b}
    by_week = {w: [r for r in resolved if r["week"] == w] for w in weeks}
    rng = random.Random(seed)
    stats = []
    for _ in range(b):
        sample = []
        for _w in weeks:
            sample.extend(by_week[rng.choice(weeks)])
        s = _score_rows(sample, reference)
        if s["sum_r"] > 0:
            stats.append(1.0 - s["sum_q"] / s["sum_r"])
    if not stats:
        return {"interval": None, "status": "NO_VALID_REPLICATES", "weeks": len(weeks), "b": b}
    stats.sort()
    lo = stats[int(0.025 * (len(stats) - 1))]
    hi = stats[int(0.975 * (len(stats) - 1))]
    return {"interval": [lo, hi], "status": "OK", "weeks": len(weeks), "b": b, "replicates": len(stats)}
