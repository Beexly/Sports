"""
run_instance.py — run the Adjustment Layer v1 grammar over one game's
stamped inputs and append the emitted records to a shadow ledger.

Usage:
    python3 run_instance.py --inputs inputs/<game>.json \
        --graph inputs/<game>.graph.json --ledger ledger/<name>.jsonl \
        [--report <path>]

The inputs file carries the fixture (game, read_at, templates); the graph
file is a situational-graph instance document whose edges are consumed
verbatim. The run report (records + diagnostics + PIT refusals) is
printed as JSON and optionally written to --report. Records land in the
ledger through ledger.append_records (hash-chained, idempotent).
"""

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import grammar  # noqa: E402
import ledger as ledger_mod  # noqa: E402


def load_bundle(inputs_path, graph_path):
    with open(inputs_path) as f:
        bundle = json.load(f)
    with open(graph_path) as f:
        graph = json.load(f)
    bundle["graph_edges"] = graph.get("edges", [])
    bundle["graph_honest_empty"] = graph.get("honest_empty", [])
    return bundle


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--inputs", required=True)
    ap.add_argument("--graph", required=True)
    ap.add_argument("--ledger", required=True)
    ap.add_argument("--report")
    args = ap.parse_args(argv)

    bundle = load_bundle(args.inputs, args.graph)
    result = grammar.evaluate(bundle)
    appended, skipped = ledger_mod.append_records(args.ledger, result["records"])
    report = {
        "game_id": bundle["game"]["game_id"],
        "read_at": bundle["read_at"],
        "kickoff_utc": bundle["game"]["kickoff_utc"],
        "records_appended": appended,
        "records_skipped_duplicate": skipped,
        "ledger": args.ledger,
        "records": result["records"],
        "diagnostics": result["diagnostics"],
        "refused": result["refused"],
    }
    text = json.dumps(report, indent=2, sort_keys=True)
    if args.report:
        with open(args.report, "w") as f:
            f.write(text + "\n")
    print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
