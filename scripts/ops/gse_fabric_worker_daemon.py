#!/usr/bin/env python3
"""Standalone CLI runner for GSE Distributed Compute Fabric & Corpus Miner."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
for p in (REPO_ROOT / "src", REPO_ROOT):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

from gse_engine.fabric import (  # noqa: E402
    BrokerlessMicrotaskCoordinator,
    OpportunisticWorkerDaemon,
    execute_deterministic_microtask_kernel,
    run_evolutionary_campaign,
    sweep_foundry_and_corpus_primitives,
)


def main(argv: list[str] | None = None) -> int:
    """CLI entrypoint for fabric campaign execution, worker daemon, and corpus sweep."""
    parser = argparse.ArgumentParser(prog="gse-fabric")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_camp = sub.add_parser("campaign", help="Run ETTC closed-loop campaign")
    p_camp.add_argument("--generations", type=int, default=2)
    p_camp.add_argument("--seed", type=int, default=20261116)
    p_camp.add_argument("--db", type=str, default=":memory:")

    p_wrk = sub.add_parser("worker", help="Run opportunistic worker daemon")
    p_wrk.add_argument("--node-id", type=str, default="local-cpu-1")
    p_wrk.add_argument("--db", type=str, required=True)
    p_wrk.add_argument("--max-iterations", type=int, default=20)

    p_swp = sub.add_parser("sweep-corpus", help="Sweep 12k Foundry artifacts into index")
    p_swp.add_argument("--limit", type=int, default=0)

    args = parser.parse_args(argv)
    if args.cmd == "campaign":
        res = run_evolutionary_campaign(
            generations=args.generations,
            campaign_seed=args.seed,
            db_target=args.db,
        )
        print(json.dumps(res, indent=2))
        return 0
    if args.cmd == "worker":
        coord = BrokerlessMicrotaskCoordinator(
            db_target=args.db,
            spot_check_oracle=execute_deterministic_microtask_kernel,
        )
        daemon = OpportunisticWorkerDaemon(coord, args.node_id)
        daemon.install_signal_handlers()
        processed = daemon.run_loop(max_iterations=args.max_iterations)
        coord.close()
        print(json.dumps({"node_id": args.node_id, "processed": processed}))
        return 0
    if args.cmd == "sweep-corpus":
        summary = sweep_foundry_and_corpus_primitives(
            batch_limit=args.limit if args.limit > 0 else None,
        )
        compact = {k: v for k, v in summary.items() if k != "curated_rrf_candidates"}
        compact["curated_candidates_count"] = len(summary.get("curated_rrf_candidates") or [])
        print(json.dumps(compact, indent=2))
        return 0
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
