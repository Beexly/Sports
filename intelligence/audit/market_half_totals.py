"""MARKET HALF — totals margin, model vs de-vigged market, 2,622-game corpus.

The VISION-CONTRACT falsifier's second half: "per-play uncertainty strictly
smaller than the market's implied pre-snap distribution for the same plays
on at least one margin (prop or total)". The totals margin is the one where
a real closing price exists for every game in the corpus (closingTotal) AND
a final outcome (homeScore+awayScore).

METHOD (calibration-vs-market, the same standard the founder demanded for
the ML slice):
  Model = constant-uncertainty normal centered on a team-offense/defense
  total-lean estimate built FROM THE SAME GAMES' history (expanding window,
  no leakage: for each game the model sees only prior games), with a
  residual sd measured on the TRAIN portion.
  Market = the closing total line (the book's point prediction, uncertainty
  implied by the historical sd of (actual total - closing line) — the
  market's own realized error distribution, computed on TRAIN only).
  Compare: model log-score vs market log-score on the HELD-OUT portion,
  plus coverage of 90% intervals for both. The market half is MET only if
  the model's uncertainty (interval width) is strictly smaller at equal or
  better coverage.

This is the same-margin comparison the contract demands, on the only priced
margin with settled outcomes in the corpus. The per-play route margin stays
an information-edge result (no market prices route class).
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np

REPO = Path(__file__).resolve().parents[2]
CORPUS = REPO / "data" / "backtest" / "nfl_historical_games.json"
OUT = REPO / "docs" / "data-sources" / "research" / "2026-10-14" / "market-half-totals.json"


def team_totals_lean(rows, i, window=400):
    """Expanding-window team scoring lean: avg total in each team's prior
    `window` games (no leakage — strictly before game i)."""
    ht, at = rows[i]["homeTeam"], rows[i]["awayTeam"]
    past = rows[:i]
    hs, as_ = [], []
    for r in reversed(past):
        if r["homeTeam"] in (ht, at) or r["awayTeam"] in (ht, at):
            hs.append(r["homeScore"] + r["awayScore"])
            if len(hs) >= window:
                break
    return float(np.mean(hs)) if hs else None


def main() -> int:
    rows = json.loads(CORPUS.read_text(encoding="utf-8"))["rows"]
    rows = [r for r in rows if r.get("closingTotal") and r.get("homeScore") is not None]
    # time-ordered already (season, week ascending) — verify
    rows.sort(key=lambda r: (r["season"], r["week"], r["kickoffUtc"]))
    n = len(rows)
    split = int(n * 0.7)
    train, held = rows[:split], rows[split:]
    actual = np.array([r["homeScore"] + r["awayScore"] for r in rows])
    lines = np.array([float(r["closingTotal"]) for r in rows])

    # TRAIN-only market error sd = the market's implied uncertainty
    train_err = actual[:split] - lines[:split]
    market_sd = float(train_err.std(ddof=1))

    # model: expanding team-lean, residual sd on train
    lean = np.full(n, np.nan)
    for i in range(split, n):
        v = team_totals_lean(rows, i)
        if v is not None:
            lean[i] = v
    # also compute for train tail to measure model residual sd
    lean_train = np.full(n, np.nan)
    for i in range(max(0, split - 800), split):
        v = team_totals_lean(rows, i)
        if v is not None:
            lean_train[i] = v
    ok_tr = ~np.isnan(lean_train)
    model_sd = float((actual[ok_tr] - lean_train[ok_tr]).std(ddof=1))
    # blend model lean with the line (shrinkage toward the market — the
    # prior IS the market here; the model's edge claim must come from
    # somewhere, and with no team-efficiency features yet the honest model
    # is line + team-lean residual correction)
    resid = actual[ok_tr] - lean_train[ok_tr]
    line_resid = actual[ok_tr] - lines[ok_tr]
    corr = float(np.corrcoef(resid, line_resid)[0, 1])

    def logscore(mu, sd, y):
        z = (y - mu) / sd
        return float(-np.mean(-0.5 * z * z - math.log(sd) - 0.5 * math.log(2 * math.pi)))

    def coverage(mu, sd, y, z=1.645):
        return float(np.mean(np.abs(y - mu) <= z * sd))

    held_ok = ~np.isnan(lean[split:])
    y_h = actual[split:][held_ok]
    mu_market = lines[split:][held_ok]
    mu_model = lean[split:][held_ok]

    res = {
        "generated_utc": pd.Timestamp.now(tz="UTC").isoformat() if False else __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        "margin": "game total (closing line vs actual combined score)",
        "corpus": {"n": n, "train": split, "held": n - split, "seasons": [rows[0]["season"], rows[-1]["season"]]},
        "market_implied_uncertainty": {"sd_train_error": round(market_sd, 3)},
        "model_uncertainty": {"sd_train_residual": round(model_sd, 3),
                               "lean_line_corr": round(corr, 4)},
        "held_out": {
            "n": int(held_ok.sum()),
            "market_logscore": round(logscore(mu_market, market_sd, y_h), 4),
            "naive_model_logscore": round(logscore(mu_model, model_sd, y_h), 4),
            "market_coverage_90": round(coverage(mu_market, market_sd, y_h), 4),
            "naive_model_coverage_90": round(coverage(mu_model, model_sd, y_h), 4),
        },
        "verdict_pending": "the naive team-lean model is the FLOOR model; the market half verdict requires a model whose held-out log-score BEATS the market at narrower width — the blend model (lean shrunk to line) is the next measurement",
    }
    # blend model: mu = line + gamma*(lean - line), gamma fit on train
    num = float(np.sum((resid - line_resid) * (lean_train[ok_tr] - lines[ok_tr])))
    den = float(np.sum((lean_train[ok_tr] - lines[ok_tr]) ** 2))
    gamma = max(0.0, min(1.0, num / den)) if den > 0 else 0.0
    mu_blend = mu_market + gamma * (mu_model - mu_market)
    blend_sd = float(np.std(actual[split:][held_ok] - mu_blend, ddof=1))  # honest: held-out realized
    res["blend_model"] = {
        "gamma_train_fit": round(gamma, 4),
        "held_out_logscore": round(logscore(mu_blend, market_sd, y_h), 4),
        "held_out_coverage_90": round(coverage(mu_blend, market_sd, y_h), 4),
        "held_out_realized_sd": round(blend_sd, 3),
        "note": "width uses the market sd (same uncertainty claim) so the log-score comparison isolates the LOCATION improvement; the width comparison (uncertainty strictly smaller) needs the model's own sd from train residuals",
    }
    print(json.dumps(res, indent=1))
    OUT.write_text(json.dumps(res, indent=1), encoding="utf-8")
    print(f"\nlanded: {OUT.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
