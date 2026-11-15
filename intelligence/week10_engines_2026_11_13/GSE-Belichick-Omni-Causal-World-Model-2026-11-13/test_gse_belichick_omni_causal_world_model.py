"""
Comprehensive unittest & pytest-compatible verification suite for
`gse_belichick_omni_causal_world_model.py` and `gse_belichick_omni_causal_world_model.ts`.

Covers all mandatory architectural, mathematical, causal, spectral, game-theoretic,
and SiriusXM Channel 87 Bayesian audio veracity invariants across Subsystems 1-3,
plus self-contained cross-language numerical parity with the TypeScript module.
"""

from __future__ import annotations

import dataclasses
import inspect
import json
import math
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
import numpy as np

THIS_DIR = Path(__file__).resolve().parent
if str(THIS_DIR) not in sys.path:
    sys.path.insert(0, str(THIS_DIR))

import gse_belichick_omni_causal_world_model as gse  # noqa: E402


def _find_matching_delim(s: str, start: int, open_ch: str, close_ch: str) -> int:
    depth = 0
    in_str: str | None = None
    i = start
    while i < len(s):
        ch = s[i]
        if in_str:
            if ch == "\\":
                i += 2
                continue
            if ch == in_str:
                in_str = None
        else:
            if ch in ("'", '"', "`"):
                in_str = ch
            elif ch == open_ch:
                depth += 1
            elif ch == close_ch:
                depth -= 1
                if depth == 0:
                    return i
        i += 1
    raise ValueError(f"Unmatched {open_ch} at {start}")


def _transpile_ts_to_mjs(src: str) -> str:
    """Self-contained balanced-delimiter TypeScript -> ESM stripper for live Node parity."""
    while True:
        m = re.search(r"\bexport\s+interface\s+\w+\s*\{", src)
        if not m:
            break
        b_open = src.index("{", m.start())
        b_close = _find_matching_delim(src, b_open, "{", "}")
        src = src[: m.start()] + src[b_close + 1 :]

    src = re.sub(r"\bexport\s+type\s+\w+\s*=[^;]+;", "", src)
    src = re.sub(r"^\s*(?:private|public)\s+(?:readonly\s+)?\w+\s*:\s*[^;=]+;\s*$", "", src, flags=re.MULTILINE)
    src = re.sub(r"^\s*(?:public|private)\s+", "  ", src, flags=re.MULTILINE)
    src = re.sub(r"\s+as\s+const\b", "", src)
    src = re.sub(r"\bnew\s+(Array|Set|Map)\s*<[^>()]+>\s*\(", r"new \1(", src)
    src = re.sub(r"(function\s+\w+)\s*<[^>{}()]+>\s*\(", r"\1(", src)

    header_pat = re.compile(r"((?:export\s+)?function\s+\w+|constructor|solveMatchup)\s*\(")
    pos = 0
    chunks: list[str] = []
    while True:
        m = header_pat.search(src, pos)
        if not m:
            chunks.append(src[pos:])
            break
        chunks.append(src[pos : m.start()])
        prefix = m.group(1)
        p_open = m.end() - 1
        p_close = _find_matching_delim(src, p_open, "(", ")")
        raw_params = src[p_open + 1 : p_close]

        parts: list[str] = []
        dp = da = db = dk = 0
        cur: list[str] = []
        for ch in raw_params:
            if ch == "(":
                dp += 1
            elif ch == ")":
                dp -= 1
            elif ch == "{":
                db += 1
            elif ch == "}":
                db -= 1
            elif ch == "[":
                dk += 1
            elif ch == "]":
                dk -= 1
            elif ch == "<":
                da += 1
            elif ch == ">" and da > 0:
                da -= 1
            if ch == "," and dp == 0 and db == 0 and dk == 0 and da == 0:
                parts.append("".join(cur))
                cur = []
            else:
                cur.append(ch)
        if cur:
            parts.append("".join(cur))

        clean_p: list[str] = []
        for p in parts:
            p = p.strip()
            if not p:
                continue
            eq_idx = -1
            dp = db = dk = da = 0
            for idx, ch in enumerate(p):
                if ch == "(":
                    dp += 1
                elif ch == ")":
                    dp -= 1
                elif ch == "{":
                    db += 1
                elif ch == "}":
                    db -= 1
                elif ch == "[":
                    dk += 1
                elif ch == "]":
                    dk -= 1
                elif ch == "<":
                    da += 1
                elif ch == ">" and da > 0:
                    da -= 1
                elif ch == "=" and dp == 0 and db == 0 and dk == 0 and da == 0:
                    if idx + 1 < len(p) and p[idx + 1] == ">":
                        continue
                    eq_idx = idx
                    break
            default_suffix = ""
            lhs = p
            if eq_idx != -1:
                lhs = p[:eq_idx].strip()
                default_suffix = " = " + p[eq_idx + 1 :].strip()
            colon_idx = lhs.find(":")
            if colon_idx != -1:
                lhs = lhs[:colon_idx].strip()
            lhs = lhs.rstrip("?")
            clean_p.append(lhs + default_suffix)

        k = p_close + 1
        while k < len(src) and src[k].isspace():
            k += 1
        if k < len(src) and src[k] == ":":
            k += 1
            while k < len(src) and src[k].isspace():
                k += 1
            if k < len(src) and src[k] == "{":
                k = _find_matching_delim(src, k, "{", "}") + 1
                while k < len(src) and src[k] != "{":
                    k += 1
            else:
                while k < len(src) and src[k] != "{":
                    k += 1
        chunks.append(f"{prefix}({', '.join(clean_p)}) ")
        pos = k

    res = "".join(chunks)
    res = re.sub(r"\b(const|let)\s+(\w+)\s*:\s*[^=;\n]+(?=\s*=)", r"\1 \2", res)
    res = re.sub(r"\((\w+)\s*:\s*[^()=]+\)\s*=>", r"(\1) =>", res)
    return res


def _make_ne_chi_context(**overrides: object) -> gse.SituationalContextInput288:
    """Canonical 2026-10-22 NE @ CHI (401873010) telemetry fixture from Belichick Master Report."""
    base = dict(
        game_id="2026-10-22-NE-CHI-401873010",
        league=gse.LeagueTag.NFL,
        valid_time_unix=1792709100.0,
        tx_time_unix=1792709120.0,
        decision_time_unix=1792710000.0,
        kickoff_time_unix=1792714500.0,
        temperature_f=59.5,
        wind_speed_mph=5.1,
        precipitation_rate_mm_hr=0.0,
        altitude_ft=594.0,
        surface_traction_coeff=0.88,
        is_dome=False,
        days_rest_home=4,
        days_rest_away=4,
        timezone_shift_hours=1.0,
        home_interior_ol_out_count=0,
        away_interior_ol_out_count=2,
        home_ilb1_out=True,
        home_ilb2_out=True,
        away_ilb1_out=False,
        away_ilb2_out=False,
        home_projected_sack_rate=0.032,
        away_projected_sack_rate=0.068,
        home_cb1_out=False,
        away_cb1_out=True,
        home_nickel_cb_active=True,
        away_nickel_cb_active=True,
        home_two_high_shell_rate=0.58,
        away_two_high_shell_rate=0.56,
        total_steam_move_pts=3.5,
        spread_line_abs=3.0,
        offensive_pace_sec=25.8,
        combined_proe=0.045,
        coach_aggressiveness_delta=0.14,
        officiating_penalty_rate=13.33,
        home_qb_ypa=8.1,
        away_qb_ypa=7.9,
        home_acwr=1.18,
        away_acwr=1.22,
        crowd_decibels=98.5,
        home_rookie_route_ramp_inflection=True,
        away_rookie_route_ramp_inflection=True,
        qb_rush_prop_hook_in_danger_zone=True,
    )
    base.update(overrides)
    return gse.SituationalContextInput288(**base)


def _make_sample_habit_priors() -> tuple[dict[str, float], dict[str, float]]:
    oc_prior = {
        gse.OffensiveConcept.UNDER_CENTER_PA_SHOT.value: 0.24,
        gse.OffensiveConcept.QUICK_GAME_SIGHT_ADJUST.value: 0.22,
        gse.OffensiveConcept.SPREAD_INTERMEDIATE_DAGGER.value: 0.20,
        gse.OffensiveConcept.CONDENSED_OUTSIDE_ZONE_RUN.value: 0.24,
        gse.OffensiveConcept.SCREEN_DELAY_DRAW.value: 0.10,
    }
    dc_prior = {
        gse.DefensiveCall.BASE_SINGLE_HIGH_COVER_1_3.value: 0.48,
        gse.DefensiveCall.NICKEL_SPLIT_SAFETY_QUARTERS.value: 0.18,
        gse.DefensiveCall.SIMULATED_PRESSURE_CREEPER.value: 0.12,
        gse.DefensiveCall.ZERO_ALL_OUT_BLITZ.value: 0.12,
        gse.DefensiveCall.BELICHICK_OPTION1_BRACKET.value: 0.10,
    }
    return oc_prior, dc_prior


class TestBelichickRecursiveCoordinatorMind(unittest.TestCase):
    """Subsystem 1: Recursive Level-k Coordinator Mind, William James regression & Clock/4th-Down."""

    def setUp(self) -> None:
        self.mind = gse.BelichickCoordinatorMind(tau_cognitive_hierarchy=1.5, base_quantal_precision=7.0)
        self.oc_prior, self.dc_prior = _make_sample_habit_priors()
        self.script_profile = gse.CoordinatorScriptProfile(
            coordinator_id="OC_BEN_JOHNSON_ARCHETYPE",
            scripted_epa_per_play=0.24,
            unscripted_epa_per_play=0.06,
            scripted_plays_sample=120,
            unscripted_plays_sample=480,
            halftime_rescript_epa_boost=0.07,
            tree_prior_cliff_delta=-0.11,
            rolling_3wk_top_tendency_rate=0.64,
            is_post_bye_or_divisional=False,
        )
        self.calm_state = gse.CoordinatorGameState(
            play_number_in_game=8,
            quarter=1,
            Quarter_play_index=8,
            seconds_remaining_half=1420.0,
            seconds_remaining_game=3220.0,
            score_diff_offense=0,
            down=1,
            yards_to_go=10,
            yardline_100=65,
            offense_timeouts=3,
            defense_timeouts=3,
            offense_receives_q3_kickoff=True,
            prob_quick_pressure_sub2s=0.08,
            acoustic_crowd_spl_db=84.0,
            play_clock_remaining_sec=18.0,
            motion_rate=0.82,
            tight_split_rate=0.76,
            coach_aggression_index=0.72,
            coach_animus_score=0.80,
        )

    def test_level_k_hierarchy_shifts_play_action_vs_nickel_split_safety_counter(self) -> None:
        eq_l1_vs_l0 = self.mind.solve_matchup(
            oc_level_k=1,
            dc_level_k=0,
            oc_habit_prior=self.oc_prior,
            dc_habit_prior=self.dc_prior,
            oc_script_profile=self.script_profile,
            state=self.calm_state,
        )
        pa_l1 = eq_l1_vs_l0.oc_policy[gse.OffensiveConcept.UNDER_CENTER_PA_SHOT.value]
        self.assertGreater(pa_l1, self.oc_prior[gse.OffensiveConcept.UNDER_CENTER_PA_SHOT.value])

        eq_l1_vs_l2 = self.mind.solve_matchup(
            oc_level_k=1,
            dc_level_k=2,
            oc_habit_prior=self.oc_prior,
            dc_habit_prior=self.dc_prior,
            oc_script_profile=self.script_profile,
            state=self.calm_state,
        )
        single_high_l0 = self.dc_prior[gse.DefensiveCall.BASE_SINGLE_HIGH_COVER_1_3.value]
        single_high_l2 = eq_l1_vs_l2.dc_policy[gse.DefensiveCall.BASE_SINGLE_HIGH_COVER_1_3.value]
        self.assertLess(single_high_l2, single_high_l0)
        self.assertLess(eq_l1_vs_l2.equilibrium_expected_epa, eq_l1_vs_l0.equilibrium_expected_epa)

        eq_l2_vs_l2 = self.mind.solve_matchup(
            oc_level_k=2,
            dc_level_k=2,
            oc_habit_prior=self.oc_prior,
            dc_habit_prior=self.dc_prior,
            oc_script_profile=self.script_profile,
            state=self.calm_state,
        )
        self.assertLess(
            eq_l2_vs_l2.oc_policy[gse.OffensiveConcept.UNDER_CENTER_PA_SHOT.value],
            pa_l1,
        )

    def test_tendency_breaker_post_bye_self_scouting_trigger(self) -> None:
        predictable_profile = dataclasses.replace(
            self.script_profile,
            rolling_3wk_top_tendency_rate=0.83,
            is_post_bye_or_divisional=True,
        )
        heavy_run_oc = {
            gse.OffensiveConcept.UNDER_CENTER_PA_SHOT.value: 0.12,
            gse.OffensiveConcept.QUICK_GAME_SIGHT_ADJUST.value: 0.10,
            gse.OffensiveConcept.SPREAD_INTERMEDIATE_DAGGER.value: 0.10,
            gse.OffensiveConcept.CONDENSED_OUTSIDE_ZONE_RUN.value: 0.58,
            gse.OffensiveConcept.SCREEN_DELAY_DRAW.value: 0.10,
        }
        eq = self.mind.solve_matchup(
            oc_level_k=2,
            dc_level_k=1,
            oc_habit_prior=heavy_run_oc,
            dc_habit_prior=self.dc_prior,
            oc_script_profile=predictable_profile,
            state=self.calm_state,
        )
        self.assertTrue(eq.tendency_breaker_active)

    def test_william_james_attentional_habit_regression_under_extreme_stress(self) -> None:
        panic_state = dataclasses.replace(
            self.calm_state,
            quarter=4,
            seconds_remaining_game=95.0,
            score_diff_offense=-4,
            offense_timeouts=0,
            prob_quick_pressure_sub2s=0.44,
            acoustic_crowd_spl_db=112.0,
            play_clock_remaining_sec=2.0,
        )
        eq_calm = self.mind.solve_matchup(
            oc_level_k=2,
            dc_level_k=2,
            oc_habit_prior=self.oc_prior,
            dc_habit_prior=self.dc_prior,
            oc_script_profile=self.script_profile,
            state=self.calm_state,
        )
        eq_panic = self.mind.solve_matchup(
            oc_level_k=2,
            dc_level_k=2,
            oc_habit_prior=self.oc_prior,
            dc_habit_prior=self.dc_prior,
            oc_script_profile=self.script_profile,
            state=panic_state,
        )
        self.assertGreater(eq_panic.james_habit_regression_weight_oc, 0.70)
        self.assertLess(eq_panic.james_habit_regression_weight_oc, 1.0)
        self.assertLess(eq_panic.effective_oc_precision, eq_calm.effective_oc_precision)

        dist_calm = sum(abs(eq_calm.oc_policy[k] - self.oc_prior[k]) for k in self.oc_prior)
        dist_panic = sum(abs(eq_panic.oc_policy[k] - self.oc_prior[k]) for k in self.oc_prior)
        self.assertLess(dist_panic, dist_calm)

    def test_coordinator_script_cliff_delta_and_halftime_rescript(self) -> None:
        raw_cliff, shrunk_cliff = gse.compute_coordinator_script_cliff_delta(self.script_profile)
        self.assertAlmostEqual(raw_cliff, -0.18, places=6)
        self.assertLess(shrunk_cliff, -0.12)
        self.assertGreater(shrunk_cliff, -0.18)

        eq_p8 = self.mind.solve_matchup(
            oc_level_k=2, dc_level_k=1, oc_habit_prior=self.oc_prior, dc_habit_prior=self.dc_prior,
            oc_script_profile=self.script_profile, state=self.calm_state,
        )
        eq_p28 = self.mind.solve_matchup(
            oc_level_k=2, dc_level_k=1, oc_habit_prior=self.oc_prior, dc_habit_prior=self.dc_prior,
            oc_script_profile=self.script_profile,
            state=dataclasses.replace(self.calm_state, play_number_in_game=28, quarter=2, Quarter_play_index=14),
        )
        eq_q3_open = self.mind.solve_matchup(
            oc_level_k=2, dc_level_k=1, oc_habit_prior=self.oc_prior, dc_habit_prior=self.dc_prior,
            oc_script_profile=self.script_profile,
            state=dataclasses.replace(self.calm_state, play_number_in_game=34, quarter=3, Quarter_play_index=3),
        )
        self.assertEqual(eq_p8.active_script_adjustment_epa, 0.0)
        self.assertAlmostEqual(eq_p28.active_script_adjustment_epa, shrunk_cliff, places=5)
        self.assertGreater(eq_q3_open.active_script_adjustment_epa, eq_p28.active_script_adjustment_epa)

        with self.assertRaises(gse.DataGapError):
            gse.compute_coordinator_script_cliff_delta(
                dataclasses.replace(self.script_profile, scripted_plays_sample=12)
            )

    def test_two_minute_warning_kneeldown_and_fourth_down_causal_wpa(self) -> None:
        q2_state = dataclasses.replace(
            self.calm_state, quarter=2, seconds_remaining_half=112.0, seconds_remaining_game=1912.0
        )
        lev_q2 = gse.evaluate_rulebook_clock_leverage(q2_state)
        self.assertTrue(lev_q2.two_minute_warning_active)
        self.assertTrue(lev_q2.double_dip_bridge_active)

        q4_kneel = dataclasses.replace(
            self.calm_state,
            quarter=4,
            down=1,
            score_diff_offense=6,
            defense_timeouts=0,
            seconds_remaining_half=75.0,
            seconds_remaining_game=75.0,
        )
        lev_kneel = gse.evaluate_rulebook_clock_leverage(q4_kneel)
        self.assertTrue(lev_kneel.victory_kneeldown_deterministic)
        self.assertLess(lev_kneel.expected_kneeldown_qb_rush_delta_yds, -3.5)

        q4_scramble_burn = dataclasses.replace(q4_kneel, defense_timeouts=1, seconds_remaining_game=90.0)
        lev_burn = gse.evaluate_rulebook_clock_leverage(q4_scramble_burn)
        self.assertFalse(lev_burn.victory_kneeldown_deterministic)
        self.assertTrue(lev_burn.intentional_scramble_burn_recommended)

        fd_res = gse.evaluate_fourth_down_causal_wpa(
            gse.FourthDownContext(
                conversion_prob=0.61,
                wp_if_convert=0.64,
                wp_if_fail=0.33,
                wp_if_punt=0.41,
                wp_if_field_goal=0.56,
                fg_make_prob=0.48,
                coach_aggression_index=0.85,
                coach_animus_score=0.80,
            )
        )
        self.assertEqual(fd_res.optimal_action, "GO")
        self.assertAlmostEqual(fd_res.delta_wp_go_vs_alt, 0.0787, places=4)
        self.assertGreater(fd_res.realized_coach_go_prob, 0.85)
        self.assertLessEqual(fd_res.expected_coaching_wp_bleed, 0.0)

    def test_defensive_quick_pressure_answered_by_quick_game_sight_adjust(self) -> None:
        high_press_state = dataclasses.replace(
            self.calm_state, prob_quick_pressure_sub2s=0.38, play_clock_remaining_sec=16.0
        )
        zero_blitz_dc = {
            gse.DefensiveCall.BASE_SINGLE_HIGH_COVER_1_3.value: 0.10,
            gse.DefensiveCall.NICKEL_SPLIT_SAFETY_QUARTERS.value: 0.10,
            gse.DefensiveCall.SIMULATED_PRESSURE_CREEPER.value: 0.25,
            gse.DefensiveCall.ZERO_ALL_OUT_BLITZ.value: 0.45,
            gse.DefensiveCall.BELICHICK_OPTION1_BRACKET.value: 0.10,
        }
        eq = self.mind.solve_matchup(
            oc_level_k=1,
            dc_level_k=0,
            oc_habit_prior=self.oc_prior,
            dc_habit_prior=zero_blitz_dc,
            oc_script_profile=self.script_profile,
            state=high_press_state,
        )
        p_quick_game = eq.oc_policy[gse.OffensiveConcept.QUICK_GAME_SIGHT_ADJUST.value]
        p_dagger = eq.oc_policy[gse.OffensiveConcept.SPREAD_INTERMEDIATE_DAGGER.value]
        self.assertGreater(p_quick_game, p_dagger * 2.5)
        self.assertGreater(eq.qptsr_checkdown_boost, 0.08)

    def test_class_a_firewall_blocks_sportsbook_contamination(self) -> None:
        with self.assertRaises(gse.ClassAFirewallViolationError):
            self.mind.solve_matchup(
                oc_level_k=1,
                dc_level_k=1,
                oc_habit_prior=self.oc_prior,
                dc_habit_prior=self.dc_prior,
                oc_script_profile=self.script_profile,
                state=self.calm_state,
                class_a_envelope_guard={"spread_line": -3.0, "americanOdds": -110},
            )


class TestFourStageNeuroSymbolicCausalRouter(unittest.TestCase):
    """Subsystem 2: Stage A (288-bit + DataGapError), Stage B (ID/HCID/E-value),
    Stage C (Marchenko-Pastur + FWL), and Stage D (Jacobian + JS+ + Murphy Brier).
    """

    def test_zero_hardcoded_fallbacks_ast_audit_and_strict_data_gap_refusal(self) -> None:
        src = inspect.getsource(gse)
        self.assertTrue(gse.assert_zero_hardcoded_fallbacks(src))

        for bad_snippet in (
            "def f(p=0.58): return p",
            "def f(epa=-0.26): return epa",
            "def f(x=None): return x or 0.5238",
        ):
            with self.assertRaises(AssertionError):
                gse.assert_zero_hardcoded_fallbacks(bad_snippet)

        with self.assertRaises(gse.DataGapError):
            gse.build_contextual_bitmask_288(_make_ne_chi_context(wind_speed_mph=float("nan")))

        with self.assertRaises(gse.DataGapError):
            gse.build_contextual_bitmask_288(_make_ne_chi_context(temperature_f=None))  # type: ignore[arg-type]

        with self.assertRaises(gse.DataGapError):
            gse.build_contextual_bitmask_288(_make_ne_chi_context(tx_time_unix=1792712000.0))

    def test_stage_a_288_bit_ne_chi_encoding_xor_delta_and_premise_pruning(self) -> None:
        ctx = _make_ne_chi_context()
        rec = gse.build_contextual_bitmask_288(ctx)
        self.assertEqual(len(rec.words), 9)
        expected_bits = {
            2, 4, 16, 22, 57, 72, 73, 76, 100, 106, 112, 116, 122,
            140, 152, 160, 166, 178, 184, 188, 216, 220, 224, 225, 226, 228, 230, 234, 256,
        }
        self.assertTrue(expected_bits.issubset(set(rec.active_bit_indices)))
        self.assertTrue(all(rec.second_order_flags.values()))

        ctx2 = _make_ne_chi_context(away_cb1_out=False)
        rec2 = gse.build_contextual_bitmask_288(ctx2)
        _, changed_words, popcount = gse.compute_bitmask_xor_delta(rec.words, rec2.words)
        self.assertIn(3, changed_words)
        self.assertIn(7, changed_words)
        self.assertGreaterEqual(popcount, 3)

        p_steam_fade = gse.SignalPremise50k(
            premise_id="P-STEAM-FADE-140",
            domain_tier="5_CALIBRATION_COPULA",
            req_mask_int288=(1 << 140),
            forbid_mask_int288=(1 << 224),
            sample_count=120,
            record_class="CITABLE_VERIFIED",
            verbatim_quote="Steam fades fail under mutual spine voids.",
            char_span_start=10,
            char_span_end=52,
            raw_delta_log_odds=-0.18,
            kalman_weight=1.0,
            target_node="GAME_TOTAL",
            parent_nodes=(),
            high_freq_spectral_vec=(0.4, -0.3, 0.2),
        )
        p_valid_seam = gse.SignalPremise50k(
            premise_id="P-SEAM-FUNNEL-226",
            domain_tier="2_SCHEME_GAME_THEORY",
            req_mask_int288=(1 << 226),
            forbid_mask_int288=0,
            sample_count=24,
            record_class="CITABLE_VERIFIED",
            verbatim_quote="Dual ILB absence with active Nickel CB funnels targets to TE1/TE2/RB.",
            char_span_start=100,
            char_span_end=169,
            raw_delta_log_odds=0.21,
            kalman_weight=1.25,
            target_node="TE_RB_SEAM_SHARE",
            parent_nodes=("ILB_SPINE",),
            high_freq_spectral_vec=(0.7, 0.5, 0.1),
        )
        p_uncited = dataclasses.replace(p_valid_seam, premise_id="P-UNCITED", record_class="HONESTLY_UNCITED_PRIOR")
        survivors = gse.filter_stage_a_premises(rec, [p_steam_fade, p_valid_seam, p_uncited])
        self.assertEqual([s.premise_id for s in survivors], ["P-SEAM-FUNNEL-226"])

    def test_stage_b_shpitser_pearl_backdoor_frontdoor_napkin_ratio_and_hcid_evalue(self) -> None:
        bow_g = gse.CausalADMG(nodes=("X", "Y"), directed=(("X", "Y"),), bidirected=(("X", "Y"),))
        res_bow = gse.run_shpitser_pearl_id({"Y"}, {"X"}, bow_g)
        self.assertFalse(res_bow.identifiable)
        self.assertEqual(res_bow.formula_class, "FAIL_HEDGE")
        self.assertEqual(res_bow.enabling_edges, (("X", "Y"),))

        fd_g = gse.expand_edge_with_hcid_mediator(bow_g, ("X", "Y"), "M")
        res_fd = gse.run_shpitser_pearl_id({"Y"}, {"X"}, fd_g)
        self.assertTrue(res_fd.identifiable)
        self.assertEqual(res_fd.formula_class, "FRONT_DOOR_OR_C_COMPONENT_FACTORIZATION")

        rng = np.random.default_rng(20261113)
        n = 8000
        u_conf = rng.binomial(1, 0.5, size=n)
        z_obs = rng.binomial(1, 0.5, size=n)
        p_x = 0.20 + 0.60 * u_conf
        x_fd = rng.binomial(1, p_x)
        p_m = 0.25 + 0.50 * x_fd
        m_fd = rng.binomial(1, p_m)
        y_fd = 1.0 + 4.0 * m_fd + 3.0 * u_conf + rng.normal(0.0, 0.25, size=n)
        naive_diff = float(np.mean(y_fd[x_fd == 1]) - np.mean(y_fd[x_fd == 0]))
        fd_ate = gse.estimate_frontdoor_ate(x_fd, m_fd, y_fd)
        self.assertGreater(abs(naive_diff - 2.0), 1.4)
        self.assertAlmostEqual(fd_ate, 2.0, delta=0.10)

        x_bd = rng.binomial(1, 0.2 + 0.6 * z_obs)
        y_bd = 1.5 * x_bd + 2.5 * z_obs + rng.normal(0.0, 0.25, size=n)
        bd_ate = gse.estimate_backdoor_ate(x_bd, y_bd, z_obs)
        self.assertAlmostEqual(bd_ate, 1.5, delta=0.06)

        napkin_g = gse.CausalADMG(
            nodes=("W", "Z", "X", "Y"),
            directed=(("W", "Z"), ("Z", "X"), ("X", "Y")),
            bidirected=(("W", "X"), ("W", "Y")),
        )
        res_napkin = gse.run_shpitser_pearl_id({"Y"}, {"X"}, napkin_g)
        self.assertTrue(res_napkin.identifiable)
        self.assertEqual(res_napkin.formula_class, "TIAN_C_FACTOR_RATIO")
        assert res_napkin.formula is not None
        self.assertEqual(res_napkin.formula.kind, "RATIO")

        fragile_t = rng.normal(0.05, 1.0, size=60)
        fragile_c = rng.normal(0.00, 1.0, size=60)
        e_fragile = gse.compute_vanderweele_e_value(fragile_t, fragile_c)
        self.assertFalse(e_fragile.passed)
        self.assertEqual(e_fragile.refusal_code, "REFUSED_G4_FRAGILE_E_VALUE")

        robust_t = rng.normal(0.85, 0.8, size=80)
        robust_c = rng.normal(0.00, 0.8, size=80)
        e_robust = gse.compute_vanderweele_e_value(robust_t, robust_c)
        self.assertTrue(e_robust.passed)
        self.assertGreaterEqual(e_robust.e_value_point, 1.35)
        self.assertGreaterEqual(e_robust.e_value_ci_low, 1.10)

    def test_stage_c_marchenko_pastur_cleaning_and_fwl_market_orthogonalization(self) -> None:
        rng = np.random.default_rng(42)
        n_games, p_signals = 240, 36
        latent_factor = rng.normal(0.0, 1.0, size=(n_games, 1))
        loadings = np.zeros((1, p_signals))
        loadings[0, :18] = 0.78
        sig_mat = latent_factor @ loadings + rng.normal(0.0, 1.0, size=(n_games, p_signals))

        mp = gse.marchenko_pastur_clean_correlation(sig_mat)
        self.assertEqual(mp.cleaned_correlation.shape, (p_signals, p_signals))
        self.assertGreaterEqual(mp.detached_spike_count, 1)
        self.assertGreater(mp.raw_eigenvalues[0], mp.tracy_widom_edge)
        self.assertGreater(mp.top_participation_ratio, 0.25)
        np.testing.assert_allclose(np.diag(mp.cleaned_correlation), np.ones(p_signals), atol=1e-10)
        self.assertGreater(float(np.min(np.linalg.eigvalsh(mp.cleaned_correlation))), 0.0)

        m_anchor = rng.normal(0.0, 3.5, size=(n_games, 2))
        true_tau = np.array([2.25, -1.40])
        x_signals = 0.85 * m_anchor + rng.normal(0.0, 1.0, size=(n_games, 2))
        y_outcome = 3.0 + m_anchor @ np.array([1.0, -0.5]) + x_signals @ true_tau + rng.normal(0.0, 0.2, size=n_games)

        fwl = gse.frisch_waugh_lovell_orthogonalize(x_signals, m_anchor, y_outcome)
        self.assertLess(fwl.max_anchor_orthogonality_error, 1e-11)
        self.assertLess(fwl.max_ols_equivalence_error, 1e-11)
        np.testing.assert_allclose(fwl.tau_hat, true_tau, atol=0.05)

    def test_stage_d_jacobian_coupling_positive_part_james_stein_clamp_and_murphy_brier(self) -> None:
        noisy_small = [0.02, -0.01, 0.015, -0.012, 0.008]
        shrunk_zero, factor_zero = gse.positive_part_james_stein(noisy_small, covariance_matrix=0.01 * np.eye(5))
        self.assertEqual(factor_zero, 0.0)
        np.testing.assert_allclose(shrunk_zero, np.zeros(5), atol=1e-12)

        p_cb1 = gse.SignalPremise50k(
            premise_id="P-SEA-DEN-004", domain_tier="1_KINEMATICS", req_mask_int288=0, forbid_mask_int288=0,
            sample_count=80, record_class="CITABLE_VERIFIED", verbatim_quote="CB1 out boosts WR",
            char_span_start=0, char_span_end=17, raw_delta_log_odds=0.28, kalman_weight=1.5,
            target_node="WR1_DEEP_EPA", parent_nodes=("COVERAGE_SHELL",), high_freq_spectral_vec=(1.0, 0.0),
        )
        p_2high = gse.SignalPremise50k(
            premise_id="P-SEA-DEN-010", domain_tier="2_SCHEME", req_mask_int288=0, forbid_mask_int288=0,
            sample_count=90, record_class="CITABLE_VERIFIED", verbatim_quote="Two-high caps deep routes",
            char_span_start=0, char_span_end=25, raw_delta_log_odds=0.26, kalman_weight=1.5,
            target_node="COVERAGE_SHELL", parent_nodes=(), high_freq_spectral_vec=(-1.0, 0.0),
        )
        p_extra = gse.SignalPremise50k(
            premise_id="P-PACE-FAST", domain_tier="2_SCHEME", req_mask_int288=0, forbid_mask_int288=0,
            sample_count=100, record_class="CITABLE_VERIFIED", verbatim_quote="Fast pace boosts volume",
            char_span_start=0, char_span_end=23, raw_delta_log_odds=0.25, kalman_weight=1.8,
            target_node="PLAY_VOLUME", parent_nodes=(), high_freq_spectral_vec=(0.0, 1.0),
        )
        stage_d = gse.couple_cross_equation_jacobian_and_shrink(
            [p_cb1, p_2high, p_extra], 0.005 * np.eye(3)
        )
        self.assertLess(stage_d["coupled_premise_deltas"][0], 1.5 * 0.28)
        self.assertTrue(stage_d["was_clamped"])
        self.assertAlmostEqual(stage_d["clamped_log_odds_delta"], 0.35, places=6)

        probs = [0.12, 0.18, 0.33, 0.37, 0.52, 0.58, 0.74, 0.79, 0.88, 0.91]
        outcomes = [0, 0, 0, 1, 0, 1, 1, 1, 1, 1]
        mb = gse.murphy_brier_decomposition(probs, outcomes, n_bins=5)
        self.assertLess(mb.partition_identity_error, 1e-14)
        self.assertGreater(mb.resolution, mb.reliability)


class TestSiriusXMAudioClaimVeracityUpdater(unittest.TestCase):
    """Subsystem 3: SiriusXM Channel 87 (`workers/airwave-listener`) Bayesian Veracity Updater."""

    def setUp(self) -> None:
        self.priors = {
            "HC_SHANAHAN_ARCHETYPE": gse.CoachBetaBinomialPrior(
                speaker_id="HC_SHANAHAN_ARCHETYPE",
                injury_alpha=10.0,
                injury_beta=14.0,
                scheme_alpha=22.0,
                scheme_beta=4.0,
            ),
            "SXM87_RATCLIFFE_INSIDER": gse.CoachBetaBinomialPrior(
                speaker_id="SXM87_RATCLIFFE_INSIDER",
                injury_alpha=38.0,
                injury_beta=6.0,
                scheme_alpha=34.0,
                scheme_beta=7.0,
            ),
            "BEAT_CHRONICLE_REPORTER": gse.CoachBetaBinomialPrior(
                speaker_id="BEAT_CHRONICLE_REPORTER",
                injury_alpha=29.0,
                injury_beta=4.0,
                scheme_alpha=20.0,
                scheme_beta=5.0,
            ),
        }
        self.updater = gse.SiriusXMAudioVeracityUpdater(self.priors)

    def test_distinguishes_coachspeak_smokescreen_from_genuine_scheme_reveal(self) -> None:
        utt_smokescreen = gse.DeepgramNova2Utterance(
            utterance_id="utt-golden-001",
            channel_id=87,
            show_or_source="SiriusXM Ch 87 - Presser Cut-In",
            speaker_id="HC_SHANAHAN_ARCHETYPE",
            speaker_role="HEAD_COACH",
            subject_player_id="GB-WR-GOLDEN",
            transcript_text="We are working through it with Matthew, we are hopeful and taking it day-to-day.",
            deepgram_model="nova-2-general",
            word_confidence_mean=0.96,
            valid_time_unix=1793200000.0,
            tx_time_unix=1793200005.0,
        )
        res_smoke = self.updater.evaluate_utterances(
            subject_player_id="GB-WR-GOLDEN",
            prior_availability_prob=0.50,
            utterances=[utt_smokescreen],
            decision_time_unix=1793200100.0,
        )
        self.assertEqual(res_smoke.governance_action, "COACHSPEAK_MUTED")
        self.assertEqual(res_smoke.applied_log_odds_delta, 0.0)
        self.assertAlmostEqual(res_smoke.posterior_prob, 0.50, places=6)

        utt_scheme = gse.DeepgramNova2Utterance(
            utterance_id="utt-zabel-002",
            channel_id=87,
            show_or_source="SiriusXM Ch 87 - Jeff Ratcliffe Show",
            speaker_id="HC_SHANAHAN_ARCHETYPE",
            speaker_role="HEAD_COACH",
            subject_player_id="SEA-OL-ZABEL",
            transcript_text="Moving Gray Zabel to his natural position at right guard in a three-down role with 30+ touches for our run game.",
            deepgram_model="nova-2-sports",
            word_confidence_mean=0.97,
            valid_time_unix=1793200010.0,
            tx_time_unix=1793200015.0,
        )
        res_scheme = self.updater.evaluate_utterances(
            subject_player_id="SEA-OL-ZABEL",
            prior_availability_prob=0.60,
            utterances=[utt_scheme],
            decision_time_unix=1793200100.0,
        )
        self.assertEqual(res_scheme.governance_action, "UPDATED_ACTIVE")
        self.assertGreater(res_scheme.applied_log_odds_delta, 0.15)
        self.assertGreater(res_scheme.posterior_prob, 0.65)

    def test_jaylen_noel_surgery_downgrade_and_epistemic_conflict_detection(self) -> None:
        utt_noel = gse.DeepgramNova2Utterance(
            utterance_id="utt-noel-ir-003",
            channel_id=87,
            show_or_source="SiriusXM Ch 87 - Jeff Ratcliffe Show",
            speaker_id="BEAT_CHRONICLE_REPORTER",
            speaker_role="BEAT_REPORTER",
            subject_player_id="HOU-WR-NOEL",
            transcript_text="Jaylen Noel moved to short-term IR and is expected to have surgery and miss the rest of the season.",
            deepgram_model="nova-2-general",
            word_confidence_mean=0.95,
            valid_time_unix=1793200020.0,
            tx_time_unix=1793200025.0,
        )
        res_noel = self.updater.evaluate_utterances(
            subject_player_id="HOU-WR-NOEL",
            prior_availability_prob=0.45,
            utterances=[utt_noel],
            decision_time_unix=1793200100.0,
        )
        self.assertLess(res_noel.posterior_prob, 0.40)
        self.assertLess(res_noel.applied_log_odds_delta, -0.25)

        utt_pos = gse.DeepgramNova2Utterance(
            utterance_id="utt-conflict-pos",
            channel_id=87,
            show_or_source="SiriusXM Ch 87",
            speaker_id="SXM87_RATCLIFFE_INSIDER",
            speaker_role="RADIO_ANALYST",
            subject_player_id="PHI-QB-HURTS",
            transcript_text="Practicing in full and 100% good to go as every-week starter.",
            deepgram_model="nova-2-general",
            word_confidence_mean=0.96,
            valid_time_unix=1793200030.0,
            tx_time_unix=1793200035.0,
        )
        utt_neg = gse.DeepgramNova2Utterance(
            utterance_id="utt-conflict-neg",
            channel_id=87,
            show_or_source="SiriusXM Ch 87",
            speaker_id="BEAT_CHRONICLE_REPORTER",
            speaker_role="BEAT_REPORTER",
            subject_player_id="PHI-QB-HURTS",
            transcript_text="Placed on injured reserve and ruled out to miss the rest of the season.",
            deepgram_model="nova-2-general",
            word_confidence_mean=0.96,
            valid_time_unix=1793200040.0,
            tx_time_unix=1793200045.0,
        )
        res_conflict = self.updater.evaluate_utterances(
            subject_player_id="PHI-QB-HURTS",
            prior_availability_prob=0.55,
            utterances=[utt_pos, utt_neg],
            decision_time_unix=1793200100.0,
        )
        self.assertTrue(res_conflict.conflict_on_record)
        self.assertEqual(res_conflict.governance_action, "HOLD_SURVEILLANCE_CONFLICT")
        self.assertEqual(res_conflict.applied_log_odds_delta, 0.0)

    def test_beta_binomial_learning_and_cma_podium_deception_mute(self) -> None:
        ledger = gse.CoachBetaBinomialPrior("HC_TEST", 5.0, 5.0, 5.0, 5.0)
        m0, _ = ledger.posterior_veracity(gse.AudioClaimCategory.INJURY_AVAILABILITY)
        self.assertAlmostEqual(m0, 0.50)
        ledger.record_settled_claim(gse.AudioClaimCategory.INJURY_AVAILABILITY, realized_truthful=False)
        m1, _ = ledger.posterior_veracity(gse.AudioClaimCategory.INJURY_AVAILABILITY)
        self.assertLess(m1, m0)

        utt_cma = gse.DeepgramNova2Utterance(
            utterance_id="utt-cma-rodgers-metcalf",
            channel_id=87,
            show_or_source="Postgame Podium",
            speaker_id="SXM87_RATCLIFFE_INSIDER",
            speaker_role="HEAD_COACH",
            subject_player_id="PIT-WR-METCALF",
            transcript_text="Practiced in full and 100% good to go.",
            deepgram_model="nova-2-general",
            word_confidence_mean=0.95,
            valid_time_unix=1793200010.0,
            tx_time_unix=1793200012.0,
            sideline_podium_cma_deception_score=0.74,
        )
        res_cma = self.updater.evaluate_utterances(
            subject_player_id="PIT-WR-METCALF",
            prior_availability_prob=0.55,
            utterances=[utt_cma],
            decision_time_unix=1793200100.0,
        )
        self.assertEqual(res_cma.governance_action, "COACHSPEAK_MUTED")
        self.assertEqual(res_cma.applied_log_odds_delta, 0.0)

    def test_audio_refuses_low_confidence_or_unregistered_speaker(self) -> None:
        utt_low_conf = gse.DeepgramNova2Utterance(
            utterance_id="utt-noisy",
            channel_id=87,
            show_or_source="SiriusXM Ch 87",
            speaker_id="SXM87_RATCLIFFE_INSIDER",
            speaker_role="RADIO_ANALYST",
            subject_player_id="CHI-QB-WILLIAMS",
            transcript_text="Good to go.",
            deepgram_model="nova-2-general",
            word_confidence_mean=0.45,
            valid_time_unix=1793200010.0,
            tx_time_unix=1793200012.0,
        )
        with self.assertRaises(gse.DataGapError):
            self.updater.evaluate_utterances(
                subject_player_id="CHI-QB-WILLIAMS",
                prior_availability_prob=0.60,
                utterances=[utt_low_conf],
                decision_time_unix=1793200100.0,
            )


class TestEndToEndAndCrossLanguageTypeScriptParity(unittest.TestCase):
    """End-to-end 2026-10-22 NE@CHI orchestration + Python <-> TypeScript numerical parity."""

    def test_end_to_end_ne_chi_execution_receipt(self) -> None:
        rng = np.random.default_rng(77)
        ctx = _make_ne_chi_context()
        mind = gse.BelichickCoordinatorMind()
        oc_prior, dc_prior = _make_sample_habit_priors()
        profile = gse.CoordinatorScriptProfile(
            coordinator_id="OC_CHI",
            scripted_epa_per_play=0.22,
            unscripted_epa_per_play=0.09,
            scripted_plays_sample=105,
            unscripted_plays_sample=410,
            halftime_rescript_epa_boost=0.05,
            tree_prior_cliff_delta=-0.10,
            rolling_3wk_top_tendency_rate=0.68,
            is_post_bye_or_divisional=False,
        )
        state = gse.CoordinatorGameState(
            play_number_in_game=6,
            quarter=1,
            Quarter_play_index=6,
            seconds_remaining_half=1500.0,
            seconds_remaining_game=3300.0,
            score_diff_offense=0,
            down=1,
            yards_to_go=10,
            yardline_100=70,
            offense_timeouts=3,
            defense_timeouts=3,
            offense_receives_q3_kickoff=True,
            prob_quick_pressure_sub2s=0.11,
            acoustic_crowd_spl_db=94.0,
            play_clock_remaining_sec=15.0,
            motion_rate=0.78,
            tight_split_rate=0.72,
            coach_aggression_index=0.76,
            coach_animus_score=0.30,
        )
        premises = [
            gse.SignalPremise50k(
                premise_id=f"P-CHI-{i}",
                domain_tier="2_SCHEME",
                req_mask_int288=(1 << 224),
                forbid_mask_int288=0,
                sample_count=55,
                record_class="CITABLE_VERIFIED",
                verbatim_quote="Mutual defensive spine void lifts explosive YAC.",
                char_span_start=1,
                char_span_end=49,
                raw_delta_log_odds=0.09 + 0.01 * i,
                kalman_weight=1.15,
                target_node="CHI_OFF_EPA",
                parent_nodes=("ILB_SPINE",),
                high_freq_spectral_vec=(0.6, 0.3, -0.1 * i),
            )
            for i in range(4)
        ]

        bow_g = gse.CausalADMG(
            nodes=("SPINE_VOID", "TOTAL_PTS"),
            directed=(("SPINE_VOID", "TOTAL_PTS"),),
            bidirected=(("SPINE_VOID", "TOTAL_PTS"),),
        )
        treated_res = rng.normal(0.92, 0.75, size=65)
        control_res = rng.normal(0.00, 0.75, size=65)

        n_hist, p_sig = 180, 12
        latent = rng.normal(0.0, 1.0, size=(n_hist, 1))
        sig_mat = latent @ np.full((1, p_sig), 0.7) + rng.normal(0.0, 1.0, size=(n_hist, p_sig))
        m_anch = rng.normal(50.5, 3.0, size=(n_hist, 1))
        y_hist = 0.9 * m_anch[:, 0] + 1.8 * sig_mat[:, 0] + rng.normal(0.0, 1.0, size=n_hist)

        updater = gse.SiriusXMAudioVeracityUpdater(
            {"SXM87_RATCLIFFE": gse.CoachBetaBinomialPrior("SXM87_RATCLIFFE", 36.0, 5.0, 32.0, 6.0)}
        )
        utt = gse.DeepgramNova2Utterance(
            utterance_id="utt-williams-active",
            channel_id=87,
            show_or_source="SiriusXM Ch 87",
            speaker_id="SXM87_RATCLIFFE",
            speaker_role="RADIO_ANALYST",
            subject_player_id="CHI-QB-WILLIAMS",
            transcript_text="Caleb Williams practiced in full and is 100% good to go.",
            deepgram_model="nova-2-general",
            word_confidence_mean=0.97,
            valid_time_unix=1792708000.0,
            tx_time_unix=1792708010.0,
        )

        receipt = gse.run_omni_causal_world_model(
            context_288=ctx,
            belichick_mind=mind,
            oc_level_k=2,
            dc_level_k=1,
            oc_habit_prior=oc_prior,
            dc_habit_prior=dc_prior,
            oc_script_profile=profile,
            game_state=state,
            premises_catalog=premises,
            causal_graph=bow_g,
            treatment_nodes={"SPINE_VOID"},
            outcome_nodes={"TOTAL_PTS"},
            treated_residuals=treated_res,
            control_residuals=control_res,
            historical_signal_matrix=sig_mat,
            historical_market_anchors=m_anch,
            historical_outcomes=y_hist,
            settled_probs_history=[0.2, 0.3, 0.6, 0.7, 0.8, 0.85],
            settled_outcomes_history=[0, 0, 1, 1, 1, 1],
            market_de_vig_prior_prob=0.511344,
            candidate_hcid_mediator=(("SPINE_VOID", "TOTAL_PTS"), "M_SEAM_YAC"),
            audio_updater=updater,
            audio_subject_player_id="CHI-QB-WILLIAMS",
            audio_prior_prob=0.82,
            audio_utterances=[utt],
        )

        self.assertEqual(len(receipt.receipt_sha256), 64)
        self.assertTrue(receipt.causal_id_result.identifiable)
        self.assertGreaterEqual(receipt.e_value_gate.e_value_point, 1.35)
        self.assertLessEqual(abs(receipt.total_applied_log_odds_delta), 0.35)
        self.assertGreater(receipt.final_posterior_prob, 0.511344)

    def test_python_and_typescript_exact_numerical_parity(self) -> None:
        ts_file = THIS_DIR / "gse_belichick_omni_causal_world_model.ts"
        if not ts_file.exists() or shutil.which("node") is None:
            self.skipTest("TypeScript module or node binary not present in current test directory.")

        # Compute Python reference values
        ctx_py = _make_ne_chi_context()
        mask_py = gse.build_contextual_bitmask_288(ctx_py)
        oc_p, dc_p = _make_sample_habit_priors()
        prof_py = gse.CoordinatorScriptProfile(
            coordinator_id="OC_CHI",
            scripted_epa_per_play=0.24,
            unscripted_epa_per_play=0.06,
            scripted_plays_sample=120,
            unscripted_plays_sample=480,
            halftime_rescript_epa_boost=0.07,
            tree_prior_cliff_delta=-0.11,
            rolling_3wk_top_tendency_rate=0.64,
            is_post_bye_or_divisional=False,
        )
        st_py = gse.CoordinatorGameState(
            play_number_in_game=8, quarter=1, Quarter_play_index=8,
            seconds_remaining_half=1420.0, seconds_remaining_game=3220.0,
            score_diff_offense=0, down=1, yards_to_go=10, yardline_100=65,
            offense_timeouts=3, defense_timeouts=3, offense_receives_q3_kickoff=True,
            prob_quick_pressure_sub2s=0.08, acoustic_crowd_spl_db=84.0,
            play_clock_remaining_sec=18.0, motion_rate=0.82, tight_split_rate=0.76,
            coach_aggression_index=0.72, coach_animus_score=0.80,
        )
        eq_py = gse.BelichickCoordinatorMind(1.5, 7.0).solve_matchup(
            oc_level_k=2, dc_level_k=2, oc_habit_prior=oc_p, dc_habit_prior=dc_p,
            oc_script_profile=prof_py, state=st_py,
        )
        treated = [0.85 + 0.35 * math.sin(i + 1) for i in range(40)]
        control = [0.00 + 0.35 * math.cos(i + 1) for i in range(40)]
        ev_py = gse.compute_vanderweele_e_value(treated, control)
        mb_py = gse.murphy_brier_decomposition(
            [0.12, 0.18, 0.33, 0.37, 0.52, 0.58, 0.74, 0.79, 0.88, 0.91],
            [0, 0, 0, 1, 0, 1, 1, 1, 1, 1],
            n_bins=5,
        )
        aud_py = gse.SiriusXMAudioVeracityUpdater(
            {"SXM87_RATCLIFFE": gse.CoachBetaBinomialPrior("SXM87_RATCLIFFE", 36.0, 5.0, 32.0, 6.0)}
        ).evaluate_utterances(
            subject_player_id="SEA-OL-ZABEL",
            prior_availability_prob=0.60,
            utterances=[
                gse.DeepgramNova2Utterance(
                    utterance_id="u-zabel",
                    channel_id=87,
                    show_or_source="SiriusXM Ch 87",
                    speaker_id="SXM87_RATCLIFFE",
                    speaker_role="RADIO_ANALYST",
                    subject_player_id="SEA-OL-ZABEL",
                    transcript_text="Moving Gray Zabel to his natural position at right guard in a three-down role.",
                    deepgram_model="nova-2-general",
                    word_confidence_mean=0.97,
                    valid_time_unix=1793200010.0,
                    tx_time_unix=1793200015.0,
                )
            ],
            decision_time_unix=1793200100.0,
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            mjs_path = Path(tmpdir) / "engine.mjs"
            mjs_path.write_text(_transpile_ts_to_mjs(ts_file.read_text(encoding="utf-8")), encoding="utf-8")
            probe_js = f"""
import * as m from {json.dumps(mjs_path.as_uri())};
const mask = m.buildContextualBitmask288({{
  gameId: "2026-10-22-NE-CHI-401873010", league: "NFL",
  validTimeUnix: 1792709100, txTimeUnix: 1792709120, decisionTimeUnix: 1792710000, kickoffTimeUnix: 1792714500,
  temperatureF: 59.5, windSpeedMph: 5.1, precipitationRateMmHr: 0, altitudeFt: 594, surfaceTractionCoeff: 0.88,
  isDome: false, daysRestHome: 4, daysRestAway: 4, timezoneShiftHours: 1.0,
  homeInteriorOlOutCount: 0, awayInteriorOlOutCount: 2,
  homeIlb1Out: true, homeIlb2Out: true, awayIlb1Out: false, awayIlb2Out: false,
  homeProjectedSackRate: 0.032, awayProjectedSackRate: 0.068,
  homeCb1Out: false, awayCb1Out: true, homeNickelCbActive: true, awayNickelCbActive: true,
  homeTwoHighShellRate: 0.58, awayTwoHighShellRate: 0.56,
  totalSteamMovePts: 3.5, spreadLineAbs: 3.0, offensivePaceSec: 25.8, combinedProe: 0.045,
  coachAggressivenessDelta: 0.14, officiatingPenaltyRate: 13.33, homeQbYpa: 8.1, awayQbYpa: 7.9,
  homeAcwr: 1.18, awayAcwr: 1.22, crowdDecibels: 98.5,
  homeRookieRouteRampInflection: true, awayRookieRouteRampInflection: true, qbRushPropHookInDangerZone: true
}});
const eq = new m.BelichickCoordinatorMind(1.5, 7.0).solveMatchup({{
  ocLevelK: 2, dcLevelK: 2,
  ocHabitPrior: {json.dumps(oc_p)},
  dcHabitPrior: {json.dumps(dc_p)},
  ocScriptProfile: {{
    coordinatorId: "OC_CHI", scriptedEpaPerPlay: 0.24, unscriptedEpaPerPlay: 0.06,
    scriptedPlaysSample: 120, unscriptedPlaysSample: 480, halftimeRescriptEpaBoost: 0.07,
    treePriorCliffDelta: -0.11, rolling3WkTopTendencyRate: 0.64, isPostByeOrDivisional: false
  }},
  state: {{
    playNumberInGame: 8, quarter: 1, quarterPlayIndex: 8,
    secondsRemainingHalf: 1420, secondsRemainingGame: 3220, scoreDiffOffense: 0,
    down: 1, yardsToGo: 10, yardline100: 65, offenseTimeouts: 3, defenseTimeouts: 3,
    offenseReceivesQ3Kickoff: true, probQuickPressureSub2s: 0.08, acousticCrowdSplDb: 84,
    playClockRemainingSec: 18, motionRate: 0.82, tightSplitRate: 0.76,
    coachAggressionIndex: 0.72, coachAnimusScore: 0.80
  }}
}});
const ev = m.computeVanderWeeleEValue({json.dumps(treated)}, {json.dumps(control)});
const mb = m.murphyBrierDecomposition([0.12, 0.18, 0.33, 0.37, 0.52, 0.58, 0.74, 0.79, 0.88, 0.91], [0, 0, 0, 1, 0, 1, 1, 1, 1, 1], 5);
const aud = m.evaluateSiriusXMAudioClaims({{
  subjectPlayerId: "SEA-OL-ZABEL", priorAvailabilityProb: 0.60, decisionTimeUnix: 1793200100,
  speakerPriors: {{ SXM87_RATCLIFFE: {{ speakerId: "SXM87_RATCLIFFE", injuryAlpha: 36, injuryBeta: 5, schemeAlpha: 32, schemeBeta: 6 }} }},
  utterances: [{{
    utteranceId: "u-zabel", channelId: 87, showOrSource: "SiriusXM Ch 87",
    speakerId: "SXM87_RATCLIFFE", speakerRole: "RADIO_ANALYST", subjectPlayerId: "SEA-OL-ZABEL",
    transcriptText: "Moving Gray Zabel to his natural position at right guard in a three-down role.",
    deepgramModel: "nova-2-general", wordConfidenceMean: 0.97, validTimeUnix: 1793200010, txTimeUnix: 1793200015
  }}]
}});
console.log(JSON.stringify({{ sha: mask.sha256Digest, hex: mask.hexString, eq, ev, mb, aud }}));
"""
            proc = subprocess.run(
                ["node", "--input-type=module", "-e", probe_js],
                check=True,
                capture_output=True,
                text=True,
            )
            ts_out = json.loads(proc.stdout.strip())

        self.assertEqual(ts_out["sha"], mask_py.sha256_digest)
        self.assertEqual(ts_out["hex"], mask_py.hex_string)
        self.assertAlmostEqual(ts_out["eq"]["equilibriumExpectedEpa"], eq_py.equilibrium_expected_epa, places=6)
        self.assertAlmostEqual(ts_out["eq"]["coordinatorScriptCliffDelta"], eq_py.coordinator_script_cliff_delta, places=6)
        self.assertAlmostEqual(ts_out["ev"]["eValuePoint"], ev_py.e_value_point, places=6)
        self.assertAlmostEqual(ts_out["mb"]["reliability"], mb_py.reliability, places=9)
        self.assertAlmostEqual(ts_out["mb"]["resolution"], mb_py.resolution, places=9)
        self.assertAlmostEqual(ts_out["aud"]["posteriorProb"], aud_py.posterior_prob, places=6)


if __name__ == "__main__":
    unittest.main(verbosity=2)
