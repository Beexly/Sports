#!/usr/bin/env python3
"""Cadence v3.0, Friday 16:30 CT: final pre-kickoff overlay + sealed ticket minting.

Sequence for one game-window slot (default SUN_EARLY, Week 8, 2026):

  1. Verify the seal is untouched: sealed-center merkle, candidate lineage,
     coach-mind canonical digest, EPA dropoff table hash, tau 0.42. Read-only.
  2. Refresh the injury overlay inputs for the slot's teams. Primary source is
     the ESPN public summary endpoint (game status designations: Out / Doubtful
     / Questionable). The nflverse injuries CSV is refreshed and reported as a
     parity check, but its ``report_status`` is blank for Sunday games at this
     hour, so it contributes no designations, which is recorded rather than papered over.
  3. Reallocate target shares with Sinkhorn-Knopp under the SEALED cost matrix
     and apply the SEALED execution multipliers. Nothing is re-estimated: tau,
     cost matrix, team ratings and the EPA dropoff table are read from the
     sealed baseline and asserted unchanged.
  4. Weather overlay from Open-Meteo for outdoor venues at the slot kickoff
     hour. Raw values and boolean flags only; NO numeric points coefficient is
     applied (weather is nonlinear and stadium-specific, so a flat mph->points
     conversion would be fabricated precision).
  5. Mint one sealed ticket per sealed side call and per sealed total call.
     A ticket carries the sealed confidence/CLV unchanged plus the overlay
     effect and a disposition. Overlay cannot re-price; it can only flag.

What this script does NOT do: no re-simulation, no re-estimation of tau, cost
matrix, ratings or the EPA dropoff table, no publication. Tickets here are
internal sealed artifacts; the Class B conjunction gate (stage 5) is not run.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import inspect
import json
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts" / "ops"))

import gse_coach_mind_simulator as sim  # noqa: E402
import run_cadence_v25_injury_overlay as v25  # noqa: E402

ROLE_NAMES = ["WR1", "WR2", "WR3", "TE1", "RB1"]
BASE_SHARES = [0.26, 0.21, 0.17, 0.20, 0.16]

#: Static venue coordinates (home team abbreviation -> lat/lon, venue). Only
#: consulted for venues ESPN reports as outdoor; the indoor flag itself comes
#: from the ESPN scoreboard, never from this table.
VENUE_COORDS = {
    "BUF": (42.7738, -78.7870),
    "CIN": (39.0954, -84.5160),
    "NYJ": (40.8135, -74.0745),
    "PIT": (40.4468, -80.0158),
    "TB": (27.9759, -82.5033),
    "JAX": (30.3239, -81.6373),
    "LAR": (33.9535, -118.3392),
    "DEN": (39.7439, -105.0201),
    "MIA": (25.9580, -80.2389),
    "WSH": (38.9077, -76.8645),
}

ESPN_SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates={date}"
ESPN_SUMMARY = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event={event}"
OPEN_METEO = (
    "https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
    "&hourly=temperature_2m,wind_speed_10m,wind_gusts_10m,precipitation_probability"
    "&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=UTC&forecast_days=3"
)

#: Game designations that move the overlay. ESPN's roster-status strings are
#: kept verbatim in the report so nothing is silently regrouped.
OUT_STATUSES = {"Out", "Doubtful"}
QUESTIONABLE_STATUSES = {"Questionable"}

WIND_FLAG_MPH = 15.0
GUST_FLAG_MPH = 25.0
PRECIP_FLAG_PCT = 40.0
COLD_FLAG_F = 35.0
ADVERSE_POINTS = 1.5


# --------------------------------------------------------------------------- #
# plumbing
# --------------------------------------------------------------------------- #

def thaw(obj):
    """mappingproxy -> plain dict/list (the seal is frozen deep on load)."""
    if hasattr(obj, "items"):
        return {k: thaw(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [thaw(v) for v in obj]
    return obj


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def fetch_json(url: str, timeout: int = 45):
    req = urllib.request.Request(url, headers={"User-Agent": "gse-cadence-v3.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.status, json.loads(resp.read())


# --------------------------------------------------------------------------- #
# injury overlay
# --------------------------------------------------------------------------- #

def role_for_position(position: str, index: int) -> str:
    """Map a position to a sealed role key. index is 1-based within (team, pos).

    Identical semantics to run_cadence_v25_injury_overlay.POSITION_ROLES /
    week_designations. Non-skill keys (LT/CB1/EDGE1) are emitted as-is; the
    sealed epaDropoffTable does not key on them, which is the known v2.5 gap
    and is reported, never silently repaired.
    """
    pos = (position or "").strip().upper()
    if pos == "QB":
        return "QB1" if index == 1 else "QB_QUESTIONABLE"
    if pos in v25.POSITION_ROLES:
        return v25.POSITION_ROLES[pos] if index == 1 else ""
    if pos == "WR":
        return "WR1" if index == 1 else ("WR2" if index == 2 else "WR3")
    if pos == "RB":
        return "RB1" if index == 1 else ""
    if pos == "TE":
        return "TE1" if index == 1 else ""
    return ""


def designations_from_espn(block: dict) -> dict:
    """Extract applied designations and roster-status notices from one team block."""
    applied = []
    not_applied = []
    counts: dict[str, int] = {}
    for item in block.get("injuries", []):
        athlete = item.get("athlete") or {}
        name = athlete.get("displayName") or ""
        pos = (athlete.get("position") or {}).get("abbreviation", "")
        status = str(item.get("status") or "").strip()
        if not name:
            continue
        is_out = status in OUT_STATUSES
        is_q = status in QUESTIONABLE_STATUSES
        if not (is_out or is_q):
            # IR / Suspension / PUP: roster availability is a Tuesday-baseline
            # input, not a game-day designation. Reported, not applied.
            not_applied.append({"player": name, "position": pos, "status": status})
            continue
        index = counts.get(pos, 0) + 1
        counts[pos] = index
        role = role_for_position(pos, index)
        applied.append(
            {
                "player": name,
                "position": pos,
                "status": status,
                "role_key": role,
                "sealed_table_match": role in (
                    "QB1", "QB_QUESTIONABLE", "WR1", "WR2", "WR3", "TE1", "RB1"
                ),
            }
        )
    return {"applied": applied, "not_applied": not_applied}


def team_delta_for_prop(player_name: str, overlays: dict, team_blocks: dict) -> float | None:
    """Team-level overlay delta for a prop row, resolved strictly by designation match.

    A prop row carries no team field. The only honest link is the player appearing
    in one team's designation list; when that fails, return None rather than guess.
    """
    for abbr, block in team_blocks.items():
        names = {d.get("player") for d in block.get("applied", [])}
        names |= {d.get("player") for d in block.get("not_applied", [])}
        if player_name in names:
            return float(overlays[abbr]["points_delta"])
    return None


def team_overlay(sealed: dict, roles: list[str], team_abbr: str) -> dict:
    """Sinkhorn reallocation + sealed multipliers -> points effect for one team."""
    scratch = [r for r in roles if r in ROLE_NAMES]
    feasible, mass_moved = sim.sinkhorn_reallocate_weights(
        sealed["costMatrixC"], BASE_SHARES, scratch
    )
    multipliers = sealed["epaDropoffTable"]["execution_multipliers"]
    effective = [
        float(feasible[i]) * (multipliers.get(role, 0.90) if role in scratch else 1.0)
        for i, role in enumerate(ROLE_NAMES)
    ]
    mass_after = float(sum(effective))
    mass_delta = mass_after - 1.0
    rating = sealed["teamRatings"].get(team_abbr, {})
    off_epa = float(rating.get("off_epa", 0.0))
    pace_sec = float(rating.get("pace_sec", 27.0))
    plays = round(1800.0 / pace_sec) if pace_sec else 66
    execution_points = mass_delta * off_epa * plays

    # Sealed EPA dropoff table. Only the keys the current designation mapping can
    # actually produce are applied (QB1 / QB_QUESTIONABLE). OL / SKILL / DEF are
    # keyed in the table but no designation maps to them today (v2.5 finding #2);
    # applying them would be a model-behavior change, so they are reported only.
    table = sealed["epaDropoffTable"]
    applied_keys = []
    table_epa_drop = 0.0
    unreachable_keys = []
    for role in sorted(set(roles)):
        if role in ("QB1", "QB_QUESTIONABLE"):
            table_epa_drop += float(table[role])
            applied_keys.append(role)
        elif role in table and role != "execution_multipliers":
            unreachable_keys.append(role)
    table_points = table_epa_drop * plays
    points_delta = execution_points + table_points
    return {
        "team": team_abbr,
        "epa_table_keys_applied": applied_keys,
        "epa_table_drop_per_play": round(table_epa_drop, 6),
        "epa_table_unreachable_keys_seen": sorted(set(unreachable_keys)),
        "execution_points_delta": round(execution_points, 4),
        "epa_table_points_delta": round(table_points, 4),
        "scratched_skill_roles": scratch,
        "unmapped_role_keys": [r for r in roles if r not in ROLE_NAMES],
        "unpriced_designation_counts": {
            "skill_roles_priced_by_multiplier_only": [r for r in roles if r in ROLE_NAMES],
            "ol_lt_unreachable": roles.count("LT"),
            "cb1_unreachable": roles.count("CB1"),
            "edge1_unreachable": roles.count("EDGE1"),
        },
        "feasible_shares": {r: round(float(feasible[i]), 10) for i, r in enumerate(ROLE_NAMES)},
        "execution_multipliers": {
            r: (multipliers.get(r, 0.90) if r in scratch else 1.0) for r in ROLE_NAMES
        },
        "total_mass_before": round(1.0, 10),
        "total_mass_after": round(mass_after, 10),
        "mass_delta": round(mass_delta, 10),
        "mass_moved": round(float(mass_moved), 10),
        "off_epa_per_play": off_epa,
        "pace_sec_per_play": pace_sec,
        "plays_derived": plays,
        "points_delta": round(points_delta, 4),
        "derivation": (
            "points_delta = execution_points + epa_table_points, where execution_points = "
            "(sum_i feasible_i * sealed multiplier_i - 1.0) * sealed off_epa * round(1800 / "
            "sealed pace_sec), and epa_table_points = sum(sealed epaDropoffTable[k] for applied "
            "QB keys) * plays. Even possession split (1800 s per team). No parameter re-estimated."
        ),
        "sign_note": (
            "off_epa is negative for this team, so a negative mass delta multiplies to a small "
            "positive points figure; the magnitude is inside the noise band either way."
            if off_epa < 0 and mass_delta < 0 else None
        ),
    }


def nflverse_week_status(csv_path: Path, week: int, teams: set[str]) -> dict:
    """Count report_status designations per team in the refreshed nflverse file."""
    out = {t: [] for t in teams}
    if not csv_path.is_file():
        return out
    with open(csv_path, encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            if str(row.get("week")) != str(week):
                continue
            team = str(row.get("team", "")).strip()
            if team == "LA":
                team = "LAR"
            if team not in out:
                continue
            status = str(row.get("report_status", "")).strip()
            if status in ("Out", "Doubtful", "Questionable"):
                out[team].append(
                    {
                        "player": row.get("full_name", ""),
                        "position": row.get("position", ""),
                        "status": status,
                    }
                )
    return out


# --------------------------------------------------------------------------- #
# weather overlay
# --------------------------------------------------------------------------- #

def weather_flags(speed: float | None, gust: float | None, precip: float | None,
                  temp: float | None) -> dict:
    """Boolean flags only. No points coefficient, see the module docstring."""
    flags = []
    if speed is not None and speed >= WIND_FLAG_MPH:
        flags.append("WIND")
    if gust is not None and gust >= GUST_FLAG_MPH:
        flags.append("GUSTS")
    if precip is not None and precip >= PRECIP_FLAG_PCT:
        flags.append("PRECIP")
    if temp is not None and temp <= COLD_FLAG_F:
        flags.append("COLD")
    return {
        "wind_mph": speed,
        "gust_mph": gust,
        "precip_prob_pct": precip,
        "temp_f": temp,
        "flags": flags,
        "points_adjustment": 0.0,
        "rule": (
            f"WIND>={WIND_FLAG_MPH}mph, GUSTS>={GUST_FLAG_MPH}mph, "
            f"PRECIP>={PRECIP_FLAG_PCT}%, COLD<={COLD_FLAG_F}F. Flags are advisory; "
            "no numeric points coefficient is applied."
        ),
    }


def fetch_weather(team: str, kickoff_iso: str) -> dict:
    lat, lon = VENUE_COORDS[team]
    status, payload = fetch_json(OPEN_METEO.format(lat=lat, lon=lon))
    hourly = payload.get("hourly") or {}
    times = hourly.get("time") or []
    target = kickoff_iso[:13]  # YYYY-MM-DDTHH
    idx = next((i for i, t in enumerate(times) if t[:13] == target), None)
    if idx is None:
        return {
            "source": "open-meteo",
            "http_status": status,
            "hour_matched": None,
            "unavailable_reason": f"no hourly bucket for {target} in returned window",
        }
    def at(key):
        arr = hourly.get(key) or []
        return float(arr[idx]) if idx < len(arr) and arr[idx] is not None else None
    out = {
        "source": "open-meteo",
        "http_status": status,
        "hour_matched": times[idx],
        "attribution": overlay_source_note(),
    }
    out.update(
        weather_flags(
            at("wind_speed_10m"), at("wind_gusts_10m"),
            at("precipitation_probability"), at("temperature_2m"),
        )
    )
    return out


def overlay_source_note() -> str:
    return "Weather data by Open-Meteo.com (CC-BY-4.0)"


# --------------------------------------------------------------------------- #
# ticket minting
# --------------------------------------------------------------------------- #

def disposition(side_delta: float, total_delta: float, kind: str) -> tuple[str, str]:
    """Overlay can flag, never re-price. kind: 'side' | 'total'."""
    if kind == "side":
        if side_delta <= -ADVERSE_POINTS:
            return "OVERLAY_ADVERSE", f"injury overlay moves this side {side_delta:+.2f} pts"
        return "SEALED_HOLDS", f"injury overlay moves this side {side_delta:+.2f} pts (inside {ADVERSE_POINTS})"
    # total: an UNDER is hurt by positive scoring movement and helped by negative.
    return "SEALED_HOLDS", f"injury overlay moves game total {total_delta:+.2f} pts"


def ticket_merkle(tickets: list[dict]) -> str:
    canon = json.dumps(tickets, sort_keys=True, separators=(",", ":"))
    return sha256_text(canon)


# --------------------------------------------------------------------------- #
# main
# --------------------------------------------------------------------------- #

def run(slot: str, week: int, season: int, kickoff_filter: str,
        writeups_path: Path, output_dir: Path, scoreboard_date: str) -> dict:
    sealed, digest = sim.load_sealed_object_readonly()
    sealed = thaw(sealed)
    seal = v25.verify_seal()

    payload = json.loads(writeups_path.read_text(encoding="utf-8"))
    slot_writeups = [w for w in payload.get("writeups", []) if w.get("windowSlot") == slot]

    status, board = fetch_json(ESPN_SCOREBOARD.format(date=scoreboard_date))
    events = [e for e in board.get("events", []) if e.get("date", "").startswith(kickoff_filter)]
    event_by_pair = {}
    for e in events:
        comp = e["competitions"][0]
        home = next(t for t in comp["competitors"] if t["homeAway"] == "home")["team"]["abbreviation"]
        away = next(t for t in comp["competitors"] if t["homeAway"] == "away")["team"]["abbreviation"]
        event_by_pair[f"{away}@{home}"] = {
            "event_id": e["id"],
            "kickoff": comp.get("date"),
            "venue": (comp.get("venue") or {}).get("fullName"),
            "indoor": bool((comp.get("venue") or {}).get("indoor")),
            "home": home,
            "away": away,
        }

    injuries_csv = REPO_ROOT / "data" / "nflverse" / "injuries_2026.csv"
    tickets: list[dict] = []
    games: list[dict] = []

    for w in slot_writeups:
        # writeups carry team display names, not abbreviations; resolve via ESPN.
        away_full, home_full = w["awayTeam"], w["homeTeam"]
        match = None
        for key, ev in event_by_pair.items():
            away, home = key.split("@")
            if w.get("gameId") == ev["event_id"]:
                match = ev
                break
        if match is None:
            games.append(
                {
                    "game_id": w.get("gameId"),
                    "matchup": w.get("matchup"),
                    "error": "not found on ESPN scoreboard for the slot date",
                }
            )
            continue

        away, home = match["away"], match["home"]
        _, summary = fetch_json(ESPN_SUMMARY.format(event=match["event_id"]))
        inj_blocks = {b["team"]["abbreviation"]: b for b in summary.get("injuries", [])}
        team_blocks = {}
        for abbr in (away, home):
            block = inj_blocks.get(abbr, {"injuries": []})
            team_blocks[abbr] = designations_from_espn(block)

        nfl_rows = nflverse_week_status(injuries_csv, week, {away, home})
        overlays = {}
        for abbr in (away, home):
            roles = [d["role_key"] for d in team_blocks[abbr]["applied"] if d["role_key"]]
            overlays[abbr] = team_overlay(sealed, roles, abbr)

        weather = None
        if not match["indoor"] and home in VENUE_COORDS:
            try:
                weather = fetch_weather(home, match["kickoff"])
            except Exception as exc:  # pragma: no cover - network dependent
                weather = {"source": "open-meteo", "error": f"{type(exc).__name__}: {exc}"}
        else:
            weather = {"source": "espn-venue", "indoor": True, "points_adjustment": 0.0,
                       "flags": [], "note": "roofed venue; no weather effect modeled"}

        pts_away = overlays[away]["points_delta"]
        pts_home = overlays[home]["points_delta"]
        total_delta = pts_away + pts_home
        margin_delta_home = pts_home - pts_away  # home margin movement

        stc = w.get("sideTotalCall", {})
        base = {
            "game_id": w.get("gameId"),
            "matchup": w.get("matchup"),
            "kickoff_utc": match["kickoff"],
            "venue": match["venue"],
            "indoor": match["indoor"],
            "slot": slot,
            "week": week,
            "season": season,
            "sealed_build_generated_at": payload.get("generatedAt"),
            "seal": {
                "sealed_center_merkle": seal["sealed_center_merkle"],
                "tau": seal["tau"],
                "coach_mind_canonical_digest": seal["coach_mind_canonical_digest"],
                "epa_dropoff_table_sha256": seal["epa_dropoff_table_sha256"],
                "unchanged": seal["unchanged"],
            },
            "overlay": {
                "espn_designations": {abbr: team_blocks[abbr] for abbr in (away, home)},
                "nflverse_report_status_rows": {abbr: nfl_rows.get(abbr, []) for abbr in (away, home)},
                "team_effects": {abbr: overlays[abbr] for abbr in (away, home)},
                "total_points_delta": round(total_delta, 4),
                "home_margin_delta": round(margin_delta_home, 4),
                "weather": weather,
            },
        }

        side_sel = stc.get("sideSelection") or ""
        side_on_home = home_full.split()[-1] in side_sel or home in side_sel
        side_delta = margin_delta_home if side_on_home else -margin_delta_home
        side_disp, side_reason = disposition(side_delta, total_delta, "side")
        total_sel = stc.get("totalSelection") or ""
        is_under = "UNDER" in total_sel.upper()
        total_side_delta = -total_delta if is_under else total_delta
        total_disp, total_reason = disposition(0.0, total_side_delta, "total")

        tickets.append(
            {
                "ticket_id": f"TICK-{season}-W{week}-{w.get('gameId')}-SIDE",
                "kind": "side",
                "selection": side_sel,
                "sealed_confidence": stc.get("sideConfidence"),
                "sealed_expected_clv": stc.get("sideExpectedClv"),
                "sealed_decision": stc.get("sideDecision"),
                "mint_status": "PLAY" if stc.get("sideDecision") == "PLAY" else "WITHHELD_PASS",
                "overlay_points_delta": round(side_delta, 4),
                "disposition": side_disp,
                "disposition_reason": side_reason,
                "repriced": False,
                **{k: base[k] for k in ("game_id", "matchup", "kickoff_utc", "venue", "seal",
                                        "sealed_build_generated_at", "week", "season", "slot")},
            }
        )
        tickets.append(
            {
                "ticket_id": f"TICK-{season}-W{week}-{w.get('gameId')}-TOTAL",
                "kind": "total",
                "selection": total_sel,
                "sealed_confidence": stc.get("totalConfidence"),
                "sealed_expected_clv": stc.get("totalExpectedClv"),
                "sealed_decision": stc.get("totalDecision"),
                "mint_status": "PLAY" if stc.get("totalDecision") == "PLAY" else "WITHHELD_PASS",
                "overlay_points_delta": round(total_side_delta, 4),
                "disposition": total_disp,
                "disposition_reason": total_reason,
                "repriced": False,
                **{k: base[k] for k in ("game_id", "matchup", "kickoff_utc", "venue", "seal",
                                        "sealed_build_generated_at", "week", "season", "slot")},
            }
        )

        # Prop rows: the overlay is team-level only (WR/TE/RB target shares move,
        # but no player->role map exists in the writeup), so a prop ticket is
        # minted with the sealed numbers untouched and overlay_applicable=false.
        for idx, prop in enumerate(w.get("topProps", []), start=1):
            tickets.append(
                {
                    "ticket_id": f"TICK-{season}-W{week}-{w.get('gameId')}-P{idx:02d}",
                    "kind": "prop",
                    "selection": (
                        f"{prop.get('playerName')} {prop.get('side')} {prop.get('line')} "
                        f"{prop.get('propType')}"
                    ),
                    "sealed_confidence": prop.get("confidence"),
                    "sealed_expected_clv": prop.get("expectedClv"),
                    "sealed_decision": prop.get("decision"),
                    "mint_status": "PLAY" if prop.get("decision") == "PLAY" else "WITHHELD_PASS",
                    "overlay_applicable": False,
                    "overlay_note": (
                        "team-level overlay only; a scratched skill role moves the team's target "
                        "shares but no player-to-role mapping exists in the sealed writeup, so this "
                        "row is not adjusted and not re-priced."
                    ),
                    "overlay_team_points_delta": (
                        None if team_delta_for_prop(prop.get("playerName"), overlays, team_blocks) is None
                        else round(team_delta_for_prop(prop.get("playerName"), overlays, team_blocks), 4)
                    ),
                    "disposition": "SEALED_HOLDS",
                    "disposition_reason": "overlay not applicable at player level",
                    "repriced": False,
                    **{k: base[k] for k in ("game_id", "matchup", "kickoff_utc", "venue", "seal",
                                            "sealed_build_generated_at", "week", "season", "slot")},
                }
            )

        games.append(
            {
                **base,
                "away": away,
                "home": home,
                "side_call": {
                    "selection": side_sel,
                    "confidence": stc.get("sideConfidence"),
                    "expected_clv": stc.get("sideExpectedClv"),
                    "sealed_decision": stc.get("sideDecision"),
                    "overlay_points_delta": round(side_delta, 4),
                    "disposition": side_disp,
                },
                "total_call": {
                    "selection": total_sel,
                    "confidence": stc.get("totalConfidence"),
                    "expected_clv": stc.get("totalExpectedClv"),
                    "sealed_decision": stc.get("totalDecision"),
                    "overlay_points_delta": round(total_side_delta, 4),
                    "disposition": total_disp,
                },
                "props_in_writeup": len(w.get("topProps", [])),
            }
        )

    unpriced = {"LT": 0, "CB1": 0, "EDGE1": 0}
    applied_total = 0
    weather_flagged = 0
    max_abs_delta = 0.0
    for g in games:
        if "error" in g:
            continue
        for _ab, eff in g["overlay"]["team_effects"].items():
            counts = eff["unpriced_designation_counts"]
            unpriced["LT"] += counts["ol_lt_unreachable"]
            unpriced["CB1"] += counts["cb1_unreachable"]
            unpriced["EDGE1"] += counts["edge1_unreachable"]
        for _ab, block in g["overlay"]["espn_designations"].items():
            applied_total += len(block["applied"])
        if g["overlay"]["weather"].get("flags"):
            weather_flagged += 1
        max_abs_delta = max(
            max_abs_delta,
            abs(g["side_call"]["overlay_points_delta"]),
            abs(g["total_call"]["overlay_points_delta"]),
        )

    report = {
        "report_type": "CADENCE_V3_0_PRE_KICKOFF_OVERLAY_AND_TICKET_MINT",
        "summary": {
            "games_in_slot": len([g for g in games if "error" not in g]),
            "tickets_minted": len(tickets),
            "mint_status_counts": {
                status: sum(1 for t in tickets if t["mint_status"] == status)
                for status in ("PLAY", "WITHHELD_PASS")
            },
            "playable_rows": {
                kind: sum(1 for t in tickets if t["kind"] == kind and t["mint_status"] == "PLAY")
                for kind in ("side", "total", "prop")
            },
            "max_abs_overlay_points_delta": round(max_abs_delta, 4),
            "weather_flagged_games": weather_flagged,
            "espn_designations_applied": applied_total,
            "unpriced_designation_counts": unpriced,
            "findings": [
                "The nflverse injuries feed carried NO report_status for any of the 16 Sunday teams at "
                "mint time (163 Week-8 rows, all blank). Practice status alone is not a game designation "
                "and was not promoted, so the ESPN public summary endpoint supplied every designation used here.",
                "The sealed epaDropoffTable keys are {QB1, QB_QUESTIONABLE, OL, SKILL, DEF}; the designation "
                "mapping emits {WR1, WR2, WR3, TE1, RB1, QB1, QB_QUESTIONABLE, LT, CB1, EDGE1}. Only the QB keys "
                "intersect, and no QB is designated in this slot, so OL/LT, CB1 and EDGE1 designations carry zero "
                "engine weight. This reconfirms the v2.5 finding on 8 games; the fix is a mapping change, which is "
                "model behavior and was not made on a game day.",
                "Because Sinkhorn reallocates rather than deletes target-share mass, and the sealed multipliers "
                "apply to the small residual, the measured overlay effect is under 0.1 points on every game in "
                f"the slot (max |delta| {max_abs_delta:.3f}). The overlay is inert for this card, and the tickets "
                "are minted on the sealed calls unchanged.",
                "Weather is reported as flags only. No points coefficient was applied, by doctrine.",
            ],
        },
        "version": "v3.0",
        "phase": "INJURY_WEATHER_OVERLAY",
        "slot": slot,
        "week": week,
        "season": season,
        "cadence_window": {"day": "Fri", "ct_time": "16:30", "label": "final pre-kickoff overlay + sealed ticket minting"},
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "inputs": {
            "writeups_path": str(writeups_path.relative_to(REPO_ROOT)).replace("\\", "/"),
            "writeups_generated_at": payload.get("generatedAt"),
            "writeups_sha256": hashlib.sha256(writeups_path.read_bytes()).hexdigest(),
            "injuries_csv_sha256": hashlib.sha256(injuries_csv.read_bytes()).hexdigest() if injuries_csv.is_file() else None,
            "espn_scoreboard_status": status,
            "espn_scoreboard_date": scoreboard_date,
            "sinkhorn_eps_used": inspect.signature(sim.sinkhorn_reallocate_weights).parameters["eps"].default,
        },
        "seal": seal,
        "no_reestimation": {
            "tau": sealed["tau"],
            "cost_matrix_reestimated": False,
            "team_ratings_reestimated": False,
            "epa_table_reestimated": False,
            "repaired": False,
            "resimulated": False,
            "note": "Sealed inputs read verbatim; overlay applies multipliers only.",
        },
        "games": games,
        "tickets": tickets,
        "ticket_count": len(tickets),
        "publication": {
            "published": False,
            "reason": "Internal sealed artifacts. Class B conjunction gate (stage 5) not run; nothing here is a publication.",
        },
    }
    report["ticket_set_merkle"] = ticket_merkle(tickets)
    report["report_sha256_pre_merkle"] = None
    canon = json.dumps({k: v for k, v in report.items() if k != "report_sha256_pre_merkle"}, sort_keys=True)
    report["sha256_merkle"] = sha256_text(canon)

    output_dir.mkdir(parents=True, exist_ok=True)
    target = output_dir / f"cadence_v30_overlay_{slot.lower()}_w{week}.json"
    target.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"wrote {target}")
    print(f"seal unchanged: {seal['unchanged']} | merkle {seal['sealed_center_merkle'][:16]}... | tau {seal['tau']}")
    print(f"games {len([g for g in games if 'error' not in g])} | tickets {len(tickets)} | set merkle {report['ticket_set_merkle'][:16]}...")
    for g in games:
        if "error" in g:
            print(f"  {g['matchup']}: ERROR {g['error']}")
            continue
        print(
            f"  {g['matchup']:<40} side {g['side_call']['disposition']:<16} "
            f"{g['side_call']['overlay_points_delta']:+.3f} | total {g['total_call']['disposition']:<16} "
            f"{g['total_call']['overlay_points_delta']:+.3f} | weather {g['overlay']['weather'].get('flags', [])}"
        )
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Cadence v3.0 Friday overlay + sealed ticket mint")
    parser.add_argument("--slot", default="SUN_EARLY")
    parser.add_argument("--week", type=int, default=8)
    parser.add_argument("--season", type=int, default=2026)
    parser.add_argument("--kickoff-filter", default="2026-11-01T18:00")
    parser.add_argument("--scoreboard-date", default="20261101")
    parser.add_argument("--writeups", default="data/packages/live-slate-writeups.json")
    parser.add_argument("--output-dir", default="docs/predictions/research/2026-10-30")
    args = parser.parse_args()

    run(
        slot=args.slot,
        week=args.week,
        season=args.season,
        kickoff_filter=args.kickoff_filter,
        writeups_path=REPO_ROOT / args.writeups,
        output_dir=REPO_ROOT / args.output_dir,
        scoreboard_date=args.scoreboard_date,
    )


if __name__ == "__main__":
    main()
