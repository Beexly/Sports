#!/usr/bin/env python3
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
print(json.dumps(json.loads((root/"data/statking/hardening_summary.json").read_text()), indent=2))
