# freshness_gate.py — enforce this as the only read path
from datetime import datetime, timezone

def freshness_ok(observed_at_iso: str, max_age_hours: float = 6.0) -> bool:
    try:
        obs = datetime.fromisoformat(observed_at_iso.replace("Z", "+00:00"))
        age = (datetime.now(timezone.utc) - obs).total_seconds() / 3600
        return age <= max_age_hours
    except Exception:
        return False

def load_stamped(path, max_age_hours=6.0):
    """Only returns data if stamped and fresh. Otherwise raises."""
    import json
    if path.endswith(".json"):
        d = json.load(open(path))
        ts = d.get("observed_at") or d.get("pull_time")
    else:
        import pandas as pd
        df = pd.read_csv(path)
        ts = df["observed_at"].iloc[0] if "observed_at" in df.columns else None
    if not ts or not freshness_ok(ts, max_age_hours):
        raise RuntimeError(f"FreshnessGate refused {path}")
    return d if path.endswith(".json") else df
