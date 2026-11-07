"""
context_packet_builder.py — Wave 7 (W7-02) 26-Layer Context Packet Builder
==========================================================================
Builds `data/context_packets/<game_id>.json`, validates against
`schemas/v1/context_packet.schema.json`, enforces the pre-game temporal leakage
guard (`as_of_utc < kickoff_utc`), and emits the two canonical fixture packets:
  - `data/context_packets/2026_W09_JAX_BAL.json`
  - `data/context_packets/2026_W09_TB_KC_HIST_FIXTURE.json`
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from intelligence.reasoning.layers import run_all_26_layers
from intelligence.reasoning.schema_validator import validate_context_packet

REPO_ROOT = Path(__file__).resolve().parents[2]
CONTEXT_PACKETS_DIR = REPO_ROOT / "data" / "context_packets"


DEFAULT_FIXTURE_INPUTS: dict[str, dict[str, Any]] = {
    "2026_W09_JAX_BAL": {
        "game_id": "2026_W09_JAX_BAL",
        "season": 2026,
        "week": 9,
        "home_team": "BAL",
        "away_team": "JAX",
        "kickoff_utc": "2026-11-01T17:00:00Z",
        "as_of_utc": "2026-11-01T14:00:00Z",
        "entity_resolution_verified": True,
        "resolved_entities": [
            {"canonical_id": "00-0034796", "full_name": "Lamar Jackson", "team": "BAL", "position": "QB"},
            {"canonical_id": "00-0032764", "full_name": "Derrick Henry", "team": "BAL", "position": "RB"},
            {"canonical_id": "00-0036971", "full_name": "Trevor Lawrence", "team": "JAX", "position": "QB"},
            {"canonical_id": "00-0030565", "full_name": "Geno Smith", "team": "NYJ", "position": "QB"},
            {"canonical_id": "00-0031408", "full_name": "Mike Evans", "team": "SF", "position": "WR"},
        ],
        "home_off_scheme": "HEAVY_12_13_PERSONNEL_MODERN",
        "away_def_primary_shell": "COVER_4_QUARTERS",
        "home_protection_family": "HALF_SLIDE_2_JET",
        "rushers_weak_slide_side": 4,
        "rushers_strong_man_side": 2,
        "protection_adjustment_call": "TOM",
        "primary_formation_tag": "12_SNUG",
        "primary_route_concept": "DAGGER",
        "opening_spread_home": -6.5,
        "current_spread_home": -7.5,
        "crossed_key_number_3_or_7": True,
    },
    "2026_W09_TB_KC_HIST_FIXTURE": {
        "game_id": "2026_W09_TB_KC_HIST_FIXTURE",
        "season": 2026,
        "week": 9,
        "home_team": "KC",
        "away_team": "TB",
        "kickoff_utc": "2026-11-03T01:15:00Z",
        "as_of_utc": "2026-11-02T21:00:00Z",
        "entity_resolution_verified": True,
        "resolved_entities": [
            {"canonical_id": "00-0033873", "full_name": "Patrick Mahomes", "team": "KC", "position": "QB"},
            {"canonical_id": "00-0030506", "full_name": "Travis Kelce", "team": "KC", "position": "TE"},
            {"canonical_id": "00-0034855", "full_name": "Baker Mayfield", "team": "TB", "position": "QB"},
            {"canonical_id": "00-0030565", "full_name": "Geno Smith", "team": "NYJ", "position": "QB"},
            {"canonical_id": "00-0031408", "full_name": "Mike Evans", "team": "SF", "position": "WR"},
        ],
        "home_off_scheme": "WEST_COAST",
        "away_def_primary_shell": "COVER_1_PLUG",
        "home_protection_family": "HALF_SLIDE_3_JET",
        "rushers_weak_slide_side": 2,
        "rushers_strong_man_side": 4,
        "protection_adjustment_call": "JOKER_OPPOSITE",
        "primary_formation_tag": "11_1X4_SPLIT",
        "primary_route_concept": "MILLS",
        "opening_spread_home": -8.5,
        "current_spread_home": -8.5,
        "crossed_key_number_3_or_7": False,
        "waived_layers": {
            "20": "Historical MNF fixture evaluation: live Friday podium sentiment feed waived with explicit epistemic widening."
        },
    },
}


def build_context_packet(
    game_input: dict[str, Any],
    *,
    persist: bool = True,
    output_dir: Path | None = None,
) -> dict[str, Any]:
    """Build and schema-validate a 26-layer context packet for `game_input`."""
    game_id = str(game_input["game_id"])
    layers = run_all_26_layers(game_input)

    active_count = sum(1 for lyr in layers if lyr["status"] == "ACTIVE")
    waived_count = sum(1 for lyr in layers if lyr["status"] == "WAIVED_WITH_REASON")
    missing_count = sum(1 for lyr in layers if lyr["status"] == "MISSING_UPSTREAM")
    agg_uncertainty = round(sum(float(lyr["uncertainty_width_delta"]) for lyr in layers), 6)

    canonical_seed = json.dumps(
        {
            "game_id": game_id,
            "as_of_utc": game_input["as_of_utc"],
            "layers_digest": [lyr["signals"] for lyr in layers],
        },
        sort_keys=True,
    )
    digest_12 = hashlib.sha256(canonical_seed.encode("utf-8")).hexdigest()[:12]
    packet_id = str(game_input.get("packet_id") or f"pkt_{game_id.lower()}_{digest_12}")

    packet: dict[str, Any] = {
        "packet_id": packet_id,
        "schema_version": "1.0.0",
        "game_id": game_id,
        "season": int(game_input.get("season", 2026)),
        "week": int(game_input.get("week", 9)),
        "home_team": str(game_input.get("home_team", "BAL")),
        "away_team": str(game_input.get("away_team", "JAX")),
        "kickoff_utc": str(game_input["kickoff_utc"]),
        "as_of_utc": str(game_input["as_of_utc"]),
        "entity_resolution_verified": bool(game_input.get("entity_resolution_verified", True)),
        "resolved_entities": list(game_input["resolved_entities"]),
        "layers": layers,
        "completeness_summary": {
            "total_layers": 26,
            "active_layers": active_count,
            "waived_layers": waived_count,
            "missing_upstream_layers": missing_count,
            "aggregate_uncertainty_width": agg_uncertainty,
        },
    }

    validate_context_packet(packet)

    if persist:
        target_dir = output_dir if output_dir is not None else CONTEXT_PACKETS_DIR
        target_dir.mkdir(parents=True, exist_ok=True)
        out_path = target_dir / f"{game_id}.json"
        out_path.write_text(json.dumps(packet, indent=2, sort_keys=False) + "\n", encoding="utf-8")

    return packet


def emit_canonical_fixture_packets(output_dir: Path | None = None) -> dict[str, dict[str, Any]]:
    """Generate and persist both canonical Wave 7 fixture context packets."""
    results: dict[str, dict[str, Any]] = {}
    for game_id, fixture_input in DEFAULT_FIXTURE_INPUTS.items():
        results[game_id] = build_context_packet(fixture_input, persist=True, output_dir=output_dir)
    return results


if __name__ == "__main__":
    emitted = emit_canonical_fixture_packets()
    for gid, pkt in emitted.items():
        print(f"Emitted {gid} -> packet_id={pkt['packet_id']} (layers={len(pkt['layers'])})")
