"""Local-derived cognitive signals for GSE signal-universe domain 2.4.

Reads in-repo nflverse artifacts under ``intelligence/coaching/data/`` and emits
typed signal records matching docs/ops/COGNITIVE-INGEST-2026-10-13.md.

Zero network requests. Zero new dependencies: stdlib (csv, hashlib, json) plus
pandas ONLY for the parquet-backed artifacts -- when pandas is unavailable the
affected signals are reported as explicit gaps, never invented.

Artifacts consumed (already in-repo, produced by the coaching lane):

  weekly_tendencies.csv      2026 wk1-wk3, 32 teams: early_down_pass_rate,
                             shotgun_rate, no_huddle_rate, quick_game_rate,
                             avg_air_yards, pass_rate_all
  off_tendencies.csv         season aggregates 2022-2026 incl. go4th_rate
  timeouts.csv               timeouts_per_game, share_before_2mw, n_games
  sequencing.csv             pass-rate contrast after successful vs failed run
  adjustments.csv            week-over-week Mahalanobis change magnitude
  play_by_play_2026.parquet  weekly targets / participation / 4th-down / timeouts
  depth_charts_2026.parquet  depth-chart snapshots (dt series)
  schedule.csv               season/week/team/opponent (bye detection)

Signals emitted: scheme_shift, tendency_break, snap_trend_break,
fourth_down_trend, timeout_usage, target_trend_break, depth_chart_move,
spot_pattern.

Every record carries provenance with the artifact path, its sha256 and the
method label, so a consumer can re-derive it byte-for-byte.
"""

from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
LOCAL_DATA_DIR = REPO_ROOT / "intelligence" / "coaching" / "data"
SEASON = 2026

SCHEME_METRICS = [
    ("early_down_pass_rate", "rate", 0.10,
     "early-down pass rate; keyless proxy for formation/personnel scheme"),
    ("shotgun_rate", "rate", 0.10, "shotgun alignment frequency; scheme proxy"),
    ("no_huddle_rate", "rate", 0.10, "no-huddle frequency; tempo scheme proxy"),
]
TENDENCY_METRICS = [
    ("pass_rate_all", "rate", 0.10, "overall pass/run tendency"),
    ("quick_game_rate", "rate", 0.10, "quick-game (short dropback) tendency"),
    ("avg_air_yards", "yards", 1.5, "average depth of target tendency"),
]


# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------
def _num(x):
    try:
        v = float(x)
        return v
    except (TypeError, ValueError):
        return None


def _int(x):
    try:
        return int(float(x))
    except (TypeError, ValueError):
        return None


def read_csv_rows(path: Path):
    """Read a CSV into a list of dicts; [] when the artifact is missing."""
    if not path.exists():
        return []
    with open(path, newline="", encoding="utf-8", errors="ignore") as fh:
        return list(csv.DictReader(fh))


def sha256_of(path: Path) -> str:
    if not path.exists():
        return ""
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def artifact_prov(path: Path, method: str, confidence: str = "medium",
                  note: str = "", unverified: bool = False,
                  unverified_reason: str = "", generated_utc: str = "") -> dict:
    """Provenance block for a locally-derived record (path + hash, not a URL)."""
    try:
        rel = str(path.relative_to(REPO_ROOT))
    except ValueError:
        rel = str(path)
    return {
        "source_url": "",
        "source_path": rel,
        "source_kind": "local_nflverse_artifact",
        "artifact_sha256": sha256_of(path),
        "retrieved_utc": generated_utc,
        "method": method,
        "confidence": confidence,
        "unverified": unverified,
        "unverified_reason": unverified_reason,
        "note": note,
    }


def _stats(series, prior_values, min_effect: float) -> dict:
    """Pooled-baseline trend stats: last value vs prior values (same window).

    ``status`` is deliberately graded: a large z on a 2-3 point baseline is not
    evidence of a regime break, so short baselines are reported as
    ``break_candidate`` and never as a confirmed ``break``.
    """
    vals = [p["value"] for p in series]
    last = vals[-1] if vals else None
    prior = [v for v in prior_values if v is not None]
    mean = sum(prior) / len(prior) if prior else None
    if len(prior) > 1 and mean is not None:
        var = sum((v - mean) ** 2 for v in prior) / (len(prior) - 1)
        sd = var ** 0.5
    else:
        sd = 0.0
    delta = (last - mean) if (last is not None and mean is not None) else None
    z = (delta / sd) if (sd and delta is not None) else 0.0
    effect_ok = bool(delta is not None and abs(delta) >= min_effect)
    stat_ok = bool(z and abs(z) >= 2.0)
    raw_break = bool(effect_ok and stat_ok)
    reliable = len(prior) >= 6
    if not prior:
        status = "no_baseline"
    elif len(series) < 2:
        status = "insufficient_history"
    elif raw_break and reliable:
        status = "break"
    elif raw_break:
        status = "break_candidate"
    else:
        status = "no_break"
    return {
        "series": series,
        "baseline_mean": round(mean, 4) if mean is not None else None,
        "baseline_n": len(prior),
        "baseline_reliability": "ok" if reliable else "insufficient_n_lt_6",
        "last_value": round(last, 4) if last is not None else None,
        "delta": round(delta, 4) if delta is not None else None,
        "z_score": round(z, 3),
        "direction": ("up" if (delta or 0) > 0 else "down" if (delta or 0) < 0 else "flat"),
        "break_detected": bool(raw_break and reliable),
        "break_candidate": bool(raw_break and not reliable),
        "status": status,
        "min_effect": min_effect,
    }


def _trend_rec(signal_type, team, metric, unit, stats, prov, note="", **extra):
    rec = {
        "signal_id": f"local-{signal_type}-{team}-{metric}".replace(" ", "_"),
        "signal_type": signal_type,
        "team": team,
        "player": "",
        "generated_utc": prov.get("retrieved_utc", ""),
        "provenance": prov,
        "evidence_excerpt": note,
        "metric": metric,
        "unit": unit,
        "note": note,
    }
    rec.update(stats)
    rec.update(extra)
    return rec


# ---------------------------------------------------------------------------
# Layer builders
# ---------------------------------------------------------------------------
def _weekly_tendency_layer(week: int, generated_utc: str, prov_by_name: dict) -> tuple:
    """scheme_shift + tendency_break from weekly_tendencies.csv."""
    path = LOCAL_DATA_DIR / "weekly_tendencies.csv"
    rows = read_csv_rows(path)
    prov = prov_by_name.get("weekly_tendencies") or artifact_prov(
        path, "weekly_tendencies_csv_v1", "medium",
        "coaching-lane weekly team tendencies; recomputable from nflverse pbp",
        generated_utc=generated_utc)
    scheme, tendency = [], []
    if not rows:
        return scheme, tendency
    # team -> metric -> {week: value}; metric -> prior-season pooled values
    cur: dict = {}
    prior: dict = {}
    for r in rows:
        season = _int(r.get("season"))
        w = _int(r.get("week"))
        team = (r.get("team") or "").strip()
        if not team or w is None:
            continue
        for metric, _unit, _floor, _note in SCHEME_METRICS + TENDENCY_METRICS:
            v = _num(r.get(metric))
            if v is None:
                continue
            if season == SEASON and w <= week:
                cur.setdefault(team, {}).setdefault(metric, {})[w] = v
            elif season is not None and season < SEASON and w <= week:
                prior.setdefault(team, {}).setdefault(metric, []).append(v)
    for team in sorted(cur):
        for metric, unit, floor, note in SCHEME_METRICS + TENDENCY_METRICS:
            wk_map = cur.get(team, {}).get(metric) or {}
            if not wk_map:
                continue
            series = [{"week": w, "value": round(wk_map[w], 4)} for w in sorted(wk_map)]
            stats = _stats(series, prior.get(team, {}).get(metric) or [], floor)
            stype = "scheme_shift" if (metric, unit, floor, note) in SCHEME_METRICS else "tendency_break"
            rec = _trend_rec(stype, team, metric, unit, stats, prov, note=note,
                             source_artifact="weekly_tendencies.csv",
                             baseline_basis="pooled prior-season same-week window",
                             weeks_observed=len(series))
            (scheme if stype == "scheme_shift" else tendency).append(rec)
    return scheme, tendency


def _timeout_layer(week: int, generated_utc: str, prov_by_name: dict) -> list:
    path = LOCAL_DATA_DIR / "timeouts.csv"
    rows = read_csv_rows(path)
    prov = prov_by_name.get("timeouts") or artifact_prov(
        path, "timeouts_csv_v1", "medium",
        "timeout consumption per team; challenge outcomes are NOT in nflverse pbp",
        generated_utc=generated_utc)
    out = []
    for r in rows:
        if _int(r.get("season")) != SEASON:
            continue
        team = (r.get("team") or "").strip()
        if not team:
            continue
        out.append({
            "signal_id": f"local-timeout_usage-{team}-timeouts_per_game",
            "signal_type": "timeout_usage",
            "team": team,
            "player": "",
            "generated_utc": generated_utc,
            "provenance": prov,
            "evidence_excerpt": "",
            "metric": "timeouts_per_game",
            "unit": "timeouts",
            "value": _num(r.get("timeouts_per_game")),
            "share_before_2mw": _num(r.get("share_before_2mw")),
            "n_games": _int(r.get("n_games")),
            "status": "ok",
            "note": (r.get("challenge_note") or "").strip() or
                    "challenge outcomes not carried by this artifact",
        })
    return out


def _sequencing_layer(week: int, generated_utc: str, prov_by_name: dict) -> list:
    """tendency_break from sequencing.csv contrast (2nd-down pass after run)."""
    path = LOCAL_DATA_DIR / "sequencing.csv"
    rows = read_csv_rows(path)
    prov = prov_by_name.get("sequencing") or artifact_prov(
        path, "sequencing_csv_v1", "medium", "coaching-lane sequencing contrast",
        generated_utc=generated_utc)
    out = []
    for r in rows:
        if _int(r.get("season")) != SEASON:
            continue
        team = (r.get("team") or "").strip()
        n_pairs = _int(r.get("n_pairs")) or 0
        contrast = _num(r.get("contrast"))
        se = _num(r.get("contrast_se"))
        if not team or contrast is None or n_pairs < 30:
            continue
        z = round(contrast / se, 3) if se else 0.0
        out.append({
            "signal_id": f"local-tendency_break-{team}-pass_after_run_contrast-d{r.get('down')}",
            "signal_type": "tendency_break",
            "team": team,
            "player": "",
            "generated_utc": generated_utc,
            "provenance": prov,
            "evidence_excerpt": "",
            "metric": "pass_after_run_contrast",
            "unit": "probability_delta",
            "down": _int(r.get("down")),
            "situation": "pass rate after successful run minus pass rate after failed run",
            "n_pairs": n_pairs,
            "p_pass_after_succ_run": _num(r.get("p_pass_after_succ_run")),
            "p_pass_after_fail_run": _num(r.get("p_pass_after_fail_run")),
            "contrast": contrast,
            "contrast_se": se,
            "last_value": contrast,
            "delta": contrast,
            "z_score": z,
            "direction": "up" if contrast > 0 else "down" if contrast < 0 else "flat",
            "break_detected": bool(abs(z) >= 2.0),
            "status": "break" if abs(z) >= 2.0 else "no_break",
            "note": "success/failure-dependent play-calling contrast; |z|>=2 flagged",
        })
    return out


def _adjustments_layer(week: int, generated_utc: str, prov_by_name: dict) -> tuple:
    """tendency_break from adjustments.csv week-over-week change magnitude."""
    path = LOCAL_DATA_DIR / "adjustments.csv"
    rows = read_csv_rows(path)
    prov = prov_by_name.get("adjustments") or artifact_prov(
        path, "adjustments_csv_v1", "medium",
        "week-over-week Mahalanobis distance over the tendency vector",
        generated_utc=generated_utc)
    out, latest_week = [], None
    for r in rows:
        if _int(r.get("season")) != SEASON:
            continue
        w = _int(r.get("week"))
        if w is not None and (latest_week is None or w > latest_week):
            latest_week = w
    for r in rows:
        if _int(r.get("season")) != SEASON or _int(r.get("week")) != latest_week:
            continue
        team = (r.get("team") or "").strip()
        pct = _num(r.get("pct_rank"))
        mdist = _num(r.get("mahal_dist"))
        if not team or pct is None:
            continue
        delta_json = (r.get("delta_json") or "").strip()
        try:
            deltas = json.loads(delta_json)
        except json.JSONDecodeError:
            try:
                import ast
                deltas = ast.literal_eval(delta_json)
            except (ValueError, SyntaxError):
                deltas = {}
        big = sorted(((k, _num(v)) for k, v in (deltas or {}).items() if _num(v) is not None),
                     key=lambda kv: -abs(kv[1]))[:4]
        out.append({
            "signal_id": f"local-tendency_break-{team}-week_over_week_adjustment",
            "signal_type": "tendency_break",
            "team": team,
            "player": "",
            "generated_utc": generated_utc,
            "provenance": prov,
            "evidence_excerpt": "",
            "metric": "week_over_week_adjustment",
            "unit": "mahalanobis",
            "week": latest_week,
            "mahal_dist": mdist,
            "pct_rank": pct,
            "series": [{"week": latest_week, "value": mdist}],
            "baseline_mean": None,
            "baseline_n": 0,
            "last_value": mdist,
            "delta": None,
            "z_score": None,
            "direction": "up" if pct >= 0.95 else "down" if pct <= 0.05 else "flat",
            "break_detected": bool(pct >= 0.95 or pct <= 0.05),
            "status": "break" if (pct >= 0.95 or pct <= 0.05) else "no_break",
            "largest_deltas": {k: v for k, v in big},
            "note": "pct_rank is the team-week rank of the change magnitude; >=0.95 or <=0.05 flagged",
        })
    return out, latest_week


def _fourth_down_layer(week: int, generated_utc: str, prov_by_name: dict) -> list:
    """fourth_down_trend from off_tendencies.csv go4th_rate vs prior seasons."""
    path = LOCAL_DATA_DIR / "off_tendencies.csv"
    rows = read_csv_rows(path)
    prov = prov_by_name.get("off_tendencies") or artifact_prov(
        path, "off_tendencies_csv_v1", "medium",
        "season-to-date 4th-down aggression; needs weekly points for a break call",
        generated_utc=generated_utc)
    by_team: dict = {}
    for r in rows:
        team = (r.get("team") or "").strip()
        if team:
            by_team.setdefault(team, []).append(r)
    out = []
    for team in sorted(by_team):
        rs = by_team[team]
        cur = [r for r in rs if _int(r.get("season")) == SEASON]
        pri = [r for r in rs if (_int(r.get("season")) or 0) < SEASON]
        if not cur:
            continue
        row = cur[-1]
        go = _num(row.get("go4th_rate"))
        n4 = _int(row.get("n_4th"))
        pri_vals = [v for v in (_num(r.get("go4th_rate")) for r in pri) if v is not None]
        mean = sum(pri_vals) / len(pri_vals) if pri_vals else None
        sd = 0.0
        if len(pri_vals) > 1 and mean is not None:
            sd = (sum((v - mean) ** 2 for v in pri_vals) / (len(pri_vals) - 1)) ** 0.5
        delta = (go - mean) if (go is not None and mean is not None) else None
        z = (delta / sd) if (sd and delta is not None) else 0.0
        out.append({
            "signal_id": f"local-fourth_down_trend-{team}-go4th_rate",
            "signal_type": "fourth_down_trend",
            "team": team,
            "player": "",
            "generated_utc": generated_utc,
            "provenance": prov,
            "evidence_excerpt": "",
            "metric": "go4th_rate",
            "unit": "rate",
            "season": SEASON,
            "n_4th": n4,
            "last_value": go,
            "baseline_mean": round(mean, 4) if mean is not None else None,
            "baseline_n": len(pri_vals),
            "delta": round(delta, 4) if delta is not None else None,
            "z_score": round(z, 3),
            "direction": ("more_aggressive" if (delta or 0) > 0.02 else
                          "less_aggressive" if (delta or 0) < -0.02 else "flat"),
            "break_detected": bool(z and abs(z) >= 2.0 and delta is not None and abs(delta) >= 0.10),
            "status": "ok" if pri_vals else "no_baseline",
            "note": "go4th_rate = go-for-it share of 4th-down plays; baseline = prior seasons",
        })
    return out


def _pbp_layer(week: int, generated_utc: str, prov_by_name: dict,
               max_moves_per_team: int = 8, min_target_total: float = 10.0,
               min_part_total: int = 25) -> tuple:
    """snap_trend_break (proxy), target_trend_break, weekly fourth_down_trend."""
    path = LOCAL_DATA_DIR / "play_by_play_2026.parquet"
    prov = prov_by_name.get("play_by_play") or artifact_prov(
        path, "play_by_play_parquet_v1", "medium",
        "nflverse pbp; weekly participation and target shares recomputable from this hash",
        generated_utc=generated_utc)
    snap, targets, fd = [], [], []
    try:
        import pandas as pd
    except ImportError as exc:
        return snap, targets, fd, [{
            "metric": "snap_trend_break / target_trend_break / weekly fourth_down_trend",
            "status": "unavailable",
            "reason": f"pandas unavailable in this interpreter ({exc}); parquet-backed "
                      "signals not emitted. Install pandas or export the pbp to CSV.",
        }]
    if not path.exists():
        return snap, targets, fd, [{
            "metric": "snap_trend_break / target_trend_break / weekly fourth_down_trend",
            "status": "unavailable",
            "reason": f"artifact missing: {path}",
        }]

    cols = ["week", "posteam", "play_type", "down", "pass_attempt", "rush_attempt",
            "passer_player_name", "receiver_player_name", "rusher_player_name",
            "lateral_receiver_player_name", "timeout", "timeout_team"]
    df = pd.read_parquet(path, columns=cols)
    df = df[df["week"] <= week]

    # ---- weekly 4th-down aggression per team
    d4 = df[df["down"] == 4]
    for team, grp in d4.groupby("posteam"):
        per_week = {}
        for w, wg in grp.groupby("week"):
            total = len(wg)
            go = int(((wg["pass_attempt"] == 1) | (wg["rush_attempt"] == 1)).sum())
            per_week[int(w)] = (go, total)
        series = [{"week": w, "value": round(go / total, 4) if total else 0.0}
                  for w, (go, total) in sorted(per_week.items()) if total]
        if not series:
            continue
        stats = _stats(series, [p["value"] for p in series[:-1]], 0.10)
        fd.append(_trend_rec("fourth_down_trend", team, "go4th_rate", "rate", stats, prov,
                             note="weekly go-for-it rate on 4th down from nflverse pbp",
                             n_4th=sum(t for _g, t in per_week.values()),
                             source_artifact="play_by_play_2026.parquet",
                             baseline_basis="prior weeks of the same season"))

    # ---- targets and participation shares per player per week
    pass_plays = df[(df["pass_attempt"] == 1) | (df["play_type"] == "pass")]
    team_week_targets = pass_plays.groupby(["posteam", "week"]).size().to_dict()
    tgt: dict = {}
    part: dict = {}
    team_week_plays: dict = {}

    def _bump(store, team, name, wt, cnt):
        d = store.setdefault(team, {}).setdefault(name, {})
        d[wt] = d.get(wt, 0) + cnt

    for team, grp in df.groupby("posteam"):
        for w, wg in grp.groupby("week"):
            team_week_plays[(team, int(w))] = len(wg)
            # NOTE: row counts, never unique() -- one pbp row == one appearance.
            for col in ("passer_player_name", "receiver_player_name", "rusher_player_name",
                        "lateral_receiver_player_name"):
                for name, cnt in wg[col].dropna().value_counts().items():
                    name = str(name).strip()
                    if not name or name.lower() in ("nan", "none"):
                        continue
                    _bump(part, team, name, int(w), int(cnt))
                    if col == "receiver_player_name":
                        _bump(tgt, team, name, int(w), int(cnt))

    for team, players in sorted(tgt.items()):
        emitted = 0
        for name in sorted(players):
            wk_map = players[name]
            total = sum(wk_map.values())
            if len(wk_map) < 2 or total < min_target_total:
                continue
            series = [{"week": w, "value": round(wk_map[w] / team_week_targets.get((team, w), 1), 4)}
                      for w in sorted(wk_map)]
            stats = _stats(series, [p["value"] for p in series[:-1]], 0.05)
            rec = _trend_rec("tendency_break", team, "target_share", "share", stats, prov,
                             note="target share per week from nflverse pbp; target trend break",
                             player=name, targets_total=int(total),
                             source_artifact="play_by_play_2026.parquet",
                             baseline_basis="prior weeks of the same season")
            targets.append(rec)
            emitted += 1
            if emitted >= max_moves_per_team:
                break

    for team, players in sorted(part.items()):
        emitted = 0
        for name in sorted(players):
            wk_map = players[name]
            total = sum(wk_map.values())
            if len(wk_map) < 2 or total < min_part_total:
                continue
            series = [{"week": w, "value": round(wk_map[w] / team_week_plays.get((team, w), 1), 4)}
                      for w in sorted(wk_map)]
            stats = _stats(series, [p["value"] for p in series[:-1]], 0.10)
            snap.append(_trend_rec(
                "snap_trend_break", team, "play_participation_share", "share", stats, prov,
                note="PROXY: plays the player appears in as passer/receiver/rusher; "
                     "true snap counts are not available keyless",
                player=name, plays_total=int(total), proxy=True,
                source_artifact="play_by_play_2026.parquet",
                unverified_note="no snap-count feed; this is an appearance-count proxy"))
            emitted += 1
            if emitted >= max_moves_per_team:
                break

    # ---- timeouts from pbp (team-attributed flags)
    to_rows = df[df["timeout"] == 1]
    by_team = to_rows.groupby("posteam")
    games = df.groupby("posteam")["game_id"].nunique().to_dict() if "game_id" in df else {}
    to_out = []
    for team, grp in by_team:
        n_games = max(1, int(games.get(team, 1)))
        to_out.append({
            "signal_id": f"local-timeout_usage_pbp-{team}-timeouts_per_game",
            "signal_type": "timeout_usage",
            "team": team, "player": "", "generated_utc": generated_utc,
            "provenance": prov, "evidence_excerpt": "",
            "metric": "timeouts_per_game", "unit": "timeouts",
            "value": round(len(grp) / n_games, 4), "n_games": n_games,
            "timeout_team_values": sorted(str(t) for t in grp["timeout_team"].dropna().unique())[:4],
            "status": "ok",
            "note": "counted from nflverse pbp timeout flags; a lower bound on real timeouts",
        })
    return snap, targets, fd, to_out, []


def _depth_chart_layer(generated_utc: str, prov_by_name: dict, max_moves_per_team: int = 8) -> tuple:
    """depth_chart_move from consecutive depth_charts_2026.parquet snapshots."""
    path = LOCAL_DATA_DIR / "depth_charts_2026.parquet"
    prov = prov_by_name.get("depth_charts") or artifact_prov(
        path, "depth_charts_parquet_v1", "medium",
        "nflverse depth-chart snapshots; the diff of the last two dt values",
        generated_utc=generated_utc)
    moves, gaps = [], []
    try:
        import pandas as pd
    except ImportError as exc:
        return [], [{
            "metric": "depth_chart_move_from_snapshots",
            "status": "unavailable",
            "reason": f"pandas unavailable in this interpreter ({exc}); parquet depth-chart "
                      "diff not emitted.",
        }]
    if not path.exists():
        return [], [{
            "metric": "depth_chart_move_from_snapshots",
            "status": "unavailable",
            "reason": f"artifact missing: {path}",
        }]

    df = pd.read_parquet(path, columns=["dt", "team", "player_name", "pos_grp", "pos_slot", "pos_rank"])
    dts = sorted(str(d) for d in df["dt"].unique())
    if len(dts) < 2:
        return [], [{
            "metric": "depth_chart_move_from_snapshots",
            "status": "unavailable",
            "reason": "fewer than two snapshot timestamps in the artifact",
        }]
    prev_dt, cur_dt = dts[-2], dts[-1]
    key = ["team", "pos_grp", "pos_slot", "player_name"]

    def _pair_moves(prev, cur):
        """Moves between two snapshots: rank changes, adds, removals."""
        a = prev.set_index(key)
        b = cur.set_index(key)
        out = []
        for k, row in b.iterrows():
            new_rank = _num(row.get("pos_rank"))
            old_rank = _num(a.loc[k].get("pos_rank")) if k in a.index else None
            if k in a.index and old_rank is not None and new_rank == old_rank:
                continue
            move_type = ("added_to_chart" if k not in a.index else
                         "promotion" if (new_rank or 99) < (old_rank or 99) else "demotion")
            out.append({
                "signal_id": f"local-depth_chart_move-{k[0]}-{k[3]}",
                "signal_type": "depth_chart_move",
                "team": str(k[0]),
                "player": str(k[3]),
                "generated_utc": generated_utc,
                "provenance": prov,
                "evidence_excerpt": "",
                "position": str(row.get("pos_grp") or ""),
                "pos_slot": str(row.get("pos_slot") or ""),
                "move_type": move_type,
                "old_rank": old_rank, "new_rank": new_rank,
                "rank_delta": round((old_rank - new_rank), 3)
                              if (old_rank is not None and new_rank is not None) else None,
                "snapshot_prev_utc": str(prev["dt"].iloc[0]),
                "snapshot_cur_utc": str(cur["dt"].iloc[0]),
                "source_artifact": "depth_charts_2026.parquet",
                "corroborated": False, "corroborated_by": [],
                "note": "depth-chart snapshot diff; not a coach statement",
            })
        for k in a.index:
            if k not in b.index:
                out.append({
                    "signal_id": f"local-depth_chart_move-{k[0]}-{k[3]}-removed",
                    "signal_type": "depth_chart_move",
                    "team": str(k[0]), "player": str(k[3]),
                    "generated_utc": generated_utc, "provenance": prov,
                    "evidence_excerpt": "",
                    "position": str(k[1]), "pos_slot": str(k[2]),
                    "move_type": "removed_from_chart",
                    "old_rank": _num(a.loc[k].get("pos_rank")), "new_rank": None,
                    "rank_delta": None,
                    "snapshot_prev_utc": str(prev["dt"].iloc[0]),
                    "snapshot_cur_utc": str(cur["dt"].iloc[0]),
                    "source_artifact": "depth_charts_2026.parquet",
                    "corroborated": False, "corroborated_by": [],
                    "note": "depth-chart snapshot diff; not a coach statement",
                })
        return out

    # Newest-first scan: report the most recent snapshot pair that actually moved.
    # An empty diff on the very last pair is a real (and common) outcome and is
    # reported explicitly rather than silently producing zero records.
    chosen = None
    for i in range(len(dts) - 1, 0, -1):
        pair = _pair_moves(df[df["dt"] == dts[i - 1]], df[df["dt"] == dts[i]])
        if pair:
            chosen = (dts[i - 1], dts[i], pair)
            break

    if chosen is None:
        moves.append({
            "signal_id": "local-depth_chart_move-no-change",
            "signal_type": "depth_chart_move",
            "team": "", "player": "", "generated_utc": generated_utc,
            "provenance": prov, "evidence_excerpt": "",
            "position": "", "pos_slot": "", "move_type": "no_change_detected",
            "old_rank": None, "new_rank": None, "rank_delta": None,
            "snapshot_prev_utc": dts[0], "snapshot_cur_utc": dts[-1],
            "source_artifact": "depth_charts_2026.parquet",
            "corroborated": False, "corroborated_by": [],
            "n_snapshots": len(dts),
            "note": f"no rank/add/remove change in ANY of the {len(dts) - 1} snapshot pairs "
                    "in this artifact",
        })
        gaps.append({
            "metric": "depth_chart_move",
            "status": "no_change",
            "reason": f"artifact holds {len(dts)} snapshots ({dts[0]} .. {dts[-1]}) with no "
                      "rank changes between any adjacent pair; a depth-chart move signal "
                      "cannot be produced from it. Needs a fresher snapshot or the live "
                      "ESPN depth-chart endpoint.",
        })
        return moves, gaps

    prev_dt, cur_dt, pair = chosen
    # split the truncation budget across teams by absolute rank change
    per_team: dict = {}
    for rec in pair:
        per_team.setdefault(rec["team"], []).append(rec)
    truncated = {}
    for team, recs in per_team.items():
        recs.sort(key=lambda r: -abs(r["rank_delta"] or 0))
        moves.extend(recs[:max_moves_per_team])
        if len(recs) > max_moves_per_team:
            truncated[team] = len(recs)
    if truncated:
        moves.append({
            "signal_id": "local-depth_chart_move-truncation-note",
            "signal_type": "depth_chart_move",
            "team": "", "player": "", "generated_utc": generated_utc,
            "provenance": prov, "evidence_excerpt": "",
            "position": "", "pos_slot": "", "move_type": "truncation_note",
            "old_rank": None, "new_rank": None, "rank_delta": None,
            "snapshot_prev_utc": prev_dt, "snapshot_cur_utc": cur_dt,
            "source_artifact": "depth_charts_2026.parquet",
            "corroborated": False, "corroborated_by": [],
            "note": f"per-team cap {max_moves_per_team} kept the largest rank changes; "
                    f"teams over cap: {truncated}",
        })
    # A move found only in an older pair is stale relative to the artifact head.
    if cur_dt != dts[-1]:
        gaps.append({
            "metric": "depth_chart_move",
            "status": "stale",
            "reason": f"the newest snapshot pair ({dts[-2]} .. {dts[-1]}) has no changes; "
                      f"moves shown are from the older pair {prev_dt} .. {cur_dt}. "
                      "Treat them as historical, not as this week's moves.",
        })
    return moves, gaps


def _spot_layer(week: int, generated_utc: str, prov_by_name: dict,
                byes_current=None, byes_next=None) -> list:
    """pre_bye / post_bye spot patterns from schedule.csv + the ESPN bye list.

    ``byes_current`` / ``byes_next`` are the authoritative team abbreviations the
    live layer read from the ESPN scoreboard; they are the only source allowed to
    assert a bye for a week the local schedule artifact does not cover.
    """
    path = LOCAL_DATA_DIR / "schedule.csv"
    rows = read_csv_rows(path)
    prov = prov_by_name.get("schedule") or artifact_prov(
        path, "schedule_csv_v1", "medium",
        "season schedule; bye weeks inferred from the absence of a week row",
        generated_utc=generated_utc)
    played: dict = {}
    for r in rows:
        if _int(r.get("season")) != SEASON:
            continue
        team = (r.get("team") or "").strip()
        w = _int(r.get("week"))
        if team and w is not None:
            played.setdefault(team, {})[w] = (r.get("opponent") or "").strip()
    covered_weeks = sorted({w for d in played.values() for w in d})
    week_covered = bool(covered_weeks) and covered_weeks[0] <= week <= covered_weeks[-1]
    out = []
    for team in sorted(played):
        wk = played[team]
        flags = []
        # A bye can only be inferred for weeks the artifact actually covers.
        # Deriving "on bye" from a schedule slice that ends at week 3 would be
        # an invented fact, so an uncovered week is reported as unverified.
        next_opp = wk.get(week + 1)
        this_opp = wk.get(week)
        if week_covered:
            if this_opp is not None and next_opp is None and (week + 1) in covered_weeks:
                flags.append("pre_bye")
            if this_opp is None and next_opp is not None:
                flags.append("post_bye")
            if this_opp is None and week in covered_weeks:
                flags.append("on_bye")
        authoritative = False
        if team in set(byes_current or []):
            flags = [f for f in flags if f != "on_bye"] + ["on_bye_authoritative"]
            authoritative = True
        elif team in set(byes_next or []):
            flags = [f for f in flags if f != "post_bye"] + ["post_bye_authoritative"]
            authoritative = True
        if not week_covered and not authoritative:
            flags = []
        out.append({
            "signal_id": f"local-spot_pattern-{team}",
            "signal_type": "spot_pattern",
            "team": team,
            "player": "",
            "generated_utc": generated_utc,
            "provenance": prov,
            "evidence_excerpt": "",
            "week": week,
            "opponent": this_opp or "",
            "next_opponent": next_opp or "",
            "flags": flags,
            "pre_bye": "pre_bye" in flags,
            "post_bye": "post_bye" in flags or "post_bye_authoritative" in flags,
            "on_bye": "on_bye" in flags or "on_bye_authoritative" in flags,
            "bye_authoritative": authoritative,
            "schedule_weeks_covered": covered_weeks,
            "status": "ok" if (week_covered or authoritative) else "insufficient_schedule_coverage",
            "unverified": not (week_covered or authoritative),
            "unverified_reason": "" if (week_covered or authoritative) else
                                 f"schedule.csv covers weeks {covered_weeks} only; bye flags for week "
                                 f"{week} cannot be derived from it without the ESPN bye list",
            "note": "bye position from the local schedule artifact; opponent strength not scored here",
        })
    return out


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------
def build_local_signals(week: int, generated_utc: str, season: int = SEASON,
                        data_dir: Path | None = None,
                        max_moves_per_team: int = 8,
                        byes_current=None, byes_next=None) -> dict:
    """Build every locally-derived signal family. Returns records + gaps + manifest.

    No network access happens here; callers own the request budget.
    """
    global LOCAL_DATA_DIR
    if data_dir is not None:
        LOCAL_DATA_DIR = Path(data_dir)
    artifacts = {
        "weekly_tendencies": LOCAL_DATA_DIR / "weekly_tendencies.csv",
        "off_tendencies": LOCAL_DATA_DIR / "off_tendencies.csv",
        "timeouts": LOCAL_DATA_DIR / "timeouts.csv",
        "sequencing": LOCAL_DATA_DIR / "sequencing.csv",
        "adjustments": LOCAL_DATA_DIR / "adjustments.csv",
        "schedule": LOCAL_DATA_DIR / "schedule.csv",
        "depth_charts": LOCAL_DATA_DIR / "depth_charts_2026.parquet",
        "play_by_play": LOCAL_DATA_DIR / "play_by_play_2026.parquet",
    }
    manifest = []
    for name, path in artifacts.items():
        row = {
            "name": name,
            "path": str(path),
            "exists": path.exists(),
            "bytes": path.stat().st_size if path.exists() else None,
            "sha256": sha256_of(path) if path.exists() else "",
            "unverified": not path.exists(),
            "unverified_reason": "" if path.exists() else "artifact not present in this checkout",
        }
        manifest.append(row)

    gaps = []
    if not artifacts["weekly_tendencies"].exists():
        gaps.append({"metric": "scheme_shift / tendency_break (weekly series)",
                     "status": "unavailable",
                     "reason": "weekly_tendencies.csv not present; recompute with the coaching lane"})
    for name in ("off_tendencies", "timeouts", "sequencing", "adjustments", "schedule"):
        if not artifacts[name].exists():
            gaps.append({"metric": f"local artifact {name}",
                         "status": "unavailable",
                         "reason": f"{artifacts[name]} not present"})

    scheme, tendency = _weekly_tendency_layer(week, generated_utc, {})
    tend_seq = _sequencing_layer(week, generated_utc, {})
    tend_adj, adj_week = _adjustments_layer(week, generated_utc, {})
    timeouts = _timeout_layer(week, generated_utc, {})
    fd = _fourth_down_layer(week, generated_utc, {})
    snap, targets, fd_week, to_pbp, pbp_gaps = _pbp_layer(week, generated_utc, {},
                                                          max_moves_per_team=max_moves_per_team)
    moves, dc_gaps = _depth_chart_layer(generated_utc, {}, max_moves_per_team=max_moves_per_team)
    spots = _spot_layer(week, generated_utc, {},
                        byes_current=byes_current, byes_next=byes_next)
    gaps.extend(pbp_gaps)
    gaps.extend(dc_gaps)

    # Coverage gaps: artifacts that exist but cover only part of the league/week.
    to_path = artifacts["timeouts"]
    to_rows = read_csv_rows(to_path)
    to_teams = {(r.get("team") or "").strip() for r in to_rows
                if _int(r.get("season")) == SEASON}
    to_teams.discard("")
    if to_rows and len(to_teams) < 32:
        gaps.append({
            "metric": "timeout_usage",
            "status": "partial_coverage",
            "reason": f"timeouts.csv covers {len(to_teams)} of 32 teams for season {SEASON}; "
                      "the other teams have no timeout row in this artifact",
        })
    sch_rows = read_csv_rows(artifacts["schedule"])
    sch_weeks = sorted({_int(r.get("week")) for r in sch_rows
                        if _int(r.get("season")) == SEASON and _int(r.get("week")) is not None})
    if sch_weeks and week not in sch_weeks:
        gaps.append({
            "metric": "spot_pattern (pre_bye / post_bye)",
            "status": "partial_coverage",
            "reason": f"schedule.csv covers 2026 weeks {sch_weeks}; week {week} is outside that "
                      "range, so local pre/post-bye inference is unavailable for this week "
                      "(ESPN bye lists are used for the authoritative flags instead)",
        })

    all_signals = {
        "scheme_shift": scheme,
        "tendency_break": tendency + tend_seq + tend_adj,
        "snap_trend_break": snap,
        "fourth_down_trend": fd + fd_week,
        "timeout_usage": timeouts + to_pbp,
        "target_trend_break": targets,
        "depth_chart_move": moves,
        "spot_pattern": spots,
    }
    counts = {k: len(v) for k, v in all_signals.items()}
    return {
        "generated_utc": generated_utc,
        "week": week,
        "season": season,
        "artifacts": manifest,
        "gaps": gaps,
        "counts": counts,
        "signals": all_signals,
        "adjustments_week_used": adj_week,
    }
