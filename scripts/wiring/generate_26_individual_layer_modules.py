#!/usr/bin/env python3
"""
Generates the 26 individual layer modules under intelligence/reasoning/layers/
and intelligence/reasoning/layers/manifest.json ({layer_id, inputs[], outputs[],
source_datasets[], freshness_rule, consumer}) per Wave 7 specification.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from intelligence.reasoning.layers.layer_registry import ALL_26_LAYERS_META

LAYERS_DIR = REPO_ROOT / "intelligence" / "reasoning" / "layers"

CANONICAL_STAGE_SLUGS = {
    1: "freshness_reality",
    2: "totals_baselines",
    3: "venue_physical_environment",
    4: "schedule_situations",
    5: "health_replacement",
    6: "roster_usage",
    7: "player_traits_form",
    8: "player_vs_player",
    9: "unit_vs_unit",
    10: "scheme",
    11: "coach_mind",
    12: "coach_vs_coach",
    13: "coach_vs_player",
    14: "player_vs_scheme",
    15: "scheme_vs_scheme",
    16: "scheme_vs_team",
    17: "pace_tempo",
    18: "game_script_state",
    19: "micro_in_game",
    20: "outside_game_human_signals",
    21: "history",
    22: "officials",
    23: "market",
    24: "gsi_cross_domain_methods",
    25: "missingness_contradiction",
    26: "adversary_and_synthesis",
}


def main() -> None:
    LAYERS_DIR.mkdir(parents=True, exist_ok=True)
    manifest_rows: List[Dict[str, Any]] = []

    for meta in ALL_26_LAYERS_META:
        num = int(meta["num"])
        l_id = str(meta["id"])
        title = str(meta["title"])
        fam = str(meta["family"])
        stage_slug = CANONICAL_STAGE_SLUGS[num]

        mod_code = f'''#!/usr/bin/env python3
"""
Layer {num:02d}: {l_id} ({stage_slug})
Title: {title}
Equation Family: {fam}
"""
from __future__ import annotations

from typing import Any, Dict, Optional
from intelligence.identity.entity_resolver import CanonicalEntityResolver
from intelligence.reasoning.layers.layer_registry import ALL_26_LAYERS_META, execute_single_layer

LAYER_NUMBER = {num}
LAYER_ID = "{l_id}"
CANONICAL_STAGE_SLUG = "{stage_slug}"
EQUATION_FAMILY = "{fam}"


def run_layer(
    game_ctx: Dict[str, Any],
    resolver: Optional[CanonicalEntityResolver] = None,
    prior_layers: Optional[Dict[str, Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    meta = next(m for m in ALL_26_LAYERS_META if m["num"] == LAYER_NUMBER)
    ent_resolver = resolver or CanonicalEntityResolver()
    return execute_single_layer(meta, game_ctx, ent_resolver, prior_layers or {{}})
'''
        mod_path = LAYERS_DIR / f"{l_id}.py"
        mod_path.write_text(mod_code, encoding="utf-8")

        manifest_rows.append(
            {
                "layer_number": num,
                "layer_id": l_id,
                "canonical_stage_slug": stage_slug,
                "title": title,
                "module_path": f"intelligence/reasoning/layers/{l_id}.py",
                "inputs": ["game_ctx", "canonical_entities.jsonl", f"equation_execution_registry:layer_{num:02d}"],
                "outputs": ["signals", "confidence", "provenance", "warnings"],
                "source_datasets": [
                    "intelligence/data/warehouse/normalized/ds_nflverse_pbp.parquet",
                    "intelligence/data/warehouse/normalized/ds_nflverse_schedules.parquet",
                    "intelligence/data/warehouse/normalized/ds_nflverse_injuries.parquet",
                ],
                "freshness_rule": "strict_as_of_lt_kickoff_utc",
                "consumer": "intelligence/reasoning/reasoning_workflow_assembler.py",
            }
        )

    manifest_path = LAYERS_DIR / "manifest.json"
    manifest_path.write_text(
        json.dumps(
            {
                "schema_version": "1.0.0",
                "total_layers": len(manifest_rows),
                "layers": manifest_rows,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(json.dumps({"layers_generated": len(manifest_rows), "manifest": str(manifest_path.relative_to(REPO_ROOT))}))


if __name__ == "__main__":
    main()
