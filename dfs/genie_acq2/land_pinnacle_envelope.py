"""Landing step: wrap the dict-shaped Pinnacle game snapshot in a FreshnessGate-countable envelope.
Content unchanged; observed_at = original capture time; raw sha16 pinned. DIAGNOSTIC."""
import hashlib, json
from pathlib import Path

ROOT = Path(r"C:\Users\Garrett\Sports-wt-rating-packet")
raw_p = ROOT / "dfs/genie_acq2/pinnacle_snapshot_20261011.json"
b = raw_p.read_bytes()
raw = json.loads(b)
env = {"observed_at": raw["observed_at"], "source": raw.get("source"),
       "raw_file": "dfs/genie_acq2/pinnacle_snapshot_20261011.json", "raw_sha16": hashlib.sha256(b).hexdigest()[:16],
       "note": "shape-only envelope (matchups dict -> games list) so read_fresh can count rows; values untouched",
       "games": [{"matchup_id": k, **v} for k, v in raw["matchups"].items()],
       "label": "DIAGNOSTIC — market snapshot"}
out = ROOT / "dfs/genie_acq2/pinnacle_snapshot_20261011.envelope.json"
json.dump(env, open(out, "w", encoding="utf-8"))
print(out, "games", len(env["games"]), "raw_sha16", env["raw_sha16"], "observed_at", env["observed_at"])
