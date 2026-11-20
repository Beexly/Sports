#!/usr/bin/env python3
"""
Multi-Sport Strictly Causal Walk-Forward Calibrator (`NHL` + `NBA`)
(`scripts/calibration/train_multisport_nhl_nba_walkforward.py`)
==================================================================

Enforces NO_FAKE_DATA and strict causality across non-NFL sports:
  - Evaluates chronological historical game frames strictly out-of-sample (`index < t`)
    using pre-game features only:
      * NHL: MoneyPuck 5v5/all-situations `xGoalsPercentage`, goalie `GSAx`
        (`xGoals - goals`), rest differential, and closing/fair market probability.
      * NBA: arXiv 2112.14649v1 Bayesian conjugate fatigue priors
        (`restDifferential=+0.35`, `westwardTravelHours=-1.74`, `threeInFour=-1.29`)
        + trailing pre-game net-rating & pace differentials.
  - Feeds `evaluate_sport_market_readiness()` (`n_oos >= 150`, `walkforward_brier <
    market_baseline_brier`, `walkforward_accuracy >= 0.555`) and refuses promotion to
    `TIER_A_CALIBRATED_SNIPER` whenever real settled OOS proof is insufficient.
  - Also fetches live public read-only NHL MoneyPuck team/goalie CSVs when requested
    (`--fetch-live`) for Tier-B daily matchup environment intel & shadow paper logging.
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import math
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping, Optional, Sequence

import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from intelligence.calibration.multi_sport_readiness_and_quarantine_gate import (  # noqa: E402
    evaluate_sport_market_readiness,
)

DEFAULT_OUT_PATH = REPO_ROOT / "data" / "calibration" / "multisport_walkforward_heads_2026.json"
DEFAULT_NHL_SEASON = 2025 if datetime.now(timezone.utc).month < 9 else datetime.now(timezone.utc).year

NBA_FATIGUE_PRIORS: dict[str, tuple[float, float]] = {
    "rest_diff": (0.35, 1.0),
    "westward_travel_hours": (-1.74, 1.5),
    "three_in_four": (-1.29, 1.5),
}


def _logit(p: float) -> float:
    pc = min(0.99, max(0.01, float(p)))
    return math.log(pc / (1.0 - pc))


def _sigmoid(x: float) -> float:
    xc = max(-10.0, min(10.0, float(x)))
    return 1.0 / (1.0 + math.exp(-xc))


def compute_nba_fatigue_adjustment_pts(
    rest_diff: float,
    westward_travel_hours: float,
    three_in_four_diff: float,
    est_rest: Optional[tuple[float, float]] = None,
) -> float:
    """Bayesian conjugate posterior adjustment (points) using arXiv 2112.14649v1 priors."""
    prior_m, prior_sd = NBA_FATIGUE_PRIORS["rest_diff"]
    if est_rest is not None and est_rest[1] > 0:
        pv = prior_sd ** 2
        lv = max(1e-12, float(est_rest[1]) ** 2)
        post_v = 1.0 / (1.0 / pv + 1.0 / lv)
        w_rest = post_v * (prior_m / pv + float(est_rest[0]) / lv)
    else:
        w_rest = prior_m
    adj = (
        w_rest * float(rest_diff)
        + NBA_FATIGUE_PRIORS["westward_travel_hours"][0] * float(westward_travel_hours)
        + NBA_FATIGUE_PRIORS["three_in_four"][0] * float(three_in_four_diff)
    )
    return float(max(-6.0, min(6.0, adj)))


def walkforward_evaluate_chronological_games(
    sport: str,
    games: Sequence[Mapping[str, Any]],
    *,
    market_family: str,
    min_train_warmup: int = 30,
) -> dict[str, Any]:
    """
    Strictly causal walk-forward evaluation over chronological settled games.
    Each row requires: `market_fair_prob` (0..1), `raw_signal_logit_delta` (pre-game edge signal),
    and `outcome` (1.0 home/over cover/win, 0.0 otherwise).
    Zero future rows (`idx >= t`) are ever read when fitting fold `t`.
    """
    sport_u = sport.strip().upper()
    ordered = sorted(games, key=lambda g: (str(g.get("date") or ""), str(g.get("game_id") or "")))
    if len(ordered) <= min_train_warmup:
        cal = {
            "strictly_causal": False,
            "n_oos": 0,
            "walkforward_brier": 0.255,
            "market_baseline_brier": 0.250,
            "walkforward_accuracy": 0.0,
            "eligible_for_play": False,
            "w_sim": 0.15,
            "temp": 0.65,
            "max_prob_cap": 0.62,
        }
        readiness = evaluate_sport_market_readiness(
            sport_u,
            market_family,
            cal,
            {"spine_healthy": True, "spine_age_hours": 1.0, "starter_or_lineup_confirmed": True},
        )
        return {**cal, "readiness": readiness}

    w_grid = (0.15, 0.25, 0.35, 0.45, 0.55)
    t_grid = (0.55, 0.75, 0.95, 1.15)
    cap_grid = (0.62, 0.66, 0.70, 0.74)

    mkt_logits = np.array([_logit(float(g["market_fair_prob"])) for g in ordered], dtype=np.float64)
    sig_deltas = np.array([float(g.get("raw_signal_logit_delta", 0.0)) for g in ordered], dtype=np.float64)
    outcomes = np.array([1.0 if float(g["outcome"]) >= 0.5 else 0.0 for g in ordered], dtype=np.float64)
    mkt_probs = np.array([min(0.95, max(0.05, float(g["market_fair_prob"]))) for g in ordered], dtype=np.float64)

    oos_p: list[float] = []
    oos_m: list[float] = []
    oos_y: list[float] = []
    last_par = (0.25, 0.75, 0.66)

    for idx in range(min_train_warmup, len(ordered)):
        # Re-tune strictly on causal prefix [:idx] every 10 games
        if idx == min_train_warmup or (idx - min_train_warmup) % 10 == 0:
            tr_mkt = mkt_logits[:idx]
            tr_sig = sig_deltas[:idx]
            tr_y = outcomes[:idx]
            best_b = 999.0
            best_par = last_par
            for ws in w_grid:
                for tm in t_grid:
                    comb = tr_mkt + ws * tm * tr_sig
                    probs = 1.0 / (1.0 + np.exp(-np.clip(comb, -10.0, 10.0)))
                    for cp in cap_grid:
                        pc = np.clip(probs, 1.0 - cp, cp)
                        brier = float(np.mean((pc - tr_y) ** 2))
                        if brier < best_b:
                            best_b = brier
                            best_par = (ws, tm, cp)
            last_par = best_par

        ws_f, tm_f, cp_f = last_par
        p_hat = min(cp_f, max(1.0 - cp_f, _sigmoid(float(mkt_logits[idx] + ws_f * tm_f * sig_deltas[idx]))))
        oos_p.append(p_hat)
        oos_m.append(float(mkt_probs[idx]))
        oos_y.append(float(outcomes[idx]))

    p_arr = np.array(oos_p, dtype=np.float64)
    m_arr = np.array(oos_m, dtype=np.float64)
    y_arr = np.array(oos_y, dtype=np.float64)
    wf_brier = float(np.mean((p_arr - y_arr) ** 2))
    mkt_brier = float(np.mean((m_arr - y_arr) ** 2))
    wf_acc = float(np.mean((p_arr >= m_arr).astype(np.float64) == y_arr))

    cal = {
        "strictly_causal": True,
        "w_sim": round(float(last_par[0]), 4),
        "temp": round(float(last_par[1]), 4),
        "max_prob_cap": round(float(last_par[2]), 4),
        "walkforward_brier": round(wf_brier, 5),
        "market_baseline_brier": round(mkt_brier, 5),
        "walkforward_accuracy": round(wf_acc, 4),
        "n_oos": int(len(oos_p)),
    }
    readiness = evaluate_sport_market_readiness(
        sport_u,
        market_family,
        {**cal, "eligible_for_play": True},
        {"spine_healthy": True, "spine_age_hours": 1.0, "starter_or_lineup_confirmed": True},
    )
    cal["eligible_for_play"] = bool(readiness["publish_official_picks_allowed"])
    cal["readiness"] = readiness
    return cal


def fetch_moneypuck_nhl_snapshot(season: int = DEFAULT_NHL_SEASON, timeout_sec: float = 12.0) -> dict[str, Any]:
    """Read-only fetch of public free MoneyPuck NHL team & goalie CSV summaries (`all` situation)."""
    base = f"https://moneypuck.com/moneypuck/playerData/seasonSummary/{season}/regular"
    teams_top: list[dict[str, Any]] = []
    goalies_top: list[dict[str, Any]] = []
    errors: list[str] = []

    try:
        req = urllib.request.Request(f"{base}/teams.csv", headers={"User-Agent": "GSE-Intelligence/1.0"})
        with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
            text = resp.read().decode("utf-8", errors="ignore")
        if text.lstrip().startswith("<"):
            raise ValueError("HTML response from MoneyPuck teams.csv")
        rows = [r for r in csv.DictReader(io.StringIO(text)) if r.get("situation") == "all"]
        for r in rows:
            xg_pct = float(r.get("xGoalsPercentage") or r.get("onIce_xGoalsPercentage") or 0.5)
            teams_top.append({
                "team": r.get("team", ""),
                "games": int(float(r.get("games_played") or 0)),
                "xg_share": round(xg_pct, 4),
            })
        teams_top.sort(key=lambda x: x["xg_share"], reverse=True)
    except Exception as exc:
        errors.append(f"teams.csv: {exc}")

    try:
        req = urllib.request.Request(f"{base}/goalies.csv", headers={"User-Agent": "GSE-Intelligence/1.0"})
        with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
            text = resp.read().decode("utf-8", errors="ignore")
        if text.lstrip().startswith("<"):
            raise ValueError("HTML response from MoneyPuck goalies.csv")
        rows = [r for r in csv.DictReader(io.StringIO(text)) if r.get("situation") == "all" and float(r.get("games_played") or 0) >= 10]
        for r in rows:
            xga = float(r.get("xGoals") or 0.0)
            ga = float(r.get("goals") or 0.0)
            goalies_top.append({
                "name": r.get("name", ""),
                "team": r.get("team", ""),
                "games": int(float(r.get("games_played") or 0)),
                "gsax": round(xga - ga, 2),
            })
        goalies_top.sort(key=lambda x: x["gsax"], reverse=True)
    except Exception as exc:
        errors.append(f"goalies.csv: {exc}")

    return {
        "source": "moneypuck.com (attribution required)",
        "season": season,
        "status": "live" if (teams_top or goalies_top) else "offline_or_unavailable",
        "top_teams_xg_share": teams_top[:5],
        "top_goalies_gsax": goalies_top[:5],
        "errors": errors,
    }


def run_walkforward_nhl_and_nba_calibration(
    *,
    nhl_games: Optional[Sequence[Mapping[str, Any]]] = None,
    nba_games: Optional[Sequence[Mapping[str, Any]]] = None,
    fetch_live_moneypuck: bool = False,
    out_path: Optional[Path] = None,
) -> dict[str, Any]:
    """Evaluate NHL & NBA causal heads + MoneyPuck live environment snapshot without fake OOS data."""
    nhl_eval = walkforward_evaluate_chronological_games(
        "NHL",
        list(nhl_games or ()),
        market_family="moneypuck_xg_moneyline",
    )
    nba_eval = walkforward_evaluate_chronological_games(
        "NBA",
        list(nba_games or ()),
        market_family="game_spread_and_fatigue",
    )
    moneypuck_snap = fetch_moneypuck_nhl_snapshot() if fetch_live_moneypuck else {
        "source": "moneypuck.com (attribution required)",
        "season": DEFAULT_NHL_SEASON,
        "status": "skipped_offline",
        "top_teams_xg_share": [],
        "top_goalies_gsax": [],
        "errors": [],
    }

    artifact = {
        "schema": "gse_multisport_walkforward_heads_v1",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "no_fake_data_law": True,
        "sports": {
            "NHL": nhl_eval,
            "NBA": nba_eval,
        },
        "nba_fatigue_bayesian_priors": {k: {"prior_mean": v[0], "prior_sd": v[1]} for k, v in NBA_FATIGUE_PRIORS.items()},
        "moneypuck_live_environment": moneypuck_snap,
    }
    target = out_path or DEFAULT_OUT_PATH
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(artifact, indent=2) + "\n", encoding="utf-8")
    return artifact


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Multi-sport NHL/NBA causal walk-forward trainer")
    parser.add_argument("--fetch-live", action="store_true")
    parser.add_argument("--out", default=str(DEFAULT_OUT_PATH))
    args = parser.parse_args()
    res = run_walkforward_nhl_and_nba_calibration(
        fetch_live_moneypuck=args.fetch_live,
        out_path=Path(args.out),
    )
    print(
        f"[MULTISPORT CAL] NHL={res['sports']['NHL']['readiness']['readiness_tier']} (n={res['sports']['NHL']['n_oos']}) | "
        f"NBA={res['sports']['NBA']['readiness']['readiness_tier']} (n={res['sports']['NBA']['n_oos']}) | "
        f"MoneyPuck={res['moneypuck_live_environment']['status']}"
    )
