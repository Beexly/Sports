"""TEAM-EFFICIENCY TOTALS MODEL — can Layer-2 features beat sd 13.32?

The market-half harness measured: closing total log-score 3.9769, sd 13.32,
blend gamma=0 for a naive team-lean. THIS model adds the measured team-game
efficiency features from nflverse play-by-play (EPA/play off & def, success
rate), built with a STRICT expanding-window (each game's features come from
prior games only — no same-season leakage beyond what time ordering gives).

Model form (fit on train, evaluated held-out):
  mu = line + w1*dOff + w2*dDef + w3*dRest  (linear on feature deltas)
  sd = fit on train residuals
Feature deltas = offense-side EPA/play of home offense vs away DEFENSE EPA
allowed, etc. All features are rolling priors-through-week-N.

Verdict rule (pre-registered): model must produce held-out log-score
> 3.9769 (the market's) with width <= 13.32, or the market half stays
"working estimator, not an edge".
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
import pandas as pd

REPO = Path(__file__).resolve().parents[2]
PB = REPO / "intelligence" / "audit" / "data"
CORPUS = REPO / "data" / "backtest" / "nfl_historical_games.json"
OUT = REPO / "docs" / "data-sources" / "research" / "2026-10-14" / "totals-efficiency-model.json"


def build_team_game_features() -> pd.DataFrame:
    frames = []
    for yr in range(2015, 2025):
        p = PB / f"pbp_{yr}.parquet"
        if not p.exists():
            continue
        d = pd.read_parquet(p, columns=[
            "game_id", "season", "week", "game_date", "posteam", "defteam",
            "epa", "success", "play_type", "down"])
        d = d[(d.posteam.notna()) & (d.down.notna())]
        d = d[d.play_type.isin(["pass", "run"])]
        agg = d.groupby(["game_id", "season", "week", "posteam", "defteam"], as_index=False).agg(
            epa_per_play=("epa", "mean"),
            success_rate=("success", "mean"),
            plays=("epa", "count"))
        frames.append(agg)
    return pd.concat(frames, ignore_index=True)


def main() -> int:
    tg = build_team_game_features()
    rows = json.loads(CORPUS.read_text(encoding="utf-8"))["rows"]
    rows = [r for r in rows if r.get("closingTotal") and r.get("homeScore") is not None]
    rows.sort(key=lambda r: (r["season"], r["week"], r["kickoffUtc"]))
    n = len(rows)
    split = int(n * 0.7)

    # index efficiency rows by (season, week, team)
    tg["key_off"] = list(zip(tg.season, tg.week, tg.posteam))
    feat_by_key = {(r.season, r.week, r.posteam): r for r in tg.itertuples(index=False)}

    # expanding team priors: for each corpus game, mean epa_per_play /
    # success_rate of each team's PRIOR games (any week strictly earlier)
    tg_sorted = tg.sort_values(["season", "week"])
    team_history: dict[str, list] = {}
    prior_cache: dict[tuple, dict] = {}

    def prior_for(season: int, week: int, team: str):
        key = (season, week, team)
        if key in prior_cache:
            return prior_cache[key]
        vals = team_history.get(team, [])
        # team_history holds only games strictly before (season, week) —
        # maintained by the walk below
        if len(vals) < 3:
            prior_cache[key] = None
            return None
        df = pd.DataFrame(vals)
        out = {"epa_off": float(df.epa_off.mean()),
                "succ_off": float(df.succ_off.mean()),
                "epa_def": float(df.epa_def.mean()),
                "succ_def": float(df.succ_def.mean()),
                "n": len(df)}
        prior_cache[key] = out
        return out

    # walk corpus in order; before scoring game i, ingest efficiency rows of
    # all pbp games strictly earlier in (season, week)
    pbp_weeks = sorted(set(zip(tg.season, tg.week)))
    week_rows: dict[tuple, pd.DataFrame] = {}
    for (s, w), grp in tg.groupby(["season", "week"]):
        week_rows[(s, w)] = grp

    features = np.full((n, 6), np.nan)  # dEpaOff, dEpaDef, dSuccOff, dSuccDef, restH, restA
    ptr = 0
    for i, r in enumerate(rows):
        s, w = r["season"], r["week"]
        # ingest all pbp weeks strictly before this corpus game's week
        while ptr < len(pbp_weeks) and (pbp_weeks[ptr][0] < s or
                                        (pbp_weeks[ptr][0] == s and pbp_weeks[ptr][1] < w)):
            grp = week_rows[pbp_weeks[ptr]]
            for t in grp.itertuples(index=False):
                team_history.setdefault(t.posteam, []).append(
                    {"epa_off": t.epa_per_play, "succ_off": t.success_rate})
                team_history.setdefault(t.defteam, []).append(
                    {"epa_def": t.epa_per_play, "succ_def": t.success_rate})
            ptr += 1
        ph = prior_for(s, w, r["homeTeam"])
        pa = prior_for(s, w, r["awayTeam"])
        if ph and pa:
            features[i] = [ph["epa_off"] - pa["epa_def"],
                            pa["epa_off"] - ph["epa_def"],
                            ph["succ_off"] - pa["succ_def"],
                            pa["succ_off"] - ph["succ_def"],
                            r["restDaysHome"] or 7,
                            r["restDaysAway"] or 7]

    actual = np.array([r["homeScore"] + r["awayScore"] for r in rows])
    lines = np.array([float(r["closingTotal"]) for r in rows])
    ok = ~np.isnan(features).any(axis=1)
    tr_mask = ok & (np.arange(n) < split)
    ho_mask = ok & (np.arange(n) >= split)
    print(f"feature coverage: train {int(tr_mask.sum())}/{split}, held {int(ho_mask.sum())}/{n-split}")

    X = features[tr_mask]
    y_tr = actual[tr_mask]
    line_tr = lines[tr_mask]
    # target: residual vs the line (the model explains what the line misses)
    resid = y_tr - line_tr
    Xs = np.hstack([np.ones((len(X), 1)), X])
    beta, *_ = np.linalg.lstsq(Xs, resid, rcond=None)
    sd = float(np.std(resid - Xs @ beta, ddof=1))

    Xh = features[ho_mask]
    mu_model = lines[ho_mask] + np.hstack([np.ones((len(Xh), 1)), Xh]) @ beta
    y_h = actual[ho_mask]
    mu_mkt = lines[ho_mask]

    def logscore(mu, sd_, y):
        z = (y - mu) / sd_
        return float(np.mean(0.5 * z * z + np.log(sd_) + 0.5 * math.log(2 * math.pi)))

    def cov(mu, sd_, y, z=1.645):
        return float(np.mean(np.abs(y - mu) <= z * sd_))

    # market sd from train (same as the harness: 13.32)
    market_sd = float(np.std(y_tr - line_tr, ddof=1))
    model_sd = sd
    res = {
        "generated_utc": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        "model": "linear residual-vs-line on EPA/success/rest deltas (expanding window)",
        "train_n": int(tr_mask.sum()), "held_n": int(ho_mask.sum()),
        "coefficients": {"intercept": round(float(beta[0]), 3),
                          "dEpaOff_vs_dEpaDef": round(float(beta[1]), 3),
                          "dEpaDef_vs_dEpaOff": round(float(beta[2]), 3),
                          "dSuccOff": round(float(beta[3]), 4),
                          "dSuccDef": round(float(beta[4]), 4),
                          "restHome": round(float(beta[5]), 3),
                          "restAway": round(float(beta[6]), 3)},
        "model_sd": round(model_sd, 3),
        "market_sd_train": round(market_sd, 3),
        "held_out": {
            "n": int(ho_mask.sum()),
            "market_logscore": round(logscore(mu_mkt, market_sd, y_h), 4),
            "model_logscore": round(logscore(mu_model, model_sd, y_h), 4),
            "market_coverage_90": round(cov(mu_mkt, market_sd, y_h), 4),
            "model_coverage_90": round(cov(mu_model, model_sd, y_h), 4),
            "model_beats_market_logscore": bool(logscore(mu_model, model_sd, y_h) < logscore(mu_mkt, market_sd, y_h)),
            "model_narrower": bool(model_sd < market_sd),
        },
    }
    met = res["held_out"]["model_beats_market_logscore"] and res["held_out"]["model_narrower"]
    res["market_half_verdict"] = ("MODEL BEATS MARKET on the totals margin" if met
                                   else "MODEL DOES NOT BEAT MARKET — both facts recorded")
    print(json.dumps(res, indent=1))
    OUT.write_text(json.dumps(res, indent=1), encoding="utf-8")
    print(f"\nlanded: {OUT.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
