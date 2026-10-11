#!/usr/bin/env python3
"""
eval_module53_dtvw.py — Acceptance-gate evaluation for prediction-engine module 53.

Module: 2508-07136v2-ledger-0795-bayesian-forecast-combination.ts
Paper: arXiv:2508.07136v2 — Bayesian Forecast Combination with Predictive Priors (DTVW)

ACCEPTANCE GATE (from JSDoc): ADAPT if DTVW implements the self-tuning diversity
mechanism with burn-in-tuned initialization and clears a >=2% CRPS gate on the
density forecasts.

What this eval does:
1. Ports diversityBonus() and dtvwUpdate() faithfully from TypeScript.
2. Runs a synthetic multi-source forecast experiment.
3. Measures CRPS of DTVW-weighted ensemble vs static equal-weight baseline.
4. Reports whether the >=2% CRPS improvement gate clears.

Status: DIAGNOSTIC. Synthetic data only — not a production promotion.
"""
import math
import random

# ---------------------------------------------------------------------------
# Faithful ports from 2508-07136v2-ledger-0795-bayesian-forecast-combination.ts
# ---------------------------------------------------------------------------

def diversity_bonus(errors, source_idx):
    """1 - mean positive pairwise correlation of this source's recent errors
    with others' errors. Matches TS diversityBonus exactly."""
    mine = errors[source_idx] if source_idx < len(errors) else []
    if len(mine) < 2:
        return 0.5
    sum_pos = 0.0
    n = 0
    for j in range(len(errors)):
        if j == source_idx:
            continue
        other = errors[j] if j < len(errors) else []
        m1 = sum(mine) / len(mine)
        m2 = sum(other) / len(other) if other else 0.0
        cov = sum((mine[t] - m1) * ((other[t] if t < len(other) else 0.0) - m2)
                  for t in range(len(mine)))
        v1 = sum((x - m1) ** 2 for x in mine)
        v2 = sum(((other[t] if t < len(other) else 0.0) - m2) ** 2
                 for t in range(len(mine)))
        corr = cov / math.sqrt(v1 * v2) if v1 > 1e-12 and v2 > 1e-12 else 0.0
        sum_pos += max(0.0, corr)
        n += 1
    mean_pos = sum_pos / n if n > 0 else 0.0
    return max(0.0, min(1.0, 1.0 - mean_pos))


def dtvw_update(weights, losses, diversities, eta, div_gain):
    """w_i <- w_i * exp(-eta * loss_i) * (1 + divGain * div_i), renormalize.
    Matches TS dtvwUpdate exactly."""
    if not (len(weights) == len(losses) == len(diversities)):
        raise ValueError("dtvwUpdate: length mismatch")
    if eta < 0 or div_gain < 0:
        raise ValueError("dtvwUpdate: eta, divGain >= 0")
    raw = [max(1e-12, w) * math.exp(-eta * l) * (1 + div_gain * d)
           for w, l, d in zip(weights, losses, diversities)]
    z = sum(raw)
    return [r / z for r in raw]


# ---------------------------------------------------------------------------
# CRPS for binary-outcome density forecasts
# CRPS = mean over events of |p - y|  (Brier-score decomposition for binary)
# ---------------------------------------------------------------------------

def crps_binary(probs, outcomes):
    return sum(abs(p - y) for p, y in zip(probs, outcomes)) / len(probs)


def run_eval(n_events=500, n_sources=4, seed=42):
    rng = random.Random(seed)
    # Synthetic truth: latent probability per event
    true_p = [rng.random() for _ in range(n_events)]
    outcomes = [1 if rng.random() < p else 0 for p in true_p]

    # Sources: one sharp, one biased, two noisy clones (correlated errors)
    def source_forecasts():
        base_noise = [rng.gauss(0, 0.08) for _ in range(n_events)]
        return [
            [min(1, max(0, p + rng.gauss(0, 0.05))) for p in true_p],           # sharp
            [min(1, max(0, p + 0.10 + rng.gauss(0, 0.05))) for p in true_p],     # biased
            [min(1, max(0, p + base_noise[i] + rng.gauss(0, 0.02)))             # clone A
             for i, p in enumerate(true_p)],
            [min(1, max(0, p + base_noise[i] + rng.gauss(0, 0.02)))             # clone B
             for i, p in enumerate(true_p)],
        ]

    forecasts = source_forecasts()
    # Brier-loss per source per event (for DTVW loss input)
    losses_all = [[(f - y) ** 2 for f, y in zip(src, outcomes)] for src in forecasts]

    # Burn-in: first 100 events to initialize weights
    burn_in = 100
    weights = [1.0 / n_sources] * n_sources
    eta, div_gain = 2.0, 1.0

    dtvw_probs, static_probs = [], []
    for t in range(burn_in, n_events):
        # diversity from recent error history
        hist = [src_losses[max(0, t - 50):t] for src_losses in losses_all]
        diversities = [diversity_bonus(hist, i) for i in range(n_sources)]
        step_losses = [losses_all[i][t - 1] for i in range(n_sources)]
        weights = dtvw_update(weights, step_losses, diversities, eta, div_gain)
        dtvw_p = sum(w * forecasts[i][t] for i, w in enumerate(weights))
        dtvw_probs.append(dtvw_p)
        static_probs.append(sum(forecasts[i][t] for i in range(n_sources)) / n_sources)

    eval_outcomes = outcomes[burn_in:]
    crps_dtvw = crps_binary(dtvw_probs, eval_outcomes)
    crps_static = crps_binary(static_probs, eval_outcomes)
    improvement = (crps_static - crps_dtvw) / crps_static * 100

    print("Module 53 — DTVW Bayesian Forecast Combination")
    print(f"  events evaluated : {len(eval_outcomes)} (burn-in {burn_in})")
    print(f"  CRPS static      : {crps_static:.4f}")
    print(f"  CRPS DTVW        : {crps_dtvw:.4f}")
    print(f"  improvement      : {improvement:+.2f}%  (gate: >= +2.00%)")
    print(f"  final weights    : {[f'{w:.3f}' for w in weights]}")
    gate = improvement >= 2.0
    print(f"  GATE             : {'PASS' if gate else 'FAIL'}")
    return {"crps_static": crps_static, "crps_dtvw": crps_dtvw,
            "improvement_pct": improvement, "gate_pass": gate}


if __name__ == "__main__":
    r = run_eval()
    print("\nDIAGNOSTIC — synthetic data. Not a production promotion.")
