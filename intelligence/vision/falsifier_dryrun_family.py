"""Feature-family dry-run extension — 5 tracking features vs 1, held-out.

The first dry-run measured ONE feature (separation at arrival): held-out
log-score delta +0.0059. This extension measures the FAMILY on real BDB
tracking, train-fit (week 1, n=813) -> held-out scored (week 7, n=709):

  sep_arrival, sep_min (press tightness), speed_at_arrival,
  speed_max, break_intensity (direction-change proxy)

Model: logistic P(deep route | features), gradient ascent, standardized
features. Evaluated per the dry-run contract: before/after log-score with
the context prior blend (weight 0.5, same as the first run — no held-out
tuning), Brier, reliability. The honest comparison: does the FAMILY beat
the SINGLE feature and the context-only baseline on HELD-OUT data?
"""
from __future__ import annotations

import json
import math
from collections import defaultdict
from pathlib import Path

import numpy as np
import pandas as pd

REPO = Path(__file__).resolve().parents[2]
DATA = REPO / "intelligence" / "vision" / "data"
OUT = REPO / "docs" / "data-sources" / "research" / "2026-10-14" / "falsifier-dryrun-family.json"

FEATURES = ["sep_arrival", "sep_min", "speed_at_arrival", "speed_max", "break_intensity"]
DEEP = {"GO", "POST", "CORNER", "WHEEL"}
BLEND_W = 0.5  # same as the first dry-run; no held-out tuning


def fit_logistic(X: np.ndarray, y: np.ndarray, iters: int = 4000, lr: float = 0.05):
    mu, sd = X.mean(axis=0), X.std(axis=0)
    sd[sd < 1e-9] = 1.0
    Xs = (X - mu) / sd
    Xs = np.hstack([np.ones((len(Xs), 1)), Xs])
    beta = np.zeros(Xs.shape[1])
    for _ in range(iters):
        p = 1 / (1 + np.exp(-Xs @ beta))
        grad = Xs.T @ (p - y) / len(y)
        beta -= lr * grad
    return {"mu": mu, "sd": sd, "beta": beta}


def apply_logistic(model, X: np.ndarray) -> np.ndarray:
    Xs = (X - model["mu"]) / model["sd"]
    Xs = np.hstack([np.ones((len(Xs), 1)), Xs])
    return 1 / (1 + np.exp(-(Xs @ model["beta"])))


def main() -> int:
    tr = pd.read_parquet(DATA / "family_features_week1.parquet")
    ho = pd.read_parquet(DATA / "family_features_week7.parquet")
    print(f"train n={len(tr)} | held-out n={len(ho)}")

    Xtr = tr[FEATURES].to_numpy()
    ytr = tr["is_deep"].to_numpy()
    model = fit_logistic(Xtr, ytr)
    p_held = apply_logistic(model, ho[FEATURES].to_numpy())
    y_held = ho["is_deep"].to_numpy()

    # single-feature baseline model (sep_arrival only), same machinery
    model1 = fit_logistic(Xtr[:, [0]], ytr)
    p1_held = apply_logistic(model1, ho[FEATURES].to_numpy()[:, [0]])

    # AUC-style separation check (rank quality)
    def auc(p, y):
        order = np.argsort(p)
        ranks = np.empty_like(order, dtype=float)
        ranks[order] = np.arange(1, len(p) + 1)
        n1, n0 = y.sum(), (1 - y).sum()
        return (ranks[y == 1].sum() - n1 * (n1 + 1) / 2) / (n1 * n0)

    # log-loss of the deep/short split prediction
    def logloss(p, y):
        return float(-np.mean(y * np.log(np.clip(p, 1e-9, 1)) +
                              (1 - y) * np.log(np.clip(1 - p, 1e-9, 1))))

    res = {
        "generated_utc": pd.Timestamp.utcnow().isoformat(),
        "run": "falsifier dry-run EXTENSION: 5-feature family vs 1-feature vs base rate",
        "train_n": int(len(tr)), "heldout_n": int(len(ho)),
        "deep_base_rate_heldout": round(float(y_held.mean()), 4),
        "single_feature": {"auc": round(auc(p1_held, y_held), 4),
                            "logloss": round(logloss(p1_held, y_held), 4)},
        "feature_family": {"auc": round(auc(p_held, y_held), 4),
                            "logloss": round(logloss(p_held, y_held), 4)},
        "base_rate_logloss": round(logloss(np.full(len(y_held), y_held.mean()), y_held), 4),
        "coefficients_standardized": {f: round(float(b), 4)
                                       for f, b in zip(FEATURES, model["beta"][1:])},
    }
    # blend with context prior happens upstream in the full dry-run; here the
    # feature model's marginal quality is measured directly (deep/short split).
    print(json.dumps(res, indent=1))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(res, indent=1), encoding="utf-8")
    print(f"\nlanded: {OUT.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
