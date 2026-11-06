#!/usr/bin/env python3
"""
scripts/ops/run_halftime_live_simulator.py

Dedicated 10,000-World Live Halftime (`Q3 15:00` to `Q4 0:00`) Simulator (`SG-9`).
Ingests 1H live box-score state (`score_away`, `score_home`, `1h_ypa`, `1h_plays`,
`1h_player_stats`, `pregame_published_picks`, `injury_status_map`) and enforces:
  - Rule H1 (Emergency QB White-Flag Run Clamp): If trailing team's QB is `BACKUP` /
    `EMERGENCY_QB3_UDFA` OR `1h_ypa < 4.5` with `<= 3` 1H points (e.g. Joe Fagnano
    2.4 YPA, 3 pts), override standard catch-up pass boost and clamp 2H pass rate to
    `0.34` (`30%–38%`), projecting heavy clock-bleed runs instead of fake catch-up pass volume.
  - Rule H2 (Questionable Starter Blowout Preservation): If leading team is up by `>= 10`
    points and RB1/WR1 entered `Questionable` (e.g. Bhayshul Tuten / Brian Thomas Jr.),
    decay their 2H snap/carry share by `-45%` in Q3/Q4 and shift carries/targets to healthy
    backups (`Travis Etienne` / `Bigsby`), blocking any `OVER` on the Questionable starter's
    full-game volume.
  - Rule H3 (Immutable Pregame Ledger Cross-Check): Cross-checks `pregame_published_picks`
    before generating any halftime receipt box; raises `RuntimeError("PREGAME_DIRECTION_FLIP_DETECTED")`
    if any code attempts to claim an `OVER` receipt on a player whose pregame ticket was `UNDER`
    (or vice versa).
"""
from __future__ import annotations

import json
from typing import Any, Mapping, Sequence

import numpy as np


def verify_pregame_receipt_direction_integrity(
    pregame_published_picks: Sequence[Mapping[str, Any]],
    proposed_receipt_claims: Sequence[Mapping[str, Any]] | None = None,
) -> dict[str, Any]:
    """Rule H3: Cross-check pregame published picks against halftime/postgame receipt claims.

    Raises RuntimeError("PREGAME_DIRECTION_FLIP_DETECTED") if any claim flips OVER <-> UNDER
    relative to the immutable pregame ticket.
    """
    ledger_map: dict[tuple[str, str], str] = {}
    player_only_map: dict[str, set[str]] = {}

    for pick in pregame_published_picks or []:
        player = str(pick.get("player") or pick.get("athlete") or pick.get("player_name") or "").strip().lower()
        market = str(pick.get("market") or pick.get("stat") or "generic").strip().lower()
        side = str(pick.get("direction") or pick.get("side") or pick.get("selection") or "").strip().upper()
        if "OVER" in side:
            norm_side = "OVER"
        elif "UNDER" in side:
            norm_side = "UNDER"
        else:
            continue
        if player:
            ledger_map[(player, market)] = norm_side
            player_only_map.setdefault(player, set()).add(norm_side)

    for claim in proposed_receipt_claims or []:
        player = str(claim.get("player") or claim.get("athlete") or claim.get("player_name") or "").strip().lower()
        market = str(claim.get("market") or claim.get("stat") or "generic").strip().lower()
        claimed = str(claim.get("claimed_direction") or claim.get("direction") or claim.get("side") or "").strip().upper()
        if "OVER" in claimed:
            norm_claim = "OVER"
        elif "UNDER" in claimed:
            norm_claim = "UNDER"
        else:
            continue

        pregame_dir = ledger_map.get((player, market))
        if pregame_dir is None and player in player_only_map and len(player_only_map[player]) == 1:
            pregame_dir = next(iter(player_only_map[player]))

        if pregame_dir is not None and pregame_dir != norm_claim:
            raise RuntimeError(
                f"PREGAME_DIRECTION_FLIP_DETECTED: {player} ({market}) pregame ticket was {pregame_dir} "
                f"but halftime/postgame receipt attempted to claim {norm_claim}"
            )

    return {
        "verified": True,
        "pregame_picks_checked": len(pregame_published_picks or []),
        "receipt_claims_checked": len(proposed_receipt_claims or []),
    }


def simulate_halftime_live_2h(
    state_1h: Mapping[str, Any],
    n_sims: int = 10000,
    seed: int = 42,
) -> dict[str, Any]:
    """Run 10,000-world 2nd-half (Q3 15:00 to Q4 0:00) PBP simulation enforcing Rules H1, H2, and H3."""
    # Rule H3 first: block any pregame direction flip before running or emitting receipts
    h3_audit = verify_pregame_receipt_direction_integrity(
        pregame_published_picks=state_1h.get("pregame_published_picks") or [],
        proposed_receipt_claims=state_1h.get("proposed_receipt_claims") or [],
    )

    away = str(state_1h.get("away", "JAX")).upper()
    home = str(state_1h.get("home", "BAL")).upper()
    score_away_1h = float(state_1h.get("score_away", 20.0))
    score_home_1h = float(state_1h.get("score_home", 3.0))

    ypa_map = dict(state_1h.get("1h_ypa") or {away: 7.8, home: 2.4})
    plays_1h_map = dict(state_1h.get("1h_plays") or {away: 33, home: 27})
    qb_tier_map = dict(state_1h.get("qb_tier_map") or {away: "QB1_STARTER", home: "EMERGENCY_QB3_UDFA"})
    injury_status_map = dict(state_1h.get("injury_status_map") or {})
    stats_1h = dict(state_1h.get("1h_player_stats") or {})

    away_1h_ypa = float(ypa_map.get(away, 7.2))
    home_1h_ypa = float(ypa_map.get(home, 2.4))
    away_qb_tier = str(qb_tier_map.get(away, "QB1_STARTER")).upper()
    home_qb_tier = str(qb_tier_map.get(home, "EMERGENCY_QB3_UDFA")).upper()

    # Rule H1: Emergency QB White-Flag Run Clamp
    away_trailing = score_away_1h < score_home_1h
    home_trailing = score_home_1h < score_away_1h

    away_white_flag = bool(
        away_trailing
        and (
            away_qb_tier in {"BACKUP", "QB2_BACKUP", "EMERGENCY_QB3_UDFA", "UDFA"}
            or (away_1h_ypa < 4.5 and score_away_1h <= 3.0)
        )
    )
    home_white_flag = bool(
        home_trailing
        and (
            home_qb_tier in {"BACKUP", "QB2_BACKUP", "EMERGENCY_QB3_UDFA", "UDFA"}
            or (home_1h_ypa < 4.5 and score_home_1h <= 3.0)
        )
    )

    away_2h_pass_rate = 0.34 if away_white_flag else (0.44 if (score_away_1h - score_home_1h) >= 10.0 else 0.54)
    home_2h_pass_rate = 0.34 if home_white_flag else (0.44 if (score_home_1h - score_away_1h) >= 10.0 else 0.54)

    # Rule H2: Questionable Starter Blowout Preservation (leading by >= 10 pts)
    leading_team = away if (score_away_1h - score_home_1h) >= 10.0 else (home if (score_home_1h - score_away_1h) >= 10.0 else None)
    preserved_starters: dict[str, dict[str, Any]] = {}
    for player_name, status in injury_status_map.items():
        st_upper = str(status).strip().upper()
        p_team = str((stats_1h.get(player_name) or {}).get("team", away)).upper()
        if leading_team and p_team == leading_team and st_upper in {"QUESTIONABLE", "LIMITED", "PITCH_COUNT", "Q", "LP"}:
            preserved_starters[player_name] = {
                "team": p_team,
                "injury_status": status,
                "halftime_lead": abs(score_away_1h - score_home_1h),
                "share_decay_2h": -0.45,
                "share_multiplier_2h": 0.55,
                "backup_beneficiaries": ["Travis Etienne", "Tank Bigsby"] if p_team == "JAX" else ["Justice Hill", "Keaton Mitchell"],
                "block_full_game_over": True,
            }

    rng = np.random.default_rng(seed)
    clock_2h = np.full(n_sims, 1800.0, dtype=np.float64)
    away_2h_pts = np.zeros(n_sims, dtype=np.float64)
    home_2h_pts = np.zeros(n_sims, dtype=np.float64)
    away_2h_pass_att = np.zeros(n_sims, dtype=np.int32)
    home_2h_pass_att = np.zeros(n_sims, dtype=np.int32)
    away_2h_rush_att = np.zeros(n_sims, dtype=np.int32)
    home_2h_rush_att = np.zeros(n_sims, dtype=np.int32)
    away_2h_pass_yds = np.zeros(n_sims, dtype=np.float64)
    home_2h_pass_yds = np.zeros(n_sims, dtype=np.float64)
    away_2h_rush_yds = np.zeros(n_sims, dtype=np.float64)
    home_2h_rush_yds = np.zeros(n_sims, dtype=np.float64)

    poss = rng.integers(0, 2, size=n_sims)
    for _ in range(92):
        active = clock_2h > 0.0
        if not np.any(active):
            break
        idx = np.where(active)[0]
        ps = poss[idx]
        p_pass = np.where(ps == 1, home_2h_pass_rate, away_2h_pass_rate)
        # Enforce Rule H1 clamp strictly inside [0.30, 0.38] when white-flag clamp is active
        if home_white_flag:
            p_pass = np.where(ps == 1, np.clip(p_pass, 0.30, 0.38), p_pass)
        if away_white_flag:
            p_pass = np.where(ps == 0, np.clip(p_pass, 0.30, 0.38), p_pass)

        is_pass = rng.random(len(idx)) < p_pass
        hm_pass = idx[(ps == 1) & is_pass]
        aw_pass = idx[(ps == 0) & is_pass]
        hm_run = idx[(ps == 1) & (~is_pass)]
        aw_run = idx[(ps == 0) & (~is_pass)]

        if len(hm_pass) > 0:
            home_2h_pass_att[hm_pass] += 1
            home_2h_pass_yds[hm_pass] += rng.gamma(shape=1.8, scale=max(2.0, home_1h_ypa) / 1.8, size=len(hm_pass))
        if len(aw_pass) > 0:
            away_2h_pass_att[aw_pass] += 1
            away_2h_pass_yds[aw_pass] += rng.gamma(shape=2.2, scale=max(3.5, away_1h_ypa) / 2.2, size=len(aw_pass))
        if len(hm_run) > 0:
            home_2h_rush_att[hm_run] += 1
            home_2h_rush_yds[hm_run] += rng.gamma(shape=2.0, scale=2.1, size=len(hm_run))
        if len(aw_run) > 0:
            away_2h_rush_att[aw_run] += 1
            away_2h_rush_yds[aw_run] += rng.gamma(shape=2.1, scale=2.2, size=len(aw_run))

        # Scoring hazard per snap
        p_td = np.where(ps == 1, 0.014 if home_white_flag else 0.028, 0.032)
        p_fg = np.where(ps == 1, 0.018 if home_white_flag else 0.025, 0.028)
        u_sc = rng.random(len(idx))
        td_hit = u_sc < p_td
        fg_hit = (~td_hit) & (u_sc < (p_td + p_fg))
        if np.any(td_hit):
            home_2h_pts[idx[td_hit & (ps == 1)]] += 7.0
            away_2h_pts[idx[td_hit & (ps == 0)]] += 7.0
        if np.any(fg_hit):
            home_2h_pts[idx[fg_hit & (ps == 1)]] += 3.0
            away_2h_pts[idx[fg_hit & (ps == 0)]] += 3.0

        # Possession turnover/change ~ 18% per play
        flip = rng.random(len(idx)) < 0.18
        poss[idx[flip]] = 1 - poss[idx[flip]]

        # Heavy clock bleed when white-flag run clamp or 10+ point blowout preservation is active
        pace_sec = np.where(is_pass, 23.5, 31.5)
        clock_2h[idx] -= rng.gamma(shape=35.0, scale=pace_sec / 35.0, size=len(idx))

    # Project 2H player stats with Rule H2 Questionable starter preservation (-45% decay)
    player_2h_projections: dict[str, dict[str, Any]] = {}
    for p_name, p_1h in stats_1h.items():
        p_team = str(p_1h.get("team", away)).upper()
        base_carry_sh = float(p_1h.get("carry_share", 0.30))
        base_target_sh = float(p_1h.get("target_share", 0.20))
        is_preserved = p_name in preserved_starters
        mult_2h = 0.55 if is_preserved else 1.0

        eff_carry_sh = base_carry_sh * mult_2h
        eff_target_sh = base_target_sh * mult_2h
        tm_rush_yds_2h = away_2h_rush_yds if p_team == away else home_2h_rush_yds
        tm_pass_yds_2h = away_2h_pass_yds if p_team == away else home_2h_pass_yds

        rush_1h_yds = float(p_1h.get("rush_yds_1h", 0.0))
        rec_1h_yds = float(p_1h.get("rec_yds_1h", 0.0))
        rush_2h_vec = tm_rush_yds_2h * eff_carry_sh
        rec_2h_vec = tm_pass_yds_2h * eff_target_sh

        player_2h_projections[p_name] = {
            "team": p_team,
            "rule_h2_preserved": is_preserved,
            "share_multiplier_2h": mult_2h,
            "block_full_game_over": is_preserved,
            "rush_yds_2h_mean": round(float(np.mean(rush_2h_vec)), 2),
            "rush_yds_full_game_mean": round(rush_1h_yds + float(np.mean(rush_2h_vec)), 2),
            "rec_yds_2h_mean": round(float(np.mean(rec_2h_vec)), 2),
            "rec_yds_full_game_mean": round(rec_1h_yds + float(np.mean(rec_2h_vec)), 2),
        }

    return {
        "schema": "gse_halftime_live_2h_simulation_v1",
        "matchup": f"{away} @ {home}",
        "n_sims": n_sims,
        "rule_h1_white_flag_run_clamp": {
            away: {"active": away_white_flag, "clamped_2h_pass_rate": round(away_2h_pass_rate, 3)},
            home: {"active": home_white_flag, "clamped_2h_pass_rate": round(home_2h_pass_rate, 3)},
        },
        "rule_h2_questionable_starter_blowout_preservation": preserved_starters,
        "rule_h3_immutable_pregame_ledger_check": h3_audit,
        "team_2h_summary": {
            away: {
                "score_1h": score_away_1h,
                "points_2h_mean": round(float(np.mean(away_2h_pts)), 2),
                "points_full_game_mean": round(score_away_1h + float(np.mean(away_2h_pts)), 2),
                "pass_att_2h_mean": round(float(np.mean(away_2h_pass_att)), 2),
                "rush_att_2h_mean": round(float(np.mean(away_2h_rush_att)), 2),
                "pass_yds_2h_mean": round(float(np.mean(away_2h_pass_yds)), 2),
                "rush_yds_2h_mean": round(float(np.mean(away_2h_rush_yds)), 2),
            },
            home: {
                "score_1h": score_home_1h,
                "points_2h_mean": round(float(np.mean(home_2h_pts)), 2),
                "points_full_game_mean": round(score_home_1h + float(np.mean(home_2h_pts)), 2),
                "pass_att_2h_mean": round(float(np.mean(home_2h_pass_att)), 2),
                "rush_att_2h_mean": round(float(np.mean(home_2h_rush_att)), 2),
                "pass_yds_2h_mean": round(float(np.mean(home_2h_pass_yds)), 2),
                "rush_yds_2h_mean": round(float(np.mean(home_2h_rush_yds)), 2),
            },
        },
        "player_2h_projections": player_2h_projections,
    }


def run_jax_bal_halftime_self_test() -> dict[str, Any]:
    """Self-test verifying Rules H1, H2, and H3 on the JAX @ BAL 20-3 halftime state."""
    sample_state = {
        "away": "JAX",
        "home": "BAL",
        "score_away": 20.0,
        "score_home": 3.0,
        "1h_ypa": {"JAX": 7.9, "BAL": 2.4},
        "1h_plays": {"JAX": 34, "BAL": 26},
        "qb_tier_map": {"JAX": "QB1_STARTER", "BAL": "EMERGENCY_QB3_UDFA"},
        "injury_status_map": {"Bhayshul Tuten": "Questionable", "Travis Etienne": "Active"},
        "1h_player_stats": {
            "Bhayshul Tuten": {"team": "JAX", "carry_share": 0.42, "target_share": 0.08, "rush_yds_1h": 28.0, "rec_yds_1h": 6.0},
            "Travis Etienne": {"team": "JAX", "carry_share": 0.48, "target_share": 0.14, "rush_yds_1h": 41.0, "rec_yds_1h": 18.0},
        },
        "pregame_published_picks": [
            {"player": "Jakobi Meyers", "market": "Receiving Yards", "direction": "UNDER", "line": 40.5},
            {"player": "Parker Washington", "market": "Receiving Yards", "direction": "UNDER", "line": 63.5},
        ],
        "proposed_receipt_claims": [
            {"player": "Jakobi Meyers", "market": "Receiving Yards", "claimed_direction": "UNDER"},
        ],
    }
    res = simulate_halftime_live_2h(sample_state, n_sims=10000)
    assert res["rule_h1_white_flag_run_clamp"]["BAL"]["active"] is True
    assert res["rule_h1_white_flag_run_clamp"]["BAL"]["clamped_2h_pass_rate"] == 0.34
    assert res["player_2h_projections"]["Bhayshul Tuten"]["rule_h2_preserved"] is True
    assert res["player_2h_projections"]["Bhayshul Tuten"]["block_full_game_over"] is True

    flip_blocked = False
    try:
        verify_pregame_receipt_direction_integrity(
            pregame_published_picks=sample_state["pregame_published_picks"],
            proposed_receipt_claims=[
                {"player": "Jakobi Meyers", "market": "Receiving Yards", "claimed_direction": "OVER"}
            ],
        )
    except RuntimeError as exc:
        if "PREGAME_DIRECTION_FLIP_DETECTED" in str(exc):
            flip_blocked = True
    assert flip_blocked, "Rule H3 failed to raise PREGAME_DIRECTION_FLIP_DETECTED"
    res["rule_h3_flip_blocked"] = True
    return res


if __name__ == "__main__":
    print(json.dumps(run_jax_bal_halftime_self_test(), indent=2))
