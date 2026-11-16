"""Typed CLI over gse_engine backed by google/python-fire (with argparse fallback)."""

from __future__ import annotations

import json
from typing import Any

from gse_engine.compute.lineup_doctor_bridge import quick_doctor_selftest
from gse_engine.memory.agentdb_store import AgentDbMemoryStore
from gse_engine.observability.arize_tracing import evaluate_walk_forward_calibration
from gse_engine.storage.trajectory_checkpoint import TrajectoryCheckpointer


def _build_commands() -> dict[str, Any]:
    """Builds the CLI command dispatch table."""

    def doctor() -> str:
        """Runs a deterministic sub-second Lineup Doctor sanity audit."""
        report = quick_doctor_selftest()
        return json.dumps(
            {
                "ok": report.ok,
                "total_salary": report.total_salary,
                "projected_points": report.projected_points,
                "issues": list(report.issues),
                "suggested_swap": report.suggested_swap,
            }
        )

    def backtest(season: int = 2026, max_ece: float = 0.035) -> str:
        """Evaluates sample walk-forward calibration against the stake-unlock threshold."""
        probs = [0.62 if i % 2 == 0 else 0.38 for i in range(60)]
        outcomes = [1 if i % 2 == 0 else 0 for i in range(60)]
        market = [0.55 if i % 2 == 0 else 0.45 for i in range(60)]
        report = evaluate_walk_forward_calibration(probs, outcomes, market, max_ece_allowed=max_ece)
        return json.dumps(
            {
                "season": season,
                "sample_size": report.sample_size,
                "ece": report.ece,
                "brier_score": report.brier_score,
                "decided_clv_beat_rate": report.decided_clv_beat_rate,
                "real_money_stake_cleared": report.real_money_stake_cleared,
                "reason": report.reason,
            }
        )

    def checkpoint_info(checkpoint_dir: str = "data/engine/checkpoints") -> str:
        """Lists SHA-256 verified trajectory checkpoints available for T-90m reloads."""
        items = TrajectoryCheckpointer(checkpoint_dir).list_checkpoints()
        return json.dumps(
            {
                "count": len(items),
                "checkpoints": [
                    {
                        "checkpoint_id": m.checkpoint_id,
                        "season": m.season,
                        "week": m.week,
                        "matchup": m.matchup,
                        "n_worlds": m.n_worlds,
                        "n_snaps": m.n_snaps,
                        "sha256": m.sha256,
                    }
                    for m in items
                ],
            }
        )

    def memory_stats(db_path: str = ":memory:") -> str:
        """Summarizes AgentDB namespace counts cleanly without mutating records."""
        store = AgentDbMemoryStore(db_path)
        try:
            counts = store.stats()
            return json.dumps({"db_path": db_path, "namespaces": counts})
        finally:
            store.close()

    return {
        "doctor": doctor,
        "backtest": backtest,
        "checkpoint-info": checkpoint_info,
        "memory-stats": memory_stats,
    }


def main() -> None:
    """Entrypoint for `uv run gse ...` and `python -m gse_engine.cli`."""
    commands = _build_commands()
    try:
        import fire  # type: ignore[import-not-found]

        fire.Fire(commands)
    except ImportError:
        import sys

        cmd = sys.argv[1] if len(sys.argv) > 1 else "doctor"
        fn = commands.get(cmd)
        if fn is None:
            raise SystemExit(f"Unknown command: {cmd}") from None
        print(fn())


if __name__ == "__main__":
    main()
