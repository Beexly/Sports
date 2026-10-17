"""Position mechanism primitives - the mechanisms signals flow through.

NOT signals. Each entry names the actual football mechanism a personnel
change produces, as a causal chain whose links compose (each link's outcome
is the next link's cause), with effect directions, a magnitude ladder, and
the context required for the mechanism to apply at all.

Doctrine: intelligence/reasoning/primitives/ is a library. The analyst layer
SELECTS and COMPOSES entries; it never generates mechanism prose itself.
A chain with a repeated sentence pattern is broken - the primitives are how
repetition dies.

Entry shape:
    MechanismEntry(
        key=("DT1", "OUT"),                  # (role, situation)
        name="Interior Vacuum",              # the named mechanism
        applies=lambda ctx: bool,            # context gate (scheme/personnel)
        chain=[link0, link1, link2, ...],    # each a f-string template over ctx
        effects={"interior_run_def": "+", ...},
        magnitude={"base": 0.5, "vs_inside_zone": 0.8, ...},
        source_of_truth="coaching-doctrine/positions",
    )
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable


@dataclass
class MechanismEntry:
    role: str
    situation: str
    name: str
    chain: list[str]                    # causal links; templates over ctx
    effects: dict[str, str]             # facet -> direction (+/-/0)
    magnitude: dict[str, float]         # context -> relative weight (0..1)
    requires: list[str] = field(default_factory=list)  # ctx keys that must be present
    # ── Section 5 anatomy (see docs/reasoning/PRIMITIVE_CATALOG.md) ─────────
    family: str = "injury"              # injury|scheme|environmental|market|game_state|cognitive|precedent
    # Conditions under which this mechanism is WRONG. A primitive without a
    # falsifier is a template; the catalog refuses to count it as built.
    falsifiers: list[str] = field(default_factory=list)
    # Names of primitives whose effects touch the SAME mechanism facet. Only
    # these may compose (5.3); anything else is correlation laundering.
    composes_with: list[str] = field(default_factory=list)
    # Structural-match hook used by the precedent layer: the (feature, op, value)
    # signature this mechanism historically repeated under. "" = named gap.
    precedent_hook: str = ""

    def render(self, ctx: dict[str, Any]) -> dict[str, Any]:
        """Compose the entry against a concrete game context."""
        try:
            chain = [c.format(**ctx) for c in self.chain]
        except KeyError as exc:
            chain = [f"[mechanism {self.name} incomplete: missing context {exc}]"]
        return {
            "mechanism": self.name,
            "role": self.role,
            "situation": self.situation,
            "family": self.family,
            "chain": chain,
            "effects": self.effects,
            "magnitude_hint": self.magnitude.get("base", 0.5),
            "requires": self.requires,
            "falsifiers": self.falsifiers,
            "composes_with": self.composes_with,
            "precedent_hook": self.precedent_hook,
        }


# ---------------------------------------------------------------------------
# THE CATALOG
# ---------------------------------------------------------------------------

CATALOG: list[MechanismEntry] = [
    # ---------------- DEFENSIVE LINE / EDGE ----------------
    MechanismEntry(
        role="EDGE1", situation="OUT",
        name="Disguise Displacement",
        chain=[
            "{player} ({pos}, {status}) removes the {team} EDGE rotation's third declared rusher",
            "the remaining front can still set the edge, but the post-snap loop/disguise package loses its A-gap complement",
            "protection slides declare one fewer rusher pre-snap, so the QB's first-read window extends on 3rd-and-6+",
            "the defense compensates by rushing four straight - which the opposing slide protection handles best of all",
        ],
        effects={"pass_rush_variety": "-", "qb_first_read_window": "+", "sack_rate": "0/+ (disguise loss exceeds rush loss only vs slide protection)"},
        magnitude={"base": 0.5, "vs_slide_protection": 0.8, "vs_max_protection": 0.3},
        requires=["opponent_protection_scheme"],
    ),
    MechanismEntry(
        role="EDGE1", situation="QUESTIONABLE",
        name="Rotation Thinning (Watch List)",
        chain=[
            "{player} ({pos}, {status}) is on-report, not confirmed out",
            "if limited, the rotation shrinks to a two-man EDGE loop and the fourth-quarter rush quality decays",
            "late-down rush repetitions concentrate on one fresher starter, which is exploitable by chip/quick-game",
            "treat as a fourth-quarter fatigue mechanism, not a first-quarter production mechanism",
        ],
        effects={"late_down_rush_quality": "-", "q4_pressure_rate": "-"},
        magnitude={"base": 0.3, "if_played_80pct_recent": 0.4},
        requires=[],
    ),
    MechanismEntry(
        role="DT1", situation="OUT",
        name="Interior Vacuum",
        chain=[
            "{player} ({pos}, {status}) removes the interior rush that forces QBs off their launch point",
            "double-team assignments collapse onto the remaining tackle, freeing a linebacker to blitz the vacated A-gap",
            "but the blitz body must come from somewhere - the underneath coverage loses it, weakening TE/RB zones",
            "net: interior run defense stiffens while the QB's clean-pocket rate RISES on early downs and the TE middle window opens on 3rd down",
        ],
        effects={"interior_run_defense": "+", "qb_clean_pocket_rate_early": "+", "te_middle_zone": "+", "lb_blitz_body": "-"},
        magnitude={"base": 0.5, "if_replacement_rotation_thin": 0.75, "if_plus_replacement": 0.25},
        requires=[],
    ),
    MechanismEntry(
        role="DT1", situation="OUT",
        name="Pre-snap Declaration Leak",
        chain=[
            "with {player} ({pos}, {status}) out, the remaining interior must declare gap assignments pre-snap (no rotating 3-tech to disguise with)",
            "vs a quick-decision QB (TTT < 2.6s), pre-snap declaration is worth more than post-snap disguise",
            "the QB hot-raises into the declared soft spot before the twist develops",
            "effect concentrates on 3rd-and-5+: pressure rate drops, conversion rate rises for the offense",
        ],
        effects={"qb_pre_snap_advantage": "+", "third_down_pressure": "-", "third_down_conversion_defense": "-"},
        magnitude={"base": 0.55, "vs_ttt_under_2p6": 0.8, "vs_ttt_over_3p0": 0.25},
        requires=["opponent_qb_ttt"],
    ),
    MechanismEntry(
        role="NT", situation="OUT",
        name="Pivot Removal",
        chain=[
            "{player} ({pos}, {status}) removes the zero/one-technique that eats double teams",
            "the center is freed to combo to the second level, and inside-zone runs gain a seam",
            "the defense must slant its ends to fill, which opens the edge outside the slant side",
            "net: opponent inside-run efficiency up, cutback lanes appear, but slant pursuit gives up the boundary",
        ],
        effects={"inside_run_defense": "-", "cutback_lanes": "+", "boundary_edge": "+"},
        magnitude={"base": 0.45, "vs_inside_zone_team": 0.7, "vs_outside_zone_team": 0.3},
        requires=["opponent_run_scheme"],
    ),
    MechanismEntry(
        role="DL_ROTATION", situation="THIN",
        name="Fourth-Quarter Rush Decay",
        chain=[
            "the {team} front's rotation is thin ({detail})",
            "starting DL snap counts climb toward 80%+ and fourth-quarter rush quality decays measurably",
            "QB pressure converts to hurries, not sacks, as rushers lose leg drive late",
            "the mechanism is a LATE-GAME mechanism: front-load nothing, expect opponent second-half passing efficiency to rise",
        ],
        effects={"q4_pressure_quality": "-", "opponent_second_half_pass_epa": "+"},
        magnitude={"base": 0.4, "if_hot_weather": 0.6, "if_cold": 0.3},
        requires=["weather_temperature"],
    ),

    # ---------------- OFFENSIVE LINE ----------------
    MechanismEntry(
        role="C", situation="OUT",
        name="Identification Debt",
        chain=[
            "{player} ({pos}, {status}) removes the protection's mic and the Mike-pointer",
            "combo blocks become one-on-ones and slide direction must be called by a guard who has not done it",
            "disguised pressures (post-snap rotations) hit hardest: the protection identifies the wrong lever",
            "QB must hold the ball longer OR check down earlier; both shift the passing game underneath",
        ],
        effects={"protection_communication": "-", "vs_disguised_pressure": "--", "checkdown_rate": "+", "deep_shot_rate": "-"},
        magnitude={"base": 0.6, "vs_pressure_heavy_dc": 0.85, "vs_four_man_front": 0.35},
        requires=["opponent_defensive_scheme"],
    ),
    MechanismEntry(
        role="OG", situation="OUT",
        name="Combo Block Collapse",
        chain=[
            "{player} ({pos}, {status}) breaks the guard's half of combo blocks",
            "interior double-teams become solo, so inside-zone runs lose their displacement",
            "the defense reads run/pass faster off a solo block, and stunts overload the adjacent blocker",
            "net: run-game interior efficiency down, QB pressure up the A/B-gap, screen game becomes the pressure release",
        ],
        effects={"inside_zone_efficiency": "-", "ab_gap_pressure": "+", "screen_rate": "+"},
        magnitude={"base": 0.5, "if_guard_is_veteran": 0.35, "if_rookie_replacement": 0.7},
        requires=["replacement_profile"],
    ),
    MechanismEntry(
        role="OT1", situation="OUT",
        name="Edge Declaration",
        chain=[
            "{player} ({pos}, {status}) puts a backup tackle on an edge",
            "slide protection must declare toward the backup, pulling help from the other side",
            "a DC who can set the edge (wide-9 or landlord alignment) attacks the declared side with speed",
            "QB knows where the pressure comes from - which shortens his launch decision and biases throws away from the weak side",
        ],
        effects={"weak_side_shot_rate": "-", "declared_side_pressure": "+", "qb_launch_speed": "+"},
        magnitude={"base": 0.55, "vs_edge_hunter": 0.8, "vs_bend_dc": 0.35},
        requires=["opponent_edge_quality"],
    ),
    MechanismEntry(
        role="OL_CONTINUITY", situation="MULTI_OUT",
        name="Communication Cascade",
        chain=[
            "{detail}: multiple OL changes force new line-game assignments in one week",
            "protection identification degrades non-linearly (each new piece multiplies the calls)",
            "the offense leans on quick game and max-protection, which caps the route tree",
            "project: shorter throws, fewer deep shots, higher checkdown share until the unit gels (usually 2+ weeks)",
        ],
        effects={"route_tree": "-", "deep_shot_rate": "-", "quick_game_rate": "+", "protection_stability": "--"},
        magnitude={"base": 0.6, "if_three_or_more_changes": 0.85},
        requires=[],
    ),

    # ---------------- SKILL POSITIONS ----------------
    MechanismEntry(
        role="WR1", situation="OUT",
        name="Role Redistribution",
        chain=[
            "{player} ({pos}, {status}) removes the X or the motion/mesh piece - role matters more than depth",
            "if he was the static X, targets flow to the slot and TE on the formation's strong side",
            "if he was the motion piece, the entire formation-tagging problem lands on the slot: the offense loses its pre-snap reads",
            "the defense's best corner follows the ROLE, not the name - so the replacement draws the shadow only if he lines up outside",
        ],
        effects={"target_concentration_slot_te": "+", "formation_tagging": "-/0", "cb_shadow_follows_role": True},
        magnitude={"base": 0.5, "if_motion_piece": 0.75, "if_static_x": 0.5},
        requires=[],
    ),
    MechanismEntry(
        role="WR2", situation="OUT",
        name="Single-High Magnet",
        chain=[
            "{player} ({pos}, {status}) removes the Z/second outside threat",
            "defenses cheat a safety toward WR1 without paying for it - single-high looks rise",
            "WR1 sees pattern-matching brackets on scramble-drill downs he did not see at full personnel",
            "TE and RB underneath become the primary progression; deep-ball share drops for the whole offense",
        ],
        effects={"safety_help_to_wr1": "+", "deep_ball_share": "-", "te_rb_underneath": "+"},
        magnitude={"base": 0.45, "if_team_runs_11_personnel": 0.6},
        requires=["personnel_tendency"],
    ),
    MechanismEntry(
        role="TE1", situation="OUT",
        name="Middle Window Closure",
        chain=[
            "{player} ({pos}, {status}) removes the seam/middle-window weapon",
            "the defense's money linebacker no longer needs帮助 help over the middle and can body the RB or blitz",
            "the offense loses its best 3rd-and-medium conversion answer; drives stall in the +40",
            "field-goal probability replaces touchdown probability on long drives - scoring distribution flattens",
        ],
        effects={"third_down_conversion": "-", "middle_window": "-", "fg_td_ratio": "+"},
        magnitude={"base": 0.45, "if_te_was_primary_3rd_target": 0.65},
        requires=[],
    ),
    MechanismEntry(
        role="RB1", situation="OUT",
        name="Carry Concentration & Pass-Pro Drop",
        chain=[
            "{player} ({pos}, {status}) moves the load to the backup",
            "backups take carries but rarely inherit full pass-protection trust - the QB eats an extra pressure per game",
            "if the backup is a between-tackles runner, outside-zone runs lose their cut threat",
            "net: rush volume holds, rush efficiency and blitz-pickup drop, screen game compensates",
        ],
        effects={"rush_volume": "0", "rush_efficiency": "-", "blitz_pickup": "-", "screen_rate": "+"},
        magnitude={"base": 0.45, "if_replacement_pass_pro_rust": 0.65},
        requires=["replacement_profile"],
    ),
    MechanismEntry(
        role="QB1", situation="OUT",
        name="Play-Action Death",
        chain=[
            "{player} ({pos}, {status}) hands the offense to the backup",
            "the backup inherits the script but not the play-action credibility - defenses ignore the run fake",
            "the offense becomes dropback-only: predictable downs, cleaner defensive reads",
            "project: scoring drops faster than yardage (more drives stall in FG range), total trends under on short fields",
        ],
        effects={"play_action_efficiency": "--", "defensive_read_speed": "+", "scoring": "-", "fg_range_stalls": "+"},
        magnitude={"base": 0.6, "if_veteran_backup": 0.4, "if_rookie_first_start": 0.8},
        requires=["replacement_profile"],
    ),

    # ---------------- COVERAGE ----------------
    MechanismEntry(
        role="CB1", situation="OUT",
        name="Shadow Loss",
        chain=[
            "{player} ({pos}, {status}) removes the shadow corner - the defense will not travel its CB2 with the WR1",
            "WR1 now draws the CB2 or a rookie, often with slot/safety help INSTEAD of a shadow",
            "deep-help calculus shifts: if the S is also banged, there is no bracket to pay for",
            "net: WR1 target quality (separation-adjusted) rises; the offense attacks his side on 3rd-and-medium",
        ],
        effects={"wr1_matchup_quality": "+", "bracket_availability": "-", "third_down_attacks": "+"},
        magnitude={"base": 0.6, "if_s_also_banged": 0.8, "if_corner_has_plus_replacement": 0.35},
        requires=["cb_depth", "s_status"],
    ),
    MechanismEntry(
        role="CB1", situation="QUESTIONABLE",
        name="Partial Shadow (Limited Reps)",
        chain=[
            "{player} ({pos}, {status}) is on-report - if he plays limited, the shadow assignment comes with limited practice reps",
            "offenses test shadow corners early: expect the first two third-and-longs toward his side",
            "if he exits, the CB3 ladder enters and the mechanism becomes full Shadow Loss",
            "treat as a conditional trigger, not a base-rate effect",
        ],
        effects={"early_third_down_target_his_side": "+", "conditional_shadow_loss": "0.4 if exits"},
        magnitude={"base": 0.3, "if_game_script_forces_pass": 0.5},
        requires=["game_script_projection"],
    ),
    MechanismEntry(
        role="NB", situation="OUT",
        name="Nickel Package Compromise",
        chain=[
            "{player} ({pos}, {status}) forces the nickel from a backup or a safety checked down",
            "11-personnel becomes a matchup-hunting formation for the offense (slot vs the replacement)",
            "the defense answers by staying base - which concedes the pass advantage but stiffens the run",
            "net: offense personnel forces a defensive personnel decision, and each answer costs something real",
        ],
        effects={"slot_matchup": "+", "base_package_rate": "+", "run_defense": "+/-"},
        magnitude={"base": 0.45, "if_offense_11p_heavy": 0.7},
        requires=["personnel_tendency"],
    ),
    MechanismEntry(
        role="S_FS", situation="OUT",
        name="Deep-Half Rotation Gap",
        chain=[
            "{player} ({pos}, {status}) removes the post-snap rotator - the deep half loses its disguise",
            "QBs read rotation pre-snap more cleanly; deep-crossers and post routes gain a half-step",
            "the replacement (often a box SS) keeps run support but loses the free safety's range",
            "net: explosive pass rate up for the offense, interior run support unchanged",
        ],
        effects={"explosive_pass_rate": "+", "run_support": "0", "post_snap_disguise": "-"},
        magnitude={"base": 0.5, "if_replacement_is_box_s": 0.7},
        requires=["replacement_profile"],
    ),
    MechanismEntry(
        role="S_SS", situation="OUT",
        name="Box Integrity Loss",
        chain=[
            "{player} ({pos}, {status}) removes the strong-side box defender",
            "the defense either stays single-high (weaker vs the run's strong side) or rotates a LB out of the underneath",
            "opponent strong-side runs gain an extra gap; play-action off those runs gains teeth",
            "net: early-down run efficiency up for the opponent, which sets up the play-action shot later",
        ],
        effects={"strong_side_run_defense": "-", "play_action_threat": "+"},
        magnitude={"base": 0.45, "vs_gap_scheme_team": 0.65},
        requires=["opponent_run_scheme"],
    ),
    MechanismEntry(
        role="LB", situation="OUT",
        name="Underneath Exposure",
        chain=[
            "{player} ({pos}, {status}) removes the underneath coverage body and the A-gap blitz option",
            "TE/RB zones over the middle gain the vacant hook zone; the pass rush loses its complement",
            "the defense becomes four-man rush + five underneath - readable and hot-throw-able",
            "net: checkdown efficiency up for the offense, pressure rate down, but YAC windows tighten",
        ],
        effects={"te_rb_zones": "+", "blitz_package": "-", "pressure_rate": "-", "checkdown_efficiency": "+"},
        magnitude={"base": 0.45, "if_multiple_lb_out": 0.7},
        requires=["lb_depth"],
    ),
    MechanismEntry(
        role="CB_CORPS", situation="MULTI_BANGED",
        name="Coverage Body Shortage",
        chain=[
            "{detail}: multiple corners on-report limits the sub-package rotation",
            "the defense cannot match 11-personnel with fresh legs - nickel reps go to a safety or a rookie",
            "offenses accelerate tempo to exploit conditioning: more plays, more 11-personnel, faster snaps",
            "net: late-half coverage grades decay; the fourth-quarter passing game gains a step",
        ],
        effects={"sub_package_quality": "-", "q4_coverage": "-", "tempo_leverage": "+"},
        magnitude={"base": 0.45, "if_three_or_more": 0.7},
        requires=["offense_tempo"],
    ),

    # ---------------- SITUATIONAL / TEAM ----------------
    MechanismEntry(
        role="TEAM", situation="SHORT_WEEK_ROAD",
        name="Install Compression",
        chain=[
            "{team} plays a road game on a short week",
            "the install shrinks to two days: fewer packaged plays, fewer third-down answers",
            "the defense loses disguise reps more than the offense loses route concepts (defense is reaction-based)",
            "net: road team's third-down defense decays first; early-hole scoring for the home team rises",
        ],
        effects={"third_down_defense": "-", "home_team_early_scoring": "+", "install_depth": "-"},
        magnitude={"base": 0.4, "if_division_opponent": 0.3, "if_west_coast_travel": 0.6},
        requires=["schedule"],
    ),
    MechanismEntry(
        role="TEAM", situation="AFTER_UPSET_WIN",
        name="Emotional Flat Spot",
        chain=[
            "{team} comes off an upset win over a premium opponent",
            "practice intensity and detail work measurably dip - the market calls it a letdown, the mechanism is preparation quality",
            "the next opponent has had a normal week AND extra film on what just worked",
            "net: the upset winner's signature play (the thing that beat the premium team) gets taken away",
        ],
        effects={"signature_play_availability": "-", "preparation_quality": "-"},
        magnitude={"base": 0.35, "if_following_home_dog_spot": 0.5},
        requires=["previous_result"],
    ),
    MechanismEntry(
        role="QB", situation="COLD_WEATHER_FIRST_TIME",
        name="Ball-Handing Friction",
        chain=[
            "{player} faces sub-freezing/wind conditions for the first time this season (or as a starter)",
            "grip and footwork friction shows in accuracy on outs, comebacks, and deep balls into the wind",
            "the offense's downfield tag rate drops; underneath volume rises",
            "net: completion percentage dips 3-6 points in the worst bucket; total trends under in wind > 15mph",
        ],
        effects={"deep_ball_accuracy": "-", "underneath_volume": "+", "total_environment": "-"},
        magnitude={"base": 0.4, "if_wind_over_15mph": 0.65, "if_dome_team_visiting": 0.7},
        requires=["weather", "qb_history"],
    ),
    MechanismEntry(
        role="TEAM", situation="RUSHING_DOWN_SPECIFIC",
        name="Successful-Aggression Loop",
        chain=[
            "{team} faces an offense that wins with early-down efficiency (not explosives)",
            "staying in manageable down-and-distance is the whole game: prevent the 2nd-and-9s",
            "soft-zone shells trade explosives for stipulated gains - exactly the wrong concession here",
            "net: the efficient offense's drive-continuation rate rises; its ceiling stays capped; totals tick over",
        ],
        effects={"drive_continuation_opponent": "+", "explosives_allowed": "0/-", "total_direction": "+"},
        magnitude={"base": 0.4, "if_opponent_top10_success_rate": 0.6},
        requires=["opponent_efficiency_profile"],
    ),
    MechanismEntry(
        role="TEAM", situation="PREVENT_MODE_TENDENCY",
        name="Late-Lead Prevent Cost",
        chain=[
            "{team} has a documented tendency: leads of 10+ flip to soft shells in the fourth quarter",
            "garbage-time conversion windows open for the trailing offense",
            "totals and trailing-team prop ceilings rise in a state the market prices at full strength",
            "net: in-game state projection must condition the fourth quarter separately from the first three",
        ],
        effects={"q4_trailing_offense": "+", "garbage_time_scoring": "+"},
        magnitude={"base": 0.35, "if_double_digit_favorite": 0.5},
        requires=["coaching_tendency", "game_state_projection"],
    ),
    MechanismEntry(
        role="KICKER", situation="WIND_GAME",
        name="Field Flattening",
        chain=[
            "{detail}: wind exceeds the kicker's comfortable window",
            "long field goals convert at materially lower rates, and punts gain value",
            "both offenses play shorter fields - drive-start quality becomes the scoring engine",
            "net: total trends under unless both offenses are explosive; field-position battle decides the margin",
        ],
        effects={"long_fg_rate": "-", "punt_value": "+", "total_direction": "-"},
        magnitude={"base": 0.4, "if_gusts_over_30mph": 0.65},
        requires=["weather", "kicker_profile"],
    ),
    MechanismEntry(
        role="QB", situation="MOBILE_VS_MAN",
        name="Scramble Drill Leverage",
        chain=[
            "{player} is a plus rusher facing man-coverage-heavy defenses",
            "man beats itself when the play extends: every rusher locked on a receiver is a free lane",
            "the defense answers with zone - which concedes the quick-game rhythm the QB also wants",
            "net: either answer costs the defense something; the QB's floor rises in a way box scores understate",
        ],
        effects={"scramble_rate": "+", "defense_zone_rate": "+", "qb_floor": "+"},
        magnitude={"base": 0.45, "vs_man_match_dc": 0.65, "vs_zone_dc": 0.3},
        requires=["opponent_coverage_profile"],
    ),
    MechanismEntry(
        role="WR", situation="ROOKIE_CB_MATCHUP",
        name="Technique Mismatch (Rookie Film)",
        chain=[
            "{player} (plus separator) draws a rookie CB with limited film",
            "rookie corners sit on the receiver's most recent film - the vet's second-best move is the one that wins",
            "expect early-game separation on the move the rookie has not seen; adjustments come at half",
            "net: first-half target quality spike for the vet; second-half normalizes unless the rookie adjusts",
        ],
        effects={"first_half_separation": "+", "second_half_normalization": "+/-"},
        magnitude={"base": 0.4, "if_rookie_slot_corner": 0.55},
        requires=["cb_film_history"],
    ),
]


def select(role: str, situation: str) -> list[MechanismEntry]:
    """All catalog entries matching (role, situation); role may be a prefix."""
    out = []
    for e in CATALOG:
        if e.role == role and e.situation == situation:
            out.append(e)
    if out:
        return out
    return [e for e in CATALOG if e.role == role]


def render_for(player: str, pos: str, status: str, team: str, ctx: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    """Map an injury row to its mechanism entries and render them.

    Role inference: position abbreviation -> catalog role. Status QUESTIONABLE
    routes to the QUESTIONABLE variant when one exists, else OUT variants are
    returned with a conditional note in the context.
    """
    ctx = dict(ctx or {})
    ctx.setdefault("player", player)
    ctx.setdefault("pos", pos)
    ctx.setdefault("status", status)
    ctx.setdefault("team", team)

    role_map = {
        "DE": "EDGE1", "EDGE": "EDGE1", "OLB": "EDGE1" if status else "EDGE1",
        "DT": "DT1", "NT": "NT",
        "C": "C", "G": "OG", "OG": "OG", "OT": "OT1",
        "WR": "WR1", "TE": "TE1", "RB": "RB1", "QB": "QB1",
        "CB": "CB1", "S": "S_FS", "FS": "S_FS", "SS": "S_SS", "SAF": "S_FS",
        "LB": "LB", "ILB": "LB", "MLB": "LB",
    }
    role = role_map.get((pos or "").upper())
    if not role:
        return []
    status_u = (status or "").upper()
    situation = "OUT" if status_u in ("OUT", "INJURED RESERVE", "IR", "DOUBTFUL") else (
        "QUESTIONABLE" if "QUESTIONABLE" in status_u else "ON_REPORT_ACTIVE"
    )
    entries = select(role, situation)
    if not entries and situation == "ON_REPORT_ACTIVE":
        # healthy-but-listed: no mechanism fires
        return []
    # DT out also gets the declaration-leak variant when context supports it
    if role == "DT1" and situation == "OUT":
        entries = list({e.name: e for e in entries}.values())
    return [e.render(ctx) for e in entries]
