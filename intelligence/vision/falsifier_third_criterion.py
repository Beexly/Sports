"""Falsifier third-criterion test — family model x context prior, held-out.

The pre-registered criterion (falsifier dry-run, VISION-FALSIFIER-DRYRUN-PLAN):
the tracking feature family must IMPROVE the context prior's held-out
log-score at the pre-registered blend weight (w=0.5), or the primitive fails
its own gate regardless of raw AUC.

Pipeline per held-out play:
  1. context prior: P(route | down-context, coverage family) fit on train
     (week<=6 plays, the SAME prior construction as falsifier_dryrun.py).
  2. family lift: P(deep | kinematics) from the week-1-fitted 5-feature
     logistic (Route-Depth Signature) -> likelihood-ratio vs base deep rate.
  3. blend: P'(route) ∝ prior(route) * LR_deep(route-class)^w, renormalized.
  4. metrics: multiclass log-score / Brier / top-1, prior-only vs blended,
     on held-out plays WITH tracking (week 7+8 scored against their priors).

Honest scoping: plays without tracking still score on prior-only; the blend
comparison is computed on the tracked subset (stated, not hidden).
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
OUT = REPO / "docs" / "data-sources" / "research" / "2026-10-14" / "falsifier-third-criterion.json"
FEATURES = ["sep_arrival", "sep_min", "speed_at_arrival", "speed_max", "break_intensity"]
DEEP = {"GO", "POST", "CORNER", "WHEEL"}
BLEND_W = 0.5  # pre-registered in the dry-run


def context_key(down: float, dist: float) -> str:
    if down <= 1:
        return "1st"
    if down == 2:
        return "2nd"
    if dist <= 3:
        return "3rd-short"
    if dist <= 7:
        return "3rd-mid"
    return "3rd-long"


def coverage_family(cov) -> str:
    if not isinstance(cov, str):
        return "other"
    if cov == "MAN":
        return "man"
    if cov.startswith(("2", "4")) or cov == "DF":
        return "zone_deep"
    if cov.startswith(("3", "C", "H")):
        return "zone_match"
    return "other"


def fit_logistic(X, y, iters=4000, lr=0.05):
    mu, sd = X.mean(axis=0), X.std(axis=0)
    sd[sd < 1e-9] = 1.0
    Xs = np.hstack([np.ones((len(X), 1)), (X - mu) / sd])
    beta = np.zeros(Xs.shape[1])
    for _ in range(iters):
        p = 1 / (1 + np.exp(-Xs @ beta))
        beta -= lr * (Xs.T @ (p - y)) / len(y)
    return {"mu": mu, "sd": sd, "beta": beta}


def apply_logistic(m, X):
    Xs = np.hstack([np.ones((len(X), 1)), (X - m["mu"]) / m["sd"]])
    return 1 / (1 + np.exp(-(Xs @ m["beta"])))


def metrics(scored) -> dict:
    n = len(scored)
    top1 = sum(1 for s in scored if max(s["beliefs"], key=s["beliefs"].get) == s["route"])
    routes = sorted({s["route"] for s in scored})
    brier = logscore = 0.0
    for s in scored:
        logscore += -math.log(max(s["beliefs"].get(s["route"], 0.0), 1e-9))
        for rt in routes:
            y = 1.0 if rt == s["route"] else 0.0
            brier += (s["beliefs"].get(rt, 0.0) - y) ** 2
    return {"n": n, "top1": round(top1 / n, 4),
            "brier": round(brier / n, 4), "logscore": round(logscore / n, 4)}


def main() -> int:
    # context prior machinery: full labeled set from player_play (weeks<=6 train)
    pp = pd.read_csv(DATA / "player_play.csv",
                     usecols=["gameId", "playId", "nflId", "wasTargettedReceiver",
                              "routeRan", "pff_defensiveCoverageAssignment"])
    games = pd.read_csv(DATA / "games.csv", usecols=["gameId", "week"])
    plays = pd.read_csv(DATA / "plays.csv",
                        usecols=["gameId", "playId", "down", "yardsToGo", "passResult"])
    plays = plays.merge(games, on="gameId")
    tgt = pp[(pp.wasTargettedReceiver == True) & pp.routeRan.notna()][
        ["gameId", "playId", "nflId", "routeRan", "pff_defensiveCoverageAssignment"]]
    m = tgt.merge(plays, on=["gameId", "playId"], how="inner")
    defcov = (pp[pp.pff_defensiveCoverageAssignment.notna()]
              .groupby(["gameId", "playId"])["pff_defensiveCoverageAssignment"]
              .agg(lambda s: s.mode().iat[0] if len(s.mode()) else None)
              .rename("cov_mode").reset_index())
    m = m.merge(defcov, on=["gameId", "playId"], how="left")
    train = m[m.week <= 6]
    counts = defaultdict(lambda: defaultdict(int))
    for r in train.itertuples(index=False):
        ctx = (context_key(r.down, r.yardsToGo), coverage_family(r.cov_mode))
        counts[ctx][r.routeRan] += 1
    priors = {c: {rt: n / sum(d.values()) for rt, n in d.items()} for c, d in counts.items()}

    # family model: fit on week-1 tracked targets
    tr = pd.read_parquet(DATA / "family_features_week1.parquet")
    model = fit_logistic(tr[FEATURES].to_numpy(), tr["is_deep"].to_numpy())
    base_deep = float(tr["is_deep"].mean())

    # held-out tracked plays (weeks 7+8), with their game context
    ho = pd.concat([pd.read_parquet(DATA / "family_features_week7.parquet"),
                    pd.read_parquet(DATA / "family_features_week8.parquet")],
                   ignore_index=True)
    ho = ho.merge(plays[["gameId", "playId", "down", "yardsToGo"]].rename(
        columns={"gameId": "gameId"}), on=["gameId", "playId"], how="left")
    ho = ho.merge(defcov, on=["gameId", "playId"], how="left")
    ho = ho.dropna(subset=["down", "yardsToGo"])

    scored_prior, scored_blend, skipped = [], [], 0
    for r in ho.itertuples(index=False):
        ctx = (context_key(r.down, r.yardsToGo), coverage_family(r.cov_mode))
        prior = priors.get(ctx)
        if not prior:
            skipped += 1
            continue
        beliefs = dict(prior)
        scored_prior.append({"route": r.route, "beliefs": dict(beliefs)})
        p_deep = float(apply_logistic(model, np.array([[getattr(r, f) for f in FEATURES]]))[0])
        lr_deep = (p_deep / max(1e-9, 1 - p_deep)) / max(1e-9, base_deep / (1 - base_deep))
        deep = {rt: p for rt, p in beliefs.items() if rt in DEEP}
        short = {rt: p for rt, p in beliefs.items() if rt not in DEEP}
        d_sum, s_sum = sum(deep.values()), sum(short.values())
        if d_sum > 0 and s_sum > 0:
            lift = lr_deep / (d_sum / (d_sum + s_sum))
            for rt in deep:
                deep[rt] *= lift ** BLEND_W
            tot = sum(deep.values()) + s_sum
            beliefs = {**{k: v / tot for k, v in deep.items()},
                       **{k: v / tot for k, v in short.items()}}
        scored_blend.append({"route": r.route, "beliefs": beliefs})

    res_prior = metrics(scored_prior)
    res_blend = metrics(scored_blend)
    delta = round(res_prior["logscore"] - res_blend["logscore"], 4)
    out = {
        "generated_utc": pd.Timestamp.now(tz="UTC").isoformat(),
        "criterion": "family blend must BEAT context prior on held-out log-score (w=0.5 pre-registered)",
        "heldout_tracked_plays": len(scored_prior),
        "skipped_no_prior": skipped,
        "prior_only": res_prior,
        "prior_x_family": res_blend,
        "logscore_delta": delta,
        "criterion_met": bool(delta > 0),
        "honesty": "tracked-subset comparison; untracked plays still score prior-only in production",
    }
    print(json.dumps(out, indent=1))
    OUT.write_text(json.dumps(out, indent=1), encoding="utf-8")
    print(f"\nlanded: {OUT.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
