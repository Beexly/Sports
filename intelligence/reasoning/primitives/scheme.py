"""Scheme mechanism primitives - the structural tendencies an offense or a
defense carries into a game, independent of who is hurt.

A scheme primitive fires when a *tendency* crosses a threshold (personnel
group, motion rate, blitz rate, tempo), not when a person is absent. Its
causal chain explains the defender or the coverage that gets displaced.

Doctrine: this module is a library. The analyst layer SELECTS and COMPOSES
entries; it never generates mechanism prose itself. Every entry here carries
falsifiers (conditions under which the mechanism is WRONG) because a
primitive without a falsifier is a template wearing a mechanism's clothes.

Entry keys are (role, situation). `role` is the unit whose behavior changes
("OFF", "DEF", "QB", "OL", "WR", "SCHEME"); `situation` is the named trigger.
"""

from __future__ import annotations

from .positions import MechanismEntry

CATALOG: list[MechanismEntry] = [
    # ── personnel grouping ─────────────────────────────────────────────────
    MechanismEntry(
        role="OFF", situation="11_PERSONNEL_TENDENCY",
        name="Nickel Lock",
        family="scheme",
        chain=[
            "{offense} lives in 11 personnel ({rate}% of snaps) - the third receiver is a starter, not a package",
            "the defense answers in nickel or dime all game, so the base linebacker is off the field for 40+ snaps",
            "the run game now attacks a 6-man box with a light second level: gap integrity depends on safeties filling",
            "net: RB efficiency and YAC-after-contact rise against a defense whose run fits are structurally thin",
        ],
        effects={"rb_yards_per_carry": "+", "lb_run_fits": "-", "rb_yac_contact": "+"},
        magnitude={"base": 0.45, "if_11_rate_over_75": 0.6, "vs_top5_dl": 0.25},
        requires=["offense", "rate"],
        falsifiers=[
            "the defense's base personnel is itself a 4-2-5 and loses nothing by staying on the field",
            "the 11 personnel is heavy WR but the RB is a pass-pro-only back",
        ],
        composes_with=["Pivot Removal", "Interior Vacuum"],
        precedent_hook="11_personnel_rate > 75 AND opponent_base_personnel = nickel",
    ),
    MechanismEntry(
        role="OFF", situation="12_PERSONNEL_TENDENCY",
        name="Base-Defense Trap",
        family="scheme",
        chain=[
            "{offense} plays 12 personnel ({rate}% of snaps) - two tight ends force the defense out of nickel",
            "a base linebacker returns to the field, which the offense wants: he is the coverage liability",
            "play-action from 12 holds that linebacker for a count and opens the seam behind him",
            "net: TE1 and the intermediate crosser gain; the box count also improves for the run",
        ],
        effects={"te_target_share": "+", "play_action_efficiency": "+", "box_count_offense": "+"},
        magnitude={"base": 0.4, "if_te2_is_blocker_only": 0.2, "vs_sub_heavy_def": 0.55},
        requires=["offense", "rate"],
        falsifiers=[
            "the defense stays in nickel and accepts the run disadvantage",
            "both tight ends are in-line blockers with no route participation",
        ],
        composes_with=["Middle Window Closure", "Second-Level Pause"],
        precedent_hook="12_personnel_rate > 25 AND opponent_nickel_rate < 40",
    ),
    # ── pre-snap motion ────────────────────────────────────────────────────
    MechanismEntry(
        role="OFF", situation="MOTION_RATE_SPIKE",
        name="Motion Leverage",
        family="scheme",
        chain=[
            "{offense} motion rate has spiked to {rate}% against a season baseline of {baseline}%",
            "motion is being used to declare coverage, not to create space - the offense is hunting the tell",
            "the defense's man/zone answer is now visible pre-snap, so the QB's first read is decided before the snap",
            "net: early-down efficiency rises; the defense's disguise value falls toward zero",
        ],
        effects={"defensive_disguise_value": "-", "qb_first_read_quality": "+", "early_down_success": "+"},
        magnitude={"base": 0.45, "if_delta_over_15pts": 0.65},
        requires=["offense", "rate", "baseline"],
        falsifiers=[
            "the motion is window dressing (same motion every week) and the defense has already adjusted",
            "the motion rate spike is driven by one gadget package, not base offense",
        ],
        composes_with=["Pre-snap Declaration Leak", "Disguise Displacement"],
        precedent_hook="motion_rate_delta > 15 AND opponent_disguise_rate > 25",
    ),
    MechanismEntry(
        role="OFF", situation="RPO_RATE",
        name="Conflict Defender Freeze",
        family="scheme",
        chain=[
            "{offense} runs run-pass options at {rate}% - a rate the defense has not prepared for",
            "the conflict defender (usually the overhang) must choose; either choice leaves a free hitter or a free receiver",
            "the QB's read is simplified to one defender, so the offense converts without a full protection slide",
            "net: explosive rate rises on early downs and the defensive front gets fewer clean run fits",
        ],
        effects={"explosive_rate": "+", "overhang_conflict": "+", "run_fit_quality": "-"},
        magnitude={"base": 0.4, "vs_man_coverage": 0.6, "vs_2_high": 0.35},
        requires=["offense", "rate"],
        falsifiers=[
            "the defense has a dedicated scrape-exchange drill installed for this exact RPO concept",
            "the offense's RPO rate is inflated by a single game outlier",
        ],
        composes_with=["Conflict Defender Freeze", "Scramble Drill Leverage"],
        precedent_hook="rpo_rate > 20 AND opponent_scrape_exchange = false",
    ),
    # ── passing game structure ─────────────────────────────────────────────
    MechanismEntry(
        role="OFF", situation="PLAY_ACTION_RATE",
        name="Second-Level Pause",
        family="scheme",
        chain=[
            "{offense} play-action rate is {rate}% against a defense whose linebackers read run first",
            "the second level takes one false step on every snap, and one step is the whole separation window",
            "the TE and the deep crosser run into space the coverage did not expect to defend",
            "net: intermediate passing efficiency rises without any change in personnel",
        ],
        effects={"intermediate_completion_rate": "+", "separation_at_catch": "+", "lb_drop_depth": "-"},
        magnitude={"base": 0.45, "vs_aggressive_lb_corps": 0.65, "if_run_game_established": 0.6},
        requires=["offense", "rate"],
        falsifiers=[
            "the defense's linebackers are assignment-disciplined and never bite",
            "the run game is not respected, so play-action does not sell",
        ],
        composes_with=["Motion Leverage", "Underneath Exposure"],
        precedent_hook="play_action_rate > 30 AND opponent_lb_aggression = high",
    ),
    MechanismEntry(
        role="DEF", situation="BLITZ_RATE",
        name="Hot-Route Tax",
        family="scheme",
        chain=[
            "{defense} blitzes at {rate}% - above the league band",
            "every blitz leaves a hot route uncovered, and the QB has been taught exactly where",
            "the offense gets free completions at the cost of a faster internal clock",
            "net: opponent completion rate rises while sack-available time falls; the two effects net out in the box score but not in the prop market",
        ],
        effects={"qb_time_to_throw": "-", "opponent_completion_rate": "+", "pressure_rate": "+"},
        magnitude={"base": 0.45, "if_blitz_rate_over_40": 0.65, "if_qb_top10_vs_pressure": 0.25},
        requires=["defense", "rate"],
        falsifiers=[
            "the blitzes are simulated pressures with 3 rushers and 8 in coverage",
            "the opposing QB has a documented history of holding the ball past 3.0 seconds",
        ],
        composes_with=["Pressure Rate", "Disguise Displacement"],
        precedent_hook="blitz_rate > 40 AND qb_time_to_throw < 2.7",
    ),
    MechanismEntry(
        role="DEF", situation="MAN_ZONE_SHIFT",
        name="Coverage Displacement",
        family="scheme",
        chain=[
            "{defense} has shifted its man/zone ratio by {delta} points versus its season tendency",
            "the shift moves value from one receiver archetype to another - slot separators gain vs zone, X receivers lose vs man",
            "the opposing play-caller's first script was built against the old ratio",
            "net: target distribution redistributes within the first 15 scripted plays before in-game adjustment",
        ],
        effects={"slot_target_share": "+/-", "x_receiver_efficiency": "+/-", "first_15_script_value": "+/-"},
        magnitude={"base": 0.35, "if_delta_over_20pts": 0.55},
        requires=["defense", "delta"],
        falsifiers=[
            "the shift is opponent-specific game planning that reverts against this offense",
            "the man/zone ratio is computed on a small sample (under 100 coverage snaps)",
        ],
        composes_with=["Disguise Content", "Single-High Magnet"],
        precedent_hook="man_rate_delta > 20 AND receiver_archetype_mismatch = true",
    ),
    MechanismEntry(
        role="DEF", situation="DISGUISE_CONTENT",
        name="Pretend-to-Real Gap",
        family="scheme",
        chain=[
            "{defense} shows {shown} pre-snap and plays {actual} post-snap in {rate}% of snaps",
            "the offense's protection slide is set to the shown look, so the real look arrives unblocked",
            "post-snap rotations erase the QB's declared answer and force him to a second read past 2.5 seconds",
            "net: pressure and coverage generate together - the rare case where both sides of the defensive ledger win",
        ],
        effects={"qb_time_to_throw": "-", "coverage_quality": "+", "protection_error_rate": "+"},
        magnitude={"base": 0.5, "if_disguise_rate_over_35": 0.7},
        requires=["defense", "shown", "actual", "rate"],
        falsifiers=[
            "the disguise is a tendency the offense has already seen on film twice this season",
            "the offense uses pure progression reads that do not depend on the pre-snap declaration",
        ],
        composes_with=["Pre-snap Declaration Leak", "Coverage Displacement"],
        precedent_hook="disguise_rate > 35 AND opponent_protection_slide = declaration_based",
    ),
    # ── tempo ──────────────────────────────────────────────────────────────
    MechanismEntry(
        role="OFF", situation="TEMPO_SHIFT",
        name="Snap-Clock Compression",
        family="scheme",
        chain=[
            "{offense} has moved to no-huddle at {rate}% of snaps, snapping with 15+ seconds on the clock",
            "defensive substitution is blocked, so the offense dictates the matchup and the personnel the defense wanted",
            "fatigue accumulates in the front seven across a drive, and pressure rates decay in the last 4 plays",
            "net: late-drive efficiency rises; opponent defensive prop ceilings fall",
        ],
        effects={"plays_per_drive": "+", "late_drive_efficiency": "+", "opponent_pressure_rate": "-"},
        magnitude={"base": 0.45, "if_no_huddle_over_40": 0.65, "vs_thin_dl_rotation": 0.7},
        requires=["offense", "rate"],
        falsifiers=[
            "the tempo is situational (two-minute only) and does not describe base offense",
            "the defense has a matching tempo package with pre-called substitutions",
        ],
        composes_with=["Fourth-Quarter Rush Decay", "Rotation Thinning (Watch List)"],
        precedent_hook="no_huddle_rate > 40 AND opponent_dl_rotation_size < 7",
    ),
    MechanismEntry(
        role="TEAM", situation="HALFTIME_SIGNATURE",
        name="Script Inversion",
        family="scheme",
        chain=[
            "{team} has a documented second-half inversion: its first-half script is not its second-half script",
            "play-action rate, motion rate and personnel grouping all shift after the break while the opposing adjustment is still being communicated",
            "the first two second-half drives are the highest-value windows on the board and the market prices them as average football",
            "net: second-half prop and total distributions are mispriced if the pre-game script is used as the prior",
        ],
        effects={"second_half_efficiency": "+", "first_two_drives_second_half": "+", "adjustment_window_value": "+"},
        magnitude={"base": 0.4, "if_inversion_documented_3plus_games": 0.6},
        requires=["team"],
        falsifiers=[
            "the inversion is a small-sample artifact (fewer than three games)",
            "the opposing coordinator is a same-staff holdover who already knows the second-half package",
        ],
        composes_with=["Coverage Displacement", "Snap-Clock Compression"],
        precedent_hook="second_half_epa_delta > 0.15 AND coordinator_continuity = false",
    ),
    # ── coverage geometry ──────────────────────────────────────────────────
    MechanismEntry(
        role="DEF", situation="COVERAGE_SHELL_SHIFT",
        name="Shell Whiplash",
        family="scheme",
        chain=[
            "{defense} shows two-high shell pre-snap and rotates to single-high post-snap ({rate}% of snaps)",
            "the safety rotation arrives after the QB has already declared his answer to the two-high picture",
            "the middle-of-the-field window closes a beat late and the deep-over route is erased",
            "net: intermediate throws to the seams convert less often; the QB's first-read completion rate falls without any pressure",
        ],
        effects={"deep_pass_efficiency": "-", "qb_first_read_quality": "-", "safety_rotation_value": "+"},
        magnitude={"base": 0.5, "vs_11_personnel": 0.65, "if_qb_progression_reader": 0.35},
        requires=["defense", "rate"],
        falsifiers=[
            "the offense runs pure progression reads that never depend on the pre-snap shell",
            "the rotation is a static Cover-2 drop and the QB has seen it on film weekly",
        ],
        composes_with=["Pretend-to-Real Gap", "Coverage Displacement"],
        precedent_hook="fangio_2high_rate > 55 AND mcvay_11_personnel_rate > 60",
    ),
    MechanismEntry(
        role="DEF", situation="SIMULATED_PRESSURE",
        name="Four-Man Illusion",
        family="scheme",
        chain=[
            "{defense} rushes four while showing six+ at the line ({rate}% of dropbacks)",
            "the protection slide accounts for rushers who never come, so a free interior rusher arrives clean",
            "the QB's hot route is covered because eight dropped into the actual zone",
            "net: pressure rate stays low while sack-available time and interception risk both rise - the market only prices the sack column",
        ],
        effects={"protection_error_rate": "+", "interception_risk": "+", "pressure_rate": "0"},
        magnitude={"base": 0.5, "vs_inexperienced_ol": 0.7, "if_center_rookie": 0.75},
        requires=["defense", "rate"],
        falsifiers=[
            "the simulated pressures are declared pre-snap by the offense's protection check and picked up",
            "the QB has a documented quick-game answer installed against this exact front",
        ],
        composes_with=["Hot-Route Tax", "Pretend-to-Real Gap"],
        precedent_hook="bowles_spags_sim_pressure_rate > 35 AND ol_continuity < 0.7",
    ),
    # ── offensive structure ────────────────────────────────────────────────
    MechanismEntry(
        role="OFF", situation="BOOTLEG_TREE",
        name="Bootleg Inversion",
        family="scheme",
        chain=[
            "{offense} runs outside-zone bootleg off the same backfield action as its base run ({rate}% of play-action)",
            "the edge defender and the overhang both read run, so the bootleg QB arrives at the edge with a numbers advantage",
            "the deep crosser and the TE drag run behind the vacated second level",
            "net: explosive pass rate on early downs rises, and the same run action suppresses the defense's run fits on the next snap",
        ],
        effects={"explosive_rate": "+", "edge_containment": "-", "play_action_efficiency": "+"},
        magnitude={"base": 0.5, "if_run_game_top10": 0.7, "vs_wide_9_technique": 0.65},
        requires=["offense", "rate"],
        falsifiers=[
            "the bootleg is a naked keep with no crossing routes and the defense has a scrape exchange installed",
            "the QB is not a rushing threat and the edge defender can ignore him",
        ],
        composes_with=["Second-Level Pause", "Motion Leverage"],
        precedent_hook="shanahan_mcvay_bootleg_rate > 25 AND opponent_wide9_rate > 40",
    ),
    MechanismEntry(
        role="OFF", situation="QB_DESIGNED_RUN",
        name="Numbers Leverage",
        family="scheme",
        chain=[
            "{offense} gives the QB designed runs and read-option carries ({rate}% of snaps)",
            "the QB counts as an extra gap in the run scheme, so the defense must defend 11 gaps with 10 defenders",
            "the backside defender who should scrape is now the read key, and the offense takes whichever side he vacates",
            "net: rushing EPA rises without extra blockers, and light boxes become structurally unplayable",
        ],
        effects={"rush_epa": "+", "box_count_offense": "+", "defensive_scrape_integrity": "-"},
        magnitude={"base": 0.5, "if_qb_top5_rush_threat": 0.75, "vs_heavy_nickel": 0.6},
        requires=["offense", "rate"],
        falsifiers=[
            "the QB's designed runs are goal-line-only and do not describe base offense",
            "the defense plays a disciplined scrape-exchange with a designated QB hitter every snap",
        ],
        composes_with=["Conflict Defender Freeze", "Nickel Lock"],
        precedent_hook="qb_designed_run_rate > 20 AND opponent_scrape_exchange = false",
    ),
]


def select(role: str, situation: str) -> list[MechanismEntry]:
    """All scheme entries matching (role, situation); falls back to role."""
    out = [e for e in CATALOG if e.role == role and e.situation == situation]
    return out if out else [e for e in CATALOG if e.role == role]
