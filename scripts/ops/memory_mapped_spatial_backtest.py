"""In-Memory Spatial Telemetry Slice Backtester (`scripts/ops/memory_mapped_spatial_backtest.py`)."""
from __future__ import annotations

from typing import Any, Dict, Mapping, Sequence

import numpy as np


def evaluate_in_memory_telemetry_rows(raw_rows: Sequence[Sequence[Any]], default_mass_kg: float = 115.0) -> Dict[str, Any]:
    """Process `(game_id, play_id, frame_id, assigned_node_idx, x, y, vx, vy)` rows in memory."""
    if not raw_rows:
        return {"play_blocks": 0, "processed_nodes": 0, "total_kinetic_energy_joules": 0.0}

    np_telemetry = np.asarray(raw_rows, dtype=object)
    unique_play_blocks = np.unique(np_telemetry[:, 1])
    processed_count = 0
    total_ke = 0.0

    for play in unique_play_blocks:
        play_mask = np_telemetry[:, 1] == play
        play_frames = np_telemetry[play_mask]
        vx = play_frames[:, 6].astype(np.float64)
        vy = play_frames[:, 7].astype(np.float64)
        ke_field = 0.5 * float(default_mass_kg) * (vx ** 2 + vy ** 2)
        total_ke += float(np.sum(ke_field))
        processed_count += int(len(play_frames))

    return {
        "play_blocks": int(len(unique_play_blocks)),
        "processed_nodes": processed_count,
        "total_kinetic_energy_joules": round(total_ke, 2),
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
        cur.execute("SET work_mem = '2GB';")
        query = """
            SELECT game_id, play_id, frame_id, assigned_node_idx, x, y, vx, vy
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
