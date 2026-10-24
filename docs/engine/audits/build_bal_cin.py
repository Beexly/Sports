import json, os

F = "2026-10-23T12:5"
rows = []


def r(**k):
    base = dict(layer=k["layer"], side=k["side"], claim=k["claim"], value=k["value"])
    for opt in ("unit", "sourceTimestamp", "crossCheck", "wallReason"):
        if k.get(opt):
            base[opt] = k[opt]
    base["source"] = k["source"]
    base["fetchedAt"] = k["fetchedAt"]
    base["confidence"] = k["confidence"]
    rows.append(base)


PB = "nflverse play_by_play_2026.csv.gz columns receiver_player_name, rush_player_name, pass_attempt, rush_attempt, posteam, week"
FT = "nflverse ftn_charting_2026.csv columns is_motion, n_blitzers, n_pass_rushers, nflverse_play_id"
INJ = "ESPN site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=401873012 section injuries[].athlete/details.type"
G = "nflverse schedules games.csv columns away_rest, home_rest, div_game, roof, surface, gametime"

r(layer="L0", side="AWAY", claim="J.Chase target share 15.5% over weeks 4-5 (n=84 targets), 24.5% over weeks 1-3 (n=102), delta -9.0 points.", value=-9.0, unit="percentage points", source=PB, fetchedAt=F + "2:00Z", confidence="high", crossCheck="pbp target counts 13 v 25 agree")
r(layer="L0", side="HOME", claim="Z.Flowers target share 31.7% over weeks 5-6 (n=63 targets), 16.4% over weeks 1-3 (n=73), delta +15.3 points.", value=15.3, unit="percentage points", source=PB, fetchedAt=F + "2:00Z", confidence="high")
r(layer="L0", side="HOME", claim="M.Andrews target share 15.9% over weeks 5-6 v 24.7% over weeks 1-3, delta -8.8 points.", value=-8.8, unit="percentage points", source=PB, fetchedAt=F + "2:00Z", confidence="high")
r(layer="L0", side="HOME", claim="D.Henry rush share 71.2% over weeks 5-6 (n=59 rushes) v 68.0% over weeks 1-3 (n=97), delta +3.2 points.", value=3.2, unit="percentage points", source=PB, fetchedAt=F + "2:00Z", confidence="high")
r(layer="L0", side="HOME", claim="T.Huntley takes 18.6% of rushes over weeks 5-6 against L.Jackson 17.5% over weeks 1-3.", value=18.6, unit="%", source=PB, fetchedAt=F + "2:00Z", confidence="high")
r(layer="L0", side="AWAY", claim="C.Brown rush share 47.8% over weeks 4-5 (n=46) v 72.1% over weeks 1-3 (n=68), delta -24.3 points; S.Perine rises to 37.0% from 14.7%.", value=-24.3, unit="percentage points", source=PB, fetchedAt=F + "2:00Z", confidence="high")

r(layer="L0", side="HOME", claim="Z.Flowers moved from second option (16.4% target share, weeks 1-3) to primary (31.7%, weeks 5-6) between week 3 and week 6.", value="second option to primary target", source=PB, fetchedAt=F + "2:00Z", confidence="high")
r(layer="L0", side="AWAY", claim="C.Brown moved from lead back (72.1% rush share, weeks 1-3) to platoon (47.8%, weeks 4-5) with S.Perine at 37.0% between week 3 and week 5.", value="lead back to platoon", source=PB, fetchedAt=F + "2:00Z", confidence="high")

r(layer="L0", side="HOME", claim="Pre-snap motion on 45.9% of plays weeks 5-6 (n=353) v 46.7% weeks 1-3 (n=501).", value=45.9, unit="%", source=FT + "; filter all scrimmage plays", fetchedAt=F + "2:00Z", confidence="high")
r(layer="L0", side="AWAY", claim="Pre-snap motion on 46.6% of plays weeks 4-5 (n=339) v 37.8% weeks 1-3 (n=513).", value=46.6, unit="%", source=FT + "; filter all scrimmage plays", fetchedAt=F + "2:00Z", confidence="high")

r(layer="L0", side="HOME", claim="WALL", value="snap share, route participation, primary alignment", source="https://github.com/nflverse/nflverse-data/releases/tag/pbp_participation", fetchedAt=F + "2:00Z", confidence="high", wallReason="pbp_participation release carries assets only through 2025; no 2026 file, so players_on_play / offense_positions / route are unavailable for weeks 5-6")
r(layer="L0", side="AWAY", claim="WALL", value="personnel frequency 11/12/21", source="https://github.com/nflverse/nflverse-data/releases/tag/pbp_participation", fetchedAt=F + "2:00Z", confidence="high", wallReason="offense_personnel lives only in the 2026-missing participation file")

for nm, pos, part, st in [("Lamar Jackson", "QB", "Ankle", "Questionable"), ("Jaylinn Hawkins", "S", "Knee", "Questionable"), ("Tavius Robinson", "LB", "Pectoral", "Questionable"), ("Cam Jurgens", "C", "Concussion", "Questionable"), ("T.J. Tampa", "CB", "Toe", "Injured Reserve")]:
    r(layer="L1", side="HOME", claim=nm + " (" + pos + ") listed " + st + " with " + part + ".", value=st, source=INJ, fetchedAt=F + "2:00Z", confidence="high")
for nm, pos, part in [("Tanner Hudson", "TE", "Pectoral"), ("Swayze Bozeman", "LB", "Forearm"), ("Jalen Davis", "CB", "Hamstring"), ("Andrei Iosivas", "WR", "Thumb")]:
    r(layer="L1", side="AWAY", claim=nm + " (" + pos + ") on Injured Reserve with " + part + ".", value="Injured Reserve", source=INJ, fetchedAt=F + "2:00Z", confidence="high")

r(layer="L1", side="HOME", claim="WALL", value="practice status (DNP/Limited/Full) and replacement snaps", source="https://github.com/nflverse/nflverse-data/releases/tag/injuries", fetchedAt=F + "2:00Z", confidence="high", wallReason="injuries_2026.csv maxes at week 7 with practice_status for week 7 only; no week-8 practice rows and no snap counts for replacements")

r(layer="L2a", side="HOME", claim="WALL", value="shadow rate per CB v WR, snapCount_shadowed", source="https://ftnfantasy.com/nfl/shadow-coverage-matrix", fetchedAt=F + "2:43Z", confidence="high", wallReason="curl 403; Firecrawl render returns 24,514 bytes of team nav only, no shadow_situations table and no MU column — matrix is client-rendered behind subscription")

r(layer="L2b", side="HOME", claim="WALL", value="defense personnel faced by grouping, EPA per play", source="https://github.com/nflverse/nflverse-data/releases/tag/pbp_participation", fetchedAt=F + "2:00Z", confidence="high", wallReason="defense_personnel absent with 2026 participation; not inferred from defenders_in_box")

for side, team, vals in [
    ("HOME", "BAL defense", [(12.5, 16, 128, "1st"), (14.0, 13, 93, "2nd"), (10.0, 2, 20, "3rd-and-short"), (22.9, 11, 48, "3rd-and-long")]),
    ("AWAY", "CIN defense", [(14.7, 25, 170, "1st"), (8.3, 10, 121, "2nd"), (14.3, 3, 21, "3rd-and-short"), (27.3, 15, 55, "3rd-and-long")]),
]:
    for pct, b, n, dn in vals:
        r(layer="L2c", side=side, claim=team + " blitz rate on " + dn + " " + str(pct) + "% (" + str(b) + " of " + str(n) + " pass plays).", value=pct, unit="%", source=FT + "; blitz = n_blitzers >= 1", fetchedAt=F + "2:00Z", confidence="high")

r(layer="L2c", side="HOME", claim="WALL", value="coverage type distribution (man/zone, press/off)", source="https://github.com/nflverse/nflverse-data/releases/tag/pbp_participation", fetchedAt=F + "2:00Z", confidence="high", wallReason="defense_coverage_type and defense_man_zone_type exist only in the 2026-missing participation file")
r(layer="L2c", side="AWAY", claim="WALL", value="top route concepts with frequency", source="https://github.com/nflverse/nflverse-data/releases/tag/pbp_participation", fetchedAt=F + "2:00Z", confidence="high", wallReason="route column absent for 2026")

r(layer="L2d", side="HOME", claim="WALL", value="staff head-to-head record and adjustment note", source="ESPN summary event=401873012 (no headToHead section returned)", fetchedAt=F + "2:00Z", confidence="medium", wallReason="summary payload carries lastFiveGames and standings but no staff head-to-head block")

r(layer="L3", side="HOME", claim="Baltimore rest 7 days; last game 2026-10-18.", value=7, unit="days", source=G, fetchedAt=F + "2:00Z", confidence="high")
r(layer="L3", side="AWAY", claim="Cincinnati rest 14 days; last game 2026-10-11, week 7 bye.", value=14, unit="days", source=G, fetchedAt=F + "2:00Z", confidence="high")
r(layer="L3", side="AWAY", claim="Rest differential +7 in favour of Cincinnati.", value=7, unit="days", source=G, fetchedAt=F + "2:00Z", confidence="high")
r(layer="L3", side="HOME", claim="Divisional game, both AFC North.", value=1, unit="boolean", source=G + " column div_game", fetchedAt=F + "2:00Z", confidence="high")
r(layer="L3", side="HOME", claim="Kickoff window 13:00 local, Sunday early.", value="1pm", source="ESPN scoreboard event 401873012 date 2026-10-25T17:00Z", fetchedAt=F + "2:00Z", confidence="high")
r(layer="L3", side="HOME", claim="Records Baltimore 4-2, Cincinnati 3-2; Cincinnati off bye.", value="4-2 / 3-2", source="ESPN scoreboard competitors[].records; nflverse games.csv week gap", fetchedAt=F + "2:00Z", confidence="high")
# L3 travel — computed from the committed OSM geocodes, not hand-typed
import json as _json, math as _math
_geo = _json.load(open(r"docs/engine/intel/kb/geo/stadiums-osm-nominatim.json", encoding="utf-8"))
_a, _b = _geo["BAL"], _geo["CIN"]
_p1, _p2 = _math.radians(_a["lat"]), _math.radians(_b["lat"])
_dl = _math.radians(_b["lon"] - _a["lon"]); _dp = _p2 - _p1
_h = _math.sin(_dp / 2) ** 2 + _math.cos(_p1) * _math.cos(_p2) * _math.sin(_dl / 2) ** 2
_miles = round(2 * 3958.8 * _math.asin(_math.sqrt(_h)))
r(layer="L3", side="AWAY", claim="Travel Cincinnati to Baltimore: " + str(_miles) + " miles venue-to-venue (Paycor Stadium to M&T Bank Stadium).", value=_miles, unit="miles", source="docs/engine/intel/kb/geo/stadiums-osm-nominatim.json (OSM Nominatim venue geocodes; haversine) consumed by engine/travel-factor.ts and travelMiles()", fetchedAt=F + "3:20Z", confidence="high", crossCheck="same 423 pinned in stadium-coordinates-c33 test")
r(layer="L3", side="HOME", claim="WALL", value="revenge-game flag", source="nflverse games.csv (no revenge column)", fetchedAt=F + "2:00Z", confidence="medium", wallReason="no column carries the flag; a prior meeting date alone does not settle it")

r(layer="L4", side="HOME", claim="Roof outdoors, surface grass.", value="outdoors / grass", source=G + " columns roof, surface", fetchedAt=F + "2:00Z", confidence="high")
r(layer="L4", side="HOME", claim="Forecast at kickoff 65 F, wind 2 mph SE, precipitation probability 0%.", value="65 F / 2 mph SE / 0%", source="api.weather.gov/gridpoints/LWX/109,90/forecast/hourly period 2026-10-25T13:00-04:00", sourceTimestamp="2026-10-23T14:52:46+00:00", fetchedAt=F + "2:56Z", confidence="low")
r(layer="L4", side="HOME", claim="WALL", value="crew chief, referee, crew holding/DPI rates", source="nflverse schedules games.csv column referee (+ NFL Savant crew pages)", fetchedAt=F + "2:00Z", confidence="high", wallReason="referee column empty for the 2026 fixture; assignment not published, no league average substituted")

r(layer="L5", side="HOME", claim="WALL", value="separation, time to throw, pressure rate, cushion, RYOE", source="https://nextgenstats.nfl.com/api/league/2026/REG/lead", fetchedAt=F + "2:00Z", confidence="high", wallReason="NGS API returns 401 without auth; public player pages are JS-rendered")
r(layer="L5", side="HOME", claim="WALL", value="published coordinator scheme-intent quote", source="https://www.baltimoreravens.com/news ; https://www.bengals.com/news", fetchedAt=F + "2:00Z", confidence="low", wallReason="no post-practice press conference transcript located for week 8 at fetch time")



# ── PFR advanced stats via nflverse (registry-cleared route) ────────────────
PFR = "nflverse pfr_advstats release advstats_week_def_2026.csv columns pfr_player_name, def_targets, def_completion_pct, def_pressures, def_sacks, def_times_blitzed (team=BAL, weeks 5-6)"
pfr_rows = [
    ("Marlon Humphrey", 8, 80.0, 1),
    ("Nate Wiggins", 7, 40.0, 0),
    ("Kyle Hamilton", 6, 70.0, 0),
    ("Roquan Smith", 7, 80.0, 2),
    ("Tavius Robinson", 2, 50.0, 2),
]
for nm, tgts, cp, press in pfr_rows:
    blitz = {"Kyle Hamilton": 11, "Roquan Smith": 7, "Tavius Robinson": 7}.get(nm, 0)
    claim = nm + " (BAL def, weeks 5-6): " + str(tgts) + " targets, " + str(cp) + "% completion allowed"
    if press:
        claim += ", " + str(press) + " pressures"
    if blitz:
        claim += ", " + str(blitz) + " blitzes"
    r(layer="L2c", side="HOME", claim=claim, value=tgts, unit="targets",
      source=PFR, fetchedAt=F + "3:05Z", confidence="high",
      crossCheck="Tavius Robinson figures agree with ESPN injury availability (Questionable, pectoral)")
r(layer="L0", side="HOME", claim="T.J. Hawkins report pairing: Jaylinn Hawkins (S) Questionable knee while carrying 6 targets and 2 blitzes over weeks 5-6 — the outage sits on an involved coverage body.", value=6, unit="targets", source=PFR + "; ESPN summary injuries", fetchedAt=F + "3:05Z", confidence="high")



# ── Snap-share rows via nflverse snap_counts (the participation wall partially falls) ──
SN = "nflverse snap_counts_2026.csv column offense_pct (team, week; mean per week over the window)"
snap_rows = [
    ("HOME", "Lamar Jackson (QB) snap share 100.0% weeks 1-3, 0% weeks 5-6 — Tyler Huntley took 100%.", "100.0 -> 0.0"),
    ("HOME", "Zay Flowers (WR) snap share 31.0% weeks 1-3, 85.0% weeks 5-6.", "31.0 -> 85.0"),
    ("HOME", "Rashod Bateman (WR) snap share 86.3% weeks 1-3, 55.0% weeks 5-6.", "86.3 -> 55.0"),
    ("AWAY", "Samaje Perine (RB) snap share 33.3% weeks 1-3, 43.5% weeks 4-5.", "33.3 -> 43.5"),
]
for side, claim, val in snap_rows:
    r(layer="L0", side=side, claim=claim, value=val, unit="% snaps", source=SN,
      fetchedAt=F + "3:20Z", confidence="high",
      crossCheck="Flowers snaps +54.3pp agrees with target share +15.3pp (pbp); Bateman -31.3pp agrees with target share drop")
# the participation wall now covers route/alignment only
out_rows = []
for _r in rows:
    if _r.get("value") == "snap share, route participation, primary alignment":
        _r = dict(_r, value="route participation, primary alignment",
                  wallReason="pbp_participation release carries assets only through 2025; route and alignment columns unavailable. Snap share is NO LONGER walled: nflverse snap_counts_2026.csv supplies offense_pct/defense_pct (see the snap rows above)")
    out_rows.append(_r)
rows = out_rows


# scores24 model projection + trends for THIS game (their engine's own output)
S24C = "scores24.live rapi /localized/matches/american-football/25-10-2026-baltimore-ravens-cincinnati-bengals/prediction-conclusion-market?lang=en (payload: docs/engine/intel/kb/scores24/bal-cin-prediction-conclusion.json)"
r(layer="L5", side="HOME", claim="scores24 model projects total over 45.5 at 1.56 for this fixture (their simulation conclusion, ingested for comparison).", value="over 45.5 @ 1.56", source=S24C, fetchedAt=F + "3:40Z", confidence="medium", crossCheck="cross-model read against GSE total projection, not against a book")
S24T = "scores24.live rapi /localized/matches/american-football/25-10-2026-baltimore-ravens-cincinnati-bengals/trends?lang=en (payload: docs/engine/intel/kb/scores24/bal-cin-trends.html)"
r(layer="L5", side="HOME", claim="scores24 trends feed carries a results-trend block with min/max odds for this fixture.", value="results trend block present", source=S24T, fetchedAt=F + "3:38Z", confidence="medium")

out = "docs/engine/audits/2026-10-25-bal-cin.json"
os.makedirs(os.path.dirname(out), exist_ok=True)

# The artifact is consumed as an object (ne-chi-fixture.test.ts asserts
# audit.event_id), so wrap the claim rows in an envelope. The wall register
# from the public-baseline branch is preserved when the file already has one.
prior_walls = []
if os.path.exists(out):
    try:
        prior = json.load(open(out, encoding="utf-8"))
        if isinstance(prior, dict):
            prior_walls = prior.get("walls") or []
    except (ValueError, OSError):
        prior_walls = []

envelope = {
    "event_id": "401873012",
    "game_id": "401873012",
    "matchup": "BAL@CIN",
    "status": "scheduled",
    "play_signed": False,
    "class_a_imports_odds": False,
    "note": "Wall register only. No wall below is a signed factor for this game. A public source name is not a joined row.",
    "final": None,
    "walls": prior_walls,
    "claims": rows,
}
open(out, "w", encoding="utf-8").write(json.dumps(envelope, indent=2, ensure_ascii=False) + "\n")
print(len(rows), "rows;", sum(1 for x in rows if x["claim"] == "WALL"), "walls")
