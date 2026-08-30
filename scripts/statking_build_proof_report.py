#!/usr/bin/env python3
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
print(json.dumps(json.loads((root/'data/statking/proof/proof_report.json').read_text()), indent=2))
