"""
Wave 7 & Wave 8 Total Wiring & Consumption Test Suite
=====================================================
Tests:
1. W7-01: All 5 JSON Schemas in schemas/v1/ + runtime validator + temporal leakage guard.
2. W7-02: All 26 executable reasoning layers + coaching manual consumption + uncertainty widening on waived feeds.
3. W7-03: Context packet builder + LAYER-MAP.md + TypeScript bridge parity.
4. W8-01: Workflow runner (OL -> scheme -> QB track order, L1-L5 trace persistence,
   26-layer sensitivity proof in SYNTHETIC_FIXTURE_ONLY simulation stage,
   and PLACEHOLDER_VALIDATION_ONLY content stage with pulled-play redaction).
5. W8-02/W8-03: Synthetic grading -> training data -> corpus feedback pipe.
"""

from __future__ import annotations

import copy
import json
import unittest
from pathlib import Path

from intelligence.feedback.grading_to_corpus_pipe import run_grading_to_corpus_feedback_pipe
from intelligence.reasoning.context_packet_builder import (
    CONTEXT_PACKETS_DIR,
    DEFAULT_FIXTURE_INPUTS,
    REPO_ROOT,
    build_context_packet,
    emit_canonical_fixture_packets,
)
from intelligence.reasoning.layers import ALL_26_LAYERS, run_all_26_layers
from intelligence.reasoning.schema_validator import (
    SchemaValidationError,
    load_schema,
    validate_content_bundle,
    validate_context_packet,
    validate_layer_output,
    validate_reasoning_trace,
    validate_simulation_distribution,
)
from intelligence.reasoning.workflow_runner import (
    OFFICIAL_LEDGER_SHA,
    TRACES_DIR,
    run_placeholder_content_stage,
    run_reasoning_workflow,
    run_synthetic_simulation_stage,
)


class TestWave7Wave8Wiring(unittest.TestCase):
    def test_w7_01_all_five_schemas_exist_and_load(self) -> None:
        schema_names = [
            "layer_output.schema.json",
            "context_packet.schema.json",
            "reasoning_trace.schema.json",
            "simulation_distribution.schema.json",
            "content_bundle.schema.json",
        ]
        for name in schema_names:
            schema = load_schema(name)
            self.assertTrue(schema["$schema"].startswith("https://json-schema.org/"))
            self.assertIn("required", schema)

    def test_w7_02_all_26_layers_execute_and_validate(self) -> None:
        self.assertEqual(len(ALL_26_LAYERS), 26)
        self.assertEqual([m.LAYER_ID for m in ALL_26_LAYERS], list(range(1, 27)))

        game_input = copy.deepcopy(DEFAULT_FIXTURE_INPUTS["2026_W09_JAX_BAL"])
        layers = run_all_26_layers(game_input)
        self.assertEqual(len(layers), 26)

        for idx, layer in enumerate(layers, start=1):
            self.assertEqual(layer["layer_id"], idx)
            validate_layer_output(layer)

        # Verify coaching manual consumption across Layers 10, 11, 14, 15, 16, 19, 23, 24
        layer_10 = layers[9]
        self.assertEqual(layer_10["layer_slug"], "layer_10_scheme")
        self.assertEqual(layer_10["signals"]["offensive_schemes_catalog_count"], 8)
        self.assertEqual(layer_10["signals"]["route_concepts_catalog_count"], 11)
        self.assertIn("One You, Two Me", layer_10["signals"]["pass_protection_slide_rule"])
        self.assertIn("Quarters", layer_10["signals"]["coverage_shell_rule"])
        self.assertGreaterEqual(layer_10["signals"]["s_words_count"], 5)
        self.assertGreaterEqual(layer_10["signals"]["t_words_count"], 5)

        layer_11 = layers[10]
        self.assertEqual(layer_11["layer_slug"], "layer_11_coach_mind")
        self.assertIn("home_proe_neutral", layer_11["signals"])
        self.assertIn("home_opening15_epa_per_play", layer_11["signals"])

        layer_14 = layers[13]
        self.assertEqual(layer_14["layer_slug"], "layer_14_player_vs_scheme")
        self.assertIn("qb_epa_split_vs_shell", layer_14["signals"])
        self.assertIn("rb_release_match_rule", layer_14["signals"])

        layer_15 = layers[14]
        self.assertEqual(layer_15["layer_slug"], "layer_15_scheme_vs_scheme")
        self.assertIn("quarters_mills_post_dig_epa_unmatched", layer_15["signals"])
        self.assertIn("cover1_plug_rat_banjo_rule", layer_15["signals"])

        layer_16 = layers[15]
        self.assertEqual(layer_16["layer_slug"], "layer_16_scheme_vs_team")
        self.assertIn("sixty_minute_execution_capacity_home", layer_16["signals"])

        layer_23 = layers[22]
        self.assertEqual(layer_23["layer_slug"], "layer_23_market")
        self.assertTrue(layer_23["signals"]["market_enters_last_verified"])
        self.assertIn("shin_devig_home_win_prob", layer_23["signals"])

        layer_24 = layers[23]
        self.assertEqual(layer_24["layer_slug"], "layer_24_gsi_cross_domain_methods")
        self.assertAlmostEqual(
            layer_24["signals"]["sinkhorn_l1_marginal_residual"], 1.387779e-16, delta=1e-22
        )
        self.assertEqual(layer_24["signals"]["gsi_cte_deceased_cohort_n"], 878)
        self.assertEqual(layer_24["signals"]["dynamic_kickoff_concussion_reduction_pct"], -43.0)

    def test_w7_02_waived_layer_widens_uncertainty(self) -> None:
        base_input = copy.deepcopy(DEFAULT_FIXTURE_INPUTS["2026_W09_JAX_BAL"])
        base_packet = build_context_packet(base_input, persist=False)

        waived_input = copy.deepcopy(DEFAULT_FIXTURE_INPUTS["2026_W09_JAX_BAL"])
        waived_input["waived_layers"] = {
            "20": "No verified Beat Writer quote shift inside 48h window"
        }
        waived_packet = build_context_packet(waived_input, persist=False)

        self.assertEqual(waived_packet["completeness_summary"]["waived_layers"], 1)
        self.assertEqual(waived_packet["completeness_summary"]["active_layers"], 25)
        self.assertGreater(
            waived_packet["completeness_summary"]["aggregate_uncertainty_width"],
            base_packet["completeness_summary"]["aggregate_uncertainty_width"],
        )

    def test_w7_01_temporal_leakage_guard_rejects_post_kickoff_packet(self) -> None:
        leaked_input = copy.deepcopy(DEFAULT_FIXTURE_INPUTS["2026_W09_JAX_BAL"])
        leaked_input["as_of_utc"] = "2026-11-01T18:30:00Z"  # after 17:00:00Z kickoff
        with self.assertRaisesRegex(
            SchemaValidationError, "Temporal leakage guard failed"
        ):
            build_context_packet(leaked_input, persist=False)

    def test_w7_03_emitted_context_packets_and_layer_map_exist(self) -> None:
        emitted = emit_canonical_fixture_packets()
        self.assertEqual(len(emitted), 2)
        for game_id, packet in emitted.items():
            path = CONTEXT_PACKETS_DIR / f"{game_id}.json"
            self.assertTrue(path.exists())
            loaded = json.loads(path.read_text(encoding="utf-8"))
            validate_context_packet(loaded)
            self.assertEqual(len(loaded["layers"]), 26)
            self.assertEqual(loaded["packet_id"], packet["packet_id"])

        layer_map = REPO_ROOT / "docs" / "wiring" / "LAYER-MAP.md"
        self.assertTrue(layer_map.exists())
        content = layer_map.read_text(encoding="utf-8")
        for layer_id in range(1, 27):
            self.assertIn(f"layer_{layer_id:02d}_", content)

        ts_bridge = REPO_ROOT / "packages" / "prediction-engine" / "src" / "layers" / "index.ts"
        self.assertTrue(ts_bridge.exists())
        ts_src = ts_bridge.read_text(encoding="utf-8")
        self.assertIn("ALL_26_LAYER_MANIFESTS", ts_src)
        self.assertIn("validateContextPacketV1", ts_src)

    def test_w8_01_workflow_runner_and_26_layer_simulation_sensitivity(self) -> None:
        packet = build_context_packet(
            copy.deepcopy(DEFAULT_FIXTURE_INPUTS["2026_W09_JAX_BAL"]),
            persist=True,
        )
        trace = run_reasoning_workflow(packet, persist=True)
        sim_base = run_synthetic_simulation_stage(packet, trace)
        bundle = run_placeholder_content_stage(packet, trace)

        validate_reasoning_trace(trace)
        validate_simulation_distribution(sim_base)
        validate_content_bundle(bundle)

        # Verify strict OL -> scheme -> QB dependency order
        self.assertTrue(trace["dependency_order_verified"])
        self.assertEqual(
            trace["levels"]["L5_synthesis"]["hierarchy_order"][:3],
            ["offensive_line", "coaching_scheme", "qb_behavior"],
        )
        self.assertEqual(len(trace["layer_citations"]), 26)
        self.assertTrue((TRACES_DIR / f"{packet['game_id']}.trace.json").exists())

        # Verify that perturbing ANY of the 26 layers changes the synthetic simulation distribution
        for layer_idx in range(26):
            perturbed_packet = copy.deepcopy(packet)
            target_layer = perturbed_packet["layers"][layer_idx]
            target_layer["signals"]["__synthetic_perturbation_probe__"] = 1.25 * (layer_idx + 1)
            perturbed_sim = run_synthetic_simulation_stage(perturbed_packet, trace)
            validate_simulation_distribution(perturbed_sim)
            self.assertEqual(perturbed_sim["mode"], "SYNTHETIC_FIXTURE_ONLY")
            self.assertNotEqual(
                perturbed_sim["layer_sensitivity_hash"], sim_base["layer_sensitivity_hash"]
            )
            self.assertTrue(
                perturbed_sim["win_prob_home"] != sim_base["win_prob_home"]
                or perturbed_sim["spread_quantiles"]["p50"] != sim_base["spread_quantiles"]["p50"],
                f"Layer {layer_idx + 1} perturbation did not affect simulation output",
            )

    def test_w8_01_placeholder_content_stage_redaction_and_entity_guard(self) -> None:
        packet = build_context_packet(
            copy.deepcopy(DEFAULT_FIXTURE_INPUTS["2026_W09_JAX_BAL"]),
            persist=False,
        )
        trace = run_reasoning_workflow(packet, persist=False)
        bundle = run_placeholder_content_stage(
            packet,
            trace,
            injected_draft_note="Draft test with pulled plays: 62-23-1 (VOIDED_NOV_5_BATCH), NYJ ML, Jets DST, Chris Godwin, Geno Smith (SEA), Mike Evans (TB).",
        )

        self.assertEqual(bundle["mode"], "PLACEHOLDER_VALIDATION_ONLY")
        self.assertTrue(bundle["redaction_guard_passed"])
        self.assertTrue(bundle["entity_resolution_passed"])
        serialized = json.dumps(bundle)
        for banned in ("62-23-1", "NYJ ML", "Jets DST", "Chris Godwin"):  # VOIDED_NOV_5_BATCH redaction check
            self.assertNotIn(banned, serialized)
        self.assertIn("Geno Smith (NYJ QB)", serialized)
        self.assertIn("Mike Evans (SF WR)", serialized)

    def test_w8_02_synthetic_grading_to_corpus_feedback_pipe(self) -> None:
        packet = build_context_packet(
            copy.deepcopy(DEFAULT_FIXTURE_INPUTS["2026_W09_JAX_BAL"]),
            persist=False,
        )
        trace = run_reasoning_workflow(packet, persist=False)
        synthetic_grade = {
            "grading_id": "grd_synth_2026_w09_jax_bal_01",
            "mode": "SYNTHETIC_GRADED_OUTCOME_ONLY",
            "game_id": packet["game_id"],
            "packet_id": packet["packet_id"],
            "trace_id": trace["trace_id"],
            "ledger_sha": OFFICIAL_LEDGER_SHA,
            "predicted_prob": 0.68,
            "realized_outcome": 1,
            "clv_bps": 42.5,
            "primary_layer_slug": "layer_10_scheme",
        }
        result = run_grading_to_corpus_feedback_pipe(synthetic_grade)
        self.assertTrue(result["pipe_verified"])
        self.assertEqual(result["training_example"]["mode"], "SYNTHETIC_GRADED_OUTCOME_ONLY")
        self.assertEqual(result["corpus_node"]["packet_id"], packet["packet_id"])
        self.assertEqual(result["corpus_node"]["trace_id"], trace["trace_id"])
        self.assertEqual(result["corpus_node"]["ledger_sha"], OFFICIAL_LEDGER_SHA)

    def test_w8_03_jarvis_openrouter_models_and_cockpit_sinkhorn_remediation(self) -> None:
        ask_jarvis_src = (
            REPO_ROOT / "apps" / "web" / "lib" / "cockpit" / "ask-jarvis.ts"
        ).read_text(encoding="utf-8")
        brain_src = (
            REPO_ROOT / "apps" / "web" / "lib" / "jarvis" / "stealth-skeleton-brain.ts"
        ).read_text(encoding="utf-8")
        models_route_src = (
            REPO_ROOT / "apps" / "web" / "app" / "api" / "openrouter" / "v1" / "models" / "route.ts"
        ).read_text(encoding="utf-8")
        worker_src = (
            REPO_ROOT / "workers" / "stealth-skeleton-provider" / "src" / "index.ts"
        ).read_text(encoding="utf-8")
        cockpit_src = (
            REPO_ROOT / "apps" / "web" / "components" / "cockpit" / "cockpit-office-3d-bot-hq.tsx"
        ).read_text(encoding="utf-8")
        benchmarks_src = (
            REPO_ROOT / "apps" / "web" / "app" / "benchmarks" / "page.tsx"
        ).read_text(encoding="utf-8")

        self.assertIn("export async function askJarvisLive", ask_jarvis_src)
        for token in (
            "fallback_fired",
            "fallback_reason",
            "fallback_timestamp_utc",
            "packet_id",
            "trace_id",
            "ledger_sha",
        ):
            self.assertIn(token, ask_jarvis_src)
            self.assertIn(token, brain_src)

        expected_9_models = [
            "gse/stealth-skeleton-alpha",
            "gse/skeleton-v1",
            "gse/skeleton-v1-fast",
            "gse/skeleton-stealth",
            "gse/skeleton-math-pro",
            "gse/skeleton-forecast",
            "gse/skeleton-council",
            "gse/skeleton-flash",
        ]
        for model_id in expected_9_models:
            self.assertIn(model_id, brain_src)
            self.assertIn(model_id, worker_src)
        self.assertIn("STEALTH_SKELETON_MODELS_V2_4", models_route_src)

        self.assertNotIn("2.66e-7", cockpit_src)
        self.assertNotIn("2.66e-7", benchmarks_src)
        self.assertIn("1.387779e-16", cockpit_src)
        self.assertIn("1.387779e-16", benchmarks_src)


if __name__ == "__main__":
    unittest.main()
