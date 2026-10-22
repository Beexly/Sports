"""
Wire nflverse participation so film features can be joined to outcomes
once jersey OCR lands. Shadow-only until validated.
"""
from typing import Dict, List, Optional
import json
from datetime import datetime
from pathlib import Path

def join_film_to_outcomes(
    film_features: Dict,
    participation_rows: List[Dict],
    shadow_dir: str = "artifacts/shadow"
) -> Dict:
    """Join film features to nflverse participation/outcomes.
    Result is always written with weight 0.
    """
    joined = {
        "ts": datetime.utcnow().isoformat() + "Z",
        "weight": 0,
        "calibrated": False,
        "film_features": film_features,
        "participation_count": len(participation_rows),
        "honesty": "shadow_only_until_jersey_ocr_and_validation_spec",
    }
    Path(shadow_dir).mkdir(parents=True, exist_ok=True)
    path = Path(shadow_dir) / f"film_join_{datetime.utcnow().strftime('%Y%m%dT%H%M%S')}.json"
    path.write_text(json.dumps(joined, indent=2))
    return joined
