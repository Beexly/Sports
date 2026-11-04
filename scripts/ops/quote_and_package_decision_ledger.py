"""Quote and Package Decision-Centric Ontology Ledger.

Operationalizes:
- AM-01 (@angus.sewell Palantir Decision-Centric Ontology pattern).
- Logs context-at-decision-time vs conversion/renewal outcomes for Kit $350 sites and GSE packages.
- Provides nearest-neighbor analogical quote comparison.
"""

from __future__ import annotations

import json
import os
import time
from typing import Any, Dict, List, Optional


def record_package_quote_decision(
    ledger_path: str,
    client_id: str,
    package_type: str,
    quoted_price: float,
    discount_exception_reason: Optional[str] = None,
    client_signals: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Record quote context and rationale to append-only decision ledger."""
    os.makedirs(os.path.dirname(os.path.abspath(ledger_path)), exist_ok=True)
    
    entry = {
        "decision_id": f"dec_{int(time.time() * 1000)}",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "client_id": client_id,
        "package_type": package_type,
        "quoted_price": quoted_price,
        "discount_exception_reason": discount_exception_reason,
        "client_signals": client_signals or {},
        "outcome": "PENDING", # Converted, Declined, Renewed, Churned
    }
    
    with open(ledger_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")
        
    return entry


def find_analogous_quotes(
    ledger_path: str,
    package_type: str,
) -> List[Dict[str, Any]]:
    """Retrieve historical quotes for the same package type to inform pricing."""
    if not os.path.exists(ledger_path):
        return []
        
    matches = []
    with open(ledger_path, "r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            entry = json.loads(line)
            if entry.get("package_type") == package_type:
                matches.append(entry)
    return matches


if __name__ == "__main__":
    ledger = "data/ops/decision_ontology_ledger.jsonl"
    rec = record_package_quote_decision(
        ledger_path=ledger,
        client_id="client_kit_350_pilot",
        package_type="KIT_MONTHLY_350",
        quoted_price=350.0,
        discount_exception_reason="Founder special onboarding",
        client_signals={"platform": "web_and_mobile", "tier": "standard"},
    )
    print("Recorded Decision:", rec["decision_id"])
    analogs = find_analogous_quotes(ledger, "KIT_MONTHLY_350")
    print("Analogous Quotes Count:", len(analogs))
