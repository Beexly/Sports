#!/usr/bin/env python3
"""
produce_sea_den_edges.py — Bulk Situational Graph Edge Producer for 2026_06_SEA_DEN.

Enforces fail-closed PIT discipline:
- Every dynamic edge must carry both `as_of` and `visible_at`.
- `visible_at` must be <= KICKOFF_MINUS_90M_UTC ("2026-10-15T22:45:00Z"), or `None` for
  timeless structural/venue facts. Any edge with a missing stamp (where required) or
  a stamp after `2026-10-15T22:45:00Z` is refused and counted in `diagnostics.failed_closed`.
- Preserves the shipped `instances/2026-week06-sea-at-den.json` v1 baseline (for v1 pinned
  contract tests) while writing the full 60+ edge live situational graph to:
    - `intelligence/situational-graph/instances/2026-week06-sea-at-den-live.json`
    - `introspection/graphs/2026_06_SEA_DEN.json`
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

PKG = Path(__file__).resolve().parent
REPO = PKG.parents[1]
sys.path.insert(0, str(PKG))

import graph as graph_mod  # noqa: E402

GAME_ID = "2026_06_SEA_DEN"
KICKOFF_UTC = "2026-10-16T00:15:00Z"
CUTOFF_UTC = "2026-10-15T22:45:00Z"  # kickoff - 90m


def _parse_iso(ts: str | None) -> datetime | None:
    if not ts:
        return None
    s = str(ts).strip()
    if len(s) == 10 and s[4] == "-" and s[7] == "-":
        s = s + "T00:00:00+00:00"
    elif s.endswith("Z"):
        s = s[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(s)
        return dt.astimezone(timezone.utc) if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


CUTOFF_DT = _parse_iso(CUTOFF_UTC)


def build_sea_den_live_graph() -> dict:
    registry = graph_mod.load_registry(PKG / "edge_types.json")
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    nodes: dict[str, dict] = {}
    edges: list[dict] = []
    failed_closed: Counter = Counter()
    honest_empty: list[dict] = []

    def add_node(node_id: str, kind: str, **attrs):
        if node_id not in nodes:
            nodes[node_id] = {"id": node_id, "kind": kind, **attrs}

    def add_edge(
        edge_id: str,
        etype: str,
        from_id: str,
        to_id: str,
        value: dict,
        source_kind: str,
        source_ref: str,
        as_of: str | None,
        timeless: bool = False,
    ) -> bool:
        if not timeless:
            if not as_of:
                failed_closed[f"{etype}_missing_visible_at"] += 1
                return False
            dt = _parse_iso(as_of)
            if dt is None or (CUTOFF_DT and dt > CUTOFF_DT):
                failed_closed[f"{etype}_after_cutoff_90m"] += 1
                return False
        edges.append({
            "id": edge_id,
            "type": etype,
            "from": from_id,
            "to": to_id,
            "game": GAME_ID,
            "value": value,
            "source": {"kind": source_kind, "ref": source_ref},
            "as_of": as_of,
            "visible_at": as_of,
        })
        return True

    # Base nodes
    add_node("game:2026_06_SEA_DEN", "game", gameday="2026-10-15", kickoff_utc=KICKOFF_UTC,
             cutoff_utc=CUTOFF_UTC, away_team="SEA", home_team="DEN", roof="outdoors", surface="grass")
    add_node("team:SEA", "team", code="SEA", name="Seattle Seahawks")
    add_node("team:DEN", "team", code="DEN", name="Denver Broncos")
    add_node("venue:DEN", "venue", team="DEN", name="Empower Field at Mile High", elevation_ft=5280)
    add_node("week:2026-06", "week", season=2026, week=6)
    for st in ("SHORT_WEEK", "ALTITUDE_VISIT", "THURSDAY_GAME", "DISRUPTION"):
        add_node(f"state:{st}", "state", state=st)

    # 1. Structural & State Edges (9)
    add_edge("participates_in:2026_06_SEA_DEN:team:DEN->game:2026_06_SEA_DEN", "participates_in",
             "team:DEN", "game:2026_06_SEA_DEN", {"role": "home"}, "schedule", "data/gse-dataset/games.jsonl", None, timeless=True)
    add_edge("participates_in:2026_06_SEA_DEN:team:SEA->game:2026_06_SEA_DEN", "participates_in",
             "team:SEA", "game:2026_06_SEA_DEN", {"role": "away"}, "schedule", "data/gse-dataset/games.jsonl", None, timeless=True)
    add_edge("hosted_at:2026_06_SEA_DEN:game:2026_06_SEA_DEN->venue:DEN", "hosted_at",
             "game:2026_06_SEA_DEN", "venue:DEN", {}, "schedule", "data/gse-dataset/games.jsonl", None, timeless=True)
    add_edge("in_week:2026_06_SEA_DEN:game:2026_06_SEA_DEN->week:2026-06", "in_week",
             "game:2026_06_SEA_DEN", "week:2026-06", {}, "schedule", "data/gse-dataset/games.jsonl", None, timeless=True)
    add_edge("has_state:2026_06_SEA_DEN:team:DEN->state:SHORT_WEEK", "has_state",
             "team:DEN", "state:SHORT_WEEK", {"rest_days": 4, "basis": "days between games <= 5"},
             "schedule", "data/gse-dataset/games.jsonl", "2026-10-11T23:59:00Z")
    add_edge("has_state:2026_06_SEA_DEN:team:SEA->state:SHORT_WEEK", "has_state",
             "team:SEA", "state:SHORT_WEEK", {"rest_days": 4, "basis": "days between games <= 5"},
             "schedule", "data/gse-dataset/games.jsonl", "2026-10-11T23:59:00Z")
    add_edge("has_state:2026_06_SEA_DEN:team:DEN->state:THURSDAY_GAME", "has_state",
             "team:DEN", "state:THURSDAY_GAME", {"basis": "gameday is a Thursday"},
             "schedule", "data/gse-dataset/games.jsonl", None, timeless=True)
    add_edge("has_state:2026_06_SEA_DEN:team:SEA->state:THURSDAY_GAME", "has_state",
             "team:SEA", "state:THURSDAY_GAME", {"basis": "gameday is a Thursday"},
             "schedule", "data/gse-dataset/games.jsonl", None, timeless=True)
    add_edge("has_state:2026_06_SEA_DEN:team:SEA->state:ALTITUDE_VISIT", "has_state",
             "team:SEA", "state:ALTITUDE_VISIT", {"venue_elevation_ft": 5280},
             "venue_static", "intelligence/situational-graph/inputs/venues.json", None, timeless=True)

    # 2. Rest, Altitude, Circadian & Travel Friction (5)
    add_edge("rest_differential:2026_06_SEA_DEN:team:DEN->team:SEA", "rest_differential",
             "team:DEN", "team:SEA",
             {"rest_away_days": 4, "rest_home_days": 4, "rest_diff_home_minus_away": 0,
              "away_prev_gameday": "2026-10-11", "home_prev_gameday": "2026-10-11"},
             "schedule", "data/gse-dataset/games.jsonl (C-020)", "2026-10-11T23:59:00Z")
    add_edge("altitude:2026_06_SEA_DEN:team:SEA->venue:DEN", "altitude",
             "team:SEA", "venue:DEN",
             {"venue_elevation_ft": 5280, "at_altitude": True, "threshold_ft": 4000, "city": "Denver, CO"},
             "venue_static", "intelligence/situational-graph/inputs/venues.json", None, timeless=True)
    add_edge("altitude_short_week:2026_06_SEA_DEN:team:SEA->game:2026_06_SEA_DEN", "altitude_short_week",
             "team:SEA", "game:2026_06_SEA_DEN",
             {"venue_elevation_ft": 5280, "visitor_rest_days": 4, "home_rest_days": 4,
              "basis": "visitor at altitude on a short week (zero acclimatization window)"},
             "derived", "altitude + rest_differential inputs (C-022)", "2026-10-11T23:59:00Z")
    add_edge("circadian_travel_friction:2026_06_SEA_DEN:team:SEA->venue:DEN", "circadian_travel_friction",
             "team:SEA", "venue:DEN",
             {"tz_delta_hours": 1, "travel_miles": 1021.4, "surface_transition": "FieldTurf (SEA W5) -> natural grass (DEN W6)",
              "days_rest": 4, "body_clock_kickoff_local": "17:15 PT / 18:15 MT"},
             "schedule", "data/gse-dataset/games.jsonl + venues.json (C-019, C-195)", "2026-10-11T23:59:00Z")
    add_edge("circadian_travel_friction:2026_06_SEA_DEN:team:DEN->venue:DEN", "circadian_travel_friction",
             "team:DEN", "venue:DEN",
             {"tz_delta_hours": 1, "travel_miles": 831.0, "surface_transition": "MatrixTurf dome (LAC W5) -> natural grass outdoors (DEN W6)",
              "days_rest": 4, "body_clock_kickoff_local": "18:15 MT (returned from Inglewood CA Sunday)"},
             "schedule", "data/gse-dataset/games.jsonl + venues.json (C-019, C-195)", "2026-10-11T23:59:00Z")

    # 3. Weather & Air-Density Physics (1)
    add_edge("weather_extreme:2026_06_SEA_DEN:venue:DEN->game:2026_06_SEA_DEN", "weather_extreme",
             "venue:DEN", "game:2026_06_SEA_DEN",
             {"temp_f": 52.5, "temp_c": 11.4, "wind_mph": 6.5, "precip": 0.0,
              "surface_pressure_hpa": 853.9, "relative_humidity_pct": 43,
              "air_density_kg_m3": 1.0454, "sea_level_standard_rho": 1.2250,
              "air_density_reduction_pct": 14.66, "extreme_flags": ["LOW_AIR_DENSITY_ALTITUDE"]},
             "forecast", "Open-Meteo forecast for Denver CO (39.739N, -104.985W, 853.9 hPa) (C-014, C-182)",
             "2026-10-15T21:00:00Z")

    # 4. Stamped Injury Designations & Team Injury Burden — read dynamically from injury_timestamped.jsonl
    pos_w = {"QB": 2.5, "T": 1.2, "G": 1.2, "C": 1.2, "OL": 1.2, "DE": 1.0, "DT": 1.0, "NT": 1.0,
             "CB": 0.8, "S": 0.8, "FS": 0.8, "SS": 0.8, "DB": 0.8, "WR": 0.7, "TE": 0.7, "LB": 0.6, "RB": 0.5}
    stat_w = {"Out": 1.0, "Injured Reserve": 1.0, "Doubtful": 0.75, "Questionable": 0.25}
    inj_jsonl = REPO / "artifacts" / "forcing" / "injury_timestamped.jsonl"
    raw_inj = [json.loads(line) for line in open(inj_jsonl, encoding="utf-8") if line.strip()]
    latest_inj: dict[tuple[str, str], dict] = {}
    for r in raw_inj:
        if r.get("team") in ("SEA", "DEN"):
            latest_inj[(r["team"], r["full_name"])] = r

    den_contribs, sea_contribs = [], []
    den_burden, sea_burden = 0.0, 0.0
    for (team, name), r in sorted(latest_inj.items()):
        pid = str(r.get("player_id") or name.lower().replace(" ", "_"))
        pos = str(r.get("position") or "")
        status = str(r.get("report_status") or "")
        itype = r.get("injury_type")
        obs = str(r.get("observed_at") or "")
        if obs.endswith("+00:00"):
            obs = obs[:19] + "Z"
        b_wt = pos_w.get(pos, 0.5) * stat_w.get(status, 0.0)
        pnode = f"player:{pid}"
        add_node(pnode, "player", name=name, team=team, position=pos, player_id=pid)
        add_edge(
            f"injury_designation:2026_06_SEA_DEN:{pnode}->game:2026_06_SEA_DEN",
            "injury_designation", pnode, "game:2026_06_SEA_DEN",
            {"team": team, "player_name": name, "position": pos, "report_status": status,
             "injury_type": itype, "burden_weight": round(b_wt, 3)},
            "injury_report", f"artifacts/forcing/injury_timestamped.jsonl ({r.get('source')}) (C-015)", obs
        )
        entry = {"player": pnode, "name": name, "position": pos, "status": status, "weight": round(b_wt, 3), "as_of": obs}
        if team == "DEN":
            den_contribs.append(entry)
            den_burden += b_wt
        else:
            sea_contribs.append(entry)
            sea_burden += b_wt

    den_max_obs = max((c["as_of"] for c in den_contribs), default="2026-10-14T23:56:00Z")
    sea_max_obs = max((c["as_of"] for c in sea_contribs), default="2026-10-15T01:42:00Z")
    add_edge("injury_burden:2026_06_SEA_DEN:team:DEN->game:2026_06_SEA_DEN", "injury_burden",
             "team:DEN", "game:2026_06_SEA_DEN",
             {"burden": round(den_burden, 3), "contributors": den_contribs, "weight_table": "ril-v1 (pos x status)"},
             "injury_report", "artifacts/forcing/injury_timestamped.jsonl (C-015, C-043)", den_max_obs)
    add_edge("injury_burden:2026_06_SEA_DEN:team:SEA->game:2026_06_SEA_DEN", "injury_burden",
             "team:SEA", "game:2026_06_SEA_DEN",
             {"burden": round(sea_burden, 3), "contributors": sea_contribs, "weight_table": "ril-v1 (pos x status)"},
             "injury_report", "artifacts/forcing/injury_timestamped.jsonl (C-015, C-043)", sea_max_obs)

    # 5. Depth Chart Replacement Chains (6)
    replacements = [
        ("DEN", "Base 3-4 D LCB (slot 8)", "00-0036874", "Pat Surtain II", "Out",
         "00-0040720", "Jahdae Barron", "CB",
         "Rookie Jahdae Barron elevates to LCB1; eliminates Vance Joseph's single-side lock on JSN/Kupp and forces safety help over top."),
        ("DEN", "Base 3-4 D SS (slot 9)", "00-0036564", "Talanoa Hufanga", "Out",
         "00-0038605", "JL Skinner", "S",
         "JL Skinner replaces Hufanga at strong safety alongside FS Brandon Jones, degrading late-rotation disguise and box run-fit tackle reliability."),
        ("DEN", "Base 3-4 D RCB (slot 11)", "00-0038552", "Riley Moss", "Questionable",
         "00-0039371", "Kris Abrams-Draine", "CB",
         "Riley Moss (ribs) playing impaired or ceding boundary snaps to Kris Abrams-Draine leaves both outside corner spots vulnerable to double-moves and play-action."),
        ("DEN", "3WR 1TE LG (slot 4)", "00-0034978", "Ben Powers", "Injured Reserve",
         "00-0041498", "Kage Casey", "G",
         "Kage Casey replaces LG1 Ben Powers inside against Seattle's interior rotation (Leonard Williams / Byron Murphy II / Jarran Reed)."),
        ("SEA", "3WR 1TE RB (slot 11)", "00-0039165", "Zach Charbonnet", "Out",
         "00-0038797", "Emanuel Wilson", "RB",
         "With Charbonnet OUT (ACL), Emanuel Wilson (17.12 proj carries) and George Holani (5.80 proj carries, 2.17 targets) absorb early-down and 3rd-down pass-pro work."),
        ("SEA", "Base 3-4 D LILB (slot 5)", "00-0038922", "Drake Thomas", "Out",
         "00-0039815", "Tyrice Knight", "LB",
         "With LILB1 Drake Thomas OUT (knee) and Chazz Surratt on IR, Tyrice Knight steps in next to Ernest Jones IV, testing green-dot communication and RB checkdown coverage vs RJ Harvey/Engram."),
    ]
    for team, slot, s_id, s_name, s_stat, r_id, r_name, pos, conseq in replacements:
        s_node = f"player:{s_id}"
        r_node = f"player:{r_id}"
        add_node(s_node, "player", name=s_name, team=team, position=pos, gsis_id=s_id)
        add_node(r_node, "player", name=r_name, team=team, position=pos, gsis_id=r_id)
        add_edge(
            f"depth_chart_replacement:2026_06_SEA_DEN:{s_node}->{r_node}",
            "depth_chart_replacement", s_node, r_node,
            {"team": team, "slot": slot, "starter_name": s_name, "replacement_name": r_name,
             "starter_status": s_stat, "consequence": conseq},
            "dataset", "intelligence/coaching/data/depth_charts_2026.parquet (dt=2026-10-14T12:51:31Z) (C-024, C-075, C-189)",
            "2026-10-14T22:19:00Z"
        )

    # 6. Coaching Continuity & Stamped Tendency Edges (10)
    add_edge("coaching_change:2026_06_SEA_DEN:team:DEN->game:2026_06_SEA_DEN", "coaching_change",
             "team:DEN", "game:2026_06_SEA_DEN",
             {"role": "DC", "name": "Vance Joseph", "seasons_with_team": [2023, 2024, 2025, 2026], "changed_this_season": False},
             "repo_doc", "intelligence/coaching/coach_tenures.py (C-050)", "2026-10-01T00:00:00Z")

    tendencies = [
        ("SEA", "proe_early_neutral", -0.013704, "SEA early-down neutral PROE -1.37% (actual pass rate 40.82% vs expected 50.30%, n=49)"),
        ("DEN", "proe_early_neutral", 0.008412, "DEN early-down neutral PROE +0.84% (payton screen/quick-game extension of run game)"),
        ("SEA", "tempo_pace_median_sec", 40.0, "SEA neutral pace median 40.0s, hurry-up rate 28.57% (n=138 diffs)"),
        ("DEN", "tempo_pace_median_sec", 38.5, "DEN neutral pace median 38.5s at home altitude"),
        ("SEA", "script_elasticity_beta", -0.7249, "SEA pass-rate script elasticity beta = -0.7249 (sharp pass shift when trailing, n=140)"),
        ("DEN", "script_elasticity_beta", -0.6120, "DEN pass-rate script elasticity beta = -0.6120"),
        ("SEA", "redzone_pass_rate", 0.4615, "SEA red-zone pass rate 46.15% (rz_proe -1.99%, goal-to-go pass rate 38.1%, n=39)"),
        ("DEN", "def_3rd_short_pressure_proxy", 0.3636, "DEN 3rd-and-short defensive pressure proxy 36.36% (Vance Joseph simulated/blitz pressure)"),
        ("SEA", "def_pressure_proxy_overall", 0.2593, "SEA defensive pressure proxy 25.93% (qbhit 19.44%, sack 6.48% on 108 dropbacks)"),
    ]
    for team, facet, val, desc in tendencies:
        add_edge(
            f"coaching_tendency:2026_06_SEA_DEN:team:{team}:{facet}",
            "coaching_tendency", f"team:{team}", "game:2026_06_SEA_DEN",
            {"facet": facet, "team": team, "scalar_value": val, "description": desc,
             "vintage": "2026-10-02 (sha256:ad20b929)"},
            "dataset", "intelligence/coaching/data/vintage-2026-10-02.json (C-050, C-052, C-060)",
            "2026-10-02T17:52:51Z"
        )

    # 7. SAI Walk-Forward Situational Scalars (8)
    sai_scalars = [
        ("SEA", "SPESE", 0.132873, "2026_05_SF_SEA", "SCREENED-SURVIVED (pre-registration slot PRJ-1)"),
        ("DEN", "SPESE", 0.155436, "2026_05_DEN_LAC", "SCREENED-SURVIVED (pre-registration slot PRJ-1)"),
        ("SEA", "OLCAI", 0.146833, "2026_05_SF_SEA", "SCREENED-KILLED-REDUNDANT (shadow context)"),
        ("DEN", "OLCAI", 0.480456, "2026_05_DEN_LAC", "SCREENED-KILLED-REDUNDANT (shadow context; elevated OL attrition)"),
        ("SEA", "SWCC", 0.0, "2026_05_SF_SEA", "REFUSED-PRIOR (shadow context)"),
        ("DEN", "SWCC", 0.154725, "2026_05_DEN_LAC", "REFUSED-PRIOR (shadow context)"),
        ("DEN", "QPTSR", 0.131357, "2026_04_DEN_SF", "SCREENED-KILLED (shadow context: Nix quick-pressure-to-sack residual)"),
        ("SEA", "CAOFI", 1.258870, "2026_03_SEA_WAS", "SCREENED-KILLED (shadow context: circadian/altitude friction baseline)"),
    ]
    for team, metric, val, pgame, disp in sai_scalars:
        add_edge(
            f"sai_situational_scalar:2026_06_SEA_DEN:team:{team}:{metric}",
            "sai_situational_scalar", f"team:{team}", "game:2026_06_SEA_DEN",
            {"metric": metric, "team": team, "scalar_value": val, "prior_week_game": pgame, "disposition": disp},
            "dataset", "dfs/walk_forward/sai_features_2026-10-15.jsonl (C-190..C-195)",
            "2026-10-11T23:59:00Z"
        )

    # 8. Market Microstructure, Line Movement & Hold Dispersion (6)
    add_edge("line_movement:2026_06_SEA_DEN:spread", "line_movement",
             "team:DEN", "game:2026_06_SEA_DEN",
             {"market_type": "SPREAD", "open_line": 2.5, "latest_line": 2.5, "net_drift": 0.0,
              "kalshi_strike_2_5_bid_ask": [0.47, 0.50], "earliest_observed_at": "2026-10-15T18:13:47Z",
              "t0_72h_forecast_status": "MISSING (earliest_observed_at=2026-10-15T18:13:47Z, 6.0h before kickoff; 72h T0 window not captured)"},
             "dataset", "research/archiver-pathshape/features_2026-10-15.jsonl + artifacts/forcing/odds.jsonl (C-009, C-010)",
             "2026-10-15T20:20:32Z")
    add_edge("line_movement:2026_06_SEA_DEN:total", "line_movement",
             "team:DEN", "game:2026_06_SEA_DEN",
             {"market_type": "TOTAL", "open_line": 40.5, "latest_line": 40.5, "net_drift": 0.0,
              "kalshi_strike_40_5_bid_ask": [0.51, 0.53], "earliest_observed_at": "2026-10-15T18:13:47Z",
              "t0_72h_forecast_status": "MISSING (earliest_observed_at=2026-10-15T18:13:47Z)"},
             "dataset", "research/archiver-pathshape/features_2026-10-15.jsonl + artifacts/forcing/odds.jsonl (C-009, C-010)",
             "2026-10-15T20:20:32Z")
    add_edge("line_movement:2026_06_SEA_DEN:moneyline", "line_movement",
             "team:DEN", "game:2026_06_SEA_DEN",
             {"market_type": "MONEYLINE", "open_line": 120.0, "latest_line": 120.0, "net_drift": 0.0,
              "kalshi_den_yes_bid_ask": [0.45, 0.46], "kalshi_sea_yes_bid_ask": [0.55, 0.56],
              "earliest_observed_at": "2026-10-15T18:13:47Z"},
             "dataset", "artifacts/forcing/odds.jsonl (KXNFLGAME-26OCT15SEADEN) (C-113)",
             "2026-10-15T21:19:03Z")
    add_edge("market_hold_dispersion:2026_06_SEA_DEN:dk_main", "market_hold_dispersion",
             "team:DEN", "game:2026_06_SEA_DEN",
             {"bookmaker": "DraftKings", "market_type": "MAIN_SPREAD_TOTAL_ML",
              "overround_or_spread": 0.04753, "total_hold": 0.04708, "ml_hold": 0.04132,
              "line_value": 2.5, "spread_juice_home_away": [-108, -112], "total_juice_over_under": [-115, -105]},
             "dataset", "research/product_breakeven_results_2026-10-15.json (C-036, C-113)",
             "2026-10-15T18:29:17Z")
    add_edge("market_hold_dispersion:2026_06_SEA_DEN:dk_alt_ladder", "market_hold_dispersion",
             "team:DEN", "game:2026_06_SEA_DEN",
             {"bookmaker": "DraftKings", "market_type": "ALT_SPREAD_KEY_RUNGS",
              "overround_or_spread": 0.07069, "line_value": 3.5,
              "n_ladder_rows": 178, "keyset_joint_crps_equiv": 0.003841},
             "dataset", "research/product_breakeven_results_2026-10-15.json (C-036)",
             "2026-10-15T18:29:17Z")
    add_edge("market_hold_dispersion:2026_06_SEA_DEN:kalshi_vs_dk_dispersion", "market_hold_dispersion",
             "team:DEN", "game:2026_06_SEA_DEN",
             {"bookmaker": "Kalshi_vs_DraftKings", "market_type": "CROSS_VENUE_DISPERSION",
              "overround_or_spread": 0.0135, "line_value": -2.5,
              "dk_sea_devig_win_share": 0.5635, "kalshi_sea_mid_share": 0.5550,
              "dk_spread_2_5_juice_asymmetry": "SEA -2.5 (-112) vs DEN +2.5 (-108); total 40.5 Over -115 / Under -105"},
             "derived", "artifacts/forcing/odds.jsonl + espn_scoreboard_odds_latest.json (C-091, C-113)",
             "2026-10-15T21:19:03Z")

    # 9. Receiver Tracking & Target Share Context (4)
    tracking_rows = [
        ("SEA", "00-0038543", "Jaxon Smith-Njigba", "WR", "sleeper_proj_targets_and_espn_tracking", 9.93,
         {"proj_rec_tgt": 9.93, "proj_rec": 6.54, "proj_rec_yd": 98.75, "injury_status": "Questionable"}),
        ("SEA", "00-0033908", "Cooper Kupp", "WR", "sleeper_proj_targets_and_espn_tracking", 3.75,
         {"proj_rec_tgt": 3.75, "proj_rec": 2.29, "proj_rec_yd": 30.01, "espn_overall": 60.0, "espn_catch": 72.0}),
        ("SEA", "00-0037545", "Rashid Shaheed", "WR", "sleeper_proj_targets_and_espn_tracking", 3.73,
         {"proj_rec_tgt": 3.73, "proj_rec": 1.84, "proj_rec_yd": 25.22, "espn_overall": 55.0, "espn_open": 62.0}),
        ("DEN", "00-0034348", "Courtland Sutton", "WR", "sleeper_proj_targets_and_espn_tracking", 6.03,
         {"proj_rec_tgt": 6.03, "proj_rec": 2.81, "proj_rec_yd": 34.26, "espn_overall": 73.0, "espn_open": 74.0, "espn_catch": 78.0}),
    ]
    for team, pid, name, pos, mtype, val, extra in tracking_rows:
        pnode = f"player:{pid}"
        add_node(pnode, "player", name=name, team=team, position=pos, gsis_id=pid)
        add_edge(
            f"matchup_tracking_context:2026_06_SEA_DEN:{pnode}",
            "matchup_tracking_context", pnode, "game:2026_06_SEA_DEN",
            {"team": team, "player_name": name, "metric_type": mtype, "scalar_value": val, **extra},
            "dataset", "artifacts/gse_brain/espnanalytics_receivers_latest.json + sleeper_projections_wk6_latest.json (C-040, C-058)",
            "2026-10-14T13:26:57Z"
        )

    # 10. Formalized Situational Reads (4)
    add_edge("injury_context_identity:2026_06_SEA_DEN:team:DEN->game:2026_06_SEA_DEN", "injury_context_identity",
             "team:DEN", "game:2026_06_SEA_DEN",
             {"read": "Simultaneous absence of All-Pro LCB1 Pat Surtain II (ankle) and SS1 Talanoa Hufanga (ankle), with RCB1 Riley Moss questionable (ribs), strips Vance Joseph of man-blitz coverage integrity. Rookie Jahdae Barron (LCB2) and JL Skinner (SS2) force Denver out of single-high Cover-1 blitzes into two-high shell or un-protected blitz exposure.",
              "players": ["Pat Surtain II", "Talanoa Hufanga", "Riley Moss", "Jahdae Barron", "JL Skinner"]},
             "manual_read", "intelligence/situational-graph/inputs/injuries_2026_wk6_stamped.csv + depth_charts_2026.parquet (C-024)",
             "2026-10-15T15:36:00Z")
    add_edge("injury_context_identity:2026_06_SEA_DEN:team:SEA->game:2026_06_SEA_DEN", "injury_context_identity",
             "team:SEA", "game:2026_06_SEA_DEN",
             {"read": "Zach Charbonnet OUT (ACL) consolidates early-down carries onto Emanuel Wilson (17.12 proj att) and passing-down snaps onto George Holani + TE AJ Barner, while JSN (Questionable, 9.93 proj targets) faces a depleted Denver boundary without Surtain.",
              "players": ["Zach Charbonnet", "Emanuel Wilson", "George Holani", "Jaxon Smith-Njigba", "Drake Thomas", "Tyrice Knight"]},
             "manual_read", "intelligence/situational-graph/inputs/injuries_2026_wk6_stamped.csv + sleeper_projections_wk6_latest.json (C-024)",
             "2026-10-15T15:36:00Z")
    add_edge("atmosphere:2026_06_SEA_DEN:venue:DEN->game:2026_06_SEA_DEN", "atmosphere",
             "venue:DEN", "game:2026_06_SEA_DEN",
             {"read": "Thursday Night Football primetime stage at Empower Field at Mile High (5,280 ft); Seattle offense operates on silent count on 4 days rest with rookie LG Grey Zabel and C Jalen Sundell communicating against Vance Joseph's 36.4% 3rd-and-short pressure package.",
              "factors": ["TNF_primetime_silent_count", "altitude_5280ft_crowd_noise", "short_week_ol_communication"]},
             "manual_read", "data/gse-dataset/games.jsonl + intelligence/coaching/data/dc_pressure.csv (C-016)",
             "2026-10-15T15:36:00Z")
    add_edge("logistical_disruption:2026_06_SEA_DEN:team:SEA->game:2026_06_SEA_DEN", "logistical_disruption",
             "team:SEA", "game:2026_06_SEA_DEN",
             {"read": "Compressed 96-hour Sunday-to-Thursday turnaround with Wednesday travel to 5,280 ft precludes physiological hematocrit acclimatization and eliminates full-speed padded install practices.",
              "events": ["Sunday_W5_physical_divisional_vs_SF", "Wednesday_flight_to_5280ft", "Thursday_kickoff_zero_acclimatization"]},
             "manual_read", "data/gse-dataset/games.jsonl (C-018)",
             "2026-10-15T15:36:00Z")

    # Honest-empty records for templates without stamped triggers tonight
    honest_empty.extend([
        {"edge_type": "layered_revenge", "game_id": GAME_ID, "team": "SEA",
         "missing": ["multi-layer revenge trigger with pre-kickoff stamp"],
         "reason": "no multi-layer emotional/schematic revenge edge qualifies under template contract"},
        {"edge_type": "coaching_honesty", "game_id": GAME_ID, "team": "SEA",
         "missing": ["stamped coach press-conference statement log"],
         "reason": "statement-vs-observed log not populated for Week 6"},
    ])

    by_type = Counter(e["type"] for e in edges)
    doc = {
        "graph": graph_mod.GRAPH_NAME,
        "version": graph_mod.GRAPH_VERSION,
        "season": 2026,
        "week": 6,
        "game_id": GAME_ID,
        "kickoff_utc": KICKOFF_UTC,
        "pit_cutoff_utc": CUTOFF_UTC,
        "generated_at": now_iso,
        "builder": "intelligence/situational-graph/produce_sea_den_edges.py",
        "nodes": sorted(nodes.values(), key=lambda n: n["id"]),
        "edges": sorted(edges, key=lambda e: e["id"]),
        "honest_empty": honest_empty,
        "diagnostics": {
            "total_edges": len(edges),
            "total_nodes": len(nodes),
            "edges_by_type": dict(by_type),
            "failed_closed": dict(failed_closed),
            "honest_empty_count": len(honest_empty),
            "pit_rule": "visible_at <= 2026-10-15T22:45:00Z (kickoff - 90m) or timeless (None)",
        },
    }
    problems = graph_mod.validate_graph(doc, registry)
    if problems:
        raise RuntimeError(f"Graph validation failed: {problems}")
    return doc


def main() -> int:
    doc = build_sea_den_live_graph()
    out_paths = [
        PKG / "instances" / "2026-week06-sea-at-den-live.json",
        REPO / "introspection" / "graphs" / "2026_06_SEA_DEN.json",
    ]
    payload = json.dumps(doc, indent=2) + "\n"
    for p in out_paths:
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(payload, encoding="utf-8")
    print(f"produce_sea_den_edges.py: wrote {len(doc['edges'])} edges, {len(doc['nodes'])} nodes, "
          f"{len(doc['honest_empty'])} honest_empty (failed_closed={doc['diagnostics']['failed_closed']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
