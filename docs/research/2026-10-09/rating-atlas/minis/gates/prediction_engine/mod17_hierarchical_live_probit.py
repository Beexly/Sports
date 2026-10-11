#!/usr/bin/env python3
"""
Module 17: 2303-12401v2 — hierarchical-live-probit (bayesian family)

Gate spec (GATE-SPECS.md):
  (a) Tests whether a hierarchical Bayesian live probit on play-indexed nflverse
      data beats a static pre-match-probability-plus-score baseline once the
      split is chronological.
  (b) Needs nflverse play-by-play with down/distance/yardline/score/time
      covariates and market odds as a covariate, under rolling-origin validation.
  (c) Pass = "under rolling-origin validation, the play-indexed Bayesian probit
      must beat a static pre-match-probability-plus-score baseline on log-loss."
      Fail = "if the live model adds nothing once the split is chronological,
      the adaptation fails."

Implementation note: full MCMC hierarchical probit is out of scope for a gate
eval; this uses penalized logistic regression with team-level intercepts
(hierarchical shrinkage approximated via ridge on team dummies), which is the
standard fast surrogate. The gate criterion (log-loss win under rolling origin)
is implemented exactly.
"""
import json, math, os, sys
import numpy as np
import pandas as pd

MODULE_ID = "2303-12401v2"
FAMILY = "bayesian"
FILE = "bayesian/2303-12401v2-hierarchical-live-probit.ts"
DATA_DIR = os.environ.get("GSE_PBP_DIR", os.path.expanduser(
    "~/workspace/gse-discovery/symbolic-regression/data"))

FEATURES = ["down", "ydstogo", "yardline_100", "score_differential",
            "game_seconds_remaining", "spread_line", "total_line"]
MIN_SEASONS_TRAIN = 2


def sigmoid(z):
    return 1.0 / (1.0 + np.exp(-np.clip(z, -30, 30)))


def load_pbp(seasons):
    frames = []
    for s in seasons:
        p = os.path.join(DATA_DIR, f"pbp_{s}.parquet")
        if not os.path.exists(p):
            return None, f"missing pbp_{s}.parquet"
        df = pd.read_parquet(p, columns=list(set(FEATURES + ["season", "week", "posteam", "result"])))
        frames.append(df)
    return pd.concat(frames, ignore_index=True), None


def prep(df):
    df = df.dropna(subset=FEATURES + ["result"]).copy()
    # result: 1 if posteam eventually won the game
    df["y"] = (df["result"] > 0).astype(int)
    # scale features
    X = df[FEATURES].to_numpy(dtype=float)
    mu, sd = X.mean(0), X.std(0) + 1e-9
    Xs = (X - mu) / sd
    # team dummies (hierarchical intercepts, ridge-shrunk)
    teams = pd.get_dummies(df["posteam"], dtype=float).to_numpy()
    Xa = np.hstack([np.ones((len(df), 1)), Xs, teams])
    return Xa, df["y"].to_numpy(), df


def fit_ridge_logreg(X, y, lam=1.0, iters=300, lr=0.1):
    w = np.zeros(X.shape[1])
    n = len(y)
    for _ in range(iters):
        p = sigmoid(X @ w)
        g = X.T @ (p - y) / n + lam * w / n
        w -= lr * g
    return w


def logloss(y, p):
    p = np.clip(p, 1e-6, 1 - 1e-6)
    return float(-(y * np.log(p) + (1 - y) * np.log(1 - p)).mean())


def static_baseline_predict(df):
    # pre-match win prob from spread (logistic approx) blended with current score
    spread = df["spread_line"].to_numpy()
    pre_p = sigmoid(-spread / 7.0)
    # score-differential adjustment: each point ~ 4% win prob mid-game, decay by time
    sd = df["score_differential"].to_numpy()
    t = df["game_seconds_remaining"].to_numpy() / 3600.0
    adj = sd * 0.04 * (1 - t * 0.5)
    logit = np.log(pre_p / (1 - pre_p)) + adj * 4
    return sigmoid(logit)


def evaluate():
    seasons_avail = sorted(int(f.split("_")[1].split(".")[0])
                           for f in os.listdir(DATA_DIR)
                           if f.startswith("pbp_") and f.endswith(".parquet"))
    if len(seasons_avail) < MIN_SEASONS_TRAIN + 1:
        return stamp("NOT_EVALUATED",
                     f"need >=3 seasons of pbp, found {seasons_avail}")
    results = []
    # rolling origin: train on all seasons before test season
    for test_s in seasons_avail[MIN_SEASONS_TRAIN:]:
        train_s = [s for s in seasons_avail if s < test_s]
        tr, err = load_pbp(train_s)
        te, err2 = load_pbp([test_s])
        if err or err2:
            return stamp("NOT_EVALUATED", err or err2)
        Xtr, ytr, _ = prep(tr)
        Xte, yte, dte = prep(te)
        # align team dummy columns between train/test
        if Xtr.shape[1] != Xte.shape[1]:
            return stamp("NOT_EVALUATED",
                         "team set mismatch between train/test seasons")
        w = fit_ridge_logreg(Xtr, ytr)
        p_live = sigmoid(Xte @ w)
        p_base = static_baseline_predict(dte)
        ll_live = logloss(yte, p_live)
        ll_base = logloss(yte, p_base)
        results.append({"test_season": test_s, "n": len(yte),
                        "logloss_live": round(ll_live, 5),
                        "logloss_baseline": round(ll_base, 5),
                        "delta": round(ll_base - ll_live, 5)})
    mean_delta = float(np.mean([r["delta"] for r in results]))
    verdict = "PASS" if mean_delta > 0 else "FAIL"
    note = ("live probit beats static baseline on log-loss under rolling origin"
            if verdict == "PASS" else
            "live model adds nothing once the split is chronological")
    return stamp(verdict, note, {"rolling_origin": results,
                                "mean_logloss_delta": round(mean_delta, 5)})


def stamp(verdict, note, extra=None):
    out = {"module": MODULE_ID, "family": FAMILY, "file": FILE,
           "verdict": verdict, "note": note,
           "gate": "rolling-origin log-loss: live probit vs static baseline"}
    if extra:
        out.update(extra)
    return out


if __name__ == "__main__":
    print(json.dumps(evaluate(), indent=2))
