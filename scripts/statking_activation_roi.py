#!/usr/bin/env python3
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
print(json.dumps(json.loads((root/'data/statking/source_activation_roi.json').read_text())['top_25_activate_now'][:3], indent=2))
