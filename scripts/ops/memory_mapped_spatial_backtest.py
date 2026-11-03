"""In-Memory Spatial Telemetry Slice Backtester (`scripts/ops/memory_mapped_spatial_backtest.py`).

Uses contiguous `np.float64` numeric arrays, O(N) sorted boundary slicing via `np.unique(..., return_index=True)`
and `np.split` (eliminating `dtype=object` boxing and O(N*P) full-array boolean scans), and player-specific
mass `m_i = weight_lbs_i * 0.45359237` (eliminating hardcoded 115.0 kg mass).
"""
from __future__ import annotations

from typing import Any, Dict, Mapping, Sequence

import numpy as np

LBS_TO_KG = 0.45359237


def evaluate_in_memory_telemetry_rows(
    raw_rows: Sequence[Sequence[Any]],
    default_mass_kg: float = 104.33,
    player_weights_lbs: Mapping[Any, float] | None = None,
) -> Dict[str, Any]:
    """Process `(game_id, play_id, frame_id, assigned_node_idx, x, y, vx, vy[, weight_lbs])` rows in O(N) time."""
    if not raw_rows:
        return {"play_blocks": 0, "processed_nodes": 0, "total_kinetic_energy_joules": 0.0, "array_dtype": "float64"}

    n_rows = len(raw_rows)
    numeric_mat = np.empty((n_rows, 8), dtype=np.float64)
    for idx, r in enumerate(raw_rows):
        play_id = float(r[1])
        frame_id = float(r[2])
        node_idx = float(r[3])
        x = float(r[4])
        y = float(r[5])
        vx = float(r[6])
        vy = float(r[7])
        if len(r) >= 9 and r[8] is not None:
            mass_kg = float(r[8]) * LBS_TO_KG
        elif player_weights_lbs and r[3] in player_weights_lbs:
            mass_kg = float(player_weights_lbs[r[3]]) * LBS_TO_KG
        else:
            mass_kg = float(default_mass_kg)
        numeric_mat[idx] = (play_id, frame_id, node_idx, x, y, vx, vy, mass_kg)

    # Sort by play_id if not already sorted, then slice contiguously in O(N) via np.unique + np.split
    order = np.argsort(numeric_mat[:, 0], kind="mergesort")
    sorted_mat = numeric_mat[order]
    unique_plays, split_indices = np.unique(sorted_mat[:, 0], return_index=True)
    play_slices = np.split(sorted_mat, split_indices[1:])

    processed_count = 0
    total_ke = 0.0
    for play_frames in play_slices:
        vx = play_frames[:, 5]
        vy = play_frames[:, 6]
        mass_kg_vec = play_frames[:, 7]
        ke_field = 0.5 * mass_kg_vec * (vx ** 2 + vy ** 2)
        total_ke += float(np.sum(ke_field))
        processed_count += int(play_frames.shape[0])

    return {
        "play_blocks": int(len(unique_plays)),
        "processed_nodes": processed_count,
        "total_kinetic_energy_joules": round(total_ke, 2),
        "array_dtype": str(sorted_mat.dtype),
    }


def execute_high_speed_memory_mapped_backtest(
    db_credentials: Mapping[str, Any],
    targeted_week: int = 8,
) -> Dict[str, Any]:
    import psycopg2

    conn = psycopg2.connect(**db_credentials)
    try:
        cur = conn.cursor()
        cur.execute("SET statement_timeout = 60000;")
        cur.execute("SET work_mem = '256MB';")
        query = """
            SELECT game_id, play_id, frame_id, assigned_node_idx, x, y, vx, vy, COALESCE(weight_lbs, 230.0)
            FROM telemetry_live_memory_cache_buffer
            WHERE game_id IN (SELECT game_id FROM game_context WHERE week = %s)
            ORDER BY game_id, play_id, frame_id, assigned_node_idx;
        """
        cur.execute(query, (targeted_week,))
        raw_rows = cur.fetchall()
        cur.close()
    finally:
        conn.close()
    return evaluate_in_memory_telemetry_rows(raw_rows)
