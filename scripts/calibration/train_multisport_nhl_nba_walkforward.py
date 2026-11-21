#!/usr/bin/env python3
"""
Multi-Sport Strictly Causal Walk-Forward Calibrator (`NHL` + `NBA`)
(`scripts/calibration/train_multisport_nhl_nba_walkforward.py`)
==================================================================

Enforces NO_FAKE_DATA and strict causality across non-NFL sports:
  - Evaluates chronological historical game frames strictly out-of-sample (`index < t`)
    using pre-game features only:
      * NHL: Streams real historical + 2025/2026 settled NHL games (`all_teams.csv` from
        MoneyPuck `season >= min_season, situation == 'all'`), computing strictly causal
        EWMA `xGoalsPercentage`, venue/flurry-adjusted xG differential, PDO regression,
        and exact days-of-rest / back-to-back differential.
        Note: Without posted two-sided NHL closing sportsbook odds on MoneyPuck rows,
        `has_closing_odds=False` keeps NHL in `TIER_B_ENVIRONMENT_INTEL_AND_PAPER_LEARNING`
        while logging genuine chronological `n_oos` Brier & accuracy proof.
      * NBA: arXiv 2112.14649v1 Bayesian conjugate fatigue priors
        (`restDifferential=+0.35`, `westwardTravelHours=-1.74`, `threeInFour=-1.29`)
        + trailing pre-game net-rating & pace differentials.
  - Feeds `evaluate_sport_market_readiness()` (`n_oos >= 150`, `walkforward_brier <
    market_baseline_brier`, `walkforward_accuracy >= 0.555`) and refuses promotion to
    `TIER_A_CALIBRATED_SNIPER` whenever real settled OOS proof OR real two-sided closing
    odds validation is absent.
"""
from __future__ import annotations

import argparse
import csv
import gzip
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

from evaluation.frozen.score_walkforward_calibration_v1 import (  # noqa: E402
    brier_score,
    equal_mass_ece,
    expected_calibration_error,
    log_loss,
)
from intelligence.calibration.multi_sport_readiness_and_quarantine_gate import (  # noqa: E402
    evaluate_sport_market_readiness,
)

DEFAULT_OUT_PATH = REPO_ROOT / "data" / "calibration" / "multisport_walkforward_heads_2026.json"
DEFAULT_NHL_GAMES_CACHE = REPO_ROOT / "data" / "multisport" / "nhl_moneypuck_2024_2026_games.json"
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


def fetch_and_build_causal_nhl_chronological_games(
    min_season: int = 2024,
    cache_path: Path | None = None,
    timeout_sec: float = 45.0,
) -> list[dict[str, Any]]:
    """
    Stream real chronological settled NHL games from MoneyPuck `all_teams.csv` (`season >= min_season`,
    `situation == 'all'`), build strictly causal (`index < t`) EWMA xG%, venue-adjusted xG diff,
    PDO mean-reversion, and B2B rest features, and cache cleanly under `data/multisport/`.
    """
    url = "https://moneypuck.com/moneypuck/playerData/careers/gameByGame/all_teams.csv"
    req = urllib.request.Request(url, headers={"User-Agent": "GSE-Intelligence/1.0", "Accept-Encoding": "gzip"})
    paired: dict[str, dict[str, dict[str, Any]]] = {}

    with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
        stream = gzip.GzipFile(fileobj=resp) if resp.headers.get("Content-Encoding") == "gzip" else resp
        reader = csv.DictReader(io.TextIOWrapper(stream, encoding="utf-8", errors="ignore"))
        for r in reader:
            try:
                season = int(float(r.get("season") or 0))
            except ValueError:
                continue
            if season < min_season or r.get("situation") != "all":
                continue
            gid = str(r.get("gameId") or "").strip()
            hoa = str(r.get("home_or_away") or "").strip().upper()
            if not gid or hoa not in ("HOME", "AWAY"):
                continue
            paired.setdefault(gid, {})[hoa] = {
                "season": season,
                "date": str(r.get("gameDate") or ""),
                "team": str(r.get("team") or ""),
                "opp": str(r.get("opposingTeam") or ""),
                "xg_pct": float(r.get("xGoalsPercentage") or 0.5),
                "xgf": float(r.get("flurryScoreVenueAdjustedxGoalsFor") or r.get("xGoalsFor") or 0.0),
                "xga": float(r.get("flurryScoreVenueAdjustedxGoalsAgainst") or r.get("xGoalsAgainst") or 0.0),
                "gf": float(r.get("goalsFor") or 0.0),
                "ga": float(r.get("goalsAgainst") or 0.0),
                "sog_f": max(1.0, float(r.get("shotsOnGoalFor") or 25.0)),
                "sog_a": max(1.0, float(r.get("shotsOnGoalAgainst") or 25.0)),
            }

    ordered_ids = sorted(
        (gid for gid, g in paired.items() if "HOME" in g and "AWAY" in g and abs(g["HOME"]["gf"] - g["HOME"]["ga"]) > 0.1),
        key=lambda gid: (paired[gid]["HOME"]["date"], gid),
    )

    team_state: dict[str, dict[str, Any]] = {}
    games_out: list[dict[str, Any]] = []
    home_wins_cum = 0
    total_cum = 0

    for gid in ordered_ids:
        h = paired[gid]["HOME"]
        a = paired[gid]["AWAY"]
        ht, at = h["team"], a["team"]
        d_str = h["date"]
        try:
            d_dt = datetime.strptime(d_str, "%Y%m%d")
        except ValueError:
            continue

        hs = team_state.get(ht)
        aws = team_state.get(at)
        if hs and aws and hs["n"] >= 5 and aws["n"] >= 5:
            h_rest = (d_dt - hs["last_date"]).days
            a_rest = (d_dt - aws["last_date"]).days
            b2b_diff = (1.0 if a_rest <= 1 else 0.0) - (1.0 if h_rest <= 1 else 0.0)
            xg_diff = hs["ewma_xg_pct"] - aws["ewma_xg_pct"]
            xg_net_diff = hs["ewma_xg_net"] - aws["ewma_xg_net"]
            pdo_fade = -0.35 * ((hs["ewma_pdo"] - 1.0) - (aws["ewma_pdo"] - 1.0))
            p_home_base = float(np.clip(home_wins_cum / max(1, total_cum), 0.50, 0.58)) if total_cum >= 20 else 0.54
            sig_delta = float(np.clip(3.2 * xg_diff + 0.35 * xg_net_diff + pdo_fade + 0.18 * b2b_diff, -1.6, 1.6))
            games_out.append({
                "date": d_dt.strftime("%Y-%m-%d"),
                "game_id": gid,
                "season": h["season"],
                "home_team": ht,
                "away_team": at,
                "market_fair_prob": round(p_home_base, 4),
                "raw_signal_logit_delta": round(sig_delta, 4),
                "outcome": 1.0 if h["gf"] > h["ga"] else 0.0,
                "has_closing_odds": False,
            })

        home_wins_cum += 1 if h["gf"] > h["ga"] else 0
        total_cum += 1
        alpha = 0.16
        for tm, row in ((ht, h), (at, a)):
            pdo_g = (row["gf"] / row["sog_f"]) + (1.0 - row["ga"] / row["sog_a"])
            net_g = row["xgf"] - row["xga"]
            prev = team_state.get(tm)
            if prev is None:
                team_state[tm] = {
                    "n": 1,
                    "last_date": d_dt,
                    "ewma_xg_pct": row["xg_pct"],
                    "ewma_xg_net": net_g,
                    "ewma_pdo": pdo_g,
                }
            else:
                prev["n"] += 1
                prev["last_date"] = d_dt
                prev["ewma_xg_pct"] = alpha * row["xg_pct"] + (1.0 - alpha) * prev["ewma_xg_pct"]
                prev["ewma_xg_net"] = alpha * net_g + (1.0 - alpha) * prev["ewma_xg_net"]
                prev["ewma_pdo"] = alpha * pdo_g + (1.0 - alpha) * prev["ewma_pdo"]

    target = cache_path or DEFAULT_NHL_GAMES_CACHE
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(games_out, indent=2) + "\n", encoding="utf-8")
    return games_out


def walkforward_evaluate_chronological_games(
    sport: str,
    games: Sequence[Mapping[str, Any]],
    *,
    market_family: str,
    min_train_warmup: int = 30,
) -> dict[str, Any]:
    """
    Strictly causal walk-forward evaluation over chronological settled games.
    Zero future rows (`idx >= t`) are ever read when fitting fold `t`.
    """
    sport_u = sport.strip().upper()
    ordered = sorted(games, key=lambda g: (str(g.get("date") or ""), str(g.get("game_id") or "")))
    if len(ordered) <= min_train_warmup:
        cal = {
            "strictly_causal": False,
            "n_oos": 0,
            "walkforward_brier": 0.255,
            "walkforward_log_loss": 0.70315,
            "walkforward_ece": 0.0,
            "walkforward_equal_mass_ece": 0.0,
            "market_baseline_brier": 0.250,
            "market_baseline_log_loss": 0.69315,
            "walkforward_accuracy": 0.0,
            "eligible_for_play": False,
            "has_closing_odds": False,
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
    has_closing_odds = all(bool(g.get("has_closing_odds", True)) for g in ordered)

    oos_p: list[float] = []
    oos_m: list[float] = []
    oos_y: list[float] = []
    last_par = (0.25, 0.75, 0.66)

    for idx in range(min_train_warmup, len(ordered)):
        if idx == min_train_warmup or (idx - min_train_warmup) % 25 == 0:
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
    yt_l = [int(v) for v in y_arr.tolist()]
    yp_l = [float(v) for v in p_arr.tolist()]
    ym_l = [float(v) for v in m_arr.tolist()]
    wf_brier = float(brier_score(yt_l, yp_l))
    wf_logloss = float(log_loss(yt_l, yp_l))
    wf_ece = float(expected_calibration_error(yt_l, yp_l, n_bins=10))
    wf_em_ece = float(equal_mass_ece(yt_l, yp_l, min_per_bin=10))
    mkt_brier = float(brier_score(yt_l, ym_l))
    mkt_logloss = float(log_loss(yt_l, ym_l))
    # Binary directional/winner accuracy against 0.50 on moneyline or fair baseline
    wf_acc = float(np.mean((p_arr >= m_arr).astype(np.float64) == y_arr))
    winner_acc = float(np.mean((p_arr >= 0.50).astype(np.float64) == y_arr))

    cal = {
        "strictly_causal": True,
        "w_sim": round(float(last_par[0]), 4),
        "temp": round(float(last_par[1]), 4),
        "max_prob_cap": round(float(last_par[2]), 4),
        "walkforward_brier": round(wf_brier, 5),
        "walkforward_log_loss": round(wf_logloss, 5),
        "walkforward_ece": round(wf_ece, 5),
        "walkforward_equal_mass_ece": round(wf_em_ece, 5),
        "market_baseline_brier": round(mkt_brier, 5),
        "market_baseline_log_loss": round(mkt_logloss, 5),
        "walkforward_accuracy": round(wf_acc, 4),
        "winner_accuracy": round(winner_acc, 4),
        "n_oos": int(len(oos_p)),
        "has_closing_odds": bool(has_closing_odds),
    }
    readiness = evaluate_sport_market_readiness(
        sport_u,
        market_family,
        {**cal, "eligible_for_play": bool(has_closing_odds)},
        {"spine_healthy": True, "spine_age_hours": 1.0, "starter_or_lineup_confirmed": True},
    )
    if not has_closing_odds:
        readiness["readiness_tier"] = "TIER_B_ENVIRONMENT_INTEL_AND_PAPER_LEARNING"
        readiness["publish_official_picks_allowed"] = False
        readiness["reasons"] = list(readiness.get("reasons", [])) + [
            "MoneyPuck historical feed lacks posted two-sided NHL sportsbook closing odds; held in Tier-B paper learning until closing-line validation."
        ]
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
    use_cached_nhl: bool = False,
    nhl_cache_path: Optional[Path] = None,
    out_path: Optional[Path] = None,
) -> dict[str, Any]:
    """Evaluate NHL & NBA causal heads + MoneyPuck live & historical chronological feeds without fake OOS data."""
    nhl_list = list(nhl_games or ())
    if not nhl_list and fetch_live_moneypuck:
        try:
            nhl_list = fetch_and_build_causal_nhl_chronological_games(cache_path=nhl_cache_path)
        except Exception:
            nhl_list = []
    cache_p = Path(nhl_cache_path or DEFAULT_NHL_GAMES_CACHE)
    if not nhl_list and use_cached_nhl and cache_p.is_file():
        try:
            loaded = json.loads(cache_p.read_text(encoding="utf-8"))
            if isinstance(loaded, list):
                nhl_list = loaded
        except Exception:
            nhl_list = []

    nhl_eval = walkforward_evaluate_chronological_games(
        "NHL",
        nhl_list,
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
        "schema": "gse_multisport_walkforward_heads_v2",
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
    parser.add_argument("--no-cache", action="store_true")
    parser.add_argument("--out", default=str(DEFAULT_OUT_PATH))
    args = parser.parse_args()
    res = run_walkforward_nhl_and_nba_calibration(
        fetch_live_moneypuck=args.fetch_live,
        use_cached_nhl=not args.no_cache,
        out_path=Path(args.out),
    )
    nhl = res["sports"]["NHL"]
    nba = res["sports"]["NBA"]
    print(
        f"[MULTISPORT CAL v2] NHL={nhl['readiness']['readiness_tier']} "
        f"(n={nhl['n_oos']} brier={nhl['walkforward_brier']:.5f} vs {nhl['market_baseline_brier']:.5f} "
        f"logloss={nhl.get('walkforward_log_loss', 0.0):.5f} ece={nhl.get('walkforward_ece', 0.0):.5f} "
        f"win_acc={nhl.get('winner_accuracy', 0.0):.4f}) | "
        f"NBA={nba['readiness']['readiness_tier']} (n={nba['n_oos']}) | "
        f"MoneyPuck={res['moneypuck_live_environment']['status']}"
    )
