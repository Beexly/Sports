#!/usr/bin/env python3
"""Corrected dark-source verdicts.

CORRECTION (2026-10-20, after the recon batch):
The first pass of this census judged each DARK evaluator by whether its
DECLARED dataDependencies NAMES a table that exists. That was too generous.
The declared names are the SOURCE PRODUCT names ("nfl_pbp", "nfl_charting"),
not table names -- and the play-level tables those products would populate
do not exist in schema.prisma at all (no `model Play`, no `model Drive`,
no penalty column).

The corrected pass checks, per evaluator, whether the SPECIFIC FIELDS the
evaluator reads can be obtained from a table that EXISTS TODAY, at the
granularity the evaluator needs (play-level, drive-level, or player-level).
"""
import json, os, re

WT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCHEMA = os.path.join(WT, "packages/db/prisma/schema.prisma")

# Measured against schema.prisma on 2026-10-20:
#   EXISTS: Player(2767) PlayerGameStat(2787) TeamGameEfficiency(2951)
#            TeamWeekStat(3132) SnapCount(2824) DepthChartEntry(2883)
#            Injury(2853) NextGenStat(3012) TeamGameLog Game HistoricalGame
#   MISSING: no play table, no drive table, no penalty column,
#            no Player.birthDate, no venue lat/lon, no coach table,
#            no coordinator table, no draft-capital column
GRANULARITY = {
    # signal_id -> (fields obtainable today?, what is missing)
    "nfl_turnover_luck": (False, "needs PLAY-level rows (def snaps, dropbacks, forced fumbles, recoveries, INTs). No play table exists."),
    "nfl_short_week_road_deficit": (False, "restDays EXISTS (games.restDaysHome/Away, populated 2130/2082 rows) but TRAVEL_DISTANCE_MILES has no source (no venue coordinates) and IS_DIVISION_RIVALRY has no column."),
    "nfl_age_conditioned_rest": (False, "needs Player.birthDate (absent) and a snap-weighted age construction."),
    "nfl_fourth_down_aggressiveness": (False, "needs 4th-down DECISIONS keyed to a COACH. data/gse-dataset/fourth-down.jsonl has WP-by-option, no decision, no coach."),
    "nfl_second_and_ten_tendency": (False, "needs live in-game play-call state (prior play type, score, quarter, clock). No feed."),
    "nfl_primetime_target_concentration": (True, "PlayerGameStat.targetShare EXISTS. Needs a WR1 aggregation and a primetime flag; both derivable from games.commenceTime + the stat column."),
    "nfl_early_down_proe_momentum": (False, "needs early-down pass rate and pace. TeamGameEfficiency stores only offEpaPerPlay/offSuccess/defEpaPerPlay/defSuccess."),
    "nfl_two_minute_hurry_up": (False, "needs drive-level two-minute slices. No drive table."),
    "nfl_bye_week_defensive_install": (False, "bye week + defEpaPerPlay are derivable, but COORDINATOR identity and PEDIGREE TIER have no source (EntityType lists 'coordinator' but the graph is 'not yet read by any surface')."),
    "nfl_qb_twp_regression": (False, "attempts + INTs exist; turnoverWorthyPlays has no table (pbp_participation_2026.parquet is a documented 404)."),
    "nfl_qb_receiver_continuity": (False, "2 of 3 derivable from PlayerGameStat + DepthChartEntry; COORDINATOR TENURE has no source."),
    "nfl_penalty_differential_momentum": (False, "needs PBP penalty rows. grep 'penalty' schema.prisma -> no matches."),
    "nfl_backup_qb_target_distribution": (True, "DepthChartEntry.depthRank + Injury + PlayerGameStat ALL EXIST and are ingested by live crons. Only the IS_BACKUP derivation + homeSign are missing."),
    "nfl_man_zone_receiver_archetype": (False, "needs coverage charting (man/zone, two-high). NextGenStat has separation/CPOE, not shells."),
    "nfl_wr1_vacated_target_efficiency": (True, "Injury + DepthChartEntry + PlayerGameStat.targetShare all exist -- BUT the implementation is a hand-rolled local formula (extensions:606-619) whose comment falsely claims 'Same math' as a kernel it never imports. DUPLICATE of nfl_wr1_out_redistribution."),
    "nfl_redzone_opportunity_conversion": (False, "needs drive-level red-zone entry. No red-zone column, no drive table."),
    "nfl_negative_binomial_redzone_td": (False, "same drive-level need, plus a FITTED dispersion stored nowhere."),
    "nfl_redzone_personnel_grouping": (False, "participation-2018..2025.jsonl HAS offense_personnel, but there is no participation-2026 file and no grades source."),
    "nfl_rookie_breakout_cohort": (False, "rosters-2026.jsonl has NO draft column; usage trend is a proxy (SnapCount.offensePct)."),
    "nfl_high_altitude_fatigue": (True, "needs STADIUM_ELEVATION_FT -- a 32-row static venue table. No altitude column today; games/teams carry no elevation."),
    "nfl_turf_surface_fatigue": (False, "TURF_SOFTNESS_INDEX has ONE occurrence in the whole repo (the read). Invented. IS_ARTIFICIAL_TURF is derivable from a 32-row venue table."),
}

# The two SHADOW_ONLY weather evaluators (extensions:809, :841) are separate.
SHADOW_ONLY = {
    "nfl_linear_wind_pass_impact": (True, "WIND_MPH is PRODUCED (game-weather-capture cron -> gameSignal -> stored-signal-env-bridge maps wind_mph->WIND_MPH). IS_DOME is a 32-row static constant. The family is measured |slope| < se (engine-weights.ts:14) -- the HONEST move is to leave it SHADOW, not promote it."),
    "nfl_temperature_precipitation_decay": (False, "TEMP_F is bridged and PRECIP_PCT is written, but the bridge wants a precipitationType ENUM (NONE|LIGHT_RAIN|HEAVY_RAIN|SNOW|FREEZING_RAIN) that nothing derives. IS_DOME unproduced."),
}

census = json.load(open(os.path.join(WT, "reconciliation", "dark_sources_census.json"), encoding="utf8"))

rows = []
for e in census["evaluators"]:
    sid = e["signal_id"]
    ok, missing = GRANULARITY.get(sid, (None, "NOT ANALYSED"))
    if ok is True:
        verdict = "DATA-EXISTS-NEEDS-ADAPTER"
    elif ok is False:
        verdict = "NEEDS-A-NEW-PRODUCER"
    else:
        verdict = "NOT-ANALYSED"
    rows.append({
        "signal_id": sid, "family": e["family"], "label": e["label"],
        "status": e["activationStatus"], "trust_weight": None,
        "env_keys_read": e["env_keys_read"],
        "declared_dependencies": e["data_dependencies"],
        "verdict": verdict, "what_is_missing": missing,
    })

for sid, (ok, missing) in SHADOW_ONLY.items():
    rows.append({
        "signal_id": sid, "family": "MICROCLIMATE", "label": sid,
        "status": "SHADOW_ONLY", "trust_weight": None,
        "env_keys_read": [],
        "declared_dependencies": [],
        "verdict": "DATA-EXISTS-NEEDS-ADAPTER" if ok else "NEEDS-A-NEW-PRODUCER",
        "what_is_missing": missing,
    })

from collections import Counter
counts = Counter(r["verdict"] for r in rows)
out = {
    "artifact": "dark_sources_census_corrected",
    "supersedes": "reconciliation/dark_sources_census.json (verdict field only -- the per-evaluator env keys and dependencies there are still valid)",
    "measured": "2026-10-20",
    "correction_note": (
        "The first pass judged an evaluator by whether its DECLARED dataDependencies "
        "NAMED a table that exists. The declared names are SOURCE PRODUCT names "
        "('nfl_pbp', 'nfl_charting'), not table names, and the play-level tables "
        "those products would populate do not exist in schema.prisma (no model Play, "
        "no model Drive, no penalty column, no Player.birthDate, no venue lat/lon). "
        "The corrected pass checks whether the SPECIFIC FIELDS the evaluator reads "
        "are obtainable today at the granularity it needs. The earlier claim "
        "'20 of 21 need only an adapter' was too generous; the correct count is 4."),
    "totals": {
        "dark_evaluators": len([r for r in rows if r["status"] == "DARK"]),
        "shadow_only_evaluators": len([r for r in rows if r["status"] == "SHADOW_ONLY"]),
        "total": len(rows),
        "by_verdict": dict(counts),
    },
    "evaluators": rows,
}
p = os.path.join(WT, "reconciliation", "dark_sources_census_corrected.json")
json.dump(out, open(p, "w", encoding="utf8"), indent=1)
print("wrote", p)
print(json.dumps(out["totals"], indent=1))
print()
for r in rows:
    print(f"  {r['signal_id']:40s} {r['status']:12s} {r['verdict']}")
