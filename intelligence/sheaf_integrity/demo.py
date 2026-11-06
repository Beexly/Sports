#!/usr/bin/env python3
"""
One-command CRC demo — Path A buyer surface.

Usage:
  python demo.py                  # entity integrity on public schema extract
  python demo.py --mode models    # multi-model agreement
  python demo.py --mode ontology  # same-as hygiene
  python demo.py --serve          # start API on :8080
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "core"))
sys.path.insert(0, str(ROOT / "benchmarks"))


def cmd_entity() -> dict:
    from ingest_multisource import load_csv
    from product_modes import entity_integrity_report

    base = ROOT / "benchmarks" / "public_schema_extract"
    tables = {
        "crm": load_csv(base / "crm.csv"),
        "payments": load_csv(base / "payments.csv"),
        "risk_sot": load_csv(base / "risk_sot.csv"),
    }
    return entity_integrity_report(tables, sot_system="risk_sot")


def cmd_models() -> dict:
    import numpy as np
    from product_modes import model_agreement_report

    return model_agreement_report(
        {
            "gpt": np.array([1.0, 0.0]),
            "claude": np.array([1.0, 0.0]),
            "gemini": np.array([0.0, 1.0]),
        }
    )


def cmd_ontology() -> dict:
    import numpy as np
    from product_modes import ontology_hygiene_report

    nodes = list("ABC")
    edges = [("A", "B"), ("B", "C"), ("C", "A")]
    feats = {
        "A": np.array([1.0, 0.0]),
        "B": np.array([1.0, 0.0]),
        "C": np.array([0.0, 1.0]),
    }
    return ontology_hygiene_report(nodes, edges, feats)


def cmd_serve() -> None:
    import uvicorn

    print("CRC API on http://127.0.0.1:8080")
    print("  POST /v1/consistency")
    print("  GET  /health")
    uvicorn.run("server.app:app", host="127.0.0.1", port=8080, reload=False)


def main() -> None:
    ap = argparse.ArgumentParser(description="CRC knowledge-integrity demo")
    ap.add_argument(
        "--mode",
        choices=["entity", "models", "ontology"],
        default="entity",
    )
    ap.add_argument("--serve", action="store_true", help="Start FastAPI on :8080")
    args = ap.parse_args()

    if args.serve:
        cmd_serve()
        return

    fn = {"entity": cmd_entity, "models": cmd_models, "ontology": cmd_ontology}[args.mode]
    report = fn()
    print(json.dumps(report, indent=2, default=float))

    if args.mode == "entity":
        n = report["summary"]["n_fraud_flagged"]
        print(
            f"\n→ {n} entity(ies) flagged self_consistent_wrong_vs_ledger "
            f"(internally clean, wrong vs SoT)",
            file=sys.stderr,
        )
    elif args.mode == "models":
        print(
            f"\n→ model agreement class={report['repair_class']} energy={report['energy']:.4f}",
            file=sys.stderr,
        )
    else:
        print(f"\n→ {report.get('interpretation', report['repair_class'])}", file=sys.stderr)


if __name__ == "__main__":
    main()
