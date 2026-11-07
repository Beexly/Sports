"""
core_nfl_schemes_and_systems.py
===============================================================================
Ingests and wires the complete "Core NFL Schemes & Systems" coaching manual
(458 paragraphs, 44,957 chars) and the Fourth and Film Offensive Formation
Identification taxonomy (v=sRaIlyv95hs / https://go.fourthandfilm.com/t/zx786nf)
into executable GSE coaching intelligence and GSI neuro-trauma priors.

Covers:
  1. 8 Core Offensive Schemes (West Coast, Air Coryell, Air Raid, Erhardt-Perkins,
     Shanahan/McVay Outside Zone, Power/Gap Smashmouth, RPO Spread, Heavy 12/13).
  2. 11 Route Concepts & Coverage Counters (Mesh, Levels, Flood, Smash, Four
     Verticals, Stick, Dagger, Y-Cross, Double China, Ghost, Mills).
  3. Pass Protection & Blitz Pickup Rules (5-0 BOB, Full Slide, Half-Slide
     2-Jet/3-Jet "One You, Two Me", 62/63/64/68/H2, 4-Weak TOM/FAN/Hot vs
     4-Strong JOKER/STAY, Boot & Fake Power).
  4. Defensive Fronts, Coverage Shells & Match Rules (Cover 1 Plug Banjo/Rat/Lab,
     Cover 2 Firmer vs Floated, Cover 3 Buzz/Hook, Cover 4 Quarters Box [4-on-3]
     & Triangle [3-on-2] with Push calls, Cover 6 QQH, Cover 9 HQQ, Cover 0
     Amoeba / Flores Drop-8, plus Counter Run vulnerability in static 2-high).
  5. Gruden's Glossary & Fourth-and-Film Formation Tags (21 Personnel Split/I/
     Strong/Weak + Slot/Zoom/Star/Sun; 12 Personnel S-Words Solo/Classy/Snug/
     Special/Sink/Sprout; 11 Personnel Trips T-Words Trips/Trough/Trout/Trump/
     Trio + 1x4 Passing Split; Under-Center vs Shotgun drop timing; 7-10s
     referee substitution matching window).
  6. Situational Down & Distance Immediate & Series Conversion Priors.
  7. GSI CTE, Subconcussive Trench Accumulation & Dynamic Kickoff (-43%
     concussion reduction) Epidemiological Priors (878 deceased cohort,
     215/235 donated brains vs 24.5% unconditioned cohort floor).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple


@dataclass(frozen=True)
class OffensiveSchemeProfile:
    scheme_id: str
    display_name: str
    originators_and_practitioners: Tuple[str, ...]
    base_personnel: Tuple[str, ...]
    target_time_to_throw_sec: float
    signature_concepts: Tuple[str, ...]
    primary_defensive_counters: Tuple[str, ...]
    epa_boost_vs_shell: Dict[str, float]


CORE_OFFENSIVE_SCHEMES: Dict[str, OffensiveSchemeProfile] = {
    "WEST_COAST": OffensiveSchemeProfile(
        scheme_id="WEST_COAST",
        display_name="West Coast Offense (Horizontal Stretch & Timed YAC)",
        originators_and_practitioners=("Bill Walsh", "Andy Reid", "Kyle Shanahan", "Matt LaFleur", "Mike Holmgren"),
        base_personnel=("21", "11", "12"),
        target_time_to_throw_sec=2.38,
        signature_concepts=("Slant-Flat", "Stick", "Hank", "Spider 2 Y Banana", "Mesh", "Shallow Cross"),
        primary_defensive_counters=("Press-Man Jam Inside 5 Yds", "Cover 2 Cloud Corners", "Interior Throwing-Lane Bat-Downs"),
        epa_boost_vs_shell={"COVER_3": 0.045, "COVER_1": 0.032, "COVER_2_FIRMER": -0.042, "COVER_4_QUARTERS": 0.018},
    ),
    "AIR_CORYELL": OffensiveSchemeProfile(
        scheme_id="AIR_CORYELL",
        display_name="Air Coryell (3-Digit Numeric Tree & Vertical Stretch)",
        originators_and_practitioners=("Don Coryell", "Norv Turner", "Mike Martz", "Bruce Arians", "Al Saunders"),
        base_personnel=("11", "12", "21"),
        target_time_to_throw_sec=2.92,
        signature_concepts=("989 All Go", "999 Y-Pop", "996 X Corner-Post", "Dagger", "Mills", "Flood", "Four Verticals"),
        primary_defensive_counters=("Cover 4 Quarters", "Cover 6 QQH", "5-Man Edge Pressure Before 7-Step Drop"),
        epa_boost_vs_shell={"COVER_3": 0.058, "COVER_1": 0.048, "COVER_4_QUARTERS": -0.046, "COVER_2_FLOATED": -0.052},
    ),
    "AIR_RAID": OffensiveSchemeProfile(
        scheme_id="AIR_RAID",
        display_name="Air Raid (10-Personnel Wide-Split High-Repetition Space)",
        originators_and_practitioners=("Hal Mumme", "Mike Leach", "Kliff Kingsbury", "Lincoln Riley"),
        base_personnel=("10", "11"),
        target_time_to_throw_sec=2.32,
        signature_concepts=("6 Four Verticals", "92 Mesh", "95 Y-Cross", "8 Shallow Cross", "80 Stick", "Tunnel Screen"),
        primary_defensive_counters=("Drop-8 3-Man Rush", "Tight Inside-Leverage Man", "Late Disguised Buzz Safety"),
        epa_boost_vs_shell={"COVER_1": 0.052, "COVER_0": 0.064, "DROP_8_SIM_PRESSURE": -0.058, "COVER_4_QUARTERS": -0.024},
    ),
    "ERHARDT_PERKINS": OffensiveSchemeProfile(
        scheme_id="ERHARDT_PERKINS",
        display_name="Erhardt-Perkins (Concept-Word Formation-Agnostic System)",
        originators_and_practitioners=("Ron Erhardt", "Ray Perkins", "Charlie Weis", "Josh McDaniels", "Brian Daboll"),
        base_personnel=("11", "12", "21", "13"),
        target_time_to_throw_sec=2.45,
        signature_concepts=("Ghost", "Hoss Y-Juke", "Levels", "Drive", "Power O", "Wham"),
        primary_defensive_counters=("Post-Snap Coverage Rotation", "Green-Dog Blitzes", "Banjo Switch Rules"),
        epa_boost_vs_shell={"COVER_1": 0.041, "COVER_2_FLOATED": 0.036, "COVER_4_QUARTERS": 0.022, "DROP_8_SIM_PRESSURE": -0.029},
    ),
    "SHANAHAN_MCVAY_OUTSIDE_ZONE": OffensiveSchemeProfile(
        scheme_id="SHANAHAN_MCVAY_OUTSIDE_ZONE",
        display_name="Shanahan / McVay Wide Zone & Play-Action Bootleg",
        originators_and_practitioners=("Mike Shanahan", "Kyle Shanahan", "Sean McVay", "Kevin O'Connell", "Mike McDaniel"),
        base_personnel=("21", "12", "11"),
        target_time_to_throw_sec=2.58,
        signature_concepts=("Outside Zone", "Play-Action Bootleg Flood", "Yankee", "Jet/Orbit Motion", "Duo", "Dagger"),
        primary_defensive_counters=("Wide-9 Hard Edge Setting", "Interior 1-Tech/3-Tech Upfield Penetration", "Backside DE Boot Containment"),
        epa_boost_vs_shell={"COVER_3": 0.062, "COVER_4_QUARTERS": 0.049, "BEAR_46_FRONT": -0.044, "COVER_1": 0.028},
    ),
    "POWER_GAP_SMASHMOUTH": OffensiveSchemeProfile(
        scheme_id="POWER_GAP_SMASHMOUTH",
        display_name="Power & Gap Scheme (24 Lead, Counter Trey & Heavy Downhill)",
        originators_and_practitioners=("Jim Harbaugh", "Greg Roman", "Arthur Smith", "Dan Campbell"),
        base_personnel=("21", "22", "12", "13"),
        target_time_to_throw_sec=2.68,
        signature_concepts=("24 Lead", "Power O", "Counter Trey", "Duo", "Fake Power Play-Action Deep Post"),
        primary_defensive_counters=("46 Bear Front", "Wrong-Arm Spill Technique on Pullers", "Run-Stopping 8-Man Box"),
        epa_boost_vs_shell={"COVER_4_QUARTERS": 0.056, "COVER_6": 0.048, "BEAR_46_FRONT": -0.051, "COVER_1": -0.018},
    ),
    "RPO_SPREAD_OPTION": OffensiveSchemeProfile(
        scheme_id="RPO_SPREAD_OPTION",
        display_name="RPO & Spread Option (0.8s Post-Snap Conflict Defender Read)",
        originators_and_practitioners=("Nick Sirianni", "Shane Steichen", "Todd Monken", "Chip Kelly"),
        base_personnel=("11", "12"),
        target_time_to_throw_sec=2.24,
        signature_concepts=("Inside Zone Glance RPO", "Zone Read Bubble", "Pop Pass", "QB Power Read"),
        primary_defensive_counters=("Scrape-Exchange (DE Dive / LB QB)", "Man Coverage Locking RPO Windows", "Simulated Creep Pressure"),
        epa_boost_vs_shell={"COVER_3": 0.047, "COVER_4_QUARTERS": 0.044, "COVER_1": -0.032, "DROP_8_SIM_PRESSURE": -0.038},
    ),
    "HEAVY_12_13_PERSONNEL_MODERN": OffensiveSchemeProfile(
        scheme_id="HEAVY_12_13_PERSONNEL_MODERN",
        display_name="Modern Hybrid 12/13 Personnel (Mismatch & No-Sub Tempo)",
        originators_and_practitioners=("Todd Monken (2024 Ravens 51% 12p)", "Sean McVay (2025 Rams)", "Ben Johnson"),
        base_personnel=("12", "13"),
        target_time_to_throw_sec=2.62,
        signature_concepts=("12p Counter Run", "Seam-Flood from Snug/Solo", "Play-Action Y-Cross", "No-Sub Tempo Trap"),
        primary_defensive_counters=("Big Nickel (3-Safety Package)", "Hybrid LB/Edge Matching #2 TE Vertical"),
        epa_boost_vs_shell={"COVER_4_QUARTERS": 0.059, "COVER_2_FLOATED": 0.051, "COVER_3": 0.042, "COVER_1": 0.034},
    ),
}


@dataclass(frozen=True)
class RouteConceptRule:
    concept_id: str
    coryell_or_air_raid_code: str
    target_coverages_beaten: Tuple[str, ...]
    defensive_counters: Tuple[str, ...]
    conflict_defender: str
    epa_delta_when_matched: float
    epa_delta_when_unmatched: float


ROUTE_CONCEPTS_MATRIX: Dict[str, RouteConceptRule] = {
    "MESH": RouteConceptRule(
        concept_id="MESH",
        coryell_or_air_raid_code="92",
        target_coverages_beaten=("COVER_1", "COVER_0", "COVER_3"),
        defensive_counters=("COVER_1_PLUG_RAT", "ZONE_SWITCH_BANJO"),
        conflict_defender="Man-to-man underneath corners/slots trailing across low hole",
        epa_delta_when_matched=-0.048,
        epa_delta_when_unmatched=0.072,
    ),
    "LEVELS": RouteConceptRule(
        concept_id="LEVELS",
        coryell_or_air_raid_code="LEVELS",
        target_coverages_beaten=("COVER_2", "COVER_3", "TAMPA_2"),
        defensive_counters=("COVER_4_BOX_MATCH", "PATTERN_MATCH_HOOK_CARRY"),
        conflict_defender="Middle Linebacker (Mike) high-lowed at 5 vs 14 yards",
        epa_delta_when_matched=-0.035,
        epa_delta_when_unmatched=0.058,
    ),
    "FLOOD": RouteConceptRule(
        concept_id="FLOOD",
        coryell_or_air_raid_code="SAIL_FLOOD",
        target_coverages_beaten=("COVER_3", "COVER_1"),
        defensive_counters=("COVER_2_FIRMER_CLOUD", "COVER_4_MOD_QUARTER_FLAT"),
        conflict_defender="Curl-Flat defender (Sam/Nickel) stretched vertically 3 vs 12 vs 22 yds",
        epa_delta_when_matched=-0.041,
        epa_delta_when_unmatched=0.068,
    ),
    "SMASH": RouteConceptRule(
        concept_id="SMASH",
        coryell_or_air_raid_code="7_CORNER_HITCH",
        target_coverages_beaten=("COVER_2_FIRMER", "COVER_2_FLOATED", "COVER_6"),
        defensive_counters=("COVER_3_DEEP_OUTSIDE", "COVER_4_MOD"),
        conflict_defender="Cover 2 Flat Corner caught between 5-yd hitch and 14-yd 7-route",
        epa_delta_when_matched=-0.044,
        epa_delta_when_unmatched=0.064,
    ),
    "FOUR_VERTICALS": RouteConceptRule(
        concept_id="FOUR_VERTICALS",
        coryell_or_air_raid_code="989_OR_6",
        target_coverages_beaten=("COVER_3", "COVER_1", "COVER_2_SEAM_BENDER"),
        defensive_counters=("COVER_4_QUARTERS", "DROP_8_3_DEEP_5_UNDER"),
        conflict_defender="Single-high Free Safety (4 verticals vs 3 deep defenders)",
        epa_delta_when_matched=-0.052,
        epa_delta_when_unmatched=0.084,
    ),
    "STICK": RouteConceptRule(
        concept_id="STICK",
        coryell_or_air_raid_code="80",
        target_coverages_beaten=("COVER_3", "COVER_4_OFF"),
        defensive_counters=("COVER_2_HARD_FLAT", "TIGHT_INSIDE_LEVERAGE_MAN"),
        conflict_defender="Flat/Apex defender in horizontal triangle with RB flat",
        epa_delta_when_matched=-0.028,
        epa_delta_when_unmatched=0.049,
    ),
    "DAGGER": RouteConceptRule(
        concept_id="DAGGER",
        coryell_or_air_raid_code="SEAM_CLEAR_DEEP_DIG",
        target_coverages_beaten=("COVER_3", "COVER_4_QUARTERS", "COVER_1"),
        defensive_counters=("COVER_4_WEAK_TRIANGLE_POACH", "COVER_1_PLUG_RAT"),
        conflict_defender="Deep safety carried vertically by #2 seam, vacating 16-yd dig window",
        epa_delta_when_matched=-0.046,
        epa_delta_when_unmatched=0.074,
    ),
    "Y_CROSS": RouteConceptRule(
        concept_id="Y_CROSS",
        coryell_or_air_raid_code="95",
        target_coverages_beaten=("COVER_3", "COVER_2", "COVER_1"),
        defensive_counters=("COVER_4_BOX_ROBOT_CARRY", "EDGE_PRESSURE_UNDER_2_5S"),
        conflict_defender="Weak-side hook/curl defender vacating 18-22 yd cross window",
        epa_delta_when_matched=-0.039,
        epa_delta_when_unmatched=0.071,
    ),
    "DOUBLE_CHINA": RouteConceptRule(
        concept_id="DOUBLE_CHINA",
        coryell_or_air_raid_code="DOUBLE_IN_7_CORNER",
        target_coverages_beaten=("COVER_2_REDZONE", "COVER_3_REDZONE"),
        defensive_counters=("BANJO_SWITCH_IN_OUT", "BRACKET_CORNER_SAFETY"),
        conflict_defender="Goal-line flat/corner defender sucked inside by dual 5-yd in-routes",
        epa_delta_when_matched=-0.036,
        epa_delta_when_unmatched=0.066,
    ),
    "GHOST": RouteConceptRule(
        concept_id="GHOST",
        coryell_or_air_raid_code="EP_GHOST",
        target_coverages_beaten=("COVER_1", "COVER_3"),
        defensive_counters=("BANJO_ALERT_MOTION", "COVER_2_FIRMER"),
        conflict_defender="Outside CB picked/rubbed by #1 slant while #2 wheels to sideline",
        epa_delta_when_matched=-0.034,
        epa_delta_when_unmatched=0.061,
    ),
    "MILLS": RouteConceptRule(
        concept_id="MILLS",
        coryell_or_air_raid_code="POST_DIG_HIGH_LOW",
        target_coverages_beaten=("COVER_3", "COVER_4_QUARTERS"),
        defensive_counters=("DISGUISED_2_HIGH_ROTATION", "DEEP_HALF_SAFETY_TOP_CAP"),
        conflict_defender="Single-high Free Safety stepping down on 12-yd dig with post over top",
        epa_delta_when_matched=-0.055,
        epa_delta_when_unmatched=0.089,
    ),
}


@dataclass(frozen=True)
class PassProtectionEvaluation:
    protection_call: str
    slide_rule: str
    overload_side: str
    qb_or_ol_adjustment: str
    unblocked_rusher_remaining: bool
    pressure_disruption_prob_delta: float
    sack_prob_delta: float
    hot_throw_required: bool


def evaluate_pass_protection_vs_blitz(
    protection_family: str = "HALF_SLIDE_2_JET",
    rushers_weak_slide_side: int = 2,
    rushers_strong_man_side: int = 2,
    adjustment_call: str = "NONE",
) -> PassProtectionEvaluation:
    """
    Evaluates NFL pass protection pickup mathematics per "Core NFL Schemes & Systems":
      - Half-Slide (2-Jet / 3-Jet / 62 / 63 / 64 / 68):
        "One You, Two Me" Rule:
          * Slide side (Center + backside G + backside T) handles 3 zone gaps
            (2 down DL + 1 backside LB).
          * Man side (Play-side G + Play-side T + RB) handles 3 declared targets
            (play-side DT + play-side DE + Mike/Sam).
      - 4-Weak Overload Blitz (4 rushers to the 3-protector slide side):
          * Requires TOM (RB crosses face to weak edge), FAN (OL fans outward,
            leaving interior blitzer hot), or HOT_SIGHT_ADJUST.
      - 4-Strong Overload Blitz (4 rushers to the 3-protector man side):
          * Requires JOKER_OPPOSITE (Center breaks slide to block Mike so RB
            takes second edge rusher) or STAY (TE stays in to block 7-man).
    """
    prot = protection_family.upper()
    adj = adjustment_call.upper()

    if rushers_weak_slide_side >= 4:
        overload_side = "4_WEAK_OVERLOAD"
        if adj == "TOM":
            return PassProtectionEvaluation(
                protection_call=prot,
                slide_rule="One You, Two Me + RB TOM (Tackle Over Me) cross-face pickup",
                overload_side=overload_side,
                qb_or_ol_adjustment="TOM",
                unblocked_rusher_remaining=False,
                pressure_disruption_prob_delta=0.035,
                sack_prob_delta=0.012,
                hot_throw_required=False,
            )
        if adj == "FAN":
            return PassProtectionEvaluation(
                protection_call=prot,
                slide_rule="OL fans outward one gap; interior rusher left hot in QB vision",
                overload_side=overload_side,
                qb_or_ol_adjustment="FAN",
                unblocked_rusher_remaining=True,
                pressure_disruption_prob_delta=0.048,
                sack_prob_delta=0.015,
                hot_throw_required=True,
            )
        if adj == "HOT_SIGHT_ADJUST":
            return PassProtectionEvaluation(
                protection_call=prot,
                slide_rule="3-man slide holds inside-out; QB throws hot sight-adjust off weak edge",
                overload_side=overload_side,
                qb_or_ol_adjustment="HOT_SIGHT_ADJUST",
                unblocked_rusher_remaining=True,
                pressure_disruption_prob_delta=0.042,
                sack_prob_delta=0.010,
                hot_throw_required=True,
            )
        return PassProtectionEvaluation(
            protection_call=prot,
            slide_rule="UNADJUSTED 4-Weak Overload vs 3-man slide (4 rushers vs C/LG/LT)",
            overload_side=overload_side,
            qb_or_ol_adjustment="UNADJUSTED",
            unblocked_rusher_remaining=True,
            pressure_disruption_prob_delta=0.165,
            sack_prob_delta=0.068,
            hot_throw_required=True,
        )

    if rushers_strong_man_side >= 4:
        overload_side = "4_STRONG_OVERLOAD"
        if adj in ("JOKER", "OPPOSITE", "JOKER_OPPOSITE"):
            return PassProtectionEvaluation(
                protection_call=prot,
                slide_rule="Center breaks slide (JOKER/OPPOSITE) to take Mike; RB takes 2nd strong edge",
                overload_side=overload_side,
                qb_or_ol_adjustment="JOKER_OPPOSITE",
                unblocked_rusher_remaining=False,
                pressure_disruption_prob_delta=0.032,
                sack_prob_delta=0.011,
                hot_throw_required=False,
            )
        if adj == "STAY":
            return PassProtectionEvaluation(
                protection_call=prot,
                slide_rule="TE cancels route (STAY call) creating 7-man protection surface",
                overload_side=overload_side,
                qb_or_ol_adjustment="STAY",
                unblocked_rusher_remaining=False,
                pressure_disruption_prob_delta=0.022,
                sack_prob_delta=0.008,
                hot_throw_required=False,
            )
        return PassProtectionEvaluation(
            protection_call=prot,
            slide_rule="UNADJUSTED 4-Strong Overload vs RG/RT/RB man side",
            overload_side=overload_side,
            qb_or_ol_adjustment="UNADJUSTED",
            unblocked_rusher_remaining=True,
            pressure_disruption_prob_delta=0.158,
            sack_prob_delta=0.064,
            hot_throw_required=True,
        )

    return PassProtectionEvaluation(
        protection_call=prot,
        slide_rule="Balanced One You, Two Me (3-man zone slide weak + 3-man BOB strong)",
        overload_side="BALANCED",
        qb_or_ol_adjustment=adj,
        unblocked_rusher_remaining=False,
        pressure_disruption_prob_delta=-0.018,
        sack_prob_delta=-0.008,
        hot_throw_required=False,
    )


@dataclass(frozen=True)
class CoverageMatchDiagnostic:
    coverage_shell: str
    offensive_formation: str
    trips_or_motion_rule: str
    rb_release_rule: str
    counter_run_vulnerability_epa_delta: float
    explosive_pass_suppression_delta: float


def evaluate_secondary_coverage_match(
    coverage_shell: str = "COVER_4_QUARTERS",
    offensive_formation: str = "3X1_TRIPS",
    pre_snap_motion: bool = False,
    rb_release_fast_to_flat: bool = False,
    rb_release_weak_away_from_plug: bool = False,
    is_counter_or_gap_run: bool = False,
) -> CoverageMatchDiagnostic:
    """
    Implements the secondary match rules from "Core NFL Schemes & Systems":
      - Cover 1 Plug:
          * LB Plugger reads RB release: if RB releases strong, Plugger blitzes
            strong B-gap; if RB releases weak, Plugger drops as low-hole 'Rat'
            cutting shallow/intermediate crossers (Mesh/Dagger).
          * Pre-snap motion triggers BANJO, RAT (bumps coverage across + LB becomes
            new blitzer), or LAB (safety drops down + original defender rotates
            to deep middle).
      - Cover 4 Quarters vs 3x1 Trips:
          * Strong-Side BOX (4-on-3): Outside CB plays MOD (Man on Deep) on #1;
            Quarter-Flat collisions #2 & expands to flat; Hook relates to #3
            with a 'PUSH' call if RB flares fast; Quarters Safety poaches #3
            vertical at 8-10 yds.
          * Weak-Side TRIANGLE (3-on-2): Weak safety reads #2 to #1, triggering
            downhill on weak run or robbing backside dig/post if #3 stays shallow.
          * Counter Run Vulnerability: Static two-high/split-field fronts expose
            interior angles to pulling counter blockers (+0.068 EPA/rush).
    """
    shell = coverage_shell.upper()
    form = offensive_formation.upper()

    if shell == "COVER_1_PLUG":
        motion_rule = (
            "BANJO stack switch + RAT/LAB motion bump (tells QB man coverage pre-snap)"
            if pre_snap_motion
            else "Static press-man with single-high FS and LB Plugger reading RB"
        )
        rb_rule = (
            "RB weak -> Plugger aborts rush and drops into low-hole RAT window (robs Mesh/Dig)"
            if rb_release_weak_away_from_plug
            else "RB strong -> Will/Man LB tracks RB; Plugger blitzes strong B-gap (5-man rush)"
        )
        return CoverageMatchDiagnostic(
            coverage_shell=shell,
            offensive_formation=form,
            trips_or_motion_rule=motion_rule,
            rb_release_rule=rb_rule,
            counter_run_vulnerability_epa_delta=-0.025 if is_counter_or_gap_run else 0.0,
            explosive_pass_suppression_delta=-0.038 if rb_release_weak_away_from_plug else -0.015,
        )

    if shell in ("COVER_4_QUARTERS", "COVER_6", "COVER_9"):
        if "3X1" in form or "TRIPS" in form or "TROUGH" in form or "1X4" in form:
            trips_rule = (
                "Strong 4-on-3 BOX (MOD on #1, Quarter-Flat #2, Hook #3, Quarters Safety #3 vert) "
                "+ Weak 3-on-2 TRIANGLE (Weak Safety reads #2-to-#1 / robs backside dig)"
            )
        else:
            trips_rule = "Balanced 2x2 Quarters (Corners MOD on #1; Safeties read #2 vertical at 8-10 yds)"

        rb_rule = (
            "RB fast flare -> Hook shouts PUSH! Quarter-Flat jumps RB; Hook pushes to #2"
            if rb_release_fast_to_flat
            else "Hook holds #3 curl/hook zone; Quarter-Flat carries #2 out"
        )
        return CoverageMatchDiagnostic(
            coverage_shell=shell,
            offensive_formation=form,
            trips_or_motion_rule=trips_rule,
            rb_release_rule=rb_rule,
            counter_run_vulnerability_epa_delta=0.068 if is_counter_or_gap_run else 0.012,
            explosive_pass_suppression_delta=-0.056,
        )

    if shell in ("COVER_2_FIRMER", "COVER_2_FLOATED"):
        return CoverageMatchDiagnostic(
            coverage_shell=shell,
            offensive_formation=form,
            trips_or_motion_rule=(
                "Firmer Corner: hard 5-yd jam & trail"
                if "FIRMER" in shell
                else "Floated Corner: soft sink to 10-12 yds baiting hole shot between CB and deep-half S"
            ),
            rb_release_rule="Flat corner triggers on RB flat; Sam/Mike carries #2 seam",
            counter_run_vulnerability_epa_delta=0.062 if is_counter_or_gap_run else 0.010,
            explosive_pass_suppression_delta=-0.044,
        )

    return CoverageMatchDiagnostic(
        coverage_shell=shell,
        offensive_formation=form,
        trips_or_motion_rule="Cover 3 Buzz (6-8 yds to numbers) + Hook (10-12 yds, 1 yd outside hash)",
        rb_release_rule="Curl-Flat defender expands to RB flat; Hook sits on inner hash",
        counter_run_vulnerability_epa_delta=-0.018 if is_counter_or_gap_run else -0.008,
        explosive_pass_suppression_delta=-0.022,
    )


# Gruden's Glossary & Fourth-and-Film Formation Dictionary (21, 12 S-Words, 11 Trips T-Words)
GRUDEN_AND_FOURTH_FILM_FORMATIONS: Dict[str, Dict[str, str]] = {
    # 21 Personnel Backfield & Receiver Tags
    "21_SPLIT": {"personnel": "21", "family": "BACKFIELD", "rule": "RB and FB aligned parallel side-by-side behind QB"},
    "21_I": {"personnel": "21", "family": "BACKFIELD", "rule": "FB and TB aligned in a straight vertical column behind QB"},
    "21_STRONG": {"personnel": "21", "family": "BACKFIELD", "rule": "Fullback offset toward the Tight End side"},
    "21_WEAK": {"personnel": "21", "family": "BACKFIELD", "rule": "Fullback offset away from the Tight End side"},
    "TAG_SLOT": {"personnel": "21", "family": "WR_TAG", "rule": "Both WRs align away from TE; Z aligns inside X"},
    "TAG_ZOOM": {"personnel": "21", "family": "WR_TAG", "rule": "Both WRs align away from TE; X aligns inside Z"},
    "TAG_STAR": {"personnel": "21", "family": "FB_WR_TAG", "rule": "FB (F) detaches into weak-side slot receiver"},
    "TAG_SUN": {"personnel": "21", "family": "FB_WR_TAG", "rule": "FB (F) detaches widest outside X on weak side"},
    # 12 Personnel "S-Words" (Y = inline TE, U = move TE)
    "12_SOLO": {"personnel": "12", "family": "S_WORD_12P", "rule": "U splits out weak as single boundary WR; X and Z stack strong with Y"},
    "12_CLASSY": {"personnel": "12", "family": "S_WORD_12P", "rule": "X and Z both align weak away from Y and U"},
    "12_SNUG": {"personnel": "12", "family": "S_WORD_12P", "rule": "Z aligns condensed within 2 yards of U to crack DE or run rub"},
    "12_SPECIAL": {"personnel": "12", "family": "S_WORD_12P", "rule": "3-receiver weak flood: X, Z, and U all align away from inline Y"},
    "12_SINK": {"personnel": "12", "family": "S_WORD_12P", "rule": "Y and U stack tightly together on the call side"},
    "12_SPROUT": {"personnel": "12", "family": "S_WORD_12P", "rule": "Both TEs align inside the outside WRs on their respective sides"},
    # 11 Personnel Trips "T-Words"
    "11_TRIPS": {"personnel": "11", "family": "T_WORD_TRIPS", "rule": "3 WRs aligned to the side opposite the inline TE"},
    "11_TROUGH": {"personnel": "11", "family": "T_WORD_TRIPS", "rule": "All 3 WRs aligned on the SAME side as the TE (4-eligible surface)"},
    "11_TROUT": {"personnel": "11", "family": "T_WORD_TRIPS", "rule": "TE aligns innermost as #3, Z as #2, X widest as #1"},
    "11_TRUMP": {"personnel": "11", "family": "T_WORD_TRIPS", "rule": "TE aligns widest outside as #1 to block CB or isolate boundary"},
    "11_TRIO": {"personnel": "11", "family": "T_WORD_TRIPS", "rule": "RB aligns offset opposite the 3-WR Trips surface"},
    "11_1X4_SPLIT": {"personnel": "11", "family": "SPLIT_FIELD_COUNTER", "rule": "Chiefs 1x4 passing split: 4 eligibles to field + 1 stud isolated boundary"},
}


@dataclass(frozen=True)
class DownAndDistancePrior:
    bucket_id: str
    down: int
    ydstogo_min: int
    ydstogo_max: int
    immediate_conversion_prob: float
    series_conversion_prob: float
    expected_run_rate: float


DOWN_AND_DISTANCE_PRIORS: Dict[str, DownAndDistancePrior] = {
    "1ST_AND_SHORT": DownAndDistancePrior("1ST_AND_SHORT", 1, 1, 5, 0.600, 0.900, 0.560),
    "1ST_AND_10": DownAndDistancePrior("1ST_AND_10", 1, 6, 10, 0.225, 0.750, 0.485),
    "1ST_AND_LONG": DownAndDistancePrior("1ST_AND_LONG", 1, 15, 99, 0.110, 0.325, 0.240),
    "2ND_AND_SHORT": DownAndDistancePrior("2ND_AND_SHORT", 2, 1, 3, 0.650, 0.825, 0.580),
    "2ND_AND_MEDIUM": DownAndDistancePrior("2ND_AND_MEDIUM", 2, 4, 6, 0.450, 0.675, 0.440),
    "2ND_AND_LONG": DownAndDistancePrior("2ND_AND_LONG", 2, 7, 10, 0.300, 0.525, 0.310),
    "2ND_AND_VERY_LONG": DownAndDistancePrior("2ND_AND_VERY_LONG", 2, 11, 99, 0.160, 0.300, 0.180),
    "3RD_AND_SHORT": DownAndDistancePrior("3RD_AND_SHORT", 3, 1, 2, 0.650, 0.650, 0.700),
    "3RD_AND_MEDIUM": DownAndDistancePrior("3RD_AND_MEDIUM", 3, 3, 6, 0.450, 0.450, 0.220),
    "3RD_AND_LONG": DownAndDistancePrior("3RD_AND_LONG", 3, 7, 10, 0.225, 0.225, 0.110),
    "3RD_AND_VERY_LONG": DownAndDistancePrior("3RD_AND_VERY_LONG", 3, 11, 99, 0.090, 0.090, 0.080),
    "4TH_AND_INCHES": DownAndDistancePrior("4TH_AND_INCHES", 4, 0, 1, 0.825, 0.825, 0.780),
    "4TH_AND_SHORT": DownAndDistancePrior("4TH_AND_SHORT", 4, 2, 2, 0.600, 0.600, 0.520),
    "4TH_AND_MEDIUM": DownAndDistancePrior("4TH_AND_MEDIUM", 4, 3, 5, 0.400, 0.400, 0.180),
    "4TH_AND_LONG": DownAndDistancePrior("4TH_AND_LONG", 4, 6, 99, 0.175, 0.175, 0.050),
}


def lookup_down_and_distance_prior(down: int, ydstogo: float) -> DownAndDistancePrior:
    """Returns the empirical conversion prior for any (down, ydstogo) state."""
    y = max(0.5, float(ydstogo))
    if down == 1:
        if y <= 5:
            return DOWN_AND_DISTANCE_PRIORS["1ST_AND_SHORT"]
        if y >= 15:
            return DOWN_AND_DISTANCE_PRIORS["1ST_AND_LONG"]
        return DOWN_AND_DISTANCE_PRIORS["1ST_AND_10"]
    if down == 2:
        if y <= 3:
            return DOWN_AND_DISTANCE_PRIORS["2ND_AND_SHORT"]
        if y <= 6:
            return DOWN_AND_DISTANCE_PRIORS["2ND_AND_MEDIUM"]
        if y <= 10:
            return DOWN_AND_DISTANCE_PRIORS["2ND_AND_LONG"]
        return DOWN_AND_DISTANCE_PRIORS["2ND_AND_VERY_LONG"]
    if down == 3:
        if y <= 2:
            return DOWN_AND_DISTANCE_PRIORS["3RD_AND_SHORT"]
        if y <= 6:
            return DOWN_AND_DISTANCE_PRIORS["3RD_AND_MEDIUM"]
        if y <= 10:
            return DOWN_AND_DISTANCE_PRIORS["3RD_AND_LONG"]
        return DOWN_AND_DISTANCE_PRIORS["3RD_AND_VERY_LONG"]
    # 4th down
    if y <= 1.0:
        return DOWN_AND_DISTANCE_PRIORS["4TH_AND_INCHES"]
    if y <= 2.0:
        return DOWN_AND_DISTANCE_PRIORS["4TH_AND_SHORT"]
    if y <= 5.0:
        return DOWN_AND_DISTANCE_PRIORS["4TH_AND_MEDIUM"]
    return DOWN_AND_DISTANCE_PRIORS["4TH_AND_LONG"]


# GSI CTE, Subconcussive Trauma & Dynamic Kickoff Epidemiological Priors
GSI_CTE_AND_HEAD_TRAUMA_PRIORS = {
    "cohort_years": "2016-2021",
    "deceased_former_nfl_players_total": 878,
    "brains_donated_for_autopsy": 235,
    "cte_positive_donated_brains": 215,
    "conditional_donated_sample_rate": round(215 / 235, 4),  # 0.9149 (91.5% selection-biased sample)
    "unconditioned_cohort_lower_bound_rate": round(215 / 878, 4),  # 0.2449 (24.5% hard lower bound across all 878)
    "safety_rule_changes_enacted_since_2002": 52,
    "dynamic_kickoff_concussion_reduction_pct": -43.0,
    "under_center_3step_flat_timing_advantage_sec": 0.28,
    "referee_substitution_matching_window_sec": (7.0, 10.0),
    "starting_qbs_used_2023_benchmark": 59,
}
