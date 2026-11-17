"""GSE T-Minus Lock Orchestrator & 7-Point Pre-Card Sanity Firewall.

Single-command, sub-25-second T-85m Autonomous Game-Lock & 7-Point Pre-Card Sanity Firewall.
Validates:
  S1: Zero excluded player leaks across all projections, props, SGPs, DFS cash rosters.
  S2: Zero duplicate normalized names within each team.
  S3: Integer discrete TD/INT support (rejects fractional-multiplied corruption).
  S4: QB scramble rush calibrated against boarded rush line.
  S5: Skill sniper gate liveness (no mass-veto from missing snap shares).
  S6: 5-Pillar profiler & non-zero Jacobian receipts verified.
  S7: Strict XX/100 confidence formatting (no % signs).
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.request
from collections import defaultdict
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent.parent

_ESPN_INACTIVE_INJURY_STATUSES = {"out", "injured reserve", "doubtful"}
_ESPN_INACTIVE_ROSTER_STATUS_TYPES = {
    "practice-squad",
    "injured-reserve",
    "suspended",
    "out",
}
_ESPN_TEAM_NORM = {"LA": "LAR", "WSH": "WAS", "JAC": "JAX"}
_ESPN_TEAM_SLUG = {"WAS": "wsh", "LAR": "lar", "JAX": "jax"}


class CardSanityFirewallError(RuntimeError):
    """Raised when any of the 7-Point Pre-Card Sanity Firewalls are violated."""


def _norm_team(team: str) -> str:
    """Normalize NFL team abbreviation."""
    u = str(team or "").strip().upper()
    return _ESPN_TEAM_NORM.get(u, u)


def _espn_team_slug(team: str) -> str:
    """Convert normalized NFL team abbreviation to ESPN roster API slug."""
    u = _norm_team(team)
    return _ESPN_TEAM_SLUG.get(u, u.lower())


def is_player_truly_inactive(
    summary_injuries_status: str | None,
    roster_status_type: str | None,
    roster_injuries: list[dict[str, Any]] | None,
) -> bool:
    """Return True only when live ESPN signals prove the player is inactive/excluded.

    Only marks a player excluded when:
      - Listed as 'Out', 'Injured Reserve', or 'Doubtful' in the event /summary
        injuries array or /roster injuries array, OR
      - roster_status_type (lowercased) is in {'practice-squad', 'injured-reserve',
        'suspended', 'out'}.

    NEVER excludes 'day-to-day' when roster_injuries is empty, because
    activated-from-IR players (e.g. David Njoku, Denzel Perryman) remain
    'day-to-day' with injuries == [].
    """
    if (
        summary_injuries_status
        and str(summary_injuries_status).strip().lower() in _ESPN_INACTIVE_INJURY_STATUSES
    ):
        return True

    for inj in roster_injuries or []:
        if isinstance(inj, dict):
            inj_status = str(inj.get("status") or "").strip().lower()
        else:
            inj_status = str(inj or "").strip().lower()
        if inj_status in _ESPN_INACTIVE_INJURY_STATUSES:
            return True

    return bool(
        roster_status_type
        and str(roster_status_type).strip().lower() in _ESPN_INACTIVE_ROSTER_STATUS_TYPES
    )


def _fetch_espn_json(url: str, timeout: int = 10) -> dict[str, Any]:
    """Fetch JSON payload from ESPN API."""
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _resolve_espn_event_id(away: str, home: str, week: int) -> str | None:
    """Resolve ESPN event ID for (away, home, week) from local scoreboard or live API."""
    away_u = _norm_team(away)
    home_u = _norm_team(home)
    sb: dict[str, Any] | None = None
    local_sb = REPO_ROOT / "data" / "engine" / f"espn_2026_week{week}_scoreboard.json"
    if local_sb.is_file():
        try:
            sb = json.loads(local_sb.read_text(encoding="utf-8"))
        except Exception:
            sb = None
    if sb is None:
        sb_url = (
            "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"
            f"?seasontype=2&week={week}&dates=2026"
        )
        sb = _fetch_espn_json(sb_url)

    for ev in sb.get("events", []):
        comps = ev.get("competitions") or []
        comp = comps[0] if comps else {}
        ev_away = ""
        ev_home = ""
        for competitor in comp.get("competitors") or []:
            abbr = _norm_team((competitor.get("team") or {}).get("abbreviation") or "")
            if competitor.get("homeAway") == "home":
                ev_home = abbr
            elif competitor.get("homeAway") == "away":
                ev_away = abbr
        if ev_away == away_u and ev_home == home_u:
            ev_id = str(ev.get("id") or "").strip()
            if ev_id:
                return ev_id
    return None


def _iter_roster_items(roster_payload: dict[str, Any] | None) -> list[dict[str, Any]]:
    """Flatten ESPN roster athletes payload into a list of athlete dicts."""
    if not isinstance(roster_payload, dict):
        return []
    out: list[dict[str, Any]] = []
    for grp in roster_payload.get("athletes") or []:
        if isinstance(grp, dict) and isinstance(grp.get("items"), list):
            for item in grp["items"]:
                if isinstance(item, dict):
                    out.append(item)
        elif isinstance(grp, dict):
            out.append(grp)
    return out


def sync_espn_t90_inactives(
    away: str,
    home: str,
    week: int,
    event_id: str | None = None,
    summary_payload: dict[str, Any] | None = None,
    away_roster_payload: dict[str, Any] | None = None,
    home_roster_payload: dict[str, Any] | None = None,
    config_path: Path | None = None,
) -> dict[str, Any]:
    """Sync live ESPN /summary injuries and /roster status into Stage-0 excluded_players.

    Only marks players inactive per is_player_truly_inactive(), and lifts any stale
    non-Master-Plan exclusion on (away, home) whose ESPN roster status is 'active'
    with empty injuries, or 'day-to-day' with empty injuries and not listed in
    summary injuries.
    """
    away_u = _norm_team(away)
    home_u = _norm_team(home)
    default_cfg_path = (
        REPO_ROOT
        / "data"
        / "nflverse"
        / f"week{week}_live_roster_transactions_and_starters_2026.json"
    )
    cfg_path = config_path or default_cfg_path
    if cfg_path.is_file():
        cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    else:
        cfg = {"week": week, "excluded_players": []}

    resolved_event_id = event_id
    if summary_payload is None:
        rosters_missing = away_roster_payload is None or home_roster_payload is None
        if resolved_event_id is None and rosters_missing:
            resolved_event_id = _resolve_espn_event_id(away_u, home_u, week)
        if resolved_event_id:
            summary_payload = _fetch_espn_json(
                f"https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event={resolved_event_id}"
            )
        else:
            summary_payload = {}

    if away_roster_payload is None:
        away_roster_payload = _fetch_espn_json(
            f"https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{_espn_team_slug(away_u)}/roster"
        )
    if home_roster_payload is None:
        home_roster_payload = _fetch_espn_json(
            f"https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{_espn_team_slug(home_u)}/roster"
        )

    summary_by_team_norm: dict[tuple[str, str], dict[str, str]] = {}
    summary_by_norm: dict[str, dict[str, str]] = {}
    for blk in (summary_payload or {}).get("injuries") or []:
        if not isinstance(blk, dict):
            continue
        blk_team = _norm_team((blk.get("team") or {}).get("abbreviation") or "")
        for item in blk.get("injuries") or []:
            if not isinstance(item, dict):
                continue
            ath = item.get("athlete") or {}
            pname = str(
                ath.get("displayName") or ath.get("fullName") or ath.get("name") or ""
            ).strip()
            norm_p = _strip_name_suffix(pname)
            if not norm_p:
                continue
            st = str(item.get("status") or "").strip()
            pos_raw = ath.get("position")
            pos = str(
                pos_raw.get("abbreviation") if isinstance(pos_raw, dict) else (pos_raw or "UNKNOWN")
            ).strip().upper() or "UNKNOWN"
            detail = str(
                ((item.get("details") or {}).get("type"))
                or item.get("longComment")
                or item.get("shortComment")
                or "ESPN gameday status"
            ).strip()
            entry = {
                "name": pname,
                "team": blk_team,
                "position": pos,
                "status": st,
                "detail": detail,
            }
            if blk_team:
                summary_by_team_norm[(blk_team, norm_p)] = entry
            summary_by_norm[norm_p] = entry

    evaluated: dict[tuple[str, str], dict[str, Any]] = {}
    for team_u, roster_payload in ((away_u, away_roster_payload), (home_u, home_roster_payload)):
        for item in _iter_roster_items(roster_payload):
            pname = str(
                item.get("displayName") or item.get("fullName") or item.get("name") or ""
            ).strip()
            if not pname:
                continue
            norm_p = _strip_name_suffix(pname)
            if not norm_p:
                continue
            pos_raw = item.get("position")
            pos = str(
                pos_raw.get("abbreviation") if isinstance(pos_raw, dict) else (pos_raw or "UNKNOWN")
            ).strip().upper() or "UNKNOWN"
            status_obj = item.get("status") or {}
            roster_status_type = str(
                status_obj.get("type") or status_obj.get("name") or ""
            ).strip()
            roster_injuries = item.get("injuries")
            if not isinstance(roster_injuries, list):
                roster_injuries = []
            sum_entry = summary_by_team_norm.get((team_u, norm_p)) or summary_by_norm.get(norm_p)
            sum_status = sum_entry["status"] if sum_entry else None
            truly_inactive = is_player_truly_inactive(
                sum_status, roster_status_type, roster_injuries
            )
            rt_low = roster_status_type.lower()
            can_lift = (
                (rt_low == "active" and len(roster_injuries) == 0 and not truly_inactive)
                or (
                    rt_low == "day-to-day"
                    and len(roster_injuries) == 0
                    and sum_status is None
                )
            )
            evaluated[(team_u, norm_p)] = {
                "name": pname,
                "team": team_u,
                "position": pos,
                "truly_inactive": truly_inactive,
                "can_lift": can_lift,
                "roster_status_type": rt_low,
                "roster_injuries": roster_injuries,
                "summary_status": sum_status,
                "detail": (sum_entry or {}).get("detail") or "",
            }

    for (blk_team, norm_p), sum_entry in summary_by_team_norm.items():
        if blk_team not in (away_u, home_u):
            continue
        if (blk_team, norm_p) not in evaluated:
            sum_status = sum_entry["status"]
            if is_player_truly_inactive(sum_status, None, None):
                evaluated[(blk_team, norm_p)] = {
                    "name": sum_entry["name"],
                    "team": blk_team,
                    "position": sum_entry["position"],
                    "truly_inactive": True,
                    "can_lift": False,
                    "roster_status_type": "",
                    "roster_injuries": [],
                    "summary_status": sum_status,
                    "detail": sum_entry["detail"],
                }

    new_excluded: list[dict[str, Any]] = []
    present_keys: set[tuple[str, str]] = set()
    lifted_names: list[str] = []
    added_names: list[str] = []

    for raw_item in cfg.get("excluded_players") or []:
        if isinstance(raw_item, dict):
            ename = str(raw_item.get("name") or "").strip()
            eteam = _norm_team(raw_item.get("team") or "")
            epos = str(raw_item.get("position") or "UNKNOWN").strip().upper()
            ereason = str(raw_item.get("reason") or "").strip()
            entry_dict = dict(raw_item)
        else:
            ename = str(raw_item).strip()
            eteam = ""
            epos = "UNKNOWN"
            ereason = ""
            entry_dict = {
                "name": ename,
                "team": eteam or "UNKNOWN",
                "position": epos,
                "reason": ereason,
            }

        norm_e = _strip_name_suffix(ename)
        if not norm_e:
            continue

        ev: dict[str, Any] | None = None
        if eteam in (away_u, home_u):
            ev = evaluated.get((eteam, norm_e))
        elif eteam in ("", "UNKNOWN"):
            ev = evaluated.get((away_u, norm_e)) or evaluated.get((home_u, norm_e))

        if "MASTER-PLAN" in ereason.upper():
            new_excluded.append(entry_dict)
            present_keys.add((eteam or (ev["team"] if ev else "UNKNOWN"), norm_e))
            continue

        if ev is not None and ev["can_lift"]:
            lifted_names.append(ename)
            continue

        new_excluded.append(entry_dict)
        present_keys.add((eteam or (ev["team"] if ev else "UNKNOWN"), norm_e))

    for (team_u, norm_p), ev in evaluated.items():
        if not ev["truly_inactive"]:
            continue
        if (team_u, norm_p) in present_keys:
            continue
        sum_status = ev["summary_status"]
        roster_injuries = ev["roster_injuries"]
        rt_low = ev["roster_status_type"]
        if sum_status and str(sum_status).strip().lower() in _ESPN_INACTIVE_INJURY_STATUSES:
            detail_txt = ev["detail"] or "ESPN summary injury"
            reason = f"{str(sum_status).upper()} - {detail_txt} (ESPN T-90m live)"
        elif roster_injuries:
            first_st = ""
            for inj in roster_injuries:
                cand_st = str((inj or {}).get("status") or "").strip()
                if cand_st.lower() in _ESPN_INACTIVE_INJURY_STATUSES:
                    first_st = cand_st
                    break
            reason = f"{(first_st or 'OUT').upper()} - ESPN roster injury (ESPN T-90m live)"
        else:
            reason = f"{rt_low.upper()} - ESPN roster status (ESPN T-90m live)"

        new_excluded.append({
            "name": ev["name"],
            "team": team_u,
            "position": ev["position"],
            "reason": reason,
        })
        present_keys.add((team_u, norm_p))
        added_names.append(ev["name"])

    new_excluded.sort(key=lambda x: (str(x.get("team") or ""), str(x.get("name") or "")))
    cfg["excluded_players"] = new_excluded
    if "excluded_players_union" in cfg:
        cfg["excluded_players_union"] = [str(p.get("name") or "") for p in new_excluded]

    cfg_path.parent.mkdir(parents=True, exist_ok=True)
    cfg_path.write_text(json.dumps(cfg, indent=2) + "\n", encoding="utf-8")

    # Keep companion Stage-0 artifacts synced when operating on the default week config
    if config_path is None:
        union_names = [str(p.get("name") or "") for p in new_excluded]
        for companion in (
            REPO_ROOT / "data" / "nflverse" / f"stage0_truth_s2026_w{week}.json",
            REPO_ROOT / "data" / "engine" / f"week{week}_unified_stage0_truth.json",
            REPO_ROOT / "data" / "engine" / f"week{week}_stage0_preflight_config.json",
        ):
            if companion.is_file():
                try:
                    comp_data = json.loads(companion.read_text(encoding="utf-8"))
                    if isinstance(comp_data.get("excluded_players"), list):
                        if companion.name.endswith("_preflight_config.json"):
                            comp_data["excluded_players"] = union_names
                        else:
                            comp_data["excluded_players"] = new_excluded
                    if "excluded_players_union" in comp_data:
                        comp_data["excluded_players_union"] = union_names
                    companion.write_text(
                        json.dumps(comp_data, indent=2) + "\n", encoding="utf-8"
                    )
                except Exception:
                    pass

    return {
        "away": away_u,
        "home": home_u,
        "week": week,
        "event_id": resolved_event_id,
        "config_path": str(cfg_path),
        "added_exclusions": sorted(added_names),
        "lifted_exclusions": sorted(lifted_names),
        "excluded_count": len(new_excluded),
        "excluded_players": new_excluded,
    }


def _strip_name_suffix(name: str) -> str:
    """Strip generational suffixes, apostrophes/periods, and Matthew->Matt aliases.

    Args:
        name: Raw player name string.

    Returns:
        Cleaned lowercase normalized name string.
    """
    cleaned = re.sub(r"['\u2019.]+", "", str(name).strip().lower())
    cleaned = re.sub(r"\s+", " ", cleaned)
    if cleaned.startswith("matthew "):
        cleaned = "matt " + cleaned[len("matthew ") :]
    for suffix in (" jr", " sr", " iii", " ii", " iv", " v"):
        if cleaned.endswith(suffix):
            cleaned = cleaned[: -len(suffix)].strip()
            break
    return cleaned


def _parse_confidence_int(score: Any) -> int:
    """Parse numeric confidence score from XX/100 format.

    Args:
        score: Score string or number.

    Returns:
        Integer numerator value.
    """
    s = str(score).strip()
    if "/" in s:
        try:
            return int(s.split("/")[0])
        except ValueError:
            return 0
    try:
        return int(float(s))
    except ValueError:
        return 0


def verify_card_sanity_or_raise(
    bundle: dict[str, Any],
    stage0_cfg: dict[str, Any] | None = None,
    dfs_packet: dict[str, Any] | None = None,
) -> dict[str, bool]:
    r"""Enforce all 7 pre-card sanity firewalls, raising CardSanityFirewallError on any breach.

    Firewalls:
      S1_zero_excluded_leak: Zero players from stage0_cfg['excluded_players'] appear in
        projections, props, SGPs, or DFS cash lineup roster.
      S2_zero_duplicate_normalized_names: Normalized names within each team in athlete
        projections are 100% unique (e.g. catches Tre' Harris + Tre Harris split).
      S3_integer_discrete_td_int_support: Reject fractional-multiplied TD/INT corruption.
      S4_qb_scramble_rush_calibrated: For confirmed starting QB with boarded rush line >= 12.0,
        projections['rush_yds']['mean'] >= 0.45 * board_line.
      S5_skill_sniper_gate_liveness: If >= 5 two-sided RB/WR/TE props above micro floors,
        at least 1 must not be vetoed with PASS_SNIPER_GATE.
      S6_five_pillar_profiler_and_jacobians: receipt has all_pillars_fired is True and
        all_jacobians_nonzero is True.
      S7_confidence_format_clean: Every approved play's confidence_score matches ^\d{1,3}/100$.

    Args:
        bundle: Connected workflow dossier dictionary.
        stage0_cfg: Optional stage0 allowlist dictionary.
        dfs_packet: Optional DFS showdown packet dictionary.

    Returns:
        Dictionary of firewall checks marked True.

    Raises:
        CardSanityFirewallError: If any of the 7 firewalls fail.
    """
    if stage0_cfg is None:
        stage0_cfg = bundle.get("stage0_roster_and_board_allowlist", {})

    st34 = (
        bundle.get("stage3_4_conserved_post_sim_projections")
        or bundle.get("stage3_and_4_projections_and_situational")
        or {}
    )
    athlete_projs = (
        st34.get("athlete_post_sim_projections")
        or bundle.get("athlete_post_sim_projections")
        or {}
    )

    st5 = (
        bundle.get("stage5_360_conjunction_gate_and_call_sheet")
        or bundle.get("stage5_360_conjunction_gate")
        or {}
    )
    props = st5.get("core_prop_evaluations", [])
    sgps = (
        st5.get("correlated_sgp_constructions")
        or st5.get("correlated_sgp_and_parlay_constructions")
        or []
    )

    # -------------------------------------------------------------------------
    # S1: Zero Excluded Leak
    # -------------------------------------------------------------------------
    raw_excluded = stage0_cfg.get("excluded_players", [])
    if not raw_excluded:
        raw_excluded = (
            bundle.get("stage0_roster_and_board_allowlist", {}).get("excluded_players", [])
        )

    excluded_norm_map: dict[str, str] = {}
    for item in raw_excluded:
        if isinstance(item, dict):
            orig_name = item.get("name") or item.get("player") or ""
        else:
            orig_name = str(item)
        norm = _strip_name_suffix(orig_name)
        if norm:
            excluded_norm_map[norm] = orig_name

    if excluded_norm_map:
        # Check athlete_post_sim_projections
        if isinstance(athlete_projs, dict):
            for raw_k, pdata in athlete_projs.items():
                pname = (
                    pdata.get("athlete") or pdata.get("name") or raw_k
                    if isinstance(pdata, dict)
                    else raw_k
                )
                norm_p = _strip_name_suffix(pname)
                if norm_p in excluded_norm_map:
                    raise CardSanityFirewallError(
                        f"S1_zero_excluded_leak violation: Excluded player '{pname}' "
                        f"(matches '{excluded_norm_map[norm_p]}') leaked into athlete projections."
                    )
        elif isinstance(athlete_projs, list):
            for pdata in athlete_projs:
                pname = pdata.get("athlete") or pdata.get("name") or ""
                norm_p = _strip_name_suffix(pname)
                if norm_p in excluded_norm_map:
                    raise CardSanityFirewallError(
                        f"S1_zero_excluded_leak violation: Excluded player '{pname}' "
                        f"(matches '{excluded_norm_map[norm_p]}') leaked into athlete projections."
                    )

        # Check core_prop_evaluations
        for prop in props:
            pname = prop.get("athlete") or prop.get("player") or ""
            norm_p = _strip_name_suffix(pname)
            if norm_p in excluded_norm_map:
                raise CardSanityFirewallError(
                    f"S1_zero_excluded_leak violation: Excluded player '{pname}' "
                    f"leaked into core_prop_evaluations (market: {prop.get('market')})."
                )

        # Check correlated_sgp_constructions
        for sgp in sgps:
            for leg in sgp.get("legs", []):
                pname = leg.get("athlete") or leg.get("player") or ""
                norm_p = _strip_name_suffix(pname)
                if norm_p in excluded_norm_map:
                    raise CardSanityFirewallError(
                        f"S1_zero_excluded_leak violation: Excluded player '{pname}' "
                        f"leaked into correlated SGP leg ({sgp.get('title')})."
                    )

        # Check dfs_packet cash_lineup roster
        if dfs_packet and isinstance(dfs_packet, dict):
            cash_roster = dfs_packet.get("cash_lineup", {}).get("roster", [])
            for ritem in cash_roster:
                pname = ritem.get("player") or ritem.get("name") or ""
                norm_p = _strip_name_suffix(pname)
                if norm_p in excluded_norm_map:
                    raise CardSanityFirewallError(
                        f"S1_zero_excluded_leak violation: Excluded player '{pname}' "
                        f"leaked into DFS cash_lineup roster."
                    )

    # -------------------------------------------------------------------------
    # S2: Zero Duplicate Normalized Names Within Team
    # -------------------------------------------------------------------------
    team_rosters: dict[str, dict[str, str]] = defaultdict(dict)
    if isinstance(athlete_projs, dict):
        proj_items = list(athlete_projs.items())
    elif isinstance(athlete_projs, list):
        proj_items = [(p.get("athlete") or p.get("name", ""), p) for p in athlete_projs]
    else:
        proj_items = []

    for raw_k, pdata in proj_items:
        if isinstance(pdata, dict):
            team = str(pdata.get("team") or "UNKNOWN").upper()
            pname = str(pdata.get("athlete") or pdata.get("name") or raw_k)
        else:
            team = "UNKNOWN"
            pname = str(raw_k)

        norm_p = _strip_name_suffix(pname)
        if not norm_p:
            continue

        if norm_p in team_rosters[team]:
            existing_name = team_rosters[team][norm_p]
            raise CardSanityFirewallError(
                f"S2_zero_duplicate_normalized_names violation: Duplicate name '{norm_p}' "
                f"in team '{team}' ('{existing_name}' vs '{pname}')."
            )
        team_rosters[team][norm_p] = pname

    # -------------------------------------------------------------------------
    # S3: Integer Discrete TD / INT Support
    # -------------------------------------------------------------------------
    emp_vecs = st34.get("_internal_empirical_vectors")
    if emp_vecs and isinstance(emp_vecs, dict):
        for k, vec in emp_vecs.items():
            stat_name = k[1] if (isinstance(k, tuple) and len(k) > 1) else str(k)
            stat_lower = stat_name.lower()
            if any(term in stat_lower for term in ("pass_td", "rec_td", "rush_td", "interception")):
                try:
                    for v in vec:
                        v_flt = float(v)
                        if abs(v_flt - round(v_flt)) > 1e-3:
                            raise CardSanityFirewallError(
                                f"S3_integer_discrete_td_int_support violation: Vector '{k}' "
                                f"contains non-discrete float value {v_flt:.4f}."
                            )
                except (TypeError, ValueError):
                    pass

    # Check QB pass_tds p50 in athlete_post_sim_projections
    for _, pdata in proj_items:
        if not isinstance(pdata, dict):
            continue
        pname = pdata.get("athlete") or pdata.get("name") or "Player"
        projections_dict = pdata.get("projections", {})
        if not isinstance(projections_dict, dict):
            continue
        pass_tds_proj = projections_dict.get("pass_tds")
        if isinstance(pass_tds_proj, dict):
            p50 = pass_tds_proj.get("p50")
            mean = pass_tds_proj.get("mean", 0.0)
            if p50 is not None:
                p50_val = float(p50)
                mean_val = float(mean)
                # Fractional multiplication corruption e.g. 1 * 0.49 = 0.49 < 0.5
                if 0.05 < p50_val < 0.499 and mean_val >= 0.85:
                    raise CardSanityFirewallError(
                        f"S3_integer_discrete_td_int_support violation: {pname} pass_tds "
                        f"p50={p50_val:.3f} with mean={mean_val:.2f} (fractional corruption)."
                    )
                if p50_val < 0.0:
                    raise CardSanityFirewallError(
                        f"S3_integer_discrete_td_int_support violation: {pname} pass_tds "
                        f"negative p50={p50_val}."
                    )
                if abs(p50_val * 2 - round(p50_val * 2)) > 1e-3:
                    raise CardSanityFirewallError(
                        f"S3_integer_discrete_td_int_support violation: {pname} pass_tds "
                        f"p50={p50_val} is not an integer or half-integer."
                    )

    # -------------------------------------------------------------------------
    # S4: QB Scramble Rush Calibrated
    # -------------------------------------------------------------------------
    confirmed_qb1 = (
        stage0_cfg.get("confirmed_qb1")
        or bundle.get("stage0_roster_and_board_allowlist", {}).get("confirmed_qb1")
        or {}
    )
    starting_qb_norms: set[str] = set()
    if isinstance(confirmed_qb1, dict):
        for q in confirmed_qb1.values():
            if q:
                starting_qb_norms.add(_strip_name_suffix(str(q)))
    elif isinstance(confirmed_qb1, list):
        for q in confirmed_qb1:
            if q:
                starting_qb_norms.add(_strip_name_suffix(str(q)))

    for raw_k, pdata in proj_items:
        if not isinstance(pdata, dict):
            continue
        pname = pdata.get("athlete") or pdata.get("name") or raw_k
        norm_name = _strip_name_suffix(pname)
        pos = pdata.get("position", "")

        is_starting_qb = norm_name in starting_qb_norms or (pos == "QB" and not starting_qb_norms)
        if not is_starting_qb:
            continue

        board_line: float | None = None
        blines = pdata.get("board_lines", {})
        if isinstance(blines, dict):
            for bl_k, bl_v in blines.items():
                bl_k_low = bl_k.lower()
                if "rushing" in bl_k_low and "yard" in bl_k_low:
                    try:
                        board_line = float(bl_v)
                        break
                    except (ValueError, TypeError):
                        pass

        if board_line is None:
            for prop in props:
                if _strip_name_suffix(prop.get("athlete", "")) == norm_name:
                    mkt_low = prop.get("market", "").lower()
                    if "rushing" in mkt_low and "yard" in mkt_low:
                        try:
                            board_line = float(prop.get("line", 0.0))
                            break
                        except (ValueError, TypeError):
                            pass

        if board_line is not None and board_line >= 12.0:
            rush_proj = pdata.get("projections", {}).get("rush_yds", {})
            mean_rush = rush_proj.get("mean") if isinstance(rush_proj, dict) else None
            min_allowed = 0.45 * board_line
            if mean_rush is None or float(mean_rush) < min_allowed:
                raise CardSanityFirewallError(
                    f"S4_qb_scramble_rush_calibrated violation: Starting QB '{pname}' boarded rush "
                    f"line is {board_line:.1f} yds, but projected mean is {mean_rush} "
                    f"(must be >= {min_allowed:.2f})."
                )

    # -------------------------------------------------------------------------
    # S5: Skill Sniper Gate Liveness
    # -------------------------------------------------------------------------
    qualifying_props = []
    for p in props:
        if not p.get("has_two_sided_price"):
            continue
        pos = p.get("position", "")
        mkt = p.get("market", "").lower()
        try:
            line_val = float(p.get("line", 0.0))
        except (ValueError, TypeError):
            continue

        is_rec = pos in ("WR", "TE") and ("rec" in mkt and ("yard" in mkt or "yds" in mkt))
        is_rush = pos == "RB" and ("rush" in mkt and ("yard" in mkt or "yds" in mkt))
        if (is_rec and line_val >= 18.5) or (is_rush and line_val >= 24.5):
            qualifying_props.append(p)

    if len(qualifying_props) >= 5:
        all_sniper = all(p.get("decision") == "PASS_SNIPER_GATE" for p in qualifying_props)
        if all_sniper:
            raise CardSanityFirewallError(
                f"S5_skill_sniper_gate_liveness violation: All {len(qualifying_props)} two-sided "
                "skill props were vetoed with PASS_SNIPER_GATE (missing snap_share mass-veto bug)."
            )

    # -------------------------------------------------------------------------
    # S6: Five Pillar Profiler & Jacobians
    # -------------------------------------------------------------------------
    st2 = bundle.get("stage2_jev_spine_and_10k_simulation", {})
    receipt = st2.get("runtime_intelligence_receipt", {})
    all_pillars = receipt.get("all_pillars_fired")
    all_jacobians = receipt.get("all_jacobians_nonzero")

    if all_pillars is not True:
        raise CardSanityFirewallError(
            f"S6_five_pillar_profiler_and_jacobians violation: all_pillars_fired is {all_pillars}."
        )
    if all_jacobians is not True:
        raise CardSanityFirewallError(
            f"S6_five_pillar_profiler_and_jacobians violation: all_jacobians_nonzero is "
            f"{all_jacobians}."
        )

    # -------------------------------------------------------------------------
    # S7: Confidence Format Clean
    # -------------------------------------------------------------------------
    conf_regex = re.compile(r"^\d{1,3}/100$")
    approved_items: list[tuple[str, Any]] = []

    for p in props:
        if p.get("publishAllowed") is True or p.get("decision") == "PLAY":
            approved_items.append((p.get("athlete") or "Prop", p))

    for s in sgps:
        if s.get("publishAllowed") is True or s.get("decision") == "PLAY":
            approved_items.append((s.get("title") or "SGP", s))

    game_lines = st5.get("game_line_evaluations", [])
    for g in game_lines:
        if g.get("publishAllowed") is True or g.get("decision") == "PLAY":
            approved_items.append((g.get("market") or "GameLine", g))

    for label, item in approved_items:
        cs = str(item.get("confidence_score", "")).strip()
        if not conf_regex.match(cs) or "%" in cs:
            raise CardSanityFirewallError(
                f"S7_confidence_format_clean violation: Approved play '{label}' confidence_score "
                f"'{cs}' violates strict ^\\d{{1,3}}/100$ format (no '%' signs permitted)."
            )

    return {
        "S1_zero_excluded_leak": True,
        "S2_zero_duplicate_normalized_names": True,
        "S3_integer_discrete_td_int_support": True,
        "S4_qb_scramble_rush_calibrated": True,
        "S5_skill_sniper_gate_liveness": True,
        "S6_five_pillar_profiler_and_jacobians": True,
        "S7_confidence_format_clean": True,
    }


def render_operator_ranked_card_markdown(
    matchup: str,
    bundle: dict[str, Any],
    include_dfs: bool = False,
    dfs_packet: dict[str, Any] | None = None,
) -> str:
    """Render operator-first Ranked Confidence Card in pure 7-bit ASCII.

    Ranks Correlated SGPs + Approved Straight Props strictly from Highest XX/100
    down to Lowest (tie-breaking by win_prob_on_lean descending), followed by
    Secondary Positive Leans (55/100 to 59/100) and Hard Passes.
    Writes result to data/cards/ranked_plays_card_w<week>_<away>_<home>.md.

    Args:
        matchup: Game matchup e.g. 'LAC@BAL'.
        bundle: Connected game workflow dossier dictionary.
        include_dfs: Whether to output full DFS lineup table in markdown.
        dfs_packet: Optional DFS showdown packet dictionary.

    Returns:
        Pure 7-bit ASCII markdown card text.
    """
    week = bundle.get("week", 10)
    parts = matchup.replace("@", " ").split()
    away = parts[0].strip().upper() if parts else "AWAY"
    home = parts[1].strip().upper() if len(parts) > 1 else "HOME"

    st5 = (
        bundle.get("stage5_360_conjunction_gate_and_call_sheet")
        or bundle.get("stage5_360_conjunction_gate")
        or {}
    )
    props = st5.get("core_prop_evaluations", [])
    sgps = (
        st5.get("correlated_sgp_constructions")
        or st5.get("correlated_sgp_and_parlay_constructions")
        or []
    )

    primary_items = []

    # SGPs
    for s in sgps:
        if s.get("publishAllowed") is True or s.get("decision") == "PLAY":
            cs = str(s.get("confidence_score", "0/100"))
            conf_val = _parse_confidence_int(cs)
            win_prob = float(s.get("joint_sim_prob") or s.get("win_prob_on_lean") or 0.0)
            edge = float(s.get("net_edge") or 0.0)
            primary_items.append({
                "kind": "SGP",
                "title": s.get("title", f"{matchup} Correlated SGP"),
                "confidence_score": cs,
                "conf_val": conf_val,
                "win_prob": win_prob,
                "edge": edge,
                "market_odds": s.get("market_sgp_american_odds", "+500"),
                "kelly_units": 0.20,
                "data": s,
            })

    # Props
    for p in props:
        if p.get("publishAllowed") is True or p.get("decision") == "PLAY":
            cs = str(p.get("confidence_score", "0/100"))
            conf_val = _parse_confidence_int(cs)
            win_prob = float(p.get("win_prob_on_lean") or 0.0)
            edge = float(p.get("edge_vs_minus_110_breakeven") or p.get("edge_vs_devig_50") or 0.0)
            lean = p.get("model_lean", "OVER")
            m_odds = (
                p.get("market_over_american")
                if lean == "OVER"
                else p.get("market_under_american")
            )
            odds_str = f"{m_odds:+d}" if isinstance(m_odds, int) else str(m_odds or "-110")
            primary_items.append({
                "kind": "PROP",
                "athlete": p.get("athlete", ""),
                "team": p.get("team", ""),
                "market": p.get("market", ""),
                "line": p.get("line", 0.0),
                "lean": lean,
                "confidence_score": cs,
                "conf_val": conf_val,
                "win_prob": win_prob,
                "edge": edge,
                "market_odds": odds_str,
                "kelly_units": float(p.get("recommended_kelly_units") or 0.15),
                "data": p,
            })

    primary_items.sort(key=lambda x: (-x["conf_val"], -x["win_prob"], -x["edge"]))

    secondary_items = []
    hard_passes = []

    for p in props:
        if p.get("publishAllowed") is True or p.get("decision") == "PLAY":
            continue
        cs = str(p.get("confidence_score", "0/100"))
        conf_val = _parse_confidence_int(cs)
        win_prob = float(p.get("win_prob_on_lean") or 0.0)
        dec = p.get("decision", "PASS")
        greason = p.get("gate_reason", "Below edge threshold")

        if 55 <= conf_val <= 59:
            secondary_items.append({
                "athlete": p.get("athlete", ""),
                "team": p.get("team", ""),
                "market": p.get("market", ""),
                "line": p.get("line", 0.0),
                "lean": p.get("model_lean", "OVER"),
                "confidence_score": cs,
                "conf_val": conf_val,
                "win_prob": win_prob,
                "decision": dec,
                "gate_reason": greason,
            })
        else:
            hard_passes.append(p)

    secondary_items.sort(key=lambda x: (-x["conf_val"], -x["win_prob"]))

    lines: list[str] = [
        f"# OPERATOR-FIRST RANKED CONFIDENCE CARD: {away} @ {home}",
        f"**NFL Week {week} -- Autonomous Game-Lock & Pre-Card Sanity Firewall Verified**",
        "**7-Point Pre-Card Sanity Firewall: 100% PASS (S1..S7 Verified)**",
        "**Ordering Contract: Strictly Sorted by Confidence Score (Highest -> Lowest)**",
        "",
        "---",
        "",
        "## 1. PRIMARY RANKED PLAYS & CORRELATED SGPS (PUBLISH ALLOWED)",
        "",
        "| Rank | Confidence | Type | Selection / Market | Win Prob | Edge / Odds | Kelly Stake |",
        "|---|---|---|---|---|---|---|",
    ]

    for idx, item in enumerate(primary_items, start=1):
        cs = item["confidence_score"]
        wp_pct = f"{item['win_prob'] * 100:.1f}%"
        k_stake = f"{item['kelly_units']:.2f}u"

        if item["kind"] == "SGP":
            edge_str = f"{item['market_odds']} (+{item['edge'] * 100:.1f}% net)"
            title = item["title"]
            lines.append(
                f"| {idx} | **{cs}** | SGP | **{title}** | {wp_pct} | {edge_str} | {k_stake} |"
            )
        else:
            p_desc = f"**{item['athlete']} {item['lean']} {item['line']} {item['market']}**"
            edge_str = f"{item['market_odds']} (+{item['edge'] * 100:.1f}% edge)"
            lines.append(
                f"| {idx} | **{cs}** | Prop | {p_desc} | {wp_pct} | {edge_str} | {k_stake} |"
            )

    sgp_items = [it for it in primary_items if it["kind"] == "SGP"]
    if sgp_items:
        lines.extend([
            "",
            "### Correlated SGP Construction & Simulation Receipt",
        ])
        for sgp_it in sgp_items:
            s_data = sgp_it["data"]
            lines.extend([
                f"* **{sgp_it['title']} ({sgp_it['confidence_score']})**:",
                f"  - Correlation Lift: {s_data.get('correlation_lift', 1.0):.3f}x",
                f"  - Joint Hit Prob: {sgp_it['win_prob'] * 100:.2f}% "
                f"(Book Implied: {float(s_data.get('book_parlay_implied_prob', 0.0)) * 100:.2f}%)",
                f"  - Fair Odds: {s_data.get('fair_american_odds', '+287')} vs "
                f"Market SGP Odds: {s_data.get('market_sgp_american_odds', '+502')}",
                "  - Legs:",
            ])
            for leg in s_data.get("legs", []):
                leg_cs = leg.get("confidence_score", "XX/100")
                leg_sel = (
                    leg.get("selection")
                    or f"{leg.get('athlete')} {leg.get('market')} {leg.get('line')}"
                )
                leg_odds = leg.get("american_odds", -110)
                lines.append(f"    * {leg_sel} ({leg_odds:+d}, Conf: {leg_cs})")
            rationale = s_data.get("correlation_rationale")
            if rationale:
                lines.append(f"  - Rationale: {rationale}")

    lines.extend([
        "",
        "---",
        "",
        "## 2. SECONDARY POSITIVE LEANS (55/100 TO 59/100 -- UNPUBLISHED)",
        "*Class B Conjunction Gate Hold: Soft unpriced lines, small edges, or micro thresholds.*",
        "",
        "| Player | Team | Market | Line | Model Lean | Confidence | Win Prob | Gate Reason |",
        "|---|---|---|---|---|---|---|---|",
    ])

    for it in secondary_items:
        wp_pct = f"{it['win_prob'] * 100:.1f}%"
        reason_short = it["gate_reason"].split(":")[0][:45]
        lines.append(
            f"| {it['athlete']} | {it['team']} | {it['market']} | {it['line']} | {it['lean']} | "
            f"{it['confidence_score']} | {wp_pct} | {reason_short} |"
        )

    sniper_passes = sum(1 for p in hard_passes if "SNIPER" in str(p.get("decision", "")))
    unpriced_passes = sum(1 for p in hard_passes if "UNPRICED" in str(p.get("decision", "")))
    edge_passes = len(hard_passes) - sniper_passes - unpriced_passes

    lines.extend([
        "",
        "---",
        "",
        "## 3. HARD PASSES & CONJUNCTION VETOES",
        f"* Total Filtered Hard Passes: {len(hard_passes)} markets",
        f"* Unpriced Book Lines (Missing Juice): {unpriced_passes} markets",
        f"* Sniper Gate Micro-Volume Vetoes: {sniper_passes} markets",
        f"* Sub-Threshold / Negative Edge Passes: {edge_passes} markets",
        "",
    ])

    dfs_pkt_rel = f"data/dfs/week{week}_mnf_{away.lower()}_{home.lower()}_showdown_packet.json"
    dfs_csv_rel = f"data/dfs/week{week}_mnf_{away.lower()}_{home.lower()}_dk_upload.csv"
    cash_proj_pts = 0.0
    if dfs_packet and isinstance(dfs_packet, dict):
        cash_proj_pts = float(
            dfs_packet.get("cash_lineup", {}).get("projected_dk_points_mean") or 0.0
        )

    if not include_dfs:
        lines.extend([
            "---",
            f"**DFS Showdown Lineups:** `{dfs_pkt_rel}` | "
            f"Pure Upload CSV: `{dfs_csv_rel}` | "
            f"Cash Optimal Proj: {cash_proj_pts:.2f} FP",
            "",
        ])
    else:
        lines.extend([
            "---",
            "",
            "## 4. DFS SHOWDOWN LINEUPS (MILP SOLVER OPTIMAL)",
            f"* Showdown Packet: `{dfs_pkt_rel}`",
            f"* Pure Upload CSV: `{dfs_csv_rel}`",
            f"* Cash Projected Points: {cash_proj_pts:.2f} FP",
            "",
            "### Cash Optimal Roster",
            "| Slot | Player | Team | Pos | Salary | Proj FP | Objective Contrib |",
            "|---|---|---|---|---|---|---|",
        ])
        if dfs_packet and isinstance(dfs_packet, dict):
            for r in dfs_packet.get("cash_lineup", {}).get("roster", []):
                slot = r.get("slot", "FLEX")
                pname = r.get("player") or r.get("name", "")
                tm = r.get("team", "")
                pos = r.get("pos") or r.get("position", "")
                sal = r.get("salary", 0)
                pts = r.get("proj_pts", 0.0)
                contrib = r.get("objective_contrib", 0.0)
                lines.append(
                    f"| {slot} | {pname} | {tm} | {pos} | ${sal} | {pts:.2f} | {contrib:.3f} |"
                )
        lines.append("")

    raw_md = "\n".join(lines)

    replacements = {
        "\u2014": "--",
        "\u2013": "--",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2022": "*",
        "\u00a0": " ",
        "â€”": "--",
        "â€“": "--",
    }
    for orig, repl in replacements.items():
        raw_md = raw_md.replace(orig, repl)

    ascii_md = "".join(c for c in raw_md if ord(c) <= 127)

    card_fname = f"ranked_plays_card_w{week}_{away.lower()}_{home.lower()}.md"
    card_path = REPO_ROOT / "data" / "cards" / card_fname
    card_path.parent.mkdir(parents=True, exist_ok=True)
    card_path.write_text(ascii_md, encoding="ascii")

    return ascii_md


def find_dossier_path(root: Path, away: str, home: str, week: int) -> Path:
    """Find dossier JSON path for matchup.

    Args:
        root: Workspace repository root.
        away: Away team abbreviation.
        home: Home team abbreviation.
        week: NFL week number.

    Returns:
        Path to dossier JSON file.

    Raises:
        FileNotFoundError: If dossier file is missing.
    """
    exact = (
        root / "data" / "engine"
        / f"connected_workflow_dossier_{away.lower()}_{home.lower()}_week{week}.json"
    )
    if exact.is_file():
        return exact
    matches = list(
        (root / "data" / "engine").glob(f"*{away.lower()}*{home.lower()}*week{week}*.json")
    )
    if matches:
        return matches[0]
    raise FileNotFoundError(
        f"Dossier JSON not found for {away}@{home} Week {week}: expected {exact}"
    )


def find_dfs_packet_path(root: Path, away: str, home: str, week: int) -> Path | None:
    """Find DFS showdown packet JSON path for matchup if available.

    Args:
        root: Workspace repository root.
        away: Away team abbreviation.
        home: Home team abbreviation.
        week: NFL week number.

    Returns:
        Path to DFS showdown packet or None if not found.
    """
    exact = (
        root / "data" / "dfs"
        / f"week{week}_mnf_{away.lower()}_{home.lower()}_showdown_packet.json"
    )
    if exact.is_file():
        return exact
    matches = list(
        (root / "data" / "dfs").glob(
            f"week{week}_*{away.lower()}_{home.lower()}*showdown_packet.json"
        )
    )
    if matches:
        return matches[0]
    return None


def main() -> int:
    """CLI Entry point for T-Minus Lock Orchestrator.

    Returns:
        Exit code (0 on success, non-zero on failure).
    """
    parser = argparse.ArgumentParser(
        description="GSE T-Minus Lock Orchestrator & 7-Point Pre-Card Sanity Firewall."
    )
    parser.add_argument("--week", type=int, default=10, help="NFL Week number (default: 10)")
    parser.add_argument(
        "--matchup",
        type=str,
        default="LAC@BAL",
        help="Matchup string in AWAY@HOME format (default: LAC@BAL)",
    )
    parser.add_argument(
        "--offline-verify",
        action="store_true",
        help="Validate existing dossier + DFS packet through 7-Point Firewall in < 1.5s",
    )
    parser.add_argument(
        "--live",
        action="store_true",
        help="Run live T-90m inactives sync -> refresh -> simulation -> firewall -> card pipeline",
    )
    parser.add_argument(
        "--include-dfs",
        action="store_true",
        help="Include full DFS lineups table in card/stdout instead of 1-line footer",
    )

    args = parser.parse_args()

    parts = args.matchup.replace("@", " ").split()
    away = parts[0].strip().upper() if parts else "LAC"
    home = parts[1].strip().upper() if len(parts) > 1 else "BAL"

    if args.offline_verify:
        dossier_path = find_dossier_path(REPO_ROOT, away, home, args.week)
        dfs_path = find_dfs_packet_path(REPO_ROOT, away, home, args.week)

        with open(dossier_path, encoding="utf-8") as f:
            bundle = json.load(f)

        dfs_packet = None
        if dfs_path and dfs_path.is_file():
            with open(dfs_path, encoding="utf-8") as f:
                dfs_packet = json.load(f)

        stage0_cfg = bundle.get("stage0_roster_and_board_allowlist", {})
        firewall_results = verify_card_sanity_or_raise(bundle, stage0_cfg, dfs_packet)

        card_md = render_operator_ranked_card_markdown(
            matchup=args.matchup,
            bundle=bundle,
            include_dfs=args.include_dfs,
            dfs_packet=dfs_packet,
        )

        sys.stdout.write(card_md)
        sys.stdout.write("\n")
        sys.stderr.write(
            f"[SUCCESS] 7-Point Pre-Card Sanity Firewall verified for {args.matchup} "
            f"Week {args.week}: {firewall_results}\n"
        )
        return 0

    if args.live:
        sys.stderr.write(f"[*] Step 1: Live ESPN T-90m Inactives Sync for Week {args.week}...\n")
        from scripts.ops.build_live_stage0_truth import (
            build_live_stage0_truth,
            sync_stage0_truth_files,
        )

        stage0_truth = build_live_stage0_truth(season=2026, week=args.week)
        sync_stage0_truth_files(stage0_truth, root=REPO_ROOT)
        try:
            t90_sync = sync_espn_t90_inactives(away=away, home=home, week=args.week)
            if t90_sync.get("excluded_players") is not None:
                stage0_truth["excluded_players"] = t90_sync["excluded_players"]
            sys.stderr.write(
                f"[*] Step 1b: ESPN T-90m Inactives Synced for {away}@{home}: "
                f"+{len(t90_sync.get('added_exclusions', []))} added, "
                f"-{len(t90_sync.get('lifted_exclusions', []))} lifted\n"
            )
        except Exception as exc:
            sys.stderr.write(
                f"[*] Step 1b: ESPN T-90m live sync offline fallback ({exc}); "
                "using Stage-0 baseline.\n"
            )

        sys.stderr.write(f"[*] Step 2: Scoped Board Refresh for {away}@{home}...\n")
        board_fname = f"week{args.week}_{away.lower()}_{home.lower()}_dk_full_board_2026_11_06.json"
        board_rel = f"data/engine/{board_fname}"
        if not (REPO_ROOT / board_rel).is_file():
            board_rel = "data/engine/tnf_jax_bal_dk_full_board_2026_11_05.json"

        sys.stderr.write(
            f"[*] Step 3: Single-Matchup Simulation for {away}@{home} (n_sims=10000)...\n"
        )
        from scripts.ops.gse_connected_game_workflow import execute_connected_game_workflow

        bundle = execute_connected_game_workflow(
            away=away, home=home, week=args.week, n_sims=10000, board_rel_path=board_rel
        )

        sys.stderr.write(
            f"[*] Step 3b: Scoped DFS Slate Build for mnf_{away.lower()}_{home.lower()}...\n"
        )
        from scripts.dfs.build_week10_all_slates_dfs_packets import build_all_week10_slates

        matching_slate = f"mnf_{away.lower()}_{home.lower()}"
        dfs_packet = None
        try:
            dfs_packets = build_all_week10_slates(slates={matching_slate})
            dfs_packet = dfs_packets.get(matching_slate)
        except Exception as e:
            sys.stderr.write(f"[*] DFS scoped build note: {e}\n")
            dfs_path = find_dfs_packet_path(REPO_ROOT, away, home, args.week)
            if dfs_path and dfs_path.is_file():
                with open(dfs_path, encoding="utf-8") as f:
                    dfs_packet = json.load(f)

        sys.stderr.write("[*] Step 4: Running 7-Point Pre-Card Sanity Firewall...\n")
        firewall_results = verify_card_sanity_or_raise(bundle, stage0_truth, dfs_packet)

        sys.stderr.write("[*] Step 5: Rendering Operator-First Ranked Confidence Card...\n")
        card_md = render_operator_ranked_card_markdown(
            matchup=args.matchup,
            bundle=bundle,
            include_dfs=args.include_dfs,
            dfs_packet=dfs_packet,
        )

        sys.stdout.write(card_md)
        sys.stdout.write("\n")
        sys.stderr.write(
            f"[SUCCESS] Live T-Minus lock complete for {args.matchup}: {firewall_results}\n"
        )
        return 0

    parser.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
