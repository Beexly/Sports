# Provenance: implements buildable-systems.md SYS-25 (NNTD selective-classification
# abstention gate, from arxiv-deep/1778-selective-classification-via-neural-network-
# training.md:28-31,40) and syntheses.md S7.
#
# Rules: withhold picks whose checkpoint-disagreement exceeds the threshold
# calibrated to target error. Reference operating points (CIFAR-10, paper):
# coverage 91.2 / 86.4 / 75.9 at fixed error 2% / 1% / 0.5%; at 90% coverage,
# error 1.83. COMPOSITION [INFERENCE]: intersect NNTD's training-dynamics signal
# with MARKET disagreement -- NNTD alone is blind to confidently-wrong
# subpopulations (the ledger's own limitation); the market is the external second
# opinion. Acceptance gate: abstention cuts realized Brier on the published set by
# >= 0.005 with <= 20% coverage loss. Re-tune k on NFL data (k=0.05 was tuned on
# the paper's benchmarks) [INFERENCE: the late-checkpoint computation below].
# The 0716 result stands: never abstain on difficulty/consensus heuristics.
#
# DATA BASIS (honesty): no real pick history in this sandbox. The backtest runs on
# a SEEDED SYNTHETIC held-out pick set (seed 1778, n=2000, 15% hard picks) labeled
# as such: hard picks are overconfident (biased outward) with high checkpoint
# disagreement while the market stays accurate -- the composite's design case.

import numpy as np

SEED = 1778
N_CHECKPOINTS = 30
LATE_WEIGHT_K = 0.05  # [INFERENCE] paper-tuned on its benchmarks; re-tune on NFL data
N_PICKS = 2000
HARD_FRAC = 0.15


def nntd_disagreement(checkpoint_probs, k=LATE_WEIGHT_K):
    """NNTD disagreement: std of predicted probs over the late checkpoints.

    Uses the last m = max(3, round(k*K)) checkpoints (k=0.05 default). Accepts a
    single pick's (K,) vector or an (n_picks, K) matrix.
    """
    cp = np.asarray(checkpoint_probs, dtype=float)
    one_d = cp.ndim == 1
    if one_d:
        cp = cp.reshape(1, -1)
    K = cp.shape[1]
    m = max(3, int(round(k * K)))
    d = cp[:, -m:].std(axis=1)
    return float(d[0]) if one_d else d


def abstention_signal():
    """Negative gate (0716): abstention must NOT key on model disagreement alone.

    The signal is the composite of checkpoint (training-dynamics) disagreement
    INTERSECTED with market disagreement -- never difficulty/consensus heuristics
    and never disagreement alone.
    """
    return "checkpoint_x_market_disagreement"


def abstain_decision(nntd, market_disagree, tau_disagree, tau_market):
    """Composite rule: abstain iff checkpoint-disagreement exceeds its threshold
    AND market disagreement exceeds its threshold (the intersection)."""
    return bool(nntd > tau_disagree and market_disagree > tau_market)


def calibrate_threshold_to_target_error(scores, errors, target_error, max_frac=0.25):
    """Pick the disagreement threshold whose abstained set hits the target error.

    Scans score quantiles; chooses tau minimizing |mean(errors | scores > tau) -
    target_error| subject to 1% <= abstention fraction <= max_frac.
    """
    scores = np.asarray(scores, dtype=float)
    errors = np.asarray(errors, dtype=float)
    best = None
    for tau in np.quantile(scores, np.linspace(0.5, 0.995, 60)):
        sel = scores > tau
        frac = float(sel.mean())
        if frac < 0.01 or frac > max_frac:
            continue
        dev = abs(float(errors[sel].mean()) - target_error)
        if best is None or dev < best[0]:
            best = (dev, float(tau))
    if best is None:
        raise ValueError("no threshold satisfies the fraction bounds")
    return best[1]


def abstention_backtest(seed=SEED, target_error=0.25, tau_market=0.08):
    """Synthetic held-out abstention evaluation (the SYS-25 acceptance gate).

    2000 picks; 15% hard (overconfident, high checkpoint disagreement, market
    accurate); 85% clean. Calibrates the NNTD threshold to the target error,
    intersects with market disagreement, and measures the Brier cut on the
    published set and the coverage loss.
    """
    rng = np.random.default_rng(seed)
    p = rng.beta(2, 2, N_PICKS)
    hard = rng.random(N_PICKS) < HARD_FRAC
    phat = np.empty(N_PICKS)
    phat[~hard] = np.clip(p[~hard] + rng.normal(0, 0.03, int((~hard).sum())), 1e-6, 1 - 1e-6)
    phat[hard] = np.clip(
        p[hard] + 0.25 * np.sign(p[hard] - 0.5) + rng.normal(0, 0.06, int(hard.sum())),
        1e-6, 1 - 1e-6)
    cp = np.empty((N_PICKS, N_CHECKPOINTS))
    for i in range(N_PICKS):
        sd = 0.09 if hard[i] else 0.02
        cp[i] = np.clip(phat[i] + rng.normal(0, sd, N_CHECKPOINTS), 1e-6, 1 - 1e-6)
    market_q = np.clip(p + rng.normal(0, 0.02, N_PICKS), 1e-6, 1 - 1e-6)
    y = (rng.random(N_PICKS) < p).astype(float)

    nntd = nntd_disagreement(cp)
    mdis = np.abs(phat - market_q)
    err = (phat - y) ** 2

    tau_d = calibrate_threshold_to_target_error(nntd, err, target_error)
    abstained = (nntd > tau_d) & (mdis > tau_market)
    published = ~abstained

    brier_all = float(err.mean())
    brier_pub = float(err[published].mean())
    return {
        "brier_all": brier_all,
        "brier_published": brier_pub,
        "brier_cut": brier_all - brier_pub,          # gate: >= 0.005
        "coverage_loss": float(abstained.mean()),     # gate: <= 0.20
        "n_abstained": int(abstained.sum()),
        "n_picks": N_PICKS,
        "tau_disagree": tau_d,
        "tau_market": tau_market,
        "target_error": target_error,
        "abstained_brier": float(err[abstained].mean()),
        "seed": seed,
        "data_basis": "seeded_synthetic_pick_set",
    }
