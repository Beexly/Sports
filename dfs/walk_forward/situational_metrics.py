#!/usr/bin/env python3
"""Diagnostic residual-scale tests for RIL, OLCD, PSR, PFE, CTF.

mu = spread_line. sigma = 13.45 * exp(beta * z). beta is fit on strictly earlier
games only. A missing or future stamp omits the game from the feature set.
Nothing here writes picks or edits CVI, BQP, or SWCC.
"""
from __future__ import annotations

import csv, json, math, os, sys, collections
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import wf_margin_crps as w  # noqa: E402

SIGMA = 13.45
EXPECTED = 7.154021
GATE = 7.099
STATUS_W = {"Out": 1.0, "Doubtful": 0.75, "Questionable": 0.25, "Probable": 0.0}
POS_W = {}
for p, wt in (
    (("QB",), 2.5),
    (("C", "G", "T", "OT", "OG", "OL", "LT", "LG", "RT", "RG", "C/G", "G/C", "T/G", "G/T"), 1.2),
    (("DE", "DT", "DL", "NT", "EDGE"), 1.0),
    (("CB", "S", "FS", "SS", "DB"), 0.8),
    (("WR", "TE"), 0.7),
    (("LB", "ILB", "OLB", "MLB"), 0.6),
    (("RB", "FB", "HB"), 0.5),
):
    for name in p:
        POS_W[name] = wt
OL = {"C", "G", "T", "OT", "OG", "OL", "LT", "LG", "RT", "RG", "C/G", "G/C", "T/G", "G/T"}


def parse_ts(value):
    if value in (None, "", "NA"):
        return None
    s = str(value).strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(s)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def kickoff(gameday, gametime):
    if not gameday or not gametime or gametime in ("", "NA"):
        return None
    try:
        from zoneinfo import ZoneInfo
        local = datetime.strptime(gameday + " " + gametime, "%Y-%m-%d %H:%M").replace(tzinfo=ZoneInfo("America/New_York"))
    except Exception:
        return None
    return local.astimezone(timezone.utc)


def crps(mu, sigma, y):
    return w.crps_gaussian(mu, sigma, y)


def fit_beta(residuals, z):
    """Minimize mean CRPS. beta in [-1, 1]. Empty train returns None."""
    if len(residuals) < 30:
        return None
    def mean_crps(beta):
        total = 0.0
        for (mu, y), zi in zip(residuals, z):
            total += crps(mu, SIGMA * math.exp(beta * zi), y)
        return total / len(residuals)
    gr = (math.sqrt(5) - 1) / 2
    a, b = -1.0, 1.0
    c, d = b - gr * (b - a), a + gr * (b - a)
    fc, fd = mean_crps(c), mean_crps(d)
    for _ in range(40):
        if fc < fd:
            b, d, fd = d, c, fc
            c = b - gr * (b - a)
            fc = mean_crps(c)
        else:
            a, c, fc = c, d, fd
            d = a + gr * (b - a)
            fd = mean_crps(d)
    return (a + b) / 2


def score_feature(games, values):
    """Walk-forward. values[game_id] is float or None. Missing keeps baseline scale on the full filter.
    Subset scores only games where the feature is defined. delta = crps_with - crps_without.
    Refuse when subset delta >= 0.
    """
    ordered = sorted(games, key=lambda g: (g["season"], g["week"], g["game_id"]))
    weeks = []
    cur = None
    for g in ordered:
        key = (g["season"], g["week"])
        if cur != key:
            weeks.append([])
            cur = key
        weeks[-1].append(g)
    prior_vals, prior_rows = [], []
    full_base, full_feat = [], []
    sub_base, sub_feat = [], []
    betas = []
    for block in weeks:
        mu_z = sd_z = beta = None
        if len(prior_vals) >= 30:
            mu_z = sum(prior_vals) / len(prior_vals)
            var = sum((v - mu_z) ** 2 for v in prior_vals) / len(prior_vals)
            sd_z = math.sqrt(var) if var > 0 else None
            if sd_z:
                z_train = [(v - mu_z) / sd_z for v in prior_vals]
                beta = fit_beta([(r["spread"], r["margin"]) for r in prior_rows], z_train)
                betas.append(beta)
        for g in block:
            base = crps(g["spread"], SIGMA, g["margin"])
            full_base.append(base)
            v = values.get(g["game_id"])
            if v is None or beta is None or sd_z is None:
                full_feat.append(base)
            else:
                z = (v - mu_z) / sd_z
                feat = crps(g["spread"], SIGMA * math.exp(beta * z), g["margin"])
                full_feat.append(feat)
                sub_base.append(base)
                sub_feat.append(feat)
        for g in block:
            v = values.get(g["game_id"])
            if v is not None:
                prior_vals.append(v)
                prior_rows.append(g)
    def mean(xs):
        return None if not xs else round(sum(xs) / len(xs), 6)
    n_sub = len(sub_base)
    d_sub = None if not n_sub else round(mean(sub_feat) - mean(sub_base), 6)
    d_full = round(mean(full_feat) - mean(full_base), 6)
    status = "REFUSED" if d_sub is None or d_sub >= 0 else "IMPROVES_ALONE_NOT_CLEARED"
    if status != "REFUSED" and n_sub >= 150 and mean(sub_feat) is not None and mean(sub_feat) <= GATE and d_full < 0 and mean(full_feat) <= GATE:
        status = "MEASURED_UNDER_GATE"
    return {
        "n_filter": len(ordered),
        "n_feature_defined_and_scored": n_sub,
        "crps_without": mean(sub_base),
        "crps_with": mean(sub_feat),
        "delta": d_sub,
        "full_filter_crps_without": mean(full_base),
        "full_filter_crps_with": mean(full_feat),
        "full_filter_delta": d_full,
        "beta_last": None if not betas else round(betas[-1], 4),
        "status": status,
        "passed": False,
        "mu": "spread_line",
        "sigma": SIGMA,
    }
