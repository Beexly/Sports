"""
builder.py — build a GSE Situational Graph v1 for one week from explicit,
inspectable inputs. Stdlib only.

    python3 builder.py --season 2026 --week 6 --game 2026_06_SEA_DEN \
        --games ../../data/gse-dataset/games.jsonl \
        --venues inputs/venues.json \
        --coaches inputs/coaches-2026.json \
        --injuries-csv ../../data/gse-dataset/current/injuries_2026.csv \
        --out instances/2026-week06-sea-at-den.json

Design rules (see SCHEMA.md):
  * Every situational edge carries value + source + as_of (PIT stamp).
  * Missing inputs produce honest_empty records, never fabricated edges.
  * Unstamped injury rows are unusable by construction: without a stamp a
    row cannot be proven knowable before kickoff, so the builder refuses
    the whole injury_burden family for that game and says why. (The repo's
    current injuries_2026.csv has no stamp column at all — census finding,
    2026-10-15: "injuries_2026.csv has 0 stamped rows".)
  * Stamp of record: a `pulled_at` column (the injury feed's stamp
    discipline, intelligence/providers/injury_stamps.py — when our pull
    observed the row) wins over the legacy stamp columns when present:
    the burden was knowable to the engine from the pull, so the edge's
    as_of is the latest contributing pulled_at. `reported_at` alone never
    stamps a row — provenance is not knowability.
  * Injury rows stamped after the game's gameday are refused individually
    (failed-closed; the walk-forward diagnostics precedent is
    ril_injury_after_kickoff).
  * The builder writes structure only. No scores, no probabilities, no
    picks — graph.py validation rejects emission-shaped values.
"""

import argparse
import csv
import json
import sys
from datetime import date, datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from graph import GRAPH_NAME, GRAPH_VERSION, load_registry, validate_graph  # noqa: E402

READ_TYPES = {"atmosphere", "layered_revenge", "logistical_disruption",
              "coaching_honesty", "injury_context_identity"}
STAMP_COLUMNS = ("as_of", "report_date", "date_modified", "report_as_of")


def _d(s):
    return date.fromisoformat(s)


class Builder:
    def __init__(self, registry, season, week):
        self.registry = registry
        self.season = season
        self.week = week
        self.nodes = {}
        self.edges = []
        self.honest_empty = []
        self.failed_closed = {}

    # -- primitives -----------------------------------------------------
    def node(self, nid, kind, **props):
        if nid not in self.nodes:
            self.nodes[nid] = {"id": nid, "kind": kind, **props}
        return nid

    def edge(self, etype, frm, to, game_id, value, source, as_of):
        eid = "%s:%s:%s->%s" % (etype, game_id or "season", frm, to)
        self.edges.append({
            "id": eid, "type": etype, "from": frm, "to": to,
            "game": game_id, "value": value, "source": source, "as_of": as_of,
        })

    def empty(self, etype, game_id, missing, reason, team=None):
        entry = {"edge_type": etype, "game_id": game_id,
                 "missing": missing, "reason": reason}
        if team:
            entry["team"] = team
        self.honest_empty.append(entry)

    def refuse(self, key, n=1):
        self.failed_closed[key] = self.failed_closed.get(key, 0) + n

    # -- schedule structure ----------------------------------------------
    def build_structure(self, games):
        week_id = self.node("week:%04d-%02d" % (self.season, self.week), "week",
                            season=self.season, week=self.week)
        for g in games:
            gid = "game:%s" % g["game_id"]
            self.node(gid, "game", gameday=g["gameday"],
                      away_team=g["away_team"], home_team=g["home_team"],
                      roof=g.get("roof"), surface=g.get("surface"))
            away = self.node("team:%s" % g["away_team"], "team", code=g["away_team"])
            home = self.node("team:%s" % g["home_team"], "team", code=g["home_team"])
            venue = self.node("venue:%s" % g["home_team"], "venue", team=g["home_team"])
            ref = {"kind": "schedule", "ref": "data/gse-dataset/games.jsonl"}
            self.edge("participates_in", away, gid, g["game_id"], {"role": "away"}, ref, None)
            self.edge("participates_in", home, gid, g["game_id"], {"role": "home"}, ref, None)
            self.edge("hosted_at", gid, venue, g["game_id"], {}, ref, None)
            self.edge("in_week", gid, week_id, g["game_id"], {}, ref, None)
            if _d(g["gameday"]).weekday() == 3:  # Thursday
                state = self.node("state:THURSDAY_GAME", "state", state="THURSDAY_GAME")
                for t in (away, home):
                    self.edge("has_state", t, state, g["game_id"],
                              {"basis": "gameday is a Thursday"}, ref, None)

    # -- measured: rest ---------------------------------------------------
    def build_rest(self, games, all_games):
        """Emit rest edges; return {game_id: as_of} so composites that
        depend on the rest fact can carry its stamp."""
        rest_asof = {}
        prev = {}
        for g in all_games:
            if g["season"] != self.season:
                continue
            for t in (g["away_team"], g["home_team"]):
                if g["gameday"] < self._gameday(games, t):
                    prev[t] = max(prev.get(t, ""), g["gameday"])
        for g in games:
            src = {"kind": "schedule",
                   "ref": "data/gse-dataset/games.jsonl (rest_away/rest_home/rest_diff)"}
            pa, ph = prev.get(g["away_team"]), prev.get(g["home_team"])
            if pa is None or ph is None:
                self.empty("rest_differential", g["game_id"],
                           ["previous game in schedule for %s" % (g["away_team"] if pa is None else g["home_team"])],
                           "no earlier game in the season schedule to measure rest from")
                continue
            as_of = max(pa, ph)  # knowable once both previous games are played
            rest_asof[g["game_id"]] = as_of
            self.edge("rest_differential", "team:%s" % g["home_team"], "team:%s" % g["away_team"],
                      g["game_id"],
                      {"rest_away_days": g["rest_away"], "rest_home_days": g["rest_home"],
                       "rest_diff_home_minus_away": g["rest_diff"],
                       "away_prev_gameday": pa, "home_prev_gameday": ph},
                      src, as_of)
            for team, rest in ((g["away_team"], g["rest_away"]), (g["home_team"], g["rest_home"])):
                if rest <= 5:
                    state = self.node("state:SHORT_WEEK", "state", state="SHORT_WEEK")
                    self.edge("has_state", "team:%s" % team, state, g["game_id"],
                              {"rest_days": rest, "basis": "days between games <= 5"},
                              src, as_of)
                if rest >= 12:
                    state = self.node("state:POST_BYE", "state", state="POST_BYE")
                    self.edge("has_state", "team:%s" % team, state, g["game_id"],
                              {"rest_days": rest, "basis": "days between games >= 12"},
                              src, as_of)
        return rest_asof

    @staticmethod
    def _gameday(games, team):
        for g in games:
            if team in (g["away_team"], g["home_team"]):
                return g["gameday"]
        return "9999-12-31"

    # -- measured: altitude (+ composite short-week) -----------------------
    def build_altitude(self, games, venues, rest_asof=None):
        thr = self.registry["altitude"]["thresholds"]["at_altitude_ft"]
        for g in games:
            v = venues.get(g["home_team"])
            if not v or v.get("elevation_ft") is None:
                self.empty("altitude", g["game_id"],
                           ["venue elevation for %s" % g["home_team"]],
                           "venues input carries no elevation for this venue")
                continue
            elev = v["elevation_ft"]
            src = {"kind": "venue_static", "ref": v["source"]["ref"]}
            self.edge("altitude", "team:%s" % g["away_team"], "venue:%s" % g["home_team"],
                      g["game_id"],
                      {"venue_elevation_ft": elev, "at_altitude": elev >= thr,
                       "threshold_ft": thr, "city": v.get("city")},
                      src, None)
            if elev >= thr:
                state = self.node("state:ALTITUDE_VISIT", "state", state="ALTITUDE_VISIT")
                self.edge("has_state", "team:%s" % g["away_team"], state, g["game_id"],
                          {"venue_elevation_ft": elev}, src, None)
                rest = g.get("rest_away")
                if rest is not None and rest <= self.registry["altitude_short_week"]["thresholds"]["max_rest_days"]:
                    self.edge("altitude_short_week", "team:%s" % g["away_team"], "game:%s" % g["game_id"],
                              g["game_id"],
                              {"venue_elevation_ft": elev, "visitor_rest_days": rest,
                               "home_rest_days": g.get("rest_home"),
                               "basis": "visitor at altitude on a short week"},
                              {"kind": "derived",
                               "ref": "altitude + rest_differential inputs, this build"},
                              (rest_asof or {}).get(g["game_id"]))
                elif rest is None:
                    self.empty("altitude_short_week", g["game_id"],
                               ["visitor rest days"], "altitude known, rest unknown")

    # -- measured: injury burden -------------------------------------------
    def build_injuries(self, games, injuries_csv):
        if injuries_csv is None:
            for g in games:
                self.empty("injury_burden", g["game_id"], ["injury report input"],
                           "no injury input supplied to this build")
            return
        with open(injuries_csv, newline="") as f:
            rows = list(csv.DictReader(f))
        # pulled_at (feed stamp discipline) is the stamp of record when the
        # rows carry it; otherwise fall back to the legacy stamp columns.
        if rows and "pulled_at" in rows[0] and any(r.get("pulled_at") for r in rows):
            stamp_col = "pulled_at"
        else:
            stamp_col = next((c for c in STAMP_COLUMNS if rows and c in rows[0]), None)
        weights = self.registry["injury_burden"]["weights"]
        for g in games:
            if stamp_col is None:
                self.empty("injury_burden", g["game_id"],
                           ["injury report rows with an as-of stamp column"],
                           "injury input %s has no stamp column (%s); unstamped rows "
                           "cannot be proven knowable before kickoff"
                           % (Path(injuries_csv).name, ", ".join(STAMP_COLUMNS)))
                continue
            for team in (g["away_team"], g["home_team"]):
                burden, contributors, stamps = 0.0, [], []
                for r in rows:
                    if r.get("team") != team or int(r.get("week") or -1) != self.week:
                        continue
                    status = (r.get("report_status") or "").strip()
                    if not status:
                        continue
                    if r[stamp_col][:10] > g["gameday"]:
                        self.refuse("injury_after_kickoff")
                        continue
                    w = weights["status"].get(status, 0.0) * weights["position"].get(r.get("position", ""), 0.0)
                    if w == 0.0:
                        continue
                    pid = "player:%s" % (r.get("gsis_id") or r.get("full_name", "").replace(" ", "-"))
                    self.node(pid, "player", name=r.get("full_name"),
                              position=r.get("position"), team=team)
                    burden += w
                    stamps.append(r[stamp_col])
                    contributors.append({"player": pid, "position": r.get("position"),
                                         "status": status, "weight": w})
                if contributors:
                    # Edge stamp = the latest contributing report stamp: the
                    # burden as stated was only fully knowable from then.
                    self.edge("injury_burden", "team:%s" % team, "game:%s" % g["game_id"],
                              g["game_id"],
                              {"burden": round(burden, 3), "contributors": contributors,
                               "weight_table": "edge_types.json injury_burden.weights (RIL, Hermes walk-forward diagnostics)"},
                              {"kind": "injury_report", "ref": str(injuries_csv)},
                              max(stamps))
                else:
                    self.empty("injury_burden", g["game_id"],
                               ["designated injury rows for %s week %d" % (team, self.week)],
                               "stamped report in hand; no designated rows for this team",
                               team=team)

    # -- measured input: coaching tenure ------------------------------------
    def build_coaches(self, games, coaches):
        rows = (coaches or {}).get("rows", [])
        for g in games:
            for team in (g["away_team"], g["home_team"]):
                match = [r for r in rows if r["team"] == team and self.season in r["seasons"]]
                if not match:
                    self.empty("coaching_change", g["game_id"],
                               ["verified coach tenure rows for %s" % team],
                               "coaches input carries no tenure row for this team",
                               team=team)
                    continue
                for r in match:
                    seasons = sorted(r["seasons"])
                    self.edge("coaching_change", "team:%s" % team, "game:%s" % g["game_id"],
                              g["game_id"],
                              {"role": r["role"], "name": r["name"],
                               "seasons_with_team": [s for s in seasons if s <= self.season],
                               "changed_this_season": seasons and seasons[0] == self.season and len([s for s in seasons if s <= self.season]) == 1},
                              {"kind": "repo_doc", "ref": r["source"]["ref"]}, r.get("as_of"))

    # -- measured input: weather ---------------------------------------------
    def build_weather(self, games, weather):
        thr = self.registry["weather_extreme"]["thresholds"]
        for g in games:
            w = (weather or {}).get(g["game_id"])
            if not w:
                self.empty("weather_extreme", g["game_id"],
                           ["stamped forecast for %s" % g["gameday"]],
                           "no forecast input supplied for this game")
                continue
            flags = []
            if w.get("wind_mph") is not None and w["wind_mph"] >= thr["wind_mph"]:
                flags.append("wind>=%d" % thr["wind_mph"])
            if w.get("temp_f") is not None and (w["temp_f"] <= thr["temp_low_f"] or w["temp_f"] >= thr["temp_high_f"]):
                flags.append("temp_outside_%d_%d" % (thr["temp_low_f"], thr["temp_high_f"]))
            if w.get("precip"):
                flags.append("precip")
            if flags:
                self.edge("weather_extreme", "game:%s" % g["game_id"], "venue:%s" % g["home_team"],
                          g["game_id"],
                          {"temp_f": w.get("temp_f"), "wind_mph": w.get("wind_mph"),
                           "precip": w.get("precip"), "extreme_flags": flags},
                          {"kind": "forecast", "ref": w["source"]["ref"]}, w["as_of"])
            # forecast in hand but nothing extreme: no edge, no honest_empty —
            # the input existed; the condition was false. Recorded in diagnostics.

    # -- dataset adapter: week-situational measured families ------------------
    def build_situational_dataset(self, games, situational_path):
        rows = {}
        with open(situational_path) as f:
            for line in f:
                line = line.strip()
                if line:
                    r = json.loads(line)
                    rows[r["game_id"]] = r
        fam = {"pressure_edge": ("pressure_matchup", "admitted"),
               "go_rate_edge": ("fourth_down_go_rate", "dark"),
               "st_epa_edge": ("special_teams_epa", "dark")}
        for g in games:
            r = rows.get(g["game_id"])
            if r is None:
                for _, (etype, _) in fam.items():
                    self.empty(etype, g["game_id"], ["situational dataset row"],
                               "no row for this game in the situational dataset")
                continue
            for field, (etype, status) in fam.items():
                if r.get(field) is None:
                    self.empty(etype, g["game_id"], ["%s value" % field],
                               "dataset row carries null for this family (honest null in source)")
                    continue
                self.edge(etype, "team:%s" % g["home_team"], "team:%s" % g["away_team"],
                          g["game_id"],
                          {"signed_home_minus_away": r[field], "family_status": status,
                           "source_field": field},
                          {"kind": "dataset", "ref": str(situational_path)}, g["gameday"])

    # -- formalized reads -------------------------------------------------------
    def build_reads(self, games, reads):
        by_game = {g["game_id"]: g for g in games}
        seen = set()
        for r in (reads or {}).get("reads", []):
            if r.get("type") not in READ_TYPES:
                self.refuse("read_unknown_type")
                continue
            if not r.get("as_of") or not (r.get("source") or {}).get("ref"):
                self.refuse("read_unstamped")
                continue
            g = by_game.get(r.get("game_id"))
            if g is None:
                self.refuse("read_game_out_of_scope")
                continue
            team = "team:%s" % r["team"]
            self.edge(r["type"], team, "game:%s" % g["game_id"], g["game_id"],
                      r["value"], r["source"], r["as_of"])
            seen.add((r["type"], g["game_id"], r["team"]))
            if r["type"] == "layered_revenge":
                state = self.node("state:REVENGE_GAME", "state", state="REVENGE_GAME")
                self.edge("has_state", team, state, g["game_id"],
                          {"basis": "layered_revenge read"}, r["source"], r["as_of"])
            if r["type"] == "logistical_disruption":
                state = self.node("state:DISRUPTION", "state", state="DISRUPTION")
                self.edge("has_state", team, state, g["game_id"],
                          {"basis": "logistical_disruption read"}, r["source"], r["as_of"])
        for g in games:
            for team in (g["away_team"], g["home_team"]):
                for etype in sorted(READ_TYPES):
                    if (etype, g["game_id"], team) not in seen:
                        self.empty(etype, g["game_id"],
                                   ["authored %s read with source + as-of stamp" % etype],
                                   "no read input supplied; the graph records reads, "
                                   "it does not invent them", team=team)

    # -- assemble ------------------------------------------------------------------
    def finish(self):
        by_type = {}
        for e in self.edges:
            by_type[e["type"]] = by_type.get(e["type"], 0) + 1
        return {
            "graph": GRAPH_NAME, "version": GRAPH_VERSION,
            "season": self.season, "week": self.week,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "builder": "intelligence/situational-graph/builder.py",
            "nodes": sorted(self.nodes.values(), key=lambda n: n["id"]),
            "edges": sorted(self.edges, key=lambda e: e["id"]),
            "honest_empty": self.honest_empty,
            "diagnostics": {"edges_by_type": by_type,
                            "failed_closed": self.failed_closed,
                            "honest_empty_count": len(self.honest_empty)},
        }


def main(argv=None):
    ap = argparse.ArgumentParser(description="Build a GSE situational graph for one week.")
    ap.add_argument("--season", type=int, required=True)
    ap.add_argument("--week", type=int, required=True)
    ap.add_argument("--game", help="restrict to one game_id")
    ap.add_argument("--games", required=True, help="nflverse-format games.jsonl")
    ap.add_argument("--venues", help="venues.json (static venue reference)")
    ap.add_argument("--coaches", help="coaches JSON (verified tenure rows)")
    ap.add_argument("--injuries-csv", help="injury report CSV (needs a stamp column to be usable)")
    ap.add_argument("--situational", help="week-situational.jsonl (measured families)")
    ap.add_argument("--weather", help="weather JSON keyed by game_id (stamped forecasts)")
    ap.add_argument("--reads", help="reads JSON (authored situational reads, stamped)")
    ap.add_argument("--registry", default=str(Path(__file__).resolve().parent / "edge_types.json"))
    ap.add_argument("--out", required=True)
    args = ap.parse_args(argv)

    registry = load_registry(args.registry)
    with open(args.games) as f:
        all_games = [json.loads(l) for l in f if l.strip()]
    games = [g for g in all_games
             if g["season"] == args.season and g["week"] == args.week
             and g.get("game_type", "REG") == "REG"]
    if args.game:
        games = [g for g in games if g["game_id"] == args.game]
    if not games:
        print("no games in scope", file=sys.stderr)
        return 2

    b = Builder(registry, args.season, args.week)
    b.build_structure(games)
    # rest first: the altitude composite carries the rest fact's stamp
    rest_asof = b.build_rest(games, all_games)
    venues = {}
    if args.venues:
        venues = json.loads(Path(args.venues).read_text())["venues"]
    else:
        for g in games:
            b.empty("altitude", g["game_id"], ["venues input"], "no venues input supplied")
    if args.venues:
        b.build_altitude(games, venues, rest_asof)
    coaches = json.loads(Path(args.coaches).read_text()) if args.coaches else None
    b.build_coaches(games, coaches)
    b.build_injuries(games, args.injuries_csv)
    weather = json.loads(Path(args.weather).read_text()) if args.weather else None
    b.build_weather(games, weather)
    if args.situational:
        b.build_situational_dataset(games, args.situational)
    reads = json.loads(Path(args.reads).read_text()) if args.reads else None
    b.build_reads(games, reads)

    graph = b.finish()
    problems = validate_graph(graph, registry)
    if problems:
        print("INVALID GRAPH:", *problems, sep="\n  ", file=sys.stderr)
        return 1
    Path(args.out).write_text(json.dumps(graph, indent=1) + "\n")
    print("wrote %s: %d nodes, %d edges, %d honest-empty"
          % (args.out, len(graph["nodes"]), len(graph["edges"]), len(graph["honest_empty"])))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
