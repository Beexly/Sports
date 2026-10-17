"""The Matchup Engine: specific receiver vs specific coverage, OL vs specific rusher.

The depth the market does not have (doctrine Move 3): the market prices team
tendencies; this engine prices SPECIFIC matchups in SPECIFIC conditions.

Method (corpus-honest, every row cites its file):
- OFFENSE side: NGS receiving table (data.markdown) ranks each team's
  receivers by targets (TAR) -> WR1/WR2/TE1/RB1 usage titles, with measured
  form: separation (SEP), YAC above expectation (EYAC/R), catch rate.
- DEFENSE side: the gated ESPN injury digest yields the opposing coverage
  unit (CB/S/LB) and defensive line (DE/DT/ED) availability, player by player.
- PAIRING: each offensive usage title is paired against the opposing
  coverage-availability picture; the OL block against the opposing
  pass-rusher availability (active starters vs doubtful/out).
- SYNTHESIS: chain strings with citations, ready for the analyst card and
  the causal-chain board. No invented numbers - if the corpus lacks the
  defender, the pairing says so as a named gap.

Usage:
    python intelligence/matchups/matchup_engine.py --home PHI --away DAL
    -> docs/predictions/research/<date>/DAL@PHI-matchups.md
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SOURCES = REPO / "docs" / "data-sources" / "research"
OUTROOT = REPO / "docs" / "predictions" / "research"

NGS_FILE = SOURCES / "2026-10-13" / "nextgenstats.nfl.com_stats_receiving#yards.2026-07-03T13_39_35.994Z.json"
NGS_RUSH_FILE = SOURCES / "2026-10-13" / "nextgenstats.nfl.com_stats_rushing#yards.2026-07-03T13_53_05.758Z.json"
INJ_FILE = SOURCES / "2026-10-13" / "injuries" / "espn_nfl_injuries_week6.json"
DC_FILE = SOURCES / "2026-10-13" / "depthcharts" / "espn-depthcharts-2026.json"

COVERAGE_POS = {"CB", "S", "SAF", "FS", "SS", "NB", "DB"}
RUSH_POS = {"DE", "DT", "ED", "DL", "NT", "OLB", "EDGE"}


def _load(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _receivers() -> dict[str, list[dict]]:
    """team -> receivers parsed from the NGS markdown table."""
    d = _load(NGS_FILE)
    if not d:
        return {}
    md = ((d.get("data") or {}).get("markdown") or "")
    rows: dict[str, list[dict]] = {}
    for line in md.splitlines():
        if not (line.startswith("|") and line.count("|") >= 8):
            continue
        cells = [c.strip() for c in line.split("|")[1:-1]]
        if len(cells) < 15 or not cells[0] or cells[0] == "PLAYER NAME":
            continue
        team, pos = cells[1], cells[2]
        try:
            row = {
                "player": cells[0], "team": team, "pos": pos,
                # 2025-SEASON SNAPSHOT (file 2026-07-03): baseline form, one season stale
                "season_label": "2025-snapshot",
                "cushion": float(cells[3]), "sep": float(cells[4]),
                "tay": float(cells[5]), "rec": int(cells[7]), "tar": int(cells[8]),
                "catch_pct": float(cells[9]), "yards": float(cells[10]), "td": int(cells[11]),
                "yac_per_r": float(cells[12]), "eyac_per_r": float(cells[13]),
                "source": str(NGS_FILE.relative_to(REPO)).replace("\\", "/"),
            }
        except (ValueError, IndexError):
            continue
        rows.setdefault(team, []).append(row)
    for team in rows:
        seen: dict[str, dict] = {}
        for r in sorted(rows[team], key=lambda r: r["tar"], reverse=True):
            seen.setdefault(r["player"], r)  # keep the highest-target row per player
        rows[team] = sorted(seen.values(), key=lambda r: r["tar"], reverse=True)
    return rows


def _rushers() -> dict[str, list[dict]]:
    """team -> rushers from the NGS rushing markdown table (col 3 = ATT when
    present; this capture: PLAYER, TEAM, EFF, 8+D%, TLOS, ATT, YDS, RYOE, AVG, ...)."""
    d = _load(NGS_RUSH_FILE)
    if not d:
        return {}
    md = ((d.get("data") or {}).get("markdown") or "")
    rows: dict[str, list[dict]] = {}
    for line in md.splitlines():
        if not (line.startswith("|") and line.count("|") >= 8):
            continue
        cells = [c.strip() for c in line.split("|")[1:-1]]
        if len(cells) < 9 or not cells[0] or cells[0] == "PLAYER NAME":
            continue
        try:
            row = {
                "player": cells[0], "team": cells[1], "pos": "RB",
                "att": int(cells[5]), "yards": float(cells[6]),
                "ryoe": float(cells[7]),
                "source": str(NGS_RUSH_FILE.relative_to(REPO)).replace("\\", "/"),
            }
        except (ValueError, IndexError):
            continue
        rows.setdefault(cells[1], []).append(row)
    for team in rows:
        seen: dict[str, dict] = {}
        for r in sorted(rows[team], key=lambda r: r["att"], reverse=True):
            seen.setdefault(r["player"], r)
        rows[team] = list(seen.values())
    return rows


def _injuries() -> dict[str, list[dict]]:
    d = _load(INJ_FILE)
    out: dict[str, list[dict]] = {}
    for t in (d or {}).get("teams") or []:
        team = t.get("team")
        entries = []
        for e in t.get("injuries") or []:
            entries.append({
                "player": e.get("athlete"), "pos": e.get("position"),
                "status": (e.get("status") or "").upper(),
                "detail": e.get("detail"),
                "source": str(INJ_FILE.relative_to(REPO)).replace("\\", "/"),
            })
        out[team] = entries
    return out


CB_POS_KEYS = ("LCB", "RCB", "NB")


def _depth_chart() -> dict:
    """team_abbr -> {unit|POS: [(slot, name), ...]} from the ESPN 2026 capture."""
    d = _load(DC_FILE)
    return (d or {}).get("teams") or {}


def _corners(dc_team: dict) -> list[dict]:
    """CB ladder (LCB/RCB/NB) with slot + name, ordered by slot then list order."""
    out: list[dict] = []
    for key, rows in dc_team.items():
        pos = key.split("|")[-1]
        if pos not in CB_POS_KEYS:
            continue
        for r in rows:
            out.append({"pos": pos, "slot": r.get("slot"), "player": r.get("athlete")})
    return out


def usage_titles(team_receivers: list[dict], rushers: list[dict] | None = None) -> dict[str, dict]:
    """WR1/WR2/TE1 by targets; RB1 from the rushing table by carries."""
    titles: dict[str, dict] = {}
    wrs = [r for r in team_receivers if r["pos"] == "WR"]
    tes = [r for r in team_receivers if r["pos"] == "TE"]
    if wrs:
        titles["WR1"] = wrs[0]
    if len(wrs) > 1:
        titles["WR2"] = wrs[1]
    if tes:
        titles["TE1"] = tes[0]
    for r in (rushers or [])[:1]:
        r = dict(r)
        r["usage_title_basis"] = f"rush att {r['att']}, RYOE {r['ryoe']}"
        titles["RB1"] = r
    return titles


def build_matchups(home: str, away: str) -> dict:
    recv = _receivers()
    rush = _rushers()
    inj = _injuries()
    gaps: list[str] = []
    if not recv:
        gaps.append(f"NGS receiving table unreadable ({NGS_FILE.name})")
    if home not in inj or away not in inj:
        gaps.append(f"injury digest missing a team block ({home}/{away})")

    report = {"game": f"{away}@{home}", "generated_utc": datetime.now(timezone.utc).isoformat(),
              "gaps": gaps, "pairings": [], "ol_vs_rush": None, "chains": []}

    off_team, def_team = home, away  # home offense vs away defense, and vice versa
    for side, (o, d) in (("HOME-OFF vs AWAY-DEF", (off_team, def_team)),
                          ("AWAY-OFF vs HOME-DEF", (def_team, off_team))):
        o_recv = recv.get(o, [])
        d_inj = inj.get(d, [])
        cov_out = [x for x in d_inj if (x.get("pos") in COVERAGE_POS) and x.get("status") in ("OUT", "INJURED RESERVE", "IR", "DOUBTFUL")]
        cov_q = [x for x in d_inj if (x.get("pos") in COVERAGE_POS) and x.get("status") == "QUESTIONABLE"]
        titles = usage_titles(o_recv, rush.get(o, []))
        dchart = _depth_chart().get(d, {})
        corners = _corners(dchart) if dchart else []
        inj_by_name = {x["player"]: x for x in d_inj}
        for title, r in titles.items():
            # Specific pairing (the doctrine's demand): top-2 WR/TE vs the
            # opposing CB ladder slot-1s, each with his on-report status.
            cb_pairs = []
            if r["pos"] in ("WR", "TE") and corners:
                starters = [c for c in corners if c.get("slot") and c["slot"] == min(c2["slot"] for c2 in corners if c2.get("slot"))]
                seen = set()
                for c in starters:
                    if c["player"] in seen or c["player"] in ("?", None):
                        continue
                    seen.add(c["player"])
                    st = inj_by_name.get(c["player"], {}).get("status", "not-on-report")
                    cb_pairs.append(f"{c['player']} ({c['pos']}, slot-1, {st})")
            pair = {
                "side": side,
                "usage_title": title,
                "matched_cornerbacks": cb_pairs,
                "receiver": r["player"], "receiver_form": {
                    "targets": r.get("tar", r.get("att")),
                    "separation_yds": r.get("sep"),
                    "yac_over_expected": r.get("eyac_per_r"),
                    "catch_pct": r.get("catch_pct"),
                    "usage_basis": r.get("usage_title_basis", "targets"),
                },
                "opposing_coverage_status": {  # on-report statuses only (ESPN lists report players, not healthy starters)
                    "out_or_limited": [f"{x['player']} ({x['pos']}, {x['status']})" for x in cov_out],
                    "questionable": [f"{x['player']} ({x['pos']}, {x['status']})" for x in cov_q],
                },
                "source_receiver": r.get("source", ""),
                "source_defense": INJ_FILE.name,
            }
            report["pairings"].append(pair)
            # chain: only when the corpus actually shows a coverage void
            if cb_pairs:
                q_cbs = [c for c in cb_pairs if "Questionable" in c or "Doubtful" in c or "OUT" in c.upper()]
                if q_cbs:
                    report["chains"].append(
                        f"{side}: {r['player']} leads {o} pass-catchers (2025-baseline targets {r.get('tar', '?')}, separation {r.get('sep', '?')} yds) [{r['source']}] "
                        f"-> draws the opposing slot-1 corner ladder: {', '.join(cb_pairs[:3])} [{DC_FILE.name}] "
                        f"-> {'the starter(s) he meets are on the injury report (' + '; '.join(q_cbs) + ') - a specific receiver vs a weakened specific defender, the pairing the market prices as a team tendency' if q_cbs else 'starters healthy - pairing is neutral'} "
                        f"-> breaking condition: pre-kick scratch/activation flips this pairing, and depth-chart slot changes void it"
                    )
                break  # one specific pairing chain per side (WR1 is the usage leader)
            if cov_out:
                names = "; ".join(f"{x['player']} ({x['pos']}, {x['status']})" for x in cov_out[:3])
                report["chains"].append(
                    f"{side}: {r['player']} leads {o} receivers in targets ({r['tar']}) with measured separation "
                    f"{r['sep']} yds and YAC-over-expected {r['eyac_per_r']} [{r['source']}] "
                    f"-> opposing coverage is missing {names} [{INJ_FILE.name}] "
                    f"-> the coverage void meets the usage leader: expect target concentration and a cheaper-than-fair conversion rate; "
                    f"breaking condition: the cited defender is announced active, which voids the void"
                )
    # OL vs rush: opposing front availability
    if home in inj and away in inj:
        def_front = [x for x in inj.get(away, []) if x.get("pos") in RUSH_POS]
        active = [x for x in def_front if x.get("status") == "ACTIVE"]
        down = [x for x in def_front if x.get("status") in ("OUT", "DOUBTFUL", "INJURED RESERVE", "IR")]
        q = [x for x in def_front if x.get("status") == "QUESTIONABLE"]
        report["ol_vs_rush"] = {
            "side": f"HOME-OL vs AWAY-FRONT",
            "front_active_on_report": [f"{x['player']} ({x['pos']})" for x in active],
            "front_down": [f"{x['player']} ({x['pos']}, {x['status']})" for x in down],
            "front_questionable": [f"{x['player']} ({x['pos']}, {x['status']})" for x in q],
            "source": INJ_FILE.name,
        }
        if down:
            names = "; ".join(f"{x['player']} ({x['pos']}, {x['status']})" for x in down[:3])
            report["chains"].append(
                f"HOME-OL vs AWAY-FRONT: the away front is missing {names} [{INJ_FILE.name}] "
                f"-> rotation depth thins on the interior/edge "
                f"-> home QB time-to-throw extends and the deep shot window widens; "
                f"breaking condition: starters announced active pre-kick"
            )
    return report


def emit_matchup_md(home: str, away: str, date: str) -> tuple[Path, dict]:
    rep = build_matchups(home, away)
    lines = [f"# {away}@{home} - Matchup Report", "",
             f"generated_utc: {rep['generated_utc']}", ""]
    lines.append("## Receiver vs coverage pairings")
    lines.append("")
    for p in rep["pairings"]:
        lines.append(f"### {p['side']} - {p['usage_title']}: {p['receiver']}")
        f = p["receiver_form"]
        basis = f.get("usage_basis") or "targets"
        if basis == "targets":
            lines.append(f"- targets {f['targets']} | separation {f['separation_yds']} yds | YAC/E R {f['yac_over_expected']} | catch {f['catch_pct']}% (2025-season snapshot, one season stale) [{p['source_receiver']}]")
        else:
            lines.append(f"- {basis} [{p['source_receiver']}]")
        if p.get("matched_cornerbacks"):
            lines.append(f"- matched slot-1 corners: {'; '.join(p['matched_cornerbacks'])}")
        cs = p["opposing_coverage_status"]
        lines.append(f"- opposing coverage OUT/limited: {', '.join(cs['out_or_limited']) or '(none listed)'}")
        lines.append(f"- opposing coverage QUESTIONABLE: {', '.join(cs['questionable']) or '(none)'}")
        lines.append("")
    if rep["ol_vs_rush"]:
        ol = rep["ol_vs_rush"]
        lines.append("## OL vs pass-rush")
        lines.append("")
        lines.append(f"- front ACTIVE (on report): {', '.join(ol['front_active_on_report']) or '(none listed)'}")
        lines.append(f"- front DOWN: {', '.join(ol['front_down']) or '(none)'}")
        lines.append(f"- front QUESTIONABLE: {', '.join(ol['front_questionable']) or '(none)'}")
        lines.append("")
    lines.append("## Matchup chains (each cites its file)")
    lines.append("")
    for i, c in enumerate(rep["chains"], 1):
        lines.append(f"{i}. {c}")
    lines.append("")
    if rep["gaps"]:
        lines.append("## Honest gaps")
        lines.append("")
        for g in rep["gaps"]:
            lines.append(f"- {g}")
        lines.append("")
    outdir = OUTROOT / date
    outdir.mkdir(parents=True, exist_ok=True)
    out = outdir / f"{away}@{home}-matchups.md"
    out.write_text("\n".join(lines), encoding="utf-8")
    rep["path"] = str(out)
    return out, rep


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--home", required=True)
    ap.add_argument("--away", required=True)
    ap.add_argument("--date", default=datetime.now(timezone.utc).date().isoformat())
    args = ap.parse_args()
    path, rep = emit_matchup_md(args.home.upper(), args.away.upper(), args.date)
    print(f"pairings: {len(rep['pairings'])} | chains: {len(rep['chains'])} | gaps: {len(rep['gaps'])}")
    print(f"matchups -> {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
